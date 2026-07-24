-- Esquema inicial de ReGlobSchool para Supabase (Postgres).
-- Ejecuta este archivo completo en: Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Reemplaza el modelo de Firestore (countries/states/zones sueltos, cruzados a mano
-- en JavaScript) por tablas relacionales con llaves foráneas reales.

-- =========================================================
-- 1. PROFILES: extiende auth.users con los datos del formulario de registro
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  project text not null,
  business_partner text,
  personal_phone text not null,
  office_phone text not null,
  email text not null,
  role text not null default 'admin',
  authorized boolean not null default false,
  -- Ubicación opcional del usuario: si el catálogo de países/estados aún no
  -- tiene datos (o el usuario no selecciona nada), quedan en null.
  country_id text,
  state_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario puede crear y leer únicamente su propio perfil.
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- =========================================================
-- 2. COUNTRIES
-- =========================================================
create table public.countries (
  id text primary key,        -- código ISO, ej. 'MX'
  name text not null
);

alter table public.countries enable row level security;

-- =========================================================
-- 3. STATES
-- =========================================================
create table public.states (
  id text primary key,        -- ej. 'MX-AGS'
  country_id text not null references public.countries (id) on delete cascade,
  cve_estado integer not null,      -- clave numérica INEGI
  cod_estado text not null,         -- código corto, ej. 'AGS'
  name text not null,
  unique (country_id, cod_estado)
);

alter table public.states enable row level security;
create index states_country_id_idx on public.states (country_id);

-- Ahora que countries/states existen, cerramos las FK opcionales de profiles.
alter table public.profiles
  add constraint profiles_country_id_fkey foreign key (country_id) references public.countries (id),
  add constraint profiles_state_id_fkey foreign key (state_id) references public.states (id);

-- =========================================================
-- 4. ZONES
-- =========================================================
create table public.zones (
  id text primary key,        -- ej. 'MX-AGS-001'
  country_id text not null references public.countries (id) on delete cascade,
  state_id text not null references public.states (id) on delete cascade,
  cve_municipio integer not null,
  cvegeo text not null,             -- clave INEGI de municipio
  city text not null,
  assigned_to text,                 -- null/'' o 'Libre' = zona libre
  schools_potential integer not null default 0,
  licenses_censo integer not null default 0,
  licenses_sold integer not null default 0,
  created_at timestamptz not null default now(),
  unique (state_id, cvegeo)
);

alter table public.zones enable row level security;
create index zones_state_id_idx on public.zones (state_id);
create index zones_country_id_idx on public.zones (country_id);

-- =========================================================
-- 5. POLÍTICAS DE ACCESO PARA countries / states / zones
-- Solo usuarios autenticados y autorizados (profiles.authorized = true)
-- pueden leer o modificar el catálogo territorial.
-- =========================================================
create or replace function public.is_authorized()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and authorized = true
  );
$$;

-- countries/states son catálogo de referencia (no sensible): lectura pública
-- para que el formulario de registro pueda mostrar el selector de País/Estado
-- incluso antes de que el usuario esté autorizado. Escritura sigue restringida.
create policy "countries_select_public" on public.countries
  for select using (true);

create policy "countries_manage_authorized" on public.countries
  for all using (public.is_authorized()) with check (public.is_authorized());

create policy "states_select_public" on public.states
  for select using (true);

create policy "states_manage_authorized" on public.states
  for all using (public.is_authorized()) with check (public.is_authorized());

-- zones sí contiene datos comerciales sensibles (assigned_to, licencias):
-- se queda completamente restringido a usuarios autorizados.
create policy "zones_all_authorized" on public.zones
  for all using (public.is_authorized()) with check (public.is_authorized());
