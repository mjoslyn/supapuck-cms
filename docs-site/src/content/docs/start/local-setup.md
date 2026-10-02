---
title: Local setup
description: Run the example site on your machine.
sidebar:
  order: 1
---

## Requirements

- Node 22.12 or later
- Docker (Docker Desktop or OrbStack), for the local Supabase stack
- For hosting: a Supabase project and a Netlify site
- Optional: an Anthropic API key (Compose) and an SMTP account (form notifications)

The Supabase CLI runs through `npx`, so you don't need to install it.

## Steps

1. **Install.**

   ```sh
   git clone https://github.com/mjoslyn/supapuck-cms.git my-site
   cd my-site
   npm install
   ```

2. **Start the database.** This starts Supabase in Docker on ports 56520–56529 and applies the
   migrations in `supabase/migrations/`.

   ```sh
   npx supabase start
   ```

   On a machine short of memory, skip the services the CMS doesn't use:

   ```sh
   npx supabase start -x logflare,vector,studio,imgproxy,edge-runtime,realtime,supavisor,postgres-meta
   ```

3. **Configure.** Copy the example env file and fill in the values `npx supabase status` prints:

   ```sh
   cp .env.example .env
   ```

   | `.env` | from `supabase status` |
   | --- | --- |
   | `PUBLIC_SUPABASE_URL` | API URL (`http://127.0.0.1:56521`) |
   | `PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

4. **Add starter content**: the header, footer, base templates, a home page, an About page and a
   sample event. It skips anything that already exists, so it is safe to run again.

   ```sh
   npm run seed
   ```

5. **Create an admin.**

   ```sh
   npx tsx --env-file=.env scripts/create-editor.ts you@example.org 'a-password' admin
   ```

6. **Run it.**

   ```sh
   npx astro dev
   ```

   The site is at http://localhost:4321 and the editor at http://localhost:4321/admin/.

## Optional features

### Compose

Set `ANTHROPIC_API_KEY`, and optionally `ANTHROPIC_MODEL` (default `claude-opus-5-5`). Restart the
dev server after setting it. See [Compose](../../features/compose/).

### Form notification mail

Set either `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `SMTP_SECURE`, or a single
`SMTP_URL` such as `smtp://user:pass@host:587`. Also set `MAIL_FROM`. Notifications go to each form's
addresses, or to `FORMS_ADMIN_EMAIL`, or to `adminEmail` in the site config. Without SMTP,
submissions are stored but no mail is sent.

Locally, `SMTP_URL=smtp://127.0.0.1:56525` sends to the Supabase stack's mail catcher, whose inbox is
at http://127.0.0.1:56524.

## Troubleshooting

- After merges that change dependencies, restart the dev server. Stale Vite dependency caches show
  as "Outdated Optimize Dep" and islands that don't hydrate.
- Netlify's edge-function emulation is off under `astro dev` (`astro.config.mjs`): its Deno runtime
  ran out of memory on the editor's image requests.
