/* ==========================================================================
   logic.js – die Regeln: Was steht heute an? Was fehlt? Was ist auffällig?
   Reine Funktionen (kein DOM, keine Speicherung) → gut testbar.
   ========================================================================== */

import { dayKey, dayRange, minutesSince, parseDayKey, MS_DAY, num } from './util.js';

/** Ist die Aufgabe an diesem Kalendertag überhaupt fällig? */
export function isDueOn(task, key) {
  if (!task || task.active === false) return false;
  const wd = parseDayKey(key).getDay();
  if (task.weekdays && task.weekdays.length && !task.weekdays.includes(wd)) return false;
  const every = Number(task.everyDays) || 1;
  if (every > 1) {
    const epoch = parseDayKey('2026-01-05').getTime(); // fester Montag als Nullpunkt
    const diffDays = Math.round((parseDayKey(key).getTime() - epoch) / MS_DAY);
    if (((diffDays % every) + every) % every !== 0) return false;
  }
  return true;
}

export function dueTasks(tasks, key) {
  return tasks.filter((t) => isDueOn(t, key)).sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title, 'de'));
}

/** Zeitfenster („Schicht“) einer Aufgabe an einem Tag. */
export function slotsForTask(task, settings) {
  if (!task.slots || !task.slots.length) return [null];
  const order = (settings?.slots || []).map((s) => s.id);
  return [...task.slots].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((id) => (settings?.slots || []).find((s) => s.id === id) || { id, label: id, from: null, to: null });
}

/** Alle Einträge einer Aufgabe an einem Tag. */
export function entriesFor(entries, taskId, key) {
  return entries.filter((e) => e.taskId === taskId && e.dayKey === key)
    .sort((a, b) => a.tsClient - b.tsClient);
}

/**
 * Zustand eines „Kästchens“ (Aufgabe + Schicht an einem Tag).
 * offen  = noch nichts eingetragen, Zeitfenster läuft noch → ROT (muss erledigt werden)
 * spät   = Zeitfenster fast vorbei, noch offen → ORANGE
 * fertig = eingetragen → GRÜN
 */
export function cellState({ task, slot, entries, key, now }) {
  const list = entries.filter((e) => e.taskId === task.id && e.dayKey === key
    && (!slot || !task.slots?.length || inSlot(e, slot)));
  if (list.length) {
    const bad = list.some((e) => e.ok === false);
    return { state: bad ? 'abweichung' : 'fertig', entries: list, last: list.at(-1) };
  }
  const isToday = key === dayKey(now);
  if (!isToday) return { state: 'verpasst', entries: list, last: null };
  if (!slot || !slot.to) return { state: 'offen', entries: list, last: null };
  const elapsed = minutesSince(slot.to, now);
  if (elapsed >= 0) return { state: 'verpasst', entries: list, last: null };
  const windowMin = Math.max(30, (timeToMin(slot.to) - timeToMin(slot.from || '00:00')));
  if (elapsed > -Math.max(30, windowMin * 0.25)) return { state: 'spaet', entries: list, last: null };
  return { state: 'offen', entries: list, last: null };
}

function timeToMin(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function inSlot(entry, slot) {
  // Ein Eintrag gehört zu der Schicht, in deren Fenster er liegt; sonst zur ersten.
  if (!slot.from || !slot.to) return true;
  const t = timeToMin(`${String(new Date(entry.tsClient).getHours()).padStart(2, '0')}:${String(new Date(entry.tsClient).getMinutes()).padStart(2, '0')}`);
  const a = timeToMin(slot.from);
  const b = timeToMin(slot.to);
  return b >= a ? (t >= a && t < b) : (t >= a || t < b);
}

/**
 * Tagesübersicht: alle Aufgaben mit Zustand, plus Kennzahlen.
 * Das ist das Herz der Startseite und der Erinnerungen.
 */
export function dayOverview({ tasks, entries, settings, key = dayKey(), now = Date.now() }) {
  const list = [];
  const due = dueTasks(tasks, key);
  for (const task of due) {
    for (const slot of slotsForTask(task, settings)) {
      const cell = cellState({ task, slot, entries, key, now });
      list.push({
        taskId: task.id, task, slot, slotId: slot?.id || null, slotLabel: slot?.label || '',
        state: cell.state, entries: cell.entries, last: cell.last,
      });
    }
  }
  const counts = { total: list.length, fertig: 0, abweichung: 0, offen: 0, spaet: 0, verpasst: 0 };
  for (const c of list) counts[c.state] = (counts[c.state] || 0) + 1;
  return {
    key, items: list, counts,
    done: counts.fertig + counts.abweichung,
    open: counts.offen + counts.spaet,
    missed: counts.verpasst,
    percent: counts.total ? Math.round(((counts.fertig + counts.abweichung) / counts.total) * 100) : 100,
  };
}

/** Abweichung prüfen: liegt der Messwert im Sollbereich? */
export function evaluate(value, min, max) {
  const v = num(value, null);
  if (v === null) return null;
  if (min !== null && min !== undefined && v < num(min)) return false;
  if (max !== null && max !== undefined && v > num(max)) return false;
  return true;
}

export function deviationText(value, min, max, unit = '°C') {
  const v = num(value, null);
  if (v === null) return 'Kein Wert eingetragen';
  const t = (x) => String(x).replace('.', ',') + ' ' + unit;
  if (min !== null && v < num(min)) return `Zu kalt: ${t(v)} (erlaubt ab ${t(min)})`;
  if (max !== null && v > num(max)) return `Zu warm: ${t(v)} (erlaubt bis ${t(max)})`;
  return `In Ordnung: ${t(v)}`;
}

/* ---------- Zeitraum-Auswertung (für Bericht) ---------------------------- */

export function rangeStats({ tasks, entries, settings, fromKey, toKey }) {
  const keys = dayRange(fromKey, toKey);
  const perTask = new Map();
  const today = dayKey();
  let planned = 0, done = 0, deviations = 0, missedDays = [];

  for (const key of keys) {
    // Wichtig: Für abgeschlossene Tage alle Zeitfenster als vorbei betrachten –
    // sonst würden vergessene Kontrollen als „noch offen“ gelten und Lücken im
    // Bericht verschwinden. Heute/zukünftige Tage laufen mit der echten Uhr.
    const now = key < today ? parseDayKey(key).getTime() + MS_DAY + 60_000 : Date.now();
    const ov = dayOverview({ tasks, entries, settings, key, now });
    planned += ov.counts.total;
    done += ov.counts.fertig + ov.counts.abweichung;
    deviations += ov.counts.abweichung;
    if (ov.counts.verpasst > 0 && key !== today) missedDays.push({ key, count: ov.counts.verpasst });
    for (const item of ov.items) {
      const rec = perTask.get(item.taskId) || { task: item.task, planned: 0, done: 0, deviations: 0, entries: [] };
      rec.planned++;
      if (item.state === 'fertig' || item.state === 'abweichung') rec.done++;
      if (item.state === 'abweichung') rec.deviations++;
      rec.entries.push(...item.entries);
      perTask.set(item.taskId, rec);
    }
  }
  return {
    fromKey, toKey, days: keys.length, planned, done, deviations, missedDays,
    quote: planned ? Math.round((done / planned) * 100) : 100,
    perTask: [...perTask.values()],
    allEntries: entries
      .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.dayKey || '')
        && e.dayKey >= fromKey && e.dayKey <= toKey)
      .sort((a, b) => a.tsClient - b.tsClient),
  };
}

/** Alle Tage im Zeitraum, an denen gar nichts eingetragen wurde. */
export function emptyDays({ tasks, entries, fromKey, toKey }) {
  const out = [];
  for (const key of dayRange(fromKey, toKey)) {
    if (key === dayKey()) continue;
    const due = dueTasks(tasks, key);
    if (!due.length) continue;
    const any = entries.some((e) => e.dayKey === key);
    if (!any) out.push(key);
  }
  return out;
}

/* ---------- Erinnerungen ------------------------------------------------- */

/**
 * Was muss dem Nutzer jetzt um die Ohren gehauen werden?
 * Gibt eine Liste von Dringlichkeiten zurück, sortiert nach Wichtigkeit.
 */
export function nagList({ tasks, entries, settings, now = Date.now() }) {
  const key = dayKey(now);
  const ov = dayOverview({ tasks, entries, settings, key, now });
  const out = [];
  for (const item of ov.items) {
    if (item.state === 'fertig') continue;
    const weight = item.state === 'verpasst' ? 3 : item.state === 'spaet' ? 2 : 1;
    out.push({
      weight,
      title: item.task.title,
      subtitle: item.slotLabel || 'heute',
      state: item.state,
      taskId: item.taskId,
      slotId: item.slotId,
      kind: item.task.kind,
    });
  }
  // Zusätzlich: gestern vergessene Einträge – der Kontrolleur sieht sie morgen
  const yKey = dayKey(now - MS_DAY);
  const yOv = dayOverview({ tasks, entries, settings, key: yKey, now });
  for (const item of yOv.items) {
    if (item.state === 'verpasst') {
      out.push({
        weight: 4,
        title: item.task.title,
        subtitle: `gestern (${yKey}) nicht eingetragen`,
        state: 'gestern-fehlt', taskId: item.taskId, slotId: item.slotId, kind: item.task.kind,
      });
    }
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/* ---------- Freemium ----------------------------------------------------- */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Kostenlos',
    price: '0 €',
    features: ['1 Standort', 'bis 3 Benutzer', 'letzte 30 Tage im Bericht', 'unbegrenzte Kontrollen', 'Offline-Nutzung'],
    limits: { locations: 1, users: 3, exportDaysBack: 30, photoUpload: false },
  },
  pro: {
    id: 'pro',
    name: 'KneipenCheck Plus',
    price: '9,90 € / Monat pro Standort',
    features: [
      'mehrere Standorte',
      'unbegrenzte Historie (24+ Monate)',
      'automatischer Monatsbericht als PDF',
      'Fotos & Belege zu Einträgen',
      'Lücken-Warnung per E-Mail',
      'Support, auch am Wochenende',
    ],
    limits: { locations: 99, users: 99, exportDaysBack: 36500, photoUpload: true },
  },
};

export function planLimits(settings) {
  return (PLANS[settings?.plan] || PLANS.free).limits;
}

/** Darf so weit zurück exportiert werden? (Freemium-Grenze, immer mit Hinweis) */
export function exportAllowed(settings, fromKey, toKey) {
  const lim = planLimits(settings);
  const oldest = new Date(Date.now() - lim.exportDaysBack * MS_DAY).getTime();
  const from = parseDayKey(fromKey).getTime();
  if (from < oldest) {
    return {
      ok: false,
      message: `Im kostenlosen Tarif kannst du die letzten ${lim.exportDaysBack} Tage exportieren. ` +
        `Für den vollen Zeitraum (Aufbewahrungspflicht: mindestens 2 Jahre) brauchst du KneipenCheck Plus.`,
      needsPro: true,
    };
  }
  return { ok: true };
}

/** Fortschritt „wie viele Wochen ist der Betrieb lückenlos?“ – gutes Verkaufsargument. */
export function cleanStreak({ tasks, entries, settings, now = Date.now(), maxDays = 60 }) {
  let streak = 0;
  for (let i = 1; i <= maxDays; i++) {
    const key = dayKey(now - i * MS_DAY);
    const due = dueTasks(tasks, key);
    if (!due.length) { streak++; continue; }
    const any = entries.some((e) => e.dayKey === key);
    if (!any) break;
    streak++;
  }
  return streak;
}
