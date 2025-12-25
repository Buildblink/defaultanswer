create table if not exists public.report_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  normalized_url text not null,
  report_id text not null,
  created_at timestamptz not null default now(),
  score int not null,
  readiness text not null,
  coverage_overall int not null,
  has_faq boolean not null default false,
  has_schema boolean not null default false,
  has_pricing boolean not null default false,
  primary_blocker text
);

create index if not exists report_scans_user_url_idx
  on public.report_scans (user_id, normalized_url, created_at desc);

alter table public.report_scans enable row level security;

create policy "Users can read their own report scans"
  on public.report_scans
  for select
  using (auth.uid() = user_id);
