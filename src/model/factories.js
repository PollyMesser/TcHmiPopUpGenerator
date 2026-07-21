import { nid, eid, pid } from "./ids.js";
import { PLOT_COLORS } from "../constants/palette.js";

const mkButton = () => ({ label: "OK", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xConfirm", writeMode: "pulse", pulseMs: 500, closeAfter: true, color: "blue", visSym: "", enableIf: [], fbSym: "", confirmMs: 3000, confirmAction: "pulse" });
const mkItem = (kind) => {
  const base = { id: nid(), kind };
  if (kind === "input") return { ...base, label: "Sollwert", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint", dataType: "number", sendLabel: "Setzen", sendLoc: "", sendColor: "blue", trigSym: "", trigMode: "pulse", trigMs: 500 };
  if (kind === "check") return { ...base, label: "Freigabe", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable" };
  if (kind === "button") return { ...base, label: "OK", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xConfirm", writeMode: "pulse", pulseMs: 500, closeAfter: true, color: "blue", visSym: "", enableIf: [], fbSym: "", confirmMs: 3000, confirmAction: "pulse" };
  return { ...base, label: kind === "bool" ? "Status" : "Wert", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::" + (kind === "bool" ? "xStatus" : "xValue") };
};

const mkCond = () => ({ id: eid("c"), symbol: "", op: "==", value: "true" });
const mkEnumEntry = (value, text, color) => ({ id: eid("e"), value: value == null ? "" : String(value), loc: "", text: text || "", color: color || "blue" });
const mkStatusEntry = (symbol, text, color) => ({ id: eid("s"), symbol: symbol || "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xState", loc: "", text: text || "Status", color: color || "green" });

// ── Plot-Factories (aus dem ChartPop übernommen) ──
const mkAxis = (color) => ({ id: pid("a"), label: "", loc: "", unit: "%", color: color || PLOT_COLORS[0].hex, autoscale: false, min: 0, max: 100 });
const mkSeries = (axisId, color) => ({ id: pid("s"), symbol: "ADS.AF_PLC.MAIN.…::fWert", label: "Signal", loc: "", color: color || PLOT_COLORS[0].hex, axisId });
const mkRef = (axisId) => ({ id: pid("r"), mode: "fixed", value: 90, symbol: "ADS.AF_PLC.MAIN.…::rGrenzwert", label: "Grenzwert", loc: "", color: PLOT_COLORS[3].hex, dash: "dash", axisId });
const mkMapping = (value, label) => ({ id: pid("mm"), value: value != null ? String(value) : "0", label: label || "", loc: "" });
const mkMarker = () => ({ id: pid("m"), kind: "enum", symbol: "ADS.AF_PLC.MAIN.…::eStep", color: PLOT_COLORS[4].hex, dash: "dot", mode: "all", onlyMapped: false, markInitial: false, mappings: [mkMapping("1", "Automatik"), mkMapping("2", "Spülen")], showValue: true, prefix: "", prefixLoc: "", decimals: 0 });
// ── Zeitraum-Buttons (Plotly rangeselector) ──
const mkTimeBtn = (count, unit, label) => ({ id: pid("t"), count, unit, label });
const DEFAULT_TIME_BUTTONS = [
  { count: 1, unit: "hour", label: "1 h" }, { count: 6, unit: "hour", label: "6 h" },
  { count: 24, unit: "hour", label: "24 h" }, { count: 7, unit: "day", label: "1 Woche" },
  { count: 0, unit: "all", label: "Alle" },
];
const defaultTimeButtons = () => DEFAULT_TIME_BUTTONS.map((t) => mkTimeBtn(t.count, t.unit, t.label));


// ── Tabellen-Factories ──
// sortable: Spalte per Kopfklick sortierbar (Laufzeit).
// action/fnName/paramSource/paramMember/paramCol: nur fuer kind==='button' relevant.
//   action 'symbol' = bisheriges Schreib-Verhalten (Default, Golden-neutral);
//   action 'fn'     = Aufruf TcHmi.Functions.AC_HMI[fnName](param).
//   paramSource 'member' (Array) | 'col' (sichtbare Spalte) | 'index' (Zeilenindex) | 'none'.
const mkTableCol = (kind) => ({ id: eid("tc"), kind: kind || "read", header: "", headerLoc: "", member: "",
  unit: "", decimals: "", label: "", loc: "", writeMode: "setTrue", pulseMs: 300, map: [],
  sortable: false,
  action: "symbol", fnName: "", paramSource: "member", paramMember: "", paramCol: -1 });
const mkTableMapEntry = (value, label, color, icon) => ({ id: eid("tm"), value: value == null ? "" : value, label: label || "", loc: "", color: color || "grey", icon: icon || "info" });
const mkTableRow = (nCols) => ({ id: eid("tr"), cells: Array.from({ length: Math.max(1, nCols || 1) }, () => ({ symbol: "", text: "", loc: "" })) });
const mkTableRule = () => ({ id: eid("tu"), colIndex: 0, op: "==", value: "true", target: "row", color: "red" });
// Zeilenfilter: Zeile nur zeigen, wenn Bedingung erfuellt. op 'notEmpty'/'notZero' brauchen keinen Wert.
const mkRowFilter = () => ({ id: eid("tf"), colIndex: 0, op: "notZero", value: "" });

const newBlock = (type) => {
  switch (type) {
    case "text":   return { id: nid(), type, col: 0, heading: "", headingLoc: "", text: "Hinweis…", loc: "", bgColor: "", icon: "", iconColor: "" };
    case "read":   return { id: nid(), type, col: 0, label: "Wert", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xValue", unit: "" };
    case "bool":   return { id: nid(), type, col: 0, label: "Freigabe angeboten", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipReleaseOffered" };
    case "check":  return { id: nid(), type, col: 0, label: "Freigabe", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable" };
    case "input":  return { id: nid(), type, col: 0, label: "Sollwert", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint", dataType: "number", unit: "", sendLabel: "Setzen", sendLoc: "", sendColor: "blue", trigSym: "", trigMode: "pulse", trigMs: 500 };
    case "divider": return { id: nid(), type, col: 0, label: "", loc: "", inCol: false };
    case "progress": return { id: nid(), type, col: 0, label: "Ventilstellung", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPosition", min: 0, max: 100, unit: "%", decimals: 0, showValue: true, color: "blue" };
    case "plot": { const ax = mkAxis(PLOT_COLORS[0].hex); return { id: nid(), type, col: 0, caption: "Verlauf", captionLoc: "", dataMode: "live", followSec: 300, historyLoadSec: 3600, maxPoints: 3600, plotHeight: 360, showRangeslider: true, showXAxis: true, showToolbar: true, zoomEnabled: true, nowLabel: "Jetzt", nowLoc: "", resetLabel: "Zurücksetzen", resetLoc: "", timeButtons: defaultTimeButtons(), axes: [ax], series: [mkSeries(ax.id, PLOT_COLORS[1].hex)], refLines: [], eventMarkers: [] }; }
    case "table":  return { id: nid(), type, col: 0, caption: "", captionLoc: "",
      dataSource: "static", arraySymbol: "", arrayCount: 10, countSymbol: "", startIndex: 0, showIndex: false,
      columns: [mkTableCol("read")], rows: [mkTableRow(1)],
      search: true, pageSize: 0, striped: true, showHeader: true, watchLimit: 30, pollMs: 1000, rules: [], rowFilters: [],
      defaultSortCol: -1, defaultSortDir: "asc" };
    case "button": return { id: nid(), type, col: 0, buttons: [mkButton()] };
    case "row":    return { id: nid(), type, col: 0, items: [mkItem("read"), mkItem("input")] };
    case "enum":    return { id: nid(), type, col: 0, label: "Status", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eState", numeric: true, display: "text", map: [mkEnumEntry(0, "Aus", "grey"), mkEnumEntry(1, "Ein", "green")], fbLoc: "", fbText: "", fbColor: "grey" };
    case "enumset": return { id: nid(), type, col: 0, label: "Modus", loc: "", symbol: "ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eMode", numeric: true, map: [mkEnumEntry(0, "Hand"), mkEnumEntry(1, "Automatik")], sendButton: false, sendLabel: "Setzen", sendLoc: "", sendColor: "blue", trigSym: "", trigMode: "pulse", trigMs: 500 };
    case "status":  return { id: nid(), type, col: 0, label: "Status", loc: "", display: "badge",
      map: [mkStatusEntry("ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xRunning", "Läuft", "green"), mkStatusEntry("ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xFault", "Störung", "red")],
      fbLoc: "", fbText: "Bereit", fbColor: "grey" };
    default:       return { id: nid(), type: "text", col: 0, text: "", loc: "" };
  }
};

export {
  mkTableCol, mkTableMapEntry, mkTableRow, mkTableRule, mkRowFilter,
  mkButton, mkItem, mkCond, mkEnumEntry, mkStatusEntry, newBlock,
  mkAxis, mkSeries, mkRef, mkMapping, mkMarker,
  mkTimeBtn, DEFAULT_TIME_BUTTONS, defaultTimeButtons,
};