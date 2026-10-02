-- The self-update policy read profiles inside a profiles policy (infinite recursion once admins update
-- other people's rows). The role lookup goes through a security definer function instead.
create or replace function public.own_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

drop policy "profiles self update name" on public.profiles;
create policy "profiles self update name" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = (select public.own_role()));
