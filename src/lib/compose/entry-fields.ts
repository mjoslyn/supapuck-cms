// The content type's own fields that Compose can fill from the materials (a member's phone and website,
// an event's dates, a sponsor's link...). Claude sets them in the plan's `fields` when the entry is
// created and later with update_fields; only these keys are kept, image fields take material ids
// (image-1) and become media ids, and an empty string clears a field.
import { eventDates } from '../admin/save';
import { fieldsFor, typeDef, SITE_TZ } from '../site';

type Kind = 'text' | 'url' | 'email' | 'image' | 'bool' | 'datetime' | { enum: string[] };
interface Def {
  key: string;
  kind: Kind;
  about: string;
}

/** The fields Compose may fill for a type: the config's fields marked `compose`, plus an event's dates. */
function typeFields(type: string): Def[] {
  const own = fieldsFor(type).flatMap((f): Def[] => {
    if (!('compose' in f) || !f.compose) return [];
    if (f.type === 'select') return [{ key: f.key, kind: { enum: f.options.map(([v]) => v) }, about: f.compose }];
    const kind: Kind = f.type === 'url' || f.type === 'email' || f.type === 'image' || f.type === 'bool' ? f.type : 'text';
    return [{ key: f.key, kind, about: f.compose }];
  });
  if (type !== 'event') return own;
  return [
    { key: 'start', kind: 'datetime', about: 'start, local time at the event, "YYYY-MM-DDTHH:MM"' },
    { key: 'end', kind: 'datetime', about: 'end, same format' },
    { key: 'all_day', kind: 'bool', about: 'true for an all-day event (times ignored)' },
    ...own,
  ];
}

/** What the entry is and which fields Claude may fill, for the system prompt. */
export function describeEntryType(type: string, singular: string): string {
  const defs = typeFields(type);
  return `You are creating ${typeDef(type)?.describe ?? `a ${singular.toLowerCase()}`}. build_page creates it as a draft entry of that type: the page content is your sections${type === 'page' ? '' : ', and the title is its name'}.${
    defs.length
      ? ` It has its own fields: ${defs.map((d) => `${d.key} (${d.about})`).join('; ')}. Fill them in the plan's "fields" when the materials or the conversation give them (leave out anything not given; never invent contact details or dates). To change fields later without rebuilding the page, call update_fields with just the changed ones ("" clears one). The latest message shows their current values. Don't repeat those details at length in the sections; the ${singular.toLowerCase()} page shows them.`
      : ''
  }`;
}

/** The plan's fields for an entry of this type, cleaned: known keys only, images as media ids. */
export function entryFields(type: string, raw: unknown, images: Map<string, { mediaId: number }>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const d of typeFields(type)) {
    const v = (raw as Record<string, unknown>)[d.key];
    if (v === undefined || v === null) continue;
    if (v === '') {
      out[d.key] = null;
      continue;
    }
    if (d.kind === 'bool') out[d.key] = v === true || v === 'true';
    else if (d.kind === 'image') {
      const m = images.get(String(v));
      if (m) out[d.key] = m.mediaId;
    } else if (d.kind === 'datetime') {
      const s = String(v).trim().replace(' ', 'T');
      if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(s)) out[d.key] = s.length === 10 ? `${s}T00:00` : s.slice(0, 16);
    } else if (typeof d.kind === 'object') {
      if (d.kind.enum.includes(String(v))) out[d.key] = String(v);
    } else if (d.kind === 'url') {
      if (/^https?:\/\//i.test(String(v))) out[d.key] = String(v).trim();
    } else out[d.key] = String(v).trim().slice(0, 2000);
  }
  return out;
}

/** Columns for a new entry with these fields (events: the start/end fields and the UTC date columns). */
export function entryColumns(type: string, all: Record<string, unknown>): Record<string, unknown> {
  const fields = Object.fromEntries(Object.entries(all).filter(([, v]) => v !== null));
  if (type !== 'event') return { fields };
  const { start, end, all_day, ...rest } = fields as Record<string, any>;
  if (!start) return { fields: rest };
  return eventDates({ event_start: start, event_end: end ?? start, event_all_day: !!all_day }, rest);
}

/** The entry's fields as the editor holds them (event dates in their own columns). */
export interface EditorFields {
  fields: Record<string, any>;
  event_start?: string | null;
  event_end?: string | null;
  event_all_day?: boolean | null;
}

const wallClock = (v: string | null | undefined) => {
  if (!v) return '';
  if (!/[zZ]|[+-]\d\d:\d\d$/.test(v)) return v.replace(' ', 'T').slice(0, 16);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(v)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

/** Current values of the type's fields, for the latest message ("" when there are none). */
export function describeFields(type: string, cur: EditorFields): string {
  const defs = typeFields(type);
  if (!defs.length) return '';
  const value = (d: Def) => {
    if (type === 'event' && d.key === 'start') return wallClock(cur.event_start);
    if (type === 'event' && d.key === 'end') return wallClock(cur.event_end);
    if (type === 'event' && d.key === 'all_day') return cur.event_all_day ? 'true' : '';
    const v = cur.fields?.[d.key];
    return d.kind === 'image' ? (v ? `media ${v}` : '') : v == null ? '' : String(v);
  };
  return defs.map((d) => `- ${d.key}: ${value(d) || '(empty)'}`).join('\n');
}

/** A cleaned field update as a patch for the editor's form. */
export function editorPatch(type: string, update: Record<string, unknown>): { fields: Record<string, unknown>; event_start?: string | null; event_end?: string | null; event_all_day?: boolean } {
  const { start, end, all_day, ...fields } = update as Record<string, any>;
  const out: ReturnType<typeof editorPatch> = { fields };
  if (type === 'event') {
    if (start !== undefined) out.event_start = start ? `${start}:00` : null;
    if (end !== undefined) out.event_end = end ? `${end}:00` : null;
    if (all_day !== undefined) out.event_all_day = !!all_day;
  }
  return out;
}
