-- The touch trigger overwrote updated_at on every update, including the importer's upserts, so
-- entries lost WordPress's post_modified (visible in the events iCal LAST-MODIFIED). Only stamp
-- now() when the update did not set updated_at itself.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at = now();
  end if;
  return new;
end;
$$;
