-- Fase 7 · CRM: la etapa del lead sigue al estado de su reserva y la primera actividad de
-- contacto registra el tiempo de primera respuesta (SLA de 15 min, OASIS.md §5.3).

create or replace function public.sync_lead_stage() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_stage public.lead_stage;
begin
  if new.lead_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  v_stage := case new.status
    when 'prebooked' then 'prebooked'
    when 'reserved' then 'reserved'
    when 'confirmed' then 'contracted'
    when 'done' then 'done'
    when 'settled' then 'settled'
    when 'cancelled' then 'lost'
    when 'expired' then 'quoted'
  end::public.lead_stage;
  update public.leads
     set stage = v_stage,
         lost_reason = case when v_stage = 'lost'
                            then coalesce('Reserva cancelada: ' || new.cancel_reason, 'Reserva cancelada')
                            else lost_reason end
   where id = new.lead_id and stage is distinct from v_stage;
  return new;
end $$;

create trigger bookings_sync_lead after insert or update of status on public.bookings
  for each row execute function public.sync_lead_stage();

create or replace function public.activity_first_response() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.lead_id is not null and new.kind in ('call', 'whatsapp', 'email', 'visit') then
    update public.leads
       set first_response_at = coalesce(first_response_at, new.created_at),
           stage = case when stage = 'new' then 'contacted' else stage end
     where id = new.lead_id;
  end if;
  if new.lead_id is not null and new.due_at is not null and new.done_at is null then
    update public.leads set next_action_at = new.due_at where id = new.lead_id;
  end if;
  return new;
end $$;

create trigger activities_first_response after insert on public.activities
  for each row execute function public.activity_first_response();
