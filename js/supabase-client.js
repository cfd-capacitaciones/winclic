/* =====================================================================
   WINCLIC · CLIENTE SUPABASE + UTILIDADES COMPARTIDAS
   Orden de carga en el HTML:
     1) CDN supabase-js   2) js/config.js   3) js/supabase-client.js
   ===================================================================== */
(function () {
  'use strict';

  const C = window.WC_CONFIG;
  if (!C) { console.error('[WinClic] Falta js/config.js'); return; }
  if (!window.supabase) { console.error('[WinClic] Falta el CDN de supabase-js'); return; }

  const db = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  /* ── LocalStorage seguro ───────────────────────────────────────────── */
  const ls = {
    get(key, fallback = null) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('[WinClic] LS lleno', e); }
    },
    del(key) { try { localStorage.removeItem(key); } catch { /* noop */ } }
  };

  /* ── Sesión del asesor (la que crea el Pase de Abordaje) ───────────── */
  const sesion = {
    get() { return ls.get(C.KEYS.asesor); },
    set(data) { ls.set(C.KEYS.asesor, data); },
    clear() { ls.del(C.KEYS.asesor); }
  };

  /* ── Outbox: si no hay internet, el paquete se guarda y reintenta ──── */
  const outbox = {
    push(tabla, fila) {
      const q = ls.get(C.KEYS.outbox, []);
      q.push({ tabla, fila, ts: Date.now() });
      ls.set(C.KEYS.outbox, q);
    },
    async flush() {
      const q = ls.get(C.KEYS.outbox, []);
      if (!q.length) return;
      const pendientes = [];
      for (const item of q) {
        const { error } = await db.from(item.tabla).insert(item.fila);
        // Si es un error de red lo reintentamos luego; si es regla de negocio lo descartamos
        if (error && isNetworkError(error)) pendientes.push(item);
      }
      ls.set(C.KEYS.outbox, pendientes);
    }
  };

  function isNetworkError(err) {
    const msg = String(err && (err.message || err)).toLowerCase();
    return msg.includes('fetch') || msg.includes('network') || msg.includes('failed');
  }

  /* ── Utilidades UI ─────────────────────────────────────────────────── */
  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function toast(msg, tipo = 'ok') {
    let host = document.getElementById('wc-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'wc-toast-host';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.className = `wc-toast wc-toast--${tipo}`;
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => { t.classList.add('wc-toast--out'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  function formatCountdown(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  /* Cuando vuelve el internet, vaciamos la outbox */
  window.addEventListener('online', () => outbox.flush());
  document.addEventListener('DOMContentLoaded', () => outbox.flush());

  window.WC = Object.freeze({ db, config: C, ls, sesion, outbox, esc, toast, formatCountdown, isNetworkError });
})();
