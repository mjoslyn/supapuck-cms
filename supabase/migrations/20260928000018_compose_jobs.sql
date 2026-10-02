-- Compose runs as a job so a build can outlast a request (Netlify background function, up to 15 min):
-- the API queues it, the runner claims it and writes progress here, the panel polls.
create table public.compose_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.compose_sessions on delete cascade,
  author_id uuid references auth.users on delete set null,
  -- queued | running | done | error
  status text not null default 'queued',
  -- What the editor sent with the message: current/other outlines, fields, replace-all.
  input jsonb not null default '{}',
  -- Progress: the latest status line, Claude's text so far, notes.
  progress text,
  say text not null default '',
  notes jsonb not null default '[]',
  -- The finished turn (as the stream's "done" message used to carry it).
  result jsonb,
  error text,
  -- Presented by the worker: the job id alone finds a job, the token says the invocation came from the
  -- route that queued it.
  token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index compose_jobs_session_idx on public.compose_jobs (session_id, created_at desc);
alter table public.compose_jobs enable row level security;
create policy "compose jobs editor all" on public.compose_jobs for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));
create trigger compose_jobs_touch before update on public.compose_jobs
  for each row execute function public.touch_updated_at();
