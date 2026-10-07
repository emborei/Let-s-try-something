# 03 · Datenmodell, Zeitvertrauen, Sync und Integrität

Ziel: **So einfach wie möglich, so belastbar wie nötig.** Alles ist als JSON lesbar und
ließe sich notfalls mit einem Texteditor wiederherstellen.

---

## 1. Überblick

**Lokal im Gerät** (IndexedDB, Fallback LocalStorage/RAM):

| Sammlung | Inhalt |
|---|---|
| `meta` | Einstellungen (`id: "settings"`), `lastHash`, `deviceId`, `deviceToken`, `serverSeq`, `currentUserId`, Zähler |
| `users` | Personen: `id, name, role, pinHash, pinSalt, active, createdAt` |
| `tasks` | Kontrollen/Stammdaten: was ist täglich/wöchentlich fällig, in welcher Schicht |
| `entries` | **Der Nachweis.** Ein Dokument pro durchgeführter Kontrolle |
| `photos` | Belege (Base64-JPEG, verkleinert auf 1280 px, + SHA-256) |
| `outbox` | Warteschlange für die Übertragung |
| `audit` | Änderungsprotokoll (Kontrollen/Personen angelegt, geändert, gelöscht) |

**Auf dem Server** (JSON-Datei + append-only-Journal):

| Datei | Inhalt |
|---|---|
| `data/db.json` | Geräte + Token, alle Einträge mit `tsServer`/`serverSeq`/`serverHash`, letzte Stammdaten, Eigenkette |
| `data/journal.jsonl` | Eine Zeile pro Ereignis (Geräteanmeldung, Sync) – nur anhängen, nie ändern |

---

## 2. Die wichtigsten Dokumente

### `settings` (in `meta`)

```jsonc
{
  "id": "settings",
  "schema": 1,
  "business": { "name": "Kneipe Zur Ecke", "street": "Hauptstr. 12", "city": "44135 Dortmund",
                "owner": "Marlene Krämer", "phone": "", "healthOffice": "Gesundheitsamt Dortmund" },
  "plan": "free",                                   // free | pro
  "slots": [                                        // Schichten = Zeitfenster für Erinnerungen
    { "id": "frueh", "label": "Frühschicht", "from": "07:00", "to": "13:00" },
    { "id": "spaet", "label": "Spätschicht",  "from": "13:00", "to": "23:00" }
  ],
  "reminders": { "enabled": true, "pushEnabled": false,
                 "quietFrom": "23:30", "quietTo": "07:00", "repeatMin": 30 },
  "ui": { "fontsize": "m", "theme": "auto" },        // m | l | xl  ·  auto | light | dark
  "compliance": { "retentionMonths": 24, "keepRawDays": 400 },
  "server": { "url": "https://…", "autoRegisterExports": true },
  "onboardingDone": true
}
```

### `tasks` – eine Kontrolle / ein Gerät / ein Bereich

```jsonc
{
  "id": "uuid",
  "kind": "temp",                    // temp | clean | goods | core
  "title": "Kühlschrank Küche",      // so wie im Betrieb gesprochen wird
  "min": 2, "max": 7, "unit": "°C",  // Sollbereich (nur temp sinnvoll)
  "slots": ["frueh", "spaet"],       // leer = ganztags, keine Uhrzeit-Erinnerung
  "everyDays": 1,                    // 1 = täglich, 7 = wöchentlich, 30 = monatlich
  "weekdays": null,                  // z. B. [1] = nur montags
  "requireValue": true,              // Zahlwert Pflicht
  "requirePhoto": false,
  "hint": "Thermometer ins obere Fach legen.",
  "order": 20,                       // Sortierung auf dem Bildschirm
  "active": true,
  "createdAt": 1791000000000, "updatedAt": 1791000000000
}
```

### `entries` – der Nachweis (das Herzstück)

```jsonc
{
  "id": "uuid",
  "schema": 1,
  "taskId": "uuid",
  "kind": "temp",
  "taskTitle": "Kühlschrank Küche",          // Kopie!
  "taskSnapshot": { "title": "Kühlschrank Küche", "kind": "temp",
                    "min": 2, "max": 7, "unit": "°C", "hint": "…" },

  "userId": "uuid", "userName": "Marlene",   // Kopie – Umbenennen verändert die Vergangenheit nicht

  "dayKey": "2026-10-07",                    // lokaler Kalendertag (Gruppierung)
  "tsClient": 1791341520000,                 // Gerätezeit beim Erfassen
  "tsServer": 1791341520000,                 // Serverzeit (maßgeblich), null bis übertragen
  "tzOffset": 120,                            // Zeitzonenversatz in Minuten (+Sommerzeit)
  "serverSeq": 412, "serverHash": "…", "serverHashPrev": "…",

  "value": 4.5,                              // Messwert (null bei „nur abgehakt“)
  "unit": "°C",
  "ok": true,                                // true | false | null  (Bewertung)
  "note": "neue Lieferung eingeräumt",

  "goods": null,                             // bei Wareneingang:
  // { "supplier": "Getränke Meier", "temp": 4.2, "mhdOk": true, "packagingOk": true,
  //   "smellOk": true, "rejected": false, "rejectReason": "" }

  "corrective": { "actions": ["Tür geschlossen / Dichtung geprüft"], "note": "…" },  // Pflicht bei ok:false

  "photoIds": ["uuid"],                      // Fotos (nur Inhalt-Hash + Daten, kein Fremdspeicher)

  "action": "create",                        // create | correct
  "correctionOf": null,                      // id des ursprünglichen Eintrags
  "correctionReason": null,                  // Pflicht bei Korrektur
  "replacedBy": null,                        // wird am ALTEN Eintrag gesetzt
  "replacedReason": null, "replacedAt": null,

  "hashPrev": "…",                           // Hash des Vorgängers (Kette)
  "hash": "…",                               // SHA-256 über hashPrev + kanonischen Inhalt
  "createdAt": 1791341520000
}
```

**Bewusste Entscheidungen:**

* **Kopien statt Verweise** (`taskTitle`, `taskSnapshot`, `userName`): Der Nachweis darf
  sich nicht rückwirkend ändern, wenn jemand ein Gerät umbenennt oder eine Person entfernt.
* **`dayKey` lokal berechnet**: Was für den Wirt „gestern“ war, bleibt gestern – auch nach
  Zeitzonenwechsel oder Reise.
* **Kein `delete`**: Einträge werden nie entfernt. Korrekturen sind neue Einträge.

### `photos`

```jsonc
{ "id": "uuid", "entryId": "uuid", "dataUrl": "data:image/jpeg;base64,…",
  "sha256": "…", "width": 1024, "height": 768, "bytes": 84000, "ts": 1791341520000 }
```

Verkleinerung auf maximal 1280 px und JPEG-Qualität 0,72 (Faustregel: < 120 kB pro Foto).
Fotos sind im kostenlosen Tarif auf 2 Stück begrenzt – nicht aus Geiz, sondern weil Speicher
im Browser knapp ist (alte Tablets!).

### `outbox` – Warteschlange

```jsonc
{ "id": "uuid", "type": "entry.add" | "entry.correct",
  "payload": { "id": "…", "digest": "…", "hash": "…", "hashPrev": null, … },
  "createdAt": 1791341521000, "tries": 0, "lastError": null }
```

---

## 3. Zeitvertrauen („trusted time“)

```
Start
 ├─ await fetch('/api/time')            → { now, chainValid, seq }   (eigener Server)
 ├─ Fallback: worldtimeapi.org / timeapi.io  (nur wenn kein eigener Server)
 ├─ Fallback: HTTP-"Date"-Header irgendeiner erreichbaren Antwort (sekundengenau)
 └─ sonst: keine Quelle erreichbar
Versatz = serverNow + RTT/2 − Date.now()      (auf Sekunden gerundet)
"frisch" = Versatz wurde in den letzten 30 Minuten geholt (isFresh())
App-Zeit = Date.now() + Versatz                (monoton während der Sitzung)
```

* `stamp()` liefert `{ tsClient, tsServer, tz, trusted, source }`.
* Der Eintrag bekommt immer `tsClient`. `tsServer` wird vorläufig auf denselben Wert
  gesetzt, wenn die Zeit als vertrauenswürdig gilt, und **nach dem Sync** durch den echten
  Serverstempel ersetzt.
* Der Server prüft: weicht `tsClient` um mehr als 10 Minuten von seiner Zeit ab, verwendet
  er seine eigene Zeit und setzt `clockAnomaly` in den Eintrag (dokumentiert die Auffälligkeit
  statt sie zu verstecken).
* Anzeige in der App: „Serverzeit 07.10.2026, 08:12 Uhr“ **oder** „Gerätezeit … (nicht
  geprüft)“.

---

## 4. Integrität: die Hash-Kette

```
hash(n) = SHA256( hash(n-1)         ‖  canonicalJSON(Inhalt(n)) )
                     ↑ „GENESIS“ beim ersten Eintrag
canonicalJSON = Schlüssel alphabetisch, keine Leerzeichen, null-stabil
```

Warum **kanonisches JSON**? Weil `JSON.stringify` die Reihenfolge der Objektschlüssel
beibehält – bei Objekten, die aus unterschiedlichen Quellen stammen, ist das nicht
garantiert. Sortierte Schlüssel machen den Hash reproduzierbar (Browser, Server, Test).

**Was fällt auf?**

| Manipulation | Erkennungsart |
|---|---|
| Messwert/Notiz/Person in einem Eintrag ändern | `type: "hash"` – Inhalt passt nicht zur Prüfsumme |
| Eintrag aus der Datenbank entfernen | `type: "chain"` – nachfolgender Eintrag hängt an nichts |
| Einträge umsortieren/umbauen | `type: "chain"` – Eintrag ist von der Kette nicht erreichbar |
| Alle Einträge neu schreiben (Angreifer mit Gerätezugriff) | lokal nicht erkennbar → **Server-Kette** und Journal schlagen Alarm, weil der Server seine eigene Historie hat |

**Korrekturen und Nachträge:** Der neue Eintrag wird ganz normal ans Kettenende gehängt und
verweist über `correctionOf` auf den alten. Damit bleibt die Kette linear, und der Nachtrag
ist im Protokoll als „(Korrektur)“ markiert.

**Prüfung** gibt es zweimal: im Browser (`verifyChain()` in `app/js/core/sync.js`) und auf
dem Server (`/api/verify`). Beide laufen unabhängig über die jeweils eigene Kette.

---

## 5. Sync-Protokoll (bewusst winzig)

```
POST /api/devices/register   { businessName, userName, deviceId? }
  → 200 { deviceId, token, serverTime, version }

POST /api/sync   Header: x-device-token
  { deviceId, sinceSeq, clientTime, business, plan, tasks[], events[] }
  events[] = { id, tsClient, dayKey, taskId, taskTitle, kind, value, ok, unit,
               userName, userId, tzOffset, note, goods, corrective, photoIds,
               action, correctionOf, correctionReason, digest, hash, hashPrev }
  → 200 { ok, serverTime, seq, accepted, skipped, clockCorrected, stamped[],
          chainValid }
  stamped[] = { id, tsServer, seq, serverHash, serverHashPrev, clockAnomaly }
```

Eigenschaften:

* **Idempotent:** Doppelte IDs werden übersprungen (`skipped`) – kein Doppeleintrag bei
  Funklöchern und Wiederholungen.
* **Robust:** Schlägt die Übertragung fehl, bleibt die Warteschlange erhalten und der
  Versuchszähler steigt. Kein Datenverlust, keine Sperre.
* **Antwort schreibt zurück:** `stamped` aktualisiert `tsServer`/`serverHash` lokal – so
  zeigt die App den echten Serverstempel an.
* **Stammdaten fahren mit:** `tasks`/`business`/`plan` gehen mit jedem Sync mit, damit der
  Server ein PDF ohne Browser erzeugen kann.
* **Keine Auth-Komplexität im MVP:** Gerätetoken pro Installation. Für Multi-Standort
  kommt Betriebscode + Magic-Link für die Chefin dazu (Roadmap).

### API-Endpunkte

| Route | Zweck |
|---|---|
| `GET /api/health` | Lebenszeichen + Version (auch für Uptime-Monitoring) |
| `GET /api/time` | Serverzeit, Sequenz, Kettenstatus |
| `POST /api/devices/register` | Gerät anmelden |
| `POST /api/sync` | Einträge übertragen |
| `GET /api/export/<YYYY-MM>.pdf` | Monatsbericht (auch `?token=…` für E-Mail-Links) |
| `GET /api/export/tag/<YYYY-MM-DD>.pdf` | Tagesnachweis |
| `GET /api/export/offen.pdf?tag=…` | Arbeitsliste „noch offen“ |
| `GET /api/verify` | Integritätsprüfung der Serverkette |
| `GET /api/stats` | Geräte, Einträge, Zeitraum, Abweichungen, Kettenstatus |

---

## 6. Speicherstrategie & Fallbacks

```
openDb() Versuch 1: IndexedDB   (praktisch unbegrenzt, Fotos möglich)
        Versuch 2: LocalStorage (bei alten/privaten Browsern; ca. 5 MB → Fotos gesperrt)
        Versuch 3: RAM          (letzter Notausgang; App warnt deutlich in der Fußzeile)
```

* `requestPersistentStorage()` bittet das System um dauerhaften Speicher
  (schützt vor automatischem Aufräumen durch Android).
* `navigator.storage.estimate()` ist in der Verwaltung sichtbar.
* **SHA-256-Fallback in reinem JS** (`util.js`): `crypto.subtle` fehlt in unsicheren
  Kontexten (http:// im WLAN!). Ohne Fallback hätte ein Kneipen-Tablet ohne HTTPS keine
  Hashes – deshalb ist der Fallback Teil des Vertrauensmodells.

---

## 7. Aufbewahrung, Löschen, Datenschutz

* **Aufbewahrung**: Einstellung `compliance.retentionMonths` (Standard 24). Die App löscht
  **nie** automatisch; der Hinweis erscheint im PDF.
* **Löschen** ist nur als kompletter Neustart in *Verwalten → Daten & Notfall* möglich
  (mit Warnung und Empfehlung, vorher eine Sicherung zu ziehen).
* **Personenbezug**: gespeichert werden Name, Rolle, optional PIN-Hash (SHA-256 mit Salt,
  4 000 Runden). Keine E-Mail, kein Telefon, kein Standort, kein Tracking, keine Cookies.
* **Fotos**: nur lokale Speicherung im MVP; für die Cloud-Variante ist EU-Speicherung mit
  AV-Vertrag Pflicht (Auftragsverarbeitung nach Art. 28 DSGVO).
* **Sicherung**: JSON-Export enthält alles und ist selbst wieder importierbar
  (`format: "kneipencheck-backup"`).

---

## 8. Grenzen des Modells (bewusst offen benannt)

1. **JSON-Datei als Serverspeicher** skaliert für Hunderte Betriebe, nicht für Hunderttausende
   Einträge. Ab ~100 MB DB-Datei auf PostgreSQL/Supabase wechseln (Schnittstelle bleibt).
2. **Lokale Hash-Kette** schützt gegen nachträgliche Manipulation *innerhalb* der Datenbank,
   nicht gegen jemanden mit voller Gerätekontrolle – dafür braucht es Serverkette,
   externes Journal oder RFC-3161-Zeitstempel.
3. **Foto-Hashes** sichern die Existenz, nicht die Aufnahmezeit. Ein Foto kann älter sein
   als der Eintrag – das ist bei Papierbelegen aber genauso.
4. **Gerätezeit im Offline-Betrieb** ist nur so gut wie die Uhr des Geräts. Deshalb wird
   die Abweichung nachträglich geprüft und im Eintrag vermerkt.
