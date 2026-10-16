// ── AC Analytics: Auswerte-Widgets für TwinCAT HMI ──
// Reine ES-Module ohne Abhängigkeiten, lauffähig im Browser und in Node
// (TcHMI-Server-Extension oder eigener Dienst). Eingang: Messzeilen (siehe
// core/cycles.js), Ausgang: dieselben Ergebnis-JSONs wie die Maschinendaten-App.
export { computeFiltrationCurves, fitSaturation } from "./core/filtrationCurves.js";
export { computeStepDurations, computeStepDurationsFromEvents } from "./core/stepDurations.js";
export { computeReport, computeCorrelation } from "./core/trendReport.js";
export { buildCycles, cycleKey, dayKey, weekKey, startedLabel, applyCycleFilter } from "./core/cycles.js";
export { METRICS, metricRegistry, AGGS, GROUP_BYS } from "./core/metrics.js";
export * from "./core/stepCatalog.js";
export { fullStat, quantileSorted, median, sdSample, pearson, fences, EMPTY_STAT } from "./core/statsMath.js";
export { parseMachineCsv, decodeCsvBuffer } from "./adapters/machineCsv.js";
