-- Fase 2 · Reservas: bookings, bloqueos, ocupación exclusiva (regla no negociable §5.1),
-- máquina de estados en BD, holds de 72 h, pagos, garantías, comisiones y documentos.

-- ---------------------------------------------------------------------------
-- Rango horario que ocupa una reserva (zona horaria del venue)
--   booking_mode = 'one_per_day' → ocupa el "día comercial" completo [boundary, boundary+1d)
--   booking_mode = 'slots'       → ocupa la franja (full_day / night / ambas)
--   overnight (pernocte) extiende hasta checkout_time del día siguiente
-- ---------------------------------------------------------------------------
create or replace function public.booking_range(
  p_venue uuid, p_date date, p_slot public.slot, p_overnight boolean default false
) returns tstzrange
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text;
  v_mode text := coalesce(public.setting(p_venue, 'booking_mode') #>> '{}', 'one_per_day');
  v_boundary time := coalesce(public.setting(p_venue, 'day_boundary') #>> '{}', '06:00')::time;
  v_checkout time := coalesce(public.setting(p_venue, 'checkout_time') #>> '{}', '10:00')::time;
  v_hours jsonb := coalesce(
    public.setting(p_venue, 'slot_hours'),
    '{"full_day": ["09:00", "18:00"], "night": ["19:00", "03:00"]}'::jsonb
  );
  v_fd_start time := (v_hours -> 'full_day' ->> 0)::time;
  v_fd_end time := (v_hours -> 'full_day' ->> 1)::time;
  v_n_start time := (v_hours -> 'night' ->> 0)::time;
  v_n_end time := (v_hours -> 'night' ->> 1)::time;
  v_lower timestamp;
  v_upper timestamp;
begin
  select timezone into v_tz from public.venues where id = p_venue;
  if v_tz is null then
    raise exception 'venue_not_found';
  end if;

  if v_mode = 'one_per_day' then
    v_lower := p_date + v_boundary;
    v_upper := (p_date + 1) + v_boundary;
  else
    v_lower := p_date + case when p_slot = 'night' then v_n_start else v_fd_start end;
    if p_slot = 'full_day' then
      v_upper := p_date + v_fd_end;
    else
      v_upper := case when v_n_end <= v_n_start then (p_date + 1) + v_n_end else p_date + v_n_end end;
    end if;
  end if;

  if p_overnight then
    v_upper := greatest(v_upper, (p_date + 1) + v_checkout);
  end if;

  return tstzrange(v_lower at time zone v_tz, v_upper at time zone v_tz, '[)');
end $$;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  lead_id uuid references public.leads (id),
  client_id uuid references public.clients (id),
  planner_id uuid references public.planners (id),
  channel public.channel not null,
  event_type public.event_type not null,
  event_date date not null,
  slot public.slot not null default 'full_day',
  overnight boolean not null default false,
  guests integer not null check (guests > 0),
  during tstzrange not null,
  status public.booking_status not null default 'prebooked',
  hold_expires_at timestamptz,

  -- Montos del alquiler (OASIS.md §0: con y sin IGV)
  rental_list_net numeric(12, 2) not null default 0 check (rental_list_net >= 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  discount_approved_by uuid references auth.users (id),
  igv_rate numeric(5, 4) not null check (igv_rate between 0 and 1),
  rental_net numeric(12, 2) generated always as
    (round(rental_list_net * (1 - discount_pct / 100), 2)) stored,
  rental_igv numeric(12, 2) generated always as
    (round(round(rental_list_net * (1 - discount_pct / 100), 2) * igv_rate, 2)) stored,
  rental_gross numeric(12, 2) generated always as
    (round(rental_list_net * (1 - discount_pct / 100), 2)
      + round(round(rental_list_net * (1 - discount_pct / 100), 2) * igv_rate, 2)) stored,
  deposit_amount numeric(12, 2) not null default 0 check (deposit_amount >= 0),
  guarantee_amount numeric(12, 2) not null default 0 check (guarantee_amount >= 0),
  balance_due_on date,

  contract_signed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  refund_amount numeric(12, 2),
  done_at timestamptz,
  settled_at timestamptz,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (channel <> 'planner' or planner_id is not null),
  check (status <> 'prebooked' or hold_expires_at is not null)
);
create index bookings_venue_date_idx on public.bookings (venue_id, event_date);
create index bookings_status_idx on public.bookings (status);
create index bookings_planner_idx on public.bookings (planner_id);

alter table public.activities
  add constraint activities_booking_fk foreign key (booking_id) references public.bookings (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Bloqueos (mantenimiento / uso propio), días inclusive
-- ---------------------------------------------------------------------------
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  starts_on date not null,
  ends_on date not null,
  kind text not null default 'maintenance' check (kind in ('maintenance', 'owner_use', 'other')),
  reason text not null check (length(trim(reason)) > 0),
  during tstzrange not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create or replace function public.blocks_set_range() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_tz text;
  v_boundary time := coalesce(public.setting(new.venue_id, 'day_boundary') #>> '{}', '06:00')::time;
begin
  select timezone into v_tz from public.venues where id = new.venue_id;
  new.during := tstzrange(
    (new.starts_on + v_boundary) at time zone v_tz,
    ((new.ends_on + 1) + v_boundary) at time zone v_tz,
    '[)'
  );
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;

create trigger blocks_range before insert or update on public.blocks
  for each row execute function public.blocks_set_range();

-- ---------------------------------------------------------------------------
-- Ocupación: UNA fila por reserva activa o bloqueo, con EXCLUSION CONSTRAINT.
-- Es la garantía en BD de "una fecha/franja = una sola reserva activa".
-- ---------------------------------------------------------------------------
create table public.occupancy (
  id bigint generated always as identity primary key,
  venue_id uuid not null references public.venues (id),
  during tstzrange not null,
  source_kind text not null check (source_kind in ('booking', 'block')),
  source_id uuid not null,
  unique (source_kind, source_id),
  constraint occupancy_no_overlap exclude using gist (venue_id with =, during with &&)
);

create or replace function public.sync_occupancy() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_kind text := case when tg_table_name = 'blocks' then 'block' else 'booking' end;
  v_active boolean;
begin
  if tg_op = 'DELETE' then
    delete from public.occupancy where source_kind = v_kind and source_id = old.id;
    return old;
  end if;

  if v_kind = 'block' then
    v_active := true;
  else
    v_active := new.status in ('prebooked', 'reserved', 'confirmed', 'done', 'settled');
  end if;

  if v_active then
    insert into public.occupancy (venue_id, during, source_kind, source_id)
    values (new.venue_id, new.during, v_kind, new.id)
    on conflict (source_kind, source_id) do update set during = excluded.during, venue_id = excluded.venue_id;
  else
    delete from public.occupancy where source_kind = v_kind and source_id = new.id;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Vencimiento de holds (se llama desde cron y antes de cada reserva nueva)
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_holds(p_venue uuid default null, p_range tstzrange default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
  v_prev_actor text := current_setting('oasis.actor_type', true);
begin
  perform set_config('oasis.in_transition', 'on', true);
  perform set_config('oasis.actor_type', 'system', true);
  update public.bookings
     set status = 'expired'
   where status = 'prebooked'
     and hold_expires_at <= now()
     and (p_venue is null or venue_id = p_venue)
     and (p_range is null or during && p_range);
  get diagnostics v_count = row_count;
  perform set_config('oasis.in_transition', 'off', true);
  perform set_config('oasis.actor_type', coalesce(v_prev_actor, ''), true);
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- Defaults y reglas al crear / editar una reserva
-- ---------------------------------------------------------------------------
create or replace function public.bookings_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_net numeric;
  v_cap numeric;
begin
  -- Rango ocupado
  if tg_op = 'INSERT'
     or new.event_date is distinct from old.event_date
     or new.slot is distinct from old.slot
     or new.overnight is distinct from old.overnight
     or new.venue_id is distinct from old.venue_id then
    new.during := public.booking_range(new.venue_id, new.event_date, new.slot, new.overnight);
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'prebooked' then
      raise exception 'new_booking_must_be_prebooked' using errcode = 'P0001';
    end if;
    new.igv_rate := coalesce(new.igv_rate, public.setting_num(new.venue_id, 'igv_rate', 0.18));
    new.hold_expires_at := coalesce(
      new.hold_expires_at,
      now() + make_interval(hours => public.setting_num(new.venue_id, 'hold_hours', 72)::int)
    );
    new.created_by := coalesce(new.created_by, auth.uid());
    new.balance_due_on := coalesce(
      new.balance_due_on,
      new.event_date - public.setting_num(new.venue_id, 'balance_due_days', 15)::int
    );
    if new.guarantee_amount = 0 then
      new.guarantee_amount := coalesce(
        (public.setting(new.venue_id, 'guarantee_amounts') ->> new.event_type::text)::numeric, 0
      );
    end if;
    -- Una pre-reserva vencida nunca bloquea: se expira antes de ocupar.
    perform public.expire_stale_holds(new.venue_id, new.during);
  else
    if new.status is distinct from old.status
       and coalesce(current_setting('oasis.in_transition', true), '') <> 'on' then
      raise exception 'status_change_requires_transition' using errcode = 'P0001';
    end if;
  end if;

  -- Adelanto por defecto sobre el total con IGV
  v_net := round(new.rental_list_net * (1 - new.discount_pct / 100), 2);
  if new.deposit_amount = 0 and v_net > 0 then
    new.deposit_amount := round(
      (v_net + round(v_net * new.igv_rate, 2)) * public.setting_num(new.venue_id, 'deposit_pct', 0.5), 2
    );
  end if;

  -- Descuentos sobre el tope requieren aprobación del admin (OASIS.md §5.4)
  v_cap := public.setting_num(new.venue_id, 'discount_cap_pct', 10);
  if new.discount_approved_by is distinct from (case when tg_op = 'UPDATE' then old.discount_approved_by end)
     and new.discount_approved_by is not null
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'discount_approval_requires_admin' using errcode = 'P0001';
  end if;
  if new.discount_pct > v_cap and new.discount_approved_by is null then
    raise exception 'discount_over_cap_requires_approval' using errcode = 'P0001';
  end if;

  return new;
end $$;

create trigger bookings_before_write before insert or update on public.bookings
  for each row execute function public.bookings_before_write();
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();
create trigger bookings_occupancy after insert or update or delete on public.bookings
  for each row execute function public.sync_occupancy();
create trigger blocks_occupancy after insert or update or delete on public.blocks
  for each row execute function public.sync_occupancy();
create trigger audit_bookings after insert or update or delete on public.bookings
  for each row execute function public.audit_row();
create trigger audit_blocks after insert or update or delete on public.blocks
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Pagos (MVP manual con voucher; solo el admin valida)
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in ('deposit', 'balance', 'guarantee', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  method text not null check (method in ('transfer', 'yape', 'plin', 'cash', 'card')),
  operation_code text,
  paid_on date not null default current_date,
  voucher_path text,
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected')),
  validated_by uuid references auth.users (id),
  validated_at timestamptz,
  rejected_reason text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index payments_booking_idx on public.payments (booking_id);

create or replace function public.payments_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' and auth.uid() is not null and not public.is_admin() then
      raise exception 'payment_validation_requires_admin' using errcode = 'P0001';
    end if;
    new.created_by := coalesce(new.created_by, auth.uid());
  elsif new.status is distinct from old.status then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'payment_validation_requires_admin' using errcode = 'P0001';
    end if;
    if new.status = 'validated' then
      new.validated_by := coalesce(new.validated_by, auth.uid());
      new.validated_at := coalesce(new.validated_at, now());
    end if;
  end if;
  return new;
end $$;

create trigger payments_guard before insert or update on public.payments
  for each row execute function public.payments_guard();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.audit_row();

-- Cobrado del alquiler (sin garantía) con pagos validados
create or replace function public.booking_paid(p_booking uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from public.payments
   where booking_id = p_booking and status = 'validated' and kind in ('deposit', 'balance')
$$;

-- ---------------------------------------------------------------------------
-- Garantías y comisiones
-- ---------------------------------------------------------------------------
create table public.guarantees (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'held', 'returned', 'applied', 'partially_applied')),
  deductions numeric(12, 2) not null default 0 check (deductions >= 0),
  resolved_at timestamptz,
  notes text
);
create trigger audit_guarantees after insert or update or delete on public.guarantees
  for each row execute function public.audit_row();

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  planner_id uuid not null references public.planners (id),
  base_net numeric(12, 2) not null check (base_net >= 0),
  rate numeric(5, 4) not null check (rate between 0 and 1),
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'accrued' check (status in ('accrued', 'payable', 'paid')),
  accrued_at timestamptz not null default now(),
  payable_on date,
  paid_at timestamptz,
  paid_by uuid references auth.users (id),
  payment_reference text
);

create or replace function public.commissions_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status <> 'paid') then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'commission_payment_requires_admin' using errcode = 'P0001';
    end if;
    new.paid_by := coalesce(new.paid_by, auth.uid());
    new.paid_at := coalesce(new.paid_at, now());
  end if;
  return new;
end $$;

create trigger commissions_guard before insert or update on public.commissions
  for each row execute function public.commissions_guard();
create trigger audit_commissions after insert or update or delete on public.commissions
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Máquina de estados (espejo de lib/domain/booking; OASIS.md §5.1)
-- ---------------------------------------------------------------------------
create or replace function public.booking_transition_allowed(
  p_from public.booking_status, p_to public.booking_status
) returns boolean language sql immutable as $$
  select (p_from, p_to) in (
    ('prebooked'::public.booking_status, 'reserved'::public.booking_status),
    ('prebooked', 'cancelled'),
    ('prebooked', 'expired'),
    ('reserved', 'confirmed'),
    ('reserved', 'cancelled'),
    ('confirmed', 'done'),
    ('confirmed', 'cancelled'),
    ('done', 'settled')
  )
$$;

create or replace function public.transition_booking(
  p_booking uuid, p_to public.booking_status, p_reason text default null
) returns public.bookings
language plpgsql security definer set search_path = public as $$
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
end $$;

-- ---------------------------------------------------------------------------
-- Hold del planner (OASIS.md §3 y §5.2)
-- ---------------------------------------------------------------------------
create or replace function public.create_hold(
  p_venue uuid,
  p_event_date date,
  p_event_type public.event_type,
  p_guests integer,
  p_client uuid default null,
  p_slot public.slot default 'full_day',
  p_overnight boolean default false
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_planner uuid := public.current_planner_id();
  v_version text := public.setting(p_venue, 'planner_agreement_version') #>> '{}';
  v_max integer := public.setting_num(p_venue, 'planner_max_active_holds', 2)::int;
  v_active integer;
  b public.bookings;
begin
  if v_planner is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.planners where id = v_planner and status = 'active') then
    raise exception 'planner_not_active' using errcode = 'P0001';
  end if;
  if v_version is not null and not exists (
    select 1 from public.planner_agreements where planner_id = v_planner and version = v_version) then
    raise exception 'agreement_not_accepted' using errcode = 'P0001';
  end if;
  if p_client is not null and not exists (
    select 1 from public.clients where id = p_client and created_by_planner_id = v_planner) then
    raise exception 'client_not_owned' using errcode = '42501';
  end if;

  perform public.expire_stale_holds(p_venue, null);
  select count(*) into v_active from public.bookings
   where planner_id = v_planner and status = 'prebooked';
  if v_active >= v_max then
    raise exception 'max_active_holds_reached' using errcode = 'P0001';
  end if;

  insert into public.bookings (venue_id, client_id, planner_id, channel, event_type, event_date,
                               slot, overnight, guests)
  values (p_venue, p_client, v_planner, 'planner', p_event_type, p_event_date,
          p_slot, p_overnight, p_guests)
  returning * into b;
  return b;
end $$;

-- ---------------------------------------------------------------------------
-- Disponibilidad
-- ---------------------------------------------------------------------------
-- Staff y planners. Los planners solo ven libre / pre-reservado / ocupado (sin datos de terceros).
create or replace function public.get_availability(p_venue uuid, p_from date, p_to date)
returns table (day date, status text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_staff boolean := public.is_staff();
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
              and not (bk.status = 'prebooked' and bk.hold_expires_at <= now())
            order by case when o.source_kind = 'block' then 0
                          when bk.status = 'prebooked' then 2 else 1 end
            limit 1
         ), 'free')
    from days
   order by days.day;
end $$;

-- Web pública: solo "disponible / no disponible" por fecha.
create or replace function public.is_date_available(p_venue_slug text, p_day date)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_venue uuid;
  v_range tstzrange;
begin
  select id into v_venue from public.venues where slug = p_venue_slug and is_active;
  if v_venue is null then
    return false;
  end if;
  v_range := public.booking_range(v_venue, p_day, 'full_day', false);
  return not exists (
    select 1
      from public.occupancy o
      left join public.bookings bk on o.source_kind = 'booking' and bk.id = o.source_id
     where o.venue_id = v_venue
       and o.during && v_range
       and not (bk.status = 'prebooked' and bk.hold_expires_at <= now())
  );
end $$;

-- ---------------------------------------------------------------------------
-- Cotizaciones versionadas y documentos
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  lead_id uuid references public.leads (id),
  booking_id uuid references public.bookings (id),
  version integer not null default 1 check (version > 0),
  lines jsonb not null default '[]'::jsonb,
  subtotal_net numeric(12, 2) not null default 0,
  discount_pct numeric(5, 2) not null default 0,
  igv_rate numeric(5, 4) not null,
  total_net numeric(12, 2) not null default 0,
  total_igv numeric(12, 2) not null default 0,
  total_gross numeric(12, 2) not null default 0,
  valid_until date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'superseded')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (lead_id is not null or booking_id is not null)
);
create unique index quotes_version_idx
  on public.quotes (coalesce(booking_id, lead_id), version);
create trigger audit_quotes after insert or update or delete on public.quotes
  for each row execute function public.audit_row();

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  booking_id uuid references public.bookings (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  kind text not null check (kind in ('quote_pdf', 'contract_pdf', 'voucher', 'handover_photo', 'incident_photo', 'other')),
  storage_path text not null,
  version integer not null default 1,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
