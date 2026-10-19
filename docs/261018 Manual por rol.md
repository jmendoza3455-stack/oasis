# Manual por rol · Oasis Pachacámac

- **Fecha:** 18/10/2026
- **Estado:** Borrador para validación de André y Carlos
- **Relacionados:** [Modelo operativo](261018%20Modelo%20operativo.md) · [Roles y RACI](261018%20Roles%20y%20RACI.md) · [Políticas](261018%20Politicas.md) · [Equipo de agentes](agentes.md)

Un manual de una página por rol. Todas las pantallas se abren tras iniciar sesión en **`/ingresar`** (contraseña o enlace mágico). Horas en hora de Lima; fechas dd/mm/aaaa.

---

## A. Admin (André y Carlos)

**Tu trabajo:** vender, decidir el dinero y vigilar la ocupación. Eres el único que valida pagos, aprueba descuentos sobre el tope, cambia tarifas o parámetros, aplica la garantía y paga comisiones.

### Cada día (L–S, 09:00–19:00)

1. **Correo de las 08:00:** lee el resumen de operación (eventos próximos y holds que vencen en 24 h).
2. **`/admin/crm`:** responde todo lead en **Nuevo** en ≤ 15 min hábiles (`first_response_sla_minutes`). Si llega la alerta "Leads sin respuesta", atiéndela primero.
3. Abre cada lead (`/admin/crm/[id]`): revisa **Origen** (canal y campaña) y la **alerta de duplicado** con un planner; registra una **Nueva actividad** con fecha del próximo paso y mueve la **Etapa**.
4. Para cotizar: en la ficha del lead crea la pre-reserva (tipo de evento, fecha, invitados, descuento). Si el descuento supera `discount_cap_pct`, solo tú puedes aprobarlo.
5. **`/admin/reservas/[id]` → Pagos:** valida o rechaza los vouchers pendientes (mismo día hábil, [VALIDAR]).
6. Con el adelanto validado, en **Estado** pasa la reserva a **Separada**. Con contrato registrado y 100% del alquiler validado, pásala a **Confirmada**.
7. **`/admin/agentes`:** revisa las **derivaciones** del Recepcionista y las **propuestas** de los agentes; aprueba o rechaza con una nota. Si apruebas, aplica tú el cambio en la pantalla que indique la propuesta.
8. **`/admin/avisos`:** envía los WhatsApp en cola (enlace `wa.me`) y márcalos como enviados.

### Cada semana

1. **Lunes, correo de las 08:05:** resumen semanal (ocupación a 90 días, pipeline, leads, CAC, alertas).
2. **`/admin/dashboard`:** ocupación V-S-D vs. L-J, comprometida a 90 días, ingreso neto por día disponible, embudo por canal, CAC vs. 5% del ticket, comisiones por pagar, motivos de pérdida y NPS. Filtra por mes, segmento y canal.
3. **`/admin/finanzas` → Campañas e inversión:** carga la inversión del mes por campaña (manual o CSV de Meta y Google).
4. **`/admin/finanzas` → Comisiones por planner:** paga las comisiones que cumplen `commission_payment_days` y márcalas como pagadas en la **Liquidación** de cada reserva.
5. **Viernes:** revisa la propuesta del Controller (match de vouchers, costos vs. estándar) antes de validar.

### Por evento (después de la fecha)

1. Revisa en **`/admin/reservas/[id]/operacion`** las actas, incidencias y costos que cargó el encargado.
2. En **Liquidación**: devuelve la garantía o aplica el cargo sustentado; paga la comisión si hay planner.
3. Pasa la reserva a **Liquidada**.

### Cada mes o cuando haga falta

1. **`/admin/configuracion`:** parámetros (grupos Reservas, Dinero, Planners, Comercial, Metas), **Tarifario (precios sin IGV)** y **Feriados**. Todo cambio queda en `audit_log`.
2. **`/admin/planners`:** invita planners, revisa las **solicitudes desde la web** y activa o suspende.
3. **`/admin/finanzas`:** costos fijos mensuales, CAPEX e import de eventos históricos; exporta reservas, leads, pagos y comisiones a CSV.
4. **`/admin/avisos`:** copia la URL del **feed iCal** a tu Google Calendar; ejecuta un proceso automático a mano si hace falta.

---

## B. Encargado de operaciones en sitio ([COMPLETAR persona])

**Tu trabajo:** que el local esté impecable y seguro, entregarlo y recibirlo con evidencia. Rol `ops` en el sistema.

### Cada día

1. **Correo de las 08:00:** mira qué eventos vienen y qué visitas hay.
2. **`/admin/calendario`:** confirma la agenda del día y de la semana. Registra un **bloqueo de mantenimiento** si el local no estará disponible (con motivo).
3. Registra el **cloro y pH** de la piscina en el cuaderno [COMPLETAR formato].
4. Recibe las visitas de clientes que te asignen [VALIDAR].

### D-7 de cada evento

1. Abre **`/admin/reservas/[id]/operacion` → Checklists → Checklist D-7**.
2. Verifica: saldo pagado y validado, contrato registrado, garantía recibida, **lista de proveedores** del cliente, horario de montaje y desmontaje, mantenimiento de piscina programado.
3. Si algo falta, avisa al admin el mismo día.

### D-1

1. **Checklist D-1:** limpieza general, piscina tratada (cloro y pH), baños abastecidos, energía y grupo electrógeno, personal de apoyo y seguridad confirmado, extintores y señalización.

### Día del evento

1. **Acta de entrega:** recorrido con el cliente o su planner, **fotos** del mobiliario y del jardín, entrega del reglamento y de tu teléfono de emergencia. Sube las fotos en **Acta con fotos**.
2. Durante el evento: vigila aforo, piscina y hora de corte de música ([COMPLETAR], ver [Políticas](261018%20Politicas.md) §4).
3. **Acta de recepción:** recorrido final con fotos, inventario completo, llaves y accesos devueltos.
4. Registra cada daño en **Incidencias y daños** (descripción, monto estimado y si va con cargo a la garantía). El cargo lo aplica el admin.

### Al día siguiente

1. En la reserva, pasa el estado a **Realizada**.
2. **Costos directos del evento:** carga el real contra el estándar (`standard_event_costs`).
3. **Encuesta NPS:** copia el enlace `/encuesta/[token]` y envíalo al cliente (o a su planner).

### Lo que no haces

Validar pagos, aplicar la garantía, cambiar tarifas o parámetros, aprobar descuentos, separar, confirmar o cancelar reservas pagadas. Sí puedes **registrar** un pago con voucher (queda pendiente para el admin) y registrar el contrato firmado.

### Emergencias

1. Llama primero a emergencias [COMPLETAR números: bomberos, serenazgo, clínica más cercana].
2. Luego a Carlos y a André.
3. Registra lo ocurrido como incidencia.

---

## C. Planner aliada

**Tu trabajo:** traer y acompañar a tu cliente. Nosotros hacemos que el espacio funcione. Solo ves tus clientes y tus reservas.

### Primer ingreso

1. Recibes la invitación del admin y entras por **`/ingresar`**.
2. Lee y acepta el **contrato marco** en **`/planners/portal/contrato`** (se registran versión y fecha).
3. Descarga tu material en **`/planners/portal/descargas`**: ficha técnica (`/planners/portal/ficha-tecnica`), tarifario de planner (`/planners/portal/tarifario`) y fotos.

### Cada vez que tienes un cliente

1. **`/planners/portal/clientes` → Registrar cliente:** nombre, teléfono, correo, RUC opcional, tipo de evento, fecha y aforo, con autorización de tu cliente (Ley 29733). Desde ese momento queda **protegido 90 días** (`planner_protection_days`).
2. **`/planners/portal` (Disponibilidad):** revisa la fecha (libre, pre-reservada u ocupada).
3. Crea la **pre-reserva** eligiendo tu cliente, el tipo de evento y los invitados. Dura **72 horas** (`hold_hours`) con cuenta regresiva; puedes tener hasta **2 activas** (`planner_max_active_holds`).
4. Tu cliente paga el adelanto (`deposit_pct`) **directo a SAWA** y envía el voucher a [COMPLETAR canal de SAWA]. La fecha se separa cuando el admin valida el pago.
5. Si tu cliente desiste, **anula la pre-reserva** para liberar la fecha.

### Cada semana

1. **`/planners/portal/reservas`:** estado de tus reservas y fechas de saldo. Los recordatorios de saldo y los avisos D-7 y D-1 de tus reservas te llegan a ti (S29).
2. **`/planners/portal/comisiones`:** tus comisiones (5% del alquiler sin IGV) pasan a "devengada" cuando el evento se realiza y está cobrado al 100%, y se pagan 7 días después (`commission_payment_days`).

### Antes del evento

1. Entrega la **lista de proveedores** y el horario de montaje y desmontaje hasta el D-7.
2. Acompaña la entrega y la recepción del local (actas con fotos).
