/* =====================================================================
   WINCLIC · CONFIGURACIÓN CENTRAL  (único archivo que debes editar)
   Cárgalo ANTES que supabase-client.js
   ===================================================================== */
window.WC_CONFIG = Object.freeze({

  /* Supabase → Project Settings → API
     La anon key es PÚBLICA por diseño; la seguridad la dan las policies RLS
     de supabase/schema.sql. NUNCA pegues aquí la service_role key. */
  SUPABASE_URL: 'https://qyppzgqbbnvfmsmnbedo.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5cHB6Z3FiYm52Zm1zbW5iZWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjYxOTUsImV4cCI6MjEwNjgwMjE5NX0.v7IY7XK_u-JxVmd3zaSiEIyyhT2r2NRNqDLTfEHafKc',

  /* Bucket de Storage donde el panel sube PDFs y videos */
  BUCKET: 'winclic-contenidos',
  MAX_UPLOAD_MB: 50,

  /* Horas de castigo tras desaprobar un quiz (igual que en schema.sql) */
  LOCK_HORAS: 2,

  /* Contraseña de agencia → nombre de la agencia que se guardará en Supabase.
     Debe incluir la contraseña que ya validas en index.html (CONFIG.password).
     Si la contraseña no está aquí, el Pase de Abordaje pedirá la agencia. */
  AGENCIAS: {
    'MadeWin26': 'MADE'
  },

  /* Claves de LocalStorage */
  KEYS: {
    asesor: 'winclic_asesor',
    progreso: 'winclic_progreso_v2',
    lock: 'winclic_lock',
    aprobados: 'winclic_quiz_aprobados',
    outbox: 'winclic_outbox'
  }
});
