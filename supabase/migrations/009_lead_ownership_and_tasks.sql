-- Migración: Ownership real por usuario + secuencia automatizada de tareas
-- Corre esto en el SQL Editor de Supabase DESPUÉS de 008_lead_website.sql.
--
-- Cambia el modelo de leads de "panel compartido entre todos los
-- autorizados" a "cartera personal por vendedor": cada lead pertenece a
-- quien lo creó (owner_id = auth.uid()), y el RLS deja de exponer leads de
-- otros usuarios. También extiende lead_tasks para soportar la secuencia de
-- prospección (contacto inicial -> hasta 3 seguimientos cada 3 días -> demo
-- si acepta -> descartado si los 3 fallan).

-- =========================================================
-- 1. OWNERSHIP: leads
-- =========================================================
alter table public.leads add column owner_id uuid references public.profiles (id) default auth.uid();
create index leads_owner_id_idx on public.leads (owner_id);

-- assigned_to/assigned_at (texto libre) quedan reemplazados por owner_id.
alter table public.leads drop column assigned_to;
alter table public.leads drop column assigned_at;

drop policy "leads_all_authorized" on public.leads;

create policy "leads_owner_only" on public.leads
  for all using (public.is_authorized() and owner_id = auth.uid())
  with check (public.is_authorized() and owner_id = auth.uid());

-- =========================================================
-- 2. OWNERSHIP: lead_tasks / lead_score_progress
-- Su visibilidad depende de que el lead padre sea del usuario (mismo patrón
-- que ya usan une_zones respecto a unes: tabla puente scoped por la tabla dueña).
-- =========================================================
drop policy "lead_tasks_all_authorized" on public.lead_tasks;

create policy "lead_tasks_owner_only" on public.lead_tasks
  for all using (
    public.is_authorized() and exists (
      select 1 from public.leads l where l.id = lead_tasks.lead_id and l.owner_id = auth.uid()
    )
  )
  with check (
    public.is_authorized() and exists (
      select 1 from public.leads l where l.id = lead_tasks.lead_id and l.owner_id = auth.uid()
    )
  );

drop policy "lead_score_progress_all_authorized" on public.lead_score_progress;

create policy "lead_score_progress_owner_only" on public.lead_score_progress
  for all using (
    public.is_authorized() and exists (
      select 1 from public.leads l where l.id = lead_score_progress.lead_id and l.owner_id = auth.uid()
    )
  )
  with check (
    public.is_authorized() and exists (
      select 1 from public.leads l where l.id = lead_score_progress.lead_id and l.owner_id = auth.uid()
    )
  );

-- lead_score_steps (catálogo de pesos) NO se toca: es metodología compartida
-- de la empresa, no dato personal de un lead.

-- =========================================================
-- 3. OWNERSHIP: lead_imports (staging de CSV)
-- =========================================================
alter table public.lead_imports add column owner_id uuid references public.profiles (id) default auth.uid();

drop policy "lead_imports_all_authorized" on public.lead_imports;

create policy "lead_imports_owner_only" on public.lead_imports
  for all using (public.is_authorized() and owner_id = auth.uid())
  with check (public.is_authorized() and owner_id = auth.uid());

-- La extensión de lead_tasks (columnas nuevas + migración de task_type) vive
-- en 010 y 011 — se corren por separado porque combinado en una sola
-- transacción con este archivo produce un 23514 check_violation reproducible
-- e inexplicado en el ADD CONSTRAINT final (ver notas en 011).
