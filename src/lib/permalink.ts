// Public URLs of entries and terms.
import type { Entry, Term } from './types';
import { TYPE_BASES, TAXONOMY_BASES } from './site';

export { TYPE_BASES, ARCHIVE_PATHS, TAXONOMY_BASES } from './site';

/** The page set as the site's front page (settings.site.front_page_id); its permalink is the home URL. */
export const frontPage: { id: number | null } = { id: null };

export function permalink(e: Pick<Entry, 'type' | 'slug'> & { id?: number; parent_slugs?: string[]; occurrence?: string }): string {
  if (e.type === 'page' && e.id != null && e.id === frontPage.id) return '/';
  const base = TYPE_BASES[e.type];
  if (base && e.occurrence) return `/${base}/${e.slug}/${e.occurrence}/`;
  if (base) return `/${base}/${e.slug}/`;
  const parents = e.parent_slugs?.length ? `${e.parent_slugs.join('/')}/` : '';
  return `/${parents}${e.slug}/`;
}

export function termLink(t: Pick<Term, 'taxonomy' | 'slug'>): string {
  return `/${TAXONOMY_BASES[t.taxonomy] ?? t.taxonomy}/${t.slug}/`;
}

/** Terms in their order: as arranged in Content > Taxonomies (sort), then by name. */
export const byTermOrder = (a: { sort?: number | null; name: string }, b: { sort?: number | null; name: string }) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name);
