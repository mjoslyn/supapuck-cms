-- Compose with Claude: a conversation per page, kept so it can be continued later.
create table public.compose_sessions (
  id uuid primary key default gen_random_uuid(),
  entry_id bigint references public.entries on delete cascade,
  author_id uuid references auth.users on delete set null,
  entry_type text not null default 'page',
  -- Conversation: [{ role: 'user', text, added: {...} } | { role: 'assistant', text, plan, toolId }].
  turns jsonb not null default '[]',
  -- Material registry with stable ids: images, videos, links (with fetched text), docs (storage paths).
  materials jsonb not null default '{"images":[],"videos":[],"links":[],"docs":[]}',
  -- Latest page plan, and the id prefix of the blocks built from it (replaced on each update).
  plan jsonb,
  block_prefix text not null default ('cs' || substr(md5(random()::text), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index compose_sessions_entry_idx on public.compose_sessions (entry_id, updated_at desc);
alter table public.compose_sessions enable row level security;
create policy "compose editor all" on public.compose_sessions for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));
create trigger compose_sessions_touch before update on public.compose_sessions
  for each row execute function public.touch_updated_at();

-- Documents given to the composer (private; read by the server with the service key).
insert into storage.buckets (id, name, public) values ('compose', 'compose', false) on conflict (id) do nothing;
