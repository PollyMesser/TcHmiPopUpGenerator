#!/usr/bin/env node
// ── Logik-Test: gekuerzte Textspalten mit Aufklappen per Tippen (Phase 5) ──
// Prueft den ECHTEN emitTable-Output:
//   - clamp im TCOLS-JSON (0 = Restbreite, N = ch), byte-neutral ohne Option
//   - Zelle einzeilig mit Ellipse, Tippen klappt auf/zu; mehrere Zellen gleichzeitig
//   - Zustand ueberlebt Neuaufbau (renderBody bei Wertaenderung) und Sortierung (Datenzeilen-Schluessel)
//   - nicht gekuerzter Text: Tippen ohne Wirkung, kein Pfeil
import { emitTable } from "../src/codegen/emitTable.js";
import { newBlock, mkTableCol, mkTableRow } from "../src/model/factories.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const LONG = "Druckschalter Zulauf hat ausgeloest, Pumpe P101 wurde abgeschaltet";
const mkBlock = (txtExtra) => {
  const cTxt = { ...mkTableCol("text"), header: "Alarm", ...txtExtra };
  const cVal = { ...mkTableCol("read"), header: "Wert", sortable: true };
  const rows = ["A", LONG, "C"].map((t, i) => ({ ...mkTableRow(2), cells: [{ symbol: "", text: t, loc: "" }, { symbol: "ADS.X::r" + i, text: "", loc: "" }] }));
  return { ...newBlock("table"), dataSource: "static", columns: [cTxt, cVal], rows };
};
const cell = (H, vi) => H.tbody.children[vi].children[0];
const parts = (td) => { const box = td.children[0]; return { tx: box.children[0], ind: box.children[1] }; };
const tap = (td) => td._listeners.click[0]({ target: td, stopPropagation() {} });

// ── 1) JSON / Byte-Neutralitaet ──
{
  const H0 = buildTableHooks(mkBlock({ clamp: true }));
  assertEqual(H0.TCOLS[0].clamp, 0, "clamp ohne Breite -> 0 (Restbreite)");
  const H1 = buildTableHooks(mkBlock({ clamp: true, clampWidth: "24" }));
  assertEqual(H1.TCOLS[0].clamp, 24, "clamp mit Breite -> 24ch");
  assertEqual(H0.TCOLS[0].cmin, 4, "Mindestbreite Standard 4ch");
  assertEqual(buildTableHooks(mkBlock({ clamp: true, clampMin: "12" })).TCOLS[0].cmin, 12, "Mindestbreite 12ch");
  assertEqual(buildTableHooks(mkBlock({ clamp: true, clampMin: "30", clampWidth: "20" })).TCOLS[0].cmin, 20, "Mindestbreite hoechstens Maximalbreite");
  assertEqual(buildTableHooks(mkBlock({ clamp: true, clampMin: "x" })).TCOLS[0].cmin, 4, "ungueltige Mindestbreite -> 4");
  assertEqual(emitTable("p", mkBlock({ clamp: false, clampWidth: "24" })), emitTable("p", mkBlock({})), "clamp:false erzeugt denselben Code wie ohne Option");
  assert(emitTable("p", mkBlock({})).indexOf("clampText") < 0, "ohne clamp keine Zusatzlogik");
}

// ── 2) Aufbau, Aufklappen, Zustand ──
{
  const H = buildTableHooks(mkBlock({ clamp: true }));
  H.renderBody();
  let td = cell(H, 1);
  let { tx, ind } = parts(td);
  assertEqual(tx.textContent, LONG, "voller Text im inneren Span");
  assert(/white-space:nowrap;overflow:hidden;text-overflow:ellipsis/.test(tx.style.cssText), "zugeklappt: einzeilig mit Ellipse");
  assertEqual([td.style.width, td.style.maxWidth, td.style.minWidth], ["100%", "0", "calc(5ch + 1.2em + 20px)"], "Restbreite: width 100% + max-width 0 + min 10ch");

  // Stub ohne Layout: Messwerte von Hand setzen (Text breiter als die Zelle)
  tx.clientWidth = 100; tx.scrollWidth = 400;
  tap(td);
  td = cell(H, 1);
  ({ tx, ind } = parts(td));
  assert(/white-space:pre-wrap/.test(tx.style.cssText), "Tippen klappt auf (mehrzeilig)");
  assertEqual(ind.textContent, String.fromCharCode(9662), "Pfeil zeigt aufgeklappt");

  // zweite Zelle zusaetzlich aufklappen -> beide offen
  const td0 = cell(H, 0); const p0 = parts(td0); p0.tx.clientWidth = 10; p0.tx.scrollWidth = 50;
  tap(td0);
  assert(/pre-wrap/.test(parts(cell(H, 0)).tx.style.cssText) && /pre-wrap/.test(parts(cell(H, 1)).tx.style.cssText), "mehrere Zellen gleichzeitig aufgeklappt");

  // Neuaufbau durch Wertaenderung -> Zustand bleibt
  H.setVal(2, 1, 5);
  assert(/pre-wrap/.test(parts(cell(H, 1)).tx.style.cssText), "Wertaenderung (Neuaufbau): Zelle bleibt aufgeklappt");

  // Sortierung: Datenzeile 1 wandert, bleibt aber offen
  H.setVal(0, 1, 3); H.setVal(1, 1, 9); H.setVal(2, 1, 1);
  H.toggleSort(1); H.toggleSort(1); // absteigend: Zeile 1 (9) oben
  assertEqual(parts(cell(H, 0)).tx.textContent, LONG, "nach Sortierung steht die lange Zeile oben");
  assert(/pre-wrap/.test(parts(cell(H, 0)).tx.style.cssText), "Sortierung: Zustand haengt an der Datenzeile");

  // zuklappen
  tap(cell(H, 0));
  assert(/nowrap/.test(parts(cell(H, 0)).tx.style.cssText), "erneutes Tippen klappt zu");
}

// ── 3) Kurzer Text: Tippen ohne Wirkung, Pfeil verborgen ──
{
  const H = buildTableHooks(mkBlock({ clamp: true, clampWidth: "30" }));
  H.renderBody();
  const td = cell(H, 0);
  const { tx } = parts(td);
  tx.clientWidth = 100; tx.scrollWidth = 100;
  tap(td);
  assert(/nowrap/.test(parts(cell(H, 0)).tx.style.cssText), "nicht gekuerzt: Tippen klappt nicht auf");
  assert(/max-width:30ch/.test(cell(H, 0).children[0].style.cssText), "feste Breite: max-width 30ch am Inhalt");
  assertEqual(cell(H, 0).style.width, undefined, "feste Breite: td ohne width:100%");
  // clampCheck nach dem Einfuegen: im Stub ohne Layout sind die Messwerte undefined
  const H2 = buildTableHooks(mkBlock({ clamp: true }));
  H2.renderBody();
  const ind0 = parts(cell(H2, 0)).ind;
  assertEqual(ind0.style.visibility, "hidden", "ohne Messwerte (undefined) gilt Text als nicht gekuerzt -> Pfeil verborgen");
}

report("clamp-logic");
