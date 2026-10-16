#!/usr/bin/env node
// ── Test: Historize-Zeitreihen → Messzeilen → gleiche Ergebnisse wie die CSV ──
// Aus Messzeilen (Referenz-CSV, falls vorhanden, sonst synthetische Daten aus
// fixtures.mjs) werden drei getrennte Zeitreihen gebaut, wie sie
// GetTrendLineData liefert (Schrittnummer, Zyklusnummer, Leistung; ISO-UTC mit
// Millisekunden, je Symbol leicht versetzte Zeitstempel). Nach dem Zusammenführen
// müssen Filtrationskurven und Schrittdauern exakt den direkten Ergebnissen entsprechen.
import { computeFiltrationCurves, computeStepDurations } from "../index.js";
import { referenceRows, syntheticRows, noteSkippedReference } from "./fixtures.mjs";
import { mergeHistorizeSeries, looksCompressed, rawDisplayWidth } from "../adapters/historize.js";
import { assert, assertEqual, report } from "../../test/_assert.mjs";

const REF = referenceRows();
if (!REF) noteSkippedReference("analytics-historize");
const rows = REF || syntheticRows();

// Historize-Format: { x: '2026-10-07T07:35:37.79Z', y }
const iso = (s) => new Date(s * 1000).toISOString();
function toHistorize(src, offsets) {
  const pts = (key, off, map) => src.map((r) => ({ x: iso(r.ts + off), y: map ? map(r) : r[key] }));
  const step = pts("step", offsets.step);
  step[0].flags = "Start";
  return { step, cycle: pts("cycleNo", offsets.cycle), metrics: { leistung: pts("leistung", offsets.leistung) } };
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// 1) Zeitstempel je Symbol um Millisekunden versetzt (realistisch)
{
  const h = toHistorize(rows, { step: 0.012, cycle: 0.004, leistung: 0.021 });
  const merged = mergeHistorizeSeries(h, { machine: "AC1118", toleranceS: 30 });
  assertEqual(merged.length, rows.length, "Merge: eine Zeile je Schritt-Zeitstempel");
  assert(merged.every((r, i) => r.ts === rows[i].ts && r.step === rows[i].step && r.cycleNo === rows[i].cycleNo), "Merge: Zeit, Schritt, Zyklus wie CSV");
  assert(merged.every((r, i) => r.leistung === rows[i].leistung), "Merge: Leistung wie CSV");

  const fCsv = computeFiltrationCurves(rows, {}).groups[0];
  const fHis = computeFiltrationCurves(merged, {}).groups[0];
  assertEqual(fHis.n, fCsv.n, `Filtration (Historize): ${fCsv.n} Zyklen wie direkt gerechnet`);
  assert(fCsv.n > 0, "Filtration: Testdaten enthalten auswertbare Zyklen");
  assertEqual(fHis.median, fCsv.median, "Filtration (Historize): Median-Kurve identisch zur CSV");
  assertEqual(fHis.q1, fCsv.q1, "Filtration (Historize): 25. Perzentil identisch");
  assertEqual(fHis.q3, fCsv.q3, "Filtration (Historize): 75. Perzentil identisch");
  if (REF) assert(near(fHis.fit.y0, 16.7, 0.05) && near(fHis.fit.A, 49.7, 0.05) && near(fHis.fit.tau, 28.2, 0.05), "Filtration (Historize): Referenzwerte y0/A/τ");

  const sCsv = computeStepDurations(rows, {});
  const sHis = computeStepDurations(merged, {});
  assertEqual(sHis.groups.map((g) => [g.group, g.total.sum, g.total.n]), sCsv.groups.map((g) => [g.group, g.total.sum, g.total.n]), "Schrittdauern (Historize): identisch zur direkten Rechnung");
  assertEqual(sHis.categories.map((c) => c.total.mean), sCsv.categories.map((c) => c.total.mean), "Schrittdauern (Historize): Kategorien identisch");
}

// 2) Leistung fehlt zeitweise / liegt außerhalb der Toleranz → null, Zeile bleibt
{
  const h = toHistorize(rows.slice(0, 500), { step: 0, cycle: 0, leistung: 0 });
  h.metrics.leistung = h.metrics.leistung.filter((_p, i) => i % 5 !== 0); // jeder 5. Punkt fehlt
  const merged = mergeHistorizeSeries(h, { toleranceS: 5 });
  assertEqual(merged.length, 500, "Lücken: Zeilenanzahl bleibt");
  assertEqual(merged.filter((r, i) => i % 5 === 0).every((r) => r.leistung === null), true, "Lücken: fehlende Leistung → null (nicht Nachbarwert)");
}

// 3) Zyklusnummer erst nach dem ersten Schrittpunkt vorhanden → Zeilen davor entfallen
{
  const h = toHistorize(rows.slice(0, 100), { step: 0, cycle: 0, leistung: 0 });
  h.cycle = h.cycle.slice(10);
  assertEqual(mergeHistorizeSeries(h, { toleranceS: 5 }).length, 90, "Zyklus fehlt am Anfang: Zeilen ohne Zyklusnummer werden verworfen");
}

// 4) Verdichtung erkennen, displayWidth für Rohdaten
assertEqual(rawDisplayWidth(3, 10), 32410, "displayWidth: 3 Tage à 10 s = 25.920 Rohpunkte + 25 % Reserve");
assert(!looksCompressed(new Array(25920), 32410), "Verdichtung: Rohdaten erkannt");
assert(looksCompressed(new Array(1000), 1000), "Verdichtung: Punktzahl = displayWidth → verdichtet");

report("analytics-historize");
