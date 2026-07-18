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

export {
  jsStr, wrapSym, locExpr, sanitizeFn,
  wrapSymAny, unitSuffix, indentLines,
  attrName, dedent, I,
  litValue, cmpExpr, condOp, condVal, REF,
};
