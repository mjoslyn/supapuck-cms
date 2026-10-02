import type { APIRoute } from 'astro';
import { INPUT_TYPES, displayValue } from '../../../../../lib/forms/logic';
import type { FormDef } from '../../../../../lib/forms/types';
import { allRows } from '../../../../../lib/rows';

const cell = (v: unknown) => {
  let s = String(v ?? '');
  // A visitor's answer starting with =, +, -, @ (or a tab or return) would run as a formula in a
  // spreadsheet; a leading apostrophe keeps it text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** All submissions of a form as CSV, one column per field. */
export const GET: APIRoute = async ({ params, locals }) => {
  const id = Number(params.id);
  const { data: form, error } = await locals.db.from('forms').select('title, definition').eq('id', id).single();
  if (error) return new Response(error.message, { status: 404 });
  // Every submission (PostgREST answers 1000 rows at a time).
  const { data: rows, error: e2 } = await allRows(locals.db.from('form_submissions').select('id, data, created_at').eq('form_id', id).order('created_at', { ascending: false }).order('id'));
  if (e2) return new Response(e2.message, { status: 400 });
  const fields = (form.definition as FormDef).fields.filter((f) => INPUT_TYPES.includes(f.type));
  const lines = [['Submitted', ...fields.map((f) => f.label)].map(cell).join(',')];
  for (const r of rows ?? []) {
    const entry = r.data?.entry ?? {};
    lines.push([r.created_at, ...fields.map((f) => displayValue(f, entry))].map(cell).join(','));
  }
  const name = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'form';
  return new Response(`﻿${lines.join('\r\n')}\r\n`, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}-submissions.csv"` },
  });
};
