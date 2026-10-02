// Featured image and SEO for pages that aren't entries: term pages and type listing pages.
//
// A term keeps them in terms.fields: `image` (media id, with `image_url` for the editor), `seo` (as an
// entry's, src/lib/seo.ts) and the fields its taxonomy declares in the site config. A taxonomy keeps a
// featured image and SEO in settings.site.taxonomy_meta[<taxonomy>]: the defaults its term pages use,
// with {term} in its search title and description replaced by the term's name. A type's listing page
// keeps them in settings.site.listing_meta[<type>]: on the listing's own address, all of them; on the
// calendar views under it (events), the image and noindex only.
import type { Term } from './types';
import { seoOf, summary, type Seo } from './seo';
import { site as config } from './site';
import type { FieldDef } from './site/types';

export interface TaxonomyMeta {
  image?: number;
  image_url?: string;
  seo?: Seo;
}

/** Keys of terms.fields the core uses for itself; a taxonomy's own fields can't take them. */
export const TERM_RESERVED = ['template', 'image', 'image_url', 'seo'];

/** The fields a taxonomy declares for its terms (reserved keys left out). */
export const termFieldsFor = (taxonomy: string): FieldDef[] => (config.taxonomies.find((t) => t.name === taxonomy)?.fields ?? []).filter((f) => !TERM_RESERVED.includes(f.key));

export function taxonomyMeta(siteSettings: Record<string, any> | undefined, taxonomy: string): TaxonomyMeta {
  const m = siteSettings?.taxonomy_meta?.[taxonomy];
  return m && typeof m === 'object' ? m : {};
}

/** A term's featured image: its own, else its taxonomy's. */
export function termImageId(term: Term, siteSettings: Record<string, any> | undefined): number | undefined {
  return [term.fields?.image, taxonomyMeta(siteSettings, term.taxonomy).image].map(Number).find((n) => n > 0);
}

const named = (s: string | undefined, term: Term) => (s ? s.replace(/\{term\}/g, summary(term.name, 200)) : '');

/**
 * What a term page tells search engines and social cards: the term's own SEO, else its taxonomy's
 * (with {term} filled in); the description falls back to the term's description; the share image to
 * the term's featured image, then the taxonomy's.
 */
export function termSeo(term: Term, siteSettings: Record<string, any> | undefined): Seo {
  const own = seoOf(term.fields);
  const tax = taxonomyMeta(siteSettings, term.taxonomy);
  const dflt = tax.seo ?? {};
  return {
    title: own.title || named(dflt.title, term) || undefined,
    description: own.description || summary(term.description) || named(dflt.description, term) || undefined,
    image: [own.image, term.fields?.image, dflt.image, tax.image].map(Number).find((n) => n > 0),
    noindex: !!(own.noindex || dflt.noindex),
  };
}

/** A type listing's featured image and SEO (Settings > Types). */
export function listingMeta(siteSettings: Record<string, any> | undefined, type: string): TaxonomyMeta {
  const m = siteSettings?.listing_meta?.[type];
  return m && typeof m === 'object' ? m : {};
}

/** A listing page's featured image, if it has one. */
export const listingImageId = (siteSettings: Record<string, any> | undefined, type: string): number | undefined => [listingMeta(siteSettings, type).image].map(Number).find((n) => n > 0);

/**
 * What a type's listing page tells search engines: its title and description on the listing's own
 * address (`own`), not on views under it (calendar months and days, which keep their own titles); its
 * share image is its SEO's featured image; noindex on all of them.
 */
export function listingSeo(siteSettings: Record<string, any> | undefined, type: string, own: boolean): Seo {
  const m = listingMeta(siteSettings, type);
  return {
    title: own ? m.seo?.title || undefined : undefined,
    description: own ? m.seo?.description || undefined : undefined,
    image: listingImageId(siteSettings, type),
    noindex: !!m.seo?.noindex,
  };
}
