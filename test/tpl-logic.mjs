#!/usr/bin/env node
// ── Logik-Test: Text-Vorlagen (dynamischer Loc-Key) + Enum-Darstellung als Text ──
// Parser (src/model/locTemplate.js) + echter emitTable()-Output via node:vm.
import { newBlock, mkTableCol, mkTableMapEntry } from "../src/model/factories.js";
import { parseTpl, remapTplCols, checkTplRefs } from "../src/model/locTemplate.js";
import { tableBlockConfig } from "../src/codegen/emitTable.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

// ── 1) Parser: Schreibweisen ──
assertEqual(parseTpl("L_alarm{1}").parts, ["L_alarm", { c: 0 }], "parse: L_alarm{1}");
assertEqual(parseTpl("L_alarm + {1}").parts, ["L_alarm", { c: 0 }], "parse: L_alarm + {1}");
assertEqual(parseTpl("\"L_alarm\" + {1}").parts, ["L_alarm", { c: 0 }], "parse: \"L_alarm\" + {1}");
assertEqual(parseTpl("'L_alarm' + {1:3} + '_Ursache'").parts, ["L_alarm", { c: 0, p: 3 }, "_Ursache"], "parse: Suffix + Padding");
assertEqual(parseTpl("L_alarm{nId:3}").parts, ["L_alarm", { m: "nId", p: 3 }], "parse: Member mit Padding");
assertEqual(parseTpl("Zeile {#}").parts, ["Zeile ", { x: 1 }], "parse: Leerzeichen bleibt ohne +, Index-Referenz");
assertEqual(parseTpl("").parts, [], "parse: leer");
assert(parseTpl("L_{1:0}").errors.length === 1, "parse: Padding 0 -> Fehler");
assert(parseTpl("L_{0}").errors.length === 1, "parse: Spalte 0 -> Fehler");
assert(parseTpl("L_{1").errors.length === 1, "parse: offene Klammer -> Fehler");
assert(parseTpl("L_ + ").errors.length === 1, "parse: leeres Segment -> Fehler");

// ── 2) Remap bei Spalte verschieben/loeschen ──
assertEqual(remapTplCols("L_alarm + {1:3} + {nId}", (n) => (n === 0 ? 2 : n)), "L_alarm + {3:3} + {nId}", "remap: {1}->{3}, Member unberuehrt");
assertEqual(remapTplCols("L_{2}", () => null), "L_{0}", "remap: geloeschte Spalte -> {0} (Editor warnt)");
assertEqual(remapTplCols("'{1}' + {1}", (n) => n + 1), "'{1}' + {2}", "remap: gequotete Literale unberuehrt");

// ── 3) Ref-Pruefung ──
const cId = { ...mkTableCol("read"), header: "Nr", member: "nId" };
const cTxt = { ...mkTableCol("text"), header: "Text", locTpl: "L_alarm + {1:3}", textTpl: "Alarm {1}" };
assertEqual(checkTplRefs(parseTpl("{1}{5}").parts, [cId, cTxt], true).length, 1, "check: nicht existente Spalte");
assertEqual(checkTplRefs(parseTpl("{2}").parts, [cId, cTxt], true).length, 1, "check: Textspalte liefert keinen Wert");
assertEqual(checkTplRefs(parseTpl("{nId}").parts, [cId, cTxt], false).length, 1, "check: Member im statischen Modus");

// ── 4) Codegen: {member} wird auf vorhandene Spalte umgebogen, sonst TPL_MEMBERS ──
const cTxt2 = { ...mkTableCol("text"), header: "Ursache", locTpl: "L_alarm{nId:3}_Ursache" };
const cTxt3 = { ...mkTableCol("text"), header: "Code", locTpl: "L_code{nCode}" };
const cEnum = { ...mkTableCol("enum"), header: "Typ", member: "eType", enumDisplay: "text",
  map: [mkTableMapEntry("1", "Information", "blue"), mkTableMapEntry("2", "Warnung", "yellow")] };
const cEnumDot = { ...cEnum, id: "x2", enumDisplay: "dot" };
const cEnumBadge = { ...cEnum, id: "x3", enumDisplay: "badge" };
const block = { ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.AF_PLC.MAIN.aAlarmHmi", arrayCount: 5,
  columns: [cId, cTxt, cTxt2, cTxt3, cEnum, cEnumDot, cEnumBadge], rows: [] };
const cfg = tableBlockConfig(block);
assertEqual(cfg.colsArr[2].ltpl, ["L_alarm", { c: 0, p: 3 }, "_Ursache"], "codegen: {nId} -> Spalte 0");
assertEqual(cfg.colsArr[3].ltpl, ["L_code", { m: "nCode" }], "codegen: {nCode} bleibt Member");
assertEqual(cfg.tplMembers, ["nCode"], "codegen: TPL_MEMBERS nur fuer fehlende Member");
assertEqual(cfg.colsArr[4].edisp, "text", "codegen: edisp text");
assertEqual(cfg.colsArr[6].edisp, undefined, "codegen: badge -> kein edisp (byte-neutral)");
assertEqual(cfg.colsArr[0].ltpl, undefined, "codegen: read-Spalte ohne ltpl");

// ── 5) Laufzeit: tplText mit Lokalisierung + Fallback ──
const H = buildTableHooks(block);
const LOC = { L_alarm002: "Not-Aus betätigt", L_alarm101_Ursache: "Tür offen", L_code7: "Code sieben" };
H.TcHmi.Functions.getFunction = (n) => (n === "GetLocalizedText" ? (k) => LOC[k] : undefined);
const T = H.TCOLS;
assertEqual(H.tplText(0, T[1]), "–", "runtime: Wert fehlt noch -> '–'");
H.vals[0] = [2]; H.vals[1] = [101]; H.vals[2] = ["7"]; H.vals[3] = [1234];
assertEqual(H.tplText(0, T[1]), "Not-Aus betätigt", "runtime: L_alarm + {1:3} mit 2 -> L_alarm002 übersetzt");
assertEqual(H.tplText(1, T[1]), "Alarm 101", "runtime: Key fehlt -> Fallback-Vorlage");
assertEqual(H.tplText(1, T[2]), "Tür offen", "runtime: Suffix-Vorlage via Spalte");
assertEqual(H.tplText(3, T[1]), "Alarm 1234", "runtime: Padding kürzt nie (1234 bleibt 4-stellig)");
assertEqual(H.tplText(2, T[2]), "L_alarm007_Ursache", "runtime: ohne Fallback -> Key selbst");
assertEqual(H.tplText(0, T[3]), "–", "runtime: Member noch nicht gelesen -> '–'");
H.tplVals.nCode[0] = 7;
assertEqual(H.tplText(0, T[3]), "Code sieben", "runtime: Member-Kanal");
assertEqual(H.cellSearchText(0, 1), "Not-Aus betätigt", "runtime: Suche nutzt übersetzten Text");
assertEqual(H.sortValue(1, 1), "Alarm 101", "runtime: Sortierung nutzt übersetzten Text");

// ── 6) Laufzeit: Enum als Text / Farbpunkt / Badge ──
H.vals[0][4] = 2; H.vals[0][5] = 2; H.vals[0][6] = 2;
const pp = H.palT();
const tdText = H.buildCellEl(0, 4, pp);
assertEqual(tdText.textContent, "Warnung", "enum text: Klartext direkt in der Zelle");
assertEqual(tdText.children.length, 0, "enum text: kein Badge-Element");
const tdDot = H.buildCellEl(0, 5, pp);
assertEqual(tdDot.children.length, 2, "enum dot: Punkt + Text");
assertEqual(tdDot.children[1].textContent, "Warnung", "enum dot: Text");
const tdBadge = H.buildCellEl(0, 6, pp);
assertEqual(tdBadge.children[0].textContent, "Warnung", "enum badge: unverändert als Badge");
H.vals[1] = [101, undefined, undefined, undefined, 9];
assertEqual(H.buildCellEl(1, 4, pp).textContent, "9", "enum text: unbekannter Wert -> Rohwert");

report("tpl-logic");
