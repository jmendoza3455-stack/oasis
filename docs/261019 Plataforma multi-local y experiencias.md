# Plataforma multi-local y experiencias

- **Fecha:** 19/10/2026 · **Estado:** especificación aprobada en lo conceptual (André y Carlos); marca madre por elegir
- **Relacionados:** [OASIS.md §15.14](../OASIS.md) · [Economía de fechas](261019%20Economia%20de%20fechas.md) · [Programa de planners](261018%20Programa%20de%20planners.md) · [Checklist legal](261018%20Checklist%20legal.md)

## 1. Decisiones (19/10/2026)

| Tema         | Decisión                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Marca        | Marca madre **nueva** (nombre por definir) que agrupa varios locales. Oasis Pachacámac es el primer local y conserva su nombre          |
| Qué se vende | **Experiencias**: paquetes que combinan un local con servicios (catering, decoración, actividades, proveedores)                         |
| Pagos        | Pasarela de pago; un pago **confirmado por la pasarela se valida solo**. Transferencias, Yape manual y devoluciones siguen con el admin |
| Login        | Google para equipo, planners **y clientes** (portal "Mi cuenta")                                                                        |
| Go-live      | Se mantiene el **26/10/2026** con Oasis Pachacámac tal como está; la plataforma se construye en ramas y entra por fases                 |

**Veredicto técnico:** no se rehace. El modelo es multi-local desde el inicio: reservas, tarifas, parámetros, leads, calendario y la regla de una reserva por fecha ya se guardan por local (`venue_id`). Se reutiliza el 80 % o más.

## 2. Arquitectura de marca

```
Marca madre (nombre por definir) — web corporativa, buscador, experiencias, cuentas de cliente
 ├── Local: Oasis Pachacámac          ← primer local (operativo desde el 26/10)
 ├── Local: [siguiente]
 └── Experiencias: paquetes que usan uno o varios locales + servicios de proveedores
Empresa operadora (dato legal en Configuración): razón social, RUC y domicilio en textos legales
```

### Nombres candidatos (dominio .com verificado el 19/10/2026)

| Nombre      | Qué evoca                                      | Dominio disponible      |
| ----------- | ---------------------------------------------- | ----------------------- |
| **Kuska**   | "Juntos" en quechua: celebrar en compañía      | kuskaexperiencias.com   |
| **Tinkuy**  | "Encuentro" en quechua                         | tinkuyexperiencias.com  |
| **Solar**   | Casa solariega, sol, campo                     | solarexperiencias.com   |
| **Vereda**  | Camino de campo; el viaje hacia la experiencia | veredaexperiencias.com  |
| **Alameda** | Paseo arbolado, tradición                      | alamedaexperiencias.com |

- Las versiones cortas `kuska.com` y `tinkuy.com` están tomadas. Los `.pe` no se pudieron consultar desde el entorno: revisar en punto.pe.
- **Antes de elegir:** búsqueda fonética en Indecopi (clases 41 eventos y 43 locales), y usuarios libres en Instagram y TikTok. **Por validar con abogado.**

## 3. Cambios al sistema

### 3.1 Marca y locales

- **Nueva tabla `brands`** (nombre, dominio, redes); `venues.brand_id`. La web y los correos leen la marca desde la base de datos, no del código.
- **Personal por local (seguridad, obligatorio antes del 2.º local).**
  - Tabla `venue_members` (usuario, local, rol).
  - Hoy un usuario "ops" vería todos los locales: el RLS pasa a `is_staff_of(venue_id)`.
  - El admin de la marca ve todos.
  - Pruebas de RLS que lo demuestren, igual que hoy con las planners.
- **Selector de local** en el back-office; dashboard consolidado y por local.

### 3.2 Web de la marca

- **`/`:** buscador (tipo de evento, fecha, invitados) que muestra locales libres y experiencias.
- **`/locales/[local]`:** la web actual del local (calendario, cotizador, segmentos), sin cambios de fondo.
- **`/experiencias/[experiencia]`:** cada paquete, con qué incluye, desde cuánto y fechas.
- **URLs actuales:** redirección 301 (`/bodas` → `/locales/pachacamac/bodas`) para no perder posicionamiento.
- **Dominio:** el de la marca madre. El dominio del local, si se compra, redirige.

### 3.3 Experiencias (paquetes con servicios)

- **Tablas nuevas:**
  - `providers`: proveedor, categoría, RUC y condiciones.
  - `experiences`: paquete, segmentos, locales donde aplica, aforo.
  - `experience_components`: alquiler del local o servicio; por evento o por persona; costo y precio sin IGV.
  - `booking_items`: lo que se vendió en cada reserva, con monto con y sin IGV.
- **Precio:** `lib/domain/experience-pricing.ts`, lógica pura con pruebas. Precio = alquiler (tarifario actual) + servicios. Todo con y sin IGV, IGV desde `settings`.
- **Comisión de planner (regla 4):** sigue siendo 5 % sobre el **alquiler** sin IGV. No se paga sobre servicios de terceros (S04).
- **Operación:** orden a cada proveedor con fecha, invitados y horario, y control de su pago.
- **Por validar con contador:** si la empresa **revende** los servicios (factura todo con IGV y asume el margen) o **intermedia** (el proveedor factura al cliente y la empresa cobra comisión). Cambia el IGV, la contabilidad y el contrato.

### 3.4 Pasarela de pago

| Pieza               | Diseño                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Proveedor           | Interfaz única (`lib/payments`) con un adaptador por pasarela: cambiar de proveedor no toca el resto del sistema                          |
| Cobro               | Link de pago por reserva (adelanto, saldo o garantía), con monto con IGV, vencimiento y su propio registro                                |
| Confirmación        | Aviso de la pasarela al servidor (webhook) con **firma verificada** e **idempotencia**: un mismo pago nunca se registra dos veces         |
| Validación          | Pago confirmado por la pasarela → `validated` automático (actor = pasarela, en `audit_log`) → la reserva avanza por la máquina de estados |
| Sigue con el admin  | Transferencias, Yape manual, **devoluciones**, ajustes y cualquier pago observado                                                         |
| Comprobante (SUNAT) | La pasarela no emite boleta ni factura: sigue con el contador o un facturador electrónico (integración en otra fase)                      |
| Medios              | Tarjetas y Yape a través de la pasarela                                                                                                   |

**Candidatas:** Culqi, Izipay, Niubiz y Mercado Pago. Según comparativas de terceros, rondan **3.4 % a 4 % + IGV** por transacción con tarjeta. **Pedir cotización formal** con el volumen esperado, el plazo de abono y la tarifa de Yape.

### 3.5 Login con Google y "Mi cuenta"

- **Google** como opción de ingreso para equipo, planners y clientes (Supabase Auth). El correo y la contraseña de un solo uso se mantienen.
- **Cliente.** Rol nuevo `client` vinculado a su ficha.
  - **Solo se vincula por correo verificado por Google**, nunca por teléfono: evita que alguien vea reservas ajenas.
  - Ve **solo** sus reservas, cotizaciones, pagos y contrato; paga el saldo; descarga documentos.
  - Pruebas de RLS: un cliente nunca ve a otro cliente ni datos de planners (extiende la regla 3).
- **Planner:** puede ingresar con Google. Su rol lo sigue asignando el admin.

## 4. Fases

| Fase                      | Cuándo          | Qué entra                                                                                                           | Depende de                                                        |
| ------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **F0**                    | Antes del 26/10 | Elegir el nombre, comprar el dominio, búsqueda en Indecopi. Go-live de Oasis Pachacámac sin cambios                 | André y Carlos                                                    |
| **F1 · Base multi-local** | Semanas 1–2     | `brands`, personal por local con RLS, selector de local, login con Google (equipo y planners)                       | Credencial de Google Cloud (te guío)                              |
| **F2 · Cobros y cuentas** | Semanas 2–4     | Pasarela (adaptador + webhook + links de pago + conciliación), "Mi cuenta" del cliente con Google                   | Cuenta comercial de la pasarela elegida                           |
| **F3 · Experiencias**     | Semanas 4–7     | Proveedores, catálogo, cotización con servicios, órdenes a proveedores, web de la marca con buscador, redirecciones | 2–3 paquetes reales con proveedores y costos; criterio tributario |

Cada fase cumple la Definition of Done del proyecto: pruebas unitarias, de base de datos y E2E, capturas y CHANGELOG.

## 5. Riesgos y cómo se cubren

| Riesgo                                          | Cobertura                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Un cliente o un "ops" ve datos que no son suyos | RLS por local y por cliente con pruebas automáticas que fallan si hay fuga     |
| Cobro duplicado o webhook falso                 | Firma verificada, idempotencia por id de la pasarela y conciliación diaria     |
| Contracargos                                    | 3-D Secure de la pasarela y contrato firmado antes del cobro del saldo         |
| IGV mal calculado en paquetes                   | Precio en el dominio con pruebas y criterio del contador antes de F3           |
| Perder posicionamiento al cambiar de dominio    | Redirecciones 301 y el dominio definitivo antes de empezar a invertir en pauta |

## 6. F1 construida (rama `feat/f1-multi-local`)

- **Marca:** tabla `brands` con una marca provisional ("Marca por definir", no se muestra al público) y `venues.brand_id`.
- **Personal por local:**
  - `venue_members` y `is_staff_of(local)`.
  - **32 políticas** de seguridad pasan de "ser staff" a "ser staff de ese local"; `transition_booking`, `reschedule_booking` y `get_availability` verifican el local.
  - Quedan a nivel de marca: clientes, planners y su programa, perfiles, feriados y auditoría.
  - El personal de operaciones que ya existía quedó asignado a los locales actuales: nada cambia para un solo local.
- **Back-office:**
  - Selector de local (aparece con 2 o más locales).
  - Las 17 pantallas trabajan sobre el local elegido, y la base de datos vuelve a verificarlo.
  - Los archivos de una reserva se guardan en el local de esa reserva.
- **/admin/equipo** (solo admin): dar rol (sin acceso, operaciones, admin) y locales a cada persona. Quien entra por primera vez con Google aparece en "Pendientes de acceso". Nadie puede quitarse su propio admin.
- **Login con Google:** botón "Continuar con Google" en /ingresar, oculto hasta activar `NEXT_PUBLIC_AUTH_GOOGLE=1`. Una cuenta nueva no tiene acceso hasta que el admin le da un rol. Una cuenta invitada por correo se une a su Google si el correo coincide.
- **Pruebas:** 5 de base de datos de aislamiento entre locales (lectura, escritura, máquina de estados, disponibilidad y asignación), 2 unitarias y 3 E2E (selector, equipo y botón de Google).

### Encender Google (André, 15 minutos)

1. **Google Cloud Console** → APIs y servicios:
   - **Pantalla de consentimiento OAuth:** tipo externo, nombre de la app, correo de soporte y dominio.
   - **Credenciales** → Crear ID de cliente OAuth → Aplicación web.
   - **URI de redireccionamiento autorizado:** `https://jpfwiusqvuvqhispcfag.supabase.co/auth/v1/callback`.
2. **Supabase** → Authentication:
   - **Providers** → Google: pegar el ID y el secreto del cliente. Se pegan en el panel, nunca en el chat.
   - **URL Configuration:** Site URL = la URL de producción; en Redirect URLs agregar `https://<dominio>/auth/callback`.
3. **Vercel** → Environment Variables: `NEXT_PUBLIC_AUTH_GOOGLE=1` y volver a desplegar.
4. Entrar con Google y verificar que llegas al back-office.
