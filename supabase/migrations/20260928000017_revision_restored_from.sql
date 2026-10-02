-- A save that brought back an earlier version records which one (and whether it was edited after).
alter table public.revisions
  add column restored_from bigint references public.revisions on delete set null,
  add column restored_edited boolean;
