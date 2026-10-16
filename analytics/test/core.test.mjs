#!/usr/bin/env node
// ── Test der Berechnungsmodule ──
// A) Immer (synthetische Daten, siehe fixtures.mjs – bekannte Sollwerte):
//    CSV-Adapter, Filtrationskurven (Modell findet die erzeugten Parameter),
//    Schrittdauern (Summen = Zeilen × 60 s), Verlauf/Korrelation (unabhängig
//    nachgerechnet), Ausschluss, Grenzwerte, Wochen, step_events, Zeitzonen.
// B) Nur mit Referenz-CSV (fixtures/2026-06_2.CSV, wegen echter Maschinendaten
//    nicht im Repo); SQLite-Vergleiche zusätzlich nur mit den Referenz-JSONs
//    (reference/*.json, aus der CSV erzeugt, ebenfalls nicht im Repo):
//    Filtrationskurven gegen die App (96 Zyklen → y0 16,7 · A 49,7 · τ 28,2 % · R² 0,970),
//    Schrittdauern und Verlauf gegen unabhängige SQLite-Nachbildung des Original-SQL.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  parseMachineCsv, computeFiltrationCurves, computeStepDurations, computeStepDurationsFromEvents,
  computeReport, computeCorrelation, stepName, stepGroup, catalogNoForText, dayKey, weekKey, isBeschickStep, pearson,
} from "../index.js";
import { makePauseVariant } from "./reference/pauseVariant.mjs";
import { referenceData, syntheticRows, noteSkippedReference } from "./fixtures.mjs";
import { assert, assertEqual, report } from "../../test/_assert.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// Referenz-JSONs sind aus der Referenz-CSV abgeleitet und ebenfalls nicht im Repo
// (.gitignore). Erzeugen siehe analytics/README.md → "Referenzen neu erzeugen".
const REF_JSON = ["step_durations.json", "step_durations_pausen.json", "report.json"];
const refJsonPath = (name) => path.join(here, "reference", name);
const refJson = (name) => JSON.parse(readFileSync(refJsonPath(name), "utf8"));
const near = (a, b, tol) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) <= tol);

// ════════════════ A) Synthetische Daten (laufen immer) ════════════════
const syn = syntheticRows();

// ── CSV-Adapter mit künstlichem Export im Maschinenformat ──
{
  const csv = [
    "Ser.Nr.;Zyklus-Nr;Datum;Zeit;Druck-Zulauf;Druck-Membran;Druck-Hydraulik;Leistung-Pumpe;Neigung;Behälter-Niveau;Zyklus-Zeit;Leistung;Zyklusdurchsatz;Druckindex;Schritt;",
    "SIM01;7;08.06.2026;12:24:57;  -0,0;   0,0;   266;     0; -0,34;   -25;0;     0;     0;   0,0;kein Schritt aktiv",
    "SIM01;7;08.06.2026;12:25:57;   3,1;   0,0;   266;    83; -0,34;   -25;0;  41,2;     0;   1,0;Beschicken Druckstufe 3",
    "SIM01;7;08.06.2026;12:26:57;   3,2;   0,0;   266;    83; -0,34;   -25;0;  42,0;     0;   1,0;Unbekannter Schritt",
  ].join("\r\n");
  const { rows, unknownSteps } = parseMachineCsv(csv);
  assertEqual(rows.length, 3, "CSV: alle Datenzeilen gelesen");
  assertEqual(rows[0].machine, "SIM01", "CSV: Seriennummer aus Spalte Ser.Nr.");
  assertEqual(rows[0].step, 99, "CSV: 'kein Schritt aktiv' → Katalog 99");
  assertEqual(rows[1].step, 8, "CSV: Schritttext → Katalognummer");
  assertEqual(rows[0].ts, Date.UTC(2026, 5, 8, 12, 24, 57) / 1000, "CSV: Zeitstempel als UTC (wie die App)");
  assertEqual(rows[1].leistung, 41.2, "CSV: Dezimalkomma");
  assertEqual(rows[2].step, 1000, "CSV: unbekannter Schritttext → Nummer ab 1000 (nicht gewertet)");
  assertEqual(unknownSteps, { "Unbekannter Schritt": 1000 }, "CSV: unbekannte Schritttexte gemeldet");
}

// ── Filtrationskurven: Modell findet die erzeugten Parameter wieder ──
{
  const r = computeFiltrationCurves(syn, { xMode: "norm" });
  const g = r.groups[0];
  assertEqual(r.info.usable, 30, "Synth/Filtration: 30 auswertbare Zyklen");
  assertEqual(g.grid.length, 51, "Synth/Filtration: Raster 0–100 % in 2-%-Schritten");
  assertEqual(g.minN, 3, "Synth/Filtration: minN = max(2, ⌈0,1·N⌉)");
  assert(g.fit.A > 45 && g.fit.A < 55, `Synth/Filtration: A im erzeugten Bereich 45–55 (ist ${g.fit.A.toFixed(2)})`);
  assert(g.fit.y0 > 8 && g.fit.y0 < 12, `Synth/Filtration: y0 im erzeugten Bereich 8–12 (ist ${g.fit.y0.toFixed(2)})`);
  assert(g.fit.tau > 25 && g.fit.tau < 35, `Synth/Filtration: τ im erzeugten Bereich 25–35 % (ist ${g.fit.tau.toFixed(2)})`);
  assert(g.fit.r2 > 0.99, "Synth/Filtration: R² > 0,99 bei modellgetreuen Daten");
  const withPause = r.flagged.filter((f) => f.reasons.some((s) => s.startsWith("Beschickung durch Pause unterbrochen")));
  assertEqual(withPause.length, 6, "Synth/Filtration: 6 Zyklen mit Pause in der Beschickung erkannt");
  assert(withPause.every((f) => f.reasons[0].includes("3 min herausgeschnitten")), "Synth/Filtration: Pausenzeit (3 min) herausgeschnitten");
  const key = r.flagged[0].key;
  const rx = computeFiltrationCurves(syn, { excluded: [key] });
  assertEqual(rx.info.excluded, 1, "Synth/Filtration: manueller Ausschluss zählt");
  assert(rx.flagged.find((f) => f.key === key).excluded, "Synth/Filtration: ausgeschlossener Zyklus bleibt gelistet");
  assertEqual(rx.groups[0].n, 29, "Synth/Filtration: Ausschluss wirkt auf die Kurven");
  assertEqual(computeFiltrationCurves(syn, { groupBy: "machine" }).groups[0].label, "SIM01", "Synth/Filtration: Gruppierung nach Maschine");
  const rMin = computeFiltrationCurves(syn, { xMode: "min" });
  const gm = rMin.groups[0].grid, stepMin = gm[1] - gm[0];
  const mant = stepMin / 10 ** Math.floor(Math.log10(stepMin));
  assert([1, 2, 2.5, 5].some((m) => near(mant, m, 1e-9)), `Synth/Filtration (min): "schöne" Rasterweite (ist ${stepMin} min)`);
  assert(gm.length >= 24 && gm.length <= 61, `Synth/Filtration (min): 24–61 Rasterpunkte (ist ${gm.length})`);
}

// ── Schrittdauern: Summen exakt = Anzahl Zeilen × 60 s (60-s-Takt) ──
{
  const r = computeStepDurations(syn, {});
  const expected = {};
  for (const row of syn) {
    const g = stepGroup(row.step);
    if (!g) continue;
    expected[g] = (expected[g] || 0) + 60;
  }
  for (const g of r.groups) assertEqual(g.total.sum, expected[g.group], `Synth/Schritte: ${g.group} = Zeilen × 60 s`);
  assertEqual(r.groups.map((g) => g.group), ["Schließen", "Beschicken", "Nachpressen Membran", "Kuchenpflege", "Öffnen", "Kuchenauswurf", "Pause"], "Synth/Schritte: Reihenfolge laut Katalog, Pause zuletzt");
  assertEqual(r.info.pauseCycles, 6, "Synth/Schritte: 6 Zyklen mit Pause");
  assertEqual(r.info.pauseS, 6 * 3 * 60, "Synth/Schritte: Pausensumme 6 × 3 min");
  assert(r.flagged.filter((f) => f.reasons[0].startsWith("Pause")).length === 6, "Synth/Schritte: Zyklen mit Pause gelistet");
  assert(near(r.groups.reduce((a, g) => a + (g.share || 0), 0), 1, 1e-9), "Synth/Schritte: Anteile summieren sich zu 1");
  const beschickRows = syn.filter((x) => isBeschickStep(x.step)).length;
  assertEqual(r.groups[1].total.sum, beschickRows * 60, "Synth/Schritte: Beschicken = Beschickungszeilen × 60 s");
  assertEqual(r.groups[1].children.length, 5, "Synth/Schritte: Beschicken hat 5 Unterschritte");
  assertEqual(r.categories[2].total.sum, r.categories[0].total.sum + r.categories[1].total.sum, "Synth/Schritte: Prozesszeit = Aktiv + Neben");
  assertEqual(r.buckets.length, 4, "Synth/Schritte: 4 Tage");
  const rl = computeStepDurations(syn, { limits: [{ group: "Beschicken", minS: null, maxS: 30 * 60 }] });
  assert(rl.info.limitExcluded > 0, `Synth/Schritte: Grenzwert schließt Hauptschritt aus (${rl.info.limitExcluded}×)`);
  assertEqual(rl.groups[1].total.n, 30 - rl.info.limitExcluded, "Synth/Schritte: ausgeschlossene Hauptschritte fehlen in der Statistik");
  const rw = computeStepDurations(syn, { bucket: "week" });
  assert(rw.buckets.every((b) => new Date(b + "T00:00:00Z").getUTCDay() === 1), "Synth/Schritte: Wochen beginnen am Montag");
}

// ── Verlauf / Korrelation: unabhängig nachgerechnet ──
{
  const rep = computeReport(syn, { columns: [{ key: "leistung", agg: "avg" }, { key: "leistung_pumpe", agg: "avg" }, { key: "druck_zulauf", agg: "max" }], groupBy: "schritt" });
  assertEqual(rep.n, syn.length, "Synth/Report: n = alle Zeilen");
  const byDay = {};
  for (const row of syn) (byDay[dayKey(row.ts, "UTC")] = byDay[dayKey(row.ts, "UTC")] || []).push(row);
  const days = Object.keys(byDay).sort();
  assertEqual(rep.days, days, "Synth/Report: Tage");
  days.forEach((d, i) => {
    const v = byDay[d].map((x) => x.leistung);
    assert(near(rep.kpis[0].daily[i], v.reduce((a, b) => a + b, 0) / v.length, 1e-9), `Synth/Report: Tagesmittel ${d}`);
    const pump = byDay[d].map((x) => (isBeschickStep(x.step) ? x.leistung_pumpe : 0));
    assert(near(rep.kpis[1].daily[i], pump.reduce((a, b) => a + b, 0) / pump.length, 1e-9), `Synth/Report: Pumpe außerhalb 5–9 = 0 (${d})`);
  });
  const g11 = rep.groups.find((x) => x.label === stepName(11));
  assertEqual(g11.n, 18, "Synth/Report: Gruppe 'Pause B1 leer' mit 18 Zeilen");
  const cor = computeCorrelation(syn, { x: "druck_zulauf", y: "leistung", groupBy: "none" });
  assert(near(cor.r, pearson(syn.map((x) => x.druck_zulauf), syn.map((x) => x.leistung)), 1e-12), "Synth/Korrelation: Pearson-r");
  assertEqual(cor.n, syn.length, "Synth/Korrelation: n");
  assert(cor.points.length <= 500, "Synth/Korrelation: ≤ 500 Punkte");
  const th = computeReport(syn, { columns: [{ key: "leistung", agg: "min" }], thresholds: [{ metric: "leistung", op: "gt", value: 20 }] });
  assert(th.kpis[0].value > 20, "Synth/Report: Grenzwertfilter auf Messwert-Ebene");
}

// ── step_events-Variante: exakte Dauern ──
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

// ── Zeitzonen ──
{
  const ts = Date.UTC(2026, 5, 7, 22, 30) / 1000; // So 07.06. 22:30 UTC = Mo 08.06. 00:30 MESZ
  assertEqual(dayKey(ts, "UTC"), "2026-06-07", "Zeitzone: UTC-Tag");
  assertEqual(dayKey(ts, "Europe/Berlin"), "2026-06-08", "Zeitzone: lokaler Tag (Europe/Berlin)");
  assertEqual(weekKey(ts, "UTC"), "2026-06-01", "Zeitzone: Woche (UTC) beginnt Mo 01.06.");
  assertEqual(weekKey(ts, "Europe/Berlin"), "2026-06-08", "Zeitzone: Woche (Berlin) beginnt Mo 08.06.");
}

// ════════════════ B) Referenz-CSV (nur wenn vorhanden) ════════════════
const REF = referenceData();
if (!REF) {
  noteSkippedReference("analytics-core");
} else {
  const rows = REF.rows;
  const pauseRows = parseMachineCsv(makePauseVariant(REF.text)).rows;

  assertEqual(rows.length, 20009, "Ref/CSV: alle Datenzeilen gelesen");
  assertEqual(rows[0].machine, "AC1118", "Ref/CSV: Seriennummer");

  // Filtrationskurven gegen die Maschinendaten-App
  {
    const r = computeFiltrationCurves(rows, { xMode: "norm" });
    const g = r.groups[0];
    assertEqual(r.info.usable, 96, "Ref/Filtration: 96 auswertbare Zyklen");
    assert(near(g.fit.y0, 16.7, 0.05), `Ref/Filtration: y0 ≈ 16,7 (ist ${g.fit.y0.toFixed(3)})`);
    assert(near(g.fit.A, 49.7, 0.05), `Ref/Filtration: A ≈ 49,7 (ist ${g.fit.A.toFixed(3)})`);
    assert(near(g.fit.tau, 28.2, 0.05), `Ref/Filtration: τ ≈ 28,2 % (ist ${g.fit.tau.toFixed(3)})`);
    assert(near(g.fit.r2, 0.970, 0.0005), `Ref/Filtration: R² ≈ 0,970 (ist ${g.fit.r2.toFixed(4)})`);
    assertEqual(g.minN, 10, "Ref/Filtration: minN");
    assert(g.cycles.every((c) => c.x.length <= 150), "Ref/Filtration: Einzelkurven auf ≤ 150 Punkte ausgedünnt");
    const rp = computeFiltrationCurves(pauseRows, {});
    assert(rp.flagged.filter((f) => f.reasons.some((s) => s.startsWith("Beschickung durch Pause unterbrochen"))).length >= 5, "Ref/Filtration: Pausen in der Beschickung erkannt");
    assertEqual(rp.info.usable, 96, "Ref/Filtration: Pause beendet den Beschickungsblock nicht");
  }

  const missingJson = REF_JSON.filter((f) => !existsSync(refJsonPath(f)));
  if (missingJson.length) {
    console.log(`  ℹ analytics-core: Referenz-JSONs fehlen (${missingJson.join(", ")}) – SQLite-Vergleiche übersprungen. Erzeugen: siehe analytics/README.md.`);
  } else {
    // Schrittdauern gegen SQLite-Nachbildung des Original-SQL
    const checkSteps = (label, r, R) => {
      const cmp = (name, a, b) => {
        for (const k of ["n", "sum", "mean", "median"]) assert(near(a[k], b[k], 1e-6), `${label}/${name}: ${k} ${a[k]} = ${b[k]}`);
      };
      for (const g of r.groups) cmp(g.group, g.total, g.category === "pause" ? R.pause : R.groups[g.group]);
      assertEqual(r.groups.filter((g) => g.category !== "pause").map((g) => g.group).sort(), Object.keys(R.groups).sort(), `${label}: Hauptschritte`);
      cmp("Aktivzeit", r.categories[0].total, R.cat.active);
      cmp("Nebenzeit", r.categories[1].total, R.cat.secondary);
      cmp("Prozesszeit", r.categories[2].total, R.cat.total);
      assertEqual(r.info.cycles, R.cycles, `${label}: Zyklen`);
    };
    checkSteps("Ref/Schritte", computeStepDurations(rows, {}), refJson("step_durations.json"));
    {
      const rp = computeStepDurations(pauseRows, {});
      const R = refJson("step_durations_pausen.json");
      checkSteps("Ref/Schritte+Pause", rp, R);
      const runsOf = (f) => { if (!f.reasons[0].startsWith("Pause")) return 0; const m = f.reasons[0].match(/[(](\d+)×[)]/); return m ? Number(m[1]) : 1; };
      assertEqual(rp.flagged.reduce((a, f) => a + runsOf(f), 0), R.pauseRuns, "Ref/Schritte+Pause: Anzahl Pausenläufe wie Referenz");
    }

    // Verlauf / Balken / Streu gegen SQLite-Referenz
    {
      const R = refJson("report.json");
      const rep = computeReport(rows, { columns: [{ key: "leistung", agg: "avg" }, { key: "leistung_pumpe", agg: "avg" }, { key: "druck_zulauf", agg: "max" }], groupBy: "schritt" });
      assertEqual(rep.n, R.n, "Ref/Report: n");
      assertEqual(rep.days, R.days, "Ref/Report: Tage");
      rep.kpis[0].daily.forEach((v, i) => assert(near(v, R.avg[i], 1e-9), `Ref/Report: Tagesmittel ${rep.days[i]}`));
      rep.kpis[0].dailySd.forEach((v, i) => assert(near(v, R.sd[i], 1e-9), `Ref/Report: Tages-SD ${rep.days[i]}`));
      rep.kpis[1].daily.forEach((v, i) => assert(near(v, R.pump[i], 1e-9), `Ref/Report: Pumpe (${rep.days[i]})`));
      for (const [txt, [n, mx]] of Object.entries(R.groups)) {
        const g = rep.groups.find((x) => x.label === stepName(catalogNoForText(txt)));
        assert(g && g.n === n && near(g.values[2], mx, 1e-9), `Ref/Report: Gruppe ${txt}`);
      }
      const cor = computeCorrelation(rows, { x: "druck_zulauf", y: "leistung", groupBy: "none" });
      assert(near(cor.r, R.r, 1e-9), "Ref/Korrelation: Pearson-r");
      assertEqual(cor.n, R.np, "Ref/Korrelation: n");
    }
  }
}

report("analytics-core");
