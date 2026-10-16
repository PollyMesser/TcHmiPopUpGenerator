// ── Widget "Verlaufsplot (Graph)" – Berechnung ──
// Übertragen aus MachineDataStack backend/src/services/stats.ts:
//   computeReport()      = getReport()      → Linie (je Tag) und Balken (je Gruppe)
//   computeCorrelation() = getCorrelation() → Streudiagramm mit Pearson-r
// Grundlage sind ALLE Messzeilen der Auswahl (auch Leerlauf), wie in der App.
// Tageszuordnung: Zeitzone wählbar (Standard 'UTC' = App; HMI: lokale Zeit).

import { aggregate, pearson, sdSample } from "./statsMath.js";
import { buildCycles, applyCycleFilter, dayKey } from "./cycles.js";
import { metricRegistry, groupLabelOf } from "./metrics.js";

const OPS = { gt: (a, b) => a > b, lt: (a, b) => a < b, gte: (a, b) => a >= b, lte: (a, b) => a <= b };

// Messzeilen der Auswahl mit Zyklus + Tag; optional Zeitraum (Tag der Messung) und Grenzwertfilter
function selectRows(rows, opts, reg) {
  const timeZone = opts.timeZone || "UTC";
  const cycles = applyCycleFilter(buildCycles(rows), opts.filter);
  const out = [];
  for (const c of cycles) {
    for (const r of c.rows) out.push({ r, c, day: dayKey(r.ts, timeZone) });
  }
  // Reihenfolge wie "ORDER BY m.id": Eingangsreihenfolge der Zeilen
  const order = new Map(rows.map((r, i) => [r, i]));
  out.sort((a, b) => order.get(a.r) - order.get(b.r));
  const th = (opts.thresholds || []).filter((t) => reg.has(t.metric) && OPS[t.op] && Number.isFinite(t.value));
  return out.filter((x) => {
    if (opts.from && x.day < opts.from) return false;
    if (opts.to && x.day > opts.to) return false;
    for (const t of th) {
      const v = reg.get(t.metric).value(x.r, x.c);
      if (v == null || !OPS[t.op](v, t.value)) return false;
    }
    return true;
  });
}

const cmpLabel = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @param {object[]} rows Messzeilen
 * @param {{ columns?: {key:string, agg:string}[], groupBy?: string, timeZone?: string, filter?: object,
 *           from?: string, to?: string, thresholds?: {metric:string,op:string,value:number}[], extraMetrics?: object[] }} [opts]
 */
export function computeReport(rows, opts = {}) {
  const reg = metricRegistry(opts.extraMetrics);
  let columns = (opts.columns || []).filter((c) => reg.has(c.key));
  if (!columns.length) columns = [{ key: "leistung", agg: "avg" }];
  const groupBy = opts.groupBy || "material";
  const sel = selectRows(rows, opts, reg);

  const valuesOf = (list, col) => {
    const m = reg.get(col.key);
    const out = [];
    for (const x of list) { const v = m.value(x.r, x.c); if (v != null) out.push(v); }
    return out;
  };

  const days = [...new Set(sel.map((x) => x.day))].sort();
  const byDay = new Map(days.map((d) => [d, []]));
  for (const x of sel) byDay.get(x.day).push(x);

  const byGroup = new Map();
  for (const x of sel) {
    const g = String(groupLabelOf(groupBy, x.r, x.c, x.day));
    const l = byGroup.get(g);
    if (l) l.push(x); else byGroup.set(g, [x]);
  }
  const groupLabels = [...byGroup.keys()].sort(cmpLabel);

  return {
    n: sel.length,
    kpis: columns.map((col) => {
      const meta = reg.get(col.key);
      const all = valuesOf(sel, col);
      return {
        key: col.key, agg: col.agg || "avg", label: meta.label, unit: meta.unit,
        value: aggregate(col.agg, all),
        min: aggregate("min", all),
        max: aggregate("max", all),
        daily: days.map((d) => aggregate(col.agg, valuesOf(byDay.get(d), col))),
        dailySd: days.map((d) => sdSample(valuesOf(byDay.get(d), col))),
      };
    }),
    days,
    groups: groupLabels.map((label) => ({
      label,
      n: byGroup.get(label).length,
      values: columns.map((col) => aggregate(col.agg, valuesOf(byGroup.get(label), col))),
    })),
  };
}

/**
 * Streudiagramm: x/y-Rohwerte (beide nicht null), gleichmäßig auf ≤ 500 Punkte ausgedünnt, Pearson-r.
 * @param {{ x?: string, y?: string, groupBy?: string, timeZone?: string, filter?: object, from?: string, to?: string, thresholds?: object[], extraMetrics?: object[], maxPoints?: number }} [opts]
 */
export function computeCorrelation(rows, opts = {}) {
  const reg = metricRegistry(opts.extraMetrics);
  const mx = reg.get(opts.x) || reg.get("leistung");
  const my = reg.get(opts.y) || reg.get("leistung");
  const groupBy = opts.groupBy || "material";
  const sel = selectRows(rows, opts, reg)
    .map((x) => ({ ...x, xv: mx.value(x.r, x.c), yv: my.value(x.r, x.c) }))
    .filter((x) => x.xv != null && x.yv != null);
  const n = sel.length;
  const k = Math.max(1, Math.ceil(n / (opts.maxPoints || 500)));
  return {
    r: pearson(sel.map((x) => x.xv), sel.map((x) => x.yv)),
    n,
    points: sel.filter((_x, i) => i % k === 0).map((x) => ({ x: x.xv, y: x.yv, group: String(groupLabelOf(groupBy, x.r, x.c, x.day)) })),
  };
}
