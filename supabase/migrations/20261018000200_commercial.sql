-- Fase 2 · Comercial: espacios, feriados, tarifario, planners, clientes, leads, cotizaciones,
-- campañas y actividades.

-- ---------------------------------------------------------------------------
-- Espacios físicos del venue (piscina, jardín, terraza, ...)
-- ---------------------------------------------------------------------------
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  name text not null,
  kind text not null,                 -- pool | garden | terrace | grill | room | bathroom | parking | other
  capacity integer check (capacity is null or capacity > 0),
  description text,
  is_placeholder boolean not null default false,   -- dato pendiente de confirmar (OASIS.md §2)
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Feriados del Perú (tabla configurable, global)
-- ---------------------------------------------------------------------------
create table public.holidays (
  date date primary key,
  name text not null,
  type text not null default 'feriado' check (type in ('feriado', 'no_laborable')),
  legal_basis text
);

-- ---------------------------------------------------------------------------
-- Tarifario: tipo de evento × tipo de día × temporada × tramo de aforo (precios SIN IGV)
-- ---------------------------------------------------------------------------
create table public.rate_cards (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  event_type public.event_type not null,
  slot public.slot not null default 'full_day',
  day_type text not null check (day_type in ('mon_thu', 'fri', 'sat', 'sun_holiday')),
  season text not null check (season in ('high', 'low')),
  guests_min integer not null default 1 check (guests_min > 0),
  guests_max integer not null check (guests_max >= guests_min),
  price_net numeric(12, 2) not null check (price_net >= 0),
  price_per_guest_net numeric(12, 2) not null default 0 check (price_per_guest_net >= 0),
  valid_from date not null default current_date,
  valid_to date,
  is_placeholder boolean not null default true,   -- false cuando André valida el precio
  notes text,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);
create index rate_cards_lookup_idx on public.rate_cards (venue_id, event_type, slot, day_type, season);

-- ---------------------------------------------------------------------------
-- Planners y contrato marco
-- ---------------------------------------------------------------------------
create table public.planners (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null unique,
  phone text,
  ruc text check (ruc is null or ruc ~ '^(10|15|17|20)[0-9]{9}$'),
  instagram text,
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  commission_rate numeric(5, 4),         -- null = usa el setting del venue
  invited_by uuid references auth.users (id),
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_planner_fk foreign key (planner_id) references public.planners (id);

create table public.planner_agreements (
  id uuid primary key default gen_random_uuid(),
  planner_id uuid not null references public.planners (id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  accepted_by uuid not null references auth.users (id),
  ip inet,
  user_agent text,
  unique (planner_id, version)
);

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  ruc text check (ruc is null or ruc ~ '^(10|15|17|20)[0-9]{9}$'),
  company_name text,
  -- Normalizados para la atribución (match por teléfono, correo o RUC)
  phone_norm text generated always as (nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')) stored,
  email_norm text generated always as (nullif(lower(trim(coalesce(email, ''))), '')) stored,
  created_by_planner_id uuid references public.planners (id),  -- null = cliente directo
  marketing_consent boolean not null default false,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index clients_phone_idx on public.clients (phone_norm);
create index clients_email_idx on public.clients (email_norm);
create index clients_ruc_idx on public.clients (ruc);
create index clients_planner_idx on public.clients (created_by_planner_id);

-- ---------------------------------------------------------------------------
-- Leads (con UTM de punta a punta, OASIS.md §5.3)
-- ---------------------------------------------------------------------------
create type public.lead_stage as enum (
  'new', 'contacted', 'visit_scheduled', 'quoted', 'prebooked', 'reserved',
  'contracted', 'done', 'settled', 'lost'
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  client_id uuid references public.clients (id),
  planner_id uuid references public.planners (id),
  channel public.channel not null,
  stage public.lead_stage not null default 'new',
  lost_reason text,
  event_type public.event_type,
  event_date date,
  guests integer check (guests is null or guests > 0),
  budget_note text,
  message text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  fbclid text,
  landing_path text,
  referrer text,
  protected_until date,               -- protección del lead del planner (90 días)
  duplicate_of uuid references public.leads (id),
  first_response_at timestamptz,
  next_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stage <> 'lost' or lost_reason is not null),
  check (channel <> 'planner' or planner_id is not null)
);
create index leads_venue_stage_idx on public.leads (venue_id, stage);
create index leads_planner_idx on public.leads (planner_id);
create index leads_campaign_idx on public.leads (utm_campaign);

create trigger touch_leads before update on public.leads
  for each row execute function public.touch_updated_at();
create trigger audit_leads after insert or update or delete on public.leads
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Campañas e inversión (CAC / ROAS)
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  platform text not null check (platform in ('meta', 'google', 'tiktok', 'directory', 'other')),
  name text not null,
  utm_campaign text not null,
  segment public.event_type,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (venue_id, utm_campaign)
);

create table public.campaign_spend (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  amount numeric(12, 2) not null check (amount >= 0),
  impressions integer,
  clicks integer,
  source text not null default 'manual' check (source in ('manual', 'csv_meta', 'csv_google')),
  unique (campaign_id, month)
);

-- ---------------------------------------------------------------------------
-- Actividades del CRM
-- ---------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  booking_id uuid,                     -- FK en migración de reservas
  kind text not null check (kind in ('call', 'whatsapp', 'email', 'visit', 'note', 'task')),
  notes text,
  due_at timestamptz,
  done_at timestamptz,
  actor_id uuid references auth.users (id),
  actor_type public.actor_type not null default 'user',
  created_at timestamptz not null default now()
);
create index activities_lead_idx on public.activities (lead_id);
