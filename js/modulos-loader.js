/* =====================================================================
   WINCLIC · RUTA ESTILO "PATH" DE DUOLINGO  (js/modulos-loader.js)
   - Pinta la currícula de js/curricula.js: cabecera, islas de bloque,
     tarjetas, cofres de Quiz y trofeo final.
   - Camino = SVG inyectado: naranja sólido (completado) / punteado gris (bloqueado).
   - Burbuja "¡Empieza Aquí!" sobre el único nodo en curso.
   - Bloque con soloRol:'backoffice' solo aparece si el asesor eligió ese rol.
   - Progreso en LocalStorage por asesor + paquete a Supabase al completar.
   - Los contenidos de cada tarjeta pueden venir de la tabla `modulos`
     (columna slug = id de la tarjeta) subidos desde panel.html.
   Requiere: curricula.js, config.js, supabase-client.js, pase-abordaje.js,
             quiz.js, winclic-ui.css, ruta.css
   ===================================================================== */
(function () {
  'use strict';
  const { db, config, ls, esc, toast } = window.WC;
  const CUR = window.WC_CURRICULA;

  const cont = document.querySelector('.path-container') || document.querySelector('.wcp-path');
  if (!cont || !CUR) { console.error('[WinClic] Falta .path-container o js/curricula.js'); return; }
  cont.className = 'wcp-path';               // toma el control del contenedor (estilos en ruta.css)

  /* ══════════ AJUSTES ══════════ */
  // true  = una tarjeta SIN contenido cargado aún se puede marcar completada (útil mientras subes archivos).
  // false = en producción: sin contenido no se avanza.
  const PERMITIR_COMPLETAR_SIN_CONTENIDO = true;
  const TEXTO_BURBUJA = '¡Empieza Aquí!';
  const DX = [0, 56, 88, 56, 0, -56, -88, -56];            // vaivén del zigzag (px)
  const NIVELES = ['', 'Básico', 'Intermedio', 'Avanzado', 'Experto'];

  /* ══════════ ESTADO ══════════ */
  let overrides = {};              // slug → [{tipo,titulo,url}] desde Supabase
  let pasos = [];                  // elementos visibles y aplanados (con estado)
  let ultimoCompletado = null;     // para animar el "camino revelador" una sola vez
  let visorEl = null, tarjetaAbierta = null;

  /* ══════════ ASESOR Y PROGRESO ══════════ */
  const asesor = () => (window.PaseAbordaje && window.PaseAbordaje.asesor()) || null;
  const rolActual = () => (asesor() && asesor().rol) || 'ventas';
  const claveAsesor = () => { const a = asesor(); return a ? `${a.agencia}|${a.nombre}|${a.apellido}`.toLowerCase() : '_anon'; };
  const leerProgreso = () => new Set((ls.get(config.KEYS.progreso, {}))[claveAsesor()] || []);
  function guardarProgreso(set) {
    const todo = ls.get(config.KEYS.progreso, {});
    todo[claveAsesor()] = [...set];
    ls.set(config.KEYS.progreso, todo);
  }

  /* ══════════ MODELO: aplanar currícula según rol y progreso ══════════ */
  function construirPasos() {
    const guardados = leerProgreso();
    const rol = rolActual();
    const bloques = CUR.bloques.filter(b => !b.soloRol || b.soloRol === rol);

    // Meta final como un "bloque" más, para pintarle su propia isla
    const metaBloque = { id: 'meta', nivel: 0, tema: 'black', titulo: 'Meta Final', emoji: '🏁',
      subtitulo: 'Un último reto para demostrar todo lo aprendido.', items: [CUR.meta] };

    const lista = [];
    [...bloques, metaBloque].forEach(b => b.items.forEach(it => lista.push({ ...it, bloque: b })));

    // Estado secuencial: done (si todo lo anterior está hecho) · current (el primero pendiente) · locked
    let todoPrevioHecho = true;
    lista.forEach(p => {
      if (todoPrevioHecho && guardados.has(p.id)) p.estado = 'done';
      else if (todoPrevioHecho) { p.estado = 'current'; todoPrevioHecho = false; }
      else p.estado = 'locked';
    });
    return { lista, bloques: [...bloques, metaBloque] };
  }

  /* ══════════ PINTADO ══════════ */
  function iconoNodo(p) {
    if (p.tipo === 'quiz') return `<span class="wcp-chest-label">Quiz</span>`;
    return `<span class="wcp-ico">${esc(p.emoji || '📄')}</span>`;
  }

  function nodoHTML(p, dx) {
    const claseBase = p.tipo === 'quiz' ? 'wcp-chest' : p.tipo === 'meta' ? 'wcp-trophy' : 'wcp-node';
    const cls = `${claseBase} is-${p.estado}`;
    const alignClass = dx > 0 ? 'is-align-left' : (dx < 0 ? 'is-align-right' : 'is-align-right');
    const insignia = p.estado === 'done' ? '<span class="wcp-badge wcp-badge--ok">✓</span>'
      : p.estado === 'locked' ? '<span class="wcp-badge">🔒</span>' : '';
    const extra = p.tipo === 'quiz' && p.estado === 'current' ? '<span class="wcp-halo"></span>'
      : p.tipo === 'meta' && p.estado !== 'locked' ? '<span class="wcp-rays"></span>' : '';
    const interior = p.tipo === 'meta' ? '<span class="wcp-ico">🏆</span>' : iconoNodo(p);
    const kicker = p.tipo === 'quiz' ? 'Checkpoint' : p.tipo === 'meta' ? 'Meta final' : `Tarjeta ${p.n}`;
    const estadoTxt = { done: '<em class="ok">Completado</em>', current: '<em>En curso</em>', locked: '<em>Bloqueado</em>' }[p.estado];
    const tip = p.estado === 'current' ? `<div class="wcp-tip" role="note">${TEXTO_BURBUJA}</div>` : '';
    const id = esc(p.id);

    return `
      <div class="wcp-node-wrap ${alignClass}" data-id="${id}" data-estado="${p.estado}" style="--dx:${dx}">
        <div class="wcp-node-box">
          ${extra}
          <button type="button" class="${cls}" aria-label="${esc(p.titulo)} — ${p.estado}" ${p.estado === 'locked' ? 'aria-disabled="true"' : ''}>
            ${interior}${insignia}
          </button>
          ${tip}
        </div>
        <div class="wcp-label"><small>${kicker}</small>${esc(p.titulo)}${estadoTxt}</div>
      </div>`;
  }

  function islaHTML(b, items) {
    const hechos = items.filter(i => i.estado === 'done').length;
    const bloqueado = items.every(i => i.estado === 'locked');
    const nivel = b.id === 'meta' ? '🏁 Meta final' : `Nivel ${b.nivel} · ${NIVELES[b.nivel] || ''}`;
    const rolTag = b.soloRol ? ' · Backoffice' : '';
    return `
      <section class="wcp-island ${bloqueado ? 'is-locked' : ''}" data-tema="${esc(b.tema)}" data-nivel="${esc(nivel)}" data-bloque="${esc(b.id)}" aria-label="${esc(b.titulo)}">
        <span class="wcp-island-emoji" aria-hidden="true">${esc(b.emoji)}</span>
        ${b.id !== 'meta' ? `<small style="font-weight:800;letter-spacing:.14em;opacity:.8">BLOQUE ${b.nivel}${rolTag}</small>` : ''}
        <h3>${esc(b.titulo)}</h3>
        <p>${esc(b.subtitulo || '')}</p>
        <span class="wcp-island-meta">${hechos}/${items.length} completados</span>
      </section>`;
  }

  function heroHTML(total, hechos) {
    const pct = total ? Math.round((hechos / total) * 100) : 0;
    const a = asesor();
    return `
      <header class="wcp-hero">
        <div style="font-size:2.4rem" aria-hidden="true">🚀</div>
        <h2>${a ? `¡Hola, ${esc(a.nombre)}!` : esc(CUR.cabecera.titulo)}</h2>
        <p>${esc(CUR.cabecera.subtitulo)}</p>
        <div class="wcp-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
        <div class="wcp-hero-actions">
          <button type="button" class="wc-btn wc-btn--sm" data-hero="video">▶ Video de bienvenida</button>
          <button type="button" class="wc-btn wc-btn--yellow wc-btn--sm" data-hero="guia">🧭 Guía de contenidos</button>
        </div>
      </header>`;
  }

  function pintar() {
    const { lista, bloques } = construirPasos();
    pasos = lista;
    const hechos = lista.filter(p => p.estado === 'done').length;

    let html = '<svg class="wcp-svg" aria-hidden="true"></svg>' + heroHTML(lista.length, hechos);
    let idx = 0;
    bloques.forEach(b => {
      const items = lista.filter(p => p.bloque === b);
      html += islaHTML(b, items);
      items.forEach((p, k) => {                       // el zigzag se reinicia al centro en cada isla
        html += `<div class="wcp-row" data-step="${idx}">${nodoHTML(p, DX[k % DX.length])}</div>`;
        idx++;
      });
    });
    cont.innerHTML = html;

    requestAnimationFrame(dibujarCamino);
  }

  /* ══════════ CAMINO SVG ══════════ */
  const SVGNS = 'http://www.w3.org/2000/svg';

  function dibujarCamino() {
    const svg = cont.querySelector('.wcp-svg');
    if (!svg) return;
    const cr = cont.getBoundingClientRect();
    if (!cr.width) return;                           // oculto (antes del login): se redibuja al mostrarse
    svg.setAttribute('viewBox', `0 0 ${cr.width} ${cr.height}`);
    svg.textContent = '';

    const puntos = [...cont.querySelectorAll('.wcp-island, .wcp-node, .wcp-chest, .wcp-trophy')].map(el => {
      const r = el.getBoundingClientRect();
      const x = r.left - cr.left + r.width / 2;
      if (el.classList.contains('wcp-island')) {
        return { isla: true, x, top: r.top - cr.top, bottom: r.bottom - cr.top - 14 };
      }
      const wrap = el.closest('.wcp-node-wrap');
      return { isla: false, x, y: r.top - cr.top + r.height / 2, id: wrap.dataset.id, estado: wrap.dataset.estado };
    });

    const trazo = (d, clase, extra) => {
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', clase);
      svg.appendChild(p);
      if (extra) extra(p);
    };

    for (let i = 0; i < puntos.length - 1; i++) {
      const a = puntos[i], b = puntos[i + 1];

      // ¿Tramo "recorrido"? Nodo hecho → sí. Isla → si el nodo previo está hecho (o, la 1ª isla, si ya hay algo desbloqueado)
      let recorrido;
      if (!a.isla) recorrido = a.estado === 'done';
      else {
        const previo = puntos.slice(0, i).reverse().find(p => !p.isla);
        recorrido = previo ? previo.estado === 'done' : b.estado !== 'locked';
      }

      const x1 = a.x, y1 = a.isla ? a.bottom : a.y;
      const x2 = b.x, y2 = b.isla ? b.top : b.y;
      const dy = (y2 - y1) * 0.5;
      const d = `M${x1} ${y1} C${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;

      if (recorrido) {
        const revelar = !a.isla && a.id === ultimoCompletado;     // "camino revelador"
        const anim = (p) => { const len = p.getTotalLength(); p.style.setProperty('--len', len); p.classList.add('wcp-seg--reveal'); };
        trazo(d, 'wcp-seg wcp-seg--shadow', revelar ? anim : null);
        trazo(d, 'wcp-seg wcp-seg--done', revelar ? anim : null);
      } else {
        trazo(d, 'wcp-seg wcp-seg--lock');
      }
    }
    ultimoCompletado = null;
  }

  // Redibuja si cambia el tamaño (rotar el celular, mostrar el dashboard tras el login, etc.)
  if ('ResizeObserver' in window) {
    let raf = 0;
    new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(dibujarCamino); }).observe(cont);
  }
  window.addEventListener('resize', () => requestAnimationFrame(dibujarCamino));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(dibujarCamino));

  /* ══════════ INTERACCIÓN ══════════ */
  cont.addEventListener('click', (e) => {
    const hero = e.target.closest('[data-hero]');
    if (hero) return hero.dataset.hero === 'guia' ? abrirGuia() : abrirVideoBienvenida();

    const btn = e.target.closest('.wcp-node, .wcp-chest, .wcp-trophy');
    if (!btn) return;
    const p = pasos[Number(btn.closest('.wcp-row').dataset.step)];
    if (!p) return;

    if (p.estado === 'locked') {
      const wrap = btn.closest('.wcp-node-wrap');
      wrap.classList.remove('is-shaking'); void wrap.offsetWidth; wrap.classList.add('is-shaking');
      return toast('🔒 Completa primero el paso anterior');
    }
    if (p.tipo === 'quiz' || p.tipo === 'meta') {
      if (p.estado === 'done') return toast('¡Ya superaste este reto! 🏆');
      return window.WinQuiz.abrir(p.quizId);
    }
    abrirTarjeta(p);
  });

  function completar(id, { enviar = true } = {}) {
    const set = leerProgreso();
    if (set.has(id)) return;
    set.add(id);
    guardarProgreso(set);
    ultimoCompletado = id;
    if (enviar && window.PaseAbordaje) window.PaseAbordaje.completarCurso('tarjeta-' + id, 100); // paquete a Supabase
    pintar();
    if (construirPasos().lista.every(p => p.estado === 'done')) document.dispatchEvent(new CustomEvent('winclic:ruta-completada'));
  }

  /* ══════════ VISOR (modal + iframe / video / imagen) ══════════ */
  function construirVisor() {
    visorEl = document.createElement('div');
    visorEl.className = 'wc-overlay';
    visorEl.setAttribute('role', 'dialog');
    visorEl.setAttribute('aria-modal', 'true');
    visorEl.innerHTML = `
      <div class="wc-modal wc-modal--wide" style="max-width:860px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem">
          <h2 id="wcv-title" style="margin:0;text-align:left;font-size:1.3rem"></h2>
          <button class="wc-btn wc-btn--ghost wc-btn--sm" id="wcv-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="wcp-tabs" id="wcv-tabs" role="tablist"></div>
        <div id="wcv-body"></div>
        <button class="wc-btn wc-btn--green wc-btn--block" id="wcv-ok" style="margin-top:1.2rem"></button>
      </div>`;
    document.body.appendChild(visorEl);
    visorEl.querySelector('#wcv-close').onclick = cerrarVisor;
    visorEl.addEventListener('click', (e) => { if (e.target === visorEl) cerrarVisor(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && visorEl.classList.contains('wc-open')) cerrarVisor(); });
  }

  function abrirVisorBase(titulo) {
    if (!visorEl) construirVisor();
    visorEl.querySelector('#wcv-title').textContent = titulo;
    visorEl.querySelector('#wcv-tabs').innerHTML = '';
    visorEl.querySelector('#wcv-body').innerHTML = '';
    visorEl.querySelector('#wcv-ok').hidden = true;
    visorEl.classList.add('wc-open');
    document.body.style.overflow = 'hidden';
    return { tabs: visorEl.querySelector('#wcv-tabs'), body: visorEl.querySelector('#wcv-body'), ok: visorEl.querySelector('#wcv-ok') };
  }

  function cerrarVisor() {
    visorEl.classList.remove('wc-open');
    document.body.style.overflow = '';
    tarjetaAbierta = null;
    setTimeout(() => { visorEl.querySelector('#wcv-body').innerHTML = ''; }, 250);   // detiene video / iframe
  }

  const contenidosDe = (p) => (overrides[p.id] && overrides[p.id].length ? overrides[p.id] : (p.contenidos || []));
  const ICONO_TIPO = { html: '📖', pdf: '📄', video: '🎬', imagen: '🖼️' };

  function pintarContenido(c) {
    const u = esc(c.url);
    const abrir = `<p style="margin:.8rem 0 0">¿No se ve bien en tu celular? <a href="${u}" target="_blank" rel="noopener" style="font-weight:700;color:var(--wc-orange)">Abrir en pestaña nueva ↗</a></p>`;
    if (!c.url) return `<div class="wcp-pending"><div class="wc-emoji-big">🛠️</div><h3>Contenido próximamente</h3><p>Estamos preparando este material.</p></div>`;
    if (c.tipo === 'video') return `<video src="${u}" controls playsinline controlsList="nodownload" style="width:100%;border-radius:18px;background:#000;max-height:60vh"></video>`;
    if (c.tipo === 'imagen') return `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="${esc(c.titulo)}" style="width:100%;border-radius:18px;max-height:65vh;object-fit:contain;background:#fff"></a>`;
    return `<iframe src="${u}" title="${esc(c.titulo)}" style="width:100%;height:60vh;border:0;border-radius:18px;background:#fff"></iframe>${abrir}`;
  }

  function abrirTarjeta(p) {
    tarjetaAbierta = p;
    const lista = contenidosDe(p);
    const hecho = p.estado === 'done';
    const { tabs, body, ok } = abrirVisorBase(`${p.emoji || '📄'} ${p.titulo}`);

    let maxDesbloqueado = hecho ? lista.length - 1 : 0;

    function refrescarBoton() {
      ok.hidden = false;
      if (hecho) { ok.disabled = true; ok.textContent = '✅ Ya completado'; return; }
      if (lista.length === 0) {
        ok.disabled = !PERMITIR_COMPLETAR_SIN_CONTENIDO;
        ok.textContent = PERMITIR_COMPLETAR_SIN_CONTENIDO ? 'Marcar como completado ✅' : 'Contenido próximamente';
        return;
      }
      const todoDesbloqueado = maxDesbloqueado >= lista.length - 1;
      ok.disabled = !todoDesbloqueado;
      ok.textContent = !todoDesbloqueado ? 'Completa los pasos anteriores' : 'Marcar como completado ✅';
    }

    function pintarTab(c, i) {
      const lockIcon = (i > maxDesbloqueado) ? '🔒 ' : '';
      const cl = (i > maxDesbloqueado) ? 'wcp-tab is-locked' : 'wcp-tab';
      return `<button type="button" role="tab" class="${cl}" aria-selected="false" data-idx="${i}" ${i > maxDesbloqueado ? 'disabled' : ''}>${lockIcon}${ICONO_TIPO[c.tipo] || '📎'} ${esc(c.titulo)}</button>`;
    }

    function renderTabs(activeIdx) {
      if (lista.length > 1) {
        tabs.innerHTML = lista.map((c, i) => pintarTab(c, i)).join('');
        const activeTab = tabs.querySelector(`[data-idx="${activeIdx}"]`);
        if (activeTab) activeTab.setAttribute('aria-selected', 'true');
      }
    }

    function avanzarAlSiguiente(actualIdx) {
      if (hecho) return;
      const nextIdx = actualIdx + 1;
      if (nextIdx > maxDesbloqueado && nextIdx < lista.length) {
        maxDesbloqueado = nextIdx;
        renderTabs(nextIdx);
        const nextTab = tabs.querySelector(`[data-idx="${nextIdx}"]`);
        if (nextTab) nextTab.classList.add('is-just-unlocked');
        mostrar(nextIdx);
      } else if (nextIdx >= lista.length) {
        maxDesbloqueado = nextIdx;
        renderTabs(actualIdx);
        refrescarBoton();
      }
    }

    function mostrar(i) {
      const c = lista[i];
      let contentHtml = pintarContenido(c);

      if (!hecho && c.url && c.tipo !== 'video' && i === maxDesbloqueado) {
        const txtBoton = (i === lista.length - 1) ? 'Finalizar revisión ✅' : 'Siguiente paso ➡️';
        contentHtml += `<div style="text-align:center; margin-top: 1.5rem;"><button type="button" class="wc-btn wc-btn--yellow" id="wcv-btn-avanzar">${txtBoton}</button></div>`;
      }

      body.innerHTML = contentHtml;
      renderTabs(i);

      if (c.tipo === 'video' && !hecho && i === maxDesbloqueado) {
        const v = body.querySelector('video');
        if (v) v.addEventListener('ended', () => avanzarAlSiguiente(i), { once: true });
      }

      const btnAvanzar = body.querySelector('#wcv-btn-avanzar');
      if (btnAvanzar) btnAvanzar.onclick = () => avanzarAlSiguiente(i);

      refrescarBoton();
    }

    if (lista.length > 1) {
      tabs.onclick = (e) => { 
        const t = e.target.closest('.wcp-tab'); 
        if (t && !t.disabled) mostrar(Number(t.dataset.idx)); 
      };
    }
    
    if (lista.length) mostrar(0);
    else { body.innerHTML = pintarContenido({ url: '' }); refrescarBoton(); }

    ok.onclick = () => {
      if (!tarjetaAbierta || ok.disabled) return;
      const id = tarjetaAbierta.id;
      cerrarVisor();
      completar(id);
      toast('¡Tarjeta completada! ⭐');
    };
  }

  function abrirVideoBienvenida() {
    const v = CUR.cabecera.video;
    const { body } = abrirVisorBase(`🎬 ${v.titulo}`);
    body.innerHTML = pintarContenido({ tipo: 'video', titulo: v.titulo, url: v.url });
  }

  function abrirGuia() {
    const { lista, bloques } = construirPasos();
    const { body, ok } = abrirVisorBase('🧭 Guía de contenidos');
    body.innerHTML = `<div class="wcp-guide">${bloques.map(b => `
      <div class="wcp-guide-block"><h4>${esc(b.emoji)} ${b.id === 'meta' ? '' : `Bloque ${b.nivel}: `}${esc(b.titulo)}${b.soloRol ? ' <span class="wc-pill">Solo Backoffice</span>' : ''}</h4>
        <ul>${lista.filter(p => p.bloque === b).map(p => `<li class="${p.estado === 'done' ? 'done' : ''}">${p.estado === 'done' ? '✅' : p.tipo === 'tarjeta' ? '📘' : '🏆'} ${esc(p.titulo)}</li>`).join('')}</ul>
      </div>`).join('')}
      ${rolActual() !== 'backoffice' ? '<p style="font-size:.85rem;margin:0">ℹ️ El Bloque 4 (Sistemas y Gestión) es exclusivo para Backoffice. Tu ruta pasa directo al Quiz General.</p>' : ''}
    </div>`;
    ok.hidden = false; ok.disabled = false; ok.textContent = '¡Vamos! 🚀';
    ok.onclick = () => { cerrarVisor(); enfocarActual(); };
  }

  function enfocarActual() {
    const el = cont.querySelector('.wcp-node-wrap[data-estado="current"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ══════════ SUPABASE: contenidos subidos desde el panel ══════════ */
  async function cargarContenidosRemotos() {
    const { data, error } = await db.from('modulos')
      .select('slug,tipo,titulo,url,orden').eq('activo', true).not('slug', 'is', null).order('orden');
    if (error) { console.warn('[WinClic] Usando contenidos por defecto de curricula.js:', error.message); return; }
    overrides = {};
    (data || []).forEach(m => { (overrides[m.slug] = overrides[m.slug] || []).push({ tipo: m.tipo, titulo: m.titulo, url: m.url }); });
  }

  /* ══════════ EVENTOS DEL ECOSISTEMA ══════════ */
  document.addEventListener('winclic:asesor-listo', () => { pintar(); setTimeout(enfocarActual, 700); });   // otro asesor/rol → otra ruta
  document.addEventListener('winclic:quiz-aprobado', (e) => {
    const p = pasos.find(x => x.quizId === e.detail.quizId);
    if (p) completar(p.id, { enviar: false });        // quiz.js ya envió su paquete a Supabase
  });
  document.addEventListener('winclic:repasar', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Repasa las tarjetas anteriores 📚 y vuelve cuando termine el contador.');
  });

  /* ══════════ ARRANQUE ══════════ */
  pintar();                                                // se ve al instante con los datos locales
  cargarContenidosRemotos();                               // y luego aplica lo que subió el admin
})();
