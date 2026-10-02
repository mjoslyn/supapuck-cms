-- entries.body_text: an entry's readable text (headings, paragraphs, list items, quotes, captions...),
-- taken from its content by a trigger, for site search and event descriptions. It replaces
-- legacy_html, the HTML the first import brought in, which new and edited entries never updated.

create or replace function public.entry_body_text(doc json) returns text
language sql immutable set search_path = '' as $$
  select coalesce(trim(regexp_replace(
    replace(replace(replace(replace(replace(replace(replace(replace(
      regexp_replace(string_agg(v, ' ' order by n, k), '<[^>]*>', ' ', 'g'),
      '&nbsp;', ' '), '&amp;', '&'), '&#8217;', ''''), '&rsquo;', ''''), '&#8216;', ''''), '&#8220;', '"'), '&#8221;', '"'), '&#8211;', '-'),
    '\s+', ' ', 'g')), '')
  from jsonb_path_query(coalesce(doc::jsonb, '{}'), 'strict $.** ? (@.type() == "object" && exists(@.attrs))') with ordinality as b(node, n),
  lateral (
    select k.ord as k, b.node->'attrs'->>k.key as v
    from unnest(array['eyebrow', 'title', 'content', 'text', 'question', 'answer', 'citation', 'caption', 'html']) with ordinality as k(key, ord)
    where jsonb_typeof(b.node->'attrs'->k.key) = 'string'
    union all
    select 100 + i.ord, i.item->>'content'
    from jsonb_array_elements(case when jsonb_typeof(b.node->'attrs'->'items') = 'array' then b.node->'attrs'->'items' else '[]' end) with ordinality as i(item, ord)
    where jsonb_typeof(i.item->'content') = 'string'
  ) t
$$;

alter table public.entries add column body_text text not null default '';

create or replace function public.entries_body_text() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.body_text := public.entry_body_text(new.content);
  return new;
end $$;

create trigger entries_body_text before insert or update of content on public.entries
  for each row execute function public.entries_body_text();

-- Fill it, and tidy the templates below, without changing updated_at.
alter table public.entries disable trigger entries_touch;
update public.entries set body_text = public.entry_body_text(content);

alter table public.entries drop column legacy_html;
alter table public.templates drop column legacy_html;

-- Page templates chosen by names that no template has (the old theme's file names): the page falls
-- back to its usual template either way.
update public.entries e set template = null
where e.template is not null and e.template <> 'default'
  and not exists (select 1 from public.templates t where t.kind = 'template' and t.slug = e.template);

-- Toggles imported as "1"/"0" become booleans, like the editor writes them.
update public.entries set fields = jsonb_set(fields, '{featured}', to_jsonb(fields->>'featured' = '1'))
where fields->>'featured' in ('1', '0');

alter table public.entries enable trigger entries_touch;
