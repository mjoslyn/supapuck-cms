// Roles: an editor doesn't see or reach templates, settings or users (pages, APIs, database); an admin
// manages roles and invites on /admin/users/. Uses temporary accounts, removed afterwards.
//   npx tsx --env-file=.env scripts/roles-e2e.ts
import { chromium, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const origin = process.env.ASTRO_ORIGIN ?? 'http://localhost:4321';
const url = process.env.PUBLIC_SUPABASE_URL!;
const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const email = 'e2e-editor@example.com';
const invitee = 'e2e-invitee@example.com';
// A throwaway password per run; the account is deleted at the end.
const password = `e2e-${crypto.randomUUID()}`;
for (const e of [email, invitee]) {
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const old = data?.users.find((u) => u.email === e);
  if (old) await sb.auth.admin.deleteUser(old.id);
}
const { data: created, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
await sb.from('profiles').update({ role: 'editor' }).eq('id', created.user.id);

const out: Record<string, unknown> = {};
const b = await chromium.launch();
const login = async (p: Page, who: string, pass: string) => {
  await p.goto(`${origin}/admin/login/`);
  await p.fill('input[name=email]', who);
  await p.fill('input[name=password]', pass);
  await Promise.all([p.waitForURL(/\/admin\/(?!login)/), p.click('button:has-text("Sign in")')]);
};
try {
  // Editor.
  const ed = await b.newPage();
  await login(ed, email, password);
  out.editorNav = await ed.locator('header nav a').allInnerTexts();
  for (const path of ['/admin/templates/', '/admin/settings/', '/admin/users/']) {
    await ed.goto(origin + path);
    out[`editor ${path}`] = `${new URL(ed.url()).pathname}${new URL(ed.url()).search}`;
  }
  out.editorNotice = await ed.getByText('That section is for admins.').count();
  out.editorSettingsApi = (await ed.request.put(`${origin}/api/admin/settings`, { data: { site: {} }, headers: { Origin: origin } })).status();
  out.editorRedirectsApi = (await ed.request.delete(`${origin}/api/admin/redirects?id=0`, { headers: { Origin: origin } })).status();
  out.editorUsersApi = (await ed.request.post(`${origin}/api/admin/users`, { form: { action: 'role', id: created.user.id, role: 'admin' }, headers: { Origin: origin }, maxRedirects: 0 })).status();
  // Straight to the database with the editor's own session: settings writes are refused.
  const userDb = createClient(url, process.env.PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  const { data: wrote } = await userDb.from('settings').update({ value: { hacked: true } }).eq('key', 'options').select('key');
  out.editorDbSettingsWrite = wrote?.length ?? 0;
  const { data: about } = await sb.from('entries').select('id').eq('slug', 'about').eq('type', 'page').single();
  await ed.goto(`${origin}/admin/edit/${about!.id}/`);
  await ed.frameLocator('iframe').first().locator('h2').first().waitFor();
  out.editorCanEditPages = true;

  // Admin.
  const ad = await b.newPage();
  await login(ad, process.env.LOCAL_ADMIN_EMAIL!, process.env.LOCAL_ADMIN_PASSWORD!);
  out.adminNav = await ad.locator('header nav a').allInnerTexts();
  await ad.goto(`${origin}/admin/users/`);
  await ad.getByLabel(`Role for ${email}`).selectOption('viewer');
  await ad.waitForURL(/ok=/);
  out.roleChanged = (await sb.from('profiles').select('role').eq('id', created.user.id).single()).data?.role;
  await ad.fill('input[name=email]', invitee);
  await ad.getByRole('button', { name: 'Invite' }).click();
  await ad.waitForURL(/(ok|error)=/);
  out.invite = decodeURIComponent(new URL(ad.url()).search);
  const { data: inv } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const invited = inv?.users.find((u) => u.email === invitee);
  out.invitedRole = invited ? (await sb.from('profiles').select('role').eq('id', invited.id).single()).data?.role : null;
  out.selfLocked = await ad.getByText('(you)').count();

  // The demoted editor no longer gets in.
  const ed2 = await b.newPage();
  await ed2.goto(`${origin}/admin/login/`);
  await ed2.fill('input[name=email]', email);
  await ed2.fill('input[name=password]', password);
  await ed2.click('button:has-text("Sign in")');
  await ed2.waitForTimeout(1500);
  out.viewerLanding = new URL(ed2.url()).pathname + new URL(ed2.url()).search;
  console.log(JSON.stringify(out, null, 1));
} finally {
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) if (u.email === email || u.email === invitee) await sb.auth.admin.deleteUser(u.id);
  await b.close();
}
