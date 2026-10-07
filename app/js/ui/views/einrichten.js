/* ==========================================================================
   einrichten.js – Start-Einrichtung in 4 Schritten (idiotensicher)
   Am Ende steht ein Betrieb, der sofort arbeiten kann.
   ========================================================================== */

import { h, dayKey } from '../../core/util.js';
import { card, toast, icon, pill, sectionTitle } from '../components.js';
import { state, saveSettings, addUser, adoptPresetSet, seedDemo, runSync, st } from '../store.js';
import { TEMP_PRESETS, CLEAN_PRESETS } from '../../core/model.js';

export function renderEinrichten(root, { navigate }) {
  let step = 0;
  const draft = {
    name: state.settings.business.name === 'Meine Kneipe' ? '' : state.settings.business.name,
    city: state.settings.business.city || '',
    preset: 'kneipe',
    userName: '',
    pin: '',
    demo: true,
    serverUrl: state.settings.server.url || '',
    slots: 'zwei',
  };

  const container = h('div', { class: 'login' });
  root.append(container);

  const paint = () => {
    container.innerHTML = '';
    container.append(h('div', { style: 'display:flex;align-items:center;gap:12px;margin-bottom:6px' },
      h('img', { src: './icons/icon.svg', alt: '', width: 56, height: 56 }),
      h('div', {},
        h('div', { style: 'font-weight:900;font-size:1.2em' }, 'KneipenCheck'),
        h('div', { class: 'card__meta' }, 'Der gelbe Ordner, nur in einfach.'))));

    const steps = ['Betrieb', 'Kontrollen', 'Team', 'Fertig'];
    const bar = h('div', { class: 'progress' },
      h('div', { class: 'progress__bar' }, h('div', { class: 'progress__fill', style: `width:${((step + 1) / steps.length) * 100}%` })),
      h('div', { class: 'progress__label' }, `Schritt ${step + 1}/4`));
    container.append(bar);

    if (step === 0) container.append(stepBetrieb());
    if (step === 1) container.append(stepKontrollen());
    if (step === 2) container.append(stepTeam());
    if (step === 3) container.append(stepFertig());
  };

  /* --- Schritt 1: Betrieb --- */
  function stepBetrieb() {
    const c = card({ title: 'Wie heißt dein Betrieb?' });
    c.append(
      h('label', { class: 'field' }, 'Name',
        h('input', { type: 'text', value: draft.name, placeholder: 'z. B. Kneipe Zur Ecke', autofocus: 'autofocus', oninput: (e) => { draft.name = e.target.value; } })),
      h('label', { class: 'field' }, 'Ort',
        h('input', { type: 'text', value: draft.city, placeholder: 'z. B. 44135 Dortmund', oninput: (e) => { draft.city = e.target.value; } })),
      h('div', { class: 'infobox' }, 'Der Name und Ort stehen später auf jedem Bericht – so wie auf dem gelben Ordner.'),
      h('button', {
        type: 'button', class: 'btn btn--primary btn--block btn--big', style: 'margin-top:14px',
        onclick: () => {
          if (!draft.name.trim()) { toast('Bitte den Namen des Betriebs eintragen.', { tone: 'warn' }); return; }
          step = 1; paint();
        },
      }, 'Weiter'));
    return c;
  }

  /* --- Schritt 2: Kontrollen --- */
  function stepKontrollen() {
    const c = card({ title: 'Was kontrolliert ihr?' });
    c.append(h('div', { class: 'card__meta', style: 'margin-bottom:10px' }, 'Wir richten passende Kontrollen ein. Du kannst alles später umbenennen, ergänzen oder löschen.'));

    const options = [
      ['kneipe', 'Eckkneipe / Bar', '4 Kühlgeräte, Theke, Toilette, Wareneingang'],
      ['imbiss', 'Imbiss / Döner / Pommes', 'Kühltheke, Fritteuse, Arbeitsflächen, Wareneingang'],
      ['cafe', 'Café / Bäckerei', 'Kuchentheke, Milchkühlung, Kaffeemaschine, Theke'],
      ['leer', 'Ich möchte selbst anlegen', 'Startet leer – alles per Hand'],
    ];
    for (const [id, title, sub] of options) {
      const on = draft.preset === id;
      c.append(h('button', {
        type: 'button', class: `row row--split ${on ? 'btn--done' : ''}`, style: `${on ? 'background:var(--green-bg);border-color:var(--green-line)' : ''};margin-bottom:8px`,
        onclick: () => { draft.preset = id; paint(); },
      },
        h('span', { class: 'row__main' }, title, h('span', { class: 'row__sub' }, sub)),
        on ? h('span', { class: 'pill', dataset: { tone: 'green' } }, 'ausgewählt') : null));
    }

    c.append(sectionTitle('Schichten'));
    const slotRow = h('div', { class: 'btnrow' });
    for (const [id, label] of [['eins', 'Eine Schicht (ganztags)'], ['zwei', 'Früh & Spät']]) {
      slotRow.append(h('button', {
        type: 'button', class: 'btn btn--sm ' + (draft.slots === id ? 'btn--done' : 'btn--ghost'),
        onclick: () => { draft.slots = id; paint(); },
      }, label));
    }
    c.append(slotRow);

    c.append(h('div', { class: 'btnrow', style: 'margin-top:16px' },
      h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => { step = 0; paint(); } }, 'Zurück'),
      h('button', { type: 'button', class: 'btn btn--primary', onclick: () => { step = 2; paint(); } }, 'Weiter')));
    return c;
  }

  /* --- Schritt 3: Team --- */
  function stepTeam() {
    const c = card({ title: 'Wer trägt ein?' });
    c.append(
      h('div', { class: 'card__meta', style: 'margin-bottom:10px' }, 'Der Name steht im Nachweis – so weiß der Prüfer, wer gemessen hat. Weitere Personen kannst du später hinzufügen.'),
      h('label', { class: 'field' }, 'Dein Name',
        h('input', { type: 'text', value: draft.userName, placeholder: 'z. B. Marlene', autofocus: 'autofocus', oninput: (e) => { draft.userName = e.target.value; } })),
      h('label', { class: 'field' }, 'PIN für den Chef-Bereich (optional)',
        h('input', { type: 'tel', inputmode: 'numeric', maxlength: '8', value: draft.pin, placeholder: 'z. B. 1234', oninput: (e) => { draft.pin = e.target.value.replace(/\D/g, ''); } }),
        h('span', { class: 'field__hint' }, 'Die PIN schützt Verwalten/Einstellungen. Für den Alltag ist kein Login nötig.')),
      h('div', { class: 'btnrow', style: 'margin-top:16px' },
        h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => { step = 1; paint(); } }, 'Zurück'),
        h('button', {
          type: 'button', class: 'btn btn--primary', onclick: () => {
            if (!draft.userName.trim()) { toast('Bitte deinen Namen eintragen.', { tone: 'warn' }); return; }
            step = 3; paint();
          },
        }, 'Weiter')));
    return c;
  }

  /* --- Schritt 4: Fertig --- */
  function stepFertig() {
    const c = card({ title: 'Fast fertig' });
    c.append(h('div', { class: 'card__meta', style: 'margin-bottom:10px' }, 'Zwei Kleinigkeiten – beide freiwillig.'));

    const demo = h('button', {
      type: 'button', class: `row row--split ${draft.demo ? 'btn--done' : ''}`,
      onclick: () => { draft.demo = !draft.demo; paint(); },
    }, h('span', { class: 'row__main' }, 'Beispiel-Daten zeigen',
      h('span', { class: 'row__sub' }, 'Die letzten 34 Tage als Muster – ideal, um den Bericht auszuprobieren. Kannst du später löschen.')),
      draft.demo ? h('span', { class: 'pill', dataset: { tone: 'green' } }, 'ja') : null);

    const serverInput = h('input', {
      type: 'url', value: draft.serverUrl, placeholder: 'http://192.168.1.20:4173 (optional)',
      inputmode: 'url', autocapitalize: 'off', spellcheck: 'false', oninput: (e) => { draft.serverUrl = e.target.value; },
    });

    c.append(demo,
      h('div', { style: 'height:10px' }),
      h('label', { class: 'field' }, 'Eigener Server (optional)', serverInput,
        h('span', { class: 'field__hint' }, 'Mit Server kommen die Zeitstempel direkt vom Server und mehrere Geräte teilen die Daten.')),
      h('div', { class: 'infobox' }, 'Ohne Server läuft alles weiter – auch offline. Die Einträge werden nachgeprüft, sobald wieder Verbindung da ist.'),
      h('div', { class: 'btnrow', style: 'margin-top:16px' },
        h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => { step = 2; paint(); } }, 'Zurück'),
        h('button', { type: 'button', class: 'btn btn--primary btn--big', style: 'flex:1', onclick: finish }, 'Los geht’s!')));
    return c;
  }

  async function finish() {
    container.innerHTML = '';
    container.append(h('div', { class: 'empty' }, 'Wird eingerichtet …'));
    await saveSettings({
      business: { ...state.settings.business, name: draft.name.trim(), city: draft.city.trim() },
      server: { ...state.settings.server, url: draft.serverUrl.trim().replace(/\/$/, '') },
      slots: draft.slots === 'eins'
        ? [{ id: 'tag', label: 'Ganztags', from: '07:00', to: '23:00' }]
        : [{ id: 'frueh', label: 'Frühschicht', from: '07:00', to: '13:00' }, { id: 'spaet', label: 'Spätschicht', from: '13:00', to: '23:00' }],
      onboardingDone: true,
    });
    if (draft.preset !== 'leer') await adoptPresetSet(draft.preset);
    await addUser({ name: draft.userName.trim(), pin: draft.pin || null, role: 'owner' });
    if (draft.demo) await seedDemo();
    await runSync();
    toast('Fertig! Viel Erfolg. 💪', { tone: 'ok' });
    navigate('heute');
  }

  paint();
}
