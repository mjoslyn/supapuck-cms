// Outgoing mail for form notifications, sent as HTML with a plain-text version over SMTP, so any
// provider works (Mailgun, SES, Postmark, Resend, a mail server; locally the Supabase stack's mail catcher, so nothing real is
// sent). Settings come from the environment (see transport()); without them notifications are logged
// and skipped, and submissions are still stored.
import nodemailer, { type Transporter } from 'nodemailer';
import { site } from '../site';

const env = (k: string) => (import.meta.env?.[k] as string | undefined) ?? process.env[k];
let smtp: Transporter | undefined;

export interface Mail {
  to: string[];
  subject: string;
  html: string;
  /** The plain-text version; made from the HTML when left out. */
  text?: string;
  replyTo?: string;
  fromName?: string;
}

function fromHeader(fromName?: string) {
  const from = env('MAIL_FROM') || env('FORMS_FROM') || site.mailFrom;
  const address = from.match(/<([^>]+)>/)?.[1] ?? from;
  return fromName ? `${fromName} <${address}>` : from;
}

export { textVersion } from './email';
import { textVersion } from './email';

/**
 * The SMTP transport: SMTP_HOST (+ SMTP_PORT, default 587; SMTP_USER, SMTP_PASS; SMTP_SECURE, default on
 * for port 465), or one SMTP_URL (smtp[s]://user:pass@host:port). Undefined when neither is set.
 */
function transport(): Transporter | undefined {
  if (smtp) return smtp;
  const host = env('SMTP_HOST');
  if (host) {
    const port = Number(env('SMTP_PORT')) || 587;
    const secure = env('SMTP_SECURE') ? env('SMTP_SECURE') === 'true' : port === 465;
    const user = env('SMTP_USER');
    smtp = nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass: env('SMTP_PASS') ?? '' } : undefined });
  } else if (env('SMTP_URL')) smtp = nodemailer.createTransport(env('SMTP_URL'));
  return smtp;
}

export async function sendMail(mail: Mail): Promise<boolean> {
  const t = transport();
  if (!t) {
    console.warn(`[forms] no SMTP configured; not sending "${mail.subject}" to ${mail.to.join(', ')}`);
    return false;
  }
  await t.sendMail({ from: fromHeader(mail.fromName), to: mail.to, replyTo: mail.replyTo, subject: mail.subject, html: mail.html, text: mail.text || textVersion(mail.html) });
  return true;
}
