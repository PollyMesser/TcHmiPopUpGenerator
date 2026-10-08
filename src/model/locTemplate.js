// ── Text-Vorlagen fuer Tabellen-Textspalten (dynamischer Loc-Key je Zeile) ──
//
// Syntax (Eingabe im Editor, Feld „LOC-KEY-VORLAGE" bzw. „FALLBACK-VORLAGE"):
//   L_alarm{1}          -> "L_alarm" + Wert aus Spalte 1 (1-basiert, wie im Editor angezeigt)
//   L_alarm + {1}       -> identisch; „+" ist optionaler Verkettungs-Operator (JS-Stil)
//   "L_alarm" + {1}     -> identisch; Segmente zwischen „+" duerfen in "…" oder '…' stehen
//   L_alarm{1:3}        -> Zahl auf 3 Stellen mit fuehrenden Nullen: 2 -> "002", 101 -> "101"
//   L_alarm{nId}        -> Struct-Member nId der Zeile (nur PLC-Array). Muss keine Spalte sein.
//   L_row{#}            -> Zeilenindex (START-INDEX + Zeile)
//   Alarm {1}           -> ohne „+" bleibt der Text woertlich (inkl. Leerzeichen) – fuer Fallbacks
//
// Ergebnis von parseTpl(): { parts, errors }
//   parts: Array aus Literal-Strings und Referenz-Objekten
//          { c: <Spaltenindex 0-basiert>, p?: <Stellen> } | { m: "<member>", p? } | { x: 1, p? }
//   errors: deutschsprachige Hinweise fuer den Editor (leeres Array = OK)

const MAX_PAD = 12;

// Top-Level-Split an „+" (ausserhalb von {…} und "…"/'…').
function splitPlus(src) {
  const segs = [];
  let cur = "", depth = 0, quote = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) { cur += ch; if (ch === quote) quote = ""; continue; }
    if (ch === "\"" || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === "{") depth++;
    if (ch === "}" && depth > 0) depth--;
    if (ch === "+" && depth === 0) { segs.push(cur); cur = ""; continue; }
    cur += ch;
  }
  segs.push(cur);
  return segs;
}

function unquote(s) {
  if (s.length >= 2 && (s[0] === "\"" || s[0] === "'") && s[s.length - 1] === s[0]) return { text: s.slice(1, -1), quoted: true };
  return { text: s, quoted: false };
}

function parseRef(inner, errors) {
  const raw = inner.trim();
  let name = raw, pad = 0;
  const colon = raw.indexOf(":");
  if (colon >= 0) {
    name = raw.slice(0, colon).trim();
    const ps = raw.slice(colon + 1).trim();
    const pn = parseInt(ps, 10);
    if (!/^[0-9]+$/.test(ps) || isNaN(pn) || pn < 1 || pn > MAX_PAD) { errors.push(`{${raw}}: Stellenzahl nach „:" muss 1–${MAX_PAD} sein.`); return null; }
    pad = pn;
  }
  const withPad = (o) => (pad ? { ...o, p: pad } : o);
  if (name === "#") return withPad({ x: 1 });
  if (/^[0-9]+$/.test(name)) {
    const n = parseInt(name, 10);
    if (n < 1) { errors.push(`{${raw}}: Spaltennummern beginnen bei 1.`); return null; }
    return withPad({ c: n - 1 });
  }
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(name)) return withPad({ m: name });
  errors.push(`{${raw}}: unbekannte Referenz – erlaubt sind Spaltennummer (z. B. {1}), Member (z. B. {nId}) oder {#}.`);
  return null;
}

// Ein Segment in Literal-/Referenz-Teile zerlegen. Quoted-Segmente bleiben reines Literal.
function parseSegment(seg, quoted, parts, errors) {
  if (quoted) { if (seg) parts.push(seg); return; }
  let i = 0, lit = "";
  while (i < seg.length) {
    const ch = seg[i];
    if (ch === "{") {
      const end = seg.indexOf("}", i + 1);
      if (end < 0) { errors.push("Fehlende schließende Klammer „}\"."); lit += seg.slice(i); break; }
      const ref = parseRef(seg.slice(i + 1, end), errors);
      if (ref) { if (lit) { parts.push(lit); lit = ""; } parts.push(ref); }
      i = end + 1;
      continue;
    }
    if (ch === "}") { errors.push("Schließende Klammer „}\" ohne öffnende."); i++; continue; }
    lit += ch; i++;
  }
  if (lit) parts.push(lit);
}

function parseTpl(src) {
  const s = String(src == null ? "" : src);
  const parts = [], errors = [];
  if (!s.trim()) return { parts, errors };
  const segs = splitPlus(s);
  if (segs.length === 1) {
    // Kein Operator: woertlich (nur aeussere Leerzeichen weg), ggf. komplett gequotet
    const u = unquote(s.trim());
    parseSegment(u.text, u.quoted, parts, errors);
  } else {
    segs.forEach((raw) => {
      const t = raw.trim();
      if (!t) { errors.push("Leerer Ausdruck neben „+\"."); return; }
      const u = unquote(t);
      parseSegment(u.text, u.quoted, parts, errors);
    });
  }
  // Benachbarte Literale zusammenfassen (kompakteres JSON im Output)
  const merged = [];
  parts.forEach((pt) => {
    if (typeof pt === "string" && typeof merged[merged.length - 1] === "string") merged[merged.length - 1] += pt;
    else merged.push(pt);
  });
  return { parts: merged, errors };
}

// Referenzen gegen die Tabellen-Konfiguration pruefen (fuer Editor-Hinweise).
const BOUND_KINDS = ["read", "bool", "check", "input", "enum", "icon"];
function checkTplRefs(parts, columns, isArray) {
  const warn = [];
  (parts || []).forEach((pt) => {
    if (typeof pt === "string") return;
    if (pt.c != null) {
      const col = (columns || [])[pt.c];
      if (!col) warn.push(`Spalte ${pt.c + 1} existiert nicht.`);
      else if (!BOUND_KINDS.includes(col.kind)) warn.push(`Spalte ${pt.c + 1} (${col.kind}) liefert keinen PLC-Wert.`);
    }
    if (pt.m && !isArray) warn.push(`{${pt.m}}: Member-Referenzen gibt es nur bei Datenquelle „PLC-Array".`);
  });
  return warn;
}

// Vorschau-Text fuer den Editor: Referenzen als ‹…› darstellen.
function tplPreview(parts, columns) {
  return (parts || []).map((pt) => {
    if (typeof pt === "string") return pt;
    const pad = pt.p ? ":" + pt.p : "";
    if (pt.x) return `‹#${pad}›`;
    if (pt.m) return `‹${pt.m}${pad}›`;
    const col = (columns || [])[pt.c];
    const nm = col ? (col.member || col.header || `Spalte ${pt.c + 1}`) : `Spalte ${pt.c + 1}`;
    return `‹${nm}${pad}›`;
  }).join("");
}

// Spaltennummern in einer Vorlage umschreiben (bei Spalte verschieben/loeschen).
// mapFn(alterIndex0) -> neuerIndex0 | null (null = Spalte geloescht -> Referenz bleibt
// als ungueltige Nummer stehen, damit der Editor warnt statt still etwas zu aendern).
function remapTplCols(src, mapFn) {
  const s = String(src == null ? "" : src);
  if (!s) return s;
  let out = "", quote = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) { out += ch; if (ch === quote) quote = ""; continue; }
    if (ch === "\"" || ch === "'") { quote = ch; out += ch; continue; }
    if (ch === "{") {
      const end = s.indexOf("}", i + 1);
      if (end < 0) { out += s.slice(i); break; }
      const inner = s.slice(i + 1, end);
      const m = /^(\s*)([0-9]+)(\s*(:.*)?)$/.exec(inner);
      if (m) {
        const n0 = parseInt(m[2], 10) - 1;
        const nn = n0 >= 0 ? mapFn(n0) : null;
        out += "{" + m[1] + (nn == null ? "0" : String(nn + 1)) + m[3] + "}";
      } else out += "{" + inner + "}";
      i = end;
      continue;
    }
    out += ch;
  }
  return out;
}

export { parseTpl, checkTplRefs, tplPreview, remapTplCols };
