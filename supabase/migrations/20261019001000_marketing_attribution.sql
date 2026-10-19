-- Marketing: atribución por pieza y calibración del director creativo.
--
-- 1. Clics de los links cortos por pieza (/r/<código>): solo código, red y destino; sin IP,
--    navegador ni ningún dato personal (Ley 29733). Inserta el servidor (service_role).
-- 2. Vista de atribución por pieza: clics, leads (utm_content = código, o código de WhatsApp
--    "pieza-<código>") y separaciones (reservas vendidas de esos leads).
-- 3. Primera decisión de André sobre cada pieza (para calibrar al director creativo: cuando una
--    versión se reemplaza, su estado pasa a "descartada" y se perdía si fue "cambios").

create table public.marketing_link_clicks (
  id bigint generated always as identity primary key,
  venue_id uuid not null references public.venues (id),
  code text not null check (code ~ '^[a-z0-9-]{2,40}$'),
  network text not null check (network in ('instagram', 'tiktok', 'facebook', 'google', 'whatsapp', 'otro')),
  target text not null check (target in ('web', 'whatsapp')),
  created_at timestamptz not null default now()
);
create index marketing_link_clicks_code_idx on public.marketing_link_clicks (venue_id, code);

alter table public.marketing_link_clicks enable row level security;
revoke all on public.marketing_link_clicks from anon;
create policy marketing_link_clicks_staff_read on public.marketing_link_clicks for select to authenticated
  using (public.is_staff());

alter table public.marketing_pieces
  add column first_decision text check (first_decision in ('approved', 'changes', 'discarded'));

create or replace function public.marketing_pieces_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status and not (
       (old.status = 'draft' and new.status in ('review', 'discarded'))
    or (old.status = 'review' and new.status in ('approved', 'changes', 'discarded'))
    or (old.status = 'changes' and new.status in ('review', 'discarded'))
    or (old.status = 'approved' and new.status in ('published', 'changes', 'discarded'))
  ) then
    raise exception 'invalid_piece_transition: % -> %', old.status, new.status using errcode = 'P0001';
  end if;
  -- La primera decisión humana sobre la versión queda fija
  if old.status = 'review' and new.status in ('approved', 'changes', 'discarded') and old.first_decision is null then
    new.first_decision := new.status;
  end if;
  if new.status = 'published' and old.status <> 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.status = 'changes' and coalesce(trim(new.feedback), '') = '' then
    raise exception 'feedback_required' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Atribución por pieza (con RLS del usuario que consulta: solo staff ve leads y reservas)
create or replace view public.marketing_attribution with (security_invoker = true) as
select p.venue_id,
       p.code,
       (select count(*) from public.marketing_link_clicks c
         where c.venue_id = p.venue_id and c.code = p.code and c.target = 'web')::int as web_clicks,
       (select count(*) from public.marketing_link_clicks c
         where c.venue_id = p.venue_id and c.code = p.code and c.target = 'whatsapp')::int as whatsapp_clicks,
       (select count(*) from public.leads l
         where l.venue_id = p.venue_id and (l.utm_content = p.code or l.utm_campaign = 'pieza-' || p.code))::int as leads,
       (select count(*) from public.bookings b join public.leads l on l.id = b.lead_id
         where l.venue_id = p.venue_id and (l.utm_content = p.code or l.utm_campaign = 'pieza-' || p.code)
           and b.status in ('reserved', 'confirmed', 'done', 'settled'))::int as bookings
  from (select distinct venue_id, code from public.marketing_pieces) p;

grant select on public.marketing_attribution to authenticated;
