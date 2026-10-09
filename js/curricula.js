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
    titulo: '¡Línea de Partida, Piloto!',
    subtitulo: 'Supera cada sector a la velocidad de la fibra óptica, calibra tu transmisión en los Pit Stops y clasifica para el Gran Premio con tu Coach Made.',
    video: { titulo: 'Video de bienvenida', url: 'assets/video/videobienvenida.mp4' }
  },

  bloques: [
    /* ───────────── BLOQUE 1 ───────────── */
    {
      id: 'b1', nivel: 1, tema: 'orange', titulo: 'VUELTA 1: ADN WIN (Puesta a Punto del Motor)', emoji: '🏁',
      subtitulo: 'Calibra tu arranque y conoce la escudería WIN.',
      items: [
        {
          id: 'c01', tipo: 'tarjeta', n: 1, titulo: 'Escudería WIN (Historia)', emoji: '🏎️',
          contenidos: [
            { tipo: 'html', titulo: 'Lectura', url: 'modulos/modulo-historia.html' },
            { tipo: 'video', titulo: 'Video', url: 'assets/video/intro_identidad.mp4' },
            { tipo: 'imagen', titulo: 'Infografía', url: '' }
          ]
        },
        {
          id: 'c02', tipo: 'tarjeta', n: 2, titulo: 'Posición en Grilla (Introducción al Puesto)', emoji: '🚦',
          contenidos: [
            { tipo: 'html', titulo: 'Lectura', url: '' },
            { tipo: 'video', titulo: 'Video', url: '' }
          ]
        },
        { id: 'quiz-b1', tipo: 'quiz', titulo: 'Pit Stop 01: Transmisión ADN', quizId: 'quiz-b1' }
      ]
    },

    /* ───────────── BLOQUE 2 ───────────── */
    {
      id: 'b2', nivel: 2, tema: 'black', titulo: 'VUELTA 2: ECOSISTEMA DE PRODUCTOS (Motor & Turbo)', emoji: '⚙️',
      subtitulo: 'Domina la potencia técnica de conectividad y entretenimiento.',
      items: [
        { id: 'c03', tipo: 'tarjeta', n: 3, titulo: 'Tracción Simétrica (Producto Internet & Modo Gamer)', emoji: '🚀', contenidos: [{ tipo: 'html', titulo: 'Lectura', url: 'modulos/modulo-producto_internet.html' }] },
        { id: 'c04', tipo: 'tarjeta', n: 4, titulo: 'Cabina Multimedia (WinTV & DGO)', emoji: '📺', contenidos: [] },
        { id: 'quiz-b2', tipo: 'quiz', titulo: 'Pit Stop 02: Transmisión Conectividad', quizId: 'quiz-b2' },
        { id: 'c05', tipo: 'tarjeta', n: 5, titulo: 'Equipamiento de Pista (SVAs Físicos)', emoji: '🛠️', contenidos: [] },
        { id: 'quiz-b3', tipo: 'quiz', titulo: 'Pit Stop 03: Transmisión Equipamiento', quizId: 'quiz-b3' }
      ]
    },

    /* ───────────── BLOQUE 3 ───────────── */
    {
      id: 'b3', nivel: 3, tema: 'yellow', titulo: 'VUELTA 3: MANIOBRAS DE CARRERA (Estrategia Comercial)', emoji: '🏎️',
      subtitulo: 'Vende, factura y maniobra en pista como un profesional.',
      items: [
        { id: 'c06', tipo: 'tarjeta', n: 6, titulo: 'Tabla de Rendimiento (Oferta Comercial)', emoji: '📊', contenidos: [] },
        { id: 'c07', tipo: 'tarjeta', n: 7, titulo: 'Reglas de Circuito (Facturación & Riesgo)', emoji: '📋', contenidos: [] },
        { id: 'c08', tipo: 'tarjeta', n: 8, titulo: 'Boxes & Soporte (Canales de Atención y Autoatención)', emoji: '🎧', contenidos: [] }
      ]
    },

    /* ───────────── BLOQUE 4 (SOLO BACKOFFICE) ───────────── */
    {
      id: 'b4', nivel: 4, tema: 'dark-orange', titulo: 'VUELTA 4: PIT LANE TÉCNICO (Sistemas Operativos)', emoji: '🔧',
      subtitulo: 'Transmisión operativa y sistemas para validar contratos en tiempo récord.',
      soloRol: 'backoffice',
      items: [
        { id: 'c09', tipo: 'tarjeta', n: 9, titulo: 'Panel de Control (Winforce & Subsanación)', emoji: '💻', contenidos: [] },
        { id: 'quiz-b4', tipo: 'quiz', titulo: 'Pit Stop 04: Transmisión de Sistemas', quizId: 'quiz-b4' }
      ]
    }
  ],

  /* ── META FINAL (todos los roles) ── */
  meta: { id: 'quiz-general', tipo: 'meta', titulo: 'Gran Premio Winclic', quizId: 'quiz-general', emoji: '🏆' }
});
