---
title: Search
description: The search page, live results and the search API.
sidebar:
  order: 6
---

## The search page

`/search/?q=` lists the entries whose title, excerpt or body text (`entries.body_text`) contain
every word, ranked by relevance (`Loader.queryRanked`):

1. the phrase in the title,
2. then words in the title, excerpt and text,
3. newest first on ties.

It searches the types chosen under Settings > Search (`settings.site.search_types`, `searchTypes`);
by default all types with a page. It renders the `search` template (`src/lib/content/search-template.ts`),
else `index`. The page is noindex.

## The search form

The `search-form` block is a GET form to `/search/`. On any page with a `.c-search-form`, the page
shell adds `public/assets/js/search.js`: live results under the field as an ARIA combobox (arrows,
Enter; Escape closes only the list).

A form sets these as data attributes:

| Attribute | Effect |
| --- | --- |
| `data-types` | Narrows the types (any with a page of its own) |
| `data-taxonomy` | Adds that taxonomy's terms in use to the suggestions |
| `data-input` | The field's name (default `q`) |
| `data-all` | `false` leaves out the link to all results |

Picking a term fires a cancelable `c-search:term` event on the form.

## API

`GET /api/search?q=&limit=&types=&taxonomy=` returns JSON, cached at the CDN for a minute.
