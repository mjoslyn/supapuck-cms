// Line icons for lists (24x24, stroke = currentColor), rendered as inline SVG.
const paths: Record<string, string> = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  dot: '<circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>',
  dash: '<path d="M6 12h12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  'map-pin': '<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  phone: '<path d="M6.5 4h3l1.5 4-2 1.3a11 11 0 0 0 5.7 5.7L16 13l4 1.5v3A2.5 2.5 0 0 1 17.3 20 14 14 0 0 1 4 6.7 2.5 2.5 0 0 1 6.5 4z"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>',
  snowflake: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/>',
  mountain: '<path d="M3 19l6.5-11 4 6.5 2.5-3.5L21 19z"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7"/>',
};

export const LIST_ICONS: [string, string][] = [
  ['check', 'Check'],
  ['check-circle', 'Check (circle)'],
  ['arrow-right', 'Arrow'],
  ['chevron', 'Chevron'],
  ['dot', 'Dot'],
  ['dash', 'Dash'],
  ['plus', 'Plus'],
  ['star', 'Star'],
  ['heart', 'Heart'],
  ['map-pin', 'Map pin'],
  ['clock', 'Clock'],
  ['calendar', 'Calendar'],
  ['phone', 'Phone'],
  ['mail', 'Mail'],
  ['info', 'Info'],
  ['snowflake', 'Snowflake'],
  ['sun', 'Sun'],
  ['mountain', 'Mountain'],
  ['leaf', 'Leaf'],
];

export function iconSvg(name: string): string {
  const p = paths[name];
  return p ? `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>` : '';
}
