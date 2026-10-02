-- Synced patterns are called globals: entry type `global`, placed with the `global` block.
alter table public.entries disable trigger entries_touch;
update public.entries set type = 'global' where type = 'block';
update public.entries set content = replace(replace(content::text, '"type": "reusable"', '"type": "global"'), '"type":"reusable"', '"type":"global"')::json
  where content::text like '%"reusable"%';
update public.templates set content = replace(replace(content::text, '"type": "reusable"', '"type": "global"'), '"type":"reusable"', '"type":"global"')::json
  where content::text like '%"reusable"%';
alter table public.entries enable trigger entries_touch;
comment on column public.entries.type is 'page, post, event, venue, organizer, member, guide, experience, sponsor, global';
