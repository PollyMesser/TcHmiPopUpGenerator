import { jsStr, locExpr, unitSuffix, attrName, I, cmpExpr, condOp, condVal } from "./helpers.js";
import { COLORS } from "../constants/palette.js";
import { emitText, emitButtonItemUC, progressParams, trigActionUC } from "./emitSymbol.js";
import { emitPlot } from "./emitPlot.js";
import { emitDivider } from "./shared.js";

// ─────────────────────────────────────────────────────────────
//  EMIT: UserControl-Modus – gv()/sv()/pulse() + updaters (Polling)
// ─────────────────────────────────────────────────────────────
function emitReadUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  const uStr = unitSuffix(b.unit);
  return `${I}// Wert lesen (Attribut): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:${mb};';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var valEl = document.createElement('span');\n${I}    valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';\n${I}    valEl.textContent = '…';\n${I}    row.appendChild(lbl); row.appendChild(valEl);\n${I}    ${parent}.appendChild(row);\n${I}    updaters.push(function () { valEl.textContent = String(gv(${a}, '')) + ${jsStr(uStr)}; });\n${I}})();`;
}
function emitBoolUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  return `${I}// Boolean-Anzeige (Attribut): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:${mb};';\n${I}    var dot = document.createElement('span');\n${I}    dot.style.cssText = 'width:14px;height:14px;border-radius:50%;flex:0 0 auto;background:' + p.inactive + ';transition:background .15s;';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    row.appendChild(dot); row.appendChild(lbl);\n${I}    ${parent}.appendChild(row);\n${I}    updaters.push(function () { dot.style.background = gv(${a}, false) ? p.active : p.inactive; });\n${I}})();`;
}
function emitCheckUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  return `${I}// Boolean setzen (Attribut, Checkbox): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var wrap = document.createElement('label');\n${I}    wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:${mb};cursor:pointer;';\n${I}    var cb = document.createElement('input');\n${I}    cb.type = 'checkbox';\n${I}    cb.style.cssText = 'width:16px;height:16px;flex:0 0 auto;cursor:pointer;accent-color:' + p.active + ';';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    wrap.appendChild(cb); wrap.appendChild(lbl);\n${I}    ${parent}.appendChild(wrap);\n${I}    cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    cb.addEventListener('change', function () { sv(${a}, cb.checked); });\n${I}    updaters.push(function () { if (document.activeElement !== cb) cb.checked = !!gv(${a}, false); });\n${I}})();`;
}
function emitInputUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  const trig = (b.trigSym || "").trim() ? trigActionUC(b) : "";
  const isNum = b.dataType !== "text";
  const parse = isNum ? `var val = parseFloat(input.value); if (isNaN(val)) return;` : `var val = input.value;`;
  const inputType = isNum ? "number" : "text";
  const col = COLORS[b.sendColor] || COLORS.blue;
  const sendText = locExpr(b.sendLoc, b.sendLabel || "Setzen");
  const unit = (b.unit || "").trim();
  const unitEl = unit
    ? `\n${I}    var unitEl = document.createElement('span');\n${I}    unitEl.style.cssText = 'flex:0 0 auto;align-self:center;font-size:13px;color:' + p.bodyText + ';opacity:0.75;';\n${I}    unitEl.textContent = ${jsStr(unit)};`
    : "";
  const unitAppend = unit ? `\n${I}    line.appendChild(unitEl);` : "";
  const withBtn = b.sendButton !== false;
  const sendBlock = withBtn ? `\n${I}    var send = document.createElement('button');\n${I}    send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    send.textContent = ${sendText};\n${I}    send.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    send.style.transition = 'transform .08s ease, filter .08s ease';\n${I}    send.addEventListener('pointerdown', function () { send.style.transform = 'scale(0.96)'; send.style.filter = 'brightness(0.88)'; });\n${I}    var rel_send = function () { send.style.transform = ''; send.style.filter = ''; };\n${I}    send.addEventListener('pointerup', rel_send);\n${I}    send.addEventListener('pointerleave', rel_send);\n${I}    send.onclick = function (e) { e.stopPropagation(); commit()${trig}; };` : "";
  const sendAppend = withBtn ? `\n${I}    line.appendChild(send);` : "";
  return `${I}// Eingabefeld + Senden (Attribut): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var lbl = document.createElement('div');\n${I}    lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var line = document.createElement('div');\n${I}    line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';\n${I}    var input = document.createElement('input');\n${I}    input.type = '${inputType}';\n${I}    input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;' +\n${I}        'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';\n${I}    input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    function commit() { ${parse} sv(${a}, val); }\n${I}    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });${unitEl}${sendBlock}\n${I}    line.appendChild(input);${unitAppend}${sendAppend}\n${I}    wrap.appendChild(lbl); wrap.appendChild(line);\n${I}    ${parent}.appendChild(wrap);\n${I}    updaters.push(function () { if (input.value === '' && document.activeElement !== input) input.value = String(gv(${a}, '')); });\n${I}})();`;
}
function emitProgressUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  const { col, mn, mx, dec, unitStr, showVal } = progressParams(b);
  return `${I}// Ladebalken (Attribut): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var head = document.createElement('div');\n${I}    head.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px;';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var valEl = document.createElement('span');\n${I}    valEl.style.cssText = 'font-size:13px;font-weight:600;color:' + p.bodyText + ';font-variant-numeric:tabular-nums;';\n${I}    valEl.textContent = '–';\n${I}    head.appendChild(lbl);${showVal ? ` head.appendChild(valEl);` : ``}\n${I}    var track = document.createElement('div');\n${I}    track.style.cssText = 'position:relative;width:100%;height:14px;border-radius:7px;overflow:hidden;background:rgba(127,127,127,0.22);';\n${I}    var fill = document.createElement('div');\n${I}    fill.style.cssText = 'height:100%;width:0%;border-radius:7px;background:${col.bg};transition:width .25s ease;';\n${I}    track.appendChild(fill);\n${I}    wrap.appendChild(head); wrap.appendChild(track);\n${I}    ${parent}.appendChild(wrap);\n${I}    var MIN = ${mn}, MAX = ${mx};\n${I}    updaters.push(function () {\n${I}        var num = Number(gv(${a}, NaN)); if (isNaN(num)) return;\n${I}        var span = (MAX - MIN) || 1;\n${I}        var pct = (num - MIN) / span * 100;\n${I}        if (pct < 0) pct = 0; if (pct > 100) pct = 100;\n${I}        fill.style.width = pct.toFixed(1) + '%';\n${I}        valEl.textContent = num.toFixed(${dec}) + ${jsStr(unitStr)};\n${I}    });\n${I}})();`;
}
function emitButtonsUC(parent, b, mb) {
  const btns = (b.buttons || []).slice(0, 2);
  const lines = btns.map((btn, idx) => {
    const a = jsStr(attrName(btn.symbol));
    const isHold = btn.writeMode === "hold";
    const isConfirm = btn.writeMode === "holdConfirm";
    let action;
    if (btn.writeMode === "pulse") action = `pulse(${a}, ${parseInt(btn.pulseMs) || 500})`;
    else if (btn.writeMode === "setTrue") action = `sv(${a}, true)`;
    else if (btn.writeMode === "setFalse") action = `sv(${a}, false)`;
    else if (btn.writeMode === "toggle") action = `sv(${a}, !gv(${a}, false))`;
    const confirmAction = btn.confirmAction === "setTrue" ? `sv(${a}, true)` : `pulse(${a}, ${parseInt(btn.pulseMs) || 500})`;
    const col = COLORS[btn.color] || COLORS.blue;
    const close = btn.closeAfter ? `\n${I}        hideDialog();` : "";
    const v = "btn" + idx;
    const vis = (btn.visSym || "").trim()
      ? `\n${I}    ${v}.style.display = 'none';\n${I}    updaters.push(function () { ${v}.style.display = gv(${jsStr(attrName(btn.visSym))}, false) ? '' : 'none'; });`
      : "";
    const fb = isHold && (btn.fbSym || "").trim()
      ? `\n${I}    updaters.push(function () { ${v}.style.boxShadow = gv(${jsStr(attrName(btn.fbSym))}, false) ? '0 0 0 3px #22c55e' : 'none'; });`
      : "";
    const press = `\n${I}    ${v}.style.transition = 'transform .08s ease, filter .08s ease';\n${I}    ${v}.addEventListener('pointerdown', function () { ${v}.style.transform = 'scale(0.96)'; ${v}.style.filter = 'brightness(0.88)'; });\n${I}    var rel_${v} = function () { ${v}.style.transform = ''; ${v}.style.filter = ''; };\n${I}    ${v}.addEventListener('pointerup', rel_${v});\n${I}    ${v}.addEventListener('pointerleave', rel_${v});`;
    const conds = btn.enableIf || [];
    let enable = "";
    if (conds.length) {
      const expr = conds.map((c) => `(${cmpExpr(`gv(${jsStr(attrName(c.symbol))}, null)`, condOp(c), condVal(c))})`).join(" && ");
      enable = `\n${I}    (function () {\n${I}        function upd() {\n${I}            var enabled = ${expr};\n${I}            ${v}.disabled = !enabled;\n${I}            ${v}.style.opacity = enabled ? '1' : '0.45';\n${I}            ${v}.style.cursor = enabled ? 'pointer' : 'not-allowed';\n${I}        }\n${I}        updaters.push(upd);\n${I}        upd();\n${I}    })();`;
    }
    let clickHandler;
    if (isHold) {
      clickHandler = `\n${I}    ${v}.addEventListener('pointerdown', function () { if (${v}.disabled) return; sv(${a}, true); });\n${I}    var release_${v} = function () { if (${v}.disabled) return; sv(${a}, false);${close} };\n${I}    ${v}.addEventListener('pointerup', release_${v});\n${I}    ${v}.addEventListener('pointerleave', release_${v});`;
    } else if (isConfirm) {
      const ms = parseInt(btn.confirmMs) || 3000;
      clickHandler = `\n${I}    ${v}.style.position = 'relative';\n${I}    ${v}.style.overflow = 'hidden';\n${I}    var fill_${v} = document.createElement('div');\n${I}    fill_${v}.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0%;background:rgba(255,255,255,0.35);pointer-events:none;';\n${I}    ${v}.appendChild(fill_${v});\n${I}    var timer_${v} = null;\n${I}    function cancel_${v}() {\n${I}        if (timer_${v}) { clearTimeout(timer_${v}); timer_${v} = null; }\n${I}        fill_${v}.style.transition = 'none';\n${I}        fill_${v}.style.width = '0%';\n${I}    }\n${I}    ${v}.addEventListener('pointerdown', function () {\n${I}        if (${v}.disabled) return;\n${I}        cancel_${v}();\n${I}        void fill_${v}.offsetWidth;\n${I}        requestAnimationFrame(function () {\n${I}            fill_${v}.style.transition = 'width ${ms}ms linear';\n${I}            fill_${v}.style.width = '100%';\n${I}        });\n${I}        timer_${v} = setTimeout(function () {\n${I}            timer_${v} = null;\n${I}            if (${v}.disabled) return;\n${I}            ${confirmAction};${close}\n${I}            fill_${v}.style.transition = 'none';\n${I}            fill_${v}.style.width = '0%';\n${I}        }, ${ms});\n${I}    });\n${I}    ${v}.addEventListener('pointerup', cancel_${v});\n${I}    ${v}.addEventListener('pointerleave', cancel_${v});`;
    } else {
      clickHandler = `\n${I}    ${v}.onclick = function (e) { e.stopPropagation(); ${action};${close} };`;
    }
    return `${I}    // ${btn.writeMode}: ${attrName(btn.symbol)}\n${I}    var ${v} = document.createElement('button');\n${I}    ${v}.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    ${v}.textContent = ${locExpr(btn.loc, btn.label)};\n${I}    ${v}.addEventListener('pointerdown', function (e) { e.stopPropagation(); });${clickHandler}${vis}${fb}${press}${enable}\n${I}    row.appendChild(${v});`;
  }).join("\n");
  return `${I}// Buttons (Attribut)\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;gap:10px;margin-bottom:${mb};';\n${lines}\n${I}    ${parent}.appendChild(row);\n${I}})();`;
}
function emitItemUC(parent, it, mb) {
  if (it.kind === "read") return emitReadUC(parent, it, mb);
  if (it.kind === "bool") return emitBoolUC(parent, it, mb);
  if (it.kind === "check") return emitCheckUC(parent, it, mb);
  if (it.kind === "input") return emitInputUC(parent, it, mb);
  if (it.kind === "button") return emitButtonItemUC(parent, it);
  return "";
}
function emitRowUC(parent, b) {
  const items = (b.items || []).slice(0, 4);
  const cols = items.map((it, idx) => {
    const cv = "rc" + idx;
    return `${I}    var ${cv} = document.createElement('div');\n${I}    ${cv}.style.cssText = 'flex:1;min-width:0;';\n${I}    rrow.appendChild(${cv});\n${emitItemUC(cv, it, "0px")}`;
  }).join("\n");
  return `${I}// Zeile (nebeneinander)\n${I}(function () {\n${I}    var rrow = document.createElement('div');\n${I}    rrow.style.cssText = 'display:flex;gap:16px;margin-bottom:16px;align-items:flex-start;';\n${cols}\n${I}    ${parent}.appendChild(rrow);\n${I}})();`;
}
function emitEnumUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  const entries = b.map || [];
  const isBadge = b.display === "badge";
  const paintBody = isBadge
    ? `${I}        badge.style.cssText = 'display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;background:' + bg + ';color:' + fg + ';';`
    : `${I}        badge.style.cssText = 'font-size:14px;font-weight:600;color:' + bg + ';';`;
  const labelCode = (b.label || b.loc)
    ? `${I}    var lblEl = document.createElement('span');\n${I}    lblEl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lblEl.textContent = ${locExpr(b.loc, b.label)} + ':';\n${I}    row.appendChild(lblEl);\n`
    : "";
  const chain = entries.map((e) => {
    const col = COLORS[e.color] || COLORS.grey;
    return `${I}        if (String(v) === ${jsStr(String(e.value))}) { paint(${locExpr(e.loc, e.text)}, ${jsStr(col.bg)}, ${jsStr(col.text)}); return; }`;
  }).join("\n");
  const fbCol = COLORS[b.fbColor] || COLORS.grey;
  const fbText = (b.fbLoc || b.fbText) ? locExpr(b.fbLoc, b.fbText) : "String(v)";
  return `${I}// Enum-Anzeige (${isBadge ? "Badge" : "Text"}, Attribut): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:${mb};';\n${labelCode}${I}    var badge = document.createElement('span');\n${I}    row.appendChild(badge);\n${I}    ${parent}.appendChild(row);\n${I}    function paint(text, bg, fg) {\n${I}        badge.textContent = text;\n${paintBody}\n${I}    }\n${I}    function apply(v) {\n${chain}\n${I}        paint(${fbText}, ${jsStr(fbCol.bg)}, ${jsStr(fbCol.text)});\n${I}    }\n${I}    updaters.push(function () { apply(gv(${a}, null)); });\n${I}})();`;
}
function emitEnumSetUC(parent, b, mb) {
  const a = jsStr(attrName(b.symbol));
  const opts = (b.map || []).map((e, i) => `${I}    var o${i} = document.createElement('option'); o${i}.value = ${jsStr(String(e.value))}; o${i}.textContent = ${locExpr(e.loc, e.text)}; sel.appendChild(o${i});`).join("\n");
  const parse = b.numeric ? "parseInt(sel.value, 10)" : "sel.value";
  const withBtn = !!b.sendButton;
  const trig = (b.trigSym || "").trim() ? trigActionUC(b) : "";
  const col = COLORS[b.sendColor] || COLORS.blue;
  const sendText = locExpr(b.sendLoc, b.sendLabel || "Setzen");
  const selCss = withBtn ? "flex:1;min-width:0;" : "width:100%;";
  const change = withBtn ? "" : `\n${I}    sel.addEventListener('change', function () { sv(${a}, ${parse}); });`;
  const btn = withBtn
    ? `\n${I}    var line = document.createElement('div');\n${I}    line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';\n${I}    line.appendChild(sel);\n${I}    var send = document.createElement('button');\n${I}    send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    send.textContent = ${sendText};\n${I}    send.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    send.style.transition = 'transform .08s ease, filter .08s ease';\n${I}    send.addEventListener('pointerdown', function () { send.style.transform = 'scale(0.96)'; send.style.filter = 'brightness(0.88)'; });\n${I}    var rel_send = function () { send.style.transform = ''; send.style.filter = ''; };\n${I}    send.addEventListener('pointerup', rel_send);\n${I}    send.addEventListener('pointerleave', rel_send);\n${I}    send.onclick = function (e) { e.stopPropagation(); sv(${a}, ${parse})${trig}; };\n${I}    line.appendChild(send);\n${I}    wrap.appendChild(lbl); wrap.appendChild(line);`
    : `\n${I}    wrap.appendChild(lbl); wrap.appendChild(sel);`;
  return `${I}// Enum setzen (Attribut, Dropdown${withBtn ? " + Senden" : ""}): ${attrName(b.symbol)}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var lbl = document.createElement('div');\n${I}    lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var sel = document.createElement('select');\n${I}    sel.style.cssText = '${selCss}box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;cursor:pointer;' +\n${I}        'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';\n${opts}\n${I}    sel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });${change}${btn}\n${I}    ${parent}.appendChild(wrap);\n${I}    updaters.push(function () { if (document.activeElement !== sel) sel.value = String(gv(${a}, '')); });\n${I}})();`;
}
function emitStatusUC(parent, b, mb) {
  const entries = b.map || [];
  const isBadge = b.display !== "text";
  const paintBody = isBadge
    ? `${I}        badge.style.cssText = 'display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;background:' + bg + ';color:' + fg + ';';`
    : `${I}        badge.style.cssText = 'font-size:14px;font-weight:600;color:' + bg + ';';`;
  const labelCode = (b.label || b.loc)
    ? `${I}    var lblEl = document.createElement('span');\n${I}    lblEl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lblEl.textContent = ${locExpr(b.loc, b.label)} + ':';\n${I}    row.appendChild(lblEl);\n`
    : "";
  const chain = entries.map((e) => {
    const col = COLORS[e.color] || COLORS.grey;
    return `${I}        if (gv(${jsStr(attrName(e.symbol))}, false)) { paint(${locExpr(e.loc, e.text)}, ${jsStr(col.bg)}, ${jsStr(col.text)}); return; }`;
  }).join("\n");
  const fbCol = COLORS[b.fbColor] || COLORS.grey;
  return `${I}// Statusanzeige (${isBadge ? "Badge" : "Text"}) aus ${entries.length} Attribut-Bools\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:${mb};';\n${labelCode}${I}    var badge = document.createElement('span');\n${I}    row.appendChild(badge);\n${I}    ${parent}.appendChild(row);\n${I}    function paint(text, bg, fg) {\n${I}        badge.textContent = text;\n${paintBody}\n${I}    }\n${I}    function apply() {\n${chain}\n${I}        paint(${locExpr(b.fbLoc, b.fbText)}, ${jsStr(fbCol.bg)}, ${jsStr(fbCol.text)});\n${I}    }\n${I}    updaters.push(apply);\n${I}    apply();\n${I}})();`;
}
function blockCodeUC(b, parent) {
  if (b.type === "text") return emitText(parent, b, "16px");
  if (b.type === "read") return emitReadUC(parent, b, "16px");
  if (b.type === "bool") return emitBoolUC(parent, b, "16px");
  if (b.type === "check") return emitCheckUC(parent, b, "16px");
  if (b.type === "input") return emitInputUC(parent, b, "16px");
  if (b.type === "progress") return emitProgressUC(parent, b, "16px");
  if (b.type === "plot") return emitPlot(parent, b);
  if (b.type === "divider") return emitDivider(parent, b);
  if (b.type === "row") return emitRowUC(parent, b);
  if (b.type === "enum") return emitEnumUC(parent, b, "16px");
  if (b.type === "enumset") return emitEnumSetUC(parent, b, "16px");
  if (b.type === "status") return emitStatusUC(parent, b, "16px");
  if (b.type === "button") return emitButtonsUC(parent, b, "16px");
  return "";
}

export { emitReadUC, emitBoolUC, emitCheckUC, emitInputUC, emitProgressUC, emitButtonsUC, emitItemUC, emitRowUC, emitEnumUC, emitEnumSetUC, emitStatusUC, blockCodeUC };
