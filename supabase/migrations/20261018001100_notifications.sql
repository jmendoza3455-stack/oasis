-- Fase 10 · Automatizaciones: outbox de avisos (correo y WhatsApp) con idempotencia.
-- Los crons (Vercel Cron → /api/cron/*) insertan avisos con dedupe_key única y luego los envían.
-- WhatsApp queda en cola para envío manual desde el back-office hasta tener la API de WhatsApp.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  kind text not null,                               -- balance_due_soon, event_d7, lead_sla, weekly_summary…
  channel text not null check (channel in ('email', 'whatsapp')),
  booking_id uuid references public.bookings (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  recipient text,                                   -- correo o teléfono; null = sin dato de contacto
  template text not null,
  template_version text not null,
  subject text,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  provider_id text,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_by uuid references auth.users (id),
  unique (dedupe_key, channel)
);
create index notifications_recent_idx on public.notifications (venue_id, created_at desc);
create index notifications_queued_idx on public.notifications (status) where status = 'queued';

alter table public.notifications enable row level security;
revoke all on public.notifications from anon;

create policy notifications_staff_read on public.notifications for select to authenticated
  using (public.is_staff());
-- Staff solo marca como enviado un WhatsApp manual; el resto lo escribe el sistema (service_role).
create policy notifications_staff_update on public.notifications for update to authenticated
  using (public.is_staff() and channel = 'whatsapp')
  with check (public.is_staff() and channel = 'whatsapp');

-- Auditoría del envío manual (los envíos automáticos ya quedan en la propia fila)
create trigger audit_notifications after update on public.notifications
  for each row when (new.channel = 'whatsapp') execute function public.audit_row();

-- Parámetro: días de anticipación del recordatorio de saldo
insert into public.settings (venue_id, key, value, description)
select id, 'balance_notice_days', '3', 'Recordatorio de saldo: días antes del vencimiento'
  from public.venues
on conflict (venue_id, key) do nothing;
