---
title: Taxonomies and tags
description: Terms, tags, term pages and their templates.
sidebar:
  order: 4
---

Taxonomies are declared in the site config. `category` and `tag` are required; a site adds its own
(`event_category`, `member_category`...). A type's `category` is its main taxonomy and `taxonomies`
lists any others. Each gets a term picker in an entry's settings, and collections, the event
calendar and bulk actions offer them.

## Tags

Tags are terms of the `tag` taxonomy, on any type. They are edited in each entry's settings (created
on save, `setEntryTags`), filterable in collections (`query.taxQuery.tag`) and listed at
`/tag/<slug>/`.

## Managing terms

**Content > Taxonomies** (`src/admin/Terms.astro`, `/api/admin/terms`) has a tab per taxonomy:
terms nested under their parents (tags stay flat), with name, address and template to change, how
many entries use each, a link to its page, and Delete.

- A term can't sit under itself or its children.
- A changed address leaves a redirect from the old term page.
- Deleting a term moves its children up.

### Ordering

Terms move by dragging their handle: onto another term's top or bottom edge to go beside it, onto its
middle to go under it, or onto **Top level**. The handle's menu does the same from the keyboard
(Move up, Move down, Move under). The order among siblings is `terms.sort` (then name), used by the
list, the Filters dropdown and an entry's listed terms (`byTermOrder`).

## Term pages

A taxonomy's `base` sets where its term pages live: `base: 'events/category'` serves
`/events/category/<slug>/`. A term page lists the taxonomy's `lists` type.

### Template

The first that exists (`templateCandidates`, `termTemplate`):

1. The term's own template (Content > Taxonomies, `terms.fields.template`). Terms under a term share
   its template, and several ticked terms can be set at once.
2. `taxonomy-<taxonomy>-<slug>`
3. The taxonomy's template (Settings > Types, `settings.site.taxonomy_templates`)
4. `taxonomy-<taxonomy>`, `taxonomy`, `archive`, `index`

### Turning them off

A taxonomy's term pages can be turned off under Settings > Types (`settings.site.taxonomy_pages_off`,
`termPagesOn`). Its addresses then serve a page with that address or Not found, and its terms show
without links in entry terms, event categories and search suggestions.
