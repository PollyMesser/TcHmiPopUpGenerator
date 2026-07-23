#!/usr/bin/env node
// ── Logik-Test: Zeilenfilter (rowFilters) inkl. notEmpty/notZero auf Bool-Spalten ──
// Prüft isEmptyVal/isZeroVal/passesFilters direkt sowie einmal Ende-zu-Ende
// über renderBody()+tbody, um sicherzustellen, dass gefilterte Zeilen auch
// tatsächlich aus dem gerenderten <tbody> verschwinden.
import { newBlock, mkTableCol, mkTableRow, mkRowFilter } from "../src/model/factories.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

// ── 1) isEmptyVal: undefined/null/"" (getrimmt) sind leer, alles andere nicht ──
{
  const colBool = { ...mkTableCol("bool"), header: "B" };
  const H = buildTableHooks({ ...newBlock("table"), dataSource: "static", columns: [colBool], rows: [{ ...mkTableRow(1), cells: [{ symbol: "", text: "", loc: "" }] }] });
  assertEqual(H.isEmptyVal(undefined), true, "isEmptyVal(undefined) -> true");
  assertEqual(H.isEmptyVal(null), true, "isEmptyVal(null) -> true");
  assertEqual(H.isEmptyVal(""), true, "isEmptyVal('') -> true");
  assertEqual(H.isEmptyVal("   "), true, "isEmptyVal('   ') -> true (getrimmt leer)");
  assertEqual(H.isEmptyVal(0), false, "isEmptyVal(0) -> false (0 ist nicht leer)");
  assertEqual(H.isEmptyVal(false), false, "isEmptyVal(false) -> false");
  assertEqual(H.isEmptyVal("0"), false, "isEmptyVal('0') -> false");

  // ── 2) isZeroVal: leer ODER numerisch 0 ──
  assertEqual(H.isZeroVal(undefined), true, "isZeroVal(undefined) -> true (leer zählt als 0)");
  assertEqual(H.isZeroVal(0), true, "isZeroVal(0) -> true");
  assertEqual(H.isZeroVal("0"), true, "isZeroVal('0') -> true");
  assertEqual(H.isZeroVal(false), true, "isZeroVal(false) -> true (Number(false)===0)");
  assertEqual(H.isZeroVal("false"), false, "isZeroVal('false') -> false (kein numerischer Wert)");
  assertEqual(H.isZeroVal("abc") , false, "isZeroVal('abc') -> false (nicht numerisch, nicht leer)");
  assertEqual(H.isZeroVal(true), false, "isZeroVal(true) -> false (Number(true)===1)");
  assertEqual(H.isZeroVal(1), false, "isZeroVal(1) -> false");
}

// ── 3) passesFilters: notEmpty auf Bool-Spalte + notZero auf numerischer Spalte (UND-verknüpft) ──
{
  const colBool = { ...mkTableCol("bool"), header: "Quittiert" };
  const colNum = { ...mkTableCol("read"), header: "Prio" };
  const colText = { ...mkTableCol("text"), header: "Text" };
  const columns = [colBool, colNum, colText];
  const rows = [0, 1, 2, 3, 4, 5].map((ri) => ({ ...mkTableRow(columns.length), cells: [{ symbol: "", text: "", loc: "" }, { symbol: "", text: "", loc: "" }, { symbol: "", text: "Zeile " + ri, loc: "" }] }));
  const block = {
    ...newBlock("table"), dataSource: "static", columns, rows,
    rowFilters: [
      { ...mkRowFilter(), colIndex: 0, op: "notEmpty", value: "" },
      { ...mkRowFilter(), colIndex: 1, op: "notZero", value: "" },
    ],
  };
  const H = buildTableHooks(block);

  // Zeile 0: Bool leer -> faellt raus (erste Filterbedingung schon nicht erfuellt)
  H.vals[0] = [undefined, 5];
  // Zeile 1: Bool gesetzt, Prio 0 -> faellt raus (zweite Bedingung)
  H.vals[1] = [true, 0];
  // Zeile 2: Bool gesetzt, Prio != 0 -> besteht beide Filter
  H.vals[2] = [true, 3];
  // Zeile 3: Bool false (nicht leer!), Prio 1 -> besteht (false ist kein "leerer" Wert)
  H.vals[3] = [false, 1];
  // Zeile 4: Bool '0' (String), Prio 2 -> besteht (isEmptyVal('0') ist false)
  H.vals[4] = ["0", 2];
  // Zeile 5: alles leer -> faellt bei beiden Filtern raus
  H.vals[5] = [undefined, undefined];

  assertEqual(H.passesFilters(0), false, "Zeile 0: Bool-Spalte leer -> notEmpty schlägt fehl");
  assertEqual(H.passesFilters(1), false, "Zeile 1: Prio 0 -> notZero schlägt fehl");
  assertEqual(H.passesFilters(2), true, "Zeile 2: beide Filter erfüllt");
  assertEqual(H.passesFilters(3), true, "Zeile 3: Bool=false ist nicht 'leer' -> notEmpty erfüllt, Prio=1 -> notZero erfüllt");
  assertEqual(H.passesFilters(4), true, "Zeile 4: Bool='0' ist nicht 'leer' (nur echte Leerwerte zählen) -> beide Filter erfüllt");
  assertEqual(H.passesFilters(5), false, "Zeile 5: beide Werte leer -> beide Filter schlagen fehl");

  // ── 4) Ende-zu-Ende: renderBody() lässt nur die bestehenden Zeilen im tbody übrig ──
  H.renderBody();
  assertEqual(H.tbody.children.length, 3, "renderBody: nur Zeilen 2, 3, 4 bestehen beide Zeilenfilter");
}

// ── 5) passesFilters: Standard-Operator gegen Bool-Wert ('==' mit value:true) ──
{
  const colBool = { ...mkTableCol("bool"), header: "Aktiv" };
  const rows = [0, 1].map(() => ({ ...mkTableRow(1), cells: [{ symbol: "", text: "", loc: "" }] }));
  const block = { ...newBlock("table"), dataSource: "static", columns: [colBool], rows, rowFilters: [{ ...mkRowFilter(), colIndex: 0, op: "==", value: "true" }] };
  const H = buildTableHooks(block);
  H.vals[0] = [true];
  H.vals[1] = ["0"];
  assertEqual(H.passesFilters(0), true, "passesFilters '==' true: Bool true erfüllt den Filter");
  assertEqual(H.passesFilters(1), false, "passesFilters '==' true: '0' erfüllt den Filter nicht");
}

report("bool-filter-logic");
