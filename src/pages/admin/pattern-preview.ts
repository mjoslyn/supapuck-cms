// A pattern on its own, styled like the site, for the thumbnails in the editor's Patterns tab
// (signed-in editors; the /admin middleware applies). GET ?slug=<pattern slug>. Entry blocks in the
// pattern (title, image...) show the front page's; empty image slots show a placeholder, so starter
// layouts aren't blank. Scripts are left out: a thumbnail is a picture.
import type { APIRoute } from 'astro';
import { Loader } from '../../lib/data';
import { renderRequest } from '../../render/page';
import type { PuckItem } from '../../lib/puck/types';

/** A grey 3:2 picture with a mountain, for image slots the pattern leaves empty. */
const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#e7e3dd"/><path d="M420 540l120-160 90 110 60-70 90 120z" fill="#cfc9c0"/><circle cx="700" cy="330" r="34" fill="#cfc9c0"/></svg>',
  );

/** The pattern with its empty image slots filled. */
function withPlaceholders(items: PuckItem[]): PuckItem[] {
  return items.map((i) => {
    const a = i.props.attrs ?? {};
    const empty = (i.type === 'image' || i.type === 'media-text') && !a.mediaId && !a.src;
    const children = i.props.children ? withPlaceholders(i.props.children) : undefined;
    return { ...i, props: { ...i.props, attrs: empty ? { ...a, src: PLACEHOLDER, alt: '' } : a, ...(children ? { children } : {}) } };
  });
}

export const GET: APIRoute = async ({ locals, url }) => {
  const slug = url.searchParams.get('slug') ?? '';
  const loader = new Loader(locals.db);
  const doc = await loader.template('pattern', slug);
  if (!doc) return new Response('Pattern not found', { status: 404 });
  const settings = await loader.settings();
  const sample = await loader.entryById(Number(settings.site?.front_page_id) || 0, true);
  if (!sample) return new Response('No front page to preview with', { status: 404 });
  const { html } = await renderRequest(new URL('/', url.origin), locals.db, undefined, { entry: sample, template: withPlaceholders((doc.content ?? []) as PuckItem[]) });
  const out = html
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace('<head>', '<head>\n\t<meta name="robots" content="noindex, nofollow" />\n\t<style>html,body{overflow:hidden}</style>');
  return new Response(out, { headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'private, max-age=300', 'X-Robots-Tag': 'noindex' } });
};
