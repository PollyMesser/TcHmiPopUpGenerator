#!/usr/bin/env node
// ── Logik-Test: Gruppen-Berechtigungen zur Laufzeit ──
// Führt den ECHTEN generierten Popup-Code (event-Modus, läuft sofort per IIFE
// und baut in document.body) per node:vm aus und variiert
// TcHmi.Server.getCurrentUserConfig().userIsInGroups, um zu prüfen:
//   - observe Deny  -> Element/Popup wird NICHT gebaut
//   - operate Deny  -> Element sichtbar, aber Bedienelemente disabled
//   - Whitelist/Allow-wins: nur erlaubte Gruppen sehen/bedienen
import vm from "node:vm";
import { generate } from "../src/codegen/index.js";
import { newBlock, mkButton, mkTableCol, mkTableRow } from "../src/model/factories.js";
import { mkAccess } from "../src/model/access.js";
import { makeSandbox } from "./_dom-stub.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const baseCfg = (blocks, access) => ({
  mode: "event", fnName: "AC_Acc", title: "T", titleLoc: "", titleSource: "static",
  titleField: "", titleFallback: "", titleIcon: "", titleIconColor: "",
  maxWidth: 400, columns: 1, hostSuffix: "", blocks,
  ...(access ? { access } : {}),
});

// access-Objekt aus knapper Spezifikation (wie in test/configs.mjs)
const acc = (spec) => {
  const a = mkAccess();
  for (const rk of Object.keys(spec)) { a[rk].on = true; for (const g of Object.keys(spec[rk])) a[rk].groups[g] = spec[rk][g]; }
  return a;
};

// Popup-Code mit gegebener Gruppen-Zugehörigkeit ausführen; document.body zurück.
function run(cfg, groups) {
  const code = generate(cfg);
  const { sandbox } = makeSandbox();
  sandbox.TcHmi.Server.getCurrentUserConfig = () => ({ state: 4, userIsInGroups: groups });
  const context = vm.createContext(sandbox);
  vm.runInContext(code, context, { filename: "access-under-test.js" });
  return sandbox.document.body;
}
function walk(el, out = []) { out.push(el); (el.children || []).forEach((c) => walk(c, out)); return out; }
const hasText = (root, t) => walk(root).some((el) => el.textContent === t);
// Bedienelemente OHNE den Header-Schließen-Button (×): der sitzt im header,
// nicht im body/Baustein, und bleibt bewusst auch bei operate-Deny nutzbar.
const controls = (root) => walk(root).filter((el) => ["button", "input", "select", "textarea"].includes(el.tagName) && el.textContent !== "×");

// ── 1) Per-Baustein observe: Deny blendet den Baustein aus ──
{
  const cfg = baseCfg([
    { ...newBlock("read"), label: "Geheim", symbol: "ADS.…::rSecret", access: acc({ observe: { Operator: "Deny", Process_Engineer: "Deny" } }) },
    { ...newBlock("read"), label: "Offen", symbol: "ADS.…::rOpen" },
  ]);
  const asOperator = run(cfg, ["Operator", "__SystemUsers"]);
  assertEqual(hasText(asOperator, "Geheim"), false, "observe: Operator sieht den gesperrten Baustein NICHT");
  assertEqual(hasText(asOperator, "Offen"), true, "observe: ungeschützter Baustein bleibt für Operator sichtbar");

  const asAdmin = run(cfg, ["Admin"]);
  assertEqual(hasText(asAdmin, "Geheim"), true, "observe: Admin (erlaubt) sieht den Baustein");
  assertEqual(hasText(asAdmin, "Offen"), true, "observe: Admin sieht auch den ungeschützten Baustein");
}

// ── 2) Per-Baustein operate: Deny lässt den Baustein sichtbar, sperrt aber Bedienung ──
{
  const cfg = baseCfg([
    { ...newBlock("check"), label: "Sperrbar", symbol: "ADS.…::xLock", access: acc({ operate: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" } }) },
  ]);
  const asOperator = run(cfg, ["Operator"]);
  assertEqual(hasText(asOperator, "Sperrbar"), true, "operate: Baustein bleibt für Operator sichtbar (nur observe blendet aus)");
  assert(controls(asOperator).length > 0, "operate: es gibt ein Bedienelement (Checkbox)");
  assert(controls(asOperator).every((el) => el.disabled === true), "operate: alle Bedienelemente sind für Operator deaktiviert");

  const asAdmin = run(cfg, ["Admin"]);
  assert(controls(asAdmin).some((el) => el.tagName === "input" && el.disabled === false), "operate: für Admin ist die Checkbox aktiv (nicht deaktiviert)");
}

// ── 3) Popup-weite observe: Deny verhindert das Öffnen komplett ──
{
  const cfg = baseCfg(
    [{ ...newBlock("read"), label: "Inhalt", symbol: "ADS.…::rX" }],
    acc({ observe: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" } }),
  );
  const asOperator = run(cfg, ["Operator"]);
  assertEqual(asOperator.children.length, 0, "Popup-observe: für Operator wird gar kein Overlay angehängt");
  assertEqual(hasText(asOperator, "Inhalt"), false, "Popup-observe: kein Inhalt gebaut");

  const asAdmin = run(cfg, ["Admin"]);
  assertEqual(asAdmin.children.length, 1, "Popup-observe: für Admin wird das Overlay angehängt");
  assertEqual(hasText(asAdmin, "Inhalt"), true, "Popup-observe: Admin sieht den Inhalt");
}

// ── 4) Popup-weite operate: Deny sperrt alle Bedienelemente im Body ──
{
  const cfg = baseCfg(
    [
      { ...newBlock("input"), label: "Sollwert", symbol: "ADS.…::nSet", dataType: "number" },
      { ...newBlock("button"), buttons: [{ ...mkButton(), label: "Start", symbol: "ADS.…::xStart", writeMode: "pulse" }] },
    ],
    acc({ operate: { Admin: "Allow", Service: "Deny", Process_Engineer: "Deny", Operator: "Deny" } }),
  );
  const asService = run(cfg, ["Service"]);
  assertEqual(asService.children.length, 1, "Popup-operate: Overlay wird angehängt (observe nicht eingeschränkt)");
  const svcControls = controls(asService);
  assert(svcControls.length > 0, "Popup-operate: es gibt Bedienelemente");
  assert(svcControls.every((el) => el.disabled === true), "Popup-operate: für Service sind alle Bedienelemente deaktiviert");

  const asAdmin = run(cfg, ["Admin"]);
  assert(controls(asAdmin).some((el) => el.disabled === false), "Popup-operate: für Admin bleiben Bedienelemente aktiv");
}

// ── 5) Whitelist / Allow-wins: User in mehreren Gruppen, eine erlaubt -> erlaubt ──
{
  const cfg = baseCfg([
    { ...newBlock("read"), label: "MultiGroup", symbol: "ADS.…::rM", access: acc({ observe: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" } }) },
  ]);
  // User ist in Operator (Deny) UND Service (Allow) -> Allow gewinnt
  assertEqual(hasText(run(cfg, ["Operator", "Service"]), "MultiGroup"), true, "Allow-wins: Zugehörigkeit zu einer erlaubten Gruppe genügt");
  // User nur in nicht gelisteter Gruppe -> kein Allow-Treffer -> ausgeblendet
  assertEqual(hasText(run(cfg, ["__SystemUsers"]), "MultiGroup"), false, "Whitelist: ohne erlaubte Gruppe kein Zugriff (Default-Deny)");
}

// ── 6) Per-Button: ein Button frei, ein Button observe+operate-beschränkt ──
// "Operator darf Abbrechen, aber nicht Bestätigen."
{
  const btn = (label, symbol, access) => ({ ...mkButton(), label, symbol, writeMode: "pulse", ...(access ? { access } : {}) });
  const cfg = baseCfg([
    {
      ...newBlock("button"),
      buttons: [
        btn("Abbrechen", "ADS.…::xCancel"),
        btn("Bestätigen", "ADS.…::xConfirm", acc({
          observe: { Admin: "Allow", Service: "Allow", Process_Engineer: "Allow", Operator: "Deny" },
          operate: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" },
        })),
      ],
    },
  ]);
  const btnOf = (root, label) => walk(root).find((el) => el.tagName === "button" && el.textContent === label);

  const asOperator = run(cfg, ["Operator"]);
  assert(!!btnOf(asOperator, "Abbrechen"), "per-Button: Operator sieht den freien Button 'Abbrechen'");
  assertEqual(btnOf(asOperator, "Abbrechen").disabled, false, "per-Button: 'Abbrechen' ist für Operator bedienbar");
  assertEqual(!!btnOf(asOperator, "Bestätigen"), false, "per-Button observe: 'Bestätigen' ist für Operator ausgeblendet");

  const asPE = run(cfg, ["Process_Engineer"]);
  assert(!!btnOf(asPE, "Bestätigen"), "per-Button observe: Process_Engineer sieht 'Bestätigen'");
  assertEqual(btnOf(asPE, "Bestätigen").disabled, true, "per-Button operate: 'Bestätigen' ist für Process_Engineer deaktiviert");
  assertEqual(btnOf(asPE, "Abbrechen").disabled, false, "per-Button: 'Abbrechen' bleibt für Process_Engineer bedienbar");

  const asAdmin = run(cfg, ["Admin"]);
  assert(!!btnOf(asAdmin, "Bestätigen"), "per-Button: Admin sieht 'Bestätigen'");
  assertEqual(btnOf(asAdmin, "Bestätigen").disabled, false, "per-Button: 'Bestätigen' ist für Admin bedienbar");
}

// ── 7) Tabelle mit operate-Deny: Suchen/Blättern/Sortieren bleiben nutzbar, ──
//     nur Zell-Schreibzugriffe (Checkbox) werden gesperrt (Variante 1).
{
  const cRead = { ...mkTableCol("read"), header: "Wert", sortable: true };
  const cCheck = { ...mkTableCol("check"), header: "Ack" };
  const columns = [cRead, cCheck];
  const cfg = baseCfg([
    {
      ...newBlock("table"), dataSource: "static", columns, rows: [mkTableRow(columns.length), mkTableRow(columns.length)],
      search: true, pageSize: 1,
      access: acc({ operate: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" } }),
    },
  ]);
  const asOperator = run(cfg, ["Operator"]);
  const all = walk(asOperator);
  const searchInput = all.find((el) => el.tagName === "input" && /Suchen/.test(el.placeholder || ""));
  const pager = all.filter((el) => el.tagName === "button" && (el.textContent === "‹" || el.textContent === "›"));
  const checkbox = all.find((el) => el.tagName === "input" && el.type === "checkbox");
  const sortTh = all.find((el) => el.tagName === "th" && typeof el.onclick === "function");

  assert(!!searchInput, "Tabelle operate-Deny: Suchfeld existiert");
  assertEqual(searchInput.disabled, false, "Variante 1: Suchfeld bleibt für Operator NUTZBAR (nicht disabled)");
  assert(pager.length === 2, "Tabelle operate-Deny: beide Pager-Buttons existieren");
  // Auf Seite 0 (von 2) deaktiviert die Pagination selbst den ‹-Button – das ist
  // normal. Entscheidend: der ›-Button bleibt aktiv, das Gate hat ihn NICHT gesperrt
  // (sonst wäre er trotz weiterer Seite disabled).
  const nextBtn = pager.find((b) => b.textContent === "›");
  assertEqual(nextBtn.disabled, false, "Variante 1: Weiter-Blättern bleibt für Operator nutzbar (Gate sperrt den Pager nicht)");
  assert(!!sortTh, "Tabelle operate-Deny: sortierbarer Spaltenkopf (th mit onclick) existiert");
  assertEqual(sortTh.disabled === true, false, "Sortieren bleibt für Operator nutzbar (th ist kein Formularelement, wird nie deaktiviert)");
  assert(!!checkbox, "Tabelle operate-Deny: Zell-Checkbox existiert");
  assertEqual(checkbox.disabled, true, "operate-Deny: schreibende Zell-Checkbox IST für Operator deaktiviert");

  // Admin (operate erlaubt): auch die Checkbox ist bedienbar
  const asAdmin = run(cfg, ["Admin"]);
  const adminCb = walk(asAdmin).find((el) => el.tagName === "input" && el.type === "checkbox");
  assertEqual(adminCb.disabled, false, "operate erlaubt: Admin kann die Zell-Checkbox bedienen");
}

report("access-logic");
