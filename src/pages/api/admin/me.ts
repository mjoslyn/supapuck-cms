// Who is signed in (editors and admins only; the middleware answers 401/403 for anyone else). Used by
// the editor bar on public pages, which are cached, so this is never cached.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ locals }) =>
  Response.json({ name: locals.user.name || locals.user.email, role: locals.user.role }, { headers: { 'Cache-Control': 'private, no-store' } });
