#!/usr/bin/env node
// ── Logik-Test: Touch-Layout der Tabelle (Phasen 2–4) ──
// Prueft den ECHTEN emitTable-Output:
//   - Layout-Schalter: ohne 'layout' gilt TABLE_LAYOUT_DEFAULT; 'compact' == Bestandscode (byte-identisch)
//   - Groessenstufen S/M/L als CSS-Variablen am Wrapper, Zellen referenzieren nur var(--ac-…)
//   - Checkbox: ganze Zelle tippbar, operate-Sperre (disabled) respektiert
//   - Pager: erste/letzte Seite, Abdimmen deaktivierter Tasten
//   - Feldbreiten: automatisch/ueberschrieben, identisch fuer alle Zeilen einer Spalte
import { emitTable } from "../src/codegen/emitTable.js";
import { newBlock, mkTableCol } from "../src/model/factories.js";
import { TABLE_SIZES } from "../src/constants/palette.js";
import { TABLE_LAYOUT_DEFAULT, tableLayoutOf, autoFieldWidth, fieldWidthOf } from "../src/model/tableLayout.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const walk = (el, out = []) => { out.push(el); (el.children || []).forEach((c) => walk(c, out)); return out; };
const rootOf = (n) => { while (n.parentNode) n = n.parentNode; return n; };

const cols = () => [
  { ...mkTableCol("read"), header: "Nr.", member: "nId" },
  { ...mkTableCol("check"), header: "Aktiv", member: "bEnable" },
  { ...mkTableCol("bool"), header: "LED", member: "bOn" },
  { ...mkTableCol("input"), header: "Grenzwert", member: "fLimit", inputType: "number", keypad: true, unit: "bar", decimals: "1" },
  { ...mkTableCol("input"), header: "Zeit", member: "tDelay", inputType: "time" },
  { ...mkTableCol("input"), header: "Name", member: "sName", inputType: "text", fieldWidth: "10" },
];
const block = (extra) => ({ ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.PLC.MAIN.aList", arrayCount: 12, pageSize: 5, columns: cols(), rows: [], ...extra });

// ── 1) Layout-Schalter / Byte-Neutralitaet ──
{
  assertEqual(tableLayoutOf({}), TABLE_LAYOUT_DEFAULT, "ohne layout -> Default");
  assertEqual(tableLayoutOf({ layout: "quatsch" }), TABLE_LAYOUT_DEFAULT, "ungueltiges layout -> Default");
  const noField = emitTable("p", block());
  const compact = emitTable("p", block({ layout: "compact" }));
  const touch = emitTable("p", block({ layout: "touch" }));
  if (TABLE_LAYOUT_DEFAULT === "compact") assertEqual(noField, compact, "ohne layout == compact (solange Default compact)");
  else assertEqual(noField, touch, "ohne layout == touch (Default touch)");
  assert(compact.indexOf("var(--ac-") < 0, "compact: keine CSS-Variablen");
  assert(compact.indexOf("firstBtn") < 0, "compact: kein erweiterter Pager");
  assert(touch.indexOf("width:80px") < 0, "touch: keine feste 80px-Feldbreite mehr");
  assert(touch.indexOf("String.fromCharCode(92)") < 0 && touch.indexOf(String.fromCharCode(92)) < 0, "touch: kein Backslash im Output");
  assertEqual(emitTable("p", block({ layout: "touch", size: "x" })), emitTable("p", block({ layout: "touch", size: "m" })), "ungueltige Groesse -> M");
}

// ── 2) Groessenstufen als CSS-Variablen am Wrapper ──
for (const k of Object.keys(TABLE_SIZES)) {
  const H = buildTableHooks(block({ layout: "touch", size: k }));
  const wrap = H.tbody.parentNode.parentNode.parentNode; // tbody -> table -> scroller -> wrap
  const css = wrap.style.cssText || "";
  const S = TABLE_SIZES[k];
  assert(css.indexOf(`--ac-rh:${S.rh}px;`) >= 0 && css.indexOf(`--ac-ctl:${S.ctl}px;`) >= 0 && css.indexOf(`--ac-pb:${S.pb}px;`) >= 0,
    `Groesse ${k}: Wrapper setzt --ac-rh/--ac-ctl/--ac-pb (${css})`);
}

// ── 3) Zellen: Checkbox-Zelle tippbar, LED/Checkbox ueber Variablen ──
{
  const writes = [];
  const H = buildTableHooks(block({ layout: "touch" }), "parent", (ctx) => {
    ctx.TcHmi.Symbol = class { constructor(p) { this.p = p; } watch() { return () => {}; } write(v) { writes.push({ p: this.p, v }); } destroy() {} };
  });
  const pp = H.palT();
  const td = H.buildCellEl(0, 1, pp);
  const cb = td.children[0];
  assert(/width:var\(--ac-ctl\)/.test(cb.style.cssText), "Checkbox-Groesse ueber --ac-ctl");
  assert(/height:var\(--ac-rh\)/.test(td.style.cssText), "Zellenhoehe ueber --ac-rh");
  assertEqual((td._listeners.click || []).length, 1, "Checkbox-Zelle hat Klick-Handler");
  td._listeners.click[0]({ target: td });
  assertEqual(cb.checked, true, "Tippen in die Zelle setzt die Checkbox");
  assertEqual(writes, [{ p: "%s%ADS.PLC.MAIN.aList[0]::bEnable%/s%", v: true }], "Tippen in die Zelle schreibt TRUE");
  td._listeners.click[0]({ target: cb });
  assertEqual(writes.length, 1, "Klick direkt auf die Checkbox: kein Doppel-Schreiben (change-Handler zustaendig)");
  cb.disabled = true;
  td._listeners.click[0]({ target: td });
  assertEqual(writes.length, 1, "gesperrte Checkbox (operate) -> Zellen-Tippen schreibt nicht");

  const led = H.buildCellEl(0, 2, pp).children[0];
  assert(/width:var\(--ac-led\)/.test(led.style.cssText), "LED-Groesse ueber --ac-led");
}

// ── 4) Feldbreiten ──
{
  const H = buildTableHooks(block({ layout: "touch" }));
  assertEqual(H.TCOLS[3].fw, 11, "Keypad Zahl, 1 Dezimale, Einheit 'bar': 5+2 + 3+1 = 11ch");
  assertEqual(H.TCOLS[4].fw, 9, "Zeit: 9ch (HH:MM:SS)");
  assertEqual(H.TCOLS[5].fw, 10, "Text mit Ueberschreibung: 10ch");
  assertEqual(H.TCOLS[0].fw, undefined, "Lese-Spalte: keine Feldbreite");
  const pp = H.palT();
  const w = [0, 1, 2].map((r) => H.buildCellEl(r, 3, pp).children[0].style.cssText.match(/width:([0-9]+ch)/)[1]);
  assertEqual(w, ["11ch", "11ch", "11ch"], "Keypad-Button: gleiche Breite in allen Zeilen (width statt min-width)");
  const ti = H.buildCellEl(0, 4, pp).children[0].style.cssText;
  assert(/^width:9ch;/.test(ti), "Zeit-Eingabe: width:9ch");
  const Hc = buildTableHooks(block({ layout: "compact" }));
  assertEqual(Hc.TCOLS[3].fw, undefined, "compact: keine Feldbreite im TCOLS-JSON");

  assertEqual(autoFieldWidth({ inputType: "number" }), 7, "Zahl ohne Dezimalangabe: 7ch");
  assertEqual(autoFieldWidth({ inputType: "number", decimals: "0" }), 5, "Zahl, 0 Dezimalen: 5ch");
  assertEqual(autoFieldWidth({ inputType: "number", keypad: true, unitMember: "sUnit" }), 14, "Keypad + Einheit je Zeile: +7ch");
  assertEqual(autoFieldWidth({ inputType: "number", keypad: true, unitMember: "sUnit" }, false), 7, "statisch: Einheit-Member ignoriert");
  assertEqual(autoFieldWidth({ inputType: "number", unit: "bar" }), 7, "ohne Keypad: Einheit nicht im Feld");
  assertEqual(fieldWidthOf({ inputType: "text", fieldWidth: "99" }), 40, "Ueberschreibung auf 40ch begrenzt");
  assertEqual(fieldWidthOf({ inputType: "text", fieldWidth: "x" }), 12, "ungueltige Ueberschreibung -> automatisch");
}

// ── 5) Pager: erste/letzte Seite, Abdimmen ──
{
  const H = buildTableHooks(block({ layout: "touch" }));
  H.vals.length = 0;
  H.renderBody();
  const btns = walk(rootOf(H.tbody)).filter((e) => e.tagName === "button" && ["«", "‹", "›", "»"].includes(e.textContent));
  assertEqual(btns.map((b) => b.textContent), ["«", "‹", "›", "»"], "Pager: erste, vorherige, naechste, letzte Seite");
  const [first, prev, next, last] = btns;
  assert(btns.every((b) => /width:var\(--ac-pb\)/.test(b.style.cssText)), "Pager-Tasten ueber --ac-pb");
  assertEqual([first.disabled, prev.disabled, next.disabled, last.disabled], [true, true, false, false], "Seite 1: erste/vorherige gesperrt");
  assertEqual(first.style.opacity, ".35", "gesperrte Taste abgedimmt");
  last.onclick({ stopPropagation() {} });
  assertEqual(H.getPage(), 2, "letzte Seite: 12 Zeilen / 5 -> Seite 3 (Index 2)");
  assertEqual([next.disabled, last.disabled, first.disabled], [true, true, false], "letzte Seite: naechste/letzte gesperrt");
  first.onclick({ stopPropagation() {} });
  assertEqual(H.getPage(), 0, "erste Seite");
  assert(btns.every((b) => b["data-ac-view"] === "1"), "Pager-Tasten bleiben bei operate-Sperre nutzbar (data-ac-view)");
}

report("touch-logic");
