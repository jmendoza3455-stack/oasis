-- Marca madre = SAWA · gestión de espacios & experiencias (André y Carlos, 20/10/2026, OASIS.md §15.15).
-- Reemplaza la marca provisional de F1 y vuelve el respaldo "Un espacio SAWA" en cada local
-- (revierte la parte de marca de §15.13; la razón social sigue en settings.company_legal_name).

alter table public.brands add column tagline text;

update public.brands
   set slug = 'sawa', name = 'SAWA', tagline = 'gestión de espacios & experiencias', is_placeholder = false
 where slug = 'principal';

alter table public.venues alter column endorsement set default 'Un espacio SAWA';
update public.venues set endorsement = 'Un espacio SAWA' where coalesce(endorsement, '') = '';
