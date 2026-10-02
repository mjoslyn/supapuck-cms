import type { APIRoute } from 'astro';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { error } = await locals.db.from('form_submissions').delete().eq('id', Number(params.id));
  if (error) return new Response(error.message, { status: 400 });
  return Response.json({ ok: true });
};
