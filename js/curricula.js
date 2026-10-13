/* =====================================================================
   WINCLIC · CURRÍCULA  (js/curricula.js)
   ÚNICA fuente de verdad del orden de la ruta. Se carga antes de
   modulos-loader.js y de panel.js.
   ===================================================================== */
window.WC_CURRICULA = Object.freeze({

  /* ── CABECERA: Bienvenida / Guía de contenidos ── */
  cabecera: {
    titulo: '¡Semáforo en Verde, Piloto! 🚦',
    subtitulo: 'Corre a la velocidad de la fibra óptica pura, haz paradas en boxes para calibrar tu conocimiento y clasifica a la Pole Position.',
    video: { titulo: 'Briefing de Pista (Video de Bienvenida)', url: 'assets/video/videobienvenida.mp4' }
  },

  bloques: [
    /* ───────────── BLOQUE 1 ───────────── */
    {
      id: 'b1', nivel: 1, tema: 'orange', 
      titulo: 'INICIO DE PARTIDA', 
      emoji: '<img src="./assets/icons/vuelta-1.svg" alt="Vuelta 1" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">',
      subtitulo: 'Calibra tus cilindros con el ADN de la fibra y define tu posición de arranque en el equipo WIN.',
      items: [
        { 
          id: 'c01', tipo: 'tarjeta', n: 1, 
          titulo: 'Curva Cero: El Origen de la Fibra (Historia)', 
          emoji: '<img src="./assets/icons/historia.svg" alt="Historia" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', 
          contenidos: [] 
        },
        { 
          id: 'c02', tipo: 'tarjeta', n: 2, 
          titulo: 'Posición (Tu Rol en la Pista)', 
          emoji: '<img src="./assets/icons/intro-puesto.svg" alt="Introducción al Puesto" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', 
          contenidos: [] 
        },
        { 
          id: 'quiz-b1', tipo: 'quiz', 
          titulo: 'Pit Stop 01: Calibración de ADN', 
          quizId: 'quiz-b1' 
        }
      ]
    },

    /* ───────────── BLOQUE 2 ───────────── */
    {
      id: 'b2', nivel: 2, tema: 'black', 
      titulo: 'POTENCIA & AERODINÁMICA', 
      emoji: '<img src="./assets/icons/vuelta-2.svg" alt="Vuelta 2" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">',
      subtitulo: 'Domina los caballos de fuerza de nuestra conexión simétrica y el arsenal de entretenimiento a bordo.',
      items: [
        { 
          id: 'c03', tipo: 'tarjeta', n: 3, 
          titulo: 'Tracción 100% Simétrica & Nitro (Internet & Gamer)', 
          emoji: '<img src="./assets/icons/gamer.svg" alt="Producto Internet y Gamer" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', 
          contenidos: [] 
        },
        { 
          id: 'c04', tipo: 'tarjeta', n: 4, 
          titulo: 'Pantalla de Cabina: Streaming sin Lag (WinTV & DGO)', 
          emoji: '<img src="./assets/icons/tv-digital.svg" alt="WinTV & DGO" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', 
          contenidos: [] 
        },
        { 
          id: 'quiz-b2', tipo: 'quiz', 
          titulo: 'Pit Stop 02: Check de Velocidad y Señal', 
          quizId: 'quiz-b2' 
        },
        { 
          id: 'c05', tipo: 'tarjeta', n: 5, 
          titulo: 'Kit Aerodinámico: Cero Zonas Ciegas (Mesh, FonoWin & Winbox)', 
          emoji: '<img src="./assets/icons/svas.svg" alt="SVAs Físicos" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', 
          contenidos: [] 
        },
        { 
          id: 'quiz-b3', tipo: 'quiz', 
          titulo: 'Pit Stop 03: Inspección de Equipamiento', 
          quizId: 'quiz-b3' 
        }
      ]
    },

    /* ───────────── BLOQUE 3 ───────────── */
    {
      id: 'b3', nivel: 3, tema: 'yellow', 
      titulo: 'MANIOBRAS & ESTRATEGIA EN PISTA', 
      emoji: '<img src="./assets/icons/vuelta-3.svg" alt="Vuelta 3" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">',
      subtitulo: 'Trazado fino para adelantar objeciones, entender los contratos y cruzar la línea de meta comercial.',
      items: [
        { 
          id: 'c06', tipo: 'tarjeta', n: 6, 
          titulo: 'Tablero de Rendimiento & Tarifas (Oferta Comercial)', 
          emoji: '<img src="./assets/icons/progreso.svg" alt="Oferta Comercial" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', 
          contenidos: [] 
        },
        { 
          id: 'c07', tipo: 'tarjeta', n: 7, 
          titulo: 'Semáforos & Reglas del Circuito (Facturación & Riesgo)', 
          emoji: '<img src="./assets/icons/ruta.svg" alt="Facturación y Politicas" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', 
          contenidos: [] 
        },
        { 
          id: 'c08', tipo: 'tarjeta', n: 8, 
          titulo: 'Equipo de Asistencia en Ruta (Canales de Atención)', 
          emoji: '<img src="./assets/icons/atencion.svg" alt="Canales de Atención y Autoatención" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', 
          contenidos: [] 
        },
        { 
          id: 'quiz-b4', tipo: 'quiz', 
          titulo: 'Pit Stop 04: Estrategia de Adelantamiento', 
          quizId: 'quiz-b4' 
        }
      ]
    },

    /* ───────────── BLOQUE 4 (SOLO BACKOFFICE) ───────────── */
    {
      id: 'b4', nivel: 4, tema: 'dark-orange', 
      titulo: 'VUELTA TÉCNICA: PIT LANE & TELEMETRÍA', 
      emoji: '<img src="./assets/icons/vuelta-4.svg" alt="Vuelta 4" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">',
      subtitulo: 'Optimización de motores internos: digitación veloz y resolución de fallas en boxes.',
      soloRol: 'backoffice',
      items: [
        { 
          id: 'c09', tipo: 'tarjeta', n: 9, 
          titulo: 'Consola de Boxes: Digitación & Rescate (Winforce & Subsanación)', 
          emoji: '<img src="./assets/icons/backoffice.svg" alt="Winforce & Subsanación" style="width: 34px; height: 34px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">', 
          contenidos: [] 
        },
        { 
          id: 'quiz-b5', tipo: 'quiz', 
          titulo: 'Pit Stop 05: Ajuste de Sistemas', 
          quizId: 'quiz-b5' 
        }
      ]
    }
  ],

  /* ── META FINAL (todos los roles) ── */
  meta: { 
    id: 'quiz-general', tipo: 'meta', 
    titulo: 'Gran Premio WIN: Bandera a Cuadros 🏁', 
    quizId: 'quiz-general', 
    emoji: '<img src="./assets/icons/meta-final.svg" alt="Gran Premio Winclic" style="width: 44px; height: 44px; display: block; margin: 0 auto 0.5rem;">' 
  }
});