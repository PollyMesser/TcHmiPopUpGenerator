// ── Testdaten für die Analytics-Tests ──
// referenceRows(): echte Referenz-CSV (fixtures/2026-06_2.CSV, AC1118). Liegt
//   wegen echter Maschinendaten NICHT im Repo (.gitignore) – fehlt sie, liefert
//   die Funktion null und die Referenzwert-Prüfungen werden übersprungen.
// syntheticRows(): künstliche, deterministische Messzeilen im selben Format
//   (60-s-Takt, Schrittfolge laut Katalog, Sättigungsverlauf der Leistung,
//   Pausen in der Beschickung, mehrere Tage). Damit laufen alle übrigen Tests
//   auch ohne echte Daten, z. B. im Forgejo-Runner.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseMachineCsv, decodeCsvBuffer } from "../adapters/machineCsv.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REFERENCE_CSV = path.join(here, "fixtures", "2026-06_2.CSV");

let refCache;
/** @returns {{ rows: object[], text: string } | null} */
export function referenceData() {
  if (refCache !== undefined) return refCache;
  if (!existsSync(REFERENCE_CSV)) { refCache = null; return null; }
  const buf = readFileSync(REFERENCE_CSV);
  refCache = { rows: parseMachineCsv(decodeCsvBuffer(buf)).rows, text: buf.toString("latin1") };
  return refCache;
}
export const referenceRows = () => { const r = referenceData(); return r ? r.rows : null; };

/** Einheitlicher Hinweis, wenn Referenzprüfungen entfallen */
export function noteSkippedReference(label) {
  console.log(`  ℹ ${label}: Referenz-CSV fehlt (${path.relative(process.cwd(), REFERENCE_CSV)}) – Referenzwert-Prüfungen übersprungen, Tests laufen mit synthetischen Daten.`);
}

// Deterministischer Zufall (LCG), damit die Daten bei jedem Lauf identisch sind
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Künstliche Messzeilen: `cycles` Zyklen einer Maschine, 60-s-Takt, verteilt auf mehrere Tage.
 * Jeder 5. Zyklus hat eine Pause (Schritt 11) mitten in der Beschickung.
 */
export function syntheticRows({ cycles = 30, machine = "SIM01", start = Date.UTC(2026, 5, 8, 6, 0, 0) / 1000 } = {}) {
  const rnd = rng(42);
  const rows = [];
  let t = start;
  const push = (cycleNo, step, leistung, extra) => {
    rows.push({ machine, cycleNo, ts: t, step, material: null, customer: null, leistung,
      druck_zulauf: step >= 5 && step <= 9 ? 2 + 2 * rnd() : 0, leistung_pumpe: step >= 5 && step <= 9 ? 80 + 20 * rnd() : 0,
      zyklus_zeit: extra && extra.cycleTime != null ? extra.cycleTime : 0, zyklus_durchsatz: 0, druckindex: 0 });
    t += 60;
  };
  for (let c = 0; c < cycles; c++) {
    const cycleNo = 1000 + c;
    const idle = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < idle; i++) push(cycleNo, 99, 0);
    // Schließen (1–4)
    for (const [st, n] of [[1, 3], [2, 1], [3, 1], [4, 1]]) for (let i = 0; i < n; i++) push(cycleNo, st, 0);
    // Beschickung (5–9) mit Sättigungsverlauf y = A − (A − y0)·e^(−x/τ)
    const beschick = 20 + Math.floor(rnd() * 25);
    const A = 45 + 10 * rnd(), y0 = 8 + 4 * rnd(), tau = 0.25 + 0.1 * rnd();
    const withPause = c % 5 === 2;
    for (let i = 0; i < beschick; i++) {
      const x = i / (beschick - 1);
      const st = i === 0 ? 5 : 6 + Math.min(3, Math.floor(x * 4));
      push(cycleNo, st, +(A - (A - y0) * Math.exp(-x / tau) + (rnd() - 0.5)).toFixed(1));
      if (withPause && i === Math.floor(beschick / 2)) for (let p = 0; p < 3; p++) push(cycleNo, 11, 0);
    }
    // Nachpressen, Kuchenpflege, Öffnen, Auswurf, Ende
    const cycleTime = 60 + Math.floor(rnd() * 30);
    for (const [st, n] of [[19, 8 + Math.floor(rnd() * 6)], [20, 4 + Math.floor(rnd() * 3)], [21, 1], [22, 3], [23, 1], [24, 1]]) {
      for (let i = 0; i < n; i++) push(cycleNo, st, 0, { cycleTime });
    }
    // Zyklen über mehrere Tage verteilen
    if (c % 8 === 7) t += 14 * 3600;
  }
  return rows;
}
