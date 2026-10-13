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
    subtitulo: 'Supera cada sector a la velocidad de la fibra óptica, calibra tu transmisión durante las pausas y clasifica al Gran Premio.',
    video: { titulo: 'Video de bienvenida', url: 'assets/video/videobienvenida.mp4' }
  },

  bloques: [
    /* ───────────── BLOQUE 1 ───────────── */
    {
      id: 'b1', nivel: 1, tema: 'orange', titulo: 'ADN WIN', 
      emoji: '<img src="./assets/icons/vuelta-1.svg" alt="ADN WIN" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">',
      subtitulo: 'Conoce el origen de la velocidad, enciende la máquina y calibra tu posición en la pista comercial.',
      items: [
        { id: 'c01', tipo: 'tarjeta', n: 1, titulo: 'Historia : Origen de la Velocidad', 
          emoji: '<img src="./assets/icons/historia.svg" alt="Historia" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', contenidos: [] },
        { id: 'c02', tipo: 'tarjeta', n: 2, titulo: 'Introducción al Puesto : Posición', 
          emoji: '<img src="./assets/icons/intro-puesto.svg" alt="Introducción al Puesto" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', contenidos: [] },
        { id: 'quiz-b1', tipo: 'quiz', titulo: 'Pit Stop 01: Transmisión ADN', quizId: 'quiz-b1' }
      ]
    },

    /* ───────────── BLOQUE 2 ───────────── */
    {
      id: 'b2', nivel: 2, tema: 'black', titulo: 'ECOSISTEMA DE PRODUCTOS', 
      emoji: '<img src="./assets/icons/vuelta-2.svg" alt="ECOSISTEMA DE PRODUCTOS" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">',
      subtitulo: 'Domina la potencia técnica de conectividad y entretenimiento.',
      items: [
        { id: 'c03', tipo: 'tarjeta', n: 3, titulo: 'Producto Internet y Gamer : Pista simétrica', 
          emoji: '<img src="./assets/icons/gamer.svg" alt="Producto Internet y Gamer" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', contenidos: [] },
        { id: 'c04', tipo: 'tarjeta', n: 4, titulo: 'WinTV & DGO : Cabina Multimedia', 
          emoji: '<img src="./assets/icons/tv-digital.svg" alt="WinTV & DGO" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', contenidos: [] },
        { id: 'quiz-b2', tipo: 'quiz', titulo: 'Pit Stop 02: Transmisión Conectividad', quizId: 'quiz-b2' },
        { id: 'c05', tipo: 'tarjeta', n: 5, titulo: 'SVAs Físicos : Equipamiento Técnico', 
          emoji: '<img src="./assets/icons/svas.svg" alt="SVAs Físicos" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', contenidos: [] },
        { id: 'quiz-b3', tipo: 'quiz', titulo: 'Pit Stop 03: Transmisión Equipamiento', quizId: 'quiz-b3' }
      ]
    },

    /* ───────────── BLOQUE 3 ───────────── */
    {
      id: 'b3', nivel: 3, tema: 'yellow', titulo: 'ESTRATEGIA DE CARRERA', 
      emoji: '<img src="./assets/icons/vuelta-3.svg" alt="ESTRATEGIA DE CARRERA" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">',
      subtitulo: 'Vende, factura y maniobra en pista como un profesional.',
      items: [
        { id: 'c06', tipo: 'tarjeta', n: 6, titulo: 'Oferta Comercial : Tabla de Rendimiento', 
          emoji: '<img src="./assets/icons/progreso.svg" alt="Oferta Comercial" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', contenidos: [] },
        { id: 'c07', tipo: 'tarjeta', n: 7, titulo: 'Facturación y Politicas : Reglas del Circuito', 
          emoji: '<img src="./assets/icons/ruta.svg" alt="Facturación y Politicas" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', contenidos: [] },
        { id: 'c08', tipo: 'tarjeta', n: 8, titulo: 'Canales de Atención y Autoatención', 
          emoji: '<img src="./assets/icons/atencion.svg" alt="Canales de Atención y Autoatención" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', contenidos: [] },
        { id: 'quiz-b4', tipo: 'quiz', titulo: 'Pit Stop 04: Transmisión de Estrategia', quizId: 'quiz-b4' }
      ]
    },

    /* ───────────── BLOQUE 4 (SOLO BACKOFFICE) ───────────── */
    {
      id: 'b4', nivel: 4, tema: 'dark-orange', titulo: 'PIT LANE TÉCNICO', 
      emoji: '<img src="./assets/icons/vuelta-4.svg" alt="PIT LANE TÉCNICO" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">',
      subtitulo: 'Transmisión operativa y sistemas para validar contratos en tiempo récord.',
      soloRol: 'backoffice',
      items: [
        { id: 'c09', tipo: 'tarjeta', n: 9, titulo: 'Winforce & Subsanación : Panel de Control', 
          emoji: '<img src="./assets/icons/backoffice.svg" alt="Winforce & Subsanación" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', contenidos: [] },
        { id: 'quiz-b5', tipo: 'quiz', titulo: 'Pit Stop 05: Transmisión de Sistemas', quizId: 'quiz-b5' }
      ]
    }
  ],

  /* ── META FINAL (todos los roles) ── */
  meta: { id: 'quiz-general', tipo: 'meta', titulo: 'Gran Premio Winclic', quizId: 'quiz-general', 
    emoji: '<img src="./assets/icons/meta-final.svg" alt="Gran Premio Winclic" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">' }
});
