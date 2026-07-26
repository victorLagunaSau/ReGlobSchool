-- Migración incremental: corre esto en el SQL Editor DESPUÉS de 007_lead_scoring.sql.
--
-- Google Places sí expone el sitio web del negocio (a diferencia del correo,
-- que requiere rastrear el sitio aparte). Se guarda en el lead para no
-- perder ese dato al convertir un resultado de búsqueda.

alter table public.leads add column website text;
