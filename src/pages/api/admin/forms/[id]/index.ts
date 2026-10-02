import type { APIRoute } from 'astro';

/** Save a form: { title, definition, notifications, is_active } */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const id = Number(params.id);
  const body = await request.json();
  const definition = { ...body.definition, id, title: body.title };
  if (!Array.isArray(definition.fields)) return new Response('Invalid form', { status: 400 });
  const { error } = await locals.db
    .from('forms')
    .update({ title: String(body.title || 'Untitled form').slice(0, 200), definition, notifications: body.notifications ?? [], is_active: !!body.is_active })
    .eq('id', id);
  if (error) return new Response(error.message, { status: 400 });
  return Response.json({ ok: true });
};

/** Delete a form. Its submissions stay (form_id becomes null; the title is kept on each row). */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const { error } = await locals.db.from('forms').delete().eq('id', Number(params.id));
  if (error) return new Response(error.message, { status: 400 });
  return Response.json({ ok: true });
};
