-- Marca: "Oasis Pachacámac" a secas (André, 19/10/2026, OASIS.md §15.13). SAWA deja de ser respaldo
-- de marca y queda solo como razón social de la empresa operadora, en un parámetro editable que se
-- usa en textos legales (Libro de Reclamaciones, privacidad, contrato y comprobantes).

alter table public.venues alter column endorsement set default '';
update public.venues set endorsement = '' where endorsement = 'Un espacio SAWA';

insert into public.settings (venue_id, key, value, description)
select id, 'company_legal_name', '"SAWA – Gestión Comercial S.A.C."'::jsonb,
       'Razón social de la empresa operadora: solo en textos legales, nunca como marca'
  from public.venues
on conflict (venue_id, key) do nothing;

update public.settings set description = 'RUC de la empresa operadora (pie de página y documentos)'
 where key = 'company_ruc';
update public.settings set description = 'Domicilio fiscal de la empresa operadora (Libro de Reclamaciones y aviso de privacidad)'
 where key = 'company_address';
