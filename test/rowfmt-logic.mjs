#!/usr/bin/env node
// ── Logik-Test: Tabelle mit zeilenabhaengiger Einheit/Nachkommastellen/Kennbit ──
// Spaltenoptionen unitMember -> unitm, hasMember -> hasm, decMap -> decmap
// (nur Array-Modus, Wert lesen/Eingabe). Prueft den ECHTEN emitTable-Output:
// Konfigurations-JSON, Formatierung, '–'-Zellen, Keypad-Optionen, Datenanbindung
// (Einzel-Watches und Sammel-Subscription) sowie Byte-Neutralitaet ohne Option.
import { emitTable } from "../src/codegen/emitTable.js";
import { newBlock, mkTableCol, mkTableRow } from "../src/model/factories.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const NUMPAD = "AC_NumPad";
const mkCols = () => {
  const cTxt = { ...mkTableCol("text"), header: "Alarm" };
  const cL1 = { ...mkTableCol("input"), header: "Grenzwert 1", member: "fLimit1", inputType: "number",
    keypad: true, kpMin: "fLimit1Min", kpMax: "fLimit1Max",
    unitMember: "sLimit1Unit", hasMember: "bHasLimit1", decMap: "bar=2; °=1, min = 0; kaputt; x=-1" };
  const cAct = { ...mkTableCol("read"), header: "Istwert", member: "fActual",
    unitMember: "sActualUnit", hasMember: "bHasActual", decMap: "bar=2; min=1" };
  const cFix = { ...mkTableCol("read"), header: "Fest", member: "fFix", unit: "%", decimals: "1" };
  return [cTxt, cL1, cAct, cFix];
};
const block = (extra) => ({ ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.PLC.MAIN.aAlarmHmi", arrayCount: 3, columns: mkCols(), rows: [], ...extra });

// ── 1) Konfiguration ──
const H = buildTableHooks(block());
assertEqual(H.TCOLS[1].unitm, "sLimit1Unit", "unitm im TCOLS-JSON");
assertEqual(H.TCOLS[1].hasm, "bHasLimit1", "hasm im TCOLS-JSON");
assertEqual(H.TCOLS[1].decmap, { bar: 2, "°": 1, min: 0 }, "decmap: gueltige Eintraege, ';' und ',' als Trenner, Leerzeichen egal, Ungueltiges ignoriert");
assertEqual(H.TCOLS[3].unitm, undefined, "Spalte ohne Option: kein unitm");
assertEqual(H.TCOLS[3].decmap, undefined, "Spalte ohne Option: kein decmap");
const HStatic = buildTableHooks({ ...newBlock("table"), dataSource: "static", columns: [{ ...mkTableCol("read"), unitMember: "u", hasMember: "h", decMap: "bar=2" }], rows: [mkTableRow(1)] });
assertEqual([HStatic.TCOLS[0].unitm, HStatic.TCOLS[0].hasm, HStatic.TCOLS[0].decmap], [undefined, undefined, undefined], "statischer Modus: Optionen werden ignoriert");
assertEqual(typeof HStatic.rowHas, "undefined", "statischer Modus: keine Zusatzhelfer");

// ── 2) Byte-Neutralitaet: Option leer -> identischer Modul-Text ──
const plainCols = mkCols().map((c) => { const o = { ...c }; delete o.unitMember; delete o.hasMember; delete o.decMap; return o; });
const emptyCols = mkCols().map((c) => ({ ...c, unitMember: "", hasMember: " ", decMap: "kaputt" }));
const b0 = { ...newBlock("table"), dataSource: "array", arraySymbol: "X.a", arrayCount: 2, rows: [] };
assertEqual(emitTable("p", { ...b0, columns: emptyCols }), emitTable("p", { ...b0, columns: plainCols }), "leere/ungueltige Optionen erzeugen denselben Code wie ohne Option");

// ── 3) Formatierung je Zeile ──
H.vals[0] = []; H.vals[0][1] = 12.3456; H.vals[0][2] = 7.25; H.vals[0][3] = 42;
assertEqual(H.rowHas(0, H.TCOLS[1]), false, "Kennbit unbekannt -> nicht vorhanden");
assertEqual(H.fmtRead(1, 12.3456, 0), "–", "nicht vorhanden -> '–'");
assertEqual(H.cellSearchText(0, 1), "–", "Suchtext nicht vorhanden -> '–'");
H.setX("bHasLimit1", 0, true); H.setX("sLimit1Unit", 0, "bar");
assertEqual(H.fmtRead(1, 12.3456, 0), "12.35 bar", "bar -> 2 Nachkommastellen");
H.setX("sLimit1Unit", 0, "°");
assertEqual(H.fmtRead(1, 12.3456, 0), "12.3 °", "° -> 1 Nachkommastelle");
H.setX("sLimit1Unit", 0, "l/h");
assertEqual(H.fmtRead(1, 12.3456, 0), "12.3456 l/h", "Einheit nicht in decmap -> Spalten-Dezimalen (auto)");
H.setX("sLimit1Unit", 0, "");
assertEqual(H.fmtRead(1, 12.3456, 0), "12.3456", "leere Einheit -> ohne Einheit");
H.setX("bHasActual", 0, 1); H.setX("sActualUnit", 0, "min");
assertEqual(H.fmtRead(2, 7.25, 0), "7.3 min", "Istwert: min -> 1 Stelle (eigene decmap je Spalte)");
H.setX("sActualUnit", 0, "%");
assertEqual(H.fmtRead(2, 7.25, 0), "7.25%", "Prozent ohne Leerzeichen (wie bisher)");
assertEqual(H.fmtRead(3, 42, 0), "42.0%", "Spalte ohne Option: feste Einheit/Dezimalen unveraendert");
assertEqual(H.fmtRead(1, null, 0), "–", "kein Wert -> '–'");
H.setX("bHasLimit1", 1, "false");
assertEqual(H.rowHas(1, H.TCOLS[1]), false, "Kennbit 'false' -> nicht vorhanden");
H.setX("bHasLimit1", 1, "1");
assertEqual(H.rowHas(1, H.TCOLS[1]), true, "Kennbit '1' -> vorhanden");

// ── 4) Zellen ──
const pp = H.palT();
H.setX("bHasLimit1", 2, false);
const tdNa = H.buildCellEl(2, 1, pp);
assertEqual([tdNa.textContent, tdNa.children.length, tdNa.style.textAlign, tdNa.style.color], ["–", 0, "center", pp.inactive], "nicht vorhanden: '–' zentriert, grau, kein Keypad-Button");
H.setX("sLimit1Unit", 0, "bar");
const tdKp = H.buildCellEl(0, 1, pp);
const kb = tdKp.children[0];
assertEqual(kb && kb.tagName, "button", "vorhanden: Keypad-Button");
assertEqual(kb.children.map((c) => c.textContent), ["12.35", "bar"], "Button: Zahl und Einheit in eigenen Spans");
assert(String(kb.children[1].style.cssText).indexOf("min-width:3.2em") >= 0, "Einheit mit fester Mindestbreite");
H.setX("sActualUnit", 0, "bar");
const tdAct = H.buildCellEl(0, 2, pp);
assertEqual(tdAct.children.map((c) => c.textContent), ["7.25", "bar"], "Wert lesen: Zahl und Einheit getrennt");
const tdFix = H.buildCellEl(0, 3, pp);
assertEqual([tdFix.textContent, tdFix.children.length], ["42.0%", 0], "Spalte ohne Option: Text wie bisher");

// ── 5) Keypad-Optionen je Zeile ──
const calls = [];
H.TcHmi.Functions.AC_HMI[NUMPAD] = (o) => calls.push(o);
H.openPadT(0, 1);
assertEqual(calls[0], { symbol: "%s%ADS.PLC.MAIN.aAlarmHmi[0]::fLimit1%/s%", min: "%s%ADS.PLC.MAIN.aAlarmHmi[0]::fLimit1Min%/s%", max: "%s%ADS.PLC.MAIN.aAlarmHmi[0]::fLimit1Max%/s%", unit: "bar", decimals: 2, title: "Grenzwert 1 [0]" }, "AC_NumPad: Einheit und Nachkommastellen der Zeile");
H.setX("sLimit1Unit", 1, "s");
H.openPadT(1, 1);
assertEqual([calls[1].unit, calls[1].decimals], ["s", -1], "AC_NumPad: Einheit ohne decmap-Eintrag -> Spalten-Dezimalen");

// ── 6) Sortierung: nicht vorhandene Zellen ans Ende ──
assertEqual(H.sortValue(2, 1), undefined, "sortValue: nicht vorhanden -> undefined (ans Ende)");
assertEqual(H.sortValue(0, 1), 12.3456, "sortValue: vorhanden -> Rohwert");

// ── 7) Datenanbindung: Einzel-Watches ──
const watched = [];
const HW = buildTableHooks(block(), "parent", (ctx) => {
  ctx.TcHmi.Symbol = class { constructor(p) { this.p = p; } watch(cb) { watched.push({ p: this.p, cb }); return () => {}; } write() {} destroy() {} };
});
const xs = watched.filter((w) => /::(sLimit1Unit|bHasLimit1|sActualUnit|bHasActual)%/.test(w.p)).map((w) => w.p);
assertEqual(xs.length, 12, "Watch-Modus: 4 Member x 3 Zeilen zusaetzlich gelesen");
const wUnit = watched.find((w) => w.p === "%s%ADS.PLC.MAIN.aAlarmHmi[1]::sLimit1Unit%/s%");
wUnit.cb({ error: 0, value: "bar" });
assertEqual(HW.rowUnit(1, HW.TCOLS[1]), "bar", "Watch-Modus: Wert landet in xVals");
const wVal = watched.find((w) => w.p === "%s%ADS.PLC.MAIN.aAlarmHmi[1]::fLimit1%/s%");
wVal.cb({ error: 0, value: 3.5 });
assertEqual(HW.vals[1][1], 3.5, "Watch-Modus: Zellwert weiterhin in vals");

// ── 8) Datenanbindung: Sammel-Subscription ──
let req = null, cbSub = null;
const HB = buildTableHooks(block({ watchLimit: 1 }), "parent", (ctx) => {
  ctx.TcHmi.Server.requestEx = (r, o, cb) => { req = r; cbSub = cb; };
});
const syms = req.commands.map((c) => c.symbol);
assert(syms.indexOf("ADS.PLC.MAIN.aAlarmHmi[2]::bHasActual") >= 0, "Subscription: Kennbit-Member enthalten");
assert(syms.indexOf("ADS.PLC.MAIN.aAlarmHmi[0]::fActual") >= 0, "Subscription: Zellwerte weiterhin enthalten");
cbSub({ error: 0, response: { id: 7, commands: [
  { symbol: "ADS.PLC.MAIN.aAlarmHmi[2]::sActualUnit", readValue: "°" },
  { symbol: "ADS.PLC.MAIN.aAlarmHmi[2]::bHasActual", readValue: true },
  { symbol: "ADS.PLC.MAIN.aAlarmHmi[2]::fActual", readValue: -3.14159 },
] } });
assertEqual([HB.rowUnit(2, HB.TCOLS[2]), HB.rowHas(2, HB.TCOLS[2]), HB.vals[2][2]], ["°", true, -3.14159], "Subscription: Member in xVals, Zellwert in vals");
assertEqual(HB.fmtRead(2, HB.vals[2][2], 2), "-3.14159 °", "Subscription: Istwert-Spalte ohne °-Eintrag -> auto");
assertEqual(HB.vals[2][-1], undefined, "Subscription: Member landen nicht in vals");

report("rowfmt-logic");
