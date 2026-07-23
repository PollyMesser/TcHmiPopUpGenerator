// ── Gemeinsamer Helfer: JSX-Einstiegspunkt per esbuild bündeln und importieren ──
// react/react-dom/lucide-react bleiben ECHTE externe Abhängigkeiten (aus
// node_modules) – anders als beim Codegen-Golden-Master (test/run.mjs) wird
// hier tatsächlich mit echtem React gerendert. Die Bundle-Datei landet als
// reale Datei unterhalb von test/.cache/, damit Node die externen
// Bare-Specifier ("react" etc.) beim Import ganz normal über die
// node_modules-Kette dieses Projekts auflösen kann (bei einer data:-URL gäbe
// es dafür keinen Dateisystem-Kontext).
import { build } from "esbuild";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(__dirname, ".cache");

async function bundleJsx(entryRelPath, outName) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const result = await build({
    entryPoints: [path.join(ROOT, entryRelPath)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    target: "node18",
    external: ["react", "react/*", "react-dom", "react-dom/*", "lucide-react"],
    logLevel: "silent",
  });
  const outFile = path.join(CACHE_DIR, outName);
  writeFileSync(outFile, result.outputFiles[0].text, "utf8");
  return import(`file://${outFile.replace(/\\/g, "/")}`);
}

export { bundleJsx, ROOT, CACHE_DIR };
