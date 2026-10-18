# Oasis Pachacámac · Un espacio SAWA

Sistema comercial y operativo de Oasis Pachacámac, casa de campo para eventos en Pachacámac
(Lima, Perú), operada por SAWA – Gestión Comercial S.A.C.: web pública con chat de IA, portal de
planners, back-office, dashboard gerencial, automatizaciones y agentes.

- Especificación: [OASIS.md](OASIS.md) (la §15 prevalece)
- Convenciones para agentes y desarrolladores: [CLAUDE.md](CLAUDE.md)
- Cambios: [CHANGELOG.md](CHANGELOG.md) · Supuestos vigentes: [docs/supuestos.md](docs/supuestos.md)
- Documentos de negocio y modelo económico: [docs/](docs/) · Agentes: [agents/](agents/README.md)

## Módulos

| Módulo             | Rutas                                                                                                                   | Notas                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Web pública        | `/`, `/bodas`, `/corporativo`, `/full-day`, `/planners`, `/libro-de-reclamaciones`                                      | Disponibilidad, cotizador, formulario con UTM, chat del Recepcionista |
| Portal de planners | `/planners/portal/*`                                                                                                    | Clientes, pre-reservas, comisiones, descargas (RLS por planner)       |
| Back-office        | `/admin/calendario`, `/admin/crm`, `/admin/reservas/[id]`, `/admin/planners`, `/admin/finanzas`, `/admin/configuracion` | Máquina de estados, pagos, PDFs, operación del evento                 |
| Dashboard          | `/admin/dashboard`                                                                                                      | Ocupación vs metas, CAC vs 5 %, pipeline, embudo, NPS                 |
| Avisos             | `/admin/avisos`, `/api/cron/*`, `/api/ical/*`                                                                           | Saldos, D-7/D-1, SLA, resumen semanal, feed iCal                      |
| Agentes            | `/admin/agentes`, `/api/recepcionista`, `agents/`                                                                       | Recepcionista con IA y agentes por cadencia que solo proponen         |

## Requisitos

- Node 22 y pnpm 10 (`corepack enable`)
- Postgres 16 local para tests y desarrollo sin red (`pnpm db:local`)

## Puesta en marcha (local)

```bash
pnpm install
cp .env.example .env.local   # completa las variables (ver comentarios)
pnpm db:local                # BD local con stub de Supabase, seed y usuarios demo
pnpm dev                     # http://localhost:3000 · /ingresar → usuarios demo
```

Login de desarrollo con `OASIS_DEV_AUTH=1` (nunca funciona en Vercel). El chat usa un proveedor
simulado con `OASIS_AGENT_FAKE=1` (también nunca en Vercel; debe estar presente en el build).

## Base de datos (Supabase)

- Proyecto `oasis-pachacamac` (región `us-west-2`); las funciones de Vercel corren en `pdx1` (`vercel.json`).
- Única vía de cambio de esquema: `supabase/migrations`, aplicadas con la Management API y registradas en `supabase_migrations.schema_migrations`.
- La app se conecta directo a Postgres (`lib/db.ts`) con `SET ROLE` + JWT por transacción: RLS aplica igual que con supabase-js.

```bash
pnpm db:push         # aplica migraciones pendientes
pnpm db:seed         # carga el demo (supabase/seed.sql)
pnpm db:reset-demo   # borra el demo antes de producción
pnpm users:create    # admins y ops desde ADMIN_EMAILS / OPS_EMAILS
```

Requiere `SUPABASE_PROJECT_REF` y `SUPABASE_ACCESS_TOKEN` (token personal) en `.env.local`.
Registro público deshabilitado: el acceso es solo por invitación. Backup diario cifrado con
GitHub Actions (`.github/workflows/backup.yml`, secretos `SUPABASE_DB_URL` y `BACKUP_PASSPHRASE`).

## Verificación

```bash
pnpm verify                        # formato, typecheck, lint, unit (cobertura de dominio ≥ 90 %) y tests de BD
pnpm build && pnpm test:e2e        # Playwright desktop + móvil; capturas en test-results/screenshots
```

CI (GitHub Actions) corre todo lo anterior más Lighthouse móvil de la web pública.
Merge a `main` solo con CI en verde; `main` despliega a producción.

## Despliegue

Vercel (equipo **Sawa**, proyecto `oasis`, región `pdx1`) conectado al repo: preview por rama y
producción desde `main`. Crons en `vercel.json` (avisos diarios 08:00, SLA cada 15 min L-S,
resumen semanal lunes). Variables: todas las de [.env.example](.env.example).

- Producción: https://oasis-seven-lemon.vercel.app (protegida con login de Vercel hasta el lanzamiento).
- Guía completa: [docs/261018 Guia de puesta en produccion.md](<docs/261018 Guia de puesta en produccion.md>).

## Modelo económico

`python3 scripts/modelo-economico.py [YYMMDD]` regenera `docs/YYMMDD Modelo economico Oasis.xlsx`
(supuestos en celdas amarillas de la hoja Parámetros; el resto son fórmulas vivas).
