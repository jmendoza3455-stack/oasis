# Economía de fechas — Oasis Pachacámac · Un espacio SAWA

- **Fecha:** 19/10/2026 · **Estado:** borrador con **tarifas de ejemplo (S24) y costos estándar (S28), ambos por validar**
- **Relacionados:** [Tarifario propuesto](261018%20Tarifario%20propuesto%20y%20benchmark.md) · [Modelo económico](261018%20Modelo%20economico%20Oasis.xlsx) · [Laboratorio de marketing](261019%20Laboratorio%20de%20marketing.md) · [Supuestos](supuestos.md) (S24, S28, S52, S54)

El local vende **un evento por día**. Cada fecha es inventario que vence: un sábado vacío no se recupera. Marketing no debe llenar fechas con cualquier evento, sino **con el evento que más deja en cada tipo de día**. Este documento lo cuantifica para decidir qué segmento empuja cada pieza.

> Las cifras de abajo salen de `rate_cards` (marcadas como ejemplo) y de los costos directos de S28. Cuando André valide tarifas y costos, se recalcula con los mismos pasos. **No son resultados reales.**

## 1. Contribución por evento (temporada baja, S/ sin IGV)

Contribución = alquiler − costos directos estándar (S28: limpieza 250, personal 400, seguridad 200, energía 120, agua 60, piscina 80, reposiciones 100 = **S/ 1,210 por evento**). No incluye la comisión de planner (5 %) ni la pauta.

| Tipo de día       | Bodas y sociales | Corporativo | Full day familiar |
| ----------------- | ---------------: | ----------: | ----------------: |
| Lunes a jueves    |            1,290 |   **1,590** |               −10 |
| Viernes           |        **2,290** |       2,190 |               290 |
| Sábado            |        **3,290** |       2,790 |               790 |
| Domingo / feriado |        **2,590** |       2,390 |               990 |

En temporada alta (dic–mar), el sábado social sube a 3,990, el corporativo a 3,390 y el full day a 1,390.

## 2. Costo de oportunidad: qué se pierde al llenar mal una fecha

| Si un sábado de baja se vende como… |  Deja | Pierde frente a un evento social |
| ----------------------------------- | ----: | -------------------------------: |
| Evento social                       | 3,290 |                                — |
| Corporativo                         | 2,790 |                              500 |
| Full day                            |   790 |                        **2,500** |

Vender un sábado como full day con mucha anticipación pierde más de lo que dejan **dos full days de domingo** (2,500 contra 2 × 990). Por eso el full day no se promociona para sábados lejanos.

## 3. Regla de asignación para marketing

| Tipo de fecha       | Segmento que empuja el contenido                 | Cuándo se abre a otros                                                               |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Sábados             | Bodas, quinceañeros y cumpleaños grandes         | Si sigue libre a **45 días**: corporativo. A **21 días**: full day                   |
| Domingos y feriados | Sociales (almuerzos, bautizos, cumpleaños)       | A **30 días**: full day                                                              |
| Viernes             | Sociales y corporativo por igual                 | —                                                                                    |
| Lunes a jueves      | Corporativo (integraciones, full day de empresa) | Full day familiar **solo si se revisa su precio o su costo** (hoy no cubre S28, S54) |

- **Ventanas (45, 30 y 21 días):** supuesto inicial (S52); se ajustan con la anticipación real por segmento (`pnpm analisis:anticipacion` con el historial de Carlos).
- **Cómo lo usa el equipo:** Contenido elige el segmento de cada pieza según `free_weekends` del snapshot y esta tabla. Ejemplo: si en febrero quedan 3 sábados libres y faltan 90 días, las piezas de la semana van a bodas y quinceañeros de verano, no a full day.
- **Promociones:** las ofertas de última hora son decisión de André (regla 6). El equipo solo propone.

## 4. Cuánto se puede pagar por un lead

**Regla de Growth:** el costo de adquirir una separación por pauta no debe superar la comisión de un planner (5 % del alquiler sin IGV).

| Segmento y día (baja) | Alquiler | Tope por separación (5 %) | Tope por lead si convierte 15 % (S52) |
| --------------------- | -------: | ------------------------: | ------------------------------------: |
| Boda o social, sábado |    4,500 |                       225 |                                 33.75 |
| Corporativo, L-J      |    2,800 |                       140 |                                 21.00 |
| Full day, domingo     |    2,200 |                       110 |                                 16.50 |

- La conversión de lead a separación (15 %) es un **supuesto** (S52). Se reemplaza por la real del CRM apenas haya 30 leads cerrados por segmento.
- La atribución por pieza (`/r/<código>`) y el CRM dan el costo real por lead y por separación de cada pieza pagada.

## 5. Hallazgos a validar

1. **Full day de lunes a jueves no cubre los costos estándar** (S/ 1,200 contra S/ 1,210). O el costo de un full day para 40 personas es menor que el de un evento de 150 (probable: menos limpieza, personal y seguridad), o el precio debe subir. Por validar con Carlos (S54).
2. **El corporativo de L-J deja más que un evento social en L-J** (1,590 contra 1,290): el contenido de semana va a empresas.
3. **Los sábados de verano son el activo principal:** cada sábado de temporada alta vendido como social deja ≈ 3,990, cerca de tres veces lo que deja un full day ese día.
