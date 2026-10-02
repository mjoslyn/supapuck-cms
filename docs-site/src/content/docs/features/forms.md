---
title: Forms
description: The form builder, submissions and notification mail.
sidebar:
  order: 4
---

## Building forms

The form builder is at `/admin/forms/` (`src/forms/FormBuilder.tsx`). Forms live in the `forms` table
(`src/lib/forms/types.ts`):

- fields with ids like `f1`, and widths on a 12-column grid
- conditional logic
- a confirmation message
- notification settings, in a column anon can't read

Place a form on a page with the `form` block.

## Rendering

The markup comes from `src/render/forms/form.ts`, styled by `src/styles/forms.css`.
`public/assets/js/forms.js` runs conditional logic, US phone formatting and character counters in
the browser. Everything is validated again on the server.

## Submissions

Submissions POST back to the page (`src/lib/forms/submit.ts`):

1. Validation, skipping fields hidden by conditional logic
2. A honeypot against spam
3. Storage
4. Notifications to the form's addresses, else `FORMS_ADMIN_EMAIL`, else the config's `adminEmail`

## Mail

Mail goes out over SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, or one
`SMTP_URL`. The sender is `MAIL_FROM`, defaulting to `mailFrom` in the site config. Without SMTP,
submissions are stored and no mail is sent.
