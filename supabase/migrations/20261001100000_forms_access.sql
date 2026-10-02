-- Forms and submissions, tightened (2026-09-30 code review):
-- - A signed-in account that isn't an editor (sign-up makes viewers) could read every column of an
--   active form, including where its notifications go. Visitors read active forms without that column
--   (anon, as before); signed-in accounts read forms only as editors.
-- - Anyone could insert submissions straight into form_submissions with the public key, skipping the
--   server's checks (required fields, choices, honeypot). The site saves submissions with the service
--   key, so nobody else needs to insert.

drop policy "forms public read" on public.forms;
create policy "forms public read" on public.forms for select to anon using (is_active);
create policy "forms editor read" on public.forms for select to authenticated using ((select public.is_editor()));

drop policy "forms anyone submit" on public.form_submissions;
revoke insert on public.form_submissions from anon, authenticated;
