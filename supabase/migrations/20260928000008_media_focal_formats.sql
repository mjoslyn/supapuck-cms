-- Media: a focal point (x, y in 0..1) that cropping keeps in view, and modern-format variants.
-- `formats` holds the full-size variants ({ "webp": path, "avif": path }); each entry in `sizes` gets
-- the same key for its own variants. `processed_at` marks items whose sizes and variants exist.
alter table public.media
  add column focal_point jsonb,
  add column formats jsonb not null default '{}',
  add column processed_at timestamptz,
  add column updated_at timestamptz not null default now();

create trigger media_touch before update on public.media
  for each row execute function public.touch_updated_at();
