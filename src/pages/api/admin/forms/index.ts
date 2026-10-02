import type { APIRoute } from 'astro';
import { newForm, defaultNotification } from '../../../../lib/forms/defaults';

/** Create a form: { title } -> { id } */
export const POST: APIRoute = async ({ request, locals }) => {
  const { title } = await request.json().catch(() => ({}));
  const name = String(title || 'Untitled form').slice(0, 200);
  const { data, error } = await locals.db.from('forms').insert({ title: name, definition: {}, notifications: [defaultNotification()] }).select('id').single();
  if (error) return new Response(error.message, { status: 400 });
  const { error: e2 } = await locals.db.from('forms').update({ definition: newForm(data.id, name) }).eq('id', data.id);
  if (e2) return new Response(e2.message, { status: 400 });
  return Response.json({ id: data.id });
};
