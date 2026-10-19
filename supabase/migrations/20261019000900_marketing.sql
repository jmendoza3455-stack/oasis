-- Equipo de marketing (docs/261019 Equipo de marketing.md): clips que sube el equipo en sitio y
-- piezas que preparan los agentes (Reels, carruseles, historias, publicaciones de Google).
-- Flujo de una pieza: borrador → en revisión → aprobada → publicada (o "cambios" / descartada).
-- Los agentes crean y rehacen piezas (service_role); solo el admin aprueba, pide cambios o marca
-- publicada. Nada se publica sin una persona.

create table public.marketing_clips (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  storage_key text not null unique,
  filename text not null,
  content_type text not null check (content_type in ('video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  notes text check (char_length(notes) <= 300),
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index marketing_clips_venue_idx on public.marketing_clips (venue_id, created_at desc);

create table public.marketing_pieces (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id),
  code text not null,                         -- r01, c03… (plan de contenido)
  version integer not null default 1 check (version > 0),
  kind text not null check (kind in ('reel', 'carousel', 'story', 'gbp_post')),
  title text not null check (char_length(title) between 3 and 140),
  pillar text,
  status text not null default 'review'
    check (status in ('draft', 'review', 'changes', 'approved', 'published', 'discarded')),
  spec jsonb,                                 -- guion de edición (lib/reels/spec.ts)
  caption text check (char_length(caption) <= 2200),
  hashtags text check (char_length(hashtags) <= 500),
  networks text[] not null default array['instagram', 'tiktok', 'facebook'],
  video_key text,
  cover_key text,
  image_keys text[] not null default '{}',
  qa jsonb,                                   -- control técnico automático
  review jsonb,                               -- rúbrica del director creativo
  feedback text check (char_length(feedback) <= 1000),
  scheduled_for date,
  published_at timestamptz,
  published_urls jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb, -- alcance, reproducciones, guardados, compartidos, clics
  created_by_agent text,
  decided_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, code, version)
);
create index marketing_pieces_status_idx on public.marketing_pieces (venue_id, status, created_at desc);

-- Transiciones permitidas (las de una persona las valida RLS: solo admin actualiza)
create or replace function public.marketing_pieces_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status and not (
       (old.status = 'draft' and new.status in ('review', 'discarded'))
    or (old.status = 'review' and new.status in ('approved', 'changes', 'discarded'))
    or (old.status = 'changes' and new.status in ('review', 'discarded'))
    or (old.status = 'approved' and new.status in ('published', 'changes', 'discarded'))
  ) then
    raise exception 'invalid_piece_transition: % -> %', old.status, new.status using errcode = 'P0001';
  end if;
  if new.status = 'published' and old.status <> 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.status = 'changes' and coalesce(trim(new.feedback), '') = '' then
    raise exception 'feedback_required' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger marketing_pieces_guard before update on public.marketing_pieces
  for each row execute function public.marketing_pieces_guard();
create trigger audit_marketing_pieces after insert or update on public.marketing_pieces
  for each row execute function public.audit_row();
create trigger audit_marketing_clips after insert or delete on public.marketing_clips
  for each row execute function public.audit_row();

alter table public.marketing_clips enable row level security;
alter table public.marketing_pieces enable row level security;
revoke all on public.marketing_clips, public.marketing_pieces from anon;

-- Clips: el staff (admin y operaciones) los ve y los sube; solo el admin los borra
create policy marketing_clips_staff_read on public.marketing_clips for select to authenticated
  using (public.is_staff());
create policy marketing_clips_staff_insert on public.marketing_clips for insert to authenticated
  with check (public.is_staff() and uploaded_by = auth.uid());
create policy marketing_clips_admin_delete on public.marketing_clips for delete to authenticated
  using (public.is_admin());

-- Piezas: el staff las ve; solo el admin decide (aprobar, pedir cambios, publicar, métricas)
create policy marketing_pieces_staff_read on public.marketing_pieces for select to authenticated
  using (public.is_staff());
create policy marketing_pieces_admin_update on public.marketing_pieces for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Bucket privado de marketing (50 MB por archivo: grabar en 1080p)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('marketing', 'marketing', false, 52428800,
            array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  else
    raise notice 'storage.buckets no existe: se omite el bucket marketing';
  end if;
end $$;
