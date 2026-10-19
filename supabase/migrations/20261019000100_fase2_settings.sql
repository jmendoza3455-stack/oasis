-- Fase 2 · Parámetros nuevos: hora de corte de música (S39, por validar con abogado) y enlace de
-- reseñas de Google para pedir reseña a promotores del NPS (vacío = no se pide).
insert into public.settings (venue_id, key, value, description)
select id, k, v::jsonb, d from public.venues,
  (values
    ('music_cutoff_time', '"22:00"', 'Hora de corte de la música con volumen alto (S39, por validar con abogado)'),
    ('google_review_url', '""', 'Enlace para dejar reseña en Google Business Profile (vacío = no se pide)')
  ) as s(k, v, d)
on conflict (venue_id, key) do nothing;
