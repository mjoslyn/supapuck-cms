import type { APIRoute } from 'astro';
import { serverClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  await serverClient(request, cookies).auth.signOut();
  return redirect('/admin/login/');
};
