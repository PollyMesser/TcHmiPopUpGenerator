// ── Demo-Abfragen: Dateiname → Anfrage (siehe server/handler.js) ──
// Gemeinsam genutzt von build-demo.mjs (schreibt analytics/demo/*.json) und
// test/analysis-logic.mjs (rechnet dieselben Ergebnisse im Speicher, damit der
// Test weder die Referenz-CSV noch die Demo-Dateien braucht).
const tz = "Europe/Berlin";
export const DEMO_JOBS = {
  "filtration.json": { widget: "filtration", options: { xMode: "norm", groupBy: "none" }, timeZone: tz },
  "filtration-min.json": { widget: "filtration", options: { xMode: "min", groupBy: "none" }, timeZone: tz },
  "steps.json": { widget: "steps", options: { bucket: "day" }, timeZone: tz },
  "steps-week.json": { widget: "steps", options: { bucket: "week" }, timeZone: tz },
  "trend-line.json": { widget: "trend", options: { columns: [{ key: "leistung", agg: "avg" }, { key: "druck_zulauf", agg: "avg" }], groupBy: "tag" }, timeZone: tz },
  "trend-bar.json": { widget: "trend", options: { columns: [{ key: "leistung", agg: "avg" }, { key: "druck_zulauf", agg: "max" }], groupBy: "schritt" }, timeZone: tz },
  "trend-scatter.json": { widget: "scatter", options: { x: "druck_zulauf", y: "leistung", groupBy: "none" }, timeZone: tz },
};
