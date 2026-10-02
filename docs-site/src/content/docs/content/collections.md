---
title: Collections
description: Lists of entries as grids, lists or sliders, with card designs and pagination.
sidebar:
  order: 3
---

A `collection` block lists entries. Its settings live on the block itself
(`src/puck/CollectionPanel.tsx`).

## What it shows

- The latest of some types, filtered by category, tags and other taxonomies (`query.taxQuery`)
- Hand-picked entries (`query.include`)
- The page's own listing, on archive, term and search pages
- Upcoming events only (`query.upcoming`)
- Random order (`query.orderBy: 'rand'`)

## Display

- **Grid**, with desktop, tablet and phone columns
- **List**
- **Slider**

## Card design

Card designs come from the site's `cards` (`src/site/lib/content/cards.ts`) and the core's
(`src/lib/content/card-presets.ts`). Choosing one replaces the item template
(`resolveCollection` in `src/puck/config.tsx`); **Custom** keeps the blocks for hand-editing.

Listed entries whose `featured` field is set get the `is-featured` class.

## Pagination

Numbers, previous and next, or **Load more**: `public/assets/js/collection-more.js` fetches the next
page's URL and appends that collection's items.

An empty message shows when nothing matches.

## Shuffle

A shuffled collection (`shuffle`) renders part of a pool of up to 48 entries, and
`public/assets/js/collection-shuffle.js` picks a new random set on each visit, so cached pages still
vary.
