# Tarifario propuesto y benchmark · Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 18/10/2026
- **Estado:** Borrador para validación de André y Carlos. **Todos los precios: por validar (S24).**
- **Relacionados:** [Benchmark de competidores](research/261018%20Benchmark%20de%20competidores.md) · [Supuestos](supuestos.md) (S02, S06, S08, S19, S24) · [OASIS.md §3 y §9](../OASIS.md) · [Programa de planners](261018%20Programa%20de%20planners.md) · [Plan de pauta](261018%20Plan%20de%20pauta%2090%20dias.md) · [Modelo económico](261018%20Modelo%20economico%20Oasis.xlsx) · fuente de los precios: `supabase/seed.sql` (`rate_cards`)

> **Dónde se cambian:** en **/admin/configuracion** (tarifas y parámetros; solo el admin). Nada está hardcodeado: la web, el cotizador, el portal de planners y las cotizaciones leen `rate_cards` y `settings`. Hoy todas las tarifas tienen `is_placeholder = true`; al validarlas, André las marca como definitivas.

---

## 1. Tarifario propuesto

**Cómo se construyó:** valor "medio" de los rangos del benchmark (§3), tratado como **precio sin IGV** (S24). Alquiler exclusivo del espacio por día (un evento por día, `booking_mode = one_per_day`), sin catering ni producción. IGV 18 % leído de `settings.igv_rate`. Temporada alta = dic, ene, feb, mar (`high_season_months`). Un feriado se cobra como domingo (tabla `holidays`). La comisión de planner (5 % sin IGV) se muestra solo como referencia.

> **Decisión abierta (S24):** ¿estos montos son sin IGV (como están cargados) o con IGV? Si fueran con IGV, el monto sin IGV sería cifra ÷ 1.18 (por ejemplo, S/ 4,500 con IGV = S/ 3,813.56 sin IGV) y el ticket del modelo bajaría en la misma proporción. Para la web, la norma de protección al consumidor exigiría mostrar el precio final con impuestos: **por validar con abogado**.

### 1.1 Bodas y eventos sociales (`wedding` y `social`, 1–150 invitados)

| Tipo de día       | Baja sin IGV | Baja con IGV | Alta sin IGV | Alta con IGV | Alta vs baja | Comisión 5 % (baja / alta) |
| ----------------- | ------------ | ------------ | ------------ | ------------ | ------------ | -------------------------- |
| L-J               | 2,500.00     | 2,950.00     | 2,900.00     | 3,422.00     | +16 %        | 125.00 / 145.00            |
| Viernes           | 3,500.00     | 4,130.00     | 4,000.00     | 4,720.00     | +14 %        | 175.00 / 200.00            |
| Sábado            | 4,500.00     | 5,310.00     | 5,200.00     | 6,136.00     | +16 %        | 225.00 / 260.00            |
| Domingo / feriado | 3,800.00     | 4,484.00     | 4,400.00     | 5,192.00     | +16 %        | 190.00 / 220.00            |

### 1.2 Corporativo (`corporate`, 1–150 personas)

| Tipo de día       | Baja sin IGV | Baja con IGV | Alta sin IGV | Alta con IGV | Alta vs baja | Comisión 5 % (baja / alta) |
| ----------------- | ------------ | ------------ | ------------ | ------------ | ------------ | -------------------------- |
| L-J               | 2,800.00     | 3,304.00     | 3,200.00     | 3,776.00     | +14 %        | 140.00 / 160.00            |
| Viernes           | 3,400.00     | 4,012.00     | 3,900.00     | 4,602.00     | +15 %        | 170.00 / 195.00            |
| Sábado            | 4,000.00     | 4,720.00     | 4,600.00     | 5,428.00     | +15 %        | 200.00 / 230.00            |
| Domingo / feriado | 3,600.00     | 4,248.00     | 4,100.00     | 4,838.00     | +14 %        | 180.00 / 205.00            |

### 1.3 Full day familiar (`family_day`, 1–60 personas, exclusivo)

| Tipo de día       | Baja sin IGV | Baja con IGV | Alta sin IGV | Alta con IGV | Alta vs baja | Comisión 5 % (baja / alta) |
| ----------------- | ------------ | ------------ | ------------ | ------------ | ------------ | -------------------------- |
| L-J               | 1,200.00     | 1,416.00     | 1,500.00     | 1,770.00     | +25 %        | 60.00 / 75.00              |
| Viernes           | 1,500.00     | 1,770.00     | 1,900.00     | 2,242.00     | +27 %        | 75.00 / 95.00              |
| Sábado            | 2,000.00     | 2,360.00     | 2,600.00     | 3,068.00     | +30 %        | 100.00 / 130.00            |
| Domingo / feriado | 2,200.00     | 2,596.00     | 2,800.00     | 3,304.00     | +27 %        | 110.00 / 140.00            |

### 1.4 Parámetros asociados (`settings`, por validar)

| Parámetro                        | Valor                                                                                                        | Supuesto |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| Adelanto para separar / saldo    | 50 % / 15 días antes del evento                                                                              | S05      |
| Garantía reembolsable            | S/ 1,000 bodas, sociales y corporativo · S/ 500 full day                                                     | S06      |
| Tope de descuento sin aprobación | 10 % (encima, aprueba el admin)                                                                              | S08      |
| Aforo                            | Cóctel 150 · banquete 100 · full day 60                                                                      | S02      |
| Cancelación                      | > 60 días: devuelve 50 % del adelanto · < 60 días: sin devolución · 1 reprogramación sin costo con ≥ 30 días | S07      |

**Ticket promedio ponderado del modelo** con esta tabla y la mezcla supuesta: ≈ S/ 3,272 sin IGV (equilibrio ≈ 3.2 eventos/mes; meta ≈ 12).

---

## 2. Comparación con el benchmark

Fuente: [Benchmark de competidores](research/261018%20Benchmark%20de%20competidores.md), con todas las fuentes consultadas el **18/10/2026** mediante extractos de búsqueda (las páginas no se pudieron abrir directamente). Son precios publicados "desde", no cotizaciones; casi ninguno declara si incluye IGV. Muchas fichas de directorios tienen años de antigüedad (ver la corrección sobre Matrimonio.com.pe en el benchmark).

### 2.1 Resumen por segmento

| Segmento          | Mercado (publicado)                                                                                                                                                                                                              | Oasis propuesto (sin IGV)                      | Lectura                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bodas / sociales  | 29 precios "alquiler desde": **mediana S/ 3,900**, rango intercuartil S/ 2,700–5,200, techo S/ 8,000–17,100. Casi todos para 200–800 invitados                                                                                   | L-J 2,500 · sábado 4,500 (baja) a 5,200 (alta) | El sábado de baja queda entre la mediana y el P75; si el mercado publica con IGV, nuestro sábado **con IGV (5,310)** queda **sobre el P75**. Justificable solo con exclusividad, formato boutique y precio claro |
| Corporativo       | Solo Fundo Cinco Olivos publica: full day **desde S/ 5,500 para 30 personas** (jardín, almuerzo, actividades y facilitador); S/ 12,000 para 50–100; jardín solo S/ 7,650–9,150 **sin IGV** hasta 150, con servicios obligatorios | L-J 2,800 a sábado 4,600 (solo espacio)        | Muy por debajo de Cinco Olivos, pero no es comparable: Cinco Olivos incluye comida y servicios. Hueco para un paquete por persona                                                                                |
| Full day familiar | Day-pass **no exclusivo** S/ 40–80 por adulto (clubes de Cieneguilla); casas privadas S/ 350–800 por día para 10–20 personas; **no hay tarifa publicada de casa exclusiva para 40–60**                                           | L-J 1,200 a domingo 2,800                      | Domingo de baja con 40 personas ≈ S/ 55 por persona sin IGV (S/ 64.90 con IGV) con exclusividad, dentro del rango del club masivo                                                                                |

### 2.2 Competidores más relevantes (aforo o formato comparable)

| Local (distrito)                                                  | Aforo           | Qué incluye                                                                                                     | Precio publicado                                                                 | Fuente (consultada 18/10/2026)                               |
| ----------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Fundo Cinco Olivos (Pachacámac)                                   | Hasta 600       | Jardín con servicios obligatorios (seguridad, generador, limpieza, supervisor) por 8 h; catering y barra aparte | Jardín S/ 9,150 sin IGV (150 inv.); full day corporativo desde S/ 5,500 (30 pax) | fundocincoolivos.com.pe/precios · /full-day-corporativo-lima |
| Villa Lúcumo (Pachacámac)                                         | 40–250          | Solo la casa: jardín 1,200 m², terraza techada, bungalows, jacuzzi                                              | S/ 4,800 con impuestos (IE); desde S/ 2,900–3,000 (ZK)                           | ineventos.com/pe/villalucumo · zankyou.com.pe                |
| La Joya de Pachacamac                                             | 100–200         | Cocina para el caterer, parqueo, baños                                                                          | S/ 3,500–12,000                                                                  | Ficha de matrimonio.com.pe (datos antiguos)                  |
| Casona "Pachacamac"                                               | 20–200          | Solo espacio, sin catering, sin límite de hora                                                                  | S/ 4,000–5,000                                                                   | Ficha de matrimonio.com.pe (datos antiguos)                  |
| El Pino de Cardal (Pachacámac)                                    | 150–600         | Casa hacienda, un solo evento por día                                                                           | S/ 3,000–4,300                                                                   | Ficha de matrimonio.com.pe; lacamara.pe                      |
| Casa Cabrera (Pachacámac)                                         | No publicado    | —                                                                                                               | Desde S/ 3,000 + garantía S/ 500                                                 | Ficha de matrimonio.com.pe (datos antiguos)                  |
| Emma's Home (Pachacámac)                                          | 50–200          | Catering propio                                                                                                 | S/ 700 fijo + menú desde S/ 180 por persona                                      | Ficha de matrimonio.com.pe (datos antiguos)                  |
| Huerto del Edén (Cieneguilla)                                     | Hasta 150–200   | Solo espacio; bungalows                                                                                         | Desde S/ 4,000 (otra versión: S/ 2,900)                                          | Ficha de matrimonio.com.pe (datos antiguos)                  |
| Fundo Facundo (Cieneguilla)                                       | 30–250          | Jardín, ramada, sin exclusividad de proveedores; **límite 10 pm por disposición municipal**                     | S/ 2,500–6,000; mínimo S/ 1,500 hasta 40 invitados                               | Ficha de matrimonio.com.pe (datos antiguos)                  |
| Clubes de Cieneguilla (Ribera del Río, Las Palmeras, KanKay, VPX) | Masivo          | Day-pass no exclusivo con consumo incluido                                                                      | S/ 50–80 adulto; +S/ 10 el fin de semana                                         | TikTok / Facebook (confiabilidad baja)                       |
| La Casona de los Cóndores (Chaclacayo)                            | Salas de 40–200 | Full day con bienvenida y almuerzo                                                                              | S/ 79–99 adulto                                                                  | lacasonadeloscondores.com                                    |
| Casas en MercadoLibre (Cieneguilla)                               | 10–20           | Casa con piscina                                                                                                | S/ 350–800 por día                                                               | listado.mercadolibre.com.pe                                  |

**Prácticas del mercado a igualar o superar:** adelanto de 30–50 % (Cinco Olivos), garantía de S/ 500–700, proveedores libres como norma, un evento por día como argumento (El Pino de Cardal), y casi nadie publica penalidad por hora extra ni diferencia L-J vs fin de semana (benchmark §4).

---

## 3. Recomendaciones de posicionamiento

| #   | Recomendación                                                                                                           | Por qué                                                                                                                     | Cómo se implementa                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Precio transparente**: publicar "desde" por segmento, tipo de día y temporada, con IGV incluido para el cliente final | Solo Cinco Olivos publica una tabla; los demás piden escribir por WhatsApp                                                  | Cotizador rápido de la web y tarifario de planner ya leen `rate_cards`; falta decidir S24                                                                        |
| 2   | **Formato boutique 60–150**                                                                                             | La mayoría de competidores vende para 200–800; sus "desde" no se trasladan uno a uno                                        | Mensaje: exclusividad, un evento por día, equipo que coordina con la planner                                                                                     |
| 3   | **Full day exclusivo 30–60** como producto propio                                                                       | Es el hueco sin precio publicado entre el club masivo y la hacienda grande                                                  | Evaluar dos tramos de aforo (1–30 y 31–60) con `guests_min/guests_max` de `rate_cards`; mínimo de facturación igual al piso del día                              |
| 4   | **Paquete corporativo L-J por persona**                                                                                 | El benchmark propone S/ 110–150 por persona (piso–medio) y S/ 210–240 premium, frente a S/ 183 por persona de Cinco Olivos  | `rate_cards.price_per_guest_net` ya lo permite; requiere caterer aliado y validar costos                                                                         |
| 5   | **No competir con descuentos**                                                                                          | El indicador de control es el ingreso neto por día disponible                                                               | Tope de descuento 10 % (S08); encima, solo el admin aprueba                                                                                                      |
| 6   | **Temporada por segmento**                                                                                              | El benchmark sugiere alta de oct–dic para bodas y nov–dic para corporativo; hoy `high_season_months` es uno solo para todos | Decisión de André; si se aprueba, requiere cambio de modelo (temporada por tipo de evento)                                                                       |
| 7   | **Fechas especiales** (24, 25 y 31/12, Semana Santa, Fiestas Patrias, vísperas de feriado largo)                        | El mercado las cotiza aparte                                                                                                | Hoy no se modelan: se cotizan a mano dentro de las reglas de descuento/aprobación. Pendiente de definir                                                          |
| 8   | **Hora extra** en el contrato                                                                                           | Nadie la publica; el benchmark sugiere 10–15 % del alquiler por hora, si el horario municipal lo permite                    | Cláusula del contrato de cliente; por validar con abogado                                                                                                        |
| 9   | **Mystery shopping** antes de fijar precios                                                                             | Las cifras son "desde" y en parte antiguas                                                                                  | Cotizar por WhatsApp con 8–10 competidores (benchmark §5.10): sábado baja, sábado alta y L-J para 100; full day para 50; con IGV, horario, hora extra y garantía |

---

## 4. Vacíos

- **S24:** definir si los precios se publican y cargan con o sin IGV.
- Precios del mercado sin IGV declarado y con fichas antiguas; Google rating de competidores no verificado.
- No hay precio publicado de full day exclusivo para 40–60 ni diferencias L-J vs fin de semana en locales de eventos (el diferencial propuesto se infiere del alquiler vacacional y los day-pass).
- Estado de Matrimonio.com.pe (fuente de muchas fichas): por verificar.
- Costos directos reales por evento (S28) para confirmar el margen de los precios L-J.
