// ── Kennzahlen-Register ──
// Übertragen aus MachineDataStack backend/src/lib/metrics.ts. Statt SQL-Ausdrücken
// liefert jede Kennzahl eine Zugriffsfunktion value(row, cycle).
//
// Leistung Pumpe: Manche Steuerungen setzen den Wert nach der Beschickung nicht
// zurück; fachlich fördert die Pumpe nur in den Schritten 5–9 → außerhalb 0.
// Fehlende Werte bleiben null.

import { isBeschickStep, stepName } from "./stepCatalog.js";

const num = (v) => (v == null || !Number.isFinite(v) ? null : v);

export const METRICS = [
  { key: "druck_zulauf", label: "Druck Zulauf", unit: "bar" },
  { key: "druck_membran", label: "Druck Membran", unit: "bar" },
  { key: "druck_hydraulik", label: "Druck Hydraulik", unit: "bar" },
  { key: "leistung_pumpe", label: "Leistung Pumpe", unit: "l/h",
    value: (r) => { const v = num(r.leistung_pumpe); return v == null ? null : v * (isBeschickStep(r.step) ? 1 : 0); } },
  { key: "neigung", label: "Neigung", unit: "°" },
  { key: "behaelter_niveau", label: "Behälter-Niveau", unit: "%" },
  { key: "zyklus_zeit", label: "Zyklus-Zeit", unit: "min", cycleLevel: true, value: (_r, c) => (c ? c.cycleTimeMin : null) },
  { key: "leistung", label: "Filtrationsleistung", unit: "l/(m²·h)" },
  { key: "zyklus_durchsatz", label: "Zyklus-Durchsatz", unit: "1/h" },
  { key: "druckindex", label: "Druckindex", unit: "" },
].map((m) => ({ ...m, value: m.value || ((r) => num(r[m.key])) }));

/** Register inkl. eigener Kennzahlen: extra = [{ key, label, unit }] (Wert = row[key]) */
export function metricRegistry(extra) {
  const map = new Map(METRICS.map((m) => [m.key, m]));
  for (const e of extra || []) {
    if (!map.has(e.key)) map.set(e.key, { key: e.key, label: e.label || e.key, unit: e.unit || "", value: (r) => num(r[e.key]) });
  }
  return map;
}

export const AGGS = ["avg", "min", "max", "sum", "median"];
export const GROUP_BYS = ["none", "material", "serien_nr", "schritt", "tag", "kunde"];

/** Gruppierungslabel wie groupExpr() im Backend */
export function groupLabelOf(groupBy, r, c, day) {
  switch (groupBy) {
    case "none": return "Gesamt";
    case "serien_nr": return r.machine;
    case "schritt": return stepName(r.step);
    case "tag": return day;
    case "kunde": return (c && c.customer) || "ohne Kunde";
    default: return (c && c.material) || "ohne Medium";
  }
}
