-- Fase 2 · Recepcionista en WhatsApp (Business Cloud API): conversación por número y deduplicación
-- de los webhooks de Meta (reintentos). Solo el sistema escribe; el staff lee.
create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  wa_id text not null,                      -- número en formato internacional sin "+"
  profile_name text,
  messages jsonb not null default '[]',     -- historial reciente [{role, content}]
  lead_ref text,                            -- referencia firmada al lead y actividad del chat
  attribution jsonb not null default '{}',
  last_inbound_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (venue_id, wa_id)
);

create table public.whatsapp_inbound (
  message_id text primary key,
  received_at timestamptz not null default now()
);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_inbound enable row level security;
revoke all on public.whatsapp_conversations, public.whatsapp_inbound from anon;
create policy whatsapp_conversations_staff_read on public.whatsapp_conversations for select to authenticated
  using (public.is_staff());
