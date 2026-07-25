-- Migración: Funnel de Socios Comerciales + Scoring Ponderado
-- Corre esto en el SQL Editor de Supabase DESPUÉS de 006_leads.sql.
--
-- Reemplaza el funnel genérico de leads.status por el modelo específico de
-- conversión a socio comercial (Prospecto -> Llamada -> Negociación ->
-- Sociedad Comercial), y agrega un score ponderado por sub-pasos (análogo a
-- la columna "Posibilidad" de la hoja de seguimiento de escuelas): cada
-- sub-paso tiene un peso %, y el score de un lead es la suma de los pesos de
-- los sub-pasos que se han marcado como completados.

-- =========================================================
-- 1. Migrar leads.status al nuevo funnel
-- =========================================================
alter table public.leads drop constraint leads_status_check;

update public.leads set status = 'prospecto' where status = 'contacto_inicial';
update public.leads set status = 'llamada' where status = 'en_seguimiento';
update public.leads set status = 'negociacion' where status = 'presentacion';
update public.leads set status = 'sociedad_comercial' where status = 'convertido';

alter table public.leads add constraint leads_status_check
  check (status in ('prospecto', 'llamada', 'negociacion', 'sociedad_comercial', 'descartado'));

alter table public.leads add column score_percent numeric(6,2) not null default 0;

-- =========================================================
-- 2. LEAD_SCORE_STEPS (catálogo editable de sub-pasos y pesos por etapa)
-- =========================================================
create table public.lead_score_steps (
  id uuid primary key default gen_random_uuid(),
  stage text not null check (stage in ('prospecto', 'llamada', 'negociacion', 'sociedad_comercial')),
  label text not null,
  weight numeric(5,2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.lead_score_steps enable row level security;
create index lead_score_steps_stage_idx on public.lead_score_steps (stage);

create policy "lead_score_steps_all_authorized" on public.lead_score_steps
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 3. LEAD_SCORE_PROGRESS (qué sub-pasos están marcados por lead)
-- =========================================================
create table public.lead_score_progress (
  lead_id uuid not null references public.leads (id) on delete cascade,
  step_id uuid not null references public.lead_score_steps (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (lead_id, step_id)
);

alter table public.lead_score_progress enable row level security;
create index lead_score_progress_step_id_idx on public.lead_score_progress (step_id);

create policy "lead_score_progress_all_authorized" on public.lead_score_progress
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 4. TRIGGER: sincronizar leads.score_percent con los sub-pasos marcados
-- =========================================================
create or replace function public.sync_lead_score_percent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_lead_id uuid;
begin
  target_lead_id := coalesce(new.lead_id, old.lead_id);

  update public.leads
  set score_percent = (
    select coalesce(sum(s.weight), 0)
    from public.lead_score_progress p
    join public.lead_score_steps s on s.id = p.step_id
    where p.lead_id = target_lead_id
  )
  where id = target_lead_id;

  return coalesce(new, old);
end;
$$;

create trigger lead_score_progress_sync
after insert or delete on public.lead_score_progress
for each row execute function public.sync_lead_score_percent();

-- =========================================================
-- 5. Seed: plantilla inicial de sub-pasos y pesos (ajustable después desde
-- el panel). Suma 100% en un cierre completo.
-- =========================================================
insert into public.lead_score_steps (stage, label, weight, sort_order) values
  ('prospecto', 'Datos de contacto verificados', 10, 1),
  ('prospecto', 'Interés inicial confirmado', 10, 2),
  ('llamada', 'Llamada realizada', 10, 1),
  ('llamada', 'Llamada contestada', 15, 2),
  ('negociacion', 'Propuesta enviada', 15, 1),
  ('negociacion', 'Condiciones comerciales acordadas', 20, 2),
  ('sociedad_comercial', 'Contrato firmado', 20, 1);
