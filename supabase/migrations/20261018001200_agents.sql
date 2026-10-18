-- Fase 11 · Agentes: registro de corridas (costo y tope mensual), bandeja de propuestas para
-- aprobación humana y conversaciones del Recepcionista como actividad del lead.
-- Los agentes nunca validan pagos, cambian tarifas ni pagan comisiones (CLAUDE.md regla 6).

-- Conversación del chat web como actividad del lead
alter table public.activities drop constraint activities_kind_check;
alter table public.activities add constraint activities_kind_check
  check (kind in ('call', 'whatsapp', 'email', 'visit', 'note', 'task', 'chat'));

-- El chat cuenta como primera respuesta, pero el lead sigue "nuevo" hasta que una persona lo contacte
create or replace function public.activity_first_response() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.lead_id is not null and new.kind in ('call', 'whatsapp', 'email', 'visit') then
    update public.leads
       set first_response_at = coalesce(first_response_at, new.created_at),
           stage = case when stage = 'new' then 'contacted' else stage end
     where id = new.lead_id;
  elsif new.lead_id is not null and new.kind = 'chat' then
    update public.leads set first_response_at = coalesce(first_response_at, new.created_at)
     where id = new.lead_id;
  end if;
  if new.lead_id is not null and new.due_at is not null and new.done_at is null then
    update public.leads set next_action_at = new.due_at where id = new.lead_id;
  end if;
  return new;
end $$;

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  agent text not null,
  started_at timestamptz not null default now(),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 4) not null default 0,
  status text not null check (status in ('ok', 'error', 'budget_exceeded')),
  error text,
  lead_id uuid references public.leads (id) on delete set null
);
create index agent_runs_month_idx on public.agent_runs (venue_id, started_at desc);

create table public.agent_proposals (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  agent text not null,
  kind text not null,                 -- handoff, promo, budget, followup, content…
  title text not null,
  body text not null,
  payload jsonb,
  lead_id uuid references public.leads (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected')),
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);
create index agent_proposals_open_idx on public.agent_proposals (venue_id, status, created_at desc);

create trigger audit_agent_proposals after insert or update on public.agent_proposals
  for each row execute function public.audit_row();

alter table public.agent_runs enable row level security;
alter table public.agent_proposals enable row level security;
revoke all on public.agent_runs, public.agent_proposals from anon;

create policy agent_runs_staff_read on public.agent_runs for select to authenticated
  using (public.is_staff());
create policy agent_proposals_staff_read on public.agent_proposals for select to authenticated
  using (public.is_staff());
-- Solo el admin decide (aprobar/rechazar); el sistema inserta como service_role
create policy agent_proposals_admin_decide on public.agent_proposals for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.settings (venue_id, key, value, description)
select id, k, v::jsonb, d from public.venues,
  (values
    ('agent_monthly_budget_usd', '30', 'Tope mensual de gasto en la API de IA (S34)'),
    ('agent_pricing_usd_per_mtok', '{"input": 3, "output": 15}', 'USD por millón de tokens del modelo configurado (S34, por validar)')
  ) as s(k, v, d)
on conflict (venue_id, key) do nothing;
