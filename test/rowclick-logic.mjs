#!/usr/bin/env node
// ── Logik-Test: Tabelle Zeilenklick -> Funktion + Anzeigeformate Dauer/Datum-Zeit ──
// Prueft den ECHTEN emitTable-Output (node:vm):
//   - Byte-Neutralitaet ohne Option (bzw. Zeilenklick ohne Funktionsname)
//   - Zeilenklick: Parameter aus Spalte/Member/Index/ohne, Markierung folgt dem Datensatz,
//     Parameter wird beim Antippen festgehalten (Neuaufbau/verschobenes Array bis zum Loslassen),
//     Wischen/Abbruch/Bedienzellen loesen nichts aus, fehlende Funktion wirft nicht
//   - Formate: TIME (ISO-Dauer/ms) -> HH:MM:SS, DATE_AND_TIME wie geliefert bzw. UTC -> Ortszeit,
//     Einheit entfaellt, Suche nutzt das Format, Dauer-Sortierung numerisch
process.env.TZ = "Europe/Berlin"; // fuer 'dtl' (UTC -> Ortszeit) reproduzierbar
import { emitTable } from "../src/codegen/emitTable.js";
import { newBlock, mkTableCol, mkTableRow } from "../src/model/factories.js";
import { tableColDeps } from "../src/model/tableDeps.js";
import { rowClickOf, rowParamSourceOf } from "../src/model/rowClick.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const cNr = () => ({ ...mkTableCol("read"), header: "Zyklus", member: "nCycleNumber", decimals: "0" });
const cDur = (extra) => ({ ...mkTableCol("read"), header: "Dauer", member: "tCycleDuration", format: "dur", unit: "s", ...extra });
const cTs = (fmt) => ({ ...mkTableCol("read"), header: "Ende", member: "dtTimestamp", format: fmt || "dt" });
const cBtn = () => ({ ...mkTableCol("button"), header: "Quitt", member: "bAck", label: "OK" });
const arrBlock = (extra) => ({
  ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.AF_PLC.GVL_CycleMetrics.arDisplayHistory", arrayCount: 6,
  columns: [cNr(), cDur(), cTs(), cBtn()], rows: [], ...extra,
});
const RC = { rowClick: true, rowFnName: "AC_CycleDetail", rowParamSource: "col", rowParamCol: 0 };

// Daten setzen: Zeile r = [Zyklusnummer, Dauer, Zeitstempel]
const fill = (H, nums) => nums.forEach((n, r) => { H.vals[r] = [n, "PT" + (10 + r) + "M", "2026-10-19T08:0" + r + ":00"]; });
const td = (H, vi, ci) => H.tbody.children[vi].children[ci];
const down = (H, el, x, y) => H.tbody._listeners.pointerdown.forEach((f) => f({ target: el, clientX: x || 10, clientY: y || 10 }));
const up = (H, x, y) => H.tbody._listeners.pointerup.forEach((f) => f({ target: H.tbody, clientX: x || 10, clientY: y || 10 }));
const tap = (H, el) => { down(H, el); up(H); };

// ── 1) Byte-Neutralitaet ──
{
  const base = emitTable("p", { ...arrBlock(), columns: [cNr()] });
  assertEqual(emitTable("p", { ...arrBlock({ rowClick: false, rowFnName: "X" }), columns: [cNr()] }), base, "rowClick:false -> derselbe Code wie ohne Option");
  assertEqual(emitTable("p", { ...arrBlock({ rowClick: true, rowFnName: "  " }), columns: [cNr()] }), base, "rowClick ohne Funktionsname -> kein Zusatzcode");
  assertEqual(emitTable("p", { ...arrBlock(), columns: [{ ...cNr(), format: "" }] }), base, "format '' -> derselbe Code");
  assertEqual(emitTable("p", { ...arrBlock(), columns: [{ ...cNr(), format: "xyz" }] }), base, "unbekanntes Format -> ignoriert");
  assert(base.indexOf("ROW_CLICK") < 0 && base.indexOf("fmtSpecial") < 0, "ohne Optionen keine Zusatzlogik");
  const inp = emitTable("p", { ...arrBlock(), columns: [{ ...mkTableCol("input"), member: "x", format: "dur" }] });
  assert(inp.indexOf("fmtSpecial") < 0, "Format nur fuer Lesespalten");
}

// ── 2) Modell: Normalisierung, Abhaengigkeit ──
{
  assertEqual(rowClickOf(arrBlock(RC)), { fn: "AC_CycleDetail", psrc: "col", pmember: "", pcol: 0, mark: true }, "rowClickOf: Spalte 0, markieren");
  assertEqual(rowClickOf(arrBlock({ rowClick: true, rowFnName: "F", rowParamMember: "nCycleNumber", rowMark: false })).psrc, "member", "Array ohne Angabe -> Member");
  assertEqual(rowParamSourceOf({ dataSource: "static", rowParamSource: "member" }), "col", "feste Zeilen: Member nicht moeglich -> Spaltenwert");
  assertEqual(rowClickOf(arrBlock({ ...RC, rowParamCol: "x" })).pcol, -1, "ungueltige Parameter-Spalte -> -1");
  const deps = tableColDeps(arrBlock(RC));
  assert(deps[0].some((d) => d.kind === "rowclick"), "Parameter-Spalte zeigt 'Zeilenklick' als Abhaengigkeit");
  assert(!tableColDeps(arrBlock()).flat().some((d) => d.kind === "rowclick"), "ohne Zeilenklick keine Abhaengigkeit");
}

// ── 3) Zeilenklick: Spaltenwert, Markierung folgt dem Datensatz ──
{
  const H = buildTableHooks(arrBlock(RC));
  const calls = [];
  H.TcHmi.Functions.AC_HMI.AC_CycleDetail = (...a) => calls.push(a);
  fill(H, [105, 104, 103]);
  H.renderBody();
  assertEqual(H.tbody.children[1].style.cursor, "pointer", "Zeile zeigt Zeiger-Cursor");
  tap(H, td(H, 1, 0));
  assertEqual(calls, [[104]], "Tippen auf Zeile 2 -> AC_CycleDetail(104) (Zahl)");
  assertEqual(H.getRowSel(), "104", "Markierung = Parameterwert");
  assert(/inset 4px/.test(H.tbody.children[1].style.boxShadow || ""), "angetippte Zeile markiert");
  assert(!H.tbody.children[0].style.boxShadow, "andere Zeile nicht markiert");
  // neuer Zyklus: Array verschiebt sich um eine Zeile nach unten
  fill(H, [106, 105, 104, 103]);
  H.renderBody();
  assert(/inset 4px/.test(H.tbody.children[2].style.boxShadow || "") && !H.tbody.children[1].style.boxShadow, "Markierung wandert mit dem Datensatz (jetzt Zeile 3)");
  // Tippen auf eine Zelle im inneren Span (Kindelement) zaehlt auch
  const inner = { tagName: "span", parentNode: td(H, 0, 1) };
  tap(H, inner);
  assertEqual(calls[1], [106], "Tippen auf Kindelement einer Zelle -> Zeile erkannt");
}

// ── 4) Parameter beim Antippen festhalten; Wischen, Abbruch, Bedienzellen ──
{
  const H = buildTableHooks(arrBlock(RC));
  const calls = [];
  H.TcHmi.Functions.AC_HMI.AC_CycleDetail = (...a) => calls.push(a);
  fill(H, [105, 104, 103]);
  H.renderBody();
  down(H, td(H, 1, 0));
  assertEqual(H.tbody.children[1].style.opacity, ".6", "gedrueckte Zeile abgedimmt");
  fill(H, [106, 105, 104, 103]); // Zyklusende waehrend des Tippens
  H.renderBody();
  assertEqual(H.tbody.children[2].style.opacity, ".6", "Druck-Rueckmeldung folgt dem Datensatz nach Neuaufbau");
  up(H);
  assertEqual(calls, [[104]], "Aufruf mit dem beim Antippen gesehenen Zyklus (104), nicht mit dem jetzt an der Position stehenden");
  assertEqual(H.getPress(), null, "Druck-Zustand zurueckgesetzt");

  down(H, td(H, 0, 0), 10, 10); up(H, 10, 40);
  assertEqual(calls.length, 1, "Wischen (> 12 px) loest nichts aus");
  down(H, td(H, 0, 0)); H.tbody._listeners.pointercancel[0]({}); up(H);
  assertEqual(calls.length, 1, "pointercancel (Scrollen) loest nichts aus");
  const bt = td(H, 0, 3); const btn = bt.children[0];
  tap(H, btn);
  assertEqual(calls.length, 1, "Tippen auf Button-Zelle -> kein Zeilenklick");
  tap(H, bt);
  assertEqual(calls.length, 1, "Tippen neben den Button (Bedienzelle) -> kein Zeilenklick");
  H.vals[1][0] = undefined; H.renderBody();
  tap(H, td(H, 1, 1));
  assertEqual(calls.length, 1, "Zeile ohne Parameterwert -> kein Aufruf");
}

// ── 5) Fehlende Funktion, Member-/Index-/ohne Parameter, Markierung aus ──
{
  const H = buildTableHooks(arrBlock(RC));
  fill(H, [7]); H.renderBody();
  let threw = false;
  const warn = console.warn; console.warn = () => {};
  try { tap(H, td(H, 0, 0)); } catch (e) { threw = true; }
  console.warn = warn;
  assert(!threw, "fehlende Funktion wirft nicht");
  assertEqual(H.getRowSel(), null, "fehlende Funktion -> keine Markierung");

  const Hm = buildTableHooks(arrBlock({ rowClick: true, rowFnName: "F", rowParamSource: "member", rowParamMember: "nCycleNumber", rowMark: false }));
  const cm = []; Hm.TcHmi.Functions.AC_HMI.F = (...a) => cm.push(a);
  assert(Hm.symbols.some((s) => /arDisplayHistory\[5\]::nCycleNumber/.test(s.path)), "Member-Parameter wird je Zeile versteckt gelesen");
  Hm.paramVals.nCycleNumber[0] = "42"; fill(Hm, [42]); Hm.renderBody();
  tap(Hm, td(Hm, 0, 1));
  assertEqual(cm, [[42]], "Parameter aus Member (typisiert)");
  assertEqual(Hm.getRowSel(), null, "rowMark:false -> keine Markierung");
  assert(!Hm.tbody.children[0].style.boxShadow, "rowMark:false -> keine Markierungsleiste");

  const Hi = buildTableHooks(arrBlock({ rowClick: true, rowFnName: "F", rowParamSource: "index", startIndex: 1 }));
  const ci = []; Hi.TcHmi.Functions.AC_HMI.F = (...a) => ci.push(a);
  fill(Hi, [1, 2, 3]); Hi.renderBody();
  tap(Hi, td(Hi, 2, 0));
  assertEqual(ci, [[3]], "Parameter Zeilenindex = START_INDEX + r");

  const Hn = buildTableHooks(arrBlock({ rowClick: true, rowFnName: "F", rowParamSource: "none" }));
  const cn = []; Hn.TcHmi.Functions.AC_HMI.F = (...a) => cn.push(a);
  fill(Hn, [1, 2]); Hn.renderBody();
  tap(Hn, td(Hn, 1, 0));
  assertEqual(cn, [[]], "ohne Parameter: Aufruf ganz ohne Argument");
  assertEqual(Hn.getRowSel(), "r1", "ohne Parameter: Markierung ueber Zeilenposition");

  // feste Zeilen, Parameter aus Textspalte
  const r1 = mkTableRow(1); r1.cells[0].text = "Pumpe 1";
  const Hs = buildTableHooks({ ...newBlock("table"), dataSource: "static", columns: [{ ...mkTableCol("read"), header: "W" }], rows: [r1], rowClick: true, rowFnName: "F", rowParamSource: "index" });
  const cs = []; Hs.TcHmi.Functions.AC_HMI.F = (...a) => cs.push(a);
  Hs.renderBody(); tap(Hs, td(Hs, 0, 0));
  assertEqual(cs, [[0]], "feste Zeilen: Zeilenklick mit Index");
}

// ── 6) Formate ──
{
  const H = buildTableHooks(arrBlock());
  const ciDur = 1, ciTs = 2;
  const f = (ci, v) => H.fmtRead(ci, v);
  assertEqual(f(ciDur, "PT1H2M3.4S"), "01:02:03", "Dauer: ISO -> HH:MM:SS (gerundet auf Sekunden, ohne Einheit)");
  assertEqual(f(ciDur, "PT59.6S"), "00:01:00", "Dauer: Rundung ueber die Minutengrenze");
  assertEqual(f(ciDur, "P1DT2H"), "26:00:00", "Dauer: Tage -> Stunden");
  assertEqual(f(ciDur, "PT0S"), "00:00:00", "Dauer: null");
  assertEqual(f(ciDur, 61000), "00:01:01", "Dauer: Zahl = Millisekunden");
  assertEqual(f(ciDur, "abc"), "abc", "Dauer: unlesbar -> Rohwert");
  assertEqual(f(ciDur, undefined), "–", "Dauer: kein Wert -> –");
  assertEqual(f(ciTs, "2026-10-19T08:12:05"), "19.10.2026 08:12:05", "DT wie geliefert");
  assertEqual(f(ciTs, "2026-10-19T06:12:05.250Z"), "19.10.2026 06:12:05", "DT wie geliefert: keine Zeitzonen-Umrechnung, Bruchteile weg");
  assertEqual(f(ciTs, "2026-10-19"), "19.10.2026", "DATE ohne Uhrzeit");
  assertEqual(f(ciTs, "1970-01-01T00:00:00"), "01.01.1970 00:00:00", "Nullwert der SPS bleibt sichtbar (Zeilenfilter blendet leere Eintraege aus)");
  assertEqual(f(ciTs, 0), "01.01.1970 00:00:00", "DT als Zahl (Sekunden) -> UTC-Ziffern");

  const Hd = buildTableHooks(arrBlock({ columns: [cNr(), cDur({ decimals: "1" }), cTs("dtl")] }));
  assertEqual(Hd.fmtRead(1, "PT1M5.25S"), "00:01:05.3", "Dauer mit 1 Dezimale");
  assertEqual(Hd.fmtRead(1, "PT9.94S"), "00:00:09.9", "Dauer mit Dezimale, einstellige Sekunde mit fuehrender Null");
  assertEqual(Hd.fmtRead(2, "2026-10-19T06:12:05Z"), "19.10.2026 08:12:05", "dtl: UTC -> Ortszeit (CEST)");
  assertEqual(Hd.fmtRead(2, "2026-12-19T06:12:05"), "19.12.2026 07:12:05", "dtl: ohne Zone als UTC gelesen (CET)");
  assertEqual(Hd.fmtRead(2, "kaputt"), "kaputt", "dtl: unlesbar -> Rohwert");

  // Suche und Sortierung
  fill(H, [3, 2, 1]);
  H.vals[0][1] = "PT9M"; H.vals[1][1] = "PT10M"; H.vals[2][1] = "PT1H";
  assertEqual(H.cellSearchText(1, 1), "00:10:00", "Suche nutzt das angezeigte Format");
  assertEqual(H.cellSearchText(0, 2), "19.10.2026 08:00:00", "Suche im Datum");
  const vis = [0, 1, 2]; H.setSortCol(1); H.setSortDir("asc"); H.sortVisible(vis);
  assertEqual(vis, [0, 1, 2], "Dauer-Sortierung numerisch (9 min < 10 min < 1 h), nicht als Text");
  H.setSortDir("desc"); H.sortVisible(vis);
  assertEqual(vis, [2, 1, 0], "Dauer-Sortierung absteigend");

  // Kombination mit zeilenabhaengiger Einheit (fmtParts-Variante)
  const Hu = buildTableHooks(arrBlock({ columns: [{ ...cNr(), unitMember: "sUnit" }, cDur()] }));
  assertEqual(Hu.fmtRead(1, "PT2M", 0), "00:02:00", "Format auch in der zeilenabhaengigen Variante, ohne Einheit");
}

report("rowclick-logic");
