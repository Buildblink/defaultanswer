alter table if exists public.ai_sweep_results
  add column if not exists learning_extract jsonb;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'learning_hypothesis_status') then
    create type public.learning_hypothesis_status as enum ('draft', 'active', 'validated', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'learning_anchor_source_type') then
    create type public.learning_anchor_source_type as enum ('brain_chunk', 'paper', 'url', 'note');
  end if;
end $$;

create table if not exists public.learning_tags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_result_tags (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.ai_sweep_results(id) on delete cascade,
  tag_id uuid not null references public.learning_tags(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (result_id, tag_id)
);

create index if not exists learning_result_tags_result_idx on public.learning_result_tags (result_id);
create index if not exists learning_result_tags_tag_idx on public.learning_result_tags (tag_id);

create table if not exists public.learning_hypotheses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  observation text,
  hypothesis text,
  implication text,
  status public.learning_hypothesis_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.learning_anchors (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.learning_hypotheses(id) on delete cascade,
  source_type public.learning_anchor_source_type not null,
  source_ref text,
  quote text,
  created_at timestamptz not null default now()
);

alter table public.learning_tags enable row level security;
alter table public.learning_result_tags enable row level security;
alter table public.learning_hypotheses enable row level security;
alter table public.learning_anchors enable row level security;

insert into public.learning_tags (key, label, description)
values
  ('entity_unclear', 'Entity unclear', 'Model cannot tell what the site is.'),
  ('category_ambiguous', 'Category ambiguous', 'Model labels vary or collapse.'),
  ('no_direct_answers', 'No direct answers', 'Lacks definitional or FAQ style answers.'),
  ('commercial_unclear', 'Commercial unclear', 'Pricing or offer is unclear.'),
  ('trust_gap', 'Trust gap', 'Legitimacy signals missing.'),
  ('retrieval_blocked', 'Retrieval blocked', '403/429/JS-only content references.'),
  ('incumbent_bias', 'Incumbent bias', 'Defaults to incumbents regardless of fit.'),
  ('third_party_gap', 'Third-party gap', 'No external descriptions or citations found.'),
  ('refusal', 'Refusal', 'Refusal or cannot browse.'),
  ('hallucination_risk', 'Hallucination risk', 'Invented details or unsafe confidence.')
on conflict (key) do nothing;
