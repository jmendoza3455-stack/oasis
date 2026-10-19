# Guía de puesta en producción — Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 18/10/2026
- **Estado:** Borrador para validación de André y Carlos
- **Relacionados:** [Plan de lanzamiento 30-60-90](<261018 Plan de lanzamiento 30-60-90.md>) · [Checklist legal](<261018 Checklist legal.md>) · [Supuestos](supuestos.md) · [Agentes](agentes.md) · [README](../README.md) · [.env.example](../.env.example) · [vercel.json](../vercel.json) · [Backup](../.github/workflows/backup.yml)

## 0. Punto de partida y reglas

**Hoy (18/10/2026):**

- **Vercel:** equipo Sawa, proyecto `oasis`, región `pdx1`, Pro Trial hasta ~01/11/2026. Producción en https://oasis-seven-lemon.vercel.app, protegida con login de Vercel. Cargadas solo las variables de Supabase.
- **Supabase:** proyecto `oasis-pachacamac` (us-west-2, plan Free) con las migraciones aplicadas y **el seed de demo cargado**.
- **Pendiente:** dominio, Resend, Turnstile, tracking, credenciales de WhatsApp (ya implementado), clave del Recepcionista, usuarios reales, backups con secretos.

**Reglas:**

1. Los secretos se escriben **directamente** en Vercel, en los secretos de GitHub o en `.env.local`. **Nunca se pegan en un chat**, en un ticket ni en el repo.
2. Las cuentas se crean a nombre de SAWA, con 2FA y con acceso para André y Carlos.
3. El esquema de BD cambia **solo** con migraciones en `supabase/migrations` y `pnpm db:push`.
4. Las variables `NEXT_PUBLIC_*` quedan fijas en el build: después de cambiarlas hay que **volver a desplegar**. Las del servidor también requieren un despliegue nuevo para tomar efecto.
5. Secretos aleatorios (`RATE_LIMIT_SALT`, `CRON_SECRET`, `ICAL_SECRET`, `NPS_SECRET`, `BACKUP_PASSPHRASE`): generarlos en una máquina propia (por ejemplo `openssl rand -base64 32`) y guardarlos en el gestor de contraseñas de SAWA.

## 1. Supabase

### 1.1 Proyecto

- [ ] Confirmar región us-west-2 y plan. En Free no hay backups automáticos (por eso existe el workflow de §1.8). Revisar la política vigente de pausa por inactividad del plan Free (por verificar).
- [ ] Auth > configuración: **registro público deshabilitado** (el acceso es solo por invitación).

### 1.2 Auth: URLs y correo

- [ ] **Site URL:** el dominio final (mientras tanto, la URL de Vercel).
- [ ] **Redirect URLs:** `https://<dominio>/auth/callback` y la URL de Vercel con `/auth/callback`. La app las usa en el enlace mágico (`/ingresar`) y en la invitación de planners.
- [ ] Plantillas de correo de Auth (invitación, enlace mágico) en español y con la marca.
- [ ] **SMTP propio con Resend** (§3) para los correos de Auth. El correo integrado de Supabase tiene un límite bajo de envíos (cifra vigente: por verificar).

### 1.3 Migraciones

En `.env.local` de una máquina de confianza: `SUPABASE_PROJECT_REF` y `SUPABASE_ACCESS_TOKEN` (token personal de la cuenta de Supabase, nunca en Vercel).

```bash
pnpm db:push      # aplica solo las pendientes; "= ya aplicada" o "✓ archivo"
```

- Cada migración y su registro en `supabase_migrations.schema_migrations` van en una sola transacción.
- Antes de cada migración en producción: **backup manual** (§1.8, "Run workflow").

### 1.4 Rol de la app (`oasis_app`) y `DATABASE_URL`

- La migración crea el rol `oasis_app` **sin contraseña**. Asignarla una sola vez desde el editor SQL de Supabase (`alter role oasis_app password '…'`) con una contraseña del gestor. Es el único paso manual previsto (ver el comentario de la migración `20261018000700_app_role.sql`).
- `DATABASE_URL`: Supabase > **Connect** > _Transaction pooler_, reemplazando usuario y contraseña por los de `oasis_app` (respetar el formato de usuario que muestra el panel para el pooler).

### 1.5 Storage

- [ ] Verificar que exista el bucket **privado** `documents` (vouchers, contratos, fotos de actas). El código lo espera y **ninguna migración lo crea**: si no existe, crearlo privado y registrar el cambio (idealmente con una migración nueva).

### 1.6 Usuarios iniciales

En `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS` (André y Carlos) y `OPS_EMAILS`.

```bash
pnpm users:create   # invita por correo y asigna el rol; idempotente (re-ejecutar actualiza roles)
```

Requisito: §1.2 configurado, porque la invitación lleva al `/auth/callback` del sitio.

### 1.7 Borrar el demo (antes del go-live)

```bash
pnpm db:reset-demo   # o: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/reset-demo.sql
```

- **Borra:** reservas, leads, clientes, pagos, comisiones, campañas, planners, costos, auditoría y demás datos comerciales.
- **Conserva:** venue, `settings`, espacios, feriados y `rate_cards` (tarifario **placeholder**: validarlo en `/admin/configuracion` y marcarlo "validado").
- Es irreversible: correr el backup manual justo antes.

### 1.8 Backups diarios (GitHub Actions)

Workflow `.github/workflows/backup.yml`: diario a las 03:17 (Lima), `pg_dump` de los esquemas `public` y `auth`, cifrado con AES-256 y guardado como artefacto por 30 días.

- [ ] GitHub > repo > Settings > Secrets and variables > Actions:
  - `SUPABASE_DB_URL`: cadena del usuario `postgres`. Recomendado el _Session pooler_ (los runners de GitHub no suelen tener IPv6 para la conexión directa; por verificar).
  - `BACKUP_PASSPHRASE`: frase larga en el gestor de André **y** de Carlos. Sin ella los backups no sirven.
- [ ] Actions > "Backup BD" > **Run workflow** y comprobar que aparece el artefacto `backup-…`. **Sin secretos el job se omite y termina en verde**: revisar el artefacto, no solo el color.
- **No cubre:** archivos de Storage (vouchers, contratos, fotos) ni los esquemas `cron` y `supabase_migrations`. Decidir un respaldo de Storage antes de recibir vouchers reales.

### 1.9 Restauración

Hacer un **simulacro antes del go-live** y ajustar esta sección con lo aprendido.

```bash
gh run download <run-id> -n backup-<run-id>                    # o descargar desde Actions
gpg --decrypt -o oasis.dump oasis-AAAAMMDD-HHMM.dump.gpg        # pide BACKUP_PASSPHRASE
pg_restore --list oasis.dump | head                             # inspeccionar
createdb oasis_restore && pg_restore --no-owner --no-privileges -d oasis_restore oasis.dump
```

- Verificar conteos (reservas, pagos, leads) contra el dashboard del día del backup.
- En un incidente real, restaurar primero en una BD aparte y decidir con André si se reemplaza producción o se recuperan solo las filas perdidas. El procedimiento exacto contra Supabase (orden con migraciones, triggers y constraints) se define en el simulacro: **por verificar**.

## 2. Vercel

### 2.1 Plan

- [ ] **Pro antes del 01/11/2026** (decisión de André). Hobby no permite uso comercial y solo admite crons diarios: el cron de SLA de `vercel.json` no correría (S25, S30).

### 2.2 Variables de entorno

Vercel > proyecto `oasis` > Settings > Environment Variables. **Prod** = entorno Production. Para Preview: no cargar las credenciales de la BD de producción salvo decisión expresa (una preview podría escribir datos reales).

| Variable                            | Para qué                                                         | Dónde se obtiene                                        | Dónde va                              | ¿Obligatoria para go-live?                          |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`              | URL canónica: SEO, enlaces de correo, Auth, NPS                  | `https://<dominio>` sin barra final                     | Vercel Prod                           | Sí                                                  |
| `DATABASE_URL`                      | Conexión de la app con RLS por request                           | §1.4 (pooler de transacción, rol `oasis_app`)           | Vercel Prod                           | Sí                                                  |
| `DATABASE_POOL_MAX`                 | Tamaño del pool (usada por `lib/db.ts`, no está en .env.example) | Opcional; por defecto 5                                 | Vercel Prod                           | No                                                  |
| `OASIS_DEV_AUTH`                    | Login de desarrollo                                              | Solo local/CI                                           | **Nunca en Vercel**                   | No (en Vercel se ignora)                            |
| `OASIS_VENUE_SLUG`                  | Venue activo                                                     | Por defecto `oasis-pachacamac`                          | Vercel Prod                           | No                                                  |
| `RATE_LIMIT_SALT`                   | Hash de IP del rate limiting                                     | Aleatorio (§0.5)                                        | Vercel Prod                           | Sí                                                  |
| `NEXT_PUBLIC_SUPABASE_URL`          | Cliente de Supabase                                              | Supabase > Project Settings > API                       | Vercel Prod · `.env.local`            | Sí (ya cargada)                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Clave pública de Supabase                                        | Supabase > Project Settings > API                       | Vercel Prod                           | Sí (ya cargada)                                     |
| `SUPABASE_SERVICE_ROLE_KEY`         | Storage, invitaciones, scripts (solo servidor)                   | Supabase > Project Settings > API                       | Vercel Prod (sensible) · `.env.local` | Sí (ya cargada)                                     |
| `SUPABASE_PROJECT_REF`              | Scripts de migración                                             | Supabase > Project Settings > General                   | `.env.local` (en Vercel no se usa)    | Solo para scripts                                   |
| `SUPABASE_ACCESS_TOKEN`             | Management API para `db:push`                                    | Supabase > cuenta > Access Tokens                       | `.env.local` · **nunca en Vercel**    | Solo para scripts                                   |
| `SUPABASE_DB_URL`                   | Backups y `psql`                                                 | Supabase > Connect (usuario `postgres`, §1.8)           | Secreto de GitHub · `.env.local`      | Sí, para backups                                    |
| `BACKUP_PASSPHRASE`                 | Cifrado de los backups                                           | Aleatorio (§0.5)                                        | Secreto de GitHub                     | Sí, para backups                                    |
| `TEST_DATABASE_ADMIN_URL`           | Tests de BD                                                      | Postgres local o servicio del CI                        | CI · `.env.local`                     | No                                                  |
| `ADMIN_EMAILS` · `OPS_EMAILS`       | Usuarios iniciales                                               | Decisión 2 del plan                                     | `.env.local` al correr el script      | Sí, para crear usuarios                             |
| `RESEND_API_KEY`                    | Envío de correos                                                 | Resend > API Keys (§3)                                  | Vercel Prod                           | Sí (sin ella los avisos quedan "no enviados")       |
| `EMAIL_FROM`                        | Remitente                                                        | `Oasis Pachacámac <reservas@<dominio>>` (no "El Oasis") | Vercel Prod                           | Sí                                                  |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`    | Widget antispam                                                  | Cloudflare > Turnstile (§7)                             | Vercel Prod                           | Sí                                                  |
| `TURNSTILE_SECRET_KEY`              | Validación antispam en servidor                                  | Cloudflare > Turnstile                                  | Vercel Prod                           | Sí (sin ella la validación se omite)                |
| `NEXT_PUBLIC_GA4_ID`                | Google Analytics 4                                               | GA4 > flujo web (§5)                                    | Vercel Prod                           | No (necesaria antes de la pauta)                    |
| `NEXT_PUBLIC_META_PIXEL_ID`         | Meta Pixel                                                       | Meta Events Manager (§4)                                | Vercel Prod                           | No (necesaria antes de la pauta)                    |
| `NEXT_PUBLIC_GOOGLE_ADS_ID`         | Etiqueta de Google Ads (`AW-…`)                                  | Google Ads > conversiones (§6)                          | Vercel Prod                           | No (necesaria antes de la pauta)                    |
| `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` | Etiqueta de la conversión de lead                                | Google Ads > conversiones (§6)                          | Vercel Prod                           | No (necesaria antes de la pauta)                    |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`       | Botón de WhatsApp                                                | Número comercial, formato `51…` sin `+`                 | Vercel Prod                           | Sí                                                  |
| `ANTHROPIC_API_KEY`                 | Recepcionista con IA                                             | Consola de Anthropic (§8)                               | Vercel Prod (sensible)                | No (sin ella el chat no aparece)                    |
| `ANTHROPIC_MODEL`                   | Modelo de la Recepcionista                                       | Elegido por André en la consola (§8)                    | Vercel Prod                           | No (va junto con la clave)                          |
| `OASIS_AGENT_FAKE`                  | Proveedor simulado                                               | Solo local/CI                                           | **Nunca en Vercel**                   | No                                                  |
| `CRON_SECRET`                       | Autoriza `/api/cron/*`                                           | Aleatorio (§0.5)                                        | Vercel Prod                           | Sí (sin ella los crons responden 401)               |
| `ICAL_SECRET`                       | Firma del feed iCal                                              | Aleatorio; rotarlo invalida las suscripciones           | Vercel Prod                           | **Sí**: sin ella el código usa un valor por defecto |
| `NPS_SECRET`                        | Firma de enlaces de encuesta NPS y del chat                      | Aleatorio                                               | Vercel Prod                           | **Sí**: sin ella el código usa un valor por defecto |

`VERCEL` y `VERCEL_ENV` las pone Vercel solas (desactivan el login de desarrollo y hacen no indexables las previews).

### 2.3 Crons (`vercel.json`, horario UTC)

| Ruta                | Expresión            | Hora Lima                    |
| ------------------- | -------------------- | ---------------------------- |
| `/api/cron/diario`  | `0 13 * * *`         | Diario 08:00                 |
| `/api/cron/sla`     | `*/15 14-23 * * 1-6` | Cada 15 min, L-S 09:00–18:45 |
| `/api/cron/semanal` | `5 13 * * 1`         | Lunes 08:05                  |

- Corren solo en el despliegue de producción y Vercel envía `CRON_SECRET` como `Authorization: Bearer`.
- [ ] Verificar en Settings > Cron Jobs y en los logs que respondan 200 (también mientras siga la protección SSO), y en `/admin/avisos` que aparezcan las ejecuciones.

### 2.4 Protección de despliegue

- Hoy: login de Vercel en producción. Al lanzar: Settings > Deployment Protection, **dejar protegidas solo las previews**.
- [ ] Verificar en una ventana privada que el dominio de producción abre sin login y que una URL de preview sí lo pide.

### 2.5 Dominio y DNS

1. Vercel > Domains > agregar `<dominio>` y `www.<dominio>`; elegir uno como principal y redirigir el otro.
2. Crear en el proveedor DNS **exactamente** los registros que indique Vercel. El certificado SSL es automático.
3. Actualizar `NEXT_PUBLIC_SITE_URL` y **volver a desplegar**.
4. Actualizar en cadena: Supabase Auth (§1.2), Turnstile (§7), Resend (§3), GA4 (§5), Google Business Profile y directorios.
5. [ ] `https://<dominio>/robots.txt` permite indexar y `https://<dominio>/sitemap.xml` usa el dominio nuevo.

## 3. Resend (correo)

1. Crear la cuenta a nombre de SAWA y agregar el dominio de envío (el dominio o un subdominio dedicado).
2. Crear en el DNS los registros **SPF** y **DKIM** que indique Resend; recomendado sumar un registro **DMARC**. Esperar el estado "Verified".
3. API key con permiso solo de envío → `RESEND_API_KEY`. `EMAIL_FROM` con la marca nueva.
4. Configurar el mismo dominio como SMTP de Supabase Auth (§1.2).
5. [ ] Prueba: `/admin/avisos` > ejecutar el proceso diario; el aviso debe quedar "enviado" (no "no enviado") y llegar a la bandeja, no a spam.

## 4. Meta Pixel

1. Business Manager de SAWA > Events Manager > crear el Pixel → `NEXT_PUBLIC_META_PIXEL_ID`.
2. Verificar el dominio en el Business Manager.
3. Eventos que envía la app (solo con consentimiento de cookies): `Lead` (lead_submit), `Contact` (whatsapp_click, chat_open), `Search` (availability_check), `ViewContent` (quote_view).
4. [ ] Prueba con "Probar eventos" de Events Manager: aceptar cookies, enviar un lead de prueba y ver `Lead`. Rechazar cookies y confirmar que no se envía nada.

## 5. Google Analytics 4

1. Crear la propiedad (zona America/Lima, moneda PEN) y un flujo web con el dominio → `NEXT_PUBLIC_GA4_ID` (`G-…`).
2. Marcar `lead_submit` como evento clave; opcional `whatsapp_click`.
3. [ ] Prueba en DebugView con un lead de prueba (con cookies aceptadas).

## 6. Google Ads (conversión de lead)

1. Cuenta de Google Ads de SAWA con **etiquetado automático** activado (genera el `gclid` que la app guarda en el lead).
2. Crear la acción de conversión "Lead" (sitio web, configuración manual) → `NEXT_PUBLIC_GOOGLE_ADS_ID` (`AW-…`) y `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL`. La app la dispara junto con `lead_submit`.
3. Vincular Google Ads con GA4.
4. [ ] Prueba con Tag Assistant: la conversión se registra y el lead llega al CRM con su `gclid`.

## 7. Cloudflare Turnstile

1. Cloudflare > Turnstile > agregar widget (modo administrado). No hace falta mover el DNS a Cloudflare.
2. Hostnames: el dominio final y la URL de Vercel mientras se prueba.
3. Claves → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`. Desplegar de nuevo.
4. [ ] Prueba: el formulario de lead muestra el widget y un envío normal entra al CRM.

## 8. Anthropic (Recepcionista con IA)

1. Consola de Anthropic con la organización de SAWA; crear una clave para este proyecto → `ANTHROPIC_API_KEY` (marcar como sensible).
2. `ANTHROPIC_MODEL`: el identificador del modelo que elija André, copiado de la documentación vigente.
3. **Tope de gasto en dos niveles:** límite en la consola de Anthropic (opciones vigentes: por verificar) y `agent_monthly_budget_usd` en Configuración (S34: USD 30, por validar). Ajustar `agent_pricing_usd_per_mtok` al precio vigente del modelo elegido para que el tope se calcule bien.
4. [ ] Prueba: abrir el chat de la web, consultar una fecha y registrar un lead de prueba; revisar la derivación en `/admin/agentes` y el registro en `audit_log`.

## 9. WhatsApp Business Cloud API (Recepcionista por WhatsApp)

- **Implementado (19/10/2026)**, inactivo hasta cargar las credenciales. El Recepcionista responde por WhatsApp con las mismas reglas que el chat web; los avisos proactivos (saldos, D-7, D-1) siguen en cola con enlace wa.me hasta aprobar plantillas en Meta (S40).
- Pasos (André, con datos de SAWA):
  1. Meta Business Suite: verificar el negocio. Número dedicado que no esté en uso en la app de WhatsApp.
  2. Meta for Developers: crear la app, agregar WhatsApp y registrar el número.
  3. Crear un usuario del sistema con permiso `whatsapp_business_messaging` y generar un token permanente.
  4. Cargar en Vercel (Production): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` y `WHATSAPP_VERIFY_TOKEN` (un texto que tú eliges). Nunca pegarlos en un chat.
  5. Configurar el webhook: URL `https://<dominio>/api/whatsapp`, el mismo verify token, suscribir el campo `messages`. Requiere el dominio público (la protección de Vercel bloquea a Meta).
  6. Probar escribiendo al número: la conversación aparece en el lead del CRM (actividad "chat") y el gasto en `/admin/agentes`.
- Costos y plazos de Meta: por verificar.

## 10. Checklist de go-live (verificable)

| #   | Verificación                                                                                        | Cómo se comprueba                                               | Responsable            |
| --- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------- |
| 1   | Vercel en plan Pro                                                                                  | Settings > Billing del equipo                                   | André                  |
| 2   | CI en verde en `main` y producción desplegada desde `main`                                          | GitHub Actions y Vercel > Deployments                           | Claude                 |
| 3   | Migraciones al día                                                                                  | `pnpm db:push` muestra todas "ya aplicada"                      | Claude                 |
| 4   | Backup diario funcionando y simulacro de restauración hecho                                         | Artefacto del día en Actions; conteos coinciden (§1.9)          | Claude                 |
| 5   | Backup manual previo y `reset-demo` ejecutado                                                       | Dashboard y CRM sin datos de demo                               | Claude (André aprueba) |
| 6   | Tarifario validado y supuestos críticos actualizados en Configuración                               | `/admin/configuracion`: tarifas marcadas "validado"             | André                  |
| 7   | Usuarios reales creados; André y Carlos entran como admin                                           | Login en `/ingresar`                                            | André · Carlos         |
| 8   | Todas las variables obligatorias de §2.2 cargadas; ninguna de desarrollo en Vercel                  | Vercel > Environment Variables                                  | Claude                 |
| 9   | Dominio con SSL, `NEXT_PUBLIC_SITE_URL` actualizado, robots y sitemap correctos                     | §2.5 paso 5                                                     | Claude                 |
| 10  | Supabase Auth con Site URL y Redirect URLs del dominio; enlace mágico llega                         | Pedir un enlace mágico de prueba                                | Claude                 |
| 11  | Bucket privado `documents` existe; subir y ver un voucher de prueba                                 | Ficha de reserva de prueba                                      | Claude                 |
| 12  | Resend verificado; aviso de prueba "enviado"                                                        | §3 paso 5                                                       | Claude                 |
| 13  | Turnstile activo en el formulario                                                                   | §7 paso 4                                                       | Claude                 |
| 14  | Crons responden 200                                                                                 | §2.3                                                            | Claude                 |
| 15  | WhatsApp con el número real y mensaje prellenado                                                    | Clic en el botón desde un celular                               | André                  |
| 16  | Aviso de privacidad, banner de cookies y Libro de Reclamaciones (RUC y domicilio de SAWA) validados | Checklist legal ítems 12 y 13                                   | André · Abogado        |
| 17  | Píxeles solo con consentimiento (si ya están activos)                                               | §4 paso 4                                                       | Claude                 |
| 18  | Fotos y testimonios sin datos inventados (placeholders marcados si faltan)                          | Revisión visual de la web pública                               | André                  |
| 19  | Protección SSO quitada solo en producción                                                           | §2.4                                                            | Claude                 |
| 20  | Lead de punta a punta: formulario con UTM → CRM → aviso al staff                                    | Lead de prueba con `?utm_source=prueba`, luego marcarlo perdido | Claude · André         |
| 21  | Lighthouse móvil ≥ 90 en la web pública                                                             | `pnpm lighthouse` o PageSpeed contra el dominio                 | Claude                 |

## 11. Rollback

**Quién decide:** André (o Carlos si André no está). Todo rollback se anota en CHANGELOG.md con fecha y motivo.

1. **Web caída o con errores graves:** Vercel > Deployments > el último despliegue de producción sano > **Instant Rollback** (o "Promote to Production"). Tarda segundos y no toca la BD.
2. **Cerrar la web al público mientras se arregla:** volver a activar la protección de despliegue en producción (§2.4).
3. **Variable mal configurada:** corregirla en Vercel y volver a desplegar (o hacer rollback al despliegue anterior, que conserva sus variables de build).
4. **Un cron se comporta mal:** desactivarlo en Settings > Cron Jobs o quitar su línea de `vercel.json` con un commit; los procesos son idempotentes, así que se pueden volver a correr desde `/admin/avisos`.
5. **Recepcionista da respuestas incorrectas o gasta de más:** poner `agent_monthly_budget_usd` en 0 en Configuración para que derive a WhatsApp (comportamiento a confirmar en una prueba) o quitar `ANTHROPIC_API_KEY` y volver a desplegar.
6. **Migración con problemas:** las migraciones no se revierten solas. Escribir una **migración correctiva** nueva y aplicarla con `pnpm db:push`. Un rollback de Vercel no deshace cambios de esquema: si el código anterior no es compatible con el esquema nuevo, primero la migración correctiva.
7. **Pérdida o corrupción de datos:** congelar la operación (punto 2), restaurar el último backup en una BD aparte (§1.9) y decidir con André qué se recupera. Avisar a los clientes afectados si hubo reservas o pagos en juego.
