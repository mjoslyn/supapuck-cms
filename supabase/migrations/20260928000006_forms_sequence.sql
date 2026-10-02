-- The importer inserts forms with their WordPress ids; this moves the identity past them.
create or replace function public.forms_sync_id_sequence()
returns void
language sql
security definer
set search_path = ''
as $$
  select setval(pg_get_serial_sequence('public.forms', 'id'), greatest((select max(id) from public.forms), 1));
$$;
revoke execute on function public.forms_sync_id_sequence() from public, anon, authenticated;
