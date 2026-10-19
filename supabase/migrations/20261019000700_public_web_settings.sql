-- Web pública: datos visibles editables por el admin. Vacíos = no se muestran (nunca placeholders
-- a la vista). Los precios "desde" y /precios se publican solo con public_prices_enabled = true,
-- después de validar el tarifario (S24).
insert into public.settings (venue_id, key, value, description)
select id, k, v::jsonb, d from public.venues,
  (values
    ('public_prices_enabled', 'false', 'Publicar precios "desde" y la página /precios (validar tarifario antes, S24)'),
    ('company_ruc', '""', 'RUC de SAWA – Gestión Comercial S.A.C. para el pie de página'),
    ('company_address', '""', 'Domicilio fiscal de SAWA (Libro de Reclamaciones y aviso de privacidad)'),
    ('privacy_email', '""', 'Correo para derechos ARCO y datos personales'),
    ('anpd_code', '""', 'Código de inscripción del banco de datos ante la ANPD'),
    ('venue_address', '""', 'Dirección exacta del local (web, mapa y ficha de Google)'),
    ('maps_url', '""', 'Enlace de Google Maps del local'),
    ('social_links', '{"instagram": "", "facebook": "", "tiktok": ""}', 'Redes sociales (URLs completas)')
  ) as s(k, v, d)
on conflict (venue_id, key) do nothing;
