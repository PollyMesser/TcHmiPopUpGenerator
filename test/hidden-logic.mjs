#!/usr/bin/env node
// ── Logik-Test: ausgeblendete Spalten + Abhaengigkeiten ──
// Prueft den ECHTEN emitTable-/generate-Output:
//   - hidden: Spalte ohne Kopf-/Datenzelle, aber gebunden (Watch), durchsuchbar,
//     Filter/Sortierung/Button-Parameter/Text-Vorlage funktionieren weiter
//   - observe-gesperrte Spalte mit Abhaengigkeit wird trotzdem gelesen (Fix),
//     aber weder angezeigt noch durchsucht; ohne Abhaengigkeit weiter ungebunden
//   - tableColDeps(): Abhaengigkeiten je Spalte (Editor-Hinweis)
//   - Byte-Neutralitaet: hidden:false erzeugt denselben Code wie ohne Feld
import vm from "node:vm";
import { emitTable } from "../src/codegen/emitTable.js";
import { generate } from "../src/codegen/index.js";
import { newBlock, mkTableCol, mkTableRule, mkRowFilter } from "../src/model/factories.js";
import { mkAccess } from "../src/model/access.js";
import { tableColDeps } from "../src/model/tableDeps.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { makeSandbox } from "./_dom-stub.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const walk = (el, out = []) => { out.push(el); (el.children || []).forEach((c) => walk(c, out)); return out; };

const mkAlarm = (extra) => {
  const cId = { ...mkTableCol("read"), header: "Nr.", member: "nId", sortable: true, hidden: true };
  const cTxt = { ...mkTableCol("text"), header: "Alarm", locTpl: "L_alarm{1:3}" };
  const cTrig = { ...mkTableCol("bool"), header: "Ausgelöst", member: "bTriggered" };
  const cInfo = { ...mkTableCol("button"), header: "Info", label: "?", action: "fn", fnName: "AlarmInfoPopup", paramSource: "col", paramCol: 0 };
  return {
    ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.PLC.MAIN.aAlarmHmi", arrayCount: 4,
    columns: [cId, cTxt, cTrig, cInfo], rows: [],
    rules: [{ ...mkTableRule(), colIndex: 2, op: "==", value: "true", target: "row", color: "red" }],
    rowFilters: [{ ...mkRowFilter(), colIndex: 0, op: "notZero", value: "" }],
    defaultSortCol: 0, defaultSortDir: "desc",
    ...extra,
  };
};

// ── 1) hidden: gebunden, nicht angezeigt ──
{
  const watched = [];
  const H = buildTableHooks(mkAlarm(), "parent", (ctx) => {
    ctx.TcHmi.Symbol = class { constructor(p) { this.p = p; } watch(cb) { watched.push({ p: this.p, cb }); return () => {}; } write() {} destroy() {} };
  });
  assertEqual(H.TCOLS[0].hide, true, "TCOLS: hide:true an der ausgeblendeten Spalte");
  assertEqual(H.TCOLS[1].hide, undefined, "TCOLS: sichtbare Spalte ohne hide-Feld");
  assert(watched.some((w) => w.p === "%s%ADS.PLC.MAIN.aAlarmHmi[0]::nId%/s%"), "ausgeblendete Spalte wird gelesen (Watch auf ::nId)");
  assertEqual(watched.filter((w) => /::nId%/.test(w.p)).length, 4, "je Zeile ein Watch auf nId");

  // Werte liefern: Zeile 0 nId=0 (gefiltert), 1 -> 101, 2 -> 7, 3 -> 205
  const set = (r, member, v) => watched.find((w) => w.p === `%s%ADS.PLC.MAIN.aAlarmHmi[${r}]::${member}%/s%`).cb({ error: 0, value: v });
  set(0, "nId", 0); set(1, "nId", 101); set(2, "nId", 7); set(3, "nId", 205);
  H.renderBody();

  const rows = H.tbody.children;
  assertEqual(rows.length, 3, "Filter notZero auf ausgeblendeter Spalte wirkt (Zeile mit nId=0 ausgeblendet)");
  assertEqual(rows.map((tr) => tr.children.length), [3, 3, 3], "je Zeile 3 Datenzellen (ausgeblendete Spalte ohne td)");
  assertEqual(rows[0].children[0].textContent, "L_alarm205", "Standardsortierung (desc) ueber ausgeblendete Spalte + Vorlage {1:3} nutzt ihren Wert");
  assertEqual(rows[2].children[0].textContent, "L_alarm007", "Vorlage mit fuehrenden Nullen aus ausgeblendeter Spalte");
  assertEqual(H.resolveParam(3, H.TCOLS[3]), 205, "Button-Parameter aus ausgeblendeter Spalte");

  H.setQuery("101"); H.renderBody();
  assertEqual(H.tbody.children.length, 1, "Suche findet Wert der ausgeblendeten Spalte");
  H.setQuery(""); H.renderBody();
}

// Kopfzeile: ausgeblendete Spalte erzeugt kein th
{
  const H = buildTableHooks(mkAlarm());
  const root = (function find(n) { while (n.parentNode) n = n.parentNode; return n; })(H.tbody);
  const heads = walk(root).filter((e) => e.tagName === "th").map((e) => e.textContent || walk(e).map((x) => x._textContent || "").join(""));
  assert(!heads.some((h) => h.indexOf("Nr.") >= 0), "Kopfzeile ohne ausgeblendete Spalte 'Nr.'");
  assert(heads.some((h) => h.indexOf("Alarm") >= 0), "Kopfzeile enthaelt sichtbare Spalte 'Alarm'");
  assertEqual(heads.length, 3, "3 Kopfzellen");
}

// ── 2) Byte-Neutralitaet ──
{
  const a = mkAlarm(); a.columns = a.columns.map((c) => { const o = { ...c }; delete o.hidden; return o; });
  const b = mkAlarm(); b.columns = b.columns.map((c) => ({ ...c, hidden: false }));
  assertEqual(emitTable("p", b), emitTable("p", a), "hidden:false erzeugt denselben Code wie ohne Feld");
  assert(emitTable("p", a).indexOf("COL_SHOW") < 0, "ohne ausgeblendete Spalte kein COL_SHOW");
}

// ── 3) observe-Deny mit Abhaengigkeit: trotzdem lesen, nicht anzeigen/durchsuchen ──
{
  const acc = (spec) => { const x = mkAccess(); x.observe.on = true; Object.keys(spec).forEach((g) => { x.observe.groups[g] = spec[g]; }); return x; };
  const cId = { ...mkTableCol("read"), header: "Nr.", member: "nId" };
  const cPrio = { ...mkTableCol("read"), header: "Intern", member: "nPrio", access: acc({ Operator: "Deny", Process_Engineer: "Deny" }) };
  const cFree = { ...mkTableCol("read"), header: "Frei", member: "nFree", access: acc({ Operator: "Deny", Process_Engineer: "Deny" }) };
  const block = { ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.PLC.MAIN.aList", arrayCount: 2,
    columns: [cId, cPrio, cFree], rows: [], rowFilters: [{ ...mkRowFilter(), colIndex: 1, op: "notZero", value: "" }] };
  const cfg = { mode: "event", fnName: "AC_ObsDeps", title: "T", titleLoc: "", titleSource: "static", titleField: "", titleFallback: "",
    titleIcon: "", titleIconColor: "", maxWidth: 400, columns: 1, hostSuffix: "", blocks: [block] };
  const code = generate(cfg);
  const watched = [];
  const { sandbox } = makeSandbox();
  sandbox.TcHmi.Server.getCurrentUserConfig = () => ({ state: 4, userIsInGroups: ["Operator"] });
  sandbox.TcHmi.Symbol = class { constructor(p) { this.p = p; } watch(cb) { watched.push({ p: this.p, cb }); return () => {}; } write() {} destroy() {} };
  vm.runInContext(code, vm.createContext(sandbox), { filename: "obsdeps-under-test.js" });
  assert(watched.some((w) => /::nPrio%/.test(w.p)), "observe-gesperrte Spalte MIT Filter-Abhaengigkeit wird gelesen");
  assert(!watched.some((w) => /::nFree%/.test(w.p)), "observe-gesperrte Spalte OHNE Abhaengigkeit bleibt ungebunden");
  const body = sandbox.document.body;
  const allText = walk(body).map((e) => e._textContent || "").join("|");
  assert(allText.indexOf("Intern") < 0, "observe-gesperrte Spalte erscheint nicht in der Kopfzeile");
  // Werte liefern -> Filter wirkt
  const fire = (re, v) => watched.filter((w) => re.test(w.p)).forEach((w, i) => w.cb({ error: 0, value: typeof v === "function" ? v(i) : v }));
  fire(/::nId%/, (i) => 10 + i);
  fire(/::nPrio%/, (i) => (i === 0 ? 0 : 3));
  const tbody = walk(body).find((e) => e.tagName === "tbody");
  assertEqual(tbody.children.length, 1, "Filter auf observe-gesperrter Spalte wirkt (vorher: alle Zeilen weg)");
}

// ── 4) tableColDeps ──
{
  const deps = tableColDeps(mkAlarm({ rules: [{ ...mkTableRule(), colIndex: 0 }, { ...mkTableRule(), colIndex: "2" }] }));
  assertEqual(deps[0].map((d) => d.kind).sort(), ["filter", "param", "rule", "sort", "tpl"], "Spalte 1: Regel, Filter, Sortierung, Parameter, Vorlage");
  assertEqual(deps[1], [], "Textspalte: keine Abhaengigkeit (Vorlage auf sich selbst zaehlt nicht)");
  assertEqual(deps[2].map((d) => d.label), ["Farbregel 2"], "Spalte 3: Farbregel 2");
  assertEqual(deps[3], [], "Button-Spalte: keine Abhaengigkeit");
  assert(deps[0].some((d) => d.label === "Button „?“ (Parameter)"), "Label des Button-Parameters");
  assertEqual(tableColDeps({ columns: [mkTableCol("read")], defaultSortCol: 5 }), [[]], "Sortierindex ausserhalb -> ignoriert");
}

report("hidden-logic");
