// ── Widget "Filtrationskurven" – Berechnung ──
// Übertragen aus MachineDataStack backend/src/services/filtration-curves.ts.
// Datenzugriff (SQL) entfernt: Eingang sind Messzeilen (siehe cycles.js),
// Ausgang ist dasselbe Ergebnis-JSON wie GET /api/report/filtration-curves.
//
// Verlauf der Filtrationsleistung (Kennzahl `leistung`, l/(m²·h)) während der
// BESCHICKUNG, alle Zyklen übereinandergelegt, plus
//  (a) Median-Kurve (modellfrei) mit 25./75. Perzentil je Rasterpunkt,
//  (b) Sättigungsmodell y = A − (A − y0)·e^(−x/τ), gewichtet an die Median-Kurve angepasst.
// Beschickungsblock je Zyklus: beginnt mit der ersten Zeile in Schritt 5–9;
// Pausen (10–16) beenden ihn nicht (Pausenzeit wird herausgeschnitten), jeder
// andere Prozessschritt schon. Nur der erste Block zählt; Beschickungen < 60 s
// werden verworfen.

import { isBeschickStep, isPauseStep, isProcessStep } from "./stepCatalog.js";
import { quantileSorted, fences, median } from "./statsMath.js";
import { buildCycles, applyCycleFilter, startedLabel } from "./cycles.js";

const NORM_STEP = 2;          // % – Raster im normierten Modus (51 Punkte)
const MIN_GRID_POINTS = 60;   // Zielanzahl Rasterpunkte im Minuten-Modus
const MAX_RAW_POINTS = 150;   // Ausdünnung der Einzelkurven für die Anzeige
const MIN_BESCHICK_S = 60;    // kürzere Beschickungen sind nicht auswertbar

const nfDe = (v, d = 1) => v.toLocaleString("de-DE", { maximumFractionDigits: d });

// Zeilen eines Zyklus (chronologisch, nur Prozessschritte) → erste Beschickungsphase
function extractCurve(c, rows, timeZone) {
  const blocks = [];
  let cur = null;
  let shift = 0;
  let pauseStart = null;
  for (const r of rows) {
    const isB = isBeschickStep(r.step);
    const isP = isPauseStep(r.step);
    if (isB) {
      if (!cur) {
        cur = { pts: [], pauses: 0, pauseCutS: 0 };
        blocks.push(cur);
        shift = 0;
      } else if (pauseStart != null) {
        const cut = r.ts - pauseStart;
        shift += cut;
        cur.pauses += 1;
        cur.pauseCutS += cut;
      }
      pauseStart = null;
      cur.pts.push({ t: r.ts - shift, y: r.leistung == null ? null : r.leistung });
    } else if (isP) {
      if (cur && pauseStart == null) pauseStart = r.ts;
    } else {
      cur = null;
      pauseStart = null;
    }
  }
  const b0 = blocks[0];
  const first = b0 ? b0.pts.filter((p) => p.y != null && Number.isFinite(p.y)) : null;
  if (!first || first.length < 2) return null;
  const t0 = first[0].t;
  const durationS = first[first.length - 1].t - t0;
  if (durationS < MIN_BESCHICK_S) return null;
  return {
    key: c.key,
    machine: c.machine,
    cycleNo: c.cycleNo,
    startedAt: startedLabel(c.startedTs, timeZone),
    material: c.material,
    customer: c.customer,
    phases: blocks.length,
    pauses: b0.pauses,
    pauseCutS: b0.pauseCutS,
    durationS,
    start: first[0].y,
    end: first[first.length - 1].y,
    tMin: first.map((p) => (p.t - t0) / 60),
    y: first.map((p) => p.y),
  };
}

// "Schöne" Rasterweite für den Minuten-Modus (1, 2, 2,5, 5 × 10^k)
function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * p;
}

// Lineare Interpolation (x aufsteigend) an den Rasterpunkten; außerhalb → null
function resample(xs, ys, grid) {
  const out = [];
  let j = 0;
  const last = xs.length - 1;
  for (const g of grid) {
    if (g < xs[0] - 1e-9 || g > xs[last] + 1e-9) {
      out.push(null);
      continue;
    }
    while (j < last - 1 && xs[j + 1] < g) j++;
    const x0 = xs[j];
    const x1 = xs[Math.min(j + 1, last)];
    const y0 = ys[j];
    const y1 = ys[Math.min(j + 1, last)];
    out.push(x1 === x0 ? y1 : y0 + ((y1 - y0) * (g - x0)) / (x1 - x0));
  }
  return out;
}

/**
 * Sättigungsmodell y = A − (A − y0)·e^(−x/τ), gewichtete kleinste Quadrate.
 * Für festes τ linear → Regression; τ per Gittersuche (log, xmax/200 … 20·xmax,
 * 120 Stufen) + 40 Schritte Goldener Schnitt.
 */
export function fitSaturation(xs, ys, ws = xs.map(() => 1)) {
  const n = xs.length;
  if (n < 5) return null;
  let xmax = -Infinity;
  for (const x of xs) if (x > xmax) xmax = x;
  if (!(xmax > 0)) return null;
  const W = ws.reduce((a, b) => a + b, 0);
  if (!(W > 0)) return null;
  const ybar = ys.reduce((a, y, i) => a + ws[i] * y, 0) / W;
  const sst = ys.reduce((a, y, i) => a + ws[i] * (y - ybar) ** 2, 0);

  const solve = (tau) => {
    let sf = 0, sff = 0, sfy = 0;
    for (let i = 0; i < n; i++) {
      const f = 1 - Math.exp(-xs[i] / tau);
      sf += ws[i] * f;
      sff += ws[i] * f * f;
      sfy += ws[i] * f * ys[i];
    }
    const fbar = sf / W;
    const varF = sff - W * fbar * fbar;
    if (varF <= 1e-12) return null;
    const c1 = (sfy - W * fbar * ybar) / varF;
    const c0 = ybar - c1 * fbar;
    let sse = 0;
    for (let i = 0; i < n; i++) {
      const e = ys[i] - (c0 + c1 * (1 - Math.exp(-xs[i] / tau)));
      sse += ws[i] * e * e;
    }
    return { y0: c0, A: c0 + c1, sse };
  };

  const lo = Math.log(xmax / 200);
  const hi = Math.log(xmax * 20);
  const STEPS = 120;
  let bestI = -1;
  let bestSse = Infinity;
  const at = (i) => lo + ((hi - lo) * i) / STEPS;
  for (let i = 0; i <= STEPS; i++) {
    const r = solve(Math.exp(at(i)));
    if (r && r.sse < bestSse) {
      bestSse = r.sse;
      bestI = i;
    }
  }
  if (bestI < 0) return null;
  let a = at(Math.max(0, bestI - 1));
  let b = at(Math.min(STEPS, bestI + 1));
  const g = (Math.sqrt(5) - 1) / 2;
  const cost = (lt) => { const r = solve(Math.exp(lt)); return r ? r.sse : Infinity; };
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = cost(c);
  let fd = cost(d);
  for (let k = 0; k < 40; k++) {
    if (fc < fd) {
      b = d; d = c; fd = fc;
      c = b - g * (b - a); fc = cost(c);
    } else {
      a = c; c = d; fc = fd;
      d = a + g * (b - a); fd = cost(d);
    }
  }
  const tau = Math.exp((a + b) / 2);
  const r = solve(tau);
  if (!r) return null;
  return { A: r.A, y0: r.y0, tau, r2: sst > 0 ? 1 - r.sse / sst : null };
}

function groupLabel(c, groupBy) {
  if (groupBy === "material") return c.material != null ? c.material : "ohne Material";
  if (groupBy === "kunde") return c.customer != null ? c.customer : "ohne Kunde";
  if (groupBy === "machine") return c.machine;
  return "Alle Zyklen";
}

function buildGroup(label, curves, xMode) {
  const xOf = (c) => (xMode === "norm" ? c.tMin.map((t) => (t * 60 * 100) / c.durationS) : c.tMin);
  const N = curves.length;
  const minN = N <= 1 ? 1 : Math.max(2, Math.ceil(0.1 * N));

  let grid;
  if (xMode === "norm") {
    grid = Array.from({ length: 100 / NORM_STEP + 1 }, (_, i) => i * NORM_STEP);
  } else {
    const desc = curves.map((c) => c.durationS / 60).sort((a, b) => b - a);
    const maxMin = desc[Math.min(minN, desc.length) - 1];
    const step = niceStep(maxMin / MIN_GRID_POINTS);
    grid = Array.from({ length: Math.floor(maxMin / step) + 1 }, (_, i) => +(i * step).toFixed(6));
  }

  const resampled = curves.map((c) => resample(xOf(c), c.y, grid));
  const med = [], q1 = [], q3 = [], nAt = [];
  grid.forEach((_g, gi) => {
    const vals = [];
    for (const r of resampled) {
      const v = r[gi];
      if (v != null) vals.push(v);
    }
    nAt.push(vals.length);
    if (vals.length >= minN && vals.length) {
      const s = vals.sort((x, y) => x - y);
      med.push(quantileSorted(s, 0.5));
      q1.push(quantileSorted(s, 0.25));
      q3.push(quantileSorted(s, 0.75));
    } else {
      med.push(null); q1.push(null); q3.push(null);
    }
  });

  const fitIdx = grid.map((_g, i) => i).filter((i) => med[i] != null);
  const f = fitSaturation(fitIdx.map((i) => grid[i]), fitIdx.map((i) => med[i]), fitIdx.map((i) => nAt[i]));
  const xmaxObserved = fitIdx.length ? grid[fitIdx[fitIdx.length - 1]] : 0;
  const fit = f
    ? { ...f, t95: 3 * f.tau, saturated: 3 * f.tau <= xmaxObserved, y: grid.map((x) => f.A - (f.A - f.y0) * Math.exp(-x / f.tau)) }
    : null;

  const thin = (arr) => {
    if (arr.length <= MAX_RAW_POINTS) return arr;
    const k = Math.ceil(arr.length / MAX_RAW_POINTS);
    return arr.filter((_v, i) => i % k === 0 || i === arr.length - 1);
  };

  return {
    label,
    n: N,
    durationMedianMin: median(curves.map((c) => c.durationS / 60)),
    startMedian: median(curves.map((c) => c.start)),
    endMedian: median(curves.map((c) => c.end)),
    cycles: curves.map((c) => ({
      key: c.key, machine: c.machine, cycleNo: c.cycleNo, startedAt: c.startedAt,
      durationMin: c.durationS / 60, end: c.end, x: thin(xOf(c)), y: thin(c.y),
    })),
    grid, median: med, q1, q3, nAt, minN, fit,
  };
}

/**
 * @param {object[]} rows Messzeilen (siehe cycles.js)
 * @param {{ xMode?: 'norm'|'min', groupBy?: 'none'|'material'|'kunde'|'machine', excluded?: string[], timeZone?: string, filter?: object }} [opts]
 */
export function computeFiltrationCurves(rows, opts = {}) {
  const xMode = opts.xMode === "min" ? "min" : "norm";
  const groupBy = opts.groupBy || "none";
  const timeZone = opts.timeZone || "UTC";
  const cycles = applyCycleFilter(buildCycles(rows), opts.filter);

  const all = [];
  let withProcess = 0;
  let noBeschickung = 0;
  for (const c of cycles) {
    const proc = c.rows.filter((r) => isProcessStep(r.step));
    if (!proc.length) continue; // wie SQL: nur Zyklen mit Prozessschritt-Zeilen
    withProcess++;
    const curve = extractCurve(c, proc, timeZone);
    if (curve) all.push(curve);
    else noBeschickung++;
  }

  const durF = fences(all.map((c) => c.durationS / 60));
  const endF = fences(all.map((c) => c.end));
  const excludedSet = new Set(opts.excluded || []);
  const flagged = [];
  for (const c of all) {
    const reasons = [];
    const dMin = c.durationS / 60;
    if (c.pauses > 0) {
      reasons.push("Beschickung durch Pause unterbrochen" + (c.pauses > 1 ? " (" + c.pauses + "×)" : "") +
        " – " + nfDe(c.pauseCutS / 60) + " min herausgeschnitten");
    }
    if (c.phases > 1) reasons.push(c.phases + " Beschickungsphasen im Zyklus (nur die erste ausgewertet)");
    if (durF && dMin > durF.hi) reasons.push("Beschickung auffällig lang (" + nfDe(dMin) + " min)");
    if (durF && dMin < durF.lo) reasons.push("Beschickung auffällig kurz (" + nfDe(dMin) + " min)");
    if (endF && c.end > endF.hi) reasons.push("Endwert auffällig hoch (" + nfDe(c.end) + ")");
    if (endF && c.end < endF.lo) reasons.push("Endwert auffällig niedrig (" + nfDe(c.end) + ")");
    if (reasons.length) {
      flagged.push({ key: c.key, machine: c.machine, cycleNo: c.cycleNo, startedAt: c.startedAt,
        durationMin: dMin, end: c.end, reasons, excluded: excludedSet.has(c.key) });
    }
  }

  const included = all.filter((c) => !excludedSet.has(c.key));
  const byGroup = new Map();
  for (const c of included) {
    const g = groupLabel(c, groupBy);
    const list = byGroup.get(g);
    if (list) list.push(c);
    else byGroup.set(g, [c]);
  }
  const labels = [...byGroup.keys()].sort((a, b) => {
    const oa = a.startsWith("ohne ") ? 1 : 0;
    const ob = b.startsWith("ohne ") ? 1 : 0;
    return oa - ob || a.localeCompare(b, "de");
  });

  return {
    xMode,
    groupBy,
    groups: labels.map((l) => buildGroup(l, byGroup.get(l), xMode)),
    flagged,
    info: {
      cycles: withProcess,
      usable: all.length,
      noBeschickung,
      excluded: all.length - included.length,
      multiPhase: all.filter((c) => c.phases > 1).length,
    },
  };
}
