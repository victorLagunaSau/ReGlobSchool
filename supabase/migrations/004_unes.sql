-- Migración: Módulo de UNEs (Unidades de Negocio Educativo)
-- Corre esto en el SQL Editor de Supabase DESPUÉS de 003_seed_countries_states.sql.

-- =========================================================
-- 1. COMMERCIAL_PARTNERS (Socios Comerciales)
-- =========================================================
create table public.commercial_partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table public.commercial_partners enable row level security;

create policy "commercial_partners_all_authorized" on public.commercial_partners
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 2. DISTRIBUTIONS (empresas distribuidoras)
-- =========================================================
create table public.distributions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  country_id text references public.countries (id),
  state_id text references public.states (id),
  commercial_partner_id uuid references public.commercial_partners (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.distributions enable row level security;
create index distributions_commercial_partner_id_idx on public.distributions (commercial_partner_id);
create index distributions_state_id_idx on public.distributions (state_id);

create policy "distributions_all_authorized" on public.distributions
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 3. DISTRIBUTION_CONTACTS (Responsable Principal / Colaboradores)
-- Los contactos pertenecen a la Distribución (la empresa), no a la UNE: una
-- UNE es solo territorio + condiciones comerciales. El Principal es el
-- administrador de la distribución; los Colaboradores pueden serlo o no
-- (campo is_admin). Se guardan desde el formulario de Distribución. Si más
-- adelante esa persona se registra en la plataforma con el mismo email, el
-- trigger de la sección 7 cruza automáticamente profile_id.
-- =========================================================
create table public.distribution_contacts (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text not null,
  position text,        -- cargo, aplica al Principal
  role text not null default 'Colaborador' check (role in ('Principal', 'Colaborador')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.distribution_contacts enable row level security;
create index distribution_contacts_distribution_id_idx on public.distribution_contacts (distribution_id);
create index distribution_contacts_email_idx on public.distribution_contacts (email);

create policy "distribution_contacts_all_authorized" on public.distribution_contacts
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 4. UNE_TYPES (catálogo dinámico de tipos de UNE)
-- =========================================================
create table public.une_types (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  titulo text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

alter table public.une_types enable row level security;

create policy "une_types_all_authorized" on public.une_types
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 5. UNES
-- =========================================================
create table public.unes (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.distributions (id) on delete restrict,
  une_type_id uuid not null references public.une_types (id),
  -- Producto vendido en esta UNE. Sin catálogo propio todavía (todo este año
  -- es Pathbooks) — el día que exista un segundo producto real, esto pasa a
  -- ser una tabla como une_types.
  producto_clave text not null default '101',
  producto_nombre text not null default 'Pathbooks',
  country_id text references public.countries (id),
  state_id text references public.states (id),
  -- Totales auto-calculados (ver trigger de la sección 9): suma de
  -- une_zones.projected_schools / projected_licenses de esta UNE. No se
  -- editan a mano, se mantienen sincronizados solos.
  projected_schools integer not null default 0,
  projected_licenses integer not null default 0,
  agreed_departure_price numeric(12,2),
  suggested_selling_price numeric(12,2),
  real_selling_price numeric(12,2),
  partner_commission numeric(12,2),
  created_at timestamptz not null default now()
);

alter table public.unes enable row level security;
create index unes_distribution_id_idx on public.unes (distribution_id);
create index unes_state_id_idx on public.unes (state_id);
create index unes_une_type_id_idx on public.unes (une_type_id);

create policy "unes_all_authorized" on public.unes
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 6. UNE_ZONES (relación N:N)
-- Una UNE puede cubrir varias zonas, y una zona puede tener más de una UNE
-- encima (de distribuidores distintos incluso) — no se recomienda
-- comercialmente pero el panel lo permite sin bloquear.
-- =========================================================
create table public.une_zones (
  une_id uuid not null references public.unes (id) on delete cascade,
  zone_id text not null references public.zones (id) on delete cascade,
  projected_schools integer not null default 0,
  projected_licenses integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (une_id, zone_id)
);

alter table public.une_zones enable row level security;
create index une_zones_zone_id_idx on public.une_zones (zone_id);

create policy "une_zones_all_authorized" on public.une_zones
  for all using (public.is_authorized()) with check (public.is_authorized());

-- =========================================================
-- 7. TRIGGER: vincular profiles <-> distribution_contacts por email
-- Cuando alguien se registra (o actualiza su email) y ese correo ya existe
-- como contacto de alguna distribución sin profile_id, se cruza
-- automáticamente.
-- =========================================================
create or replace function public.link_profile_to_distribution_contacts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.distribution_contacts
  set profile_id = new.id
  where email = new.email and profile_id is null;
  return new;
end;
$$;

create trigger profiles_link_distribution_contacts
after insert or update of email on public.profiles
for each row execute function public.link_profile_to_distribution_contacts();

-- =========================================================
-- 8. TRIGGER: contador de UNEs por zona en zones.assigned_to
-- Cada vez que se vincula una zona a una UNE (insert en une_zones):
--   - si zones.assigned_to actual NO es numérico (null, '', 'Libre', texto
--     legado) se deja en 1.
--   - si ya es numérico, se le suma 1.
-- No decrementa al desvincular/borrar una UNE (fuera de alcance por ahora).
-- =========================================================
create or replace function public.increment_zone_une_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_num integer;
begin
  begin
    select assigned_to::integer into current_num
    from public.zones where id = new.zone_id;
  exception when others then
    current_num := null;
  end;

  update public.zones
  set assigned_to = (coalesce(current_num, 0) + 1)::text
  where id = new.zone_id;

  return new;
end;
$$;

create trigger une_zones_increment_counter
after insert on public.une_zones
for each row execute function public.increment_zone_une_counter();

-- =========================================================
-- 9. TRIGGER: sincronizar totales de la UNE con sus zonas
-- unes.projected_schools / projected_licenses se recalculan como la suma de
-- une_zones.projected_schools / projected_licenses de esa UNE, cada vez que
-- se inserta, actualiza o elimina una fila de une_zones (a diferencia del
-- contador de la sección 8, este SÍ se recalcula completo en cada cambio).
-- =========================================================
create or replace function public.sync_une_projected_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_une_id uuid;
begin
  target_une_id := coalesce(new.une_id, old.une_id);

  update public.unes
  set
    projected_schools = (
      select coalesce(sum(projected_schools), 0) from public.une_zones where une_id = target_une_id
    ),
    projected_licenses = (
      select coalesce(sum(projected_licenses), 0) from public.une_zones where une_id = target_une_id
    )
  where id = target_une_id;

  return coalesce(new, old);
end;
$$;

create trigger une_zones_sync_totals
after insert or update of projected_schools, projected_licenses or delete on public.une_zones
for each row execute function public.sync_une_projected_totals();
