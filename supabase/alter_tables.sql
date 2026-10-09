-- Agregar columnas de zona y departamento a las tablas de analítica

ALTER TABLE public.cursos_completados 
ADD COLUMN IF NOT EXISTS zona text DEFAULT 'Lima',
ADD COLUMN IF NOT EXISTS departamento text DEFAULT 'Lima';

ALTER TABLE public.evaluaciones 
ADD COLUMN IF NOT EXISTS zona text DEFAULT 'Lima',
ADD COLUMN IF NOT EXISTS departamento text DEFAULT 'Lima';
