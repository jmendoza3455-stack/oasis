# Laboratorio de marketing — Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 19/10/2026 · **Estado:** construido; mide desde la primera pieza publicada
- **Relacionados:**
  - [Equipo de marketing](261019%20Equipo%20de%20marketing.md)
  - [Voz del cliente](261019%20Voz%20del%20cliente.md)
  - [Economía de fechas](261019%20Economia%20de%20fechas.md)
- **Código:** `lib/marketing/{links,stats,ingest}.ts`, `app/r/[code]/route.ts`, `/admin/marketing` → Laboratorio

El equipo no opina sobre qué funciona: lo mide. Este documento fija **cómo se mide, con cuánta muestra y cuándo se concluye**, para que nadie (persona ni agente) declare un ganador con 200 vistas.

## 1. Atribución por pieza

Cada pieza tiene su código (`r07`, `c03`…) y sus propios links cortos:

| Link                                                | Lleva a                                      | Cómo queda registrado                                                       |
| --------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| `/r/r07?s=instagram` (también `tiktok`, `facebook`) | Calendario de la web                         | Clic en `marketing_link_clicks`; el lead lleva `utm_content = r07`          |
| `/r/r07?s=instagram&to=wa`                          | WhatsApp con "(código pieza-r07)" ya escrito | Clic registrado; el Recepcionista guarda `utm_campaign = pieza-r07` al lead |

- **Dónde se ven:** `/admin/marketing` → Publicadas: clics web, clics a WhatsApp, leads y separaciones de cada pieza (vista `marketing_attribution`). También en `pnpm marketing snapshot` → `attribution`.
- **Dónde se ponen:** sticker de enlace en la historia que comparte el Reel, comentario fijado, bio (rotando la pieza de la semana) y botón de Google Business. Instagram no permite links en el caption: ahí va "link en la bio" y el código no se escribe.
- **Privacidad:** el clic guarda solo código, red, destino y hora. Sin IP, navegador ni cookies (Ley 29733). Las vistas previas de Instagram, WhatsApp y buscadores no cuentan (se filtran por agente de usuario).
- **Límite honesto:** quien ve el Reel y luego busca "Oasis Pachacámac" en Google no queda atribuido a la pieza. La atribución por pieza es un **piso**, no el total; el total de redes se ve por `utm_source` y en la pregunta "¿Cómo nos conociste?" del cotizador.

## 2. Pruebas de gancho (orgánicas)

- **Diseño:** un Reel por semana en dos versiones con el **mismo cuerpo** y distinto gancho (texto y primera toma). Código `r07` y `r07b`.
- **Publicación:** la b va como **Reel de prueba** de Instagram (se muestra solo a no seguidores) para no saturar a la audiencia.
- **Métrica:** retención de los 3 primeros segundos = 1 − tasa de salto (estadísticas del Reel en Instagram). André la copia a los 7 días junto con las reproducciones.
- **Regla de decisión (bayesiana, prior uniforme):**
  - Se concluye solo con **≥ 1,000 reproducciones por versión**.
  - Gana B si P(B mejor que A) ≥ 90 %; gana A si ≤ 10 %; en el medio, **sin diferencia clara** (y se dice así).
  - La página calcula todo: `/admin/marketing` → Laboratorio → Pruebas de gancho.
- **Por qué bayesiana y no "significancia":** con muestras chicas responde la pregunta útil ("¿qué tan probable es que B sea mejor?") y no invita a mirar el p-valor cada día hasta que salga.
- **Qué se aprende:** Growth registra el ganador como aprendizaje solo si la prueba concluyó. Tres ganchos ganadores del mismo tipo (pregunta, dato, antes/después…) se vuelven regla para el redactor.

## 3. Pruebas pagadas (cuando André apruebe el presupuesto)

Para probar **ángulos** (qué mensaje mueve a escribir), no para optimizar detalles.

| Parámetro      | Valor                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Presupuesto    | S/ 30–50 por variante, dentro de un tope mensual que **André aprueba** (propuesta: S/ 200–300 al mes)         |
| Herramienta    | Prueba A/B de Meta (Administrador de anuncios), mismo público, misma ubicación (Reels), 2 variantes, 4–7 días |
| Variantes      | Mismo video, distinto gancho o ángulo (exclusividad, transparencia de precio, facilidad de separar)           |
| Métrica        | Clics al link de la pieza (n = impresiones, éxitos = clics) y costo por conversación de WhatsApp              |
| Decisión       | La misma regla del §2 con `abTest` (P ≥ 90 %)                                                                 |
| Quién la lanza | André, en Meta. Los agentes **proponen**; nunca tocan presupuesto ni cuentas (regla 6)                        |

**Qué puede y qué no puede detectar:** con S/ 40 (≈ 3,000 impresiones a CPM de S/ 12–15) y un CTR de 1 %, una mejora de **+50 %** (1.0 % → 1.5 %) se detecta con P ≈ 96 %. Una de **+20 %** queda en P ≈ 76 %: "sin diferencia clara". Las pruebas pagadas sirven para elegir entre ángulos muy distintos, no para afinar.

## 4. Calibración del director creativo

El director solo deja pasar piezas con "aprobar" (≥ 80), así que no hay un "rechazado por el director" con qué comparar a André: el kappa de Cohen no se puede calcular. Se mide así:

| Medida                  | Qué responde                                                       | Mínimo para concluir | Meta                  |
| ----------------------- | ------------------------------------------------------------------ | -------------------- | --------------------- |
| Aprobadas a la primera  | ¿Lo que pasa el director, André lo aprueba sin cambios?            | 1 decisión           | ≥ 70 %                |
| AUC                     | ¿Un puntaje más alto anticipa que André apruebe a la primera?      | 20 decisiones        | ≥ 0.70                |
| Puntaje vs rendimiento  | ¿Un puntaje más alto anticipa más guardados+compartidos por 1,000? | 30 piezas medidas    | Spearman ≥ 0.30       |
| Auditoría ciega mensual | ¿André y el director puntúan igual con la misma rúbrica?           | 5 piezas al mes      | Diferencia media ≤ 10 |

- **Primera decisión:** la BD guarda la primera decisión de André sobre cada versión (`first_decision`), aunque luego se reemplace.
- **Auditoría ciega (primer lunes del mes):** Growth elige 5 piezas al azar del mes (incluye las que el director no dejó pasar, que quedan en la bitácora). André las puntúa con la rúbrica **sin ver** el puntaje del director. Si la diferencia media pasa de 10 puntos, o en 2 de 5 discrepan sobre el corte de 80, se ajusta la rúbrica con esos ejemplos en `agents/director-creativo.md`.
- **Si el AUC queda bajo 0.60 con muestra suficiente:** el puntaje no está prediciendo nada; se revisa qué criterios separan las piezas que André cambia.

## 5. Fuentes crudas (lo que el equipo no puede descargar solo)

El entorno de los agentes no accede a Instagram, TikTok, la Biblioteca de anuncios de Meta ni Google Trends. En vez de reemplazarlos con resúmenes de buscadores, el equipo **procesa los archivos que André o Carlos descargan** (minutos). Guarda los archivos crudos fuera del repositorio (por ejemplo, `out/crudo/`, que Git ignora).

| Fuente                          | Cómo se descarga                                                                                                                        | Comando                                                 | Qué sale                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Chats de WhatsApp               | En cada chat: ⋮ → Más → Exportar chat → **Sin archivos**                                                                                | `pnpm marketing voc <carpeta> --negocio "Carlos,Oasis"` | Chats anonimizados en `out/voc/` + temas y frases textuales        |
| Google Trends                   | trends.google.com → Perú, últimos 5 años → términos ("local para eventos", "casa de campo", "full day", "matrimonio campestre") → ⤓ CSV | `pnpm marketing trends <archivo.csv>`                   | Índice mensual (100 = promedio) y meses pico por término           |
| Publicaciones de la competencia | 20 minutos al mes: últimas 12 publicaciones de 5 competidores del benchmark, en `docs/marketing/plantillas/competencia.csv`             | `pnpm marketing competencia <archivo.csv>`              | Medianas de interacciones por competidor, formato y tema           |
| Biblioteca de anuncios de Meta  | facebook.com/ads/library → Perú → "Todos los anuncios" → buscar cada competidor; anotar en `docs/marketing/plantillas/anuncios.csv`     | `pnpm marketing anuncios <archivo.csv>`                 | Anuncios activos 21+ días (probablemente rentables) y sus llamados |

Los chats nunca se suben sin anonimizar: la herramienta reemplaza autores por "Oasis" y "Cliente N" y borra celulares, correos, DNI, RUC y nombres.
