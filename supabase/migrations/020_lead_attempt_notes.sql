-- Migración: Historial de Notas por Intento de Contacto
-- Registra todas las notas capturadas en cada intento, etapa y resolución de lead

create table public.lead_attempt_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,

  stage_clave text not null,  -- 'llamada', 'negociacion', etc.
  stage_titulo text not null,  -- 'Etapa 2 - Intento de Contacto', etc.
  attempt_number integer not null,  -- 1, 2, 3, 4

  note_type text not null check (note_type in ('attempt', 'success', 'retry', 'discard')),
  note_text text not null,

  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

alter table public.lead_attempt_notes enable row level security;
create index lead_attempt_notes_lead_id_idx on public.lead_attempt_notes (lead_id);
create index lead_attempt_notes_created_at_idx on public.lead_attempt_notes (created_at);

create policy "lead_attempt_notes_all_authorized" on public.lead_attempt_notes
  for all using (public.is_authorized()) with check (public.is_authorized());

-- Trigger para limpiar assigned_at cuando se asigna null
alter table public.leads add column if not exists owner_id uuid references public.profiles (id);
