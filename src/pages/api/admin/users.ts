// Users (admins only; see middleware). Form posts, back to /admin/users/:
// action=role (id, role: viewer | editor | admin), action=invite (email, role).
import type { APIRoute } from 'astro';
import { serviceClient } from '../../../lib/supabase';

const ROLES = ['viewer', 'editor', 'admin'];

export const POST: APIRoute = async ({ request, locals, redirect, url }) => {
  const form = await request.formData();
  const action = String(form.get('action') ?? '');
  const role = String(form.get('role') ?? '');
  const back = (msg: string, ok = false) => redirect(`/admin/users/?${ok ? 'ok' : 'error'}=${encodeURIComponent(msg)}`, 303);
  if (!ROLES.includes(role)) return back('Unknown role.');

  if (action === 'role') {
    const id = String(form.get('id') ?? '');
    if (id === locals.user.id) return back("You can't change your own role.");
    const { error } = await locals.db.from('profiles').update({ role }).eq('id', id);
    return error ? back(error.message) : back('Role updated.', true);
  }

  if (action === 'invite') {
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back('Enter an email address.');
    const admin = serviceClient().auth.admin;
    const { data, error } = await admin.inviteUserByEmail(email, { redirectTo: `${url.origin}/admin/set-password/` });
    if (error) return back(error.message);
    // The profile is created by the auth trigger; give it the chosen role.
    const { error: e2 } = await serviceClient().from('profiles').update({ role }).eq('id', data.user.id);
    return e2 ? back(e2.message) : back(`Invitation sent to ${email}.`, true);
  }
  return back('Unknown action.');
};
