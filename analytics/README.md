# AC Analytics – Auswerte-Widgets für TwinCAT HMI

Übertragung der Widgets **Filtrationskurven**, **Schrittdauern** und **Verlaufsplot (Graph)** aus der Maschinendaten-App (`C:\projects\MachineDataStack`) in die TcHMI-Welt. Der **Zyklusvergleich** folgt später.

Reine ES-Module ohne Abhängigkeiten. Sie laufen im Browser und in Node, also in einer TcHMI-Server-Extension oder einem kleinen Dienst. Es gibt keinen DOM-Zugriff in den Berechnungen.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `core/` | **Berechnung** – reine Funktionen: Messzeilen rein, Ergebnis-JSON raus (gleiches Format wie die API der App) |
| `plots/runtime.js` | **Darstellung** – Plotly-`data`/`layout` und Kennwert-Tabellen, ES5 und backslash-frei, wird vom Generator in TcHMI-Code eingebettet |
| `server/handler.js` | **Server-Baustein** – Anfrage des HMI-Bausteins → passende `compute*`-Funktion |
| `adapters/machineCsv.js` | Maschinen-CSV-Export → Messzeilen (Tests, Offline-Auswertung) |
| `adapters/historize.js` | GetTrendLineData-Antwort (Schritt, Zyklus, Leistung als getrennte Zeitreihen) → Messzeilen |
| `plots/coreEntry.js` | Einstieg für den eingebetteten Rechenkern `AC_CORE` (Berechnung im Browser) |
| `demo/` | Fertige Ergebnis-JSONs aus der Referenz-CSV zum Testen in der HMI ohne Server |
| `scripts/` | `build-runtime.mjs` (Laufzeit für den Generator), `build-demo.mjs` (Demo-JSONs) |
| `test/` | Referenztests (siehe unten) |

### Übertragene Quellen

| App (TypeScript) | Hier (JS) |
|---|---|
| `backend/src/lib/step-catalog.ts` | `core/stepCatalog.js` |
| `backend/src/lib/stats-math.ts` (+ PERCENTILE_CONT, STDDEV_SAMP, corr aus dem SQL) | `core/statsMath.js` |
| `backend/src/lib/metrics.ts` | `core/metrics.js` |
| `backend/src/services/filtration-curves.ts` | `core/filtrationCurves.js` |
| `backend/src/services/step-durations.ts` (SQL-Fensterfunktionen in JS nachgebildet) | `core/stepDurations.js` |
| `backend/src/services/stats.ts` → `getReport()`, `getCorrelation()` | `core/trendReport.js` |
| `frontend/src/components/{FiltrationCurve,StepDuration,GraphWidget}View.tsx`, `theme/plotly.ts` | `plots/runtime.js` |

## Eingangsdaten: Messzeilen

```js
{ machine: 'AC1118', cycleNo: 2753, ts: 1780921497 /* Epoche s */, step: 6 /* SPS-Schritt */,
  leistung: 41.2, druck_zulauf: 3.1, …weitere Kennzahlen, material: null, customer: null }
```

Jede Zeile braucht **Zeitstempel, Maschine, Zyklusnummer und Schrittnummer**. Zyklusstart und Zyklus-Zeit werden wie beim Import der App gebildet (`core/cycles.js`). Die DB-Abfrage gegen das HMI-Schema (PostgreSQL oder SQLite) liegt beim Aufrufer. Sie sollte schon nach Maschine und Zeitraum filtern.

Für Schrittdauern mit exakten Schrittwechseln (Tabelle `step_events`) gibt es `computeStepDurationsFromEvents()`. Damit entfällt die Lücken-Heuristik.

## Ergebnis-Funktionen

```js
import { computeFiltrationCurves, computeStepDurations, computeReport, computeCorrelation } from './analytics/index.js';
computeFiltrationCurves(rows, { xMode: 'norm', groupBy: 'none', excluded: [], timeZone: 'Europe/Berlin' });
computeStepDurations(rows, { bucket: 'day', activeGroups: null, limits: [], excluded: [] });
computeReport(rows, { columns: [{ key: 'leistung', agg: 'avg' }], groupBy: 'tag' });
computeCorrelation(rows, { x: 'druck_zulauf', y: 'leistung', groupBy: 'none' });
```

**Zeitzone:** Die App ordnet Tage in UTC zu. Weil die CSV-Zeiten dort „als UTC“ gespeichert werden, entspricht das der Maschinenuhr. Für die HMI mit echten Zeitstempeln `timeZone: 'Europe/Berlin'` verwenden.

## Anbindung in der HMI (Generator-Baustein „Auswertung“)

### Historize (Standard): Rohdaten vom HMI-Server, Berechnung im Panel

Für Filtrationskurven und Schrittdauern. Der Baustein fragt `<Domain>.GetTrendLineData` ab (`TcHmiPostgresHistorize` oder `TcHmiSqliteHistorize`), führt die Zeitreihen zusammen und rechnet mit dem eingebetteten Rechenkern (`AC_CORE`, aus `analytics/core` gebündelt, ca. 33 KB).

- **Symbole:** Schrittnummer, Zyklusnummer, für Filtrationskurven zusätzlich die Filtrationsleistung. Jeweils voller Pfad wie in der `historizedSymbolList`.
- **Rohdaten statt Verdichtung:** Laut Test vom 07.10.2026 liefert der Server Rohdaten, wenn der Zeitraum weniger Punkte hat als `displayWidth`. Der Baustein setzt `displayWidth = Tage × 86.400 / Intervall × 1,25 + 10`. Kommen trotzdem rund `displayWidth` Punkte, meldet er „verdichtet“ statt falsche Schrittzeiten zu rechnen.
- **Zusammenführen** (`adapters/historize.js`): Takt ist die Schrittnummer-Reihe. Die Zyklusnummer gilt ab ihrem letzten Wert, die Leistung wird dem nächsten Punkt innerhalb des halben Intervalls zugeordnet.
- **Messung:** 20.000 Rohpunkte je Symbol in Chromium mit 6-fach gedrosselter CPU: Filtrationskurven ca. 0,7 s, Schrittdauern ca. 2,4 s von der Antwort bis zur fertigen Darstellung.
- **Noch nicht in der HMI geprüft:** ob der Server `displayWidth`-Werte im Bereich 25.000–35.000 annimmt (getestet war 1.000).

### HTTP / Server-Symbol: fertiges Ergebnis

Hier rechnet der Baustein nicht selbst. Er holt das Ergebnis-JSON und zeichnet es:

- **HTTP GET:** fertige JSON-Datei, z. B. die Demo-Dateien. `demo/*.json` nach `Assets/ac-analytics-demo/` im HMI-Projekt kopieren. Das ist die Standard-URL des Bausteins und zum Testen ohne Server gedacht. Optionen und Filter aus dem Editor wirken dabei nicht.
- **HTTP POST:** Anfrage-JSON im Body, Antwort = Ergebnis-JSON.
- **TcHMI-Server-Symbol:** `requestEx` ReadWrite mit `writeValue` = Anfrage-JSON und `readValue` = Ergebnis (Objekt oder JSON-String).

Anfrage-JSON (siehe `server/handler.js`):

```json
{ "widget": "filtration", "options": { "xMode": "norm", "groupBy": "none", "excluded": [] },
  "filter": { "machines": ["AC1118"], "lastDays": 30 }, "timeZone": "Europe/Berlin" }
```

> **Noch nicht in der HMI verifiziert:** POST und Server-Symbol (die Server-Seite existiert noch nicht) sowie das Rendering mit `plotly-3.6.0.min.js` in der echten HMI. Geprüft ist: Code-Erzeugung, Ablauf im Stub (Node) und ein Ende-zu-Ende-Test mit HTTP GET und echtem Plotly 3.7 in Chromium.

## Tests und Referenzen

`node analytics/test/core.test.mjs` (läuft auch in `npm test`):

- **Filtrationskurven** gegen die Referenzwerte der App: `2026-06_2.CSV` (AC1118, 96 Zyklen) ergibt y0 16,7 · A 49,7 · τ 28,2 % · R² 0,970.
- **Schrittdauern** gegen eine unabhängige SQLite-Nachbildung des Original-SQL (`test/reference/step_durations_sqlite.py`). Geprüft wird zusätzlich mit eingestreuten Pausen (`test/reference/pauseVariant.mjs`), weil die Referenz-CSV keine Pausenschritte enthält.
- **Historize** (`test/historize.test.mjs`): Die Referenz-CSV wird in drei getrennte Zeitreihen im GetTrendLineData-Format zerlegt (ISO-UTC mit ms, je Symbol versetzte Zeitstempel). Nach dem Zusammenführen sind Filtrationskurven und Schrittdauern identisch zur CSV.
- **Verlauf/Balken/Streu** gegen eine unabhängige SQLite-Referenz (`test/reference/report_sqlite.py`): Tagesmittel, Tages-SD, Gruppen, Pearson-r.

Referenzen neu erzeugen (Python 3):

```
python3 analytics/test/reference/step_durations_sqlite.py analytics/test/fixtures/2026-06_2.CSV > analytics/test/reference/step_durations.json
node analytics/test/reference/pauseVariant.mjs analytics/test/fixtures/2026-06_2.CSV /tmp/pausen.CSV
python3 analytics/test/reference/step_durations_sqlite.py /tmp/pausen.CSV > analytics/test/reference/step_durations_pausen.json
python3 analytics/test/reference/report_sqlite.py analytics/test/fixtures/2026-06_2.CSV > analytics/test/reference/report.json
```

> `test/fixtures/2026-06_2.CSV` enthält echte Maschinendaten (AC1118). Vor einem Push auf öffentliche Remotes (GitHub Pages) prüfen, ob die Datei ins Repo soll.

## Abweichungen von der App (bewusst, für die HMI)

- **x-Achsen** von Verlauf und Schrittdauern: `type: 'date'` statt Kategorien, damit sich die Beschriftungen nicht überlappen. Das war in der App ein offener Punkt.
- **Zahlenformat** in Plotly: deutsche Trennzeichen (`separators: ',.'`).
- **Legende** beim Verlaufsplot oben statt unten, damit sie nicht mit gedrehten Gruppenbeschriftungen kollidiert.
- **Filtrationskurven (HMI-Fassung)** fest: x-Achse in % der Beschickungsdauer, nur Median + Band (25.–75. Perzentil), keine Einzellinien, kein Sättigungsmodell, keine Gruppierung. Gruppierung nach Material folgt später. Der Rechenkern kann weiterhin alles.
- **Auffällige Zyklen** sind in der HMI eine reine Anzeige. Ausschließen per Checkbox braucht die Server-Anbindung (`options.excluded`) und kommt später.
- **Gruppierung „Schritt“** im Verlauf nutzt die Katalognamen; unbekannte Schritttexte erscheinen als „Schritt N“ statt mit ihrem Text.
