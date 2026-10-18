# Plan de lanzamiento 30-60-90 — Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 18/10/2026
- **Estado:** Borrador para validación de André y Carlos
- **Relacionados:** [Checklist legal](<261018 Checklist legal.md>) · [Guía de puesta en producción](<261018 Guia de puesta en produccion.md>) · [Supuestos](supuestos.md) · [Canales y planners](<research/261018 Canales y planners.md>) · [Benchmark](<research/261018 Benchmark de competidores.md>) · [Agentes](agentes.md) · [OASIS.md](../OASIS.md)

## 1. Criterio de éxito: ocupación

- **Métrica norte:** ocupación = días vendidos (Separada, Confirmada, Realizada o Liquidada) / días disponibles, separada en **V-S-D + feriados** y **L-J** (OASIS.md §4).
- **Metas (S10, por confirmar):** fin de semana 50% en el mes 3 y 70% en el mes 6; entre semana 15% en el mes 6.
- **Cómo las aplica el dashboard:** el mes de reapertura (diciembre 2026) cuenta como mes 1. Meta V-S-D: 50% de diciembre a febrero 2027, 70% de marzo a mayo. Meta L-J escalonada desde S10: 2.5% en diciembre, 5% en enero, 7.5% en febrero.
- **Indicador de control:** ingreso neto por día disponible (que la ocupación no suba a punta de descuentos).
- **Indicadores adelantados:** ocupación comprometida a 90 días, leads por canal, primera respuesta < 15 min en horario comercial (S11), cotizado → separado, planners activos, CAC del canal directo vs. 5% del ticket.

## 2. Horizonte

| Hito | Fecha          | Qué marca                                                           |
| ---- | -------------- | ------------------------------------------------------------------- |
| D0   | 18/10/2026     | Sistema construido; producción protegida con login de Vercel        |
| D30  | 17/11/2026     | Base legal en revisión, cuentas listas, oferta validada             |
| D60  | **17/12/2026** | **Reapertura** (S01) e inicio de la pauta                           |
| D90  | 16/01/2027     | Primer corte de temporada alta (revisión el lunes 18/01/2027)       |
| —    | 16/03/2027     | Fin de los primeros 90 días con pauta y de la temporada de full day |

> Contexto de demanda (investigación de canales): al reabrir en diciembre, la temporada corporativa de fin de año ya está casi toda reservada. El negocio inmediato es **full day familiar y corporativo de verano (enero–marzo)**; las bodas captadas ahora se celebran meses después.

## 3. Dueños

| Dueño                              | Rol en el lanzamiento                                                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **André**                          | Decisiones de dinero y cuentas, asesoría legal y contable, aprobación de tarifario, descuentos sobre el tope, validación de pagos y comisiones.                                        |
| **Carlos**                         | Local: fin de la remodelación, documentos de licencias, fotos reales, proveedores, contratación del encargado en sitio.                                                                |
| **Encargado en sitio [COMPLETAR]** | Visitas, entregas y recepciones con acta, checklists D-7 y D-1, registro de piscina, emergencias.                                                                                      |
| **Claude / agentes**               | Configuración técnica, contenido, prospección y borradores, reportes y propuestas. **Nunca** valida pagos, cambia tarifas, aprueba descuentos sobre el tope, firma ni paga comisiones. |
| Abogado / Contador [COMPLETAR]     | Validan el [checklist legal](<261018 Checklist legal.md>).                                                                                                                             |

## 4. Decisiones pendientes con fecha límite

Las fechas son propuestas; si una se mueve, se mueve lo que depende de ella.

| #   | Decisión                                        | Recomendación                                                                                                                                                                         | Dueño                           | Fecha límite                     | Si se atrasa                                                             |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| 1   | Designar abogado y contador                     | Uno de cada uno con experiencia en locales de eventos y SUNAT                                                                                                                         | André                           | 23/10/2026                       | Todo el checklist legal se corre                                         |
| 2   | Correos de los admins (André, Carlos) y de ops  | Correos personales o corporativos que usarán a diario                                                                                                                                 | André                           | 23/10/2026                       | No hay usuarios reales en producción                                     |
| 3   | **Vercel Pro** (USD 20/mes) o bajar a Hobby     | **Mantener Pro**: Hobby no permite uso comercial y solo admite crons diarios (S25, S30)                                                                                               | André                           | **30/10/2026** (antes del 01/11) | Cobro automático o crons de SLA sin correr                               |
| 4   | Dominio                                         | Elegir y comprar a nombre de SAWA [COMPLETAR]                                                                                                                                         | André                           | 30/10/2026                       | Bloquea Resend, Turnstile, píxeles, Google Business Profile y el go-live |
| 5   | Número de WhatsApp comercial                    | Número dedicado (sirve hoy para el botón y luego para la Cloud API)                                                                                                                   | André · Carlos                  | 30/10/2026                       | La web sale sin botón de WhatsApp                                        |
| 6   | Validar tarifario y supuestos críticos          | Precios del benchmark (S19), **¿con o sin IGV?** (S24), garantía (S06), cancelación (S07), tope de descuento (S08), metas (S10), aforo según ITSE (S02), franja noche vs. ruido (S03) | André · Carlos                  | 06/11/2026                       | No se puede salir a vender ni invitar planners                           |
| 7   | Resend: cuenta, dominio de envío y `EMAIL_FROM` | Remitente tipo `reservas@<dominio>` con la marca nueva                                                                                                                                | André (Claude configura)        | 13/11/2026                       | Los avisos quedan "no enviados" en el outbox                             |
| 8   | Cloudflare Turnstile                            | Activarlo con el dominio final                                                                                                                                                        | Claude                          | 13/11/2026                       | Formulario público solo con honeypot y rate limiting                     |
| 9   | Encargado en sitio                              | Persona, horario y contrato (aspecto laboral por validar)                                                                                                                             | Carlos                          | 13/11/2026                       | Nadie para visitas, entregas ni emergencias                              |
| 10  | Recepcionista con IA (Anthropic)                | Activarla con tope mensual (S34: USD 30, por validar) y modelo elegido                                                                                                                | André                           | 13/11/2026                       | El chat de la web no aparece; leads solo por formulario y WhatsApp       |
| 11  | WhatsApp Business Cloud API                     | Iniciar la verificación del negocio en Meta con datos de SAWA; implementación en Ola 2 (plazos de Meta: por verificar)                                                                | André                           | Inicio 13/11/2026                | WhatsApp sigue manual con enlaces wa.me (S31)                            |
| 12  | GA4, Meta Pixel y Google Ads                    | Cuentas a nombre de SAWA; activar solo después de validar banner y aviso de privacidad                                                                                                | André (Claude configura)        | 27/11/2026                       | La pauta del 17/12 arranca sin medición de conversiones                  |
| 13  | Fotos reales                                    | Sesión de fotos al terminar la remodelación (fecha según obra [COMPLETAR])                                                                                                            | Carlos                          | 27/11/2026                       | Web, Google Business Profile y pauta con placeholders                    |
| 14  | reset-demo y quitar la protección SSO de Vercel | Ejecutar en ese orden el día del go-live, con el checklist de la guía                                                                                                                 | André aprueba · Claude ejecuta  | 20/11 y 23/11/2026               | Datos de demo visibles o web cerrada al público                          |
| 15  | Programar los agentes por cadencia              | Programarlos cuando haya datos reales (S36)                                                                                                                                           | André aprueba · Claude programa | 01/12/2026                       | Sin seguimiento diario del pipeline ni reportes semanales                |
| 16  | Costo de infraestructura                        | OASIS.md §7 pide menos de USD 30/mes; Vercel Pro (20) + tope de IA (30) lo superan. Aceptar o ajustar el tope                                                                         | André                           | 30/10/2026                       | —                                                                        |

## 5. Días 0–30 (18/10 → 17/11/2026): base legal, cuentas y oferta

| Hito                                                                                            | Dueño                       | Fecha      |
| ----------------------------------------------------------------------------------------------- | --------------------------- | ---------- |
| Reunir documentos del local (lista en el checklist legal, §5) y abrir el expediente             | Carlos · Claude             | 23/10/2026 |
| Crear o verificar Google Business Profile (puede tardar hasta un mes en aparecer)               | André · Claude              | 23/10/2026 |
| Crear usuarios reales (`pnpm users:create`) y probar el ingreso                                 | Claude · André · Carlos     | 27/10/2026 |
| Decisiones 3, 4, 5 y 16 (Vercel Pro, dominio, WhatsApp, costo)                                  | André                       | 30/10/2026 |
| Conectar dominio y DNS en Vercel (aún con protección)                                           | Claude                      | 04/11/2026 |
| Tarifario y supuestos críticos validados y cargados en Configuración (marca "validado")         | André · Carlos              | 06/11/2026 |
| Revisión legal de los ítems P1 en curso; contratos de cliente y planner en manos del abogado    | Abogado · André             | 13/11/2026 |
| Resend y Turnstile configurados; Recepcionista decidida                                         | Claude · André              | 13/11/2026 |
| Fichas en directorios gratuitos (investigación de canales §7, fase 0)                           | Claude (borradores) · André | 13/11/2026 |
| Contacto a los 13 planners de Prioridad A (primer contacto aprobado por André, docs/agentes.md) | Claude · André              | 17/11/2026 |
| Encargado en sitio definido                                                                     | Carlos                      | 13/11/2026 |

**Criterio D30:** documentos P1 recibidos y en revisión; tarifario validado; dominio conectado; Resend y Turnstile listos; planners Prioridad A contactados. Ninguna cifra de ocupación todavía.

## 6. Días 31–60 (18/11 → 17/12/2026): go-live y preventa

| Hito                                                                                                         | Dueño                              | Fecha                                        |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------- |
| Simulacro de restauración del backup (guía §1.9)                                                             | Claude                             | 19/11/2026                                   |
| Backup manual y `reset-demo` en producción; tarifario validado vuelto a revisar                              | Claude (André aprueba)             | 20/11/2026                                   |
| **Go-live de la web**: checklist completo de la guía, protección SSO desactivada solo en producción          | Claude · André                     | **23/11/2026**                               |
| Planners invitados al portal (solo con el contrato marco validado por el abogado)                            | André · Claude                     | Desde 23/11/2026                             |
| Primeras visitas al local agendadas desde la web, el chat y WhatsApp                                         | Encargado en sitio                 | Desde 23/11/2026                             |
| Fotos reales en la web y en Google Business Profile                                                          | Carlos · Claude                    | 27/11/2026                                   |
| GA4, Pixel y conversión de Ads verificados (después del OK legal del banner)                                 | Claude                             | 27/11/2026                                   |
| Agentes por cadencia programados (Closer, Revenue, Growth, Planners, Controller, Contenido)                  | Claude                             | 01/12/2026                                   |
| Open house o fam trip para planners (investigación de canales §7)                                            | Carlos · André                     | Semana del 07/12/2026 [CONFIRMAR según obra] |
| Seguro RC vigente, situación de la piscina y licencias de música resueltas o con riesgo aceptado por escrito | André                              | 11/12/2026                                   |
| Simulacro de evento: visita, acta de entrega, checklists, registro de piscina, acta de recepción             | Encargado en sitio · Claude        | 10/12/2026                                   |
| Campañas de pauta listas para encender (S/ 1,500/mes, S09)                                                   | Claude (propone) · André (aprueba) | 15/12/2026                                   |
| Publicación "Reapertura 17/12" en Google Business Profile                                                    | Claude                             | 10/12/2026                                   |
| **Reapertura**                                                                                               | Todos                              | **17/12/2026**                               |

**Criterio D60:** web en producción sin login, sin datos de demo y con los crons corriendo; leads entrando con UTM; primera respuesta dentro del SLA; ítems P1 del checklist validados o con riesgo aceptado por escrito por André; primeras fechas de diciembre a febrero separadas (medido en el dashboard).

## 7. Días 61–90 (18/12/2026 → 16/01/2027): temporada alta y ajuste

| Hito                                                                                                                                                                           | Dueño                        | Fecha            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ---------------- |
| Pauta encendida con la mezcla propuesta (Meta Click-to-WhatsApp, Google Search, prueba de bodas)                                                                               | André aprueba · Claude opera | 17/12/2026       |
| Resumen semanal a socios (lunes) y revisión de 30 min con decisiones                                                                                                           | André · Carlos · Claude      | Cada lunes       |
| Revenue: propuestas de promo L-J dentro del tope para fechas libres a 15–60 días                                                                                               | Agente Revenue · André       | Cada lunes       |
| Primeros eventos: actas con fotos, NPS y pedido de reseñas (sin incentivos, regla de Google)                                                                                   | Encargado en sitio · Claude  | Desde 17/12/2026 |
| Día 21 de pauta: costo real por conversación y por lead; mover presupuesto entre Meta y Google                                                                                 | Claude propone · André       | 07/01/2027       |
| Ítems P3 del checklist (oficial de datos, contrato de administración de terceros)                                                                                              | Abogado · André              | En curso         |
| **Corte D90**: ocupación de diciembre (mes 1) y enero (mes 2) frente a la meta; ocupación comprometida de febrero (mes 3) y marzo; CAC vs. 5% del ticket; decisiones de ajuste | André · Carlos · Claude      | 18/01/2027       |

**Criterio D90:** semáforo del dashboard en verde o ámbar para V-S-D de diciembre y enero, y ocupación comprometida de febrero en camino al 50% (S10). Si está en rojo: revisar precio, mezcla de canales y velocidad de respuesta antes de subir la pauta.

**Después del D90 (investigación de canales §7):** día 45 de pauta (31/01/2027) evaluar planners activos y si se ajusta el 5%; día 75 (02/03/2027) empezar a mover pauta hacia bodas y corporativo de mayo a agosto.

## 8. Riesgos principales

| Riesgo                                                               | Mitigación                                                                     | Dueño           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------- |
| Licencia o zonificación no cubren el giro real o a SAWA como titular | Revisar las copias antes del 13/11; no cobrar adelantos sin ese OK             | André · Abogado |
| Ruido: la franja noche hasta las 03:00 (S03) podría no ser viable    | Confirmar el horario con la MDP; ajustar `settings` y contratos                | Abogado · André |
| Piscina sin norma clara de salvavidas                                | Salvavidas certificado en todo uso mientras se valida (recomendación prudente) | Carlos          |
| Remodelación o fotos se atrasan                                      | Go-live con placeholders marcados; fotos en cuanto existan                     | Carlos          |
| Vercel Pro no confirmado antes del 01/11                             | Decisión 3 con fecha fija                                                      | André           |
| Datos de demo en producción                                          | `reset-demo` en el checklist de go-live                                        | Claude          |
| Pocas fechas libres de fin de año ya vendibles                       | Foco en full day de verano y bodas 2027                                        | Claude · André  |
