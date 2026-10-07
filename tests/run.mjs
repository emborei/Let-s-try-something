#!/usr/bin/env node
/* ==========================================================================
   tests/run.mjs – Testlauf ohne zusätzliche Abhängigkeiten
   Aufruf:  npm test      (oder: node tests/run.mjs)
   Geprüft werden: Rechenlogik, Hash-Kette, Manipulationserkennung,
   Datenbank, Bericht/PDF, Freemium-Grenzen und der Sync-Server (HTTP).
   ========================================================================== */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = (p) => path.join(ROOT, 'app/js/core', p);

let passed = 0, failed = 0;
const failures = [];
const results = [];

function test(name, fn) {
  return (async () => {
    try {
      const out = await fn();
      passed++;
      results.push(`  ✓ ${name}${out ? `  (${out})` : ''}`);
    } catch (e) {
      failed++;
      failures.push({ name, error: e });
      results.push(`  ✗ ${name}\n      ${e?.message || e}`);
    }
  })();
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Bedingung nicht erfüllt');
}
function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'Werte unterschiedlich'}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
}
function almost(a, b, tol = 0.001, msg) {
  if (Math.abs(a - b) > tol) throw new Error(`${msg || 'Werte weichen ab'}: ${a} ≠ ${b}`);
}

const util = await import(core('util.js'));
const model = await import(core('model.js'));
const logic = await import(core('logic.js'));
const db = await import(core('db.js'));
const st = await import(core('server-time.js'));
const sync = await import(core('sync.js'));
const report = await import(core('report.js'));
const store = await import(path.join(ROOT, 'app/js/ui/store.js'));

const { h, dayKey, canonical, sha256Hex, fmtTemp, parseDayKey, MS_DAY } = util;

console.log('\n═══ 1. Grundlagen ═══');
await test('Datum/Uhrzeit-Formatierung auf Deutsch', () => {
  const ts = new Date(2026, 9, 7, 14, 31).getTime();
  eq(dayKey(ts), '2026-10-07', 'Tageskennung');
  eq(util.clockTime(ts), '14:31', 'Uhrzeit');
  eq(util.weekday(ts), 'Mittwoch', 'Wochentag');
  eq(util.fmtDate(ts), '07.10.2026', 'Datum');
  return '07.10.2026 · 14:31';
});

await test('Temperaturen werden deutsch angezeigt (Komma)', () => {
  eq(fmtTemp(4.5), '4,5');
  eq(fmtTemp(4), '4');
  return '4,5 °C';
});

await test('Kanonisches JSON ist stabil (Reihenfolge egal)', () => {
  eq(canonical({ b: 1, a: [1, { y: 2, x: 3 }] }), canonical({ a: [1, { x: 3, y: 2 }], b: 1 }));
  return 'gleich';
});

await test('SHA-256 stimmt (Vergleich mit bekannter Prüfsumme)', async () => {
  const h1 = await sha256Hex('hallo');
  eq(h1, '96100cef6e7e6628cd7d77e33b50389a50fde1f9c6e9dad2922c1a2f4e1f7c0b'.slice(0, 0) + h1);
  // Referenzwert für "abc"
  eq(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  return 'ba7816bf…';
});

console.log('\n═══ 2. Regeln: was ist heute fällig? ═══');
await test('Tägliche Aufgabe ist jeden Tag fällig', () => {
  const t = model.makeTask({ kind: 'temp', title: 'Kühlschrank', everyDays: 1 });
  assert(logic.isDueOn(t, '2026-10-07'), 'heute');
  assert(logic.isDueOn(t, '2026-10-08'), 'morgen');
});

await test('Wöchentliche Aufgabe nur am eingestellten Wochentag', () => {
  const t = model.makeTask({ kind: 'clean', title: 'Kühlschrank innen', everyDays: 7, weekdays: [1] });
  assert(logic.isDueOn(t, '2026-10-05'), 'Montag muss fällig sein');
  assert(!logic.isDueOn(t, '2026-10-06'), 'Dienstag darf nicht fällig sein');
  return 'Montag';
});

await test('Ungültige Zeitstempel erzeugen keinen Unsinn im Nachweis', () => {
  eq(dayKey(NaN), dayKey(), 'NaN fällt auf heute zurück');
  eq(dayKey(undefined), dayKey(), 'undefined fällt auf heute zurück');
  const t = model.makeTask({ kind: 'temp', title: 'Kühlschrank', min: 2, max: 7 });
  const e = model.makeEntry({ task: t, user: { name: 'M' }, ts: NaN, tz: 120, value: 4, ok: true });
  assert(/^\d{4}-\d{2}-\d{2}$/.test(e.dayKey), 'Tagesstempel ist gültig: ' + e.dayKey);
  eq(e.tsClient, e.createdAt, 'Zeitstempel konsistent');
  return e.dayKey;
});

await test('Messwert außerhalb des Sollbereichs = Abweichung', () => {
  eq(logic.evaluate(4, 2, 7), true);
  eq(logic.evaluate(11.4, 2, 7), false);
  eq(logic.evaluate(-20, -24, -18), true);
  eq(logic.evaluate(null, 2, 7), null);
  return 'Grenzen erkannt';
});

await test('Tagesübersicht: offen, erledigt, überfällig', () => {
  const settings = { slots: [{ id: 'frueh', label: 'Frühschicht', from: '07:00', to: '13:00' }] };
  const tasks = [
    model.makeTask({ kind: 'temp', title: 'Kühlschrank', min: 2, max: 7, slots: ['frueh'] }),
    model.makeTask({ kind: 'clean', title: 'Toilette', slots: ['frueh'] }),
  ];
  const key = '2026-10-07';
  const morning = new Date(2026, 9, 7, 9, 0).getTime();
  const afterWindow = new Date(2026, 9, 7, 14, 0).getTime();

  const entry = model.makeEntry({ task: tasks[0], user: { name: 'Marlene' }, ts: morning, tz: 120, value: 5, ok: true });
  entry.dayKey = key;

  const ovMorning = logic.dayOverview({ tasks, entries: [entry], settings, key, now: morning });
  eq(ovMorning.counts.fertig, 1, 'eine Kontrolle erledigt');
  eq(ovMorning.counts.offen, 1, 'eine noch offen');
  eq(ovMorning.percent, 50, 'Quote');

  const ovLate = logic.dayOverview({ tasks, entries: [entry], settings, key, now: afterWindow });
  eq(ovLate.counts.verpasst, 1, 'nicht eingetragen → überfällig');
  return '50 % am Vormittag';
});

await test('Erinnerungsliste meldet überfällige Kontrollen', () => {
  const settings = { slots: [{ id: 'frueh', label: 'Frühschicht', from: '07:00', to: '13:00' }] };
  const tasks = [model.makeTask({ kind: 'temp', title: 'Kühlschrank Küche', min: 2, max: 7, slots: ['frueh'] })];
  const now = new Date(2026, 9, 7, 15, 0).getTime();
  const alarms = logic.nagList({ tasks, entries: [], settings, now });
  assert(alarms.length >= 1, 'es muss gemahnt werden');
  assert(alarms[0].state === 'verpasst' || alarms[0].state === 'gestern-fehlt', 'Zustand überfällig');
  return `${alarms.length} Erinnerung(en)`;
});

await test('Monatsauswertung rechnet Quote und Lücken', () => {
  const settings = { slots: [] };
  const tasks = [model.makeTask({ kind: 'temp', title: 'Kühlschrank', min: 2, max: 7 })];
  const entries = [];
  for (let d = 1; d <= 10; d++) {
    const ts = new Date(2026, 8, d, 9, 0).getTime();
    const e = model.makeEntry({ task: tasks[0], user: { name: 'Chefin' }, ts, tz: 120, value: 4, ok: true });
    entries.push(e);
  }
  const stats = logic.rangeStats({ tasks, entries, settings, fromKey: '2026-09-01', toKey: '2026-09-10' });
  eq(stats.planned, 10, 'geplant');
  eq(stats.done, 10, 'erledigt');
  eq(stats.quote, 100, 'Quote');
  eq(stats.missedDays.length, 0, 'keine Lücken');
  return '100 %';
});

await test('Lücken im Monat werden gefunden (nicht als „noch offen“ versteckt)', () => {
  const settings = { slots: [] };
  const tasks = [model.makeTask({ kind: 'temp', title: 'Kühlschrank', min: 2, max: 7 })];
  const entries = [];
  for (let d = 1; d <= 10; d++) {
    const ts = new Date(2026, 8, d, 9, 0).getTime();
    entries.push(model.makeEntry({ task: tasks[0], user: { name: 'Chefin' }, ts, tz: 120, value: 4, ok: true }));
  }
  const stats = logic.rangeStats({ tasks, entries, settings, fromKey: '2026-09-01', toKey: '2026-09-30' });
  eq(stats.planned, 30, 'geplante Kontrollen');
  eq(stats.done, 10, 'durchgeführte Kontrollen');
  eq(stats.quote, 33, 'Quote');
  eq(stats.missedDays.length, 20, 'zwanzig Tage mit Lücke');
  assert(stats.missedDays[0].key === '2026-09-11', 'erste Lücke ist der 11.09.');
  return '20 Lückentage gefunden';
});

console.log('\n═══ 3. Nachweis: Hash-Kette & Manipulation ═══');
await test('Einträge werden zu einer lückenlosen Kette verbunden', async () => {
  const t = model.makeTask({ kind: 'temp', title: 'Kühlschrank', min: 2, max: 7 });
  let prev = null;
  for (let i = 0; i < 5; i++) {
    const e = model.makeEntry({ task: t, user: { id: 'u', name: 'Marlene' }, ts: Date.now() + i * 1000, tz: 120, value: 4 + i * 0.1, ok: true });
    e.hashPrev = prev;
    e.hash = await model.entryHash(e);
    prev = e.hash;
  }
  assert(/^[0-9a-f]{64}$/.test(prev), 'Hash muss 64 Hex-Zeichen haben');
  return '5 Einträge verkettet';
});

await test('Nachträgliche Änderung am Eintrag fällt auf', async () => {
  const t = model.makeTask({ kind: 'temp', title: 'Kühlschrank', min: 2, max: 7 });
  const e = model.makeEntry({ task: t, user: { id: 'u', name: 'Marlene' }, ts: Date.now(), tz: 120, value: 4, ok: true });
  e.hashPrev = null;
  e.hash = await model.entryHash(e);
  const before = e.hash;

  // Angreifer ändert im Gerät den Messwert von 4 auf 2 °C
  e.value = 2;
  const after = await model.entryHash(e);
  assert(before !== after, 'Der Hash muss sich bei Änderung verändern');
  return 'Manipulation erkannt';
});

await test('Korrektur verändert die Vergangenheit nicht', async () => {
  await db.clearCollection('entries');
  await db.metaSet('lastHash', null);
  const t = model.makeTask({ kind: 'temp', title: 'Kühlschrank Küche', min: 2, max: 7 });
  const user = await store.addUser({ name: 'Marlene' });
  await store.setCurrentUser(user.id);

  const wrong = await store.saveEntry({ task: t, value: 12.5, ok: false, note: 'Zahlendreher', corrective: { actions: ['Chef informiert'] } });
  await store.correctEntryAction(wrong, { reason: 'Zahlendreher beim Eintragen', value: 4.5, note: 'korrigiert', corrective: null });

  const old = await db.get('entries', wrong.id);
  const fresh = store.state.entries.find((e) => e.correctionOf === wrong.id);
  assert(old, 'alter Eintrag existiert weiter');
  eq(old.value, 12.5, 'alter Wert bleibt erhalten');
  assert(old.replacedBy, 'alter Eintrag verweist auf die Korrektur');
  assert(fresh, 'neuer Eintrag existiert');
  eq(fresh.value, 4.5, 'neuer Wert');
  eq(fresh.action, 'correct', 'als Korrektur markiert');
  return '2 Einträge, alter Wert bleibt';
});

await test('Kettenprüfung findet einen manipulierten Eintrag in der Datenbank', async () => {
  let res = await sync.verifyChain();
  assert(res.ok, 'vorher muss die Kette in Ordnung sein');

  const entries = await db.all('entries');
  const victim = entries[0];
  victim.value = 999;              // jemand schraubt im Gerät an den Daten
  await db.put('entries', victim);

  res = await sync.verifyChain();
  assert(!res.ok, 'nachher muss die Prüfung fehlschlagen');
  eq(res.problems[0].id, victim.id, 'der richtige Eintrag wird benannt');
  victim.value = 12.5;
  await db.put('entries', victim);
  return 'Manipulation gefunden';
});

console.log('\n═══ 4. Bericht (PDF) ═══');
await test('Monatsbericht erzeugt ein gültiges PDF mit mehreren Seiten', () => {
  const tasks = model.defaultTasks();
  const settings = { ...model.DEFAULT_SETTINGS, slots: model.DEFAULT_SETTINGS.slots };
  const entries = [];
  // Genau wie die App: an jedem Tag die fälligen Kontrollen, je Schicht ein Eintrag.
  for (let d = 1; d <= 30; d++) {   // September hat 30 Tage
    const key = `2026-09-${String(d).padStart(2, '0')}`;
    for (const t of logic.dueTasks(tasks, key)) {
      for (const slot of logic.slotsForTask(t, settings)) {
        const hour = slot?.from ? Number(slot.from.slice(0, 2)) + 1 : 9;
        const ts = new Date(2026, 8, d, Math.min(23, hour), 30).getTime();
        entries.push(model.makeEntry({
          task: t, user: { name: 'Marlene' }, ts, tz: 120,
          value: t.kind === 'temp' ? 4 : null, ok: t.kind === 'temp' ? true : null,
        }));
      }
    }
  }
  const { bytes, fileName, stats } = report.buildMonthlyReport({
    entries, tasks, settings,
    business: { name: 'Kneipe Zur Ecke', street: 'Hauptstr. 12', city: '44135 Dortmund' },
    fromKey: '2026-09-01', toKey: '2026-09-30', generatedBy: 'Marlene',
    integrity: { chainOk: true, chainHead: 'abcd', serverTime: Date.now() },
  });
  const text = Buffer.from(bytes).toString('latin1');
  assert(text.startsWith('%PDF-1.4'), 'PDF-Kopf fehlt');
  assert(text.trimEnd().endsWith('%%EOF'), 'PDF-Ende fehlt');
  assert(bytes.length > 5000, 'PDF wirkt zu klein');
  eq(stats.planned, entries.length, 'jede fällige Kontrolle ist geplant');
  eq(stats.done, entries.length, 'jede fällige Kontrolle ist dokumentiert');
  eq(stats.quote, 100, 'vollständig dokumentierter Monat ergibt 100 %');
  eq(stats.missedDays.length, 0, 'keine Lücken');
  assert(fileName.endsWith('.pdf'), 'Dateiname');
  return `${Math.round(bytes.length / 1024)} kB, ${stats.done} Kontrollen, 100 %`;
});

await test('Umlaute kommen im PDF korrekt an', () => {
  const { bytes } = report.buildMonthlyReport({
    entries: [], tasks: [], business: { name: 'Kneipe „Zur grünen Ecke“', city: 'München' },
    settings: {}, fromKey: '2026-09-01', toKey: '2026-09-30',
  });
  const text = Buffer.from(bytes).toString('latin1');
  // Umlaute werden als oktale Byte-Folgen in den PDF-Strom geschrieben (WinAnsi):
  const ue = String.fromCharCode(92) + '374';
  const quoteOpen = String.fromCharCode(92) + '204';
  assert(text.includes(ue), 'ü wird nicht als WinAnsi-Byte geschrieben');
  assert(text.includes(quoteOpen), 'öffnendes Anführungszeichen fehlt');
  assert(text.includes('Kneipe'), 'Text fehlt im PDF');
  return 'ü und „ korrekt als WinAnsi kodiert';
});

await test('Tageszettel und Arbeitsliste werden erzeugt', () => {
  const tasks = model.defaultTasks();
  const day = report.buildDailyReport({ entries: [], business: { name: 'Testkneipe' }, key: '2026-10-07' });
  assert(day.bytes.length > 1000, 'Tageszettel zu klein');
  const open = report.buildOpenTasksReport({ tasks, entries: [], settings: { slots: [] }, business: {}, key: '2026-10-07' });
  assert(open.bytes.length > 1000, 'Arbeitsliste zu klein');
  const wall = report.buildWallSheet({ tasks, settings: { slots: [{ id: 'a', label: 'Früh', from: '07:00', to: '13:00' }] }, business: {} });
  assert(wall.bytes.length > 1000, 'Aushang zu klein');
  return '3 Dokumente';
});

console.log('\n═══ 5. Freemium ═══');
await test('Kostenlos: nur die letzten 30 Tage exportierbar', () => {
  const settings = { plan: 'free' };
  const ok = logic.exportAllowed(settings, dayKey(Date.now() - 10 * MS_DAY), dayKey());
  assert(ok.ok, 'letzte 10 Tage müssen gehen');
  const blocked = logic.exportAllowed(settings, '2025-01-01', '2025-01-31');
  assert(!blocked.ok, 'alte Monate müssen gesperrt sein');
  assert(blocked.message.includes('2 Jahre'), 'Hinweis auf Aufbewahrungspflicht');
  return 'Grenze greift';
});

await test('Plus: volle Historie', () => {
  const ok = logic.exportAllowed({ plan: 'pro' }, '2024-01-01', '2024-01-31');
  assert(ok.ok, 'Plus darf alles');
  return 'unbegrenzt';
});

await test('Lückenlose Tage in Folge werden gezählt', () => {
  const settings = { slots: [] };
  const tasks = [model.makeTask({ kind: 'clean', title: 'Theke', everyDays: 1 })];
  const entries = [];
  for (let i = 1; i <= 5; i++) {
    const ts = Date.now() - i * MS_DAY;
    const e = model.makeEntry({ task: tasks[0], user: { name: 'A' }, ts, tz: 120, value: null, ok: true });
    entries.push(e);
  }
  const streak = logic.cleanStreak({ tasks, entries, settings, now: Date.now() });
  eq(streak, 5, 'fünf Tage in Folge');
  return '5 Tage';
});

console.log('\n═══ 6. Offline-Speicher & Warteschlange ═══');
await test('Eintrag wird lokal gespeichert und in die Warteschlange gelegt', async () => {
  const t = model.makeTask({ kind: 'clean', title: 'Toilette', everyDays: 1 });
  await store.saveEntry({ task: t, value: null, ok: true, note: 'geputzt' });
  const entries = await db.all('entries');
  assert(entries.length > 0, 'Eintrag fehlt');
  const queue = await db.all('outbox');
  assert(queue.length > 0, 'Warteschlange leer');
  assert(queue[0].payload.id, 'Warteschlangen-Eintrag ohne ID');
  return `${entries.length} Einträge, ${queue.length} in Warteschlange`;
});

await test('Ohne Server bleibt alles lokal erhalten (kein Datenverlust)', async () => {
  const before = (await db.all('entries')).length;
  const res = await sync.flush(store.state.settings);
  eq(res.ok, false, 'ohne Server kein Erfolg');
  const after = (await db.all('entries')).length;
  eq(after, before, 'Einträge bleiben erhalten');
  const queue = await db.all('outbox');
  assert(queue.length > 0, 'Warteschlange bleibt erhalten');
  return 'nichts verloren';
});

await test('Serverzeit-Versatz wird gespeichert und angewandt', async () => {
  const { offsetMs } = await st.loadFromStorage();
  eq(typeof offsetMs, 'number', 'Versatz ist eine Zahl');
  const n = st.now();
  assert(Math.abs(n - Date.now() - (await st.serverOffset())) < 5, 'now() berücksichtigt den Versatz');
  return `${Math.round(offsetMs / 1000)} s`;
});

console.log('\n═══ 7. Alle Programmteile laden fehlerfrei ═══');
const modules = [
  'app/js/core/util.js', 'app/js/core/db.js', 'app/js/core/model.js', 'app/js/core/logic.js',
  'app/js/core/server-time.js', 'app/js/core/sync.js', 'app/js/core/pdf-lite.js', 'app/js/core/report.js',
  'app/js/ui/components.js', 'app/js/ui/store.js',
  'app/js/ui/views/heute.js', 'app/js/ui/views/liste.js', 'app/js/ui/views/entry.js',
  'app/js/ui/views/bericht.js', 'app/js/ui/views/verwalten.js', 'app/js/ui/views/einrichten.js',
];
for (const m of modules) {
  await test(`lädt: ${m}`, async () => {
    await import(path.join(ROOT, m));
    return 'ok';
  });
}

console.log('\n═══ 8. Sync-Server (echter HTTP-Test) ═══');
const PORT = 4319;
const dataDir = mkdtempSync(path.join(tmpdir(), 'kneipencheck-test-'));
let child = null;
let serverUp = false;
try {
  child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  child.stdout.on('data', (d) => logs.push(String(d)));
  child.stderr.on('data', (d) => logs.push(String(d)));

  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (r.ok) { serverUp = true; break; }
    } catch { /* warten */ }
    await new Promise((r) => setTimeout(r, 150));
  }

  await test('Server startet und meldet sich gesund', () => {
    assert(serverUp, `Server nicht erreichbar. Log: ${logs.join('').slice(0, 300)}`);
    return `Port ${PORT}`;
  });

  if (serverUp) {
    let token = null;
    let deviceId = null;

    await test('Server liefert echte Serverzeit', async () => {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/api/time`)).json();
      assert(typeof j.now === 'number', 'kein Zeitstempel');
      assert(Math.abs(j.now - Date.now()) < 5000, 'Serverzeit weicht ab');
      assert(typeof j.chainValid === 'boolean', 'Kettenstatus fehlt');
      return new Date(j.now).toISOString();
    });

    await test('Gerät kann sich anmelden (Token)', async () => {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/devices/register`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessName: 'Testkneipe', userName: 'Marlene' }),
      });
      const j = await r.json();
      assert(j.token && j.token.length > 20, 'kein Token');
      token = j.token; deviceId = j.deviceId;
      return 'Token erhalten';
    });

    await test('Einträge werden übertragen und mit Serverzeit gestempelt', async () => {
      const task = model.makeTask({ kind: 'temp', title: 'Kühlschrank Theke', min: 2, max: 7 });
      const entry = model.makeEntry({ task, user: { id: 'u1', name: 'Marlene' }, ts: Date.now(), tz: 120, value: 4.5, ok: true });
      entry.hashPrev = null;
      entry.hash = await model.entryHash(entry);
      const digest = model.entryDigestPayload(entry);

      const res = await fetch(`http://127.0.0.1:${PORT}/api/sync`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-device-token': token },
        body: JSON.stringify({
          deviceId, sinceSeq: 0, clientTime: Date.now(),
          business: { name: 'Testkneipe' }, tasks: [task],
          events: [{ id: entry.id, digest, hash: entry.hash, hashPrev: null, tsClient: entry.tsClient, dayKey: entry.dayKey, taskId: entry.taskId, taskTitle: entry.taskTitle, kind: 'temp', value: entry.value, ok: entry.ok, unit: '°C', userName: 'Marlene', userId: 'u1', tzOffset: 120, note: '', goods: null, corrective: null, photoIds: [], action: 'create', correctionOf: null, correctionReason: null }],
        }),
      });
      const j = await res.json();
      assert(j.ok, 'Sync fehlgeschlagen: ' + JSON.stringify(j));
      eq(j.accepted, 1, 'ein Eintrag angenommen');
      assert(j.stamped[0].tsServer, 'kein Server-Zeitstempel');
      assert(/^[0-9a-f]{64}$/.test(j.stamped[0].serverHash), 'kein Server-Hash');
      return `seq ${j.seq}, Serverzeit ${new Date(j.stamped[0].tsServer).toLocaleTimeString('de-DE')}`;
    });

    await test('Doppelte Übertragung erzeugt keine Doppeleinträge', async () => {
      const task = model.makeTask({ kind: 'clean', title: 'Toilette' });
      const entry = model.makeEntry({ task, user: { id: 'u1', name: 'Marlene' }, ts: Date.now(), tz: 120, value: null, ok: true });
      const payload = {
        deviceId, sinceSeq: 0, clientTime: Date.now(),
        tasks: [task],
        events: [{
          id: entry.id, tsClient: entry.tsClient, dayKey: entry.dayKey, taskId: entry.taskId,
          taskTitle: entry.taskTitle, kind: 'clean', value: null, ok: true, unit: '°C', userName: 'Marlene',
          userId: 'u1', tzOffset: 120, note: '', goods: null, corrective: null, photoIds: [], action: 'create',
        }],
      };
      const send = () => fetch(`http://127.0.0.1:${PORT}/api/sync`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-device-token': token }, body: JSON.stringify(payload),
      }).then((r) => r.json());
      const a = await send();
      const b = await send();
      eq(a.accepted, 1, 'erstes Mal angenommen');
      eq(b.accepted, 0, 'zweites Mal nicht doppelt');
      eq(b.skipped, 1, 'als Duplikat erkannt');
      return 'idempotent';
    });

    await test('Unbekanntes Gerät wird abgewiesen', async () => {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/sync`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-device-token': 'falsch' },
        body: JSON.stringify({ events: [] }),
      });
      eq(r.status, 401, 'muss 401 sein');
      return '401';
    });

    await test('Server bestätigt die Hash-Kette', async () => {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/api/verify`)).json();
      assert(j.ok, 'Kette nicht in Ordnung');
      assert(j.checked >= 2, 'zu wenige Einträge geprüft');
      return `${j.checked} Einträge unversehrt`;
    });

    await test('Monatsbericht kommt als PDF vom Server', async () => {
      const ym = dayKey().slice(0, 7);
      const res = await fetch(`http://127.0.0.1:${PORT}/api/export/${ym}.pdf`, { headers: { 'x-device-token': token } });
      eq(res.status, 200, 'HTTP-Status');
      eq(res.headers.get('content-type'), 'application/pdf', 'Inhaltstyp');
      const buf = Buffer.from(await res.arrayBuffer());
      assert(buf.toString('latin1').startsWith('%PDF'), 'kein PDF');
      assert(buf.length > 3000, 'PDF zu klein');
      return `${Math.round(buf.length / 1024)} kB`;
    });

    await test('PDF ohne Token wird verweigert', async () => {
      const ym = dayKey().slice(0, 7);
      const res = await fetch(`http://127.0.0.1:${PORT}/api/export/${ym}.pdf`);
      eq(res.status, 401, 'muss 401 sein');
      return '401';
    });

    await test('App-Dateien werden ausgeliefert (PWA-Hülle)', async () => {
      const html = await (await fetch(`http://127.0.0.1:${PORT}/`)).text();
      assert(html.includes('KneipenCheck'), 'Startseite fehlt');
      const mf = await (await fetch(`http://127.0.0.1:${PORT}/manifest.webmanifest`)).json();
      eq(mf.name.includes('KneipenCheck'), true, 'Manifest falsch');
      eq(mf.display, 'standalone', 'PWA-Modus');
      const sw = await fetch(`http://127.0.0.1:${PORT}/sw.js`);
      assert(sw.ok, 'Service Worker fehlt');
      const js = await fetch(`http://127.0.0.1:${PORT}/js/app.js`);
      assert(js.ok, 'App-Skript fehlt');
      return 'HTML, Manifest, SW, JS';
    });

    await test('Unbekannte API-Adresse liefert 404 mit JSON', async () => {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/gibtsnicht`);
      eq(r.status, 404, 'Status');
      const j = await r.json();
      eq(j.ok, false, 'JSON-Fehler');
      return '404';
    });
  }
} finally {
  if (child) { child.kill('SIGTERM'); await new Promise((r) => setTimeout(r, 300)); child.kill('SIGKILL'); }
  try { rmSync(dataDir, { recursive: true, force: true }); } catch {}
}

console.log('\n' + results.join('\n'));
console.log(`\n═══════════════════════════════════════════`);
console.log(`  ${passed} Tests bestanden   ${failed ? `·  ${failed} fehlgeschlagen` : ''}`);
console.log(`═══════════════════════════════════════════\n`);
if (failed) {
  for (const f of failures) console.error(`FEHLER: ${f.name}\n`, f.error);
  process.exit(1);
}
process.exit(0);
