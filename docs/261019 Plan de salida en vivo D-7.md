# Plan de salida en vivo D-7 — Oasis Pachacámac

- **Decisión (André, 19/10/2026):** salir en vivo en 7 días → **lunes 26/10/2026 (D0)**. Adelanta el go-live del [Plan 30-60-90](261018%20Plan%20de%20lanzamiento%2030-60-90.md) (era 18/11–17/12).
- **Qué significa "en vivo":** web pública en el dominio propio, sin datos de demo, con usuarios reales, leads entrando al CRM, avisos por correo, chat con IA y agentes por cadencia encendidos, y pauta corriendo.
- **Base técnica:** [Guía de puesta en producción](261018%20Guia%20de%20puesta%20en%20produccion.md) §10 (21 verificaciones).

## 1. Criterio go / no-go (domingo 25/10, 18:00)

| Imprescindible para salir (si falta, se mueve D0)                      | Dueño          |
| ---------------------------------------------------------------------- | -------------- |
| Correos de admin (André, Carlos) y usuarios creados                    | André → Claude |
| Dominio propio apuntado a Vercel con SSL                               | André → Claude |
| Vercel Pro (uso comercial)                                             | André          |
| Respaldo de la BD y demo borrado (`reset-demo`)                        | Claude         |
| Lead de prueba de punta a punta: web → CRM → aviso al staff            | Claude · André |
| Número de WhatsApp en el botón                                         | André          |
| RUC y domicilio fiscal en Configuración → Web (Libro de Reclamaciones) | André          |

| Deseable (si falta, se sale igual)                                  | Plan B                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Tarifario validado → precios públicos                               | Se sale con precios ocultos: el cotizador muestra disponibilidad y el equipo envía la cotización                          |
| Fotos reales (aunque sean de celular, bien iluminadas)              | Arte de marca actual; las fotos entran apenas lleguen                                                                     |
| Clave de Anthropic → Recepcionista en el chat                       | Chat apagado; quedan formulario y WhatsApp                                                                                |
| Resend con dominio verificado                                       | Avisos quedan en el outbox y se ven en el panel                                                                           |
| GA4, Meta Pixel, Google Ads y Turnstile                             | Sin pauta medida: se lanza orgánico y la pauta entra en D+3                                                               |
| Google Business Profile verificado                                  | Perfil creado; la verificación de Google puede tardar días                                                                |
| WhatsApp Cloud API (Recepcionista por WhatsApp)                     | WhatsApp manual (S31); la verificación de Meta no entra en 7 días                                                         |
| Revisión del abogado (privacidad, Libro de Reclamaciones, contrato) | Se sale con los textos actuales marcados "por validar" y se revisan en las 2 primeras semanas (riesgo aceptado por André) |

## 2. Calendario

| Día              | André (y Carlos)                                                                                                                                                                | Claude                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Lun 19 (D-7)** | Correos de admin. Comprar el dominio a nombre de SAWA. Confirmar Vercel Pro. Abrir Google Business Profile (la verificación tarda). Iniciar la verificación del negocio en Meta | Benchmark digital de competidores. Este plan                                                                                             |
| **Mar 20 (D-6)** | DNS del dominio (o acceso para configurarlo). Cuenta de Resend. Número de WhatsApp. Cargar `ANTHROPIC_API_KEY` y los secretos de backup en Vercel/GitHub                        | Usuarios reales. Dominio + SSL, `NEXT_PUBLIC_SITE_URL`, Auth de Supabase. Resend (registros DNS). Turnstile. Mejoras del benchmark (web) |
| **Mié 21 (D-5)** | **Validar tarifario** (¿con o sin IGV?). RUC, domicilio, dirección, Maps y redes en Configuración → Web                                                                         | Tarifas validadas y precios públicos encendidos. Backup diario verificado                                                                |
| **Jue 22 (D-4)** | Fotos del local (celular en horizontal, luz de día: piscina, jardín, terraza, parrilla, ingreso). Cuentas de GA4, Meta Business y Google Ads a nombre de SAWA                   | Fotos optimizadas en la web y en Google Business Profile. Píxeles con consentimiento. Campañas armadas en pausa (Plan de pauta)          |
| **Vie 23 (D-3)** | Aprobar el `reset-demo`. Definir quién atiende leads y visitas (horario)                                                                                                        | Respaldo manual + `reset-demo`. Lead de prueba con UTM. Checklist §10 de la guía                                                         |
| **Sáb 24 (D-2)** | Recorrido completo como cliente y como planner desde el celular. Lista de 20 planners para invitar                                                                              | Correcciones del recorrido. Lighthouse contra el dominio                                                                                 |
| **Dom 25 (D-1)** | **Go / no-go 18:00**                                                                                                                                                            | Checklist final (21/21) y reporte                                                                                                        |
| **Lun 26 (D0)**  | Anuncio en redes y a contactos. Invitar planners                                                                                                                                | Quitar la protección de Vercel en producción. Encender pauta, Recepcionista y agentes por cadencia. Monitoreo del día                    |
| **D+1 a D+7**    | Responder leads en menos de 1 h. Visitas                                                                                                                                        | Monitoreo diario (errores, leads, pauta). Ajustes. Reporte semanal                                                                       |

## 3. Riesgos

| Riesgo                                                                 | Mitigación                                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| El dominio o el DNS llegan tarde (bloquea correo, Turnstile y píxeles) | Comprar hoy; si el D-3 no está, se sale con el dominio de Vercel y se migra en la semana 1 (pierde marca y SEO inicial) |
| Tarifario sin validar                                                  | Precios ocultos (interruptor) y cotización manual                                                                       |
| Textos legales sin revisión de abogado                                 | Marcados "por validar"; revisión en las 2 primeras semanas                                                              |
| Leads sin atender (no hay persona asignada)                            | Avisos al staff + Recepcionista 24/7 + agente Closer diario                                                             |
| Meta y Google tardan en verificar (WhatsApp API, Business Profile)     | Iniciar hoy; no bloquean el go-live                                                                                     |
