#!/usr/bin/env node
// ── Logik-Test: Embed-Modus (mode:'embed') ──
// Deckt genau die Regression ab, die diesen Testlauf ursprünglich ausgelöst
// hat: commit 4e79c2d entfernte den embed-Zweig aus codegen/index.js, sodass
// 'embed' klanglos auf das registered-Template zurückfiel. Prüft sowohl den
// generierten Quelltext strukturell als auch die tatsächliche Laufzeit-API
// (AC_HMI[fn]/[fn+Destroy], resolveTarget-Auflösungswege, Idempotenz).
import vm from "node:vm";
import { generate } from "../src/codegen/index.js";
import { newBlock, mkButton } from "../src/model/factories.js";
import { makeElement, makeSandbox } from "./_dom-stub.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const cfg = {
  mode: "embed", fnName: "AC_EmbedTest", title: "T", titleLoc: "", titleSource: "static",
  titleField: "", titleFallback: "", titleIcon: "", titleIconColor: "",
  maxWidth: 400, columns: 1, hostSuffix: "",
  blocks: [
    { ...newBlock("bool"), label: "Aktiv", symbol: "ADS.…::xActive" },
    { ...newBlock("button"), buttons: [{ ...mkButton(), label: "OK", symbol: "ADS.…::xOk" }] },
  ],
};
const code = generate(cfg);

// ── 1) Struktur-Checks am generierten Quelltext ──
assert(code.includes("function resolveTarget("), "embed-Code enthält resolveTarget()");
assert(code.includes("__acEmbedDestroy"), "embed-Code enthält den Idempotenz-Teardown __acEmbedDestroy");
assert(!code.includes("makeDraggable"), "embed-Code enthält KEIN Drag-Verhalten (kein Overlay-Popup)");
assert(!code.includes("function buildDialog"), "embed-Code enthält KEIN Overlay-Dialog-Aufbau (buildDialog)");
const registerCount = (code.match(/registerFunctionEx/g) || []).length;
assertEqual(registerCount, 2, "embed-Code registriert genau zwei Funktionen (fn + fnDestroy)");
assert(code.includes("AC_EmbedTestDestroy"), "Destroy-Funktion trägt den erwarteten Namen");
const bsCount = (code.match(/\\/g) || []).length;
assertEqual(bsCount, 0, "embed-Code ist backslash-frei (harte TcHMI-Einbettungs-Regel)");

// ── 2) Laufzeit: Skript ausführen, öffentliche API AC_HMI[fn]/[fn+Destroy] antesten ──
const { sandbox, controlsRegistry } = makeSandbox();
const context = vm.createContext(sandbox);
vm.runInContext(code, context, { filename: "embed-under-test.js" });
const AC_HMI = context.TcHmi.Functions.AC_HMI;
assertEqual(typeof AC_HMI.AC_EmbedTest, "function", "AC_HMI.AC_EmbedTest ist registriert");
assertEqual(typeof AC_HMI.AC_EmbedTestDestroy, "function", "AC_HMI.AC_EmbedTestDestroy ist registriert");

// a) Direktes DOM-Element (nodeType === 1)
const el = makeElement("div"); el.nodeType = 1;
AC_HMI.AC_EmbedTest(el);
assertEqual(el.children.length, 1, "Aufruf mit DOM-Element hängt genau ein body-div ein");

// f) Idempotenz: zweiter Aufruf räumt die alte Instanz vorher ab (kein Duplikat)
AC_HMI.AC_EmbedTest(el);
assertEqual(el.children.length, 1, "Zweiter Aufruf auf denselben Container hinterlässt weiterhin nur ein body-div");

// g) Destroy entfernt das eingehängte body-div und den Teardown-Marker
AC_HMI.AC_EmbedTestDestroy(el);
assertEqual(el.children.length, 0, "Destroy entfernt das eingehängte body-div");
assertEqual(el.__acEmbedDestroy, undefined, "Destroy löscht den __acEmbedDestroy-Marker");

// b) Ziel als id-String (document.getElementById)
const byIdEl = makeElement("div"); byIdEl.nodeType = 1;
context.document.getElementById = (id) => (id === "MeinDiv" ? byIdEl : null);
AC_HMI.AC_EmbedTest("MeinDiv");
assertEqual(byIdEl.children.length, 1, "Ziel als id-String wird über document.getElementById aufgelöst");
AC_HMI.AC_EmbedTestDestroy("MeinDiv");

// c) Ziel als TcHMI-Control-Name (Controls.get(...).getElement())
const ctrlEl = makeElement("div"); ctrlEl.nodeType = 1;
controlsRegistry.MeinContainer = { getElement: () => [ctrlEl] };
context.document.getElementById = () => null; // id-Weg soll hier NICHT greifen
AC_HMI.AC_EmbedTest("MeinContainer");
assertEqual(ctrlEl.children.length, 1, "Ziel als TcHMI-Control-Name wird über Controls.get().getElement() aufgelöst");
AC_HMI.AC_EmbedTestDestroy("MeinContainer");

// d) Ziel als CSS-Selektor-Fallback (document.querySelector)
const selEl = makeElement("div"); selEl.nodeType = 1;
context.document.querySelector = (sel) => (sel === "#foo .bar" ? selEl : null);
AC_HMI.AC_EmbedTest("#foo .bar");
assertEqual(selEl.children.length, 1, "Ziel als CSS-Selektor wird über document.querySelector aufgelöst");
AC_HMI.AC_EmbedTestDestroy("#foo .bar");

// e) Ungültiges Ziel: kein Treffer -> kein Crash, keine Einhängung, Warnung
let warned = false;
context.console.warn = () => { warned = true; }; // dieselbe Referenz wie window.console
let threw = false;
try { AC_HMI.AC_EmbedTest("NichtVorhanden"); } catch (e) { threw = true; }
assert(!threw, "Ungültiges Ziel wirft keine Exception");
assert(warned, "Ungültiges Ziel loggt eine Warnung (console.warn)");

report("embed-test");
