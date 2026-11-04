/* =====================================================================
   WINCLIC · MALETÍN DINÁMICO (Supabase) + MICRO-RECOMPENSA  (js/maletin.js)
   Se carga DESPUÉS de modulos-loader.js. Los materiales viven en la tabla
   public.materiales_maletin (se administran desde panel.html → "Maletín").
   ===================================================================== */
(function () {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const db = window.WC && window.WC.db;
  const completadas = () => (window.WinProgreso ? window.WinProgreso.completadas() : new Set());

  /* El admin puede escribir 'card-1' o 'c01'; la ruta guarda 'c01'. Aceptamos ambos. */
  function normalizarCard(v) {
    const s = String(v ?? '').trim().toLowerCase();
    const m = s.match(/^(?:card|c|tarjeta)[-_ ]?0*(\d+)$/);
    return m ? 'c' + m[1].padStart(2, '0') : s;
  }

  /* ══════════ 1. DATOS (Supabase) ══════════ */
  let materiales = [];
  let estado = 'cargando';   // cargando | ok | error

  async function fetchMaletinMateriales() {
    if (!db) { estado = 'error'; return renderMaletin(); }
    const { data, error } = await db.from('materiales_maletin')
      .select('id,titulo,descripcion,tipo,url_descarga,tarjeta_requerida,bloque')
      .order('bloque', { ascending: true }).order('id', { ascending: true });
    if (error) { console.warn('[WinClic] Maletín:', error.message); estado = 'error'; }
    else { materiales = data || []; estado = 'ok'; }
    renderMaletin();
  }

  /* ══════════ 2. RENDER ══════════ */
  function tituloBloque(id) {
    const b = ((window.WC_CURRICULA && window.WC_CURRICULA.bloques) || []).find(x => x.id === id);
    return b ? `Vuelta ${b.nivel} · ${b.titulo}` : (id ? String(id).toUpperCase() : 'General');
  }

  function itemHTML(m, hechas) {
    const ok = hechas.has(normalizarCard(m.tarjeta_requerida));
    const ico = m.tipo === 'pdf' ? '📄' : '🖼️';
    const desc = m.descripcion ? `<span class="wcm-desc">${esc(m.descripcion)}</span>` : '';
    const attrs = ok
      ? `href="${esc(m.url_descarga)}" download target="_blank" rel="noopener"`
      : 'aria-disabled="true" tabindex="-1"';
    return `<a class="wcm-item ${ok ? 'is-unlocked' : 'is-locked'}" data-required-card="${esc(m.tarjeta_requerida)}" ${attrs}>
              <span class="wcm-ico">${ico}</span>
              <span class="wcm-title">${esc(m.titulo)}</span>${desc}
              <span class="wcm-state">${ok ? '📥 Descargar' : '🔒 Bloqueado'}</span>
            </a>`;
  }

  function renderMaletin() {
    const cont = document.getElementById('content-modal-maletin');
    if (!cont) return;
    if (estado === 'cargando') { cont.innerHTML = '<p class="wcm-count">Cargando tu maletín…</p>'; return; }
    if (estado === 'error') { cont.innerHTML = '<p class="wcm-count">No se pudo cargar el maletín. Revisa tu conexión.</p>'; return; }
    if (!materiales.length) { cont.innerHTML = '<p class="wcm-count">Aún no hay materiales en el maletín.</p>'; return; }

    const hechas = completadas();
    const desbloq = materiales.filter(m => hechas.has(normalizarCard(m.tarjeta_requerida))).length;
    const grupos = {};
    materiales.forEach(m => (grupos[m.bloque || ''] = grupos[m.bloque || ''] || []).push(m));

    cont.innerHTML = `<p class="wcm-count">${desbloq} / ${materiales.length} recursos desbloqueados</p>` +
      Object.keys(grupos).sort().map(b => `
        <h3 class="wcm-group">${esc(tituloBloque(b))}</h3>
        <div class="wcm-grid">${grupos[b].map(m => itemHTML(m, hechas)).join('')}</div>`).join('');
  }

  // Ítem bloqueado: nunca navega
  document.addEventListener('click', (e) => {
    const it = e.target.closest('.wcm-item.is-locked');
    if (!it) return;
    e.preventDefault();
    if (window.WC) window.WC.toast('🔒 Termina la tarjeta para desbloquear', 'err');
  });

  // Refrescar: al abrir el modal, al completar tarjeta, al cambiar de piloto
  document.querySelectorAll('[data-modal="modal-maletin"]').forEach(b => b.addEventListener('click', renderMaletin));
  document.addEventListener('winclic:tarjeta-completada', renderMaletin);
  document.addEventListener('winclic:asesor-listo', renderMaletin);
  window.fetchMaletinMateriales = fetchMaletinMateriales;
  window.renderMaletin = renderMaletin;
  renderMaletin();
  fetchMaletinMateriales();                       // consulta al cargar la página

  /* ══════════ 3. MICRO-RECOMPENSA: TROFEO → CAJITA + CONFETI ══════════ */
  const COLORES = ['#FF6B00', '#FFD000', '#FFFFFF', '#111111', '#FFB800', '#2F9E44'];
  let activo = false;

  function confeti(host) {
    for (let i = 0; i < 36; i++) {
      const p = document.createElement('i');
      const ang = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 110;
      p.className = 'wcr-conf';
      p.style.cssText = `--x:${Math.cos(ang) * dist}px;--y:${Math.sin(ang) * dist - 60}px;--r:${Math.random() * 720 - 360}deg;` +
        `background:${COLORES[i % COLORES.length]};animation-delay:${Math.random() * 60}ms`;
      host.appendChild(p);
    }
  }

  function mostrar() {
    if (activo) return;
    activo = true;
    const el = document.createElement('div');
    el.className = 'wcr-overlay';
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <div class="wcr-card">
        <div class="wcr-stage">
          <img class="wcr-trophy" src="assets/icons/trofeo.svg" alt="">
          <div class="wcr-box"><span class="wcr-box-front"></span></div>
          <div class="wcr-burst"></div>
        </div>
        <p class="wcr-text">¡Nuevo artículo desbloqueado en tu Maletín!</p>
      </div>`;
    document.body.appendChild(el);
    setTimeout(() => confeti(el.querySelector('.wcr-burst')), 700);        // justo cuando el trofeo cae en la caja
    setTimeout(() => el.classList.add('is-out'), 2600);
    setTimeout(() => { el.remove(); activo = false; }, 3000);
  }
  window.WinRecompensa = { mostrar };
})();
