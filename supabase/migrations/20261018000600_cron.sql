-- Fase 2 · Automatización mínima: vencimiento de holds cada 5 minutos con pg_cron.
-- En Postgres sin pg_cron (tests locales/CI) se omite; el vencimiento igual ocurre
-- de forma perezosa al crear reservas y al consultar disponibilidad.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('oasis-expire-holds', '*/5 * * * *', $cron$select public.expire_stale_holds()$cron$);
  else
    raise notice 'pg_cron no disponible: se omite la programación de expire_stale_holds';
  end if;
end $$;
