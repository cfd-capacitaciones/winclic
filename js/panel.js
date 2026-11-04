/* =====================================================================
   WINCLIC · LÓGICA DEL PANEL ADMIN  (js/panel.js → solo lo usa panel.html)
   1. Auth (Supabase Auth)      3. Editor de quizzes
   2. Gestor documental         4. Mapa de calor / preguntas trampa
   ===================================================================== */
(function () {
  'use strict';
  const { db, config: C, esc, toast } = window.WC;
  const $ = (id) => document.getElementById(id);
  const NUM_PREGUNTAS = 5;
  let booted = false;

  /* ═══════════════════ 1. AUTENTICACIÓN ═══════════════════ */
  async function mostrarPanel(session) {
    $('auth-overlay').classList.remove('wc-open');
    $('panel-app').hidden = false;
    $('admin-email').textContent = session.user.email;
    if (!booted) { booted = true; await bootPanel(); }
  }
  function mostrarLogin() {
    booted = false;
    $('panel-app').hidden = true;
    $('auth-overlay').classList.add('wc-open');
  }

  $('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('auth-submit');
    btn.disabled = true; btn.textContent = 'Verificando…';
    const { error } = await db.auth.signInWithPassword({
      email: $('auth-email').value.trim(),
      password: $('auth-pass').value
    });
    btn.disabled = false; btn.textContent = 'Entrar ⚡';
    if (error) {
      $('auth-pass').classList.add('wc-invalid');
      setTimeout(() => $('auth-pass').classList.remove('wc-invalid'), 400);
      toast('Credenciales incorrectas', 'err');
    }
  });
  $('btn-logout').addEventListener('click', () => db.auth.signOut());

  db.auth.onAuthStateChange((_evt, session) => { session ? mostrarPanel(session) : mostrarLogin(); });
  db.auth.getSession().then(({ data }) => { if (data.session) mostrarPanel(data.session); });

  /* ── Tabs ── */
  document.querySelectorAll('.wc-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.wc-tab').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    ['contenidos', 'quizzes', 'analitica', 'agencias', 'maletin'].forEach(n => { 
      const section = $('tab-' + n);
      if (section) section.hidden = n !== tab.dataset.tab; 
    });
    if (tab.dataset.tab === 'analitica') cargarAnalitica();
    if (tab.dataset.tab === 'agencias') { listarAgencias(); cargarMetricasAgencias(); }
    if (tab.dataset.tab === 'quizzes') cargarIntentos();
  }));

  async function bootPanel() {
    await cargarQuizzesEnSelects();
    await listarModulos();
    construirEditorQuiz();
    if ($('ag-list')) await listarAgencias();
    iniciarFiltroMes();
    cargarIntentos();
    cargarMetricasAgencias();
  }

  /* ═══════════════════ 2. GESTOR DOCUMENTAL ═══════════════════ */
  let archivoElegido = null;

  /* Tarjetas disponibles = las de js/curricula.js (única fuente de verdad) */
  const SLOTS = [];
  ((window.WC_CURRICULA && window.WC_CURRICULA.bloques) || []).forEach(b =>
    b.items.filter(i => i.tipo === 'tarjeta').forEach(i =>
      SLOTS.push({ id: i.id, titulo: `${i.n}. ${i.titulo}`, bloque: b.titulo, soloRol: b.soloRol })));
  const nombreSlot = (s) => (SLOTS.find(x => x.id === s) || {}).titulo || '⚠️ Sin tarjeta (se ignora)';
  $('mod-slot').innerHTML = '<option value="">— Elige la tarjeta —</option>' + SLOTS.map(s =>
    `<option value="${esc(s.id)}">${esc(s.titulo)} · ${esc(s.bloque)}${s.soloRol ? ' (Backoffice)' : ''}</option>`).join('');

  const tipoSel = $('mod-tipo');
  function ajustarFormularioTipo() {
    const t = tipoSel.value;
    const conArchivo = t === 'pdf' || t === 'video' || t === 'imagen';
    $('mod-file-wrap').hidden = !conArchivo;
    $('mod-url-wrap').hidden = t !== 'html';
    $('mod-quiz-wrap').hidden = true;
    $('mod-emoji').value = { pdf: '📄', video: '🎬', imagen: '🖼️', html: '🔗' }[t] || '📄';
    $('drop-hint').textContent = ({ pdf: 'PDF', video: 'Video MP4', imagen: 'Imagen PNG / JPG / WebP' }[t] || '') + ` · máx. ${C.MAX_UPLOAD_MB} MB`;
    if (conArchivo) $('mod-file').accept = { pdf: 'application/pdf', video: 'video/*', imagen: 'image/*' }[t];
    archivoElegido = null; $('mod-file').value = '';
    $('drop-title').textContent = 'Arrastra tu archivo aquí o toca para elegir';
  }
  tipoSel.addEventListener('change', ajustarFormularioTipo);
  ajustarFormularioTipo();

  const drop = $('drop');
  drop.addEventListener('click', () => $('mod-file').click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('mod-file').click(); } });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('wc-over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('wc-over'); }));
  drop.addEventListener('drop', (e) => elegirArchivo(e.dataTransfer.files[0]));
  $('mod-file').addEventListener('change', (e) => elegirArchivo(e.target.files[0]));

  function validarArchivo(file, tipo) {
    if (!file) return 'No elegiste ningún archivo.';
    if (file.size > C.MAX_UPLOAD_MB * 1024 * 1024) return `El archivo pesa ${(file.size / 1048576).toFixed(1)} MB (máx. ${C.MAX_UPLOAD_MB} MB).`;
    if (tipo === 'pdf' && file.type !== 'application/pdf') return 'Debe ser un PDF.';
    if (tipo === 'video' && !file.type.startsWith('video/')) return 'Debe ser un video (MP4 recomendado).';
    if (tipo === 'imagen' && !file.type.startsWith('image/')) return 'Debe ser una imagen (PNG, JPG o WebP).';
    return null;
  }
  function elegirArchivo(file) {
    if (!file) return;
    const err = validarArchivo(file, tipoSel.value);
    if (err) { toast(err, 'err'); return; }
    archivoElegido = file;
    $('drop-title').textContent = `✅ ${file.name} (${(file.size / 1048576).toFixed(1)} MB)`;
  }

  const limpiarNombre = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();

  /** Sube a Storage con barra de progreso real (XHR). Devuelve {path, url}. */
  async function subirAStorage(file, carpeta, onProgress) {
    const { data: { session } } = await db.auth.getSession();
    if (!session) throw new Error('Sesión expirada');
    const path = `${carpeta}/${Date.now()}-${limpiarNombre(file.name)}`;

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${C.SUPABASE_URL}/storage/v1/object/${C.BUCKET}/${path}`);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('apikey', C.SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('cache-control', 'max-age=3600');
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Storage ${xhr.status}: ${xhr.responseText}`));
      xhr.onerror = () => reject(new Error('Error de red al subir'));
      xhr.send(file);
    });

    const { data } = db.storage.from(C.BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  function barra(p) {
    $('up-bar').style.display = p === null ? 'none' : 'block';
    if (p !== null) $('up-fill').style.width = Math.round(p * 100) + '%';
  }

  $('mod-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = $('mod-titulo').value.trim();
    const tipo = tipoSel.value;
    if (titulo.length < 2) { toast('Escribe un título', 'err'); return; }

    const slug = $('mod-slot').value;
    if (!slug) { toast('Elige la tarjeta destino', 'err'); return; }

    const fila = { slug, titulo, emoji: $('mod-emoji').value.trim() || '📄', tipo, activo: true };
    const btn = $('mod-submit');
    btn.disabled = true; btn.textContent = 'Publicando…';

    try {
      if (tipo === 'pdf' || tipo === 'video' || tipo === 'imagen') {
        const err = validarArchivo(archivoElegido, tipo);
        if (err) throw new Error(err);
        barra(0);
        const up = await subirAStorage(archivoElegido, tipo, barra);
        fila.url = up.url; fila.storage_path = up.path;
      } else if (tipo === 'html') {
        fila.url = $('mod-url').value.trim();
        if (!fila.url) throw new Error('Pega la URL del contenido');
      } else {
        fila.quiz_id = $('mod-quiz').value;
        if (!fila.quiz_id) throw new Error('Primero crea una evaluación en la pestaña Evaluaciones');
      }

      const { data: ult } = await db.from('modulos').select('orden').order('orden', { ascending: false }).limit(1);
      fila.orden = ult && ult.length ? ult[0].orden + 1 : 1;

      const { error } = await db.from('modulos').insert(fila);
      if (error) throw error;

      toast('¡Módulo publicado! 🚀');
      $('mod-form').reset(); ajustarFormularioTipo();
      await listarModulos();
    } catch (err) {
      console.error(err);
      toast(err.message || 'No se pudo publicar', 'err');
    } finally {
      barra(null);
      btn.disabled = false; btn.textContent = 'Publicar módulo 🚀';
    }
  });

  async function listarModulos() {
    const { data: crudo, error } = await db.from('modulos').select('*').order('orden');
    const cont = $('mod-list');
    if (error) { cont.innerHTML = `<div class="wc-empty">Error: ${esc(error.message)}</div>`; return; }
    if (!crudo.length) { cont.innerHTML = '<div class="wc-empty">Aún no hay contenidos. ¡Sube el primero!</div>'; return; }

    // Agrupado por tarjeta, en el mismo orden que la currícula
    const idxSlot = (s) => { const i = SLOTS.findIndex(x => x.id === s); return i < 0 ? 999 : i; };
    const data = crudo.slice().sort((a, b) => idxSlot(a.slug) - idxSlot(b.slug) || a.orden - b.orden);
    const mismoSlot = (i, j) => data[j] && data[i].slug === data[j].slug;

    cont.innerHTML = data.map((m, i) => `
      <div class="wc-row ${m.activo ? '' : 'wc-off'}" data-id="${m.id}">
        <span class="wc-row-emoji">${esc(m.emoji)}</span>
        <div class="wc-row-main">
          <b>${esc(nombreSlot(m.slug))} · ${esc(m.titulo)}</b>
          <small><span class="wc-pill">${esc(m.tipo)}</span> ${m.activo ? '' : '· oculto'}</small>
        </div>
        <button class="wc-btn wc-btn--ghost wc-btn--sm" data-a="up" ${mismoSlot(i, i - 1) ? '' : 'disabled'} title="Subir (dentro de la tarjeta)">↑</button>
        <button class="wc-btn wc-btn--ghost wc-btn--sm" data-a="down" ${mismoSlot(i, i + 1) ? '' : 'disabled'} title="Bajar (dentro de la tarjeta)">↓</button>
        <button class="wc-btn wc-btn--ghost wc-btn--sm" data-a="edit" title="Renombrar pestaña">✏️</button>
        ${['pdf', 'video', 'imagen'].includes(m.tipo) ? '<button class="wc-btn wc-btn--ghost wc-btn--sm" data-a="replace" title="Reemplazar archivo">🔄</button>' : ''}
        <button class="wc-btn wc-btn--ghost wc-btn--sm" data-a="toggle" title="Mostrar/ocultar">${m.activo ? '👁️' : '🙈'}</button>
        <button class="wc-btn wc-btn--danger wc-btn--sm" data-a="del" title="Eliminar">🗑️</button>
      </div>`).join('');

    cont.onclick = async (ev) => {
      const b = ev.target.closest('button[data-a]');
      if (!b) return;
      const idx = data.findIndex(m => m.id === b.closest('.wc-row').dataset.id);
      const m = data[idx];
      b.disabled = true;
      try {
        if (b.dataset.a === 'up' || b.dataset.a === 'down') {
          const otro = data[idx + (b.dataset.a === 'up' ? -1 : 1)];
          // intercambio de 'orden' (con valor temporal para no violar nada)
          await db.from('modulos').update({ orden: otro.orden }).eq('id', m.id);
          await db.from('modulos').update({ orden: m.orden }).eq('id', otro.id);
          // si tenían el mismo orden, los renumeramos por posición
          if (m.orden === otro.orden) await renumerar(data, idx, idx + (b.dataset.a === 'up' ? -1 : 1));
        } else if (b.dataset.a === 'toggle') {
          await db.from('modulos').update({ activo: !m.activo }).eq('id', m.id);
        } else if (b.dataset.a === 'edit') {
          const nuevo = prompt('Nuevo título:', m.titulo);
          if (nuevo && nuevo.trim()) await db.from('modulos').update({ titulo: nuevo.trim() }).eq('id', m.id);
        } else if (b.dataset.a === 'replace') {
          await reemplazarArchivo(m);
        } else if (b.dataset.a === 'del') {
          if (!confirm(`¿Eliminar "${m.titulo}"? Esto borra también el archivo.`)) { b.disabled = false; return; }
          if (m.storage_path) await db.storage.from(C.BUCKET).remove([m.storage_path]);
          await db.from('modulos').delete().eq('id', m.id);
        }
      } catch (err) { console.error(err); toast('Algo salió mal', 'err'); }
      await listarModulos();
    };
  }

  async function renumerar(lista, a, b) {
    const copia = lista.slice(); [copia[a], copia[b]] = [copia[b], copia[a]];
    await Promise.all(copia.map((m, i) => db.from('modulos').update({ orden: i + 1 }).eq('id', m.id)));
  }

  function reemplazarArchivo(m) {
    return new Promise((resolve) => {
      const inp = $('replace-file');
      inp.value = '';
      inp.accept = { pdf: 'application/pdf', video: 'video/*', imagen: 'image/*' }[m.tipo] || '*/*';
      inp.onchange = async () => {
        const f = inp.files[0];
        const err = validarArchivo(f, m.tipo);
        if (err) { toast(err, 'err'); return resolve(); }
        toast('Subiendo archivo nuevo…');
        try {
          const up = await subirAStorage(f, m.tipo);
          await db.from('modulos').update({ url: up.url, storage_path: up.path }).eq('id', m.id);
          if (m.storage_path) await db.storage.from(C.BUCKET).remove([m.storage_path]); // borra el viejo
          toast('Archivo reemplazado ✅');
        } catch (e) { console.error(e); toast(e.message, 'err'); }
        resolve();
      };
      inp.oncancel = () => resolve();
      inp.click();
    });
  }

  /* ═══════════════════ 3. EDITOR DE QUIZZES ═══════════════════ */
  async function cargarQuizzesEnSelects() {
    const { data } = await db.from('quizzes').select('id,titulo').order('created_at');
    const lista = data || [];
    const opts = lista.map(q => `<option value="${esc(q.id)}">${esc(q.titulo)} (${esc(q.id)})</option>`).join('');
    $('mod-quiz').innerHTML = opts || '<option value="">— sin evaluaciones —</option>';
    $('an-quiz').innerHTML = opts || '<option value="">— sin evaluaciones —</option>';
    $('qz-select').innerHTML = '<option value="">➕ Nueva evaluación</option>' + opts;
  }

  function construirEditorQuiz() {
    $('qz-questions').innerHTML = Array.from({ length: NUM_PREGUNTAS }, (_, i) => `
      <div class="wc-card" style="box-shadow:none;border:2px solid var(--wc-border)" data-q="${i}">
        <div class="wc-field">
          <label class="wc-label">Pregunta ${i + 1}</label>
          <input class="wc-input" data-f="enun" maxlength="240" placeholder="Escribe la pregunta" />
        </div>
        ${[0, 1, 2, 3].map(k => `
          <div class="wc-field" style="flex-direction:row;align-items:center;gap:.6rem">
            <input type="radio" name="correcta-${i}" value="${k}" ${k === 0 ? 'checked' : ''} aria-label="Marcar opción ${k + 1} como correcta" style="width:22px;height:22px;accent-color:var(--wc-green)" />
            <input class="wc-input" data-f="op${k}" maxlength="160" placeholder="Opción ${'ABCD'[k]}${k === 0 ? ' (la marcada es la correcta)' : ''}" />
          </div>`).join('')}
      </div>`).join('');
  }

  $('qz-select').addEventListener('change', async () => {
    const id = $('qz-select').value;
    construirEditorQuiz();
    if (!id) { $('qz-id').value = ''; $('qz-id').disabled = false; $('qz-titulo').value = ''; $('qz-min').value = 80; return; }

    const [{ data: q }, { data: ps }] = await Promise.all([
      db.from('quizzes').select('*').eq('id', id).single(),
      db.from('preguntas').select('*').eq('quiz_id', id).order('orden')
    ]);
    $('qz-id').value = q.id; $('qz-id').disabled = true;
    $('qz-titulo').value = q.titulo; $('qz-min').value = q.nota_minima;
    (ps || []).forEach((p, i) => {
      const blk = document.querySelector(`[data-q="${i}"]`);
      if (!blk) return;
      blk.querySelector('[data-f="enun"]').value = p.enunciado;
      p.opciones.forEach((o, k) => { const el = blk.querySelector(`[data-f="op${k}"]`); if (el) el.value = o; });
      const r = blk.querySelector(`input[type=radio][value="${p.correcta}"]`); if (r) r.checked = true;
    });
  });

  $('qz-save').addEventListener('click', async () => {
    const id = $('qz-id').value.trim();
    const titulo = $('qz-titulo').value.trim();
    const nota_minima = parseInt($('qz-min').value, 10);
    if (!/^[a-z0-9-]+$/.test(id)) return toast('ID: solo minúsculas, números y guiones', 'err');
    if (!titulo) return toast('Falta el título', 'err');
    if (isNaN(nota_minima) || nota_minima < 0 || nota_minima > 100) return toast('Nota mínima inválida', 'err');

    const preguntas = [];
    for (let i = 0; i < NUM_PREGUNTAS; i++) {
      const blk = document.querySelector(`[data-q="${i}"]`);
      const enunciado = blk.querySelector('[data-f="enun"]').value.trim();
      const opciones = [0, 1, 2, 3].map(k => blk.querySelector(`[data-f="op${k}"]`).value.trim());
      const correcta = parseInt(blk.querySelector('input[type=radio]:checked').value, 10);
      if (!enunciado || opciones.some(o => !o)) return toast(`Completa la pregunta ${i + 1} y sus 4 opciones`, 'err');
      preguntas.push({ quiz_id: id, orden: i + 1, enunciado, opciones, correcta });
    }

    const btn = $('qz-save'); btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      let r = await db.from('quizzes').upsert({ id, titulo, nota_minima }, { onConflict: 'id' });
      if (r.error) throw r.error;
      r = await db.from('preguntas').upsert(preguntas, { onConflict: 'quiz_id,orden' });
      if (r.error) throw r.error;
      toast('Evaluación guardada 💾');
      await cargarQuizzesEnSelects();
      $('qz-select').value = id;
    } catch (err) { console.error(err); toast(err.message || 'Error al guardar', 'err'); }
    btn.disabled = false; btn.textContent = 'Guardar evaluación 💾';
  });

  /* ═══════════════════ 4. MAPA DE CALOR · PREGUNTAS TRAMPA ═══════════════════ */
  const MIN_MUESTRA = 5; // intentos mínimos para llamar "trampa" a una pregunta

  $('an-quiz').addEventListener('change', cargarAnalitica);
  $('an-rango').addEventListener('change', cargarAnalitica);

  async function traerEvaluaciones(quizId, dias) {
    const todas = [];
    const PAGINA = 1000;
    for (let desde = 0; desde < 10000; desde += PAGINA) {
      let q = db.from('evaluaciones').select('agencia,nota,aprobado,created_at,detalle')
        .eq('quiz_id', quizId).order('created_at', { ascending: false }).range(desde, desde + PAGINA - 1);
      const rm = rangoMes();   // el filtro global por mes tiene prioridad sobre el selector de días
      if (rm) q = q.gte('created_at', rm.desde).lte('created_at', rm.hasta);
      else if (dias > 0) q = q.gte('created_at', new Date(Date.now() - dias * 864e5).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      todas.push(...data);
      if (data.length < PAGINA) break;
    }
    return todas;
  }

  async function cargarAnalitica() {
    const quizId = $('an-quiz').value;
    if (!quizId) { $('an-bars').innerHTML = '<div class="wc-empty">Crea una evaluación para ver su analítica.</div>'; $('an-kpis').innerHTML = ''; $('an-matrix').innerHTML = ''; return; }
    $('an-bars').innerHTML = '<div class="wc-empty">Calculando…</div>';

    let evals;
    try { evals = await traerEvaluaciones(quizId, parseInt($('an-rango').value, 10)); }
    catch (e) { $('an-bars').innerHTML = `<div class="wc-empty">Error: ${esc(e.message)}</div>`; return; }

    if (!evals.length) {
      $('an-kpis').innerHTML = ''; $('an-matrix').innerHTML = '';
      $('an-bars').innerHTML = '<div class="wc-empty">Todavía no hay intentos en este periodo 📭</div>';
      return;
    }

    /* — Agregación por pregunta y por agencia — */
    const preg = new Map();             // pregunta_id → {orden, enunciado, n, fallos}
    const matriz = new Map();           // agencia → Map(pregunta_id → {n, fallos})
    for (const ev of evals) {           // evals viene de más nuevo a más viejo → el 1º enunciado es el vigente
      if (!matriz.has(ev.agencia)) matriz.set(ev.agencia, new Map());
      for (const d of ev.detalle || []) {
        const p = preg.get(d.pregunta_id) || { orden: d.orden, enunciado: d.enunciado, n: 0, fallos: 0 };
        p.n++; if (!d.ok) p.fallos++;
        preg.set(d.pregunta_id, p);
        const cell = matriz.get(ev.agencia).get(d.pregunta_id) || { n: 0, fallos: 0 };
        cell.n++; if (!d.ok) cell.fallos++;
        matriz.get(ev.agencia).set(d.pregunta_id, cell);
      }
    }

    const filas = [...preg.entries()].map(([id, p]) => ({ id, ...p, rate: p.fallos / p.n }))
      .sort((a, b) => b.rate - a.rate);

    // Umbral estadístico: media + 1 desviación estándar de las tasas de error
    const media = filas.reduce((s, f) => s + f.rate, 0) / filas.length;
    const sd = Math.sqrt(filas.reduce((s, f) => s + (f.rate - media) ** 2, 0) / filas.length);
    const clase = (f) => (f.rate >= 0.5 || (f.rate >= 0.3 && f.rate >= media + sd)) ? 'hot' : (f.rate >= 0.3 ? 'warm' : 'cool');

    /* — KPIs — */
    const aprob = evals.filter(e => e.aprobado).length;
    const notaProm = evals.reduce((s, e) => s + e.nota, 0) / evals.length;
    const kpi = (v, l) => `<div class="wc-kpi"><b>${v}</b><small>${l}</small></div>`;
    $('an-kpis').innerHTML =
      kpi(evals.length, 'Intentos') +
      kpi(Math.round((aprob / evals.length) * 100) + '%', 'Aprobación') +
      kpi(Math.round(notaProm) + '%', 'Nota promedio') +
      kpi(matriz.size, 'Agencias');

    /* — Barras ordenadas: la más fallada arriba — */
    $('an-bars').innerHTML = filas.map(f => {
      const c = clase(f), pct = Math.round(f.rate * 100);
      const trampa = c === 'hot' && f.n >= MIN_MUESTRA;
      return `
        <div class="wc-heat-item ${c}">
          <div class="wc-heat-head">
            <span>P${f.orden}. ${esc(f.enunciado)}${trampa ? '<span class="wc-trap-tag">🪤 TRAMPA</span>' : ''}</span>
            <span>${pct}% error <small style="font-weight:500;opacity:.7">(${f.fallos}/${f.n})</small></span>
          </div>
          <div class="wc-heat-track"><div class="wc-heat-fill ${c}" style="width:${Math.max(pct, 2)}%"></div></div>
        </div>`;
    }).join('') + (filas.some(f => f.n < MIN_MUESTRA)
      ? `<small style="color:var(--wc-text-soft)">* Con menos de ${MIN_MUESTRA} intentos la muestra aún es pequeña: no se etiqueta como trampa.</small>` : '');

    /* — Matriz Agencias × Preguntas — */
    const cols = [...preg.entries()].sort((a, b) => a[1].orden - b[1].orden);
    const agencias = [...matriz.keys()].sort((a, b) => a.localeCompare(b, 'es'));
    $('an-matrix').innerHTML = `
      <table class="wc-matrix">
        <thead><tr><th>Agencia</th>${cols.map(([, p]) => `<th title="${esc(p.enunciado)}">P${p.orden}</th>`).join('')}</tr></thead>
        <tbody>
          ${agencias.map(ag => `<tr><td><b>${esc(ag)}</b></td>${cols.map(([pid]) => {
            const c = matriz.get(ag).get(pid);
            if (!c) return '<td>—</td>';
            const r = c.fallos / c.n;
            const rojo = r >= 0.5;
            const bg = rojo ? 'var(--wc-red)' : `hsl(${Math.round(120 * (1 - r * 2))}, 65%, 82%)`;
            return `<td style="background:${bg};color:${rojo ? '#fff' : '#1a202c'}" title="${c.fallos} errores de ${c.n} intentos">${Math.round(r * 100)}%</td>`;
          }).join('')}</tr>`).join('')}
        </tbody>
      </table>`;
  }

  /* ═══════════════════ 5. GESTIÓN DE AGENCIAS ═══════════════════ */
  async function listarAgencias() {
    const { data, error } = await db.from('agencias').select('*').order('created_at', { ascending: false });
    const cont = $('ag-list');
    if (error) { cont.innerHTML = `<tr><td colspan="5" class="wc-empty">Error: ${esc(error.message)}</td></tr>`; return; }
    if (!data || !data.length) { cont.innerHTML = '<tr><td colspan="5" class="wc-empty" style="text-align: center; padding: 2rem;">No hay agencias registradas.</td></tr>'; return; }

    cont.innerHTML = data.map(a => `
      <tr style="border-bottom: 1px solid var(--wc-border);">
        <td style="padding: 1rem 0.5rem;"><b>${esc(a.nombre)}</b><br><small style="color:var(--wc-text-soft)">${esc(a.departamento)}</small></td>
        <td style="padding: 1rem 0.5rem;"><code>${esc(a.codigo_acceso)}</code></td>
        <td style="padding: 1rem 0.5rem;">${esc(a.zona)}</td>
        <td style="padding: 1rem 0.5rem;"><span class="wc-pill" style="background: ${a.activa ? 'var(--wc-green)' : 'var(--wc-red)'}; color: #fff;">${a.activa ? 'Activa' : 'Inactiva'}</span></td>
        <td style="padding: 1rem 0.5rem; text-align: right; white-space: nowrap;">
          <button class="wc-btn wc-btn--ghost wc-btn--sm" data-ag-a="edit" data-id="${a.id}" title="Editar">✏️</button>
          <button class="wc-btn wc-btn--ghost wc-btn--sm" data-ag-a="toggle" data-id="${a.id}" title="${a.activa ? 'Desactivar' : 'Activar'}">${a.activa ? '🚫' : '✅'}</button>
          <button class="wc-btn wc-btn--danger wc-btn--sm" data-ag-a="del" data-id="${a.id}" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  $('ag-list')?.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-ag-a]');
    if (!b) return;
    const action = b.dataset.agA;
    const id = b.dataset.id;
    b.disabled = true;
    try {
      if (action === 'del') {
        if (!confirm('¿Seguro que deseas eliminar esta agencia permanentemente?')) return;
        await db.from('agencias').delete().eq('id', id);
        toast('Agencia eliminada', 'ok');
      } else if (action === 'toggle') {
        const { data: ag } = await db.from('agencias').select('activa').eq('id', id).single();
        if (ag) await db.from('agencias').update({ activa: !ag.activa }).eq('id', id);
      } else if (action === 'edit') {
        const { data: ag } = await db.from('agencias').select('*').eq('id', id).single();
        if (ag) {
          $('ag-id').value = ag.id;
          $('ag-nombre').value = ag.nombre;
          $('ag-codigo').value = ag.codigo_acceso;
          $('ag-zona').value = ag.zona;
          $('ag-departamento').value = ag.departamento;
          $('ag-activa').checked = ag.activa;
          $('ag-cancel').hidden = false;
          $('ag-nombre').focus();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (err) {
      console.error(err); toast('Error al procesar', 'err');
    } finally {
      b.disabled = false;
      if (action !== 'edit') await listarAgencias();
    }
  });

  $('ag-cancel')?.addEventListener('click', () => {
    $('ag-form').reset();
    $('ag-id').value = '';
    $('ag-cancel').hidden = true;
  });

  $('ag-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('ag-id').value;
    const fila = {
      nombre: $('ag-nombre').value.trim(),
      codigo_acceso: $('ag-codigo').value.trim(),
      zona: $('ag-zona').value,
      departamento: $('ag-departamento').value.trim(),
      activa: $('ag-activa').checked
    };
    if (!fila.nombre || !fila.codigo_acceso || !fila.departamento) return toast('Completa los campos obligatorios', 'err');

    const btn = $('ag-submit');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
      if (id) {
        const { error } = await db.from('agencias').update(fila).eq('id', id);
        if (error) throw error;
        toast('Agencia actualizada', 'ok');
      } else {
        const { error } = await db.from('agencias').insert(fila);
        if (error) throw error;
        toast('Agencia registrada', 'ok');
      }
      $('ag-form').reset();
      $('ag-id').value = '';
      $('ag-cancel').hidden = true;
      await listarAgencias();
    } catch (err) {
      console.error(err);
      toast(err.message?.includes('duplicate key') ? 'El código de acceso ya existe' : 'Error al guardar', 'err');
    } finally {
      btn.disabled = false; btn.textContent = 'Guardar Agencia 🏢';
    }
  });

  /* ═══════════════════ 6. HERRAMIENTAS DE ANÁLISIS (mes · CSV · métricas · reset) ═══════════════════ */
  // La fecha de cada registro vive en la columna `created_at` (timestamptz) de las tablas.
  const fmtFecha = (iso) => new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });

  /* ── 6.1 Filtro global por mes ── */
  /** Devuelve {desde, hasta} (ISO) del mes elegido, o null si no hay mes (= todo el historial). */
  function rangoMes() {
    const v = $('f-mes') && $('f-mes').value;           // 'YYYY-MM'
    if (!/^\d{4}-\d{2}$/.test(v || '')) return null;
    const [y, m] = v.split('-').map(Number);
    return {
      desde: new Date(y, m - 1, 1, 0, 0, 0, 0).toISOString(),
      hasta: new Date(y, m, 0, 23, 59, 59, 999).toISOString()
    };
  }

  function refrescarPorMes() {
    $('an-rango').disabled = !!rangoMes();              // con mes activo, el selector de días no aplica
    cargarIntentos();
    cargarMetricasAgencias();
    if ($('an-quiz').value) cargarAnalitica();
  }

  function iniciarFiltroMes() {
    if (!$('f-mes') || $('f-mes').dataset.ok) return;
    $('f-mes').dataset.ok = '1';
    const hoy = new Date();
    $('f-mes').value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    $('an-rango').disabled = true;
    $('f-mes').addEventListener('change', refrescarPorMes);
    $('f-mes-clear').addEventListener('click', () => { $('f-mes').value = ''; refrescarPorMes(); });
    $('btn-export').addEventListener('click', exportarCSV);
  }

  /** Trae una tabla completa (paginada) aplicando el filtro de mes. */
  async function traerTabla(tabla, columnas) {
    const rm = rangoMes();
    const filas = [], PAGINA = 1000;
    for (let desde = 0; desde < 50000; desde += PAGINA) {
      let q = db.from(tabla).select(columnas).order('created_at', { ascending: false }).range(desde, desde + PAGINA - 1);
      if (rm) q = q.gte('created_at', rm.desde).lte('created_at', rm.hasta);
      const { data, error } = await q;
      if (error) throw error;
      filas.push(...data);
      if (data.length < PAGINA) break;
    }
    return filas;
  }

  /* ── 6.2 Exportador CSV ── */
  const celdaCSV = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;            // evita inyección de fórmulas en Excel
    return `"${s.replace(/"/g, '""')}"`;
  };

  async function exportarCSV() {
    const btn = $('btn-export');
    const txt = btn.textContent;
    btn.disabled = true; btn.textContent = 'Generando…';
    try {
      const [evs, cursos] = await Promise.all([
        traerTabla('evaluaciones', '*'),
        traerTabla('cursos_completados', '*')
      ]);
      const filas = [];
      evs.forEach(e => filas.push({
        f: e.created_at, ag: e.agencia, zona: e.zona, dep: e.departamento, nom: e.asesor_nombre,
        ape: e.asesor_apellido, rol: e.rol, mod: e.quiz_id, nota: e.nota, est: e.aprobado ? 'Aprobado' : 'Desaprobado'
      }));
      // Las tarjetas completadas; los quizzes ya salen arriba con su nota real
      cursos.filter(c => String(c.curso_id).startsWith('tarjeta-')).forEach(c => filas.push({
        f: c.created_at, ag: c.agencia, zona: c.zona, dep: c.departamento, nom: c.asesor_nombre,
        ape: c.asesor_apellido, rol: c.rol, mod: c.curso_id, nota: c.puntaje, est: 'Completado'
      }));
      if (!filas.length) { toast('No hay registros en este periodo 📭', 'err'); return; }
      filas.sort((a, b) => new Date(b.f) - new Date(a.f));

      const cab = ['Fecha', 'Agencia', 'Zona', 'Departamento', 'Nombre', 'Apellido', 'Rol', 'Módulo/Quiz', 'Nota', 'Estado'];
      const lineas = [cab.map(celdaCSV).join(',')].concat(filas.map(r =>
        [fmtFecha(r.f), r.ag, r.zona, r.dep, r.nom, r.ape, r.rol, r.mod, r.nota, r.est].map(celdaCSV).join(',')));
      const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });   // BOM → tildes OK en Excel
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `winclic-avance-${$('f-mes').value || 'historial'}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(`CSV listo: ${filas.length} registros 📥`);
    } catch (err) {
      console.error(err); toast('No se pudo exportar: ' + (err.message || 'error'), 'err');
    } finally { btn.disabled = false; btn.textContent = txt; }
  }

  /* ── 6.3 Intentos de evaluación + reset por asesor ── */
  async function cargarIntentos() {
    const tb = $('ev-list');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="7" class="wc-empty" style="text-align:center;padding:1.5rem">Cargando…</td></tr>';
    const rm = rangoMes();
    let q = db.from('evaluaciones').select('id,created_at,agencia,asesor_nombre,asesor_apellido,quiz_id,nota,aprobado')
      .order('created_at', { ascending: false }).limit(300);
    if (rm) q = q.gte('created_at', rm.desde).lte('created_at', rm.hasta);
    const { data, error } = await q;
    if (error) { tb.innerHTML = `<tr><td colspan="7" class="wc-empty">Error: ${esc(error.message)}</td></tr>`; return; }
    if (!data.length) { tb.innerHTML = '<tr><td colspan="7" class="wc-empty" style="text-align:center;padding:1.5rem">Sin intentos en este periodo 📭</td></tr>'; return; }
    const td = 'padding:.7rem .5rem;';
    tb.innerHTML = data.map(e => `
      <tr style="border-bottom:1px solid var(--wc-border)">
        <td style="${td}white-space:nowrap">${esc(fmtFecha(e.created_at))}</td>
        <td style="${td}">${esc(e.agencia)}</td>
        <td style="${td}"><b>${esc(e.asesor_nombre)} ${esc(e.asesor_apellido)}</b></td>
        <td style="${td}"><code>${esc(e.quiz_id)}</code></td>
        <td style="${td}">${esc(e.nota)}%</td>
        <td style="${td}"><span class="wc-pill" style="background:${e.aprobado ? 'var(--wc-green)' : 'var(--wc-red)'};color:#fff">${e.aprobado ? 'Aprobado' : 'Desaprobado'}</span></td>
        <td style="${td}text-align:right"><button class="wc-btn wc-btn--danger wc-btn--sm" data-ev-del="${esc(e.id)}" title="Resetear intento">🗑️</button></td>
      </tr>`).join('') +
      (data.length === 300 ? '<tr><td colspan="7" style="padding:.7rem;color:var(--wc-text-soft)"><small>Mostrando los 300 intentos más recientes. Usa el filtro de mes para acotar.</small></td></tr>' : '');
  }

  $('ev-list')?.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-ev-del]');
    if (!b) return;
    if (!confirm('¿Estás seguro de resetear el intento de este asesor?')) return;
    b.disabled = true;
    try {
      const { data, error } = await db.from('evaluaciones').delete().eq('id', b.dataset.evDel).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('Sin permiso o el registro ya no existe');
      toast('Intento reseteado ✅ El asesor ya puede volver a intentarlo');
    } catch (err) { console.error(err); toast(err.message || 'No se pudo resetear', 'err'); }
    await cargarIntentos();
    cargarMetricasAgencias();
  });

  /* ── 6.4 Tablero de rendimiento por agencia ── */
  async function cargarMetricasAgencias() {
    const tb = $('ag-metrics');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="4" class="wc-empty" style="text-align:center;padding:1.5rem">Calculando…</td></tr>';
    try {
      const CUR = window.WC_CURRICULA;
      const quizGeneral = CUR && CUR.meta ? CUR.meta.quizId : 'quiz-general';
      // Pasos de la ruta común (sin el bloque exclusivo de Backoffice) + meta final
      const ruta = new Set([quizGeneral]);
      ((CUR && CUR.bloques) || []).filter(b => !b.soloRol).forEach(b => b.items.forEach(i =>
        ruta.add(i.tipo === 'quiz' ? i.quizId : 'tarjeta-' + i.id)));

      const [{ data: ags, error: eAg }, evs, cursos] = await Promise.all([
        db.from('agencias').select('nombre').eq('activa', true).order('nombre'),
        traerTabla('evaluaciones', 'agencia,asesor_nombre,asesor_apellido,quiz_id,nota,aprobado'),
        traerTabla('cursos_completados', 'agencia,asesor_nombre,asesor_apellido,curso_id')
      ]);
      if (eAg) throw eAg;

      const norm = (s) => String(s || '').trim().toLowerCase();
      const porAg = new Map((ags || []).map(a => [norm(a.nombre), { nombre: a.nombre, asesores: new Map() }]));
      const asesor = (ag, n, a) => {
        const g = porAg.get(norm(ag)); if (!g) return null;       // agencias inactivas/desconocidas se omiten
        const k = norm(n) + '|' + norm(a);
        if (!g.asesores.has(k)) g.asesores.set(k, { hechos: new Set(), notaGeneral: null });
        return g.asesores.get(k);
      };
      evs.forEach(e => {
        const s = asesor(e.agencia, e.asesor_nombre, e.asesor_apellido); if (!s) return;
        if (e.aprobado && ruta.has(e.quiz_id)) s.hechos.add(e.quiz_id);
        if (e.quiz_id === quizGeneral) s.notaGeneral = Math.max(s.notaGeneral ?? 0, e.nota);   // mejor intento
      });
      cursos.forEach(c => {
        const s = asesor(c.agencia, c.asesor_nombre, c.asesor_apellido); if (!s) return;
        if (String(c.curso_id).startsWith('tarjeta-') && ruta.has(c.curso_id)) s.hechos.add(c.curso_id);
      });

      const filas = [...porAg.values()].map(g => {
        const as = [...g.asesores.values()];
        const pct = as.length ? as.reduce((t, s) => t + Math.min(1, s.hechos.size / ruta.size), 0) / as.length : 0;
        const notas = as.filter(s => s.notaGeneral !== null).map(s => s.notaGeneral);
        return { nombre: g.nombre, n: as.length, pct: Math.round(pct * 100), nota: notas.length ? Math.round(notas.reduce((t, x) => t + x, 0) / notas.length) : null };
      });
      if (!filas.length) { tb.innerHTML = '<tr><td colspan="4" class="wc-empty" style="text-align:center;padding:1.5rem">No hay agencias activas.</td></tr>'; return; }

      const td = 'padding:.8rem .5rem;';
      tb.innerHTML = filas.map(f => `
        <tr style="border-bottom:1px solid var(--wc-border)">
          <td style="${td}"><b>${esc(f.nombre)}</b></td>
          <td style="${td}text-align:center">${f.n}</td>
          <td style="${td}min-width:150px">
            <div style="display:flex;align-items:center;gap:.5rem">
              <div class="wc-bar" style="display:block;flex:1;margin:0"><i style="width:${f.pct}%"></i></div><b>${f.pct}%</b>
            </div>
          </td>
          <td style="${td}text-align:center"><b>${f.nota === null ? '—' : f.nota + '%'}</b></td>
        </tr>`).join('');
    } catch (err) {
      console.error(err);
      tb.innerHTML = `<tr><td colspan="4" class="wc-empty">Error: ${esc(err.message || 'no se pudo calcular')}</td></tr>`;
    }
  }
})();
