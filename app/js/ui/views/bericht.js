/* ==========================================================================
   bericht.js – Berichte & Ein-Klick-PDF für die Lebensmittelkontrolle
   Alles läuft auch offline: die PDF-Erzeugung passiert im Browser.
   ========================================================================== */

import { h, fmtDate, dayKey, downloadBlob, MS_DAY, parseDayKey } from '../../core/util.js';
import { card, pill, toast, sheet, icon, sectionTitle, confirmDialog, kv } from '../components.js';
import { state, logic, st, verifyIntegrity } from '../store.js';
import { PLANS, planLimits, exportAllowed } from '../../core/logic.js';
import { buildMonthlyReport, buildDailyReport, buildOpenTasksReport, buildWallSheet, deMonth, deDate } from '../../core/report.js';
import * as db from '../../core/db.js';

export function renderBericht(root, { navigate }) {
  const now = st.now();
  const key = dayKey(now);
  const ym = key.slice(0, 7);
  const lastDay = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
  const stats = logic.rangeStats({
    tasks: state.tasks, entries: state.entries, settings: state.settings,
    fromKey: `${ym}-01`, toKey: `${ym}-${String(lastDay).padStart(2, '0')}`,
  });

  root.append(h('div', { style: 'margin-bottom:12px' },
    h('h1', { style: 'margin-bottom:2px' }, 'Bericht & Nachweis'),
    h('div', { class: 'card__meta' }, 'Für die Lebensmittelkontrolle, den Vermieter oder die Buchhaltung.')));

  /* --- Kennzahlen des laufenden Monats --- */
  const grid = h('div', { class: 'grid2' });
  grid.append(statCard('Erfüllungsquote', `${stats.quote} %`, stats.quote >= 95 ? 'green' : stats.quote >= 80 ? 'amber' : 'red', deMonth(ym)));
  grid.append(statCard('Abweichungen', String(stats.deviations), stats.deviations ? 'amber' : 'green', 'dokumentiert mit Maßnahme'));
  grid.append(statCard('Tage mit Lücken', String(stats.missedDays.length), stats.missedDays.length ? 'red' : 'green', 'im laufenden Monat'));
  grid.append(statCard('Lückenlos in Folge', `${state.streak || 0} Tage`, (state.streak || 0) > 6 ? 'green' : 'amber', 'jeder Tag mit Eintrag zählt'));
  root.append(grid);

  /* --- PDF-Knöpfe --- */
  root.append(sectionTitle('PDF erzeugen'));
  const btns = h('div', { class: 'btnrow' });

  btns.append(bigBtn('Beweis für den Prüfer', `Monat ${deMonth(ym)}`, 'bericht', 'btn--primary', () => exportMonth(ym)));
  const prevYm = dayKey(parseDayKey(`${ym}-01`).getTime() - MS_DAY).slice(0, 7);
  btns.append(bigBtn('Letzter Monat', deMonth(prevYm), 'bericht', '', () => exportMonth(prevYm)));
  btns.append(bigBtn('Anderer Zeitraum', 'Monat wählen oder Von-Bis', 'uhr', '', () => openRangeSheet()));
  btns.append(bigBtn('Heutiger Tageszettel', 'alle Einträge von heute', 'bericht', '', () => exportDaily(key)));
  btns.append(bigBtn('Arbeitsliste „noch offen“', 'für die Schicht zum Ausdrucken', 'check', '', () => exportOpen(key)));
  btns.append(bigBtn('Aushang für die Wand', 'wer macht heute was', 'speichern', '', () => exportWall()));
  root.append(btns);

  if (state.settings.plan !== 'pro') {
    root.append(card({
      title: 'Kostenlos-Tarif',
      state: 'bald',
      body: [
        h('div', {}, `Du kannst die letzten ${planLimits(state.settings).exportDaysBack} Tage exportieren. Aufbewahrungspflicht sind mindestens 2 Jahre.`),
        h('div', { class: 'card__meta', style: 'margin-top:6px' }, 'KneipenCheck Plus: 9,90 € im Monat pro Standort – volle Historie, automatischer Monatsbericht, Fotos, mehrere Standorte.'),
      ],
      right: pill('Plus', 'amber'),
    }));
  }

  /* --- Integrität --- */
  root.append(sectionTitle('Rechtssicherheit'));
  const chainBox = h('div', { class: 'card' });
  chainBox.append(h('div', { class: 'card__head' }, h('div', { style: 'flex:1' },
    h('h3', { class: 'card__title' }, 'Unverändert seit der Erfassung?'),
    h('div', { class: 'card__meta' }, 'Prüft die Hash-Kette aller Einträge – wie ein Siegel über jede Seite.'))));
  const chainResult = h('div', { style: 'margin-top:10px' });
  chainBox.append(chainResult, h('button', {
    type: 'button', class: 'btn btn--primary btn--block', style: 'margin-top:10px',
    onclick: async (ev) => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Wird geprüft …';
      const r = await verifyIntegrity();
      chainResult.innerHTML = '';
      chainResult.append(h('div', {
        class: 'warnbox',
        dataset: { tone: r.ok ? 'green' : 'red' },
        style: r.ok ? 'border-color:var(--green-line);background:var(--green-bg);color:var(--green)' : '',
      }, r.ok
        ? `Alles in Ordnung: ${r.checked} Einträge geprüft, Kette unversehrt.`
        : `Achtung: ${r.problems.length} Eintrag/Einträge weichen ab – bitte im Einzelprotokoll nachsehen.`));
      btn.disabled = false;
      btn.textContent = 'Nochmal prüfen';
    },
  }, 'Nachweis jetzt prüfen'));
  chainBox.append(h('div', { class: 'infobox', style: 'margin-top:10px' },
    'Jeder Eintrag enthält Datum, Uhrzeit, Person, Messwert und Prüfergebnis – wie im gelben Ordner, nur beweissicher. ',
    'Einträge lassen sich nicht löschen; Korrekturen werden als eigener Eintrag mit Begründung dokumentiert.'));
  root.append(chainBox);

  /* --- Aufbewahrung --- */
  root.append(card({
    title: 'Aufbewahrung',
    body: [
      kv('Pflicht laut VO (EG) 852/2004 & § 4 LMHV', 'mindestens 2 Jahre'),
      kv('In dieser App eingestellt', `${state.settings.compliance?.retentionMonths || 24} Monate`),
      kv('Einträge gesamt', String(state.entries.length)),
      kv('Erster Eintrag', state.entries[0] ? fmtDate(state.entries[0].tsClient) : '–'),
    ],
  }));

  /* --- Datenbackup --- */
  root.append(sectionTitle('Sicherung & Umzug'));
  const backupRow = h('div', { class: 'btnrow' });
  backupRow.append(h('button', { type: 'button', class: 'btn btn--ghost', onclick: exportBackup }, icon('runter', { size: 20 }), ' Sicherung herunterladen'));
  backupRow.append(h('button', {
    type: 'button', class: 'btn btn--ghost',
    onclick: () => importBackup(),
  }, icon('speichern', { size: 20 }), ' Sicherung einlesen'));
  root.append(backupRow);
  root.append(h('div', { class: 'infobox', style: 'margin-top:8px' },
    'Die Sicherungsdatei enthält alle Kontrollen, Personen und Einstellungen. Lege sie monatlich zusätzlich ab (USB-Stick, Cloud) – dann ist die Dokumentation auch bei einem Geräteschaden sicher.'));
}

function statCard(label, value, tone, sub) {
  const c = card({});
  c.append(h('div', { class: 'card__meta' }, label));
  c.append(h('div', { class: 'value-big', style: `color:var(--${tone === 'green' ? 'green' : tone === 'amber' ? 'amber' : 'red'})` }, value));
  c.append(h('div', { class: 'card__meta' }, sub));
  return c;
}

function bigBtn(title, sub, iconName, cls, onClick) {
  const b = h('button', { type: 'button', class: `btn ${cls || 'btn--ghost'}`, style: 'flex:1 1 240px;flex-direction:column;align-items:flex-start;text-align:left;gap:2px;padding:14px 16px' });
  b.append(h('span', { style: 'display:flex;align-items:center;gap:10px;font-weight:900;font-size:1.02em' }, icon(iconName, { size: 24 }), title));
  if (sub) b.append(h('span', { class: 'card__meta', style: 'font-weight:600' }, sub));
  b.onclick = onClick;
  return b;
}

/* ---------- Export-Wege -------------------------------------------------- */

async function integrityPayload() {
  const local = await verifyIntegrity();
  return {
    chainOk: local.ok,
    checkedCount: local.checked,
    chainHead: (await db.metaGet('lastHash', null)) || null,
    serverTime: st.now(),
    note: st.isFresh() ? 'Serverzeit (geprüft)' : 'Gerätezeit (offline erzeugt)',
  };
}

export async function exportMonth(ym) {
  const fromKey = `${ym}-01`;
  const lastDay = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
  const toKey = `${ym}-${String(lastDay).padStart(2, '0')}`;
  const gate = exportAllowed(state.settings, fromKey, toKey);
  if (!gate.ok) { openUpsell(gate.message, () => exportMonth(ym)); return; }

  const t0 = Date.now();
  const integrity = await integrityPayload();
  const { bytes, fileName, stats } = buildMonthlyReport({
    entries: state.entries, tasks: state.tasks, business: state.settings.business,
    settings: state.settings, fromKey, toKey,
    generatedBy: `${state.users.find((u) => u.id === state.currentUserId)?.name || 'Betrieb'}`,
    integrity,
  });
  const ms = Date.now() - t0;
  const blob = new Blob([bytes], { type: 'application/pdf' });
  await saveFile(blob, fileName, `Hygienenachweis ${deMonth(ym)} – ${stats.done} von ${stats.planned} Kontrollen, ${stats.deviations} Abweichungen`);
  toast(`PDF erstellt (${Math.round(ms / 100) / 10} s) ✓`, { tone: 'ok' });
}

export async function exportDaily(key) {
  const integrity = await integrityPayload();
  const { bytes, fileName, count } = buildDailyReport({
    entries: state.entries, business: state.settings.business, key,
    generatedBy: state.users.find((u) => u.id === state.currentUserId)?.name || 'Betrieb',
    integrity,
  });
  await saveFile(new Blob([bytes], { type: 'application/pdf' }), fileName, `Tagesnachweis ${deDate(key)} – ${count} Einträge`);
}

export async function exportOpen(key) {
  const { bytes, fileName, open } = buildOpenTasksReport({
    tasks: state.tasks, entries: state.entries, settings: state.settings,
    business: state.settings.business, key,
    generatedBy: state.users.find((u) => u.id === state.currentUserId)?.name || 'Betrieb',
  });
  await saveFile(new Blob([bytes], { type: 'application/pdf' }), fileName, `${open} offene Kontrollen`);
}

export async function exportWall() {
  const { bytes, fileName } = buildWallSheet({ tasks: state.tasks, settings: state.settings, business: state.settings.business });
  await saveFile(new Blob([bytes], { type: 'application/pdf' }), fileName, 'Aushang zum Aufhängen in der Küche');
}

/** Teilen (Handy) oder herunterladen (Tablet/PC). */
async function saveFile(blob, fileName, shareText) {
  try {
    const file = new File([blob], fileName, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName, text: shareText || fileName });
      return true;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return false;   // Nutzer hat abgebrochen
  }
  downloadBlob(blob, fileName);
  toast('PDF gespeichert. Öffne es aus dem Download-Ordner oder drucke es aus.', { tone: 'ok', ms: 5200 });
  return true;
}

/* ---------- Zeitraum-Auswahl -------------------------------------------- */

function openRangeSheet() {
  const now = st.now();
  const months = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(dayKey(d.getTime()).slice(0, 7));
  }
  let fromKey = months[0] + '-01';
  let toKey = dayKey(now);

  const monthList = h('div', { style: 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px' });
  for (const m of months.slice(0, 12)) {
    const locked = !exportAllowed(state.settings, `${m}-01`, `${m}-28`).ok;
    monthList.append(h('button', {
      type: 'button', class: `btn btn--sm ${locked ? 'btn--ghost' : 'btn--ghost'}`,
      onclick: async () => { if (locked) { openUpsell('Dieser Monat liegt außerhalb des kostenlosen Zeitraums (30 Tage).'); return; } await exportMonth(m); },
    }, deMonth(m), locked ? h('span', { class: 'pill', dataset: { tone: 'amber' } }, 'Plus') : null));
  }

  const fromInput = h('input', { type: 'date', value: fromKey, onchange: (e) => { fromKey = e.target.value; } });
  const toInput = h('input', { type: 'date', value: toKey, onchange: (e) => { toKey = e.target.value; } });

  return sheet({
    title: 'Zeitraum wählen',
    subtitle: 'Monat antippen – oder Von/Bis eintragen.',
    content: [
      monthList,
      h('div', { style: 'height:14px' }),
      h('div', { class: 'grid2' },
        h('label', { class: 'field' }, 'Von', fromInput),
        h('label', { class: 'field' }, 'Bis', toInput)),
      h('button', {
        type: 'button', class: 'btn btn--primary btn--block',
        onclick: async () => {
          const gate = exportAllowed(state.settings, fromKey, toKey);
          if (!gate.ok) { openUpsell(gate.message); return; }
          const integrity = await integrityPayload();
          const { bytes, fileName } = buildMonthlyReport({
            entries: state.entries, tasks: state.tasks, business: state.settings.business,
            settings: state.settings, fromKey, toKey,
            generatedBy: state.users.find((u) => u.id === state.currentUserId)?.name || 'Betrieb',
            integrity,
          });
          await saveFile(new Blob([bytes], { type: 'application/pdf' }), fileName, `Hygienenachweis ${fromKey} bis ${toKey}`);
        },
      }, 'Dieses PDF erzeugen'),
    ],
  });
}

/* ---------- Freemium ---------------------------------------------------- */

export function openUpsell(message, retry = null) {
  const pro = PLANS.pro;
  return sheet({
    title: 'KneipenCheck Plus',
    subtitle: pro.price,
    content: [
      message ? h('div', { class: 'warnbox' }, message) : null,
      h('div', { style: 'font-weight:800;margin-bottom:6px' }, 'Was du damit bekommst:'),
      h('ul', { style: 'margin:0;padding-left:22px;font-weight:600' }, ...pro.features.map((f) => h('li', {}, f))),
      h('div', { class: 'infobox', style: 'margin-top:12px' },
        'Im Prototyp ist der Wechsel kostenlos zum Ausprobieren – es wird nichts abgebucht.'),
    ],
    actions: [
      { label: 'Später', class: 'btn--ghost' },
      {
        label: 'Plus aktivieren (Demo)', class: 'btn--primary', block: true, onClick: async () => {
          const { saveSettings } = await import('../store.js');
          await saveSettings({ plan: 'pro' });
          toast('Plus aktiviert (Demo) ✓', { tone: 'ok' });
          retry?.();
        },
      },
    ],
  });
}

/* ---------- Backup ------------------------------------------------------ */

export async function exportBackup() {
  const data = await db.exportAll();
  const name = `KneipenCheck-Sicherung-${dayKey()}.json`;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  downloadBlob(blob, name);
  toast('Sicherung heruntergeladen ✓', { tone: 'ok' });
}

export function importBackup() {
  const input = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
  document.body.append(input);
  input.onchange = async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      const ok = await confirmDialog({
        title: 'Sicherung einlesen?',
        text: 'Vorhandene Daten werden zusammengeführt. Nichts wird gelöscht.',
        confirmLabel: 'Einlesen',
      });
      if (!ok) return;
      const { importAll } = await import('../../core/db.js');
      const n = await importAll(backup, { merge: true });
      const { loadAll } = await import('../store.js');
      await loadAll();
      toast(`${n} Datensätze eingelesen ✓`, { tone: 'ok' });
    } catch (e) {
      toast('Datei konnte nicht gelesen werden.', { tone: 'err' });
    }
  };
  input.click();
}
