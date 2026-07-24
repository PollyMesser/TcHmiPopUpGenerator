// ── Code-Generierung: gemeinsame Helfer ──
const jsStr = (s) => JSON.stringify(s == null ? "" : String(s));
const wrapSym = (s) => { s = (s || "").trim(); if (!s) return ""; return s.includes("%s%") ? s : "%s%" + s + "%/s%"; };
const locExpr = (key, text) => { const k = (key || "").trim(); return k ? `loc(${jsStr(k)}, ${jsStr(text)})` : jsStr(text); };
const sanitizeFn = (s) => { const c = (s || "").replace(/[^A-Za-z0-9_$]/g, ""); return /^[A-Za-z_$]/.test(c) ? c : "AC_" + c; };

// ── Plot-Helfer (aus dem ChartPop übernommen) ──
// Marker-Symbole dürfen HMI-intern sein (%i%…%/i%): beginnt der Ausdruck mit '%', unverändert lassen.
const wrapSymAny = (s) => { s = (s || "").trim(); if (!s) return ""; return s.charAt(0) === "%" ? s : "%s%" + s + "%/s%"; };
// Einheit als Suffix: '%' ohne Leerzeichen, sonst mit führendem Leerzeichen (wie im pumpPopup)
const unitSuffix = (u) => { u = (u || "").trim(); return u ? (u === "%" ? u : " " + u) : ""; };
const indentLines = (s, pad) => s.split("\n").map((l) => (l.length ? pad + l : l)).join("\n");

const attrName = (s) => {
  s = (s || "").trim();
  if (s.indexOf("::") >= 0) s = s.split("::").pop();
  s = s.replace(/^%s%/, "").replace(/%\/s%$/, "");
  s = s.replace(/[^A-Za-z0-9_]/g, "");
  return s || "Value";
};
const dedent = (s, n) => s.replace(new RegExp("^ {" + n + "}", "gm"), "");
const I = "                    "; // 20 Leerzeichen

// ── Bedingungs-Vergleich (bool / int / enum) ──
const litValue = (s) => {
  s = (s == null ? "" : String(s)).trim();
  if (s === "true") return "true";
  if (s === "false") return "false";
  if (s !== "" && !isNaN(Number(s))) return String(Number(s));
  return JSON.stringify(s);
};
const cmpExpr = (readExpr, op, valueStr) => {
  const lit = litValue(valueStr);
  switch (op) {
    case "!=": return `${readExpr} != ${lit}`;
    case "<":  return `Number(${readExpr}) < ${lit}`;
    case "<=": return `Number(${readExpr}) <= ${lit}`;
    case ">":  return `Number(${readExpr}) > ${lit}`;
    case ">=": return `Number(${readExpr}) >= ${lit}`;
    default:   return `${readExpr} == ${lit}`;
  }
};
const condOp = (c) => (c.op || "==");
const condVal = (c) => (c.op != null ? c.value : (c.equals ? "true" : "false"));

const REF = '/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />';

// ── TIME: ISO-8601-Dauer (z. B. PT3H5M20S) <-> HH:MM:SS ──
// Als Quelltext-String fuer die generierten IIFEs (Symbol- und UC-Input teilen sich das).
// Backslash-frei: kein Regex-Escape, nur charAt/split/slice. Einrueckung == I + 4 Leerzeichen.
// pad = Basis-Einrueckung der Helfer (Default I fuer die Symbol-/UC-IIFEs).
// Fuer das Tabellenmodul wird pad="" uebergeben (dessen Funktionen liegen auf
// 4-Space-Ebene, indentLines(core, I) haengt die 20 Basisspaces spaeter an).
const durHelpers = (pad = I) =>
  `\n${pad}    function durToHMS(iso) {` +
  `\n${pad}        iso = String(iso == null ? '' : iso).trim().toUpperCase();` +
  `\n${pad}        if (iso.charAt(0) !== 'P') return iso;` +
  `\n${pad}        var days = 0, hh = 0, mm = 0, ss = 0, ms = 0, num = '', inTime = false;` +
  `\n${pad}        for (var k = 1; k < iso.length; k++) {` +
  `\n${pad}            var ch = iso.charAt(k);` +
  `\n${pad}            if (ch === 'T') { inTime = true; num = ''; continue; }` +
  `\n${pad}            if (ch === '.' || ch === ',') { num += '.'; continue; }` +
  `\n${pad}            if (ch >= '0' && ch <= '9') { num += ch; continue; }` +
  `\n${pad}            var val = parseFloat(num || '0'); num = '';` +
  `\n${pad}            if (ch === 'D') days = val;` +
  `\n${pad}            else if (ch === 'H') hh = val;` +
  `\n${pad}            else if (ch === 'M') { if (inTime) mm = val; }` +
  `\n${pad}            else if (ch === 'S') { ss = Math.floor(val); ms = Math.round((val - ss) * 1000); }` +
  `\n${pad}        }` +
  `\n${pad}        var totalH = days * 24 + hh;` +
  `\n${pad}        function p2(n) { n = Math.floor(n); return (n < 10 ? '0' : '') + n; }` +
  `\n${pad}        var out = p2(totalH) + ':' + p2(mm) + ':' + p2(ss);` +
  `\n${pad}        if (ms > 0) { var mstr = String(ms); while (mstr.length < 3) mstr = '0' + mstr; out += '.' + mstr; }` +
  `\n${pad}        return out;` +
  `\n${pad}    }` +
  `\n${pad}    function hmsToDur(str) {` +
  `\n${pad}        str = String(str == null ? '' : str).trim();` +
  `\n${pad}        if (str === '') return 'PT0S';` +
  `\n${pad}        if (str.charAt(0) === 'P' || str.charAt(0) === 'p') return str.toUpperCase();` +
  `\n${pad}        var ms = 0, dot = str.indexOf('.');` +
  `\n${pad}        if (dot >= 0) { var frac = (str.slice(dot + 1) + '000').slice(0, 3); ms = parseInt(frac, 10) || 0; str = str.slice(0, dot); }` +
  `\n${pad}        var parts = str.split(':'), h = 0, m = 0, s = 0;` +
  `\n${pad}        if (parts.length === 3) { h = parseInt(parts[0], 10) || 0; m = parseInt(parts[1], 10) || 0; s = parseInt(parts[2], 10) || 0; }` +
  `\n${pad}        else if (parts.length === 2) { m = parseInt(parts[0], 10) || 0; s = parseInt(parts[1], 10) || 0; }` +
  `\n${pad}        else { s = parseInt(parts[0], 10) || 0; }` +
  `\n${pad}        var total = h * 3600 + m * 60 + s;` +
  `\n${pad}        var oh = Math.floor(total / 3600), om = Math.floor((total % 3600) / 60), os = total % 60;` +
  `\n${pad}        var sStr = (ms > 0) ? (os + '.' + ('00' + ms).slice(-3)) : String(os);` +
  `\n${pad}        return 'PT' + oh + 'H' + om + 'M' + sStr + 'S';` +
  `\n${pad}    }`;

export {
  jsStr, wrapSym, locExpr, sanitizeFn,
  wrapSymAny, unitSuffix, indentLines,
  attrName, dedent, I,
  litValue, cmpExpr, condOp, condVal, REF, durHelpers,
};