/* ==========================================================================
   verwalten.js – der „Chef-Bereich“: Betrieb, Kontrollen, Team, Server, Tarif
   Bewusst schlicht: alles an einem Ort, große Zeilen, klare Beschriftungen.
   ========================================================================== */

import { h, fmtDate, fmtDateTime, dayKey, esc } from '../../core/util.js';
import { card, pill, toast, sheet, icon, sectionTitle, confirmDialog, kv } from '../components.js';
import {
  state, saveSettings, addUser, updateUser, removeUser, unlockOwner, seedDemo, wipeAll,
  runSync, verifyIntegrity, counts, photoBudget, st, logic,
} from '../store.js';
import { PLANS } from '../../core/logic.js';
import { APP_VERSION } from '../../core/model.js';
import * as db from '../../core/db.js';
import { openTaskSheet } from './liste.js';
import { exportBackup, importBackup, openUpsell } from './bericht.js';

export function renderVerwalten(root, { navigate }) {
  const c = counts();

  root.append(h('div', { style: 'margin-bottom:12px' },
    h('h1', { style: 'margin-bottom:2px' }, 'Verwalten'),
    h('div', { class: 'card__meta' }, 'Einrichtung, Team, Server und Tarif.')));

  /* --- Betrieb --- */
  root.append(card({
    title: state.settings.business.name || 'Mein Betrieb',
    meta: [state.settings.business.street, state.settings.business.city].filter(Boolean).join(', ') || 'Anschrift noch offen',
    body: [h('div', { class: 'card__meta' }, `${c.tasks} Kontrollen · ${c.users} Personen · ${c.entries} Einträge`)],
    right: h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: openBusinessSheet }, 'Bearbeiten'),
  }));

  /* --- Kontrollen --- */
  const taskCard = card({
    title: 'Kontrollen & Geräte',
    meta: 'Kühlschränke, Bereiche, Wareneingang – alles frei benennbar',
    right: h('button', { type: 'button', class: 'btn btn--sm btn--primary', onclick: () => openTaskSheet({ kind: 'temp' }) }, 'Neu'),
  });
  const list = h('div', { style: 'margin-top:10px' });
  for (const t of state.tasks) {
    list.append(h('div', { class: 'row row--split', style: 'margin-bottom:6px' },
      h('div', { class: 'row__main' },
        h('div', { class: 'truncate' }, t.title),
        h('div', { class: 'row__sub' }, `${kindLabel(t.kind)} · ${t.kind === 'temp' && t.min !== null ? `${t.min} bis ${t.max} °C` : (t.everyDays > 1 ? `alle ${t.everyDays} Tage` : 'täglich')}${t.slots?.length ? ' · ' + t.slots.map((s) => state.settings.slots.find((x) => x.id === s)?.label || s).join(', ') : ''}`)),
      h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => openTaskSheet({ task: t }) }, 'Ändern')));
  }
  const quickAdd = h('div', { class: 'btnrow' });
  quickAdd.append(
    h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => openTaskSheet({ kind: 'temp' }) }, '+ Kühlgerät'),
    h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => openTaskSheet({ kind: 'clean' }) }, '+ Reinigungsbereich'),
    h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => openTaskSheet({ kind: 'core' }) }, '+ eigene Kontrolle'));
  list.append(quickAdd);
  taskCard.append(list);
  root.append(taskCard);

  /* --- Team --- */
  const teamCard = card({
    title: 'Team',
    meta: 'Wer eintragen darf. Der Name steht im Nachweis.',
    right: h('button', { type: 'button', class: 'btn btn--sm btn--primary', onclick: openAddUserSheet }, 'Person'),
  });
  for (const u of state.users) {
    teamCard.append(h('div', { class: 'row row--split', style: 'margin-top:6px' },
      h('div', { class: 'row__main' },
        h('div', {}, u.name, u.role === 'owner' ? ' ' : ''),
        h('div', { class: 'row__sub' }, `${u.role === 'owner' ? 'Chef/in' : 'Mitarbeiter/in'} · ${u.pinHash ? 'mit PIN' : 'ohne PIN'}`)),
      h('div', { style: 'display:flex;gap:6px' },
        h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => openAddUserSheet({ user: u }) }, 'Ändern'))));
  }
  root.append(teamCard);

  /* --- Schichten --- */
  const shiftCard = card({ title: 'Schichten', meta: 'Zeitfenster für die Erinnerungen' });
  const shiftList = h('div', { style: 'margin-top:8px' });
  state.settings.slots.forEach((s, i) => {
    const label = h('input', { type: 'text', value: s.label, style: 'min-height:48px', onchange: (e) => { const slots = [...state.settings.slots]; slots[i] = { ...s, label: e.target.value }; saveSettings({ slots }); } });
    const from = h('input', { type: 'time', value: s.from, style: 'min-height:48px', onchange: (e) => { const slots = [...state.settings.slots]; slots[i] = { ...slots[i], from: e.target.value }; saveSettings({ slots }); } });
    const to = h('input', { type: 'time', value: s.to, style: 'min-height:48px', onchange: (e) => { const slots = [...state.settings.slots]; slots[i] = { ...slots[i], to: e.target.value }; saveSettings({ slots }); } });
    shiftList.append(h('div', { style: 'margin-bottom:10px' },
      h('label', { class: 'field', style: 'margin-bottom:6px' }, `Schicht ${i + 1}`, label),
      h('div', { style: 'display:flex;gap:8px;align-items:center' }, from, h('span', {}, 'bis'), to,
        state.settings.slots.length > 1
          ? h('button', {
            type: 'button', class: 'btn btn--sm btn--ghost',
            onclick: () => saveSettings({ slots: state.settings.slots.filter((_, j) => j !== i) }),
          }, '×')
          : null)));
  });
  shiftList.append(h('button', {
    type: 'button', class: 'btn btn--sm btn--ghost',
    onclick: () => saveSettings({ slots: [...state.settings.slots, { id: 'slot' + Date.now(), label: `Schicht ${state.settings.slots.length + 1}`, from: '18:00', to: '23:00' }] }),
  }, '+ Schicht hinzufügen'));
  shiftCard.append(shiftList);
  root.append(shiftCard);

  /* --- Erinnerungen --- */
  const rem = card({ title: 'Erinnerungen', meta: 'Die Kachel bleibt rot, bis die Kontrolle erledigt ist.' });
  const notifyState = typeof Notification === 'undefined' ? 'nicht möglich' : (Notification.permission === 'granted' ? 'an' : Notification.permission === 'denied' ? 'vom Gerät blockiert' : 'aus');
  rem.append(kv('Erinnerungen in der App', state.settings.reminders.enabled ? 'an' : 'aus'));
  rem.append(kv('Mitteilungen auf dem Gerät', notifyState));
  rem.append(kv('Wiederholung', `alle ${state.settings.reminders.repeatMin} Minuten`));
  rem.append(kv('Ruhezeit', `${state.settings.reminders.quietFrom} bis ${state.settings.reminders.quietTo}`));
  const remRow = h('div', { class: 'btnrow', style: 'margin-top:10px' });
  remRow.append(h('button', {
    type: 'button', class: 'btn btn--sm ' + (state.settings.reminders.enabled ? 'btn--done' : 'btn--ghost'),
    onclick: () => saveSettings({ reminders: { ...state.settings.reminders, enabled: !state.settings.reminders.enabled } }),
  }, state.settings.reminders.enabled ? 'Erinnerungen an' : 'Erinnerungen aus'));
  remRow.append(h('button', {
    type: 'button', class: 'btn btn--sm btn--ghost',
    onclick: async () => {
      if (typeof Notification === 'undefined') { toast('Dieses Gerät kann keine Mitteilungen anzeigen.', { tone: 'warn' }); return; }
      const perm = await Notification.requestPermission();
      await saveSettings({ reminders: { ...state.settings.reminders, pushEnabled: perm === 'granted' } });
      toast(perm === 'granted' ? 'Mitteilungen sind an ✓' : 'Mitteilungen wurden nicht erlaubt.', { tone: perm === 'granted' ? 'ok' : 'warn' });
    },
  }, 'Mitteilungen erlauben'));
  remRow.append(h('button', {
    type: 'button', class: 'btn btn--sm btn--ghost',
    onclick: () => {
      const input = h('input', { type: 'number', min: '5', max: '120', value: state.settings.reminders.repeatMin });
      sheet({
        title: 'Wie oft erinnern?', subtitle: 'In Minuten (5 bis 120)',
        content: [input],
        actions: [{ label: 'Speichern', class: 'btn--primary', onClick: async () => saveSettings({ reminders: { ...state.settings.reminders, repeatMin: Math.max(5, Math.min(120, Number(input.value) || 30)) } }) }],
      });
    },
  }, 'Intervall ändern'));
  rem.append(remRow);
  root.append(rem);

  /* --- Darstellung --- */
  const look = card({ title: 'Darstellung', meta: 'Große Schrift hilft im Stress – und in der Küche.' });
  const fontRow = h('div', { class: 'btnrow', style: 'margin-top:8px' });
  for (const [val, label] of [['m', 'Normal'], ['l', 'Groß'], ['xl', 'Sehr groß']]) {
    fontRow.append(h('button', {
      type: 'button', class: 'btn btn--sm ' + (state.settings.ui.fontsize === val ? 'btn--done' : 'btn--ghost'),
      onclick: () => saveSettings({ ui: { ...state.settings.ui, fontsize: val } }),
    }, label));
  }
  const themeRow = h('div', { class: 'btnrow', style: 'margin-top:8px' });
  for (const [val, label] of [['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel (Spätschicht)']]) {
    themeRow.append(h('button', {
      type: 'button', class: 'btn btn--sm ' + (state.settings.ui.theme === val ? 'btn--done' : 'btn--ghost'),
      onclick: () => saveSettings({ ui: { ...state.settings.ui, theme: val } }),
    }, label));
  }
  look.append(fontRow, themeRow);
  root.append(look);

  /* --- Server & Sync --- */
  const srv = card({ title: 'Server & Sicherung', meta: 'Ohne Server läuft alles weiter – die Zeitstempel werden später nachgeprüft.' });
  const info = state.syncInfo || {};
  srv.append(kv('Server-Adresse', state.settings.server.url || 'nicht eingestellt (nur lokal)'));
  srv.append(kv('Zeitquelle', st.isFresh() ? 'Serverzeit (geprüft)' : 'Gerätezeit (offline)'));
  srv.append(kv('Noch nicht übertragen', `${info.queue || 0} Einträge`));
  srv.append(kv('Letzte Übertragung', info.lastSuccess ? fmtDateTime(info.lastSuccess) : '–'));
  if (info.lastError) srv.append(kv('Letzter Fehler', String(info.lastError).slice(0, 60)));
  const srvRow = h('div', { class: 'btnrow', style: 'margin-top:10px' });
  srvRow.append(h('button', { type: 'button', class: 'btn btn--sm btn--primary', onclick: openServerSheet }, 'Server einrichten'));
  srvRow.append(h('button', {
    type: 'button', class: 'btn btn--sm btn--ghost',
    onclick: async () => { const r = await runSync(); toast(r.ok ? `Übertragen: ${r.sent} Einträge ✓` : (r.error || 'Noch kein Server eingestellt.'), { tone: r.ok ? 'ok' : 'warn' }); },
  }, 'Jetzt übertragen'));
  srvRow.append(h('button', {
    type: 'button', class: 'btn btn--sm btn--ghost',
    onclick: async () => {
      const r = await verifyIntegrity();
      toast(r.ok ? `Prüfung ok: ${r.checked} Einträge unverändert ✓` : `Achtung: ${r.problems.length} Abweichungen!`, { tone: r.ok ? 'ok' : 'err', ms: 5000 });
    },
  }, 'Nachweis prüfen'));
  srv.append(srvRow);
  root.append(srv);

  /* --- Tarif --- */
  const plan = state.settings.plan === 'pro' ? PLANS.pro : PLANS.free;
  const planCard = card({
    title: plan.name,
    meta: plan.price,
    right: pill(state.settings.plan === 'pro' ? 'Plus aktiv' : 'kostenlos', state.settings.plan === 'pro' ? 'green' : 'grey'),
    body: [h('ul', { style: 'margin:6px 0 0;padding-left:22px;font-weight:600' }, ...plan.features.map((f) => h('li', {}, f)))],
  });
  planCard.append(h('div', { class: 'btnrow', style: 'margin-top:10px' },
    state.settings.plan === 'pro'
      ? h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: async () => { await saveSettings({ plan: 'free' }); toast('Zurück zum kostenlosen Tarif.'); } }, 'Auf kostenlos zurück')
      : h('button', { type: 'button', class: 'btn btn--sm btn--primary', onclick: () => openUpsell('Mehrere Standorte, volle Historie, automatische Monatsberichte und Fotos.') }, 'Plus ansehen'),
    h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: photoBudgetInfo }, 'Foto-Kontingent')));
  root.append(planCard);

  /* --- Daten & Notfall --- */
  const dataCard = card({ title: 'Daten & Notfall', meta: 'Sicherung, Demodaten, kompletter Neustart.' });
  const dataRow = h('div', { class: 'btnrow', style: 'margin-top:8px' });
  dataRow.append(h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: exportBackup }, 'Sicherung herunterladen'));
  dataRow.append(h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: importBackup }, 'Sicherung einlesen'));
  dataRow.append(h('button', {
    type: 'button', class: 'btn btn--sm btn--ghost',
    onclick: async () => {
      const ok = await confirmDialog({ title: 'Demodaten einspielen?', text: 'Erzeugt die letzten 34 Tage als Beispielbericht. Ideal zum Ausprobieren.', confirmLabel: 'Einspielen' });
      if (!ok) return;
      const n = await seedDemo();
      toast(`${n} Beispiel-Einträge angelegt ✓`, { tone: 'ok' });
      navigate('bericht');
    },
  }, 'Demodaten einspielen'));
  dataRow.append(h('button', {
    type: 'button', class: 'btn btn--sm btn--danger',
    onclick: async () => {
      const ok = await confirmDialog({ title: 'Wirklich alles löschen?', text: 'Alle Kontrollen, Personen und Einträge werden gelöscht. Eine Sicherung solltest du vorher herunterladen.', confirmLabel: 'Alles löschen', tone: 'danger' });
      if (!ok) return;
      await wipeAll();
      toast('Alles gelöscht. Die App startet neu.', { tone: 'warn' });
      location.reload();
    },
  }, 'Alles löschen'));
  dataCard.append(dataRow);
  root.append(dataCard);

  /* --- Über --- */
  const about = card({ title: 'Über KneipenCheck', meta: `Version ${APP_VERSION}` });
  about.append(kv('Speichermodus', state.storage === 'idb' ? 'IndexedDB (empfohlen)' : state.storage === 'ls' ? 'LocalStorage (eingeschränkt)' : 'nur Arbeitsspeicher'));
  about.append(kv('Einträge gesamt', String(state.entries.length)));
  about.append(kv('Fotos', `${state.photos.size} im Zwischenspeicher`));
  about.append(h('div', { class: 'infobox', style: 'margin-top:10px' },
    'KneipenCheck ersetzt den gelben Ordner. Aufbewahrungspflicht mindestens 2 Jahre (VO (EG) 852/2004, § 4 LMHV). ',
    'Diese App ist eine Dokumentationshilfe, kein Rechtsrat – das HACCP-Konzept selbst bleibt Aufgabe des Betriebs.'));
  root.append(about);
}

const kindLabel = (k) => ({ temp: 'Temperatur', clean: 'Reinigung', goods: 'Wareneingang', core: 'Eigene Kontrolle' }[k] || k);

function photoBudgetInfo() {
  const b = photoBudget();
  toast(b.isPro ? 'Plus: unbegrenzt Fotos.' : `Kostenlos: ${b.used} von ${b.limit} Fotos verbraucht.`, { ms: 4200 });
}

/* ---------- Betrieb bearbeiten ------------------------------------------ */

export function openBusinessSheet() {
  const b = { ...state.settings.business };
  const f = (key, label, ph = '') => h('label', { class: 'field' }, label,
    h('input', { type: 'text', value: b[key] || '', placeholder: ph, oninput: (e) => { b[key] = e.target.value; } }));
  return sheet({
    title: 'Betrieb',
    subtitle: 'Diese Angaben stehen auf jedem Bericht.',
    content: [
      f('name', 'Name des Betriebs', 'z. B. Kneipe Zur Ecke'),
      f('street', 'Straße & Nummer'),
      f('city', 'PLZ & Ort'),
      f('owner', 'Verantwortliche Person', 'Vor- und Nachname'),
      f('phone', 'Telefon (optional)'),
      f('healthOffice', 'Zuständiges Gesundheitsamt (optional)'),
    ],
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      { label: 'Speichern', class: 'btn--primary', block: true, onClick: async () => { await saveSettings({ business: b }); toast('Gespeichert ✓', { tone: 'ok' }); } },
    ],
  });
}

/* ---------- Personen ---------------------------------------------------- */

export function openAddUserSheet({ user = null } = {}) {
  const isNew = !user;
  const data = { name: user?.name || '', role: user?.role || 'staff', pin: '' };
  const limit = PLANS[state.settings.plan || 'free'].limits.users;

  const content = [
    h('label', { class: 'field' }, 'Name', h('input', {
      type: 'text', value: data.name, placeholder: 'z. B. Marlene', autofocus: 'autofocus',
      oninput: (e) => { data.name = e.target.value; },
    }), h('span', { class: 'field__hint' }, 'So wie die Person im Betrieb genannt wird.')),
    h('label', { class: 'field' }, 'Rolle',
      h('select', { onchange: (e) => { data.role = e.target.value; } },
        h('option', { value: 'staff', selected: data.role === 'staff' ? '' : null }, 'Mitarbeiter/in (trägt Kontrollen ein)'),
        h('option', { value: 'owner', selected: data.role === 'owner' ? '' : null }, 'Chef/in (darf alles ändern)'))),
    h('label', { class: 'field' }, user?.pinHash ? 'Neue PIN (leer lassen = PIN behalten)' : 'PIN für den Chef-Bereich (optional)',
      h('input', {
        type: 'tel', inputmode: 'numeric', maxlength: '8', value: '',
        placeholder: 'z. B. 1234 – schützt die Verwaltung',
        oninput: (e) => { data.pin = e.target.value.replace(/\D/g, ''); },
      }),
      h('span', { class: 'field__hint' }, 'Ohne PIN kann jeder die Einstellungen öffnen. Für den Alltag ist das oft gewünscht.')),
    isNew && state.users.length >= limit
      ? h('div', { class: 'warnbox' }, `Im kostenlosen Tarif sind ${limit} Benutzer enthalten. Mehr Personen gibt es mit KneipenCheck Plus.`)
      : null,
  ];

  return sheet({
    title: isNew ? 'Person hinzufügen' : `„${user.name}“ bearbeiten`,
    content,
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      isNew ? null : {
        label: 'Entfernen', class: 'btn--danger', onClick: async () => {
          const ok = await confirmDialog({ title: `${user.name} entfernen?`, text: 'Bisherige Einträge bleiben mit dem Namen erhalten.', confirmLabel: 'Entfernen', tone: 'danger' });
          if (!ok) return false;
          await removeUser(user.id);
          toast('Person entfernt.');
        },
      },
      {
        label: 'Speichern', class: 'btn--primary', block: true, onClick: async () => {
          if (!data.name.trim()) { toast('Bitte einen Namen eintragen.', { tone: 'warn' }); return false; }
          if (isNew) await addUser({ name: data.name.trim(), pin: data.pin || null, role: data.role });
          else await updateUser(user.id, { name: data.name.trim(), role: data.role, ...(data.pin ? { pin: data.pin } : {}) });
          toast('Gespeichert ✓', { tone: 'ok' });
        },
      },
    ].filter(Boolean),
  });
}

/* ---------- Server ------------------------------------------------------ */

export function openServerSheet() {
  const url = h('input', {
    type: 'url', value: state.settings.server.url || '', placeholder: 'https://kneipencheck.deine-domain.de',
    inputmode: 'url', autocapitalize: 'off', spellcheck: 'false',
  });
  const status = h('div', { class: 'infobox' }, 'Noch nicht verbunden.');
  return sheet({
    title: 'Server einrichten',
    subtitle: 'Für Zeitstempel vom Server und mehrere Geräte.',
    content: [
      h('div', { class: 'infobox' },
        'Ohne Server funktioniert alles weiter – Einträge bekommen dann den Gerätezeitstempel und werden später nachgeprüft. ',
        'Ein eigener Server ist mit einem Befehl gestartet: node server/index.mjs'),
      h('label', { class: 'field', style: 'margin-top:14px' }, 'Server-Adresse', url,
        h('span', { class: 'field__hint' }, 'Adresse der KneipenCheck-Installation, z. B. http://192.168.1.20:4173 im eigenen WLAN.')),
      h('button', {
        type: 'button', class: 'btn btn--ghost btn--block',
        onclick: async (ev) => {
          const btn = ev.currentTarget;
          btn.disabled = true;
          btn.textContent = 'Prüfe …';
          status.textContent = 'Verbindung wird getestet …';
          const test = await fetch(url.value.replace(/\/$/, '') + '/api/health')
            .then((r) => r.json()).catch(() => null);
          status.textContent = test?.ok
            ? `Server erreichbar ✓ (Version ${test.version}, Serverzeit ${new Date(test.now).toLocaleTimeString('de-DE')} Uhr)`
            : 'Server nicht erreichbar. Adresse prüfen – hängt das Gerät im gleichen WLAN?';
          btn.disabled = false;
          btn.textContent = 'Verbindung testen';
        },
      }, 'Verbindung testen'),
      status,
      h('label', { class: 'field', style: 'margin-top:14px' },
        h('span', { style: 'display:flex;align-items:center;gap:8px' },
          h('input', {
            type: 'checkbox', checked: state.settings.server.autoRegisterExports ? '' : null,
            onchange: (e) => saveSettings({ server: { ...state.settings.server, autoRegisterExports: e.target.checked } }),
          }),
          'Monatsbericht automatisch registrieren (Plus)')),
    ],
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      {
        label: 'Speichern & verbinden', class: 'btn--primary', block: true, onClick: async () => {
          await saveSettings({ server: { ...state.settings.server, url: url.value.trim().replace(/\/$/, '') } });
          toast('Serveradresse gespeichert.', { tone: 'ok' });
          const r = await runSync();
          toast(r.ok ? 'Verbunden und übertragen ✓' : (r.error || 'Noch keine Verbindung.'), { tone: r.ok ? 'ok' : 'warn', ms: 4500 });
        },
      },
    ],
  });
}

/* ---------- Chef-Bereich entsperren ------------------------------------ */

export function openUnlockSheet(onSuccess) {
  const owner = state.users.find((u) => u.role === 'owner') || state.users[0];
  if (!owner?.pinHash) { onSuccess?.(); return null; }
  const input = h('input', { type: 'tel', inputmode: 'numeric', maxlength: '8', placeholder: 'PIN', autofocus: 'autofocus' });
  return sheet({
    title: 'Chef-Bereich',
    subtitle: `PIN von ${owner.name} eingeben`,
    content: [input],
    actions: [
      { label: 'Abbrechen', class: 'btn--ghost' },
      {
        label: 'Öffnen', class: 'btn--primary', block: true, onClick: async () => {
          const ok = await unlockOwner(input.value);
          if (!ok) { toast('PIN stimmt nicht.', { tone: 'err' }); return false; }
          toast('Willkommen zurück.', { tone: 'ok' });
          onSuccess?.();
        },
      },
    ],
  });
}
