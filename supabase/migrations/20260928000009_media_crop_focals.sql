-- Per-shape focal points: { "1/1": {x, y}, "16/9": ..., "4/3": ..., "3/4": ... }. A crop to one of
-- these shapes (or near it) uses its point instead of focal_point.
alter table public.media add column crop_focals jsonb not null default '{}';
