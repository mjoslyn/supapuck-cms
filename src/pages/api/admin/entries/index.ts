import type { APIRoute } from 'astro';
import { CONTENT_TYPES } from '../../../../lib/site';
import { renderedTitle, uniqueSlug } from '../../../../lib/admin/save';
import { placeholderSlug, slugify } from '../../../../lib/slug';
import { duplicateEntry } from '../../../../lib/admin/duplicate';

/**
 * Create an entry.
 * - Form post (admin list "New ..."): { type } -> an untitled draft, then the editor.
 * - JSON (pickers): { type, title, fields?, status? } -> { id, title, slug }.
 * - Form post { duplicate: id } (list and editor "Duplicate"): a draft copy, then its editor.
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const json = request.headers.get('content-type')?.includes('application/json');
  const body: Record<string, any> = json ? await request.json().catch(() => ({})) : Object.fromEntries(await request.formData());
  if (body.duplicate) {
    try {
      const id = await duplicateEntry(locals.db, Number(body.duplicate));
      return json ? Response.json({ id }) : redirect(`/admin/edit/${id}/`, 303);
    } catch (e) {
      return new Response((e as Error).message, { status: 400 });
    }
  }
  const def = CONTENT_TYPES.find((c) => c.type === body.type);
  if (!def) return new Response('Unknown content type', { status: 400 });
  const title = String(body.title ?? '').trim().slice(0, 200);
  const status = json && body.status === 'publish' ? 'publish' : 'draft';

  // Untitled drafts get a placeholder slug; the editor sets the real one with the title.
  let slug = placeholderSlug(def.type);
  if (title) slug = await uniqueSlug(locals.db, def.type, slugify(title) || 'untitled');

  const fields = body.fields && typeof body.fields === 'object' ? body.fields : {};
  const { data, error } = await locals.db
    .from('entries')
    .insert({ type: def.type, title, title_rendered: renderedTitle(title), slug, status, fields, content: { root: { props: {} }, content: [], zones: {} } })
    .select('id, title, slug')
    .single();
  if (error) return new Response(error.message, { status: 400 });
  return json ? Response.json(data) : redirect(`/admin/edit/${data.id}/`, 303);
};
