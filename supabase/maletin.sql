-- =====================================================================
-- WINCLIC · Políticas RLS para public.materiales_maletin
-- Ejecutar en Supabase → SQL Editor (la tabla ya existe).
--   · Asesores (anon): solo LECTURA
--   · Admin (authenticated): lectura + insertar + borrar + editar
-- =====================================================================
alter table public.materiales_maletin enable row level security;

drop policy if exists "anon lee maletin"   on public.materiales_maletin;
drop policy if exists "admin todo maletin" on public.materiales_maletin;

create policy "anon lee maletin"   on public.materiales_maletin for select to anon using (true);
create policy "admin todo maletin" on public.materiales_maletin for all to authenticated using (true) with check (true);

-- Si tu columna id es bigint/uuid sin default, asegúrate de que se autogenere, p. ej.:
--   alter table public.materiales_maletin alter column id set default gen_random_uuid();  -- si es uuid
