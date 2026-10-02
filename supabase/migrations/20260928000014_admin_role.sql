-- Two roles in the admin: editors manage content; admins also manage templates, site settings and
-- users. (viewer = signed up, no access.)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- Site settings: admins only (everyone can still read them; the site needs them).
drop policy if exists "settings editor write" on public.settings;
create policy "settings admin write" on public.settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Admins change roles (the Users page); people still can't change their own.
create policy "profiles admin update" on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()) and id <> (select auth.uid()));
