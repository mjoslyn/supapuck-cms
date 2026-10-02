-- Sync (src/lib/sync.ts) writes entries, terms, media and forms with the ids they have on the other
-- copy. Identity counters don't move for rows written with an id, so afterwards each is moved past the
-- highest id, or the next row added by hand would collide. Service role only.
create or replace function public.sync_reset_ids() returns void
language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  foreach t in array array['entries', 'terms', 'media', 'forms'] loop
    execute format(
      'select setval(pg_get_serial_sequence(%L, ''id''), greatest((select coalesce(max(id), 0) from %I), (select last_value from %s)))',
      'public.' || t, t, pg_get_serial_sequence('public.' || t, 'id')
    );
  end loop;
end $$;

revoke all on function public.sync_reset_ids() from public, anon, authenticated;
grant execute on function public.sync_reset_ids() to service_role;
