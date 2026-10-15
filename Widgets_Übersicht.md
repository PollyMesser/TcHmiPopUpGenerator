# Übertragung der Auswerte-Widgets in TwinCAT HMI (TcHMI)

Stand: 15.10.2026 · Quelle: Repo `MachineDataStack` (ws12, `C:\projects\MachineDataStack`)

Ziel: Die Widgets **Filtrationskurven**, **Schrittdauern**, **Verlaufsplot (Graph)** und **Zyklusvergleich** aus der Maschinendaten-App in eine TcHMI-Anwendung übernehmen. Die Daten liegen dort historisiert in **PostgreSQL oder SQLite**. Für Live-Werte gibt es bereits Plotly.js-Plots.

## Rahmenbedingungen

- **Nur reines JavaScript** (ES6-Module), kein React, kein Build-Schritt mit Framework. Die React-Komponenten der App dienen nur als Vorlage für die Plotly-Traces und Layouts. Übernommen werden die erzeugten `data`/`layout`-Objekte, nicht die Komponenten.
- Die Rechenlogik in `backend/src/services/filtration-curves.ts` und `step-durations.ts` ist reines TypeScript ohne Abhängigkeiten außer der Datenbankabfrage. Sie wird nach JS übertragen (Typen entfernen) und in zwei Teile getrennt:
    1. **Datenzugriff** (SQL gegen das HMI-Schema, Adapter je DB),
    2. **Berechnung** (reine Funktionen: Zeilen rein, Ergebnis-JSON raus).
- Der HMI-Client hat keinen direkten Zugriff auf die Datenbank. Die Abfrage und Berechnung laufen serverseitig (TcHMI-Server-Extension oder ein kleiner Dienst). Der Client erhält das Ergebnis-JSON und zeichnet mit `Plotly.react`. Die Berechnungsmodule müssen deshalb sowohl im Browser als auch in Node lauffähig sein (keine DOM-Zugriffe).
- Modulare Struktur: getrennte Dateien für Berechnung, Plot-Aufbau (Traces/Layout) und Farben/Theme.

## Benötigte Daten in der HMI-Historie

Jede Messzeile braucht **Zeitstempel, Maschine, Zyklusnummer und SPS-Schrittnummer**. Alle Widgets ordnen die Daten über Zyklus und Schritt zu. Ein reiner Zeitwert-Verlauf je Symbol reicht nicht. Liegen die Symbole einzeln historisiert vor, müssen sie über den Zeitstempel zusammengeführt werden.

|Signal|Filtrationskurven|Schrittdauern|Verlaufsplot|Zyklusvergleich|
|---|---|---|---|---|
|Zeitstempel, Maschine|✔|✔|✔|✔|
|Zyklusnummer|✔|✔|(Filter)|✔|
|Schrittnummer|✔|✔|✔ (Pumpe)|✔|
|Filtrationsleistung `leistung` [l/(m²·h)]|✔|–|optional|✔|
|Zyklus-Durchsatz [1/h]|–|–|optional|✔|
|Zykluszeit aus der SPS [min], je Zyklus|–|–|optional|✔|
|Drücke, Pumpe, Neigung, Niveau|–|–|optional|–|
|Material/Kunde (optional)|Gruppierung|–|Gruppierung|–|

Empfohlenes Schema, wenn die SPS selbst schreibt:

```sql
samples(machine, ts, cycle_no, step, leistung, zyklus_durchsatz, druck_zulauf, …)  -- periodisch
step_events(machine, cycle_no, step, ts_start, ts_end)  -- bei jedem Schrittwechsel
cycles(machine, cycle_no, ts_start, ts_end, cycle_time_min, material, customer)
```

Mit `step_events` sind die Schrittdauern exakt. Die Lücken-Heuristik (siehe Schrittdauern, Punkt 1) entfällt dann.

## Schrittkatalog (Grundlage für alle Widgets)

Quelle: `backend/src/lib/step-catalog.ts`

- **Beschicken** = Schritte 5–9
- **Pause** = 10–16, als eigene Pausenzeit, nicht Teil der Prozesszeit
- **Prozessschritte** = 1–23
- **Nicht gewertet:** 0, 24, 90–99 und alle unbekannten Schritte
- **Aktivzeit:** Beschicken, Nachpressen Membran (19), Kuchenpflege (20)
- **Nebenzeit:** übrige Prozessschritte, also Schließen (1–4), Spaltwäsche (17–18), Öffnen (21–22), Kuchenauswurf (23)
- **Pumpenleistung:** außerhalb der Schritte 5–9 auf 0 gesetzt, also `leistung_pumpe × (step ∈ 5–9)`. Fehlende Werte bleiben `null`.

## Filtrationskurven

Quelle: `services/filtration-curves.ts`, Darstellung `FiltrationCurveView.tsx`

1. **Beschickungsblock je Zyklus:**
    - Er beginnt mit der ersten Zeile in Schritt 5–9.
    - Eine Pause (10–16) beendet den Block nicht. Die Pausenzeit wird aus der Zeitachse herausgeschnitten.
    - Jeder andere Prozessschritt beendet den Block.
    - Es zählt nur der erste Block. Beschickungen unter 60 s werden verworfen.
2. **x-Achse:** `norm` = 0–100 % der Beschickungsdauer (Standard) oder `min` = Minuten ab Beginn der Beschickung.
3. **Raster:**
    - `norm`: 2-%-Schritte, 51 Punkte.
    - `min`: etwa 60 Punkte mit Schrittweite 1/2/2,5/5·10ᵏ. Das Raster endet bei der Dauer des minN-längsten Zyklus.
4. **Median-Kurve:**
    - Jeder Zyklus wird linear auf das Raster interpoliert (ohne Extrapolation).
    - Je Rasterpunkt werden Median, Q1 und Q3 berechnet, nur wo `nAt ≥ minN = max(2, ⌈0,1·N⌉)`.
    - Quantile werden linear interpoliert wie `PERCENTILE_CONT` (`lib/stats-math.ts`).
5. **Sättigungsmodell** `y = A − (A − y0)·e^(−x/τ)`:
    - Gewichtete Anpassung an die **Median-Kurve**, Gewicht = `nAt`.
    - Für festes τ ist das Modell linear, eine lineare Regression reicht.
    - τ: Gittersuche über log τ von xmax/200 bis 20·xmax (120 Stufen), dann 40 Schritte Goldener Schnitt.
    - Ausgaben: R², `t95 = 3τ`, `saturated = 3τ ≤ xmax`.
6. **Auffällige Zyklen:**
    - Tukey-Zäune (1,5·IQR, ab 4 Werten) auf Beschickungsdauer und Endwert.
    - Zusätzlich markiert: Pause in der Beschickung, mehrere Beschickungsphasen.
7. **Gruppierung:** keine, Material, Kunde oder Maschine. „ohne …“ steht ans Ende.
8. **Ausgabe je Gruppe:** `label`, `n`, Mediane (Dauer, Start, Ende), `cycles[]` (auf ≤ 150 Punkte ausgedünnt), `grid`, `median`, `q1`, `q3`, `nAt`, `minN`, `fit{A, y0, tau, t95, r2, saturated, y[]}`. Dazu kommen `flagged[]` und `info`.
9. **Plotly:**
    - Einzelzyklen als Linien, Breite 1, Deckkraft `clamp(8/N, 0.06, 0.25)`.
    - Band: Q3 mit `width: 0`, dann Q1 mit `fill: 'tonexty'` und Alpha 0,16.
    - Median mit Breite 2,5. Modell gestrichelt.
    - Reihenfolge: zuerst alle Einzelkurven, dann die Annäherungen.
    - y-Obergrenze = 90. Perzentil der Zyklus-Maxima × 1,1.
10. **Referenz zum Testen:** 2026-06_2.CSV (AC1118, 96 Zyklen) ergibt y0 16,7 · A 49,7 · τ 28,2 % · R² 0,970.

## Schrittdauern

Quelle: `services/step-durations.ts`, Darstellung `StepDurationView.tsx`

1. **Dauer je Messzeile** = Abstand zur nächsten Messung derselben Maschine, auch über die Zyklusgrenze hinweg. Fehlt die nächste Messung oder ist der Abstand größer als 3 × Median-Intervall der Maschine, wird das Median-Intervall angesetzt (Standard 60 s). Mit `step_events` nicht nötig.
2. Summe je (Zyklus, Schritt). Aufeinanderfolgende Pausenschritte zählen als **eine** Pause.
3. Unterschritte werden zu Hauptschritten zusammengefasst, in der Reihenfolge der kleinsten Katalognummer.
4. **Grenzwerte je Hauptschritt** (min/max in Minuten): Bei Verletzung fällt dieser Hauptschritt in diesem Zyklus heraus.
5. **Auffällig:** Dauer über `Q3 + max(1,5·IQR, 0,5·Median, 180 s)`. Ein Zyklus mit Pause wird immer gelistet.
6. **Zeitachse:** Tag oder Woche (Montag) des Zyklusstarts.
7. **Kategorien:**
    - Aktivzeit, Nebenzeit, Prozesszeit gesamt.
    - Es zählen nur Zyklen mit Aktivzeit.
    - Die Pause ist eine eigene Reihe.
8. **Ausgabe:** `buckets[]` sowie `groups[]` und `categories[]` mit `series: FullStat[]` (parallel zu den Buckets), `total`, `share`, `children[]`. Dabei gilt `FullStat = {n, mean, sd, median, min, max, sum}` in **Sekunden**.
9. **Plotly:**
    - Farbe = Reihe, Strichart = Statistik (`lib/stepCategories.ts`).
    - Ø mit ±1 SD als Band.
    - Summe als halbtransparente Balken; neben anderen Statistiken auf der rechten Achse `y2`.
    - Feste Farben: Aktivzeit = c1, Nebenzeit = c3, gesamt = c5, Pause = c6.

## Verlaufsplot (Graph)

Quelle: `getReport()` / `getCorrelation()` in `services/stats.ts`, Darstellung `GraphWidgetView.tsx`

- **Linie:**
    - Je Tag und Kennzahl ein Aggregat (`avg/min/max/sum/median`). Bei `avg` zusätzlich die Stichproben-SD für das ±SD-Band.
    - Gleiche Einheit teilt sich eine y-Achse, sonst `y2, y3 …`. Ab der dritten Achse mit `anchor: 'free'` und `autoshift`.
    - Achsfarbe = Farbe der ersten Kennzahl auf der Achse.
    - Range ab 0, bei negativen Werten ab Min, jeweils mit 8 % Puffer.
- **Balken:** Aggregat je Gruppe (Material, Seriennummer, Schritt, Tag, Kunde).
- **Streudiagramm:** x/y-Rohwerte, gleichmäßig auf ≤ 500 Punkte ausgedünnt, mit Pearson-r.
- **Zeitzone:** In der App erfolgt die Tageszuordnung in UTC. Für die HMI ist lokale Zeit vorzuziehen.

## Zyklusvergleich

Quelle: `getCycleCompare()` in `services/stats.ts`, Darstellung `CycleCompareView.tsx`

- **Eingang:** eine Maschine und mehrere Bereiche von Zyklusnummern (`von–bis`, mit Bezeichnung).
- **Je Zyklus:**
    - Zykluszeit = SPS-Wert.
    - Durchsatz = **letzte** Messung (zeitlich) von `zyklus_durchsatz` in einem Prozessschritt. Der Wert ist kumuliert.
    - Filtrationsleistung = **Maximum** über alle Messungen des Zyklus.
- **x** = `cycle_no − von`. Damit liegen die Bereiche übereinander.
- **Ausgabe je Bereich:** `points[{x, cycleNo, value}]`, dazu Ø/Md/Min/Max für alle drei Kennzahlen.
- **Plotly:** eine `lines+markers`-Reihe je Bereich, darunter eine Kennwert-Tabelle.

## PostgreSQL / SQLite

- **PostgreSQL:** Die SQL-Abfragen aus `stats.ts` und `step-durations.ts` sind weitgehend übertragbar.
- **SQLite:**
    - `LEAD`, `LAG` und `SUM() OVER` sind vorhanden (ab 3.25).
    - Es fehlen `PERCENTILE_CONT`, `STDDEV_SAMP`, `corr()` und `date_trunc`. Median, SD und r werden deshalb in JS berechnet; Tag und Woche über `strftime`.
- **x-Achsen:** In der App nutzen Verlauf und Schrittdauern `type: 'category'`. Daher überlappen die Beschriftungen bei vielen Daten (offener Punkt). In der HMI stattdessen `type: 'date'` verwenden, beim Zyklusvergleich `dtick` automatisch statt fest `1`.

## Dateien, die gesichtet werden sollten

Alle Pfade relativ zu `C:\projects\MachineDataStack`.

**Berechnung (Kern, nach JS übertragen):**

|Datei|Inhalt|
|---|---|
|`backend/src/services/filtration-curves.ts`|Filtrationskurven komplett: Beschickungsblock, Raster, Median/Band, Sättigungsmodell, Auffälligkeiten|
|`backend/src/services/step-durations.ts`|Schrittdauern: SQL (Fensterfunktionen, Pausenläufe) und Verdichtung, Kategorien, Ausreißer|
|`backend/src/services/stats.ts`|`getReport()` (Verlauf/Balken), `getCorrelation()` (Streudiagramm), `getCycleCompare()` (Zyklusvergleich)|
|`backend/src/lib/step-catalog.ts`|Schrittkatalog mit Nummern, Hauptschritten und Kategorien|
|`backend/src/lib/stats-math.ts`|`quantileSorted()`, `fullStat()`|
|`backend/src/lib/metrics.ts`|Kennzahlen, Einheiten, Pumpen-Ausdruck, Aggregationen, Gruppierungen|

**Nur zum Nachschlagen:**

|Datei|Inhalt|
|---|---|
|`backend/src/db/schema.ts`|Tabellenstruktur der App (Abgleich mit dem HMI-Schema)|
|`backend/src/routes/report.ts`|Parameter der Endpunkte (Optionen der Widgets)|
|`backend/src/lib/filters.ts`|Filtersemantik (Zeitraum, Grenzwerte auf Zyklus- und Messwert-Ebene)|
|`frontend/src/api/types.ts`|Typen der Ergebnis-JSONs|

**Darstellung (React, nur Plotly-`data`/`layout` übernehmen):**

|Datei|Inhalt|
|---|---|
|`frontend/src/components/FiltrationCurveView.tsx`|Traces, Band, Achsbegrenzung, Kennwert-Tabelle|
|`frontend/src/components/StepDurationView.tsx`|Traces je Statistik, SD-Band, Summen-Balken, `y2`|
|`frontend/src/components/GraphWidgetView.tsx`|Achszuordnung je Einheit, SD-Band, Balken, Streudiagramm|
|`frontend/src/components/CycleCompareView.tsx`|Traces und Kennwert-Tabelle|
|`frontend/src/lib/stepCategories.ts`|Statistik-Optionen (Strichart), Wochenbeschriftung, s→min|
|`frontend/src/theme/plotly.ts`|Farbpalette, Achsstil, `withAlpha()`|
|`frontend/src/lib/format.ts`|Zahlen- und Datumsformat (de-DE)|

**Nicht relevant:** Import, Ingest, Auth, Report-Export, State-Management (`state/`, `api/hooks.ts`), übrige Komponenten.

**Zusätzlich:** Das Projekt-Doc `claude/Schrittkatalog.md` (Claude-Projekt „Maschinendaten“) enthält die fachlichen Regeln zum Schrittkatalog.