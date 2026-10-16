#!/usr/bin/env node
// ── Plot-Laufzeit für den Generator aufbereiten ──
// Liest analytics/plots/runtime.js, schneidet die Abschnitte "//#region <name>"
// … "//#endregion" heraus und schreibt sie als String-Konstanten nach
// analytics/plots/runtimeSource.generated.js. Der Generator bettet sie wörtlich
// in TcHMI-Code ein – deshalb hier harte Prüfung: kein Backslash.
// Zusätzlich Abschnitt "core": analytics/core + Historize-Adapter, per esbuild
// zu "var AC_CORE = (…)();" gebündelt (Berechnung im Browser, Datenquelle Historize).
//
//   node analytics/scripts/build-runtime.mjs          (neu erzeugen)
//   node analytics/scripts/build-runtime.mjs --check  (Test: Datei aktuell?)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "plots", "runtime.js");
const OUT = path.join(root, "plots", "runtimeSource.generated.js");
const CORE_ENTRY = path.join(root, "plots", "coreEntry.js");

// Rechenkern bündeln: ES2017, UTF-8 (Umlaute NICHT als Escape), nicht minifiziert
function bundleCore() {
  const r = buildSync({ entryPoints: [CORE_ENTRY], bundle: true, write: false, format: "iife", globalName: "AC_CORE",
    target: "es2017", charset: "utf8", minify: false, legalComments: "none", logLevel: "silent" });
  return r.outputFiles[0].text.replace(/\r\n/g, "\n");
}

export function extractSections(text) {
  const sections = {};
  const re = /^\/\/#region (\w+)$([\s\S]*?)^\/\/#endregion$/gm;
  let m;
  while ((m = re.exec(text))) sections[m[1]] = m[2].replace(/^\r?\n/, "").replace(/\s+$/, "") + "\n";
  return sections;
}

export function buildRuntimeModule() {
  const text = readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
  const sections = extractSections(text);
  for (const need of ["common", "filtration", "steps", "trend"]) {
    if (!sections[need]) throw new Error("Abschnitt fehlt in runtime.js: " + need);
  }
  sections.core = bundleCore();
  for (const [name, src] of Object.entries(sections)) {
    const bs = src.indexOf(String.fromCharCode(92));
    if (bs >= 0) {
      const line = src.slice(0, bs).split("\n").length;
      throw new Error("Backslash in Abschnitt '" + name + "' (Zeile " + line + " des Abschnitts) – in TcHMI-Code verboten.");
    }
    if (src.indexOf("`") >= 0) throw new Error("Template-Literal in Abschnitt '" + name + "' – bitte ES5-Strings verwenden.");
  }
  return "// AUTO-GENERIERT aus analytics/plots/runtime.js und analytics/core – nicht von Hand ändern.\n" +
    "// Neu erzeugen: node analytics/scripts/build-runtime.mjs\n" +
    "export const RUNTIME_SECTIONS = " + JSON.stringify(sections, null, 2) + ";\n";
}

if (process.argv[1] && process.argv[1].endsWith("build-runtime.mjs")) {
  const mod = buildRuntimeModule();
  if (process.argv.includes("--check")) {
    const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
    if (cur !== mod) { console.error("✗ runtimeSource.generated.js ist veraltet – node analytics/scripts/build-runtime.mjs ausführen."); process.exit(1); }
    console.log("✓ runtimeSource.generated.js ist aktuell.");
  } else {
    writeFileSync(OUT, mod, "utf8");
    console.log("✓ " + path.relative(process.cwd(), OUT) + " geschrieben.");
  }
}
