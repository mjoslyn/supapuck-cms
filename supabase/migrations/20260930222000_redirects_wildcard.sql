-- Whether a redirect is a wildcard (its old address ends in "*"), as a column the lookup can filter on:
-- in a PostgREST like pattern "*" means "%", so like('from_path', '%*') matched every rule.
alter table public.redirects add column wildcard boolean generated always as (right(from_path, 1) = '*') stored;
create index redirects_wildcard_idx on public.redirects (wildcard) where wildcard;
