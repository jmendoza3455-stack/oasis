-- Fase 2 · Base: extensiones, tipos, venues (multi-espacio), perfiles, settings y auditoría.

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'ops', 'planner');
create type public.actor_type as enum ('user', 'agent', 'system');
create type public.channel as enum ('planner', 'direct', 'referral', 'organic');
create type public.event_type as enum ('wedding', 'social', 'corporate', 'family_day');
create type public.slot as enum ('full_day', 'night', 'full_day_and_night');
create type public.booking_status as enum (
  'prebooked',  -- Pre-reserva (hold), vence sola
  'reserved',   -- Separada: adelanto validado
  'confirmed',  -- Confirmada: contrato firmado y saldo pagado
  'done',       -- Realizada
  'settled',    -- Liquidada: garantía devuelta y comisión pagada
  'cancelled',  -- Cancelada
  'expired'     -- Pre-reserva vencida
);

-- ---------------------------------------------------------------------------
-- Venues (SAWA opera varios espacios; la UI muestra uno activo)
-- ---------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  endorsement text not null default 'Un espacio SAWA',
  timezone text not null default 'America/Lima',
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users). El rol solo lo asigna el admin o el alta por invitación.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role,          -- null = sin acceso
  full_name text,
  email text,
  phone text,
  planner_id uuid,                -- FK se agrega en la migración comercial
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, planner_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_app_meta_data ->> 'role', '')::public.user_role,
    nullif(new.raw_app_meta_data ->> 'planner_id', '')::uuid
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers de autorización (security definer para no recursar en RLS)
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() = 'admin', false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() in ('admin', 'ops'), false)
$$;

create or replace function public.current_planner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select planner_id from public.profiles where id = auth.uid() and role = 'planner'
$$;

-- ---------------------------------------------------------------------------
-- Settings por venue (OASIS.md §3: nada hardcodeado)
-- ---------------------------------------------------------------------------
create table public.settings (
  venue_id uuid not null references public.venues (id) on delete cascade,
  key text not null,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  primary key (venue_id, key)
);

create or replace function public.setting(p_venue uuid, p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from public.settings where venue_id = p_venue and key = p_key
$$;

create or replace function public.setting_num(p_venue uuid, p_key text, p_default numeric)
returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((public.setting(p_venue, p_key) #>> '{}')::numeric, p_default)
$$;

-- ---------------------------------------------------------------------------
-- Auditoría (OASIS.md §5.1 y §10)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_type public.actor_type not null default 'user',
  actor_name text,
  entity text not null,
  entity_id text not null,
  action text not null,
  before jsonb,
  after jsonb
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id, at desc);

-- Los agentes y procesos de sistema marcan su identidad con:
--   select set_config('oasis.actor_type', 'agent', true), set_config('oasis.actor_name', 'closer', true);
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor_type public.actor_type :=
    coalesce(nullif(current_setting('oasis.actor_type', true), ''), 'user')::public.actor_type;
  v_id text;
begin
  v_id := case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id') else (to_jsonb(new) ->> 'id') end;
  insert into public.audit_log (actor_id, actor_type, actor_name, entity, entity_id, action, before, after)
  values (
    auth.uid(),
    case when auth.uid() is null and v_actor_type = 'user' then 'system' else v_actor_type end,
    nullif(current_setting('oasis.actor_name', true), ''),
    tg_table_name,
    coalesce(v_id, (to_jsonb(coalesce(new, old)) ->> 'key'), '?'),
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_settings after insert or update or delete on public.settings
  for each row execute function public.audit_row();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_settings before update on public.settings
  for each row execute function public.touch_updated_at();
