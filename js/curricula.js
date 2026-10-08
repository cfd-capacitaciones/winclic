/* =====================================================================
   WINCLIC · CURRÍCULA  (js/curricula.js)
   ÚNICA fuente de verdad del orden de la ruta. Se carga antes de
   modulos-loader.js y de panel.js.

   Tipos de elemento dentro de un bloque:
     'tarjeta' → nodo circular con contenidos (html / video / imagen / pdf)
     'quiz'    → "Checkpoint" (cofre dorado)  · requiere quizId (tabla quizzes)
   Bloque con soloRol:'backoffice' → solo lo ve/hace quien eligió ese rol
     en el Pase de Abordaje; los demás saltan directo al Quiz General.

   `contenidos` es el valor POR DEFECTO de cada tarjeta. En cuanto el
   admin sube algo desde panel.html para esa tarjeta (columna modulos.slug
   = id de la tarjeta), esos archivos REEMPLAZAN a los de aquí.
   ===================================================================== */
window.WC_CURRICULA = Object.freeze({

  /* ── CABECERA: Bienvenida / Guía de contenidos ── */
  cabecera: {
    titulo: '¡Bienvenido a WinClic!',
    subtitulo: 'Tu ruta de capacitación paso a paso. Completa cada nodo, vence a los jefes y llega a la Meta Final.',
    video: { titulo: 'Video de bienvenida', url: 'assets/video/videobienvenida.mp4' }
  },

  bloques: [
    /* ───────────── BLOQUE 1 ───────────── */
    {
      id: 'b1', nivel: 1, tema: 'orange', titulo: 'ADN WIN', emoji: '🧬',
      subtitulo: 'Conoce quiénes somos y cuál es tu rol.',
      items: [
        {
          id: 'c01', tipo: 'tarjeta', n: 1, titulo: 'Historia', emoji: '🏛️',
          contenidos: [
            { tipo: 'html', titulo: 'Lectura', url: 'modulos/modulo-historia.html' },
            { tipo: 'video', titulo: 'Video', url: 'assets/video/intro_identidad.mp4' },
            { tipo: 'imagen', titulo: 'Infografía', url: '' }
          ]
        },
        {
          id: 'c02', tipo: 'tarjeta', n: 2, titulo: 'Introducción al Puesto', emoji: '💼',
          contenidos: [
            { tipo: 'html', titulo: 'Lectura', url: '' },
            { tipo: 'video', titulo: 'Video', url: '' }
          ]
        },
        { id: 'quiz-b1', tipo: 'quiz', titulo: 'Quiz B1', quizId: 'quiz-b1' }
      ]
    },

    /* ───────────── BLOQUE 2 ───────────── */
    {
      id: 'b2', nivel: 2, tema: 'black', titulo: 'Ecosistema de Productos', emoji: '🌐',
      subtitulo: 'Domina todo lo que vendemos.',
      items: [
        { id: 'c03', tipo: 'tarjeta', n: 3, titulo: 'Producto Internet', emoji: '🌐', contenidos: [{ tipo: 'html', titulo: 'Lectura', url: 'modulos/modulo-producto_internet.html' }] },
        { id: 'c04', tipo: 'tarjeta', n: 4, titulo: 'Producto Gamer', emoji: '🎮', contenidos: [] },
        { id: 'c05', tipo: 'tarjeta', n: 5, titulo: 'Producto WinTV', emoji: '📺', contenidos: [] },
        { id: 'c06', tipo: 'tarjeta', n: 6, titulo: 'Producto DGO', emoji: '🎬', contenidos: [] },
        { id: 'quiz-b2', tipo: 'quiz', titulo: 'Quiz B2 · Intermedio', quizId: 'quiz-b2' },
        { id: 'c07', tipo: 'tarjeta', n: 7, titulo: 'FonoWin', emoji: '📞', contenidos: [] },
        { id: 'c08', tipo: 'tarjeta', n: 8, titulo: 'Mesh', emoji: '📡', contenidos: [] },
        { id: 'c09', tipo: 'tarjeta', n: 9, titulo: 'Winbox', emoji: '📦', contenidos: [] },
        { id: 'quiz-b3', tipo: 'quiz', titulo: 'Quiz B3', quizId: 'quiz-b3' }
      ]
    },

    /* ───────────── BLOQUE 3 ───────────── */
    {
      id: 'b3', nivel: 3, tema: 'yellow', titulo: 'La Cancha', emoji: '⚽',
      subtitulo: 'Vende, factura y atiende como un profesional.',
      items: [
        { id: 'c10', tipo: 'tarjeta', n: 10, titulo: 'Oferta Comercial', emoji: '🏷️', contenidos: [] },
        { id: 'c11', tipo: 'tarjeta', n: 11, titulo: 'Facturación', emoji: '🧾', contenidos: [] },
        { id: 'c12', tipo: 'tarjeta', n: 12, titulo: 'Políticas de Riesgo', emoji: '🛡️', contenidos: [] },
        { id: 'c13', tipo: 'tarjeta', n: 13, titulo: 'Canales de Atención y Autoatención', emoji: '💬', contenidos: [] },
        { id: 'quiz-b4', tipo: 'quiz', titulo: 'Quiz B4', quizId: 'quiz-b4' }
      ]
    },

    /* ───────────── BLOQUE 4 (SOLO BACKOFFICE) ───────────── */
    {
      id: 'b4', nivel: 4, tema: 'dark-orange', titulo: 'Sistemas y Gestión', emoji: '🖥️',
      subtitulo: 'Exclusivo Backoffice: herramientas internas.',
      soloRol: 'backoffice',
      items: [
        { id: 'c14', tipo: 'tarjeta', n: 14, titulo: 'Precurso de Winforce', emoji: '⚙️', contenidos: [] },
        { id: 'c15', tipo: 'tarjeta', n: 15, titulo: 'Gestión de Subsanación', emoji: '🧰', contenidos: [] }
      ]
    }
  ],

  /* ── META FINAL (todos los roles) ── */
  meta: { id: 'quiz-general', tipo: 'meta', titulo: 'Quiz General', quizId: 'quiz-general', emoji: '🏆' }
});
