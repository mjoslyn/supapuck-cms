---
title: Filters, map and navigation
description: Listing filters, the map block, the menu and the site title.
sidebar:
  order: 7
---

## Filters

The `collection-filters` block (`src/render/c/filters.ts`) filters the page's listing on an archive,
term or search page: a search box with suggestions, a taxonomy's terms as a dropdown and chips, the
count, and Clear.

- Its query-string names are settings (`searchParam`, `termParam`), so a site keeps its old links.
- `prepare` finds Filters blocks before the main query, and `applyFilters` applies them (terms with
  their descendants) before the site's `archiveQuery`.
- `public/assets/js/collection-filters.js` refreshes the listing in place and fires
  `c-filters:change` with `{ taxonomy, ids }`.

## Map

The `map` block (`src/render/c/map.ts`, `public/assets/js/map.js`, Leaflet) shows pins for a type's
published entries with coordinates, each linking to its entry with its address. Settings:

- the type, and the field names holding the coordinates
- follow a Filters block's taxonomy
- show featured entries only until filtered
- leave out entries with a given field on
- centre, zoom and height

## Navigation

The `navigation` block (`src/render/c/navigation.ts`, `public/assets/js/navigation.js`) renders the
menu from **Settings > Menu** (`settings.options.menu_items`, fields in `src/lib/navigation.ts`):

- links
- panels, with a sidebar (heading, links, intro, View all) and cards: entries picked, or the latest of
  a type (upcoming, for events)
- a search button that opens the search form
- a menu button on small screens

Top-level links take the color of where the block sits. The header part is the box panels span.

## Site title

The `site-title` block shows the site's icon and name from Settings, with optional text before the
name.
