# supapuck-cms: the core (Astro + Puck + Supabase)

A CMS for small organisation sites: Astro SSR on Netlify, content in Supabase, a Puck visual editor,
and Compose (pages written with Claude from documents, images and links). The code is split into the
core (everything outside `src/site/`) and a site (`src/site/`). This repository holds the core and an
example site; a real site is a fork that replaces `src/site/` (see Upstream and sites).

## Upstream and sites

This repository is the upstream. Each site is its own repository with this one as its `upstream`
remote. Its history starts from this one, with a commit that swaps the example `src/site/` for its own.

- Core changes are made here, committed and pushed, then merged into each site:
  `git fetch upstream && git merge upstream/main`. They merge cleanly as long as the site only changes
  `src/site/`, its own migrations (`supabase/migrations/*_site_*.sql`: the Supabase CLI reads only that
  folder), `AGENTS.md`, `README.md`, its env and its local ports (`supabase/config.toml`).
- All of a site's code and files are in `src/site/`, laid out like the core so each maps onto its
  counterpart: `render/c/` (blocks, as `src/render/c/`), `lib/` (`lib/content/cards.ts` beside
  `src/lib/content/card-presets.ts`), `pages/api/` (endpoints, listed in `routes.json`), `styles/`
  (`tokens.css`, `theme.css`), `public/` (static files, served at the same paths as `public/` by the
  `site-public` integration in `astro.config.mjs`; a site file wins), `scripts/` (the site's own checks)
  and `migrations/` (content migrations). The entry points stay at the top: `config.ts`, `render.ts`,
  `editor.tsx`, `presets.json`, `routes.json`, `moved-paths.json`.
- This file (`CORE.md`) documents the core and belongs to upstream; sites don't edit it. A site's own
  notes go in its `AGENTS.md`, which imports this file.
- A core fix found while working on a site can be made there and sent upstream: commit it on its own
  (core files only), then `git cherry-pick` it here.
- Never import from `src/site/` in core code except through `src/lib/site` (the CSS imports of the
  site's `styles/tokens.css` and `styles/theme.css` in `src/styles/site.css` aside). New core code must not hard-code a site's types, URLs or names.
- Migrations (core and site) are named with the time they were written (`YYYYMMDDHHMMSS_name.sql`).
  One written earlier than a migration a site already applied is out of order: apply it with
  `npx supabase db push --include-all` (locally `migration up --include-all`).
- Content changes (renamed props, moved settings) ship as migrations: see Changing stored content.

## Site config

Everything that differs between sites lives in `src/site/`:

- `config.ts` (`defineSite`, types in `src/lib/site/types.ts`): name, organization, admin email,
  default timezone, default mail sender, the Compose brief, content types (labels, URL `base`, `archive` path,
  `record`/`pageless`/`hidden`, taxonomies (`category`, its main one, and `taxonomies`, any others;
  each gets a term picker in an entry's settings, and collections, the event calendar and bulk actions
  offer them; `taxonomiesOf`), `fields` with `compose` hints, `describe`,
  `logoField`, default `card`, `order`) and taxonomies (label, URL `base`, the type a term page `lists`;
  `category` and `tag` are required). Core code reads it only through `src/lib/site` (`CONTENT_TYPES`,
  `COMPOSABLE_TYPES`, `LISTABLE_TYPES`, `RECORD_TYPES`, `PAGELESS_TYPES`, `TYPE_BASES`,
  `ARCHIVE_PATHS`, `TAXONOMY_BASES`, `fieldsFor`, `categoryOf`, `termPageType`, `SITE_TZ`): the
  editor's Details, Compose's fields and prompt, permalinks, URL routing (archives, term pages,
  records), collection filters and the admin tabs all follow it.
- `render.ts` (`defineRender`, read through `src/lib/site/render.ts`): `redirect` (the site's old URLs,
  301ed from the catch-all route), `blocks` with label, editor
  category, string renderer, an async `prepare` hook that loads data onto ctx, and optional `types`
  (the entry types a block reads fields from, so the editor offers it only there and in templates);
  `cards` (collection card designs; the first is the default); `archiveQuery` to add search or filters
  to listing pages; `head` (fonts, meta); `pageScripts` for footer scripts.
- `editor.tsx` (`defineEditor`, read through `src/lib/site/editor.ts`): settings `panels` for the
  site's blocks, `settingsFields` and `settingsTitle` for site options under Settings.
- `styles/tokens.css` (design token values, including the role colors the core uses) and `presets.json` (the colors, sizes and spacing the editor
  offers), `styles/theme.css` (the site's styles, imported by `src/styles/site.css`).
- `migrations/index.ts` (`MIGRATIONS`, content migrations run before the core's), `routes.json` (the
  site's own endpoints in `src/site/pages/api/`, added by the `site-routes` integration in
  `astro.config.mjs`), `moved-paths.json` (URL prefixes that moved, 301ed).

Behaviour never keys off content class names: the core uses block settings (entry-image `field` and
`linkField` for a logo or banner field linked to a URL field; an `event-date` block for card dates;
collection `shuffle`, `query.orderBy: 'rand'`, `query.upcoming`, `columns`, `autoplay`). Core blocks
output `c-*` classes; a site's classes in content are only styling hooks for its `theme.css`.
Colors: the core's styles use only role tokens (`--color-text`, `-muted`, `-accent`, `-accent-hover`,
`-dark`, `-on-dark`, `-on-accent` (optional), `-surface`, `-surface-alt`, `-surface-soft`), which the site's `tokens.css` maps
onto its own palette (and re-maps inside dark bands). Content and `presets.json` use the palette names.
Compose's house style comes from the config's `compose`: colors (bands `plain`/`tint`/`soft`/`dark`,
body, on-dark, accent and card; role tokens by default), and shapes and type (`headingFont`, `rule`
between eyebrow and heading, `bodySize`/`bodyWeight`/`bodyLineHeight`, `bandPadding`, `textWidth`,
`wideWidth`, `radius`, `buttonRadius`, `buttonCaps`; the defaults are the original house style).

## Data model

Entries have a `type` (from the site config) and terms a `taxonomy`; custom values live in
`entries.fields` under plain names (the type's `fields`). Events use `start`/`end` (wall-clock in
`timezone`), `all_day`, `cost`, `website`, `venue` (entry id), `featured`, `recurrence`, `schedule`.
Image fields hold media ids. `entries.body_text` is the entry's readable text, filled from its
content by a database trigger (`entry_body_text`), for search and event descriptions. Site-wide values
are in `settings` (`site`, `options`). Schema:
`supabase/migrations/`.

## Components

Content is Puck data (`entries.content`, `templates.content`): items `{ type, props: { id, attrs,
children } }`, rendered by `src/render/c/`: content blocks (`section`, `columns`, `text`, `heading`,
`image`, `buttons`, `list`, `quote`, `cover`, `hero`, `gallery`, `video-gallery`, `embed`, `html`,
`media-text`...), entry fields (`entry-title`, `entry-image`, ...), collections (`collection`,
`collection-items`, `pagination`...), events (`event-date`, `events-calendar`, `event-calendar`,
`event-details`), `form`, and structure (`part`, `pattern`, `reusable`). A site's blocks come from its
`render.ts`. `hero` is a full-bleed image with eyebrow, title, text and two buttons. Galleries hold
image blocks (`gallery`) or embed and video blocks (`video-gallery`) and show them as a grid, masonry
columns or a slider (`display`; a scroll-snap row, buttons and autoplay from
`public/assets/js/gallery-slider.js`); media picked in the panel arrive as `attrs.add` and become
child blocks in `resolveGallery` (`config.tsx`).
Props are clean values: styles as CSS with design tokens (`var(--color-*)`, `var(--space-*)`,
`var(--text-*)`), layouts as `{ type: flow|constrained|row|stack|grid }`.

Patterns (`templates` of type `pattern`) are reusable groups of blocks, inserted from the Patterns tab;
their thumbnails come from `/admin/pattern-preview?slug=`. Any block's settings end with **Save as
pattern** (the block and everything in it): a copy pattern inserts its own blocks, for the page to
change freely; a linked pattern (`root.props.linked`) is placed as a reference whose layout and style
stay the pattern's (editing the pattern changes every page) while each page changes its content:
`{ type: 'pattern', attrs: { slug, linked: true, overrides: { <pattern block id>: { content: ... } } } }`
(`src/lib/content/linked-patterns.ts`; which settings are content: `CONTENT_FIELDS`). In the editor a
linked pattern opens as its blocks (`expandLinked`), locked against moving, removing and adding, each
block's panel showing only its content fields (`src/puck/LinkedPatterns.tsx`); saving stores the
reference and the changed content (`collapseAll`), or an ordinary copy if its blocks no longer match
the pattern; Detach makes the copy on purpose. Globals (the `global` type, placed with the Global
block) share content and style alike.

## Collections and tags

A `collection` lists entries with its settings on the block itself (`src/puck/CollectionPanel.tsx`):
what to show (latest of some types, filtered by category and tags; hand-picked `query.include`; or the
page's own listing), display (grid with desktop/tablet/phone columns, list, slider), card design
(the site's `cards`, `src/lib/content/card-presets.ts`; choosing one replaces the item template via
`resolveCollection` in `config.tsx`; "custom" keeps the blocks), pagination (numbers, previous/next,
load more: `public/assets/js/collection-more.js` fetches the next page URL and appends that
collection's items) and an empty message. Card fields: `entry-title`, `entry-image`, `entry-excerpt`,
`entry-date`, `event-date`, `entry-terms`, `entry-field` (any field as text/link/email/phone/image).
Item, empty and pagination child blocks of older collections still render but aren't in the inserter.
A shuffled collection (`shuffle`) renders part of a pool of up to 48 entries and
`public/assets/js/collection-shuffle.js` picks a new random set on each visit.

Tags are terms of the `tag` taxonomy on any type: edited in each entry's settings (created on save,
`setEntryTags`), filterable in collections (`query.taxQuery.tag`), listed at `/tag/<slug>/`.

Content > Taxonomies (`src/admin/Terms.astro`, `/api/admin/terms`) manages every taxonomy's terms, a
tab each: terms nested under their parents (tags stay flat), with name, address and template to change,
how many entries use each, its page and Delete. A term can't sit under itself or its children; a
changed address leaves a redirect from the old term page; deleting a term moves its children up.
Terms move by dragging their handle: onto another's top or bottom edge to go beside it, onto its middle
to go under it, or onto Top level; the handle's menu does the same from the keyboard (Move up, Move
down, Move under). Their order among the terms beside them is `terms.sort` (then name), used by the
list, the Filters dropdown and an entry's listed terms (`byTermOrder`).

Term pages: their template is the term's own (Content > Taxonomies, `terms.fields.template`; the terms
under a term share its template, and several ticked terms can be set at once), else
`taxonomy-<taxonomy>-<slug>`, else the taxonomy's (Settings > Types, `settings.site.taxonomy_templates`),
else `taxonomy-<taxonomy>`, `taxonomy`, `archive`, `index` (`templateCandidates`, `termTemplate`). A taxonomy's term pages can be
turned off (Settings > Types, `settings.site.taxonomy_pages_off`, `termPagesOn`): its addresses then
serve a page with that address or Not found, and terms show without links (entry terms, event
categories, search suggestions).

## SEO and social

An entry's SEO settings live in `fields.seo` (`src/lib/seo.ts`; `seo` is a reserved field key): search
title, meta description, share image (media id) and noindex. `src/render/meta.ts` writes the head
tags: description, canonical, robots, Open Graph and Twitter card, falling back to the excerpt, the
featured image and the site's default share image; the home page also gets Organization data with the
social profiles as `sameAs`. Compose includes `seo` in every `build_page` and writes it (marked
`generated`) on each build until someone edits it by hand. The entry settings' SEO section
(`src/puck/SeoForm.tsx`) shows lengths and a search result preview, and Generate asks Claude
(`POST /api/admin/seo`, `ANTHROPIC_SEO_MODEL`, default Haiku 4.5) for the page as it is in the editor.

Settings > Social keeps the site's profiles (`settings.site.social`: network and URL;
`src/lib/social/links.ts`) and the default share image (`share_image`). The `social-links` block
(Layout) shows the profiles as icons (`src/lib/social/icons.ts`, Simple Icons paths, CC0), optionally
with names.

## Types in Settings

Settings > Types sets, per type, the template for its entries and its listing page
(`settings.site.templates`, `src/lib/templates.ts`), and turns listing pages off
(`settings.site.listings_off`; the address then serves a page with that address, if any, or 404; for
events the calendar views go too). An entry's own template (its settings) comes before its type's.
Templates without a Page content block are marked, and choosing one warns that the entry's content
won't show.
A template can have several Page content blocks, each naming a content area (`attrs.area`; `main`, the
default, is the entry's content). Other areas (`sidebar`, `intro`...) are filled in per entry and stored
as slots on its content's root (`root.props["area-<name>"]`, `src/lib/content/areas.ts`); the editor
shows each where the template places it. Saving a template gives a Page content block that repeats an
area the next free name (`area-2`, `area-3`...; `uniqueAreas`), so two never show the same content.

## Content list

The content list has All / Published / Drafts / Trash tabs and bulk actions on the checked rows
(`/api/admin/entries/bulk`): Publish (a placeholder address gets one from the title; untitled entries
are skipped), Move to drafts, Move to trash (not the home page); in the trash, Restore (as drafts) and
Delete permanently. Add a term and Remove a term change the entries' terms at once (the type's
taxonomies, tags and any taxonomy its entries use); a tag also goes into unpublished changes kept aside. **Duplicate** (list rows and the editor header; `src/lib/admin/duplicate.ts`) makes
a draft copy titled "(copy)" with its own address: content with any unpublished changes, fields, tags
and other terms, template, featured image and event dates. Templates, parts and patterns duplicate
from the templates list (`<slug>-copy`).

## Redirects

Settings > Redirects (admins; `/admin/redirects/` forwards there): old address to new (301 or 302), exact or a prefix ending in `*` whose
rest fills a `*` in the target (`src/lib/redirects.ts`, tables `redirects` and `not_found`). Whether a
rule covers an address is decided in one place, `ruleCovers`: an exact rule covers its own path, a
wildcard every path under its prefix. Redirects apply when an address would otherwise be Not found
(`renderRequest`, before the slug guess), so they never hide a live page: the exact rule first, else
the wildcard with the longest prefix (the `wildcard` column; in a PostgREST like pattern `*` means
`%`). Uses are counted (`redirect_hit`). A rule that would lead back to itself is refused
(`loopReason`: a wildcard whose target is under its own prefix). A published entry whose address
changes gets one automatically (`redirectMovedEntry`, from the entries API).

Addresses still not found are logged (`not_found`, via `not_found_hit`; files, admin and probes are
left out) and listed on the screen with Add redirect. Saving a rule clears the entries it covers (for a
wildcard, every entry under its prefix, which can be many); the API returns the cleared paths, and
reports a failed clear rather than hiding it.

## Sync

Settings > Sync (admins; `src/admin/Sync.tsx`, `/api/admin/sync`, `src/lib/sync.ts`; backups on Settings >
Backups) copies content
between this site and another copy of it (production and a local copy), either way: entries of chosen
types (with their terms and unpublished changes), terms of chosen taxonomies, files (media rows and
every storage object: sizes, the kept original, AVIF/WebP copies), templates, parts and patterns,
forms, settings (`site`, `options`; the site icon's files too) and redirects. The other copy is reached
directly with `SYNC_REMOTE_URL`, `SYNC_REMOTE_SERVICE_KEY` and `SYNC_REMOTE_NAME`, so a sync runs from
the copy that has them set (production can't reach a local copy).

- Rows match by id (entries, terms, media, forms: the copies share ids, and a sync keeps them; then
  `sync_reset_ids()` moves the id counters past them), by kind and slug (templates), by key (settings)
  and by old address (redirects). Derived columns (`updated_at`, `body_text`, a redirect's
  `wildcard`) are neither compared nor written.
- Compare (`plan`) lists each group's new, changed and unchanged rows and its conflicts, which are
  left alone: an id that is another row there, an address taken by another row, a parent or featured
  image that isn't there (unless the sync brings it). Each new or changed row can be unticked, and
  **Show differences** opens a line diff of the row as the target has it and as the sync would write it.
- Syncing (`apply`, in batches the screen sends in turn) needs a warning ticked that names the target
  and counts the rows it overwrites. It never deletes.
- Before the first batch, `backup` checks the target can take the sync (not protected, and
  `sync_reset_ids()` there: a copy without the migrations is refused before anything is written) and,
  unless **Save a backup first** (on by default) is unticked, saves a backup in the target's private
  `sync-backups` bucket: the rows the sync overwrites, whole and as they are, and the keys of the rows
  it adds. If that fails, nothing is synced.
- **Snapshots**: everything a sync covers on one copy (entries with their terms and unpublished
  changes, terms, media rows, templates, forms, settings `site` and `options`, redirects), in the same
  bucket as `<time>-snapshot-<trigger>.json`. Taken by **Back up now** (`snapshotNow`), before a
  snapshot restore, and on a schedule: `netlify/functions/scheduled-snapshot.mts` runs daily at 07:00
  UTC on the deployed site (not under `astro dev`) and calls `scheduledSnapshot`, which takes one if
  they are on and the last is due (daily or weekly).
- **Backups and snapshots hold rows, not stored images.** A file is backed up as its media row; its
  image files in storage are not, and no restore brings them back.
- **Settings > Backups** (`src/admin/Backups.tsx`) has a panel per copy (this site always, the other
  copy when one is set up): what it
  keeps (`settings.site.sync_backups_keep`, default 10, and `sync_snapshots` { enabled, every, keep },
  default 14; 0 keeps all; each copy's own, never synced or restored; older ones are deleted after
  each new one and when a number is lowered), and each backup to download, restore or delete.
- **Restore** (`restore`): a sync's backup undoes that sync on the copy holding it (the rows it
  overwrote go back, the rows it added are deleted); a snapshot puts every row it holds back
  (`snapshotPreview` counts them and the rows made since, which are deleted only with **Also delete**).
  Either way the current state is saved first (`before-restore`, never pruning the backup being
  restored), so a restore can be undone the same way, and the copy's own sync settings stay as they
  are. Rows to delete go first, so rows written back can't clash with them; rows are written 100 at a
  time (a failed batch is retried row by row, reporting only the rows that can't go back), and entries'
  terms and unpublished changes in bulk. Deleting a file deletes its media row only: its stored images
  stay.
- A site with **Protect this site from syncs** on (`settings.site.sync_protected`, set on its own Sync
  tab) refuses every sync into it; settings syncs keep each copy's own protection.

## Search

`/search/?q=` lists the entries whose title, excerpt or body text (`entries.body_text`) contain every
word, ranked by relevance (`Loader.queryRanked`: the phrase in the title, then words in title, excerpt,
text; newest first on ties), in the types chosen under Settings > Search (`searchTypes`,
`settings.site.search_types`; all types with a page by default). It renders the `search` template
(migration 0021, `src/lib/content/search-template.ts`), else `index`; the page is noindex. The
`search-form` block is a GET form to `/search/`. On any page with a `.c-search-form`, the page shell
adds `public/assets/js/search.js`: live results from `GET /api/search?q=&limit=` (JSON, CDN-cached a
minute) under the field, an ARIA combobox (arrows, Enter, Escape closes only the list). `types=`
narrows the types (any with a page of its own) and `taxonomy=` adds that taxonomy's terms in use; a form
sets these as data attributes (`data-types`, `data-taxonomy`, `data-input`, `data-all`), and picking a
term fires a cancelable `c-search:term` on the form.

## Filters, map and navigation

- **Filters** (`collection-filters`, `src/render/c/filters.ts`): a search box with suggestions, a
  taxonomy's terms as a dropdown and chips, the count and Clear, for the page's listing (archive, term
  or search page). Its query-string names are settings (`searchParam`, `termParam`), so a site keeps
  its old links. `prepare` finds Filters blocks before the main query and `applyFilters` applies them
  (terms with their descendants) before the site's `archiveQuery`; `public/assets/js/collection-filters.js`
  refreshes the listing in place and fires `c-filters:change` ({ taxonomy, ids }). Listed entries whose
  `featured` field is set get `is-featured`.
- **Map** (`map`, `src/render/c/map.ts`, `public/assets/js/map.js`, Leaflet): pins for a type's
  published entries with coordinates (field names are settings), linking to each with its address;
  it can follow a Filters block's taxonomy, show featured entries only until filtered, leave out
  entries with a given field on, and take a centre, zoom and height.
- **Navigation** (`navigation`, `src/render/c/navigation.ts`, `public/assets/js/navigation.js`): the
  menu from Settings > Menu (`settings.options.menu_items`, fields in `src/lib/navigation.ts`): links,
  and panels with a sidebar (heading, links, intro, View all) and cards (entries picked, or the latest
  of a type; upcoming for events); a search button opening the search form; a menu button on small
  screens. Top-level links take the colour of where the block sits; the header part is the box panels
  span. **Site title** (`site-title`): the site's icon and name from Settings, with optional text
  before the name.

## Compose with Claude

`/admin/compose/` and the Compose panel in the page editor (docked beside the canvas; pin keeps it
open) run a saved conversation per page (`compose_sessions`): the editor adds documents (PDF, Word,
text, Markdown), images and videos (uploaded to the media library or multi-selected from it), video
links (YouTube/Vimeo) and web links, and asks for a page or changes. A new conversation can create any
type with a page of its own (`COMPOSABLE_TYPES`); Claude is told what the type is (its `describe`) and
fills its fields (those with a `compose` hint in the site config) from the materials in the plan's
`fields` (`src/lib/compose/entry-fields.ts`) when the entry is created, and later with `update_fields`
(just the changed fields). The editor applies updates to its sidebar form (`LivePage.setFields`),
saved with the page. `src/lib/compose/`: `materials.ts` keeps a registry with stable ids (image-1,
doc-1...; PDFs in the private `compose` bucket, link text fetched once with private addresses refused,
images re-encoded to JPEG for Claude); `claude.ts` sends the whole conversation (prompt-cached) and
Claude either replies or calls `build_page` with the complete page plan (`spec.ts`); `build.ts` turns
the plan into components in the house style. Blocks built by a conversation carry its id prefix, so
each update replaces only those, in place; hand edits are shown to Claude. With a block selected in
the editor, the panel targets it (or its whole section): Claude answers with `edit_block`;
`src/lib/compose/edit.ts` checks the replacement (known types, kept ids, materials resolved; markup cut
to inline formatting and links, addresses to web/mail/phone/site links and raw HTML never taken from
Claude: `safe-html.ts`, since materials can carry instructions). Claude can
also call `search_site` (`src/lib/compose/site.ts`) to feature the site's own entries. Needs
`ANTHROPIC_API_KEY` (optional `ANTHROPIC_MODEL`, default claude-opus-5-5).

A turn runs as a job (`src/lib/compose/job.ts`, table `compose_jobs`) because a build takes 30-90s or
more, past Netlify's request limits: `POST /api/admin/compose` reads the materials, queues the turn and
POSTs `{ jobId, token }` to the background function `netlify/functions/compose-background.mts`
(answers 202, runs up to 15 minutes); under `astro dev` the route runs the job in-process. The runner
claims the job with its token and writes progress and the result or error to the row; the panel polls
`GET /api/admin/compose?job=<id>`; a job silent for 3 minutes or older than 16 is reported as failed.
One turn at a time per conversation (409 otherwise).

## How rendering works

- `src/render/` turns a request into HTML strings: resolve the queried entry/archive and template
  (`page.ts`), `prepare()` all data (queries, media, parts, patterns, site block hooks), render items
  (`engine.ts` and the registry in `blocks/index.ts`, plus the site's blocks), then `texturize` the
  whole output (smart quotes, dashes).
- `src/lib/text/` (texturize, autop, entities), `src/lib/date-format.ts` (PHP-style date formats stored
  in content), `src/lib/media/image.ts` (image markup), `src/lib/permalink.ts`.
- CSS: `src/styles/site.css` (Tailwind, no preflight) imports the site's `tokens.css` and `theme.css`,
  `forms.css` and `events.css`; the page shell links the compiled file. Only Swiper and
  Leaflet CSS come from a CDN (`VENDOR_CSS` in `page.ts`). Scripts are in `public/assets/js/`.
- Pages are cached at the CDN (60s, stale-while-revalidate a day). Signed-in editors get an editor bar
  (`public/assets/js/editor-bar.js`, `/api/admin/me`) added in the browser, so cached pages stay shared.

## Media

Uploads (`/api/admin/media`) are processed by `src/lib/media/process.ts` (sharp): images over 2560px get
a `-scaled` copy as the full size, the standard sizes are generated (hard crops centred on the focal
point), and every file gets AVIF and WebP copies next to it. `media.focal_point` ({x, y} in 0..1) is set
in the media library, with optional overrides per crop shape (`media.crop_focals`: square, 16:9, 4:3,
3:4; `src/lib/media/focal.ts`). Changes re-crop the cropped sizes; the point for the nearest shape
becomes `object-position` wherever the image is cropped to a ratio. Images render as `<picture>` with
AVIF/WebP sources; `src/lib/media/modernize.ts` does the same for plain `/media/` images and inline
backgrounds in the final HTML. Existing media: `scripts/media-formats.ts` backfills the copies
(`processed_at` marks done).

## Forms

Form builder at `/admin/forms/` (`src/forms/FormBuilder.tsx`). Forms live in the `forms` table
(`src/lib/forms/types.ts`: fields with ids like `f1`, widths on a 12-column grid, conditional logic,
confirmation), notification settings in a column anon can't read. The markup comes from
`src/render/forms/form.ts` (styles `src/styles/forms.css`; `public/assets/js/forms.js` runs conditional
logic, US phone formatting and character counters; everything is validated on the server). Place forms
with the `form` block. Submissions POST back to the page (`src/lib/forms/submit.ts`: validation that
skips fields hidden by conditional logic, honeypot, storage, notifications to the form's addresses or
`FORMS_ADMIN_EMAIL` / the config's `adminEmail`). Mail goes out over SMTP
(`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE`, or one `SMTP_URL`; sender `MAIL_FROM`,
default `mailFrom` in the site config).

## Events

`src/lib/events/model.ts` loads events (occurrences included) as `CalEvent`s;
`src/render/events/calendar.ts` renders the `events-calendar` block, `event-calendar.ts` the month
grid / list block for any page (`public/assets/js/event-calendar.js`) and `single.ts` the
`event-details` block (styles `src/styles/events.css`). URLs: `/events/` (upcoming list),
`/events/past/`, `/events/month/<Y-m>/`, `/events/day/<Y-m-d>/`, with `?q=` search and `?from=<Y-m-d>`.
Feeds (`src/lib/events/ical.ts`): `/events.ics` (same `q`, `month`, `past` filters) and
`/event/<slug>/[<Y-m-d>/]event.ics`; they describe `SITE_TZ` from the runtime's time zone data
(`src/lib/events/timezone.ts`).

The site timezone (`SITE_TZ`) is set by admins under Settings (`settings.site.timezone`; the config's
`timezone` is the default). It is a live binding in `src/lib/site`: the middleware and compose jobs
refresh it from the settings (`src/lib/site/timezone.ts`, cached a minute), admin pages pass it to
the browser as `window.__siteTz`. Changing it moves events that were on the old timezone to the new
one with their local times kept (`moveEventsToTimezone`); events with their own timezone stay.

Recurrence (`src/lib/recurrence.ts`): an event's rule is stored in `fields.recurrence` and edited in
the event sidebar. Occurrences are virtual entries (negative ids, own `event_start`/`start`/`end`) at
`/event/<slug>/<Y-m-d>/`; `/event/<slug>/` redirects to the next one. `Loader.query` expands series
only when a recurring event exists. Saving an event rewrites the `start`/`end` fields the views read.

## Editor

`/admin/` (Supabase Auth; `profiles.role`: editor, admin, or viewer = no access). Editors manage content,
templates, media, forms and compose; site settings and users (`/admin/users/`: roles, invitations) are
for admins (`ADMIN_ONLY` in `src/middleware.ts`; settings writes are admin-only in RLS via
`is_admin()`). `src/puck/Editor.tsx` renders blocks through the same string renderer inside Puck
(`BlockView.tsx` parses HTML to React; slots become the block's inner wrapper element). The left rail
has Blocks (and Patterns), Outline and an accessibility check (`A11yPanel.tsx`). Problems a person has to judge
(warnings, and text over an image, which is always a problem since its contrast can't be measured) can be
marked as checked with a note; the marks live in the document's root props (`a11y`), save on their own as
they are made (`PUT /api/admin/a11y`; not an unsaved edit), and lapse when the text or image they were about changes. Blocks with `types`
are offered only on those entry types. Pages whose template has no `post-content` are edited in layout
mode: the template document itself.

Saving: **Save draft** keeps changes to a published page aside (table `entry_drafts`, editors only:
published rows of `entries` are public) with the live page
unchanged; unpublished pages save in place as drafts. **Publish** / **Publish changes** makes them live;
the header also offers Discard changes and Unpublish (`PUT /api/admin/entries/:id` with `action`).
**Preview** opens `/admin/preview/<id>/` with the editor's current state (POST) or the saved draft
(GET), rendered like the site with a preview bar and noindex. Templates and layout mode have no drafts:
"Save & apply" changes every page using them.

Record types (`record: true`, such as venues) are data only: `/admin/edit/<id>/` shows a plain form for
them (`src/puck/RecordEditor.tsx`) with the entries that use them. An `entry` field (`EntryField` in
`src/puck/entry-fields.tsx`) picks one: search, clear, or add a new one inline. `POST
/api/admin/entries` creates entries (form post from the list: untitled draft; JSON from pickers:
titled, returns the id).

## Hosting

Netlify, with a hosted Supabase project (`npx supabase link`). Migrations: `npx supabase db push
--linked`; SQL: `npx supabase db query --linked`. Hosted projects don't grant the API roles access to
new tables (the local stack does): migration 0019 grants them and sets default privileges, and RLS
does the rest. `scripts/copy-storage.ts` copies storage objects from the local stack to a hosted
project (resumable). Editors set their password at `/admin/set-password/` (invitation and reset links
land there), so Supabase Auth's Site URL and redirect URLs must include the site's domain. Env:
`.env.example`.

## Commands

```
npx supabase start                      # local stack (ports in supabase/config.toml)
npx astro dev --background              # http://localhost:4321
npx tsx --env-file=.env scripts/create-editor.ts you@example.org 'password' [editor|admin]   # a user
npm run seed                            # starter templates, home page, sample event (skips what exists)
npx tsx --env-file=.env scripts/migrate-content.ts [--dry-run]   # site then core content migrations
npx tsx scripts/checks/formatting.ts    # autop/texturize against data/formatting-corpus.json (not in the repo)
npx tsx scripts/checks/recurrence.ts    # recurrence rules, DST, event date sync
npx tsx --env-file=.env scripts/media-formats.ts   # backfill AVIF/WebP for existing media
```

The e2e scripts (`scripts/*-e2e.ts`, `scripts/checks/compose.ts`) sign in as `LOCAL_ADMIN_EMAIL` /
`LOCAL_ADMIN_PASSWORD` and were written against a site with content (pages, events, venues, members);
on the example site some need that content first.

## Changing stored content

Content changes the core or a site needs (renamed props, moved settings, switched block types) ship as
a content migration or a SQL migration that edits the JSON. Content migrations are the core's
(`migrateCollectionLayout` in `src/lib/content/collections.ts` is one) and the site's
(`src/site/migrations/`); `scripts/migrate-content.ts` runs the site's first, then the core's.

- Walk the JSON properly (PL/pgSQL or TypeScript): the key order of stored blocks varies, so text
  patterns miss some.
- Keep updated dates: disable the `*_touch` triggers around the update.
- Name migrations with the time they are written (`YYYYMMDDHHMMSS_name.sql`; a site's
  `YYYYMMDDHHMMSS_site_name.sql`).
- When a migration switches block types or settings, the new code and the database change must land
  together: push the code, wait for the deploy, then `npx supabase db push --linked` at once (the
  pages break in between).

## Checking changes

- Render the affected pages before and after and diff the HTML for unintended changes (ignore
  cache-busting `?v=` values and shuffled collections); look at screenshots (desktop and phone) of
  intended ones. Lazy-loaded images need the page scrolled before a full-page screenshot.
- Browser tests use Playwright from a script inside the project (so imports resolve), signing in as
  `LOCAL_ADMIN_EMAIL` / `LOCAL_ADMIN_PASSWORD` from `.env`; POSTs to Astro need an `Origin` header
  (CSRF check). The editor canvas is `iframe#preview-frame`; blocks that can't be dragged report as
  disabled, so tests click them with `force`.
- Checks that need one site's content live in that site's `src/site/scripts/`.

## Rules

- Check changes against the site's own output (see Checking changes).
- Name code, data, URLs and classes for what they are here, not after another system's names.
- Section and loop markup is followed by autop; keep the whitespace in those templates as it is.
