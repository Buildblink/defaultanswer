create table if not exists public.ai_sweeps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text not null default 'manual',
  prompt_set_version text not null,
  prompts_count int not null,
  models jsonb not null,
  notes text
);

create table if not exists public.ai_sweep_results (
  id uuid primary key default gen_random_uuid(),
  sweep_id uuid not null references public.ai_sweeps(id) on delete cascade,
  created_at timestamptz not null default now(),
  provider text not null,
  model text not null,
  prompt_key text not null,
  prompt text not null,
  response_text text not null,
  mentioned boolean not null default false,
  mention_rank int,
  winner text,
  alternatives jsonb not null default '[]'::jsonb,
  has_domain_mention boolean not null default false,
  has_brand_mention boolean not null default false,
  confidence int not null default 0
);

create index if not exists ai_sweep_results_sweep_idx on public.ai_sweep_results (sweep_id);
create index if not exists ai_sweep_results_prompt_idx on public.ai_sweep_results (prompt_key);
create index if not exists ai_sweep_results_created_idx on public.ai_sweep_results (created_at desc);

alter table public.ai_sweeps enable row level security;
alter table public.ai_sweep_results enable row level security;
