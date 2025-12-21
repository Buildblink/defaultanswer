-- Brain tables + vector search for Supabase (public schema)
-- Idempotent migration for Brain UI.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.brain_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists brain_projects_user_id_idx
  on public.brain_projects (user_id);
create index if not exists brain_projects_created_at_idx
  on public.brain_projects (created_at desc);

create table if not exists public.brain_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.brain_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text,
  title text,
  original_file_name text,
  content text,
  url text,
  metadata jsonb,
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.brain_sources
  add constraint brain_sources_source_type_check
  check (source_type is null or source_type in ('file', 'url', 'manual'));

alter table public.brain_sources
  add constraint brain_sources_status_check
  check (status in ('ready'));

create index if not exists brain_sources_user_id_idx
  on public.brain_sources (user_id);
create index if not exists brain_sources_project_id_idx
  on public.brain_sources (project_id);
create index if not exists brain_sources_created_at_idx
  on public.brain_sources (created_at desc);

create table if not exists public.brain_chunks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.brain_projects(id) on delete cascade,
  source_id uuid not null references public.brain_sources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536) not null,
  chunk_index integer not null,
  token_count integer,
  metadata jsonb,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists brain_chunks_user_id_idx
  on public.brain_chunks (user_id);
create index if not exists brain_chunks_project_id_idx
  on public.brain_chunks (project_id);
create index if not exists brain_chunks_source_id_idx
  on public.brain_chunks (source_id);
create index if not exists brain_chunks_created_at_idx
  on public.brain_chunks (created_at desc);
create index if not exists brain_chunks_embedding_idx
  on public.brain_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.brain_projects enable row level security;
alter table public.brain_sources enable row level security;
alter table public.brain_chunks enable row level security;

drop policy if exists "brain_projects_select_own" on public.brain_projects;
drop policy if exists "brain_projects_insert_own" on public.brain_projects;
drop policy if exists "brain_projects_update_own" on public.brain_projects;
drop policy if exists "brain_projects_delete_own" on public.brain_projects;

create policy "brain_projects_select_own"
  on public.brain_projects for select
  using (auth.uid() = user_id);

create policy "brain_projects_insert_own"
  on public.brain_projects for insert
  with check (auth.uid() = user_id);

create policy "brain_projects_update_own"
  on public.brain_projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "brain_projects_delete_own"
  on public.brain_projects for delete
  using (auth.uid() = user_id);

drop policy if exists "brain_sources_select_own" on public.brain_sources;
drop policy if exists "brain_sources_insert_own" on public.brain_sources;
drop policy if exists "brain_sources_update_own" on public.brain_sources;
drop policy if exists "brain_sources_delete_own" on public.brain_sources;

create policy "brain_sources_select_own"
  on public.brain_sources for select
  using (auth.uid() = user_id);

create policy "brain_sources_insert_own"
  on public.brain_sources for insert
  with check (auth.uid() = user_id);

create policy "brain_sources_update_own"
  on public.brain_sources for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "brain_sources_delete_own"
  on public.brain_sources for delete
  using (auth.uid() = user_id);

drop policy if exists "brain_chunks_select_own" on public.brain_chunks;
drop policy if exists "brain_chunks_insert_own" on public.brain_chunks;
drop policy if exists "brain_chunks_update_own" on public.brain_chunks;
drop policy if exists "brain_chunks_delete_own" on public.brain_chunks;

create policy "brain_chunks_select_own"
  on public.brain_chunks for select
  using (auth.uid() = user_id);

create policy "brain_chunks_insert_own"
  on public.brain_chunks for insert
  with check (auth.uid() = user_id);

create policy "brain_chunks_update_own"
  on public.brain_chunks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "brain_chunks_delete_own"
  on public.brain_chunks for delete
  using (auth.uid() = user_id);

create or replace function public.match_brain_chunks(
  query_embedding vector(1536),
  match_count integer,
  project_id uuid,
  user_id uuid
)
returns table (
  id uuid,
  project_id uuid,
  source_id uuid,
  user_id uuid,
  chunk_text text,
  embedding vector(1536),
  chunk_index integer,
  token_count integer,
  metadata jsonb,
  status text,
  created_at timestamptz,
  similarity double precision
)
language sql
stable
as $$
  select
    c.id,
    c.project_id,
    c.source_id,
    c.user_id,
    c.chunk_text,
    c.embedding,
    c.chunk_index,
    c.token_count,
    c.metadata,
    c.status,
    c.created_at,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.brain_chunks c
  where c.project_id = match_brain_chunks.project_id
    and c.user_id = match_brain_chunks.user_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
