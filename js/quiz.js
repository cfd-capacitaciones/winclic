/* =====================================================================
   WINCLIC · EVALUACIONES NATIVAS + SISTEMA ANTI-TRAMPAS
   - Quiz (preguntas desde Supabase) dentro de la web, sin MS Forms.
   - Al enviar: inserta nota + detalle en la tabla `evaluaciones`.
   - Si desaprueba: reintento bloqueado LOCK_HORAS horas (LocalStorage +
     verificación en servidor, así borrar el caché no salta el castigo).
   Requiere: config.js, supabase-client.js, pase-abordaje.js, winclic-ui.css
   API pública: WinQuiz.abrir(quizId) · WinQuiz.estaAprobado(quizId)
   Eventos:  winclic:quiz-aprobado {quizId, nota} · winclic:repasar {quizId}
   ===================================================================== */
(function () {
  'use strict';
  const { db, config, ls, esc, toast, formatCountdown, isNetworkError, outbox } = window.WC;
  const LOCK_MS = 30 * 60 * 1000;

  let overlay, box, timer = null;
  let S = null; // estado de la sesión de quiz en curso

  /* ── Utilidades ────────────────────────────────────────────────────── */
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const claveLock = (a, quizId) => `${a.agencia}|${a.nombre}|${a.apellido}|${quizId}`.toLowerCase();

  /* ── Bloqueo anti-trampas ──────────────────────────────────────────── */
  function lockLocal(a, quizId) {
    const mapa = ls.get(config.KEYS.lock, {});
    return Math.max(0, (mapa[claveLock(a, quizId)] || 0) - Date.now());
  }
  function setLockLocal(a, quizId, ms = LOCK_MS) {
    const mapa = ls.get(config.KEYS.lock, {});
    mapa[claveLock(a, quizId)] = Date.now() + ms;
    ls.set(config.KEYS.lock, mapa);
  }
  function clearLockLocal(a, quizId) {
    const mapa = ls.get(config.KEYS.lock, {});
    delete mapa[claveLock(a, quizId)];
    ls.set(config.KEYS.lock, mapa);
  }
  /** Milisegundos restantes de castigo = el MAYOR entre local y servidor. */
  async function msBloqueo(a, quizId) {
    const local = lockLocal(a, quizId);
    let servidor = 0;
    try {
      const { data, error } = await db.rpc('segundos_bloqueo', {
        p_agencia: a.agencia, p_nombre: a.nombre, p_apellido: a.apellido, p_quiz: quizId
      });
      if (!error && typeof data === 'number') servidor = data * 1000;
    } catch { /* sin red: solo local */ }
    return Math.max(local, servidor);
  }

  function estaAprobado(quizId) {
    return (ls.get(config.KEYS.aprobados, [])).includes(quizId);
  }

  /* ── Estructura del modal ──────────────────────────────────────────── */
  function construir() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'wc-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `<div class="wc-modal wc-modal--wide" id="wc-quiz-box" aria-live="polite"></div>`;
    document.body.appendChild(overlay);
    box = overlay.querySelector('#wc-quiz-box');
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('wc-open')) salir(); });
  }

  function mostrar() { overlay.classList.add('wc-open'); document.body.style.overflow = 'hidden'; }
  function cerrar() {
    clearInterval(timer); timer = null; S = null;
    overlay.classList.remove('wc-open');
    document.body.style.overflow = '';
  }
  function salir() {
    if (S && S.fase === 'preguntas' && !confirm('Si sales ahora perderás tus respuestas (no cuenta como intento). ¿Salir?')) return;
    cerrar();
  }

  /* ── Pantallas ─────────────────────────────────────────────────────── */
  function vistaCarga(msg = 'Cargando evaluación…') {
    box.innerHTML = `<div class="wc-emoji-big">⏳</div><h2>${esc(msg)}</h2>`;
  }

  function vistaError(msg) {
    box.innerHTML = `
      <div class="wc-emoji-big">😕</div><h2>Ups…</h2><p>${esc(msg)}</p>
      <button class="wc-btn wc-btn--ghost wc-btn--block" id="wc-q-close">Cerrar</button>`;
    box.querySelector('#wc-q-close').onclick = cerrar;
  }

  function vistaBloqueo(msRestantes) {
    const fin = Date.now() + msRestantes;
    box.innerHTML = `
      <div class="wc-emoji-big">⏳🔒</div>
      <h2>Aún no estás listo</h2>
      <p>No alcanzaste la nota mínima. Repasa la teoría con calma: podrás reintentar cuando termine el contador.</p>
      <div class="wc-lock-clock" id="wc-q-clock">${formatCountdown(msRestantes / 1000)}</div>
      <div style="display:grid;gap:.75rem">
        <button class="wc-btn wc-btn--yellow wc-btn--block" id="wc-q-repasar">📚 Repasar la teoría</button>
        <button class="wc-btn wc-btn--block" id="wc-q-retry" disabled>Reintentar 🔒</button>
        <button class="wc-btn wc-btn--ghost wc-btn--sm" id="wc-q-close">Cerrar</button>
      </div>`;
    const clock = box.querySelector('#wc-q-clock');
    const retry = box.querySelector('#wc-q-retry');

    box.querySelector('#wc-q-close').onclick = cerrar;
    box.querySelector('#wc-q-repasar').onclick = () => {
      const id = S && S.quiz.id;
      cerrar();
      document.dispatchEvent(new CustomEvent('winclic:repasar', { detail: { quizId: id } }));
    };

    clearInterval(timer);
    timer = setInterval(() => {
      const left = fin - Date.now();
      if (left <= 0) {
        clearInterval(timer);
        clock.textContent = '00:00:00';
        retry.disabled = false;
        retry.textContent = '¡Reintentar! 💪';
        retry.onclick = () => { clearLockLocal(window.PaseAbordaje.asesor(), S.quiz.id); iniciarIntento(); };
      } else {
        clock.textContent = formatCountdown(left / 1000);
      }
    }, 1000);
  }

  function vistaIntro() {
    box.innerHTML = `
      <div class="wc-emoji-big">🏆</div>
      <h2>${esc(S.quiz.titulo)}</h2>
      <p>${S.preguntas.length} preguntas · Nota mínima para aprobar: <b>${S.quiz.nota_minima}%</b><br>
         Si desapruebas, deberás esperar <strong>30 minutos</strong> para reintentar.</p>
      <div style="display:grid;gap:.75rem">
        <button class="wc-btn wc-btn--block" id="wc-q-start">¡Empezar! ⚡</button>
        <button class="wc-btn wc-btn--ghost wc-btn--sm" id="wc-q-close">Ahora no</button>
      </div>`;
    box.querySelector('#wc-q-start').onclick = iniciarIntento;
    box.querySelector('#wc-q-close').onclick = cerrar;
  }

  function vistaPregunta() {
    const i = S.idx, p = S.orden[i], total = S.orden.length;
    const elegida = S.respuestas[p.id];
    const letras = 'ABCDEFGH';

    box.innerHTML = `
      <small style="font-weight:800;color:var(--wc-text-soft)">Pregunta ${i + 1} de ${total}</small>
      <div class="wc-quiz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${i}"><i style="width:${(i / total) * 100}%"></i></div>
      <h3 class="wc-quiz-q">${esc(p.enunciado)}</h3>
      <div class="wc-quiz-options">
        ${p._opts.map((o, k) => `
          <button type="button" class="wc-opt ${elegida === o.idx ? 'wc-selected' : ''}" data-idx="${o.idx}" aria-pressed="${elegida === o.idx}">
            <span class="wc-opt-key">${letras[k]}</span><span>${esc(o.texto)}</span>
          </button>`).join('')}
      </div>
      <div class="wc-quiz-actions">
        <button class="wc-btn wc-btn--ghost" id="wc-q-prev" ${i === 0 ? 'disabled' : ''}>← Atrás</button>
        <button class="wc-btn" id="wc-q-next" ${elegida === undefined ? 'disabled' : ''}>${i === total - 1 ? 'Enviar ✅' : 'Siguiente →'}</button>
      </div>
      <button class="wc-btn wc-btn--ghost wc-btn--sm" id="wc-q-exit" style="margin-top:1rem">Salir</button>`;

    box.querySelectorAll('.wc-opt').forEach(btn => btn.onclick = () => {
      S.respuestas[p.id] = Number(btn.dataset.idx);
      vistaPregunta();
    });
    box.querySelector('#wc-q-prev').onclick = () => { S.idx--; vistaPregunta(); };
    box.querySelector('#wc-q-next').onclick = () => (i === total - 1 ? enviar() : (S.idx++, vistaPregunta()));
    box.querySelector('#wc-q-exit').onclick = salir;
  }

  function vistaResultado(r) {
    const ok = r.aprobado;
    // Si desaprueba NO revelamos las respuestas correctas (evita memorizar y reintentar)
    const revision = r.detalle.map((d) => `
      <div class="wc-review-item ${d.ok ? '' : 'wc-bad'}">
        ${d.ok ? '✅' : '❌'} <b>${d.orden}.</b> ${esc(d.enunciado)}
        ${!d.ok && ok ? `<br><small>Tu respuesta: ${esc(d.elegida_texto)}</small>` : ''}
      </div>`).join('');

    box.innerHTML = `
      <div class="wc-emoji-big">${ok ? '🎉' : '💪'}</div>
      <h2>${ok ? '¡Aprobaste!' : 'Casi lo logras'}</h2>
      <div class="wc-result-score ${ok ? 'wc-pass' : 'wc-fail'}">${r.nota}%</div>
      <p>${r.aciertos} de ${r.total} correctas · mínimo ${S.quiz.nota_minima}%</p>
      ${r.offline ? '<p style="color:var(--wc-red);font-weight:700">⚠️ Sin conexión: tu nota se enviará automáticamente al reconectar.</p>' : ''}
      <div class="wc-review">${revision}</div>
      <button class="wc-btn ${ok ? 'wc-btn--green' : 'wc-btn--yellow'} wc-btn--block" id="wc-q-fin">
        ${ok ? 'Continuar 🚀' : '📚 Ir a repasar la teoría'}
      </button>`;

    box.querySelector('#wc-q-fin').onclick = () => {
      if (ok) { cerrar(); return; }
      const a = window.PaseAbordaje.asesor();
      vistaBloqueo(lockLocal(a, S.quiz.id) || LOCK_MS);
    };
  }

  /* ── Lógica ────────────────────────────────────────────────────────── */
  function iniciarIntento() {
    S.fase = 'preguntas';
    S.idx = 0;
    S.respuestas = {};
    // Orden aleatorio de preguntas y opciones en cada intento
    S.orden = shuffle(S.preguntas).map(p => ({
      ...p,
      _opts: shuffle(p.opciones.map((texto, idx) => ({ texto, idx })))
    }));
    vistaPregunta();
  }

  async function enviar() {
    const a = window.PaseAbordaje.asesor();
    const btn = box.querySelector('#wc-q-next');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

    // Calificación (se evalúa por orden original de preguntas)
    const detalle = S.preguntas.map((p) => {
      const elegida = S.respuestas[p.id];
      return {
        pregunta_id: p.id,
        orden: p.orden,
        enunciado: p.enunciado,
        elegida: elegida ?? null,
        elegida_texto: elegida != null ? p.opciones[elegida] : '(sin responder)',
        correcta: p.correcta,
        ok: elegida === p.correcta
      };
    });
    const aciertos = detalle.filter(d => d.ok).length;
    const total = detalle.length;
    const nota = Math.round((aciertos / total) * 100);
    const aprobado = nota >= S.quiz.nota_minima;

    const fila = {
      agencia: a.agencia,
      zona: a.zona,
      departamento: a.departamento,
      asesor_nombre: a.nombre,
      asesor_apellido: a.apellido,
      quiz_id: S.quiz.id,
      nota, aciertos, total, aprobado, detalle
    };

    const { error } = await db.from('evaluaciones').insert(fila);
    let offline = false;

    if (error) {
      if ((error.message || '').includes('REINTENTO_BLOQUEADO')) {
        // El servidor dice que aún estás castigado (alguien borró el LocalStorage)
        const ms = await msBloqueo(a, S.quiz.id);
        setLockLocal(a, S.quiz.id, ms || LOCK_MS);
        vistaBloqueo(ms || LOCK_MS);
        return;
      }
      if (isNetworkError(error)) { outbox.push('evaluaciones', fila); offline = true; }
      else { console.error('[WinQuiz] insert evaluaciones', error); toast('No se pudo guardar tu nota. Intenta de nuevo.', 'err'); if (btn) { btn.disabled = false; btn.textContent = 'Enviar ✅'; } return; }
    }

    if (aprobado) {
      clearLockLocal(a, S.quiz.id);
      const ap = ls.get(config.KEYS.aprobados, []);
      if (!ap.includes(S.quiz.id)) { ap.push(S.quiz.id); ls.set(config.KEYS.aprobados, ap); }
      window.PaseAbordaje.completarCurso(S.quiz.id, nota);   // paquete Agencia + Nombre + Puntaje
      document.dispatchEvent(new CustomEvent('winclic:quiz-aprobado', { detail: { quizId: S.quiz.id, nota } }));
    } else {
      setLockLocal(a, S.quiz.id);                             // 🔒 2 horas
    }

    S.fase = 'resultado';
    vistaResultado({ aprobado, nota, aciertos, total, detalle, offline });
  }

  /** Punto de entrada: WinQuiz.abrir('checkpoint-1') */
  async function abrir(quizId) {
    construir();
    const a = window.PaseAbordaje && window.PaseAbordaje.asesor();
    if (!a) { window.PaseAbordaje.abrir(null, { alTerminar: () => abrir(quizId) }); return; }

    S = { fase: 'carga', quiz: { id: quizId } };
    mostrar();
    vistaCarga();

    const [{ data: quiz, error: e1 }, { data: preguntas, error: e2 }] = await Promise.all([
      db.from('quizzes').select('id,titulo,nota_minima').eq('id', quizId).maybeSingle(),
      db.from('preguntas').select('id,orden,enunciado,opciones,correcta').eq('quiz_id', quizId).order('orden')
    ]);
    if (e1 || e2 || !quiz || !preguntas || !preguntas.length) {
      console.error('[WinQuiz]', e1 || e2 || 'quiz vacío');
      return vistaError('No pudimos cargar la evaluación. Revisa tu conexión e inténtalo otra vez.');
    }
    S.quiz = quiz;
    S.preguntas = preguntas;

    const ms = await msBloqueo(a, quizId);
    if (ms > 0) { setLockLocal(a, quizId, ms); return vistaBloqueo(ms); }
    vistaIntro();
  }

  /* Enlace automático: cualquier elemento con data-quiz-id abre su quiz */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-quiz-id]');
    if (el && !el.disabled) { e.preventDefault(); abrir(el.dataset.quizId); }
  });

  window.WinQuiz = Object.freeze({ abrir, estaAprobado });
})();
