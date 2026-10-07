/* =====================================================================
   WINCLIC · RUTA DINÁMICA DEL ASESOR  (js/modulos-loader.js)
   Lee la tabla `modulos` de Supabase y pinta el camino serpenteante con
   TUS mismos estilos (.node-wrapper / .node-btn). Lo que el admin sube
   en panel.html aparece aquí sin tocar el código.
   - Si Supabase falla o no hay módulos, deja tu HTML estático intacto.
   - El progreso (completado / actual / bloqueado) vive en LocalStorage,
     separado por asesor (varios asesores pueden usar la misma PC).
   Requiere: config.js, supabase-client.js, pase-abordaje.js, quiz.js
   ===================================================================== */
(function () {
  'use strict';
  const { db, config, ls, esc, toast } = window.WC;

  const cont = document.querySelector('.path-container');
  if (!cont) return;

  let modulos = [];
  let viewer = null;
  let actual = null; // módulo abierto en el visor

  /* ── Progreso por asesor ───────────────────────────────────────────── */
  function claveAsesor() {
    const a = window.PaseAbordaje && window.PaseAbordaje.asesor();
    return a ? `${a.agencia}|${a.nombre}|${a.apellido}`.toLowerCase() : '_anon';
  }
  const leerProgreso = () => new Set((ls.get(config.KEYS.progreso, {}))[claveAsesor()] || []);
  function guardarProgreso(set) {
    const todo = ls.get(config.KEYS.progreso, {});
    todo[claveAsesor()] = [...set];
    ls.set(config.KEYS.progreso, todo);
  }

  function marcarCompletado(moduloId) {
    const set = leerProgreso();
    if (set.has(moduloId)) return;
    set.add(moduloId);
    guardarProgreso(set);
    pintar();
    if (modulos.length && modulos.every(m => set.has(m.id))) {
      document.dispatchEvent(new CustomEvent('winclic:ruta-completada'));
    }
  }

  /* ── Carga + pintado ───────────────────────────────────────────────── */
  async function cargar() {
    const { data, error } = await db.from('modulos').select('*').eq('activo', true).order('orden');
    if (error || !data || !data.length) {
      if (error) console.warn('[WinClic] No se pudo leer modulos; se mantiene la ruta estática.', error.message);
      return;
    }
    modulos = data;
    pintar();
  }

  function pintar() {
    if (!modulos.length) return;
    const hechos = leerProgreso();
    const primeroPendiente = modulos.findIndex(m => !hechos.has(m.id));

    cont.innerHTML = modulos.map((m, i) => {
      const estado = hechos.has(m.id) ? 'completed' : (i === primeroPendiente ? 'current' : 'locked');
      const esQuiz = m.tipo === 'quiz';
      const icono = estado === 'completed' ? '✔️' : (esQuiz ? `${esc(m.emoji)} Quiz` : esc(m.emoji));
      const etiqueta = { completed: 'Completado', current: 'En curso', locked: 'Bloqueado' }[estado];
      const color = estado === 'completed' ? 'var(--color-orange)' : 'var(--color-text-secondary)';
      return `
        <div class="node-wrapper ${estado === 'locked' ? '' : estado}">
          <div class="node-path"></div>
          <div class="node-content">
            <button class="node-btn ${estado}" data-mod="${m.id}" ${estado === 'locked' ? 'disabled' : ''}
              ${esQuiz ? 'style="border-radius:16px;width:120px;font-size:1.1rem"' : ''}
              aria-label="${esc(m.titulo)}">${icono}</button>
            <div class="node-label">${esc(m.titulo)}<br><span style="color:${color}">${etiqueta}</span></div>
          </div>
        </div>`;
    }).join('');
  }

  cont.addEventListener('click', (e) => {
    const btn = e.target.closest('.node-btn[data-mod]');
    if (!btn || btn.disabled) return;
    const m = modulos.find(x => x.id === btn.dataset.mod);
    if (m) abrirModulo(m);
  });

  /* ── Visor de contenido (PDF / Video / HTML) y lanzador de quiz ────── */
  function abrirModulo(m) {
    const hecho = leerProgreso().has(m.id);

    if (m.tipo === 'quiz') {
      if (hecho) return toast('¡Ya aprobaste esta evaluación! 🏆');
      return window.WinQuiz.abrir(m.quiz_id);
    }
    if (!m.url) return toast('Este módulo aún no tiene contenido.', 'err');

    actual = m;
    if (!viewer) construirVisor();

    viewer.querySelector('#wc-v-title').textContent = `${m.emoji} ${m.titulo}`;
    const cuerpo = viewer.querySelector('#wc-v-body');
    const btnOk = viewer.querySelector('#wc-v-done');
    const enlace = `<a href="${esc(m.url)}" target="_blank" rel="noopener" style="font-weight:700;color:var(--wc-orange)">Abrir en pestaña nueva ↗</a>`;

    if (m.tipo === 'video') {
      cuerpo.innerHTML = `<video src="${esc(m.url)}" controls playsinline controlsList="nodownload" style="width:100%;border-radius:18px;background:#000;max-height:60vh"></video>`;
      if (!hecho) {
        btnOk.disabled = true;
        btnOk.textContent = 'Termina el video para continuar 🎬';
        cuerpo.querySelector('video').addEventListener('ended', () => { btnOk.disabled = false; btnOk.textContent = 'Marcar como completado ✅'; }, { once: true });
      }
    } else {
      cuerpo.innerHTML = `<iframe src="${esc(m.url)}" title="${esc(m.titulo)}" style="width:100%;height:60vh;border:0;border-radius:18px;background:#fff"></iframe>
        <p style="margin:.8rem 0 0">¿No se ve bien en tu celular? ${enlace}</p>`;
    }
    if (m.tipo !== 'video' || hecho) {
      btnOk.disabled = hecho;
      btnOk.textContent = hecho ? '✅ Ya completado' : 'Marcar como completado ✅';
    }

    viewer.classList.add('wc-open');
    document.body.style.overflow = 'hidden';
  }

  function cerrarVisor() {
    viewer.classList.remove('wc-open');
    document.body.style.overflow = '';
    setTimeout(() => { viewer.querySelector('#wc-v-body').innerHTML = ''; }, 250); // detiene el video
    actual = null;
  }

  function construirVisor() {
    viewer = document.createElement('div');
    viewer.className = 'wc-overlay';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.innerHTML = `
      <div class="wc-modal wc-modal--wide" style="max-width:860px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem">
          <h2 id="wc-v-title" style="margin:0;text-align:left;font-size:1.3rem"></h2>
          <button class="wc-btn wc-btn--ghost wc-btn--sm" id="wc-v-close" aria-label="Cerrar">✕</button>
        </div>
        <div id="wc-v-body"></div>
        <button class="wc-btn wc-btn--green wc-btn--block" id="wc-v-done" style="margin-top:1.2rem">Marcar como completado ✅</button>
      </div>`;
    document.body.appendChild(viewer);

    viewer.querySelector('#wc-v-close').onclick = cerrarVisor;
    viewer.addEventListener('click', (e) => { if (e.target === viewer) cerrarVisor(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && viewer.classList.contains('wc-open')) cerrarVisor(); });
    viewer.querySelector('#wc-v-done').onclick = () => {
      if (!actual) return;
      marcarCompletado(actual.id);
      toast('¡Módulo completado! ⭐');
      cerrarVisor();
    };
  }

  /* ── Eventos del ecosistema WinClic ────────────────────────────────── */
  document.addEventListener('winclic:asesor-listo', pintar);          // otro asesor → otro progreso
  document.addEventListener('winclic:quiz-aprobado', (e) => {         // quiz aprobado → nodo completado
    const m = modulos.find(x => x.tipo === 'quiz' && x.quiz_id === e.detail.quizId);
    if (m) marcarCompletado(m.id);
  });
  document.addEventListener('winclic:repasar', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Repasa los módulos anteriores 📚 y vuelve cuando termine el contador.');
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cargar);
  else cargar();
})();
