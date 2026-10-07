/* ==========================================================================
   liste.js – die Bereichsseiten: Temperatur, Putzen, Wareneingang
   Gleiche Kacheln wie auf der Startseite, plus Verlauf der letzten Tage.
   ========================================================================== */

import { h, fmtTemp, fmtTime, fmtDate, relativeDay, dayKey, MS_DAY, slug, num } from '../../core/util.js';
import { card, pill, emptyState, toast, sheet, confirmDialog, sectionTitle, icon } from '../components.js';
import { state, logic, st, addTask, updateTask } from '../store.js';
import { openEntrySheet, openEntryDetail } from './entry.js';
import { taskTile } from './heute.js';
import { TEMP_PRESETS, CLEAN_PRESETS } from '../../core/model.js';

const TITLES = {
  temperatur: { h1: 'Temperaturen', sub: 'Kühlschrank, Tiefkühler & Co. – jeden Tag messen und eintragen.', kind: 'temp', add: 'Gerät hinzufügen' },
  putzen: { h1: 'Putzen', sub: 'Reinigung abhaken. Die Kacheln bleiben rot, bis es erledigt ist.', kind: 'clean', add: 'Bereich hinzufügen' },
  wareneingang: { h1: 'Wareneingang', sub: 'Lieferung prüfen: Temperatur, Verpackung, Haltbarkeit.', kind: 'goods', add: 'Wareneingang aktivieren' },
};

export function renderListe(root, { route, navigate }) {
  const cfg = TITLES[route] || { h1: 'Kontrollen', sub: '', kind: 'core', add: 'Kontrolle hinzufügen' };
  const now = st.now();
  const key = dayKey(now);

  const tasks = state.tasks.filter((t) => t.kind === cfg.kind);
  const ov = logic.dayOverview({ tasks, entries: state.entries, settings: state.settings, key, now });

  root.append(h('div', { style: 'margin-bottom:12px' },
    h('h1', { style: 'margin-bottom:2px' }, cfg.h1),
    h('div', { class: 'card__meta' }, cfg.sub)));

  if (!tasks.length) {
    root.append(emptyState(
      cfg.kind === 'goods'
        ? 'Wareneingang ist noch aus. Einmal aktivieren, dann kannst du jede Lieferung in 20 Sekunden prüfen.'
        : 'Hier ist noch nichts eingerichtet.',
      cfg.add,
      () => (cfg.kind === 'goods' ? activateGoods() : openTaskSheet({ kind: cfg.kind })),
    ));
  } else {
    const open = ov.items.filter((i) => i.state !== 'fertig' && i.state !== 'abweichung');
    const done = ov.items.filter((i) => i.state === 'fertig' || i.state === 'abweichung');
    root.append(h('div', { class: 'card card--flat', style: 'padding:12px' },
      h('div', { style: 'font-weight:800' }, `${done.length} von ${ov.items.length} heute erledigt`),
      h('div', { class: 'card__meta' }, open.length ? `Noch offen: ${open.map((i) => i.task.title).slice(0, 3).join(', ')}${open.length > 3 ? ' …' : ''}` : 'Alles erledigt 👌')));

    const list = h('div', {});
    for (const item of ov.items) list.append(taskTile(item, route));
    root.append(list);

    root.append(h('button', {
      type: 'button', class: 'btn btn--ghost btn--block', style: 'margin:12px 0 6px',
      onclick: () => openTaskSheet({ kind: cfg.kind }),
    }, icon('plus', { size: 22 }), ' ' + cfg.add));
  }

  /* --- Verlauf der letzten Tage --- */
  root.append(sectionTitle('Verlauf (letzte 14 Tage)'));
  const history = h('div', {});
  let any = false;
  for (let i = 1; i <= 14; i++) {
    const k = dayKey(now - i * MS_DAY);
    const list = state.entries.filter((e) => e.dayKey === k && tasks.some((t) => t.id === e.taskId));
    if (!list.length) continue;
    any = true;
    const row = h('div', { class: 'card card--flat', style: 'padding:10px;margin-bottom:8px' });
    row.append(h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' },
      h('b', {}, relativeDay(new Date(k).getTime(), now).replace(/^./, (c) => c.toUpperCase())),
      h('span', { class: 'card__meta' }, `${list.length} Einträge`)));
    for (const e of list.slice(0, 6)) {
      row.append(h('button', {
        type: 'button', class: 'row row--split', style: 'margin-top:6px;padding:8px 10px',
        onclick: () => openEntryDetail(e),
      },
        h('span', { class: 'row__main truncate' }, `${fmtTime(e.tsClient)} · ${e.taskTitle}`),
        h('span', { class: 'pill', dataset: { tone: e.ok === false ? 'amber' : 'green' } },
          e.kind === 'temp' && e.value !== null ? `${fmtTemp(e.value)} °C` : (e.ok === false ? 'Abweichung' : 'ok'))));
    }
    if (list.length > 6) row.append(h('div', { class: 'card__meta', style: 'margin-top:6px' }, `… und ${list.length - 6} weitere (im Bericht vollständig)`));
    history.append(row);
  }
  if (!any) history.append(h('div', { class: 'empty' }, 'Noch keine Einträge – die ersten erscheinen hier sofort.'));

  /* --- Lücken der letzten 14 Tage --- */
  const gaps = [];
  for (let i = 1; i <= 14; i++) {
    const k = dayKey(now - i * MS_DAY);
    const due = logic.dueTasks(tasks, k);
    if (!due.length) continue;
    const missing = due.filter((t) => !state.entries.some((e) => e.taskId === t.id && e.dayKey === k));
    if (missing.length) gaps.push({ key: k, missing });
  }
  if (gaps.length) {
    root.append(sectionTitle('Fehlende Einträge'));
    const box = h('div', { class: 'card', dataset: { state: 'offen' } });
    for (const g of gaps) {
      box.append(h('div', { class: 'row row--split', style: 'margin-bottom:6px' },
        h('span', { class: 'row__main truncate' }, `${fmtDate(new Date(g.key).getTime())} · ${g.missing.map((m) => m.title).join(', ')}`),
        h('span', { class: 'pill', dataset: { tone: 'red' } }, `${g.missing.length} fehlt`)));
    }
    root.append(box);
  }
  root.append(history);
}

/* ---------- Wareneingang aktivieren ------------------------------------- */

async function activateGoods() {
  const existing = state.tasks.find((t) => t.kind === 'goods');
  if (existing) { toast('Wareneingang ist schon aktiv.', { ms: 2000 }); return existing; }
  const t = await addTask({
    kind: 'goods', title: 'Wareneingang kontrollieren', everyDays: 1, slots: ['frueh'],
    requireValue: false, requirePhoto: true,
    hint: 'Nur ausfüllen, wenn heute etwas angeliefert wurde.',
  });
  toast('Wareneingang ist jetzt an ✓', { tone: 'ok' });
  return t;
}

/* ---------- Neue Kontrolle anlegen / bearbeiten ------------------------- */

export function openTaskSheet({ task = null, kind = 'temp' } = {}) {
  const isNew = !task;
  const t = task || { kind, title: '', min: null, max: null, unit: '°C', slots: [], everyDays: 1, weekdays: null, hint: '', requireValue: kind === 'temp', requirePhoto: false };

  let data = {
    kind: t.kind, title: t.title, min: t.min, max: t.max, unit: t.unit || '°C',
    slots: [...(t.slots || [])], everyDays: t.everyDays || 1, weekdays: t.weekdays || null,
    hint: t.hint || '', requireValue: t.requireValue, requirePhoto: t.requirePhoto,
  };

  const presets = data.kind === 'temp' ? TEMP_PRESETS : CLEAN_PRESETS;
  const presetRow = h('div', { class: 'btnrow' });
  presets.forEach((p) => {
    presetRow.append(h('button', {
      type: 'button', class: 'btn btn--sm btn--ghost',
      onclick: (e) => {
        if (String(p.name).startsWith('Eigenes')) { titleInput.focus(); return; }
        data.title = p.name;
        if (p.min !== undefined) { data.min = p.min; data.max = p.max; }
        if (p.every !== undefined && data.kind !== 'temp') data.everyDays = p.every;
        data.hint = p.hint || data.hint;
        titleInput.value = data.title;
        minInput.value = data.min ?? '';
        maxInput.value = data.max ?? '';
        hintInput.value = data.hint || '';
        everySelect.value = String(data.everyDays);
        presetRow.querySelectorAll('.btn').forEach((b) => b.classList.remove('btn--done'));
        e.currentTarget.classList.add('btn--done');
      },
    }, p.name));
  });

  const titleInput = h('input', { type: 'text', value: data.title, placeholder: data.kind === 'temp' ? 'z. B. Kühlschrank Theke' : 'z. B. Toilette reinigen', oninput: (e) => { data.title = e.target.value; } });
  const minInput = h('input', { type: 'text', inputmode: 'decimal', value: data.min ?? '', oninput: (e) => { data.min = e.target.value === '' ? null : num(e.target.value); } });
  const maxInput = h('input', { type: 'text', inputmode: 'decimal', value: data.max ?? '', oninput: (e) => { data.max = e.target.value === '' ? null : num(e.target.value); } });
  const hintInput = h('input', { type: 'text', value: data.hint, placeholder: 'z. B. morgens nach dem Öffnen', oninput: (e) => { data.hint = e.target.value; } });
  const everySelect = h('select', {
    onchange: (e) => {
      const v = e.target.value;
      data.everyDays = v === 'woche' ? 7 : v === 'monat' ? 30 : 1;
      data.weekdays = v === 'woche' ? [1] : null;
    },
  },
    h('option', { value: 'tag', selected: t.everyDays === 1 ? '' : null }, 'jeden Tag'),
    h('option', { value: 'woche', selected: t.everyDays === 7 ? '' : null }, 'einmal pro Woche'),
    h('option', { value: 'monat', selected: t.everyDays === 30 ? '' : null }, 'einmal pro Monat'));

  const slotRow = h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' });
  for (const s of state.settings.slots) {
    const on = data.slots.includes(s.id);
    const b = h('button', { type: 'button', class: `btn btn--sm ${on ? 'btn--done' : 'btn--ghost'}` }, s.label);
    b.onclick = () => {
      if (data.slots.includes(s.id)) data.slots = data.slots.filter((x) => x !== s.id);
      else data.slots.push(s.id);
      b.className = `btn btn--sm ${data.slots.includes(s.id) ? 'btn--done' : 'btn--ghost'}`;
    };
    slotRow.append(b);
  }

  const content = [
    data.kind === 'temp' || data.kind === 'clean'
      ? h('div', {}, h('div', { style: 'font-weight:800;margin-bottom:6px' }, 'Schnellauswahl'), presetRow)
      : null,
    h('label', { class: 'field' }, 'Name', titleInput, h('span', { class: 'field__hint' }, 'So wie es im Betrieb heißt – das steht später im Bericht.')),
    data.kind === 'temp' ? h('div', { class: 'grid2' },
      h('label', { class: 'field' }, 'Nicht kälter als (°C)', minInput),
      h('label', { class: 'field' }, 'Nicht wärmer als (°C)', maxInput)) : null,
    h('label', { class: 'field' }, 'Wie oft?', everySelect),
    h('div', { style: 'font-weight:800;margin:6px 0' }, 'Zu welcher Schicht?'),
    slotRow,
    h('div', { class: 'card__meta', style: 'margin-bottom:10px' }, 'Eine Schicht leer lassen = ganztags, ohne Erinnerung an eine Uhrzeit.'),
    h('label', { class: 'field' }, 'Hinweis (optional)', hintInput),
  ];

  if (!isNew) {
    content.push(h('button', {
      type: 'button', class: 'btn btn--ghost btn--block', style: 'margin-top:6px;border-color:var(--red-line);color:var(--red)',
      onclick: async () => {
        const { removeTask } = await import('../store.js');
        const ok = await confirmDialog({
          title: `„${t.title}“ löschen?`,
          text: 'Bereits erfasste Einträge bleiben erhalten und im Bericht sichtbar.',
          confirmLabel: 'Löschen', tone: 'danger',
        });
        if (ok) { await removeTask(t.id); toast('Gelöscht. Alte Einträge bleiben im Archiv.'); }
      },
    }, 'Kontrolle entfernen'));
  }

  return sheet({
    title: isNew ? (data.kind === 'clean' ? 'Neuen Bereich anlegen' : data.kind === 'goods' ? 'Wareneingang einrichten' : 'Neues Gerät anlegen') : 'Kontrolle bearbeiten',
    subtitle: isNew ? 'Zwei Felder reichen meist.' : t.title,
    content,
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      {
        label: isNew ? 'Anlegen' : 'Speichern', class: 'btn--primary', block: true, onClick: async () => {
          if (!String(data.title).trim()) { toast('Bitte einen Namen eintragen.', { tone: 'warn' }); return false; }
          if (isNew) {
            await addTask({
              kind: data.kind, title: data.title.trim(), min: data.min, max: data.max, unit: '°C',
              slots: data.slots, everyDays: data.everyDays, weekdays: data.weekdays,
              hint: data.hint, requireValue: data.kind === 'temp', requirePhoto: data.kind === 'goods',
            });
            toast(`„${data.title.trim()}“ angelegt ✓`, { tone: 'ok' });
          } else {
            await updateTask(t.id, {
              title: data.title.trim(), min: data.min, max: data.max,
              slots: data.slots, everyDays: data.everyDays, weekdays: data.weekdays, hint: data.hint,
            });
            toast('Gespeichert ✓', { tone: 'ok' });
          }
        },
      },
    ],
  });
}
