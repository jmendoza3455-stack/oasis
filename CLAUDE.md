@AGENTS.md

# CLAUDE.md — Convenciones del proyecto Oasis Pachacámac

La especificación viva es [OASIS.md](OASIS.md). La **sección 15** (decisiones) prevalece sobre el resto.
Lee OASIS.md antes de cualquier cambio de alcance; si algo cambia, actualízalo y regístralo en CHANGELOG.md.

## Marca

- Nombre comercial: **Oasis Pachacámac** a secas (nunca "El Oasis" ni "Un espacio SAWA"; OASIS.md §15.13).
- La empresa operadora (razón social, RUC, domicilio) sale de `settings` (`company_legal_name`, `company_ruc`, `company_address`) y solo aparece en textos legales.
- Tokens en `app/globals.css`; logos en `public/brand/` y fuente de verdad en `assets/marca/`.
- Modelo **multi-espacio**: toda entidad operativa lleva `venue_id`.

## Idioma y formato

- UI, copys y documentos: español peruano. Código, tablas, columnas y variables: inglés.
- Zona horaria `America/Lima`. Fechas visibles `dd/mm/aaaa`. Moneda PEN (`S/ 1,500.00`), USD opcional.
- Montos siempre guardados **con y sin IGV**; la tasa (18% por defecto) se lee de `settings`, nunca hardcodeada.
- Documentos de negocio en `/docs` con nombre `YYMMDD Titulo` (fecha de creación o última actualización).

## Stack

- Next.js 16 (App Router, Server Actions, `cacheComponents`) + TypeScript estricto + Tailwind v4 + componentes estilo shadcn/ui (escritos a mano en `components/ui`: el registro de shadcn no es accesible desde el entorno de Claude) + Zod v4.
- **Next 16 tiene cambios que rompen compatibilidad**: antes de usar una API, lee la guía en `node_modules/next/dist/docs/`.
- Supabase (Postgres, Auth, RLS, Storage, pg_cron, edge functions). FullCalendar. Resend. react-pdf.
- Vitest (unit) y Playwright (E2E y capturas). GitHub Actions. Vercel.
- Gestor de paquetes: **pnpm**. Node 22.

## Estructura

```
app/            rutas (públicas, (portal) planners, (admin) back-office)
components/     UI; components/ui = primitivas estilo shadcn
lib/domain/     lógica de negocio PURA y testeada (pricing, booking, commission, attribution, kpis)
lib/            utilidades, clientes de Supabase, validaciones Zod
server/         acciones y consultas del lado del servidor
supabase/       migrations/ (única vía de cambio de esquema), seed.sql, functions/
tests/unit      Vitest · tests/e2e Playwright
scripts/        seed, reset-demo, import CSV, usuarios iniciales
docs/           negocio, supuestos.md, research/
assets/         logo y fotos (placeholders marcados si faltan)
```

## Comandos

| Acción          | Comando                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Dev             | `pnpm dev`                                                                                               |
| Typecheck       | `pnpm typecheck`                                                                                         |
| Antes de commit | `pnpm verify` (formato, typecheck, lint, unit con cobertura, BD)                                         |
| Lint / formato  | `pnpm lint` · `pnpm format`                                                                              |
| Unit            | `pnpm test` (cobertura de dominio: `pnpm test:coverage`, umbral 90%)                                     |
| BD local        | `pnpm db:local` (crea `oasis_dev` con seed y usuarios demo; login de desarrollo en /ingresar)            |
| E2E             | `pnpm build && pnpm test:e2e` (en el contenedor de Claude: `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`) |
| Capturas        | se guardan en `test-results/screenshots/{pantalla}-{desktop                                              | mobile}.png` |

## Reglas de negocio críticas (no romper nunca)

1. **Una sola reserva activa por fecha/franja**, garantizada en la BD (exclusion constraint), no solo en la UI.
2. Flujo de estados: Libre → Pre-reserva (vence sola, 72 h) → Separada → Confirmada → Realizada → Liquidada; especiales Bloqueada y Cancelada. Toda transición pasa por la máquina de estados y queda en `audit_log`.
3. Un planner **nunca** ve datos de otro planner ni de clientes directos (RLS + tests).
4. Comisión del planner: 5% sobre el alquiler sin IGV, se devenga solo con evento Realizado y cobrado al 100%.
5. Atribución: protección del lead del planner por 90 días (match por teléfono, correo o RUC).
6. Solo el admin cambia tarifas y parámetros, aprueba descuentos sobre el tope, valida pagos y paga comisiones. **Ningún agente automático hace estas acciones.**
7. Todo parámetro de negocio vive en `settings`/`rate_cards`; nada hardcodeado.
8. Todo lead conserva UTM y gclid/fbclid hasta la reserva.
9. `lib/domain/booking.ts` es espejo de `transition_booking()` en SQL: si cambias una, cambia la otra (hay un test que lo verifica).
10. No inventar datos presentados como reales: testimonios, fotos y cifras van como placeholders marcados.

## Git

- `main` siempre desplegable. Una rama por fase (ver OASIS.md §15.2). Conventional Commits pequeños.
- Merge a main solo con CI en verde. Al cerrar una fase: tests, capturas, nota en CHANGELOG.md.
- Secretos solo en `.env.local` / Vercel / secretos del entorno; documentar cada variable en `.env.example`.
- Base de datos: **nunca** cambios manuales; siempre migración en `supabase/migrations`.

## Definition of Done (por fase)

- typecheck, lint, formato, unit y E2E en verde.
- Capturas móvil y desktop de cada pantalla nueva revisadas.
- Self-review contra OASIS.md §13.
- Supuestos nuevos registrados en `docs/supuestos.md`.
- CHANGELOG.md actualizado.
