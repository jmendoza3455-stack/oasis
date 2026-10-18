-- Rol de conexión de la app (Next.js → Supavisor). No tiene privilegios propios: en cada
-- request hace SET ROLE anon | authenticated | service_role, y RLS aplica como en PostgREST.
-- La contraseña se asigna fuera del repo (scripts/db-push.mts no la toca).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'oasis_app') then
    create role oasis_app login noinherit;
  end if;
end $$;

grant anon, authenticated, service_role to oasis_app;
grant usage on schema public to oasis_app;
