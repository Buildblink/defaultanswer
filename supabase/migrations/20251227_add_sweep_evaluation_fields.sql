alter table if exists public.ai_sweeps
  add column if not exists sweep_state text;

alter table if exists public.ai_sweep_results
  add column if not exists evaluation_notes jsonb;

alter table if exists public.ai_sweep_results
  add column if not exists learning_signal text;
