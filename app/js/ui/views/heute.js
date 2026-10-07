/* ==========================================================================
   heute.js – Startseite: „Was muss ich heute noch machen?“
   Eine Liste, dicke Kacheln, Ampelfarben. Fertig.
   ========================================================================== */

import { h, fmtTemp, fmtTime, fmtDateLong, dayKey, MS_DAY, esc } from '../../core/util.js';
import { card, pill, emptyState, icon, toast, sheet, confirmDialog, progressBar } from '../components.js';
import { state, logic, st, setCurrentUser } from '../store.js';
import { openEntrySheet, openSwitchUser, openEntryDetail } from './entry.js';

const KIND_META = {
  temp: { label: 'Temperatur', iconName: 'temperatur', tone: 'blue' },
  clean: { label: 'Reinigung', iconName: 'putzen', tone: 'grey' },
  goods: { label: 'Wareneingang', iconName: 'wareneingang', tone: 'blue' },
  core: { label: 'Kontrolle', iconName: 'check', tone: 'grey' },
};

const STATE_LABEL = {
  offen: { text: 'offen', tone: 'red' },
  spaet: { text: 'wird knapp', tone: 'amber' },
  verpasst: { text: 'überfällig', tone: 'red' },
  fertig: { text: 'erledigt', tone: 'green' },
  abweichung: { text: 'Abweichung dokumentiert', tone: 'amber' },
};

export function renderHeute(root, { navigate }) {
  const now = st.now();
  const key = dayKey(now);
  const ov = logic.dayOverview({
    tasks: state.tasks, entries: state.entries, settings: state.settings, key, now,
  });

  /* --- Kopf --- */
  const head = h('div', { style: 'margin-bottom:12px' },
    h('h1', { style: 'margin-bottom:2px' }, greeting() + greetingName()),
    h('div', { class: 'card__meta', style: 'font-size:.95em' }, fmtDateLong(now)));
  root.append(head);

  if (!state.tasks.length) {
    root.append(emptyState(
      'Noch keine Kontrollen eingerichtet. In zwei Minuten erledigt – dann geht es los.',
      'Jetzt einrichten',
      () => navigate('einrichten'),
    ));
    return;
  }

  /* --- Fortschritt --- */
  root.append(progressBar(ov.percent, `${ov.done} von ${ov.counts.total} erledigt`));

  if (ov.counts.total === 0) {
    root.append(card({ title: 'Heute ist nichts geplant', body: h('div', { class: 'card__meta' }, 'Genieß den ruhigen Tag. Morgen geht es weiter.') , state: 'erledigt' }));
    return;
  }

  if (ov.percent === 100) {
    root.append(h('div', { class: 'warnbox', style: 'border-color:var(--green-line);background:var(--green-bg);color:var(--green)' },
      h('b', {}, 'Alles erledigt für heute. 💪'), h('br', {}),
      `${ov.counts.total} Kontrollen sind eingetragen und mit Zeitstempel gespeichert.`));
  }

  /* --- Offene zuerst, dann erledigte --- */
  const open = ov.items.filter((i) => i.state !== 'fertig' && i.state !== 'abweichung');
  const late = ov.items.filter((i) => i.state === 'abweichung');
  const done = ov.items.filter((i) => i.state === 'fertig');

  if (open.length) {
    root.append(h('div', { class: 'section-title' },
      h('h2', {}, `Noch offen (${open.length})`), h('div', { class: 'section-title__line' })));
    for (const item of open) root.append(taskTile(item, 'heute'));
  }

  if (late.length) {
    root.append(h('div', { class: 'section-title' }, h('h2', {}, `Dokumentierte Abweichungen (${late.length})`), h('div', { class: 'section-title__line' })));
    for (const item of late) root.append(taskTile(item, 'heute'));
  }

  if (done.length) {
    root.append(h('div', { class: 'section-title' }, h('h2', {}, `Erledigt (${done.length})`), h('div', { class: 'section-title__line' })));
    for (const item of done) root.append(taskTile(item, 'heute'));
  }

  /* --- Gestern vergessen? --- */
  const yKey = dayKey(now - MS_DAY);
  const yOv = logic.dayOverview({ tasks: state.tasks, entries: state.entries, settings: state.settings, key: yKey, now });
  const misses = yOv.items.filter((i) => i.state === 'verpasst');
  if (misses.length) {
    const body = h('div', {});
    body.append(h('div', { style: 'font-weight:700;margin-bottom:8px' },
      `Gestern wurden ${misses.length} Kontrollen nicht eingetragen. Der Prüfer sieht das – deshalb steht es auch im Bericht.`));
    const list = h('div', {});
    for (const m of misses.slice(0, 6)) {
      list.append(h('div', { class: 'row row--split', style: 'margin-bottom:6px' },
        h('span', { class: 'row__main truncate' }, m.task.title),
        h('span', { class: 'pill', dataset: { tone: 'red' } }, 'fehlt')));
    }
    body.append(list);
    const c = card({ title: 'Achtung: Lücke von gestern', state: 'offen', body });
    c.append(h('button', {
      type: 'button', class: 'btn btn--primary btn--block', style: 'margin-top:10px',
      onclick: () => nachtragenSheet(yKey, misses),
    }, 'Gestern nachtragen'));
    c.append(h('button', {
      type: 'button', class: 'btn btn--ghost btn--block', style: 'margin-top:8px',
      onclick: () => navigate('bericht'),
    }, 'Im Bericht ansehen'));
    root.append(c);
  }

  /* --- Fußzeile: Zeitquelle & Statistik --- */
  root.append(h('div', { class: 'infobox', style: 'margin-top:6px' },
    h('div', {}, h('b', {}, 'Zeitquelle: '), st.isFresh() ? 'Serverzeit (geprüft)' : 'Gerätezeit (offline, wird nachgeprüft)'),
    h('div', { style: 'margin-top:4px' }, h('b', {}, 'Speichern: '), storageText()),
    h('div', { style: 'margin-top:4px' }, h('b', {}, 'Lückenlose Tage in Folge: '), `${state.streak || 0}`)));
}

function greeting() {
  const hr = new Date(st.now()).getHours();
  if (hr < 5) return 'Gute Nacht';
  if (hr < 11) return 'Guten Morgen';
  if (hr < 15) return 'Mahlzeit';
  if (hr < 19) return 'Guten Tag';
  return 'Guten Abend';
}
function greetingName() {
  const u = state.users.find((x) => x.id === state.currentUserId);
  return u ? `, ${u.name.split(' ')[0]}` : '';
}

function storageText() {
  const mode = state.storage;
  const q = state.syncInfo?.queue || 0;
  if (mode === 'idb') return q ? `lokal gesichert · ${q} noch nicht zum Server` : 'lokal gesichert (IndexedDB)';
  if (mode === 'ls') return 'lokal gespeichert (einfacher Modus – wenig Platz!)';
  return 'nur im Arbeitsspeicher – bitte prüfen!';
}

/* ---------- Kachel ------------------------------------------------------- */

export function taskTile(item, ctxRoute) {
  const { task, slot, state: s, last } = item;
  const meta = KIND_META[task.kind] || KIND_META.core;
  const stInfo = STATE_LABEL[s] || STATE_LABEL.offen;
  const tone = s === 'fertig' ? 'erledigt' : s === 'offen' || s === 'verpasst' ? 'offen' : 'bald';

  const right = h('div', { style: 'display:flex;flex-direction:column;gap:6px;align-items:flex-end' },
    h('span', { class: 'pill', dataset: { tone: stInfo.tone } }, stInfo.text));

  const body = h('div', {});
  const info = [];
  if (task.kind === 'temp' && task.min !== null) info.push(`Soll ${fmtTemp(task.min)}–${fmtTemp(task.max)} °C`);
  if (slot?.label) info.push(slot.label + (slot.to ? ` bis ${slot.to}` : ''));
  if (last) info.push(`zuletzt ${fmtTime(last.tsClient)} Uhr · ${last.userName}`);
  if (info.length) body.append(h('div', { class: 'card__meta' }, info.join(' · ')));
  if (last && last.ok === false) body.append(h('div', { class: 'card__meta', style: 'color:var(--amber)' }, 'Abweichung dokumentiert – tippen zum Ansehen.'));

  const el = card({
    title: h('span', { style: 'display:inline-flex;align-items:center;gap:8px' }, icon(meta.iconName, { size: 22 }), task.title),
    meta: null, right, state: tone, className: '',
  });
  el.style.cursor = 'pointer';
  el.append(body);

  const actions = h('div', { class: 'btnrow', style: 'margin-top:10px' });
  if (s === 'fertig') {
    actions.append(h('button', {
      type: 'button', class: 'btn btn--sm btn--ghost',
      onclick: (e) => { e.stopPropagation(); if (last) openEntryDetail(last); },
    }, 'Eintrag ansehen'));
    actions.append(h('button', {
      type: 'button', class: 'btn btn--sm btn--ghost',
      onclick: (e) => { e.stopPropagation(); openEntrySheet({ task, slotId: slot?.id || null }); },
    }, 'Nochmal eintragen'));
  } else {
    actions.append(h('button', {
      type: 'button', class: 'btn btn--sm ' + (s === 'offen' || s === 'verpasst' ? 'btn--primary' : 'btn--primary'),
      onclick: (e) => { e.stopPropagation(); openEntrySheet({ task, slotId: slot?.id || null }); },
    }, task.kind === 'clean' ? 'Erledigt abhaken' : task.kind === 'goods' ? 'Wareneingang prüfen' : 'Jetzt eintragen'));

    // Ein-Tipp-Übernahme des letzten Werts (nur Temperatur)
    if (task.kind === 'temp') {
      const prev = [...state.entries].reverse().find((e) => e.taskId === task.id && e.value !== null);
      if (prev) {
        actions.append(h('button', {
          type: 'button', class: 'btn btn--sm btn--ghost',
          onclick: async (e) => {
            e.stopPropagation();
            const { saveEntry } = await import('../store.js');
            const ok = logic.evaluate(prev.value, task.min, task.max);
            if (ok === false && !prev.value) return;
            await saveEntry({ task, slotId: slot?.id || null, value: prev.value, ok, note: 'Wert übernommen (keine Änderung)' });
            toast(`${prev.value} °C übernommen ✓`, { tone: 'ok' });
          },
        }, `${fmtTemp(prev.value)}° wie vorher`));
      }
    }
  }
  el.append(actions);

  el.addEventListener('click', () => {
    if (s === 'fertig') openEntryDetail(last);
    else openEntrySheet({ task, slotId: slot?.id || null });
  });
  return el;
}

/* ---------- Nachtragen für gestern -------------------------------------- */

export function nachtragenSheet(key, misses) {
  const body = h('div', {});
  body.append(h('div', { class: 'warnbox' },
    `Diese Kontrollen fehlen für den ${fmtDateLong(new Date(key).getTime())}. Ein Nachtrag wird als Nachtrag gekennzeichnet – nicht als regulärer Eintrag. `,
    h('br'), h('b', {}, 'Bitte nur eintragen, wenn du es wirklich gemacht hast.')));
  const list = h('div', {});
  for (const m of misses) {
    list.append(h('button', {
      type: 'button', class: 'row row--split', style: 'margin-bottom:8px',
      onclick: () => {
        openEntrySheet({
          task: m.task, slotId: m.slot?.id || null,
          onSaved: () => toast('Nachtrag gespeichert – im Bericht als Nachtrag markiert.', { tone: 'warn' }),
        });
      },
    }, h('span', { class: 'row__main truncate' }, m.task.title),
      h('span', { class: 'pill', dataset: { tone: 'red' } }, 'fehlt')));
  }
  body.append(list);
  return sheet({ title: 'Gestern nachtragen', subtitle: fmtDateLong(new Date(key).getTime()), content: body });
}

/* ---------- Personenzeile (Kopfzeile) ----------------------------------- */

export function userChip() {
  const u = state.users.find((x) => x.id === state.currentUserId) || state.users[0];
  return h('button', {
    type: 'button', class: 'btn btn--sm btn--ghost', title: 'Person wechseln',
    onclick: () => openSwitchUser(),
  }, icon('person', { size: 18 }), ' ' + (u?.name?.split(' ')[0] || 'Anmelden'));
}

export { esc };
