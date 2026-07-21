import React, { useState, useRef, useMemo } from "react";
import { Plus, Copy, Check, Code2, Monitor, Sun, Moon, Braces } from "lucide-react";

import { T, PAL } from "./constants/theme.js";
import { PLOT_COLORS, MAX_AXES } from "./constants/palette.js";
import { OUTPUT_MODES, BLOCK_META } from "./constants/options.js";
import { nid } from "./model/ids.js";
import { mkButton, mkItem, mkCond, mkEnumEntry, mkStatusEntry, newBlock, mkAxis, mkSeries, mkRef, mkMapping, mkMarker, mkTimeBtn, mkTableCol, mkTableMapEntry, mkTableRow, mkTableRule, mkRowFilter } from "./model/factories.js";
import { clampCol, groupByCol } from "./model/layout.js";

import { generate } from "./codegen/index.js";
import { parseConfigComment, reidBlocks } from "./model/config.js";
import { Field, TextInput, Tab } from "./components/primitives.jsx";
import { symMeta } from "./components/fields.jsx";
import { BlockPreview } from "./components/preview.jsx";
import { BlockCard } from "./components/editor/BlockCard.jsx";

export default function App() {
  const [mode, setMode] = useState("registered");
  const [fnName, setFnName] = useState("AC_PopUp");
  const [title, setTitle] = useState("Freigabe");
  const [titleLoc, setTitleLoc] = useState("L_SkipReleaseTitle");
  const [titleSource, setTitleSource] = useState("static");
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
  const [importText, setImportText] = useState("");
  const [importErr, setImportErr] = useState("");
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
  const sm = symMeta(mode);
  const dynLabel = mode === "usercontrol" ? "Aus Attribut" : "Aus Symbol";
  const previewTitle = titleSource === "dynamic" ? (titleFallback || "(dynamisch)") : (title || "Titel");
  const toggleBool = (id) => setPreviewBools((s) => ({ ...s, [id]: !s[id] }));

  // Segmente: Zeilen (row) sind volle Breite und brechen das Spalten-Grid
  const segments = useMemo(() => {
    const parts = []; let seg = [];
    const flush = () => { if (seg.length) { parts.push({ kind: "grid", items: seg }); seg = []; } };
    blocks.forEach((b) => { if (b.type === "row" || b.type === "plot" || (b.type === "divider" && !b.inCol)) { flush(); parts.push({ kind: "row", block: b }); } else seg.push(b); });
    flush();
    return parts;
  }, [blocks]);
  const firstGrid = segments.findIndex((p) => p.kind === "grid");

  const patch = (id, p) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const remove = (id) => setBlocks((bs) => bs.filter((b) => b.id !== id));
  const moveVertical = (id, dir) => setBlocks((bs) => {
    const b = bs.find((x) => x.id === id); if (!b) return bs;
    const col = clampCol(b, columns);
    const inCol = bs.filter((x) => x.type !== "row" && clampCol(x, columns) === col);
    const pos = inCol.findIndex((x) => x.id === id);
    const swapWith = inCol[pos + dir];
    if (!swapWith) return bs;
    const arr = bs.slice();
    const i = arr.findIndex((x) => x.id === id);
    const j = arr.findIndex((x) => x.id === swapWith.id);
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    return arr;
  });
  const moveFlat = (id, dir) => setBlocks((bs) => {
    const i = bs.findIndex((b) => b.id === id); if (i < 0) return bs;
    const j = i + dir; if (j < 0 || j >= bs.length) return bs;
    const arr = bs.slice(); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; return arr;
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
  const addCond = (id, bi) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, buttons: b.buttons.map((bt, i) => i === bi ? { ...bt, enableIf: [...(bt.enableIf || []), mkCond()] } : bt) } : b));
  const removeCond = (id, bi, cid) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, buttons: b.buttons.map((bt, i) => i === bi ? { ...bt, enableIf: (bt.enableIf || []).filter((c) => c.id !== cid) } : bt) } : b));
  const patchCond = (id, bi, cid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, buttons: b.buttons.map((bt, i) => i === bi ? { ...bt, enableIf: (bt.enableIf || []).map((c) => (c.id === cid ? { ...c, ...p } : c)) } : bt) } : b));
  const patchItem = (id, idx, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, items: b.items.map((it, i) => (i === idx ? { ...it, ...p } : it)) } : b));
  const addItem = (id) => setBlocks((bs) => bs.map((b) => (b.id === id && b.items.length < 4) ? { ...b, items: [...b.items, mkItem("read")] } : b));
  const removeItem = (id, idx) => setBlocks((bs) => bs.map((b) => (b.id === id && b.items.length > 1) ? { ...b, items: b.items.filter((_, i) => i !== idx) } : b));
  const setItemKind = (id, idx, kind) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, items: b.items.map((it, i) => i === idx ? { ...mkItem(kind), id: it.id, label: it.label, loc: it.loc, symbol: it.symbol } : it) } : b));
  const addItemCond = (id, idx) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, items: b.items.map((it, i) => i === idx ? { ...it, enableIf: [...(it.enableIf || []), mkCond()] } : it) } : b));
  const removeItemCond = (id, idx, cid) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, items: b.items.map((it, i) => i === idx ? { ...it, enableIf: (it.enableIf || []).filter((c) => c.id !== cid) } : it) } : b));
  const patchItemCond = (id, idx, cid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, items: b.items.map((it, i) => i === idx ? { ...it, enableIf: (it.enableIf || []).map((c) => (c.id === cid ? { ...c, ...p } : c)) } : it) } : b));
  const patchEntry = (id, eid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, map: b.map.map((e) => (e.id === eid ? { ...e, ...p } : e)) } : b));
  const addEnumEntry = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, map: [...b.map, mkEnumEntry("", "")] } : b));

  // ── Tabellen-Handler ──
  const patchTblCol = (id, colId, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, columns: b.columns.map((c) => (c.id === colId ? { ...c, ...p } : c)) } : b));
  const addTblCol = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, columns: [...b.columns, mkTableCol("read")], rows: (b.rows || []).map((r) => ({ ...r, cells: [...r.cells, { symbol: "", text: "", loc: "" }] })) } : b));
  const removeTblCol = (id, colIdx) => setBlocks((bs) => bs.map((b) => {
    if (b.id !== id || b.columns.length <= 1) return b;
    return { ...b,
      columns: b.columns.filter((_, i) => i !== colIdx),
      rows: (b.rows || []).map((r) => ({ ...r, cells: r.cells.filter((_, i) => i !== colIdx) })),
      rules: (b.rules || []).filter((u) => u.colIndex !== colIdx).map((u) => (u.colIndex > colIdx ? { ...u, colIndex: u.colIndex - 1 } : u)),
    };
  }));
  const addTblRow = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, rows: [...(b.rows || []), mkTableRow(b.columns.length)] } : b));
  const removeTblRow = (id, rowId) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, rows: b.rows.filter((r) => r.id !== rowId) } : b));
  const patchTblCell = (id, rowId, colIdx, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, rows: b.rows.map((r) => (r.id === rowId ? { ...r, cells: r.cells.map((cl, i) => (i === colIdx ? { ...cl, ...p } : cl)) } : r)) } : b));
  const addTblMap = (id, colId) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, columns: b.columns.map((c) => (c.id === colId ? { ...c, map: [...(c.map || []), mkTableMapEntry("", "")] } : c)) } : b));
  const removeTblMap = (id, colId, entryId) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, columns: b.columns.map((c) => (c.id === colId ? { ...c, map: c.map.filter((e) => e.id !== entryId) } : c)) } : b));
  const patchTblMap = (id, colId, entryId, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, columns: b.columns.map((c) => (c.id === colId ? { ...c, map: c.map.map((e) => (e.id === entryId ? { ...e, ...p } : e)) } : c)) } : b));
  const addTblRule = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, rules: [...(b.rules || []), mkTableRule()] } : b));
  const removeTblRule = (id, ruleId) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, rules: b.rules.filter((u) => u.id !== ruleId) } : b));
  const patchTblRule = (id, ruleId, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, rules: b.rules.map((u) => (u.id === ruleId ? { ...u, ...p } : u)) } : b));
  const addStatusEntry = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, map: [...b.map, mkStatusEntry("", "Status", "grey")] } : b));
  const removeEntry = (id, eid) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, map: b.map.filter((e) => e.id !== eid) } : b));
  const addRowFilter = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, rowFilters: [...(b.rowFilters || []), mkRowFilter()] } : b));
  const removeRowFilter = (id, fId) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, rowFilters: b.rowFilters.filter((f) => f.id !== fId) } : b));
  const patchRowFilter = (id, fId, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, rowFilters: b.rowFilters.map((f) => (f.id === fId ? { ...f, ...p } : f)) } : b));

  // ── Plot-Handler ──
  const addAxis = (id) => setBlocks((bs) => bs.map((b) => (b.id === id && (b.axes || []).length < MAX_AXES) ? { ...b, axes: [...b.axes, mkAxis(PLOT_COLORS[b.axes.length % PLOT_COLORS.length].hex)] } : b));
  const removeAxis = (id, aid) => setBlocks((bs) => bs.map((b) => {
    if (b.id !== id || (b.axes || []).length <= 1) return b;
    const axes = b.axes.filter((a) => a.id !== aid);
    const fb = axes[0].id;
    return { ...b, axes, series: b.series.map((s) => s.axisId === aid ? { ...s, axisId: fb } : s), refLines: (b.refLines || []).map((r) => r.axisId === aid ? { ...r, axisId: fb } : r) };
  }));
  const patchAxis = (id, aid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, axes: b.axes.map((a) => a.id === aid ? { ...a, ...p } : a) } : b));
  const addSeries = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, series: [...b.series, mkSeries(b.axes[0].id, PLOT_COLORS[b.series.length % PLOT_COLORS.length].hex)] } : b));
  const removeSeries = (id, sid) => setBlocks((bs) => bs.map((b) => (b.id === id && b.series.length > 1) ? { ...b, series: b.series.filter((s) => s.id !== sid) } : b));
  const patchSeries = (id, sid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, series: b.series.map((s) => s.id === sid ? { ...s, ...p } : s) } : b));
  const addRef = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, refLines: [...(b.refLines || []), mkRef(b.axes[0].id)] } : b));
  const removeRef = (id, rid) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, refLines: (b.refLines || []).filter((r) => r.id !== rid) } : b));
  const patchRef = (id, rid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, refLines: (b.refLines || []).map((r) => r.id === rid ? { ...r, ...p } : r) } : b));
  const addMarker = (id) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, eventMarkers: [...(b.eventMarkers || []), mkMarker()] } : b));
  const removeMarker = (id, mid) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, eventMarkers: (b.eventMarkers || []).filter((m) => m.id !== mid) } : b));
  const patchMarker = (id, mid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, eventMarkers: (b.eventMarkers || []).map((m) => m.id === mid ? { ...m, ...p } : m) } : b));
  const addMapping = (id, mid) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, eventMarkers: (b.eventMarkers || []).map((m) => m.id === mid ? { ...m, mappings: [...m.mappings, mkMapping("", "")] } : m) } : b));
  const removeMapping = (id, mid, mpid) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, eventMarkers: (b.eventMarkers || []).map((m) => m.id === mid ? { ...m, mappings: m.mappings.filter((mp) => mp.id !== mpid) } : m) } : b));
  const patchMapping = (id, mid, mpid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, eventMarkers: (b.eventMarkers || []).map((m) => m.id === mid ? { ...m, mappings: m.mappings.map((mp) => mp.id === mpid ? { ...mp, ...p } : mp) } : m) } : b));
  const addTimeBtn = (id) => setBlocks((bs) => bs.map((b) => (b.id === id && (b.timeButtons || []).length < 8) ? { ...b, timeButtons: [...(b.timeButtons || []), mkTimeBtn(1, "hour", "1 h")] } : b));
  const removeTimeBtn = (id, tid) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, timeButtons: (b.timeButtons || []).filter((t) => t.id !== tid) } : b));
  const patchTimeBtn = (id, tid, p) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, timeButtons: (b.timeButtons || []).map((t) => t.id === tid ? { ...t, ...p } : t) } : b));

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
      else { let last = -1; rest.forEach((b, i) => { if (b.type !== "row" && clampCol(b, columns) === targetCol) last = i; }); idx = last + 1; }
      rest.splice(idx, 0, moved);
      return rest;
    });
  };
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { try { const ta = codeRef.current; if (ta) { ta.focus(); ta.select(); document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1600); } } catch {} }
  };
  const doImport = () => {
    const c = parseConfigComment(importText);
    if (!c) { setImportErr("Keine gültige Konfiguration gefunden. Bitte den kompletten vom Generator erzeugten Code einfügen (inklusive der Kommentarzeile „AC_POPUP_CONFIG_V1:“ am Ende)."); return; }
    setMode(c.mode || "registered");
    setFnName(c.fnName || "AC_PopUp");
    setTitle(c.title || "");
    setTitleLoc(c.titleLoc || "");
    setTitleSource(c.titleSource || "static");
    setTitleField(c.titleField || "TagName");
    setTitleFallback(c.titleFallback || "");
    setMaxWidth(c.maxWidth || 400);
    setColumns(Math.min(Math.max(parseInt(c.columns) || 1, 1), 3));
    setHostSuffix(c.hostSuffix || ".btn_PopUp");
    const nb = reidBlocks(c.blocks || []);
    setBlocks(nb);
    setOpenId(nb[0] ? nb[0].id : null);
    setAddTargetCol(0);
    setImportErr(""); setImportText(""); setTab("preview");
  };

  // ── Karte (Accordion + Griff-Drag): ausgelagert nach components/editor/BlockCard.jsx ──
  const ui = { openId, setOpenId, dragId, setDragId, grabbedId, setGrabbedId, dropTarget, setDropTarget, columns, mode, sm };
  const actions = { patch, remove, moveVertical, moveFlat, moveHorizontal, patchBtn, addBtn, removeBtn, addCond, removeCond, patchCond, patchItem, addItem, removeItem, setItemKind, addItemCond, removeItemCond, patchItemCond, patchEntry, addEnumEntry, addStatusEntry, removeEntry, addAxis, removeAxis, patchAxis, addSeries, removeSeries, patchSeries, addRef, removeRef, patchRef, addMarker, removeMarker, patchMarker, addMapping, removeMapping, patchMapping, addTimeBtn, removeTimeBtn, patchTimeBtn, handleDrop, patchTblCol, addTblCol, removeTblCol, addTblRow, removeTblRow, patchTblCell, addTblMap, removeTblMap, patchTblMap, addTblRule, addRowFilter, removeRowFilter, patchRowFilter, removeTblRule, patchTblRule };
  const renderCard = (b, opts) => <BlockCard key={b.id} b={b} opts={opts} ui={ui} actions={actions} />;

  const renderPreviewBody = () => segments.map((part, pi) => {
    if (part.kind === "row") return <BlockPreview key={part.block.id} b={part.block} pal={pal} on={previewBools} onToggle={toggleBool} />;
    if (columns <= 1) return <div key={"g" + pi}>{part.items.map((b) => <BlockPreview key={b.id} b={b} pal={pal} on={previewBools} onToggle={toggleBool} />)}</div>;
    const g = groupByCol(part.items, columns);
    return (
      <div key={"g" + pi} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 0 }}>
        {g.map((colBlocks, c) => (
          <div key={c} style={{ minWidth: 0, paddingLeft: c === 0 ? 0 : 24, paddingRight: c === columns - 1 ? 0 : 24, borderLeft: c > 0 ? `1px solid ${pal.border}` : "none" }}>
            {colBlocks.map((b) => <BlockPreview key={b.id} b={b} pal={pal} on={previewBools} onToggle={toggleBool} />)}
          </div>
        ))}
      </div>
    );
  });

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
            <Field label={(mode === "registered" || mode === "embed") ? "FUNKTIONSNAME (registerFunctionEx)" : "NAME / UID"}>
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
              <div style={{ fontSize: 11, color: T.muted }}>Tipp: Bei {columns} Spalten wirkt eine größere Breite (z.B. 700–900 px) meist besser. „Zeile“-Bausteine sind immer volle Breite.</div>
            )}
          </div>

          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Bausteine &amp; Layout</div>
              <div style={{ fontSize: 11, color: T.muted }}>{blocks.length} Stück · Griff ⠿ zum Ziehen</div>
            </div>

            {segments.map((part, pi) => {
              if (part.kind === "row") {
                return (
                  <div key={"r" + part.block.id}
                    onDragOver={(e) => { e.preventDefault(); setDropTarget({ col: clampCol(part.block, columns), beforeId: part.block.id }); }}
                    onDrop={(e) => { e.preventDefault(); handleDrop(clampCol(part.block, columns), part.block.id); }}
                    style={{ background: T.bg, border: `1px dashed ${T.border}`, borderRadius: 8, padding: 8, marginBottom: 8 }}>
                    {renderCard(part.block, { fullWidth: true })}
                  </div>
                );
              }
              const g = groupByCol(part.items, columns);
              return (
                <div key={"g" + pi} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8, alignItems: "start", marginBottom: 8 }}>
                  {Array.from({ length: columns }).map((_, c) => (
                    <div key={c}
                      onDragOver={(e) => { e.preventDefault(); setDropTarget({ col: c, beforeId: null }); }}
                      onDrop={(e) => { e.preventDefault(); handleDrop(c, null); }}
                      style={{ background: T.bg, border: `1px dashed ${dropTarget && dropTarget.col === c && dropTarget.beforeId === null ? T.accentDim : T.border}`, borderRadius: 8, padding: 8, minHeight: 60 }}>
                      {columns > 1 && pi === firstGrid && <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: 0.4, marginBottom: 6, paddingLeft: 2 }}>SPALTE {c + 1}</div>}
                      {g[c].length === 0 && pi === firstGrid && (
                        <div style={{ fontSize: 11, color: T.muted, opacity: 0.6, textAlign: "center", padding: "10px 0" }}>leer</div>
                      )}
                      {g[c].map((b, i) => renderCard(b, { c, i, colLen: g[c].length }))}
                    </div>
                  ))}
                </div>
              );
            })}
            {segments.length === 0 && <div style={{ fontSize: 12, color: T.muted, padding: "8px 0" }}>Noch keine Bausteine – unten hinzufügen.</div>}

            <div style={{ marginTop: 8 }}>
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

        <div style={{ flex: "1 1 400px", minWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Tab active={tab === "preview"} onClick={() => setTab("preview")}><Monitor size={14} /> Vorschau</Tab>
            <Tab active={tab === "code"} onClick={() => setTab("code")}><Code2 size={14} /> Code</Tab>
            <Tab active={tab === "import"} onClick={() => setTab("import")}><Braces size={14} /> Import</Tab>
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
          {tab === "preview" && (
            <div style={{ background: previewDark ? "#0f1117" : "#dfe3e8", border: `1px solid ${T.border}`, borderRadius: 10, padding: 32, display: "flex", justifyContent: "center", minHeight: 300, overflow: "auto" }}>
              <div style={{ background: pal.boxBg, border: `1px solid ${pal.border}`, borderRadius: 12, width: boxW, boxShadow: pal.shadow, overflow: "hidden", alignSelf: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: pal.headerBg, fontSize: 15, fontWeight: 600, color: pal.titleColor }}>
                  <span>{previewTitle}</span>
                  <span style={{ color: pal.closeColor, fontSize: 20, lineHeight: 1 }}>×</span>
                </div>
                <div style={{ padding: 20 }}>
                  {blocks.length === 0 && <div style={{ fontSize: 13, color: pal.bodyText, opacity: 0.6 }}>Noch keine Bausteine.</div>}
                  {renderPreviewBody()}
                </div>
              </div>
            </div>
          )}
          {tab === "code" && (
            <pre style={{ background: T.code, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "#c8d0e0", overflow: "auto", maxHeight: 640, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {code}
            </pre>
          )}
          {tab === "import" && (
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, lineHeight: 1.5 }}>
                Vom Generator erzeugten Code hier einfügen (komplett, inkl. der Kommentarzeile „AC_POPUP_CONFIG_V1:“ am Ende). Die App liest die Konfiguration daraus zurück und lädt sie in den Editor – zum Anpassen und erneut Erzeugen.
              </div>
              <textarea value={importText} onChange={(e) => { setImportText(e.target.value); setImportErr(""); }}
                placeholder="// Auto-generiert vom AC_PopUp Generator …"
                style={{ width: "100%", boxSizing: "border-box", minHeight: 320, background: T.code, color: "#c8d0e0", border: `1px solid ${importErr ? T.danger : T.border}`, borderRadius: 8, padding: 12, fontSize: 11.5, lineHeight: 1.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", outline: "none", resize: "vertical" }} />
              {importErr && <div style={{ fontSize: 12, color: T.danger, marginTop: 8, lineHeight: 1.5 }}>{importErr}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={doImport} disabled={!importText.trim()}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: importText.trim() ? T.accent : T.panel2, color: importText.trim() ? "#062611" : T.muted, border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: importText.trim() ? "pointer" : "default" }}>
                  In Editor laden
                </button>
                <button onClick={() => { setImportText(""); setImportErr(""); }}
                  style={{ background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
                  Leeren
                </button>
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 10, lineHeight: 1.5 }}>
                Geladen wird die eingebettete Konfiguration – nicht etwaige manuelle Änderungen am JS-Code selbst.
              </div>
            </div>
          )}
        </div>
      </div>

      <textarea ref={codeRef} value={code} readOnly style={{ position: "absolute", left: -9999, top: -9999, width: 1, height: 1, opacity: 0 }} />
    </div>
  );
}



