-- Migration: defaultanswer scans history storage
create extension if not exists "pgcrypto";

create table if not exists defaultanswer_scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  url text not null,
  domain text not null,
  canonical_url text null,
  score int not null,
  readiness text not null,
  breakdown jsonb not null,
  signals jsonb not null,
  evidence jsonb not null,
  snapshot_quality text not null,
  fetch_status int null,
  hash text not null
);

create index if not exists defaultanswer_scans_url_created_idx on defaultanswer_scans (url, created_at desc);
create index if not exists defaultanswer_scans_domain_created_idx on defaultanswer_scans (domain, created_at desc);
create index if not exists defaultanswer_scans_hash_idx on defaultanswer_scans (hash);

-- RLS disabled for MVP sharing; tighten later when auth is enforced.
alter table defaultanswer_scans disable row level security;
