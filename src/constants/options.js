import {
  Type, Eye, CircleDot, MousePointerClick, PencilLine, ToggleLeft, Columns2,
  Braces, Zap, Box, List, ChevronsUpDown, Tag, Gauge, LineChart, Minus, Table,
} from "lucide-react";

// ── Ausgabemodi ──
const OUTPUT_MODES = {
  registered:  { label: "Registrierte Funktion", icon: Braces, hint: "registerFunctionEx, per Symbol (ADS)" },
  event:       { label: "Event-JavaScript",       icon: Zap,    hint: "Reiner JS-Block fürs Event, per Symbol (ADS)" },
  usercontrol: { label: "UserControl-JS",         icon: Box,    hint: "An Host-Control gebunden, per Attribut (getX/setX)" },
  embed:       { label: "Eingebettet",            icon: Box,    hint: "In Zielcontainer statt Overlay; fn(target)+fnDestroy(target) an onAttached/onDetached" },
};

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

export { OUTPUT_MODES, BLOCK_META, WRITE_OPTS, ITEM_KINDS, TIME_UNITS };