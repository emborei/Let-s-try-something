/* ==========================================================================
   store.js – der gemeinsame Zustand der App + alle Aktionen, die Daten ändern
   Views holen sich hier alles, was sie brauchen. Keine Zyklen, keine Magie.
   ========================================================================== */

import * as db from '../core/db.js';
import * as st from '../core/server-time.js';
import * as sync from '../core/sync.js';
import * as logic from '../core/logic.js';
import {
  DEFAULT_SETTINGS, makeEntry, makePhoto, makeAudit, makeTask, makeUser,
  hashPin, randomSalt, defaultTasks, TEMP_PRESETS, CLEAN_PRESETS, CORRECTIVE_ACTIONS,
  seedDemoHistory, APP_VERSION,
} from '../core/model.js';
import { dayKey, uuid, sha256Hex, shrinkImage, num, buzz } from '../core/util.js';

export { logic };

export const state = {
  ready: false,
  settings: { ...DEFAULT_SETTINGS },
  tasks: [],
  users: [],
  entries: [],
  photos: new Map(),          // id -> Foto-Dokument (nur geladene)
  route: 'heute',
  loading: false,
  lastSavedAt: null,
  syncInfo: { queue: 0, lastSuccess: null, lastError: null, online: true },
  integrity: null,            // Ergebnis der Kettenprüfung
  alarms: [],                 // offene Kontrollen für Erinnerungen
  snoozeUntil: 0,
  isOwner: false,
  storage: 'idb',
  nav: [
    { id: 'heute', label: 'Heute', icon: 'heute' },
    { id: 'temperatur', label: 'Temperatur', icon: 'temperatur' },
    { id: 'putzen', label: 'Putzen', icon: 'putzen' },
    { id: 'wareneingang', label: 'Ware', icon: 'wareneingang' },
    { id: 'bericht', label: 'Bericht', icon: 'bericht' },
  ],
};

/* ---------- Laden / Speichern -------------------------------------------- */

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notify() { for (const fn of listeners) { try { fn(); } catch (e) { console.error(e); } } }

export async function loadAll() {
  state.storage = await db.openDb();

  // Einstellungen (oder Standard anlegen)
  let settings = (await db.get('meta', 'settings'))?.value;
  if (!settings) {
    settings = { ...DEFAULT_SETTINGS };
    await db.metaSet('settings', settings);
  } else {
    settings = { ...DEFAULT_SETTINGS, ...settings, business: { ...DEFAULT_SETTINGS.business, ...(settings.business || {}) }, reminders: { ...DEFAULT_SETTINGS.reminders, ...(settings.reminders || {}) }, ui: { ...DEFAULT_SETTINGS.ui, ...(settings.ui || {}) } };
    await db.metaSet('settings', settings);
  }
  state.settings = settings;

  state.tasks = (await db.all('tasks')).sort((a, b) => (a.order || 0) - (b.order || 0));
  state.users = await db.all('users');
  state.entries = (await db.all('entries')).sort((a, b) => a.tsClient - b.tsClient);

  // Geräte-ID sicherstellen (für Sync)
  if (!(await db.metaGet('deviceId', null))) await db.metaSet('deviceId', uuid());

  state.ready = true;
  applyUiSettings();
  refreshDerived();
  notify();
  return state;
}

export function applyUiSettings() {
  if (typeof document === 'undefined') return;      // läuft auch ohne Browser (Tests)
  const html = document.documentElement;
  const { fontsize = 'm', theme = 'auto' } = state.settings.ui || {};
  html.dataset.fontsize = fontsize;
  if (theme === 'auto') html.removeAttribute('data-theme');
  else html.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#b8830a' : '#ffc53d');
}

/** Alles, was aus den Rohdaten berechnet wird (Übersicht, Warnungen). */
export function refreshDerived() {
  const now = st.now();
  state.today = logic.dayOverview({
    tasks: state.tasks, entries: state.entries, settings: state.settings,
    key: dayKey(now), now,
  });
  state.alarms = logic.nagList({ tasks: state.tasks, entries: state.entries, settings: state.settings, now });
  state.streak = logic.cleanStreak({ tasks: state.tasks, entries: state.entries, settings: state.settings, now });
}

/* ---------- Einstellungen ------------------------------------------------ */

export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch, updatedAt: Date.now() };
  await db.metaSet('settings', state.settings);
  applyUiSettings();
  refreshDerived();
  notify();
  return state.settings;
}

export async function audit(action, detail = null) {
  const u = currentUser();
  await db.put('audit', makeAudit({ userId: u?.id, userName: u?.name, action, detail }));
}

/* ---------- Personen ----------------------------------------------------- */

export function currentUser() {
  const id = state.currentUserId;
  return state.users.find((u) => u.id === id) || state.users[0] || null;
}

export async function setCurrentUser(id) {
  const u = state.users.find((x) => x.id === id);
  if (!u) return;
  state.currentUserId = u.id;
  await db.metaSet('currentUserId', u.id);
  notify();
  return u;
}

export async function addUser({ name, pin = null, role = 'staff' }) {
  const existing = state.users.find((u) => u.name.toLowerCase() === String(name).toLowerCase().trim());
  if (existing) return existing;
  const salt = pin ? randomSalt() : null;
  const user = makeUser({
    name, role,
    pinSalt: salt,
    pinHash: pin ? await hashPin(pin, salt) : null,
  });
  await db.put('users', user);
  state.users.push(user);
  state.users.sort((a, b) => a.createdAt - b.createdAt);
  if (!state.currentUserId) await setCurrentUser(user.id);
  notify();
  return user;
}

export async function updateUser(id, patch) {
  const u = state.users.find((x) => x.id === id);
  if (!u) return null;
  Object.assign(u, patch);
  if (patch.pin !== undefined) {
    if (patch.pin) {
      u.pinSalt = randomSalt();
      u.pinHash = await hashPin(patch.pin, u.pinSalt);
    } else { u.pinHash = null; u.pinSalt = null; }
    delete u.pin;
  }
  await db.put('users', u);
  notify();
  return u;
}

export async function removeUser(id) {
  if (state.users.length <= 1) throw new Error('Mindestens eine Person muss bleiben.');
  state.users = state.users.filter((u) => u.id !== id);
  await db.del('users', id);
  if (state.currentUserId === id) await setCurrentUser(state.users[0].id);
  notify();
}

export async function checkPin(user, pin) {
  if (!user?.pinHash) return true;
  const h = await hashPin(pin, user.pinSalt);
  return h === user.pinHash;
}

export async function unlockOwner(pin) {
  const owner = state.users.find((u) => u.role === 'owner') || state.users[0];
  const ok = await checkPin(owner, pin);
  if (ok) { state.isOwner = true; notify(); }
  return ok;
}

/* ---------- Kontrollen (Stammdaten) ------------------------------------- */

export async function addTask(patch) {
  const t = makeTask({ ...patch, order: (state.tasks.at(-1)?.order || 0) + 5 });
  await db.put('tasks', t);
  state.tasks.push(t);
  state.tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
  await audit('task.add', { title: t.title, kind: t.kind });
  refreshDerived(); notify();
  return t;
}

export async function updateTask(id, patch) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return null;
  Object.assign(t, patch, { updatedAt: Date.now() });
  await db.put('tasks', t);
  await audit('task.update', { title: t.title, patch });
  refreshDerived(); notify();
  return t;
}

export async function removeTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  state.tasks = state.tasks.filter((x) => x.id !== id);
  await db.del('tasks', id);
  await audit('task.remove', { title: t?.title });
  refreshDerived(); notify();
}

export async function adoptPresetSet(which = 'kneipe') {
  const now = Date.now();
  const sets = {
    kneipe: defaultTasks(now),
    imbiss: defaultTasks(now).map((t) => ({ ...t, id: uuid() })),
    cafe: defaultTasks(now).map((t) => ({ ...t, id: uuid() })),
  };
  let list = sets[which] || sets.kneipe;
  if (which === 'imbiss') {
    list = [
      ...list.filter((t) => !['Getränkekühlschrank', 'Kühlschrank Theke'].includes(t.title)),
      makeTask({ kind: 'temp', title: 'Kühltheke / Auslage', min: 2, max: 7, slots: ['frueh', 'spaet'], order: 15, hint: 'Aufgetaute Ware nie wieder einfrieren.' }),
      makeTask({ kind: 'clean', title: 'Fritteuse reinigen', everyDays: 1, slots: ['spaet'], requireValue: false, order: 135 }),
      makeTask({ kind: 'clean', title: 'Arbeitsfläche & Geräte', everyDays: 1, slots: ['frueh', 'spaet'], requireValue: false, order: 138 }),
    ];
  }
  if (which === 'cafe') {
    list = [
      ...list.filter((t) => !['Kühlschrank Theke', 'Kühlschrank Küche'].includes(t.title)),
      makeTask({ kind: 'temp', title: 'Kuchentheke', min: 2, max: 7, slots: ['frueh'], order: 25 }),
      makeTask({ kind: 'temp', title: 'Milch-/Sahnekühlschrank', min: 2, max: 7, slots: ['frueh', 'spaet'], order: 26 }),
      makeTask({ kind: 'clean', title: 'Kaffeemaschine entkalken', everyDays: 7, requireValue: false, order: 150 }),
      makeTask({ kind: 'clean', title: 'Theke & Tische', everyDays: 1, slots: ['spaet'], requireValue: false, order: 115 }),
    ];
  }
  for (const t of list) await db.put('tasks', t);
  state.tasks = (await db.all('tasks')).sort((a, b) => (a.order || 0) - (b.order || 0));
  refreshDerived(); notify();
  return list.length;
}

/* ---------- Einträge: die tägliche Arbeit ------------------------------- */

/**
 * Legt einen Eintrag an: bewertet den Messwert, hängt Fotos an, speichert
 * lokal (sofort, auch offline) und legt ihn in die Sync-Warteschlange.
 */
export async function saveEntry({ task, slotId = null, value = null, note = '', goods = null, corrective = null, photoFiles = [], ok = undefined }) {
  const user = currentUser();
  const stampInfo = st.stamp();
  const ts = st.now();

  const evaluated = ok !== undefined && ok !== null
    ? ok
    : (task.kind === 'temp' ? logic.evaluate(value, task.min, task.max) : null);

  const photoIds = [];
  for (const file of photoFiles) {
    const p = await attachPhoto({ file, entryId: null });
    if (p) photoIds.push(p.id);
  }

  const entry = makeEntry({
    task, user, ts, tz: stampInfo.tz, value, ok: evaluated, note, goods, corrective, photoIds,
  });
  if (stampInfo.trusted) entry.tsServer = ts;   // vorläufig; der Server bestätigt/überschreibt

  await sync.commitEntry(entry);

  // Fotos mit dem Eintrag verknüpfen (nachträglich, da id erst jetzt feststeht)
  for (const pid of photoIds) {
    const ph = state.photos.get(pid) || await db.get('photos', pid);
    if (ph) { ph.entryId = entry.id; await db.put('photos', ph); }
  }

  state.entries.push(entry);
  state.entries.sort((a, b) => a.tsClient - b.tsClient);
  state.lastSavedAt = Date.now();
  bumpPhotoBudget(photoIds.length);
  refreshDerived(); notify();
  queueSyncSoon();
  buzz(evaluated === false ? [20, 60, 20] : 12);
  return entry;
}

/** Foto verkleinern, hashen und ablegen. */
export async function attachPhoto({ file, entryId = null }) {
  if (!file) return null;
  if (!dbLimitAllowsPhoto()) return null;
  const small = await shrinkImage(file, 1280, 0.72);
  if (!small) return null;
  const sha = await sha256Hex(small.dataUrl);
  const photo = makePhoto({ entryId, dataUrl: small.dataUrl, sha, width: small.width, height: small.height, bytes: small.bytes });
  await db.put('photos', photo);
  state.photos.set(photo.id, photo);
  return photo;
}

export function photoBudget() {
  const used = state.settings.photoCount || 0;
  const limit = state.settings.plan === 'pro' ? Infinity : 2;
  return { used, limit, left: Math.max(0, limit - used), isPro: state.settings.plan === 'pro' };
}

function dbLimitAllowsPhoto() { return photoBudget().left > 0; }

async function bumpPhotoBudget(n) {
  if (!n) return;
  await saveSettings({ photoCount: (state.settings.photoCount || 0) + n });
}

/**
 * Korrektur ohne Veränderung der Vergangenheit: der alte Eintrag bleibt
 * sichtbar (mit Hinweis), der neue verweist auf ihn.
 */
export async function correctEntryAction(entry, { reason, value, note, corrective }) {
  const user = currentUser();
  const ts = st.now();
  const task = { ...entry.taskSnapshot, id: entry.taskId, title: entry.taskTitle, kind: entry.kind };
  const ok = task.kind === 'temp' || task.min !== null ? logic.evaluate(value, task.min, task.max) : null;
  const res = await sync.correctEntry(entry, { user, ts, reason, value, ok, note, corrective });
  const idx = state.entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) state.entries[idx] = res.corrected;
  state.entries.push(res.fresh);
  state.entries.sort((a, b) => a.tsClient - b.tsClient);
  refreshDerived(); notify();
  queueSyncSoon();
  return res.fresh;
}

export async function getPhoto(id) {
  if (state.photos.has(id)) return state.photos.get(id);
  const p = await db.get('photos', id);
  if (p) state.photos.set(id, p);
  return p;
}

/* ---------- Aufräumen (Demodaten, Neustart) ----------------------------- */

export async function seedDemo() {
  state.loading = true; notify();
  const n = await seedDemoHistory({ days: 34, now: st.now() });
  state.entries = (await db.all('entries')).sort((a, b) => a.tsClient - b.tsClient);
  state.loading = false;
  refreshDerived(); notify();
  return n;
}

export async function wipeAll({ keepSettings = false } = {}) {
  const settings = state.settings;
  for (const coll of ['users', 'tasks', 'entries', 'photos', 'outbox', 'audit']) {
    await db.clearCollection(coll);
  }
  if (!keepSettings) {
    await db.metaSet('settings', { ...DEFAULT_SETTINGS });
    state.settings = { ...DEFAULT_SETTINGS };
  } else {
    await db.metaSet('settings', settings);
  }
  await db.metaSet('lastHash', null);
  state.users = []; state.tasks = []; state.entries = [];
  state.photos.clear(); state.currentUserId = null; state.isOwner = false;
  refreshDerived(); notify();
}

/* ---------- Fotos für den Bericht --------------------------------------- */

export async function photosFor(entry) {
  const out = [];
  for (const id of entry.photoIds || []) {
    const p = await getPhoto(id);
    if (p) out.push(p);
  }
  return out;
}

/* ---------- Sync (im Hintergrund) --------------------------------------- */

let syncTimer = null;
export function queueSyncSoon(delay = 1200) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { runSync().catch(() => {}); }, delay);
}

export async function runSync() {
  state.syncInfo = { ...(await sync.state()) };
  notify();
  const res = await sync.flush(state.settings);
  state.syncInfo = { ...(await sync.state()), ...res };
  // Serverzeit-Stempel zurückgelesen? Dann Einträge neu laden.
  state.entries = (await db.all('entries')).sort((a, b) => a.tsClient - b.tsClient);
  refreshDerived(); notify();
  return res;
}

export async function verifyIntegrity() {
  const r = await sync.verifyChain();
  state.integrity = r;
  notify();
  return r;
}

/* ---------- Kennzahlen für die Verwaltung ------------------------------- */

export function counts() {
  return {
    tasks: state.tasks.length,
    users: state.users.length,
    entries: state.entries.length,
    todayDone: state.today.done,
    todayTotal: state.today.counts.total,
    openNow: state.alarms.filter((a) => a.state !== 'gestern-fehlt').length,
  };
}

export { TEMP_PRESETS, CLEAN_PRESETS, CORRECTIVE_ACTIONS, APP_VERSION, st, db, sync, dayKey, num };
