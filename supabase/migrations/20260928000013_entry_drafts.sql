-- Unpublished changes to a published entry: saved here by "Save draft" and applied by "Publish
-- changes", so the live page stays as it is until then. Unpublished entries save in place.
alter table public.entries
  add column draft jsonb,
  add column draft_saved_at timestamptz;
