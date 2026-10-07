/* ==========================================================================
   components.js – wiederverwendbare UI-Bausteine
   Alles groß, kontrastreich, mit dicken Tap-Flächen. Keine Fachbegriffe.
   ========================================================================== */

import { h, esc, $, clear } from '../core/util.js';

/* ---------- Icons (inline SVG, damit offline & sofort da) ---------------- */

const ICONS = {
  heute: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  temperatur: '<path d="M10 4a2 2 0 1 1 4 0v9.2a5 5 0 1 1-4 0zM12 6v9.8"/>',
  putzen: '<path d="M7 3h6l1 5H6zM6 8h8l2 13H4z"/>',
  wareneingang: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  bericht: '<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h4"/>',
  zahnrad: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  check: '<path d="M4 12.5 9.5 18 20 6.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  warn: '<path d="M12 3 2 20h20zM12 9v5M12 17.5v.5"/>',
  foto: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  uhr: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l4 2"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  runter: '<path d="M12 3v13M6 12l6 6 6-6M4 21h16"/>',
  speichern: '<path d="M5 3h11l3 3v15H5zM8 3v6h7V3M8 21v-7h8v7"/>',
  moeglich: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5 11 15l4.5-6"/>',
  zurueck: '<path d="M15 4 7 12l8 8"/>',
  web: '<path d="M12 3v18M4 12h16M5 7h14M5 17h14"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  papierkorb: '<path d="M6 7h12M9 7V5h6v2M8 7l1 14h6l1-14"/>',
  warn_eimer: '<path d="M12 3 2 20h20zM12 9v5M12 17v.5"/>',
  stern: '<path d="M12 3l2.6 6.2 6.7.5-5.1 4.4 1.5 6.6L12 17.1 6.3 20.7l1.5-6.6-5.1-4.4 6.7-.5z"/>',
};

/** Icon als Markup-String (für innerHTML-Kontexte). */
export function iconSvg(name, { size = 24, cls = '', stroke = 2 } = {}) {
  const path = ICONS[name] || ICONS.check;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

/** Icon als fertiges Element (für h()-Aufrufe). */
export function icon(name, opts) {
  const span = document.createElement('span');
  span.style.display = 'inline-flex';
  span.innerHTML = iconSvg(name, opts);
  return span.firstElementChild;
}

/* ---------- Toast -------------------------------------------------------- */

export function toast(message, { tone = 'info', ms = 3200 } = {}) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = h('div', { class: 'toast', dataset: { tone }, role: 'status' }, message);
  wrap.append(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, ms - 300);
  setTimeout(() => el.remove(), ms);
  return el;
}

/* ---------- Fußleiste / Sheet (Dialog) ----------------------------------- */

let openSheets = 0;

/**
 * Öffnet ein Blatt von unten. Gibt ein Objekt mit close() zurück.
 * Alles über <dialog> → echte Barrierefreiheit (Fokus, Escape) ohne Aufwand.
 */
export function sheet({ title, subtitle = '', content, actions = [], dismissible = true, onClose = null, id = null }) {
  const dialog = h('dialog', { class: 'sheet', id: id || 'sheet-' + Math.random().toString(36).slice(2) });
  const previouslyFocused = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return;                       // doppelt schließen ist harmlos
    closed = true;
    try { dialog.close(); } catch { /* z. B. schon zu */ }
    // Aufräumen garantiert – auch wenn das „close“-Ereignis ausbleibt
    setTimeout(() => {
      dialog.remove();
      try { previouslyFocused?.focus?.(); } catch {}
      onClose?.();
    }, 180);
  };
  const inner = h('div', { class: 'sheet__inner', role: 'document' });
  if (title) inner.append(h('h2', { class: 'sheet__title' }, title));
  if (subtitle) inner.append(h('p', { class: 'sheet__sub' }, subtitle));

  const body = h('div', { class: 'sheet__body' });
  appendContent(body, content);
  inner.append(body);

  if (actions.length) {
    const row = h('div', { class: 'sheet__actions btnrow' });
    for (const a of actions) {
      if (!a) continue;
      row.append(h('button', {
        type: 'button',
        class: `btn ${a.class || 'btn--ghost'} ${a.block ? 'btn--block' : ''}`,
        onclick: async (ev) => {
          if (a.onClick) {
            const res = await a.onClick(ev);
            if (res === false) return;              // Sheet offen lassen
          }
          if (a.close !== false) close();
        },
      }, a.label));
    }
    inner.append(row);
  }

  dialog.append(inner);
  document.body.append(dialog);
  openSheets++;

  if (!dismissible) {
    dialog.addEventListener('cancel', (e) => e.preventDefault());
  }
  dialog.addEventListener('click', (e) => {
    // Klick auf den Hintergrund schließt (nicht in der Karte)
    if (e.target === dialog && dismissible) close();
  });
  dialog.addEventListener('close', () => { close(); });   // z. B. Escape-Taste

  try { dialog.showModal(); } catch { dialog.setAttribute('open', ''); }
  // Ersten sinnvollen Fokus setzen
  setTimeout(() => {
    const auto = dialog.querySelector('[autofocus]') || dialog.querySelector('.btn--primary') || dialog.querySelector('button');
    try { auto?.focus?.(); } catch {}
  }, 40);

  const api = { dialog, close, body, title: (t) => { const el = dialog.querySelector('.sheet__title'); if (el) el.textContent = t; } };
  return api;
}

/** Inhalt kann Node, String oder Array sein. */
export function appendContent(parent, content) {
  if (content === null || content === undefined) return parent;
  const items = Array.isArray(content) ? content : [content];
  for (const item of items) {
    if (item === null || item === undefined) continue;
    if (item instanceof Node) parent.append(item);
    else if (typeof item === 'string') parent.insertAdjacentHTML('beforeend', item);
    else if (typeof item === 'object' && item.__html) parent.insertAdjacentHTML('beforeend', item.__html);
    else parent.append(document.createTextNode(String(item)));
  }
  return parent;
}

/** Markup ohne Maskierung einfügen (nur für eigenes, vertrauenswürdiges Markup!). */
export const raw = (markup) => ({ __html: markup });

export function confirmDialog({ title, text = '', confirmLabel = 'Ja', cancelLabel = 'Abbrechen', tone = 'primary' }) {
  return new Promise((resolve) => {
    let decided = false;
    sheet({
      title, subtitle: text,
      content: tone === 'danger' ? h('div', { class: 'warnbox', dataset: { tone: 'red' } }, 'Achtung: dieser Schritt lässt sich nicht rückgängig machen.') : null,
      actions: [
        { label: cancelLabel, class: 'btn--ghost', onClick: () => { decided = true; resolve(false); } },
        { label: confirmLabel, class: tone === 'danger' ? 'btn--danger' : 'btn--primary', onClick: () => { decided = true; resolve(true); } },
      ],
      onClose: () => { if (!decided) resolve(false); },
    });
  });
}

/* ---------- Kleine Bausteine -------------------------------------------- */

export const pill = (text, tone = 'grey', iconName = null) =>
  `<span class="pill" data-tone="${tone}">${iconName ? iconSvg(iconName, { size: 16 }) : ''}${esc(text)}</span>`;

export function card({ title, meta, body, state, right, className = '' }) {
  const el = h('div', { class: `card ${className}` });
  if (state) el.dataset.state = state;
  if (title || right) {
    const head = h('div', { class: 'card__head' });
    const main = h('div', { style: 'flex:1;min-width:0' });
    if (title) main.append(h('h3', { class: 'card__title' }, title));
    if (meta) main.append(h('div', { class: 'card__meta' }, meta));
    head.append(main);
    if (right) head.append(right);
    el.append(head);
  }
  if (body) { const b = h('div', { class: 'card__body' }); appendContent(b, body); el.append(b); }
  return el;
}

export function emptyState(text, actionLabel, onAction, extra = null) {
  const el = h('div', { class: 'empty' }, text);
  if (actionLabel) {
    el.append(h('div', { style: 'height:12px' }));
    el.append(h('button', { type: 'button', class: 'btn btn--primary', onclick: onAction }, actionLabel));
  }
  if (extra) el.append(extra);
  return el;
}

export function kv(label, value) {
  return h('div', { class: 'kv' }, h('span', {}, label), h('span', {}, value));
}

export function sectionTitle(text) {
  return h('div', { class: 'section-title' }, h('h2', {}, text), h('div', { class: 'section-title__line' }));
}

export function progressBar(percent, label) {
  return h('div', { class: 'progress' },
    h('div', { class: 'progress__bar' }, h('div', { class: 'progress__fill', style: `width:${Math.max(0, Math.min(100, percent))}%` })),
    h('div', { class: 'progress__label' }, label));
}

/** Großes Eingabefeld für Messwerte mit −/+ und Schnellwahl. */
export function stepperField({ value, onChange, step = 0.5, unit = '°C', min = -30, max = 120, autofocus = false }) {
  let current = value ?? null;
  const display = h('input', {
    type: 'text', inputmode: 'decimal', value: current === null ? '' : String(current).replace('.', ','),
    'aria-label': `Messwert in ${unit}`, placeholder: '–',
    ...(autofocus ? { autofocus: 'autofocus' } : {}),
  });
  const commit = (v) => {
    const n = v === '' || v === null ? null : Math.round(parseFloat(String(v).replace(',', '.')) * 10) / 10;
    current = Number.isFinite(n) ? n : null;
    display.value = current === null ? '' : String(current).replace('.', ',');
    onChange(current);
  };
  display.addEventListener('input', () => {
    const n = parseFloat(display.value.replace(',', '.'));
    current = Number.isFinite(n) ? n : null;
    onChange(current, { live: true });
  });
  display.addEventListener('blur', () => { if (display.value.trim() === '') commit(null); });

  const bump = (d) => {
    const base = current ?? (d > 0 ? 0 : 0);
    commit(Math.round((base + d) * 10) / 10);
  };

  const wrap = h('div', { class: 'stepper' },
    h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => bump(-step), 'aria-label': `minusa ${step} Grad` }, '−'),
    h('div', { class: 'stepper__value' }, display, h('div', { class: 'card__meta' }, unit)),
    h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => bump(step), 'aria-label': `plus ${step} Grad` }, '+'));

  const quick = h('div', { class: 'btnrow', style: 'margin-bottom:12px' });
  for (const d of [-1, -0.5, 0.5, 1]) {
    quick.append(h('button', {
      type: 'button', class: 'btn btn--sm btn--ghost',
      onclick: () => bump(d),
    }, (d > 0 ? '+' : '') + String(d).replace('.', ',')));
  }
  const box = h('div', {}, wrap, quick);
  box.focusField = () => setTimeout(() => display.focus(), 60);
  box.getValue = () => current;
  box.setValue = (v) => commit(v);
  return box;
}

/** Mehrfachauswahl als große Chips. */
export function chipSelect({ options, selected = [], onChange, allowFree = false, freeLabel = 'Etwas anderes …', cols = 1 }) {
  const sel = new Set(selected);
  const box = h('div', { style: `display:grid;gap:8px;grid-template-columns:repeat(${cols},minmax(0,1fr))` });
  const rerender = () => {
    clear(box);
    for (const opt of options) {
      const isOn = sel.has(opt);
      box.append(h('button', {
        type: 'button', class: `btn ${isOn ? 'btn--done' : 'btn--ghost'}`, style: 'justify-content:flex-start;text-align:left',
        'aria-pressed': isOn ? 'true' : 'false',
        onclick: () => { isOn ? sel.delete(opt) : sel.add(opt); onChange?.([...sel]); rerender(); },
      }, h('span', { style: 'flex:1' }, opt), h('span', { style: 'font-weight:900' }, isOn ? '✓' : '')));
    }
    if (allowFree) {
      box.append(h('input', { type: 'text', placeholder: freeLabel, 'aria-label': freeLabel, onchange: (e) => { if (e.target.value.trim()) { sel.add(e.target.value.trim()); onChange?.([...sel]); rerender(); } } }));
    }
  };
  rerender();
  box.getValue = () => [...sel];
  return box;
}

/** Ja/Nein-Schalter in groß. */
export function yesNoField({ label, value = null, onChange, hint = '' }) {
  const wrap = h('div', { class: 'card card--flat', style: 'padding:10px;margin-bottom:8px' });
  wrap.append(h('div', { style: 'font-weight:800' }, label));
  if (hint) wrap.append(h('div', { class: 'card__meta' }, hint));
  const row = h('div', { class: 'btnrow', style: 'margin-top:8px' });
  const yes = h('button', { type: 'button', class: 'btn btn--sm' }, 'Ja, in Ordnung');
  const no = h('button', { type: 'button', class: 'btn btn--sm' }, 'Nein, Problem');
  const paint = () => {
    yes.className = 'btn btn--sm ' + (value === true ? 'btn--done' : 'btn--ghost');
    no.className = 'btn btn--sm ' + (value === false ? 'btn--danger' : 'btn--ghost');
  };
  yes.onclick = () => { value = true; paint(); onChange?.(true); };
  no.onclick = () => { value = false; paint(); onChange?.(false); };
  paint();
  row.append(yes, no);
  wrap.append(row);
  return wrap;
}

/** Foto aufnehmen/auswählen → verkleinert + Hash. */
export function photoField({ onPhoto, label = 'Foto aufnehmen', maxPhotos = 1, takePhoto = true }) {
  const photos = [];
  const preview = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px' });
  const input = h('input', {
    type: 'file', accept: 'image/*', style: 'display:none',
    ...(takePhoto ? { capture: 'environment' } : {}),
    onchange: async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      onPhoto?.(file);
    },
  });
  const btn = h('button', {
    type: 'button', class: 'btn btn--ghost btn--block',
    onclick: () => input.click(),
  }, icon('foto', { size: 22 }), label);
  const box = h('div', {}, btn, preview, input);
  box.showPhoto = (p, { locked = false, onRemove = null } = {}) => {
    const img = h('img', { src: p.dataUrl, alt: 'Belegfoto', style: 'width:92px;height:92px;object-fit:cover;border-radius:12px;border:2px solid var(--line)' });
    const wrap = h('div', { style: 'position:relative' }, img);
    if (!locked) wrap.append(h('button', {
      type: 'button', class: 'btn btn--sm btn--danger', style: 'position:absolute;top:-6px;right:-6px;min-height:30px;padding:2px 8px',
      'aria-label': 'Foto entfernen',
      onclick: () => { wrap.remove(); onRemove?.(); },
    }, '×'));
    preview.append(wrap);
    photos.push(p);
  };
  box.clear = () => clear(preview);
  box.count = () => photos.length;
  box.full = () => photos.length >= maxPhotos;
  return box;
}

/* ---------- Zeitquellen-Anzeige ----------------------------------------- */

export function timeBadge({ trusted, label, offsetMs }) {
  const tone = trusted ? 'green' : 'amber';
  const text = trusted ? `Serverzeit ${label}` : `Gerätezeit ${label} (nicht geprüft)`;
  return h('div', { style: 'margin:8px 0 0' },
    h('span', { class: 'pill', dataset: { tone } }, icon('uhr', { size: 16 }), ' ' + text));
}

export const sheetOpenCount = () => openSheets;
export { $, clear };
