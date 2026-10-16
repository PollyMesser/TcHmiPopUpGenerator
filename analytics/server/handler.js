// ── Server-Seite: Anfrage des HMI-Bausteins → Ergebnis-JSON ──
// Baustein für eine TcHMI-Server-Extension oder einen kleinen Node-Dienst.
// Der generierte HMI-Code schickt (per Server-Symbol oder HTTP-POST) ein Objekt
//
//   { widget: 'filtration' | 'steps' | 'trend' | 'scatter',
//     options: { …je Widget, siehe unten… },
//     filter:  { machines: ['AC1118'], lastDays: 14 },
//     timeZone: 'Europe/Berlin' }
//
// und erwartet das Ergebnis-JSON der jeweiligen compute*-Funktion zurück.
// Der Datenzugriff (SQL gegen PostgreSQL/SQLite) bleibt beim Aufrufer:
// loadRows(params) liefert die Messzeilen (siehe core/cycles.js), idealerweise
// schon nach Maschine und Zeitraum vorgefiltert.
//
// options je Widget:
//   filtration: { xMode: 'norm'|'min', groupBy: 'none'|'material'|'kunde'|'machine', excluded: [] }
//   steps:      { bucket: 'day'|'week', activeGroups: [..]|null, limits: [{group,minS,maxS}], excluded: [] }
//   trend:      { columns: [{key, agg}], groupBy }
//   scatter:    { x, y, groupBy }

import { computeFiltrationCurves } from "../core/filtrationCurves.js";
import { computeStepDurations } from "../core/stepDurations.js";
import { computeReport, computeCorrelation } from "../core/trendReport.js";

export const WIDGETS = ["filtration", "steps", "trend", "scatter"];

/**
 * Filter aus der Anfrage auf Messzeilen anwenden (falls die DB-Abfrage es nicht schon tut):
 * Maschinen-Liste und "letzte N Tage" bezogen auf den Zyklusstart (wie die App beim Zeitraum).
 */
export function applyRequestFilter(rows, filter, nowS) {
  if (!filter) return rows;
  const machines = (filter.machines || []).filter(Boolean);
  let out = machines.length ? rows.filter((r) => machines.includes(r.machine)) : rows;
  const days = Number(filter.lastDays) || 0;
  if (days > 0) {
    const from = (nowS == null ? Date.now() / 1000 : nowS) - days * 86400;
    // ganzer Zyklus, sobald seine erste Messung im Zeitraum liegt
    const first = new Map();
    for (const r of out) {
      const k = r.machine + "#" + r.cycleNo;
      if (!first.has(k) || r.ts < first.get(k)) first.set(k, r.ts);
    }
    out = out.filter((r) => first.get(r.machine + "#" + r.cycleNo) >= from);
  }
  return out;
}

/** @param {object} params Anfrage des HMI-Bausteins  @param {object[]} rows Messzeilen */
export function computeForRequest(params, rows, nowS) {
  const p = params || {};
  if (!WIDGETS.includes(p.widget)) throw new Error("Unbekanntes Widget: " + p.widget);
  const sel = applyRequestFilter(rows, p.filter, nowS);
  const opts = { ...(p.options || {}), timeZone: p.timeZone || "UTC" };
  switch (p.widget) {
    case "filtration": return computeFiltrationCurves(sel, opts);
    case "steps": return computeStepDurations(sel, opts);
    case "trend": return computeReport(sel, opts);
    default: return computeCorrelation(sel, opts);
  }
}

/** Komfort: Anfrage annehmen, Zeilen laden, rechnen (z. B. für Express: app.post('/analytics', …)) */
export async function handleAnalyticsRequest(params, loadRows) {
  const rows = await loadRows(params);
  return computeForRequest(params, rows);
}
