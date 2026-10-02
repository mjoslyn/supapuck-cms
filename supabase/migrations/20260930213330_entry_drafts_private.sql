-- Unpublished changes to a published entry move out of entries into their own table. Anyone can read a
-- published entry, every column of it, so a draft kept on the row was public; only editors read these.
-- entries.draft_saved_at stays (the content list shows which pages have changes waiting).
create table public.entry_drafts (
  entry_id bigint primary key references public.entries(id) on delete cascade,
  draft jsonb not null
);
alter table public.entry_drafts enable row level security;
create policy "entry drafts editor all" on public.entry_drafts for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));
revoke all on public.entry_drafts from anon;
grant select, insert, update, delete on public.entry_drafts to authenticated, service_role;

insert into public.entry_drafts (entry_id, draft) select id, draft from public.entries where draft is not null;
alter table public.entries drop column draft;
