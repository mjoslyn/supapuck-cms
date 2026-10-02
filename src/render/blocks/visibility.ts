// Block visibility rules (login state, roles, date window). Public pages are always rendered for a
// logged-out visitor with no roles.
import { formatDate } from '../../lib/date-format';

interface Rules {
  login?: 'any' | 'in' | 'out';
  roles?: string[];
  roleMatch?: 'in' | 'not-in';
  dateStart?: string;
  dateEnd?: string;
}

/** strtotime() of a site-local date string compared against current_time('timestamp'). */
const localSeconds = (s: string) => {
  const t = Date.parse(`${s.trim().replace(' ', 'T')}${/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'}`);
  return Number.isNaN(t) ? null : t / 1000;
};

export function visibilityPasses(rules: Rules, now = new Date()): boolean {
  if ((rules.login ?? 'any') === 'in') return false;
  const roles = (rules.roles ?? []).filter(Boolean);
  if (roles.length && (rules.roleMatch ?? 'in') === 'in') return false;
  const current = localSeconds(formatDate('Y-m-d H:i:s', now))!;
  if (rules.dateStart) {
    const start = localSeconds(rules.dateStart);
    if (start && current < start) return false;
  }
  if (rules.dateEnd) {
    const end = localSeconds(rules.dateEnd);
    if (end && current > end) return false;
  }
  return true;
}
