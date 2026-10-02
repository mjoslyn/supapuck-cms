-- One turn at a time per Compose conversation, enforced by the database: two quick submits used to
-- both pass the API's check (a read before a slow step) and run together, losing turns or creating
-- duplicate entries. Jobs that stopped reporting (older than 16 minutes, or silent for 3) are retired
-- first, so they don't hold the conversation.
update public.compose_jobs set status = 'error', error = coalesce(error, 'Stopped: no progress.')
where status in ('queued', 'running') and (created_at < now() - interval '16 minutes' or updated_at < now() - interval '3 minutes');

create unique index compose_jobs_one_active on public.compose_jobs (session_id) where status in ('queued', 'running');
