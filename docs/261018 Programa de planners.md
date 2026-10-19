# Programa de planners aliadas · Oasis Pachacámac

- **Fecha:** 18/10/2026
- **Estado:** Borrador para validación de André y Carlos. El contrato marco es un borrador **por validar con abogado**.
- **Relacionados:** [OASIS.md §5.2 y §15](../OASIS.md) · [Supuestos](supuestos.md) (S04, S29) · [Canales y planners](research/261018%20Canales%20y%20planners.md) · [Benchmark de competidores](research/261018%20Benchmark%20de%20competidores.md) · [Tarifario propuesto](261018%20Tarifario%20propuesto%20y%20benchmark.md) · [Plan de pauta](261018%20Plan%20de%20pauta%2090%20dias.md) · [Agente de planners](../agents/planners.md) · resumen en la app: `lib/content/agreement.ts`

> **En una línea:** el canal planner es el **prioritario** para la reapertura. Paga solo cuando hay un evento realizado y cobrado (≈ S/ 164 por evento con el ticket promedio supuesto) y hoy cuesta menos que un cliente traído por pauta (CAC supuesto ≈ S/ 357). Ver [Plan de pauta](261018%20Plan%20de%20pauta%2090%20dias.md).

---

## 1. Propuesta de valor

**"Nosotros hacemos que el espacio funcione; tú haces que el evento sea único."** No competimos con la planner: le damos un local que no le genera problemas.

| Lo que gana la planner                            | Cómo se cumple (verificable en el sistema)                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Disponibilidad real, sin llamadas                 | Calendario del portal (libre / pre-reservado / ocupado), con la misma fuente de verdad que el back-office                 |
| Bloquear una fecha mientras cierra con su cliente | Pre-reserva de 72 h, hasta 2 activas a la vez, con cuenta regresiva                                                       |
| Su cliente queda protegido                        | Atribución de 90 días por teléfono, correo o RUC. Si el cliente escribe directo, el sistema alerta y respeta a la planner |
| Comisión clara y automática                       | 5 % sobre el alquiler sin IGV, calculada sola al marcar el evento realizado y cobrado. Visible en "Mis comisiones"        |
| Libertad creativa                                 | Proveedores externos permitidos con estándares objetivos (reglamento de uso). Un solo evento por día                      |
| Material de venta listo                           | Ficha técnica, tarifario de planner y (pendiente) fotos, en Descargas del portal                                          |
| Cero cobranza para la planner                     | El cliente firma con SAWA – Gestión Comercial S.A.C. y le paga a SAWA. La planner no maneja dinero del alquiler           |

**Beneficios no monetarios sugeridos** (modelo "mixto" citado en el research; ninguno cambia la comisión ni requiere aprobación de tarifas): visita técnica gratuita con su cliente, prioridad para pre-reservar fechas de alta demanda, fotos del evento para su portafolio (con autorización del cliente). **No** se puede condicionar la comisión a dejar reseñas en Google (política de Google Business Profile, ver research §6).

---

## 2. Reglas del programa

Todas las cifras viven en `settings` (se editan en **/admin/configuracion**, solo admin). Valores actuales del seed:

| Regla                    | Valor                                                                                                                            | Clave en `settings`              | Estado                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------- |
| Comisión                 | 5 % del alquiler del espacio **sin IGV y después de descuentos**. Excluye garantía y servicios de terceros                       | `planner_commission_rate` = 0.05 | S04, por confirmar          |
| Devengo                  | Solo con el evento en estado **Realizada** (o Liquidada) **y** el alquiler **cobrado al 100 %** con pagos validados por el admin | — (regla del dominio)            | Regla crítica 4             |
| Pago                     | 7 días calendario después de la fecha en que se cumplen ambas condiciones (la más tardía)                                        | `commission_payment_days` = 7    | S04, por confirmar          |
| Protección del lead      | 90 días desde que la planner registra al cliente                                                                                 | `planner_protection_days` = 90   | Confirmado en OASIS §3      |
| Match de duplicados      | Teléfono (normalizado a 9 dígitos, sin +51), correo (minúsculas) o RUC                                                           | —                                | `lib/domain/attribution.ts` |
| Conflicto entre planners | Gana el **registro más antiguo** vigente (la primera que trajo al cliente)                                                       | —                                | `lib/domain/attribution.ts` |
| Pre-reservas (holds)     | 72 h; vencen solas y la fecha vuelve a Libre                                                                                     | `hold_hours` = 72                | OASIS §3                    |
| Máximo de holds activos  | 2 por planner                                                                                                                    | `planner_max_active_holds` = 2   | OASIS §3                    |
| Versión del contrato     | "2026-10"; cada versión nueva requiere aceptación en el portal                                                                   | `planner_agreement_version`      | —                           |
| Quién paga la comisión   | Solo el admin marca comisiones como pagadas. Ningún agente automático lo hace                                                    | —                                | Regla crítica 6             |

**Ejemplo de comisión** (tarifario de ejemplo, por validar S24): boda sábado temporada baja, alquiler S/ 4,500 sin IGV → comisión **S/ 225.00**. Con un descuento del 10 % (alquiler S/ 4,050) → **S/ 202.50**. La garantía (S/ 1,000) no suma a la base.

**Qué ve y qué no ve la planner (RLS probada):** ve su calendario de disponibilidad, sus clientes, sus reservas y sus comisiones. Nunca ve clientes de otra planner ni clientes directos (regla crítica 3).

**Avisos operativos** (S29, por validar): los recordatorios de saldo y los avisos D-7/D-1 de reservas de planner van a la planner, dueña de la relación con su cliente.

### Casos borde a decidir (André)

| Caso                                                                      | Propuesta                                                                                             | Decide          |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------- |
| Cliente registrado por la planner que reserva directo pasados los 90 días | Sin comisión; el sistema ya no alerta. Avisar a la planner a los 75 días para que renueve el contacto | André           |
| Evento cancelado con retención de adelanto                                | Sin comisión (no hay evento realizado). Por validar si se comparte una parte de lo retenido           | André + abogado |
| Reprogramación                                                            | La atribución se mantiene en la nueva fecha                                                           | André           |
| Cliente que llega por dos planners                                        | Gana el registro más antiguo (regla del sistema). Comunicarlo en el onboarding                        | —               |

---

## 3. Resumen del contrato marco (borrador, por validar con abogado)

Lo que la planner acepta en su primer ingreso al portal (`/planners/portal/contrato`; se registran versión y fecha). Texto de la app en `lib/content/agreement.ts`:

1. **Comisión:** 5 % sobre el alquiler del espacio sin IGV. No incluye garantía ni servicios de terceros.
2. **Devengo y pago:** se gana cuando el evento se realiza y está cobrado al 100 %; se paga 7 días después.
3. **Pre-reservas:** cada una dura 72 horas y vence sola; hasta 2 activas a la vez.
4. **Protección de clientes:** si un cliente registrado contacta directo dentro de 90 días, la reserva se atribuye a la planner.
5. **Datos personales:** registra datos reales y con autorización de su cliente (Ley N.º 29733); solo ve la información de sus propios clientes.
6. **Contrato y cobro:** el cliente firma el contrato de alquiler con SAWA – Gestión Comercial S.A.C. y paga directamente a SAWA.
7. **Reglamento:** cumple el reglamento de uso del local y los estándares de seguridad para proveedores.
8. **Cambios:** SAWA puede actualizar el programa con aviso previo; las versiones nuevas requieren aceptación en el portal.

**Puntos que faltan en el borrador** (llevar al abogado y al contador; ver también el [checklist legal](research/261018%20Checklist%20legal%20%28investigacion%29.md)):

| Tema                                                                                                              | Por qué importa                                                                              | Responsable     |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------- |
| Comprobante de la comisión (factura o recibo por honorarios) y retenciones                                        | SAWA necesita sustento tributario para pagar                                                 | Contador        |
| Naturaleza de la relación (independiente, no exclusiva, sin vínculo laboral)                                      | Evitar contingencia laboral                                                                  | Abogado         |
| Transparencia de la comisión ante el cliente final                                                                | Las fuentes del research recomiendan transparentarla; definir si se informa en la cotización | André + abogado |
| Rol en datos personales (¿la planner es encargada del tratamiento?) e inscripción del banco de datos ante la ANPD | Ley 29733                                                                                    | Abogado         |
| Vigencia, terminación y qué pasa con comisiones devengadas al terminar                                            | Evitar disputas                                                                              | Abogado         |
| Confidencialidad del tarifario de planner                                                                         | Es material comercial                                                                        | Abogado         |
| Responsabilidad por daños de proveedores que trae la planner                                                      | Se cubre con la garantía del cliente; definir si la planner responde solidariamente          | Abogado         |
| Ley aplicable, jurisdicción o arbitraje                                                                           | Estándar contractual                                                                         | Abogado         |

---

## 4. Kit de venta

| Pieza                                                                              | Dónde está                                                               | Estado                                                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Ficha técnica (espacios, aforos, horarios, reglas)                                 | Portal → Descargas → `/planners/portal/ficha-tecnica` (imprimible a PDF) | Lista; dormitorios, baños y estacionamiento siguen como placeholders (S12)                                             |
| Tarifario de planner (precios por evento, día y temporada, con su comisión)        | Portal → `/planners/portal/tarifario`                                    | Listo con el tarifario de ejemplo **por validar (S24)**                                                                |
| Fotos del local                                                                    | Portal → Descargas                                                       | **[PENDIENTE]**: se publican al terminar la remodelación. No usar fotos de terceros ni renders presentados como reales |
| Video corto / recorrido                                                            | —                                                                        | **[PENDIENTE]**, después de las fotos                                                                                  |
| Portal de planners (calendario, holds, clientes, reservas, comisiones)             | `/planners/portal`                                                       | Operativo                                                                                                              |
| Página pública "Planners" con solicitud de alta                                    | `/planners`                                                              | Operativa                                                                                                              |
| Una página "cómo trabajamos juntos" (este documento, §2 y §5, sin cifras internas) | Por maquetar                                                             | Pendiente                                                                                                              |
| Reglamento de uso y estándares para proveedores                                    | Por redactar ([OASIS §5.6](../OASIS.md))                                 | Pendiente; es requisito para la cláusula 7                                                                             |

**Regla del kit:** nada de testimonios, cifras de clientes ni fotos inventadas (regla crítica 10). Mientras no haya fotos, la venta se apoya en la visita técnica.

---

## 5. Guion de onboarding

| Paso                                                              | Qué pasa                                                                                                                  | Quién                                                                        | Herramienta                                 | Tiempo objetivo (propuesta)          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------ |
| 0. Contacto                                                       | Primer mensaje (borrador abajo). Si responde, llamada de 15 min o visita                                                  | Humano (el primer contacto lo aprueba una persona, ver `agents/planners.md`) | WhatsApp / IG / correo                      | —                                    |
| 1. Solicitud                                                      | La planner llena "Solicita tu alta" en `/planners`, o André la registra tras la llamada                                   | Planner o admin                                                              | Web pública                                 | Mismo día                            |
| 2. Invitación                                                     | El admin la invita desde `/admin/planners`; le llega el acceso por correo                                                 | Admin                                                                        | Back-office                                 | ≤ 24 h hábiles                       |
| 3. Primer ingreso y contrato                                      | Entra en `/ingresar`, lee y acepta el contrato marco (versión y fecha quedan registradas). Sin aceptación no ve el portal | Planner                                                                      | `/planners/portal/contrato`                 | Día 1                                |
| 4. Recorrido del portal (15 min, por videollamada o en la visita) | Calendario → crear un hold de prueba y cancelarlo → registrar cliente → descargar ficha y tarifario → ver comisiones      | Planner + André/ops                                                          | Portal                                      | Día 1–3                              |
| 5. Visita técnica                                                 | Recorrido del local, reglas de proveedores, horarios, accesos                                                             | Planner + encargado en sitio                                                 | Local                                       | Semana 1 (cuando la obra lo permita) |
| 6. Primer cliente                                                 | Registra a su cliente **antes** de que el cliente contacte directo (así queda protegido 90 días) y crea el hold de 72 h   | Planner                                                                      | Portal                                      | Cuando tenga un caso                 |
| 7. Cotización y separación                                        | Ops genera la cotización; el cliente paga el adelanto a SAWA; el admin valida y la fecha pasa a Separada                  | Ops + admin                                                                  | Back-office                                 | Antes de que venza el hold           |
| 8. Seguimiento                                                    | Recordatorios a la planner (saldo, D-7, D-1)                                                                              | Sistema / agente                                                             | Automatizaciones                            | Automático                           |
| 9. Comisión                                                       | Evento Realizado + cobrado 100 % → comisión devengada → pagada a los 7 días por el admin                                  | Admin                                                                        | `/admin/planners` y portal "Mis comisiones" | D+7                                  |

**Mensaje de primer contacto (borrador, sin cifras no confirmadas):**

> Hola, [nombre]. Soy [nombre] de Oasis Pachacámac: casa de campo para eventos con jardín, terraza y piscina en Pachacámac, que reabre el 17/12/2026. Trabajamos con planners aliadas: nosotros hacemos que el espacio funcione y tú haces que el evento sea único. Tienes un portal con disponibilidad en tiempo real, pre-reservas de 72 h, tus clientes protegidos 90 días y una comisión del 5 % que se paga sola. ¿Te puedo mostrar el local o el portal en 15 minutos esta semana?

---

## 6. Plan de prospección

**Fuente:** [Canales y planners §3](research/261018%20Canales%20y%20planners.md) (datos públicos de negocio; consultados el 18/10/2026). Antes de contactar, verificar que cada perfil siga activo; los marcados "IG/web no encontrado" requieren búsqueda manual.

### 6.1 Olas de contacto

| Ola        | Fechas                                                                      | A quién                                                                                                                                                      | N.º    | Objetivo de la ola                                                                            |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------- |
| 1          | 19/10–01/11/2026                                                            | **Prioridad A** (evidencia de trabajo en Pachacámac, Lurín o Cieneguilla)                                                                                    | 13     | Validar el 5 % en entrevistas (5–10, como propone el research) y conseguir las primeras altas |
| 2          | 02/11–15/11/2026                                                            | Prioridad B con **social y corporativo** (Caro Ortner, Amelia Eventos, Status Quo, Grace Producciones) + agencias de team building (research §2b)            | 4 + 12 | Llenar L-J y corporativo de verano                                                            |
| 3          | 16/11–29/11/2026                                                            | Resto de la Prioridad B (planners de bodas en Lima)                                                                                                          | 24     | Bodas 2027                                                                                    |
| 4          | 30/11–13/12/2026                                                            | Nombres por verificar (§3c), gremios (CAPEV, Event Planners Perú) y fotógrafos de bodas en Pachacámac (Omar Berr, Carlos Schult, José Lara) como referidores | —      | Presentación grupal y referidos                                                               |
| Open house | Semana del 07/12 o del 17/12/2026 **[según avance de obra, por confirmar]** | Todas las planners con alta o en conversación                                                                                                                | —      | Visita técnica grupal antes de la temporada                                                   |

### 6.2 Prioridad A (ola 1)

| #   | Planner / agencia              | Contacto público          | Evidencia en la zona                                               | Nota                                             |
| --- | ------------------------------ | ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| 1   | Organízate Wedding Planner     | organizate.pe             | Boda en Hacienda Los Ficus (Lurín); guía de locales de la zona sur | Bodas integrales y destino                       |
| 2   | Gloria Galvez Wedding Planner  | @weddingsgloriagalvez     | Declara atender el sur de Lima, incluido Pachacámac                | Bodas destino                                    |
| 3   | Eventos y Catering Cieneguilla | cieneguillaeventos.com    | Cieneguilla                                                        | Planner + catering                               |
| 4   | Productora Roxste              | productoraroxste.com      | Haciendas en Lurín, Pachacámac y Cieneguilla                       | Social y corporativo                             |
| 5   | Azulado                        | info.azulado.pe           | Villa en Mamacona                                                  | Tiene locación propia: posible competidor        |
| 6   | Knot Planners Perú             | @knotplanners             | Zona no confirmada (por verificar)                                 | —                                                |
| 7   | El Tomate de Cieneguilla       | eltomatedecieneguilla.com | Cieneguilla                                                        | Competidor con planner propio; contacto opcional |
| 8   | Carol Huaynate                 | por verificar             | Boda en Casa Hacienda Queirolo, Pachacámac (2019)                  | Ubicar vía el fotógrafo Omar Berr                |
| 9   | Pamela Higa                    | por verificar             | Boda en Fundo Villalobos, Pachacámac (2022)                        | Ídem                                             |
| 10  | Fiorella Ramírez               | por verificar             | Boda en Villa Mónica, Pachacámac (2018)                            | Ídem                                             |
| 11  | "Sandra y Verónica"            | por verificar             | Bodas en Mamacona, Lurín (2018)                                    | Ídem                                             |
| 12  | Bodas en Playa Lima            | Facebook                  | Punta Hermosa                                                      | Bodas de playa del sur                           |
| 13  | Liliana Acosta Wedding Planner | Facebook                  | Sur de Lima (base no confirmada)                                   | Bodas de playa                                   |

La Prioridad B (28 nombres, #14–41) y los nombres por verificar están en el research §3b–3c; no se duplican aquí.

### 6.3 Embudo y metas (propuesta, por validar)

| Indicador                                   | Cómo se mide                         | Meta propuesta al 17/12/2026                                                                                            |
| ------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Contactos realizados                        | Registro manual / agente de planners | 100 % de las olas 1–3                                                                                                   |
| Conversaciones (respondieron)               | Ídem                                 | Medir; sin línea base                                                                                                   |
| Planners con contrato aceptado              | `planner_agreements`                 | 10 (supuesto: con 12 eventos/mes en meta y 40 % vía planner ≈ 4.8 eventos/mes, hace falta una base amplia; por validar) |
| Planners con al menos un cliente registrado | Portal                               | 5                                                                                                                       |
| Holds vencidos sin convertir                | Dashboard                            | Vigilar: muchos holds vencidos = reglas o precios a revisar                                                             |

**Revisión:** al día 45 desde la reapertura (research §7), decidir con datos si el 5 % atrae lo suficiente o si se suman beneficios no monetarios. Cambiar el porcentaje es decisión exclusiva del admin.

---

## 7. Vacíos y pendientes

- Validar S04 (5 %, base y 7 días) en entrevistas con planners y con André.
- Contrato marco: revisión legal y contable de los puntos de §3.
- Fotos y video del local **[PENDIENTE]**; reglamento de uso y estándares para proveedores.
- Confirmar fecha del open house según la obra.
- Datos reales de dormitorios, baños y estacionamiento para la ficha técnica (S12).
