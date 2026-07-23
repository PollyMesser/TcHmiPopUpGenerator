#!/usr/bin/env node
// ── Golden-Master-Test: Codegen-Output für alle Referenz-Configs ──
//
// Bündelt src/codegen/index.js per esbuild (React/lucide-react werden dabei
// defensiv durch Stubs ersetzt – der Codegen-Pfad hängt aktuell an keinem der
// beiden, das schützt nur gegen künftige versehentliche Importe aus der
// UI-Schicht), generiert für jede Config aus test/configs.mjs den vollständigen
// Code und vergleicht ihn byte-genau gegen test/goldens/<name>.js.
//
// Zusätzlich pro Ausgabe:
//   - Babel-Parse-Check (der erzeugte Code muss syntaktisch gültiges JS sein)
//   - Backslash-Zählung (muss 0 sein – harte TcHMI-Einbettungs-Regel: die
//     generierten <script>-Inhalte werden von TcHMI durchgereicht, ein
//     Backslash im Quelltext zerstört dort String-Literale/SVG-Attribute)
//
// --record   Referenzen bewusst neu einfrieren (überschreibt vorhandene Goldens)
//            Fehlt eine Golden-Datei ohne --record, wird sie einmalig neu
//            angelegt (kein Fehler) – es gibt ja noch keinen Stand, von dem
//            man abweichen könnte.
import { build } from "esbuild";
import { parse } from "@babel/parser";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GOLDENS_DIR = path.join(__dirname, "goldens");
const RECORD = process.argv.includes("--record");

// ── Stub-Plugin: react/react-dom/lucide-react durch leere Module ersetzen ──
// Rein defensiv: src/codegen/** importiert aktuell nichts davon. Sollte sich
// das künftig ändern (z.B. versehentlicher Import aus components/**), bündelt
// esbuild trotzdem weiter statt mit einem Auflösungsfehler abzubrechen – der
// eigentliche Codegen-Vergleich unten würde dann aber mit hoher
// Wahrscheinlichkeit ohnehin fehlschlagen, weil die Stubs funktional leer sind.
const REACT_ICON_NAMES = [
  "Plus", "Copy", "Check", "Code2", "Monitor", "Sun", "Moon", "Braces", "Trash2",
  "ChevronUp", "ChevronDown", "ChevronLeft", "ChevronRight", "GripVertical", "Flag", "Minus",
  "Type", "Eye", "CircleDot", "MousePointerClick", "PencilLine", "ToggleLeft", "Columns2",
  "Zap", "Box", "List", "ChevronsUpDown", "Tag", "Gauge", "LineChart", "Table",
];
const stubPlugin = {
  name: "stub-react-lucide",
  setup(b) {
    b.onResolve({ filter: /^(react|react-dom(\/.*)?|lucide-react)$/ }, (args) => ({ path: args.path, namespace: "ac-stub" }));
    b.onLoad({ filter: /.*/, namespace: "ac-stub" }, (args) => {
      if (args.path === "react") {
        return { contents: "export default {}; export const useState=()=>[undefined,()=>{}]; export const useRef=()=>({current:null}); export const useMemo=(fn)=>fn(); export const createElement=()=>null;", loader: "js" };
      }
      if (args.path.startsWith("react-dom")) {
        return { contents: "export const createRoot=()=>({render(){}}); export default {};", loader: "js" };
      }
      // lucide-react: jede Icon-Komponente als No-op-Funktion
      const body = REACT_ICON_NAMES.map((n) => `export function ${n}(){ return null; }`).join("\n");
      return { contents: body, loader: "js" };
    });
  },
};

async function loadGenerate() {
  const result = await build({
    entryPoints: [path.join(ROOT, "src/codegen/index.js")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    target: "node18",
    plugins: [stubPlugin],
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`);
  if (typeof mod.generate !== "function") throw new Error("Bundle exportiert keine generate()-Funktion – Bundling fehlgeschlagen.");
  return mod.generate;
}

function goldenPath(name) { return path.join(GOLDENS_DIR, `${name}.js`); }

function main() {
  return loadGenerate().then(async (generate) => {
    const { CONFIGS } = await import("./configs.mjs");
    if (!existsSync(GOLDENS_DIR)) mkdirSync(GOLDENS_DIR, { recursive: true });

    let failures = 0, recorded = 0, passed = 0;
    const noGoldensYet = CONFIGS.every((c) => !existsSync(goldenPath(c.name)));

    for (const { name, cfg } of CONFIGS) {
      const out = generate(cfg);
      const problems = [];

      // ── Babel-Parse-Check ──
      try {
        parse(out, { sourceType: "script", allowReturnOutsideFunction: false });
      } catch (e) {
        problems.push(`Babel-Parse-Fehler: ${e.message}`);
      }

      // ── Backslash-Zählung (harte Regel: 0) ──
      const bsCount = (out.match(/\\/g) || []).length;
      if (bsCount !== 0) problems.push(`${bsCount} Backslash(es) im generierten Code (muss 0 sein)`);

      // ── Byte-genauer Vergleich gegen Golden ──
      const gp = goldenPath(name);
      const shouldRecord = RECORD || !existsSync(gp);
      if (shouldRecord) {
        writeFileSync(gp, out, "utf8");
        recorded++;
        if (problems.length) {
          console.error(`✗ ${name}: eingefroren, ABER mit Problemen: ${problems.join("; ")}`);
          failures++;
        } else {
          console.log(`◆ ${name}: eingefroren (${RECORD ? "--record" : "neu, kein vorheriger Golden"})`);
        }
        continue;
      }
      const golden = readFileSync(gp, "utf8");
      if (golden !== out) {
        const gi = firstDiffIndex(golden, out);
        problems.push(`weicht vom Golden ab (erster Unterschied bei Zeichen ${gi}: golden=${JSON.stringify(golden.slice(Math.max(0, gi - 20), gi + 20))} vs. aktuell=${JSON.stringify(out.slice(Math.max(0, gi - 20), gi + 20))})`);
      }
      if (problems.length) {
        console.error(`✗ ${name}: ${problems.join("; ")}`);
        failures++;
      } else {
        console.log(`✓ ${name}`);
        passed++;
      }
    }

    console.log(`\n${passed} bestanden, ${recorded} eingefroren, ${failures} fehlgeschlagen (von ${CONFIGS.length} Configs).`);
    if (noGoldensYet && !RECORD) {
      console.log("Hinweis: Es gab noch keine test/goldens/ – der aktuelle Output wurde als neue Referenz eingefroren.");
    }
    if (failures > 0) process.exit(1);
  });
}

function firstDiffIndex(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}

main().catch((e) => { console.error(e); process.exit(1); });
