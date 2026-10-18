# Políticas · Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 18/10/2026
- **Estado:** Borrador para validación de André y Carlos. **Todo lo legal, tributario y contractual está "por validar con abogado o contador"**; nada se da por cumplido.
- **Relacionados:** [Modelo operativo](261018%20Modelo%20operativo.md) · [Roles y RACI](261018%20Roles%20y%20RACI.md) · [Manual por rol](261018%20Manual%20por%20rol.md) · [Supuestos](supuestos.md) · [Checklist legal](261018%20Checklist%20legal.md) · [Checklist legal (investigación)](research/261018%20Checklist%20legal%20%28investigacion%29.md)

## 0. Cómo leer este documento

- Cada cifra cita el **parámetro de `settings`** del que sale. Todos se editan en **`/admin/configuracion`** y **solo el admin** puede cambiarlos (queda en `audit_log`).
- Si el parámetro cambia, cambia la política: este documento no fija montos por su cuenta.
- Los montos de cada reserva (adelanto, fecha de saldo, garantía, vigencia de la pre-reserva) **se fijan al crearla**. Cambiar un parámetro después no recalcula reservas existentes.
- El operador y quien factura es **SAWA – Gestión Comercial S.A.C.** (RUC [COMPLETAR]), afecta a IGV (`igv_rate` = 18%).
- El contrato PDF del sistema ya cita esta política y dice que el reglamento de uso "forma parte de este contrato": las secciones 4 a 6 son ese reglamento en borrador.

## 1. Reserva y pagos

| Regla                            | Valor actual                                                    | Parámetro                      | Supuesto |
| -------------------------------- | --------------------------------------------------------------- | ------------------------------ | -------- |
| Reservas por día                 | Una sola reserva activa por día (exclusividad)                  | `booking_mode` = `one_per_day` | S03      |
| Vigencia de la pre-reserva       | 72 horas; vence sola y libera la fecha                          | `hold_hours` = 72              | —        |
| Pre-reservas activas por planner | Máximo 2                                                        | `planner_max_active_holds` = 2 | —        |
| Adelanto para separar            | 50% del alquiler **con IGV**                                    | `deposit_pct` = 0.5            | S05      |
| Plazo del saldo                  | 15 días antes del evento                                        | `balance_due_days` = 15        | S05      |
| Recordatorios de saldo           | 3 días antes del vencimiento, el día del vencimiento y vencido  | `balance_notice_days` = 3      | S32      |
| Tope de descuento sin aprobación | 10% sobre el alquiler; por encima solo con aprobación del admin | `discount_cap_pct` = 10        | S08      |
| IGV                              | 18%                                                             | `igv_rate` = 0.18              | —        |
| Tipo de cambio referencial (USD) | S/ 3.75 por US$ (solo para mostrar)                             | `currency_usd_rate` = 3.75     | —        |

Pasos:

1. **Pre-reserva:** la fecha queda apartada `hold_hours` sin pago. Si no llega el adelanto validado, pasa a **Vencida** sola.
2. **Separada:** el cliente paga el adelanto por transferencia, Yape o Plin y envía el voucher. Cuentas de SAWA: [COMPLETAR] (S33). La reserva se separa **solo cuando el admin valida el pago**.
3. **Confirmada:** contrato firmado y **100% del alquiler** validado, a más tardar `balance_due_days` antes del evento.
4. **Comprobante:** SAWA emite comprobante electrónico con IGV por cada pago [por validar con contador: momento de emisión del comprobante del adelanto].
5. **Saldo vencido:** [COMPLETAR qué pasa si no se paga a tiempo: ¿se cancela con la política de la sección 2? ¿hay prórroga?].

Ejemplo ilustrativo (tarifa _placeholder_ del seed: boda, sábado, temporada baja; **no es precio vigente**):

| Concepto                               | Sin IGV                                              | IGV (18%) | Con IGV     |
| -------------------------------------- | ---------------------------------------------------- | --------- | ----------- |
| Alquiler                               | S/ 4,500.00                                          | S/ 810.00 | S/ 5,310.00 |
| Adelanto (`deposit_pct` 50%)           | S/ 2,250.00                                          | S/ 405.00 | S/ 2,655.00 |
| Saldo al D-15 (`balance_due_days`)     | S/ 2,250.00                                          | S/ 405.00 | S/ 2,655.00 |
| Descuento máximo sin aprobación (10%)  | S/ 450.00                                            | S/ 81.00  | S/ 531.00   |
| Garantía (`guarantee_amounts.wedding`) | S/ 1,000.00 (tratamiento de IGV por validar, ver §3) |           |             |

## 2. Cancelación y reprogramación

Parámetro: `cancellation_policy` (S07).

| Caso                                           | Regla                                                             | Campo                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| Cancela con **más de** 60 días de anticipación | Se devuelve el 50% del adelanto pagado                            | `early_cancel_min_days` = 60 · `early_cancel_refund_pct` = 0.5 |
| Cancela con 60 días o menos                    | Sin devolución del adelanto                                       | `late_cancel_refund_pct` = 0                                   |
| Reprogramación                                 | 1 sin costo, pedida con al menos 30 días, sujeta a disponibilidad | `reschedules_allowed` = 1 · `reschedule_free_min_days` = 30    |
| Pre-reserva sin pagar                          | Se puede anular sin costo (cliente, planner dueño o staff)        | —                                                              |

Ejemplo ilustrativo: adelanto pagado S/ 2,655.00 con IGV y cancelación a 75 días → se devuelven S/ 1,327.50.

Reglas operativas:

1. Toda cancelación exige **motivo** y queda en `audit_log`. Una reserva Separada o Confirmada solo la cancela el **admin**.
2. El cálculo cuenta días hasta la fecha del evento en hora de Lima; exactamente 60 días cae en "sin devolución".
3. Si la garantía ya se pagó y el evento se cancela, se propone devolverla completa [VALIDAR].

Por completar o validar:

- [COMPLETAR] Qué pasa con el **saldo ya pagado** si el cliente cancela con menos de 60 días (la política solo habla del adelanto).
- [COMPLETAR] Cancelación por causa de SAWA o fuerza mayor (devolución total, reprogramación preferente).
- [COMPLETAR] Procedimiento de reprogramación en el sistema: hoy no hay un flujo propio; mientras tanto, el admin registra la nueva fecha y deja nota en el historial.
- Por validar con abogado: que la retención del adelanto sea compatible con el Código de Protección y Defensa del Consumidor.

## 3. Garantía por daños

Parámetro: `guarantee_amounts` (S06). Se asigna según el tipo de evento al crear la reserva.

| Tipo de evento    | Garantía    | Campo                          |
| ----------------- | ----------- | ------------------------------ |
| Boda              | S/ 1,000.00 | `guarantee_amounts.wedding`    |
| Social            | S/ 1,000.00 | `guarantee_amounts.social`     |
| Corporativo       | S/ 1,000.00 | `guarantee_amounts.corporate`  |
| Full day familiar | S/ 500.00   | `guarantee_amounts.family_day` |

1. **Cuándo se paga:** antes del evento; se verifica en el checklist D-7 ("Garantía recibida"). El pago lo valida el admin.
2. **Qué cubre:** daños al local, mobiliario, jardín o piscina, faltantes de inventario, limpieza extraordinaria e incumplimientos del reglamento, **debidamente sustentados** con las actas de entrega y recepción con fotos y la incidencia registrada.
3. **Quién decide:** el encargado en sitio registra la incidencia; **solo el admin** aplica el cargo o devuelve la garantía.
4. **Plazo de devolución:** [COMPLETAR días hábiles después de la recepción].
5. **No es parte del alquiler:** no genera comisión para el planner y no cuenta como "cobrado" para confirmar la reserva.
6. **Si el daño supera la garantía:** [COMPLETAR procedimiento de cobro adicional; por validar con abogado].
7. **IGV:** SUNAT considera gravada la parte de la garantía que excede el 3% de la retribución en arrendamientos. **Por validar con contador** si aplica a una cesión por evento y cómo se registra la devolución.

## 4. Reglamento de uso del local

Las reglas con parámetro reflejan la configuración vigente; las demás son **propuesta** para validar antes de la reapertura (17/12/2026, `reopening_date`).

| Tema                 | Regla                                                                                                                           | Fuente                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Exclusividad         | Un evento por día; el local es solo para el grupo contratado                                                                    | `booking_mode`                                                                              |
| Aforo                | Cóctel 150 · banquete sentado 100 · full day 60. El aforo del contrato no puede superarse                                       | `capacity` (S02; validar contra el certificado ITSE)                                        |
| Horario full day     | 09:00 a 18:00                                                                                                                   | `slot_hours.full_day`                                                                       |
| Horario evento noche | 19:00 a 03:00                                                                                                                   | `slot_hours.night`                                                                          |
| Pernocte             | Opcional; salida hasta las 10:00                                                                                                | `checkout_time` (no editable en pantalla hoy)                                               |
| Montaje y desmontaje | Horario acordado en el checklist D-7: [COMPLETAR ventana estándar]                                                              | Checklist D-7                                                                               |
| **Música y ruido**   | Hora de corte de música amplificada: [COMPLETAR]. Volumen máximo y limitador: [COMPLETAR]                                       | Por validar: ECA Ruido (D.S. 085-2003-PCM, nocturno desde 22:01) y Ordenanza 292-2022-MDP/C |
| Derechos de autor    | Quién paga APDAYC, UNIMPRO y SONIEM (local, cliente o DJ): [COMPLETAR]                                                          | Por validar con abogado                                                                     |
| Limpieza             | El local se entrega limpio; basura de proveedores la retira cada proveedor. Limpieza extraordinaria se descuenta de la garantía | Acta de recepción                                                                           |
| Decoración           | Sin clavos, grapas ni adhesivos en paredes y árboles [VALIDAR]; nada que dañe el césped                                         | —                                                                                           |
| Fuego y pirotecnia   | Pirotecnia, fogatas y lanzamiento de globos: [COMPLETAR permitido / prohibido]                                                  | Por validar con ITSE                                                                        |
| Fumar y menores      | Zonas de fumadores y supervisión de menores: [COMPLETAR]                                                                        | —                                                                                           |
| Mascotas             | [COMPLETAR]                                                                                                                     | —                                                                                           |
| Estacionamiento      | Capacidad y reglas: [COMPLETAR] (S12)                                                                                           | —                                                                                           |
| Entrega y recepción  | Recorrido con el cliente o su planner, con fotos, al inicio y al final                                                          | Actas en Operación                                                                          |

## 5. Piscina y seguridad

La piscina es el **riesgo de mayor severidad** del negocio. La norma peruana sobre salvavidas y equipo mínimo **no se encontró** (vacío de investigación); estas reglas son prudenciales y están **por validar con DIRIS Lima Sur y abogado**.

1. Horario de uso de la piscina: [COMPLETAR]. Fuera de ese horario queda cerrada y señalizada.
2. **Salvavidas** durante todo el uso en full days y eventos [VALIDAR quién lo provee y su costo].
3. Menores siempre acompañados por un adulto responsable.
4. Prohibido nadar después de consumir alcohol y prohibidos los envases de vidrio alrededor de la piscina.
5. Señalización de profundidad visible.
6. Registro diario de **cloro residual libre y pH** (cuaderno de la piscina); el D-1 incluye "Piscina tratada (cloro y pH registrados)".
7. Seguridad general (checklist D-1): extintores y señalización en su lugar, energía y grupo electrógeno revisados, personal de apoyo y seguridad confirmado.
8. Contacto de emergencia del encargado en sitio entregado al cliente en el acta: [COMPLETAR teléfono].
9. Botiquín, ruta de evacuación y punto de reunión: [COMPLETAR].
10. Vigencias por verificar (S22): licencia de funcionamiento, ITSE, certificación sanitaria de la piscina y seguro de responsabilidad civil.

## 6. Proveedores externos

El cliente o su planner pueden traer sus propios proveedores (catering, música, decoración, mobiliario). Estándares objetivos:

1. **Lista previa:** nombres, contacto y servicio de cada proveedor entregados hasta el D-7 (checklist "Lista de proveedores del cliente recibida").
2. **Horarios:** solo dentro de la ventana de montaje y desmontaje acordada.
3. **Seguridad:** instalaciones eléctricas y de gas en buen estado; nada de fuego abierto fuera de zonas autorizadas [COMPLETAR].
4. **Seguro:** exigir póliza de responsabilidad civil propia a proveedores de riesgo (catering con fuego, estructuras, pirotecnia) [por validar con abogado].
5. **Cuidado del local:** los daños causados por un proveedor se cargan a la garantía del cliente, que responde frente a SAWA.
6. **Residuos:** cada proveedor retira lo suyo al terminar.
7. **Música:** el DJ o la banda respeta la hora de corte y el volumen (sección 4).

## 7. Planners (resumen; el detalle está en el [Programa de planners](261018%20Programa%20de%20planners.md))

| Regla                              | Valor                                                 | Parámetro                   |
| ---------------------------------- | ----------------------------------------------------- | --------------------------- |
| Comisión sobre el alquiler sin IGV | 5%                                                    | `planner_commission_rate`   |
| Pago de la comisión                | 7 días después del evento Realizado y cobrado al 100% | `commission_payment_days`   |
| Protección del cliente registrado  | 90 días                                               | `planner_protection_days`   |
| Versión vigente del contrato marco | 2026-10                                               | `planner_agreement_version` |

La comisión excluye garantía y servicios de terceros (S04). El cliente firma con SAWA y paga directo a SAWA. Tratamiento tributario de la comisión (recibo por honorarios o factura del planner): por validar con contador.

## 8. Datos personales y reclamos

- Datos personales tratados conforme a la Ley N.º 29733 y el aviso de `/privacidad`. Inscripción del banco de datos ante la ANPD: por validar con abogado.
- **Libro de Reclamaciones** virtual en `/libro-de-reclamaciones`. Respuesta en **≤ 15 días hábiles** y sin condicionar la atención al pago (por validar con abogado; S27).
