-- Borra TODO el dato comercial de demo antes de producción (OASIS.md §12).
-- Conserva: venues, settings, spaces, holidays y rate_cards (tarifario placeholder a validar).
-- Uso: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/reset-demo.sql

begin;
truncate table
  public.nps_responses, public.incidents, public.checklists, public.event_costs,
  public.documents, public.quotes, public.commissions, public.guarantees, public.payments,
  public.occupancy, public.activities, public.bookings, public.blocks, public.leads,
  public.clients, public.campaign_spend, public.campaigns, public.planner_agreements,
  public.fixed_costs, public.capex_items
restart identity cascade;

update public.profiles set planner_id = null where planner_id is not null;
delete from public.planners;
truncate table public.audit_log restart identity;
commit;
