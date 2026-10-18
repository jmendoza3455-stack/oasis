-- Fase 2 · Seguridad: RLS por rol (OASIS.md §10).
--   admin   → todo; único que cambia tarifas/parámetros, valida pagos y paga comisiones
--   ops     → operación diaria (leads, reservas, bloqueos, checklists, incidencias)
--   planner → solo lo suyo (sus clientes, leads, reservas, comisiones) + disponibilidad por función
--   anon    → nada directo; web pública vía funciones (is_date_available) y servidor

-- Perfiles: nadie se cambia el rol a sí mismo
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.planner_id is distinct from old.planner_id)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'role_change_requires_admin' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();
create trigger audit_profiles after update on public.profiles
  for each row execute function public.audit_row();

create or replace function public.has_role() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role_name() is not null
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'venues', 'profiles', 'settings', 'audit_log', 'spaces', 'holidays', 'rate_cards', 'planners',
    'planner_agreements', 'clients', 'leads', 'campaigns', 'campaign_spend', 'activities',
    'bookings', 'blocks', 'occupancy', 'payments', 'guarantees', 'commissions', 'quotes',
    'documents', 'checklists', 'incidents', 'nps_responses', 'event_costs', 'fixed_costs',
    'capex_items'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- Las funciones security definer corren como dueño de las tablas (postgres, con BYPASSRLS en
-- Supabase), por eso pueden aplicar reglas de negocio sin exponer datos por RLS.

-- ---------------------------------------------------------------------------
-- Catálogo público / lectura general
-- ---------------------------------------------------------------------------
create policy venues_read on public.venues for select to authenticated using (public.has_role());
create policy venues_admin on public.venues for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy spaces_read on public.spaces for select to authenticated using (public.has_role());
create policy spaces_admin on public.spaces for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy holidays_read on public.holidays for select to authenticated using (public.has_role());
create policy holidays_admin on public.holidays for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy settings_read on public.settings for select to authenticated using (public.has_role());
create policy settings_admin on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy rate_cards_read on public.rate_cards for select to authenticated using (public.has_role());
create policy rate_cards_admin on public.rate_cards for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Perfiles y planners
-- ---------------------------------------------------------------------------
create policy profiles_self_or_staff on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy planners_staff_read on public.planners for select to authenticated using (public.is_staff());
create policy planners_self_read on public.planners for select to authenticated
  using (id = public.current_planner_id());
create policy planners_admin on public.planners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy agreements_staff_read on public.planner_agreements for select to authenticated
  using (public.is_staff());
create policy agreements_self_read on public.planner_agreements for select to authenticated
  using (planner_id = public.current_planner_id());
create policy agreements_self_accept on public.planner_agreements for insert to authenticated
  with check (planner_id = public.current_planner_id() and accepted_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Clientes y leads
-- ---------------------------------------------------------------------------
create policy clients_staff on public.clients for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy clients_planner_read on public.clients for select to authenticated
  using (created_by_planner_id = public.current_planner_id());
create policy clients_planner_insert on public.clients for insert to authenticated
  with check (created_by_planner_id = public.current_planner_id());
create policy clients_planner_update on public.clients for update to authenticated
  using (created_by_planner_id = public.current_planner_id())
  with check (created_by_planner_id = public.current_planner_id());

create policy leads_staff on public.leads for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy leads_planner_read on public.leads for select to authenticated
  using (planner_id = public.current_planner_id());
create policy leads_planner_insert on public.leads for insert to authenticated
  with check (planner_id = public.current_planner_id() and channel = 'planner');

create policy activities_staff on public.activities for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy campaigns_staff on public.campaigns for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy campaign_spend_staff on public.campaign_spend for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Reservas, bloqueos y ocupación
-- ---------------------------------------------------------------------------
create policy bookings_staff_read on public.bookings for select to authenticated using (public.is_staff());
create policy bookings_staff_insert on public.bookings for insert to authenticated with check (public.is_staff());
create policy bookings_staff_update on public.bookings for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy bookings_admin_delete on public.bookings for delete to authenticated using (public.is_admin());
create policy bookings_planner_read on public.bookings for select to authenticated
  using (planner_id = public.current_planner_id());

create policy blocks_staff on public.blocks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy occupancy_staff_read on public.occupancy for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Dinero: pagos, garantías, comisiones
-- ---------------------------------------------------------------------------
create policy payments_staff_read on public.payments for select to authenticated using (public.is_staff());
create policy payments_staff_insert on public.payments for insert to authenticated with check (public.is_staff());
create policy payments_admin_update on public.payments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy payments_admin_delete on public.payments for delete to authenticated using (public.is_admin());

create policy guarantees_staff_read on public.guarantees for select to authenticated using (public.is_staff());
create policy guarantees_admin on public.guarantees for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy commissions_staff_read on public.commissions for select to authenticated using (public.is_staff());
create policy commissions_planner_read on public.commissions for select to authenticated
  using (planner_id = public.current_planner_id());
create policy commissions_admin on public.commissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Cotizaciones, documentos y operación
-- ---------------------------------------------------------------------------
create policy quotes_staff on public.quotes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy documents_staff on public.documents for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy documents_planner_read on public.documents for select to authenticated
  using (exists (select 1 from public.bookings b
                  where b.id = documents.booking_id and b.planner_id = public.current_planner_id()));

create policy checklists_staff on public.checklists for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy incidents_staff on public.incidents for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy nps_staff on public.nps_responses for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy event_costs_staff on public.event_costs for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy fixed_costs_staff_read on public.fixed_costs for select to authenticated using (public.is_staff());
create policy fixed_costs_admin on public.fixed_costs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy capex_staff_read on public.capex_items for select to authenticated using (public.is_staff());
create policy capex_admin on public.capex_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy audit_admin_read on public.audit_log for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Funciones: anon solo puede consultar disponibilidad pública
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on function public.is_date_available(text, date) to anon;
