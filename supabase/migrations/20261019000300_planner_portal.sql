-- Fase 2 · Portal de planners: enviar vouchers de sus propias reservas y listar fechas libres.

-- El planner puede registrar un pago (siempre "pendiente") solo para reservas suyas. No puede
-- leer pagos (sigue sin ver dinero de nadie) ni validarlos: payments_guard exige admin.
create policy payments_planner_insert on public.payments for insert to authenticated
  with check (
    status = 'pending'
    and exists (
      select 1 from public.bookings b
       where b.id = booking_id
         and b.planner_id = public.current_planner_id()
         and b.status in ('prebooked', 'reserved', 'confirmed')
    )
  );

-- Fechas libres de un rango (máx. 120 días): solo expone disponible / no disponible, igual que
-- is_date_available, sin datos de terceros.
create or replace function public.free_dates(p_venue_slug text, p_from date, p_to date)
returns setof date
language sql stable security definer set search_path = public as $$
  select d::date
    from generate_series(p_from, least(p_to, p_from + 120), interval '1 day') d
   where d::date >= (now() at time zone 'America/Lima')::date
     and public.is_date_available(p_venue_slug, d::date)  -- incluye bloqueos (occupancy)
   order by 1;
$$;
revoke execute on function public.free_dates(text, date, date) from public, anon;
grant execute on function public.free_dates(text, date, date) to authenticated, service_role;
