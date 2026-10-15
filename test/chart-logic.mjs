#!/usr/bin/env node
// ── Logik-Test: Balkendiagramm + Gauge (Codegen + Laufzeit) ──
// 1) Statisch: alle 6 Modi × 4 Varianten -> Babel-parsebar, 0 Backslashes.
// 2) Laufzeit (node:vm, DOM-/TcHmi-Stub, Plotly-Stub): Symbolwerte einspeisen
//    und prüfen, was an Plotly.react übergeben wird; Abbau beim Schließen.
//    Das tatsächliche Zeichnen ist nur in der echten HMI prüfbar.
// 3) Editor-Vorschau: BlockPreview rendert alle Varianten ohne Exception.
import vm from "node:vm";
import React from "react";
import { renderToString } from "react-dom/server";
import { parse } from "@babel/parser";
import { generate } from "../src/codegen/index.js";
import { newBlock, mkGaugeBand } from "../src/model/factories.js";
import { reidBlocks, parseConfigComment } from "../src/model/config.js";
import { makeElement, makeSandbox } from "./_dom-stub.mjs";
import { bundleJsx } from "./_bundle.mjs";
import { assert, assertEqual, report } from "./_assert.mjs";

const MODES = ["registered", "event", "usercontrol", "embed", "embedEvent", "embedUc"];
const baseCfg = (mode, blocks) => ({
  mode, fnName: "AC_ChartTest", hostSuffix: ".btn_PopUp", embedTarget: "Ziel",
  title: "Test", titleLoc: "", titleSource: "static", titleField: "", titleFallback: "", titleIcon: "", titleIconColor: "",
  maxWidth: 600, columns: 2, blocks,
});

// ── Varianten ──
function barList() {
  const b = newBlock("bar");
  b.bars[0].symbol = "ADS.P.MAIN::rA"; b.bars[1].symbol = "ADS.P.MAIN::rB"; b.bars[2].symbol = "ADS.P.MAIN::rC";
  b.limitHigh = "80"; b.limitLow = "10"; b.decimals = 1;
  return b;
}
function barArray() {
  const b = newBlock("bar");
  Object.assign(b, { source: "array", arraySymbol: "ADS.P.MAIN.aTanks", arrayCount: 4, startIndex: 1, member: "rLevel", countSymbol: "ADS.P.MAIN.nTanks", orientation: "h", autoscale: true });
  return b;
}
function gaugeAngular() {
  const b = newBlock("gauge");
  Object.assign(b, { symbol: "ADS.P.MAIN::rDruck", maxSymbol: "ADS.P.MAIN::rDruckMax", setpointMode: "symbol", setpointSymbol: "ADS.P.MAIN::rSoll" });
  return b;
}
function gaugeBullet() {
  const b = newBlock("gauge");
  Object.assign(b, { shape: "bullet", setpointMode: "fixed", setpointValue: "12", bands: [mkGaugeBand(0, 8, "#22c55e"), mkGaugeBand(8, 4, "#ef4444")] });
  return b;
}
const VARIANTS = { barList, barArray, gaugeAngular, gaugeBullet };

// ── 1) Statisch ──
for (const mode of MODES) {
  for (const [name, mk] of Object.entries(VARIANTS)) {
    const code = generate(baseCfg(mode, [mk()]));
    let ok = true;
    try { parse(code, { sourceType: "script" }); } catch (e) { ok = false; if (process.env.DEBUG) console.error(mode, name, e.message); }
    assert(ok, `${mode}/${name}: generierter Code ist parsebar`);
    assertEqual((code.match(/\\/g) || []).length, 0, `${mode}/${name}: 0 Backslashes`);
  }
}

// Ungültiger Farbbereich (bis <= von) wird verworfen
{
  const code = generate(baseCfg("event", [gaugeBullet()]));
  assert(code.includes('var BANDS = [{"range":[0,8],"color":"rgba(34,197,94,0.35)"}]'), "Gauge: nur gültige Farbbereiche, Farbe als rgba mit Alpha 0.35");
}

// Re-Import: neue IDs für Unterlisten
{
  const code = generate(baseCfg("event", [barList(), gaugeAngular()]));
  const c = parseConfigComment(code);
  const nb = reidBlocks(c.blocks);
  assertEqual(nb[0].bars.length, 3, "Re-Import: Balkenliste vollständig");
  assert(nb[0].bars.every((x, i) => x.id !== c.blocks[0].bars[i].id), "Re-Import: Balken bekommen neue IDs");
  assert(nb[1].bands.every((x, i) => x.id !== c.blocks[1].bands[i].id), "Re-Import: Farbbereiche bekommen neue IDs");
}

// ── 2) Laufzeit ──
function makePlotlyStub() {
  const calls = { newPlot: 0, react: [], purge: 0 };
  return {
    calls,
    Plotly: {
      newPlot: (div, data, layout) => { calls.newPlot++; calls.last = { data, layout }; return Promise.resolve(); },
      react: (div, data, layout) => { calls.react.push({ data, layout }); calls.last = { data, layout }; return Promise.resolve(); },
      purge: () => { calls.purge++; },
      Plots: { resize: () => Promise.resolve() },
    },
  };
}
function runtime(mode, blocks, hostAttrs) {
  const { sandbox, controlsRegistry } = makeSandbox();
  const { Plotly, calls } = makePlotlyStub();
  sandbox.window.Plotly = Plotly;
  const watched = {};       // path -> [callbacks]
  const destroyed = [];
  class WatchSymbol {
    constructor(path) { this.path = path; }
    watch(cb) { (watched[this.path] || (watched[this.path] = [])).push(cb); return () => { watched[this.path] = (watched[this.path] || []).filter((f) => f !== cb); }; }
    write() {}
    read(cb) { if (cb) cb({ error: 0, value: undefined }); }
    destroy() { destroyed.push(this.path); }
  }
  sandbox.TcHmi.Symbol = WatchSymbol;
  if (hostAttrs) {
    const trigger = makeElement("div"); trigger.id = "Uc1.btn_PopUp";
    trigger.closest = (sel) => (sel === '[id$=".btn_PopUp"]' ? trigger : null);
    const host = { getId: () => "Uc1", getElement: () => [trigger] };
    Object.keys(hostAttrs).forEach((k) => { host["get" + k] = () => hostAttrs[k]; });
    controlsRegistry.Uc1 = host;
    sandbox.event = { target: trigger };
  }
  const code = generate(baseCfg(mode, blocks));
  let err = null;
  try { vm.runInContext(code, vm.createContext(sandbox), { filename: mode + "-chart.js" }); } catch (e) { err = e; }
  const push = (path, value) => (watched[path] || []).forEach((cb) => cb({ error: 0, value }));
  const close = () => {
    const overlay = sandbox.document.body.children[0];
    const header = overlay.children[0].children[0];
    header.children[1].onclick({ stopPropagation() {} });
  };
  return { err, calls, watched, destroyed, push, close };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Balken (Liste, Symbol-Modus)
  {
    const r = runtime("event", [barList()]);
    assert(!r.err, "Balken/Liste: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    assertEqual(r.calls.newPlot, 1, "Balken/Liste: Plotly.newPlot einmal");
    assert(!!r.watched["%s%ADS.P.MAIN::rA%/s%"], "Balken/Liste: Symbol rA abonniert");
    r.push("%s%ADS.P.MAIN::rA%/s%", 50); r.push("%s%ADS.P.MAIN::rB%/s%", 95.25); r.push("%s%ADS.P.MAIN::rC%/s%", 5);
    await sleep(150);
    assertEqual(r.calls.react.length, 1, "Balken/Liste: Updates gebündelt (ein Plotly.react)");
    const tr = r.calls.last.data[0];
    assertEqual(tr.y, [50, 95.25, 5], "Balken/Liste: Werte in Reihenfolge");
    assertEqual(tr.x, ["Tank 1", "Tank 2", "Tank 3"], "Balken/Liste: Beschriftungen");
    assertEqual(tr.marker.color, ["#3b82f6", "#ef4444", "#ef4444"], "Balken/Liste: Werte außerhalb der Grenzen in Grenzwertfarbe");
    assertEqual(tr.text, ["50.0%", "95.3%", "5.0%"], "Balken/Liste: Wertetext mit Nachkomma + Einheit");
    assertEqual(r.calls.last.layout.shapes.length, 2, "Balken/Liste: zwei Grenzwertlinien");
    assertEqual(r.calls.last.layout.yaxis.range, [0, 100], "Balken/Liste: feste Achse 0–100");
    r.close();
    assertEqual(r.calls.purge, 1, "Balken/Liste: Plotly.purge beim Schließen");
    assertEqual((r.watched["%s%ADS.P.MAIN::rA%/s%"] || []).length, 0, "Balken/Liste: Abo beim Schließen beendet");
  }
  // Balken (Array, waagerecht, Anzahl-Symbol)
  {
    const r = runtime("event", [barArray()]);
    assert(!r.err, "Balken/Array: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    const paths = Object.keys(r.watched).filter((k) => k.includes("aTanks"));
    assertEqual(paths, ["%s%ADS.P.MAIN.aTanks[1]::rLevel%/s%", "%s%ADS.P.MAIN.aTanks[2]::rLevel%/s%", "%s%ADS.P.MAIN.aTanks[3]::rLevel%/s%", "%s%ADS.P.MAIN.aTanks[4]::rLevel%/s%"], "Balken/Array: Element-Symbole arr[i]::member ab Startindex");
    r.push("%s%ADS.P.MAIN.aTanks[1]::rLevel%/s%", 10); r.push("%s%ADS.P.MAIN.aTanks[2]::rLevel%/s%", 20);
    r.push("%s%ADS.P.MAIN.nTanks%/s%", 3);
    await sleep(150);
    const tr = r.calls.last.data[0];
    assertEqual(tr.orientation, "h", "Balken/Array: waagerecht");
    assertEqual(tr.y, ["Pos. 1", "Pos. 2", "Pos. 3"], "Balken/Array: Anzahl-Symbol begrenzt auf 3 Balken, Präfix + Index");
    assertEqual(tr.x, [10, 20, null], "Balken/Array: fehlende Werte als null");
    assertEqual(r.calls.last.layout.xaxis.range, undefined, "Balken/Array: Autoskalierung ohne feste Range");
    r.close();
    assert(r.destroyed.includes("%s%ADS.P.MAIN.aTanks[1]::rLevel%/s%"), "Balken/Array: eigene Symbole beim Schließen freigegeben");
  }
  // Gauge (Symbol-Modus, Max + Sollwert aus Symbol)
  {
    const r = runtime("event", [gaugeAngular()]);
    assert(!r.err, "Gauge: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    r.push("%s%ADS.P.MAIN::rDruck%/s%", 7.46); r.push("%s%ADS.P.MAIN::rDruckMax%/s%", 20); r.push("%s%ADS.P.MAIN::rSoll%/s%", 9);
    await sleep(120);
    const tr = r.calls.last.data[0];
    assertEqual(tr.value, 7.46, "Gauge: Wert übernommen");
    assertEqual(tr.gauge.axis.range, [0, 20], "Gauge: Max aus Symbol überschreibt statisches Max");
    assertEqual(tr.gauge.threshold.value, 9, "Gauge: Sollwert-Marke aus Symbol");
    assertEqual(tr.number.valueformat, ".1f", "Gauge: Nachkommastellen");
    assertEqual(tr.number.suffix, " bar", "Gauge: Einheit");
    assertEqual(tr.gauge.steps.length, 3, "Gauge: drei Farbbereiche");
    r.push("%s%ADS.P.MAIN::rDruck%/s%", "abc");
    await sleep(120);
    assertEqual(r.calls.last.data[0].value, 7.46, "Gauge: ungültiger Wert wird ignoriert");
    r.close();
    assertEqual(r.calls.purge, 1, "Gauge: Plotly.purge beim Schließen");
  }
  // Gauge (UserControl: Attribute per gv)
  {
    const g = newBlock("gauge");
    Object.assign(g, { symbol: "Pressure", setpointMode: "symbol", setpointSymbol: "PressureSet", minSymbol: "PressureMin" });
    const r = runtime("usercontrol", [g], { Pressure: 4.2, PressureSet: 6, PressureMin: 2 });
    assert(!r.err, "Gauge/UC: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    await sleep(120);
    const tr = r.calls.last.data[0];
    assertEqual(tr.value, 4.2, "Gauge/UC: Wert aus getPressure()");
    assertEqual(tr.gauge.threshold.value, 6, "Gauge/UC: Sollwert aus getPressureSet()");
    assertEqual(tr.gauge.axis.range, [2, 16], "Gauge/UC: Min aus getPressureMin()");
  }
  // Balken (UserControl, Liste über Attribute)
  {
    const b = newBlock("bar");
    b.bars[0].symbol = "Level1"; b.bars[1].symbol = "Level2"; b.bars[2].symbol = "";
    const r = runtime("usercontrol", [b], { Level1: 30, Level2: 60 });
    assert(!r.err, "Balken/UC: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    await sleep(150);
    assertEqual(r.calls.last.data[0].y, [30, 60, null], "Balken/UC: Werte aus getLevel1()/getLevel2(), leeres Attribut = null");
  }

  // ── 3) Editor-Vorschau ──
  const mod = await bundleJsx("src/components/preview.jsx", "preview-chart.smoke.mjs");
  const pal = { bodyText: "#e0e0e0", titleColor: "#fff", border: "#2a2d3a", closeColor: "#9aa0b4", active: "#22c55e", inactive: "#4b5563" };
  for (const [name, mk] of Object.entries(VARIANTS)) {
    let html = "", ok = true;
    try { html = renderToString(React.createElement(mod.BlockPreview, { b: mk(), pal, on: {}, onToggle: () => {} })); } catch (e) { ok = false; if (process.env.DEBUG) console.error(e); }
    assert(ok && html.length > 100, `Vorschau ${name}: rendert`);
  }

  report("chart-logic");
}

main().catch((e) => { console.error("✗ chart-logic abgebrochen:", e); process.exit(1); });
