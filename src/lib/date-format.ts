// Dates formatted with PHP-style format strings (content stores formats like "M j, Y"), in the site
// timezone.
export { SITE_TZ } from './site';
import { SITE_TZ } from './site';
export const DATE_FORMAT = 'F j, Y';
export const TIME_FORMAT = 'g:i a';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Parts { Y: number; m: number; d: number; H: number; i: number; s: number; w: number; offsetMin: number }

function parts(date: Date, tz: string): Parts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short',
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const Y = +p.year, m = +p.month, d = +p.day, H = +p.hour, i = +p.minute, s = +p.second;
  const offsetMin = Math.round((Date.UTC(Y, m - 1, d, H, i, s) - date.getTime()) / 60000);
  return { Y, m, d, H, i, s, w: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), offsetMin };
}

const pad = (n: number, l = 2) => String(Math.abs(n)).padStart(l, '0');
const suffix = (d: number) => (d % 100 >= 11 && d % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[d % 10] ?? 'th');

export function formatDate(format: string, input: Date | string, tz = SITE_TZ): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const p = parts(date, tz);
  const off = (sep: string) => `${p.offsetMin >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(p.offsetMin) / 60))}${sep}${pad(Math.abs(p.offsetMin) % 60)}`;
  const g = p.H % 12 || 12;
  let out = '';
  for (let k = 0; k < format.length; k++) {
    const c = format[k];
    if (c === '\\') { out += format[++k] ?? ''; continue; }
    switch (c) {
      case 'd': out += pad(p.d); break;
      case 'D': out += DAYS[p.w].slice(0, 3); break;
      case 'j': out += p.d; break;
      case 'l': out += DAYS[p.w]; break;
      case 'N': out += p.w || 7; break;
      case 'S': out += suffix(p.d); break;
      case 'w': out += p.w; break;
      case 'F': out += MONTHS[p.m - 1]; break;
      case 'm': out += pad(p.m); break;
      case 'M': out += MONTHS[p.m - 1].slice(0, 3); break;
      case 'n': out += p.m; break;
      case 't': out += new Date(Date.UTC(p.Y, p.m, 0)).getUTCDate(); break;
      case 'Y': out += p.Y; break;
      case 'y': out += pad(p.Y % 100); break;
      case 'a': out += p.H < 12 ? 'am' : 'pm'; break;
      case 'A': out += p.H < 12 ? 'AM' : 'PM'; break;
      case 'g': out += g; break;
      case 'G': out += p.H; break;
      case 'h': out += pad(g); break;
      case 'H': out += pad(p.H); break;
      case 'i': out += pad(p.i); break;
      case 's': out += pad(p.s); break;
      case 'O': out += off(''); break;
      case 'P': out += off(':'); break;
      case 'e': out += tz; break;
      case 'T': out += new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(date).find((x) => x.type === 'timeZoneName')?.value ?? ''; break;
      case 'U': out += Math.floor(date.getTime() / 1000); break;
      case 'c': out += `${p.Y}-${pad(p.m)}-${pad(p.d)}T${pad(p.H)}:${pad(p.i)}:${pad(p.s)}${off(':')}`; break;
      default: out += c;
    }
  }
  return out;
}
