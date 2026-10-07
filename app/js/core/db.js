/* ==========================================================================
   db.js – lokale Datenbank
   Primär IndexedDB (funktioniert offline, große Mengen, Fotos).
   Fällt automatisch auf LocalStorage oder (im Test/Notfall) auf RAM zurück.
   ========================================================================== */

import { uuid } from './util.js';

export const COLLECTIONS = ['users', 'tasks', 'entries', 'photos', 'outbox', 'exports', 'audit', 'meta'];

const DB_NAME = 'kneipencheck';
const DB_VERSION = 1;
const LS_PREFIX = 'kc:';

let mode = 'memory';          // 'idb' | 'ls' | 'memory'
let idb = null;
let memory = new Map();        // coll -> Map<id, doc>
const lsKey = (coll) => LS_PREFIX + coll;

/* ---------- LocalStorage-Fallback ---------------------------------------- */

function lsRead(coll) {
  try {
    const raw = localStorage.getItem(lsKey(coll));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsWrite(coll, arr) {
  try { localStorage.setItem(lsKey(coll), JSON.stringify(arr)); } catch (e) { /* Speicher voll */ }
}

const memGet = (coll) => {
  if (!memory.has(coll)) memory.set(coll, new Map());
  return memory.get(coll);
};

/* ---------- Öffnen ------------------------------------------------------- */

export async function openDb() {
  if (typeof indexedDB === 'undefined') {
    return fallbackMode();
  }
  try {
    idb = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const c of COLLECTIONS) if (!db.objectStoreNames.contains(c)) db.createObjectStore(c, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
      setTimeout(() => reject(new Error('timeout')), 4000);
    });
    mode = 'idb';
  } catch {
    return fallbackMode();
  }
  // Verbindung verlieren (z. B. Speicher-Update) nicht fatal machen
  idb.onversionchange = () => { try { idb.close(); } catch {} idb = null; mode = 'memory'; };
  return mode;
}

function fallbackMode() {
  mode = (typeof localStorage !== 'undefined') ? 'ls' : 'memory';
  return mode;
}

export const storageMode = () => mode;

function tx(coll, kind) {
  return idb.transaction(coll, kind).objectStore(coll);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ---------- CRUD --------------------------------------------------------- */

export async function all(coll) {
  if (mode === 'idb' && idb) return (await reqToPromise(tx(coll, 'readonly').getAll())) || [];
  if (mode === 'ls') return lsRead(coll);
  return [...memGet(coll).values()];
}

export async function get(coll, id) {
  if (mode === 'idb' && idb) return (await reqToPromise(tx(coll, 'readonly').get(id))) || null;
  if (mode === 'ls') return lsRead(coll).find((d) => d.id === id) || null;
  return memGet(coll).get(id) || null;
}

export async function put(coll, doc) {
  const withId = { id: doc.id || uuid(), ...doc };
  if (mode === 'idb' && idb) { await reqToPromise(tx(coll, 'readwrite').put(withId)); return withId; }
  if (mode === 'ls') {
    const arr = lsRead(coll);
    const i = arr.findIndex((d) => d.id === withId.id);
    if (i >= 0) arr[i] = withId; else arr.push(withId);
    lsWrite(coll, arr);
    return withId;
  }
  memGet(coll).set(withId.id, withId);
  return withId;
}

export async function bulkPut(coll, docs) {
  for (const d of docs) await put(coll, d);
  return docs.length;
}

export async function del(coll, id) {
  if (mode === 'idb' && idb) return reqToPromise(tx(coll, 'readwrite').delete(id));
  if (mode === 'ls') { lsWrite(coll, lsRead(coll).filter((d) => d.id !== id)); return; }
  memGet(coll).delete(id);
}

export async function clearCollection(coll) {
  if (mode === 'idb' && idb) return reqToPromise(tx(coll, 'readwrite').clear());
  if (mode === 'ls') { lsWrite(coll, []); return; }
  memGet(coll).clear();
}

/** Mehrere Schreibvorgänge in EINER Transaktion (schnell, konsistent). */
export async function putMany(pairs) {
  // pairs: [[coll, doc], …]
  for (const [coll, doc] of pairs) await put(coll, doc);
}

/* ---------- Meta (Einstellungen, Zähler) --------------------------------- */

export async function metaGet(key, fallback = null) {
  const doc = await get('meta', key);
  return doc ? doc.value : fallback;
}

export async function metaSet(key, value) {
  return put('meta', { id: key, value, updatedAt: Date.now() });
}

/* ---------- Backup: alles exportieren / importieren ---------------------- */

export async function exportAll() {
  const out = { format: 'kneipencheck-backup', version: 1, exportedAt: Date.now(), data: {} };
  for (const c of COLLECTIONS) out.data[c] = await all(c);
  return out;
}

export async function importAll(backup, { merge = true } = {}) {
  if (!backup || backup.format !== 'kneipencheck-backup') throw new Error('Unbekanntes Backup-Format');
  if (!merge) for (const c of COLLECTIONS) await clearCollection(c);
  let n = 0;
  for (const c of COLLECTIONS) {
    const docs = backup.data?.[c] || [];
    for (const d of docs) { await put(c, d); n++; }
  }
  return n;
}

/* ---------- Speicherplatz ------------------------------------------------ */

export async function storageEstimate() {
  try {
    if (navigator?.storage?.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usage, quota, percent: quota ? Math.round((usage / quota) * 100) : 0 };
    }
  } catch { /* egal */ }
  return { usage: 0, quota: 0, percent: 0 };
}

/** Fordert dauerhaften Speicher an (schützt vor automatischem Löschen). */
export async function requestPersistentStorage() {
  try {
    if (navigator?.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch { /* egal */ }
  return false;
}

export async function resetEverything() {
  for (const c of COLLECTIONS) await clearCollection(c);
}
