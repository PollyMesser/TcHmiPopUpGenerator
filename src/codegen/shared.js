import { jsStr, wrapSym, locExpr, attrName, I } from "./helpers.js";
import { groupByCol } from "../model/layout.js";
import { ICONS } from "../constants/palette.js";

// ── Trennlinie: horizontale Linie, optional mittig beschriftet (volle Breite) ──
function emitDivider(parent, b) {
  const label = (b.label || "").trim();
  const loc = (b.loc || "").trim();
  if (!label && !loc) {
    return `${I}// Trennlinie\n${I}(function () {\n${I}    var hr = document.createElement('div');\n${I}    hr.style.cssText = 'height:1px;background:' + p.border + ';margin:6px 0 18px;';\n${I}    ${parent}.appendChild(hr);\n${I}})();`;
  }
  return `${I}// Trennlinie mit Beschriftung\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'display:flex;align-items:center;gap:12px;margin:6px 0 18px;';\n${I}    var l1 = document.createElement('div'); l1.style.cssText = 'flex:1;height:1px;background:' + p.border + ';';\n${I}    var cap = document.createElement('span'); cap.style.cssText = 'flex:0 0 auto;font-size:12px;font-weight:600;letter-spacing:0.3px;color:' + p.closeColor + ';';\n${I}    cap.textContent = ${locExpr(b.loc, b.label)};\n${I}    var l2 = document.createElement('div'); l2.style.cssText = 'flex:1;height:1px;background:' + p.border + ';';\n${I}    wrap.appendChild(l1); wrap.appendChild(cap); wrap.appendChild(l2);\n${I}    ${parent}.appendChild(wrap);\n${I}})();`;
}

// ── Ein Spalten-Grid-Segment (nur Nicht-Zeilen-Bausteine), Basis 20 ──
function gridSegment(items, cols, emit, gi) {
  if (cols <= 1) {
    return items.map((b) => emit(b, "body")).join("\n\n");
  }
  const grouped = groupByCol(items, cols);
  const g = "grid" + gi;
  let out = `${I}var ${g} = document.createElement('div');\n${I}${g}.style.cssText = 'display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:0;align-items:start;';\n`;
  for (let c = 0; c < cols; c++) {
    const pv = `g${gi}c${c}`;
    const padL = c === 0 ? 0 : 24;
    const padR = c === cols - 1 ? 0 : 24;
    const borderExpr = c > 0 ? ` + 'border-left:1px solid ' + p.border + ';'` : "";
    out += `${I}var ${pv} = document.createElement('div');\n`;
    out += `${I}${pv}.style.cssText = 'min-width:0;padding-left:${padL}px;padding-right:${padR}px;'${borderExpr};\n`;
    out += `${I}${g}.appendChild(${pv});\n`;
    const arr = grouped[c];
    out += arr.length ? "\n" + arr.map((b) => emit(b, pv)).join("\n\n") + "\n" : `${I}// (Spalte ${c + 1} leer)\n`;
  }
  out += `${I}body.appendChild(${g});`;
  return out;
}

// ── Body-Inhalt: Zeilen (row) sind volle Breite und brechen das Spalten-Grid ──
function buildBodyContent(blocks, cols, emit) {
  const parts = [];
  let seg = [];
  const flush = () => { if (seg.length) { parts.push({ kind: "grid", items: seg }); seg = []; } };
  blocks.forEach((b) => {
    if (b.type === "row" || b.type === "plot" || (b.type === "divider" && !b.inCol)) { flush(); parts.push({ kind: "row", block: b }); }
    else seg.push(b);
  });
  flush();
  if (parts.length === 0) return `${I}// (noch keine Bausteine)`;

  let gi = 0;
  const chunks = parts.map((part) => {
    if (part.kind === "row") return emit(part.block, "body"); // volle Breite
    return gridSegment(part.items, cols, emit, gi++);
  });
  return chunks.join("\n\n");
}

// ── Titel-Statement (statisch, oder dynamisch aus Attribut/Symbol) ──
// Erzeugt jetzt SELBST die Titel-Elemente (vormals eine feste Zeile in Templates.js).
// Ohne Symbol: 'title' == 'titleText' (die Textspanne selbst) -> unveraendertes Verhalten.
// Mit Symbol: 'title' ist ein Flex-Wrapper [Symbol][titleText]; der Text-Span 'titleText'
// bleibt die einzige Stelle, die textContent gesetzt bekommt (auch im subscribe-Callback) -
// so bricht ein spaeteres Reassignment von 'title' den dynamischen Titel nicht.
function buildTitleStmt(mode, source, field, fallback, titleExpr, icon, iconColor) {
  const pad = "                    "; // 20 Leerzeichen
  const textStmt = source !== "dynamic"
    ? `${pad}titleText.textContent = ${titleExpr};`
    : mode === "usercontrol"
      ? `${pad}titleText.textContent = gv(${jsStr(attrName(field))}, ${jsStr(fallback || "")});`
      : `${pad}titleText.textContent = ${jsStr(fallback || "")};\n${pad}subscribe(${jsStr(wrapSym(field))}, function (v) { titleText.textContent = String(v); });`;
  const base = `${pad}var titleText = document.createElement('span');\n${textStmt}`;
  const ic = icon && ICONS[icon];
  if (!ic) return `${base}\n${pad}var title = titleText;`;
  const iconColorExpr = iconColor ? jsStr(iconColor) : `p.titleColor`;
  return `${base}\n` +
    `${pad}var titleIco = document.createElement('span');\n` +
    `${pad}titleIco.style.cssText = 'display:inline-flex;line-height:0;flex:0 0 auto;color:' + ${iconColorExpr} + ';';\n` +
    `${pad}titleIco.innerHTML = ${jsStr(ic.svg)};\n` +
    `${pad}var titleSvg = titleIco.querySelector('svg'); if (titleSvg) { titleSvg.setAttribute('width', '1em'); titleSvg.setAttribute('height', '1em'); }\n` +
    `${pad}var title = document.createElement('span');\n` +
    `${pad}title.style.cssText = 'display:inline-flex;align-items:center;gap:8px;min-width:0;';\n` +
    `${pad}title.appendChild(titleIco);\n` +
    `${pad}title.appendChild(titleText);`;
}

export { emitDivider, gridSegment, buildBodyContent, buildTitleStmt };