# OASIS.md — Especificación maestra del proyecto "El Oasis"
Sistema comercial y operativo de un venue de eventos y esparcimiento en Pachacámac (Lima, Perú).

> Especificación viva. Todo cambio de alcance se registra aquí y en CHANGELOG.md.
> Las decisiones tomadas tras el Paso 1 están en la **sección 15** y prevalecen sobre el texto original.

==================================================================
## 0. Reglas de trabajo para Claude Code
==================================================================
- Idioma: español peruano en UI, copys y documentos; código, tablas y variables en inglés.
- Spec-driven: este archivo es la especificación viva. Primero el plan (sección 14, Paso 1); no escribas código hasta mi "go". Si una decisión cambia el alcance, actualiza este archivo y regístralo en CHANGELOG.md.
- Al iniciar, crea CLAUDE.md en la raíz con las convenciones de este proyecto (stack, estructura, comandos, reglas de negocio críticas, Definition of Done) para que toda sesión futura las respete.
- Lleva una lista de tareas visible y márcala a medida que avances.
- Para investigación (benchmarks, normativa, directorios), usa subagentes en paralelo y deja hallazgos con fuente en /docs.
- Datos faltantes:
  - [COMPLETAR] o [CONFIRMAR]: aplica el supuesto indicado, regístralo en docs/supuestos.md y continúa.
  - Detente solo ante decisiones que cambien la arquitectura, el dinero o temas legales.
- Prohibido inventar datos presentados como reales. Testimonios, cifras de clientes y fotos van como placeholders marcados. Los precios finales salen del benchmark y de mi validación.
- Verificación obligatoria:
  - antes de dar algo por terminado, corre typecheck, lint, tests unitarios y E2E;
  - revisa visualmente con Playwright (capturas en móvil y desktop) cada pantalla nueva;
  - haz un self-review contra la sección 13.
- Convenciones regionales:
  - zona horaria America/Lima; fechas dd/mm/aaaa;
  - moneda PEN (S/) con opción de mostrar USD; montos guardados con y sin IGV (18%, configurable);
  - tabla de feriados del Perú configurable.
- Documentos de negocio con nombre "YYMMDD Titulo" (fecha del día de creación o de la última actualización).

==================================================================
## 1. Repositorio
==================================================================
- Todo el trabajo vive en el repositorio "oasis", recién creado y clonado en esta carpeta. No crees otros repos ni trabajes fuera de él.
- Al empezar, verifica con `git remote -v` y `git status`. Si no tiene commits, inicializa README.md, .gitignore (Node, Next.js, .env*), CLAUDE.md, CHANGELOG.md y la estructura base.
- Estructura:
  /app, /components, /lib, /server  → aplicación Next.js
  /supabase/migrations, /supabase/seed.sql, /supabase/functions → BD versionada (nunca cambios manuales sin migración)
  /docs        → documentos de negocio y docs/supuestos.md
  /assets      → logo y fotos
  /tests       → unit (Vitest) y e2e (Playwright)
  /scripts     → seed, limpieza de demo, import CSV
  OASIS.md, CLAUDE.md, README.md, CHANGELOG.md, .env.example
- Flujo de Git:
  - main siempre desplegable;
  - una rama por fase (feat/db-auth, feat/calendario, feat/portal-planners, …);
  - Conventional Commits pequeños (feat:, fix:, docs:, chore:, test:);
  - merge a main solo en verde.
- CI con GitHub Actions: typecheck, lint, tests unitarios y E2E en cada push y PR.
- Deploy: Vercel conectado a "oasis", con preview por rama y producción desde main.
- Secretos: nunca en el repo; solo en .env.local y en Vercel. Cada variable documentada en .env.example.

==================================================================
## 2. Contexto de negocio
==================================================================
"El Oasis" es una casa de campo en Pachacámac, propiedad de Carlos, hoy en remodelación, que se monetizará como espacio de eventos y esparcimiento. Ya se realizaron bodas y full days. Socios del proyecto: Carlos (propietario) y André.

Segmentos:
1. Bodas y celebraciones sociales (matrimonios, quinceañeros, aniversarios).
2. Empresas: full day, team building, offsites, activaciones, cierres de año.
3. Familias y grupos: full day con piscina, cumpleaños, reuniones.

Canales:
- (a) Wedding/event planners, con comisión del 5%.
- (b) Venta directa con pauta digital, de mayor margen mientras el costo de adquisición sea menor que la comisión.
- (c) Referidos y orgánico.

Activos: piscina, jardín, terraza, zona de parrilla [COMPLETAR lista real de espacios, dormitorios, baños, estacionamiento].

==================================================================
## 3. Parámetros (todos editables en Configuración; nada hardcodeado)
==================================================================
- Fecha de reapertura: [COMPLETAR] — supuesto: 60 días desde hoy.
- Aforo máximo: [COMPLETAR] — supuesto: cóctel 150 / banquete sentado 100 / full day 60.
- Franjas: Full day 09:00–18:00; Evento noche 19:00–03:00; pernocte opcional. Supuesto: máximo 1 reserva por día (configurable a franjas).
- Tarifas: [COMPLETAR] — matriz tipo de evento × tipo de día (L–J / V / S / D y feriado) × temporada (alta dic–mar) × tramo de aforo. Rangos propuestos con el benchmark; los precios finales los valido yo.
- Comisión del planner: 5% sobre el alquiler del espacio sin IGV; excluye garantía y servicios de terceros [CONFIRMAR].
- Separación: 50% de adelanto; saldo 15 días antes del evento; garantía reembolsable por daños [CONFIRMAR monto].
- Hold del planner: 72 h; máximo 2 activos por planner.
- Protección de lead del planner: 90 días.
- Pago de comisión: 7 días después del evento realizado y cobrado al 100% [CONFIRMAR].
- Bloqueos por uso propio de Carlos y mantenimiento: [COMPLETAR].
- Pauta mensual: supuesto S/ 1,500.
- Quién factura (razón social, régimen): [COMPLETAR].
- Dominio, WhatsApp comercial y correo: [COMPLETAR].
- Identidad visual: si hay logo en /assets, construye el sistema visual desde ahí. Si no hay, PREGUNTA antes de diseñar marca (no inventes logo); mientras tanto, UI neutra con design tokens centralizados.
- Fotos en /assets/fotos; si faltan, placeholders marcados.

==================================================================
## 4. Objetivo y métricas
==================================================================
- Métrica norte: tasa de ocupación = días vendidos (Separada, Confirmada, Realizada o Liquidada) / días disponibles (calendario menos bloqueos).
  - Siempre separada en fin de semana y feriados (V-S-D) vs. entre semana (L-J).
  - Se muestra mensual, acumulada del año y como ocupación comprometida a 90 días.
- Indicador de control: ingreso neto por día disponible = (ingreso sin IGV − comisión − costos directos) / días disponibles. Evita que la ocupación suba a punta de descuentos.
- Métricas de apoyo: leads por canal y campaña, conversión por etapa, CAC por evento directo, ROAS, ticket promedio, mezcla de canales, tiempo de primera respuesta, holds vencidos, cancelaciones, motivos de pérdida, NPS.
- Regla de canal:
  - el canal directo es más rentable solo mientras el CAC por evento cerrado sea menor al 5% del ticket;
  - el dashboard muestra ese punto de equilibrio por mes y alerta cuando la pauta cuesta más que la comisión.
- Metas por defecto [CONFIRMAR]: ocupación de fin de semana 50% en el mes 3 y 70% en el mes 6; entre semana 15% en el mes 6.

==================================================================
## 5. Reglas de negocio (no negociables)
==================================================================
5.1 Estados de fecha
- Flujo: Libre → Pre-reserva (vence sola) → Separada (adelanto confirmado) → Confirmada (contrato firmado y saldo pagado) → Realizada → Liquidada (garantía devuelta y comisión pagada).
- Estados especiales:
  - Bloqueada: mantenimiento o uso propio, con motivo.
  - Cancelada: libera la fecha y aplica la política.
- Una fecha o franja admite una sola reserva activa, garantizado en la BD (exclusion constraint o índice único parcial más transacción), no solo en la UI.
- Toda transición queda en audit_log (quién, cuándo, antes → después).

5.2 Planners
- Alta solo por invitación del admin.
- Aceptan el contrato marco digitalmente en su primer login (versión y fecha registradas).
- Ven solo disponibilidad: libre / pre-reservado / ocupado.
- Pueden:
  - crear holds;
  - registrar a su cliente (nombre, teléfono, correo, RUC opcional, tipo de evento, fecha, aforo);
  - descargar la ficha técnica y el tarifario de planner;
  - ver sus reservas y comisiones.
- La comisión se devenga con el evento realizado y cobrado al 100%.
- Atribución: si un cliente registrado por un planner entra directo dentro de los 90 días (match por teléfono, correo o RUC), el sistema alerta el duplicado y respeta al planner.

5.3 Canal directo y pauta
- Todo lead guarda UTM (source, medium, campaign, content, term) y gclid/fbclid, desde la landing hasta la reserva.
- Landings por segmento.
- Primera respuesta en menos de 15 min en horario comercial, con alerta si se incumple.

5.4 Reservas y pagos
- Cotización versionada.
- Contrato en PDF generado desde la reserva.
- MVP con pago manual (transferencia, Yape o Plin, con voucher) y validación por el admin.
- Política de cancelación [CONFIRMAR — supuesto]:
  - más de 60 días antes: devolución del 50% del adelanto;
  - menos de 60 días: sin devolución;
  - una reprogramación sin costo con 30 días de anticipación.
- Descuentos con tope configurable; por encima del tope requieren aprobación del admin.

5.5 Costos
- Directos por evento: limpieza, personal de apoyo y seguridad, energía, agua y mantenimiento de piscina, reposiciones (estándar vs. real).
- Fijos mensuales: guardianía, jardinería, piscina, servicios, seguros.
- CAPEX de la remodelación registrado aparte.

5.6 Reglamento de uso: horario límite, música y ruido, aforo, piscina y seguridad, proveedores externos permitidos, limpieza, daños y garantía.

==================================================================
## 6. Alcance funcional
==================================================================
6.1 Web pública (mobile-first, SEO local, rápida)
- Home: propuesta de valor, espacios, galería, segmentos (Bodas / Corporativo / Full day familiar), FAQ, mapa, testimonios (placeholder).
- Landings por segmento, con copy y llamado a la acción propios.
- Consulta pública de disponibilidad por fecha (solo disponible / no disponible).
- Cotizador rápido: tipo de evento, fecha y aforo → rango estimado y llamado a la acción.
- Formulario de lead con antispam (honeypot y Cloudflare Turnstile).
- Botón de WhatsApp con mensaje prellenado (fecha, tipo de evento, código de campaña).
- Página "Planners": beneficios, comisión y solicitud de alta.
- SEO:
  - metadata y Open Graph por página;
  - sitemap.xml y robots.txt;
  - datos estructurados schema.org (EventVenue / LocalBusiness).
- Tracking: Meta Pixel, GA4 y conversión de Google Ads, con eventos lead_submit, whatsapp_click, availability_check y quote_view.
- Aviso de privacidad y consentimiento (Ley 29733).

6.2 Portal de planners (login)
- Calendario de disponibilidad.
- Holds con cuenta regresiva.
- Registro de clientes.
- Mis reservas y mis comisiones.
- Descargas: ficha técnica, fotos y tarifario de planner.

6.3 Back-office (roles admin y operaciones)
- Calendario maestro (mes / semana / lista), colores por estado y canal, bloqueos en un clic.
- CRM kanban: Nuevo → Contactado → Visita agendada → Cotizado → Pre-reserva → Separado → Contratado → Realizado → Liquidado / Perdido (motivo obligatorio). Actividades y próximos pasos con fecha.
- Fichas de cliente, planner y reserva; pagos y garantías; cotización y contrato en PDF.
- Tarifario y Configuración: todos los parámetros de la sección 3.
- Comisiones: cálculo automático, estados (devengada / por pagar / pagada), reporte y export por planner.
- Operación:
  - checklist D-7 y D-1;
  - acta de entrega y recepción del local con fotos;
  - incidencias y daños con cargo a la garantía;
  - encuesta NPS post-evento.
- Costos directos por evento, costos fijos mensuales y CAPEX.
- Campañas: inversión mensual por campaña (carga manual o import CSV de Meta y Google) para CAC y ROAS.
- Import CSV de los eventos históricos ya realizados (bodas, full days), para tener historia real desde el día 1.
- Exports a CSV y Excel de reservas, leads, pagos y comisiones.

6.4 Dashboard gerencial
- Ocupación: fin de semana vs. entre semana, mensual, del año y comprometida a 90 días.
- Ingreso neto por día disponible.
- Embudo por canal y CAC vs. 5% del ticket.
- Mezcla de canales, ticket promedio y margen por evento.
- Pipeline en S/ por etapa.
- Comisiones por pagar, top motivos de pérdida y NPS.
- Filtros por mes, segmento y canal. Metas visibles con semáforo.

6.5 Automatizaciones (Supabase cron o edge functions)
- Vencimiento de holds.
- Recordatorios de saldo.
- Avisos D-7 y D-1 al cliente y a operaciones.
- Alerta de lead sin respuesta.
- Resumen semanal por correo a los socios: ocupación a 90 días, pipeline, leads, CAC, alertas.
- Feed iCal del calendario maestro para el Google Calendar de los socios.
- Plantillas de correo y de WhatsApp (texto) versionadas en el repo.

==================================================================
## 7. Stack (justifica si propones otro)
==================================================================
- Aplicación: Next.js (App Router, Server Actions) + TypeScript estricto + Tailwind + shadcn/ui + Zod.
- Supabase: Postgres, Auth (magic link y contraseña), RLS por rol, Storage (fotos, vouchers, contratos), cron y edge functions.
- FullCalendar · Resend (correos) · react-pdf (cotizaciones y contratos).
- Vercel (preview y producción) · GitHub Actions (CI).
- Vitest (motor de precios, comisiones, estados, KPIs) · Playwright (flujos E2E y capturas).
- Fase 2: pagos online (Mercado Pago o Culqi), WhatsApp Business API, firma electrónica.
- Costo de infraestructura en el arranque: menos de USD 30 al mes (free tiers). Documenta los costos reales.

==================================================================
## 8. Modelo de datos mínimo
==================================================================
profiles (role: admin | ops | planner), planners, planner_agreements, clients, leads (utm_*, gclid, fbclid, channel: planner | direct | referral | organic), spaces, rate_cards, holidays, settings, quotes (versionadas), bookings (date, slot, status, channel, planner_id, montos con y sin IGV), holds (expires_at), payments, guarantees, commissions, blocks, event_costs, fixed_costs, capex_items, campaigns, campaign_spend, checklists, incidents, nps_responses, activities, documents, audit_log.

==================================================================
## 9. Lógica de dominio (en /lib/domain, pura y testeada)
==================================================================
- pricing:
  - calcula la tarifa según tipo de evento, día, temporada, feriado y aforo;
  - aplica descuentos y su tope;
  - devuelve montos con y sin IGV.
- booking state machine: transiciones válidas, efectos de cada una (liberar fecha, devengar comisión, devolver garantía).
- commission: 5% sobre la base definida, solo cuando el evento está realizado y cobrado.
- attribution: match de duplicados y vigencia de 90 días.
- kpis:
  - fórmulas exactas de ocupación (con denominador sin bloqueos), ingreso neto por día disponible, CAC, ROAS;
  - punto de equilibrio entre pauta y planner.
- Cobertura de tests de /lib/domain: 90% o más.

==================================================================
## 10. Seguridad y control
==================================================================
- RLS probada con tests: un planner nunca ve datos de otro planner ni de clientes directos, ni por UI ni por API.
- Solo el admin cambia tarifas y parámetros, aprueba descuentos, valida pagos y marca comisiones como pagadas.
- Audit log de estados y montos. Backups automáticos.
- Validación con Zod en todo input. Rate limiting en formularios públicos.
- Manejo de errores amigable en la UI y logs del lado del servidor.

==================================================================
## 11. Entregables de negocio en /docs
==================================================================
1. Modelo operativo: propuesta de valor por segmento, journey del cliente, flujo comercial de punta a punta y SLA.
2. Roles y RACI: André, Carlos, encargado de operaciones, planners y proveedores.
3. Políticas: reserva y pagos, cancelación, garantía, reglamento de uso, piscina y seguridad.
4. Programa de planners: contrato marco (borrador para revisión legal), reglas de atribución, kit de venta y guion de onboarding.
5. Plan de pauta a 90 días:
   - segmentos, mensajes y creatividades sugeridas;
   - canales: Meta/IG, Google Search, TikTok, Google Business Profile y directorios de bodas de Lima (verifica vigencia);
   - presupuesto, estacionalidad, KPIs y reglas de corte de campañas.
6. Tarifario propuesto con benchmark de competidores en Pachacámac, Cieneguilla y Lurín: precio, aforo, qué incluye cada uno y fuente.
7. Checklist legal y regulatorio por validar:
   - licencia de funcionamiento (Municipalidad de Pachacámac), ITSE y aforo;
   - ruido; piscina (normativa sanitaria);
   - seguro de responsabilidad civil; facturación.
   Todo marcado "por validar con abogado o contador"; nada se da por cumplido.
8. Plan de lanzamiento 30-60-90 con hitos, dueños y fechas.
9. Modelo económico en Excel "YYMMDD Modelo economico Oasis.xlsx" (openpyxl):
   - hoja Parámetros con los supuestos en celdas amarillas; fórmulas vivas en todo el modelo;
   - CAPEX separado del OPEX;
   - unit economics por evento y por canal;
   - punto de equilibrio en eventos por mes y en ocupación; payback del CAPEX;
   - sensibilidad: ocupación de 20% a 80% contra ticket ±20%;
   - punto de equilibrio entre pauta y planner.
10. Manual de uso de una página por rol (admin, operaciones, planner).
11. Guía de puesta en producción: Supabase, Vercel, dominio y DNS, Resend, Pixel, GA4, Google Ads, Turnstile.

==================================================================
## 12. Seed y datos
==================================================================
- Seed de demo: 3 planners, 20 leads, 10 reservas en distintos estados, 2 campañas con inversión, bloqueos, feriados 2026–2027 y tarifario de ejemplo.
- `scripts/reset-demo` borra todo el demo antes de producción.
- Usuarios iniciales: admin (André, Carlos) y ops, creados por script con correos de .env.

==================================================================
## 13. Criterios de aceptación (Definition of Done)
==================================================================
- Doble reserva concurrente de la misma fecha: solo una prospera (test).
- El hold vence a las 72 h y la fecha vuelve a Libre sola.
- El planner A no accede por ninguna vía a los datos del planner B ni de clientes directos (test RLS).
- Un lead con UTM conserva su campaña hasta la reserva y aparece en el CAC del dashboard.
- La comisión del 5% se calcula sola al marcar el evento realizado y cobrado.
- La ocupación del dashboard cuadra con el conteo manual de un mes del seed.
- Cotización y contrato en PDF se generan con los datos correctos, con y sin IGV.
- Lighthouse móvil de 90 o más y accesibilidad de 90 o más en la web pública.
- CI en verde en main. Deploy en Vercel funcionando.
- README, .env.example y CLAUDE.md completos.

==================================================================
## 14. Secuencia de ejecución
==================================================================
Paso 1 — Plan, sin código. (Entregado el 18/10/2026; ver sección 15.)

Paso 2 — Construcción. Una rama por fase. Orden aprobado en la sección 15.2.
Al cerrar cada fase: tests en verde, capturas, merge a main y nota en CHANGELOG.md.

Paso 3 — Entrega:
- checklist de la sección 13 marcado;
- URL de producción o preview;
- lista de lo que queda de mi lado (datos reales, legal, dominio, cuentas, fotos);
- backlog de fase 2 priorizado por impacto en ocupación.

==================================================================
## 15. Decisiones tomadas (18/10/2026) — prevalecen sobre lo anterior
==================================================================
15.1 Respuestas de André al Paso 1
- Arquitectura: alternativa A (Next.js + Supabase + Vercel).
- Infraestructura: arrancar en free tiers y pagar cuando haga falta. Supabase Free con backup diario por GitHub Actions (pg_dump). Vercel Hobby mientras sea desarrollo/preview; pasar a Vercel Pro (USD 20/mes) antes de recibir tráfico comercial (sus términos no permiten uso comercial en Hobby).
- Facturación: SAWA – Gestión Comercial S.A.C. (RUC 20…) factura. IGV 18% afecto. La relación SAWA ↔ Carlos (propietario) y la actividad en la ficha RUC van al checklist legal "por validar con contador".
- Orden de fases: el que propone Claude (dos olas, sección 15.2).
- Cuentas: Claude crea y configura todo; André solo entrega logins/tokens cuando se le pidan.
- Identidad visual: no hay logo. Claude propone dirección de marca y logo para validación de André antes de aplicarlos; mientras tanto, tokens neutros.
- Histórico: no hay datos de eventos pasados. El import CSV se mantiene, sin data inicial. El benchmark ancla los precios.
- Bloqueos: no habrá uso propio de Carlos (en verano usan su casa de playa). Solo bloqueos de mantenimiento.
- Encargado de operaciones: Claude, con criterio de éxito = ocupación. Se requiere igualmente una persona física en sitio (guardián/encargado de local) para entregas, actas y emergencias.

15.2 Orden de fases (dos olas)
Ola 1 (vendible antes de temporada alta):
1. chore/repo-base · 2. feat/db-auth · 3. feat/domain · 4. feat/calendario · 5. feat/web-publica · 6. feat/portal-planners
Ola 2 (gestión completa):
7. feat/backoffice · 8. feat/comisiones-costos · 9. feat/dashboard · 10. feat/automatizaciones · 11. feat/agentes · 12. docs/negocio (investigación en paralelo desde el día 1) · 13. test/e2e-pulido · 14. chore/deploy-prod

15.3 Nuevo alcance: agentes autónomos ("ejército de agentes")
- André pide un equipo de agentes que opere el negocio con el menor involucramiento humano posible, con la ocupación como criterio de éxito.
- Diseño propuesto en docs/agentes.md, pendiente de validación de André (dinero: costo de API y WhatsApp).
- Guardarraíles no negociables: ningún agente valida pagos, aprueba descuentos sobre el tope, cambia tarifas, firma contratos ni marca comisiones como pagadas; eso sigue siendo del admin. Toda acción de agente queda en audit_log con actor = agente.

15.4 Agregados propuestos por Claude
- Libro de Reclamaciones virtual en la web pública (Código de Protección y Defensa del Consumidor).
- Inscripción del banco de datos personales ante la ANPD en el checklist legal (Ley 29733).
