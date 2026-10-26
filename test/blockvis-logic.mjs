#!/usr/bin/env node
// ── Logik-Test: Baustein-Sichtbarkeit (b.visSym) ──
// Ein Baustein ist nur sichtbar, solange das angegebene Bool TRUE ist
// (UserControl: Attribut per gv/Polling, Symbol-Modi: subscribe()).
// Geprüft werden:
//   1) Byte-Identität: leeres/fehlendes visSym ändert den Output nicht
//   2) Diagramm-/Tabellen-Bausteine ignorieren visSym (Größe 0 beim Aufbau)
//   3) Syntax (Babel) und Backslash-Freiheit in allen Modi
//   4) Laufzeit UserControl (embedUc): TRUE -> sichtbar, FALSE/fehlend -> versteckt
//   5) Laufzeit Symbol-Modus (embed): Wert aus watch() schaltet sichtbar/versteckt
import vm from "node:vm";
import { parse } from "@babel/parser";
import { generate } from "../src/codegen/index.js";
import { newBlock, mkButton } from "../src/model/factories.js";
import { blockVisSupported } from "../src/model/blockVis.js";
import { makeElement, makeSandbox } from "./_dom-stub.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const BASE = {
  title: "", titleLoc: "", titleSource: "static", titleField: "", titleFallback: "", titleIcon: "", titleIconColor: "",
  maxWidth: 400, columns: 1, hostSuffix: ".btn_X",
};
const MODES = ["registered", "event", "usercontrol", "embed", "embedEvent", "embedUc"];
const isUc = (m) => m === "usercontrol" || m === "embedUc";

function cfgFor(mode, blocks) {
  return { ...BASE, mode, fnName: "AC_VisTest", embedTarget: mode === "embedEvent" ? "VisBox" : "", blocks };
}
// generate() hängt die Re-Import-Konfiguration an; für die Byte-Vergleiche nur den Code nehmen
const codeOnly = (code) => code.split("// ── AC_PopUp Generator: Konfiguration für Re-Import")[0];

// ── 1) Byte-Identität ohne visSym ──
for (const mode of MODES) {
  const sym = isUc(mode) ? "Running" : "ADS.…::xRunning";
  const a = generate(cfgFor(mode, [{ ...newBlock("bool"), label: "Läuft", symbol: sym }]));
  const b = generate(cfgFor(mode, [{ ...newBlock("bool"), label: "Läuft", symbol: sym, visSym: "" }]));
  const c = generate(cfgFor(mode, [{ ...newBlock("bool"), label: "Läuft", symbol: sym, visSym: "   " }]));
  assertEqual(codeOnly(b), codeOnly(a), `${mode}: leeres visSym erzeugt identischen Code`);
  assertEqual(codeOnly(c), codeOnly(a), `${mode}: visSym nur aus Leerzeichen erzeugt identischen Code`);
}

// ── 2) Ausgeschlossene Bausteintypen ignorieren visSym ──
for (const t of ["plot", "bar", "gauge", "analysis", "table"]) {
  assert(!blockVisSupported(t), `blockVisSupported('${t}') = false`);
  const a = generate(cfgFor("registered", [{ ...newBlock(t) }]));
  const b = generate(cfgFor("registered", [{ ...newBlock(t), visSym: "ADS.…::xShow" }]));
  assertEqual(codeOnly(b), codeOnly(a), `${t}: visSym wird ignoriert (Code unverändert)`);
}
for (const t of ["text", "read", "bool", "check", "input", "progress", "row", "enum", "enumset", "status", "button", "divider"]) {
  assert(blockVisSupported(t), `blockVisSupported('${t}') = true`);
}

// ── 3) Syntax + Backslash-Freiheit, Wrapper vorhanden ──
for (const mode of MODES) {
  const uc = isUc(mode);
  const blocks = [
    { ...newBlock("status"), label: "Drehrichtung", visSym: uc ? "DirectionAvailable" : "ADS.…::bDirectionAvailable",
      map: [{ id: "m1", symbol: uc ? "Clockwise" : "ADS.…::bClockwise", loc: "", text: "Vorwärts", color: "green" }], fbText: "Rückwärts", fbLoc: "", fbColor: "yellow" },
    { ...newBlock("row"), visSym: uc ? "DirectionAvailable" : "ADS.…::bDirectionAvailable", items: [{ ...mkButton(), kind: "button", id: "i1", label: "Vor", symbol: uc ? "CmdClockwise" : "ADS.…::bCmdClockwise", writeMode: "pulse" }] },
  ];
  const code = generate(cfgFor(mode, blocks));
  let ok = true;
  try { parse(codeOnly(code), { sourceType: "script", allowReturnOutsideFunction: true }); } catch (e) { ok = false; }
  assert(ok, `${mode}: generierter Code ist syntaktisch gültig`);
  assertEqual((code.match(/\\/g) || []).length, 0, `${mode}: backslash-frei`);
  assertEqual((code.match(/var visW = document.createElement/g) || []).length, 2, `${mode}: zwei Sichtbarkeits-Wrapper`);
  if (uc) assert(code.includes("gv(\"DirectionAvailable\", false) ? '' : 'none'"), `${mode}: Wrapper liest Attribut per gv()`);
  else assert(code.includes("subscribe(\"%s%ADS.…::bDirectionAvailable%/s%\""), `${mode}: Wrapper abonniert Symbol (geklammert)`);
}

// ── 4) Laufzeit UserControl (embedUc) ──
function findByText(el, text) {
  if ((el._textContent || "") === text) return el;
  for (const c of (el.children || [])) { const f = findByText(c, text); if (f) return f; }
  return null;
}
function runUc(hostExtra) {
  const cfg = {
    ...BASE, mode: "embedUc", fnName: "AC_VisUc", hostSuffix: ".ucEmbed",
    blocks: [
      { ...newBlock("read"), label: "Immer", symbol: "PumpType" },
      { ...newBlock("read"), label: "Optional", symbol: "ActFrequency", visSym: "DirectionAvailable" },
    ],
  };
  const code = generate(cfg);
  const { sandbox, controlsRegistry } = makeSandbox();
  const trigger = makeElement("div"); trigger.id = "Pump1.ucEmbed";
  trigger.closest = (sel) => (sel === '[id$=".ucEmbed"]' ? trigger : null);
  controlsRegistry.Pump1 = { getElement: () => [trigger], getPumpType: () => "DMP", getActFrequency: () => 0, ...hostExtra };
  sandbox.event = { target: trigger };
  let threw = false;
  try { vm.runInContext(code, vm.createContext(sandbox), { filename: "blockvis-uc.js" }); } catch (e) { threw = true; }
  const lbl = findByText(trigger, "Optional");
  // Wrapper = Elternteil der Baustein-Zeile (row -> visW)
  const visW = lbl && lbl.parentNode && lbl.parentNode.parentNode;
  return { threw, trigger, visW, always: findByText(trigger, "Immer") };
}
{
  const r = runUc({ getDirectionAvailable: () => true });
  assert(!r.threw, "UC: läuft ohne Exception (Attribut TRUE)");
  assert(!!r.always, "UC: Baustein ohne visSym wird gebaut");
  assert(!!r.visW, "UC: Baustein mit visSym wird im Wrapper gebaut");
  assertEqual(r.visW && r.visW.style.display, "", "UC: Attribut TRUE -> sichtbar");
}
{
  const r = runUc({ getDirectionAvailable: () => false });
  assert(!r.threw, "UC: läuft ohne Exception (Attribut FALSE)");
  assertEqual(r.visW && r.visW.style.display, "none", "UC: Attribut FALSE -> versteckt");
}
{
  const r = runUc({});
  assert(!r.threw, "UC: läuft ohne Exception (Attribut fehlt am Host)");
  assertEqual(r.visW && r.visW.style.display, "none", "UC: Attribut fehlt -> versteckt (Default false)");
}

// ── 5) Laufzeit Symbol-Modus (embed) ──
function runSym(value) {
  const cfg = {
    ...BASE, mode: "embed", fnName: "AC_VisSym",
    blocks: [{ ...newBlock("read"), label: "Optional", symbol: "ADS.…::fFreq", visSym: "ADS.…::bShow" }],
  };
  const code = generate(cfg);
  const { sandbox } = makeSandbox();
  // Symbol-Stub: watch() liefert für bShow sofort den Testwert
  sandbox.TcHmi.Symbol = class {
    constructor(p) { this.p = p; }
    watch(cb) { if (this.p.indexOf("bShow") >= 0) cb({ error: 0, value }); return () => {}; }
    write() {} read() {} destroy() {}
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx, { filename: "blockvis-sym.js" });
  const el = makeElement("div");
  ctx.TcHmi.Functions.AC_HMI.AC_VisSym(el);
  const lbl = findByText(el, "Optional");
  return lbl && lbl.parentNode && lbl.parentNode.parentNode;
}
assertEqual(runSym(true) && runSym(true).style.display, "", "Symbol: Wert TRUE -> sichtbar");
assertEqual(runSym(false) && runSym(false).style.display, "none", "Symbol: Wert FALSE -> versteckt");

report("blockvis-logic");
