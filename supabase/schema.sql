-- =====================================================================
--  WINCLIC · ESQUEMA SUPABASE (referencia para que el JS coincida)
--  Pégalo en: Supabase Dashboard → SQL Editor → New query → Run
--  Si ya creaste tus tablas, usa esto solo para comparar nombres de
--  columnas: el JS espera EXACTAMENTE estos nombres.
-- =====================================================================

-- ---------- 1. TABLAS ------------------------------------------------

create table if not exists public.quizzes (
  id           text primary key,                 -- ej: 'checkpoint-1'
  titulo       text not null,
  nota_minima  int  not null default 80 check (nota_minima between 0 and 100),
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.preguntas (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     text not null references public.quizzes(id) on delete cascade,
  orden       int  not null,
  enunciado   text not null,
  opciones    jsonb not null,                    -- ["A","B","C","D"]
  correcta    int  not null,                     -- índice (0-based) en 'opciones'
  unique (quiz_id, orden)
);

create table if not exists public.modulos (
  id           uuid primary key default gen_random_uuid(),
  slug         text,                             -- id de la tarjeta en js/curricula.js (ej: 'c01')
  orden        int  not null default 0,
  titulo       text not null,
  emoji        text not null default '📄',
  tipo         text not null check (tipo in ('pdf','video','html','imagen','quiz')),
  url          text,                             -- URL pública (Storage o externa/relativa)
  storage_path text,                             -- ruta dentro del bucket (para borrar)
  quiz_id      text references public.quizzes(id) on delete set null,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists modulos_slug_idx on public.modulos (slug);

create table if not exists public.evaluaciones (
  id               uuid primary key default gen_random_uuid(),
  agencia          text not null,
  asesor_nombre    text not null,
  asesor_apellido  text not null,
  quiz_id          text not null references public.quizzes(id) on delete cascade,
  nota             int  not null check (nota between 0 and 100),
  aciertos         int  not null,
  total            int  not null,
  aprobado         boolean not null,
  detalle          jsonb not null,               -- [{pregunta_id,orden,enunciado,elegida,elegida_texto,correcta,ok}]
  created_at       timestamptz not null default now()
);
create index if not exists evaluaciones_quiz_idx on public.evaluaciones (quiz_id, created_at desc);

create table if not exists public.cursos_completados (
  id               uuid primary key default gen_random_uuid(),
  agencia          text not null,
  asesor_nombre    text not null,
  asesor_apellido  text not null,
  curso_id         text not null,
  puntaje          int  not null,
  created_at       timestamptz not null default now()
);

-- ---------- 2. SEGURIDAD (RLS) ---------------------------------------
-- Público (anon)  : LEE contenido activo, INSERTA resultados. Nada más.
-- Admin (authenticated = usuarios creados en Authentication → Users):
--                   lee y escribe todo.
-- IMPORTANTE: en Authentication → Providers → Email desactiva
--             "Allow new users to sign up", si no cualquiera podría
--             registrarse y volverse admin.

alter table public.quizzes            enable row level security;
alter table public.preguntas          enable row level security;
alter table public.modulos            enable row level security;
alter table public.evaluaciones       enable row level security;
alter table public.cursos_completados enable row level security;

create policy "anon lee quizzes activos"   on public.quizzes   for select to anon using (activo);
create policy "anon lee preguntas"         on public.preguntas for select to anon using (true);
create policy "anon lee modulos activos"   on public.modulos   for select to anon using (activo);

create policy "admin todo quizzes"   on public.quizzes   for all to authenticated using (true) with check (true);
create policy "admin todo preguntas" on public.preguntas for all to authenticated using (true) with check (true);
create policy "admin todo modulos"   on public.modulos   for all to authenticated using (true) with check (true);

create policy "anon inserta evaluaciones" on public.evaluaciones
  for insert to anon with check (true);
create policy "admin lee evaluaciones" on public.evaluaciones
  for select to authenticated using (true);
create policy "admin borra evaluaciones" on public.evaluaciones
  for delete to authenticated using (true);

create policy "anon inserta cursos" on public.cursos_completados
  for insert to anon with check (true);
create policy "admin lee cursos" on public.cursos_completados
  for select to authenticated using (true);

-- ---------- 3. ANTI-TRAMPAS EN SERVIDOR ------------------------------
-- El bloqueo de 2 h también vive aquí: borrar el LocalStorage o cambiar
-- el reloj del PC NO salta el castigo. (Si cambias las 2 horas, cámbialas
-- también en js/config.js → LOCK_HORAS).

create or replace function public.segundos_bloqueo(
  p_agencia text, p_nombre text, p_apellido text, p_quiz text
) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
             when e.aprobado then 0
             else greatest(0, ceil(extract(epoch from (e.created_at + interval '2 hours' - now())))::int)
           end
    from public.evaluaciones e
    where e.quiz_id = p_quiz
      and lower(trim(e.agencia))         = lower(trim(p_agencia))
      and lower(trim(e.asesor_nombre))   = lower(trim(p_nombre))
      and lower(trim(e.asesor_apellido)) = lower(trim(p_apellido))
    order by e.created_at desc
    limit 1
  ), 0);
$$;
grant execute on function public.segundos_bloqueo(text,text,text,text) to anon, authenticated;

create or replace function public.trg_bloquear_reintento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.segundos_bloqueo(new.agencia, new.asesor_nombre, new.asesor_apellido, new.quiz_id) > 0 then
    raise exception 'REINTENTO_BLOQUEADO' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists bloquear_reintento on public.evaluaciones;
create trigger bloquear_reintento
  before insert on public.evaluaciones
  for each row execute function public.trg_bloquear_reintento();

-- ---------- 4. STORAGE (PDFs y Videos) -------------------------------
-- Bucket público (los asesores solo LEEN). Solo el admin sube/borra.
-- Nota: el plan gratuito limita ~50 MB por archivo.

insert into storage.buckets (id, name, public)
values ('winclic-contenidos', 'winclic-contenidos', true)
on conflict (id) do nothing;

create policy "admin sube contenidos" on storage.objects
  for insert to authenticated with check (bucket_id = 'winclic-contenidos');
create policy "admin actualiza contenidos" on storage.objects
  for update to authenticated using (bucket_id = 'winclic-contenidos');
create policy "admin borra contenidos" on storage.objects
  for delete to authenticated using (bucket_id = 'winclic-contenidos');
-- La lectura pública ya la da el bucket público (no requiere policy).
