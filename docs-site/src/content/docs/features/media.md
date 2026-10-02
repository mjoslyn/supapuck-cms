---
title: Media
description: Uploads, standard sizes, focal points and modern image formats.
sidebar:
  order: 5
---

## Uploads

Uploads (`/api/admin/media`) are processed by `src/lib/media/process.ts` with sharp:

- Images over 2560px get a `-scaled` copy, used as the full size.
- The standard sizes are generated, hard crops centred on the focal point.
- Every file gets AVIF and WebP copies next to it.

## Focal points

`media.focal_point` (`{ x, y }` in 0..1) is set in the media library, with optional overrides per crop
shape (`media.crop_focals`: square, 16:9, 4:3, 3:4; `src/lib/media/focal.ts`). Changing them
re-crops the cropped sizes. Wherever an image is cropped to a ratio, the point for the nearest shape
becomes its `object-position`.

## Markup

Images render as `<picture>` with AVIF and WebP sources (`src/lib/media/image.ts`).
`src/lib/media/modernize.ts` does the same for plain `/media/` images and inline backgrounds in the
final HTML.

## Images are never deleted

The CMS never deletes or overwrites a stored image. The library has no delete; a sync restore or snapshot
restore that removes a file's library row leaves its images in storage; and an upload takes a name that
no library row or stored file already starts with, so it can't overwrite images kept that way. Re-crops
rewrite only the cropped sizes, which can be made again from the original. Backups hold library rows,
not images (see [Sync](../sync/#backups-and-snapshots)).

## Existing media

`scripts/media-formats.ts` backfills the AVIF and WebP copies; `processed_at` marks the files done.

```sh
npx tsx --env-file=.env scripts/media-formats.ts
```
