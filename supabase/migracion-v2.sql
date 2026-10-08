-- =====================================================================
--  WINCLIC · MIGRACIÓN v2  (ruta estilo Duolingo)
--  Solo si YA creaste la tabla `modulos` con el esquema anterior.
--  Supabase → SQL Editor → pegar → Run
-- =====================================================================

-- 1) Cada archivo subido apunta a una tarjeta de js/curricula.js (c01…c15)
alter table public.modulos add column if not exists slug text;
create index if not exists modulos_slug_idx on public.modulos (slug);

-- 2) Permitir imágenes (infografías) además de pdf / video / html
alter table public.modulos drop constraint if exists modulos_tipo_check;
alter table public.modulos
  add constraint modulos_tipo_check check (tipo in ('pdf','video','html','imagen','quiz'));

-- 3) IDs de quiz que usa la ruta (créalos desde panel.html → Evaluaciones,
--    o con este insert y luego cargas las 5 preguntas en el panel):
insert into public.quizzes (id, titulo, nota_minima) values
  ('quiz-b1',      'Quiz B1 · ADN WIN',            80),
  ('quiz-b2',      'Quiz B2 · Intermedio',         80),
  ('quiz-b3',      'Quiz B3',                      80),
  ('quiz-b4',      'Quiz B4 · La Cancha',          80),
  ('quiz-general', 'Quiz General · Meta Final',    80)
on conflict (id) do nothing;
