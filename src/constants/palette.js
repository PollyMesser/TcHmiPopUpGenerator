// ── Button-Grundfarben (funktionieren in Dark + Light) ──
const COLORS = {
  blue:   { bg: "#3b82f6", text: "#ffffff", label: "Blau" },
  green:  { bg: "#22c55e", text: "#06240f", label: "Grün" },
  yellow: { bg: "#f59e0b", text: "#1a1a1a", label: "Gelb" },
  red:    { bg: "#ef4444", text: "#ffffff", label: "Rot" },
  grey:   { bg: "#6b7280", text: "#ffffff", label: "Grau" },
};

// ── Hintergrundfarben NUR für Textfelder (Buttons/Badges bleiben unberührt) ──
const TEXT_BG = {
  ...COLORS,
  alarm: { bg: "#fde047", text: "#1a1a1a", label: "Alarmgelb" },
};

// ── Einfügbare Symbole für Textfelder (monochrom, currentColor → frei einfärbbar) ──
// WICHTIG: Attribute NUR mit einfachen Anführungszeichen. JSON.stringify (jsStr) erzeugt
// sonst maskierte doppelte Anführungszeichen -> Backslashes, die die TcHMI-JS-Einbettung
// entfernt. Es darf KEIN Backslash im SVG vorkommen.
const ICONS = {
  warning: { label: "Warndreieck", svg: "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>" },
  alert:   { label: "Achtung (Kreis)", svg: "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>" },
  info:    { label: "Info", svg: "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='16' x2='12' y2='12'/><line x1='12' y1='8' x2='12.01' y2='8'/></svg>" },
  success: { label: "OK / Erledigt", svg: "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg>" },
  stop:    { label: "Stopp", svg: "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/></svg>" },
};

// ── Linienfarben-Palette für Plots (Traces, Achsen, Referenzlinien, Marker) ──
const PLOT_COLORS = [
  { hex: "#3b82f6", name: "Blau" }, { hex: "#22c55e", name: "Grün" },
  { hex: "#f59e0b", name: "Orange" }, { hex: "#ef4444", name: "Rot" },
  { hex: "#a855f7", name: "Violett" }, { hex: "#06b6d4", name: "Cyan" },
  { hex: "#ec4899", name: "Pink" }, { hex: "#84cc16", name: "Limette" },
  { hex: "#eab308", name: "Gelb" }, { hex: "#14b8a6", name: "Türkis" },
];
const DASH_OPTS = [
  { value: "solid", label: "Durchgezogen" }, { value: "dash", label: "Gestrichelt" },
  { value: "dot", label: "Gepunktet" }, { value: "dashdot", label: "Strich-Punkt" },
];
const MAX_AXES = 4;

// ── Tabellen-Groessenstufen (Touch-Layout) ──
// Zentrale Skala fuer Schrift, Zeilenhoehe und Bedienelemente der Tabelle. Wird im
// generierten Code als CSS-Variablen am Tabellen-Wrapper gesetzt; alle Zellen-Styles
// referenzieren nur var(--ac-…). Erster Schritt zur zentralen Schriftgroessen-Skala.
//   fs  = Zellenschrift          hfs = Kopf/Buttons/Badges   rh = Zeilenhoehe (Minimum)
//   ctl = Checkbox-Kantenlaenge  led = LED-Durchmesser
//   pb  = Pager-Button (Kante)   pfs = Pager-Schrift
// Alle Werte in px. M ist auf das 1280x800-Panel (Touch) abgestimmt.
const TABLE_SIZES = {
  s: { label: "S – dicht", fs: 16, hfs: 15, rh: 40, ctl: 24, led: 18, pb: 40, pfs: 20 },
  m: { label: "M – Standard (Panel 1280×800)", fs: 18, hfs: 16, rh: 46, ctl: 28, led: 22, pb: 44, pfs: 22 },
  l: { label: "L – groß", fs: 20, hfs: 18, rh: 54, ctl: 32, led: 26, pb: 52, pfs: 26 },
};

export { COLORS, TEXT_BG, ICONS, PLOT_COLORS, DASH_OPTS, MAX_AXES, TABLE_SIZES };
