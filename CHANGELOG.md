# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Fechas dd/mm/aaaa.

## [Sin publicar]

### Fase 14 — despliegue y cierre (18/10/2026)
- Producción en Vercel desde `main` con todas las migraciones aplicadas, crons registrados y secretos obligatorios cargados.
- Node fijado a 22.x (`engines`) para evitar saltos de versión automáticos en Vercel.
- `docs/261018 Cierre de construccion y backlog.md`: checklist §13 con evidencia, pendientes de André y Carlos con fecha límite y backlog de la fase 2 priorizado por impacto en ocupación.

### Fase 13 — E2E pulido y endurecimiento (18/10/2026)
- Criterios §13 cubiertos de punta a punta: lead con UTM → pre-reserva → adelanto validado → Separada → CAC por campaña y en el dashboard; montos con y sin IGV verificados dentro de los PDF de cotización y contrato.
- Secretos obligatorios en Vercel (`NPS_SECRET`, `ICAL_SECRET`, `RATE_LIMIT_SALT`): sin valores por defecto falsificables en producción.
- Bucket privado `documents` de Storage creado por migración (idempotente).
- Backup diario: falla en rojo si faltan sus secretos (antes se omitía en verde).
- Encuesta NPS automática post-evento en el aviso diario; reclamos por vencer en el resumen de operación.
- `/admin/reclamos`: Libro de Reclamaciones con plazo, detalle y registro de la respuesta (staff).
- `day_boundary` y `checkout_time` editables en Configuración. `.env.example` completo (`DATABASE_POOL_MAX`, secretos obligatorios, marca).

### Fase 12 — documentos de negocio (18/10/2026)
- `docs/261018 …`: modelo operativo, roles y RACI, políticas, programa de planners, plan de pauta a 90 días, tarifario propuesto con benchmark, checklist legal ejecutivo, plan de lanzamiento 30-60-90, manual por rol y guía de puesta en producción. Todo como borrador para validación; lo legal "por validar con abogado o contador".
- Modelo económico `docs/261018 Modelo economico Oasis.xlsx` (generado por `scripts/modelo-economico.py`): parámetros en amarillo, fórmulas vivas, CAPEX/OPEX, unit economics por segmento y canal, equilibrio, payback, sensibilidad ocupación × ticket y equilibrio pauta vs planner. Recalculado sin errores en LibreOffice.
- Investigación renombrada con prefijo YYMMDD. Matrimonio.com.pe: el "cierre del 29/12/2025" no tiene respaldo (provenía del cierre de Matrimonios.cl); su vigencia queda por verificar a mano y sin presupuesto asignado.
- `docs/agentes.md` alineado con lo implementado (S32, S35: los agentes por cadencia solo proponen).

### Fase 11 — agentes (18/10/2026)
- Recepcionista con IA en la web pública: chat que consulta disponibilidad, da el rango del cotizador, registra el lead (UTM y atribución al planner incluidas) y agenda la llamada; deriva a una persona descuentos, excepciones y reclamos. Corre como actor `agent` y queda en `audit_log`.
- Tope de gasto mensual de IA con registro por corrida (`agent_runs`); al alcanzarlo deriva a WhatsApp. Se activa solo con `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL`.
- Bandeja `/admin/agentes`: propuestas y derivaciones de los agentes; solo el admin aprueba o rechaza (aprobar no cambia dinero). Alerta por correo al staff en cada derivación.
- Agentes por cadencia (Closer, Revenue, Growth, Planners, Controller, Contenido): playbooks en `agents/` y `scripts/agent.mts` (snapshot de solo lectura y registro de propuestas).
- El chat cuenta como primera respuesta del lead; el lead sigue "nuevo" hasta que una persona lo contacte.
- Refactor: alta de lead compartida entre el formulario y el chat (`server/public/leads.ts`).
- E2E con proveedor simulado (`OASIS_AGENT_FAKE=1`, nunca en Vercel): disponibilidad, cotización, registro de lead auditado, derivación y decisión del admin, validación del historial.

### Fase 10 — automatizaciones (18/10/2026)
- Outbox de avisos (`notifications`) con idempotencia por clave: correo vía Resend (si no hay `RESEND_API_KEY` queda registrado como no enviado) y WhatsApp en cola con enlace wa.me prellenado para envío manual.
- Procesos: avisos del día (recordatorio de saldo antes/día/vencido, D-7 y D-1, resumen de operación para staff), alerta de leads fuera del SLA de primera respuesta y resumen semanal a socios (ocupación a 90 días, pipeline, leads, CAC, alertas).
- Vercel Cron (`vercel.json`) → `/api/cron/{diario|sla|semanal}` con `CRON_SECRET`; `/admin/avisos` con bandeja, ejecución a demanda (admin) y URL del feed iCal.
- Feed iCal del calendario maestro (`/api/ical/{token}.ics`, URL firmada, sin datos personales) para Google Calendar.
- Plantillas de correo y WhatsApp versionadas en `lib/templates`; el outbox guarda la versión usada.
- Dominio: `reminders` (ventanas de aviso, SLA, semana) e `ical` (RFC 5545) con tests. Nuevo parámetro `balance_notice_days`.
- E2E: secreto del cron, recordatorio sin duplicados, envío manual de WhatsApp, alerta SLA, resumen semanal, feed iCal y permisos de ops.

### Fase 9 — dashboard gerencial (18/10/2026)
- `/admin/dashboard` con filtros por mes, segmento y canal (GET, compartibles por URL).
- Ocupación V-S-D + feriados vs. L-J del mes, comprometida a 90 días y del año, con meta escalonada desde la reapertura y semáforo (ícono + texto); small multiples mensuales con línea de meta y vista de tabla.
- Ingreso neto por día disponible, ticket promedio, margen por evento, comisiones por pagar, CAC del canal directo vs. 5 % del ticket con alerta, ROAS, mezcla de canales, embudo por canal, pipeline en S/ por estado, top motivos de pérdida y NPS.
- Dominio: `nps`, `occupancyTarget`, `monthsSince` con tests. Tokens de visualización validados (claro/oscuro).
- E2E: la ocupación del dashboard cuadra con un conteo SQL independiente del mes del seed.

### Fase 7c-3 / 8 — finanzas, comisiones y costos (18/10/2026)
- `/admin/finanzas`: comisiones por planner (devengada / por pagar / pagada) con export a Excel por planner; campañas con inversión, leads, ganados y CAC; costos fijos mensuales; CAPEX de la remodelación.
- Importación CSV de inversión desde Meta Ads y Google Ads (español o inglés; agrupa por campaña y mes) y de eventos históricos ya realizados (plantilla descargable; valida fila por fila).
- Exportes CSV (con BOM para Excel) y XLSX de reservas, leads, pagos y comisiones.
- Dominio: `csv` (RFC 4180, `;` o `,`, montos `2,200` / `1.234,50`, fechas dd/mm/aaaa) e `imports`, con tests.

### Fase 7c-2 — operación del evento (18/10/2026)
- `/admin/reservas/[id]/operacion`: checklists D-7 y D-1, actas de entrega y recepción (se cierran solo con todo marcado), fotos del acta, incidencias con fotos y cargo a la garantía (descuento aplicado por el admin), costos directos estándar vs real.
- Encuesta NPS pública con enlace firmado (`/encuesta/{id}.{firma}`), una respuesta por evento realizado.

### Fase 7c-1 — configuración y planners (18/10/2026)
- `/admin/configuracion`: todos los parámetros de OASIS.md §3 editables por el admin con validación (ops en solo lectura), tarifario con precio y marca de «validado», feriados.
- `/admin/planners`: listado con estado, contrato marco, eventos vendidos y comisión pendiente; solicitudes de la web; invitación al portal (Supabase Auth en producción) y suspensión.

### Fase 7b — pagos, garantías y PDFs (18/10/2026)
- Pagos manuales (transferencia, Yape, Plin, efectivo, tarjeta) con voucher en Supabase Storage (bucket privado, URLs firmadas); ops registra y solo el admin valida o rechaza con motivo.
- Garantía retenida al validar su pago; devolución registrada por el admin. Comisión del planner devengada automáticamente al quedar el evento realizado y cobrado al 100 % (trigger en BD) y pago marcado por el admin.
- Cotizaciones versionadas (la anterior queda "reemplazada") y PDFs de cotización y contrato (react-pdf) con montos con y sin IGV; contrato marcado como borrador legal.
- E2E: registro de pago con voucher, validación, paso a Separada, PDFs válidos y acceso restringido a staff.

### Fase 7a — CRM (18/10/2026)
- `/admin/crm`: tablero por etapas (Nuevo → Liquidado / Perdido), filtros por canal, campaña UTM, alerta de atribución a planner y reloj de minutos hábiles sin primera respuesta (SLA 15 min, `lib/domain/sla.ts`).
- Ficha de lead: contacto, origen (UTM, gclid, fbclid, landing), etapa con motivo de pérdida obligatorio, actividades con próximo paso y creación de pre-reserva con precio del tarifario y tope de descuento.
- BD: la etapa del lead sigue al estado de su reserva; la primera actividad de contacto registra la primera respuesta.

### Fase 6 — feat/portal-planners (18/10/2026)
- Portal `/planners/portal` (solo rol planner): contrato marco obligatorio en el primer ingreso (versión, fecha, IP y navegador registrados).
- Disponibilidad libre / pre-reservado / ocupado, pre-reserva en un toque con cliente propio, contador de holds activos (máx. 2).
- Mis clientes (registro con consentimiento y protección de 90 días), Mis reservas con cuenta regresiva y liberación de fecha, Comisiones (devengada / por pagar / pagada).
- Descargas: ficha técnica y tarifario de planner imprimibles (con y sin IGV y comisión por tarifa).
- E2E: contrato, aislamiento de reservas, registro de cliente, pre-reserva de 72 h y liberación.

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
