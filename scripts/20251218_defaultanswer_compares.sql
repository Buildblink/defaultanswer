-- Migration: create defaultanswer_compares table for compare permalinks
create extension if not exists "pgcrypto";

create table if not exists defaultanswer_compares (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  url_a text not null,
  url_b text not null,
  payload jsonb not null,
  report_id_a uuid null,
  report_id_b uuid null,
  user_id uuid null
);

create index if not exists defaultanswer_compares_created_at_idx on defaultanswer_compares (created_at desc);
create index if not exists defaultanswer_compares_user_created_idx on defaultanswer_compares (user_id, created_at desc);

-- MVP: disable RLS for public sharing. Adjust if auth is added.
alter table defaultanswer_compares disable row level security;
