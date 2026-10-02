-- Terms keep an order among the terms beside them (Content > Taxonomies, by dragging): lower first,
-- then by name, so terms nobody ordered stay alphabetical.
alter table public.terms add column if not exists sort integer not null default 0;
