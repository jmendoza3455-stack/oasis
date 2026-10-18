# Equipo de agentes de Oasis Pachacámac — diseño

Objetivo: operar el negocio con mínimo involucramiento humano. **Criterio de éxito: ocupación** (OASIS.md §4).
Estado: implementado en la fase `feat/agentes` (18/10/2026). Detalle operativo y playbooks en [agents/](../agents/README.md). Ajustes respecto de la propuesta original: el Recepcionista **no** crea pre-reservas (S35) y los agentes por cadencia **solo proponen**: sus mensajes van como borrador a `/admin/agentes` y una persona los envía; el aviso de saldo sale `balance_notice_days` antes del vencimiento (S32), no D-15.

## Principios

1. **Los humanos deciden el dinero y lo legal.** Ningún agente valida pagos, aprueba descuentos sobre el tope, cambia tarifas, firma contratos ni marca comisiones como pagadas.
2. **Todo queda en `audit_log`** con `actor_type = agent` y el nombre del agente.
3. **Los agentes usan la misma API de dominio que la UI** (máquina de estados, pricing, attribution). No escriben SQL libre ni saltan RLS.
4. **Bandeja de aprobación**: lo sensible queda como "propuesta" para que André o Carlos la aprueben en un clic (web o correo).
5. **Tope de gasto mensual** configurable para la API y corte automático al alcanzarlo.

## Dos tipos de agente

| Tipo               | Dónde corre                                              | Para qué                                   | Costo                                     |
| ------------------ | -------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| **En tiempo real** | Dentro de la app (Claude API + herramientas del dominio) | Responder a clientes en segundos           | Por uso (API de Anthropic)                |
| **Por cadencia**   | Tareas programadas de Claude Code sobre el repo y la BD  | Análisis, seguimiento, reportes, contenido | Incluido en el plan de Claude del usuario |

## Plantilla

| #   | Agente                     | Tipo                                                         | Qué hace                                                                                                                                                 | Puede ejecutar solo                                                                                                  | Requiere aprobación                                          | KPI                                            |
| --- | -------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| 1   | **Recepcionista**          | Tiempo real (chat web, correo; WhatsApp si se activa la API) | Responde leads 24/7 en <1 min, califica (tipo de evento, fecha, aforo, presupuesto), consulta disponibilidad, da el rango del cotizador y agenda visitas | Responder, consultar disponibilidad y precio, registrar lead, pedir visita (la pre-reserva la crea una persona, S35) | Precio fuera de rango, descuentos, excepciones al reglamento | Tiempo de 1ª respuesta, lead → visita          |
| 2   | **Closer**                 | Diario 09:00                                                 | Revisa el pipeline: cotizaciones sin respuesta, pre-reservas por vencer, visitas sin seguimiento. Redacta y envía seguimientos                           | Redactar seguimientos (borradores en `/admin/agentes`)                                                               | Ofertas especiales                                           | Cotizado → separado                            |
| 3   | **Revenue manager**        | Semanal (lunes)                                              | Mira fechas libres a 15–60 días y propone promos dentro del tope (p. ej. L-J corporativo); vigila el ingreso neto por día disponible                     | —                                                                                                                    | Toda promo o cambio de precio                                | Ocupación L-J, ingreso neto por día disponible |
| 4   | **Growth / pauta**         | Semanal                                                      | Lee inversión y leads por campaña; calcula CAC vs 5% del ticket; propone cortes y redistribución; genera copys y briefs de creatividades                 | Reportar y alertar                                                                                                   | Cambios de presupuesto                                       | CAC, ROAS, CPL                                 |
| 5   | **Planners**               | Semanal                                                      | Prospecta planners (directorios públicos), redacta outreach, hace onboarding y recuerda holds y comisiones                                               | Redactar recordatorios a planners activos                                                                            | Primer contacto con planners nuevos (al inicio)              | Planners activos, eventos por planner          |
| 6   | **Operaciones**            | Diario                                                       | Checklists D-7/D-1, recordatorio de saldo D-15, coordinación con el encargado en sitio, encuesta NPS post-evento                                         | Enviar recordatorios y NPS                                                                                           | Cargos a la garantía                                         | Incidencias, NPS                               |
| 7   | **Controller**             | Semanal (viernes)                                            | Concilia vouchers contra pagos pendientes (sugiere el match), comisiones por pagar, costos vs estándar, resumen semanal a socios                         | Preparar y enviar el resumen                                                                                         | Validar pagos, pagar comisiones                              | Cobranza a tiempo, margen por evento           |
| 8   | **Contenido y reputación** | Semanal                                                      | Posts para IG y Google Business Profile, respuestas a reseñas, SEO local                                                                                 | — (al inicio)                                                                                                        | Publicar                                                     | Reseñas, tráfico orgánico                      |

## Lo que NO puede hacer un agente

- Abrir el portón, entregar el local, revisar daños: hace falta **una persona en sitio** (guardián/encargado).
- Firmar ante la municipalidad, la SUNAT o un banco.
- Emitir facturas (la emite SAWA; se integra en fase 2 si conviene).

## Decisiones pendientes de André

1. Activar el Recepcionista con la API de Anthropic (costo por uso, con tope mensual).
2. Adelantar la **WhatsApp Business Cloud API** de la fase 2 a la Ola 2: es el canal principal en Perú. Requiere verificar el negocio en Meta con los datos de SAWA y un número dedicado.
3. Quién es la persona en sitio.
