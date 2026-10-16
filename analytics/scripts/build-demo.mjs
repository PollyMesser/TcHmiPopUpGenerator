#!/usr/bin/env node
// ── Demo-Ergebnisse für den HMI-Test (ohne Server) ──
// Rechnet die Referenz-CSV durch und schreibt fertige Ergebnis-JSONs nach
// analytics/demo/. Diese Dateien in den HMI-Projektordner Assets/ac-analytics-demo/
// kopieren; der Baustein "Auswertung" lädt sie per HTTP GET (Standard-URL).
//   node analytics/scripts/build-demo.mjs [csv]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseMachineCsv, decodeCsvBuffer } from "../adapters/machineCsv.js";
import { computeForRequest } from "../server/handler.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csv = process.argv[2] || path.join(root, "test", "fixtures", "2026-06_2.CSV");
const { rows } = parseMachineCsv(decodeCsvBuffer(readFileSync(csv)));
const out = path.join(root, "demo");
mkdirSync(out, { recursive: true });
const tz = "Europe/Berlin";
const jobs = {
  "filtration.json": { widget: "filtration", options: { xMode: "norm", groupBy: "none" }, timeZone: tz },
  "filtration-min.json": { widget: "filtration", options: { xMode: "min", groupBy: "none" }, timeZone: tz },
  "steps.json": { widget: "steps", options: { bucket: "day" }, timeZone: tz },
  "steps-week.json": { widget: "steps", options: { bucket: "week" }, timeZone: tz },
  "trend-line.json": { widget: "trend", options: { columns: [{ key: "leistung", agg: "avg" }, { key: "druck_zulauf", agg: "avg" }], groupBy: "tag" }, timeZone: tz },
  "trend-bar.json": { widget: "trend", options: { columns: [{ key: "leistung", agg: "avg" }, { key: "druck_zulauf", agg: "max" }], groupBy: "schritt" }, timeZone: tz },
  "trend-scatter.json": { widget: "scatter", options: { x: "druck_zulauf", y: "leistung", groupBy: "none" }, timeZone: tz },
};
for (const [file, params] of Object.entries(jobs)) {
  const res = computeForRequest(params, rows);
  writeFileSync(path.join(out, file), JSON.stringify(res));
  console.log("✓", file, (JSON.stringify(res).length / 1024).toFixed(0) + " KB");
}
