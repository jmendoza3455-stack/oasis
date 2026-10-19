# Roles y RACI · Oasis Pachacámac

- **Fecha:** 18/10/2026
- **Estado:** Borrador para validación de André y Carlos
- **Relacionados:** [Modelo operativo](261018%20Modelo%20operativo.md) · [Políticas](261018%20Politicas.md) · [Manual por rol](261018%20Manual%20por%20rol.md) · [Equipo de agentes](agentes.md) · [Supuestos](supuestos.md)

## 1. Regla de oro

**Solo el admin** cambia tarifas y parámetros, aprueba descuentos sobre el tope (`discount_cap_pct`), valida pagos y paga comisiones. **Ningún agente automático lo hace**, ni firma contratos (CLAUDE.md regla 6, OASIS.md §15.3). El sistema lo garantiza con permisos en la BD (RLS y triggers), no solo en la pantalla.

## 2. Roles

| Rol                                                                    | Quién                                                    | Rol en el sistema            | Responsabilidad principal                                                                                                          | No puede                                                                                                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin comercial**                                                    | André                                                    | `admin`                      | Venta, precios, pauta, planners, validación de pagos, comisiones, decisiones sobre propuestas de agentes                           | —                                                                                                                                                                    |
| **Admin / socio**                                                      | Carlos                                                   | `admin`                      | Activo físico (mantenimiento, mejoras, CAPEX), seguridad del local, respaldo en validaciones y decisiones de dinero                | —                                                                                                                                                                    |
| **Encargado de operaciones en sitio**                                  | [COMPLETAR persona] (S18)                                | `ops`                        | Abrir y cerrar el local, checklists D-7 y D-1, actas de entrega y recepción con fotos, incidencias, costos del evento, emergencias | Validar pagos, cambiar tarifas o parámetros, aprobar descuentos sobre el tope, aplicar la garantía, pagar comisiones, separar, confirmar o cancelar reservas pagadas |
| **Planner aliada**                                                     | Planners invitadas por el admin                          | `planner`                    | Traer y atender a su cliente, crear pre-reservas (máx. `planner_max_active_holds` = 2), coordinar a sus proveedores                | Ver datos de otros planners o de clientes directos; separar o confirmar reservas                                                                                     |
| **Proveedores externos**                                               | Catering, música, decoración, etc. del cliente o planner | Ninguno (sin acceso)         | Cumplir el reglamento y los horarios de montaje y desmontaje; responder por sus daños                                              | Operar fuera de lo acordado en la lista de proveedores del D-7                                                                                                       |
| **Recepcionista** (agente)                                             | IA en el chat de la web                                  | Actor `agent`                | Responder 24/7, calificar, consultar disponibilidad, dar rango del cotizador, registrar el lead, derivar a un humano               | Negociar precios, dar descuentos, crear pre-reservas (S35), confirmar reservas                                                                                       |
| **Operaciones** (automatización)                                       | Procesos programados                                     | Actor `system`               | Vencer holds, recordatorios de saldo, avisos D-7 y D-1, alertas de SLA, resumen semanal                                            | Aplicar cargos a la garantía o cambiar estados que no sean "Vencida"                                                                                                 |
| **Closer, Revenue, Growth, Planners, Controller, Contenido** (agentes) | Tareas programadas de Claude Code                        | Actor `agent` (solo lectura) | Analizar y **proponer** (máx. 3 propuestas por corrida) en `/admin/agentes`                                                        | Ejecutar cambios, contactar clientes o planners directamente, publicar                                                                                               |
| Apoyo externo                                                          | Contador y abogado de SAWA [COMPLETAR]                   | Ninguno                      | Facturación electrónica, tributos, contratos y temas legales "por validar"                                                         | —                                                                                                                                                                    |

Notas:

- No hay vendedor dedicado: la venta humana la hacen los admins [VALIDAR si se suma una persona comercial con rol `ops`].
- El reparto "André comercial / Carlos activo físico" es una **propuesta** para tener un solo responsable final (A) por actividad. En el sistema ambos tienen los mismos permisos.
- "Claude como encargado de operaciones" (OASIS.md §15.1) se materializa con las automatizaciones y los agentes; la persona en sitio sigue siendo indispensable.

## 3. Matriz RACI

**R** = lo hace · **A** = responde por el resultado (uno solo) · **C** = se le consulta · **I** = se le informa.

Columnas: **An** André · **Ca** Carlos · **Op** encargado en sitio · **Pl** planner · **Pv** proveedores · **Rec** Recepcionista · **Ope** Operaciones · **Clo** Closer · **Rev** Revenue · **Gro** Growth · **APl** agente Planners · **Ctl** Controller · **Con** Contenido.

| #   | Actividad                                                   | An  | Ca  | Op  | Pl  | Pv  | Rec | Ope | Clo | Rev | Gro | APl | Ctl | Con | Pantalla                                        |
| --- | ----------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ----------------------------------------------- |
| 1   | Cambiar tarifas (`rate_cards`) y feriados                   | A/R | C   |     | I   |     |     |     |     | C   |     |     |     |     | `/admin/configuracion`                          |
| 2   | Cambiar parámetros (`settings`)                             | A/R | C   | I   |     |     |     |     |     | C   |     |     | C   |     | `/admin/configuracion`                          |
| 3   | Aprobar descuento sobre el tope (`discount_cap_pct`)        | A/R | C   |     |     |     | C   |     | C   | C   |     |     |     |     | `/admin/crm/[id]` (pre-reserva)                 |
| 4   | Responder leads (≤ 15 min hábiles)                          | A/R | R   |     |     |     | R   | C   |     |     |     |     |     |     | Chat web · `/admin/crm`                         |
| 5   | Calificar, agendar y hacer la visita                        | A/R | R   | C   | R   |     | R   |     |     |     |     |     |     |     | `/admin/crm/[id]`                               |
| 6   | Cotizar y crear pre-reserva                                 | A/R | R   |     | R   |     |     |     |     |     |     |     |     |     | `/admin/crm/[id]` · `/planners/portal`          |
| 7   | Seguimiento de cotizaciones y holds por vencer              | A/R | R   |     | R   |     |     |     | C   |     |     |     |     |     | `/admin/crm` · `/admin/agentes`                 |
| 8   | Registrar pago con voucher                                  | A   | R   | R   | C   |     |     |     |     |     |     |     | C   |     | `/admin/reservas/[id]` → Pagos                  |
| 9   | **Validar pagos** (adelanto, saldo, garantía)               | A/R | R   | I   | I   |     |     |     |     |     |     |     | C   |     | `/admin/reservas/[id]` → Pagos                  |
| 10  | Contrato: generar, firmar por SAWA y registrar firma        | A/R | C   | C   | C   |     |     |     |     |     |     |     |     |     | `/admin/reservas/[id]` → Documentos             |
| 11  | Facturación electrónica (contador de SAWA [COMPLETAR])      | A   | I   |     |     |     |     |     |     |     |     |     | C   |     | Fuera del sistema (SUNAT)                       |
| 12  | Bloqueos de mantenimiento                                   | I   | A   | R   |     |     |     |     |     |     |     |     |     |     | `/admin/calendario`                             |
| 13  | Checklists D-7 y D-1                                        | I   | A   | R   | C   | C   |     | C   |     |     |     |     |     |     | `/admin/reservas/[id]/operacion`                |
| 14  | **Entregar el local** (acta de entrega con fotos)           | I   | A   | R   | C   | I   |     |     |     |     |     |     |     |     | Operación → Acta con fotos                      |
| 15  | Recepción del local (acta de recepción con fotos)           | I   | A   | R   | C   | C   |     |     |     |     |     |     |     |     | Operación → Acta con fotos                      |
| 16  | Registrar incidencias y daños                               | I   | A   | R   | I   | C   |     |     |     |     |     |     |     |     | Operación → Incidencias y daños                 |
| 17  | **Garantía**: aplicar cargo o devolver                      | A/R | C   | C   | I   |     |     |     |     |     |     |     |     |     | `/admin/reservas/[id]` → Liquidación            |
| 18  | Marcar evento Realizado                                     | A   | I   | R   |     |     |     |     |     |     |     |     |     |     | `/admin/reservas/[id]` → Estado                 |
| 19  | **Pagar comisiones** (cálculo automático)                   | A/R | C   |     | I   |     |     |     |     |     |     | I   | C   |     | Liquidación · `/admin/finanzas`                 |
| 20  | Liquidar la reserva                                         | A/R | I   |     | I   |     |     |     |     |     |     |     |     |     | `/admin/reservas/[id]` → Estado                 |
| 21  | Encuesta NPS y pedido de reseña                             | A   | I   | R   | I   |     |     | C   |     |     |     |     |     | C   | Operación → Encuesta NPS                        |
| 22  | Pauta: presupuesto, cortes y carga de inversión             | A/R | C   |     |     |     |     |     |     |     | C   |     |     |     | `/admin/finanzas` → Campañas · `/admin/agentes` |
| 23  | Contenido, redes y respuestas a reseñas (publicar)          | A/R | C   |     |     |     |     |     |     |     |     |     |     | C   | `/admin/agentes` (borradores)                   |
| 24  | Alta, onboarding y estado de planners                       | A/R | I   |     | C   |     |     |     |     |     |     | C   |     |     | `/admin/planners`                               |
| 25  | Libro de Reclamaciones: responder en plazo                  | A/R | C   | C   |     |     |     |     |     |     |     |     |     |     | [COMPLETAR: no hay pantalla]                    |
| 26  | Emergencias y seguridad en sitio (incluye piscina)          | I   | A   | R   | C   | C   |     |     |     |     |     |     |     |     | Teléfono de emergencia [COMPLETAR]              |
| 27  | Costos del evento (real vs. estándar), costos fijos y CAPEX | C   | A   | R   |     |     |     |     |     |     |     |     | C   |     | Operación → Costos · `/admin/finanzas`          |
| 28  | Resumen semanal y conciliación                              | A   | I   |     |     |     |     | R   |     |     |     |     | R   |     | Correo de los lunes · `/admin/agentes`          |

Lectura rápida:

- Filas 1, 2, 3, 9, 17, 19 y 20: **solo admin como R**. Los agentes aparecen únicamente como C (proponen o sugieren).
- Fila 10: el contrato lo firma el representante legal de SAWA [COMPLETAR]; ningún agente lo firma.
- Fila 11: la factura la emite SAWA fuera del sistema; el responsable operativo es el contador [COMPLETAR].
- Fila 8: el encargado en sitio puede registrar un pago con voucher, pero queda "pendiente" hasta que un admin lo valida.

## 4. Escalamiento

| Situación                                               | Atiende primero                          | Escala a            | Plazo                           |
| ------------------------------------------------------- | ---------------------------------------- | ------------------- | ------------------------------- |
| Cliente pide descuento sobre el tope o una excepción    | Recepcionista / staff                    | André               | Mismo día hábil [VALIDAR]       |
| Duplicado de lead con un planner (alerta en el CRM)     | Staff                                    | André               | Antes de cotizar                |
| Daño en el local durante el evento                      | Encargado en sitio                       | Carlos              | Registro en el acto             |
| Emergencia médica o en la piscina                       | Encargado en sitio (llama a emergencias) | Carlos y André      | Inmediato                       |
| Queja de vecinos por ruido                              | Encargado en sitio                       | Carlos              | Inmediato                       |
| Reclamo en el Libro de Reclamaciones                    | André                                    | Abogado [COMPLETAR] | ≤ 15 días hábiles (por validar) |
| Gasto de IA cerca del tope (`agent_monthly_budget_usd`) | Sistema (corta solo)                     | André               | —                               |
