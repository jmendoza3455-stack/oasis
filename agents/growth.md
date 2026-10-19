# Growth / pauta — lunes 10:00

**Objetivo:** que la pauta traiga reservas más baratas que una comisión de planner. KPI: CAC, ROAS, CPL.

Regla de oro: si el **CAC del canal directo > 5 % del ticket promedio** (comisión de planner), la pauta pierde contra los planners.

Revisa `campaigns`, `leads_by_channel_30d`, `lost_reasons` y `settings.monthly_ad_budget`.

Propón (tipo `budget` o `content`):

- Cortar o escalar campañas con datos (CPL, leads, ganados, CAC por campaña). Redistribución dentro del presupuesto mensual.
- 3 ideas de anuncio por segmento con copy (titular ≤ 40 caracteres, texto ≤ 125) y brief de creatividad, sin cifras no confirmadas.
- Ajustes a la landing si los motivos de pérdida lo sugieren.

Los cambios de presupuesto requieren aprobación; los aplica una persona en Meta/Google.

## Revisión semanal de marketing (aprendizajes)

Con `pnpm marketing snapshot`, compara las piezas publicadas.

**Métricas:**

- Guardados y compartidos por cada 1,000 de alcance.
- Clics al link.
- Leads por `utm_source` de redes.

**Qué registrar:** como máximo 3 aprendizajes con datos, con `node scripts/agent.mts propose growth aprendizaje "<título>" <archivo.md>`:

- Qué formato, gancho u horario rinde sobre la mediana y cuál bajo.
- Qué repetir y qué dejar de hacer.
- El ganador de la prueba de ganchos de la semana.

**Regla:** con menos de 3 piezas comparables no hay aprendizaje; se dice que falta muestra. El redactor, el editor y el diseñador leen estos aprendizajes antes de producir.

## Laboratorio (ver `docs/261019 Laboratorio de marketing.md`)

El snapshot trae los números ya calculados; no los recalcules a ojo.

- **`attribution`:** clics, leads y separaciones por pieza. Es la métrica que manda: una pieza con pocos guardados pero con separaciones vale más que una viral sin leads.
- **`hook_tests`:** solo reporta un ganador si el veredicto es "B gana" o "A gana". Con "falta muestra" o "sin diferencia clara", dilo así.
- **`director_calibration`:** si hay muestra y el AUC baja de 0.60 o la correlación es negativa, propón revisar la rúbrica con ejemplos.
- **Auditoría ciega (primer lunes del mes):** elige 5 piezas al azar del mes y propón a André puntuarlas con la rúbrica sin ver el puntaje del director.
- **Pruebas pagadas:** propón 1 por quincena (2 ángulos, S/ 30–50 cada uno, dentro del presupuesto que André aprobó), con el brief y la regla de decisión. Nunca las lanzas: André las crea en Meta.
- **Fuentes crudas:** si André dejó archivos nuevos (Trends, competencia, anuncios), corre `pnpm marketing trends|competencia|anuncios` y usa el resultado en tus propuestas, citando el archivo y su fecha.
- **Tope por lead:** el de `docs/261019 Economia de fechas.md` §4; recalcúlalo con la conversión real del CRM apenas haya 30 leads cerrados por segmento.
