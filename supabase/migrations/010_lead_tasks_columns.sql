-- Migración: columnas nuevas de lead_tasks + conversión de datos existentes.
-- Corre esto en el SQL Editor DESPUÉS de 009_lead_ownership_and_tasks.sql.
--
-- IMPORTANTE sobre el orden: el constraint viejo de task_type
-- ('llamada'/'email'/'seguimiento') se quita ANTES de convertir los datos a
-- 'contacto_inicial'. El intento anterior fallaba exactamente aquí: el
-- UPDATE intentaba escribir 'contacto_inicial' mientras el constraint viejo
-- (que no permite ese valor) seguía activo — un error de secuencia mío, no
-- un problema de los datos ni de Postgres.

alter table public.lead_tasks drop constraint lead_tasks_task_type_check;

alter table public.lead_tasks add column channel text check (channel in ('telefono', 'email', 'ambos'));
alter table public.lead_tasks add column attempt_number integer not null default 1;
alter table public.lead_tasks add column modality text check (modality in ('virtual', 'presencial'));
alter table public.lead_tasks add column result text check (result in ('aceptado', 'rechazado', 'sin_respuesta'));

update public.lead_tasks set channel = 'telefono' where task_type = 'llamada';
update public.lead_tasks set channel = 'email' where task_type = 'email';
update public.lead_tasks set task_type = 'contacto_inicial' where task_type in ('llamada', 'email');
