-- Redirects (/admin/redirects/): an old address to a new one, applied when the old address would
-- otherwise be Not found. `from_path` is a normalized path ("/old-page/"), or a prefix ending in "*"
-- ("/old-blog/*") whose rest replaces a "*" in `to_url`. Also written when a published entry's
-- address changes. And a log of addresses that were Not found, to find the redirects worth adding.

create table public.redirects (
  id bigint generated always as identity primary key,
  from_path text not null unique check (from_path like '/%'),
  to_url text not null check (to_url <> ''),
  status int not null default 301 check (status in (301, 302)),
  note text not null default '',
  hits int not null default 0,
  last_hit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger redirects_touch before update on public.redirects
  for each row execute function public.touch_updated_at();

alter table public.redirects enable row level security;
create policy "redirects public read" on public.redirects for select using (true);
create policy "redirects editor write" on public.redirects for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create table public.not_found (
  path text primary key check (length(path) <= 500),
  hits int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  referrer text not null default ''
);

alter table public.not_found enable row level security;
create policy "not_found editor read" on public.not_found for select to authenticated using ((select public.is_editor()));
create policy "not_found editor delete" on public.not_found for delete to authenticated using ((select public.is_editor()));

-- Counting a redirect's use and a Not found hit, for visitors (who can't write these tables).
create or replace function public.redirect_hit(redirect_id bigint) returns void
language sql security definer set search_path = '' as $$
  update public.redirects set hits = hits + 1, last_hit_at = now() where id = redirect_id;
$$;

create or replace function public.not_found_hit(hit_path text, hit_referrer text) returns void
language sql security definer set search_path = '' as $$
  insert into public.not_found (path, referrer) values (left(hit_path, 500), left(coalesce(hit_referrer, ''), 500))
  on conflict (path) do update set hits = public.not_found.hits + 1, last_seen_at = now(),
    referrer = case when excluded.referrer <> '' then excluded.referrer else public.not_found.referrer end;
$$;

grant execute on function public.redirect_hit(bigint) to anon, authenticated;
grant execute on function public.not_found_hit(text, text) to anon, authenticated;
grant select, insert, update, delete on public.redirects, public.not_found to anon, authenticated, service_role;
