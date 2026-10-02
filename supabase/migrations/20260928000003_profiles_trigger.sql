-- Every auth user gets a profile; editors are promoted explicitly (scripts/create-editor.ts).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Editors need to see which account is signed in.
create policy "profiles self update name" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = (select role from public.profiles where id = (select auth.uid())));
