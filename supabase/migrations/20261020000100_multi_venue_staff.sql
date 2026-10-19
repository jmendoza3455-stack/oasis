-- F1 · Base multi-local (OASIS.md §15.14, docs/261019 Plataforma multi-local y experiencias.md §3.1)
--
-- 1. Marca madre (nombre por definir): tabla brands y venues.brand_id.
-- 2. Personal por local: venue_members. Los admin (dueños de la marca) ven todos los locales; el
--    personal de operaciones solo los locales donde es miembro. Antes, un "ops" veía todo.
-- 3. Las políticas que daban acceso por "ser staff" pasan a "ser staff de ESE local".
--    Se quedan a nivel de marca: clientes (un cliente puede reservar en varios locales), planners
--    y su programa, perfiles, feriados, auditoría (solo admin) y el catálogo de locales.
-- 4. transition_booking, reschedule_booking y get_availability verifican el local.

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  domain text,
  -- true mientras el nombre de la marca madre no esté definido (S59): no se muestra al público
  is_placeholder boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.brands enable row level security;
create policy brands_read on public.brands for select to authenticated using (public.has_role());
create policy brands_admin on public.brands for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.brands (slug, name) values ('principal', 'Marca por definir');

create or replace function public.default_brand_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.brands order by created_at limit 1
$$;

alter table public.venues add column brand_id uuid references public.brands (id) default public.default_brand_id();
update public.venues set brand_id = public.default_brand_id() where brand_id is null;
alter table public.venues alter column brand_id set not null;

create table public.venue_members (
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  primary key (venue_id, user_id)
);
create index venue_members_user_idx on public.venue_members (user_id);
alter table public.venue_members enable row level security;
create policy venue_members_self_read on public.venue_members for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy venue_members_admin on public.venue_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- El personal de operaciones que ya existía conserva acceso a los locales actuales
insert into public.venue_members (venue_id, user_id)
select v.id, p.id from public.profiles p cross join public.venues v where p.role = 'ops'
on conflict do nothing;

create or replace function public.is_staff_of(p_venue uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.current_role_name()
           when 'admin' then true
           when 'ops' then exists (
             select 1 from public.venue_members m where m.venue_id = p_venue and m.user_id = auth.uid())
           else false
         end
$$;

-- Locales del usuario (selector del back-office)
create or replace function public.my_venue_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select v.id from public.venues v where v.is_active and public.is_staff_of(v.id)
$$;

-- Local de las filas hijas (security definer: la política no depende de poder leer al padre)
create or replace function public.booking_venue(p_booking uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select venue_id from public.bookings where id = p_booking
$$;
create or replace function public.lead_venue(p_lead uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select venue_id from public.leads where id = p_lead
$$;
create or replace function public.campaign_venue(p_campaign uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select venue_id from public.campaigns where id = p_campaign
$$;

-- Políticas por local (generadas desde las vigentes: misma lógica, is_staff() → is_staff_of(local))
alter policy activities_staff on public.activities using (public.is_staff_of(coalesce(public.lead_venue(lead_id), public.booking_venue(booking_id)))) with check (public.is_staff_of(coalesce(public.lead_venue(lead_id), public.booking_venue(booking_id))));
alter policy agent_proposals_decide on public.agent_proposals using ((is_admin() OR (public.is_staff_of(venue_id) AND (kind = 'hold'::text)))) with check ((is_admin() OR (public.is_staff_of(venue_id) AND (kind = 'hold'::text))));
alter policy agent_proposals_staff_read on public.agent_proposals using (public.is_staff_of(venue_id));
alter policy agent_runs_staff_read on public.agent_runs using (public.is_staff_of(venue_id));
alter policy blocks_staff on public.blocks using (public.is_staff_of(venue_id)) with check (public.is_staff_of(venue_id));
alter policy bookings_staff_insert on public.bookings with check (public.is_staff_of(venue_id));
alter policy bookings_staff_read on public.bookings using (public.is_staff_of(venue_id));
alter policy bookings_staff_update on public.bookings using (public.is_staff_of(venue_id)) with check (public.is_staff_of(venue_id));
alter policy campaign_spend_staff on public.campaign_spend using (public.is_staff_of(public.campaign_venue(campaign_id))) with check (public.is_staff_of(public.campaign_venue(campaign_id)));
alter policy campaigns_staff on public.campaigns using (public.is_staff_of(venue_id)) with check (public.is_staff_of(venue_id));
alter policy capex_staff_read on public.capex_items using (public.is_staff_of(venue_id));
alter policy checklists_staff on public.checklists using (public.is_staff_of(public.booking_venue(booking_id))) with check (public.is_staff_of(public.booking_venue(booking_id)));
alter policy commissions_staff_read on public.commissions using (public.is_staff_of(public.booking_venue(booking_id)));
alter policy complaints_staff on public.complaints using (public.is_staff_of(venue_id)) with check (public.is_staff_of(venue_id));
alter policy documents_staff on public.documents using (public.is_staff_of(venue_id)) with check (public.is_staff_of(venue_id));
alter policy event_costs_staff on public.event_costs using (public.is_staff_of(public.booking_venue(booking_id))) with check (public.is_staff_of(public.booking_venue(booking_id)));
alter policy fixed_costs_staff_read on public.fixed_costs using (public.is_staff_of(venue_id));
alter policy guarantees_staff_read on public.guarantees using (public.is_staff_of(public.booking_venue(booking_id)));
alter policy incidents_staff on public.incidents using (public.is_staff_of(public.booking_venue(booking_id))) with check (public.is_staff_of(public.booking_venue(booking_id)));
alter policy leads_staff on public.leads using (public.is_staff_of(venue_id)) with check (public.is_staff_of(venue_id));
alter policy marketing_clips_staff_insert on public.marketing_clips with check ((public.is_staff_of(venue_id) AND (uploaded_by = auth.uid())));
alter policy marketing_clips_staff_read on public.marketing_clips using (public.is_staff_of(venue_id));
alter policy marketing_link_clicks_staff_read on public.marketing_link_clicks using (public.is_staff_of(venue_id));
alter policy marketing_pieces_staff_read on public.marketing_pieces using (public.is_staff_of(venue_id));
alter policy notifications_staff_read on public.notifications using (public.is_staff_of(venue_id));
alter policy notifications_staff_update on public.notifications using ((public.is_staff_of(venue_id) AND (channel = 'whatsapp'::text))) with check ((public.is_staff_of(venue_id) AND (channel = 'whatsapp'::text)));
alter policy nps_staff on public.nps_responses using (public.is_staff_of(public.booking_venue(booking_id))) with check (public.is_staff_of(public.booking_venue(booking_id)));
alter policy occupancy_staff_read on public.occupancy using (public.is_staff_of(venue_id));
alter policy payments_staff_insert on public.payments with check (public.is_staff_of(public.booking_venue(booking_id)));
alter policy payments_staff_read on public.payments using (public.is_staff_of(public.booking_venue(booking_id)));
alter policy quotes_staff on public.quotes using (public.is_staff_of(venue_id)) with check (public.is_staff_of(venue_id));
alter policy whatsapp_conversations_staff_read on public.whatsapp_conversations using (public.is_staff_of(venue_id));

-- Funciones de reservas: el personal de operaciones solo opera sus locales
CREATE OR REPLACE FUNCTION public.transition_booking(p_booking uuid, p_to booking_status, p_reason text DEFAULT NULL::text)
 RETURNS bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b public.bookings;
  v_role public.user_role := public.current_role_name();
  v_system boolean := auth.uid() is null;
  v_tz text;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  if not public.booking_transition_allowed(b.status, p_to) then
    raise exception 'invalid_transition: % -> %', b.status, p_to using errcode = 'P0001';
  end if;

  -- Permisos por rol
  if v_system then
    if p_to <> 'expired' and coalesce(current_setting('oasis.actor_type', true), '') <> 'system' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif v_role = 'admin' then
    null;
  elsif v_role = 'ops' then
    -- Personal de operaciones: solo reservas de los locales donde trabaja
    if not public.is_staff_of(b.venue_id) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if not ((b.status = 'prebooked' and p_to = 'cancelled') or (b.status = 'confirmed' and p_to = 'done')) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif v_role = 'planner' then
    if b.planner_id is distinct from public.current_planner_id()
       or not (b.status = 'prebooked' and p_to = 'cancelled') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Guardas de negocio
  if p_to = 'expired' and b.hold_expires_at > now() then
    raise exception 'hold_not_expired' using errcode = 'P0001';
  elsif p_to = 'reserved' and public.booking_paid(b.id) < b.deposit_amount then
    raise exception 'deposit_not_validated' using errcode = 'P0001';
  elsif p_to = 'confirmed' and b.contract_signed_at is null then
    raise exception 'contract_not_signed' using errcode = 'P0001';
  elsif p_to = 'confirmed' and public.booking_paid(b.id) < b.rental_gross then
    raise exception 'balance_not_paid' using errcode = 'P0001';
  elsif p_to = 'done' then
    select timezone into v_tz from public.venues where id = b.venue_id;
    if b.event_date > (now() at time zone v_tz)::date then
      raise exception 'event_not_yet_happened' using errcode = 'P0001';
    end if;
  elsif p_to = 'settled' then
    if exists (select 1 from public.guarantees g
                where g.booking_id = b.id and g.status in ('pending', 'held')) then
      raise exception 'guarantee_not_resolved' using errcode = 'P0001';
    end if;
    if b.planner_id is not null and not exists (
      select 1 from public.commissions c where c.booking_id = b.id and c.status = 'paid') then
      raise exception 'commission_not_paid' using errcode = 'P0001';
    end if;
  elsif p_to = 'cancelled' and coalesce(trim(p_reason), '') = '' then
    raise exception 'cancel_reason_required' using errcode = 'P0001';
  end if;

  perform set_config('oasis.in_transition', 'on', true);
  update public.bookings
     set status = p_to,
         cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end,
         cancel_reason = case when p_to = 'cancelled' then p_reason else cancel_reason end,
         done_at = case when p_to = 'done' then now() else done_at end,
         settled_at = case when p_to = 'settled' then now() else settled_at end
   where id = b.id
   returning * into b;
  perform set_config('oasis.in_transition', 'off', true);
  return b;
end $function$;

CREATE OR REPLACE FUNCTION public.reschedule_booking(p_booking uuid, p_new_date date, p_reason text)
 RETURNS bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b public.bookings;
  v_today date := (now() at time zone 'America/Lima')::date;
  v_policy jsonb;
  v_free integer;
  v_allowed integer;
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reschedule_reason_required' using errcode = 'P0001';
  end if;
  select * into b from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if not public.is_staff_of(b.venue_id) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if b.status not in ('reserved', 'confirmed') then
    raise exception 'reschedule_invalid_status' using errcode = 'P0001';
  end if;
  if p_new_date <= v_today then
    raise exception 'reschedule_date_in_past' using errcode = 'P0001';
  end if;
  if p_new_date = b.event_date then
    raise exception 'reschedule_same_date' using errcode = 'P0001';
  end if;
  v_policy := coalesce(public.setting(b.venue_id, 'cancellation_policy'), '{}'::jsonb);
  v_free := coalesce((v_policy ->> 'reschedule_free_min_days')::int, 30);
  v_allowed := coalesce((v_policy ->> 'reschedules_allowed')::int, 1);
  if not public.is_admin() then
    if b.reschedule_count >= v_allowed then
      raise exception 'reschedule_limit_reached' using errcode = 'P0001';
    end if;
    if b.event_date - v_today < v_free then
      raise exception 'reschedule_late_requires_admin' using errcode = 'P0001';
    end if;
  end if;

  -- La exclusion constraint de occupancy rechaza la nueva fecha si está tomada
  update public.bookings
     set event_date = p_new_date,
         balance_due_on = p_new_date - public.setting_num(b.venue_id, 'balance_due_days', 15)::int,
         reschedule_count = reschedule_count + 1,
         notes = concat_ws(E'\n', notes, format('Reprogramada del %s al %s: %s',
                   to_char(b.event_date, 'DD/MM/YYYY'), to_char(p_new_date, 'DD/MM/YYYY'), trim(p_reason)))
   where id = p_booking
   returning * into b;
  return b;
end $function$;

CREATE OR REPLACE FUNCTION public.get_availability(p_venue uuid, p_from date, p_to date)
 RETURNS TABLE(day date, status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_staff boolean := public.is_staff_of(p_venue);
begin
  if not v_staff and public.current_planner_id() is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 400 then
    raise exception 'invalid_range' using errcode = '22023';
  end if;

  return query
  with days as (
    select d::date as day, public.booking_range(p_venue, d::date, 'full_day', false) as r
      from generate_series(p_from, p_to, interval '1 day') d
  )
  select days.day,
         coalesce((
           select case
                    when o.source_kind = 'block' then case when v_staff then 'blocked' else 'occupied' end
                    when bk.status = 'prebooked' then 'prebooked'
                    else 'occupied'
                  end
             from public.occupancy o
             left join public.bookings bk on o.source_kind = 'booking' and bk.id = o.source_id
            where o.venue_id = p_venue
              and o.during && days.r
              and not coalesce(bk.status = 'prebooked' and bk.hold_expires_at <= now(), false)
            order by case when o.source_kind = 'block' then 0
                          when bk.status = 'prebooked' then 2 else 1 end
            limit 1
         ), 'free')
    from days
   order by days.day;
end $function$;
