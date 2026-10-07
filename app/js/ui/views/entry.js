/* ==========================================================================
   entry.js – die Blätter zum Eintragen (Temperatur, Reinigung, Wareneingang)
   Ziel: Eine Kontrolle in zwei Berührungen erledigen – ohne Nachdenken.
   ========================================================================== */

import { h, fmtTemp, fmtDateTime, fmtTime, esc, shrinkImage } from '../../core/util.js';
import { sheet, toast, icon, timeBadge, stepperField, chipSelect, yesNoField, photoField, sectionTitle } from '../components.js';
import { CORRECTIVE_ACTIONS, KIND_LABEL } from '../../core/model.js';
import {
  st, correctEntryAction, saveEntry, state, getPhoto, photoBudget, currentUser, setCurrentUser,
} from '../store.js';

const KIND_TITLE = {
  temp: 'Temperatur eintragen', clean: 'Reinigung abhaken',
  goods: 'Wareneingang prüfen', core: 'Kontrolle dokumentieren',
};

const sollText = (task) => (task.kind === 'temp' && task.min !== null
  ? `Soll: ${fmtTemp(task.min)} bis ${fmtTemp(task.max)} °C` : null);

/** Letzter Eintrag dieser Aufgabe (für die Ein-Tipp-Übernahme). */
function lastEntryFor(taskId, excludeId = null) {
  const list = state.entries.filter((e) => e.taskId === taskId && e.id !== excludeId);
  return list.length ? list.at(-1) : null;
}

function timeLine() {
  return timeBadge({ trusted: st.isFresh(), label: st.stampLabel(), offsetMs: st.serverOffset() });
}

function whoLine() {
  const u = currentUser();
  return h('div', { class: 'card__meta', style: 'margin-top:6px' }, `Wird eingetragen von: ${u?.name || 'Unbekannt'}`);
}

/**
 * Foto aufnehmen → sofort verkleinern (Vorschau) → beim Speichern mit ablegen.
 * Die Datei bleibt im Speicher, bis der Eintrag gespeichert wird.
 */
export async function applyPhoto(widget, files, file) {
  try {
    const small = await shrinkImage(file, 1280, 0.72);
    if (!small) throw new Error('kein Bild');
    widget.showPhoto({ dataUrl: small.dataUrl }, {
      onRemove: () => { const i = files.indexOf(file); if (i >= 0) files.splice(i, 1); },
    });
    files.push(file);
    return true;
  } catch {
    toast('Foto konnte nicht gelesen werden.', { tone: 'err' });
    return false;
  }
}

/* ---------- 1) Temperatur ----------------------------------------------- */

export function openTempSheet({ task, slotId = null, onSaved }) {
  const last = lastEntryFor(task.id);
  const mid = (task.min !== null && task.max !== null)
    ? Math.round(((Number(task.min) + Number(task.max)) / 2) * 10) / 10 : null;
  const start = last?.value ?? mid ?? 4;
  const slot = state.settings.slots.find((s) => s.id === slotId);

  let value = start;
  let note = '';
  const photos = [];

  const warn = h('div', { class: 'warnbox', style: 'display:none' });
  const stepper = stepperField({ value: start, step: 0.5, unit: '°C', onChange: (v) => { value = v; paint(); } });
  const correctiveBox = chipSelect({ options: [...new Set([...CORRECTIVE_ACTIONS.temp_high, ...CORRECTIVE_ACTIONS.temp_low])], cols: 1 });
  const correctiveWrap = h('div', { style: 'display:none' },
    h('div', { style: 'font-weight:800;margin:10px 0 6px' }, 'Was hast du gemacht? (Pflicht)'),
    correctiveBox,
    h('div', { class: 'card__meta' }, 'Wird im Bericht als ergriffene Maßnahme ausgewiesen.'));

  const photoBlk = photoField({
    label: 'Foto dazu (optional)', maxPhotos: 1,
    onPhoto: async (file) => {
      if (photoBudget().left <= 0) { toast('Fotos sind im kostenlosen Tarif auf 2 begrenzt.', { tone: 'warn' }); return; }
      if (photos.length) return;
      await applyPhoto(photoBlk, photos, file);
    },
  });

  const isOk = () => task.min === null || task.max === null
    || (value !== null && value >= Number(task.min) && value <= Number(task.max));

  const saveBtn = h('button', { type: 'button', class: 'btn btn--primary btn--block btn--big' }, 'Speichern');

  function paint() {
    const ok = isOk();
    if (value === null) { warn.style.display = 'none'; correctiveWrap.style.display = 'none'; }
    else if (!ok) {
      warn.style.display = 'block';
      warn.dataset.tone = 'red';
      warn.innerHTML = `<b>Außerhalb vom Sollbereich!</b><br>${esc(fmtTemp(value))} °C gemessen – erlaubt: ${esc(String(sollText(task) || '').replace('Soll: ', ''))}`;
      correctiveWrap.style.display = 'block';
    } else { warn.style.display = 'none'; correctiveWrap.style.display = 'none'; }
    saveBtn.className = 'btn ' + (ok ? 'btn--primary' : 'btn--danger') + ' btn--block btn--big';
    saveBtn.textContent = ok ? 'Speichern' : 'Abweichung speichern (mit Maßnahme)';
  }

  const content = [
    h('div', { class: 'card card--flat', style: 'display:flex;align-items:center;gap:10px;padding:10px' },
      h('div', { style: 'flex:1' },
        h('div', { style: 'font-weight:800' }, sollText(task) || 'Kein Sollbereich festgelegt'),
        task.hint ? h('div', { class: 'card__meta' }, task.hint) : null),
      last ? h('button', {
        type: 'button', class: 'btn btn--sm btn--ghost', title: 'Wert vom letzten Mal übernehmen',
        onclick: () => { stepper.setValue(last.value); value = last.value; paint(); },
      }, `${fmtTemp(last.value)}° übernehmen`) : null),
    warn,
    stepper,
    last ? h('div', { class: 'card__meta', style: 'margin:-6px 0 10px' },
      `Zuletzt: ${fmtTemp(last.value)} °C um ${fmtTime(last.tsClient)} Uhr (${last.userName})`) : null,
    correctiveWrap,
    h('div', { style: 'font-weight:800;margin:12px 0 0' }, 'Notiz (optional)'),
    h('input', { type: 'text', placeholder: 'z. B. neue Lieferung eingeräumt', oninput: (e) => { note = e.target.value; } }),
    photoBlk,
    timeLine(),
    whoLine(),
    h('div', { style: 'height:8px' }),
    saveBtn,
  ];

  const s = sheet({
    title: KIND_TITLE[task.kind] || 'Eintrag',
    subtitle: task.title + (slot ? ` · ${slot.label}` : ''),
    content,
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      {
        label: 'Speichern', class: 'btn--primary', block: true, onClick: async () => {
          if (value === null) { toast('Bitte erst die Temperatur eintragen.', { tone: 'warn' }); return false; }
          const ok = isOk();
          const actions = ok ? null : correctiveBox.getValue();
          if (!ok && !actions.length) {
            toast('Bitte antippen, was du gemacht hast – das verlangt die Kontrolle.', { tone: 'warn', ms: 4400 });
            return false;
          }
          await saveEntry({
            task, slotId, value, ok, note,
            corrective: ok ? null : { actions, note: '' },
            photoFiles: photos,
          });
          toast(ok ? `${task.title}: ${fmtTemp(value)} °C gespeichert ✓`
            : 'Abweichung samt Maßnahme dokumentiert ✓', { tone: ok ? 'ok' : 'warn' });
          onSaved?.();
          return true;
        },
      },
    ],
    onClose: () => onSaved?.(),
  });

  saveBtn.onclick = () => { s.dialog.querySelector('.sheet__actions .btn--primary')?.click(); };
  paint();
  stepper.focusField();
  return s;
}

/* ---------- 2) Reinigung ------------------------------------------------ */

export function openCleanSheet({ task, slotId = null, onSaved }) {
  const slot = state.settings.slots.find((s) => s.id === slotId);
  let note = '';
  const reasonBox = chipSelect({
    options: ['Keine Zeit gehabt', 'Reinigungsmittel leer', 'Bereich war gesperrt', 'Wird später nachgeholt'],
    allowFree: true, freeLabel: 'Anderer Grund …',
  });
  const reasonWrap = h('div', { style: 'display:none' },
    h('div', { style: 'font-weight:800;margin:10px 0 6px' }, 'Warum nicht? (Pflicht)'),
    reasonBox);

  const doneBtn = h('button', { type: 'button', class: 'btn btn--done btn--block btn--big' },
    icon('check', { size: 26 }), ' Erledigt');
  const notDoneBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--block' }, 'Nicht geschafft');

  const content = [
    h('div', { class: 'card card--flat', style: 'padding:10px' },
      h('div', { style: 'font-weight:800' }, task.hint || 'Kurz prüfen, dann abhaken.'),
      h('div', { class: 'card__meta' }, `Rhythmus: ${task.everyDays > 1 ? `alle ${task.everyDays} Tage` : 'täglich'}`)),
    h('div', { style: 'font-weight:800;margin:12px 0 0' }, 'Notiz (optional)'),
    h('input', { type: 'text', placeholder: 'z. B. Seife nachgefüllt', oninput: (e) => { note = e.target.value; } }),
    reasonWrap,
    timeLine(),
    whoLine(),
    h('div', { style: 'height:8px' }),
    doneBtn,
    h('div', { style: 'height:10px' }),
    notDoneBtn,
  ];

  const s = sheet({
    title: 'Reinigung abhaken',
    subtitle: task.title + (slot ? ` · ${slot.label}` : ''),
    content,
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      {
        label: 'Als „nicht geschafft“ dokumentieren', class: 'btn--ghost', block: true, onClick: async () => {
          const reasons = reasonBox.getValue();
          if (!reasons.length) { toast('Bitte den Grund auswählen.', { tone: 'warn' }); return false; }
          await saveEntry({
            task, slotId, value: null, ok: false,
            note: [reasons.join(', '), note].filter(Boolean).join(' · '),
            corrective: { actions: reasons, note: '' },
          });
          toast('Dokumentiert – bitte später nachholen.', { tone: 'warn' });
          onSaved?.();
          return true;
        },
      },
    ],
    onClose: () => onSaved?.(),
  });

  doneBtn.onclick = async () => {
    await saveEntry({ task, slotId, value: null, ok: true, note });
    toast(`${task.title} ✓ erledigt`, { tone: 'ok' });
    s.close(); onSaved?.();
  };
  notDoneBtn.onclick = () => {
    reasonWrap.style.display = 'block';
    notDoneBtn.classList.add('btn--danger');
    toast('Bitte Grund auswählen und unten bestätigen.', { ms: 3200 });
  };
  return s;
}

/* ---------- 3) Wareneingang -------------------------------------------- */

export function openGoodsSheet({ task, slotId = null, onSaved }) {
  const suppliers = [...new Set(state.entries
    .filter((e) => e.kind === 'goods' && e.goods?.supplier).map((e) => e.goods.supplier))].slice(-12).reverse();
  const slot = state.settings.slots.find((s) => s.id === slotId);

  let supplier = '';
  let temp = null;
  let note = '';
  let rejected = false;
  const checks = { mhdOk: null, packagingOk: null, smellOk: null };
  const photos = [];

  const photoBlk = photoField({
    label: 'Foto vom Lieferschein oder der Ware',
    onPhoto: async (file) => {
      if (photoBudget().left <= 0) { toast('Fotos sind im kostenlosen Tarif auf 2 begrenzt.', { tone: 'warn' }); return; }
      if (photos.length) return;
      await applyPhoto(photoBlk, photos, file);
    },
  });

  const correctiveBox = chipSelect({ options: CORRECTIVE_ACTIONS.goods });
  const correctiveWrap = h('div', { style: 'display:none' },
    h('div', { style: 'font-weight:800;margin:10px 0 6px' }, 'Was ist mit der Ware passiert? (Pflicht)'), correctiveBox);
  const rejectWrap = h('div', { style: 'display:none' },
    h('div', { class: 'warnbox', dataset: { tone: 'red' }, style: 'margin-top:10px' },
      'Bitte unten notieren, warum die Ware zurückgeht – Lieferant und Grund gehören in den Nachweis.'));

  const problem = () => rejected || checks.mhdOk === false || checks.packagingOk === false
    || checks.smellOk === false || (temp !== null && (temp < 0 || temp > 7));

  const stepper = stepperField({ value: null, step: 0.5, unit: '°C', onChange: (v) => { temp = v; correctiveWrap.style.display = problem() ? 'block' : 'none'; } });

  const rejectBtn = h('button', {
    type: 'button', class: 'btn btn--ghost btn--block', style: 'margin-top:12px',
    onclick: () => {
      rejected = !rejected;
      rejectBtn.className = 'btn ' + (rejected ? 'btn--danger' : 'btn--ghost') + ' btn--block';
      rejectBtn.textContent = rejected ? 'Zurückgewiesen – wieder aufheben' : 'Lieferung zurückweisen';
      rejectWrap.style.display = rejected ? 'block' : 'none';
      correctiveWrap.style.display = problem() ? 'block' : 'none';
    },
  }, 'Lieferung zurückweisen');

  const content = [
    h('label', { class: 'field' }, 'Lieferant',
      h('input', { type: 'text', list: 'lieferanten-liste', placeholder: 'z. B. Getränke Meier', oninput: (e) => { supplier = e.target.value; } }),
      h('datalist', { id: 'lieferanten-liste' }, ...suppliers.map((s) => h('option', { value: s })))),
    h('div', { style: 'font-weight:800;margin-top:6px' }, 'Temperatur der gekühlten Ware'),
    stepper,
    yesNoField({ label: 'Haltbarkeitsdatum in Ordnung?', onChange: (v) => { checks.mhdOk = v; correctiveWrap.style.display = problem() ? 'block' : 'none'; } }),
    yesNoField({ label: 'Verpackung in Ordnung?', hint: 'Keine Löcher, nicht aufgebläht, sauber.', onChange: (v) => { checks.packagingOk = v; correctiveWrap.style.display = problem() ? 'block' : 'none'; } }),
    yesNoField({ label: 'Aussehen & Geruch in Ordnung?', onChange: (v) => { checks.smellOk = v; correctiveWrap.style.display = problem() ? 'block' : 'none'; } }),
    photoBlk,
    h('div', { style: 'font-weight:800;margin:12px 0 0' }, 'Notiz (optional)'),
    h('input', { type: 'text', placeholder: 'z. B. 2 Kisten Bier, 1 Kiste Cola', oninput: (e) => { note = e.target.value; } }),
    rejectBtn,
    rejectWrap,
    correctiveWrap,
    timeLine(),
    whoLine(),
  ];

  return sheet({
    title: 'Wareneingang prüfen',
    subtitle: task.title + (slot ? ` · ${slot.label}` : ''),
    content,
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      {
        label: 'Wareneingang speichern', class: 'btn--primary', block: true, onClick: async () => {
          if (!supplier.trim()) { toast('Bitte den Lieferanten eintragen.', { tone: 'warn' }); return false; }
          if (problem()) {
            const acts = correctiveBox.getValue();
            if (!acts.length) { toast('Bitte antippen, was mit der Ware passiert ist.', { tone: 'warn' }); return false; }
            await saveEntry({
              task, slotId, value: temp, ok: false, note,
              goods: { supplier: supplier.trim(), temp, ...checks, rejected, rejectReason: rejected ? note : '' },
              corrective: { actions: acts, note: '' }, photoFiles: photos,
            });
            toast('Problem dokumentiert ✓', { tone: 'warn' });
          } else {
            await saveEntry({
              task, slotId, value: temp, ok: true, note,
              goods: { supplier: supplier.trim(), temp, ...checks, rejected: false, rejectReason: '' },
              photoFiles: photos,
            });
            toast(`Wareneingang von ${supplier.trim()} gespeichert ✓`, { tone: 'ok' });
          }
          onSaved?.();
          return true;
        },
      },
    ],
    onClose: () => onSaved?.(),
  });
}

/* ---------- 4) freie Kontrolle ----------------------------------------- */

export function openCoreSheet({ task, slotId = null, onSaved }) {
  let note = '';
  return sheet({
    title: KIND_TITLE[task.kind] || 'Kontrolle',
    subtitle: task.title,
    content: [
      h('div', { class: 'card card--flat', style: 'padding:10px' }, task.hint || 'Kurz prüfen, dann abhaken.'),
      h('div', { style: 'font-weight:800;margin:12px 0 0' }, 'Notiz'),
      h('input', { type: 'text', placeholder: 'Ergebnis kurz notieren', oninput: (e) => { note = e.target.value; } }),
      timeLine(), whoLine(),
    ],
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      {
        label: 'Erledigt speichern', class: 'btn--done', block: true, onClick: async () => {
          await saveEntry({ task, slotId, value: null, ok: true, note });
          toast('Gespeichert ✓', { tone: 'ok' });
          onSaved?.();
        },
      },
    ],
  });
}

/* ---------- 5) Eintrag ansehen / korrigieren --------------------------- */

export async function openEntryDetail(entry) {
  const photos = [];
  for (const id of entry.photoIds || []) {
    const p = await getPhoto(id);
    if (p) photos.push(p);
  }
  const rows = [
    ['Kontrolle', entry.taskTitle],
    ['Art', KIND_LABEL[entry.kind] || entry.kind],
    ['Datum & Uhrzeit (Gerät)', fmtDateTime(entry.tsClient)],
    ['Datum & Uhrzeit (Server)', entry.tsServer ? fmtDateTime(entry.tsServer) : 'wird noch abgeglichen'],
    ['Person', entry.userName],
    ['Ergebnis', entry.ok === false ? 'Abweichung' : entry.ok === true ? 'in Ordnung' : 'erledigt'],
    entry.value !== null && entry.value !== undefined ? ['Messwert', `${fmtTemp(entry.value)} ${entry.unit || '°C'}`] : null,
    entry.goods ? ['Lieferant', entry.goods.supplier || '–'] : null,
    entry.note ? ['Notiz', entry.note] : null,
    entry.corrective?.actions?.length ? ['Maßnahme', entry.corrective.actions.join(', ')] : null,
    entry.action === 'correct' ? ['Korrektur', `ersetzt den Eintrag vom ${fmtDateTime(state.entries.find((e) => e.id === entry.correctionOf)?.tsClient || 0)}`] : null,
    entry.replacedBy ? ['Hinweis', 'Korrigiert – der ursprüngliche Wert bleibt erhalten.'] : null,
    ['Prüfsumme (lokal)', String(entry.hash || '–').slice(0, 34) + '…'],
    entry.serverHash ? ['Prüfsumme (Server)', entry.serverHash.slice(0, 34) + '…'] : null,
  ].filter(Boolean);

  const body = h('div', {});
  for (const [k, v] of rows) body.append(h('div', { class: 'kv' }, h('span', {}, k), h('span', {}, String(v))));
  if (photos.length) {
    body.append(h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px' },
      ...photos.map((p) => h('img', { src: p.dataUrl, alt: 'Belegfoto', style: 'width:120px;height:120px;object-fit:cover;border-radius:12px;border:2px solid var(--line)' }))));
  }
  body.append(h('div', { class: 'infobox', style: 'margin-top:12px' },
    'Ein Eintrag kann nicht gelöscht werden. Mit „Korrigieren“ entsteht ein neuer Eintrag, der auf diesen verweist – so bleibt der Nachweis ehrlich.'));

  return sheet({
    title: 'Eintrag ansehen',
    subtitle: `${entry.userName} · ${fmtDateTime(entry.tsClient)}`,
    content: body,
    actions: [
      { label: 'Schließen', class: 'btn--ghost' },
      { label: 'Korrigieren', class: 'btn--primary', onClick: () => { setTimeout(() => openCorrectSheet(entry), 150); } },
    ],
  });
}

export function openCorrectSheet(entry) {
  const task = { ...entry.taskSnapshot, id: entry.taskId, title: entry.taskTitle, kind: entry.kind };
  let note = entry.note || '';
  const stepper = stepperField({ value: entry.value ?? null, step: 0.5, unit: entry.unit || '°C' });
  const box = chipSelect({
    options: ['Zahlendreher beim Eintragen', 'Falsches Gerät erwischt', 'Nachtrag (war vergessen)', 'Gerät war defekt'],
    allowFree: true, freeLabel: 'Anderer Grund …',
  });

  return sheet({
    title: 'Eintrag korrigieren',
    subtitle: task.title,
    content: [
      h('div', { class: 'warnbox' },
        'Der alte Eintrag bleibt sichtbar. Es wird ein neuer Eintrag mit dem Hinweis „Korrektur“ angelegt – genau so verlangt es ein sauberer Nachweis.'),
      h('div', { class: 'card card--flat', style: 'padding:10px' },
        h('div', { style: 'font-weight:800' }, 'Bisher eingetragen'),
        h('div', {}, `${fmtDateTime(entry.tsClient)} · ${entry.value !== null ? fmtTemp(entry.value) + ' ' + (entry.unit || '°C') : 'erledigt'} · ${entry.userName}`)),
      h('div', { style: 'font-weight:800;margin:12px 0 0' }, 'Neuer Wert'),
      stepper,
      h('div', { style: 'font-weight:800;margin:12px 0 6px' }, 'Grund (Pflicht)'),
      box,
      h('div', { style: 'font-weight:800;margin:12px 0 0' }, 'Notiz'),
      h('input', { type: 'text', value: note, oninput: (e) => { note = e.target.value; } }),
      timeLine(),
    ],
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      {
        label: 'Korrektur speichern', class: 'btn--danger', block: true, onClick: async () => {
          const reasons = box.getValue();
          if (!reasons.length) { toast('Bitte den Grund auswählen.', { tone: 'warn' }); return false; }
          await correctEntryAction(entry, { reason: reasons.join(', '), value: stepper.getValue(), note });
          toast('Korrektur gespeichert – alter Eintrag bleibt sichtbar ✓', { tone: 'ok', ms: 4400 });
        },
      },
    ],
  });
}

/* ---------- 6) Person wechseln ----------------------------------------- */

export function openSwitchUser() {
  const body = h('div', {});
  for (const u of state.users) {
    body.append(h('button', {
      type: 'button', class: 'row row--split',
      onclick: async () => { await setCurrentUser(u.id); toast(`Eingetragen wird jetzt als: ${u.name}`, { tone: 'ok' }); },
    },
      h('span', { class: 'row__main' }, u.name,
        h('span', { class: 'row__sub' }, u.role === 'owner' ? 'Chef/in' : 'Mitarbeiter/in')),
      u.id === state.currentUserId ? h('span', { class: 'pill', dataset: { tone: 'green' } }, 'aktiv') : null));
  }
  body.append(h('button', {
    type: 'button', class: 'btn btn--primary btn--block', style: 'margin-top:14px',
    onclick: async () => { const m = await import('./verwalten.js'); m.openAddUserSheet(); },
  }, 'Neue Person anlegen'));
  return sheet({ title: 'Wer bist du?', subtitle: 'Der Name steht später im Nachweis für die Kontrolle.', content: body });
}

/* ---------- Auswahl ------------------------------------------------------ */

export function openEntrySheet(opts) {
  const k = opts.task.kind;
  if (k === 'temp') return openTempSheet(opts);
  if (k === 'clean') return openCleanSheet(opts);
  if (k === 'goods') return openGoodsSheet(opts);
  return openCoreSheet(opts);
}

export { sectionTitle };
