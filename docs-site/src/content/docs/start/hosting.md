---
title: Hosting
description: Put a site on Netlify with a hosted Supabase project.
sidebar:
  order: 2
---

A site runs on Netlify (Astro SSR) with a hosted Supabase project for the database, auth and storage.

## 1. Supabase

Create a project at supabase.com, then link it and apply the migrations:

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push --linked
```

Under **Authentication > URL Configuration**:

- set the **Site URL** to your domain;
- add `https://<your-domain>/admin/set-password/` to the **Redirect URLs**. Invitation and
  password-reset links land on that page.

:::note
Hosted projects don't grant the API roles access to new tables the way the local stack does.
Migration 0019 grants them and sets default privileges; row-level security does the rest.
:::

## 2. Seed and create an admin

Point a copy of `.env` at the hosted project (its URL, anon key and service_role key, from
**Project Settings > API**) and run the same commands as locally:

```sh
npx tsx --env-file=.env.production scripts/seed.ts
npx tsx --env-file=.env.production scripts/create-editor.ts you@example.org 'a-password' admin
```

To move local media to the hosted storage bucket, use `scripts/copy-storage.ts` (resumable).

## 3. Netlify

- Create a site from your repository. The build settings are in `netlify.toml`.
- Set the same environment variables as `.env`: the Supabase URL and keys, plus the optional Compose
  and SMTP ones.
- Add your domain.

Compose runs long jobs in the background function `netlify/functions/compose-background.mts`, which
Netlify deploys with the site.

## 4. Invite editors

Admins invite editors from `/admin/users/`. See [Editor and roles](../../features/editor/).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` | The Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side access |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` or `SMTP_URL` | Outgoing mail |
| `MAIL_FROM` | Sender, overriding the config's `mailFrom` |
| `FORMS_ADMIN_EMAIL` | Where form notifications go when a form doesn't say |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Compose |
| `ANTHROPIC_SEO_MODEL` | SEO text generation (default Haiku 4.5) |
| `LOCAL_ADMIN_EMAIL`, `LOCAL_ADMIN_PASSWORD` | The admin the e2e scripts sign in as |
