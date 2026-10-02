import type { APIRoute } from 'astro';
import { serverClient } from '../../../lib/supabase';

/**
 * Email a password-reset link to /admin/set-password/. The answer is the same whether or not the
 * address has an account.
 */
export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  if (email) await serverClient(request, cookies).auth.resetPasswordForEmail(email, { redirectTo: `${url.origin}/admin/set-password/` });
  return redirect('/admin/login/?sent=1');
};
