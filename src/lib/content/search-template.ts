// The default search results page (/search/?q=): the site's header and footer, a search form, the
// results title and a collection of the results. Installed as the `search` template by migration
// 20260930000021 and by scripts/seed.ts; edit it under Templates.
import type { PuckItem } from '../puck/types';

const node = (id: string, type: string, attrs: Record<string, any> = {}, children?: PuckItem[]): PuckItem =>
  ({ type, props: { id: `t-search-${id}`, attrs, ...(children ? { children } : {}) } }) as PuckItem;

export const SEARCH_TEMPLATE: PuckItem[] = [
  node('header', 'part', { slug: 'header' }),
  node('main', 'section', { tag: 'main', style: { padding: { top: 'var(--space-70)', right: 'var(--space-50)', bottom: 'var(--space-80)', left: 'var(--space-50)' } }, layout: { type: 'constrained', contentSize: '720px' }, gap: 'var(--space-50)' }, [
    node('title', 'archive-title', { level: 1 }),
    node('form', 'search-form', {}),
    node('results', 'collection', { query: { inherit: true, perPage: 10 }, display: 'list', pagination: 'numbers', card: 'custom', emptyText: 'Nothing matched your search. Try other words.' }, [
      node('items', 'collection-items', { layout: { type: 'flow' } }, [
        node('item', 'section', { style: { padding: { bottom: 'var(--space-50)' }, margin: { bottom: 'var(--space-50)' }, borderBottom: { width: '1px', color: 'var(--color-surface-alt)' } }, layout: { type: 'flow' }, gap: 'var(--space-20)' }, [
          node('item-title', 'entry-title', { level: 2, link: true, style: { fontFamily: 'var(--font-display)', fontSize: 'var(--text-x-large)' } }),
          node('item-excerpt', 'entry-excerpt', { length: 30 }),
        ]),
      ]),
    ]),
  ]),
  node('footer', 'part', { slug: 'footer' }),
];
