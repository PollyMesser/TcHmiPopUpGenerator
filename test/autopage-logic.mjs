#!/usr/bin/env node
// ── Logik-Test: Zeilen pro Seite automatisch + Zeilenhoehe als Bereich (Phase 6) ──
// Prueft den ECHTEN emitTable-Output mit simuliertem Layout (Stub-Rects):
//   - Byte-Neutralitaet: pageMode fehlt/'fixed' -> unveraenderter Code
//   - PAGE_AUTO aus Editor-Werten (Standard 3..50, Groessenstufe, rowHMax)
//   - Eingebettet: Zeilenzahl aus Containerhoehe ab Tabellenanfang, Touch verteilt Restplatz
//   - Begrenzung auf min/max und rhMin/rhMax, erster sichtbarer Datensatz bleibt sichtbar
//   - Kompakt: Zeilenhoehe wird an der kleinsten gerenderten Zeile gemessen
//   - Popup: 60 % der Fensterhoehe
import { emitTable } from "../src/codegen/emitTable.js";
import { newBlock, mkTableCol } from "../src/model/factories.js";
import { pageAutoOf } from "../src/model/tableLayout.js";
import { buildTableHooks } from "./_table-harness.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const cols = () => [
  { ...mkTableCol("read"), header: "Nr.", member: "nId" },
  { ...mkTableCol("bool"), header: "LED", member: "bOn" },
];
const block = (extra) => ({ ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.PLC.MAIN.aList", arrayCount: 40, columns: cols(), rows: [], ...extra });

// Eingebettet: Elternelement des Wrappers ist der scrollende Embed-Body
function embedHooks(extra, geo) {
  let parentEl = null;
  const H = buildTableHooks(block(extra), "parent", (ctx) => {
    ctx.AC_EMBED = true;
    parentEl = ctx.parent;
    ctx.window.getComputedStyle = (el) => ({ backgroundColor: "", overflowY: el === parentEl ? "auto" : "visible", paddingBottom: "0px" });
    ctx.window.innerHeight = 800;
  });
  const table = H.tbody.parentNode, scroller = table.parentNode, wrap = scroller.parentNode;
  const thead = table.children[0];
  const pager = wrap.children[wrap.children.length - 1];
  const setGeo = (g) => {
    parentEl.clientHeight = g.h; parentEl.scrollTop = g.scrollTop || 0;
    parentEl._rect = { top: 0, height: g.h };
    scroller._rect = { top: g.top };
    thead._rect = { height: g.thead };
    pager._rect = { height: g.pager };
  };
  setGeo(geo);
  return { H, setGeo, parentEl };
}

// ── 1) Konfiguration / Byte-Neutralitaet ──
{
  assertEqual(emitTable("p", block({ pageMode: "fixed", pageMin: "9" })), emitTable("p", block({})), "pageMode 'fixed' == ohne Feld");
  assert(emitTable("p", block({})).indexOf("PAGE_AUTO") < 0, "fest: keine Auto-Logik");
  assertEqual(pageAutoOf({ pageMode: "auto" }), { min: 3, max: 50, rhMin: 0, rhMax: 0 }, "kompakt: Standard 3..50, Hoehe gemessen");
  assertEqual(pageAutoOf({ pageMode: "auto", layout: "touch" }), { min: 3, max: 50, rhMin: 46, rhMax: 60 }, "Touch M: 46..60 px");
  assertEqual(pageAutoOf({ pageMode: "auto", layout: "touch", size: "l", rowHMax: "40", pageMin: "8", pageMax: "5" }), { min: 8, max: 8, rhMin: 54, rhMax: 54 }, "max >= min, rhMax >= rhMin");
  const H = buildTableHooks(block({ pageMode: "auto", pageMin: "4" }));
  assertEqual(H.getPageSize(), 4, "Startwert PAGE_SIZE = Minimum (Pager wird aufgebaut)");
}

// ── 2) Touch eingebettet: Zeilenzahl + verteilte Zeilenhoehe ──
{
  // Hoehe 600, Tabelle ab 100, Kopf 46, Pager 44(+8), Abstand 16, Rahmen 2, Reserve 1 -> Flaeche 383
  const { H, setGeo } = embedHooks({ layout: "touch", pageMode: "auto", pageMin: "4", pageMax: "30" }, { h: 600, top: 100, thead: 46, pager: 44 });
  assertEqual(H.autoArea(), 383, "verfuegbare Flaeche fuer Zeilen");
  H.setPage(2); // vorher 4 je Seite -> erster sichtbarer Datensatz 8
  H.autoFit();
  assertEqual(H.getPageSize(), 8, "384 / 46 -> 8 Zeilen");
  assertEqual(H.tbody.style["--ac-rh"], "47px", "Restplatz verteilt: 383 / 8 = 47 px (am tbody, nicht an der Kopfzeile)");
  assertEqual(H.getPage(), 1, "erster sichtbarer Datensatz (8) bleibt sichtbar -> Seite 2");
  assertEqual(H.tbody.children.length, 8, "8 Zeilen gerendert");

  // groesser: 1200 -> Flaeche 983 -> 21 Zeilen, 46 px
  setGeo({ h: 1200, top: 100, thead: 46, pager: 44 });
  H.autoFit();
  assertEqual([H.getPageSize(), H.tbody.style["--ac-rh"]], [21, "46px"], "grosser Bildschirm: mehr Zeilen statt groesserer Zeilen");

  // sehr hoch: max 30 Zeilen -> Zeilen dehnen bis rhMax (60)
  setGeo({ h: 3000, top: 100, thead: 46, pager: 44 });
  H.autoFit();
  assertEqual([H.getPageSize(), H.tbody.style["--ac-rh"]], [30, "60px"], "Maximum 30 Zeilen, Zeilenhoehe auf 60 px begrenzt");

  // sehr klein: min 4 Zeilen, Zeilenhoehe nicht unter 46
  setGeo({ h: 300, top: 100, thead: 46, pager: 44 });
  H.autoFit();
  assertEqual([H.getPageSize(), H.tbody.style["--ac-rh"]], [4, "46px"], "Minimum 4 Zeilen, Zeilenhoehe nicht unter 46 px");

  // gescrollter Embed-Body: Tabellenanfang relativ zum Inhalt, nicht zum Bildschirm
  setGeo({ h: 600, top: -200, scrollTop: 300, thead: 46, pager: 44 });
  assertEqual(H.autoArea(), 383, "scrollTop wird beruecksichtigt (Tabelle bei 100 im Inhalt)");

  // Container noch ohne Hoehe (View nicht aufgebaut) -> unveraendert
  const before = H.getPageSize();
  setGeo({ h: 0, top: 0, thead: 46, pager: 44 });
  H.autoFit();
  assertEqual(H.getPageSize(), before, "Hoehe 0: Zeilenzahl bleibt");
}

// ── 3) Kompakt: Zeilenhoehe gemessen ──
{
  const { H } = embedHooks({ pageMode: "auto", pageMin: "3" }, { h: 600, top: 100, thead: 30, pager: 24 });
  // Flaeche: 600 - 100 - 30 - 32 - 16 - 2 - 1 = 419
  H.tbody.children.forEach((tr, i) => { tr._rect = { height: i === 1 ? 90 : 41.6 }; }); // Zeile 1 z. B. aufgeklappt
  H.autoFit();
  assertEqual(H.getPageSize(), 9, "kleinste gemessene Zeile 41.6 -> aufgerundet 42 px -> 419 / 42 = 9");
  assertEqual(H.tbody.style["--ac-rh"], undefined, "kompakt: keine Zeilenhoehe gesetzt");
}

// ── 4) Popup: 60 % der Fensterhoehe ──
{
  const H = buildTableHooks(block({ layout: "touch", pageMode: "auto" }), "parent", (ctx) => { ctx.window.innerHeight = 800; });
  const thead = H.tbody.parentNode.children[0];
  thead._rect = { height: 46 };
  assertEqual(H.autoArea(), Math.floor(800 * 0.6 - 46 - 2) - 1, "Popup: 60vh minus Kopfzeile und Rahmen");
  H.autoFit();
  assertEqual(H.getPageSize(), 9, "431 / 46 -> 9 Zeilen");
}

report("autopage-logic");
