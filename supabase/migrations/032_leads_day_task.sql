-- Migración: Agregar columna day_task a tabla leads
-- Corre esto en el SQL Editor de Supabase.
--
-- day_task guarda la fecha en que debe trabajarse el lead (cuando fue calendarizado).
-- Es la única fecha que necesitamos por lead para saber qué día requiere atención.

alter table public.leads add column day_task date;

create index leads_day_task_idx on public.leads (day_task);
