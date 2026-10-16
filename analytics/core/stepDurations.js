// ── Widget "Schrittdauern" – Berechnung ──
// Übertragen aus MachineDataStack backend/src/services/step-durations.ts.
// Die SQL-Fensterfunktionen (LEAD/LAG/SUM OVER, PERCENTILE_CONT) sind hier in
// JS nachgebildet, damit es mit PostgreSQL und SQLite gleich rechnet.
//
//  1. Dauer je Messzeile = Abstand zur nächsten Messung DERSELBEN Maschine
//     (über Zyklusgrenzen hinweg). Fehlt sie oder ist der Abstand > 3 × typisches
//     Intervall (Median der Abstände > 0 je Maschine), wird das typische Intervall
//     angesetzt (Standard 60 s).
//     Optional: stepEvents (exakte Schrittwechsel) ersetzen diese Heuristik –
//     siehe computeStepDurationsFromEvents().
//  2. Summe je (Zyklus, Schritt); aufeinanderfolgende Pausenschritte = EINE Pause.
//  3. Unterschritte → Hauptschritte (Katalog), Reihenfolge = kleinste Katalognummer.
//  4. Grenzwerte je Hauptschritt: Verletzung → Hauptschritt fällt für den Zyklus heraus.
//  5. Auffällig: Dauer > Q3 + max(1,5·IQR, 0,5·Median, 180 s); Zyklus mit Pause immer gelistet.
//  6. Zeitachse: Tag oder Woche (Montag) des Zyklusstarts.
//  7. Kategorien Aktivzeit / Nebenzeit / Prozesszeit (nur Zyklen mit Aktivzeit); Pause eigene Reihe.

import { DEFAULT_ACTIVE_GROUPS, PAUSE_GROUP, groupOrder, isPauseStep, isProcessStep, stepGroup, stepName } from "./stepCatalog.js";
import { fullStat, quantileSorted, EMPTY_STAT } from "./statsMath.js";
import { buildCycles, applyCycleFilter, dayKey, weekKey, startedLabel } from "./cycles.js";

const GAP_FACTOR = 3;
const DEFAULT_INTERVAL_S = 60;
const OUTLIER_IQR = 1.5;
const OUTLIER_MIN_REL = 0.5;
const OUTLIER_MIN_ABS_S = 180;

const fmtMin = (s) => (s / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " min";

// ── Beobachtungen aus periodischer Telemetrie (Nachbildung des SQL in loadRows) ──
// Ergebnis je Zyklus: { steps: Map<stepNo, s>, pauses: [s, …] }
function observationsFromTelemetry(cycles) {

  const byMachine = new Map();
  let seq = 0;
  for (const c of cycles) {
    for (const r of c.rows) {
      const m = { r, c, id: seq++, dur: 0 };

      const list = byMachine.get(c.machine);
      if (list) list.push(m); else byMachine.set(c.machine, [m]);
    }
  }
  // dt = LEAD(ts) − ts je Maschine (ORDER BY measured_at, id); typisches Intervall = Median(dt > 0)
  for (const list of byMachine.values()) {
    list.sort((a, b) => a.r.ts - b.r.ts || a.id - b.id);
    const pos = [];
    for (let i = 0; i < list.length; i++) {
      list[i].dt = i + 1 < list.length ? list[i + 1].r.ts - list[i].r.ts : null;
      if (list[i].dt != null && list[i].dt > 0) pos.push(list[i].dt);
    }
    pos.sort((a, b) => a - b);
    const nom = pos.length ? quantileSorted(pos, 0.5) : DEFAULT_INTERVAL_S;
    for (const m of list) m.dur = m.dt == null || m.dt > GAP_FACTOR * nom ? nom : m.dt;
  }
  // je Zyklus in Zeitreihenfolge: Schritte summieren, Pausenläufe bilden (LAG über ALLE Schritte des Zyklus)
  const result = new Map();
  const perCycle = new Map();
  for (const list of byMachine.values()) {
    for (const m of list) {
      const l = perCycle.get(m.c);
      if (l) l.push(m); else perCycle.set(m.c, [m]);
    }
  }
  for (const c of cycles) {
    const list = perCycle.get(c);
    if (!list) continue;
    list.sort((a, b) => a.r.ts - b.r.ts || a.id - b.id);
    const steps = new Map();
    const pauses = [];
    let prev = null;
    let has = false;
    for (const m of list) {
      const st = m.r.step;
      if (isPauseStep(st)) {
        if (prev == null || !isPauseStep(prev)) pauses.push(0);
        pauses[pauses.length - 1] += m.dur;
        has = true;
      } else if (isProcessStep(st)) {
        steps.set(st, (steps.get(st) || 0) + m.dur);
        has = true;
      }
      prev = st;
    }
    if (has) result.set(c, { steps, pauses });
  }
  return result;
}

/**
 * @param {object[]} rows Messzeilen (siehe cycles.js)
 * @param {{ bucket?: 'day'|'week', activeGroups?: string[]|null, limits?: {group:string,minS:number|null,maxS:number|null}[],
 *           excluded?: string[], timeZone?: string, filter?: object }} [opts]
 */
export function computeStepDurations(rows, opts = {}) {
  const cycles = applyCycleFilter(buildCycles(rows), opts.filter);
  return summarize(cycles, observationsFromTelemetry(cycles), opts);
}

/**
 * Variante mit exakten Schrittwechseln (Tabelle step_events der HMI):
 * events = [{ machine, cycleNo, step, tsStart, tsEnd }]. Dauer = tsEnd − tsStart,
 * aufeinanderfolgende Pausenschritte = eine Pause. Zyklusstart/Material/Kunde
 * kommen aus `cycleRows` (Messzeilen oder je Zyklus eine Zeile).
 */
export function computeStepDurationsFromEvents(events, cycleRows, opts = {}) {
  const cycles = applyCycleFilter(buildCycles(cycleRows), opts.filter);
  const byKey = new Map(cycles.map((c) => [c.key, c]));
  const grouped = new Map();
  [...events].sort((a, b) => a.tsStart - b.tsStart).forEach((e) => {
    const c = byKey.get(e.machine + "#" + e.cycleNo);
    if (!c) return;
    let o = grouped.get(c);
    if (!o) { o = { steps: new Map(), pauses: [], prev: null }; grouped.set(c, o); }
    const d = Math.max(0, e.tsEnd - e.tsStart);
    if (isPauseStep(e.step)) {
      if (o.prev == null || !isPauseStep(o.prev)) o.pauses.push(0);
      o.pauses[o.pauses.length - 1] += d;
    } else if (isProcessStep(e.step)) {
      o.steps.set(e.step, (o.steps.get(e.step) || 0) + d);
    }
    o.prev = e.step;
  });
  return summarize(cycles, grouped, opts);
}

function summarize(cycles, obsByCycle, opts) {
  const timeZone = opts.timeZone || "UTC";
  const bucketMode = opts.bucket === "week" ? "week" : "day";
  const groupOf = (no) => stepGroup(no) || "Schritt " + no;

  // ── 1. Zyklen verdichten
  const cycleList = [];
  for (const c of cycles) {
    const o = obsByCycle.get(c);
    if (!o) continue;
    cycleList.push({
      key: c.key, machine: c.machine, cycleNo: c.cycleNo,
      started: startedLabel(c.startedTs, timeZone),
      day: dayKey(c.startedTs, timeZone), week: weekKey(c.startedTs, timeZone),
      steps: o.steps, pauseS: o.pauses.reduce((a, b) => a + b, 0), pauseCount: o.pauses.length,
    });
  }

  // ── 2. Hauptschritte je Zyklus
  const groupsOf = (c) => {
    const m = new Map();
    for (const [no, dur] of c.steps) {
      const g = groupOf(no);
      let o = m.get(g);
      if (!o) { o = { dur: 0, subs: new Map() }; m.set(g, o); }
      o.dur += dur;
      o.subs.set(no, (o.subs.get(no) || 0) + dur);
    }
    return m;
  };
  const cycleGroups = new Map(cycleList.map((c) => [c, groupsOf(c)]));
  const presentGroups = [...new Set(cycleList.flatMap((c) => [...cycleGroups.get(c).keys()]))]
    .sort((a, b) => groupOrder(a) - groupOrder(b) || a.localeCompare(b, "de"));

  // ── 3. Kategorien
  const activeSet = new Set(opts.activeGroups || DEFAULT_ACTIVE_GROUPS);
  activeSet.delete(PAUSE_GROUP);

  // ── 4. Grenzwerte + statistische Auffälligkeit (auf allen Beobachtungen)
  const limitByGroup = new Map((opts.limits || []).map((l) => [l.group, l]));
  const outsideLimit = (g, dur) => {
    const l = limitByGroup.get(g);
    if (!l) return false;
    return (l.minS != null && dur < l.minS) || (l.maxS != null && dur > l.maxS);
  };
  const fence = new Map();
  for (const g of presentGroups) {
    const vals = cycleList.map((c) => { const o = cycleGroups.get(c).get(g); return o ? o.dur : null; })
      .filter((v) => v != null).sort((a, b) => a - b);
    if (vals.length < 4) continue;
    const q1 = quantileSorted(vals, 0.25);
    const q3 = quantileSorted(vals, 0.75);
    const med = quantileSorted(vals, 0.5);
    fence.set(g, { upper: q3 + Math.max(OUTLIER_IQR * (q3 - q1), OUTLIER_MIN_REL * med, OUTLIER_MIN_ABS_S), median: med });
  }

  // ── 5. Auffällige Zyklen + Ausschluss
  const excludedSet = new Set(opts.excluded || []);
  const flagged = [];
  let limitExcluded = 0;
  const included = [];
  for (const c of cycleList) {
    const reasons = [];
    if (c.pauseCount) reasons.push("Pause " + fmtMin(c.pauseS) + (c.pauseCount > 1 ? " (" + c.pauseCount + "×)" : "") + " – nicht in Prozesszeit");
    const kept = new Map();
    for (const [g, o] of cycleGroups.get(c)) {
      if (outsideLimit(g, o.dur)) {
        reasons.push(g + ": " + fmtMin(o.dur) + " außerhalb Grenzwert – nicht gewertet");
        limitExcluded += 1;
        continue;
      }
      const f = fence.get(g);
      if (f && o.dur > f.upper) reasons.push(g + ": " + fmtMin(o.dur) + " (typisch " + fmtMin(f.median) + ")");
      kept.set(g, o);
    }
    const isExcluded = excludedSet.has(c.key);
    if (reasons.length || isExcluded) {
      flagged.push({ key: c.key, machine: c.machine, cycleNo: c.cycleNo, startedAt: c.started,
        processS: [...kept.values()].reduce((a, o) => a + o.dur, 0), pauseS: c.pauseS,
        reasons: reasons.length ? reasons : ["manuell ausgeschlossen"], excluded: isExcluded });
    }
    if (!isExcluded) included.push({ c, groups: kept });
  }

  // ── 6. Zeitachse
  const bucketOf = (c) => (bucketMode === "week" ? c.week : c.day);
  const buckets = [...new Set(included.map(({ c }) => bucketOf(c)))].sort();
  const bucketIdx = new Map(buckets.map((b, i) => [b, i]));
  const statsFor = (pick) => {
    const perBucket = buckets.map(() => []);
    const all = [];
    for (const { c, groups } of included) {
      const v = pick(groups);
      if (v == null) continue;
      perBucket[bucketIdx.get(bucketOf(c))].push(v);
      all.push(v);
    }
    return { series: perBucket.map((vals) => (vals.length ? fullStat(vals) : EMPTY_STAT)), total: fullStat(all) };
  };

  // ── 7. Hauptschritte (+ Unterschritte)
  const groupSeries = presentGroups.map((g) => {
    const { series, total } = statsFor((gs) => { const o = gs.get(g); return o ? o.dur : null; });
    const subNos = [...new Set(included.flatMap(({ groups }) => { const o = groups.get(g); return o ? [...o.subs.keys()] : []; }))].sort((a, b) => a - b);
    const children = subNos.length === 1 && stepName(subNos[0]) === g
      ? []
      : subNos.map((no) => ({
        key: "s:" + no, stepNo: no, label: stepName(no), category: null,
        ...statsFor((gs) => { const o = gs.get(g); const v = o ? o.subs.get(no) : undefined; return v == null ? null : v; }),
        share: null,
      }));
    return { key: "g:" + g, group: g, label: g, category: activeSet.has(g) ? "active" : "secondary", series, total, share: null, children };
  });
  const pausePerBucket = buckets.map(() => []);
  const pauseAll = [];
  for (const { c } of included) {
    if (!c.pauseCount) continue;
    pausePerBucket[bucketIdx.get(bucketOf(c))].push(c.pauseS);
    pauseAll.push(c.pauseS);
  }
  if (pauseAll.length) {
    groupSeries.push({ key: "g:" + PAUSE_GROUP, group: PAUSE_GROUP, label: PAUSE_GROUP, category: "pause",
      series: pausePerBucket.map((vals) => (vals.length ? fullStat(vals) : EMPTY_STAT)), total: fullStat(pauseAll), share: null, children: [] });
  }
  const stepSum = groupSeries.filter((g) => g.category !== "pause").reduce((a, s) => a + (s.total.sum || 0), 0);
  for (const gs of groupSeries) {
    if (gs.category === "pause") continue;
    gs.share = stepSum > 0 ? (gs.total.sum || 0) / stepSum : null;
    for (const ch of gs.children) ch.share = stepSum > 0 ? (ch.total.sum || 0) / stepSum : null;
  }

  // ── 8. Kategorien pro Zyklus (nur Zyklen mit Aktivzeit)
  const sumWhere = (groups, pred) => {
    let hasActive = false, sum = 0;
    for (const [g, o] of groups) {
      if (activeSet.has(g)) hasActive = true;
      if (pred(g)) sum += o.dur;
    }
    return hasActive ? sum : null;
  };
  const act = statsFor((gs) => sumWhere(gs, (g) => activeSet.has(g)));
  const sec = statsFor((gs) => sumWhere(gs, (g) => !activeSet.has(g)));
  const tot = statsFor((gs) => sumWhere(gs, () => true));
  const catSum = (act.total.sum || 0) + (sec.total.sum || 0);
  const categories = [
    { key: "cat:active", label: "Aktivzeit", category: "active", ...act, share: catSum > 0 ? (act.total.sum || 0) / catSum : null },
    { key: "cat:secondary", label: "Nebenzeit", category: "secondary", ...sec, share: catSum > 0 ? (sec.total.sum || 0) / catSum : null },
    { key: "cat:total", label: "Prozesszeit gesamt", category: null, ...tot, share: catSum > 0 ? 1 : null },
  ];

  const pausedCycles = included.filter(({ c }) => c.pauseCount > 0);
  return {
    bucket: bucketMode,
    buckets,
    groups: groupSeries,
    categories,
    activeGroups: [...activeSet].sort((a, b) => groupOrder(a) - groupOrder(b)),
    flagged,
    info: {
      cycles: included.length,
      excludedCycles: cycleList.length - included.length,
      categoryCycles: act.total.n,
      limitExcluded,
      pauseS: pausedCycles.reduce((a, { c }) => a + c.pauseS, 0),
      pauseCycles: pausedCycles.length,
    },
  };
}


