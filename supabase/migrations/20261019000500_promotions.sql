-- Fase 2 · Promociones (p. ej. L-J corporativo) para llenar fechas libres. Solo el admin las crea
-- (CLAUDE.md regla 6) y siempre dentro del tope de descuento; el agente Revenue solo las propone.
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  name text not null check (length(trim(name)) > 0),
  event_types public.event_type[],             -- null = todos los segmentos
  day_types text[] check (day_types <@ array['mon_thu', 'fri', 'sat', 'sun_holiday']),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  discount_pct numeric(5, 2) not null check (discount_pct > 0 and discount_pct <= 100),
  is_active boolean not null default true,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index promotions_active_idx on public.promotions (venue_id, ends_on) where is_active;

-- Dentro del tope de descuento: así nunca requiere aprobación caso por caso
create or replace function public.promotions_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.discount_pct > public.setting_num(new.venue_id, 'discount_cap_pct', 10) then
    raise exception 'promotion_over_cap' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger promotions_guard before insert or update on public.promotions
  for each row execute function public.promotions_guard();
create trigger audit_promotions after insert or update or delete on public.promotions
  for each row execute function public.audit_row();

alter table public.promotions enable row level security;
revoke all on public.promotions from anon;
create policy promotions_read on public.promotions for select to authenticated using (public.has_role());
create policy promotions_admin on public.promotions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.bookings add column promotion_id uuid references public.promotions (id);
