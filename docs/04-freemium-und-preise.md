# 04 · Freemium-Modell, Preise und Bezahlwege

---

## 1. Warum Freemium hier funktioniert – und wo es kippt

Der Markt ist **träge**. Ein Wirt wechselt seinen Ordner nicht wegen schöner Werbung, sondern
nach einem unangenehmen Erlebnis (Kontrolle, Streit mit dem Amt, neuer Mitarbeiter, der alles
vergisst). Die kostenlose Version muss deshalb **sofort nützlich** sein und darf sich nicht
wie eine Demo anfühlen – sonst wird sie nie im Alltag benutzt und kann folglich auch nicht
weiterempfohlen werden.

**Faustregel für die Gratis-Version:** Sie muss den Betrieb *rechtskonform dokumentieren
können*, aber an den Stellen anstrengend werden, an denen echte, wachsende Betriebe
zusätzlichen Wert brauchen (mehrere Standorte, Historie über 30 Tage, Fotos,
Automatisierung). Wer nur eine Kneipe mit zwei Kühlschränken hat, kommt mit „Kostenlos“
dauerhaft aus – und ist der beste Werbeträger.

---

## 2. Tarife

### Kostenlos – 0 €

| Umfang | Wert |
|---|---|
| Standorte | **1** |
| Benutzer | **bis 3** (1 Chef/in + 2 Mitarbeitende) |
| Kontrollen | **unbegrenzt** (Geräte, Bereiche, Wareneingang) |
| Bericht/Export | **letzte 30 Tage** |
| Tageszettel, Arbeitsliste, Aushang | ✓ |
| Offline-Nutzung | ✓ vollständig |
| Erinnerungen in der App | ✓ vollständig |
| Fotos | 2 als Test (Speichergrenze alter Tablets) |
| Integritätsprüfung, Sicherung | ✓ |
| Support | E-Mail, 3 Werktage |

**Absichtlich großzügig:** Kontrollen, Offline-Betrieb und Erinnerungen sind gratis. Wer
das Gefühl hat, „es funktioniert“, bleibt. Die Grenze bei 30 Tagen Historie ist der
natürlichste Aufhängepunkt für die Aufbewahrungspflicht (2 Jahre) – sie erklärt sich selbst,
ohne künstlich zu wirken.

### KneipenCheck Plus – 9,90 € / Monat pro Standort (99 €/Jahr)

| Umfang | Wert |
|---|---|
| Standorte | unbegrenzt (jeder weitere Standort kostet 5 €) |
| Benutzer | unbegrenzt |
| Historie/Export | **unbegrenzt** (mindestens 24 Monate, passend zur Aufbewahrungspflicht) |
| Monats-PDF automatisch per E-Mail | ✓ (am 1. des Monats, an Chef/in und Steuerbüro) |
| Lücken-Warnung per E-Mail | ✓ („2 Tage ohne Eintrag – bitte nachtragen“) |
| Fotos | unbegrenzt |
| Mehrere Geräte je Standort mit gemeinsamem Datenstand | ✓ |
| Support | Priorität, auch Wochenende, deutschsprachig |

### „Plus Mehrere Standorte“ (Franchise) – ab 29 € / Monat

* Standortvergleich, Sammelbericht, zentrale Personengruppen, CSV/Steuerberater-Export.
* Ab 10 Standorten individuelles Angebot.

### Zusatz-Optionen (Phase 3)

| Option | Preis | Nutzen |
|---|---|---|
| Funk-Temperatursensor (Komplettpaket, 1 Sensor) | 59 € einmalig + 3 €/Monat | Messung ohne Abtippen, nachts automatisch |
| Bluetooth-Thermometer-Anbindung | in Plus enthalten | Temperatur direkt übernehmen |
| Ketten-Verwaltung/Zeitstempel-Verankerung (RFC 3161) | 19 €/Monat | Für Audits, größere Ketten |
| Einrichtungsservice per Telefon | 49 € einmalig | Zielgruppe ohne Geduld für Technik |

---

## 3. Marktvergleich (Recherchestand)

| Anbieter | Preis | Modell |
|---|---|---|
| CheckTouch | ab **14,99 € / Nutzer** / Monat | pro Kopf |
| BackResto | ab **14,90 € / Monat** (Jahresabo), Sensoren inkl. | pro Betrieb |
| gastrotodo | **35 € / Monat** Einstieg | pro Betrieb |
| Rotahr | ab **59 € / Monat** (bis 15 Mitarbeiter) | pro Betrieb |
| ePackPro (Frankreich) | 20–150 € / Monat je Betrieb | pro Betrieb |
| **KneipenCheck Plus** | **9,90 € / Monat pro Standort**, Nutzer unbegrenzt | pro Standort |

**Erkenntnis:** Der „pro Nutzer“-Ansatz ist für die Zielgruppe gefährlich – bei vier Aushilfen
zahlt ein Imbiss 60 €/Monat. Wir rechnen pro Standort und machen Personal unbegrenzt.
Das ist ein Verkaufsargument, kein Rabatt: Es senkt die Hemmschwelle, allen Mitarbeitenden
einen Zugang zu geben – und erhöht damit genau das, was der Wirt braucht (lückenlose
Dokumentation).

---

## 4. Was Wirtinnen wirklich konvertiert

1. **Der Moment der Kontrolle.** „Prüfer steht in der Tür, PDF in 10 Sekunden“ ist der
   stärkste Verkaufsgrund. Deshalb ist das Monats-PDF das Aushängeschild der App – auch in
   der Gratis-Version.
2. **Der 30-Tage-Moment.** Nach einem Monat Nutzung erscheint: „Für den September möchtest
   du vielleicht den vollen Zeitraum exportieren.“ Nicht als Wand, sondern als Hinweis mit
   Vorteilsliste und Preis.
3. **Lücken-Warnung.** Betriebe, die es ernst meinen, möchten informiert werden, wenn zwei
   Tage fehlen. Das ist die Funktion, die Automatisierung verkauft (Plus).
4. **Personalwechsel.** Sobald die vierte Person dazukommt (Saisonkraft), sind die
   Gratis-Grenzen erreicht – der Anlass ist geschäftlich, nicht künstlich.

**Ehrliche Platzierung im Prototyp:** Jeder gesperrte Bereich erklärt *warum* und *was es
kostet*, mit Knopf „Später“ (kein Dark Pattern, kein Countdown, kein Abo-Zwang).

---

## 5. Bezahlung (Umsetzung)

| Weg | Bewertung |
|---|---|
| **Stripe-Abo** (Karte, SEPA-Lastschrift) im Web | Standard, ~1,5 % + 0,25 € pro Transaktion |
| **SEPA-Lastschrift** | Beliebt bei deutschen Kleinbetrieben, wenig Widerspruch |
| **Play-Store-Abo** (Google Play Billing) | Nötig, sobald im Play-Store-Build digital verkauft wird (15 % bis 1 Mio. $/Jahr) |
| **Apple In-App-Purchase** | Wenn in einer iOS-App verkauft wird (15–30 %). Empfehlung: iOS-App nur als „Konto verwalten“ / Verweis aufs Web |
| **Rechnung mit 14 Tagen Zahlungsziel** | Für Ketten/Gastro-Verbände, manuell |

**Preispsychologie für die Zielgruppe:** Monatlich kündbar, keine Einrichtungsgebühr, keine
Mindestlaufzeit. Ein Wirt, der sich „gefangen“ fühlt, kündigt – einer, der kündigen *kann*,
bleibt länger.

---

## 6. Was in der Gratis-Version NICHT fehlt (bewusste Entscheidungen)

* **Keine Werbung.** Bei einer Behörden-Prüf-App an der Theke ist Werbung geschäftsschädigend.
* **Keine Wasserzeichen-Lücken** im PDF. Ein Bericht mit „Upgrade“-Stempel ist vor dem Prüfer
  peinlich – und der Prüfer ist unser Multiplikator.
* **Keine Beschränkung der Kontrollen.** Wer merkt, dass die Kontrolle funktioniert, bleibt.
* **Kein Login/Zwang zur Cloud.** Offline-first ist bei einem WLAN-losen Getränkeseller
  nicht Luxus, sondern Voraussetzung.

---

## 7. Kostenrechnung (grobe Plausibilität)

| Posten | Gratis-Nutzer | Plus-Nutzer |
|---|---|---|
| Server/Storage pro Betrieb/Monat | ~0,05 € (nur JSON + Journal, ein PDF/Monat) | ~0,30 € (Fotos, Historie, E-Mail) |
| Support (angenommen 5 Min/Monat, anteilig) | 0,50 € | 0,60 € |
| Zahlungsgebühren | – | ~0,40 € |
| **Summe** | **~0,55 €** | **~1,30 €** |
| Ertrag | 0 € | 9,90 € |
| **Deckungsbeitrag** | −0,55 € | **+8,60 €** |

→ **Break-even bei ca. 1 Plus-Betrieb auf 16 Gratis-Betriebe.** Das ist mit einem
Freemium-Modell erreichbar, weil Gratis-Nutzer kaum Ressourcen verbrauchen (keine Sensoren,
keine Fotos, selten Abrufe).
