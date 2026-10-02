// Entry addresses (slugs): made from titles, and the placeholder "New ..." gives an entry before it
// has a title ("new-page-m1ab2c"), which the title replaces.

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

/** The placeholder slug of an untitled entry of a type. */
export const placeholderSlug = (type: string) => `new-${type}-${Date.now().toString(36)}`;

/** Whether a slug is the placeholder "New ..." gave (or empty), so the title should replace it. */
export const isPlaceholderSlug = (slug: string | null | undefined, type: string) => !slug || new RegExp(`^new-${type}-[a-z0-9]+$`).test(slug);
