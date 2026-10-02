-- Core content model. Mirrors the WordPress data model so the migration stays 1:1:
-- post types keep their WP names (page, post, evl_member, tribe_events, ...),
-- ACF / Events Calendar meta lives in `fields`, and `content` holds the Puck document.

create extension if not exists pg_trgm;

-- Editors ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role text not null default 'viewer' check (role in ('viewer', 'editor', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('editor', 'admin')
  );
$$;

-- Media -----------------------------------------------------------------------

create table public.media (
  id bigint generated always as identity primary key,
  wp_id bigint unique,
  path text not null unique,            -- object key in the `media` storage bucket, e.g. 2026/04/foo.jpg
  mime_type text not null,
  width int,
  height int,
  alt text not null default '',
  caption text not null default '',
  title text not null default '',
  sizes jsonb not null default '{}',     -- { "medium_large": { "path": ..., "width": ..., "height": ... }, ... }
  created_at timestamptz not null default now()
);

-- Entries (all post types) ----------------------------------------------------

create table public.entries (
  id bigint generated always as identity primary key,
  wp_id bigint unique,
  type text not null,
  slug text not null,
  title text not null default '',
  excerpt text not null default '',
  status text not null default 'draft' check (status in ('publish', 'draft', 'private', 'trash')),
  template text,                          -- WP _wp_page_template, e.g. page-demo-homepage-takeover
  parent_id bigint references public.entries on delete set null,
  menu_order int not null default 0,
  featured_media_id bigint references public.media on delete set null,
  fields jsonb not null default '{}',     -- ACF + plugin meta
  content jsonb,                          -- Puck Data { root, content, zones }
  legacy_html text,                       -- original post_content, kept for reference / re-conversion
  event_start timestamptz,                -- tribe_events only
  event_end timestamptz,
  event_all_day boolean,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, slug)
);

create index entries_type_status_idx on public.entries (type, status, published_at desc);
create index entries_event_start_idx on public.entries (event_start) where type = 'tribe_events';
create index entries_parent_idx on public.entries (parent_id);
create index entries_featured_media_idx on public.entries (featured_media_id);
create index entries_title_trgm_idx on public.entries using gin (title gin_trgm_ops);

create table public.revisions (
  id bigint generated always as identity primary key,
  entry_id bigint not null references public.entries on delete cascade,
  title text not null,
  content jsonb,
  fields jsonb,
  author_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index revisions_entry_idx on public.revisions (entry_id, created_at desc);
create index revisions_author_idx on public.revisions (author_id);

-- Taxonomies ------------------------------------------------------------------

create table public.terms (
  id bigint generated always as identity primary key,
  wp_id bigint unique,
  taxonomy text not null,                 -- member_category, content_feed, evl_season, category, tribe_events_cat
  slug text not null,
  name text not null,
  description text not null default '',
  parent_id bigint references public.terms on delete set null,
  fields jsonb not null default '{}',
  unique (taxonomy, slug)
);

create index terms_parent_idx on public.terms (parent_id);

create table public.entry_terms (
  entry_id bigint not null references public.entries on delete cascade,
  term_id bigint not null references public.terms on delete cascade,
  sort int not null default 0,
  primary key (entry_id, term_id)
);

create index entry_terms_term_idx on public.entry_terms (term_id);

-- Site-editor documents: templates, template parts, synced patterns, navigation --

create table public.templates (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('template', 'part', 'pattern', 'navigation')),
  slug text not null,                     -- e.g. single-evl_member, header, footer
  title text not null default '',
  content jsonb,                          -- Puck Data
  legacy_html text,
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Forms (Gravity Forms replacement) -------------------------------------------

create table public.form_submissions (
  id bigint generated always as identity primary key,
  form text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- updated_at ------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();
create trigger templates_touch before update on public.templates
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- RLS: public reads published content; editors write everything ----------------

alter table public.profiles enable row level security;
alter table public.media enable row level security;
alter table public.entries enable row level security;
alter table public.revisions enable row level security;
alter table public.terms enable row level security;
alter table public.entry_terms enable row level security;
alter table public.templates enable row level security;
alter table public.settings enable row level security;
alter table public.form_submissions enable row level security;

create policy "own profile readable" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_editor()));

create policy "media public read" on public.media for select using (true);
create policy "media editor write" on public.media for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "entries public read" on public.entries for select
  using (status = 'publish' or (select public.is_editor()));
create policy "entries editor write" on public.entries for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "revisions editor all" on public.revisions for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "terms public read" on public.terms for select using (true);
create policy "terms editor write" on public.terms for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "entry_terms public read" on public.entry_terms for select using (true);
create policy "entry_terms editor write" on public.entry_terms for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "templates public read" on public.templates for select using (true);
create policy "templates editor write" on public.templates for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "settings public read" on public.settings for select using (true);
create policy "settings editor write" on public.settings for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy "forms anyone submit" on public.form_submissions for insert with check (true);
create policy "forms editor read" on public.form_submissions for select to authenticated
  using ((select public.is_editor()));

-- Storage bucket for uploads ----------------------------------------------------

insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

create policy "media bucket editor write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_editor()));
create policy "media bucket editor update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_editor()));
create policy "media bucket editor delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_editor()));
