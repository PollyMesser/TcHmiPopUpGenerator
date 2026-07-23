#!/usr/bin/env node
// ── Logik-Test: Tabellen-Button-Spalten mit action:'fn' (resolveParam/callColFn) ──
// Deckt alle vier paramSource-Varianten ab (member/col/index/none) sowie den
// tatsächlichen Aufruf von TcHmi.Functions.AC_HMI[fnName](param) inkl.
// Auto-Typisierung des Parameters.
import { newBlock, mkTableCol } from "../src/model/factories.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const cRead = { ...mkTableCol("read"), header: "V", member: "rValue" };
const cBtnMember = { ...mkTableCol("button"), header: "Member", label: "M", action: "fn", fnName: "AC_HMI_Member", paramSource: "member", paramMember: "nAlarmId" };
const cBtnCol = { ...mkTableCol("button"), header: "Col", label: "C", action: "fn", fnName: "AC_HMI_Col", paramSource: "col", paramCol: 0 };
const cBtnIndex = { ...mkTableCol("button"), header: "Index", label: "I", action: "fn", fnName: "AC_HMI_Index", paramSource: "index" };
const cBtnNone = { ...mkTableCol("button"), header: "None", label: "N", action: "fn", fnName: "AC_HMI_None", paramSource: "none" };
const columns = [cRead, cBtnMember, cBtnCol, cBtnIndex, cBtnNone];

const block = {
  ...newBlock("table"), dataSource: "array", columns, rows: [],
  arraySymbol: "ADS.…::aArr", arrayCount: 10, startIndex: 5,
};
const H = buildTableHooks(block);
const [colRead, colMember, colCol, colIndex, colNone] = H.TCOLS;

// ── 1) paramSource 'index': START_INDEX (5) + Zeilenindex, unabhängig von vals ──
assertEqual(H.resolveParam(0, colIndex), 5, "resolveParam index: Zeile 0 -> START_INDEX(5)+0");
assertEqual(H.resolveParam(3, colIndex), 8, "resolveParam index: Zeile 3 -> START_INDEX(5)+3");

// ── 2) paramSource 'none': immer undefined ──
assertEqual(H.resolveParam(0, colNone), undefined, "resolveParam none: kein Parameter");
H.vals[0] = [42];
assertEqual(H.resolveParam(0, colNone), undefined, "resolveParam none: bleibt undefined, auch wenn vals gesetzt sind");

// ── 3) paramSource 'col': liest vals[r][pcol] und typisiert automatisch (Zahl/String) ──
H.vals[2] = ["17"];
assertEqual(H.resolveParam(2, colCol), 17, "resolveParam col: numerische Zeichenkette -> Zahl (autoType)");
H.vals[3] = ["abc"];
assertEqual(H.resolveParam(3, colCol), "abc", "resolveParam col: nicht-numerisch bleibt String");
assertEqual(H.resolveParam(4, colCol), null, "resolveParam col: keine vals-Zeile -> null (autoType(undefined))");

// ── 4) paramSource 'member': liest den versteckten Array-Member-Kanal (paramVals) ──
H.paramVals.nAlarmId = [];
H.paramVals.nAlarmId[1] = "101";
assertEqual(H.resolveParam(1, colMember), 101, "resolveParam member: paramVals[member][r] wird autoType'd");
assertEqual(H.resolveParam(9, colMember), null, "resolveParam member: unbekannte Zeile -> null");

// ── 5) callColFn: ruft TcHmi.Functions.AC_HMI[fnName] mit dem aufgelösten Parameter ──
const calls = [];
H.TcHmi.Functions.AC_HMI.AC_HMI_Col = (...args) => calls.push({ fn: "col", args });
H.TcHmi.Functions.AC_HMI.AC_HMI_None = (...args) => calls.push({ fn: "none", args });
H.TcHmi.Functions.AC_HMI.AC_HMI_Index = (...args) => calls.push({ fn: "index", args });

const ciCol = H.TCOLS.indexOf(colCol);
const ciNone = H.TCOLS.indexOf(colNone);
const ciIndex = H.TCOLS.indexOf(colIndex);
H.callColFn(2, ciCol);
H.callColFn(0, ciNone);
H.callColFn(4, ciIndex);

assertEqual(calls.length, 3, "callColFn: alle drei registrierten Funktionen wurden aufgerufen");
assertEqual(calls[0], { fn: "col", args: [17] }, "callColFn col: mit aufgelöstem Spaltenwert aufgerufen");
assertEqual(calls[1], { fn: "none", args: [] }, "callColFn none: ganz ohne Argument aufgerufen (nicht einmal 'undefined')");
assertEqual(calls[2], { fn: "index", args: [9] }, "callColFn index: mit START_INDEX(5)+4 aufgerufen");

// ── 6) callColFn: unregistrierte Funktion (nicht in AC_HMI) wirft nicht, tut nichts ──
let threw = false;
try { H.callColFn(0, H.TCOLS.indexOf(colMember)); } catch (e) { threw = true; }
assert(!threw, "callColFn: fehlende Funktion (AC_HMI_Member nie registriert) wirft keine Exception");
assertEqual(calls.length, 3, "callColFn: fehlende Funktion erzeugt keinen zusätzlichen Aufruf");

// ── 7) callColFn: Spalte ohne fnName tut nichts ──
const cBtnNoFn = { ...mkTableCol("button"), header: "NoFn", label: "X", action: "fn", fnName: "" };
const block2 = { ...newBlock("table"), dataSource: "static", columns: [cBtnNoFn], rows: [{ id: "r1", cells: [{ symbol: "", text: "", loc: "" }] }] };
const H2 = buildTableHooks(block2);
let threw2 = false;
try { H2.callColFn(0, 0); } catch (e) { threw2 = true; }
assert(!threw2, "callColFn: leerer fnName wirft keine Exception");

report("fn-logic");
