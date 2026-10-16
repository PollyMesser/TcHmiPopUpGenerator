#!/usr/bin/env node
// ── Demo-Ergebnisse für den HMI-Test (ohne Server) ──
// Rechnet die Referenz-CSV durch und schreibt fertige Ergebnis-JSONs nach
// analytics/demo/. Diese Dateien in den HMI-Projektordner Assets/ac-analytics-demo/
// kopieren; der Baustein "Auswertung" lädt sie per HTTP GET (Standard-URL).
//   node analytics/scripts/build-demo.mjs [csv]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseMachineCsv, decodeCsvBuffer } from "../adapters/machineCsv.js";
import { computeForRequest } from "../server/handler.js";
import { DEMO_JOBS } from "./demoJobs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csv = process.argv[2] || path.join(root, "test", "fixtures", "2026-06_2.CSV");
if (!existsSync(csv)) {
  console.error("✗ CSV nicht gefunden: " + csv + "\n  Aufruf: node analytics/scripts/build-demo.mjs <maschinen-export.csv>");
  process.exit(1);
}
const { rows } = parseMachineCsv(decodeCsvBuffer(readFileSync(csv)));
const out = path.join(root, "demo");
mkdirSync(out, { recursive: true });
const jobs = DEMO_JOBS;
for (const [file, params] of Object.entries(jobs)) {
  const res = computeForRequest(params, rows);
  writeFileSync(path.join(out, file), JSON.stringify(res));
  console.log("✓", file, (JSON.stringify(res).length / 1024).toFixed(0) + " KB");
}
