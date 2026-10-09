-- Tabla de Agencias
CREATE TABLE IF NOT EXISTS public.agencias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    codigo_acceso text NOT NULL UNIQUE,
    zona text NOT NULL DEFAULT 'Lima',
    departamento text NOT NULL DEFAULT 'Lima',
    activa boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas RLS (Row Level Security)
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (para que el Login pueda consultar si el código existe)
CREATE POLICY "Permitir lectura pública de agencias activas" ON public.agencias
    FOR SELECT USING (activa = true);

-- Políticas de administración (para el panel.html)
-- Requiere estar autenticado en Supabase (auth.role() = 'authenticated') para modificar
CREATE POLICY "Permitir gestión a administradores" ON public.agencias
    FOR ALL USING (auth.role() = 'authenticated');
