-- Fase 2 · Operación y costos: checklists, incidencias, NPS, costos directos, fijos y CAPEX.

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in ('d7', 'd1', 'handover', 'return')),
  items jsonb not null default '[]'::jsonb,   -- [{label, done, note}]
  completed_at timestamptz,
  completed_by uuid references auth.users (id),
  unique (booking_id, kind)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  charge_to_guarantee boolean not null default false,
  photos text[] not null default '{}',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create trigger audit_incidents after insert or update or delete on public.incidents
  for each row execute function public.audit_row();

create table public.nps_responses (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  score integer not null check (score between 0 and 10),
  comment text,
  created_at timestamptz not null default now()
);

create table public.event_costs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  category text not null check (category in ('cleaning', 'staff', 'security', 'energy', 'water', 'pool', 'supplies', 'other')),
  standard_amount numeric(12, 2) not null default 0 check (standard_amount >= 0),
  actual_amount numeric(12, 2) check (actual_amount is null or actual_amount >= 0),
  notes text,
  unique (booking_id, category)
);

create table public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  month date not null check (extract(day from month) = 1),
  category text not null check (category in ('caretaker', 'gardening', 'pool', 'utilities', 'insurance', 'internet', 'other')),
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  unique (venue_id, month, category)
);

create table public.capex_items (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  description text not null,
  category text not null default 'remodeling',
  amount numeric(12, 2) not null check (amount >= 0),
  spent_on date not null,
  created_at timestamptz not null default now()
);
