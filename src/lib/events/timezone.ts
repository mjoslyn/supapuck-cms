// An iCalendar VTIMEZONE for any IANA time zone, from the runtime's time zone data (Intl): each
// year's offset changes, found by scanning the year and narrowing to the minute. And the short name of
// an event's zone, for events not in the site's.
import { localToUtc as localToUtcFor } from '../recurrence';

/** Minutes the zone is ahead of UTC at an instant. */
function offsetAt(tz: string, ms: number): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, Number(x.value)]),
  );
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000) / 60000);
}

const abbr = (tz: string, ms: number) => new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(ms)).find((x) => x.type === 'timeZoneName')?.value ?? '';
const hhmm = (min: number) => `${min < 0 ? '-' : '+'}${String(Math.floor(Math.abs(min) / 60)).padStart(2, '0')}${String(Math.abs(min) % 60).padStart(2, '0')}`;
/** An instant as local wall time in the given offset: "YYYYMMDDTHHMMSS". */
const wall = (ms: number, offset: number) => new Date(ms + offset * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '');

/** Instants (ms) when the zone's offset changes during a year. */
function transitions(tz: string, year: number): number[] {
  const out: number[] = [];
  const DAY = 86400000;
  let t = Date.UTC(year, 0, 1);
  let off = offsetAt(tz, t);
  for (const end = Date.UTC(year + 1, 0, 1); t < end; t += DAY) {
    const next = offsetAt(tz, t + DAY);
    if (next === off) continue;
    // The change is within this day: narrow to the minute.
    let lo = t;
    let hi = t + DAY;
    while (hi - lo > 60000) {
      const mid = lo + Math.floor((hi - lo) / 120000) * 60000;
      if (offsetAt(tz, mid) === off) lo = mid;
      else hi = mid;
    }
    out.push(hi);
    off = next;
  }
  return out;
}

/** VTIMEZONE lines covering the given years (and one either side). */
export function vtimezone(tz: string, years: number[]): string[] {
  const out = ['BEGIN:VTIMEZONE', `TZID:${tz}`];
  const from = Math.min(...years) - 1;
  const to = Math.max(...years) + 1;
  let any = false;
  for (let y = from; y <= to; y++) {
    for (const at of transitions(tz, y)) {
      const before = offsetAt(tz, at - 60000);
      const after = offsetAt(tz, at);
      const kind = after > before ? 'DAYLIGHT' : 'STANDARD';
      out.push(`BEGIN:${kind}`, `TZOFFSETFROM:${hhmm(before)}`, `TZOFFSETTO:${hhmm(after)}`, `TZNAME:${abbr(tz, at)}`, `DTSTART:${wall(at, before)}`, `END:${kind}`);
      any = true;
    }
  }
  // No changes in those years: one standard time.
  if (!any) {
    const at = Date.UTC(from, 0, 1);
    const off = offsetAt(tz, at);
    out.push('BEGIN:STANDARD', `TZOFFSETFROM:${hhmm(off)}`, `TZOFFSETTO:${hhmm(off)}`, `TZNAME:${abbr(tz, at)}`, `DTSTART:${wall(at, off)}`, 'END:STANDARD');
  }
  out.push('END:VTIMEZONE');
  return out;
}

/**
 * The short name of an event's timezone at a wall-clock time ("CDT"), when the event is not in the
 * site's timezone; else ''. Visitors read times in the site's zone unless told otherwise.
 */
export function zoneLabel(tz: string | undefined | null, wall: string, siteTz: string): string {
  if (!tz || tz === siteTz || !wall) return '';
  try {
    const instant = new Date(localToUtcFor(wall, tz));
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(instant).find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch {
    return tz;
  }
}
