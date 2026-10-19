# Voz del cliente y mapa de mensajes — Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 19/10/2026 · **Estado:** procedimiento listo; **sin datos reales todavía** (esperan los chats de Carlos y 6 entrevistas)
- **Relacionados:** [Laboratorio de marketing](261019%20Laboratorio%20de%20marketing.md) · [Plan de contenido](261019%20Plan%20de%20contenido%20redes%2030%20dias.md) · plantilla `docs/marketing/plantillas/mapa-de-mensajes.csv`

Los mejores mensajes no se inventan: se copian de cómo hablan los clientes. Este documento dice de dónde salen esas palabras, cómo se ordenan y cómo llegan a los ganchos y captions.

## 1. Fuentes, en orden de valor

| Fuente                                     | Qué aporta                                          | Meta inicial                      | Quién                             |
| ------------------------------------------ | --------------------------------------------------- | --------------------------------- | --------------------------------- |
| Entrevistas a clientes que separaron       | Por qué eligieron, qué casi los frena               | 3                                 | André (30 min c/u)                |
| Entrevistas a leads que no separaron       | Objeciones reales y a quién eligieron               | 2                                 | André                             |
| Entrevista a un planner                    | Qué piden sus clientes y qué los hace recomendar    | 1                                 | André                             |
| Chats de WhatsApp históricos de Carlos     | Primeras preguntas, dudas y palabras textuales      | Todos los de los últimos 12 meses | Carlos exporta; el equipo procesa |
| Reseñas de Google de la zona (competencia) | Qué se elogia y qué se critica en locales similares | 30 reseñas                        | Contenido                         |

## 2. Guía de entrevista (método "jobs to be done", 30 minutos)

Se graba solo con permiso, se reconstruye la **historia de la decisión** y no se piden opiniones sobre ideas ("¿te gustaría…?"). Pregunta por hechos y momentos.

1. **Contexto (3 min):** "Cuéntame del evento: qué celebraban, cuántos eran, cuándo fue."
2. **Primer pensamiento (5 min):** "¿Cuándo empezaste a pensar en dónde hacerlo? ¿Qué pasó ese día?"
3. **Búsqueda (7 min):** "¿Dónde buscaste? ¿Qué escribiste en Google o Instagram? ¿Qué locales viste? ¿Cuáles descartaste y por qué?"
4. **Decisión (7 min):** "¿Qué te hizo escribirnos? ¿Qué te dio confianza para separar? ¿Qué casi te hizo no hacerlo?"
5. **Ansiedades y costumbres (5 min):** "¿Qué te preocupaba (precio final, ruido, lluvia, distancia, horarios)? ¿Qué hubieras hecho si no nos encontrabas?"
6. **Después (3 min):** "¿Cómo se lo contaste a tu familia o amigos? ¿Qué palabra usarías para describir el lugar?"

**Las 4 fuerzas a buscar:** empuje (qué no funcionaba antes), atracción (qué los jaló), ansiedad (qué temían) y hábito (qué los retenía en lo de siempre).

**Reglas:** no vender durante la entrevista; no corregir al cliente; anotar las **frases textuales**; terminar con "¿hay algo que no te pregunté y debí preguntarte?".

**Agradecimiento:** por definir por André (no se ofrecen descuentos sin su aprobación, regla 6).

## 3. Mensaje para invitar (WhatsApp, lo envía André o Carlos)

> Hola [nombre], soy André de Oasis Pachacámac. Estamos mejorando cómo presentamos el local y nos ayudaría mucho escuchar cómo fue tu experiencia buscando dónde hacer tu evento. Son 30 minutos por llamada o videollamada, en el día y hora que te acomode. No es una venta. ¿Te animas? Si nos das permiso, la grabamos solo para tomar notas; no se publica ni se comparte.

## 4. Chats de WhatsApp

1. Carlos exporta cada chat (⋮ → Más → Exportar chat → **Sin archivos**) a una carpeta en su computadora o en un Drive privado.
2. `pnpm marketing voc <carpeta> --negocio "Carlos,Oasis Pachacámac"` (los nombres con los que responde el negocio).
3. Salen en `out/voc/` (fuera del repositorio): un archivo por chat con autores "Oasis" y "Cliente N", sin celulares, correos, DNI, RUC ni nombres, y `resumen.md` con los temas que tocan los clientes y sus primeras frases textuales.
4. La codificación automática es solo una primera lectura por palabras clave. La fina se hace en el mapa (§5).

**Datos personales:** los chats originales no se suben al repositorio ni al sistema. Lo que se analiza son las versiones anonimizadas.

## 5. Codificación y mapa de mensajes

Plantilla: `docs/marketing/plantillas/mapa-de-mensajes.csv`, una fila por cita.

| Columna           | Qué va                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| fuente            | entrevista, chat, reseña                                                                         |
| id_fuente         | E01, chat-007, reseña-12 (nunca nombres)                                                         |
| segmento          | boda, quinceañero, cumpleaños, corporativo, full day                                             |
| etapa             | primer pensamiento, búsqueda, decisión, después                                                  |
| tipo              | empuje, atracción, ansiedad, hábito, objeción, criterio de elección                              |
| cita_textual      | La frase tal cual                                                                                |
| codigo            | Etiqueta corta y reutilizable: `precio-claro`, `solo-nosotros`, `cerca-de-lima`, `miedo-lluvia`… |
| mensaje_candidato | Cómo lo diríamos nosotros, usando sus palabras                                                   |

**Procedimiento:**

1. **Primera pasada:** leer todo y crear códigos a medida (máximo 25).
2. **Segunda pasada:** unir códigos parecidos y recodificar todo con la lista final.
3. **Saturación:** si las 2 últimas entrevistas no agregan códigos nuevos, alcanza; si agregan, se hacen 2 más.
4. **Ranking:** frecuencia del código × valor del segmento (ver [Economía de fechas](261019%20Economia%20de%20fechas.md)): un código que aparece en bodas pesa más que uno que aparece en full day de lunes a jueves.

**El mapa resultante** (una página, lo mantiene Contenido):

- **Mensaje central:** una frase con las palabras del cliente.
- **3 pilares**, cada uno con su **prueba visible** (qué se muestra en video para que no sea solo un adjetivo).
- **Objeciones frecuentes** y la respuesta con hechos.
- **Palabras a usar y palabras a evitar** (las que usamos nosotros y el cliente no).

## 6. Cómo lo usa el equipo

- **Redactor (Contenido):** los ganchos A y B salen de citas reales del mapa; anota en la pieza qué código usa.
- **Director creativo:** el criterio 9 (pertinencia) vale 10 solo si la pieza responde a un código del mapa o a una fecha por llenar.
- **Growth:** cruza el código de cada pieza con su rendimiento: qué mensajes traen leads y separaciones, no solo guardados.

## 7. Estado

- Hoy no hay chats ni entrevistas en el sistema: el mapa está vacío y **no se completa con suposiciones**. Mientras tanto, el plan de contenido usa las preguntas frecuentes de la web.
- **Pendiente:** Carlos exporta los chats de los últimos 12 meses; André agenda las 6 entrevistas (contactos de Carlos).
