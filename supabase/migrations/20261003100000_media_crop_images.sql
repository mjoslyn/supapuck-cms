-- A media item can use another image for a crop shape ("1/1", "16/9", "4/3", "3/4"): wherever it is shown
-- cropped to that shape, the other image shows instead (src/lib/media/image.ts), with a focal point of
-- its own for that use. { shape: { id: media id, focal?: { x, y } } }.
alter table public.media add column if not exists crop_images jsonb not null default '{}'::jsonb;
