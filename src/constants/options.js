import {
  Type, Eye, CircleDot, MousePointerClick, PencilLine, ToggleLeft, Columns2,
  Braces, Zap, Box, List, ChevronsUpDown, Tag, Gauge, LineChart, Minus, Table,
} from "lucide-react";

// ── Ausgabemodi (Alt-Struktur, weiter für Rückwärtskompatibilität referenziert) ──
const OUTPUT_MODES = {
  registered:  { label: "Registrierte Funktion", icon: Braces, hint: "registerFunctionEx, per Symbol (ADS)" },
  event:       { label: "Event-JavaScript",       icon: Zap,    hint: "Reiner JS-Block fürs Event, per Symbol (ADS)" },
  usercontrol: { label: "UserControl-JS",         icon: Box,    hint: "An Host-Control gebunden, per Attribut (getX/setX)" },
  embed:       { label: "Eingebettet",            icon: Box,    hint: "In Zielcontainer statt Overlay; fn(target)+fnDestroy(target) an onAttached/onDetached" },
};

// ── Zwei getrennte Achsen: Funktionsart × Darstellung ──
// Der gespeicherte `mode` bleibt EIN String (byte-schonend, keine neuen Config-
// Felder für Bestands-Popups). Die Oberfläche splittet ihn in zwei Auswahlen.
const FUNCTION_TYPES = {
  registered:  { label: "Registrierte Funktion", icon: Braces, hint: "registerFunctionEx, aufrufbar per CallFunction – per Symbol (ADS)" },
  event:       { label: "Event-JavaScript",       icon: Zap,    hint: "Reiner JS-Block direkt im Control-Event – per Symbol (ADS)" },
  usercontrol: { label: "UserControl-JS",         icon: Box,    hint: "An ein UserControl gebunden – per Attribut (getX/setX)" },
};
const RENDER_MODES = {
  popup: { label: "Popup (Overlay)", hint: "Verschiebbares Overlay-Fenster mit Kopfzeile" },
  embed: { label: "Eingebettet",     hint: "Direkt in einen Zielcontainer, kein Overlay; Größe orientiert sich am Elternelement" },
};
// mode <-> (functionType, render)
const MODE_MATRIX = {
  registered:  { fn: "registered",  render: "popup" },
  event:       { fn: "event",       render: "popup" },
  usercontrol: { fn: "usercontrol", render: "popup" },
  embed:       { fn: "registered",  render: "embed" },
  embedEvent:  { fn: "event",       render: "embed" },
  embedUc:     { fn: "usercontrol", render: "embed" },
};
const functionTypeOf = (mode) => (MODE_MATRIX[mode] || MODE_MATRIX.registered).fn;
const renderOf = (mode) => (MODE_MATRIX[mode] || MODE_MATRIX.registered).render;
const modeOf = (fn, render) => (render === "embed"
  ? (fn === "event" ? "embedEvent" : fn === "usercontrol" ? "embedUc" : "embed")
  : (fn === "event" ? "event" : fn === "usercontrol" ? "usercontrol" : "registered"));
// UC-Datenzugriff (getX/setX + Polling) gilt für UC-Popup UND UC-Embed.
const isUC = (mode) => mode === "usercontrol" || mode === "embedUc";
const isEmbed = (mode) => renderOf(mode) === "embed";

const BLOCK_META = {
  text:   { label: "Text",            icon: Type,              hint: "Statischer Text" },
  read:   { label: "Wert lesen",      icon: Eye,               hint: "Variable anzeigen" },
  bool:   { label: "Boolean-Anzeige", icon: CircleDot,         hint: "Grün = aktiv, grau = inaktiv" },
  check:  { label: "Boolean setzen",  icon: ToggleLeft,        hint: "Checkbox, Variable schreiben" },
  input:  { label: "Eingabefeld",     icon: PencilLine,        hint: "Wert schreiben + Senden" },
  progress:{ label: "Ladebalken",     icon: Gauge,             hint: "Prozent/Wert als Balken (z.B. Proportionalventil)" },
  plot:   { label: "Verlauf (Plot)",  icon: LineChart,         hint: "Plotly-Trend, volle Breite" },
  table: { label: "Tabelle", icon: Table, hint: "Such-/blätterbare Tabelle (statisch oder aus PLC-Array)" },
  button: { label: "Buttons",         icon: MousePointerClick, hint: "1–2 Buttons, Variable schreiben" },
  row:    { label: "Zeile",           icon: Columns2,          hint: "2 Elemente nebeneinander" },
  enum:   { label: "Enum-Anzeige",    icon: List,              hint: "Wert → Klartext (Loc)" },
  enumset:{ label: "Enum setzen",     icon: ChevronsUpDown,    hint: "Dropdown, Wert → Klartext" },
  status: { label: "Status (Bools)",  icon: Tag,               hint: "Mehrere Bools → Tag/Text mit Farbe" },
  divider:{ label: "Trennlinie",      icon: Minus,             hint: "Horizontale Linie (optional beschriftet), volle Breite oder in einer Spalte" },
};

const WRITE_OPTS = [
  { value: "pulse", label: "Impuls (true → false)" },
  { value: "setTrue", label: "Auf true setzen" },
  { value: "setFalse", label: "Auf false setzen" },
  { value: "toggle", label: "Umschalten (toggle)" },
  { value: "hold", label: "Tippbetrieb (halten)" },
  { value: "holdConfirm", label: "Halten zum Bestätigen (Timer)" },
];
const ITEM_KINDS = [
  { value: "read", label: "Wert lesen" },
  { value: "bool", label: "Boolean-Anzeige" },
  { value: "check", label: "Boolean setzen" },
  { value: "input", label: "Eingabefeld" },
  { value: "button", label: "Button" },
];

// ── Zeitraum-Buttons (Plotly rangeselector) ──
const TIME_UNITS = [
  { value: "second", label: "Sekunden" }, { value: "minute", label: "Minuten" },
  { value: "hour", label: "Stunden" }, { value: "day", label: "Tage" },
  { value: "month", label: "Monate" }, { value: "year", label: "Jahre" },
  { value: "all", label: "Alle (gesamt)" },
];

// ── Gruppen-Berechtigungen (TcHMI-UserManagement) ──
// Feste Gruppenliste (deckt den aktuellen Anlagenfall ab). Die Auflösung zur
// Laufzeit nutzt TcHmi.Server.getCurrentUserConfig().userIsInGroups.
// Semantik pro Recht: Whitelist / "Allow gewinnt" – nur Gruppen mit "Allow"
// sehen (observe) bzw. bedienen (operate) das Element; alle anderen nicht.
const ACCESS_GROUPS = ["Admin", "Service", "Process_Engineer", "Operator"];
const ACCESS_RIGHTS = [
  { key: "observe", label: "Sehen (observe)", hint: "Deny → Element wird ausgeblendet" },
  { key: "operate", label: "Bedienen (operate)", hint: "Deny → Element sichtbar, aber deaktiviert" },
];

export {
  OUTPUT_MODES, FUNCTION_TYPES, RENDER_MODES, MODE_MATRIX,
  functionTypeOf, renderOf, modeOf, isUC, isEmbed,
  BLOCK_META, WRITE_OPTS, ITEM_KINDS, TIME_UNITS, ACCESS_GROUPS, ACCESS_RIGHTS,
};