-- Calendario vivo en la web pública y corrección de disponibilidad con bloqueos.
--
-- Bug: en is_date_available y get_availability el filtro de holds vencidos
--   not (bk.status = 'prebooked' and bk.hold_expires_at <= now())
-- da NULL para los bloqueos (no tienen reserva asociada: bk es NULL), así que la fila se
-- descartaba y una fecha bloqueada aparecía libre en la web y en el portal de planners.
-- La exclusion constraint seguía impidiendo la doble reserva (regla 1), pero el cliente veía
-- "libre". Se usa coalesce(..., false). free_dates hereda la corrección.

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
       and not coalesce(bk.status = 'prebooked' and bk.hold_expires_at <= now(), false)
  );
end $$;

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
              and not coalesce(bk.status = 'prebooked' and bk.hold_expires_at <= now(), false)
            order by case when o.source_kind = 'block' then 0
                          when bk.status = 'prebooked' then 2 else 1 end
            limit 1
         ), 'free')
    from days
   order by days.day;
end $$;

-- Web pública: estado por día para el calendario vivo. Solo libre / en espera (pre-reserva
-- vigente) / ocupado: nunca tipo de evento, cliente ni planner. Máximo 62 días por consulta.
create or replace function public.public_availability(p_venue_slug text, p_from date, p_to date)
returns table (day date, status text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_venue uuid;
begin
  if p_to < p_from or p_to - p_from > 62 then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  select id into v_venue from public.venues where slug = p_venue_slug and is_active;
  if v_venue is null then
    return;
  end if;

  return query
  with days as (
    select d::date as day, public.booking_range(v_venue, d::date, 'full_day', false) as r
      from generate_series(p_from, p_to, interval '1 day') d
  )
  select days.day,
         coalesce((
           select case when bool_and(coalesce(bk.status = 'prebooked', false)) then 'hold'
                       else 'taken' end
             from public.occupancy o
             left join public.bookings bk on o.source_kind = 'booking' and bk.id = o.source_id
            where o.venue_id = v_venue
              and o.during && days.r
              and not coalesce(bk.status = 'prebooked' and bk.hold_expires_at <= now(), false)
           having count(*) > 0
         ), 'free')
    from days
   order by days.day;
end $$;

revoke execute on function public.public_availability(text, date, date) from public;
grant execute on function public.public_availability(text, date, date) to anon, authenticated;

-- Horizonte del calendario público (meses hacia adelante)
insert into public.settings (venue_id, key, value, description)
select v.id, 'public_calendar_months', '18'::jsonb,
       'Meses hacia adelante que muestra el calendario de la web'
  from public.venues v
on conflict (venue_id, key) do nothing;

-- Revisión nocturna: recalcula el estado esperado de cada día DIRECTO de bookings y blocks (sin
-- pasar por occupancy ni por booking_range) y lo compara con lo que muestra public_availability.
-- Modo one_per_day: una reserva ocupa su fecha y, con pernocte, también el día siguiente.
-- Cualquier fila devuelta es un error que el cliente vería en la web.
create or replace function public.availability_mismatches(p_venue_slug text, p_from date, p_to date)
returns table (day date, expected text, shown text)
language sql stable security definer set search_path = public as $$
  with v as (select id from public.venues where slug = p_venue_slug and is_active),
  days as (select d::date as day from generate_series(p_from, p_to, interval '1 day') d),
  expected as (
    select days.day,
           case
             when exists (select 1 from public.blocks b, v
                           where b.venue_id = v.id and days.day between b.starts_on and b.ends_on)
               or exists (select 1 from public.bookings k, v
                           where k.venue_id = v.id
                             and k.status in ('reserved', 'confirmed', 'done', 'settled')
                             and (k.event_date = days.day or (k.overnight and k.event_date + 1 = days.day)))
               then 'taken'
             when exists (select 1 from public.bookings k, v
                           where k.venue_id = v.id and k.status = 'prebooked'
                             and coalesce(k.hold_expires_at > now(), true)
                             and (k.event_date = days.day or (k.overnight and k.event_date + 1 = days.day)))
               then 'hold'
             else 'free'
           end as status
      from days
  )
  select e.day, e.status, p.status
    from expected e
    join public.public_availability(p_venue_slug, p_from, p_to) p on p.day = e.day
   where e.status <> p.status
   order by e.day;
$$;

revoke execute on function public.availability_mismatches(text, date, date) from public, anon, authenticated;

-- Feriados 2028: el calendario público muestra 18 meses (hasta abril de 2028) y la tabla llegaba
-- solo hasta 2027 (01/01 y Semana Santa 2028 salían como días comunes y con otra tarifa).
-- Calculados con peruHolidays(2028) (Pascua 16/04/2028). Fuente: D.L. 713 art. 6 y
-- modificatorias, por validar con El Peruano (docs/research/261018 Feriados Peru 2026-2027.md).
insert into public.holidays (date, name, type, legal_basis) values
  ('2028-01-01', 'Año Nuevo', 'feriado', 'D.L. 713, art. 6'),
  ('2028-04-13', 'Jueves Santo', 'feriado', 'D.L. 713, art. 6 (Pascua 16/04/2028)'),
  ('2028-04-14', 'Viernes Santo', 'feriado', 'D.L. 713, art. 6 (Pascua 16/04/2028)'),
  ('2028-05-01', 'Día del Trabajo', 'feriado', 'D.L. 713, art. 6'),
  ('2028-06-07', 'Batalla de Arica y Día de la Bandera', 'feriado', 'Ley 31788'),
  ('2028-06-29', 'San Pedro y San Pablo', 'feriado', 'D.L. 713, art. 6'),
  ('2028-07-23', 'Día de la Fuerza Aérea del Perú', 'feriado', 'Ley 31822'),
  ('2028-07-28', 'Fiestas Patrias', 'feriado', 'D.L. 713, art. 6'),
  ('2028-07-29', 'Fiestas Patrias', 'feriado', 'D.L. 713, art. 6'),
  ('2028-08-06', 'Batalla de Junín', 'feriado', 'Ley 31530'),
  ('2028-08-30', 'Santa Rosa de Lima', 'feriado', 'D.L. 713, art. 6'),
  ('2028-10-08', 'Combate de Angamos', 'feriado', 'D.L. 713, art. 6'),
  ('2028-11-01', 'Día de Todos los Santos', 'feriado', 'D.L. 713, art. 6'),
  ('2028-12-08', 'Inmaculada Concepción', 'feriado', 'D.L. 713, art. 6'),
  ('2028-12-09', 'Batalla de Ayacucho', 'feriado', 'D.L. 713, art. 6'),
  ('2028-12-25', 'Navidad', 'feriado', 'D.L. 713, art. 6')
on conflict (date) do nothing;
