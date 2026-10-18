# Cierre de construcción y backlog · Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 18/10/2026
- **Estado:** Ola 1 y Ola 2 construidas (fases 1–14). Pendiente de lanzamiento comercial.
- **Relacionados:** [Plan de lanzamiento 30-60-90](261018%20Plan%20de%20lanzamiento%2030-60-90.md) · [Guía de puesta en producción](261018%20Guia%20de%20puesta%20en%20produccion.md) · [Supuestos](supuestos.md) · [CHANGELOG](../CHANGELOG.md)

## 1. Criterios de aceptación (OASIS.md §13)

| Criterio                                                               | Estado | Evidencia                                                                                   |
| ---------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Doble reserva concurrente: solo una prospera                           | Cumple | `tests/db/bookings.test.ts` (exclusion constraint en `occupancy`)                           |
| El hold vence a las 72 h y la fecha vuelve a Libre sola                | Cumple | `tests/db/bookings.test.ts`; pg_cron `oasis-expire-holds` cada 5 min + vencimiento perezoso |
| El planner A no accede a datos del planner B ni de clientes directos   | Cumple | `tests/db/rls.test.ts` (8 casos) + `tests/e2e/portal.spec.ts`                               |
| Lead con UTM conserva su campaña hasta la reserva y aparece en el CAC  | Cumple | `tests/e2e/journey.spec.ts` (web → CRM → pago → Separada → Finanzas y dashboard)            |
| Comisión del 5 % se calcula sola al marcar realizado y cobrado         | Cumple | `tests/db/money.test.ts` (trigger `accrue_commission`)                                      |
| Ocupación del dashboard cuadra con el conteo manual de un mes del seed | Cumple | `tests/e2e/dashboard.spec.ts` (conteo SQL independiente)                                    |
| Cotización y contrato en PDF correctos, con y sin IGV                  | Cumple | `tests/e2e/money.spec.ts` (texto extraído del PDF)                                          |
| Lighthouse móvil ≥ 90 y accesibilidad ≥ 90 en la web pública           | Cumple | Job de Lighthouse en CI (rendimiento 96–99, accesibilidad 100)                              |
| CI en verde en main. Deploy en Vercel funcionando                      | Cumple | GitHub Actions en verde; Vercel producción `READY` desde `main`                             |
| README, .env.example y CLAUDE.md completos                             | Cumple | Actualizados en las fases 12–14                                                             |

Suite al cierre: 70 unit (cobertura de dominio ≥ 90 %), 28 de BD y 77 E2E (desktop + móvil).

## 2. Producción

- URL: https://oasis-seven-lemon.vercel.app (protegida con login de Vercel hasta el lanzamiento).
- BD: Supabase `oasis-pachacamac` con las 13 migraciones aplicadas. **Todavía tiene el seed de demo**: correr `pnpm db:reset-demo` antes del go-live.
- Crons de Vercel registrados (diario 08:00, SLA cada 15 min L-S, semanal lunes). Secretos `CRON_SECRET`, `ICAL_SECRET`, `NPS_SECRET` y `RATE_LIMIT_SALT` cargados.

## 3. Lo que falta del lado de André y Carlos

| #   | Pendiente                                                              | Para qué                                             | Fecha límite           |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------- |
| 1   | Decidir Vercel Pro (USD 20/mes)                                        | Uso comercial y SLA cada 15 min (S25, S30)           | 30/10/2026             |
| 2   | Correos de los admins (André, Carlos) y de operaciones                 | Crear usuarios (`pnpm users:create`)                 | 25/10/2026             |
| 3   | `ANTHROPIC_API_KEY` en Vercel                                          | Encender el Recepcionista del chat                   | Antes del go-live      |
| 4   | Dominio propio y acceso al DNS                                         | Web pública, correo y quitar la protección de Vercel | 15/11/2026             |
| 5   | Cuenta de Resend + dominio verificado (`RESEND_API_KEY`, `EMAIL_FROM`) | Que los avisos salgan por correo                     | 15/11/2026             |
| 6   | Número de WhatsApp y verificación del negocio en Meta                  | Botón de WhatsApp y, luego, la Cloud API             | 15/11/2026             |
| 7   | Secretos de backup en GitHub (`SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`)  | Backup diario (hoy falla en rojo a propósito)        | Lo antes posible       |
| 8   | Validar tarifario (S24) y si se publica con o sin IGV                  | Precios reales en web, cotizador y chat              | 01/11/2026             |
| 9   | Persona en sitio, cuentas de pago de SAWA, RUC y representante legal   | Plantillas, contrato, políticas                      | 01/11/2026             |
| 10  | IDs de GA4, Meta Pixel, Google Ads y Turnstile                         | Medición y antispam                                  | Antes de la pauta      |
| 11  | Fotos reales del local                                                 | Conversión de la web (hoy son placeholders)          | 30/11/2026             |
| 12  | Revisión legal y contable (checklist legal)                            | Licencias, ruido, piscina, contratos, facturación    | Antes de la reapertura |
| 13  | ¿Repo privado?                                                         | Confidencialidad del código y documentos             | Cuando decidan         |

## 4. Backlog de la fase 2 (priorizado por impacto en ocupación)

| Prioridad | Ítem                                                                                          | Impacto en ocupación                                | Esfuerzo                  |
| --------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------- |
| 1         | Recepcionista en WhatsApp (Cloud API)                                                         | Alto: es el canal principal en Perú; respuesta 24/7 | Medio                     |
| 2         | Programar los agentes por cadencia (Closer, Revenue, Growth, Planners, Controller, Contenido) | Alto: seguimiento diario y promos para huecos       | Bajo (tareas programadas) |
| 3         | Pre-reserva desde el chat con confirmación humana en un clic (S35)                            | Alto: acorta el ciclo lead → fecha                  | Medio                     |
| 4         | Promos L-J y fechas libres en el cotizador público                                            | Medio–alto: ocupación entre semana                  | Medio                     |
| 5         | Portal de planners: subir vouchers y compartir fechas libres                                  | Medio: menos fricción para el canal prioritario     | Bajo                      |
| 6         | Flujo de reprogramación en el sistema                                                         | Medio: retiene ventas que hoy serían cancelaciones  | Medio                     |
| 7         | Pedido automático de reseña en Google a promotores (NPS ≥ 9)                                  | Medio: SEO local y confianza                        | Bajo                      |
| 8         | Hora de corte de música como parámetro (S39)                                                  | Medio: evita multas y conflictos                    | Bajo                      |
| 9         | Temporadas por segmento y fechas especiales en el tarifario                                   | Medio: precio correcto en fechas pico               | Medio                     |
| 10        | Alerta de SLA según `business_hours` (no fija en `vercel.json`)                               | Bajo–medio                                          | Bajo                      |
| 11        | Garantía por segmento y tipo de día                                                           | Bajo                                                | Bajo                      |
| 12        | Respaldo de archivos de Storage (S38)                                                         | Riesgo operativo, no ocupación                      | Bajo                      |
| 13        | Integración de facturación electrónica                                                        | Eficiencia administrativa                           | Alto                      |
