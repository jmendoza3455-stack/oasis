-- Fase 7b · Dinero: devengo automático de la comisión del planner (OASIS.md §13: "la comisión
-- del 5 % se calcula sola al marcar el evento realizado y cobrado") y garantía retenida al
-- validar su pago. Espejo de lib/domain/commission.ts.

create or replace function public.accrue_commission(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_rate numeric;
  v_days integer;
  v_today date;
begin
  select * into b from public.bookings where id = p_booking;
  if not found or b.planner_id is null or b.status not in ('done', 'settled') then
    return;
  end if;
  if public.booking_paid(b.id) < b.rental_gross then
    return;
  end if;
  if exists (select 1 from public.commissions where booking_id = b.id) then
    return;
  end if;
  select coalesce(p.commission_rate, public.setting_num(b.venue_id, 'planner_commission_rate', 0.05))
    into v_rate from public.planners p where p.id = b.planner_id;
  v_days := public.setting_num(b.venue_id, 'commission_payment_days', 7)::int;
  v_today := (now() at time zone 'America/Lima')::date;
  insert into public.commissions (booking_id, planner_id, base_net, rate, amount, payable_on)
  values (b.id, b.planner_id, b.rental_net, v_rate, round(b.rental_net * v_rate, 2), v_today + v_days);
end $$;

create or replace function public.bookings_accrue_commission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status is distinct from new.status then
    perform public.accrue_commission(new.id);
  end if;
  return new;
end $$;

create trigger bookings_accrue_commission after update of status on public.bookings
  for each row execute function public.bookings_accrue_commission();

create or replace function public.payments_after_validate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'validated' and (tg_op = 'INSERT' or old.status is distinct from 'validated') then
    if new.kind = 'guarantee' then
      insert into public.guarantees (booking_id, amount, status)
      values (new.booking_id, new.amount, 'held')
      on conflict (booking_id) do update
        set amount = public.guarantees.amount + excluded.amount,
            status = case when public.guarantees.status = 'pending' then 'held' else public.guarantees.status end;
    else
      perform public.accrue_commission(new.booking_id);
    end if;
  end if;
  return new;
end $$;

create trigger payments_after_validate after insert or update of status on public.payments
  for each row execute function public.payments_after_validate();

-- Comisiones devengadas pasan a "por pagar" al cumplirse el plazo (diario)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'oasis-commissions-payable', '10 5 * * *',
      $cron$update public.commissions set status = 'payable' where status = 'accrued' and payable_on <= (now() at time zone 'America/Lima')::date$cron$
    );
  end if;
end $$;
