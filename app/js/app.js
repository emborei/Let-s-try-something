/* ==========================================================================
   app.js – Start, Navigation, Erinnerungen
   Diese Datei verbindet alles: Daten laden, Bildschirm aufbauen, im
   Hintergrund die Uhrzeit prüfen, übertragen und – wenn nötig – nerven.
   ========================================================================== */

import { h, fmtDate, dayKey, clear, MS_DAY, buzz } from './core/util.js';
import * as db from './core/db.js';
import * as st from './core/server-time.js';
import * as sync from './core/sync.js';
import { iconSvg, icon, toast, sheet, pill, confirmDialog } from './ui/components.js';
import {
  state, loadAll, runSync, queueSyncSoon, verifyIntegrity, refreshDerived, currentUser, saveSettings,
} from './ui/store.js';
import { renderHeute, userChip } from './ui/views/heute.js';
import { renderListe } from './ui/views/liste.js';
import { renderBericht } from './ui/views/bericht.js';
import { renderVerwalten, openUnlockSheet } from './ui/views/verwalten.js';
import { renderEinrichten } from './ui/views/einrichten.js';

const ROUTES = ['heute', 'temperatur', 'putzen', 'wareneingang', 'bericht', 'verwalten', 'einrichten'];
const view = document.getElementById('view');
const nav = document.getElementById('nav');
let currentRoute = 'heute';
let alarmHiddenUntil = 0;
let lastNagAt = 0;

/* ---------- Router ------------------------------------------------------- */

function routeFromHash() {
  const raw = (location.hash || '#/heute').replace(/^#\/?/, '').split('?')[0];
  return ROUTES.includes(raw) ? raw : 'heute';
}

export function navigate(route) {
  if (location.hash === `#/${route}`) { render(); return; }
  location.hash = `#/${route}`;
}

window.addEventListener('hashchange', render);

/* ---------- Bildschirm aufbauen ----------------------------------------- */

function render() {
  currentRoute = routeFromHash();
  state.route = currentRoute;
  if (!state.ready) return;

  // Einrichtung erzwingen, solange nichts eingerichtet ist
  if (!state.settings.onboardingDone && currentRoute !== 'einrichten') {
    return navigate('einrichten');
  }

  clear(view);
  const ctx = { navigate, route: currentRoute };

  switch (currentRoute) {
    case 'heute': renderHeute(view, ctx); break;
    case 'temperatur':
    case 'putzen':
    case 'wareneingang': renderListe(view, ctx); break;
    case 'bericht': renderBericht(view, ctx); break;
    case 'verwalten': renderVerwalten(view, ctx); break;
    case 'einrichten': renderEinrichten(view, ctx); break;
    default: renderHeute(view, ctx);
  }

  renderAlarmBar();
  renderNav();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* ---------- Kopfzeile --------------------------------------------------- */

function renderTopbar() {
  const title = document.getElementById('tb-title');
  const sub = document.getElementById('tb-sub');
  if (title) title.textContent = state.settings.business.name || 'KneipenCheck';
  if (sub) {
    const now = st.now();
    const t = new Date(now);
    const p = (n) => String(n).padStart(2, '0');
    const parts = [
      `${fmtDate(now)} · ${p(t.getHours())}:${p(t.getMinutes())}`,
      st.isFresh() ? 'Serverzeit' : 'Gerätezeit',
      state.settings.onboardingDone ? null : 'Einrichtung',
    ].filter(Boolean);
    sub.textContent = parts.join(' · ');
  }

  const dot = document.getElementById('sync-dot');
  if (dot) {
    const q = state.syncInfo?.queue || 0;
    const online = navigator.onLine !== false;
    let text, status;
    if (!online) { text = 'offline'; status = 'offline'; }
    else if (q > 0) { text = `${q} offen`; status = 'pending'; }
    else if (state.settings.server.url) { text = 'verbunden'; status = 'ok'; }
    else { text = 'nur lokal'; status = 'ok'; }
    dot.dataset.state = status;
    dot.textContent = text;
    dot.onclick = () => openStatusSheet();
    dot.setAttribute('role', 'button');
    dot.setAttribute('tabindex', '0');
  }

  const userBtn = document.getElementById('btn-user');
  if (userBtn) {
    const u = currentUser();
    userBtn.textContent = u ? u.name.split(' ')[0] : 'Anmelden';
    userBtn.onclick = async () => {
      const m = await import('./ui/views/entry.js');
      m.openSwitchUser();
    };
  }
}

/* ---------- Navigation -------------------------------------------------- */

function renderNav() {
  clear(nav);
  for (const item of state.nav) {
    const open = state.today ? (state.today.counts.offen + state.today.counts.spaet + state.today.counts.verpasst) : 0;
    const badge = (item.id === 'heute' && open > 0) ? String(open) : null;
    const btn = h('button', {
      type: 'button', class: 'nav__item', dataset: { route: item.id },
      'aria-current': currentRoute === item.id ? 'page' : null,
      'aria-label': item.label + (badge ? `, ${badge} offen` : ''),
      onclick: () => navigate(item.id),
    });
    btn.innerHTML = iconSvg(item.icon, { size: 28 }) + `<span>${item.label}</span>` + (badge ? `<span class="nav__badge">${badge}</span>` : '');
    nav.append(btn);
  }
  const gear = h('button', {
    type: 'button', class: 'nav__item', 'aria-current': currentRoute === 'verwalten' ? 'page' : null,
    'aria-label': 'Verwalten', onclick: () => openVerwalten(),
  });
  gear.innerHTML = iconSvg('zahnrad', { size: 28 }) + '<span>Verwalten</span>';
  nav.append(gear);
  nav.style.gridTemplateColumns = `repeat(${state.nav.length + 1}, 1fr)`;
}

function openVerwalten() {
  const owner = state.users.find((u) => u.role === 'owner') || state.users[0];
  if (state.isOwner || !owner?.pinHash) { navigate('verwalten'); return; }
  openUnlockSheet(() => navigate('verwalten'));
}

/* ---------- Erinnerungsleiste (bleibt, bis erledigt) -------------------- */

function renderAlarmBar() {
  document.querySelectorAll('.alarmbar').forEach((n) => n.remove());
  const open = state.today ? (state.today.counts.offen + state.today.counts.spaet + state.today.counts.verpasst) : 0;
  if (!open || Date.now() < alarmHiddenUntil || currentRoute === 'einrichten') return;
  const overdue = state.today.counts.verpasst + state.today.counts.spaet;
  const bar = h('div', { class: 'alarmbar', role: 'alert' });
  bar.style.cssText = `position:sticky;top:0;z-index:25;background:var(--red);color:#fff;padding:10px 14px;display:flex;gap:10px;align-items:center;font-weight:800;border-bottom:3px solid #7a170f;flex-wrap:wrap`;
  bar.append(
    h('span', { style: 'flex:1;min-width:180px' },
      overdue ? `⚠ ${open} Kontrolle(n) offen – ${overdue} schon über der Zeit` : `⚠ ${open} Kontrolle(n) noch offen für heute`),
    h('button', {
      type: 'button', class: 'btn btn--sm', style: 'background:#fff;color:#7a170f;border-color:#fff',
      onclick: () => { if (currentRoute !== 'heute') navigate('heute'); else window.scrollTo({ top: 0 }); },
    }, 'Jetzt erledigen'),
    h('button', {
      type: 'button', class: 'btn btn--sm btn--ghost', style: 'border-color:#ffffff88;color:#fff',
      onclick: () => { alarmHiddenUntil = Date.now() + 15 * 60000; renderAlarmBar(); toast('In 15 Minuten melde ich mich wieder.', { ms: 2600 }); },
    }, '15 Min später'));
  document.getElementById('app').insertBefore(bar, document.getElementById('view'));
}

/* ---------- Erinnerungs-Schleife --------------------------------------- */

function startReminders() {
  const tick = async () => {
    const now = st.now();
    refreshDerived();
    renderTopbar();
    if (state.ready) renderNav();
    if (!state.settings.reminders.enabled) return;
    if (Date.now() < alarmHiddenUntil) { renderAlarmBar(); return; }

    const urgent = state.alarms.filter((a) => a.state !== 'fertig');
    const overdue = urgent.filter((a) => a.state === 'verpasst' || a.state === 'spaet' || a.state === 'gestern-fehlt');
    document.title = urgent.length ? `(${urgent.length}) KneipenCheck` : 'KneipenCheck';

    const wait = state.settings.reminders.repeatMin * 60000;
    if (Date.now() - lastNagAt < wait) return;
    if (urgent.length) {
      lastNagAt = Date.now();
      const q = quietNow();
      renderAlarmBar();
      if (!q) {
        buzz([30, 80, 30]);
        toast(overdue.length
          ? `${overdue.length} Kontrolle(n) sind über der Zeit: ${overdue.slice(0, 3).map((a) => a.title).join(', ')}`
          : `${urgent.length} Kontrolle(n) fehlen noch: ${urgent.slice(0, 3).map((a) => a.title).join(', ')}`,
          { tone: 'warn', ms: 6000 });
        if (state.settings.reminders.pushEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
          try {
            new Notification('KneipenCheck: Kontrollen offen', {
              body: overdue.length ? `${overdue.length} über der Zeit – bitte eintragen.` : `${urgent.length} Kontrollen fehlen noch.`,
              icon: './icons/icon-192.png', tag: 'kneipencheck-nag', renotify: true,
            });
          } catch { /* egal */ }
        }
      }
    }
    // Der Seiten-Titel blinkt, wenn nichts erledigt wurde – reine Aufmerksamkeit
  };
  setInterval(tick, 60000);
  setTimeout(tick, 4000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
}

function quietNow() {
  const { quietFrom, quietTo } = state.settings.reminders;
  const d = new Date(st.now());
  const cur = d.getHours() * 60 + d.getMinutes();
  const toMin = (s) => { const [hh, mm] = String(s).split(':').map(Number); return (hh || 0) * 60 + (mm || 0); };
  const a = toMin(quietFrom); const b = toMin(quietTo);
  return b >= a ? (cur >= a && cur < b) : (cur >= a || cur < b);
}

/* ---------- Status-Blatt ------------------------------------------------- */

function openStatusSheet() {
  const info = state.syncInfo || {};
  const body = h('div', {});
  body.append(kvRow('Speicher', state.storage === 'idb' ? 'IndexedDB (empfohlen)' : state.storage === 'ls' ? 'LocalStorage' : 'nur Arbeitsspeicher'));
  body.append(kvRow('Serverzeit', st.isFresh() ? `geprüft (${st.stampLabel()})` : 'noch nicht geprüft – offline'));
  body.append(kvRow('Server', state.settings.server.url || 'nicht eingerichtet'));
  body.append(kvRow('Warteschlange', `${info.queue || 0} Einträge`));
  body.append(kvRow('Letzte Übertragung', info.lastSuccess ? new Date(info.lastSuccess).toLocaleString('de-DE') : '–'));
  if (info.lastError) body.append(kvRow('Letzter Fehler', String(info.lastError).slice(0, 70)));
  body.append(h('div', { class: 'btnrow', style: 'margin-top:14px' },
    h('button', {
      type: 'button', class: 'btn btn--primary',
      onclick: async (ev) => {
        const btn = ev.currentTarget;
        btn.disabled = true;
        const r = await runSync();
        toast(r.ok ? `Übertragen: ${r.sent || 0} Einträge ✓` : (r.error || 'Nicht verbunden'), { tone: r.ok ? 'ok' : 'warn' });
        btn.disabled = false;
      },
    }, 'Jetzt übertragen'),
    h('button', { type: 'button', class: 'btn btn--ghost', onclick: async () => { const t = await st.syncNow({ serverUrl: state.settings.server.url }); toast(t.ok ? `Serverzeit geholt (${t.source}) ✓` : 'Keine Zeitquelle erreichbar – Gerätezeit bleibt.', { tone: t.ok ? 'ok' : 'warn' }); } }, 'Serverzeit holen')));
  return sheet({ title: 'Status', subtitle: 'Was passiert gerade mit deinen Daten?', content: body });
}
const kvRow = (k, v) => h('div', { class: 'kv' }, h('span', {}, k), h('span', {}, String(v)));

/* ---------- Start ------------------------------------------------------- */

async function boot() {
  const t0 = Date.now();
  await st.loadFromStorage();
  await loadAll();

  state.currentUserId = await db.metaGet('currentUserId', null);
  if (!state.currentUserId && state.users.length) state.currentUserId = state.users[0].id;

  // Uhr vom Server holen (nicht blockierend für die Anzeige)
  st.syncNow({ serverUrl: state.settings.server.url }).then((r) => {
    renderTopbar();
    if (r.ok && Math.abs(st.serverOffset()) > 15000) {
      toast(`Uhrzeit wurde vom Server korrigiert (${Math.round(st.serverOffset() / 1000)} s).`, { tone: 'warn', ms: 5000 });
    }
  });

  renderTopbar();
  render();
  startReminders();
  document.getElementById('btn-user').textContent = currentUser()?.name?.split(' ')[0] || 'Anmelden';

  // Im Hintergrund übertragen, sobald Verbindung da ist
  window.addEventListener('online', () => { renderTopbar(); runSync(); st.syncNow({ serverUrl: state.settings.server.url }); });
  window.addEventListener('offline', () => { renderTopbar(); toast('Kein Internet – alles wird weiter lokal gespeichert.', { ms: 4000, tone: 'warn' }); });
  if (navigator.onLine) setTimeout(() => runSync(), 2500);

  // Speicher dauerhaft anfordern (schützt vor Löschen durch das System)
  db.requestPersistentStorage?.();

  // Hash-Kette beim Start prüfen, damit Manipulation auffällt
  setTimeout(async () => {
    const r = await verifyIntegrity();
    if (!r.ok) {
      toast(`Achtung: ${r.problems.length} Eintrag/Einträge weichen von der Prüfsumme ab. Bitte im Bericht nachsehen.`, { tone: 'err', ms: 8000 });
    }
  }, 6000);

  document.getElementById('app').dataset.bootMs = String(Date.now() - t0);
}

/* ---------- Service Worker (Offline-Fähigkeit) ------------------------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Neue Version ist da. Einmal neu laden, dann ist sie aktiv.', { ms: 6000 });
          }
        });
      });
    }).catch(() => { /* z. B. bei http ohne localhost */ });
  });
}

boot().catch((e) => {
  console.error(e);
  const v = document.getElementById('view');
  if (v) {
    v.innerHTML = '';
    v.append(h('div', { class: 'warnbox', dataset: { tone: 'red' } },
      h('b', {}, 'Die App konnte nicht starten.'),
      h('div', { style: 'margin-top:6px' }, String(e?.message || e)),
      h('div', { style: 'margin-top:6px' }, 'Bitte Seite neu laden. Deine Daten bleiben im Gerät gespeichert.')));
  }
});

export { state };
