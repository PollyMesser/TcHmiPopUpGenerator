// ── Datenmodell: Messzeilen → Zyklen ──
// Ersetzt die Tabellen cycles/measurements der App. Die Berechnungen erwarten
// eine flache Liste von Messzeilen (aus PostgreSQL, SQLite oder CSV, Adapter
// siehe ../adapters). Eine Zeile = ein Zeitstempel einer Maschine:
//
//   {
//     machine:  'AC1118',          // Seriennummer (Pflicht)
//     cycleNo:  2753,              // Zyklusnummer der SPS (Pflicht)
//     ts:       1780921497,        // Zeitstempel, Epoche in SEKUNDEN (Pflicht)
//     step:     6,                 // SPS-Schrittnummer laut Katalog (Pflicht)
//     leistung: 41.2,              // Kennzahlen (Schlüssel wie in metrics.js), null = fehlt
//     ...weitere Kennzahlen,
//     material: 'KM1' | null,      // optional (Gruppierung)
//     customer: 'Kunde A' | null,  // optional (Gruppierung)
//   }
//
// Zyklus = (machine, cycleNo). Zyklusstart und Zyklus-Zeit wie beim Import der
// App (services/ingest.ts): Start = früheste Messung in einem Prozessschritt
// (Fallback: früheste Messung überhaupt), Zyklus-Zeit = Maximum von
// zyklus_zeit über die Prozessschritt-Zeilen.

import { isProcessStep } from "./stepCatalog.js";

export const cycleKey = (machine, cycleNo) => machine + "#" + cycleNo;

/**
 * Gruppiert Messzeilen zu Zyklen. Reihenfolge der Zyklen: Start, dann
 * Zyklusnummer (wie ORDER BY started_at in der App); Zeilen je Zyklus nach
 * Zeitstempel, bei Gleichstand in Eingangsreihenfolge (wie measured_at, id).
 */
export function buildCycles(rows) {
  const map = new Map();
  rows.forEach((r, idx) => {
    const key = cycleKey(r.machine, r.cycleNo);
    let c = map.get(key);
    if (!c) {
      c = { key, machine: r.machine, cycleNo: r.cycleNo, startedTs: null, firstTs: r.ts, cycleTimeMin: null,
        material: null, customer: null, rows: [], order: map.size };
      map.set(key, c);
    }
    if (r.ts < c.firstTs) c.firstTs = r.ts;
    if (isProcessStep(r.step)) {
      if (c.startedTs == null || r.ts < c.startedTs) c.startedTs = r.ts;
      const ct = r.zyklus_zeit;
      if (ct != null && Number.isFinite(ct) && (c.cycleTimeMin == null || ct > c.cycleTimeMin)) c.cycleTimeMin = ct;
    }
    if (c.material == null && r.material) c.material = r.material;
    if (c.customer == null && r.customer) c.customer = r.customer;
    c.rows.push({ r, idx });
  });
  const list = [...map.values()];
  for (const c of list) {
    if (c.startedTs == null) c.startedTs = c.firstTs;
    c.rows.sort((a, b) => a.r.ts - b.r.ts || a.idx - b.idx);
    c.rows = c.rows.map((x) => x.r);
  }
  list.sort((a, b) => a.startedTs - b.startedTs || a.cycleNo - b.cycleNo || a.order - b.order);
  return list;
}

// ── Zeitzonen ──
// Die App ordnet Tage in UTC zu (die CSV-Zeiten werden dort "als UTC"
// gespeichert, dadurch entspricht der UTC-Tag dem Tag laut Maschinenuhr).
// Für die HMI ist die lokale Zeit vorzuziehen: timeZone = IANA-Name, z. B.
// 'Europe/Berlin'. Standard 'UTC' = Verhalten der App.
const fmtCache = new Map();
function partsFor(timeZone) {
  let f = fmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    fmtCache.set(timeZone, f);
  }
  return f;
}
function localParts(ts, timeZone) {
  const o = {};
  for (const p of partsFor(timeZone || "UTC").formatToParts(new Date(ts * 1000))) o[p.type] = p.value;
  return o;
}
/** 'YYYY-MM-DD' des Zeitstempels in der Zeitzone */
export function dayKey(ts, timeZone) {
  const o = localParts(ts, timeZone);
  return o.year + "-" + o.month + "-" + o.day;
}
/** Montag der Woche als 'YYYY-MM-DD' (wie date_trunc('week')) */
export function weekKey(ts, timeZone) {
  const d = new Date(dayKey(ts, timeZone) + "T00:00:00Z");
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}
/** 'YYYY-MM-DD HH:MM' (Anzeige Zyklusstart) */
export function startedLabel(ts, timeZone) {
  const o = localParts(ts, timeZone);
  return o.year + "-" + o.month + "-" + o.day + " " + o.hour + ":" + o.minute;
}

/** Zyklus-Filter (Ersatz für den SQL-Teil der App, falls die Abfrage nicht schon filtert) */
export function applyCycleFilter(cycles, f) {
  if (!f) return cycles;
  const inList = (list, v) => !list || !list.length || list.includes(v);
  return cycles.filter((c) =>
    inList(f.machines, c.machine) &&
    inList(f.materials, c.material) &&
    inList(f.customers, c.customer) &&
    (f.cycleTimeMin == null || (c.cycleTimeMin != null && c.cycleTimeMin >= f.cycleTimeMin)) &&
    (f.cycleTimeMax == null || (c.cycleTimeMin != null && c.cycleTimeMin <= f.cycleTimeMax)));
}
