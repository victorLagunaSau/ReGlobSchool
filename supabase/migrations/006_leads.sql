-- Migración: Módulo de Leads B2B (Generación y Gestión de Prospectos)
-- Corre esto en el SQL Editor de Supabase DESPUÉS de 005_distribution_location.sql.
--
-- Leads es un módulo independiente de unes/distributions: un lead es un
-- negocio prospecto (librería, escuela, etc.) encontrado por giro y zona,
-- que se gestiona en un funnel de ventas hasta convertirse en socio
-- comercial o descartarse. Solo se referencia zones/states/countries para
-- dar contexto geográfico (mismo mapa que ya usa el resto del panel).

-- =========================================================
-- 1. LEADS
-- =========================================================
create table public.leads (
  id uuid primary key default gen_random_uuid(),

  business_name text not null,
  business_type text not null,  -- giro, ej. "Librería", "Escuela"
  phone text,
  email text,
  address text,

  -- Geolocalización: solo referencia para mostrar el lead en el mapa de
  -- zonas, sin heredar ni depender de la lógica de unes/distributions.
  zone_id text references public.zones (id) on delete set null,
  country_id text references public.countries (id),
  state_id text references public.states (id),
  municipality_code text,  -- CVEGEO del INEGI, si se conoce antes de mapear zone_id

  status text not null default 'prospecto'
    check (status in ('prospecto', 'contacto_inicial', 'en_seguimiento', 'presentacion', 'convertido', 'descartado')),

  source text not null default 'manual'
    check (source in ('manual', 'denue', 'google_maps', 'csv')),
  assigned_to text,  -- nombre del agente comercial responsable
  assigned_at timestamptz,
  tags text[] not null default '{}',

  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
create index leads_zone_id_idx on public.leads (zone_id);
create index leads_state_id_idx on public.leads (state_id);
create index leads_status_idx on public.leads (status);

create policy "leads_all_authorized" on public.leads
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 2. LEAD_TASKS (timeline de seguimiento: llamadas, correos, etc.)
-- =========================================================
create table public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,

  task_type text not null check (task_type in ('llamada', 'email', 'seguimiento')),
  description text,

  scheduled_for timestamptz,  -- null = tarea manual sin fecha programada
  completed_at timestamptz,

  status text not null default 'pendiente'
    check (status in ('pendiente', 'completado', 'postergado')),
  outcome text,  -- nota de resultado: "contestó", "no contestó", "email entregado", etc.

  created_at timestamptz not null default now()
);

alter table public.lead_tasks enable row level security;
create index lead_tasks_lead_id_idx on public.lead_tasks (lead_id);

create policy "lead_tasks_all_authorized" on public.lead_tasks
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 3. LEAD_IMPORTS (staging de cargas masivas por CSV, ej. DENUE)
-- Fila cruda del CSV antes de validarse/mapearse a un zone_id real y
-- convertirse en un registro de leads. Permite mostrar preview y errores
-- de la carga sin ensuciar la tabla de leads con datos sin validar.
-- =========================================================
create table public.lead_imports (
  id uuid primary key default gen_random_uuid(),
  upload_batch_id uuid not null default gen_random_uuid(),

  business_name text not null,
  business_type text,
  phone text,
  email text,
  address text,
  municipality_code text,

  status text not null default 'pending'
    check (status in ('pending', 'mapped', 'error', 'imported')),
  error_message text,

  zone_id text references public.zones (id),
  lead_id uuid references public.leads (id),

  created_at timestamptz not null default now()
);

alter table public.lead_imports enable row level security;
create index lead_imports_batch_id_idx on public.lead_imports (upload_batch_id);

create policy "lead_imports_all_authorized" on public.lead_imports
  for all using (public.is_authorized()) with check (public.is_authorized());
