-- Migración: agregar el constraint nuevo de task_type en lead_tasks.
-- Corre esto DESPUÉS de 010_lead_tasks_columns.sql (que ya quitó el
-- constraint viejo y convirtió los datos). Esta vez el constraint viejo ya
-- no existe, así que solo agregamos el nuevo.
--
-- Antes de correr esto, confirma que la conversión de 010 quedó bien:
--   select task_type, count(*) from public.lead_tasks group by task_type;
-- Debe mostrar solo 'contacto_inicial' y/o 'seguimiento' — nada de
-- 'llamada'/'email'.

alter table public.lead_tasks add constraint lead_tasks_task_type_check
  check (task_type in ('contacto_inicial', 'seguimiento', 'demo'));
