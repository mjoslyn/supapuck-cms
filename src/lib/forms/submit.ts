// Form submissions: validate against the form (skipping fields conditional logic hides), store the
// entry, send notifications, and work out the confirmation.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Field, FormDef, FormResult, FormRow, NamePart, Notification, Values } from './types';
import { HONEYPOT, INPUT_TYPES, NAME_LABELS, displayValue, isFieldHidden, visibleNameParts } from './logic';
import { sendMail } from './mail';
import { Loader } from '../data';
import { permalink } from '../permalink';
import { serviceClient } from '../supabase';
import { SITE_TZ, site } from '../site';

const env = (k: string) => (import.meta.env?.[k] as string | undefined) ?? process.env[k];
const REQUIRED = 'This field is required.';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Posted values: "f1", "f1[]" (checkboxes), "f1[first]" (name parts). */
function collect(data: FormData, def: FormDef): Values {
  const values: Values = {};
  for (const f of def.fields) {
    if (!INPUT_TYPES.includes(f.type)) continue;
    if (f.type === 'checkbox') {
      const list = data.getAll(`${f.id}[]`).map(String).map((s) => s.trim()).filter(Boolean);
      if (list.length) values[f.id] = list;
    } else if (f.type === 'name') {
      const parts: Partial<Record<NamePart, string>> = {};
      for (const p of visibleNameParts(f)) {
        const v = String(data.get(`${f.id}[${p}]`) ?? '').trim();
        if (v) parts[p] = v;
      }
      if (Object.keys(parts).length) values[f.id] = parts;
    } else {
      const v = String(data.get(f.id) ?? '').trim();
      if (v) values[f.id] = f.maxLength ? v.slice(0, f.maxLength) : v;
    }
  }
  return values;
}

function validate(f: Field, values: Values): string {
  const v = values[f.id];
  const missing = f.errorMessage || REQUIRED;
  if (f.type === 'name') {
    const parts = (v ?? {}) as Partial<Record<NamePart, string>>;
    const absent = (['first', 'last'] as NamePart[]).filter((p) => !parts[p]);
    return f.required && absent.length ? `${missing} Please add ${absent.map((p) => (f.nameParts?.[p]?.label || NAME_LABELS[p]).toLowerCase()).join(' and ')} name.` : '';
  }
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return f.required ? missing : '';
  const s = String(v);
  switch (f.type) {
    case 'email':
      return EMAIL.test(s) ? '' : f.errorMessage || 'Enter an email address like name@example.com.';
    case 'url':
      return /^https?:\/\/[^\s.]+\.\S+$/i.test(s) ? '' : f.errorMessage || 'Enter a web address starting with https://.';
    case 'phone':
      return f.phoneFormat === 'any' || s.replace(/\D/g, '').length === 10 ? '' : f.errorMessage || 'Enter a 10-digit phone number.';
    case 'number': {
      const n = Number(s);
      if (isNaN(n)) return f.errorMessage || 'Enter a number.';
      if (f.min != null && n < f.min) return f.errorMessage || `Enter a number of at least ${f.min}.`;
      if (f.max != null && n > f.max) return f.errorMessage || `Enter a number no more than ${f.max}.`;
      return '';
    }
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) ? '' : f.errorMessage || 'Enter a valid date.';
    case 'select':
    case 'radio':
      // Submitted values are trimmed; so are choices here (one saved with a trailing space still counts).
      return (f.choices ?? []).some((c) => c.value.trim() === s) ? '' : 'Choose one of the options.';
    case 'checkbox':
      return (v as string[]).every((x) => (f.choices ?? []).some((c) => c.value.trim() === x)) ? '' : 'Choose from the options.';
  }
  return '';
}

const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Merge tags: {all_fields}, {form_title}, {admin_email}, {date}, {Label:f3}, {Label:f1.first}. */
/**
 * A notification's message as the email body. Messages from the rich text editor are HTML; older ones
 * are plain text, where line breaks become <br>.
 */
function emailBody(written: string, merged: string): string {
  // Decided on the message as written: field tags like {all_fields} expand to HTML either way.
  const html = /<(p|br|div|ul|ol|li|strong|b|em|i|a|h[1-6])\b/i.test(written) ? merged : merged.replace(/\n/g, '<br />\n');
  return html.replace(/<\s*(script|style|iframe)[\s\S]*?<\/\s*\1\s*>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
}

export function mergeTags(text: string, row: FormRow, values: Values, opts: { html: boolean; adminEmail: string }): string {
  const fields = row.definition.fields;
  const out = (s: string) => (opts.html ? escHtml(s).replace(/\n/g, '<br />') : s);
  return text.replace(/\{([^{}]*?)\}/g, (tag, inner: string) => {
    if (inner === 'all_fields') return allFields(row.definition, values, opts.html);
    if (inner === 'form_title') return out(row.title);
    if (inner === 'admin_email') return opts.adminEmail;
    if (inner === 'date' || inner === 'date_mdy') return new Intl.DateTimeFormat('en-US', { timeZone: SITE_TZ, dateStyle: 'long' }).format(new Date());
    const m = inner.match(/^(?:[^:]*):(f\d+)(?:\.(\w+))?$/);
    if (!m) return tag;
    const f = fields.find((x) => x.id === m[1]);
    if (!f) return '';
    if (m[2]) {
      const parts = values[f.id];
      return out(parts && typeof parts === 'object' && !Array.isArray(parts) ? (parts as Record<string, string>)[m[2]] ?? '' : '');
    }
    return out(displayValue(f, values));
  });
}

function allFields(def: FormDef, values: Values, html: boolean): string {
  const rows = def.fields
    .filter((f) => INPUT_TYPES.includes(f.type) && f.type !== 'hidden' && !isFieldHidden(def, f, values))
    .map((f) => [f.label, displayValue(f, values)] as const)
    .filter(([, v]) => v);
  if (!html) return rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  return (
    `<table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">` +
    rows.map(([k, v]) => `<tr><td style="background:#f5f3f0;font-weight:600;border-bottom:1px solid #e5e1dc">${escHtml(k)}</td></tr><tr><td style="padding-bottom:14px;border-bottom:1px solid #e5e1dc">${escHtml(v).replace(/\n/g, '<br />')}</td></tr>`).join('') +
    `</table>`
  );
}

async function notify(row: FormRow, values: Values) {
  const adminEmail = env('FORMS_ADMIN_EMAIL') || site.adminEmail;
  const visitorEmail = row.definition.fields.find((f) => f.type === 'email' && typeof values[f.id] === 'string');
  for (const n of (row.notifications ?? []) as Notification[]) {
    if (n.active === false) continue;
    const to = mergeTags(n.to, row, values, { html: false, adminEmail })
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => EMAIL.test(s));
    if (!to.length) continue;
    const replyTo = n.replyTo ? mergeTags(n.replyTo, row, values, { html: false, adminEmail }) : visitorEmail ? String(values[visitorEmail.id]) : undefined;
    try {
      await sendMail({
        to,
        subject: mergeTags(n.subject || `New submission: ${row.title}`, row, values, { html: false, adminEmail }),
        html: emailBody(n.message || '{all_fields}', mergeTags(n.message || '{all_fields}', row, values, { html: true, adminEmail })),
        replyTo: replyTo && EMAIL.test(replyTo) ? replyTo : undefined,
        fromName: n.fromName || undefined,
      });
    } catch (e) {
      // The submission is stored either way; a mail outage shouldn't lose it or show the visitor an error.
      console.error(`form ${row.id}: notification "${n.name}" failed`, e);
    }
  }
}

export async function handleFormPost(data: FormData, request: Request): Promise<FormResult | null> {
  const formId = Number(data.get('_form'));
  if (!formId) return null;
  const db: SupabaseClient = serviceClient();
  const { data: row, error } = await db.from('forms').select('*').eq('id', formId).eq('is_active', true).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const form = row as FormRow;
  const def = form.definition;
  const confirmation = def.confirmation ?? { type: 'message', message: 'Thanks for contacting us! We will get in touch with you shortly.' };

  // A filled-in honeypot: act as if it worked, keep nothing.
  if (def.honeypot && String(data.get(HONEYPOT) ?? '').trim()) return { formId, ok: true, message: confirmation.message ?? '', errors: {}, values: {} };

  const values = collect(data, def);
  const errors: Record<string, string> = {};
  for (const f of def.fields) {
    if (!INPUT_TYPES.includes(f.type) || isFieldHidden(def, f, values)) continue;
    const message = validate(f, values);
    if (message) errors[f.id] = message;
  }
  if (Object.keys(errors).length) return { formId, ok: false, message: '', errors, values };

  // Fields hidden by logic aren't part of the entry.
  const entry: Values = Object.fromEntries(Object.entries(values).filter(([id]) => {
    const f = def.fields.find((x) => x.id === id);
    return f && !isFieldHidden(def, f, values);
  }));
  const labelled = Object.fromEntries(def.fields.filter((f) => INPUT_TYPES.includes(f.type) && entry[f.id] != null).map((f) => [f.label, displayValue(f, entry)]));
  const { error: insertError } = await db.from('form_submissions').insert({
    form: form.title,
    form_id: formId,
    data: { entry, values: labelled, referrer: request.headers.get('referer'), user_agent: request.headers.get('user-agent') },
  });
  if (insertError) throw insertError;
  await notify(form, entry);

  const adminEmail = env('FORMS_ADMIN_EMAIL') || site.adminEmail;
  if (confirmation.type === 'redirect' && confirmation.url) return { formId, ok: true, message: '', errors: {}, values: {}, redirect: mergeTags(confirmation.url, form, entry, { html: false, adminEmail }) };
  if (confirmation.type === 'page' && confirmation.pageId) {
    const page = await new Loader(db).entryById(Number(confirmation.pageId));
    if (page) return { formId, ok: true, message: '', errors: {}, values: {}, redirect: permalink(page) };
  }
  return { formId, ok: true, message: mergeTags(confirmation.message || 'Thanks for contacting us! We will get in touch with you shortly.', form, entry, { html: true, adminEmail }), errors: {}, values: {} };
}
