alter table if exists public.ai_sweep_results
  add column if not exists prompt_text text not null default '';

alter table if exists public.ai_sweep_results
  alter column prompt_text drop default;

alter table if exists public.ai_sweep_results
  alter column response_text drop not null;

alter table if exists public.ai_sweep_results
  add column if not exists response_json jsonb;

alter table if exists public.ai_sweep_results
  add column if not exists usage_json jsonb;

alter table if exists public.ai_sweep_results
  add column if not exists error_text text;

alter table if exists public.ai_sweep_results
  add column if not exists latency_ms int;
