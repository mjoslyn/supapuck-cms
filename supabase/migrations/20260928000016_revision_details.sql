-- Revisions record what the save did and the page settings (title, excerpt, fields, featured image,
-- template, tags), so a revision can be previewed and restored whole.
alter table public.revisions
  add column action text,
  add column entry jsonb;
