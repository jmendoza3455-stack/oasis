-- Fase 2 · Reprogramación de reservas Separadas o Confirmadas (OASIS.md §5.4, cancellation_policy):
-- operaciones puede reprogramar dentro de la política (n.º permitido y anticipación mínima);
-- fuera de la política solo el admin. Se mantiene el precio pactado (S41). Espejo en
-- lib/domain/booking.ts (checkReschedule).
alter table public.bookings add column reschedule_count integer not null default 0;

create or replace function public.reschedule_booking(p_booking uuid, p_new_date date, p_reason text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
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
end $$;

revoke execute on function public.reschedule_booking(uuid, date, text) from public, anon;
grant execute on function public.reschedule_booking(uuid, date, text) to authenticated, service_role;
