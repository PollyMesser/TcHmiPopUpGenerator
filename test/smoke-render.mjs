#!/usr/bin/env node
// ── Smoke-Test: gesamte App einmal per renderToString rendern ──
// Bündelt src/App.jsx per esbuild (JSX-Transform, echtes React/lucide-react
// aus node_modules) und prüft, dass die komplette Editor-Oberfläche
// (inklusive Codegen-Aufruf über useMemo(() => generate(cfg))) serverseitig
// ohne Exception rendert. Fängt vor allem kaputte Import-Verdrahtung nach
// Refactorings auf (die "Modularisierung"-Historie dieses Projekts zeigt,
// dass genau das schon öfter passiert ist).
import React from "react";
import { renderToString } from "react-dom/server";
import { bundleJsx } from "./_bundle.mjs";

async function main() {
  const mod = await bundleJsx("src/App.jsx", "app.smoke.mjs");
  const App = mod.default;
  if (typeof App !== "function") throw new Error("src/App.jsx exportiert keine Default-Komponente.");

  const html = renderToString(React.createElement(App));
  if (!html || html.length < 200) throw new Error(`renderToString lieferte verdächtig wenig HTML (${html ? html.length : 0} Zeichen).`);
  if (!html.includes("AC_PopUp Generator")) throw new Error("Erwarteter Titeltext 'AC_PopUp Generator' fehlt im gerenderten HTML.");

  console.log(`✓ smoke-render: App rendert serverseitig ohne Fehler (${html.length} Zeichen HTML).`);
}

main().catch((e) => { console.error("✗ smoke-render fehlgeschlagen:", e); process.exit(1); });
