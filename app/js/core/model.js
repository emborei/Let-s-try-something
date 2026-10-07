/* ==========================================================================
   model.js – Datenmodell, Vorlagen, Standardwerte, Demo-Daten
   Sprache bewusst einfach: „Kontrollen“ statt „CCP“, „Kühlgerät“ statt „CCP 3“.
   ========================================================================== */

import { uuid, dayKey, slug, num, addDays, MS_DAY, canonical } from './util.js';
import { isDueOn } from './logic.js';
import * as db from './db.js';

export const APP_VERSION = '2.0.0-prototype';
export const SCHEMA = 1;

/* ---------- Kataloge ----------------------------------------------------- */

/** Einfache Bezeichnungen – keine Fachbegriffe im Sichtfeld der Nutzer. */
export const KIND_LABEL = {
  temp: 'Temperatur',
  clean: 'Reinigung',
  goods: 'Wareneingang',
  core: 'Eigene Kontrolle',
};

/** Vorschläge für Kühl-/Warmgeräte mit Sollbereich (Grenzwerte aus der Praxis). */
export const TEMP_PRESETS = [
  { name: 'Kühlschrank', min: 2, max: 7, hint: 'Alle Kühlschränke mit leicht verderblicher Ware.' },
  { name: 'Kühlschrank Fleisch/Fisch', min: -1, max: 2, hint: 'Hackfleisch und Geflügel möglichst unter 2 °C lagern.' },
  { name: 'Getränkekühlschrank', min: 4, max: 8, hint: 'Bier und Softdrinks.' },
  { name: 'Salat-/Kühltheke', min: 2, max: 7, hint: 'Aufgetaute Ware nie wieder einfrieren.' },
  { name: 'Tiefkühler / Kühltruhe', min: -24, max: -18, hint: 'Tiefkühlware muss −18 °C oder kälter sein.' },
  { name: 'Heißhaltegerät', min: 65, max: 95, hint: 'Warm gehaltene Speisen mindestens 65 °C.' },
  { name: 'Kerntemperatur beim Garen', min: 72, max: 100, hint: '72 °C für mindestens 2 Minuten.' },
  { name: 'Eigenes Gerät …', min: 0, max: 7, hint: '' },
];

export const CLEAN_PRESETS = [
  { name: 'Theke abwischen', every: 1, hint: 'Nach Schichtwechsel, Spülmittel + klares Wasser.' },
  { name: 'Toilette reinigen', every: 1, hint: 'Waschbecken, WC, Boden, Seife nachfüllen.' },
  { name: 'Küche: Arbeitsflächen', every: 1, hint: 'Nach jedem Arbeitsgang.' },
  { name: 'Küche: Boden wischen', every: 1, hint: '' },
  { name: 'Kühlschrank innen', every: 7, hint: 'Einmal pro Woche auswischen.' },
  { name: 'Fritteuse / Fettfilter', every: 7, hint: '' },
  { name: 'Lager & Getränkekeller', every: 30, hint: 'Auch nach Schädlingen schauen.' },
  { name: 'Eigenen Bereich anlegen …', every: 1, hint: '' },
];

export const CORRECTIVE_ACTIONS = {
  temp_high: [
    'Tür geschlossen / Dichtung geprüft',
    'Waren in ein anderes Gerät umgeräumt',
    'Gerät auf kälter gestellt',
    'Technik/Kundendienst angerufen',
    'Ware aussortiert und entsorgt',
    'Ware schnell verbraucht (bis heute)',
    'Chef informiert',
  ],
  temp_low: [
    'Gerät auf wärmer gestellt',
    'Ware aufgetaut, schnell verbraucht',
    'Tiefkühlware auf Qualität geprüft',
    'Chef informiert',
  ],
  goods: [
    'Lieferung zurückgewiesen',
    'Ware sofort verarbeitet',
    'Ware reklamiert beim Lieferanten',
    'Temperatur erneut gemessen: in Ordnung',
    'Chef informiert',
  ],
  clean: ['Nachreinigung durchgeführt', 'Reinigungsmittel nachgefüllt', 'Chef informiert'],
};

/* ---------- Einstellungen ------------------------------------------------ */

export const DEFAULT_SETTINGS = {
  id: 'settings',
  schema: SCHEMA,
  business: {
    name: 'Meine Kneipe',
    street: '',
    city: '',
    owner: '',
    phone: '',
    healthOffice: '',
  },
  plan: 'free',                       // 'free' | 'pro'
  slots: [
    { id: 'frueh', label: 'Frühschicht', from: '07:00', to: '13:00' },
    { id: 'spaet', label: 'Spätschicht', from: '13:00', to: '23:00' },
  ],
  reminders: {
    enabled: true,
    pushEnabled: false,
    quietFrom: '23:30',
    quietTo: '07:00',
    repeatMin: 30,                    // Kachel bleibt rot, Banner alle X Minuten
  },
  ui: { fontsize: 'm', theme: 'auto' },
  compliance: {
    retentionMonths: 24,              // mindestens 2 Jahre aufbewahren
    keepRawDays: 400,
  },
  server: { url: '', autoRegisterExports: true },
  onboardingDone: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/* ---------- Arbeitsablauf-Vorlagen („Stammdaten“) ------------------------ */

/** Standard-Kontrollen für eine Eckkneipe – in 2 Minuten einsatzbereit. */
export function defaultTasks(now = Date.now()) {
  const mk = (o) => ({
    id: uuid(), kind: o.kind, title: o.title,
    min: o.min ?? null, max: o.max ?? null, unit: o.unit ?? '°C',
    slots: o.slots ?? [], everyDays: o.everyDays ?? 1, weekdays: o.weekdays ?? null,
    requireValue: o.requireValue ?? (o.kind === 'temp'),
    requirePhoto: o.requirePhoto ?? false,
    hint: o.hint ?? '', order: o.order ?? 0, active: true,
    createdAt: now, updatedAt: now,
  });
  return [
    mk({ kind: 'temp', title: 'Kühlschrank Theke', min: 2, max: 7, slots: ['frueh', 'spaet'], order: 10, hint: 'Thermometer ins obere Fach legen.' }),
    mk({ kind: 'temp', title: 'Kühlschrank Küche', min: 2, max: 7, slots: ['frueh', 'spaet'], order: 20 }),
    mk({ kind: 'temp', title: 'Getränkekühlschrank', min: 4, max: 8, slots: ['frueh', 'spaet'], order: 30 }),
    mk({ kind: 'temp', title: 'Tiefkühler', min: -24, max: -18, slots: ['frueh'], order: 40, hint: 'Auch auf Eis- und Reifbildung achten.' }),
    mk({ kind: 'clean', title: 'Theke abwischen', everyDays: 1, slots: ['spaet'], requireValue: false, order: 110, hint: 'Nach Schichtwechsel.' }),
    mk({ kind: 'clean', title: 'Toilette reinigen', everyDays: 1, slots: ['frueh'], requireValue: false, order: 120 }),
    mk({ kind: 'clean', title: 'Küche: Arbeitsflächen', everyDays: 1, slots: ['spaet'], requireValue: false, order: 130 }),
    mk({ kind: 'clean', title: 'Kühlschrank innen', everyDays: 7, weekdays: [1], requireValue: false, order: 140, hint: 'Wöchentlich, am besten montags.' }),
    mk({ kind: 'goods', title: 'Wareneingang kontrollieren', everyDays: 1, slots: ['frueh'], requireValue: false, requirePhoto: true, order: 200, hint: 'Nur wenn heute etwas angeliefert wurde.' }),
    mk({ kind: 'core', title: 'Thermometer prüfen (Eiswasser)', everyDays: 30, requireValue: false, order: 300, hint: 'Fühler in Eiswasser halten: muss 0 °C anzeigen.' }),
  ];
}

/* ---------- Fabriken ----------------------------------------------------- */

export function makeTask(patch = {}) {
  const now = Date.now();
  return {
    id: uuid(),
    kind: patch.kind || 'temp',
    title: patch.title || 'Neue Kontrolle',
    min: num(patch.min, null),
    max: num(patch.max, null),
    unit: patch.unit || '°C',
    slots: patch.slots || [],
    everyDays: patch.everyDays || 1,
    weekdays: patch.weekdays || null,
    requireValue: patch.requireValue ?? (patch.kind === 'temp'),
    requirePhoto: patch.requirePhoto ?? false,
    hint: patch.hint || '',
    order: patch.order ?? 500,
    active: true,
    createdAt: now, updatedAt: now,
  };
}

export function makeUser({ name, role = 'staff', pinHash = null, pinSalt = null }) {
  return {
    id: uuid(), name: name.trim(), role, pinHash, pinSalt,
    active: true, createdAt: Date.now(),
  };
}

/* ---------- Eintrag (der eigentliche Nachweis) --------------------------- */

/**
 * Baut einen Eintrag. Wichtig: Aufgabe und Name werden als Kopie („Snapshot“)
 * mitgespeichert – wer später einen Kühlschrank umbenennt, verändert damit
 * nicht die Vergangenheit. Genau das verlangt ein sauberer Nachweis.
 */
export function makeEntry({
  task, user, ts, tz, value = null, ok = null, note = '', goods = null,
  corrective = null, photoIds = [], dayKeyOverride = null, action = 'create',
  correction = null,
}) {
  const safeTs = Number.isFinite(ts) ? ts : Date.now();
  ts = safeTs;
  return {
    id: uuid(),
    schema: SCHEMA,
    taskId: task.id,
    kind: task.kind,
    taskTitle: task.title,
    taskSnapshot: {
      title: task.title, kind: task.kind, min: task.min, max: task.max,
      unit: task.unit, hint: task.hint || '',
    },
    userId: user?.id || null,
    userName: user?.name || 'Unbekannt',
    dayKey: dayKeyOverride || dayKey(ts),
    tsClient: ts,
    tzOffset: tz,
    tsServer: null,
    serverSeq: null,
    value: num(value, null),
    unit: task.unit || '°C',
    ok,
    note: (note || '').trim(),
    goods: goods || null,
    corrective: corrective || null,
    photoIds: photoIds || [],
    action,                                  // 'create' | 'correct'
    correctionOf: correction?.of || null,
    correctionReason: correction?.reason || null,
    hashPrev: null,
    hash: null,
    serverHashPrev: null,
    serverHash: null,
    createdAt: safeTs,
  };
}

/** Kanonische Fassung eines Eintrags für die Hash-Kette (ohne Sync-Felder). */
export function entryDigestPayload(e) {
  return canonical({
    id: e.id, taskId: e.taskId, taskTitle: e.taskTitle, kind: e.kind,
    dayKey: e.dayKey, tsClient: e.tsClient, tzOffset: e.tzOffset,
    userId: e.userId, userName: e.userName, value: e.value, unit: e.unit,
    ok: e.ok, note: e.note, goods: e.goods, corrective: e.corrective,
    photoIds: e.photoIds, action: e.action, correctionOf: e.correctionOf,
    correctionReason: e.correctionReason,
  });
}

export function makePhoto({ id, entryId, dataUrl, sha, width, height, bytes }) {
  return { id: id || uuid(), entryId, dataUrl, sha256: sha || null, width, height, bytes, ts: Date.now() };
}

export function makeAudit({ userId, userName, action, detail = null }) {
  return { id: uuid(), ts: Date.now(), userId: userId || null, userName: userName || null, action, detail };
}

/* ---------- Demo-Daten --------------------------------------------------- */

/** Deterministischer Zufall – damit Demo-Daten reproduzierbar sind. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Erzeugt plausible Historie der letzten `days` Tage, damit ein neuer Nutzer
 * sofort sieht, wie ein ausgefüllter Monatsbericht aussieht – und damit der
 * Prototyp ohne Tippen getestet werden kann.
 */
export async function seedDemoHistory({ days = 34, business = 'Kneipe Zur Ecke', now = Date.now() } = {}) {
  const rnd = lcg(20261007);
  const tasks = await db.all('tasks');
  const settings = (await db.get('meta', 'settings'))?.value || DEFAULT_SETTINGS;
  const users = await db.all('users');
  const user = users[0] || { id: 'demo', name: 'Chefin' };
  const user2 = users[1] || user;
  const start = now - days * MS_DAY;
  let hashPrev = null;
  let n = 0;
  const entries = [];

  const seedStart = dayKey(start);
  for (let d = 0; d <= days; d++) {
    const ts0 = start + d * MS_DAY;
    const key = dayKey(ts0);
    const date = new Date(ts0);
    const wd = date.getDay();

    for (const t of tasks) {
      if (t.weekdays && !t.weekdays.includes(wd)) continue;
      if (t.kind !== 'temp' && !isDueOn(t, key)) continue;
      const slotList = t.slots.length ? t.slots : [null];

      for (const slot of slotList) {
        // Auch einem gewissenhaften Betrieb rutscht mal etwas durch –
        // das zeigt der Bericht dann ehrlich als Lücke (ca. 5 %).
        if (rnd() < 0.05) continue;
        const slotDef = settings.slots.find((s) => s.id === slot);
        const baseHour = slotDef ? Number(slotDef.from.slice(0, 2)) + 1 : (t.kind === 'clean' ? 22 : 9);
        const ts = new Date(date); ts.setHours(baseHour, Math.floor(rnd() * 59), 0, 0);
        if (ts.getTime() > now) continue;
        const owner = rnd() < 0.45 ? user2 : user;

        let value = null, ok = null, corrective = null;
        if (t.kind === 'temp') {
          const mid = (t.min + t.max) / 2;
          const spread = Math.max(0.4, (t.max - t.min) / 2);
          value = Math.round((mid + (rnd() - 0.5) * spread * 1.05) * 10) / 10;
          ok = value >= t.min && value <= t.max;
          // seltene, echte Abweichung mit Maßnahme
          if (rnd() < 0.03) {
            value = Math.round((t.max + 0.5 + rnd() * 2.5) * 10) / 10;
            ok = false;
          }
          if (!ok) {
            corrective = {
              actions: [CORRECTIVE_ACTIONS.temp_high[0], CORRECTIVE_ACTIONS.temp_high[1]],
              note: 'Nach 40 Minuten nachgemessen, wieder im Sollbereich.',
            };
          }
        }
        if (t.kind === 'goods' && slot === slotList[0] && rnd() < 0.55) continue; // nicht jeden Tag Lieferung
        const entry = makeEntry({
          task: t, user: owner, ts: ts.getTime(), tz: 120, value, ok, corrective,
          note: ok === false ? 'Tür stand über Nacht offen.' : '',
          goods: t.kind === 'goods' ? {
            supplier: ['Getränke Meier', 'Bäckerei Sonnenschein', 'Großhandel Nord', 'Metzgerei Weber'][Math.floor(rnd() * 4)],
            temp: Math.round((2 + rnd() * 4) * 10) / 10,
            packagingOk: true, mhdOk: true, smellOk: true, rejected: false, rejectReason: '',
          } : null,
        });
        entry.dayKey = key;
        entry.hashPrev = hashPrev;
        entry.hash = await entryHash(entry);
        hashPrev = entry.hash;
        entries.push(entry);
        n++;
      }
    }
  }
  await db.bulkPut('entries', entries);
  await db.metaSet('lastHash', entries.at(-1)?.hash || null);
  await db.metaSet('demoSeeded', true);
  return n;
}

/** Hash eines Eintrags inkl. Vorgänger-Hash (verkettet → manipulationssicher). */
export async function entryHash(entry) {
  const { sha256Hex } = await import('./util.js');
  return sha256Hex(`${entry.hashPrev || 'GENESIS'}|${entryDigestPayload(entry)}`);
}

/* ---------- PIN-Verschlüsselung ------------------------------------------ */

/**
 * PIN wird nicht im Klartext gespeichert: SHA-256(Salt + PIN), 4 000 Runden.
 * Für eine 4-stellige PIN ist das kein Bankgeheimnis, aber es verhindert,
 * dass jemand die PIN einfach im Gerätelesen kann. Die echte Absicherung
 * übernimmt später der Server (Betriebscode + Gerätebindung).
 */
export async function hashPin(pin, salt) {
  const { sha256Hex } = await import('./util.js');
  let h = `${salt}:${pin}`;
  for (let i = 0; i < 4000; i++) h = await sha256Hex(h + i);
  return h;
}

export function randomSalt() {
  const a = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('') || slug(String(Date.now()));
}
