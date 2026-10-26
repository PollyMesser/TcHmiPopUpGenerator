#!/usr/bin/env node
// ── Logik-Test: Halte-Button (writeMode 'hold', z. B. Tippbetrieb) ──
// Sicherheitsrelevant: Nach einem Druck muss das Loslassen IMMER FALSE
// schreiben – auch wenn der Button inzwischen über enableIf gesperrt wurde
// (z. B. Sammelstörung während des Tippens), bei pointercancel (Touch) und
// wenn das Popup/Embed abgebaut wird, während noch gedrückt ist.
// Sonst bliebe das Befehlsbit TRUE stehen und die SPS würde nach Wegfall
// der Sperre von selbst wieder tippen.
import vm from "node:vm";
import { generate } from "../src/codegen/index.js";
import { newBlock, mkButton } from "../src/model/factories.js";
import { makeElement, makeSandbox } from "./_dom-stub.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const BASE = {
  title: "", titleLoc: "", titleSource: "static", titleField: "", titleFallback: "", titleIcon: "", titleIconColor: "",
  maxWidth: 400, columns: 1,
};
const fire = (el, type) => (el._listeners[type] || []).forEach((fn) => fn({ stopPropagation() {} }));
const findBtn = (el, text) => {
  if (el.tagName === "button" && (el._textContent || "") === text) return el;
  for (const c of (el.children || [])) { const f = findBtn(c, text); if (f) return f; }
  return null;
};

// ── UserControl (embedUc): Zeilen-Button und Button-Baustein ──
function runUc(blocks) {
  const code = generate({ ...BASE, mode: "embedUc", fnName: "AC_HoldUc", hostSuffix: ".ucEmbed", blocks });
  const { sandbox, controlsRegistry } = makeSandbox();
  let tick = null;
  sandbox.setInterval = (fn) => { tick = fn; return 1; };
  const trigger = makeElement("div"); trigger.id = "Pump1.ucEmbed";
  trigger.closest = (sel) => (sel === '[id$=".ucEmbed"]' ? trigger : null);
  const state = { enabled: true, writes: [] };
  controlsRegistry.Pump1 = {
    getElement: () => [trigger],
    getManualEnabled: () => state.enabled,
    setCmdJog: (v) => state.writes.push(v),
  };
  sandbox.event = { target: trigger };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx, { filename: "hold-uc.js" });
  return { trigger, state, tick: () => tick && tick(), destroy: () => trigger.__acEmbedDestroy && trigger.__acEmbedDestroy() };
}
const jogItem = { ...mkButton(), kind: "button", id: "i1", label: "Tippen", symbol: "CmdJog", writeMode: "hold", closeAfter: false,
  enableIf: [{ id: "c1", symbol: "ManualEnabled", op: "==", value: "true" }] };
const jogRow = { ...newBlock("row"), items: [jogItem] };
const jogBlock = { ...newBlock("button"), buttons: [{ ...jogItem }] };

for (const [name, block] of [["Zeile", jogRow], ["Button-Baustein", jogBlock]]) {
  // a) normal: drücken TRUE, loslassen FALSE
  {
    const r = runUc([block]);
    const b = findBtn(r.trigger, "Tippen");
    assert(!!b, `${name}: Tipp-Button gerendert`);
    fire(b, "pointerdown"); fire(b, "pointerup");
    assertEqual(r.state.writes, [true, false], `${name}: drücken/loslassen schreibt TRUE, FALSE`);
    fire(b, "pointerleave");
    assertEqual(r.state.writes, [true, false], `${name}: pointerleave ohne Druck schreibt nichts`);
  }
  // b) während gedrückt gesperrt (Sammelstörung) -> Loslassen schreibt trotzdem FALSE
  {
    const r = runUc([block]);
    const b = findBtn(r.trigger, "Tippen");
    fire(b, "pointerdown");
    r.state.enabled = false; r.tick();
    assertEqual(b.disabled, true, `${name}: Button wird bei ManualEnabled FALSE gesperrt`);
    fire(b, "pointerup");
    assertEqual(r.state.writes, [true, false], `${name}: gesperrt während gedrückt -> Loslassen schreibt FALSE`);
  }
  // c) gesperrt: Drücken schreibt nichts
  {
    const r = runUc([block]);
    const b = findBtn(r.trigger, "Tippen");
    r.state.enabled = false; r.tick();
    fire(b, "pointerdown"); fire(b, "pointerup");
    assertEqual(r.state.writes, [], `${name}: gesperrter Button schreibt weder TRUE noch FALSE`);
  }
  // d) pointercancel (Touch-Abbruch) -> FALSE
  {
    const r = runUc([block]);
    const b = findBtn(r.trigger, "Tippen");
    fire(b, "pointerdown"); fire(b, "pointercancel");
    assertEqual(r.state.writes, [true, false], `${name}: pointercancel schreibt FALSE`);
  }
  // e) Abbau während gedrückt -> FALSE (genau einmal)
  {
    const r = runUc([block]);
    const b = findBtn(r.trigger, "Tippen");
    fire(b, "pointerdown");
    r.destroy();
    assertEqual(r.state.writes, [true, false], `${name}: Abbau während gedrückt schreibt FALSE`);
    fire(b, "pointerup");
    assertEqual(r.state.writes, [true, false], `${name}: Loslassen nach Abbau schreibt nicht doppelt`);
  }
}

// ── Symbol-Modus (embed): gleiche Regel mit writeSymbol ──
{
  const item = { ...jogItem, symbol: "ADS.…::bCmdJog", enableIf: [] };
  const code = generate({ ...BASE, mode: "embed", fnName: "AC_HoldSym", hostSuffix: "", blocks: [{ ...newBlock("row"), items: [item] }] });
  const { sandbox } = makeSandbox();
  const writes = [];
  sandbox.TcHmi.Symbol = class {
    constructor(p) { this.p = p; }
    watch() { return () => {}; }
    write(v) { writes.push(v); } read() {} destroy() {}
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(code, ctx, { filename: "hold-sym.js" });
  const el = makeElement("div");
  ctx.TcHmi.Functions.AC_HMI.AC_HoldSym(el);
  const b = findBtn(el, "Tippen");
  fire(b, "pointerdown"); fire(b, "pointercancel");
  assertEqual(writes, [true, false], "Symbol: pointercancel schreibt FALSE");
  fire(b, "pointerdown");
  ctx.TcHmi.Functions.AC_HMI.AC_HoldSymDestroy(el);
  assertEqual(writes, [true, false, true, false], "Symbol: Abbau während gedrückt schreibt FALSE");
}

report("hold-logic");
