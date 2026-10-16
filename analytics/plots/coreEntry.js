// ── Einstieg für den eingebetteten Rechenkern (Browser-Berechnung im HMI) ──
// scripts/build-runtime.mjs bündelt diese Datei mit esbuild zu einem Skript
// "var AC_CORE = (…)();" (Abschnitt "core" in runtimeSource.generated.js).
export { computeFiltrationCurves } from "../core/filtrationCurves.js";
export { computeStepDurations } from "../core/stepDurations.js";
export { mergeHistorizeSeries, looksCompressed, rawDisplayWidth } from "../adapters/historize.js";
