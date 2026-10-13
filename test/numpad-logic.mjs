#!/usr/bin/env node
// ── Logik-Test: AC_NumPad (eigenständige Funktionsdatei) + Aufrufer-Seite ──
// 1) Funktionsdatei: Babel-Parse, 0 Backslashes, Registrierung, reine Helfer
//    (parseEntry/checkRange/fmtNum/normOpts/toSym) per Hook aus dem ECHTEN Output.
// 2) Tabelle: Keypad-Spalte (Array + statisch) -> Grenzwert-Pfade, Titel,
//    Aufruf von TcHmi.Functions.AC_HMI.AC_NumPad mit den richtigen Optionen.
// 3) Eingabefeld-Baustein (registriert): Klick öffnet AC_NumPad, onWritten löst
//    den Trigger aus; ohne Keypad-Option bleibt der Bestands-Emitter aktiv.
// Die DOM-Bedienung des NumPads selbst (Cursor/Markierung/Tastatur) braucht einen
// echten Browser und ist nicht Teil dieses node-Tests.
import vm from "node:vm";
import { parse } from "@babel/parser";
import { generateNumPad, NUMPAD_FN } from "../src/codegen/emitNumPad.js";
import { generate } from "../src/codegen/index.js";
import { newBlock, mkTableCol, mkTableRow } from "../src/model/factories.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { makeElement, makeSandbox } from "./_dom-stub.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

// ── 1) Funktionsdatei ──
const code = generateNumPad();
let parsed = true;
try { parse(code, { sourceType: "script" }); } catch (e) { parsed = false; }
assert(parsed, "NumPad-Code ist syntaktisch gültiges JS (Babel)");
assertEqual((code.match(/\\/g) || []).length, 0, "NumPad-Code ist backslash-frei");
assertEqual((code.match(/registerFunctionEx\(/g) || []).length, 1, "genau eine Registrierung");
assertEqual(generateNumPad(), code, "Ausgabe ist deterministisch (konfigurationsunabhängig)");

const hookLine = `AC_HMI.${NUMPAD_FN} = ${NUMPAD_FN};`;
assert(code.includes(hookLine), "Export-Zeile für Hook vorhanden");
const injected = code.replace(hookLine, hookLine + " AC_HMI.__np = { parseEntry: parseEntry, checkRange: checkRange, fmtNum: fmtNum, normOpts: normOpts, toSym: toSym };");
const S1 = makeSandbox();
const ctx1 = vm.createContext(S1.sandbox);
vm.runInContext(injected, ctx1, { filename: "AC_NumPad-under-test.js" });
assertEqual(S1.registerCalls.map((c) => [c.name, c.ns]), [[NUMPAD_FN, "TcHmi.Functions.AC_HMI"]], "registerFunctionEx(AC_NumPad, TcHmi.Functions.AC_HMI)");
assertEqual(typeof ctx1.TcHmi.Functions.AC_HMI[NUMPAD_FN], "function", "AC_HMI.AC_NumPad ist eine Funktion");
const np = ctx1.TcHmi.Functions.AC_HMI.__np;

// parseEntry
const pe = (t, d) => { const r = np.parseEntry(t, d); return r.state === "ok" ? ["ok", r.num] : [r.state]; };
assertEqual(pe("", 1), ["empty"], "parseEntry: leer");
assertEqual(pe("  ", 1), ["empty"], "parseEntry: nur Leerzeichen");
assertEqual(pe("12.5", 1), ["ok", 12.5], "parseEntry: 12.5");
assertEqual(pe("12,5", 1), ["ok", 12.5], "parseEntry: Komma als Dezimaltrenner");
assertEqual(pe("-3", -1), ["ok", -3], "parseEntry: negativ");
assertEqual(pe(".5", -1), ["ok", 0.5], "parseEntry: .5");
assertEqual(pe("5.", -1), ["ok", 5], "parseEntry: 5.");
assertEqual(pe("-", -1), ["invalid"], "parseEntry: nur Minus");
assertEqual(pe(".", -1), ["invalid"], "parseEntry: nur Punkt");
assertEqual(pe("1.2.3", -1), ["invalid"], "parseEntry: zwei Punkte");
assertEqual(pe("1-2", -1), ["invalid"], "parseEntry: Minus in der Mitte");
assertEqual(pe("1e3", -1), ["invalid"], "parseEntry: Exponent nicht erlaubt");
assertEqual(pe("1.25", 1), ["decimals"], "parseEntry: zu viele Nachkommastellen");
assertEqual(pe("2.5", 0), ["decimals"], "parseEntry: Ganzzahl mit Nachkomma");
assertEqual(pe("2.0", 0), ["decimals"], "parseEntry: Ganzzahl -> auch .0 abgelehnt");
assertEqual(pe("1.25", -1), ["ok", 1.25], "parseEntry: freie Nachkommastellen");

// checkRange (inkl. REAL-Toleranz)
assertEqual(np.checkRange(5, 0, 16), "", "checkRange: im Bereich");
assertEqual(np.checkRange(0, 0, 16), "", "checkRange: Untergrenze inklusiv");
assertEqual(np.checkRange(16, 0, 16), "", "checkRange: Obergrenze inklusiv");
assertEqual(np.checkRange(-0.1, 0, 16), "low", "checkRange: zu klein");
assertEqual(np.checkRange(16.1, 0, 16), "high", "checkRange: zu groß");
assertEqual(np.checkRange(0.1, 0.10000000149011612, 1), "", "checkRange: REAL 0.1 vs. Min 0.100000001 -> ok");
assertEqual(np.checkRange(1e9, null, null), "", "checkRange: ohne Grenzen");
assertEqual(np.checkRange(-5, null, 0), "", "checkRange: nur Max");

// fmtNum
assertEqual(np.fmtNum(0.8, 1), "0.8", "fmtNum: 1 Stelle");
assertEqual(np.fmtNum(16, 1), "16.0", "fmtNum: 16 -> 16.0");
assertEqual(np.fmtNum(0.10000000149011612, -1), "0.1", "fmtNum: frei -> REAL-Rauschen gerundet");
assertEqual(np.fmtNum("", 1), "", "fmtNum: leer bleibt leer");
assertEqual(np.fmtNum(7, 0), "7", "fmtNum: Ganzzahl");

// normOpts / toSym
assertEqual(np.toSym("GVL.x"), "%s%GVL.x%/s%", "toSym: Pfad wird eingeschlossen");
assertEqual(np.toSym("%s%GVL.x%/s%"), "%s%GVL.x%/s%", "toSym: bereits eingeschlossen bleibt");
assertEqual(np.toSym(""), "", "toSym: leer");
const o1 = np.normOpts("GVL.rP", 0, "GVL.rMax", "bar", 1, "Druck");
assertEqual([o1.symbol, o1.writeSymbol, o1.min, o1.max, o1.unit, o1.decimals, o1.title],
  ["%s%GVL.rP%/s%", "%s%GVL.rP%/s%", 0, "GVL.rMax", "bar", 1, "Druck"], "normOpts: Positionsparameter");
const o2 = np.normOpts({ symbol: "GVL.a", writeSymbol: "GVL.b", decimals: "" });
assertEqual([o2.symbol, o2.writeSymbol, o2.decimals, o2.title], ["%s%GVL.a%/s%", "%s%GVL.b%/s%", -1, "Wert eingeben"], "normOpts: Objekt, getrenntes Schreibziel, Default-Titel");

// ── 2) Tabelle: Keypad-Spalte ──
const npCalls = [];
function withPad(H) { H.TcHmi.Functions.AC_HMI[NUMPAD_FN] = (o) => npCalls.push(o); return H; }

// a) Array-Modus: Grenzen aus derselben Struktur
const aName = { ...mkTableCol("text"), header: "Parameter" };
const aVal = { ...mkTableCol("input"), header: "Wert", member: "rValue", unit: "bar", decimals: "1", keypad: true, kpMin: "rMin", kpMax: "rMax" };
const HA = withPad(buildTableHooks({ ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.PLC.GVL.aParam", arrayCount: 4, startIndex: 1, columns: [aName, aVal], rows: [] }));
const kpCol = HA.TCOLS[1];
assertEqual(kpCol.kp, { min: { m: "rMin" }, max: { m: "rMax" } }, "Array: kp-Konfiguration im TCOLS-JSON");
assertEqual(HA.kpLimit(2, 1, kpCol.kp.min), "%s%ADS.PLC.GVL.aParam[3]::rMin%/s%", "Array: Min-Pfad je Zeile (START_INDEX+r)");
assertEqual(HA.kpLimit(0, 1, kpCol.kp.max), "%s%ADS.PLC.GVL.aParam[1]::rMax%/s%", "Array: Max-Pfad Zeile 0");
assertEqual(HA.kpTitle(2, 1), "Wert [3]", "Array: Titel ohne Textwert = Kopf + [Index]");
HA.openPadT(2, 1);
assertEqual(npCalls.length, 1, "Array: openPadT ruft AC_NumPad auf");
assertEqual(npCalls[0], { symbol: "%s%ADS.PLC.GVL.aParam[3]::rValue%/s%", min: "%s%ADS.PLC.GVL.aParam[3]::rMin%/s%", max: "%s%ADS.PLC.GVL.aParam[3]::rMax%/s%", unit: "bar", decimals: 1, title: "Wert [3]" }, "Array: Optionen an AC_NumPad");
// Zelle: Button, Klick -> openPadT
const pp = HA.palT();
const td = HA.buildCellEl(0, 1, pp);
const kb = td.children[0];
assertEqual(kb && kb.tagName, "button", "Array: Keypad-Zelle ist ein Button (operate-Sperre greift über querySelectorAll)");
kb.onclick({ stopPropagation() {} });
assertEqual(npCalls.length, 2, "Array: Klick auf Zelle öffnet AC_NumPad");
kb.disabled = true; kb.onclick({ stopPropagation() {} });
assertEqual(npCalls.length, 2, "Array: deaktivierte Zelle öffnet nichts");

// b) Statisch: Geschwister-Variable + feste Grenze + Zeilenname aus Textspalte
const sName = { ...mkTableCol("text"), header: "Parameter" };
const sVal = { ...mkTableCol("input"), header: "Sollwert", unit: "%", decimals: "0", keypad: true, kpMin: "0", kpMax: "rMax" };
const r1 = mkTableRow(2); r1.cells[0].text = "Pumpe 1"; r1.cells[1].symbol = "ADS.PLC.GVL.stPump1::rSpeed";
const r2 = mkTableRow(2); r2.cells[0].text = "Pumpe 2"; r2.cells[1].symbol = "ADS.PLC.GVL.rPump2Speed";
const r3 = mkTableRow(2); r3.cells[0].text = "Ohne Pfadteil"; r3.cells[1].symbol = "Lokal";
const HS = withPad(buildTableHooks({ ...newBlock("table"), dataSource: "static", columns: [sName, sVal], rows: [r1, r2, r3] }));
const sCol = HS.TCOLS[1];
assertEqual(sCol.kp, { min: { n: 0 }, max: { m: "rMax" } }, "Statisch: Zahl -> {n}, Text -> {m}");
assertEqual(HS.kpLimit(0, 1, sCol.kp.max), "%s%ADS.PLC.GVL.stPump1::rMax%/s%", "Statisch: '::'-Member ersetzt");
assertEqual(HS.kpLimit(1, 1, sCol.kp.max), "%s%ADS.PLC.GVL.rMax%/s%", "Statisch: '.'-Variable ersetzt (Geschwister-Variable)");
assertEqual(HS.kpLimit(0, 1, sCol.kp.min), 0, "Statisch: feste Grenze");
assert(Number.isNaN(HS.kpLimit(2, 1, sCol.kp.max)), "Statisch: nicht ableitbar -> NaN (AC_NumPad sperrt OK)");
assertEqual(HS.siblingSym("%s%A.B::c%/s%", "::d"), "%s%A.B::d%/s%", "siblingSym: Member mit führendem '::' unverändert angehängt");
assertEqual(HS.kpTitle(1, 1), "Sollwert – Pumpe 2", "Statisch: Titel = Kopf – Zeilenname");
HS.openPadT(0, 1);
assertEqual(npCalls[2], { symbol: "%s%ADS.PLC.GVL.stPump1::rSpeed%/s%", min: 0, max: "%s%ADS.PLC.GVL.stPump1::rMax%/s%", unit: "%", decimals: 0, title: "Sollwert – Pumpe 1" }, "Statisch: Optionen an AC_NumPad");

// c) Keypad bei Text-/Zeit-Eingabe wird ignoriert (kein kp im JSON)
const HT = buildTableHooks({ ...newBlock("table"), dataSource: "array", arraySymbol: "X.a", columns: [{ ...mkTableCol("input"), member: "s", inputType: "text", keypad: true }], rows: [] });
assertEqual(HT.TCOLS[0].kp, undefined, "Text-Eingabe: keine Keypad-Konfiguration");
assertEqual(typeof HT.openPadT, "undefined", "Text-Eingabe: keine Keypad-Helfer im Modul");

// ── 3) Eingabefeld-Baustein (registriert) ──
const writes = [];
const cfg = {
  mode: "registered", fnName: "AC_KpTest", title: "T", titleLoc: "", titleSource: "static", titleField: "", titleFallback: "",
  titleIcon: "", titleIconColor: "", maxWidth: 400, columns: 1, hostSuffix: "",
  blocks: [{ ...newBlock("input"), label: "Druck", symbol: "GVL.rP", unit: "bar", keypad: true, kpMin: "GVL.rPMin", kpMax: "16", kpDecimals: "1", trigSym: "GVL.xApply", trigMode: "setTrue" }],
};
const pcode = generate(cfg);
assertEqual((pcode.match(/\\/g) || []).length, 0, "Popup mit Keypad-Eingabe ist backslash-frei");
const S3 = makeSandbox();
S3.sandbox.window.console = { warn() {}, log() {}, error() {} }; // erwartete Warnung (fehlende Funktionsdatei) still halten
S3.sandbox.TcHmi.Symbol = class { constructor(p) { this.p = p; } watch() { return () => {}; } write(v) { writes.push([this.p, v]); } destroy() {} };
const appended = [];
S3.documentStub.body.appendChild = (el) => { appended.push(el); return el; };
const ctx3 = vm.createContext(S3.sandbox);
vm.runInContext(pcode, ctx3, { filename: "kp-popup.js" });
const padCalls = [];
ctx3.TcHmi.Functions.AC_HMI[NUMPAD_FN] = (o) => padCalls.push(o);
ctx3.TcHmi.Functions.AC_HMI.AC_KpTest();
function findAll(node, pred, out = []) { (node.children || []).forEach((c) => { if (pred(c)) out.push(c); findAll(c, pred, out); }); return out; }
const inputs = findAll(appended[0], (el) => el.tagName === "input");
assertEqual(inputs.length, 1, "Popup: genau ein Eingabefeld");
const inp = inputs[0];
assertEqual([inp.readOnly, inp.inputmode], [true, "none"], "Popup: Feld ist readOnly + inputmode none");
assertEqual(findAll(appended[0], (el) => el.tagName === "button" && el.textContent === "Setzen").length, 0, "Popup: kein Senden-Button im Keypad-Modus");
inp._listeners.click[0]({ stopPropagation() {} });
assertEqual(padCalls.length, 1, "Popup: Klick öffnet AC_NumPad");
const po = padCalls[0];
assertEqual([po.symbol, po.writeSymbol, po.min, po.max, po.unit, po.decimals, po.title],
  ["%s%GVL.rP%/s%", "%s%GVL.rP%/s%", "%s%GVL.rPMin%/s%", 16, "bar", 1, "Druck"], "Popup: Optionen an AC_NumPad");
po.onWritten(12.5);
assertEqual(writes, [["%s%GVL.xApply%/s%", true]], "Popup: onWritten löst den Trigger aus (setTrue)");
delete ctx3.TcHmi.Functions.AC_HMI[NUMPAD_FN];
let threw = false;
try { inp._listeners.click[0]({ stopPropagation() {} }); } catch (e) { threw = true; }
assert(!threw, "Popup: fehlende Funktionsdatei -> nur Warnung, kein Fehler");

// Ohne Keypad bzw. bei Datentyp Text: Bestands-Emitter (Senden-Button, kein AC_NumPad-Aufruf)
const plain = generate({ ...cfg, blocks: [{ ...cfg.blocks[0], keypad: false }] });
assert(!plain.includes(NUMPAD_FN), "ohne Keypad-Option: kein AC_NumPad im Code");
const txt = generate({ ...cfg, blocks: [{ ...cfg.blocks[0], dataType: "text" }] });
assert(!txt.includes(NUMPAD_FN), "Datentyp Text: Keypad-Option wird ignoriert");

report("numpad-logic");
