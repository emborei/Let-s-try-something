# 05 · Betrieb, Hosting, Play Store und Roadmap

---

## 1. Der Server in der Kneipe (empfohlen für den Anfang)

Der Sync-Server ist absichtlich ein einzelnes Node-Skript ohne Abhängigkeiten. Er läuft
also dort, wo schon ein Router, NAS oder alter Rechner steht.

### Variante A: Raspberry Pi / Mini-PC im Betrieb

```bash
# auf dem Pi (Node 18+ installieren, z. B. via apt oder nvm)
git clone <repo> kneipencheck && cd kneipencheck
PORT=4173 DATA_DIR=/var/lib/kneipencheck node server/index.mjs
```

Als Dienst einrichten (`/etc/systemd/system/kneipencheck.service`):

```ini
[Unit]
Description=KneipenCheck Sync-Server
After=network-online.target

[Service]
WorkingDirectory=/opt/kneipencheck
Environment=PORT=4173
Environment=DATA_DIR=/var/lib/kneipencheck
ExecStart=/usr/bin/node server/index.mjs
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

Dann im Einrichtungsdialog (oder unter *Verwalten → Server*) die Adresse
`http://192.168.1.20:4173` eintragen. Vorteil: **Serverzeit kommt aus dem eigenen Haus**,
keine Cloud, keine laufenden Kosten.
Einschränkung: Service Worker (PWA-Installation) braucht HTTPS oder localhost – im
WLAN-Betrieb funktioniert die App trotzdem normal im Browser.

### Variante B: VPS / Container (für mehrere Kunden)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV PORT=4173 DATA_DIR=/data
VOLUME /data
EXPOSE 4173
CMD ["node", "server/index.mjs"]
```

```bash
docker build -t kneipencheck .
docker run -d --name kneipencheck -p 4173:4173 -v kc-data:/data --restart unless-stopped kneipencheck
```

**HTTPS** davor (Caddy ist die kürzeste Lösung, automatisches Let's-Encrypt-Zertifikat):

```
kneipencheck.deine-domain.de {
    reverse_proxy 127.0.0.1:4173
}
```

Ohne HTTPS keine PWA-Installation, kein `navigator.share` beim PDF-Teilen und keine
verlässliche `crypto.subtle`-Nutzung (die App hat dafür den JS-Fallback, aber HTTPS ist
sauberer).

---

## 2. Sicherung & Wiederherstellung

| Was | Wie oft | Wohin |
|---|---|---|
| `data/db.json` + `data/journal.jsonl` | täglich per Cron | USB-Stick, zweiter Rechner, `rclone` zu einem EU-Cloud-Speicher |
| Sicherungsdatei aus der App (JSON) | monatlich | Download-Ordner, Firmen-Cloud, Steuerbüro-Ordner |
| Monats-PDF | monatlich | Papierordner (ja, wirklich: Prüfer mögen Papier) |

```bash
# Beispiel-Cron auf dem Server
0 3 * * * tar czf /backup/kneipencheck-$(date +\%F).tgz -C /var/lib kneipencheck
```

Wiederherstellung: Datei(en) zurückkopieren, Server neu starten. Prüfen mit `/api/verify`
und in der App mit *Bericht → Nachweis prüfen*.

---

## 3. Datenschutz (DSGVO) – kurz und praktisch

* **Verantwortlicher** ist der Betreiber (die Wirtin), **wir** sind Auftragsverarbeiter →
  Auftragsverarbeitungsvertrag (AVV) anbieten, sobald Server gehostet wird.
* **Verarbeitete Daten:** Betriebsdaten, Namen/Rollen der Mitarbeitenden, PIN-Hash,
  Messwerte, optional Fotos. Keine Standortdaten, kein Tracking, keine Cookies.
* **Rechtsgrundlage:** Art. 6 Abs. 1 lit. c (lebensmittelrechtliche Pflicht) und lit. f
  (berechtigtes Interesse an Nachweisführung).
* **Speicherort:** Standard ist das Gerät des Betriebs (keine Übermittlung!). Bei
  Cloud-Nutzung: Rechenzentrum in der EU, Verschlüsselung in Transit (TLS) und at rest.
* **Löschkonzept:** Aufbewahrungsfrist + 3 Monate → auf Anforderung löschen; Personen
  werden deaktiviert (Name bleibt historisch in Einträgen, wie im Papierformular auch).
* **TOMs dokumentieren** (Zugriffsbeschränkung per PIN, Gerätebindung, Versionsstand).
* **Kinder-/Sonderkategorien:** keine.

---

## 4. Weg in den Play Store (und was Apple macht)

Die App ist eine PWA → **Trusted Web Activity** genügt für Google Play.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://kneipencheck.deine-domain.de/manifest.webmanifest
# Fragen: Anwendungs-ID (de.kneipencheck.app), Name, Farben, Signatur
bubblewrap build         # app-release-bundle.aab + Signaturschlüssel (GUT AUFBEWAHREN!)
```

* **Play Console:** 25 $ einmalig, Store-Eintrag, Datenschutzerklärung (URL), Daten-
  sicherheitserklärung ausfüllen (wir sammeln: Standort nein, Personenbezug ja → angeben).
* **Digitale Käufe:** Wenn in der App verkauft wird, muss Google Play Billing verwendet
  werden (15 % bis 1 Mio. $ Jahresumsatz). Sauberer Weg: Abo nur im Web abschließen,
  in der App nur „Konto verwalten“ (bei TWA ohne Store-Billing erlaubt, wenn kein Verkauf
  in der App stattfindet).
* **Updates:** Nie Store-Update nötig – die PWA aktualisiert sich selbst (Service Worker).

**Apple/iOS:** Keine TWA. Optionen: (a) PWA-Installation empfehlen (läuft ab iOS 16.4
inklusive Push), (b) WebView-Wrapper (Capacitor) mit Store-Regeln zu Abos, (c) sich auf
Android konzentrieren – die Zielgruppe ist überwiegend Android.
Empfehlung für Phase 2: **(a)** + gedruckte Anleitung „Zum Home-Bildschirm“ am Tresen.

---

## 5. Roadmap

### Phase 0 (dieser Prototyp) – erledigt

PWA, Offline-Speicher, Kontrollen (Temperatur/Reinigung/Wareneingang), Erinnerungen,
Serverzeit, Hash-Kette, Monats-/Tages-/Arbeits-Listen-PDF, Korrekturen, Verwaltung,
Team, Sicherung, Tests (70), Dokumentation.

### Phase 1 – „Echte Kneipen testen“ (4–6 Wochen)

1. **Feldtest mit 5–10 Betrieben** (Eckkneipe, Imbiss, Café). Messgrößen:
   * Wie viele Tage in Folge wird dokumentiert (Ziel: > 80 %)?
   * Zeit pro Kontrolle (Ziel: < 10 Sekunden)?
   * Kann ein neuer Mitarbeiter es ohne Erklärung? (Beobachtung, keine Umfrage!)
2. **Behörden-Gespräch**: ein Gesundheitsamt- bzw. Veterinäramt-Mitarbeiter liest das PDF
   und sagt, was fehlt. Danach die PDF-Formulierung anpassen.
3. **Onboarding radikal kürzen**: alles, was im Test Fragen auslöst, umbauen oder entfernen.
4. **Echte Server-Deployments** bei 2 Betrieben (Pi/VPS) + wöchentliche Sicherung prüfen.

### Phase 2 – „Verkaufbar“ (8–12 Wochen)

1. **Backend-Ausbau**: Postgres/Supabase, mehrere Standorte, Chefin-Login per Magic-Link,
   Geräteverwaltung, automatische Monatsberichte und Lücken-Warnungen per E-Mail.
2. **Bezahlung**: Stripe-Abos, Rechnungen, Tarifwechsel, Kulanzphase (14 Tage Plus gratis).
3. **Personenbereich**: Belehrung nach § 43 IfSG (2 Jahre, Erinnerung), Hygieneschulung,
   Nachweis-Upload – als Plus-Funktion.
4. **Mehrsprachigkeit** (PL, TR, RO, EN) für Teams mit Sprachbarrieren.
5. **Play-Store-Veröffentlichung** (TWA), Datenschutzerklärung, Impressum, AGB, AVV.
6. **Betriebshandbuch für Kunden**: 1 Seite PDF „So zeigen Sie dem Prüfer alles in 10 Sekunden“.

### Phase 3 – „Mehrwert, den Papier nicht kann“ (offen)

1. **Funk-Sensoren** (ESP32/BLE) → automatische Messung, Alarm bei Grenzwertverletzung.
2. **Bluetooth-Thermometer** direkt in der App (Web Bluetooth) → abtippen entfällt.
3. **Rückstellproben-Verwaltung** (TK-Lager, ≤ −18 °C, mindestens 1 Woche).
4. **Zeitstempel-Verankerung** (RFC 3161) für Ketten/Audits.
5. **Wochenbericht per WhatsApp/E-Mail** an die Chefin: „Diese Woche 98 % erledigt, 1 Lücke.“
6. **Steuerberater-Export** (CSV) für Betriebsprüfungen.

---

## 6. Technische Schulden, die bewusst eingegangen wurden

| Punkt | Warum jetzt okay | Wann beheben |
|---|---|---|
| Alles in einer JSON-Datei serverseitig | Ein paar Betriebe, wenige MB | Phase 2 (Postgres) |
| Einträge werden lokal alle in den Speicher geladen | Bei 2 Jahren ≈ 6 000 Einträge → wenige MB | Ab ~50 000 Einträgen paginieren |
| Keine Foto-Komprimierung in Varianten | 1280 px reicht für Belege | Wenn Sensoren/Datenblätter dazukommen |
| Ein gemeinsames PIN-Geheimnis pro Rolle | Reicht für Thekentablet | Phase 2: echte Sessions + Rate-Limit |
| Kein Rate-Limit auf `/api/sync` | Kein öffentlicher Angriffsziel im Pi-Betrieb | Vor SaaS-Start (Reverse-Proxy-Limit) |
| Kein i18n-Framework | Nur deutsch | Phase 2 (Oberfläche ist darauf vorbereitet) |

---

## 7. Open-Source-Hinweise

* **Lizenz:** MIT. Der Betrieb soll die Daten und die Software behalten dürfen.
* **Keine Laufzeit-Abhängigkeiten** im Produktcode – kein Supply-Chain-Risiko, keine
  Sicherheitsupdates für Fremdpakete. Nur `jsdom` als Entwickler-Abhängigkeit für Tests.
* **Beitragsregeln (Vorschlag):** Deutsch oder Englisch, jede Änderung an der Nachweis-Logik
  braucht einen Test in `tests/run.mjs`, keine Fachbegriffe in der Oberfläche, jedes neue
  UI-Element muss mit 60-px-Tap-Fläche und Screenreader-Beschriftung kommen.
* **Was nicht in ein öffentliches Repo gehört:** Kunden-/Betriebsdaten (`server/data/` ist
  in `.gitignore`), Schlüssel, Signaturzertifikate für den Play Store.
