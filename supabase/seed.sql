-- Seed de DEMO de Oasis Pachacámac (OASIS.md §12).
-- Todo lo comercial aquí es FICTICIO y se borra con scripts/reset-demo antes de producción.
-- Precios: valor "medio" del benchmark (docs/research/benchmark-competidores.md §3),
-- tratados como SIN IGV y marcados is_placeholder hasta la validación de André.

begin;

select set_config('oasis.actor_type', 'system', true);
select set_config('oasis.actor_name', 'seed', true);

-- ---------------------------------------------------------------------------
-- Feriados 2026–2027 (docs/research/feriados-peru-2026-2027.md)
-- ---------------------------------------------------------------------------
insert into public.holidays (date, name, type) values
  ('2026-01-01', 'Año Nuevo', 'feriado'),
  ('2026-01-02', 'Día no laborable sector público (D.S. 042-2025-PCM)', 'no_laborable'),
  ('2026-04-02', 'Jueves Santo', 'feriado'),
  ('2026-04-03', 'Viernes Santo', 'feriado'),
  ('2026-05-01', 'Día del Trabajo', 'feriado'),
  ('2026-06-07', 'Batalla de Arica y Día de la Bandera', 'feriado'),
  ('2026-06-29', 'San Pedro y San Pablo', 'feriado'),
  ('2026-07-23', 'Día de la Fuerza Aérea del Perú', 'feriado'),
  ('2026-07-27', 'Día no laborable sector público (D.S. 075-2026-PCM)', 'no_laborable'),
  ('2026-07-28', 'Fiestas Patrias', 'feriado'),
  ('2026-07-29', 'Fiestas Patrias', 'feriado'),
  ('2026-08-06', 'Batalla de Junín', 'feriado'),
  ('2026-08-30', 'Santa Rosa de Lima', 'feriado'),
  ('2026-10-08', 'Combate de Angamos', 'feriado'),
  ('2026-11-01', 'Día de Todos los Santos', 'feriado'),
  ('2026-12-08', 'Inmaculada Concepción', 'feriado'),
  ('2026-12-09', 'Batalla de Ayacucho', 'feriado'),
  ('2026-12-25', 'Navidad', 'feriado'),
  ('2027-01-01', 'Año Nuevo', 'feriado'),
  ('2027-03-25', 'Jueves Santo', 'feriado'),
  ('2027-03-26', 'Viernes Santo', 'feriado'),
  ('2027-05-01', 'Día del Trabajo', 'feriado'),
  ('2027-06-07', 'Batalla de Arica y Día de la Bandera', 'feriado'),
  ('2027-06-29', 'San Pedro y San Pablo', 'feriado'),
  ('2027-07-23', 'Día de la Fuerza Aérea del Perú', 'feriado'),
  ('2027-07-28', 'Fiestas Patrias', 'feriado'),
  ('2027-07-29', 'Fiestas Patrias', 'feriado'),
  ('2027-08-06', 'Batalla de Junín', 'feriado'),
  ('2027-08-30', 'Santa Rosa de Lima', 'feriado'),
  ('2027-10-08', 'Combate de Angamos', 'feriado'),
  ('2027-11-01', 'Día de Todos los Santos', 'feriado'),
  ('2027-12-08', 'Inmaculada Concepción', 'feriado'),
  ('2027-12-09', 'Batalla de Ayacucho', 'feriado'),
  ('2027-12-25', 'Navidad', 'feriado')
on conflict (date) do nothing;

do $seed$
declare
  v_venue uuid;
  v_planners uuid[] := '{}';
  v_clients uuid[] := '{}';
  v_leads uuid[] := '{}';
  v_camp_meta uuid;
  v_camp_google uuid;
  v_id uuid;
  v_b uuid;
  i integer;
  v_today date := (now() at time zone 'America/Lima')::date;
begin
  -- -------------------------------------------------------------------------
  -- Venue y parámetros (OASIS.md §3; supuestos en docs/supuestos.md)
  -- -------------------------------------------------------------------------
  insert into public.venues (slug, name, address)
  values ('oasis-pachacamac', 'Oasis Pachacámac', 'Pachacámac, Lima [COMPLETAR dirección]')
  on conflict (slug) do update set name = excluded.name
  returning id into v_venue;

  insert into public.settings (venue_id, key, value, description) values
    (v_venue, 'booking_mode', '"one_per_day"', 'one_per_day | slots'),
    (v_venue, 'day_boundary', '"06:00"', 'Inicio del día comercial'),
    (v_venue, 'checkout_time', '"10:00"', 'Salida del pernocte'),
    (v_venue, 'slot_hours', '{"full_day": ["09:00", "18:00"], "night": ["19:00", "03:00"]}', 'Franjas'),
    (v_venue, 'reopening_date', '"2026-12-17"', 'S01'),
    (v_venue, 'capacity', '{"cocktail": 150, "banquet": 100, "full_day": 60}', 'S02'),
    (v_venue, 'igv_rate', '0.18', 'IGV'),
    (v_venue, 'currency_usd_rate', '3.75', 'Tipo de cambio referencial para mostrar USD'),
    (v_venue, 'hold_hours', '72', 'Vigencia del hold'),
    (v_venue, 'planner_max_active_holds', '2', 'Holds activos por planner'),
    (v_venue, 'planner_protection_days', '90', 'Protección del lead del planner'),
    (v_venue, 'planner_commission_rate', '0.05', 'S04: sobre alquiler sin IGV'),
    (v_venue, 'commission_payment_days', '7', 'S04'),
    (v_venue, 'planner_agreement_version', '"2026-10"', 'Versión vigente del contrato marco'),
    (v_venue, 'deposit_pct', '0.5', 'S05'),
    (v_venue, 'balance_due_days', '15', 'S05'),
    (v_venue, 'guarantee_amounts', '{"wedding": 1000, "social": 1000, "corporate": 1000, "family_day": 500}', 'S06'),
    (v_venue, 'cancellation_policy', '{"early_cancel_min_days": 60, "early_cancel_refund_pct": 0.5, "late_cancel_refund_pct": 0, "reschedule_free_min_days": 30, "reschedules_allowed": 1}', 'S07'),
    (v_venue, 'discount_cap_pct', '10', 'S08'),
    (v_venue, 'monthly_ad_budget', '1500', 'S09'),
    (v_venue, 'occupancy_targets', '{"weekend": {"m3": 0.5, "m6": 0.7}, "weekday": {"m6": 0.15}}', 'S10'),
    (v_venue, 'business_hours', '{"days": [1,2,3,4,5,6], "start": "09:00", "end": "19:00"}', 'S11'),
    (v_venue, 'first_response_sla_minutes', '15', 'OASIS.md §5.3'),
    (v_venue, 'high_season_months', '[12, 1, 2, 3]', 'Temporada alta')
  on conflict (venue_id, key) do nothing;

  insert into public.spaces (venue_id, name, kind, capacity, is_placeholder, sort_order) values
    (v_venue, 'Piscina', 'pool', null, false, 1),
    (v_venue, 'Jardín', 'garden', 150, false, 2),
    (v_venue, 'Terraza', 'terrace', 100, false, 3),
    (v_venue, 'Zona de parrilla', 'grill', null, false, 4),
    (v_venue, 'Dormitorios [COMPLETAR]', 'room', null, true, 5),
    (v_venue, 'Baños [COMPLETAR]', 'bathroom', null, true, 6),
    (v_venue, 'Estacionamiento [COMPLETAR]', 'parking', null, true, 7);

  insert into public.rate_cards (venue_id, event_type, day_type, season, guests_min, guests_max, price_net) values
    (v_venue, 'wedding', 'mon_thu', 'low', 1, 150, 2500),
    (v_venue, 'wedding', 'mon_thu', 'high', 1, 150, 2900),
    (v_venue, 'wedding', 'fri', 'low', 1, 150, 3500),
    (v_venue, 'wedding', 'fri', 'high', 1, 150, 4000),
    (v_venue, 'wedding', 'sat', 'low', 1, 150, 4500),
    (v_venue, 'wedding', 'sat', 'high', 1, 150, 5200),
    (v_venue, 'wedding', 'sun_holiday', 'low', 1, 150, 3800),
    (v_venue, 'wedding', 'sun_holiday', 'high', 1, 150, 4400),
    (v_venue, 'corporate', 'mon_thu', 'low', 1, 150, 2800),
    (v_venue, 'corporate', 'mon_thu', 'high', 1, 150, 3200),
    (v_venue, 'corporate', 'fri', 'low', 1, 150, 3400),
    (v_venue, 'corporate', 'fri', 'high', 1, 150, 3900),
    (v_venue, 'corporate', 'sat', 'low', 1, 150, 4000),
    (v_venue, 'corporate', 'sat', 'high', 1, 150, 4600),
    (v_venue, 'corporate', 'sun_holiday', 'low', 1, 150, 3600),
    (v_venue, 'corporate', 'sun_holiday', 'high', 1, 150, 4100),
    (v_venue, 'family_day', 'mon_thu', 'low', 1, 60, 1200),
    (v_venue, 'family_day', 'mon_thu', 'high', 1, 60, 1500),
    (v_venue, 'family_day', 'fri', 'low', 1, 60, 1500),
    (v_venue, 'family_day', 'fri', 'high', 1, 60, 1900),
    (v_venue, 'family_day', 'sat', 'low', 1, 60, 2000),
    (v_venue, 'family_day', 'sat', 'high', 1, 60, 2600),
    (v_venue, 'family_day', 'sun_holiday', 'low', 1, 60, 2200),
    (v_venue, 'family_day', 'sun_holiday', 'high', 1, 60, 2800),
    (v_venue, 'social', 'mon_thu', 'low', 1, 150, 2500),
    (v_venue, 'social', 'mon_thu', 'high', 1, 150, 2900),
    (v_venue, 'social', 'fri', 'low', 1, 150, 3500),
    (v_venue, 'social', 'fri', 'high', 1, 150, 4000),
    (v_venue, 'social', 'sat', 'low', 1, 150, 4500),
    (v_venue, 'social', 'sat', 'high', 1, 150, 5200),
    (v_venue, 'social', 'sun_holiday', 'low', 1, 150, 3800),
    (v_venue, 'social', 'sun_holiday', 'high', 1, 150, 4400);

  -- -------------------------------------------------------------------------
  -- DEMO: 3 planners, clientes, 20 leads, 2 campañas, bloqueos y 10 reservas
  -- -------------------------------------------------------------------------
  for i in 1..3 loop
    insert into public.planners (business_name, contact_name, email, phone, status)
    values ('[DEMO] Planner ' || i, 'Contacto demo ' || i, 'planner' || i || '@demo.oasis.test',
            '90000000' || i, 'active')
    returning id into v_id;
    v_planners := v_planners || v_id;
  end loop;

  insert into public.campaigns (venue_id, platform, name, utm_campaign, segment)
  values (v_venue, 'meta', '[DEMO] Full day verano · WhatsApp', 'fd-verano-meta', 'family_day')
  returning id into v_camp_meta;
  insert into public.campaigns (venue_id, platform, name, utm_campaign, segment)
  values (v_venue, 'google', '[DEMO] Search · local de eventos Pachacámac', 'search-eventos', 'wedding')
  returning id into v_camp_google;
  insert into public.campaign_spend (campaign_id, month, amount, impressions, clicks) values
    (v_camp_meta, date_trunc('month', v_today)::date, 800, 42000, 910),
    (v_camp_google, date_trunc('month', v_today)::date, 500, 6100, 240);

  for i in 1..20 loop
    insert into public.clients (full_name, phone, email, created_by_planner_id, privacy_accepted_at)
    values ('[DEMO] Cliente ' || i, '9' || lpad((10000000 + i)::text, 8, '0'), 'cliente' || i || '@demo.oasis.test',
            case when i <= 6 then v_planners[1 + (i % 3)] end, now())
    returning id into v_id;
    v_clients := v_clients || v_id;

    insert into public.leads (venue_id, client_id, planner_id, channel, stage, lost_reason, event_type,
                              event_date, guests, utm_source, utm_medium, utm_campaign, first_response_at,
                              protected_until, created_at)
    values (
      v_venue, v_id,
      case when i <= 6 then v_planners[1 + (i % 3)] end,
      (case when i <= 6 then 'planner' when i <= 14 then 'direct' when i <= 17 then 'referral' else 'organic' end)::public.channel,
      (array['new','contacted','visit_scheduled','quoted','prebooked','reserved','contracted','done','lost','new'])[1 + (i % 10)]::public.lead_stage,
      case when 1 + (i % 10) = 9 then 'Precio fuera de presupuesto' end,
      (array['wedding','corporate','family_day','social'])[1 + (i % 4)]::public.event_type,
      v_today + (15 + i * 6),
      (array[120, 60, 45, 90])[1 + (i % 4)],
      case when i between 7 and 11 then 'facebook' when i between 12 and 14 then 'google' end,
      case when i between 7 and 14 then 'cpc' end,
      case when i between 7 and 11 then 'fd-verano-meta' when i between 12 and 14 then 'search-eventos' end,
      now() - make_interval(days => 20 - i) + interval '9 minutes',
      case when i <= 6 then v_today + 90 end,
      now() - make_interval(days => 20 - i)
    )
    returning id into v_id;
    v_leads := v_leads || v_id;
  end loop;

  insert into public.blocks (venue_id, starts_on, ends_on, kind, reason)
  values (v_venue, v_today + 40, v_today + 41, 'maintenance', '[DEMO] Mantenimiento de piscina');

  -- 10 reservas en distintos estados
  -- 1-2: pre-reservas de planners (activas)
  for i in 1..2 loop
    insert into public.bookings (venue_id, lead_id, client_id, planner_id, channel, event_type, event_date,
                                 guests, rental_list_net)
    values (v_venue, v_leads[i], v_clients[i], v_planners[1 + (i % 3)], 'planner', 'wedding',
            v_today + 20 + i, 120, 4500);
  end loop;

  -- 3-4: separadas (adelanto validado)
  for i in 3..4 loop
    insert into public.bookings (venue_id, lead_id, client_id, channel, event_type, event_date, guests, rental_list_net)
    values (v_venue, v_leads[i + 4], v_clients[i + 4], 'direct', 'family_day', v_today + 30 + i, 45, 2200)
    returning id into v_b;
    insert into public.payments (booking_id, kind, amount, method, status)
    select v_b, 'deposit', deposit_amount, 'yape', 'validated' from public.bookings where id = v_b;
    perform public.transition_booking(v_b, 'reserved');
  end loop;

  -- 5-6: confirmadas (contrato y saldo)
  for i in 5..6 loop
    insert into public.bookings (venue_id, lead_id, client_id, channel, event_type, event_date, guests, rental_list_net)
    values (v_venue, v_leads[i + 4], v_clients[i + 4], 'direct', 'corporate', v_today + 50 + i, 60, 2800)
    returning id into v_b;
    insert into public.payments (booking_id, kind, amount, method, status)
    select v_b, 'deposit', deposit_amount, 'transfer', 'validated' from public.bookings where id = v_b;
    perform public.transition_booking(v_b, 'reserved');
    insert into public.payments (booking_id, kind, amount, method, status)
    select v_b, 'balance', rental_gross - deposit_amount, 'transfer', 'validated' from public.bookings where id = v_b;
    update public.bookings set contract_signed_at = now() where id = v_b;
    perform public.transition_booking(v_b, 'confirmed');
  end loop;

  -- 7-8: realizadas (pasadas), 8 con planner y comisión devengada
  for i in 7..8 loop
    insert into public.bookings (venue_id, lead_id, client_id, planner_id, channel, event_type, event_date,
                                 guests, rental_list_net)
    values (v_venue, v_leads[i - 4], v_clients[i - 4],
            case when i = 8 then v_planners[1 + ((i - 4) % 3)] end,
            (case when i = 8 then 'planner' else 'referral' end)::public.channel,
            'social', v_today - (10 + i), 90, 3800)
    returning id into v_b;
    insert into public.payments (booking_id, kind, amount, method, status)
    select v_b, 'deposit', deposit_amount, 'plin', 'validated' from public.bookings where id = v_b;
    perform public.transition_booking(v_b, 'reserved');
    insert into public.payments (booking_id, kind, amount, method, status)
    select v_b, 'balance', rental_gross - deposit_amount, 'transfer', 'validated' from public.bookings where id = v_b;
    update public.bookings set contract_signed_at = now() - interval '30 days' where id = v_b;
    perform public.transition_booking(v_b, 'confirmed');
    perform public.transition_booking(v_b, 'done');
    insert into public.guarantees (booking_id, amount, status) values (v_b, 1000, 'held');
    if i = 8 then
      insert into public.commissions (booking_id, planner_id, base_net, rate, amount, payable_on)
      select v_b, planner_id, rental_net, 0.05, round(rental_net * 0.05, 2), v_today - 11
        from public.bookings where id = v_b;
    end if;
  end loop;

  -- 9: liquidada (garantía devuelta)
  insert into public.bookings (venue_id, lead_id, client_id, channel, event_type, event_date, guests, rental_list_net)
  values (v_venue, v_leads[15], v_clients[15], 'organic', 'family_day', v_today - 25, 50, 2000)
  returning id into v_b;
  insert into public.payments (booking_id, kind, amount, method, status)
  select v_b, 'deposit', rental_gross, 'yape', 'validated' from public.bookings where id = v_b;
  perform public.transition_booking(v_b, 'reserved');
  update public.bookings set contract_signed_at = now() - interval '40 days' where id = v_b;
  perform public.transition_booking(v_b, 'confirmed');
  perform public.transition_booking(v_b, 'done');
  insert into public.guarantees (booking_id, amount, status, resolved_at) values (v_b, 500, 'returned', now());
  perform public.transition_booking(v_b, 'settled');

  -- 10: cancelada
  insert into public.bookings (venue_id, lead_id, client_id, channel, event_type, event_date, guests, rental_list_net)
  values (v_venue, v_leads[16], v_clients[16], 'direct', 'wedding', v_today + 70, 100, 4500)
  returning id into v_b;
  perform public.transition_booking(v_b, 'cancelled', '[DEMO] Cambio de fecha del cliente');
end $seed$;

commit;
