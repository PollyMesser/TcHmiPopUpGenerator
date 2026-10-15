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

// ── Getrenntes Schreib-Ziel (writeSym): Lesen != Schreiben, Symbol-Modus ──
add("writeattr_symbol", {
  mode: "registered",
  fnName: "AC_WriteAttrSym",
  blocks: [
    { ...newBlock("check"), label: "Freigabe", loc: "L_Enable",
      symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable",
      writeSym: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xCmdEnable" },
    { ...newBlock("input"), label: "Sollwert", loc: "L_Setpoint",
      symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rSetpoint", dataType: "number", unit: "bar",
      writeSym: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rCmdSetpoint",
      trigSym: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xCmdSetSetpoint", trigMode: "pulse", trigMs: 300 },
    { ...newBlock("enumset"), label: "Modus", loc: "L_Mode",
      symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eMode", numeric: true,
      writeSym: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eCmdMode",
      map: [mkEnumEntry(0, "Hand"), mkEnumEntry(1, "Automatik")],
      sendButton: true, sendLabel: "Übernehmen", sendColor: "green",
      trigSym: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xCmdSetMode", trigMode: "pulse", trigMs: 300 },
  ],
});

// ── Getrenntes Schreib-Ziel (writeSym): Lesen != Schreiben, UserControl-Modus ──
add("writeattr_uc", {
  mode: "usercontrol",
  fnName: "AC_WriteAttrUc",
  hostSuffix: ".btn_Cmd",
  blocks: [
    { ...newBlock("check"), label: "Freigabe", loc: "L_Enable",
      symbol: "Enable", writeSym: "CmdEnable" },
    { ...newBlock("input"), label: "Sollwert", loc: "L_Setpoint",
      symbol: "Setpoint", dataType: "number", unit: "bar",
      writeSym: "CmdSetpoint", trigSym: "CmdSetSetpoint", trigMode: "pulse", trigMs: 300 },
    { ...newBlock("enumset"), label: "Modus", loc: "L_Mode",
      symbol: "Mode", numeric: true, writeSym: "CmdMode",
      map: [mkEnumEntry(0, "Hand"), mkEnumEntry(1, "Automatik")],
      sendButton: true, sendLabel: "Übernehmen", sendColor: "green",
      trigSym: "CmdSetMode", trigMode: "pulse", trigMs: 300 },
  ],
});

// ── Tabellen mit Eingabe-Typ pro Spalte (time/number/text) ──
add("table_time_input", {
  mode: "registered",
  fnName: "AC_TableTime",
  blocks: [
    {
      ...newBlock("table"), caption: "Zeiten", dataSource: "static",
      columns: [
        { ...mkTableCol("read"), header: "Name" },
        { ...mkTableCol("input"), header: "Dauer", inputType: "time" },
        { ...mkTableCol("input"), header: "Menge", inputType: "number", unit: "l" },
        { ...mkTableCol("input"), header: "Notiz", inputType: "text" },
      ],
      rows: [
        { ...mkTableRow(4), cells: [
          { symbol: "ADS.AF_PLC.MAIN::sName0", text: "", loc: "" },
          { symbol: "ADS.AF_PLC.MAIN::tDur0", text: "", loc: "" },
          { symbol: "ADS.AF_PLC.MAIN::nQty0", text: "", loc: "" },
          { symbol: "ADS.AF_PLC.MAIN::sNote0", text: "", loc: "" },
        ] },
      ],
    },
  ],
});

// ── Tabelle mit Spalten-Berechtigungen (observe-Deny + operate-Deny) ──
add("access_table_columns", {
  mode: "registered",
  fnName: "AC_TableColAcc",
  blocks: [
    {
      ...newBlock("table"), caption: "Rechte", dataSource: "static",
      columns: [
        { ...mkTableCol("read"), header: "Name" },
        { ...mkTableCol("check"), header: "Freigabe", access: mkAcc({ operate: { Operator: "Deny" } }) },
        { ...mkTableCol("read"), header: "Geheim", access: mkAcc({ observe: { Operator: "Deny", Process_Engineer: "Deny" } }) },
      ],
      rows: [
        { ...mkTableRow(3), cells: [
          { symbol: "ADS.AF_PLC.MAIN::sName0", text: "", loc: "" },
          { symbol: "ADS.AF_PLC.MAIN::xEnable0", text: "", loc: "" },
          { symbol: "ADS.AF_PLC.MAIN::rSecret0", text: "", loc: "" },
        ] },
      ],
    },
  ],
});

// ── event + embed: IIFE mit konfigurierter Container-ID, Symbol-Datenzugriff ──
add("embed_event", {
  mode: "embedEvent",
  fnName: "AC_EmbedEvent",
  embedTarget: "MeinContainer",
  blocks: [
    { ...newBlock("read"), label: "Druck", loc: "L_P", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPressure", unit: "bar" },
    { ...newBlock("check"), label: "Freigabe", loc: "L_Enable", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable" },
  ],
});

// ── usercontrol + embed: Host/Container aus Container-ID, UC-Datenzugriff + Polling ──
add("embed_uc", {
  mode: "embedUc",
  fnName: "AC_EmbedUc",
  hostSuffix: ".ucEmbed",
  blocks: [
    { ...newBlock("read"), label: "Ist-Modus", loc: "L_Mode", symbol: "Mode" },
    { ...newBlock("enumset"), label: "Modus", loc: "L_ModeSet", symbol: "Mode", numeric: true, writeSym: "CmdMode",
      map: [mkEnumEntry(0, "Hand"), mkEnumEntry(1, "Automatik")], sendButton: true, sendLabel: "Übernehmen", trigSym: "CmdSetMode", trigMode: "pulse", trigMs: 300 },
  ],
});

// ── UserControl-Plot mit Einstellwerten aus UC-Parametern (getX) ──
add("plot_uc_params", {
  mode: "usercontrol",
  fnName: "AC_PlotUcParams",
  hostSuffix: ".btn_Plot",
  blocks: [
    (function () {
      const p = newBlock("plot");
      p.caption = "Verlauf";
      p.axes[0] = { ...p.axes[0], label: "Druck", labelParam: "AxTitle", min: 0, max: 100, autoscale: false, minParam: "AxMin", maxParam: "AxMax" };
      p.series[0] = { ...p.series[0], symbol: "ADS.AF_PLC.MAIN::fWert", symbolParam: "SigPath", label: "Signal", labelParam: "SigName" };
      p.refLines = [{ ...mkRef(p.axes[0].id), mode: "fixed", value: 90, valueParam: "RefVal", label: "Grenze", labelParam: "RefLabel" }];
      p.eventMarkers = [{ ...mkMarker(), symbol: "ADS.AF_PLC.MAIN::eStep", symbolParam: "MkPath", mappings: [{ ...mkMapping("1", "Auto"), valueParam: "MapVal0" }] }];
      return p;
    })(),
  ],
});

// ── Fehlertabelle (embed): Loc-Key-Vorlage je Zeile + Enum als Text/Farbpunkt ──
add("table_loc_template", {
  mode: "embed",
  fnName: "AC_FehlerTabelleTpl",
  embedTarget: "MeinContainer",
  blocks: (() => {
    const cId = { ...mkTableCol("read"), header: "Fehlernummer", member: "nId", sortable: true };
    const cTxt = { ...mkTableCol("text"), header: "Alarmtext", locTpl: "L_alarm + {1:3}", textTpl: "Alarm {1}", sortable: true };
    const cCode = { ...mkTableCol("text"), header: "Code", locTpl: "L_code{nCode}" };
    const cEnum = { ...mkTableCol("enum"), header: "Fehlertyp", member: "eType", enumDisplay: "text",
      map: [mkTableMapEntry("1", "Information", "blue"), mkTableMapEntry("2", "Warnung", "yellow")] };
    const cDot = { ...mkTableCol("enum"), header: "Typ (Punkt)", member: "eType", enumDisplay: "dot",
      map: [mkTableMapEntry("1", "Information", "blue"), mkTableMapEntry("4", "Kritisch", "red")] };
    const cColor = { ...mkTableCol("enum"), header: "Typ (farbig)", member: "eType", enumDisplay: "ctext",
      map: [mkTableMapEntry("4", "Kritisch", "red")] };
    const columns = [cId, cTxt, cCode, cEnum, cDot, cColor];
    return [{
      ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.AF_PLC.MAIN.aAlarmHmi", arrayCount: 12,
      columns, rows: [], search: true, pageSize: 10, defaultSortCol: 0,
      rowFilters: [{ ...mkRowFilter(), colIndex: 0, op: "notZero", value: "" }],
    }];
  })(),
});

// ── Keypad (AC_NumPad): Eingabefeld-Baustein, Symbol-Modus, Min/Max als Symbol + Zahl, Trigger ──
add("keypad_input_registered", {
  mode: "registered",
  fnName: "AC_KeypadInput",
  blocks: [
    { ...newBlock("input"), label: "Druck-Sollwert", loc: "L_PressSet", symbol: "ADS.AF_PLC.GVL.stP101::rValue", unit: "bar",
      keypad: true, kpMin: "ADS.AF_PLC.GVL.stP101::rMin", kpMax: "16", kpDecimals: "1",
      trigSym: "ADS.AF_PLC.GVL.stP101::xApply", trigMode: "pulse", trigMs: 500 },
    { ...newBlock("input"), label: "Stückzahl", symbol: "ADS.AF_PLC.GVL.nCount", writeSym: "ADS.AF_PLC.GVL.nCountCmd",
      keypad: true, kpMin: "0", kpMax: "", kpDecimals: "0" },
    { ...newBlock("row"), items: [mkItem("read"), { ...mkItem("input"), keypad: true, kpMin: "-10", kpMax: "10" }] },
  ],
});

// ── Keypad (AC_NumPad): Eingabefeld im UserControl-Modus (Attribut-Grenze + feste Grenze) ──
add("keypad_input_uc", {
  mode: "usercontrol",
  fnName: "AC_KeypadUc",
  hostSuffix: ".btn_PopUp",
  blocks: [
    { ...newBlock("input"), label: "Temperatur", symbol: "TempSet", unit: "°C",
      keypad: true, kpMin: "TempMin", kpMax: "120", kpDecimals: "1", trigSym: "CmdApply", trigMode: "setTrue" },
  ],
});

// ── Keypad (AC_NumPad): Tabelle Array-Modus, Grenzen aus derselben Struktur ──
add("keypad_table_array", {
  mode: "embed",
  fnName: "AC_ParamTabelle",
  embedTarget: "MeinContainer",
  blocks: (() => {
    const cName = { ...mkTableCol("text"), header: "Parameter" };
    const cVal = { ...mkTableCol("input"), header: "Wert", headerLoc: "L_Value", member: "rValue", unit: "bar", decimals: "1",
      keypad: true, kpMin: "rMin", kpMax: "rMax" };
    const cMin = { ...mkTableCol("read"), header: "Min", member: "rMin", decimals: "1" };
    const cMax = { ...mkTableCol("read"), header: "Max", member: "rMax", decimals: "1" };
    return [{
      ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.AF_PLC.GVL.aParam", arrayCount: 8, startIndex: 1,
      columns: [cName, cVal, cMin, cMax], rows: [], showIndex: true,
    }];
  })(),
});

// ── Keypad (AC_NumPad): Tabelle statisch, Geschwister-Variable + feste Grenze ──
add("keypad_table_static", {
  mode: "registered",
  fnName: "AC_ParamStatisch",
  blocks: (() => {
    const cName = { ...mkTableCol("text"), header: "Parameter" };
    const cVal = { ...mkTableCol("input"), header: "Sollwert", unit: "%", decimals: "0", keypad: true, kpMin: "0", kpMax: "rMax" };
    const r1 = mkTableRow(2); r1.cells[0].text = "Pumpe 1"; r1.cells[1].symbol = "ADS.AF_PLC.GVL.stPump1::rSpeed";
    const r2 = mkTableRow(2); r2.cells[0].text = "Pumpe 2"; r2.cells[1].symbol = "ADS.AF_PLC.GVL.rPump2Speed";
    return [{ ...newBlock("table"), dataSource: "static", columns: [cName, cVal], rows: [r1, r2] }];
  })(),
});

// ── Alarmtabelle mit Einstellwerten: Einheit/Kennbit/Nachkommastellen je Zeile (Array-Modus) ──
add("table_row_units", {
  mode: "embed",
  fnName: "AC_AlarmEinstellwerte",
  embedTarget: "MeinContainer",
  blocks: (() => {
    const cId = { ...mkTableCol("read"), header: "Nr.", member: "nId" };
    const cTxt = { ...mkTableCol("text"), header: "Alarm", locTpl: "L_alarm + {nId}" };
    const cL1 = { ...mkTableCol("input"), header: "Grenzwert 1", member: "fLimit1", inputType: "number",
      keypad: true, kpMin: "fLimit1Min", kpMax: "fLimit1Max",
      unitMember: "sLimit1Unit", hasMember: "bHasLimit1", decMap: "bar=2; °=1; s=0; min=0" };
    const cAct = { ...mkTableCol("read"), header: "Istwert", member: "fActual",
      unitMember: "sActualUnit", hasMember: "bHasActual", decMap: "bar=2; °=1; s=0; min=1", decimals: "0" };
    return [{
      ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.AF_PLC.MAIN.aAlarmHmi", arrayCount: 6,
      columns: [cId, cTxt, cL1, cAct], rows: [],
    }];
  })(),
});

// ── Alarmtabelle: ausgeblendete Spalte nId mit Abhaengigkeiten (Filter, Sortierung, Button-Parameter, Vorlage) ──
add("table_hidden_deps", {
  mode: "embed",
  fnName: "AC_AlarmHidden",
  embedTarget: "MeinContainer",
  blocks: (() => {
    const cId = { ...mkTableCol("read"), header: "Nr.", member: "nId", sortable: true, hidden: true };
    const cTxt = { ...mkTableCol("text"), header: "Alarm", locTpl: "L_alarm{1:3}" };
    const cTrig = { ...mkTableCol("bool"), header: "Ausgelöst", member: "bTriggered" };
    const cInfo = { ...mkTableCol("button"), header: "Info", label: "?", action: "fn", fnName: "AlarmInfoPopup", paramSource: "col", paramCol: 0 };
    return [{
      ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.AF_PLC.MAIN.aAlarmHmi", arrayCount: 8, pageSize: 5,
      columns: [cId, cTxt, cTrig, cInfo], rows: [],
      rules: [{ ...mkTableRule(), colIndex: 2, op: "==", value: "true", target: "row", color: "red" }],
      rowFilters: [{ ...mkRowFilter(), colIndex: 0, op: "notZero", value: "" }, { ...mkRowFilter(), colIndex: 0, op: ">=", value: "101" }],
      defaultSortCol: 0, defaultSortDir: "asc",
    }];
  })(),
});

// ── observe-gesperrte Spalte, von der ein Zeilenfilter abhaengt (wird trotzdem gelesen) + ausgeblendete Spalte ──
add("access_observe_deps", {
  mode: "registered",
  fnName: "AC_AccObsDeps",
  blocks: (() => {
    const cId = { ...mkTableCol("read"), header: "Nr.", member: "nId" };
    const cSecret = { ...mkTableCol("read"), header: "Intern", member: "nPrio",
      access: mkAcc({ observe: { Admin: "Allow", Service: "Allow", Process_Engineer: "Deny", Operator: "Deny" } }) };
    const cFree = { ...mkTableCol("read"), header: "Frei", member: "nFree",
      access: mkAcc({ observe: { Operator: "Deny" } }) };
    const cHid = { ...mkTableCol("read"), header: "Versteckt", member: "nHidden", hidden: true };
    return [{
      ...newBlock("table"), dataSource: "array", arraySymbol: "ADS.AF_PLC.MAIN.aList", arrayCount: 4,
      columns: [cId, cSecret, cFree, cHid], rows: [],
      rowFilters: [{ ...mkRowFilter(), colIndex: 1, op: "notZero", value: "" }],
    }];
  })(),
});

// ── Touch-Layout (Groesse M): Checkbox/LED/Pager gross, einheitliche Feldbreiten, Keypad mit Einheit ──
add("table_touch_layout", {
  mode: "embed",
  fnName: "AC_TouchTable",
  embedTarget: "MeinContainer",
  blocks: (() => {
    const cId = { ...mkTableCol("read"), header: "Nr.", member: "nId", sortable: true };
    const cTxt = { ...mkTableCol("text"), header: "Alarm", locTpl: "L_alarm{1:3}" };
    const cTrig = { ...mkTableCol("bool"), header: "Ausgelöst", member: "bTriggered" };
    const cEn = { ...mkTableCol("check"), header: "Aktiv", member: "bEnable" };
    const cLim = { ...mkTableCol("input"), header: "Grenzwert", member: "fLimit", inputType: "number", keypad: true, unit: "bar", decimals: "1", kpMin: "0", kpMax: "fLimitMax" };
    const cDel = { ...mkTableCol("input"), header: "Verzögerung", member: "tDelay", inputType: "time" };
    const cTyp = { ...mkTableCol("enum"), header: "Typ", member: "eType", map: [{ ...mkTableMapEntry("1", "Info", "blue") }, { ...mkTableMapEntry("2", "Störung", "red") }] };
    const cInfo = { ...mkTableCol("button"), header: "Info", label: "?", action: "fn", fnName: "AlarmInfoPopup", paramSource: "col", paramCol: 0 };
    return [{
      ...newBlock("table"), layout: "touch", size: "m", dataSource: "array", arraySymbol: "ADS.AF_PLC.MAIN.aAlarmHmi", arrayCount: 20, pageSize: 8, showIndex: true,
      columns: [cId, cTxt, cTrig, cEn, cLim, cDel, cTyp, cInfo], rows: [],
    }];
  })(),
});

// ── Gekuerzte Textspalten: Restbreite (Vorlage) + feste Breite (statisch), Touch ──
add("table_text_clamp", {
  mode: "embed",
  fnName: "AC_ClampTable",
  embedTarget: "MeinContainer",
  blocks: (() => {
    const cId = { ...mkTableCol("read"), header: "Nr.", member: "nId", hidden: true };
    const cTxt = { ...mkTableCol("text"), header: "Alarm", locTpl: "L_alarm{1:3}", clamp: true };
    const cHint = { ...mkTableCol("text"), header: "Hinweis", locTpl: "L_alarm{1:3}_Ursache", clamp: true, clampWidth: "24", clampMin: "8" };
    const cTrig = { ...mkTableCol("bool"), header: "Ausgelöst", member: "bTriggered" };
    return [{
      ...newBlock("table"), layout: "touch", dataSource: "array", arraySymbol: "ADS.AF_PLC.MAIN.aAlarmHmi", arrayCount: 6,
      columns: [cId, cTxt, cHint, cTrig], rows: [],
    }];
  })(),
});

// ── Zeilen pro Seite automatisch (Touch, eingebettet): Hoehe nutzen, Zeilenhoehe 46..58 px ──
add("table_auto_pages", {
  mode: "embed",
  fnName: "AC_AutoPages",
  embedTarget: "MeinContainer",
  blocks: (() => {
    const cId = { ...mkTableCol("read"), header: "Nr.", member: "nId", sortable: true };
    const cTxt = { ...mkTableCol("text"), header: "Alarm", locTpl: "L_alarm{1:3}", clamp: true };
    const cTrig = { ...mkTableCol("bool"), header: "Ausgelöst", member: "bTriggered" };
    return [{
      ...newBlock("table"), layout: "touch", dataSource: "array", arraySymbol: "ADS.AF_PLC.MAIN.aAlarmHmi", arrayCount: 69,
      pageMode: "auto", pageMin: "4", pageMax: "30", rowHMax: "58",
      columns: [cId, cTxt, cTrig], rows: [],
    }];
  })(),
});

// ── Kompakt-Layout explizit (seit Touch Standard ist): Kopien bestehender Configs mit layout 'compact' ──
// Der erzeugte Code muss dem Stand vor der Standard-Umstellung entsprechen (nur die Config-Zeile
// AC_POPUP_CONFIG_V1 enthaelt zusaetzlich "layout":"compact").
const compactCopy = (src) => {
  const cfg = JSON.parse(JSON.stringify(CONFIGS.find((c) => c.name === src).cfg));
  cfg.blocks = cfg.blocks.map((bl) => (bl.type === "table" ? { ...bl, layout: "compact" } : bl));
  return cfg;
};
add("table_sort_filter_compact", compactCopy("table_sort_filter"));
add("keypad_table_static_compact", compactCopy("keypad_table_static"));

export { CONFIGS };
