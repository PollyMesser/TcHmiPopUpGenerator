#!/usr/bin/env node
// ── Test der Berechnungsmodule gegen Referenzen ──
//  1. Filtrationskurven: Referenzwerte aus der Maschinendaten-App
//     (2026-06_2.CSV, AC1118, 96 Zyklen → y0 16,7 · A 49,7 · τ 28,2 % · R² 0,970)
//  2. Schrittdauern: unabhängige SQLite-Nachbildung des Original-SQL
//     (reference/step_durations_sqlite.py), ohne und mit Pausen
//  3. Verlauf/Balken/Streu: unabhängige SQLite-Referenz (reference/report_sqlite.py)
//  4. Randfälle: Pausen in der Beschickung, Grenzwerte, Ausschluss, Zeitzonen, step_events
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  parseMachineCsv, decodeCsvBuffer, computeFiltrationCurves, computeStepDurations, computeStepDurationsFromEvents,
  computeReport, computeCorrelation, stepName, catalogNoForText, dayKey, weekKey,
} from "../index.js";
import { makePauseVariant } from "./reference/pauseVariant.mjs";
import { assert, assertEqual, report } from "../../test/_assert.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const csvBuf = readFileSync(path.join(here, "fixtures", "2026-06_2.CSV"));
const { rows } = parseMachineCsv(decodeCsvBuffer(csvBuf));
const pauseRows = parseMachineCsv(makePauseVariant(csvBuf.toString("latin1"))).rows;
const ref = (name) => JSON.parse(readFileSync(path.join(here, "reference", name), "utf8"));
const near = (a, b, tol) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) <= tol);

// ── CSV-Adapter ──
assertEqual(rows.length, 20009, "CSV: alle Datenzeilen gelesen");
assertEqual(rows[0].machine, "AC1118", "CSV: Seriennummer aus Spalte Ser.Nr.");
assertEqual(rows[0].step, 99, "CSV: 'kein Schritt aktiv' → Katalog 99");
assertEqual(rows[0].ts, Date.UTC(2026, 5, 8, 12, 24, 57) / 1000, "CSV: Zeitstempel als UTC (wie die App)");
assert(rows.some((r) => r.leistung > 40 && r.step === 9), "CSV: Dezimalkomma und Kennzahlen gelesen");

// ── 1. Filtrationskurven ──
{
  const r = computeFiltrationCurves(rows, { xMode: "norm" });
  const g = r.groups[0];
  assertEqual(r.info.usable, 96, "Filtration: 96 auswertbare Zyklen");
  assertEqual(g.grid.length, 51, "Filtration: Raster 0–100 % in 2-%-Schritten");
  assert(near(g.fit.y0, 16.7, 0.05), `Filtration: y0 ≈ 16,7 (ist ${g.fit.y0.toFixed(3)})`);
  assert(near(g.fit.A, 49.7, 0.05), `Filtration: A ≈ 49,7 (ist ${g.fit.A.toFixed(3)})`);
  assert(near(g.fit.tau, 28.2, 0.05), `Filtration: τ ≈ 28,2 % (ist ${g.fit.tau.toFixed(3)})`);
  assert(near(g.fit.r2, 0.970, 0.0005), `Filtration: R² ≈ 0,970 (ist ${g.fit.r2.toFixed(4)})`);
  assertEqual(g.minN, 10, "Filtration: minN = max(2, ⌈0,1·N⌉)");
  assert(g.cycles.every((c) => c.x.length <= 150), "Filtration: Einzelkurven auf ≤ 150 Punkte ausgedünnt");
  const rMin = computeFiltrationCurves(rows, { xMode: "min" });
  assert(rMin.groups[0].grid.length > 40 && rMin.groups[0].grid.length <= 62, "Filtration (min): ~60 Rasterpunkte");
  // Ausschluss
  const key = r.flagged[0].key;
  const rx = computeFiltrationCurves(rows, { xMode: "norm", excluded: [key] });
  assertEqual(rx.info.excluded, 1, "Filtration: manueller Ausschluss zählt");
  assert(rx.flagged.find((f) => f.key === key).excluded, "Filtration: ausgeschlossener Zyklus bleibt gelistet (excluded = true)");
  assertEqual(rx.groups[0].n, 95, "Filtration: Ausschluss wirkt auf die Kurven");
  // Gruppierung nach Maschine
  assertEqual(computeFiltrationCurves(rows, { groupBy: "machine" }).groups[0].label, "AC1118", "Filtration: Gruppierung nach Maschine");
  // Pausen in der Beschickung → herausgeschnitten + gelistet
  const rp = computeFiltrationCurves(pauseRows, {});
  const withPause = rp.flagged.filter((f) => f.reasons.some((s) => s.startsWith("Beschickung durch Pause unterbrochen")));
  assert(withPause.length >= 5, `Filtration: Pausen in der Beschickung erkannt (${withPause.length} Zyklen)`);
  assertEqual(rp.info.usable, 96, "Filtration: Pause beendet den Beschickungsblock nicht");
}

// ── 2. Schrittdauern ──
function checkSteps(label, r, R) {
  const cmp = (name, a, b) => {
    for (const k of ["n", "sum", "mean", "median"]) assert(near(a[k], b[k], 1e-6), `${label}/${name}: ${k} ${a[k]} = ${b[k]}`);
  };
  for (const g of r.groups) cmp(g.group, g.total, g.category === "pause" ? R.pause : R.groups[g.group]);
  assertEqual(r.groups.filter((g) => g.category !== "pause").map((g) => g.group).sort(), Object.keys(R.groups).sort(), `${label}: Hauptschritte`);
  cmp("Aktivzeit", r.categories[0].total, R.cat.active);
  cmp("Nebenzeit", r.categories[1].total, R.cat.secondary);
  cmp("Prozesszeit", r.categories[2].total, R.cat.total);
  assertEqual(r.info.cycles, R.cycles, `${label}: Zyklen`);
}
{
  const r = computeStepDurations(rows, {});
  checkSteps("Schritte", r, ref("step_durations.json"));
  assertEqual(r.groups.map((g) => g.group), ["Schließen", "Beschicken", "Nachpressen Membran", "Kuchenpflege", "Öffnen", "Kuchenauswurf"], "Schritte: Reihenfolge laut Katalog");
  assertEqual(r.groups[1].children.length, 5, "Schritte: Beschicken hat 5 Unterschritte");
  assertEqual(r.groups[2].children.length, 0, "Schritte: 1:1-Hauptschritt ohne Unterschritte");
  const share = r.groups.reduce((a, g) => a + (g.share || 0), 0);
  assert(near(share, 1, 1e-9), "Schritte: Anteile summieren sich zu 1");
  assertEqual(r.categories[0].label, "Aktivzeit", "Schritte: Kategorie Aktivzeit");

  const rp = computeStepDurations(pauseRows, {});
  const R = ref("step_durations_pausen.json");
  checkSteps("Schritte+Pause", rp, R);
  assertEqual(rp.groups[rp.groups.length - 1].group, "Pause", "Schritte+Pause: Pause als eigene, letzte Reihe");
  assert(rp.flagged.filter((f) => f.reasons[0].startsWith("Pause")).length === rp.info.pauseCycles, "Schritte+Pause: jeder Zyklus mit Pause ist gelistet");
  const runsOf = (f) => { if (!f.reasons[0].startsWith("Pause")) return 0; const m = f.reasons[0].match(/[(](\d+)×[)]/); return m ? Number(m[1]) : 1; };
  assertEqual(rp.flagged.reduce((a, f) => a + runsOf(f), 0), R.pauseRuns, "Schritte+Pause: Anzahl Pausenläufe wie Referenz");

  // Grenzwerte: Beschicken max 30 min → fällt in langen Zyklen heraus
  const rl = computeStepDurations(rows, { limits: [{ group: "Beschicken", minS: null, maxS: 1800 }] });
  assert(rl.info.limitExcluded > 0, `Schritte: Grenzwert schließt Hauptschritt aus (${rl.info.limitExcluded}×)`);
  assert(rl.groups[1].total.n === 96 - rl.info.limitExcluded, "Schritte: ausgeschlossene Hauptschritte fehlen in der Statistik");
  // Woche
  const rw = computeStepDurations(rows, { bucket: "week" });
  assert(rw.buckets.every((b) => new Date(b + "T00:00:00Z").getUTCDay() === 1), "Schritte: Wochen beginnen am Montag");
}

// step_events-Variante: exakte Dauern
{
  const base = [{ machine: "M1", cycleNo: 1, ts: 1000, step: 1 }];
  const ev = [
    { machine: "M1", cycleNo: 1, step: 1, tsStart: 1000, tsEnd: 1300 },
    { machine: "M1", cycleNo: 1, step: 6, tsStart: 1300, tsEnd: 2500 },
    { machine: "M1", cycleNo: 1, step: 11, tsStart: 2500, tsEnd: 2600 },
    { machine: "M1", cycleNo: 1, step: 12, tsStart: 2600, tsEnd: 2700 },
    { machine: "M1", cycleNo: 1, step: 7, tsStart: 2700, tsEnd: 3000 },
  ];
  const r = computeStepDurationsFromEvents(ev, base, {});
  assertEqual(r.groups.find((g) => g.group === "Beschicken").total.sum, 1500, "step_events: Beschicken = 1200 + 300 s");
  assertEqual(r.info.pauseS, 200, "step_events: zwei aufeinanderfolgende Pausenschritte = eine Pause (200 s)");
  assertEqual(r.categories[0].total.sum, 1500, "step_events: Aktivzeit");
  assertEqual(r.categories[1].total.sum, 300, "step_events: Nebenzeit");
}

// ── 3. Verlauf / Balken / Streu ──
{
  const R = ref("report.json");
  const rep = computeReport(rows, { columns: [{ key: "leistung", agg: "avg" }, { key: "leistung_pumpe", agg: "avg" }, { key: "druck_zulauf", agg: "max" }], groupBy: "schritt" });
  assertEqual(rep.n, R.n, "Report: n");
  assertEqual(rep.days, R.days, "Report: Tage");
  rep.kpis[0].daily.forEach((v, i) => assert(near(v, R.avg[i], 1e-9), `Report: Tagesmittel ${rep.days[i]}`));
  rep.kpis[0].dailySd.forEach((v, i) => assert(near(v, R.sd[i], 1e-9), `Report: Tages-SD ${rep.days[i]}`));
  rep.kpis[1].daily.forEach((v, i) => assert(near(v, R.pump[i], 1e-9), `Report: Pumpe außerhalb 5–9 = 0 (${rep.days[i]})`));
  for (const [txt, [n, mx]] of Object.entries(R.groups)) {
    const g = rep.groups.find((x) => x.label === stepName(catalogNoForText(txt)));
    assert(g && g.n === n && near(g.values[2], mx, 1e-9), `Report: Gruppe ${txt}`);
  }
  const cor = computeCorrelation(rows, { x: "druck_zulauf", y: "leistung", groupBy: "none" });
  assert(near(cor.r, R.r, 1e-9), "Korrelation: Pearson-r");
  assertEqual(cor.n, R.np, "Korrelation: n");
  assert(cor.points.length <= 500, "Korrelation: ≤ 500 Punkte");
  const th = computeReport(rows, { columns: [{ key: "leistung", agg: "min" }], thresholds: [{ metric: "leistung", op: "gt", value: 20 }] });
  assert(th.kpis[0].value > 20, "Report: Grenzwertfilter auf Messwert-Ebene");
}

// ── 4. Zeitzonen ──
{
  const ts = Date.UTC(2026, 5, 7, 22, 30) / 1000; // So 07.06. 22:30 UTC = Mo 08.06. 00:30 MESZ
  assertEqual(dayKey(ts, "UTC"), "2026-06-07", "Zeitzone: UTC-Tag");
  assertEqual(dayKey(ts, "Europe/Berlin"), "2026-06-08", "Zeitzone: lokaler Tag (Europe/Berlin)");
  assertEqual(weekKey(ts, "UTC"), "2026-06-01", "Zeitzone: Woche (UTC) beginnt Mo 01.06.");
  assertEqual(weekKey(ts, "Europe/Berlin"), "2026-06-08", "Zeitzone: Woche (Berlin) beginnt Mo 08.06.");
}

report("analytics-core");
