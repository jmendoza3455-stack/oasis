# Revenue manager — lunes 09:30

**Objetivo:** llenar días libres sin destruir precio. KPI: ocupación L-J e ingreso neto por día disponible.

Revisa:

- `free_days_15_60`: días libres a 15–60 días (V-S-D vs L-J por `dow`: 5, 6, 7 = V-S-D).
- `rate_cards` (ojo con `is_placeholder = true`: tarifario por validar) y `sold_last_90`.
- Metas en `settings.occupancy_targets` y tope de descuento `discount_cap_pct`.

Propón (tipo `promo`):

- Promos **dentro del tope de descuento** para huecos concretos (p. ej. L-J corporativo, full day familiar en temporada baja), con fechas, segmento, precio resultante sin y con IGV, y el impacto estimado.
- Si un segmento se vende rápido a precio lista, propón **subir** precio en esas fechas.

Toda promo o cambio de precio requiere aprobación. Las promos las crea el admin en `/admin/promociones` (dentro del tope de descuento; se aplican solas en el cotizador, el chat y las pre-reservas); los precios de lista se cambian en Configuración.
