---
title: Editor and roles
description: The Puck page editor, drafts, preview, the accessibility check and user roles.
sidebar:
  order: 1
---

The admin is at `/admin/`, signed in through Supabase Auth.

## Roles

`profiles.role` is one of:

| Role | Access |
| --- | --- |
| `editor` | Content, templates, media, forms and Compose |
| `admin` | Everything editors have, plus site settings, redirects and users |
| `viewer` | No access |

Admin-only pages are listed in `ADMIN_ONLY` (`src/middleware.ts`); settings writes are admin-only in
row-level security (`is_admin()`). Admins manage users at `/admin/users/`: roles and invitations.
Editors set their password at `/admin/set-password/`, where invitation and reset links land.

## The page editor

`src/puck/Editor.tsx` renders blocks through the same string renderer as the site, inside Puck
(`BlockView.tsx` parses the HTML to React; slots become the block's inner wrapper element). What you
see while editing is the site's own markup.

The left rail has **Blocks** (and **Patterns**), **Outline** and an **accessibility check**. Blocks
with `types` are offered only on those entry types. A **Compose** panel docks beside the canvas
([Compose](../compose/)).

## Saving and publishing

- **Save draft** keeps changes to a published page aside (`entry_drafts`) while the live page stays
  unchanged. Unpublished pages save in place as drafts.
- **Publish** / **Publish changes** makes them live.
- **Discard changes** and **Unpublish** are in the header (`PUT /api/admin/entries/:id` with
  `action`).
- **Preview** opens `/admin/preview/<id>/` with the editor's current state (POST) or the saved draft
  (GET), rendered like the site with a preview bar and noindex.

A published entry whose address changes gets a redirect from the old one automatically.

## Accessibility check

`A11yPanel.tsx` lists problems on the page. Those a person has to judge (warnings, and text over an
image, whose contrast can't be measured) can be marked as checked with a note. The marks live in the
document's root props (`a11y`), save on their own as they are made (`PUT /api/admin/a11y`; not an
unsaved edit), and lapse when the text or image they were about changes.

## Editor bar on the site

Pages are cached at the CDN, so the editor bar signed-in editors see on the public site is added in
the browser (`public/assets/js/editor-bar.js`, `/api/admin/me`).
