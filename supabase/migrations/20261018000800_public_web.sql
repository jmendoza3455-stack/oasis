-- Fase 5 · Web pública: libro de reclamaciones, solicitudes de planners, rate limiting y
-- campos de atribución en leads.

alter table public.leads
  add column if not exists attribution_alert text,
  add column if not exists consent_marketing boolean not null default false,
  add column if not exists source_form text;

-- ---------------------------------------------------------------------------
-- Libro de Reclamaciones virtual (Código de Protección y Defensa del Consumidor)
-- ---------------------------------------------------------------------------
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  code text not null unique,                       -- p. ej. LR-2026-000001
  kind text not null check (kind in ('reclamo', 'queja')),
  full_name text not null,
  document_type text not null check (document_type in ('DNI', 'CE', 'PASAPORTE', 'RUC')),
  document_number text not null,
  address text not null,
  phone text,
  email text not null,
  guardian_name text,                              -- si es menor de edad
  service_description text not null,
  amount numeric(12, 2),
  detail text not null,
  request text not null,
  response text,
  responded_at timestamptz,
  due_on date not null,                            -- 15 días hábiles (plazo legal por validar)
  created_at timestamptz not null default now()
);

create sequence public.complaint_seq;

create or replace function public.complaints_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.code := 'LR-' || to_char(now() at time zone 'America/Lima', 'YYYY') || '-'
              || lpad(nextval('public.complaint_seq')::text, 6, '0');
  new.due_on := coalesce(new.due_on, (now() at time zone 'America/Lima')::date + 21);
  return new;
end $$;

create trigger complaints_before_insert before insert on public.complaints
  for each row execute function public.complaints_before_insert();
create trigger audit_complaints after insert or update on public.complaints
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Solicitudes de alta de planners (el alta real es por invitación del admin)
-- ---------------------------------------------------------------------------
create table public.planner_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  instagram text,
  events_per_year integer,
  message text,
  status text not null default 'new' check (status in ('new', 'invited', 'rejected')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rate limiting de formularios públicos (ventanas fijas por clave)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);

create or replace function public.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start) values (p_key, v_window)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_max;
end $$;

alter table public.complaints enable row level security;
alter table public.planner_applications enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.complaints, public.planner_applications, public.rate_limits from anon;

create policy complaints_staff on public.complaints for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy planner_applications_staff on public.planner_applications for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

revoke execute on function public.hit_rate_limit(text, integer, integer) from anon, public;
