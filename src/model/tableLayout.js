// ── Tabellen-Darstellung (Touch / Kompakt) und Feldbreiten ──
// 'touch'   = Touch-Layout: Groessenstufen aus TABLE_SIZES (palette.js), grosse Bedienelemente,
//             ganze Checkbox-Zelle tippbar, grosse Blaetter-Buttons, einheitliche Feldbreiten
// 'compact' = bisherige kompakte Darstellung (Maus)
// TABLE_LAYOUT_DEFAULT gilt fuer Tabellen OHNE gespeichertes 'layout' (auch Bestandskonfigurationen).
// Vorerst 'compact' -> Bestands-Goldens byte-identisch. Das Umschalten auf 'touch' erfolgt als
// eigener Commit mit Re-Record der Tabellen-Goldens (Entscheidung 2026-10-15: Touch ist Standard).
import { TABLE_SIZES } from "../constants/palette.js";

const TABLE_LAYOUTS = [
  { value: "touch", label: "Touch" },
  { value: "compact", label: "Kompakt (Maus)" },
];
const TABLE_LAYOUT_DEFAULT = "compact";
const TABLE_SIZE_DEFAULT = "m";

const tableLayoutOf = (b) => ((b && (b.layout === "touch" || b.layout === "compact")) ? b.layout : TABLE_LAYOUT_DEFAULT);
const tableSizeOf = (b) => ((b && TABLE_SIZES[b.size]) ? b.size : TABLE_SIZE_DEFAULT);

// Feldbreite (Zeichen, Einheit ch) einer Eingabe-Spalte im Touch-Layout.
// Explizit gesetzt (1..40) gewinnt; sonst automatisch aus Eingabe-Typ, Nachkommastellen
// und Einheit. Gilt fuer Texteingabe UND Keypad-Button -> alle Felder einer Spalte gleich breit.
function autoFieldWidth(c, isArr = true) {
  const t = c.inputType;
  if (t === "time") return 9;                                   // HH:MM:SS
  if (t === "text") return 12;
  const dec = (c.decimals === "" || c.decimals == null) ? -1 : Math.max(0, parseInt(c.decimals) || 0);
  let w = dec >= 0 ? Math.max(5, 5 + (dec > 0 ? dec + 1 : 0)) : 7; // Ziffern + Komma + Stellen
  const keypad = !!c.keypad;                                    // Keypad-Button zeigt die Einheit mit an
  if (keypad && isArr && (c.unitMember || "").trim()) w += 7;            // Einheit-Span je Zeile (min. 3.2em + Abstand), nur Array-Modus
  else if (keypad && (c.unit || "").trim()) w += (c.unit || "").trim().length + 1;
  return w;
}
function fieldWidthOf(c, isArr = true) {
  const n = parseInt(c.fieldWidth);
  if (!isNaN(n) && n >= 1) return Math.min(40, n);
  return autoFieldWidth(c, isArr);
}

// ── Zeilen pro Seite: 'fixed' (pageSize, 0 = ohne Blaettern) oder 'auto' (aus verfuegbarer Hoehe) ──
// Auto: Zeilenzahl = verfuegbare Hoehe / Mindest-Zeilenhoehe, begrenzt auf [pageMin, pageMax];
// im Touch-Layout wird der Restplatz bis rowHMax auf die Zeilen verteilt (Tabelle fuellt die Hoehe).
const PAGE_AUTO_MIN = 3, PAGE_AUTO_MAX = 50;
const intIn = (v, def, lo, hi) => { const n = parseInt(v); return (isNaN(n) || n < lo) ? def : Math.min(hi, n); };
function pageAutoOf(b) {
  if (!b || b.pageMode !== "auto") return null;
  const mn = intIn(b.pageMin, PAGE_AUTO_MIN, 1, 500);
  const mx = Math.max(mn, intIn(b.pageMax, PAGE_AUTO_MAX, 1, 500));
  const touch = tableLayoutOf(b) === "touch";
  const S = TABLE_SIZES[tableSizeOf(b)];
  const rhMax = touch ? Math.max(S.rh, intIn(b.rowHMax, S.rhMax, 1, 200)) : 0;
  return { min: mn, max: mx, rhMin: touch ? S.rh : 0, rhMax };
}

export { PAGE_AUTO_MIN, PAGE_AUTO_MAX, pageAutoOf, TABLE_LAYOUTS, TABLE_LAYOUT_DEFAULT, TABLE_SIZE_DEFAULT, tableLayoutOf, tableSizeOf, autoFieldWidth, fieldWidthOf };
