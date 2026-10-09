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
3. Limits: an answer is cut at 10,000 characters (or the field's own maximum), and a form takes at
   most 20 submissions a minute (more get a "try again in a minute" answer, status 429)
4. Storage
5. Notifications to the form's addresses, else `FORMS_ADMIN_EMAIL`, else the config's `adminEmail`

## Notification emails

Each notification's email is built in the **email builder** (Notifications, **Edit email**), a visual
editor like the page editor with blocks made for email:

| Block | Shows |
| --- | --- |
| Heading, Text | Text, with field values (Insert field value, or tags like `{Email:f3}`) |
| Button | A link styled as a button (a field tag works as the link, such as `mailto:{Email:f3}`) |
| Image | An image from the media library, optionally linked |
| Form field | One answer, with or without its label, or every answer as a table |
| Section | A box with a background and padding, holding other blocks |
| Two columns | Blocks side by side, stacked on phones |
| Divider, Spacer | A line, or space |

The email's settings (the page) set its background, text and link colours, font, width and the
preview text inbox lists show after the subject.

What the builder shows is what is sent: email-safe HTML laid out with tables and inline styles, 600px
wide, with text kept to what mail apps show the same.

- **Plain text**: the text version, for mail apps that don't show HTML, with field values. Left empty,
  it is made from the visual design. **Fill from the visual design** starts from it.
- **Preview**: the email as it would be sent (recipients, reply-to, subject, the HTML at desktop and
  phone widths, and the text) for any stored submission, or for sample answers.

Notifications from before the builder keep sending their message as it was until they are opened in
the builder, which turns it into blocks.

## Mail

Mail goes out over SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, or one
`SMTP_URL`. The sender is `MAIL_FROM`, defaulting to `mailFrom` in the site config. Without SMTP,
submissions are stored and no mail is sent.
