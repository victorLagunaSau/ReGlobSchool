-- Migración incremental: corre esto en el SQL Editor de tu proyecto YA CREADO
-- (no vuelvas a correr schema.sql completo, las tablas ya existen).
--
-- 1) Agrega país/estado opcionales al perfil del usuario.
-- 2) Abre la lectura de countries/states a cualquiera (catálogo no sensible),
--    para que el formulario de registro pueda mostrar el selector antes de
--    que el usuario esté autorizado.

alter table public.profiles
  add column country_id text references public.countries (id),
  add column state_id text references public.states (id);

drop policy if exists "countries_all_authorized" on public.countries;
drop policy if exists "states_all_authorized" on public.states;

create policy "countries_select_public" on public.countries
  for select using (true);

create policy "countries_manage_authorized" on public.countries
  for all using (public.is_authorized()) with check (public.is_authorized());

create policy "states_select_public" on public.states
  for select using (true);

create policy "states_manage_authorized" on public.states
  for all using (public.is_authorized()) with check (public.is_authorized());
