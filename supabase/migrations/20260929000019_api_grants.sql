-- Hosted Supabase projects no longer give the API roles access to new tables by default (the local stack
-- still does), so grant it explicitly; row-level security decides what each role can actually see and
-- change. Future tables in public get the same through default privileges.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Forms: the public may read a form but not its notification settings (as in 0005).
revoke select on public.forms from anon;
grant select (id, title, definition, is_active, created_at, updated_at) on public.forms to anon;

alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
