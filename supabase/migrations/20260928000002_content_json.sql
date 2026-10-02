-- Puck documents must keep object key order: WP-compatible layout class names are md5 hashes of
-- the block attributes serialized in their original order, and jsonb re-sorts keys.
alter table public.entries alter column content type json using content::text::json;
alter table public.revisions alter column content type json using content::text::json;
alter table public.templates alter column content type json using content::text::json;
