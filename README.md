# El Oasis

Sistema comercial y operativo de El Oasis, casa de campo para eventos en Pachacámac (Lima, Perú):
web pública, portal de planners, back-office, dashboard gerencial y automatizaciones.

- Especificación: [OASIS.md](OASIS.md)
- Convenciones para agentes y desarrolladores: [CLAUDE.md](CLAUDE.md)
- Cambios: [CHANGELOG.md](CHANGELOG.md)
- Supuestos vigentes: [docs/supuestos.md](docs/supuestos.md)

## Requisitos

- Node 22 y pnpm 10 (`corepack enable`)
- Proyecto de Supabase (o Supabase CLI para entorno local)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # completa las variables
pnpm dev                     # http://localhost:3000
```

## Base de datos (Supabase)

- Proyecto: `oasis-pachacamac` (ref `jpfwiusqvuvqhispcfag`, región `us-west-2`). Las funciones de Vercel corren en `pdx1` (Oregón) para quedar junto a la BD (`vercel.json`).
- Las migraciones de `supabase/migrations` se aplican con la Management API y quedan registradas en `supabase_migrations.schema_migrations` (compatible con el CLI de Supabase).

```bash
pnpm db:push         # aplica migraciones pendientes
pnpm db:seed         # carga el demo (supabase/seed.sql)
pnpm db:reset-demo   # borra el demo antes de producción
pnpm users:create    # admins y ops desde ADMIN_EMAILS / OPS_EMAILS
pnpm test:db         # migraciones + RLS + constraints en Postgres local
```

Requiere `SUPABASE_PROJECT_REF` y `SUPABASE_ACCESS_TOKEN` (token personal `sbp_...`) en `.env.local`.
Registro público deshabilitado: el acceso es solo por invitación.

## Verificación

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm build && pnpm test:e2e  # capturas en test-results/screenshots
```

## Despliegue

Vercel conectado al repo: preview por rama y producción desde `main`.
La guía completa de puesta en producción estará en `docs/`.
