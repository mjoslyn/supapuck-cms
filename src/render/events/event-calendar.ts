// The event-calendar block: upcoming events on any page, as a month calendar or a list, with a toggle
// between them and month arrows (/assets/js/event-calendar.js switches in place; without it the chosen
// view shows alone). Events are prepared in prepare.ts: `event-calendar:<block id>`.
// Attrs: title, view (calendar | list), count (list), categories (term ids of the event type's taxonomies), tags (tag ids).
import type { Renderer } from '../env';
import type { CalEvent } from '../../lib/events/model';
import { esc } from '../html';
import { ARCHIVE_PATHS } from '../../lib/permalink';
import { eventCard, grouped, monthGrid, monthLabel } from './calendar';

export interface EventCalendarData {
  events: CalEvent[];
  /** "Y-m-d H:i:s" and "Y-m-d" in the site's timezone. */
  now: string;
  today: string;
}

/** Most months the calendar can page through (from this month). */
const MAX_MONTHS = 12;

const nextMonth = (first: string) => {
  const [y, m] = first.split('-').map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
};

export const eventCalendar: Renderer = (b, env) => {
  const a = b.attrs;
  const data = env.ctx.data.get(`event-calendar:${b.id}`) as EventCalendarData | undefined;
  if (!data) return '';
  const view = a.view === 'list' ? 'list' : 'calendar';
  const upcoming = data.events.filter((ev) => ev.end >= data.now || ev.endDay >= data.today);
  // Months: this one through the last upcoming event's (at most MAX_MONTHS).
  const first = `${data.today.slice(0, 7)}-01`;
  const last = upcoming.reduce((m, ev) => (ev.startDay > m ? ev.startDay : m), first).slice(0, 7);
  const months: string[] = [first];
  while (months.length < MAX_MONTHS && months[months.length - 1].slice(0, 7) < last) months.push(nextMonth(months[months.length - 1]));

  const panels = months
    .map((m, i) => `<div class="c-event-cal__month" data-label="${esc(monthLabel(m))}"${i ? ' hidden' : ''}>${monthGrid(m, data.events, data.today).body}</div>`)
    .join('');
  const count = Math.max(1, Number(a.count) || 6);
  const list = upcoming.slice(0, count);
  const listBody = list.length ? grouped(list, (ev) => eventCard(ev, { image: false, excerpt: false }), 3) : '<p class="c-cal__notice">No upcoming events.</p>';
  const ready = env.ctx.editor ? ' is-ready' : '';
  const title = a.title ? `<h2 class="c-event-cal__title">${esc(a.title)}</h2>` : '';

  return (
    `<section class="c-event-cal${ready}" data-view="${view}">` +
    `<div class="c-event-cal__head">${title}` +
    `<div class="c-event-cal__toggle" role="group" aria-label="View">` +
    `<button type="button" data-show="calendar" aria-pressed="${view === 'calendar'}">Calendar</button>` +
    `<button type="button" data-show="list" aria-pressed="${view === 'list'}">List</button></div></div>` +
    `<div class="c-event-cal__calendar"${view === 'list' ? ' hidden' : ''}>` +
    `<div class="c-event-cal__nav"><button type="button" class="c-event-cal__arrow is-prev" aria-label="Previous month" disabled><span aria-hidden="true">‹</span></button>` +
    `<h3 class="c-event-cal__month-label" aria-live="polite">${esc(monthLabel(first))}</h3>` +
    `<button type="button" class="c-event-cal__arrow is-next" aria-label="Next month"${months.length > 1 ? '' : ' disabled'}><span aria-hidden="true">›</span></button></div>` +
    panels +
    `</div>` +
    `<div class="c-event-cal__list"${view === 'calendar' ? ' hidden' : ''}>${listBody}</div>` +
    `<p class="c-event-cal__more"><a href="${esc(ARCHIVE_PATHS.event ?? '/events/')}">All events <span aria-hidden="true">→</span></a></p>` +
    `</section>`
  );
};
