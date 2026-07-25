-- Migración incremental: corre esto en el SQL Editor de tu proyecto YA CREADO
-- (no vuelvas a correr 004_unes.sql completo, esas tablas ya existen).
--
-- Agrega País/Estado a distributions.

alter table public.distributions
  add column country_id text references public.countries (id),
  add column state_id text references public.states (id);

create index distributions_state_id_idx on public.distributions (state_id);
