// ── Referenz-Configs für den Golden-Master-Test (test/run.mjs) ──
// Jede Config wird per src/codegen/index.js -> generate() zu vollständigem Code
// gerendert und byte-genau gegen test/goldens/<name>.js verglichen.
//
// WICHTIG: Neue Configs IMMER ans Ende anhängen, niemals mittendrin einfügen.
// Grund: model/ids.js vergibt IDs über modulweite, nur wachsende Zähler. Die
// Reihenfolge der newBlock()/mkXxx()-Aufrufe hier bestimmt die vergebenen IDs
// und damit Variablennamen im generierten Code. Eine Einfügung mitten in der
// Liste verschiebt die IDs aller nachfolgenden Configs und lässt ihre Goldens
// grundlos platzen.
import {
  newBlock, mkButton, mkItem, mkCond, mkEnumEntry, mkStatusEntry,
  mkAxis, mkSeries, mkRef, mkMapping, mkMarker, mkTimeBtn, defaultTimeButtons,
  mkTableCol, mkTableMapEntry, mkTableRow, mkTableRule, mkRowFilter,
} from "../src/model/factories.js";
import { mkAccess } from "../src/model/access.js";

// Knappe Access-Spezifikation -> internes access-Objekt. Nur genannte Rechte
// werden aktiviert (on:true); genannte Gruppen bekommen den angegebenen Wert,
// nicht genannte bleiben auf 'Allow'.
const mkAcc = (spec) => {
  const a = mkAccess();
  for (const rk of Object.keys(spec)) {
    a[rk].on = true;
    for (const g of Object.keys(spec[rk])) a[rk].groups[g] = spec[rk][g];
  }
  return a;
};

const baseCfg = (overrides) => ({
  mode: "registered",
  fnName: "AC_PopUp",
  title: "Titel",
  titleLoc: "",
  titleSource: "static",
  titleField: "TagName",
  titleFallback: "Titel",
  titleIcon: "",
  titleIconColor: "",
  maxWidth: 400,
  columns: 1,
  hostSuffix: ".btn_PopUp",
  blocks: [],
  ...overrides,
});

const CONFIGS = [];
const add = (name, overrides) => CONFIGS.push({ name, cfg: baseCfg(overrides) });

// ── 1) registered: ein Baustein von (fast) jedem Typ, dynamischer Titel mit Symbol-Icon ──
add("registered_full", {
  mode: "registered",
  fnName: "AC_SkipRelease",
  titleSource: "dynamic",
  titleField: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::sTagName",
  titleFallback: "P-101",
  titleIcon: "warning",
  titleIconColor: "#f59e0b",
  maxWidth: 460,
  columns: 2,
  blocks: [
    { ...newBlock("text"), heading: "Hinweis", headingLoc: "L_HeadHint", text: "Bitte Freigabe prüfen.", loc: "L_TextHint", bgColor: "alarm", icon: "warning", iconColor: "#f59e0b" },
    { ...newBlock("read"), label: "Druck", loc: "L_Druck", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPressure", unit: "bar" },
    { ...newBlock("bool"), label: "Freigabe angeboten", loc: "L_SkipOffered", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipReleaseOffered" },
    { ...newBlock("check"), label: "Freigabe", loc: "L_Enable", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable" },
    { ...newBlock("input"), label: "Sollwert", loc: "L_Setpoint", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint", dataType: "number", unit: "bar", trigSym: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xApply", trigMode: "pulse", trigMs: 300 },
    { ...newBlock("progress"), label: "Ventilstellung", loc: "L_Valve", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPosition", min: 0, max: 100, unit: "%", decimals: 1, color: "green" },
    { ...newBlock("divider"), label: "Steuerung", loc: "L_DivCtrl" },
    {
      ...newBlock("button"), col: 1,
      buttons: [
        { ...mkButton(), label: "Freigabe überspringen", loc: "L_SkipRelease", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipRelease", writeMode: "pulse", pulseMs: 400, closeAfter: true, color: "blue", icon: "success", iconPos: "left", showLabel: true },
        { ...mkButton(), label: "Abbrechen", loc: "L_Cancel", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xCancel", writeMode: "setTrue", closeAfter: true, color: "grey" },
      ],
    },
    {
      ...newBlock("row"), col: 1,
      items: [
        { ...mkItem("read"), label: "Ist", loc: "L_Ist", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rActual" },
        { ...mkItem("input"), label: "Soll", loc: "L_Soll", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rSoll", dataType: "number" },
      ],
    },
    {
      ...newBlock("enum"), col: 1, label: "Zustand", loc: "L_State", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eState", numeric: true, display: "badge",
      map: [mkEnumEntry(0, "Aus", "grey"), mkEnumEntry(1, "Ein", "green"), mkEnumEntry(2, "Störung", "red")],
      fbText: "Unbekannt", fbColor: "grey",
    },
    {
      ...newBlock("enumset"), col: 1, label: "Modus", loc: "L_Mode", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eMode", numeric: true,
      map: [mkEnumEntry(0, "Hand"), mkEnumEntry(1, "Automatik")], sendButton: true, sendLabel: "Übernehmen", sendColor: "green",
    },
    {
      ...newBlock("status"), col: 1, label: "Status", loc: "L_Status", display: "badge",
      map: [mkStatusEntry("ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xRunning", "Läuft", "green"), mkStatusEntry("ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xFault", "Störung", "red")],
      fbText: "Bereit", fbColor: "grey",
    },
  ],
});

// ── 2) event: reines Event-JS, statischer Titel, andere Farb-/Icon-Variationen ──
add("event_full", {
  mode: "event",
  fnName: "AC_EventPopup",
  title: "Wartungshinweis",
  titleLoc: "L_MaintTitle",
  maxWidth: 380,
  columns: 1,
  blocks: [
    { ...newBlock("text"), text: "Wartung nur durch geschultes Personal.", loc: "" },
    { ...newBlock("read"), label: "Temperatur", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rTemp", unit: "°C" },
    { ...newBlock("input"), label: "Timer", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::tDauer", dataType: "time", sendButton: true, sendLabel: "Setzen", sendColor: "yellow" },
    { ...newBlock("input"), label: "Text-Eingabe", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::sText", dataType: "text", sendButton: false },
    {
      ...newBlock("button"),
      buttons: [
        { ...mkButton(), label: "Halten", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xHold", writeMode: "hold", fbSym: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xHoldConfirmed", color: "yellow" },
        { ...mkButton(), label: "Bestätigen (halten)", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xConfirm", writeMode: "holdConfirm", confirmMs: 2000, confirmAction: "setTrue", color: "red", icon: "alert", iconPos: "right", showLabel: false },
      ],
    },
    { ...newBlock("divider") },
    {
      ...newBlock("row"),
      items: [
        { ...mkItem("bool"), label: "Aktiv", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xActive" },
        { ...mkItem("check"), label: "Quittieren", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xAck" },
        { ...mkItem("button"), label: "Reset", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xReset", writeMode: "toggle", color: "grey" },
      ],
    },
  ],
});

// ── 3) usercontrol: Attribut-Bindung (gv/sv), eigenes Auslöser-Suffix ──
add("usercontrol_full", {
  mode: "usercontrol",
  fnName: "AC_UcPopup",
  hostSuffix: ".btn_Detail",
  title: "Detailansicht",
  titleSource: "dynamic",
  titleField: "TagName",
  titleFallback: "P-XXX",
  maxWidth: 420,
  columns: 1,
  blocks: [
    { ...newBlock("read"), label: "Wert", symbol: "Value", unit: "%" },
    { ...newBlock("bool"), label: "Freigegeben", symbol: "Enabled" },
    { ...newBlock("check"), label: "Aktiv setzen", symbol: "Active" },
    { ...newBlock("input"), label: "Sollwert", symbol: "Setpoint", dataType: "number", unit: "bar", trigSym: "Apply", trigMode: "toggle" },
    { ...newBlock("progress"), label: "Füllstand", symbol: "FillLevel", min: 0, max: 100, unit: "%", color: "blue" },
    {
      ...newBlock("button"),
      buttons: [
        { ...mkButton(), label: "Übernehmen", symbol: "Confirm", writeMode: "pulse", pulseMs: 250, closeAfter: true, color: "green",
          enableIf: [{ ...mkCond(), symbol: "Mode", op: "==", value: "1" }, { ...mkCond(), symbol: "Fault", op: "!=", value: "true" }] },
      ],
    },
    {
      ...newBlock("enum"), label: "Status", symbol: "State", numeric: false, display: "text",
      map: [mkEnumEntry("idle", "Bereit", "grey"), mkEnumEntry("run", "Läuft", "green")],
    },
    {
      ...newBlock("enumset"), label: "Betriebsart", symbol: "Mode", numeric: true,
      map: [mkEnumEntry(0, "Hand"), mkEnumEntry(1, "Automatik"), mkEnumEntry(2, "Service")], sendButton: false,
    },
    {
      ...newBlock("status"), label: "Sammelstatus", display: "text",
      map: [mkStatusEntry("Running", "Läuft", "green"), mkStatusEntry("Fault", "Störung", "red")],
      fbText: "Aus", fbColor: "grey",
    },
    { ...newBlock("divider"), label: "Ende" },
  ],
});

// ── 4) registered: alle Button-Schreibmodi + Bedingungs-Operatoren (bool/int/enum) ──
add("registered_button_variants", {
  mode: "registered",
  fnName: "AC_ButtonMatrix",
  blocks: [
    {
      ...newBlock("button"),
      buttons: [
        { ...mkButton(), label: "Pulse", writeMode: "pulse", pulseMs: 150, symbol: "ADS.…::xPulse", visSym: "ADS.…::xVisible" },
        { ...mkButton(), label: "SetFalse", writeMode: "setFalse", symbol: "ADS.…::xFlag",
          enableIf: [{ ...mkCond(), symbol: "ADS.…::nMode", op: "<", value: "3" }, { ...mkCond(), symbol: "ADS.…::nMode", op: ">=", value: "1" }] },
      ],
    },
    {
      ...newBlock("button"),
      buttons: [
        { ...mkButton(), label: "Toggle", writeMode: "toggle", symbol: "ADS.…::xToggle",
          enableIf: [{ ...mkCond(), symbol: "ADS.…::eStep", op: "<=", value: "2" }] },
      ],
    },
  ],
});

// ── 5) usercontrol: dieselben Button-Varianten über gv()/sv() ──
add("usercontrol_button_variants", {
  mode: "usercontrol",
  fnName: "AC_UcButtonMatrix",
  blocks: [
    {
      ...newBlock("button"),
      buttons: [
        { ...mkButton(), label: "Pulse", writeMode: "pulse", pulseMs: 200, symbol: "Pulse", visSym: "Visible" },
        { ...mkButton(), label: "Hold", writeMode: "hold", symbol: "Hold", fbSym: "HoldConfirmed" },
      ],
    },
    {
      ...newBlock("row"),
      items: [
        { ...mkItem("button"), label: "Item-Toggle", symbol: "ItemFlag", writeMode: "toggle",
          enableIf: [{ ...mkCond(), symbol: "Mode", op: ">", value: "0" }] },
      ],
    },
  ],
});

// ── 6) registered: Plot live, 2 Achsen, 2 Signale, Ref-Linien (fest+Symbol), Marker (enum+metrisch) ──
add("plot_live", {
  mode: "registered",
  fnName: "AC_TrendLive",
  blocks: (() => {
    const ax0 = mkAxis("#3b82f6");
    const ax1 = mkAxis("#ef4444");
    const s0 = mkSeries(ax0.id, "#3b82f6");
    const s1 = mkSeries(ax1.id, "#ef4444");
    const r0 = { ...mkRef(ax0.id), mode: "fixed", value: 90, label: "Grenzwert", color: "#f59e0b" };
    const r1 = { ...mkRef(ax1.id), mode: "symbol", symbol: "ADS.…::rLimit", label: "Dyn. Grenze", color: "#a855f7" };
    const m0 = { ...mkMarker(), kind: "enum", symbol: "ADS.…::eStep", mappings: [mkMapping(1, "Automatik"), mkMapping(2, "Spülen")], onlyMapped: true, markInitial: false };
    const m1 = { ...mkMarker(), kind: "metric", symbol: "ADS.…::nCycle", showValue: true, prefix: "Zyklus ", decimals: 0 };
    return [{
      ...newBlock("plot"), caption: "Druckverlauf", dataMode: "live", followSec: 120, maxPoints: 1800, plotHeight: 320,
      showRangeslider: true, showXAxis: true, showToolbar: true, zoomEnabled: true, showStats: false,
      axes: [ax0, ax1], series: [s0, s1], refLines: [r0, r1], eventMarkers: [m0, m1],
      timeButtons: defaultTimeButtons(),
    }];
  })(),
});

// ── 7) event: Plot history + Live, Statistik-Tabelle, eigene Zeitraum-Buttons, Toolbar/Zoom aus ──
add("plot_history_stats", {
  mode: "event",
  fnName: "AC_TrendHistory",
  blocks: (() => {
    const ax0 = mkAxis("#22c55e");
    const s0 = mkSeries(ax0.id, "#22c55e");
    return [{
      ...newBlock("plot"), caption: "Langzeit", dataMode: "history", historyLoadSec: 7200, followSec: 900, maxPoints: 5000, plotHeight: 280,
      showRangeslider: false, showXAxis: false, showToolbar: false, zoomEnabled: false, showStats: true,
      axes: [ax0], series: [s0], refLines: [], eventMarkers: [],
      timeButtons: [mkTimeBtn(2, "hour", "2 h"), mkTimeBtn(1, "day", "1 Tag"), mkTimeBtn(0, "all", "Alle")],
    }];
  })(),
});

// ── 8) registered: Tabelle statisch, alle Spaltenarten, Sortierung, Suche/Pagination ──
add("table_static_basic", {
  mode: "registered",
  fnName: "AC_TableStatic",
  maxWidth: 620,
  blocks: (() => {
    const cRead = { ...mkTableCol("read"), header: "Wert", headerLoc: "L_ColWert", unit: "bar", decimals: 1, sortable: true, headerIcon: "info", headerIconColor: "#3b82f6" };
    const cText = { ...mkTableCol("text"), header: "Bezeichnung" };
    const cBool = { ...mkTableCol("bool"), header: "Aktiv", sortable: true };
    const cCheck = { ...mkTableCol("check"), header: "Quittiert", writeMode: "toggle" };
    const cInput = { ...mkTableCol("input"), header: "Soll" };
    const cBtn = { ...mkTableCol("button"), header: "Aktion", label: "Reset", writeMode: "pulse", pulseMs: 200 };
    const cEnum = { ...mkTableCol("enum"), header: "Status", sortable: true, map: [mkTableMapEntry("0", "Aus", "grey"), mkTableMapEntry("1", "Ein", "green")] };
    const cIcon = { ...mkTableCol("icon"), header: "Warnung", map: [mkTableMapEntry("1", "Warnung", "yellow", "warning"), mkTableMapEntry("2", "Alarm", "red", "alert")] };
    const columns = [cRead, cText, cBool, cCheck, cInput, cBtn, cEnum, cIcon];
    const rows = [0, 1, 2].map((ri) => ({
      ...mkTableRow(columns.length),
      cells: columns.map((c, ci) => {
        if (c.kind === "text") return { symbol: "", text: "Zeile " + (ri + 1), loc: "" };
        return { symbol: "ADS.…::aRow" + ri + "_c" + ci, text: "", loc: "" };
      }),
    }));
    return [{
      ...newBlock("table"), caption: "Übersicht", captionLoc: "L_TblOverview",
      dataSource: "static", columns, rows,
      search: true, pageSize: 2, striped: true, showHeader: true, showIndex: true, watchLimit: 30,
      rules: [{ ...mkTableRule(), colIndex: 0, op: ">", value: "80", target: "row", color: "red" }],
      rowFilters: [],
      defaultSortCol: 0, defaultSortDir: "asc",
    }];
  })(),
});

// ── 9) event: Tabelle aus PLC-Array, Zeilenfilter, Regeln, Button->Funktion (alle paramSource) ──
add("table_array_dynamic", {
  mode: "event",
  fnName: "AC_TableArray",
  maxWidth: 640,
  blocks: (() => {
    const cRead = { ...mkTableCol("read"), header: "Wert", member: "rValue", unit: "%", decimals: 0, sortable: true };
    const cBool = { ...mkTableCol("bool"), header: "Aktiv", member: "xActive" };
    const cEnum = { ...mkTableCol("enum"), header: "Klasse", member: "eClass", map: [mkTableMapEntry("0", "Info", "blue"), mkTableMapEntry("1", "Warnung", "yellow")] };
    const cBtnMember = { ...mkTableCol("button"), header: "Quittieren (Member)", label: "Quittieren", action: "fn", fnName: "AC_HMI_AckRow", paramSource: "member", paramMember: "nAlarmId" };
    const cBtnCol = { ...mkTableCol("button"), header: "Kopieren (Spalte)", label: "Kopieren", action: "fn", fnName: "AC_HMI_CopyRow", paramSource: "col", paramCol: 0 };
    const cBtnIndex = { ...mkTableCol("button"), header: "Info (Index)", label: "Info", action: "fn", fnName: "AC_HMI_RowInfo", paramSource: "index" };
    const cBtnNone = { ...mkTableCol("button"), header: "Aktualisieren", label: "Refresh", action: "fn", fnName: "AC_HMI_Refresh", paramSource: "none" };
    const columns = [cRead, cBool, cEnum, cBtnMember, cBtnCol, cBtnIndex, cBtnNone];
    return [{
      ...newBlock("table"), caption: "Alarme", dataSource: "array",
      arraySymbol: "ADS.AF_PLC.MAIN.GVL.aAlarms", arrayCount: 20, countSymbol: "ADS.AF_PLC.MAIN.GVL.nAlarmCount", startIndex: 0,
      columns, rows: [],
      search: true, pageSize: 5, striped: true, showHeader: true, showIndex: false, watchLimit: 30, pollMs: 800,
      rules: [{ ...mkTableRule(), colIndex: 2, op: "==", value: "1", target: "cell", color: "yellow" }],
      rowFilters: [
        { ...mkRowFilter(), colIndex: 0, op: "notZero", value: "" },
        { ...mkRowFilter(), colIndex: 1, op: "==", value: "true" },
      ],
      defaultSortCol: -1, defaultSortDir: "asc",
    }];
  })(),
});

// ── 10) usercontrol: Tabelle (modus-unabhängig) + weitere UC-Bausteine gemischt ──
add("usercontrol_table", {
  mode: "usercontrol",
  fnName: "AC_UcTable",
  hostSuffix: ".btn_Table",
  blocks: (() => {
    const cRead = { ...mkTableCol("read"), header: "Messwert", unit: "°C", decimals: 1 };
    const cText = { ...mkTableCol("text"), header: "Kommentar" };
    const columns = [cRead, cText];
    const rows = [0, 1].map(() => ({ ...mkTableRow(columns.length), cells: [{ symbol: "ADS.…::rTemp", text: "", loc: "" }, { symbol: "", text: "OK", loc: "" }] }));
    return [
      { ...newBlock("read"), label: "Übersicht", symbol: "Overview" },
      { ...newBlock("table"), caption: "Messwerte", dataSource: "static", columns, rows, search: false, pageSize: 0, showIndex: true },
      { ...newBlock("check"), label: "Bestätigt", symbol: "Confirmed" },
    ];
  })(),
});

// ── 11) registered: 3-Spalten-Layout, Zeilen (volle Breite) + Trennlinien (voll/in Spalte) ──
add("columns3_mixed", {
  mode: "registered",
  fnName: "AC_ThreeCols",
  maxWidth: 780,
  columns: 3,
  blocks: [
    { ...newBlock("text"), col: 0, text: "Spalte 1" },
    { ...newBlock("read"), col: 0, label: "Wert A", symbol: "ADS.…::rA" },
    { ...newBlock("divider"), col: 0, label: "In Spalte 1", inCol: true },
    { ...newBlock("bool"), col: 0, label: "Bool A", symbol: "ADS.…::xA" },
    { ...newBlock("read"), col: 1, label: "Wert B", symbol: "ADS.…::rB" },
    { ...newBlock("check"), col: 1, label: "Check B", symbol: "ADS.…::xB" },
    { ...newBlock("read"), col: 2, label: "Wert C", symbol: "ADS.…::rC" },
    { ...newBlock("progress"), col: 2, label: "Balken C", symbol: "ADS.…::rC2", min: 0, max: 10 },
    { ...newBlock("divider") }, // volle Breite, bricht das Grid
    {
      ...newBlock("row"),
      items: [
        { ...mkItem("read"), label: "R1", symbol: "ADS.…::r1" },
        { ...mkItem("read"), label: "R2", symbol: "ADS.…::r2" },
        { ...mkItem("read"), label: "R3", symbol: "ADS.…::r3" },
        { ...mkItem("read"), label: "R4", symbol: "ADS.…::r4" },
      ],
    },
    { ...newBlock("text"), col: 1, text: "Nach der Zeile, wieder im Grid" },
  ],
});

// ══════════════════════════════════════════════════════════════════════
// Zusätzliche Configs: neue Table-/Embed-Features (nach der Tabellen-Session)
// ══════════════════════════════════════════════════════════════════════

// ── 12) embed: Overlay-freier Modus, gemischte Bausteine inkl. Tabelle (statisch) ──
add("embed_basic", {
  mode: "embed",
  fnName: "AC_EmbedBasic",
  maxWidth: 480,
  blocks: (() => {
    const cRead = { ...mkTableCol("read"), header: "Wert", unit: "%", decimals: 0 };
    const columns = [cRead];
    const rows = [0, 1].map(() => ({ ...mkTableRow(columns.length), cells: [{ symbol: "ADS.…::rEmbed", text: "", loc: "" }] }));
    return [
      { ...newBlock("bool"), label: "Verbunden", symbol: "ADS.…::xConnected" },
      { ...newBlock("input"), label: "Sollwert", symbol: "ADS.…::nEmbedSet", dataType: "number" },
      {
        ...newBlock("button"),
        buttons: [{ ...mkButton(), label: "Anwenden", symbol: "ADS.…::xApply", writeMode: "pulse", closeAfter: false, color: "green" }],
      },
      { ...newBlock("table"), caption: "Embed-Tabelle", dataSource: "static", columns, rows, search: false, pageSize: 0 },
    ];
  })(),
});

// ── 13) embed: PLC-Array-Tabelle + Plot zusammen im Zielcontainer ──
add("embed_table_array_plot", {
  mode: "embed",
  fnName: "AC_EmbedArrayPlot",
  maxWidth: 700,
  blocks: (() => {
    const cRead = { ...mkTableCol("read"), header: "Wert", member: "rValue", unit: "bar", decimals: 2, sortable: true };
    const cEnum = { ...mkTableCol("enum"), header: "Status", member: "eStatus", map: [mkTableMapEntry("0", "OK", "green"), mkTableMapEntry("1", "Fehler", "red")] };
    const columns = [cRead, cEnum];
    const ax0 = mkAxis("#3b82f6");
    const s0 = mkSeries(ax0.id, "#3b82f6");
    return [
      { ...newBlock("table"), caption: "Live-Array", dataSource: "array", arraySymbol: "ADS.…::aEmbedArr", arrayCount: 8, columns, rows: [], search: true, pageSize: 0, defaultSortCol: 0, defaultSortDir: "desc" },
      { ...newBlock("plot"), caption: "Embed-Trend", dataMode: "live", plotHeight: 220, axes: [ax0], series: [s0], timeButtons: defaultTimeButtons() },
    ];
  })(),
});

// ── 14) registered: Tabelle mit mehreren Sortierspalten + kombinierten Zeilenfiltern ──
add("table_sort_filter", {
  mode: "registered",
  fnName: "AC_TableSortFilter",
  blocks: (() => {
    const cNum = { ...mkTableCol("read"), header: "Priorität", sortable: true };
    const cBool = { ...mkTableCol("bool"), header: "Quittiert", sortable: true };
    const cText = { ...mkTableCol("text"), header: "Text" };
    const columns = [cNum, cBool, cText];
    const rows = [0, 1, 2, 3].map((ri) => ({
      ...mkTableRow(columns.length),
      cells: [{ symbol: "ADS.…::nPrio" + ri, text: "", loc: "" }, { symbol: "ADS.…::xAck" + ri, text: "", loc: "" }, { symbol: "", text: "Eintrag " + ri, loc: "" }],
    }));
    return [{
      ...newBlock("table"), caption: "Sortiert & gefiltert", dataSource: "static", columns, rows,
      rowFilters: [
        { ...mkRowFilter(), colIndex: 1, op: "notEmpty", value: "" },
        { ...mkRowFilter(), colIndex: 0, op: ">=", value: "1" },
      ],
      defaultSortCol: 1, defaultSortDir: "desc",
    }];
  })(),
});

// ── 15) event: Button->Funktion im statischen Datenmodus (member ohne Wirkung, col/index/none) ──
add("table_button_fn_static", {
  mode: "event",
  fnName: "AC_TableFnStatic",
  blocks: (() => {
    const cRead = { ...mkTableCol("read"), header: "Wert" };
    const cBtnCol = { ...mkTableCol("button"), header: "Verdoppeln (Spalte)", label: "Verdoppeln", action: "fn", fnName: "AC_HMI_DoubleVal", paramSource: "col", paramCol: 0 };
    const cBtnIndex = { ...mkTableCol("button"), header: "Zeile (Index)", label: "Zeile", action: "fn", fnName: "AC_HMI_RowIndex", paramSource: "index" };
    const cBtnNone = { ...mkTableCol("button"), header: "Ping", label: "Ping", action: "fn", fnName: "AC_HMI_Ping", paramSource: "none" };
    const columns = [cRead, cBtnCol, cBtnIndex, cBtnNone];
    const rows = [0, 1].map((ri) => ({ ...mkTableRow(columns.length), cells: [{ symbol: "ADS.…::rStat" + ri, text: "", loc: "" }, { symbol: "", text: "", loc: "" }, { symbol: "", text: "", loc: "" }, { symbol: "", text: "", loc: "" }] }));
    return [{ ...newBlock("table"), caption: "Statisch + Funktionen", dataSource: "static", columns, rows }];
  })(),
});

// ══════════════════════════════════════════════════════════════════════
// Zusätzliche Configs: Gruppen-Berechtigungen (observe/operate, Popup + Block)
// ══════════════════════════════════════════════════════════════════════

// ── 16) registered: popup-weite Berechtigung (observe + operate) ──
add("access_popup_registered", {
  mode: "registered",
  fnName: "AC_AccessPopup",
  access: mkAcc({
    observe: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" },
    operate: { Admin: "Allow", Service: "Deny", Process_Engineer: "Deny", Operator: "Deny" },
  }),
  blocks: [
    { ...newBlock("read"), label: "Druck", symbol: "ADS.…::rPressure", unit: "bar" },
    { ...newBlock("check"), label: "Freigabe", symbol: "ADS.…::xEnable" },
    { ...newBlock("button"), buttons: [{ ...mkButton(), label: "Start", symbol: "ADS.…::xStart", writeMode: "pulse" }] },
  ],
});

// ── 17) registered: per-Baustein-Berechtigung (nur observe / nur operate / beides / keine) ──
add("access_perblock_mixed", {
  mode: "registered",
  fnName: "AC_AccessPerBlock",
  columns: 1,
  blocks: [
    // nur observe: für Operator ausgeblendet
    { ...newBlock("read"), label: "Nur Sehen", symbol: "ADS.…::rSecret", access: mkAcc({ observe: { Operator: "Deny", Process_Engineer: "Deny" } }) },
    // nur operate: sichtbar, aber für Operator deaktiviert
    { ...newBlock("check"), label: "Nur Bedienen", symbol: "ADS.…::xLocked", access: mkAcc({ operate: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" } }) },
    // beides
    { ...newBlock("button"), buttons: [{ ...mkButton(), label: "Kritisch", symbol: "ADS.…::xCritical", writeMode: "setTrue" }],
      access: mkAcc({ observe: { Operator: "Deny" }, operate: { Admin: "Allow", Service: "Deny", Process_Engineer: "Deny", Operator: "Deny" } }) },
    // keine Berechtigung -> unverändert
    { ...newBlock("read"), label: "Frei", symbol: "ADS.…::rOpen" },
  ],
});

// ── 18) usercontrol: Popup-Default + einzelner Baustein-Override ──
add("access_usercontrol", {
  mode: "usercontrol",
  fnName: "AC_AccessUc",
  hostSuffix: ".btn_Acc",
  access: mkAcc({ operate: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" } }),
  blocks: [
    { ...newBlock("read"), label: "Wert", symbol: "Value", unit: "%" },
    { ...newBlock("button"), buttons: [{ ...mkButton(), label: "Nur Admin", symbol: "AdminOnly", writeMode: "pulse" }],
      access: mkAcc({ observe: { Service: "Deny", Process_Engineer: "Deny", Operator: "Deny" } }) },
  ],
});

// ── 19) embed: Popup-weite observe + Tabelle mit per-Block operate ──
add("access_embed_table", {
  mode: "embed",
  fnName: "AC_AccessEmbed",
  maxWidth: 560,
  access: mkAcc({ observe: { Admin: "Allow", Service: "Allow", Process_Engineer: "Allow", Operator: "Deny" } }),
  blocks: (() => {
    const cRead = { ...mkTableCol("read"), header: "Wert", member: "rValue", unit: "bar", decimals: 1 };
    const cCheck = { ...mkTableCol("check"), header: "Quittieren", member: "xAck" };
    const columns = [cRead, cCheck];
    return [
      { ...newBlock("bool"), label: "Läuft", symbol: "ADS.…::xRun" },
      { ...newBlock("table"), caption: "Alarme", dataSource: "array", arraySymbol: "ADS.…::aAlarms", arrayCount: 6, columns, rows: [],
        access: mkAcc({ operate: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" } }) },
    ];
  })(),
});

// ── 20) registered: per-Button-Berechtigung (ein Button frei, einer beschränkt) ──
// Klassischer Fall: "Operator darf Abbrechen, aber nicht Bestätigen".
add("access_per_button", {
  mode: "registered",
  fnName: "AC_AccessPerButton",
  blocks: [
    {
      ...newBlock("button"),
      buttons: [
        { ...mkButton(), label: "Abbrechen", symbol: "ADS.…::xCancel", writeMode: "setTrue", color: "grey", closeAfter: true },
        { ...mkButton(), label: "Bestätigen", symbol: "ADS.…::xConfirm", writeMode: "pulse", color: "green",
          access: mkAcc({
            observe: { Admin: "Allow", Service: "Allow", Process_Engineer: "Allow", Operator: "Deny" },
            operate: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" },
          }) },
      ],
    },
  ],
});

// ── 21) usercontrol: per-Button-Berechtigung über gv()/sv() ──
add("access_per_button_uc", {
  mode: "usercontrol",
  fnName: "AC_AccessPerButtonUc",
  hostSuffix: ".btn_Acc",
  blocks: [
    {
      ...newBlock("button"),
      buttons: [
        { ...mkButton(), label: "Frei", symbol: "Free", writeMode: "pulse" },
        { ...mkButton(), label: "Nur Admin", symbol: "AdminOnly", writeMode: "setTrue",
          access: mkAcc({ observe: { Service: "Deny", Process_Engineer: "Deny", Operator: "Deny" } }) },
      ],
    },
  ],
});

export { CONFIGS };
