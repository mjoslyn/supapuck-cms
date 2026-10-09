-- The Not found log has a size limit. Anyone can make the site log an address (a visit to a missing
-- page, or this function called with the public key), so without one a script could grow the table
-- without end. A known address is still counted; a new one is added only while there is room, after
-- addresses not seen for 30 days have gone.
create or replace function public.not_found_hit(hit_path text, hit_referrer text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.not_found set hits = hits + 1, last_seen_at = now(),
    referrer = case when coalesce(hit_referrer, '') <> '' then left(hit_referrer, 500) else referrer end
  where path = left(hit_path, 500);
  if found then return; end if;
  if (select count(*) from public.not_found) >= 5000 then
    delete from public.not_found where last_seen_at < now() - interval '30 days';
    if (select count(*) from public.not_found) >= 5000 then return; end if;
  end if;
  insert into public.not_found (path, referrer) values (left(hit_path, 500), left(coalesce(hit_referrer, ''), 500))
  on conflict (path) do update set hits = public.not_found.hits + 1, last_seen_at = now();
end;
$$;
