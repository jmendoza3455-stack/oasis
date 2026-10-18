-- Bucket privado "documents" de Supabase Storage (vouchers, fotos de actas, PDFs).
-- Idempotente; en Postgres sin Supabase Storage (tests locales/CI) se omite.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
    on conflict (id) do update set public = false;
  else
    raise notice 'storage.buckets no existe: se omite el bucket documents';
  end if;
end $$;
