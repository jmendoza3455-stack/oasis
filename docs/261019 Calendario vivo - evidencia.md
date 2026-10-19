# Calendario vivo de disponibilidad: evidencia

- **Fecha:** 19/10/2026 · **Rama:** `feat/calendario-vivo` · **Decisiones:** OASIS.md §15.10
- **Qué es:** al elegir el tipo de evento, el cliente ve el mes con cada día **Libre / En espera / Ocupado**, leído en vivo de la BD, con precio "desde" por día si los precios públicos están activos. Tocar un día libre vuelve a verificarlo y muestra el rango y "Separar o cotizar esta fecha".
- **Regla de lectura:** cada afirmación de abajo tiene una prueba que se puede volver a correr. Lo que no se pudo verificar está en §6, con el motivo.

## 1. Fuentes primarias

| Fuente                                                        | Uso                                        | Estado                                        |
| ------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------- |
| Tablas `bookings`, `blocks`, `occupancy` (BD)                 | Estado de cada día y prueba de propiedad   | Usada. **Reveló un bug en producción** (§5.1) |
| Tarifario vigente (`rate_cards`) y `estimateRange`/`quote`    | Precio por día                             | Usada: misma función que el cotizador         |
| Tabla `holidays` contra la ley y el cálculo de la Pascua      | Feriados del horizonte                     | Usada. **Reveló un hueco** (§5.2)             |
| Historial de la operación anterior (agenda y chats de Carlos) | Anticipación real por segmento → horizonte | **No disponible todavía.** Script listo (§4)  |
| Usuarios reales del público objetivo                          | Usabilidad                                 | **Pendiente.** Guion listo (§7)               |

## 2. Escasez y ofertas, sin inventar urgencia

Todo lo que se muestra es un hecho calculado desde la BD. No hay contadores ficticios ni "¡últimas fechas!".

| Señal                                | Cómo se calcula                             | Por qué                                                                |
| ------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------- |
| "Sábados libres: 2 de 4" en cada mes | Sábados no pasados con estado libre / total | El sábado es la fecha escasa; el dato es verdadero y verificable       |
| "En espera" (rayado + reloj)         | Pre-reserva vigente (72 h)                  | Decisión de André: comunica demanda real; vuelve a libre sola si vence |
| "Oferta" (etiqueta) en el precio     | Promoción vigente del admin o tarifa L-J    | Mueve demanda a días de menor ocupación sin tocar precios              |
| "Temporada alta / baja"              | `high_season_months` en settings            | Explica por qué cambia el precio                                       |

**No se hace:** cuentas regresivas, "X personas viendo esta fecha" ni ocultar días libres para aparentar demanda.

## 3. Métrica de éxito e instrumentación

**Embudo:** ve el calendario → elige una fecha → deja sus datos → separa.

| Evento (GA4 y Microsoft Clarity)    | Cuándo                                                     |
| ----------------------------------- | ---------------------------------------------------------- |
| `calendar_view`                     | Primera carga del calendario, con el tipo de evento        |
| `calendar_month`                    | Cambio de mes                                              |
| `calendar_day_select`               | Toca un día libre (incluye si es oferta)                   |
| `calendar_unavailable_tap`          | Toca un día en espera u ocupado (mide demanda no atendida) |
| `availability_check` / `quote_view` | Verificación y rango mostrado                              |
| `lead_submit`                       | Deja sus datos (también va a Meta y a Google Ads)          |

- **Clarity** (mapas de calor y grabaciones anónimas, gratis) se carga solo con consentimiento de cookies.
- **Para activarlo:**
  1. Crear el proyecto en clarity.microsoft.com.
  2. Cargar `NEXT_PUBLIC_CLARITY_ID` en Vercel.
- **El paso final, "separa",** se mide en el CRM: lead → reserva Separada.

## 4. Horizonte del calendario

- **Hoy:** 18 meses (`public_calendar_months`, editable en Configuración → Web). Es un **supuesto (S44)** hasta medirlo.
- **Cómo se mide:**
  1. `pnpm analisis:anticipacion historial.csv`, con las columnas `fecha_consulta, fecha_evento, tipo`. Calcula la mediana, el p80 y el p95 de días de anticipación por segmento.
  2. Recomienda **p95 del segmento más anticipado + 1 mes**.
  3. Con `--db`, usa los leads reales que ya capta la web.
- **Con menos de 20 registros por segmento**, el script avisa que el p95 no es confiable.

## 5. Evidencia

| #   | Afirmación                                                                                                                    | Método                                                                                                                                                                                                                                                                                                                                | Resultado                                                                                                                          | Cómo repetirlo                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | El calendario coincide con las reservas y bloqueos en **todas** las fechas                                                    | Prueba de propiedad (fast-check) con 30 mundos aleatorios: bloqueos de 1–3 días, pre-reservas, reservas con adelanto validado, pernoctes, vencimientos y cancelaciones. Compara `public_availability` contra un recálculo directo desde `bookings`/`blocks` (sin `occupancy`) y contra `is_date_available`, en cada día de la ventana | ✅ 0 diferencias; se generaron días libres, en espera y ocupados                                                                   | `pnpm test:db` (`tests/db/calendar-property.test.ts`)                |
| 1b  | La prueba anterior detecta errores de verdad                                                                                  | **Mutación:** se reintrodujo el bug original de `is_date_available`                                                                                                                                                                                                                                                                   | ✅ La prueba falla y reduce al caso mínimo: un bloqueo de un día                                                                   | Ver §5.1                                                             |
| 2   | Si la fecha se ocupa mientras el cliente mira, no se le dice "libre"                                                          | E2E: se carga el mes, se bloquea la fecha desde la BD y se toca                                                                                                                                                                                                                                                                       | ✅ Avisa "se acaba de ocupar", refresca el mes (ocupado) y sugiere fechas libres; la alternativa está libre                        | `tests/e2e/calendar.spec.ts`                                         |
| 3   | La BD nunca acepta dos ocupaciones                                                                                            | Exclusion constraint + rechazos dentro de la prueba de propiedad                                                                                                                                                                                                                                                                      | ✅ Los conflictos se rechazan con `occupancy_no_overlap`                                                                           | `pnpm test:db`                                                       |
| 4   | Precio del calendario = mínimo del rango del cotizador, y el precio exacto de la cotización (el del PDF) cae dentro del rango | Prueba de propiedad: 200 tarifarios aleatorios × 18 meses × aforo × promociones, día por día                                                                                                                                                                                                                                          | ✅ Siempre iguales y siempre dentro                                                                                                | `tests/unit/domain/public-calendar.test.ts`                          |
| 4b  | Lo mismo en la web real                                                                                                       | E2E: el nombre de la celda dice "desde S/ 2,950" y el rango mostrado es S/ 2,950.00 – S/ 3,650.00                                                                                                                                                                                                                                     | ✅                                                                                                                                 | `tests/e2e/public.spec.ts`                                           |
| 5   | Sin datos de terceros                                                                                                         | E2E: ni el texto ni los nombres accesibles del calendario contienen nombres de clientes, tipo de evento ni planner                                                                                                                                                                                                                    | ✅                                                                                                                                 | `tests/e2e/calendar.spec.ts`                                         |
| 6   | Accesibilidad automática                                                                                                      | axe-core (WCAG 2.0/2.1 A y AA) en `/` con el calendario abierto y en `/bodas`                                                                                                                                                                                                                                                         | ✅ 0 violaciones (antes de corregir había 2, §5.3)                                                                                 | `tests/e2e/calendar.spec.ts`                                         |
| 7   | Uso completo solo con teclado                                                                                                 | E2E con el patrón grid de WAI-ARIA: flechas, Inicio/Fin, AvPág/RePág, Enter                                                                                                                                                                                                                                                           | ✅                                                                                                                                 | `tests/e2e/calendar.spec.ts`                                         |
| 8   | Estado sin depender del color                                                                                                 | Libre = precio y fondo; en espera = rayado + reloj; ocupado = tachado; feriado = punto; todo también en el nombre accesible                                                                                                                                                                                                           | ✅ Revisión en las capturas                                                                                                        | `test-results/calendario-*.png`                                      |
| 9   | Respuesta al tocar en un móvil de gama media                                                                                  | Event Timing API (base de INP) con CPU 4× más lenta y 4G lento (150 ms RTT, 1.6 Mbps), 7 interacciones                                                                                                                                                                                                                                | ✅ **Peor interacción: 136–152 ms** en dos corridas (meta < 200)                                                                   | `tests/e2e/calendar-perf.spec.ts` → `test-results/calendar-inp.json` |
| 10  | Rendimiento de las páginas                                                                                                    | Lighthouse móvil                                                                                                                                                                                                                                                                                                                      | ✅ Rendimiento 92–96, accesibilidad 100, buenas prácticas 100, SEO 100 en `/`, `/bodas`, `/corporativo`, `/full-day` y `/planners` | `pnpm lighthouse`                                                    |
| 11  | Feriados cargados para todo el horizonte                                                                                      | Prueba: la tabla contiene los feriados del D.L. 713 art. 6 y la Semana Santa calculada con la Pascua (algoritmo gregoriano, contrastado con fechas publicadas 2024–2038) para 2026–2028                                                                                                                                               | ✅ (tras cargar 2028, §5.2)                                                                                                        | `pnpm test:db` (`seed.test.ts`), `pnpm test`                         |
| 12  | En producción, cualquier diferencia se detecta sola                                                                           | Revisión diaria: `availability_mismatches()` en tramos de 60 días por todo el horizonte, más feriados faltantes. Si encuentra algo, sale en el correo diario del staff y en los logs de Vercel                                                                                                                                        | ✅ Implementado. Primera corrida en producción: mañana 08:00                                                                       | `server/automations.ts`                                              |

Totales de la rama: 90 tests de unidad (99.8 % de cobertura en dominio), 37 de BD y la suite E2E completa en desktop y móvil, todo en verde.

### 5.1 Bug en producción: las fechas bloqueadas salían como libres

- **Causa:** `not (bk.status = 'prebooked' and …)` da NULL cuando la ocupación es un bloqueo (sin reserva asociada). SQL descartaba la fila y la fecha aparecía libre.
- **A quién afectaba:**
  - El cotizador público (`is_date_available`).
  - Las fechas libres del portal (`free_dates`).
  - El calendario de planners (`get_availability`).
- **Qué no se rompió:** la doble reserva nunca fue posible, porque la exclusion constraint la impide.
- **Corrección:** `coalesce(…, false)` en la migración `20261019000800`.
- **Prueba:** la de propiedad (§5, fila 1) lo detecta en una iteración.

### 5.2 Feriados 2028 faltantes

- El horizonte de 18 meses llega a abril de 2028, pero la tabla terminaba en 2027.
- Sin la corrección, el 01/01/2028 y la Semana Santa 2028 (13 y 14/04) salían como días comunes y con otra tarifa.
- Se cargaron los feriados de 2028 y la revisión diaria avisa si falta un año.

### 5.3 Otros hallazgos de las pruebas, ya corregidos

- **Contraste:** el precio de oferta en verde oliva no llegaba a 4.5:1. Ahora usa verde oscuro en modo claro y camel en modo oscuro.
- **Nombre accesible distinto del texto visible (WCAG 2.5.3):** ahora el nombre se arma con el texto visible, por ejemplo "domingo **17** de enero de 2027, libre, desde S/ **2,950**".
- **`aria-disabled`:** marcaba como "no operables" los días en espera y ocupados, aunque sí responden con su explicación. Ahora solo los días pasados lo llevan.
- **La web se caía al tocar un día:** la fecha se guardaba dentro de la transición y el resultado se pintaba antes que ella. Ahora se fija fuera.

## 6. Lo que no se pudo verificar todavía

| Pendiente                                                      | Motivo                                      | Cómo se cierra                                                           |
| -------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Horizonte basado en datos reales                               | Falta el historial de la operación anterior | Carlos entrega agenda o chats → `pnpm analisis:anticipacion`             |
| Prueba con 5 usuarios reales (meta: ≥ 4/5 en < 60 s, SUS ≥ 80) | Hay que reclutar personas                   | Guion en §7; sesión de 30 min por persona                                |
| INP de campo (p75 < 200 ms)                                    | Requiere tráfico real                       | Vercel Speed Insights después del go-live                                |
| Lectores de pantalla reales (TalkBack, VoiceOver)              | El entorno no tiene un dispositivo          | 15 min con un celular Android y un iPhone usando el guion de §7, tarea 4 |
| Feriados contra la fuente oficial                              | El entorno no abre elperuano.pe ni gob.pe   | Contrastar `peruHolidays()` con El Peruano (asesoría legal)              |
| Embudo con datos                                               | Sin tráfico ni IDs de GA4 y Clarity         | Cargar los IDs; revisar el embudo en la semana 1                         |

## 7. Guion de la prueba con usuarios (5 personas, 30 min cada una)

- **Perfiles:**
  1. Una pareja o novia que planea su boda.
  2. Una persona de RR. HH. que organiza eventos de empresa.
  3. Una madre o padre que organiza un cumpleaños o full day.
  4. Un wedding planner.
  5. Una persona mayor de 50 años.
- **Condiciones:** su propio celular, la web real en producción y sin explicación previa. Pensar en voz alta; el moderador no ayuda.

| #   | Tarea                                                                                        | Éxito                                                |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | "Encuentra un sábado libre de febrero para 100 invitados y pídelo."                          | Llega a "Quiero esta fecha" con un sábado de febrero |
| 2   | "¿Qué significa el día con rayas y reloj?"                                                   | Explica que alguien lo está separando                |
| 3   | "¿Cuál es el día más barato de la próxima semana para un evento de empresa con 40 personas?" | Elige un día L-J con la etiqueta de oferta           |
| 4   | (Solo con lector de pantalla) "Elige el 15 del mes siguiente."                               | Lo logra solo con gestos o teclado                   |

**Plantilla de resultados** (una fila por persona y tarea):

| Persona | Tarea | ¿Éxito? | Segundos | Errores / dudas (cita literal) |
| ------- | ----- | ------- | -------- | ------------------------------ |
|         |       |         |          |                                |

**Al final de cada sesión:**

- Cuestionario SUS (10 preguntas, escala 1–5).
- Una pregunta abierta: "¿Qué te haría dudar de separar la fecha aquí?"

**Criterio de aceptación:**

- La tarea 1 la completan al menos 4 de 5 en menos de 60 segundos.
- SUS promedio de 80 o más.
- Nadie confunde "En espera" con "Libre".
