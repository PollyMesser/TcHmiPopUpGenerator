#!/usr/bin/env node
// ── Logik-Test: Baustein "Auswertung" (Maschinendaten) ──
// 1) Statisch: 6 Modi × 5 Varianten → parsebar, 0 Backslashes; Laufzeit-Datei aktuell.
// 2) Laufzeit (node:vm, DOM-/TcHmi-Stub, Plotly-Stub): Ergebnis-JSON per HTTP bzw.
//    Server-Symbol holen, zeichnen, Tabellen bauen, Fehlerfall, Abbau.
// 3) Editor-Varianten rendern.
// Echtes Plotly-Rendering und die Server-Anbindung sind nur in der HMI prüfbar.
import vm from "node:vm";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToString } from "react-dom/server";
import { parse } from "@babel/parser";
import { generate } from "../src/codegen/index.js";
import { newBlock, mkStepLimit } from "../src/model/factories.js";
import { analysisParams } from "../src/codegen/emitAnalysis.js";
import { makeElement, makeSandbox } from "./_dom-stub.mjs";
import { bundleJsx } from "./_bundle.mjs";
import { buildRuntimeModule } from "../analytics/scripts/build-runtime.mjs";
import { assert, assertEqual, report } from "./_assert.mjs";
import { computeFiltrationCurves, computeStepDurations } from "../analytics/index.js";
import { computeForRequest } from "../analytics/server/handler.js";
import { DEMO_JOBS } from "../analytics/scripts/demoJobs.mjs";
import { referenceRows, syntheticRows, noteSkippedReference } from "../analytics/test/fixtures.mjs";

// Testdaten: Referenz-CSV, falls vorhanden (nicht im Repo), sonst synthetische Daten.
// Die "Demo-Dateien" werden im Speicher aus denselben Daten berechnet (wie build-demo.mjs).
const REF_ROWS = referenceRows();
if (!REF_ROWS) noteSkippedReference("analysis-logic");
const csvRows = REF_ROWS || syntheticRows();
const demoCache = {};
const DEMO = (f) => demoCache[f] || (demoCache[f] = JSON.parse(JSON.stringify(computeForRequest(DEMO_JOBS[f], csvRows))));
const FC_REF = computeFiltrationCurves(csvRows, { xMode: "norm", timeZone: "Europe/Berlin" });
const N_CYC = FC_REF.info.usable;
const END_MD = FC_REF.groups[0].endMedian.toLocaleString("de-DE", { maximumFractionDigits: 1 });
const MODES = ["registered", "event", "usercontrol", "embed", "embedEvent", "embedUc"];
const cfgOf = (mode, blocks) => ({ mode, fnName: "AC_Ana", hostSuffix: ".btn_PopUp", embedTarget: "Ziel", title: "Auswertung", titleLoc: "",
  titleSource: "static", titleField: "", titleFallback: "", titleIcon: "", titleIconColor: "", maxWidth: 1000, columns: 1, blocks });

const V = {
  filtration: () => Object.assign(newBlock("analysis"), { srcMode: "http" }),
  steps: () => Object.assign(newBlock("analysis"), { widget: "steps", srcMode: "http", srcUrl: "Assets/ac-analytics-demo/steps.json", stepSeries: ["cat:active", "g:Beschicken"], stepStats: ["avg", "sum"] }),
  line: () => Object.assign(newBlock("analysis"), { widget: "trend", srcMode: "http", chart: "line", srcUrl: "Assets/ac-analytics-demo/trend-line.json" }),
  bar: () => Object.assign(newBlock("analysis"), { widget: "trend", srcMode: "http", chart: "bar", trendGroupBy: "schritt", srcUrl: "Assets/ac-analytics-demo/trend-bar.json" }),
  scatter: () => Object.assign(newBlock("analysis"), { widget: "trend", srcMode: "http", chart: "scatter", srcUrl: "Assets/ac-analytics-demo/trend-scatter.json" }),
  // Historize (Standard des Bausteins): Rohdaten per GetTrendLineData, Berechnung im Browser
  hzFiltration: () => Object.assign(newBlock("analysis"), { hzStepSymbol: "%s%ADS.AF_PLC.MAIN.CM.nStep%/s%", hzCycleSymbol: "ADS.AF_PLC.MAIN.CM.nCycle",
    hzLeistungSymbol: "ADS.AF_PLC.MAIN.CM.fLeistung", hzDays: 15, hzIntervalS: 60, hzMachine: "AC1118" }),
  hzSteps: () => Object.assign(newBlock("analysis"), { widget: "steps", caption: "Schrittdauern", hzStepSymbol: "ADS.AF_PLC.MAIN.CM.nStep", hzCycleSymbol: "ADS.AF_PLC.MAIN.CM.nCycle",
    hzDays: 15, hzIntervalS: 60, hzMachine: "AC1118" }),
};

// Historize-Antwort aus der Referenz-CSV (Format wie am 07.10.2026 bestätigt: ISO-UTC mit ms, flags "Start")
const isoOf = (s) => new Date(s * 1000).toISOString();
function hzAxes(yAxes) {
  const key = (sym) => (sym.endsWith("nStep") ? "step" : sym.endsWith("nCycle") ? "cycleNo" : "leistung");
  const off = { step: 0.012, cycleNo: 0.004, leistung: 0.021 };
  return yAxes.map((a) => csvRows.map((r, i) => {
    const pt = { x: isoOf(r.ts + off[key(a.symbol)]), y: r[key(a.symbol)] };
    if (i === 0) pt.flags = "Start";
    return pt;
  }));
}

// ── 1) Statisch ──
let genOk = true;
try { buildRuntimeModule(); } catch (e) { genOk = false; console.error(e.message); }
assert(genOk, "Laufzeit: runtime.js backslash-frei und ohne Template-Literale");
assertEqual(readFileSync(new URL("../analytics/plots/runtimeSource.generated.js", import.meta.url), "utf8"), buildRuntimeModule(), "Laufzeit: runtimeSource.generated.js ist aktuell (node analytics/scripts/build-runtime.mjs)");
for (const mode of MODES) {
  for (const [name, mk] of Object.entries(V)) {
    const code = generate(cfgOf(mode, [mk()]));
    let ok = true;
    try { parse(code, { sourceType: "script" }); } catch (e) { ok = false; if (process.env.DEBUG) console.error(mode, name, e.message); }
    assert(ok, `${mode}/${name}: parsebar`);
    assertEqual((code.match(/\\/g) || []).length, 0, `${mode}/${name}: 0 Backslashes`);
  }
}
// Nur benötigte Laufzeit-Abschnitte eingebettet
{
  const c = generate(cfgOf("event", [V.steps()]));
  assert(c.includes("function acStepPlot(") && !c.includes("function acFiltrationPlot(") && !c.includes("function acTrendPlot("), "Einbettung: nur der Abschnitt des gewählten Widgets");
}

// Anfrage-JSON
{
  const b = Object.assign(V.steps(), { machines: "AC1118, AC2000", lastDays: "14", stepLimits: [Object.assign(mkStepLimit("Beschicken"), { maxMin: "30" }), Object.assign(mkStepLimit("Öffnen"), {})] });
  const p = analysisParams(b);
  assertEqual(p.widget, "steps", "Anfrage: Widget");
  assertEqual(p.filter, { machines: ["AC1118", "AC2000"], lastDays: 14 }, "Anfrage: Filter (Maschinenliste, letzte Tage)");
  assertEqual(p.options.limits, [{ group: "Beschicken", minS: null, maxS: 1800 }], "Anfrage: Grenzwerte in Sekunden, leere Grenzwerte entfallen");
  assertEqual(analysisParams(V.scatter()).widget, "scatter", "Anfrage: Streudiagramm → widget 'scatter'");
  assertEqual(analysisParams(V.line()).options.groupBy, "tag", "Anfrage: Linie gruppiert je Tag");
}

// ── 2) Laufzeit ──
function plotlyStub() {
  const calls = { react: [], purge: 0 };
  return { calls, Plotly: { newPlot: () => Promise.resolve(), react: (d, data, layout) => { calls.react.push({ data, layout }); return Promise.resolve(); }, purge: () => { calls.purge++; }, Plots: { resize: () => Promise.resolve() } } };
}
async function run(mode, block, opts = {}) {
  const { sandbox, controlsRegistry } = makeSandbox();
  const { Plotly, calls } = plotlyStub();
  sandbox.window.Plotly = Plotly;
  const fetched = [];
  sandbox.fetch = (url, init) => {
    fetched.push({ url, init });
    if (opts.fetchFail) return Promise.reject(new Error("Netzwerk weg"));
    if (opts.httpStatus) return Promise.resolve({ ok: false, status: opts.httpStatus, json: () => Promise.resolve({}) });
    const file = url.split("/").pop();
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(DEMO(file)) });
  };
  const requests = [];
  sandbox.TcHmi.Server.requestEx = (req, o, cb) => {
    requests.push(req);
    const cmd = req.commands[0];
    if (opts.serverReply) { cb(opts.serverReply); return; }
    if (/[.]GetTrendLineData$/.test(cmd.symbol)) {
      const axesData = opts.hzCompressed ? cmd.writeValue.yAxes.map(() => new Array(cmd.writeValue.displayWidth).fill({ x: isoOf(0), y: 0 })) : hzAxes(cmd.writeValue.yAxes);
      cb({ error: 0, response: { commands: [{ symbol: cmd.symbol, readValue: { axesData, analyticsData: [] } }] } });
      return;
    }
    cb({ error: 0, response: { commands: [{ readValue: JSON.stringify(DEMO("filtration.json")) }] } });
  };
  const watchers = {};
  sandbox.TcHmi.Symbol = class { constructor(p) { this.p = p; } watch(cb) { (watchers[this.p] = watchers[this.p] || []).push(cb); return () => {}; } destroy() {} write() {} read() {} };
  if (mode === "usercontrol") {
    const trigger = makeElement("div"); trigger.id = "Uc1.btn_PopUp";
    trigger.closest = (sel) => (sel === '[id$=".btn_PopUp"]' ? trigger : null);
    controlsRegistry.Uc1 = { getId: () => "Uc1", getElement: () => [trigger], getMachineSerial: () => "AC7777" };
    sandbox.event = { target: trigger };
  }
  let err = null;
  try { vm.runInContext(generate(cfgOf(mode, [block])), vm.createContext(sandbox), { filename: "analysis.js" }); } catch (e) { err = e; }
  // warten, bis gezeichnet wurde oder ein Fehler angezeigt wird (Historize rechnet asynchron)
  for (let w = 0; w < 100; w++) {
    await new Promise((r) => setTimeout(r, 30));
    if (calls.react.length) break;
    const ov = sandbox.document.body.children[0];
    const st = ov ? ov.children[0].children[1].children[0].children[0].children[1].textContent : "";
    if (st && !/lädt|berechnet/.test(st)) break;
  }
  const overlay = sandbox.document.body.children[0];
  const wrapper = overlay ? overlay.children[0].children[1].children[0] : null;
  const statusText = wrapper ? wrapper.children[0].children[1].textContent : null;
  const tables = wrapper ? wrapper.children[2] : null;
  const close = () => overlay.children[0].children[0].children[1].onclick({ stopPropagation() {} });
  const push = (path, v) => (watchers[path] || []).forEach((cb) => cb({ error: 0, value: v }));
  return { err, calls, fetched, requests, statusText, tables, close, push, wrapper };
}
const countTag = (el, tag) => (el ? (el.tagName === tag ? 1 : 0) + (el.children || []).reduce((a, c) => a + countTag(c, tag), 0) : 0);
const allText = (el) => (el ? (el._textContent || "") + (el.children || []).map(allText).join(" ") : "");

async function main() {
  // Filtrationskurven per HTTP GET (Demo-JSON)
  {
    const r = await run("event", V.filtration());
    assert(!r.err, "Filtration/HTTP: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    assertEqual(r.fetched[0].url, "Assets/ac-analytics-demo/filtration.json", "Filtration/HTTP: Standard-Demo-URL");
    assertEqual(r.fetched[0].init.method, "GET", "Filtration/HTTP: GET ohne Body");
    assertEqual(r.calls.react.length, 1, "Filtration/HTTP: einmal gezeichnet");
    const d = r.calls.react[0].data;
    assertEqual(d.filter((t) => t.name === "Median").length, 1, "Filtration: Median-Kurve");
    assertEqual(d.filter((t) => t.fill === "tonexty").length, 1, "Filtration: Band 25.–75. Perzentil");
    assertEqual(d.filter((t) => t.name === "Sättigungsmodell").length, 0, "Filtration (vereinfacht): kein Sättigungsmodell");
    assertEqual(d.filter((t) => t.name === "Zyklen").length, 0, "Filtration (vereinfacht): keine Einzelkurven");
    assertEqual(d.length, 3, "Filtration (vereinfacht): genau 3 Traces (Band oben/unten, Median)");
    assertEqual(r.calls.react[0].layout.height, 380, "Filtration: Höhe aus dem Editor");
    assertEqual(r.calls.react[0].layout.separators, ",.", "Filtration: deutsche Trennzeichen");
    assert(countTag(r.tables, "table") >= 2, "Filtration: Kennwert-Tabelle + auffällige Zyklen");
    assert(allText(r.tables).includes(N_CYC + " Zyklen ausgewertet"), `Filtration: Info-Zeile (${N_CYC} Zyklen)`);
    assert(!allText(r.tables).includes("R²"), "Filtration (vereinfacht): keine Modellspalten in der Tabelle");
    assert(allText(r.tables).includes(END_MD), `Filtration: Ende Md = ${END_MD} in der Kennwert-Tabelle`);
    assertEqual(r.statusText, "", "Filtration: Status nach Laden leer");
    r.close();
    assertEqual(r.calls.purge, 1, "Filtration: Plotly.purge beim Schließen");
  }
  // Schrittdauern
  {
    const r = await run("event", V.steps());
    assert(!r.err, "Schritte: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    const d = r.calls.react[0].data;
    assert(d.some((t) => t.type === "bar" && t.yaxis === "y2"), "Schritte: Summe als Balken auf y2 (neben Ø)");
    assert(d.some((t) => t.name === "Σ Aktivzeit · Ø"), "Schritte: Kurve Σ Aktivzeit · Ø");
    assert(d.some((t) => t.name === "Beschicken · Σ"), "Schritte: Kurve Beschicken · Σ");
    assertEqual(r.calls.react[0].layout.xaxis.type, "date", "Schritte: Datumsachse");
    assert(allText(r.tables).includes("Prozesszeit gesamt"), "Schritte: Zusammenfassung mit Kategorien");
  }
  // Verlauf Linie / Balken / Streu
  for (const [name, axisType] of [["line", "date"], ["bar", "category"], ["scatter", undefined]]) {
    const r = await run("event", V[name]());
    assert(!r.err && r.calls.react.length === 1, `Verlauf/${name}: gezeichnet`);
    const lay = r.calls.react[0].layout;
    if (axisType) assertEqual(lay.xaxis.type || "category", axisType, `Verlauf/${name}: x-Achse ${axisType}`);
    if (name === "scatter") assert(/r = /.test(lay.yaxis.title.text), "Verlauf/scatter: Pearson-r im Achsentitel");
    assertEqual(countTag(r.tables, "table"), 0, `Verlauf/${name}: keine Tabellen`);
  }
  // Server-Symbol (readValue als JSON-String) + Maschine aus Symbol
  {
    const b = Object.assign(V.filtration(), { srcMode: "server", srcSymbol: "AC_Analytics.Compute", machineSymbol: "ADS.PLC.MAIN::sSerial", lastDays: 7 });
    const r = await run("event", b);
    assert(!r.err, "Server: läuft ohne Exception");
    assertEqual(r.requests[0].commands[0].symbol, "AC_Analytics.Compute", "Server: Symbol");
    assertEqual(r.requests[0].requestType, "ReadWrite", "Server: ReadWrite");
    assertEqual(r.requests[0].commands[0].writeValue.filter.lastDays, 7, "Server: Filter im writeValue");
    assertEqual(r.calls.react.length, 1, "Server: Ergebnis (JSON-String) gezeichnet");
    r.push("%s%ADS.PLC.MAIN::sSerial%/s%", "AC1118");
    await new Promise((res) => setTimeout(res, 400));
    assertEqual(r.requests.length, 2, "Server: Maschinen-Symbol ändert sich → neu laden");
    assertEqual(r.requests[1].commands[0].writeValue.filter.machines, ["AC1118"], "Server: Maschine aus Symbol in der Anfrage");
  }
  // UserControl: Maschine aus Attribut, POST
  {
    const b = Object.assign(V.filtration(), { srcMethod: "POST", srcUrl: "/api/analytics", machineSymbol: "MachineSerial" });
    const r = await run("usercontrol", b);
    assert(!r.err, "UC/POST: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    assertEqual(r.fetched[0].init.method, "POST", "UC/POST: POST");
    assertEqual(JSON.parse(r.fetched[0].init.body).filter.machines, ["AC7777"], "UC/POST: Maschine aus getMachineSerial()");
  }
  // Historize: Filtrationskurven im Browser gerechnet
  {
    const r = await run("event", V.hzFiltration());
    assert(!r.err, "Historize/Filtration: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    const cmd = r.requests[0].commands[0];
    assertEqual(cmd.symbol, "TcHmiPostgresHistorize.GetTrendLineData", "Historize: Domain + GetTrendLineData");
    assertEqual(r.requests[0].requestType, "ReadWrite", "Historize: ReadWrite");
    assertEqual(cmd.writeValue.yAxes.map((a) => a.symbol), ["ADS.AF_PLC.MAIN.CM.nStep", "ADS.AF_PLC.MAIN.CM.nCycle", "ADS.AF_PLC.MAIN.CM.fLeistung"], "Historize: volle Symbolpfade, %s% entfernt, Reihenfolge Schritt/Zyklus/Leistung");
    assertEqual(cmd.writeValue.displayWidth, Math.ceil(15 * 86400 / 60 * 1.25) + 10, "Historize: displayWidth = Zeitraum ÷ Intervall + 25 %");
    assertEqual(cmd.writeValue.xAxisEnd, "Latest", "Historize: xAxisEnd 'Latest'");
    assert(!("version" in cmd), "Historize: kein version-Feld (bei GetTrendLineWindow abgelehnt)");
    assert(/Z$/.test(cmd.writeValue.xAxisStart), "Historize: xAxisStart als ISO-UTC");
    assertEqual(r.calls.react.length, 1, "Historize/Filtration: gezeichnet");
    const ref = computeFiltrationCurves(csvRows, { xMode: "norm" }).groups[0];
    const med = r.calls.react[0].data.find((t) => t.name === "Median");
    assertEqual(med.y, ref.median, "Historize/Filtration: Median im Browser = Referenzrechnung (CSV)");
    assertEqual(r.calls.react[0].data.length, 3, "Historize/Filtration: nur Median + Band");
    assert(allText(r.tables).includes(N_CYC + " Zyklen ausgewertet"), `Historize/Filtration: ${N_CYC} Zyklen`);
  }
  // Historize: Schrittdauern im Browser gerechnet (ohne Leistungssymbol)
  {
    const r = await run("event", V.hzSteps());
    assert(!r.err, "Historize/Schritte: läuft ohne Exception" + (r.err ? " – " + r.err.message : ""));
    assertEqual(r.requests[0].commands[0].writeValue.yAxes.length, 2, "Historize/Schritte: nur Schritt + Zyklus abgefragt");
    const ref = computeStepDurations(csvRows, { timeZone: "Europe/Berlin" }); // Baustein ordnet Tage lokal zu
    const act = r.calls.react[0].data.find((t) => t.name === "Σ Aktivzeit · Ø");
    assertEqual(act.y, ref.categories[0].series.map((b) => b.mean / 60), "Historize/Schritte: Aktivzeit Ø je Tag = Referenzrechnung");
    assert(allText(r.tables).includes("Prozesszeit gesamt"), "Historize/Schritte: Zusammenfassung");
  }
  // Historize: verdichtete Antwort wird erkannt, unvollständige Konfiguration gemeldet, Serverfehler mit Code
  {
    const r1 = await run("event", V.hzFiltration(), { hzCompressed: true });
    assert(/verdichtet/.test(r1.statusText), "Historize: verdichtete Antwort → Hinweis statt falscher Werte");
    assertEqual(r1.calls.react.length, 0, "Historize: bei Verdichtung nichts gezeichnet");
    const r2 = await run("event", Object.assign(V.hzFiltration(), { hzLeistungSymbol: "" }));
    assert(/nicht vollständig/.test(r2.statusText), "Historize: fehlendes Leistungssymbol gemeldet");
    assertEqual(r2.requests.length, 0, "Historize: ohne Symbole keine Abfrage");
    const r3 = await run("event", V.hzFiltration(), { serverReply: { error: 0, response: { commands: [{ error: { code: 6, message: "INVALID_PARAMETER" } }] } } });
    assert(/INVALID_PARAMETER [(]6[)]/.test(r3.statusText), "Historize: Fehlercode des Servers angezeigt");
  }
  // Trend: Historize nicht vorgesehen → fällt auf HTTP zurück
  {
    const c = generate(cfgOf("event", [Object.assign(V.line(), { srcMode: "historize" })]));
    assert(!c.includes("GetTrendLineData") && !c.includes("var AC_CORE"), "Trend + Historize: kein Rechenkern, HTTP-Quelle");
    const c2 = generate(cfgOf("event", [V.hzFiltration()]));
    assert(c2.includes("var AC_CORE"), "Historize: Rechenkern eingebettet");
    assert(!generate(cfgOf("event", [V.filtration()])).includes("var AC_CORE"), "HTTP: Rechenkern nicht eingebettet");
  }

  // Fehlerfälle
  {
    const r1 = await run("event", V.filtration(), { fetchFail: true });
    assert(/^Fehler: .*Netzwerk weg/.test(r1.statusText), "Fehler: Netzwerkfehler im Status angezeigt");
    assertEqual(r1.calls.react.length, 0, "Fehler: nichts gezeichnet");
    const r2 = await run("event", V.filtration(), { httpStatus: 404 });
    assert(/HTTP 404/.test(r2.statusText), "Fehler: HTTP-Status im Status angezeigt");
    const r3 = await run("event", Object.assign(V.filtration(), { srcMode: "server" }), { serverReply: { error: 5 } });
    assert(/Server-Anfrage fehlgeschlagen/.test(r3.statusText), "Fehler: Server-Fehler im Status angezeigt");
  }

  // ── 3) Editor-Varianten ──
  const { AnalysisEditor } = await bundleJsx("src/components/editor/AnalysisEditor.jsx", "analysis-editor.smoke.mjs");
  for (const [name, mk] of Object.entries(V)) {
    for (const mode of ["registered", "usercontrol"]) {
      let ok = true;
      try { renderToString(React.createElement(AnalysisEditor, { b: Object.assign(mk(), { srcMode: name === "bar" ? "server" : "http", stepLimits: [mkStepLimit("Öffnen")] }), patch: () => {}, mode })); } catch (e) { ok = false; if (process.env.DEBUG) console.error(e); }
      assert(ok, `Editor ${name}/${mode}: rendert`);
    }
  }
  report("analysis-logic");
}

main().catch((e) => { console.error("✗ analysis-logic abgebrochen:", e); process.exit(1); });
