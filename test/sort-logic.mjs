#!/usr/bin/env node
// ── Logik-Test: Tabellen-Sortierung (cmpSort/sortValue/sortVisible/toggleSort) ──
// Führt den echten von emitTable() generierten Code aus (siehe
// _table-harness.mjs) und prüft die Sortier-Semantik direkt an den
// tatsächlichen internen Funktionen.
import { newBlock, mkTableCol, mkTableRow } from "../src/model/factories.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const colNum = { ...mkTableCol("read"), header: "V", sortable: true };
const colText = { ...mkTableCol("text"), header: "T" };
const colBool = { ...mkTableCol("bool"), header: "B", sortable: true };
const columns = [colNum, colText, colBool];
const rows = [0, 1, 2, 3, 4].map(() => ({ ...mkTableRow(columns.length), cells: columns.map(() => ({ symbol: "", text: "", loc: "" })) }));
const block = { ...newBlock("table"), dataSource: "static", columns, rows, defaultSortCol: 0, defaultSortDir: "desc" };

const H = buildTableHooks(block);

// ── 1) Initialzustand: defaultSortCol/defaultSortDir aus der Config übernommen ──
assertEqual(H.getSortCol(), 0, "defaultSortCol wird als initiale sortCol übernommen");
assertEqual(H.getSortDir(), "desc", "defaultSortDir wird als initiale sortDir übernommen");

// ── 2) cmpSort: numerischer Vergleich, undefined immer ans Ende ──
assert(H.cmpSort(1, 2, 0) < 0, "cmpSort: 1 < 2 numerisch");
assert(H.cmpSort(2, 1, 0) > 0, "cmpSort: 2 > 1 numerisch");
assertEqual(H.cmpSort(5, 5, 0), 0, "cmpSort: Gleichstand -> 0");
assert(H.cmpSort(undefined, 1, 0) > 0, "cmpSort: a=undefined -> ans Ende (positiv)");
assert(H.cmpSort(1, undefined, 0) < 0, "cmpSort: b=undefined -> a bleibt vorn (negativ)");
assertEqual(H.cmpSort(undefined, undefined, 0), 0, "cmpSort: beide undefined -> 0");
assertEqual(H.cmpSort(null, 1, 0), 1, "cmpSort: null wie undefined behandelt");

// ── 3) cmpSort: boolartige Spalte (isBoolCol) – 1/'1'/true/'true' gleichrangig ──
assertEqual(H.isBoolCol(2), true, "Spalte 2 (bool) gilt als boolartig");
assertEqual(H.isBoolCol(0), false, "Spalte 0 (read) gilt nicht als boolartig");
assertEqual(H.cmpSort(true, "1", 2), 0, "cmpSort bool: true und '1' gleichrangig");
assertEqual(H.cmpSort("true", 1, 2), 0, "cmpSort bool: 'true' und 1 gleichrangig");
assert(H.cmpSort(false, 1, 2) < 0, "cmpSort bool: false(0) vor 1");
assert(H.cmpSort("true", 0, 2) > 0, "cmpSort bool: 'true'(1) nach 0");

// ── 4) cmpSort: String-Fallback (nicht numerisch, nicht boolartig) ──
assert(H.cmpSort("b", "a", 1) > 0, "cmpSort string: 'b' > 'a'");
assert(H.cmpSort("a", "b", 1) < 0, "cmpSort string: 'a' < 'b'");
assertEqual(H.cmpSort("x", "x", 1), 0, "cmpSort string: Gleichstand -> 0");

// ── 5) sortVisible: stabile Sortierung – bei Gleichstand bleibt Original-Reihenfolge ──
H.vals[0] = [3]; H.vals[1] = [1]; H.vals[2] = [1]; H.vals[3] = [2]; H.vals[4] = [1];
H.setSortCol(0); H.setSortDir("asc");
const list = [0, 1, 2, 3, 4];
H.sortVisible(list);
assertEqual(list, [1, 2, 4, 3, 0], "sortVisible asc: Werte [3,1,1,2,1] -> Indizes [1,2,4,3,0] (Gleichstand stabil)");

H.setSortDir("desc");
const list2 = [0, 1, 2, 3, 4];
H.sortVisible(list2);
assertEqual(list2, [0, 3, 1, 2, 4], "sortVisible desc: dieselben Werte absteigend, Gleichstand weiterhin stabil");

// ── 6) toggleSort: gleiche Spalte kehrt Richtung um, andere Spalte setzt 'asc' ──
H.setSortCol(0); H.setSortDir("asc");
H.toggleSort(0);
assertEqual(H.getSortDir(), "desc", "toggleSort auf aktive Spalte kehrt Richtung um (asc -> desc)");
H.toggleSort(0);
assertEqual(H.getSortDir(), "asc", "toggleSort auf aktive Spalte kehrt Richtung erneut um (desc -> asc)");
H.toggleSort(2);
assertEqual(H.getSortCol(), 2, "toggleSort auf andere Spalte wechselt sortCol");
assertEqual(H.getSortDir(), "asc", "toggleSort auf andere Spalte setzt sortDir auf 'asc'");

// ── 7) sortValue: Text-Spalte liefert lokalisierten Anzeigetext, nicht den Rohwert ──
const textBlock = { ...newBlock("table"), dataSource: "static", columns: [colText], rows: [{ ...mkTableRow(1), cells: [{ symbol: "", text: "Zebra", loc: "" }] }] };
const HT = buildTableHooks(textBlock);
assertEqual(HT.sortValue(0, 0), "Zebra", "sortValue (text-Spalte) liefert den Zell-Text, nicht vals[r][ci]");

report("sort-logic");
