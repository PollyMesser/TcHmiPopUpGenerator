import React, { useState, useRef, useMemo } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Copy, Check,
  Type, Eye, CircleDot, MousePointerClick, PencilLine, ToggleLeft, Columns2, Code2,
  Monitor, Sun, Moon, GripVertical, Braces, Zap, Box, List, ChevronsUpDown
} from "lucide-react";

// ── Design-Tokens des Generators (nicht des erzeugten Popups) ──
const T = {
  bg: "#12141a", panel: "#1a1d25", panel2: "#20242e", border: "#2b303c",
  text: "#e7e9ef", muted: "#9298a8", accent: "#22c55e", accentDim: "#15803d",
  danger: "#ef4444", input: "#151821", code: "#0e1016",
};

// ── Button-Grundfarben (funktionieren in Dark + Light) ──
const COLORS = {
  blue:   { bg: "#3b82f6", text: "#ffffff", label: "Blau" },
  green:  { bg: "#22c55e", text: "#06240f", label: "Grün" },
  yellow: { bg: "#f59e0b", text: "#1a1a1a", label: "Gelb" },
  red:    { bg: "#ef4444", text: "#ffffff", label: "Rot" },
  grey:   { bg: "#6b7280", text: "#ffffff", label: "Grau" },
};

// ── Ausgabemodi ──
const OUTPUT_MODES = {
  registered:  { label: "Registrierte Funktion", icon: Braces, hint: "registerFunctionEx, per Symbol (ADS)" },
  event:       { label: "Event-JavaScript",       icon: Zap,    hint: "Reiner JS-Block fürs Event, per Symbol (ADS)" },
  usercontrol: { label: "UserControl-JS",         icon: Box,    hint: "An Host-Control gebunden, per Attribut (getX/setX)" },
};

const BLOCK_META = {
  text:   { label: "Text",            icon: Type,              hint: "Statischer Text" },
  read:   { label: "Wert lesen",      icon: Eye,               hint: "Variable anzeigen" },
  bool:   { label: "Boolean-Anzeige", icon: CircleDot,         hint: "Grün = aktiv, grau = inaktiv" },
  check:  { label: "Boolean setzen",  icon: ToggleLeft,        hint: "Checkbox, Variable schreiben" },
  input:  { label: "Eingabefeld",     icon: PencilLine,        hint: "Wert schreiben + Senden" },
  button: { label: "Buttons",         icon: MousePointerClick, hint: "1–2 Buttons, Variable schreiben" },
  row:    { label: "Zeile",           icon: Columns2,          hint: "2 Elemente nebeneinander" },
  enum:   { label: "Enum-Anzeige",    icon: List,              hint: "Wert → Klartext (Loc)" },
  enumset:{ label: "Enum setzen",     icon: ChevronsUpDown,    hint: "Dropdown, Wert → Klartext" },
};

const WRITE_OPTS = [
  { value: "pulse", label: "Impuls (true → false)" },
  { value: "setTrue", label: "Auf true setzen" },
  { value: "setFalse", label: "Auf false setzen" },
  { value: "toggle", label: "Umschalten (toggle)" },
];
const ITEM_KINDS = [
  { value: "read", label: "Wert lesen" },
  { value: "bool", label: "Boolean-Anzeige" },
  { value: "check", label: "Boolean setzen" },
  { value: "input", label: "Eingabefeld" },
];

let _id = 1;
const nid = () => "b" + (_id++);

const mkButton = () => ({ label: "OK", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xConfirm", writeMode: "pulse", pulseMs: 500, closeAfter: true, color: "blue" });
const mkItem = (kind) => {
  const base = { id: nid(), kind };
  if (kind === "input") return { ...base, label: "Sollwert", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint", dataType: "number", sendLabel: "Setzen", sendLoc: "", sendColor: "blue" };
  if (kind === "check") return { ...base, label: "Freigabe", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable" };
  return { ...base, label: kind === "bool" ? "Status" : "Wert", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::" + (kind === "bool" ? "xStatus" : "xValue") };
};

let _eid = 1;
const mkEnumEntry = (value, text) => ({ id: "e" + (_eid++), value: value == null ? "" : String(value), loc: "", text: text || "" });

const newBlock = (type) => {
  switch (type) {
    case "text":   return { id: nid(), type, col: 0, text: "Hinweis…", loc: "" };
    case "read":   return { id: nid(), type, col: 0, label: "Wert", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xValue" };
    case "bool":   return { id: nid(), type, col: 0, label: "Freigabe angeboten", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipReleaseOffered" };
    case "check":  return { id: nid(), type, col: 0, label: "Freigabe", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable" };
    case "input":  return { id: nid(), type, col: 0, label: "Sollwert", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint", dataType: "number", sendLabel: "Setzen", sendLoc: "", sendColor: "blue" };
    case "button": return { id: nid(), type, col: 0, buttons: [mkButton()] };
    case "row":    return { id: nid(), type, col: 0, items: [mkItem("read"), mkItem("input")] };
    case "enum":    return { id: nid(), type, col: 0, label: "Status", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eState", numeric: true, map: [mkEnumEntry(0, "Aus"), mkEnumEntry(1, "Ein")], fbLoc: "", fbText: "" };
    case "enumset": return { id: nid(), type, col: 0, label: "Modus", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eMode", numeric: true, map: [mkEnumEntry(0, "Hand"), mkEnumEntry(1, "Automatik")] };
    default:       return { id: nid(), type: "text", col: 0, text: "", loc: "" };
  }
};

function blockSummary(b) {
  if (b.type === "text") return (b.text || "").trim().slice(0, 44) || "—";
  if (b.type === "button") return b.buttons.map((x) => x.label).filter(Boolean).join(" · ") || "—";
  if (b.type === "row") return b.items.map((it) => it.label).filter(Boolean).join("  |  ") || "—";
  return b.label || "—";
}

const PAL = {
  dark:  { boxBg: "#1a1d2e", border: "#2a2d3a", headerBg: "#161822", titleColor: "#ffffff", closeColor: "#9aa0b4", bodyText: "#e0e0e0", active: "#22c55e", inactive: "#4b5563", shadow: "0 20px 60px rgba(0,0,0,0.5)" },
  light: { boxBg: "#ffffff", border: "#d0d4de", headerBg: "#f2f4f8", titleColor: "#1a1d2e", closeColor: "#6b7280", bodyText: "#333333", active: "#16a34a", inactive: "#9ca3af", shadow: "0 20px 60px rgba(0,0,0,0.2)" },
};

// ── Spalten-Helfer ──
const clampCol = (b, cols) => Math.min(Math.max(b.col || 0, 0), cols - 1);
const groupByCol = (blocks, cols) => {
  const g = Array.from({ length: cols }, () => []);
  blocks.forEach((b) => { g[clampCol(b, cols)].push(b); });
  return g;
};

// ── Code-Generierung: gemeinsame Helfer ──
const jsStr = (s) => JSON.stringify(s == null ? "" : String(s));
const wrapSym = (s) => { s = (s || "").trim(); if (!s) return ""; return s.includes("%s%") ? s : "%s%" + s + "%/s%"; };
const locExpr = (key, text) => { const k = (key || "").trim(); return k ? `loc(${jsStr(k)}, ${jsStr(text)})` : jsStr(text); };
const sanitizeFn = (s) => { const c = (s || "").replace(/[^A-Za-z0-9_$]/g, ""); return /^[A-Za-z_$]/.test(c) ? c : "AC_" + c; };
const attrName = (s) => {
  s = (s || "").trim();
  if (s.indexOf("::") >= 0) s = s.split("::").pop();
  s = s.replace(/^%s%/, "").replace(/%\/s%$/, "");
  s = s.replace(/[^A-Za-z0-9_]/g, "");
  return s || "Value";
};
const dedent = (s, n) => s.replace(new RegExp("^ {" + n + "}", "gm"), "");
const I = "                    "; // 20 Leerzeichen

const REF = '/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />';

// ─────────────────────────────────────────────────────────────
//  EMIT: Symbol-Modus (registered + event) – subscribe/writeSymbol/…
// ─────────────────────────────────────────────────────────────
function emitText(parent, b, mb) {
  return `${I}// Text\n${I}(function () {\n${I}    var el = document.createElement('div');\n${I}    el.style.cssText = 'font-size:14px;color:' + p.bodyText + ';line-height:1.5;margin-bottom:${mb};white-space:pre-wrap;';\n${I}    el.textContent = ${locExpr(b.loc, b.text)};\n${I}    ${parent}.appendChild(el);\n${I}})();`;
}
function emitRead(parent, b, mb) {
  return `${I}// Wert lesen: ${b.symbol}\n${I}(function () {\n${I}    var lbl = ${locExpr(b.loc, b.label)};\n${I}    var el = document.createElement('div');\n${I}    el.style.cssText = 'font-size:14px;color:' + p.bodyText + ';line-height:1.5;margin-bottom:${mb};';\n${I}    el.textContent = lbl + ': …';\n${I}    ${parent}.appendChild(el);\n${I}    subscribe(${jsStr(wrapSym(b.symbol))}, function (v) { el.textContent = lbl + ': ' + String(v); });\n${I}})();`;
}
function emitBool(parent, b, mb) {
  return `${I}// Boolean-Anzeige: ${b.symbol}\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:${mb};';\n${I}    var dot = document.createElement('span');\n${I}    dot.style.cssText = 'width:14px;height:14px;border-radius:50%;flex:0 0 auto;background:' + p.inactive + ';transition:background .15s;';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    row.appendChild(dot); row.appendChild(lbl);\n${I}    ${parent}.appendChild(row);\n${I}    subscribe(${jsStr(wrapSym(b.symbol))}, function (v) { dot.style.background = v ? p.active : p.inactive; });\n${I}})();`;
}
function emitCheck(parent, b, mb) {
  const sym = jsStr(wrapSym(b.symbol));
  return `${I}// Boolean setzen (Checkbox): ${b.symbol}\n${I}(function () {\n${I}    var wrap = document.createElement('label');\n${I}    wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:${mb};cursor:pointer;';\n${I}    var cb = document.createElement('input');\n${I}    cb.type = 'checkbox';\n${I}    cb.style.cssText = 'width:16px;height:16px;flex:0 0 auto;cursor:pointer;accent-color:' + p.active + ';';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    wrap.appendChild(cb); wrap.appendChild(lbl);\n${I}    ${parent}.appendChild(wrap);\n${I}    cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    subscribe(${sym}, function (v) { if (document.activeElement !== cb) cb.checked = !!v; });\n${I}    cb.addEventListener('change', function () { writeSymbol(${sym}, cb.checked); });\n${I}})();`;
}
function emitInput(parent, b, mb) {
  const sym = jsStr(wrapSym(b.symbol));
  const isNum = b.dataType !== "text";
  const parse = isNum ? `var val = parseFloat(input.value); if (isNaN(val)) return;` : `var val = input.value;`;
  const inputType = isNum ? "number" : "text";
  const col = COLORS[b.sendColor] || COLORS.blue;
  const sendText = locExpr(b.sendLoc, b.sendLabel || "Setzen");
  return `${I}// Eingabefeld + Senden: ${b.symbol}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var lbl = document.createElement('div');\n${I}    lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var line = document.createElement('div');\n${I}    line.style.cssText = 'display:flex;gap:8px;';\n${I}    var input = document.createElement('input');\n${I}    input.type = '${inputType}';\n${I}    input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;' +\n${I}        'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';\n${I}    input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    subscribe(${sym}, function (v) { if (document.activeElement !== input) input.value = String(v); });\n${I}    function commit() { ${parse} writeSymbol(${sym}, val); }\n${I}    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });\n${I}    var send = document.createElement('button');\n${I}    send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    send.textContent = ${sendText};\n${I}    send.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    send.onclick = function (e) { e.stopPropagation(); commit(); };\n${I}    line.appendChild(input); line.appendChild(send);\n${I}    wrap.appendChild(lbl); wrap.appendChild(line);\n${I}    ${parent}.appendChild(wrap);\n${I}})();`;
}
function emitButtons(parent, b, mb) {
  const btns = (b.buttons || []).slice(0, 2);
  const lines = btns.map((btn, idx) => {
    const sym = jsStr(wrapSym(btn.symbol));
    let action;
    if (btn.writeMode === "pulse") action = `pulseSymbol(${sym}, ${parseInt(btn.pulseMs) || 500})`;
    else if (btn.writeMode === "setTrue") action = `writeSymbol(${sym}, true)`;
    else if (btn.writeMode === "setFalse") action = `writeSymbol(${sym}, false)`;
    else action = `toggleSymbol(${sym})`;
    const col = COLORS[btn.color] || COLORS.blue;
    const close = btn.closeAfter ? `\n${I}        hideDialog();` : "";
    const v = "btn" + idx;
    return `${I}    // ${btn.writeMode}: ${btn.symbol}\n${I}    var ${v} = document.createElement('button');\n${I}    ${v}.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    ${v}.textContent = ${locExpr(btn.loc, btn.label)};\n${I}    ${v}.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    ${v}.onclick = function (e) { e.stopPropagation(); ${action};${close} };\n${I}    row.appendChild(${v});`;
  }).join("\n");
  return `${I}// Buttons\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;gap:10px;margin-bottom:${mb};';\n${lines}\n${I}    ${parent}.appendChild(row);\n${I}})();`;
}
function emitItem(parent, it, mb) {
  if (it.kind === "read") return emitRead(parent, it, mb);
  if (it.kind === "bool") return emitBool(parent, it, mb);
  if (it.kind === "check") return emitCheck(parent, it, mb);
  if (it.kind === "input") return emitInput(parent, it, mb);
  return "";
}
function emitRow(parent, b) {
  const items = (b.items || []).slice(0, 2);
  const cols = items.map((it, idx) => {
    const cv = "rc" + idx;
    return `${I}    var ${cv} = document.createElement('div');\n${I}    ${cv}.style.cssText = 'flex:1;min-width:0;';\n${I}    rrow.appendChild(${cv});\n${emitItem(cv, it, "0px")}`;
  }).join("\n");
  return `${I}// Zeile (nebeneinander)\n${I}(function () {\n${I}    var rrow = document.createElement('div');\n${I}    rrow.style.cssText = 'display:flex;gap:16px;margin-bottom:16px;align-items:flex-start;';\n${cols}\n${I}    ${parent}.appendChild(rrow);\n${I}})();`;
}
function emitEnum(parent, b, mb) {
  const sym = jsStr(wrapSym(b.symbol));
  const cmp = (b.map || []).map((e) => `${I}        if (String(v) === ${jsStr(String(e.value))}) return ${locExpr(e.loc, e.text)};`).join("\n");
  const fb = (b.fbLoc || b.fbText) ? locExpr(b.fbLoc, b.fbText) : "String(v)";
  return `${I}// Enum-Anzeige: ${b.symbol}\n${I}(function () {\n${I}    var lbl = ${locExpr(b.loc, b.label)};\n${I}    var el = document.createElement('div');\n${I}    el.style.cssText = 'font-size:14px;color:' + p.bodyText + ';line-height:1.5;margin-bottom:${mb};';\n${I}    el.textContent = lbl + ': …';\n${I}    ${parent}.appendChild(el);\n${I}    function mapVal(v) {\n${cmp}\n${I}        return ${fb};\n${I}    }\n${I}    subscribe(${sym}, function (v) { el.textContent = lbl + ': ' + mapVal(v); });\n${I}})();`;
}
function emitEnumSet(parent, b, mb) {
  const sym = jsStr(wrapSym(b.symbol));
  const opts = (b.map || []).map((e, i) => `${I}    var o${i} = document.createElement('option'); o${i}.value = ${jsStr(String(e.value))}; o${i}.textContent = ${locExpr(e.loc, e.text)}; sel.appendChild(o${i});`).join("\n");
  const parse = b.numeric ? "parseInt(sel.value, 10)" : "sel.value";
  return `${I}// Enum setzen (Dropdown): ${b.symbol}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var lbl = document.createElement('div');\n${I}    lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var sel = document.createElement('select');\n${I}    sel.style.cssText = 'width:100%;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;cursor:pointer;' +\n${I}        'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';\n${opts}\n${I}    sel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    sel.addEventListener('change', function () { writeSymbol(${sym}, ${parse}); });\n${I}    wrap.appendChild(lbl); wrap.appendChild(sel);\n${I}    ${parent}.appendChild(wrap);\n${I}    subscribe(${sym}, function (v) { if (document.activeElement !== sel) sel.value = String(v); });\n${I}})();`;
}
function blockCodeSym(b, parent) {
  if (b.type === "text") return emitText(parent, b, "16px");
  if (b.type === "read") return emitRead(parent, b, "16px");
  if (b.type === "bool") return emitBool(parent, b, "16px");
  if (b.type === "check") return emitCheck(parent, b, "16px");
  if (b.type === "input") return emitInput(parent, b, "16px");
  if (b.type === "button") return emitButtons(parent, b, "12px");
  if (b.type === "row") return emitRow(parent, b);
  if (b.type === "enum") return emitEnum(parent, b, "16px");
  if (b.type === "enumset") return emitEnumSet(parent, b, "16px");
  return "";
}

// ─────────────────────────────────────────────────────────────
//  EMIT: UserControl-Modus – gv()/sv()/pulse() + updaters (Polling)
// ─────────────────────────────────────────────────────────────
function emitReadUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  return `${I}// Wert lesen (Attribut): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var lbl = ${locExpr(b.loc, b.label)};\n${I}    var el = document.createElement('div');\n${I}    el.style.cssText = 'font-size:14px;color:' + p.bodyText + ';line-height:1.5;margin-bottom:${mb};';\n${I}    el.textContent = lbl + ': …';\n${I}    ${parent}.appendChild(el);\n${I}    updaters.push(function () { el.textContent = lbl + ': ' + String(gv(${a}, '')); });\n${I}})();`;
}
function emitBoolUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  return `${I}// Boolean-Anzeige (Attribut): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:${mb};';\n${I}    var dot = document.createElement('span');\n${I}    dot.style.cssText = 'width:14px;height:14px;border-radius:50%;flex:0 0 auto;background:' + p.inactive + ';transition:background .15s;';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    row.appendChild(dot); row.appendChild(lbl);\n${I}    ${parent}.appendChild(row);\n${I}    updaters.push(function () { dot.style.background = gv(${a}, false) ? p.active : p.inactive; });\n${I}})();`;
}
function emitCheckUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  return `${I}// Boolean setzen (Attribut, Checkbox): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var wrap = document.createElement('label');\n${I}    wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:${mb};cursor:pointer;';\n${I}    var cb = document.createElement('input');\n${I}    cb.type = 'checkbox';\n${I}    cb.style.cssText = 'width:16px;height:16px;flex:0 0 auto;cursor:pointer;accent-color:' + p.active + ';';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    wrap.appendChild(cb); wrap.appendChild(lbl);\n${I}    ${parent}.appendChild(wrap);\n${I}    cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    cb.addEventListener('change', function () { sv(${a}, cb.checked); });\n${I}    updaters.push(function () { if (document.activeElement !== cb) cb.checked = !!gv(${a}, false); });\n${I}})();`;
}
function emitInputUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  const isNum = b.dataType !== "text";
  const parse = isNum ? `var val = parseFloat(input.value); if (isNaN(val)) return;` : `var val = input.value;`;
  const inputType = isNum ? "number" : "text";
  const col = COLORS[b.sendColor] || COLORS.blue;
  const sendText = locExpr(b.sendLoc, b.sendLabel || "Setzen");
  return `${I}// Eingabefeld + Senden (Attribut): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var lbl = document.createElement('div');\n${I}    lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var line = document.createElement('div');\n${I}    line.style.cssText = 'display:flex;gap:8px;';\n${I}    var input = document.createElement('input');\n${I}    input.type = '${inputType}';\n${I}    input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;' +\n${I}        'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';\n${I}    input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    function commit() { ${parse} sv(${a}, val); }\n${I}    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });\n${I}    var send = document.createElement('button');\n${I}    send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    send.textContent = ${sendText};\n${I}    send.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    send.onclick = function (e) { e.stopPropagation(); commit(); };\n${I}    line.appendChild(input); line.appendChild(send);\n${I}    wrap.appendChild(lbl); wrap.appendChild(line);\n${I}    ${parent}.appendChild(wrap);\n${I}    updaters.push(function () { if (input.value === '' && document.activeElement !== input) input.value = String(gv(${a}, '')); });\n${I}})();`;
}
function emitButtonsUC(parent, b, mb) {
  const btns = (b.buttons || []).slice(0, 2);
  const lines = btns.map((btn, idx) => {
    const a = jsStr(attrName(btn.symbol));
    let action;
    if (btn.writeMode === "pulse") action = `pulse(${a}, ${parseInt(btn.pulseMs) || 500})`;
    else if (btn.writeMode === "setTrue") action = `sv(${a}, true)`;
    else if (btn.writeMode === "setFalse") action = `sv(${a}, false)`;
    else action = `sv(${a}, !gv(${a}, false))`;
    const col = COLORS[btn.color] || COLORS.blue;
    const close = btn.closeAfter ? `\n${I}        hideDialog();` : "";
    const v = "btn" + idx;
    return `${I}    // ${btn.writeMode}: ${attrName(btn.symbol)}\n${I}    var ${v} = document.createElement('button');\n${I}    ${v}.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    ${v}.textContent = ${locExpr(btn.loc, btn.label)};\n${I}    ${v}.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    ${v}.onclick = function (e) { e.stopPropagation(); ${action};${close} };\n${I}    row.appendChild(${v});`;
  }).join("\n");
  return `${I}// Buttons (Attribut)\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;gap:10px;margin-bottom:${mb};';\n${lines}\n${I}    ${parent}.appendChild(row);\n${I}})();`;
}
function emitItemUC(parent, it, mb) {
  if (it.kind === "read") return emitReadUC(parent, it, mb);
  if (it.kind === "bool") return emitBoolUC(parent, it, mb);
  if (it.kind === "check") return emitCheckUC(parent, it, mb);
  if (it.kind === "input") return emitInputUC(parent, it, mb);
  return "";
}
function emitRowUC(parent, b) {
  const items = (b.items || []).slice(0, 2);
  const cols = items.map((it, idx) => {
    const cv = "rc" + idx;
    return `${I}    var ${cv} = document.createElement('div');\n${I}    ${cv}.style.cssText = 'flex:1;min-width:0;';\n${I}    rrow.appendChild(${cv});\n${emitItemUC(cv, it, "0px")}`;
  }).join("\n");
  return `${I}// Zeile (nebeneinander)\n${I}(function () {\n${I}    var rrow = document.createElement('div');\n${I}    rrow.style.cssText = 'display:flex;gap:16px;margin-bottom:16px;align-items:flex-start;';\n${cols}\n${I}    ${parent}.appendChild(rrow);\n${I}})();`;
}
function emitEnumUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  const cmp = (b.map || []).map((e) => `${I}        if (String(v) === ${jsStr(String(e.value))}) return ${locExpr(e.loc, e.text)};`).join("\n");
  const fb = (b.fbLoc || b.fbText) ? locExpr(b.fbLoc, b.fbText) : "String(v)";
  return `${I}// Enum-Anzeige (Attribut): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var lbl = ${locExpr(b.loc, b.label)};\n${I}    var el = document.createElement('div');\n${I}    el.style.cssText = 'font-size:14px;color:' + p.bodyText + ';line-height:1.5;margin-bottom:${mb};';\n${I}    el.textContent = lbl + ': …';\n${I}    ${parent}.appendChild(el);\n${I}    function mapVal(v) {\n${cmp}\n${I}        return ${fb};\n${I}    }\n${I}    updaters.push(function () { el.textContent = lbl + ': ' + mapVal(gv(${a}, null)); });\n${I}})();`;
}
function emitEnumSetUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  const opts = (b.map || []).map((e, i) => `${I}    var o${i} = document.createElement('option'); o${i}.value = ${jsStr(String(e.value))}; o${i}.textContent = ${locExpr(e.loc, e.text)}; sel.appendChild(o${i});`).join("\n");
  const parse = b.numeric ? "parseInt(sel.value, 10)" : "sel.value";
  return `${I}// Enum setzen (Attribut, Dropdown): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var lbl = document.createElement('div');\n${I}    lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var sel = document.createElement('select');\n${I}    sel.style.cssText = 'width:100%;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;cursor:pointer;' +\n${I}        'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';\n${opts}\n${I}    sel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    sel.addEventListener('change', function () { sv(${a}, ${parse}); });\n${I}    wrap.appendChild(lbl); wrap.appendChild(sel);\n${I}    ${parent}.appendChild(wrap);\n${I}    updaters.push(function () { if (document.activeElement !== sel) sel.value = String(gv(${a}, '')); });\n${I}})();`;
}
function blockCodeUC(b, parent) {
  if (b.type === "text") return emitText(parent, b, "16px");
  if (b.type === "read") return emitReadUC(parent, b, "16px");
  if (b.type === "bool") return emitBoolUC(parent, b, "16px");
  if (b.type === "check") return emitCheckUC(parent, b, "16px");
  if (b.type === "input") return emitInputUC(parent, b, "16px");
  if (b.type === "button") return emitButtonsUC(parent, b, "12px");
  if (b.type === "row") return emitRowUC(parent, b);
  if (b.type === "enum") return emitEnumUC(parent, b, "16px");
  if (b.type === "enumset") return emitEnumSetUC(parent, b, "16px");
  return "";
}

// ── Body-Inhalt (Spalten-Grid + Bausteine), Basis-Einrückung 20 ──
function buildBodyContent(blocks, cols, emit) {
  const grouped = groupByCol(blocks, cols);
  if (cols <= 1) {
    const arr = grouped[0];
    return arr.length ? arr.map((b) => emit(b, "body")).join("\n\n") : `${I}// (noch keine Bausteine)`;
  }
  let out = `${I}var grid = document.createElement('div');\n${I}grid.style.cssText = 'display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:0;align-items:start;';\n`;
  for (let c = 0; c < cols; c++) {
    const pv = "col" + c;
    const padL = c === 0 ? 0 : 24;
    const padR = c === cols - 1 ? 0 : 24;
    const borderExpr = c > 0 ? ` + 'border-left:1px solid ' + p.border + ';'` : "";
    out += `${I}var ${pv} = document.createElement('div');\n`;
    out += `${I}${pv}.style.cssText = 'min-width:0;padding-left:${padL}px;padding-right:${padR}px;'${borderExpr};\n`;
    out += `${I}grid.appendChild(${pv});\n`;
    const arr = grouped[c];
    out += arr.length ? "\n" + arr.map((b) => emit(b, pv)).join("\n\n") + "\n" : `${I}// (Spalte ${c + 1} leer)\n`;
  }
  out += `${I}body.appendChild(grid);`;
  return out;
}

// ── Innerer Rumpf (Symbol-Modus), Basis-Einrückung 16 ──
function innerSymbol(uidStr, titleStmt, mw, bodyContent) {
  return `                var uid = ${uidStr};
                var watchers = [];   // watch-Abmelder
                var symbols = [];    // Symbole zum Freigeben

                function loc(key, fallback) {
                    try {
                        var f = TcHmi.Functions.getFunction('GetLocalizedText');
                        if (f) {
                            var text = f(key);
                            if (text !== null && text !== undefined && text !== '') return text;
                        }
                    } catch (e) {}
                    return fallback || key;
                }

                function readBgLuminance() {
                    var candidates = [
                        document.querySelector('.TcHmi_Controls_System_TcHmiView'),
                        document.getElementById('Content'),
                        document.body,
                        document.documentElement
                    ];
                    for (var i = 0; i < candidates.length; i++) {
                        var el = candidates[i];
                        if (!el) continue;
                        var bg = window.getComputedStyle(el).backgroundColor;
                        var m = bg && bg.match(/[0-9.]+/g);
                        if (!m) continue;
                        var r = +m[0], g = +m[1], b = +m[2];
                        var a = m.length > 3 ? +m[3] : 1;
                        if (a < 0.1) continue;
                        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                    }
                    return 0.15;
                }
                function isDarkMode() { return readBgLuminance() < 0.5; }

                function getPalette() {
                    if (isDarkMode()) {
                        return { boxBg:'#1a1d2e', border:'#2a2d3a', headerBg:'#161822', titleColor:'#ffffff',
                                 closeColor:'#9aa0b4', bodyText:'#e0e0e0', active:'#22c55e', inactive:'#4b5563',
                                 shadow:'0 20px 60px rgba(0,0,0,0.5)' };
                    }
                    return { boxBg:'#ffffff', border:'#d0d4de', headerBg:'#f2f4f8', titleColor:'#1a1d2e',
                             closeColor:'#6b7280', bodyText:'#333333', active:'#16a34a', inactive:'#9ca3af',
                             shadow:'0 20px 60px rgba(0,0,0,0.2)' };
                }

                function subscribe(symbolStr, onChange) {
                    try {
                        var sym = new TcHmi.Symbol(symbolStr);
                        symbols.push(sym);
                        watchers.push(sym.watch(function (data) {
                            if (data.error !== TcHmi.Errors.NONE) return;
                            onChange(data.value);
                        }));
                    } catch (e) {}
                }
                function writeSymbol(symbolStr, value) {
                    try { new TcHmi.Symbol(symbolStr).write(value); } catch (e) {}
                }
                function pulseSymbol(symbolStr, ms) {
                    try {
                        var sym = new TcHmi.Symbol(symbolStr);
                        sym.write(true);
                        setTimeout(function () { sym.write(false); }, ms);
                    } catch (e) {}
                }
                function toggleSymbol(symbolStr) {
                    try {
                        var sym = new TcHmi.Symbol(symbolStr);
                        sym.read(function (data) {
                            if (data.error !== TcHmi.Errors.NONE) return;
                            sym.write(!data.value);
                        });
                    } catch (e) {}
                }

                function hideDialog() {
                    for (var i = 0; i < watchers.length; i++) { try { watchers[i](); } catch (e) {} }
                    for (var j = 0; j < symbols.length; j++) { try { symbols[j].destroy(); } catch (e) {} }
                    watchers = []; symbols = [];
                    var existing = document.getElementById(uid);
                    if (existing) existing.remove();
                }

                function makeDraggable(box, handle) {
                    handle.style.cursor = 'move';
                    handle.style.userSelect = 'none';
                    handle.style.touchAction = 'none';
                    var dragging = false, startX = 0, startY = 0, baseLeft = 0, baseTop = 0;
                    function onMove(e) {
                        if (!dragging) return;
                        box.style.left = (baseLeft + (e.clientX - startX)) + 'px';
                        box.style.top = (baseTop + (e.clientY - startY)) + 'px';
                    }
                    function onUp(e) {
                        dragging = false;
                        try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
                        document.removeEventListener('pointermove', onMove);
                        document.removeEventListener('pointerup', onUp);
                    }
                    handle.addEventListener('pointerdown', function (e) {
                        if (e.target && e.target.tagName === 'BUTTON') return;
                        dragging = true;
                        var rect = box.getBoundingClientRect();
                        box.style.left = rect.left + 'px';
                        box.style.top = rect.top + 'px';
                        box.style.transform = 'none';
                        baseLeft = rect.left; baseTop = rect.top;
                        startX = e.clientX; startY = e.clientY;
                        try { handle.setPointerCapture(e.pointerId); } catch (err) {}
                        document.addEventListener('pointermove', onMove);
                        document.addEventListener('pointerup', onUp);
                        e.preventDefault();
                    });
                }

                function buildDialog() {
                    hideDialog();
                    var p = getPalette();

                    var overlay = document.createElement('div');
                    overlay.id = uid;
                    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';

                    var box = document.createElement('div');
                    box.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
                        'background:' + p.boxBg + ';border:1px solid ' + p.border + ';border-radius:12px;' +
                        'min-width:320px;max-width:${mw}px;box-shadow:' + p.shadow + ';pointer-events:auto;';

                    var header = document.createElement('div');
                    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
                        'padding:14px 20px;background:' + p.headerBg + ';border-radius:12px 12px 0 0;' +
                        'font-size:15px;font-weight:600;color:' + p.titleColor + ';';

                    var title = document.createElement('span');
${titleStmt}

                    var closeBtn = document.createElement('button');
                    closeBtn.style.cssText = 'border:none;background:transparent;color:' + p.closeColor + ';' +
                        'font-size:20px;line-height:1;cursor:pointer;padding:0 4px;margin:-4px -8px -4px 0;';
                    closeBtn.textContent = '×';
                    closeBtn.title = loc('L_Close', 'Schließen');
                    closeBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                    closeBtn.onclick = function (e) { e.stopPropagation(); hideDialog(); };

                    header.appendChild(title);
                    header.appendChild(closeBtn);

                    var body = document.createElement('div');
                    body.style.cssText = 'padding:20px;';

${bodyContent}

                    box.appendChild(header);
                    box.appendChild(body);
                    overlay.appendChild(box);
                    document.body.appendChild(overlay);
                    makeDraggable(box, header);
                }

                buildDialog();`;
}

// ── Innerer Rumpf (UserControl-Modus), Basis-Einrückung 16 ──
function innerUC(baseName, titleStmt, mw, bodyContent) {
  return `                var uid = ${jsStr(baseName)} + '_' + (host ? String(host.getId()).replace(/[^A-Za-z0-9_]/g, '_') : 'popup');
                var updaters = [];   // Werte-Aktualisierer (Polling)
                var intervalId = null;

                function loc(key, fallback) {
                    try {
                        var f = TcHmi.Functions.getFunction('GetLocalizedText');
                        if (f) {
                            var text = f(key);
                            if (text !== null && text !== undefined && text !== '') return text;
                        }
                    } catch (e) {}
                    return fallback || key;
                }

                function readBgLuminance() {
                    var candidates = [
                        document.querySelector('.TcHmi_Controls_System_TcHmiView'),
                        document.getElementById('Content'),
                        document.body,
                        document.documentElement
                    ];
                    for (var i = 0; i < candidates.length; i++) {
                        var el = candidates[i];
                        if (!el) continue;
                        var bg = window.getComputedStyle(el).backgroundColor;
                        var m = bg && bg.match(/[0-9.]+/g);
                        if (!m) continue;
                        var r = +m[0], g = +m[1], b = +m[2];
                        var a = m.length > 3 ? +m[3] : 1;
                        if (a < 0.1) continue;
                        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                    }
                    return 0.15;
                }
                function isDarkMode() { return readBgLuminance() < 0.5; }

                function getPalette() {
                    if (isDarkMode()) {
                        return { boxBg:'#1a1d2e', border:'#2a2d3a', headerBg:'#161822', titleColor:'#ffffff',
                                 closeColor:'#9aa0b4', bodyText:'#e0e0e0', active:'#22c55e', inactive:'#4b5563',
                                 shadow:'0 20px 60px rgba(0,0,0,0.5)' };
                    }
                    return { boxBg:'#ffffff', border:'#d0d4de', headerBg:'#f2f4f8', titleColor:'#1a1d2e',
                             closeColor:'#6b7280', bodyText:'#333333', active:'#16a34a', inactive:'#9ca3af',
                             shadow:'0 20px 60px rgba(0,0,0,0.2)' };
                }

                // ── Attribut-Helfer (getX/setX am Host-Control) ──
                function gv(name, def) {
                    if (host && typeof host['get' + name] === 'function') {
                        var v = host['get' + name]();
                        return (v === null || v === undefined) ? def : v;
                    }
                    return def;
                }
                function sv(name, val) {
                    if (host && typeof host['set' + name] === 'function') { host['set' + name](val); }
                }
                function pulse(name, ms) {
                    sv(name, true);
                    setTimeout(function () { sv(name, false); }, ms || 500);
                }
                function refresh() {
                    for (var i = 0; i < updaters.length; i++) { try { updaters[i](); } catch (e) {} }
                }

                function hideDialog() {
                    if (intervalId) { clearInterval(intervalId); intervalId = null; }
                    var existing = document.getElementById(uid);
                    if (existing) existing.remove();
                }

                function makeDraggable(box, handle) {
                    handle.style.cursor = 'move';
                    handle.style.userSelect = 'none';
                    handle.style.touchAction = 'none';
                    var dragging = false, startX = 0, startY = 0, baseLeft = 0, baseTop = 0;
                    function onMove(e) {
                        if (!dragging) return;
                        box.style.left = (baseLeft + (e.clientX - startX)) + 'px';
                        box.style.top = (baseTop + (e.clientY - startY)) + 'px';
                    }
                    function onUp(e) {
                        dragging = false;
                        try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
                        document.removeEventListener('pointermove', onMove);
                        document.removeEventListener('pointerup', onUp);
                    }
                    handle.addEventListener('pointerdown', function (e) {
                        if (e.target && e.target.tagName === 'BUTTON') return;
                        dragging = true;
                        var rect = box.getBoundingClientRect();
                        box.style.left = rect.left + 'px';
                        box.style.top = rect.top + 'px';
                        box.style.transform = 'none';
                        baseLeft = rect.left; baseTop = rect.top;
                        startX = e.clientX; startY = e.clientY;
                        try { handle.setPointerCapture(e.pointerId); } catch (err) {}
                        document.addEventListener('pointermove', onMove);
                        document.addEventListener('pointerup', onUp);
                        e.preventDefault();
                    });
                }

                function buildDialog() {
                    hideDialog();
                    var p = getPalette();

                    var overlay = document.createElement('div');
                    overlay.id = uid;
                    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';

                    var box = document.createElement('div');
                    box.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
                        'background:' + p.boxBg + ';border:1px solid ' + p.border + ';border-radius:12px;' +
                        'min-width:320px;max-width:${mw}px;box-shadow:' + p.shadow + ';pointer-events:auto;';

                    var header = document.createElement('div');
                    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
                        'padding:14px 20px;background:' + p.headerBg + ';border-radius:12px 12px 0 0;' +
                        'font-size:15px;font-weight:600;color:' + p.titleColor + ';';

                    var title = document.createElement('span');
${titleStmt}

                    var closeBtn = document.createElement('button');
                    closeBtn.style.cssText = 'border:none;background:transparent;color:' + p.closeColor + ';' +
                        'font-size:20px;line-height:1;cursor:pointer;padding:0 4px;margin:-4px -8px -4px 0;';
                    closeBtn.textContent = '×';
                    closeBtn.title = loc('L_Close', 'Schließen');
                    closeBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                    closeBtn.onclick = function (e) { e.stopPropagation(); hideDialog(); };

                    header.appendChild(title);
                    header.appendChild(closeBtn);

                    var body = document.createElement('div');
                    body.style.cssText = 'padding:20px;';

${bodyContent}

                    box.appendChild(header);
                    box.appendChild(body);
                    overlay.appendChild(box);
                    document.body.appendChild(overlay);
                    makeDraggable(box, header);

                    refresh();
                    intervalId = setInterval(function () {
                        if (!document.getElementById(uid)) { clearInterval(intervalId); intervalId = null; return; }
                        refresh();
                    }, 1000);
                }

                buildDialog();`;
}

// ── Titel-Statement (statisch, oder dynamisch aus Attribut/Symbol) ──
function buildTitleStmt(mode, source, field, fallback, titleExpr) {
  const pad = "                    "; // 20 Leerzeichen
  if (source !== "dynamic") return `${pad}title.textContent = ${titleExpr};`;
  if (mode === "usercontrol") return `${pad}title.textContent = gv(${jsStr(attrName(field))}, ${jsStr(fallback || "")});`;
  return `${pad}title.textContent = ${jsStr(fallback || "")};\n${pad}subscribe(${jsStr(wrapSym(field))}, function (v) { title.textContent = String(v); });`;
}

// ── Haupt-Generator ──
function generate(cfg) {
  const fn = sanitizeFn(cfg.fnName) || "AC_PopUp";
  const titleExpr = locExpr(cfg.titleLoc, cfg.title);
  const mw = Math.max(320, parseInt(cfg.maxWidth) || 400);
  const cols = Math.min(Math.max(parseInt(cfg.columns) || 1, 1), 3);
  const titleStmt = buildTitleStmt(cfg.mode, cfg.titleSource, cfg.titleField, cfg.titleFallback, titleExpr);

  if (cfg.mode === "usercontrol") {
    const suffix = (cfg.hostSuffix || ".btn_PopUp").trim() || ".btn_PopUp";
    const bodyContent = buildBodyContent(cfg.blocks, cols, blockCodeUC);
    const inner = dedent(innerUC(fn, titleStmt, mw, bodyContent), 12);
    return `// Auto-generiert vom AC_PopUp Generator – UserControl-gebundenes Event-JavaScript
${REF}

(function (ev) {
    // ── Host-Control über die geklickte Trigger-Fläche ermitteln ──
    var host = null;
    var clicked = (ev && ev.target && ev.target.closest) ? ev.target.closest('[id$=${jsStr(suffix)}]') : null;
    if (clicked) {
        var hostId = clicked.id.split(${jsStr(suffix)})[0];
        host = TcHmi.Controls.get(hostId);
    }

${inner}
})(typeof event !== 'undefined' ? event : (typeof window !== 'undefined' ? window.event : null));
`;
  }

  const bodyContent = buildBodyContent(cfg.blocks, cols, blockCodeSym);

  if (cfg.mode === "event") {
    const inner = dedent(innerSymbol(jsStr(fn), titleStmt, mw, bodyContent), 12);
    return `// Auto-generiert vom AC_PopUp Generator – reines Event-JavaScript (ohne Registrierung)
${REF}

(function () {
${inner}
})();
`;
  }

  return `// Auto-generiert vom AC_PopUp Generator – registrierte Funktion
${REF}

(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {
            function ${fn}(par1) {
${innerSymbol(jsStr(fn), titleStmt, mw, bodyContent)}
            }
            AC_HMI.${fn} = ${fn};
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx(${jsStr(fn)}, 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.${fn});
`;
}

// ── kleine UI-Bausteine ──
function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, letterSpacing: 0.3 }}>{label}</div>
      {children}
    </label>
  );
}
const inputStyle = { width: "100%", boxSizing: "border-box", background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" };
function TextInput(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
function TextArea(props) { return <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 60, fontFamily: "inherit", ...(props.style || {}) }} />; }
function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{ ...inputStyle, appearance: "none" }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function ColorSwatches({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {Object.keys(COLORS).map((k) => {
        const c = COLORS[k]; const sel = value === k;
        return <button key={k} onClick={() => onChange(k)} title={c.label}
          style={{ width: 24, height: 24, borderRadius: 6, background: c.bg, border: sel ? `2px solid ${T.text}` : "2px solid transparent", boxShadow: sel ? `0 0 0 1px ${T.border}` : "none", cursor: "pointer" }} />;
      })}
    </div>
  );
}
function symMeta(mode) {
  return mode === "usercontrol"
    ? { label: "ATTRIBUT (getX/setX)", ph: "z.B. Running" }
    : { label: "SYMBOL", ph: "ADS.PLC.MAIN…::xVar" };
}
function ReadBoolFields({ cfg, onPatch, mode }) {
  const sm = symMeta(mode);
  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="LABEL"><TextInput value={cfg.label} onChange={(e) => onPatch({ label: e.target.value })} /></Field></div>
        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={cfg.loc} onChange={(e) => onPatch({ loc: e.target.value })} placeholder="L_…" /></Field></div>
      </div>
      <Field label={sm.label}><TextInput value={cfg.symbol} onChange={(e) => onPatch({ symbol: e.target.value })} placeholder={sm.ph} /></Field>
    </>
  );
}
function InputFields({ cfg, onPatch, mode }) {
  const sm = symMeta(mode);
  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="LABEL"><TextInput value={cfg.label} onChange={(e) => onPatch({ label: e.target.value })} /></Field></div>
        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={cfg.loc} onChange={(e) => onPatch({ loc: e.target.value })} placeholder="L_…" /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}><Field label={sm.label}><TextInput value={cfg.symbol} onChange={(e) => onPatch({ symbol: e.target.value })} placeholder={sm.ph} /></Field></div>
        <div style={{ width: 110 }}><Field label="DATENTYP"><Select value={cfg.dataType} onChange={(e) => onPatch({ dataType: e.target.value })} options={[{ value: "number", label: "Zahl" }, { value: "text", label: "Text" }]} /></Field></div>
      </div>
      <div style={{ borderTop: `1px solid ${T.border}`, margin: "2px 0 8px" }} />
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, fontWeight: 600 }}>SENDEN-BUTTON</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="TEXT"><TextInput value={cfg.sendLabel} onChange={(e) => onPatch({ sendLabel: e.target.value })} /></Field></div>
        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={cfg.sendLoc} onChange={(e) => onPatch({ sendLoc: e.target.value })} placeholder="L_…" /></Field></div>
      </div>
      <Field label="FARBE"><ColorSwatches value={cfg.sendColor} onChange={(c) => onPatch({ sendColor: c })} /></Field>
    </>
  );
}
function ItemPreview({ cfg, pal, on, onToggle }) {
  if (cfg.kind === "read") return <div style={{ fontSize: 14, color: pal.bodyText, lineHeight: 1.5 }}>{cfg.label}: …</div>;
  if (cfg.kind === "bool") return (
    <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} title="Klicken zum Umschalten (nur Vorschau)">
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: on ? pal.active : pal.inactive, transition: "background .15s" }} />
      <span style={{ fontSize: 14, color: pal.bodyText }}>{cfg.label}</span>
    </div>
  );
  if (cfg.kind === "check") return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <input type="checkbox" checked={on} onChange={onToggle} style={{ width: 16, height: 16, flex: "0 0 auto", cursor: "pointer", accentColor: pal.active }} />
      <span style={{ fontSize: 14, color: pal.bodyText }}>{cfg.label}</span>
    </label>
  );
  const c = COLORS[cfg.sendColor] || COLORS.blue;
  return (
    <div>
      <div style={{ fontSize: 13, color: pal.bodyText, marginBottom: 6 }}>{cfg.label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type={cfg.dataType === "text" ? "text" : "number"} placeholder="…"
          style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "9px 10px", borderRadius: 8, fontSize: 14, outline: "none", border: `1px solid ${pal.border}`, background: pal.boxBg, color: pal.bodyText }} />
        <div style={{ flex: "0 0 auto", padding: "0 16px", display: "flex", alignItems: "center", borderRadius: 8, fontSize: 13, fontWeight: 600, background: c.bg, color: c.text }}>{cfg.sendLabel || "Setzen"}</div>
      </div>
    </div>
  );
}
function BlockPreview({ b, pal, on, onToggle }) {
  if (b.type === "text") return <div style={{ fontSize: 14, color: pal.bodyText, lineHeight: 1.5, marginBottom: 16, whiteSpace: "pre-wrap" }}>{b.text}</div>;
  if (b.type === "button") return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      {b.buttons.map((bt, bi) => { const c = COLORS[bt.color] || COLORS.blue; return <div key={bi} style={{ flex: 1, padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, background: c.bg, color: c.text, textAlign: "center" }}>{bt.label}</div>; })}
    </div>
  );
  if (b.type === "row") return (
    <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
      {b.items.map((it) => <div key={it.id} style={{ flex: 1, minWidth: 0 }}><ItemPreview cfg={it} pal={pal} on={!!on[it.id]} onToggle={() => onToggle(it.id)} /></div>)}
    </div>
  );
  if (b.type === "enum") {
    const first = (b.map && b.map[0]) ? (b.map[0].text || "…") : "…";
    return <div style={{ fontSize: 14, color: pal.bodyText, lineHeight: 1.5, marginBottom: 16 }}>{b.label}: {first}</div>;
  }
  if (b.type === "enumset") return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: pal.bodyText, marginBottom: 6 }}>{b.label}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 8, fontSize: 14, border: `1px solid ${pal.border}`, background: pal.boxBg, color: pal.bodyText }}>
        <span>{(b.map && b.map[0]) ? (b.map[0].text || "…") : "…"}</span>
        <span style={{ color: pal.closeColor }}>▾</span>
      </div>
    </div>
  );
  return <div style={{ marginBottom: 16 }}><ItemPreview cfg={{ ...b, kind: b.type }} pal={pal} on={!!on[b.id]} onToggle={() => onToggle(b.id)} /></div>;
}

function IconBtn({ children, onClick, disabled, danger, title }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e); }} disabled={disabled} title={title}
      style={{ background: "transparent", border: "none", color: disabled ? "#454a57" : danger ? T.danger : T.muted, cursor: disabled ? "default" : "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}>
      {children}
    </button>
  );
}
function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, background: active ? T.panel2 : "transparent", color: active ? T.text : T.muted, border: `1px solid ${active ? T.border : "transparent"}`, borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
      {children}
    </button>
  );
}

export default function App() {
  const [mode, setMode] = useState("registered");
  const [fnName, setFnName] = useState("AC_PopUp");
  const [title, setTitle] = useState("Freigabe");
  const [titleLoc, setTitleLoc] = useState("L_SkipReleaseTitle");
  const [titleSource, setTitleSource] = useState("static"); // static | dynamic
  const [titleField, setTitleField] = useState("TagName");
  const [titleFallback, setTitleFallback] = useState("Titel");
  const [maxWidth, setMaxWidth] = useState(400);
  const [columns, setColumns] = useState(1);
  const [hostSuffix, setHostSuffix] = useState(".btn_PopUp");
  const [addTargetCol, setAddTargetCol] = useState(0);
  const [blocks, setBlocks] = useState([
    { id: nid(), type: "bool", col: 0, label: "Freigabe angeboten", loc: "L_SkipReleaseOffered", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipReleaseOffered" },
    { id: nid(), type: "button", col: 0, buttons: [
      { label: "Freigabe überspringen", loc: "L_SkipRelease", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipRelease", writeMode: "pulse", pulseMs: 500, closeAfter: true, color: "blue" },
    ] },
  ]);
  const [previewDark, setPreviewDark] = useState(true);
  const [tab, setTab] = useState("preview");
  const [copied, setCopied] = useState(false);
  const [previewBools, setPreviewBools] = useState({});
  const [openId, setOpenId] = useState(blocks[0] ? blocks[0].id : null);
  const [dragId, setDragId] = useState(null);
  const [grabbedId, setGrabbedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const codeRef = useRef(null);

  const cfg = { mode, fnName, title, titleLoc, titleSource, titleField, titleFallback, maxWidth, columns, hostSuffix, blocks };
  const code = useMemo(() => generate(cfg), [mode, fnName, title, titleLoc, titleSource, titleField, titleFallback, maxWidth, columns, hostSuffix, blocks]);
  const pal = previewDark ? PAL.dark : PAL.light;
  const boxW = Math.max(320, parseInt(maxWidth) || 400);
  const grouped = groupByCol(blocks, columns);
  const sm = symMeta(mode);
  const dynLabel = mode === "usercontrol" ? "Aus Attribut" : "Aus Symbol";
  const previewTitle = titleSource === "dynamic" ? (titleFallback || "(dynamisch)") : (title || "Titel");
  const toggleBool = (id) => setPreviewBools((s) => ({ ...s, [id]: !s[id] }));

  const patch = (id, p) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const remove = (id) => setBlocks((bs) => bs.filter((b) => b.id !== id));

  const moveVertical = (id, dir) => setBlocks((bs) => {
    const b = bs.find((x) => x.id === id); if (!b) return bs;
    const col = clampCol(b, columns);
    const inCol = bs.filter((x) => clampCol(x, columns) === col);
    const pos = inCol.findIndex((x) => x.id === id);
    const swapWith = inCol[pos + dir];
    if (!swapWith) return bs;
    const arr = bs.slice();
    const i = arr.findIndex((x) => x.id === id);
    const j = arr.findIndex((x) => x.id === swapWith.id);
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    return arr;
  });
  const moveHorizontal = (id, dir) => setBlocks((bs) => bs.map((b) =>
    b.id === id ? { ...b, col: Math.min(Math.max(clampCol(b, columns) + dir, 0), columns - 1) } : b
  ));

  const changeColumns = (n) => {
    setColumns(n);
    setBlocks((bs) => bs.map((b) => ({ ...b, col: Math.min(b.col || 0, n - 1) })));
    if (addTargetCol > n - 1) setAddTargetCol(n - 1);
  };

  const add = (type) => { const nb = { ...newBlock(type), col: addTargetCol }; setBlocks((bs) => [...bs, nb]); setOpenId(nb.id); };
  const patchBtn = (id, idx, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, buttons: b.buttons.map((bt, i) => (i === idx ? { ...bt, ...p } : bt)) } : b));
  const addBtn = (id) => setBlocks((bs) => bs.map((b) => (b.id === id && b.buttons.length < 2) ? { ...b, buttons: [...b.buttons, mkButton()] } : b));
  const removeBtn = (id, idx) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, buttons: b.buttons.filter((_, i) => i !== idx) } : b));
  const patchItem = (id, idx, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, items: b.items.map((it, i) => (i === idx ? { ...it, ...p } : it)) } : b));
  const addItem = (id) => setBlocks((bs) => bs.map((b) => (b.id === id && b.items.length < 2) ? { ...b, items: [...b.items, mkItem("input")] } : b));
  const removeItem = (id, idx) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, items: b.items.filter((_, i) => i !== idx) } : b));
  const setItemKind = (id, idx, kind) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, items: b.items.map((it, i) => i === idx ? { ...mkItem(kind), id: it.id, label: it.label, loc: it.loc, symbol: it.symbol } : it) } : b));
  const patchEnumEntry = (id, eid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, map: b.map.map((e) => (e.id === eid ? { ...e, ...p } : e)) } : b));
  const addEnumEntry = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, map: [...b.map, mkEnumEntry("", "")] } : b));
  const removeEnumEntry = (id, eid) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, map: b.map.filter((e) => e.id !== eid) } : b));

  const handleDrop = (targetCol, beforeId) => {
    const id = dragId;
    setDragId(null); setGrabbedId(null); setDropTarget(null);
    if (!id || beforeId === id) return;
    setBlocks((bs) => {
      const moving = bs.find((b) => b.id === id); if (!moving) return bs;
      const rest = bs.filter((b) => b.id !== id);
      const moved = { ...moving, col: targetCol };
      let idx;
      if (beforeId) { idx = rest.findIndex((b) => b.id === beforeId); if (idx < 0) idx = rest.length; }
      else { let last = -1; rest.forEach((b, i) => { if (clampCol(b, columns) === targetCol) last = i; }); idx = last + 1; }
      rest.splice(idx, 0, moved);
      return rest;
    });
  };

  const doCopy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { try { const ta = codeRef.current; if (ta) { ta.focus(); ta.select(); document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1600); } } catch {} }
  };

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: 600, fontFamily: "system-ui, -apple-system, sans-serif", padding: 20, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: T.accent, boxShadow: `0 0 12px ${T.accent}` }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>AC_PopUp Generator</div>
          <div style={{ fontSize: 12, color: T.muted }}>TwinCAT-HMI-Popups zusammenklicken, Code kopieren, fertig.</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 460px", minWidth: 340 }}>
          {/* Allgemein */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Allgemein</div>

            <Field label="AUSGABE-MODUS">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.keys(OUTPUT_MODES).map((k) => {
                  const M = OUTPUT_MODES[k]; const Icon = M.icon; const sel = mode === k;
                  return (
                    <button key={k} onClick={() => setMode(k)} title={M.hint}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: sel ? T.panel2 : "transparent", color: sel ? T.text : T.muted, border: `1px solid ${sel ? T.accentDim : T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Icon size={14} color={sel ? T.accent : T.muted} /> {M.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div style={{ fontSize: 11, color: T.muted, marginTop: -4, marginBottom: 12 }}>{OUTPUT_MODES[mode].hint}</div>

            <Field label={mode === "registered" ? "FUNKTIONSNAME (registerFunctionEx)" : "NAME / UID"}>
              <TextInput value={fnName} onChange={(e) => setFnName(e.target.value)} placeholder="AC_PopUp" />
            </Field>

            {mode === "usercontrol" && (
              <>
                <Field label="AUSLÖSER-SUFFIX (id-Endung der Trigger-Fläche)">
                  <TextInput value={hostSuffix} onChange={(e) => setHostSuffix(e.target.value)} placeholder=".btn_PopUp" />
                </Field>
                <div style={{ fontSize: 11, color: T.muted, marginTop: -4, marginBottom: 12, lineHeight: 1.5 }}>
                  Host über <code style={{ color: T.text }}>event.target.closest('[id$="{hostSuffix || ".btn_PopUp"}"]')</code>. Bausteine lesen/schreiben per <code style={{ color: T.text }}>get…/set…</code>-Attribut.
                </div>
              </>
            )}

            <Field label="TITEL-QUELLE">
              <div style={{ display: "flex", gap: 8 }}>
                {[["static", "Statisch"], ["dynamic", dynLabel]].map(([v, lab]) => {
                  const sel = titleSource === v;
                  return <button key={v} onClick={() => setTitleSource(v)}
                    style={{ flex: 1, background: sel ? T.panel2 : "transparent", color: sel ? T.text : T.muted, border: `1px solid ${sel ? T.accentDim : T.border}`, borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{lab}</button>;
                })}
              </div>
            </Field>

            {titleSource === "static" ? (
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 2 }}><Field label="TITEL"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field></div>
                <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={titleLoc} onChange={(e) => setTitleLoc(e.target.value)} placeholder="L_…" /></Field></div>
                <div style={{ width: 100 }}><Field label="BREITE (px)"><TextInput type="number" value={maxWidth} onChange={(e) => setMaxWidth(e.target.value)} /></Field></div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 2 }}><Field label={mode === "usercontrol" ? "TITEL-ATTRIBUT" : "TITEL-SYMBOL"}><TextInput value={titleField} onChange={(e) => setTitleField(e.target.value)} placeholder={mode === "usercontrol" ? "z.B. TagName" : "ADS.…::sTag"} /></Field></div>
                <div style={{ flex: 2 }}><Field label="FALLBACK-TEXT"><TextInput value={titleFallback} onChange={(e) => setTitleFallback(e.target.value)} placeholder="P-XXX" /></Field></div>
                <div style={{ width: 100 }}><Field label="BREITE (px)"><TextInput type="number" value={maxWidth} onChange={(e) => setMaxWidth(e.target.value)} /></Field></div>
              </div>
            )}

            <Field label="SPALTEN">
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3].map((n) => {
                  const sel = columns === n;
                  return (
                    <button key={n} onClick={() => changeColumns(n)}
                      style={{ flex: 1, background: sel ? T.panel2 : "transparent", color: sel ? T.text : T.muted, border: `1px solid ${sel ? T.accentDim : T.border}`, borderRadius: 6, padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      {n} {n === 1 ? "Spalte" : "Spalten"}
                    </button>
                  );
                })}
              </div>
            </Field>
            {columns > 1 && parseInt(maxWidth) < 560 && (
              <div style={{ fontSize: 11, color: T.muted }}>Tipp: Bei {columns} Spalten wirkt eine größere Breite (z.B. 700–900 px) meist besser.</div>
            )}
          </div>

          {/* Layout mit Accordion-Karten + Drag & Drop */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Bausteine &amp; Layout</div>
              <div style={{ fontSize: 11, color: T.muted }}>{blocks.length} Stück · Griff ⠿ zum Ziehen</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8, alignItems: "start" }}>
              {Array.from({ length: columns }).map((_, c) => (
                <div key={c}
                  onDragOver={(e) => { e.preventDefault(); setDropTarget({ col: c, beforeId: null }); }}
                  onDrop={(e) => { e.preventDefault(); handleDrop(c, null); }}
                  style={{ background: T.bg, border: `1px dashed ${dropTarget && dropTarget.col === c ? T.accentDim : T.border}`, borderRadius: 8, padding: 8, minHeight: 90 }}>
                  {columns > 1 && <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: 0.4, marginBottom: 6, paddingLeft: 2 }}>SPALTE {c + 1}</div>}
                  {grouped[c].length === 0 && (
                    <div style={{ fontSize: 11, color: T.muted, opacity: 0.6, textAlign: "center", padding: "16px 0" }}>leer</div>
                  )}
                  {grouped[c].map((b, i) => {
                    const meta = BLOCK_META[b.type]; const Icon = meta.icon; const open = openId === b.id;
                    const isDropBefore = dropTarget && dropTarget.beforeId === b.id;
                    return (
                      <div key={b.id}
                        draggable={grabbedId === b.id}
                        onDragStart={() => setDragId(b.id)}
                        onDragEnd={() => { setDragId(null); setGrabbedId(null); setDropTarget(null); }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ col: c, beforeId: b.id }); }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(c, b.id); }}
                        style={{
                          background: open ? T.panel2 : T.panel, border: `1px solid ${open ? T.accentDim : T.border}`,
                          borderTop: isDropBefore ? `2px solid ${T.accent}` : `1px solid ${open ? T.accentDim : T.border}`,
                          borderRadius: 7, padding: 8, marginBottom: 8, opacity: dragId === b.id ? 0.4 : 1,
                        }}>
                        {/* Kopf */}
                        <div onClick={() => setOpenId(open ? null : b.id)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                          <span
                            onMouseDown={(e) => { e.stopPropagation(); setGrabbedId(b.id); }}
                            onMouseUp={() => setGrabbedId(null)}
                            onClick={(e) => e.stopPropagation()}
                            title="Ziehen zum Verschieben"
                            style={{ flex: "0 0 auto", cursor: "grab", display: "flex", alignItems: "center" }}>
                            <GripVertical size={14} color={T.muted} />
                          </span>
                          <ChevronRight size={14} color={T.muted} style={{ flex: "0 0 auto", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                          <Icon size={14} color={T.accent} style={{ flex: "0 0 auto" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, flex: "0 0 auto" }}>{meta.label}</span>
                          {!open && <span style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>· {blockSummary(b)}</span>}
                          <div style={{ marginLeft: "auto", display: "flex", gap: 2, flex: "0 0 auto" }}>
                            <IconBtn disabled={i === 0} onClick={() => moveVertical(b.id, -1)} title="Nach oben"><ChevronUp size={14} /></IconBtn>
                            <IconBtn disabled={i === grouped[c].length - 1} onClick={() => moveVertical(b.id, 1)} title="Nach unten"><ChevronDown size={14} /></IconBtn>
                            {columns > 1 && <IconBtn disabled={c === 0} onClick={() => moveHorizontal(b.id, -1)} title="Spalte links"><ChevronLeft size={14} /></IconBtn>}
                            {columns > 1 && <IconBtn disabled={c === columns - 1} onClick={() => moveHorizontal(b.id, 1)} title="Spalte rechts"><ChevronRight size={14} /></IconBtn>}
                            <IconBtn danger onClick={() => remove(b.id)} title="Löschen"><Trash2 size={14} /></IconBtn>
                          </div>
                        </div>

                        {/* Editor (Accordion) */}
                        {open && (
                          <div style={{ marginTop: 10 }}>
                            {b.type === "text" && <Field label="TEXT"><TextArea value={b.text} onChange={(e) => patch(b.id, { text: e.target.value })} /></Field>}

                            {(b.type === "read" || b.type === "bool" || b.type === "check") && <ReadBoolFields cfg={b} mode={mode} onPatch={(o) => patch(b.id, o)} />}

                            {b.type === "input" && <InputFields cfg={b} mode={mode} onPatch={(o) => patch(b.id, o)} />}

                            {b.type === "button" && (
                              <>
                                {b.buttons.map((bt, bi) => (
                                  <div key={bi} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Button {bi + 1}</span>
                                      {b.buttons.length > 1 && <div style={{ marginLeft: "auto" }}><IconBtn danger onClick={() => removeBtn(b.id, bi)}><Trash2 size={13} /></IconBtn></div>}
                                    </div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                      <div style={{ flex: 2 }}><Field label="BESCHRIFTUNG"><TextInput value={bt.label} onChange={(e) => patchBtn(b.id, bi, { label: e.target.value })} /></Field></div>
                                      <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={bt.loc} onChange={(e) => patchBtn(b.id, bi, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                                    </div>
                                    <Field label={sm.label}><TextInput value={bt.symbol} onChange={(e) => patchBtn(b.id, bi, { symbol: e.target.value })} placeholder={sm.ph} /></Field>
                                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                                      <div style={{ flex: 1 }}><Field label="AKTION"><Select value={bt.writeMode} onChange={(e) => patchBtn(b.id, bi, { writeMode: e.target.value })} options={WRITE_OPTS} /></Field></div>
                                      {bt.writeMode === "pulse" && <div style={{ width: 90 }}><Field label="DAUER (ms)"><TextInput type="number" value={bt.pulseMs} onChange={(e) => patchBtn(b.id, bi, { pulseMs: e.target.value })} /></Field></div>}
                                    </div>
                                    <Field label="FARBE"><ColorSwatches value={bt.color} onChange={(cc) => patchBtn(b.id, bi, { color: cc })} /></Field>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginTop: 2 }}>
                                      <input type="checkbox" checked={!!bt.closeAfter} onChange={(e) => patchBtn(b.id, bi, { closeAfter: e.target.checked })} /> Popup nach Klick schließen
                                    </label>
                                  </div>
                                ))}
                                {b.buttons.length < 2 && (
                                  <button onClick={() => addBtn(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                                    <Plus size={12} color={T.accent} /> Zweiter Button
                                  </button>
                                )}
                              </>
                            )}

                            {b.type === "row" && (
                              <>
                                {b.items.map((it, ii) => (
                                  <div key={it.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Element {ii + 1}</span>
                                      {b.items.length > 1 && <div style={{ marginLeft: "auto" }}><IconBtn danger onClick={() => removeItem(b.id, ii)}><Trash2 size={13} /></IconBtn></div>}
                                    </div>
                                    <Field label="TYP"><Select value={it.kind} onChange={(e) => setItemKind(b.id, ii, e.target.value)} options={ITEM_KINDS} /></Field>
                                    {it.kind === "input"
                                      ? <InputFields cfg={it} mode={mode} onPatch={(o) => patchItem(b.id, ii, o)} />
                                      : <ReadBoolFields cfg={it} mode={mode} onPatch={(o) => patchItem(b.id, ii, o)} />}
                                  </div>
                                ))}
                                {b.items.length < 2 && (
                                  <button onClick={() => addItem(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                                    <Plus size={12} color={T.accent} /> Zweites Element
                                  </button>
                                )}
                              </>
                            )}

                            {(b.type === "enum" || b.type === "enumset") && (
                              <>
                                <div style={{ display: "flex", gap: 10 }}>
                                  <div style={{ flex: 2 }}><Field label="LABEL"><TextInput value={b.label} onChange={(e) => patch(b.id, { label: e.target.value })} /></Field></div>
                                  <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.loc} onChange={(e) => patch(b.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                                </div>
                                <Field label={sm.label}><TextInput value={b.symbol} onChange={(e) => patch(b.id, { symbol: e.target.value })} placeholder={sm.ph} /></Field>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginBottom: 8 }}>
                                  <input type="checkbox" checked={!!b.numeric} onChange={(e) => patch(b.id, { numeric: e.target.checked })} /> Wert ist numerisch (parseInt beim Schreiben)
                                </label>
                                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>WERT → TEXT</div>
                                {b.map.map((e) => (
                                  <div key={e.id} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-end" }}>
                                    <div style={{ width: 64 }}><Field label="WERT"><TextInput value={e.value} onChange={(ev) => patchEnumEntry(b.id, e.id, { value: ev.target.value })} /></Field></div>
                                    <div style={{ flex: 1 }}><Field label="LOC-KEY"><TextInput value={e.loc} onChange={(ev) => patchEnumEntry(b.id, e.id, { loc: ev.target.value })} placeholder="L_…" /></Field></div>
                                    <div style={{ flex: 1 }}><Field label="TEXT"><TextInput value={e.text} onChange={(ev) => patchEnumEntry(b.id, e.id, { text: ev.target.value })} /></Field></div>
                                    <div style={{ marginBottom: 10 }}><IconBtn danger onClick={() => removeEnumEntry(b.id, e.id)}><Trash2 size={13} /></IconBtn></div>
                                  </div>
                                ))}
                                <button onClick={() => addEnumEntry(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                                  <Plus size={12} color={T.accent} /> Wert
                                </button>
                                {b.type === "enum" && (
                                  <>
                                    <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "10px 0 6px" }}>FALLBACK (unbekannter Wert)</div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                      <div style={{ flex: 1 }}><Field label="LOC-KEY (optional)"><TextInput value={b.fbLoc} onChange={(e) => patch(b.id, { fbLoc: e.target.value })} placeholder="L_…" /></Field></div>
                                      <div style={{ flex: 1 }}><Field label="TEXT (optional)"><TextInput value={b.fbText} onChange={(e) => patch(b.id, { fbText: e.target.value })} /></Field></div>
                                    </div>
                                    <div style={{ fontSize: 11, color: T.muted }}>Leer lassen → Rohwert anzeigen.</div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              {columns > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: T.muted }}>Neu in Spalte:</span>
                  {Array.from({ length: columns }).map((_, c) => {
                    const sel = addTargetCol === c;
                    return <button key={c} onClick={() => setAddTargetCol(c)}
                      style={{ width: 28, height: 24, borderRadius: 6, background: sel ? T.accentDim : "transparent", color: sel ? "#062611" : T.muted, border: `1px solid ${sel ? T.accentDim : T.border}`, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c + 1}</button>;
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.keys(BLOCK_META).map((type) => {
                  const M = BLOCK_META[type];
                  return (
                    <button key={type} onClick={() => add(type)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "7px 11px", fontSize: 12, cursor: "pointer" }}>
                      <Plus size={13} color={T.accent} /> {M.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Vorschau / Code */}
        <div style={{ flex: "1 1 400px", minWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Tab active={tab === "preview"} onClick={() => setTab("preview")}><Monitor size={14} /> Vorschau</Tab>
            <Tab active={tab === "code"} onClick={() => setTab("code")}><Code2 size={14} /> Code</Tab>
            {tab === "preview" && (
              <button onClick={() => setPreviewDark((v) => !v)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: T.panel2, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                {previewDark ? <Moon size={13} /> : <Sun size={13} />} {previewDark ? "Dark" : "Light"}
              </button>
            )}
            {tab === "code" && (
              <button onClick={doCopy} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: copied ? T.accentDim : T.accent, color: "#062611", border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Kopiert" : "Kopieren"}
              </button>
            )}
          </div>

          {tab === "preview" ? (
            <div style={{ background: previewDark ? "#0f1117" : "#dfe3e8", border: `1px solid ${T.border}`, borderRadius: 10, padding: 32, display: "flex", justifyContent: "center", minHeight: 300, overflow: "auto" }}>
              <div style={{ background: pal.boxBg, border: `1px solid ${pal.border}`, borderRadius: 12, width: boxW, boxShadow: pal.shadow, overflow: "hidden", alignSelf: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: pal.headerBg, fontSize: 15, fontWeight: 600, color: pal.titleColor }}>
                  <span>{previewTitle}</span>
                  <span style={{ color: pal.closeColor, fontSize: 20, lineHeight: 1 }}>×</span>
                </div>
                <div style={{ padding: 20 }}>
                  {blocks.length === 0 && <div style={{ fontSize: 13, color: pal.bodyText, opacity: 0.6 }}>Noch keine Bausteine.</div>}
                  {columns <= 1
                    ? grouped[0].map((b) => <BlockPreview key={b.id} b={b} pal={pal} on={previewBools} onToggle={toggleBool} />)
                    : (
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 0 }}>
                        {grouped.map((colBlocks, c) => (
                          <div key={c} style={{ minWidth: 0, paddingLeft: c === 0 ? 0 : 24, paddingRight: c === columns - 1 ? 0 : 24, borderLeft: c > 0 ? `1px solid ${pal.border}` : "none" }}>
                            {colBlocks.map((b) => <BlockPreview key={b.id} b={b} pal={pal} on={previewBools} onToggle={toggleBool} />)}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          ) : (
            <pre style={{ background: T.code, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "#c8d0e0", overflow: "auto", maxHeight: 640, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {code}
            </pre>
          )}
        </div>
      </div>

      <textarea ref={codeRef} value={code} readOnly style={{ position: "absolute", left: -9999, top: -9999, width: 1, height: 1, opacity: 0 }} />
    </div>
  );
}