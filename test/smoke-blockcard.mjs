#!/usr/bin/env node
// ── Smoke-Test: BlockCard geöffnet für jeden Blocktyp × jeden Ausgabemodus ──
// Rendert die Editor-Karte (Accordion, aufgeklappt) einmal für jede
// Kombination aus BLOCK_META-Typ und Ausgabemodus. actions/ui-Setter sind
// No-ops (Proxy) – es geht nur darum, dass das Aufklappen jedes Blocktyps in
// jedem Modus nicht crasht (z.B. durch einen Feld-Zugriff, der bei
// bestimmten mode-spezifischen Zweigen fehlt).
import React from "react";
import { renderToString } from "react-dom/server";
import { bundleJsx } from "./_bundle.mjs";
import { BLOCK_META } from "../src/constants/options.js";
import { newBlock, mkTableCol, mkTableMapEntry } from "../src/model/factories.js";

const MODES = ["registered", "event", "usercontrol"];
const symMeta = (mode) => (mode === "usercontrol"
  ? { label: "ATTRIBUT (getX/setX)", ph: "z.B. Running" }
  : { label: "SYMBOL", ph: "ADS.PLC.MAIN…::xVar" });

// Jeder Property-Zugriff liefert eine No-op-Funktion – deckt alle ~40
// Action-Handler ab, ohne sie hier einzeln nachpflegen zu müssen.
const noopActions = new Proxy({}, { get: () => () => {} });

function optsFor(block) {
  // Muss App.jsx's Segmentierung spiegeln: row/plot/divider(!inCol) sind volle Breite.
  const fullWidth = block.type === "row" || block.type === "plot" || (block.type === "divider" && !block.inCol);
  return fullWidth ? { fullWidth: true } : { c: 0, i: 0, colLen: 1 };
}

async function main() {
  const mod = await bundleJsx("src/components/editor/BlockCard.jsx", "blockcard.smoke.mjs");
  const BlockCard = mod.BlockCard;
  if (typeof BlockCard !== "function") throw new Error("BlockCard.jsx exportiert keine BlockCard-Komponente.");

  const failures = [];
  let count = 0;
  for (const type of Object.keys(BLOCK_META)) {
    for (const mode of MODES) {
      count++;
      const b = newBlock(type);
      const ui = {
        openId: b.id, setOpenId: () => {},
        dragId: null, setDragId: () => {},
        grabbedId: null, setGrabbedId: () => {},
        dropTarget: null, setDropTarget: () => {},
        columns: 1, mode, sm: symMeta(mode),
      };
      try {
        renderToString(React.createElement(BlockCard, { b, opts: optsFor(b), ui, actions: noopActions }));
      } catch (e) {
        failures.push(`${type} × ${mode}: ${e.message}`);
      }
    }
  }

  // Tabellen-Sonderfälle: Text-Vorlage (gültig/fehlerhaft) + Enum-Darstellungen, statisch & Array
  const prevMod = await bundleJsx("src/components/preview.jsx", "preview.smoke.mjs");
  const tplCols = [
    { ...mkTableCol("read"), header: "Nr", member: "nId" },
    { ...mkTableCol("text"), header: "Text", locTpl: "L_alarm + {1:3}", textTpl: "Alarm {1}" },
    { ...mkTableCol("text"), header: "Kaputt", locTpl: "L_{9} + {x:0} + {" },
    { ...mkTableCol("enum"), header: "E1", member: "eType", enumDisplay: "text", map: [mkTableMapEntry("1", "Info", "blue")] },
    { ...mkTableCol("enum"), header: "E2", member: "eType", enumDisplay: "dot", map: [mkTableMapEntry("1", "Info", "blue")] },
    { ...mkTableCol("enum"), header: "E3", member: "eType", enumDisplay: "ctext", map: [] },
  ];
  for (const ds of ["static", "array"]) {
    for (const mode of MODES) {
      count++;
      const b = { ...newBlock("table"), dataSource: ds, columns: tplCols, rows: [] };
      const ui = { openId: b.id, setOpenId: () => {}, dragId: null, setDragId: () => {}, grabbedId: null, setGrabbedId: () => {}, dropTarget: null, setDropTarget: () => {}, columns: 1, mode, sm: symMeta(mode) };
      try {
        const html = renderToString(React.createElement(BlockCard, { b, opts: optsFor(b), ui, actions: noopActions }));
        if (html.indexOf("LOC-KEY-VORLAGE") < 0) failures.push(`table-tpl ${ds} × ${mode}: Vorlagen-Feld fehlt`);
        if (html.indexOf("DARSTELLUNG") < 0) failures.push(`table-tpl ${ds} × ${mode}: Enum-Darstellung fehlt`);
        const ph = renderToString(React.createElement(prevMod.BlockPreview, { b, pal: { border: "#ccc", headerBg: "#eee", titleColor: "#000", bodyText: "#333", inactive: "#999" }, on: {}, onToggle: () => {} }));
        if (ph.indexOf("Alarm") < 0) failures.push(`table-tpl ${ds} × ${mode}: Vorschau zeigt Fallback-Vorlage nicht`);
      } catch (e) {
        failures.push(`table-tpl ${ds} × ${mode}: ${e.message}`);
      }
    }
  }

  // Tabellen-Touch-Varianten: Layout, Zeilen pro Seite automatisch, Feldbreite, kuerzbarer Text, ausgeblendet
  const touchCols = [
    { ...mkTableCol("read"), header: "Nr", member: "nId", hidden: true },
    { ...mkTableCol("text"), header: "Text", locTpl: "L_alarm{1:3}", clamp: true, clampMin: "6" },
    { ...mkTableCol("input"), header: "Wert", member: "fVal", keypad: true, unit: "bar" },
  ];
  for (const [layout, pageMode] of [["touch", "auto"], ["touch", "fixed"], ["compact", "auto"]]) {
    count++;
    const b = { ...newBlock("table"), dataSource: "array", columns: touchCols, rows: [], layout, pageMode, rowFilters: [{ id: "f1", colIndex: 0, op: "notZero", value: "" }] };
    const ui = { openId: b.id, setOpenId: () => {}, dragId: null, setDragId: () => {}, grabbedId: null, setGrabbedId: () => {}, dropTarget: null, setDropTarget: () => {}, columns: 1, mode: "registered", sm: symMeta("registered") };
    try {
      const html = renderToString(React.createElement(BlockCard, { b, opts: optsFor(b), ui, actions: noopActions }));
      const need = ["ZEILEN PRO SEITE", "MIN. BREITE", "Verwendet von"]
        .concat(pageMode === "auto" ? ["MIN. ZEILEN", "MAX. ZEILEN"] : ["SEITENGRÖSSE"])
        .concat(layout === "touch" ? ["FELDBREITE", "GRÖSSE"] : [])
        .concat(layout === "touch" && pageMode === "auto" ? ["ZEILENHÖHE MAX."] : []);
      need.forEach((t) => { if (html.indexOf(t) < 0) failures.push(`table-touch ${layout}/${pageMode}: '${t}' fehlt`); });
      renderToString(React.createElement(prevMod.BlockPreview, { b, pal: { border: "#ccc", headerBg: "#eee", titleColor: "#000", bodyText: "#333", inactive: "#999" }, on: {}, onToggle: () => {} }));
    } catch (e) {
      failures.push(`table-touch ${layout}/${pageMode}: ${e.message}`);
    }
  }

  // Keypad (AC_NumPad): Eingabefeld-Baustein + Tabellen-Eingabespalte mit aktivierter Option
  const pal0 = { border: "#ccc", headerBg: "#eee", titleColor: "#000", bodyText: "#333", inactive: "#999", boxBg: "#fff" };
  for (const mode of MODES) {
    count++;
    const ui = (b) => ({ openId: b.id, setOpenId: () => {}, dragId: null, setDragId: () => {}, grabbedId: null, setGrabbedId: () => {}, dropTarget: null, setDropTarget: () => {}, columns: 1, mode, sm: symMeta(mode) });
    try {
      const bi = { ...newBlock("input"), keypad: true, kpMin: "0", kpMax: "rMax", kpDecimals: "1" };
      const h1 = renderToString(React.createElement(BlockCard, { b: bi, opts: optsFor(bi), ui: ui(bi), actions: noopActions }));
      if (h1.indexOf("NACHKOMMA") < 0) failures.push(`keypad-input × ${mode}: Keypad-Felder fehlen`);
      if (h1.indexOf("SENDEN-BUTTON ANZEIGEN") >= 0) failures.push(`keypad-input × ${mode}: Senden-Button-Option trotz Keypad sichtbar`);
      const p1 = renderToString(React.createElement(prevMod.BlockPreview, { b: bi, pal: pal0, on: {}, onToggle: () => {} }));
      if (p1.indexOf("Keypad") < 0) failures.push(`keypad-input × ${mode}: Vorschau ohne Keypad-Hinweis`);
      for (const ds of ["static", "array"]) {
        const bt = { ...newBlock("table"), dataSource: ds, columns: [{ ...mkTableCol("input"), header: "Wert", member: "rValue", keypad: true, kpMin: "rMin", kpMax: "16" }], rows: [] };
        const h2 = renderToString(React.createElement(BlockCard, { b: bt, opts: optsFor(bt), ui: ui(bt), actions: noopActions }));
        if (h2.indexOf("MIN (MEMBER ODER ZAHL)") < 0) failures.push(`keypad-table ${ds} × ${mode}: Min/Max-Felder fehlen`);
        renderToString(React.createElement(prevMod.BlockPreview, { b: bt, pal: pal0, on: {}, onToggle: () => {} }));
      }
    } catch (e) {
      failures.push(`keypad × ${mode}: ${e.message}`);
    }
  }

  if (failures.length) {
    console.error(`✗ smoke-blockcard: ${failures.length}/${count} Kombinationen fehlgeschlagen:`);
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log(`✓ smoke-blockcard: alle ${count} Kombinationen (${Object.keys(BLOCK_META).length} Blocktypen × ${MODES.length} Modi) rendern geöffnet ohne Fehler.`);
}

main().catch((e) => { console.error("✗ smoke-blockcard fehlgeschlagen:", e); process.exit(1); });
