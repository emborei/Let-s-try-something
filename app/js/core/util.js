/* ==========================================================================
   util.js – kleine Helfer, Datum/Zeit, Hash (SHA-256), DOM-Bau
   Läuft im Browser UND in Node (für Tests), ohne Abhängigkeiten.
   ========================================================================== */

/* ---------- Datum & Zeit ------------------------------------------------- */

export const MS_DAY = 86400000;

/** Zeitzonen-Versatz der Gerätezeit (für Server-Zeitstempel nötig). */
export function tzOffsetMinutes(date = new Date()) {
  return -date.getTimezoneOffset();
}

/** "2026-10-07" aus einem Zeitstempel (in Gerätezeit). */
export function dayKey(ts = Date.now()) {
  // Robustheit: ein ungültiger Zeitstempel darf keinen unsinnigen Tagesstempel
  // erzeugen (ein Bericht mit „NaN-NaN-NaN“ wäre vor dem Prüfer peinlich).
  const d = new Date(Number.isFinite(ts) ? ts : Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function clockTime(ts = Date.now()) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtTime(ts) {
  if (!ts) return '–';
  return clockTime(ts) + ' Uhr';
}

const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MO = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function weekday(ts = Date.now()) { return WD[new Date(ts).getDay()]; }
export function monthName(m) { return MO[m]; }

export function fmtDate(ts) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function fmtDateLong(ts) {
  const d = new Date(ts);
  return `${weekday(ts)}, ${d.getDate()}. ${monthName(d.getMonth())} ${d.getFullYear()}`;
}

export function fmtDateTime(ts) {
  if (!ts) return '–';
  return `${fmtDate(ts)}, ${clockTime(ts)} Uhr`;
}

/** Relativer Tagestext: "heute", "gestern", "vor 3 Tagen" */
export function relativeDay(fromTs, toTs = Date.now()) {
  const a = parseDayKey(dayKey(toTs)).getTime();
  const b = parseDayKey(dayKey(fromTs)).getTime();
  const diff = Math.round((a - b) / MS_DAY);
  if (diff === 0) return 'heute';
  if (diff === 1) return 'gestern';
  if (diff > 1 && diff < 7) return `vor ${diff} Tagen`;
  return fmtDate(fromTs);
}

/** Wie viele Minuten ist das Zeitfenster "bis" heute schon vorbei? (negativ = noch Zeit) */
export function minutesSince(hhmm, ts = Date.now()) {
  const [h, m] = String(hhmm).split(':').map(Number);
  const d = new Date(ts);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0, 0, 0);
  return Math.floor((ts - target) / 60000);
}

export function addDays(ts, days) { return ts + days * MS_DAY; }

/** Alle Tage (dayKey) zwischen zwei Keys, inklusive. */
export function dayRange(fromKey, toKey) {
  const out = [];
  let cur = parseDayKey(fromKey).getTime();
  const end = parseDayKey(toKey).getTime();
  while (cur <= end) { out.push(dayKey(cur)); cur = addDays(cur, 1); }
  return out;
}

/* ---------- Text --------------------------------------------------------- */

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function slug(s) {
  return String(s).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'posten';
}

export function norm(s) {
  return String(s ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').trim();
}

export function num(v, fallback = null) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Temperatur schön: 4 statt 4.0, 4,5 mit Komma */
export function fmtTemp(v) {
  if (v === null || v === undefined || v === '') return '–';
  const n = num(v);
  if (n === null) return String(v);
  const r = Math.round(n * 10) / 10;
  return String(r).replace('.', ',');
}

/* ---------- Kanonisches JSON (für Hash-Ketten) --------------------------- */

export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

/* ---------- SHA-256 (WebCrypto, mit reinem JS-Fallback) ------------------ */
/* Wichtig: crypto.subtle gibt es nur in „secure contexts“ (HTTPS/localhost).
   Alte Tablets im WLAN (http://192.168.x.x) hätten sonst keine Hashes,
   deshalb hier ein vollständiger Fallback in reinem JavaScript.            */

function sha256Fallback(bytes) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const l = bytes.length;
  const withOne = new Uint8Array((((l + 8) >> 6) + 1) << 6);
  withOne.set(bytes);
  withOne[l] = 0x80;
  const bitLen = l * 8;
  const dv = new DataView(withOne.buffer);
  dv.setUint32(withOne.length - 4, bitLen >>> 0);
  dv.setUint32(withOne.length - 8, Math.floor(bitLen / 4294967296));
  const w = new Uint32Array(64);
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < withOne.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rr(w[t - 15], 7) ^ rr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rr(w[t - 2], 17) ^ rr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H = [(H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0,
      (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0];
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('');
}

export function utf8Bytes(str) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(out);
}

const hasSubtle = typeof globalThis.crypto !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle;

/** SHA-256 als Hex-String. Immer verfügbar (WebCrypto oder Fallback). */
export async function sha256Hex(input) {
  const str = typeof input === 'string' ? input : new TextDecoder().decode(input);
  if (hasSubtle) {
    try {
      const buf = await globalThis.crypto.subtle.digest('SHA-256', utf8Bytes(str));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch { /* z. B. http-Kontext → Fallback */ }
  }
  return sha256Fallback(utf8Bytes(str));
}

/** Kurzform für Anzeige/PDF: 4F3A-9C21-8B7E */
export function shortHash(hex, groups = 3) {
  if (!hex) return '–';
  const up = hex.toUpperCase();
  return Array.from({ length: groups }, (_, i) => up.slice(i * 4, i * 4 + 4)).filter(Boolean).join('-');
}

/* ---------- IDs ---------------------------------------------------------- */

export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/* ---------- DOM ---------------------------------------------------------- */

/** h('div', {class:'x', onclick:fn}, kind1, kind2 …) */
export function h(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

/** Blob/Datei verkleinern (Fotos von alten Handys sind sonst zu groß). */
export async function shrinkImage(fileOrBlob, maxPx = 1280, quality = 0.72) {
  const bitmap = await loadBitmap(fileOrBlob);
  if (!bitmap) return null;
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const hgt = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = hgt;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, hgt);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { dataUrl, width: w, height: hgt, bytes: Math.round((dataUrl.length - 22) * 0.75) };
}

async function loadBitmap(blob) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(blob); } catch { /* weiter unten */ }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

/** Kurze Vibration als Quittung (funktioniert auf Android, iOS ignoriert es). */
export function buzz(pattern = 12) {
  try { navigator.vibrate?.(pattern); } catch { /* egal */ }
}

/** Datei herunterladen (Blob) */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
