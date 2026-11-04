/* =====================================================================
   WINCLIC · PANEL ADMIN — GESTIÓN DE MALETÍN  (js/panel-maletin.js)
   CRUD sobre public.materiales_maletin. El archivo se elige de los
   contenidos ya subidos en la pestaña "Contenidos" (evita doble carga).
   Requiere sesión de administrador (RLS: supabase/maletin.sql).
   ===================================================================== */
(function () {
  'use strict';
  const { db, esc, toast } = window.WC;
  const $ = (id) => document.getElementById(id);
  const form = $('mal-form');
  if (!form) return;

  /* ══════════ ORIGEN DE LOS ARCHIVOS ══════════
     Tu proyecto guarda los archivos de la pestaña "Contenidos" en la tabla
     public.modulos (no existe una tabla 'contenidos'). Si algún día la creas,
     solo cambia este bloque.                                                  */
  const ORIGEN = {
    tabla: 'modulos',
    campos: 'id,titulo,url,tipo,slug',          // titulo → nombre visible · url → archivo
    tipos: ['pdf', 'imagen'],                   // lo descargable (sin video/html/quiz)
    nombre: (c) => c.titulo,
    url: (c) => c.url
  };

  /* La tabla modulos guarda la tarjeta en 'slug' (ej. 'c01'). Deducimos el bloque
     (b1, b2, b3, b4) buscando esa tarjeta en js/curricula.js ( o usando c.bloque si existe). */
  function bloqueDeTarjeta(slug, bloqueDirecto) {
    if (bloqueDirecto) return bloqueDirecto;
    const bloques = (window.WC_CURRICULA && window.WC_CURRICULA.bloques) || [];
    const b = bloques.find(x => x.items.some(i => i.id === slug));
    return b ? b.id : '';
  }

  let contenidos = [];            // cache para autocompletar título / tipo / tarjeta
  const sel = $('select-contenido');

  /* ── Select de archivos existentes ── */
  async function cargarContenidosDisponibles() {
    const { data, error } = await db.from(ORIGEN.tabla).select(ORIGEN.campos)
      .in('tipo', ORIGEN.tipos).eq('activo', true).not('url', 'is', null)
      .order('slug', { ascending: true }).order('orden', { ascending: true });
    if (error) { toast('No se pudieron cargar los archivos: ' + error.message, 'err'); return; }

    contenidos = (data || []).filter(c => ORIGEN.url(c));
    const previo = sel.value;
    sel.innerHTML = '<option value="">Selecciona un archivo existente...</option>' +
      contenidos.map(c => `<option value="${esc(ORIGEN.url(c))}"
          data-titulo="${esc(ORIGEN.nombre(c))}"
          data-tarjeta="${esc(c.slug || '')}"
          data-bloque="${esc(bloqueDeTarjeta(c.slug))}"
          data-tipo="${c.tipo === 'pdf' ? 'pdf' : 'infografia'}">${esc(ORIGEN.nombre(c))}${c.slug ? ' · ' + esc(c.slug) : ''}</option>`).join('');
    if (previo && contenidos.some(c => ORIGEN.url(c) === previo)) sel.value = previo;
  }

  // Al elegir archivo: llena título (editable), tarjeta requerida, bloque y tipo desde el dataset del option
  sel.addEventListener('change', () => {
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    $('mal-titulo').value = opt.dataset.titulo || '';
    $('mal-card').value = opt.dataset.tarjeta || '';
    $('mal-bloque').value = opt.dataset.bloque || '';
    $('mal-tipo').value = opt.dataset.tipo || 'pdf';
  });

  /* ── Lista de materiales publicados ── */
  async function listarMateriales() {
    const cont = $('mal-list');
    const { data, error } = await db.from('materiales_maletin').select('*')
      .order('bloque', { ascending: true }).order('id', { ascending: true });
    if (error) { cont.innerHTML = `<div class="wc-empty">Error: ${esc(error.message)}</div>`; return; }
    if (!data.length) { cont.innerHTML = '<div class="wc-empty">Aún no hay materiales. ¡Agrega el primero!</div>'; return; }
    cont.innerHTML = data.map(m => `
      <div class="wc-row" data-id="${esc(m.id)}">
        <span class="wc-row-emoji">${m.tipo === 'pdf' ? '📄' : '🖼️'}</span>
        <div class="wc-row-main">
          <b>${esc(m.titulo)}</b>
          <small><span class="wc-pill">${esc(m.bloque || '—')}</span> <span class="wc-pill">${esc(m.tarjeta_requerida || '—')}</span>
            ${m.descripcion ? ' · ' + esc(m.descripcion) : ''}</small>
          <small><a href="${esc(m.url_descarga)}" target="_blank" rel="noopener">${esc(m.url_descarga)}</a></small>
        </div>
        <button class="wc-btn wc-btn--danger wc-btn--sm" data-a="del" title="Eliminar">🗑️</button>
      </div>`).join('');
  }

  $('mal-list').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a="del"]');
    if (!b) return;
    const row = b.closest('.wc-row');
    if (!confirm('¿Eliminar este material del maletín?')) return;
    b.disabled = true;
    const { error } = await db.from('materiales_maletin').delete().eq('id', row.dataset.id);
    if (error) { b.disabled = false; return toast('No se pudo eliminar: ' + error.message, 'err'); }
    toast('Material eliminado 🗑️');
    listarMateriales();
  });

  /* ── Guardar ── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fila = {
      titulo: $('mal-titulo').value.trim(),
      descripcion: $('mal-desc').value.trim() || null,
      tipo: $('mal-tipo').value,
      url_descarga: sel.value,                       // value del select = URL del archivo
      tarjeta_requerida: $('mal-card').value.trim(),
      bloque: $('mal-bloque').value.trim().toLowerCase()
    };
    const faltan = [['mal-titulo', fila.titulo], ['select-contenido', fila.url_descarga],
                    ['mal-card', fila.tarjeta_requerida], ['mal-bloque', fila.bloque]].filter(([, v]) => !v);
    if (faltan.length) {
      faltan.forEach(([id]) => { $(id).classList.add('wc-invalid'); setTimeout(() => $(id).classList.remove('wc-invalid'), 400); });
      return toast('Completa los campos obligatorios', 'err');
    }
    const btn = $('mal-submit'); btn.disabled = true;
    const { error } = await db.from('materiales_maletin').insert(fila);
    btn.disabled = false;
    if (error) return toast('No se pudo guardar: ' + error.message, 'err');
    toast('Material guardado en el maletín ✅');
    form.reset();
    listarMateriales();
  });

  // Al abrir la pestaña: refresca archivos (por si acabas de subir uno) y la lista
  document.querySelector('.wc-tab[data-tab="maletin"]').addEventListener('click', () => {
    cargarContenidosDisponibles();
    listarMateriales();
  });
  window.cargarContenidosDisponibles = cargarContenidosDisponibles;
})();
