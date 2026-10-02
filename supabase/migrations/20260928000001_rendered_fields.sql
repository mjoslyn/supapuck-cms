-- Front-end renderings of title/excerpt (WP applies wptexturize, excerpt trimming, etc.).
-- Recomputed by the admin on save; imported verbatim from WordPress.
alter table public.entries
  add column title_rendered text,
  add column excerpt_rendered text;
