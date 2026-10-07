#!/usr/bin/env node
/* ==========================================================================
   tests/ui-dom.mjs – Oberflächen-Test im DOM (jsdom)
   Klickt die Einrichtung durch, trägt eine Temperatur ein, öffnet jeden
   Bildschirm und prüft, dass nichts abstürzt und die Daten wirklich landen.

   jsdom ist eine reine Entwickler-Abhängigkeit und freiwillig:
     npm install --no-save jsdom && node tests/ui-dom.mjs
   Ohne jsdom wird der Test übersprungen (die App selbst braucht es nie).
   ========================================================================== */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.log('\n⏭  UI-Test übersprungen (jsdom nicht installiert).');
  console.log('   Installieren mit:  npm install --no-save jsdom\n');
  process.exit(0);
}

let passed = 0, failed = 0;
const failures = [];
const unhandled = [];
process.on('unhandledRejection', (e) => unhandled.push('unhandledRejection: ' + (e?.message || e)));
process.on('uncaughtException', (e) => unhandled.push('uncaughtException: ' + (e?.message || e)));
async function test(name, fn) {
  try {
    const out = await fn();
    passed++;
    console.log(`  ✓ ${name}${out ? `  (${out})` : ''}`);
  } catch (e) {
    failed++;
    failures.push({ name, e });
    console.log(`  ✗ ${name}\n      ${e?.message || e}`);
  }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'Bedingung nicht erfüllt'); };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || 'unterschiedlich'}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };

/* ---------- DOM-Umgebung aufsetzen -------------------------------------- */

const html = readFileSync(path.join(ROOT, 'app/index.html'), 'utf8')
  .replace(/<script[^>]*><\/script>/g, '')            // Skripte laden wir selbst als Module
  .replace(/<link[^>]*>/g, '');

const dom = new JSDOM(html, {
  url: 'http://localhost:4173/#/heute',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});

const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.Element = window.Element;
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;
globalThis.DocumentFragment = window.DocumentFragment;
globalThis.localStorage = window.localStorage;
globalThis.location = window.location;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
// Kein Netz im Test → Zeitabgleich scheitert, App muss trotzdem laufen
globalThis.fetch = async () => { throw new Error('kein Netz im Test'); };
globalThis.URL.createObjectURL = () => 'blob:test';
globalThis.URL.revokeObjectURL = () => {};

/* ---------- Anwendung starten ------------------------------------------ */

console.log('\n═══ Oberflächen-Test (jsdom) ═══');
const app = await import(path.join(ROOT, 'app/js/app.js'));
const store = await import(path.join(ROOT, 'app/js/ui/store.js'));
const { state } = store;

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));
/** Das oberste (zuletzt geöffnete) Blatt – robust gegen noch nicht entfernte Dialoge. */
const topDialog = () => [...window.document.querySelectorAll('dialog')].at(-1);
const text = () => window.document.body.textContent;
const buttons = () => [...window.document.querySelectorAll('button')];
const clickText = (needle) => {
  const b = buttons().find((x) => x.textContent.includes(needle));
  if (!b) throw new Error(`Knopf „${needle}“ nicht gefunden. Sichtbar: ${text().slice(0, 200)}`);
  b.click();
  return b;
};
const setValue = (input, value) => {
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
};

await wait(400);   // Start abwarten (ohne Netz)

await test('App startet und zeigt die Einrichtung', async () => {
  await wait(200);
  assert(text().includes('KneipenCheck'), 'App-Hülle fehlt');
  assert(text().includes('Einrichtung') || text().includes('Wie heißt dein Betrieb'), 'Einrichtung wird nicht angezeigt');
  return 'Einrichtung sichtbar';
});

await test('Einrichtung: Schritt 1 nimmt Betriebsdaten', async () => {
  const name = window.document.querySelector('input[placeholder*="Kneipe Zur Ecke"]');
  assert(name, 'Feld für den Namen fehlt');
  setValue(name, 'Kneipe Zur Ecke');
  setValue(window.document.querySelector('input[placeholder*="44135"]'), '44135 Dortmund');
  clickText('Weiter');
  await wait(60);
  assert(text().includes('Eckkneipe') || text().includes('Was kontrolliert'), 'Schritt 2 fehlt');
  return 'Kneipe Zur Ecke';
});

await test('Einrichtung: Schritt 2 wählt Vorlage „Eckkneipe“ und zwei Schichten', async () => {
  clickText('Eckkneipe');
  await wait(30);
  clickText('Früh & Spät');
  await wait(30);
  clickText('Weiter');
  await wait(60);
  assert(text().includes('Wer trägt ein'), 'Schritt 3 fehlt');
  return 'Eckkneipe, Früh & Spät';
});

await test('Einrichtung: Schritt 3 legt Person mit PIN an', async () => {
  setValue(window.document.querySelector('input[placeholder*="Marlene"]'), 'Marlene');
  setValue(window.document.querySelector('input[placeholder*="1234"]'), '1234');
  clickText('Weiter');
  await wait(60);
  assert(text().includes('Fast fertig'), 'Schritt 4 fehlt');
  return 'Marlene';
});

await test('Einrichtung: Schritt 4 schließt ab und legt Kontrollen an', async () => {
  clickText('Los geht');
  await wait(2500);   // Kontrollen anlegen (PIN-Hash braucht einen Moment)
  eq(state.settings.onboardingDone, true, 'Einrichtung nicht abgeschlossen');
  assert(state.tasks.length >= 8, `zu wenige Kontrollen: ${state.tasks.length}`);
  eq(state.users.length, 1, 'eine Person');
  assert(state.users[0].pinHash, 'PIN wurde gespeichert');
  return `${state.tasks.length} Kontrollen, ${state.users.length} Person`;
});

await test('Startseite zeigt Aufgaben mit Ampelzustand', async () => {
  await wait(100);
  assert(text().includes('Kühlschrank Theke'), 'Kühlschrank fehlt auf der Startseite');
  assert(text().includes('Toilette reinigen'), 'Reinigungsaufgabe fehlt');
  assert(text().includes('erledigt') || text().includes('offen'), 'kein Zustand sichtbar');
  return 'Kontrollen sichtbar';
});

await test('Temperatur wird über das Blatt gespeichert (2 Klicks)', async () => {
  const before = state.entries.length;
  const tile = [...window.document.querySelectorAll('.card')]
    .find((c) => c.textContent.includes('Kühlschrank Theke'));
  assert(tile, 'Kachel nicht gefunden');
  tile.querySelector('button').click();          // „Jetzt eintragen“
  await wait(120);

  const dialog = topDialog();
  assert(dialog, 'Eingabeblatt öffnet nicht');
  assert(dialog.textContent.includes('Soll: 2 bis 7 °C'), 'Sollbereich fehlt im Blatt');

  const numberInput = dialog.querySelector('.stepper__value input');
  setValue(numberInput, '4,5');
  await wait(60);

  const save = [...dialog.querySelectorAll('.btn--primary')].find((b) => b.textContent.includes('Speichern'));
  assert(save, 'Speichern-Knopf fehlt');
  save.click();
  await wait(400);

  eq(state.entries.length, before + 1, 'Eintrag wurde nicht angelegt');
  const e = state.entries.at(-1);
  eq(e.value, 4.5, 'Wert');
  eq(e.ok, true, 'Bewertung');
  eq(e.userName, 'Marlene', 'Person');
  assert(e.hash && e.hash.length === 64, 'kein Prüf-Hash');
  assert(e.photoIds.length === 0, 'keine Fotos erwartet');
  return `${e.taskTitle}: ${e.value} °C von ${e.userName}`;
});

await test('Abweichung lässt sich nicht ohne Maßnahme speichern', async () => {
  const before = state.entries.length;
  const tile = [...window.document.querySelectorAll('.card')]
    .find((c) => c.textContent.includes('Getränkekühlschrank'));
  tile.querySelector('button').click();
  await wait(120);
  const dialog = topDialog();
  setValue(dialog.querySelector('.stepper__value input'), '15');
  await wait(60);
  assert(dialog.textContent.includes('Außerhalb vom Sollbereich'), 'Warnung fehlt');

  const save = [...dialog.querySelectorAll('.btn--primary, .btn--danger')].find((b) => b.textContent.includes('Abweichung speichern'));
  assert(save, 'Knopf für Abweichung fehlt');
  save.click();
  await wait(200);
  eq(state.entries.length, before, 'ohne Maßnahme darf nichts gespeichert werden');

  // Jetzt Maßnahme auswählen und erneut speichern
  const chips = [...dialog.querySelectorAll('button')].filter((b) => b.textContent.includes('Tür geschlossen'));
  assert(chips.length, 'Maßnahmen-Chips fehlen');
  chips[0].click();
  await wait(60);
  [...dialog.querySelectorAll('.btn--primary, .btn--danger')].find((b) => b.textContent.includes('Abweichung speichern') || b.textContent.includes('Speichern')).click();
  await wait(300);
  eq(state.entries.length, before + 1, 'Abweichung wurde nicht gespeichert');
  const e = state.entries.at(-1);
  eq(e.ok, false, 'als Abweichung markiert');
  assert(e.corrective.actions.length, 'Maßnahme fehlt');
  return `15 °C + „${e.corrective.actions[0]}“`;
});

await test('Reinigung lässt sich in einem Klick abhaken', async () => {
  const before = state.entries.length;
  const tile = [...window.document.querySelectorAll('.card')].find((c) => c.textContent.includes('Toilette reinigen'));
  tile.querySelector('button').click();
  await wait(120);
  const dialog = topDialog();
  const done = [...dialog.querySelectorAll('button')].find((b) => b.textContent.includes('Erledigt'));
  assert(done, 'Erledigt-Knopf fehlt');
  done.click();
  await wait(300);
  eq(state.entries.length, before + 1, 'Reinigung wurde nicht gespeichert');
  return 'ein Klick';
});

await test('Eintrag ansehen zeigt Zeitstempel, Person und Prüfsumme', async () => {
  const e = state.entries.at(-1);
  const entry = await import(path.join(ROOT, 'app/js/ui/views/entry.js'));
  await entry.openEntryDetail(e);
  await wait(120);
  const dialog = topDialog();
  assert(dialog.textContent.includes('Prüfsumme'), 'Prüfsumme fehlt');
  assert(dialog.textContent.includes('Marlene'), 'Person fehlt');
  assert(dialog.textContent.includes('Serverzeit') || dialog.textContent.includes('Gerät'), 'Zeitquelle fehlt');
  dialog.querySelector('button').click();
  await wait(60);
  return 'vollständig';
});

await test('Alle Bildschirme bauen ohne Fehler auf', async () => {
  const screens = ['temperatur', 'putzen', 'wareneingang', 'bericht', 'verwalten', 'heute'];
  for (const s of screens) {
    window.location.hash = `#/${s}`;
    window.dispatchEvent(new window.Event('hashchange'));
    await wait(150);
    assert(window.document.getElementById('view').children.length > 0, `${s}: leerer Bildschirm`);
  }
  return screens.join(', ');
});

await test('Verwalten zeigt Betrieb, Team und Tarif', async () => {
  window.location.hash = '#/verwalten';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(150);
  const t = text();
  assert(t.includes('Kontrollen & Geräte'), 'Kontrollen-Abschnitt fehlt');
  assert(t.includes('Team'), 'Team fehlt');
  assert(t.includes('Aufbewahrung') || t.includes('Server & Sicherung'), 'Server-Abschnitt fehlt');
  return 'vollständig';
});

await test('Bericht erzeugt ein PDF mit echten Daten (ohne Netz)', async () => {
  window.location.hash = '#/bericht';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(200);
  const bericht = await import(path.join(ROOT, 'app/js/ui/views/bericht.js'));
  let saved = null;
  const origCreate = window.URL.createObjectURL;
  window.URL.createObjectURL = (blob) => { saved = blob; return 'blob:test'; };
  const origDownload = globalThis.URL.createObjectURL;
  globalThis.URL.createObjectURL = window.URL.createObjectURL;
  await bericht.exportMonth(new Date().toISOString().slice(0, 7));
  await wait(400);
  globalThis.URL.createObjectURL = origDownload;
  window.URL.createObjectURL = origCreate;
  assert(saved, 'PDF wurde nicht erzeugt');
  assert(saved.type === 'application/pdf', 'falscher Dateityp: ' + saved.type);
  assert(saved.size > 2000, 'PDF zu klein');
  return `${Math.round(saved.size / 1024)} kB PDF`;
});

await test('Verwaltung: alle Blätter öffnen und schließen fehlerfrei', async () => {
  const verw = await import(path.join(ROOT, 'app/js/ui/views/verwalten.js'));
  const liste = await import(path.join(ROOT, 'app/js/ui/views/liste.js'));
  const bericht = await import(path.join(ROOT, 'app/js/ui/views/bericht.js'));
  const entry = await import(path.join(ROOT, 'app/js/ui/views/entry.js'));

  const sheets = [
    ['Betrieb', () => verw.openBusinessSheet()],
    ['Kontrolle bearbeiten', () => liste.openTaskSheet({ task: state.tasks[0] })],
    ['Neues Gerät', () => liste.openTaskSheet({ kind: 'temp' })],
    ['Neuer Reinigungsbereich', () => liste.openTaskSheet({ kind: 'clean' })],
    ['Person ändern', () => verw.openAddUserSheet({ user: state.users[0] })],
    ['Neue Person', () => verw.openAddUserSheet()],
    ['Server einrichten', () => verw.openServerSheet()],
    ['Plus-Info', () => bericht.openUpsell('Testmeldung')],
    ['Person wechseln', () => entry.openSwitchUser()],
  ];
  const done = [];
  for (const [name, fn] of sheets) {
    let api;
    try { api = fn(); } catch (e) { throw new Error(`${name}: ${e.message}`); }
    assert(api?.close, `${name}: Blatt liefert kein close()`);
    await wait(40);
    assert(window.document.querySelector('dialog'), `${name}: kein Dialog im DOM`);
    api.close();
    await wait(240);
    done.push(name);
  }
  eq(window.document.querySelectorAll('dialog').length, 0, 'Blätter wurden nicht aufgeräumt');
  return done.length + ' Blätter: ' + done.join(', ');
});

await test('Alle PDF-Sorten lassen sich erzeugen', async () => {
  const bericht = await import(path.join(ROOT, 'app/js/ui/views/bericht.js'));
  const seen = [];
  const orig = globalThis.URL.createObjectURL;
  globalThis.URL.createObjectURL = (blob) => { seen.push(blob.size); return 'blob:test'; };
  const key = new Date().toISOString().slice(0, 10);
  await bericht.exportDaily(key);
  await bericht.exportOpen(key);
  await bericht.exportWall();
  await wait(300);
  globalThis.URL.createObjectURL = orig;
  eq(seen.length, 3, 'nicht alle PDFs erzeugt');
  assert(seen.every((s) => s > 1000), 'PDF zu klein: ' + seen.join(', '));
  return seen.map((s) => Math.round(s / 1024) + ' kB').join(', ');
});

await test('Nachweisprüfung bestätigt die unversehrte Kette', async () => {
  const r = await store.verifyIntegrity();
  assert(r.ok, 'Kette beschädigt: ' + JSON.stringify(r.problems?.slice(0, 2)));
  assert(r.checked >= 3, `zu wenige Einträge: ${r.checked}`);
  return `${r.checked} Einträge unversehrt`;
});

await test('Manipulation im Speicher wird erkannt', async () => {
  const db = await import(path.join(ROOT, 'app/js/core/db.js'));
  const entries = await db.all('entries');
  const victim = entries[0];
  victim.value = 999;
  await db.put('entries', victim);
  const r = await store.verifyIntegrity();
  assert(!r.ok, 'Manipulation nicht erkannt');
  victim.value = null;
  await db.put('entries', victim);
  return 'erkannt und gemeldet';
});

await wait(300);
if (unhandled.length) {
  failed++;
  console.log('  ✗ keine unbehandelten Fehler in der Oberfläche');
  for (const u of unhandled) console.log('      ' + u);
} else {
  passed++;
  console.log('  ✓ keine unbehandelten Fehler in der Oberfläche');
}

console.log(`\n  ${passed} Tests bestanden${failed ? `  ·  ${failed} fehlgeschlagen` : ''}\n`);
if (failed) {
  for (const f of failures) console.error(`FEHLER: ${f.name}\n`, f.e);
  process.exit(1);
}
process.exit(0);
