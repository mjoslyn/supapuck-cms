import type { APIRoute } from 'astro';

/**
 * Save an accessibility check's marks (A11yPanel) on their own, as they are made: the document's
 * root props `a11y` and nothing else, so other unsaved edits in the editor stay unsaved. Body:
 * { entryId, marks } (an entry: its content, and its kept-aside draft if it has one) or
 * { kind, slug, marks } (a template).
 */
export const PUT: APIRoute = async ({ request, locals }) => {
  const db = locals.db;
  const body = await request.json().catch(() => ({}));
  const marks = body.marks && typeof body.marks === 'object' && !Array.isArray(body.marks) ? body.marks : null;
  if (!marks) return new Response('Bad request', { status: 400 });
  const withMarks = (doc: any) => {
    const props = { ...(doc?.root?.props ?? {}) };
    if (Object.keys(marks).length) props.a11y = marks;
    else delete props.a11y;
    return { ...(doc ?? { content: [], zones: {} }), root: { ...(doc?.root ?? {}), props } };
  };

  if (body.entryId) {
    const id = Number(body.entryId);
    const { data: e, error } = await db.from('entries').select('content').eq('id', id).single();
    if (error || !e) return new Response('Entry not found', { status: 404 });
    // updated_at goes back to the editor: its next save is based on this write, not on a stranger's.
    const { data: row, error: upErr } = await db.from('entries').update({ content: withMarks(e.content) }).eq('id', id).select('updated_at').single();
    if (upErr) return new Response(upErr.message, { status: 400 });
    const { data: kept } = await db.from('entry_drafts').select('draft').eq('entry_id', id).maybeSingle();
    const draft = kept?.draft as { content?: unknown } | null;
    if (draft?.content) {
      const { error: dErr } = await db.from('entry_drafts').update({ draft: { ...draft, content: withMarks(draft.content) } }).eq('entry_id', id);
      if (dErr) return new Response(dErr.message, { status: 400 });
    }
    return Response.json({ ok: true, updated_at: row.updated_at });
  }

  const { kind, slug } = body;
  if (!['template', 'part', 'pattern'].includes(kind) || !slug) return new Response('Bad request', { status: 400 });
  const { data: t, error } = await db.from('templates').select('content').eq('kind', kind).eq('slug', slug).single();
  if (error || !t) return new Response('Template not found', { status: 404 });
  const { data: row, error: upErr } = await db.from('templates').update({ content: withMarks(t.content) }).eq('kind', kind).eq('slug', slug).select('updated_at').single();
  if (upErr) return new Response(upErr.message, { status: 400 });
  return Response.json({ ok: true, updated_at: row.updated_at });
};
