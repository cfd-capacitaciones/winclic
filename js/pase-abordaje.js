/* =====================================================================
   WINCLIC · PASE DE ABORDAJE  (Fusión LocalStorage + Supabase)
   - Tras el login con clave de agencia, pide Nombre y Apellido.
   - Guarda la identidad en LocalStorage (sesión visual).
   - Al finalizar un curso envía el paquete Agencia+Nombre+Puntaje a Supabase.
   Requiere: config.js, supabase-client.js, winclic-ui.css
   API pública: PaseAbordaje.abrir(clave) · .asesor() · .completarCurso(id, puntaje)
   ===================================================================== */
(function () {
  'use strict';
  const { db, config, sesion, outbox, esc, toast, isNetworkError } = window.WC;

  let overlay, onReady = null;

  function normalizar(txt) {
    // "juan   perez" → "Juan Perez"
    return txt.trim().replace(/\s+/g, ' ')
      .toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
  }

  function construirModal() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'wc-overlay';
    overlay.id = 'wc-pase-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'wc-pase-title');
    overlay.innerHTML = `
      <form class="wc-modal" id="wc-pase-form" novalidate>
        <div class="wc-emoji-big" aria-hidden="true" style="display:flex; justify-content:center; align-items:center;">
        <img src="assets/icons/licencia.svg" alt="Licencia de Piloto" style="width: 3.5rem; height: 3.5rem; display: block;" /></div>
        <h2 id="wc-pase-title">Licencia de Piloto</h2>
        <p>Antes de encender el motor, ingresa tus datos. Tu tiempo de vuelta y calificación quedarán registrados en el panel.</p>

        <div class="wc-field" id="wc-pase-agencia-wrap" hidden>
          <label class="wc-label" for="wc-pase-agencia">Agencia</label>
          <input class="wc-input" id="wc-pase-agencia" autocomplete="organization" placeholder="Ej: Agencia MADE" maxlength="60">
        </div>
        <div class="wc-field">
          <label class="wc-label" for="wc-pase-nombre">Nombre</label>
          <input class="wc-input" id="wc-pase-nombre" autocomplete="given-name" placeholder="Ej: Juan" maxlength="40" required>
        </div>
        <div class="wc-field">
          <label class="wc-label" for="wc-pase-apellido">Apellido</label>
          <input class="wc-input" id="wc-pase-apellido" autocomplete="family-name" placeholder="Ej: Pérez" maxlength="40" required>
        </div>
        <div class="wc-field">
          <span class="wc-label">¿Cuál es tu rol?</span>
          <div class="wc-roles">
            <label class="wc-role">
            <input type="radio" name="wc-rol" value="ventas" checked><span>
            <img src="./assets/icons/carrito-compra.svg" alt="Ventas" style="width: 1.5rem; height: 1.5rem; display: block; margin: 0 auto 0.25rem;" />
            <b>Ventas</b><small>Asesor / Vendedor</small></span></label>
            <label class="wc-role">
            <input type="radio" name="wc-rol" value="backoffice"><span>
            <img src="./assets/icons/backoffice.svg" alt="Backoffice" style="width: 1.5rem; height: 1.5rem; display: block; margin: 0 auto 0.25rem;" />
            <b>Backoffice</b><small>Gestión y sistemas</small></span></label>
          </div>
        </div>

        <button type="submit" class="wc-btn wc-btn--block">¡A la Pista!
        <img src="./assets/icons/carrito.svg" alt="Auto" style="width: 1.4rem; height: 1.4rem; display: block;" />
        </button>
      </form>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#wc-pase-form').addEventListener('submit', (e) => {
      e.preventDefault();
      confirmar();
    });
  }

  function construirChip() {
    let chip = document.getElementById('wc-chip');
    if (!chip) {
      chip = document.createElement('button');
      chip.id = 'wc-chip';
      chip.type = 'button';
      chip.className = 'wc-chip';
      chip.title = 'Cambiar de asesor';
      chip.addEventListener('click', () => abrir(null, { forzar: true }));
      document.body.appendChild(chip);
    }
    const a = sesion.get();
    if (a) {
      chip.innerHTML = `${a.rol === 'backoffice' ? '🖥️' : '🧑‍🚀'} ${esc(a.nombre)} <small style="opacity:.6">· ${esc(a.agencia)}</small>`;
      chip.classList.add('wc-show');
    } else {
      chip.classList.remove('wc-show');
    }
  }

  function confirmar() {
    const wrapAg = overlay.querySelector('#wc-pase-agencia-wrap');
    const inAg = overlay.querySelector('#wc-pase-agencia');
    const inNom = overlay.querySelector('#wc-pase-nombre');
    const inApe = overlay.querySelector('#wc-pase-apellido');

    const campos = [inNom, inApe];
    if (!wrapAg.hidden) campos.push(inAg);

    let valido = true;
    campos.forEach(i => {
      const ok = i.value.trim().length >= 2;
      i.classList.toggle('wc-invalid', !ok);
      if (!ok) valido = false;
    });
    if (!valido) { toast('Completa todos los campos 😉', 'err'); return; }

    const agencia = wrapAg.hidden ? overlay.dataset.agencia : normalizar(inAg.value);
    const nueva = {
      agencia,
      nombre: normalizar(inNom.value),
      apellido: normalizar(inApe.value),
      rol: overlay.querySelector('input[name="wc-rol"]:checked').value, // 'ventas' | 'backoffice'
      zona: localStorage.getItem('agencia_zona') || 'Lima',
      departamento: localStorage.getItem('agencia_departamento') || 'Lima',
      desde: new Date().toISOString()
    };
    sesion.set(nueva);

    overlay.classList.remove('wc-open');
    document.body.style.overflow = '';
    construirChip();
    toast(`¡Bienvenido a bordo, ${nueva.nombre}! 🚀`);
    document.dispatchEvent(new CustomEvent('winclic:asesor-listo', { detail: nueva }));
    if (onReady) { onReady(nueva); onReady = null; }
  }

  /**
   * Abre el Pase de Abordaje.
   * @param {string|null} claveAgencia  contraseña con la que entró (para deducir la agencia)
   * @param {{forzar?:boolean, alTerminar?:Function}} [opts]
   */
  function abrir(claveAgencia, opts = {}) {
    construirModal();
    onReady = opts.alTerminar || null;

    const previa = sesion.get();
    
    // Leemos el nombre de la agencia traído desde Supabase en el Login, fallback al config.AGENCIAS
    let agenciaPorClave = localStorage.getItem('agencia_nombre');
    if (!agenciaPorClave && claveAgencia) {
       agenciaPorClave = config.AGENCIAS[claveAgencia] || (previa && previa.agencia);
    } else if (!agenciaPorClave) {
       agenciaPorClave = previa && previa.agencia;
    }

    overlay.dataset.agencia = agenciaPorClave || '';
    const wrapAg = overlay.querySelector('#wc-pase-agencia-wrap');
    wrapAg.hidden = !!agenciaPorClave;
    overlay.querySelector('#wc-pase-agencia').value = (!agenciaPorClave && previa && previa.agencia) || '';

    // Pre-llenamos con el último asesor de esta PC (cómodo si es el mismo)
    overlay.querySelector('#wc-pase-nombre').value = (previa && previa.nombre) || '';
    overlay.querySelector('#wc-pase-apellido').value = (previa && previa.apellido) || '';
    const rolPrevio = (previa && previa.rol) || 'ventas';
    overlay.querySelector(`input[name="wc-rol"][value="${rolPrevio}"]`).checked = true;

    overlay.classList.add('wc-open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => overlay.querySelector(wrapAg.hidden ? '#wc-pase-nombre' : '#wc-pase-agencia').focus(), 150);
  }

  /** Devuelve {agencia, nombre, apellido} o null. */
  function asesor() { return sesion.get(); }

  /**
   * Envía a Supabase el paquete completo del curso terminado.
   * Si no hay internet, se encola y se reintenta solo.
   */
  async function completarCurso(cursoId, puntaje) {
    const a = sesion.get();
    if (!a) { console.warn('[WinClic] completarCurso sin sesión de asesor'); return { ok: false }; }

    const fila = {
      agencia: a.agencia,
      zona: a.zona,
      departamento: a.departamento,
      asesor_nombre: a.nombre,
      asesor_apellido: a.apellido,
      curso_id: String(cursoId),
      puntaje: Math.round(puntaje)
    };
    const { error } = await db.from('cursos_completados').insert(fila);
    if (error) {
      if (isNetworkError(error)) { outbox.push('cursos_completados', fila); return { ok: false, offline: true }; }
      console.error('[WinClic] cursos_completados:', error);
      return { ok: false, error };
    }
    return { ok: true };
  }

  document.addEventListener('DOMContentLoaded', construirChip);

  window.PaseAbordaje = Object.freeze({ abrir, asesor, completarCurso, refrescarChip: construirChip });
})();
