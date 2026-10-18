# Plan de pauta a 90 días · Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 18/10/2026
- **Estado:** Borrador para validación de André y Carlos. Cifras del modelo = **supuestos por validar**.
- **Relacionados:** [OASIS.md §4, §5.3 y §6.1](../OASIS.md) · [Supuestos](supuestos.md) (S01, S09, S10, S24) · [Canales y planners](research/261018%20Canales%20y%20planners.md) · [Benchmark de competidores](research/261018%20Benchmark%20de%20competidores.md) · [Programa de planners](261018%20Programa%20de%20planners.md) · [Tarifario propuesto](261018%20Tarifario%20propuesto%20y%20benchmark.md) · [Modelo económico](261018%20Modelo%20economico%20Oasis.xlsx) · [Agente de growth](../agents/growth.md)

---

## 0. Conclusión primero

| Dato del modelo (supuestos)                                                       | Valor                                                            |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Ticket promedio ponderado (sin IGV)                                               | ≈ S/ 3,272                                                       |
| Comisión de planner por evento (5 %) = **CAC máximo tolerable**                   | ≈ S/ 164                                                         |
| Pauta mensual (`settings.monthly_ad_budget`, S09)                                 | S/ 1,500                                                         |
| Eventos directos supuestos en meta (12 eventos/mes × 35 %)                        | ≈ 4.2 por mes                                                    |
| **CAC directo supuesto** (1,500 ÷ 4.2)                                            | **≈ S/ 357** → la pauta cuesta **más del doble** que la comisión |
| Eventos directos necesarios para que S/ 1,500 empate con el planner (1,500 ÷ 164) | ≈ 9.2 por mes                                                    |
| **CPL máximo** con 8 % de conversión lead → evento (164 × 8 %)                    | **≈ S/ 13**                                                      |
| Equilibrio del negocio                                                            | ≈ 3.2 eventos/mes (11 % de ocupación) · meta ≈ 12 eventos/mes    |

1. **Con los supuestos actuales, la pauta solo conviene si el CPL baja de ~S/ 13 o si la conversión lead → evento sube** por encima del 8 %. Los CPL publicados por agencias para Lima con presupuestos pequeños son de **S/ 25–60** (Funnel.pe, vía research §5a, consultado el 18/10/2026), o sea, por encima del umbral.
2. **El canal planner es prioritario:** paga solo por evento realizado y cobrado, y su costo (≈ S/ 164) es el techo contra el que se mide la pauta. Ver [Programa de planners](261018%20Programa%20de%20planners.md).
3. La pauta se lanza **como prueba con reglas de corte estrictas** (§6). El presupuesto de S/ 1,500 es un **tope, no una meta de gasto**.

### CPL máximo según la conversión real (umbral para cortar o escalar)

| Conversión lead → evento         | 2 % | 4 % | 6 % | **8 % (supuesto)** | 10 % | 15 % |
| -------------------------------- | --- | --- | --- | ------------------ | ---- | ---- |
| CPL máximo (S/ 164 × conversión) | 3.3 | 6.5 | 9.8 | **13.1**           | 16.4 | 24.5 |

### CAC y CPL máximos por segmento (5 % del ticket del segmento, conversión 8 %)

| Segmento y día          | Ticket sin IGV (modelo) | CAC máx. (5 %) | CPL máx. |
| ----------------------- | ----------------------- | -------------- | -------- |
| Boda / social V-S-D     | 4,233                   | 212            | 16.9     |
| Boda / social L-J       | 2,700                   | 135            | 10.8     |
| Corporativo V-S-D       | 3,933                   | 197            | 15.7     |
| Corporativo L-J         | 3,000                   | 150            | 12.0     |
| Full day familiar V-S-D | 2,167                   | 108            | 8.7      |
| Full day familiar L-J   | 1,350                   | 68             | 5.4      |

**Lectura:** el full day familiar, el segmento con la demanda más inmediata en verano, es el que **menos CPL tolera**. Bodas y corporativo V-S-D toleran más, pero su ciclo de venta es largo. La pauta familiar debe ser la más vigilada.

---

## 1. Segmentos, mensajes y creatividades

Reglas: titular ≤ 40 caracteres y texto ≤ 125 (`agents/growth.md`); sin cifras no confirmadas; aforo y precios se leen de `settings` y del tarifario. **Fotos y video: [PENDIENTE]** hasta terminar la remodelación. Mientras tanto: contenido "detrás de cámaras" de la obra, planos y textos. Nada de fotos de terceros ni renders presentados como reales.

| Segmento                                            | Momento                                       | Mensaje central                                                          | Prueba                                                                                                         |
| --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Full day familiar** (hasta 60, exclusivo)         | Ahora → mar-2027 (verano)                     | "La casa entera para ustedes: piscina, jardín y parrilla, sin compartir" | Exclusividad frente al club masivo (day-pass no exclusivo de S/ 40–80 por adulto en Cieneguilla, benchmark §1) |
| **Corporativo** (full day, team building, offsites) | Ene–mar (kick-offs) y L-J todo el año         | "Tu equipo fuera de la oficina, con la logística resuelta"               | Un solo grupo por día, factura con IGV, fechas L-J con tarifa propia                                           |
| **Bodas y sociales** (60–150)                       | Captación todo el año; eventos desde may-2027 | "Tu boda en el campo, a tu manera"                                       | Formato boutique frente a fundos de 200–800; proveedores libres; precio claro                                  |

### Anuncios sugeridos (borradores)

| Segmento    | Titular                            | Texto                                                                                                     | Formato / creatividad                                                   | CTA                |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------ |
| Full day    | La casa entera para tu familia     | Piscina, jardín y parrilla solo para ustedes, sin compartir con otros grupos. Pachacámac, al sur de Lima. | Video vertical 15 s: llegada, piscina, parrilla **[PENDIENTE video]**   | WhatsApp           |
| Full day    | Tu cumpleaños con piscina privada  | Full day exclusivo para tu grupo. Consulta tu fecha y recibe tu cotización por WhatsApp.                  | Carrusel: piscina, jardín, parrilla, terraza **[PENDIENTE fotos]**      | WhatsApp           |
| Full day    | Este verano, full day privado      | Separa tu sábado o domingo de enero a marzo con adelanto y garantía reembolsable.                         | Imagen estática con calendario "fechas de verano"                       | Ver disponibilidad |
| Corporativo | Full day de equipo al sur de Lima  | Casa privada con jardín, piscina y parrilla en Pachacámac. Fechas de lunes a jueves con tarifa especial.  | Imagen de grupo en jardín **[PENDIENTE]**                               | Cotizar            |
| Corporativo | Team building sin salir de Lima    | Un solo grupo por día, factura electrónica con IGV y tus proveedores o aliados que te recomendamos.       | Carrusel "cómo es un día" (llegada, dinámica, almuerzo, piscina)        | Cotizar            |
| Corporativo | Arranca el año fuera de la oficina | Kick-off u offsite de verano en un espacio exclusivo en Pachacámac. Escríbenos y cotiza en minutos.       | Video corto con texto en pantalla                                       | WhatsApp           |
| Bodas       | Tu boda en el campo, a tu manera   | Jardín, terraza y piscina en Pachacámac. Un solo evento por día y libertad para elegir tus proveedores.   | Video "detrás de cámaras" de la remodelación → fotos reales al terminar | Agendar visita     |
| Bodas       | Precios claros para tu boda 2027   | Mira el rango de tu fecha antes de visitarnos. Oasis Pachacámac, un espacio SAWA.                         | Imagen con el cotizador rápido de la web                                | Cotizar            |
| Bodas       | ¿Ya tienes planner? Trae tu equipo | Nosotros hacemos que el espacio funcione; ustedes hacen que el evento sea único. Agenda tu visita.        | Imagen de mesa montada **[PENDIENTE]**                                  | Agendar visita     |

---

## 2. Canales

| Canal                           | Rol en los 90 días                                                  | Formato                                                                                                       | Estado / vigencia                                                                                                          | Fuente                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Programa de planners**        | **Prioritario** (sin costo fijo)                                    | Comisión 5 % por evento cobrado                                                                               | Activo en el portal                                                                                                        | [Programa](261018%20Programa%20de%20planners.md)                                                                 |
| **Meta (Facebook / Instagram)** | Principal en pauta para full day y corporativo de verano            | Click-to-WhatsApp (CTWA); lead form o WhatsApp para bodas                                                     | Disponible                                                                                                                 | CPL Perú S/ 8–120; WhatsApp calificado S/ 3–40; Lima S/ 25–60 con presupuestos chicos (research §5a, 18/10/2026) |
| **Google Search**               | Captar demanda con intención alta                                   | Búsqueda: "local para eventos Pachacámac", "full day con piscina Lima sur", "local team building Lima", marca | Disponible. **Volumen y CPC reales: por verificar en Keyword Planner**                                                     | CPC Perú US$ 0.47 promedio (Statista vía Merca2.0); S/ 0.50–10 según sector (research §5b)                       |
| **TikTok**                      | Orgánico (contenido de la obra y del local); pauta solo como prueba | Video vertical                                                                                                | **Presupuesto mínimo de campaña de TikTok Ads: por verificar** antes de activar; si no cabe en S/ 100, queda solo orgánico | Research §5c (solo evidencia cualitativa)                                                                        |
| **Google Business Profile**     | Base del SEO local y de la reputación                               | Ficha verificada, fotos, publicaciones de Novedad/Oferta/Evento, reseñas                                      | **Crear o verificar ya**: puede tardar hasta un mes en aparecer                                                            | Ayuda oficial de Google (research §6, 18/10/2026)                                                                |
| **Directorios de bodas**        | Fichas gratuitas como enlaces y vitrina                             | Escaparate gratuito                                                                                           | Ver la tabla siguiente                                                                                                     | Research §1                                                                                                      |

**Google Business Profile, reglas clave:** nombre real tal como figura en el letrero ("Oasis Pachacámac"; agregar "Un espacio SAWA" solo si así figura), sin palabras clave en el nombre; pocas categorías y específicas; pedir reseñas a todos los clientes por igual con enlace o QR, **sin incentivos** ni cuotas; responder en 24–72 h; no condicionar la comisión de planners a reseñas.

### Directorios de bodas de Lima: vigencia

| Directorio                                 | Estado                                                                                                                                                                                                                                         | Acción                                                                                                                                          | Fuente y fecha                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Matrimonio.com.pe** (The Knot Worldwide) | **No verificado.** Ninguna fuente confirma que haya cerrado; la fecha de cierre "29/12/2025" solo aparece en fuentes sobre **Matrimonios.cl (Chile)**. Tampoco se pudo confirmar que siga activo (el sitio no se pudo abrir desde esta sesión) | **Verificar a mano antes de invertir.** Sin presupuesto asignado. Si está activo: escaparate gratuito y pedir por escrito la cotización Premium | WebSearch, 18/10/2026 (ver la corrección en el [benchmark](research/261018%20Benchmark%20de%20competidores.md) y en [Canales](research/261018%20Canales%20y%20planners.md)) |
| Zankyou Perú                               | Cerrado (integrado a Matrimonio.com.pe desde el 30/04/2024, según su propia página)                                                                                                                                                            | Solo como lista histórica de planners                                                                                                           | Research §1, 18/10/2026                                                                                                                                                     |
| Matrimonio.pe                              | Activo según extractos de búsqueda                                                                                                                                                                                                             | Alta gratuita; consultar la tarifa de publicidad                                                                                                | Research §1, 18/10/2026 · reconfirmar al dar de alta                                                                                                                        |
| InEventos.com (Perú)                       | Activo ("Alta Empresa GRATIS")                                                                                                                                                                                                                 | Alta gratuita, bodas **y corporativo**                                                                                                          | Ídem                                                                                                                                                                        |
| BodasPlanner.com/pe                        | Activo; solo 2 proveedores en Pachacámac                                                                                                                                                                                                       | Alta gratuita (poca competencia)                                                                                                                | Ídem                                                                                                                                                                        |
| Nupcia.pe                                  | Activo (volumen chico)                                                                                                                                                                                                                         | Alta gratuita                                                                                                                                   | Ídem                                                                                                                                                                        |
| Tuboda.pe                                  | Activo                                                                                                                                                                                                                                         | Alta gratuita; prospectar planners                                                                                                              | Ídem                                                                                                                                                                        |
| Bodas.com.pe                               | No encontrado                                                                                                                                                                                                                                  | Ninguna                                                                                                                                         | Ídem                                                                                                                                                                        |

---

## 3. Presupuesto y reparto

Tope mensual: **S/ 1,500** (`settings.monthly_ad_budget`, S09). Solo el admin lo cambia en **/admin/configuracion**; los cambios en Meta y Google los aplica una persona (ningún agente).

| Canal                                                        | Dic-2026  | Ene-2027  | Feb-2027  | Objetivo                                  |
| ------------------------------------------------------------ | --------- | --------- | --------- | ----------------------------------------- |
| Meta CTWA · full day familiar + corporativo de verano        | 700       | 700       | 500       | Conversaciones calificadas → separaciones |
| Google Search · intención alta + marca                       | 450       | 450       | 450       | Leads de cotización                       |
| Meta · bodas (lead form / WhatsApp)                          | 150       | 150       | 300       | Visitas para bodas 2027                   |
| TikTok · prueba (solo si el mínimo cabe)                     | 100       | 100       | 100       | Medir costo por conversación              |
| Reserva / experimentos (boosts, refuerzo de lo que funcione) | 100       | 100       | 150       | —                                         |
| **Total (tope)**                                             | **1,500** | **1,500** | **1,500** | **S/ 4,500 en 90 días**                   |

Ajuste frente al research §7 (800 / 500 / 150 / 50): se separan S/ 100 para probar TikTok y se baja Meta CTWA, porque el full day familiar es el segmento con menor CPL tolerable. En febrero el peso pasa a bodas (picos de mayo) y se reduce el full day, que termina con el verano. **Si se activan las reglas de corte, el dinero no gastado no se reasigna por obligación.**

---

## 4. Estacionalidad

| Periodo                 | Qué pasa                                                                                                                     | Implicancia                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Oct–nov 2026            | Remodelación; corporativo de fin de año ya reservado en el mercado (Kuai recomienda reservar con 6–8 semanas)                | Preapertura sin pauta: GBP, directorios y planners                                                 |
| 30/11–16/12             | Preventa                                                                                                                     | Pauta de full day y corporativo para fechas de enero a marzo                                       |
| **17/12/2026 (jueves)** | **Reapertura** (S01, por confirmar)                                                                                          | Publicación de Evento en GBP; contenido de reapertura                                              |
| Dic–mar                 | **Temporada alta** (`high_season_months` = 12, 1, 2, 3)                                                                      | Full day familiar y corporativo de verano. Feriados: 25/12 y 01/01 se tarifan como domingo/feriado |
| Feb, may y set          | Meses con más matrimonios: may y feb en Lima y Callao (INEI, dato de 2012); feb y set en Perú (INEI, 2023). Ver research §5c | Las bodas captadas en el verano se realizan desde mayo de 2027                                     |
| Mar                     | Fin del verano                                                                                                               | Revisión de los 90 días y paso a bodas y corporativo L-J                                           |

---

## 5. KPIs

| KPI                                 | Fórmula                                                           | Umbral (supuestos)                                     | Dónde se ve                                   |
| ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| **CPL**                             | Inversión ÷ leads calificados (con fecha, tipo de evento y aforo) | ≤ CPL máximo del segmento (§0); promedio ≤ S/ 13       | Dashboard (leads por campaña con UTM)         |
| **CAC directo**                     | Inversión del canal ÷ eventos directos separados o más            | ≤ 5 % del ticket del segmento; promedio ≤ S/ 164       | Dashboard: "CAC vs 5 % del ticket" con alerta |
| **ROAS**                            | Alquiler sin IGV de eventos atribuidos ÷ inversión                | **≥ 20×** (equivale a CAC ≤ 5 % del ticket)            | Dashboard                                     |
| CAC vs comisión                     | CAC directo − 5 % del ticket                                      | ≤ 0                                                    | Alerta del dashboard                          |
| Costo por conversación (CTWA)       | Inversión ÷ conversaciones iniciadas                              | Medir; no equivale a lead calificado                   | Meta Ads                                      |
| Lead → visita y visita → separación | Conteo por etapa del CRM                                          | Medir; recalcular el CPL máximo con la conversión real | CRM                                           |
| Primera respuesta                   | Minutos hasta la primera respuesta                                | < 15 min en horario comercial (S11)                    | Alerta SLA                                    |
| Ocupación                           | Días vendidos ÷ días disponibles, V-S-D vs L-J                    | Fin de semana 50 % al mes 3 (S10)                      | Dashboard                                     |

**Requisitos de medición antes de gastar un sol:** Meta Pixel, GA4 y conversión de Google Ads con los eventos `lead_submit`, `whatsapp_click`, `availability_check` y `quote_view`; UTM en todos los anuncios (`utm_source` = facebook, instagram, google, tiktok o gbp · `utm_medium` = cpc u organic · `utm_campaign` = segmento-objetivo-canal, p. ej. `fd-verano-meta` · `utm_content` = id de la creatividad); campañas e inversión cargadas en el back-office para que el dashboard calcule CAC y ROAS.

---

## 6. Reglas de corte y escalamiento

Aplican por conjunto de anuncios (Meta) o grupo de anuncios (Google). **Muestra mínima para decidir: ≥ S/ 100 gastados y ≥ 7 días.** El umbral es el CPL máximo del segmento (§0).

| #   | Condición                                                                                                                                  | Acción                                                                                                               | Quién                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | 0 leads calificados con la muestra mínima                                                                                                  | **Pausar**                                                                                                           | Persona que opera la cuenta             |
| 2   | CPL > 2 × umbral                                                                                                                           | **Pausar**                                                                                                           | Ídem                                    |
| 3   | CPL entre 1 y 2 × umbral                                                                                                                   | Cambiar creatividad o segmentación y dar 7 días más; si sigue sobre el umbral, pausar                                | Ídem                                    |
| 4   | CPL ≤ umbral con ≥ 5 leads calificados                                                                                                     | Escalar +20 % por semana **dentro del tope mensual**                                                                 | Propone growth; aprueba el admin        |
| 5   | CTR de enlace < 1 % tras 3,000 impresiones (menos de la mitad del 2.46 % promedio global de Meta, research §5a) o frecuencia > 3 en 7 días | Reemplazar la creatividad                                                                                            | Ídem                                    |
| 6   | Google: palabra clave con ≥ 30 clics y 0 leads                                                                                             | Pausarla; revisar términos de búsqueda cada semana y agregar negativas (empleo, "gratis", alquiler para vivir, etc.) | Ídem                                    |
| 7   | Más del 50 % de los leads de una campaña no califican                                                                                      | Revisar segmentación y formulario                                                                                    | Ídem                                    |
| 8   | Más del 20 % de los leads sin respuesta en 15 min                                                                                          | **No escalar**: el problema es de atención, no de pauta                                                              | Ops                                     |
| 9   | **Día 45:** CAC directo acumulado > S/ 164 (o > 5 % del ticket del segmento) y el pipeline no lo corrige                                   | Bajar la pauta a **S/ 500/mes** (solo Google Search de intención alta + marca) y pasar el esfuerzo a planners        | Decide el admin en /admin/configuracion |
| 10  | Bodas (ciclo largo)                                                                                                                        | Medir costo por visita agendada; tope de S/ 150–300/mes y sin escalar hasta tener la tasa visita → separación        | Ídem                                    |

Las reglas son propuestas operativas, no benchmarks; se ajustan con los datos de las primeras 3 semanas.

---

## 7. Calendario semana a semana

### Preapertura (sin pauta pagada)

| Semana | Fechas      | Acciones                                                                                                                                 |
| ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| P1     | 19/10–25/10 | Crear o verificar Google Business Profile. Verificar a mano el estado de Matrimonio.com.pe. Ola 1 de planners (Prioridad A)              |
| P2     | 26/10–01/11 | Altas gratuitas en InEventos, BodasPlanner, Matrimonio.pe, Nupcia y Tuboda (reconfirmar vigencia). Keyword Planner: volumen y CPC reales |
| P3     | 02/11–08/11 | Tracking (Pixel, GA4, conversión de Ads) probado en las landings. Ola 2 de planners + agencias de team building                          |
| P4     | 09/11–15/11 | Contenido orgánico de la obra en IG y TikTok (2–3 piezas por semana). Verificar el presupuesto mínimo de TikTok Ads                      |
| P5     | 16/11–22/11 | Armar cuentas, audiencias y campañas en borrador con UTM. Ola 3 de planners                                                              |
| P6     | 23/11–29/11 | Aprobación del admin de presupuesto y anuncios. Cargar campañas en el back-office                                                        |

### 90 días de pauta (30/11/2026–28/02/2027)

| Sem. | Fechas      | Foco                            | Acciones y revisiones                                                                                                |
| ---- | ----------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1    | 30/11–06/12 | Preventa                        | Lanzar Meta CTWA (full day y corporativo de verano) y Google Search. Publicación de Evento "Reapertura 17/12" en GBP |
| 2    | 07/12–13/12 | Ajuste                          | Primera lectura: CTR, CPC, costo por conversación. Negativas en Google. Open house de planners (según obra)          |
| 3    | 14/12–20/12 | **Reapertura 17/12**            | Contenido de reapertura; reemplazar creatividades por fotos reales si ya existen. Bodas: activar lead form           |
| 4    | 21/12–27/12 | **Revisión del día 21** (21/12) | CPL real vs umbral por segmento; mover dinero entre Meta y Google. Navidad: gasto mínimo el 24–25/12                 |
| 5    | 28/12–03/01 | Fechas de enero                 | Empujar fines de semana libres de enero (full day). Año Nuevo: gasto mínimo el 31/12–01/01                           |
| 6    | 04/01–10/01 | Corporativo                     | Mensajes de kick-off y offsite L-J; seguimiento a agencias de team building                                          |
| 7    | 11/01–17/01 | **Revisión del día 45** (14/01) | CAC directo acumulado vs S/ 164; aplicar la regla 9 si corresponde. Medir planners activos y sus leads               |
| 8    | 18/01–24/01 | Refresco                        | Nuevas creatividades (fatiga). Fotos de eventos reales solo con autorización                                         |
| 9    | 25/01–31/01 | Cierre de enero                 | CAC y ROAS por campaña; reparto de febrero (más peso a bodas)                                                        |
| 10   | 01/02–07/02 | Giro a bodas                    | Bodas 2027 (picos de mayo) y corporativo de marzo; full day familiar solo con CPL bajo el umbral                     |
| 11   | 08/02–14/02 | San Valentín                    | Mensajes de pedida de mano y bodas; visitas al local los fines de semana                                             |
| 12   | 15/02–21/02 | **Revisión del día 75** (13/02) | Bajar el full day familiar de cara a marzo; preparar el plan de mar–may                                              |
| 13   | 22/02–28/02 | **Cierre de los 90 días**       | Informe: CPL, CAC, ROAS, mezcla de canales y ocupación. Decidir con el admin el presupuesto del siguiente trimestre  |

---

## 8. Vacíos

- Estado real de Matrimonio.com.pe (verificar a mano).
- Volumen de búsqueda y CPC reales (Keyword Planner) y curva de Google Trends para "full day", "team building" y "local para matrimonio".
- Presupuesto mínimo de TikTok Ads.
- No hay benchmarks de CPL específicos de bodas o venues en Perú (research §5a): los umbrales salen del modelo, no del mercado.
- Fotos y video del local **[PENDIENTE]**; sin ellos, el rendimiento de Meta y TikTok será menor.
- La conversión lead → evento (8 %) y la mezcla de canales son supuestos: recalcular el CPL máximo con datos reales a partir de la semana 4.
