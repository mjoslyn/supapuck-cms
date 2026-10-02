---
title: How rendering works
description: From a request to HTML strings, styles, scripts and caching.
sidebar:
  order: 1
---

`src/render/` turns a request into HTML strings, in four steps:

1. **Resolve** the queried entry or archive and its template (`page.ts`).
2. **Prepare** all data up front (`prepare.ts`): queries, media, parts, patterns, and the site blocks'
   `prepare` hooks. Results go on `ctx.data`; blocks add page scripts to `ctx.scripts` /
   `ctx.headScripts` and vendor CSS through `ctx.assets`.
3. **Render** the items (`engine.ts` and the registry in `blocks/index.ts`, plus the site's blocks).
   Renderers are synchronous string functions, so the same code runs in the editor.
4. **Texturize** the whole output (smart quotes, dashes).

Supporting code:

- `src/lib/text/`: texturize, autop, entities
- `src/lib/date-format.ts`: PHP-style date formats stored in content
- `src/lib/media/image.ts`: image markup
- `src/lib/permalink.ts`: entry URLs

## CSS

`src/styles/site.css` (Tailwind, no preflight) imports the site's `tokens.css` and `theme.css`,
`forms.css` and `events.css`; the page shell links the compiled file. Only Swiper and Leaflet CSS come
from a CDN (`VENDOR_CSS` in `page.ts`).

## Scripts

Browser scripts are in `public/assets/js/`. Each enhances the server markup; the page works without
it.

## Caching

Pages are cached at the CDN for 60 seconds, with stale-while-revalidate for a day. Signed-in editors'
editor bar is added in the browser, so cached pages stay shared.

