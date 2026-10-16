// ── Abhängigkeitsfreie Statistik-Helfer ──
// Übertragen aus MachineDataStack backend/src/lib/stats-math.ts; ergänzt um die
// Helfer, die dort in SQL steckten (PERCENTILE_CONT, STDDEV_SAMP, corr), weil
// SQLite sie nicht kennt – hier einheitlich in JS für PostgreSQL und SQLite.

/** @typedef {{ n: number, mean: number|null, sd: number|null, median: number|null, min: number|null, max: number|null, sum: number|null }} FullStat */

/** @type {FullStat} */
export const EMPTY_STAT = Object.freeze({ n: 0, mean: null, sd: null, median: null, min: null, max: null, sum: null });

/**
 * Lineare Interpolation wie PERCENTILE_CONT in PostgreSQL.
 * `sorted` muss aufsteigend sortiert und nicht leer sein.
 */
export function quantileSorted(sorted, p) {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export const sortNum = (values) => [...values].sort((a, b) => a - b);

/** Median (PERCENTILE_CONT 0.5), null bei leerer Liste */
export function median(values) {
  return values.length ? quantileSorted(sortNum(values), 0.5) : null;
}

/** Stichproben-Standardabweichung (n − 1) wie STDDEV_SAMP, null bei n < 2 */
export function sdSample(values) {
  const n = values.length;
  if (n < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (n - 1));
}

/** @returns {FullStat} */
export function fullStat(values) {
  const n = values.length;
  if (!n) return EMPTY_STAT;
  const sorted = sortNum(values);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    n,
    mean: sum / n,
    sd: sdSample(values),
    median: quantileSorted(sorted, 0.5),
    min: sorted[0],
    max: sorted[n - 1],
    sum,
  };
}

/** Tukey-Zäune (1,5·IQR); erst ab 4 Werten sinnvoll */
export function fences(values) {
  if (values.length < 4) return null;
  const s = sortNum(values);
  const q1 = quantileSorted(s, 0.25);
  const q3 = quantileSorted(s, 0.75);
  const iqr = q3 - q1;
  return { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr };
}

/** Pearson-Korrelation wie corr() in PostgreSQL, null bei n < 2 oder Varianz 0 */
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (!(sxx > 0) || !(syy > 0)) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Aggregat wie aggSql() im Backend: 'avg' | 'min' | 'max' | 'sum' | 'median'; Nullwerte vorher entfernen */
export function aggregate(agg, values) {
  if (!values.length) return null;
  switch (agg) {
    case "min": { let m = values[0]; for (const v of values) if (v < m) m = v; return m; }
    case "max": { let m = values[0]; for (const v of values) if (v > m) m = v; return m; }
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "median": return median(values);
    default: return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
