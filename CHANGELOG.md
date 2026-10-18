# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Fechas dd/mm/aaaa.

## [Sin publicar]

### Fase 5 — feat/web-publica (18/10/2026)
- Web pública mobile-first: home, landings de Bodas, Empresas y Full day, página de Planners, aviso de privacidad (borrador legal) y Libro de Reclamaciones virtual con código correlativo.
- Consulta pública de disponibilidad (solo disponible / no disponible), cotizador con rango referencial con IGV desde el tarifario.
- Formulario de lead con honeypot, Cloudflare Turnstile (si hay llave), rate limiting en BD y UTM/gclid/fbclid first-touch hasta la BD.
- Atribución automática: un cliente de planner que entra directo dentro de los 90 días queda con el planner y alerta.
- WhatsApp con mensaje prellenado y código de campaña (aparece al configurar el número).
- Banner de cookies (Ley 29733) y carga diferida de GA4, Meta Pixel y Google Ads con eventos lead_submit, whatsapp_click, availability_check y quote_view.
- SEO: metadata y Open Graph por página, imagen OG, sitemap.xml, robots.txt (previews no indexables), JSON-LD EventVenue/LocalBusiness.
- Lighthouse móvil: rendimiento 96–99, accesibilidad/buenas prácticas/SEO 100. Chequeo de Lighthouse en CI.
- Fotos y testimonios como placeholders marcados.

### Fase 4 — feat/calendario (18/10/2026)
- Capa de datos `lib/db.ts` con RLS por request (SET ROLE + JWT claims) y rol `oasis_app`.
- Login `/ingresar`: contraseña y enlace mágico (Supabase Auth); modo desarrollo para local/CI. Solo por invitación.
- Back-office `/admin` con navegación por rol (admin/ops) y protección de rutas.
- Calendario maestro (FullCalendar v7: mes, semana, agenda), colores por estado, canal visible, bloqueos con un toque o arrastrando, quitar bloqueo.
- Ficha de reserva: cliente, montos con y sin IGV, adelanto, saldo, garantía, pagos, historial auditado y cambios de estado validados por la máquina de estados (mensajes en español).
- E2E: login por rol, calendario, ficha, permisos de ops y planner, cancelación con motivo que libera la fecha, bloqueo desde el calendario. CI único con Postgres para BD + E2E.

### Vercel (18/10/2026)
- Proyecto `oasis` en el equipo Sawa (Pro Trial hasta ~01/11/2026), enlazado a GitHub, región `pdx1`, variables de Supabase cargadas. Producción en https://oasis-seven-lemon.vercel.app con protección de Vercel hasta el lanzamiento.

### Fase 3 — feat/domain (18/10/2026)
- `lib/domain` puro y testeado: `money` (IGV con y sin, redondeo idéntico a Postgres, S/ y USD), `calendar` (tipo de día, feriados, temporada, dd/mm/aaaa), `pricing` (tarifa × día × temporada × aforo, descuento con tope, adelanto, garantía, rango del cotizador), `booking` (máquina de estados con permisos, guardas, efectos y devolución por cancelación), `commission` (5 % sobre alquiler sin IGV, solo realizado y cobrado al 100 %), `attribution` (protección de 90 días por teléfono, correo o RUC) y `kpis` (ocupación V-S-D vs L-J, ingreso neto por día disponible, CAC, ROAS, equilibrio pauta vs planner, semáforo).
- Test de espejo: la máquina de estados de TypeScript se compara contra la de la migración SQL.
- 45 tests unitarios; cobertura del dominio 100 % líneas / 98 % ramas (umbral 90 % en CI).

### Supabase en producción (18/10/2026)
- Proyecto `oasis-pachacamac` (us-west-2): 6 migraciones aplicadas, seed de demo cargado, pg_cron de holds activo, 56 políticas RLS, registro público deshabilitado.
- `scripts/db-push.mts` (migraciones vía Management API con historial compatible con el CLI) y scripts `db:*` / `users:create`.
- Vercel fijado a la región `pdx1` para quedar junto a la BD.

### Fase 2 — feat/db-auth (18/10/2026)
- Esquema multi-espacio completo (OASIS.md §8) en 6 migraciones: base, comercial, reservas, operación, RLS y cron.
- Exclusion constraint de ocupación (reservas + bloqueos), máquina de estados en BD, holds de 72 h con máximo 2 por planner y contrato marco obligatorio.
- RLS por rol (admin / ops / planner / anon) con 56 políticas; disponibilidad sin datos de terceros para planners y pública por fecha.
- Seed de demo (3 planners, 20 leads, 10 reservas en todos los estados, 2 campañas, bloqueo, 34 feriados 2026–2027, 32 tarifas placeholder) y `scripts/reset-demo.sql`.
- Clientes de Supabase para Next 16 (`proxy.ts`, server, browser, admin) y `scripts/create-users.ts`.
- Backup diario cifrado (GitHub Actions) y job de BD en CI con Postgres 16.
- 25 tests de BD: doble reserva concurrente, vencimiento de holds, aislamiento RLS entre planners, anon, transiciones, descuentos, IGV, auditoría y seed.

### Fase 1 — chore/repo-base (18/10/2026)
- Next.js 16 + TypeScript estricto + Tailwind v4 + primitivas estilo shadcn/ui.
- Design tokens neutros centralizados en `app/globals.css` (marca pendiente de validación).
- Vitest, Playwright (desktop + móvil con capturas), ESLint, Prettier.
- CI en GitHub Actions: typecheck, lint, formato, unit, build y E2E.
- CLAUDE.md, README.md, .env.example, docs/supuestos.md.

### Cambios de alcance
- 18/10/2026 — Decisiones del Paso 1 registradas en OASIS.md §15: facturación por SAWA, orden en dos olas, Claude como encargado de operaciones, sin bloqueos por uso propio.
- 18/10/2026 — Nuevo alcance: equipo de agentes autónomos (fase `feat/agentes`), pendiente de validación de diseño y costo.
- 18/10/2026 — Insumos de SAWA (OASIS.md §15.5): nombre Oasis Pachacámac · Un espacio SAWA, propuesta multi-espacio, posicionamiento con planners, contratos tipo.
- 18/10/2026 — Aprobados: marca dirección A, modelo multi-espacio, WhatsApp Cloud API en Ola 2. SAWA es dueña del local (OASIS.md §15.6).
- 18/10/2026 — Agregados: Libro de Reclamaciones virtual; inscripción ANPD en el checklist legal.
