// Event dates for cards and headings: the event-date block and eventDates(), in the event's timezone.
import { attrs as rootAttrs, styleDecls } from '../c/style';
import { formatDate } from '../../lib/date-format';
import { esc } from '../html';
import type { Renderer } from '../env';
import type { Entry } from '../../lib/types';
import { SITE_TZ } from '../../lib/site';

/** Start and end dates of an event, formatted in its timezone. */
export function eventDates(e: Entry, format: string): [string, string] {
  const tz = e.fields?.timezone || SITE_TZ;
  const start = e.event_start ? formatDate(format, e.event_start, tz) : '';
  const end = e.event_end ? formatDate(format, e.event_end, tz) : start;
  return [start, end];
}

export const eventDate: Renderer = (b, { post }) => {
  if (!post || post.type !== 'event') return '';
  const [start, end] = eventDates(post, b.attrs.format ?? 'M j, Y');
  if (!start) return '';
  return `<p ${rootAttrs(['c-event-date', b.attrs.className], styleDecls(b.attrs.style))}>${esc(start !== end ? `${start} – ${end}` : start)}</p>`;
};
