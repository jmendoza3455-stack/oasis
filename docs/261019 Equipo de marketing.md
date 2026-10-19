# Equipo de marketing — Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 19/10/2026 · **Estado:** construido; se activa con el go-live (26/10) y dos ajustes del entorno (§8)
- **Relacionados:**
  - [Plan de contenido 30 días](261019%20Plan%20de%20contenido%20redes%2030%20dias.md)
  - [Benchmark digital](research/261019%20Benchmark%20digital%20de%20competidores.md)
  - [Plan de pauta 90 días](261018%20Plan%20de%20pauta%2090%20dias.md)
  - [Agentes](agentes.md)
  - [Laboratorio de marketing](261019%20Laboratorio%20de%20marketing.md) (atribución, pruebas, calibración, fuentes crudas)
  - [Voz del cliente y mapa de mensajes](261019%20Voz%20del%20cliente.md)
  - [Economía de fechas](261019%20Economia%20de%20fechas.md)
  - [Derechos de imagen (borradores)](<261019%20Derechos%20de%20imagen%20(borradores).md>)
  - [Brief de sesión profesional](261019%20Brief%20de%20sesion%20profesional.md)
  - Guías del equipo:
    - [editor de video](../agents/editor-video.md)
    - [diseñador](../agents/disenador.md)
    - [director creativo](../agents/director-creativo.md)
    - [redactor](../agents/contenido.md)
    - [estratega](../agents/growth.md)

## 1. Misión y métrica norte

**Misión:** llenar el calendario con los clientes correctos a menor costo que la pauta y que las comisiones.

**Métrica norte:** fechas consultadas desde redes. Es el evento `calendar_day_select` con `utm_source` de una red, y luego el lead y la separación. Seguidores, likes y alcance son métricas de diagnóstico, no de éxito.

| Nivel            | Métrica                                                          | Dónde se ve                         |
| ---------------- | ---------------------------------------------------------------- | ----------------------------------- |
| Norte            | Fechas consultadas y leads desde redes                           | GA4 por fuente · CRM (`utm_source`) |
| Por pieza        | Clics, leads y separaciones de cada pieza (links `/r/<código>`)  | `/admin/marketing` → publicadas     |
| Calidad de pieza | Guardados y compartidos por cada 1,000 de alcance; clics al link | `/admin/marketing` → resultados     |
| Proceso          | Piezas aprobadas a la primera; días de clip a publicación        | `/admin/marketing`                  |
| Negocio          | Separaciones con origen en redes; costo por separación           | CRM · dashboard                     |

## 2. El equipo

| Rol               | Quién                                     | Hace                                                                        | Cuándo                |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------------------- | --------------------- |
| Jefe de marketing | **André**                                 | Aprueba, publica (elige la música en la app), carga resultados a los 7 días | 10 min al día         |
| Estratega         | Agente **Growth**                         | Pauta, aprendizajes con datos, ganador de la prueba de ganchos              | Lunes 10:00           |
| Redactor          | Agente **Contenido**                      | Plan de la semana, ganchos A y B, captions, respuestas a reseñas, SEO local | Lunes 11:00           |
| Editor de video   | Agente **Editor**                         | Monta los Reels desde los clips con el motor de la marca                    | Martes y jueves 09:00 |
| Diseñador         | Agente **Diseñador**                      | Carruseles y publicaciones de Google Business                               | Martes 10:00          |
| Director creativo | Subagente independiente                   | Revisa cada pieza con la rúbrica; nada llega a André bajo 80                | En cada entrega       |
| Camarógrafo       | **Carlos** (luego, el encargado en sitio) | Graba clips según la lista de tomas y los sube desde el celular             | Semanal               |

## 3. Ritmo semanal

| Día             | Qué pasa                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Lunes           | Growth publica aprendizajes; Contenido propone el plan de la semana y las tomas que faltan           |
| Martes          | Editor (Reel 1 y su variante de gancho) y Diseñador (carrusel y Google Business) entregan a revisión |
| Miércoles       | André revisa en `/admin/marketing`: aprueba o pide cambios con un comentario                         |
| Jueves          | Editor rehace lo pedido y entrega el Reel 2                                                          |
| Lun · mié · vie | André publica lo aprobado (horario de mayor actividad según las estadísticas de la cuenta)           |
| A los 7 días    | André copia los resultados de cada pieza; el lunes siguiente Growth los convierte en aprendizajes    |

## 4. Estándares de calidad (dos puertas)

**1. Control técnico automático:** `pnpm reels:render` y `pnpm design:render`. Lo que se mide sin opinar:

| Pieza   | Qué se verifica                                                                                                                                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Video   | 1080×1920, 30 fps, H.264/AAC, volumen a −14 LUFS, sin pantallas negras, 12–35 s, gancho en los primeros 2 s, textos dentro de las zonas que no tapa Instagram, ≤ 17 caracteres/s, llamado a la acción, portada con el gancho |
| Gráfica | Cada texto entra en su lámina (verificado en el render real), portada y cierre, límites de texto, sin superlativos                                                                                                           |
| Ambas   | Cualquier cifra se marca para verificarla contra la web o Configuración                                                                                                                                                      |

**2. Director creativo:** rúbrica de 10 criterios (gancho, una idea, prueba del posicionamiento, **veracidad**, marca, legibilidad, ritmo, llamado, pertinencia y aprendizaje). Pasa con 80 o más, ningún criterio bajo 6 y veracidad 10/10. La herramienta de entrega rechaza la pieza si no cumple.

## 5. Cómo aprende el equipo

Reglas completas en el [Laboratorio de marketing](261019%20Laboratorio%20de%20marketing.md).

- **Atribución por pieza:** cada pieza tiene sus links (`/r/<código>`, web y WhatsApp). La página muestra clics, leads y separaciones de cada una.
- **Prueba de ganchos cada semana:** un Reel en dos versiones (`r07` y `r07b`). La b se publica como _Reel de prueba_ de Instagram (solo para no seguidores). Se concluye con ≥ 1,000 reproducciones por versión y 90 % de probabilidad (regla bayesiana); si no, "falta muestra".
- **Calibración del director creativo:** aprobadas a la primera, AUC (≥ 20 decisiones), correlación con el rendimiento (≥ 30 piezas) y auditoría ciega mensual de André.
- **Qué segmento empuja cada pieza:** el que más deja en el tipo de fecha que falta llenar ([Economía de fechas](261019%20Economia%20de%20fechas.md)).
- **De dónde salen los mensajes:** de las palabras de los clientes ([Voz del cliente](261019%20Voz%20del%20cliente.md)), no de la intuición.
- **Bitácora:** Growth registra cada lunes hasta 3 aprendizajes con datos (`aprendizaje` en `/admin/agentes`). Los demás agentes los leen antes de producir.
  - **Muestra mínima:** con menos de 3 piezas comparables no se concluye nada.
- **Regla de corte:** un formato que rinde bajo la mediana en 3 publicaciones seguidas se cambia.

## 6. Marca y límites (no negociables)

- **Tono:** cercano, sereno y concreto. Sin superlativos ni urgencia inventada.
- **Visual:** paleta Oasis, Cormorant Garamond para títulos y Figtree para textos (`assets/fonts`, licencia OFL), isotipo en el cierre.
- **Solo material real:**
  - Nada de fotos de otros locales, bancos de imágenes como propios, testimonios inventados ni caras de clientes o trabajadores sin permiso escrito.
  - Precios solo si "Publicar precios en la web" está activo.
  - Horarios de música solo cuando se valide S39.
- **Música:** se elige en la app al publicar (la biblioteca de Instagram y TikTok está licenciada solo dentro de la app). Los videos salen sin música, con el audio ambiente normalizado.
- **Nada se publica sin André.** Los agentes no tienen acceso a las cuentas de redes.

## 7. Herramientas

| Herramienta                                            | Para qué                                                                                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/marketing`                                     | Subir clips desde el celular (hasta 50 MB, en 1080p), revisar con puntajes, aprobar o pedir cambios, descargar, marcar publicada, cargar resultados |
| `pnpm marketing snapshot · fetch · submit`             | Contexto (con atribución, pruebas y calibración), descarga de clips y entrega de piezas a revisión (agentes)                                        |
| `pnpm marketing voc · trends · competencia · anuncios` | Fuentes crudas descargadas por André o Carlos: chats anonimizados, estacionalidad, competencia y anuncios activos                                   |
| Links de pieza `/r/<código>`                           | Atribuyen clics, leads y separaciones a cada pieza (web y WhatsApp)                                                                                 |
| `pnpm reels:render`                                    | Motor de edición de Reels con las plantillas de la marca                                                                                            |
| `pnpm design:render`                                   | Motor de carruseles e imágenes con las plantillas de la marca                                                                                       |
| GA4 + Microsoft Clarity                                | Embudo desde redes hasta la fecha consultada                                                                                                        |

## 8. Para encenderlo

1. **Entorno de los agentes** (lo hace André en Claude Code: menú del entorno → Editar):
   - Agregar `jpfwiusqvuvqhispcfag.supabase.co` en **Allowed domains**, para descargar clips y subir piezas.
   - Agregar como secretos del entorno `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (los mismos de Vercel).
   - Sin esto, los agentes de producción no ven los clips (S47).
2. **Material:** Carlos sube los primeros clips de la obra (lista de tomas del plan, §6).
3. **Cuentas de redes abiertas** y sus enlaces en Configuración → Web.
4. **Encendido:** las tareas del Editor y del Diseñador se activan en el D0 con los demás agentes.

## 9. Lo que este equipo no hace (todavía)

- **No publica ni lee comentarios o mensajes directos de las redes:** hace falta la API de Meta y TikTok, con verificación del negocio. Hoy André publica y responde.
- **No graba:** depende de los clips de Carlos.
- **No mide solo:** los resultados se copian a mano a los 7 días hasta conectar las estadísticas por API.
