import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ params, locals }) => {
  const { data: src, error } = await locals.db.from('forms').select('title, definition, notifications').eq('id', Number(params.id)).single();
  if (error) return new Response(error.message, { status: 404 });
  const title = `${src.title} (copy)`;
  const definition = src.definition ?? {};
  const { data, error: e2 } = await locals.db.from('forms').insert({ title, definition: {}, notifications: src.notifications, is_active: false }).select('id').single();
  if (e2) return new Response(e2.message, { status: 400 });
  await locals.db.from('forms').update({ definition: { ...definition, id: data.id, title } }).eq('id', data.id);
  return Response.json({ id: data.id });
};
