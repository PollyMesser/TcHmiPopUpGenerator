import { jsStr, wrapSym, locExpr, unitSuffix, attrName, I, cmpExpr, condOp, condVal, durHelpers } from "./helpers.js";
import { COLORS, TEXT_BG, ICONS } from "../constants/palette.js";
import { emitPlot } from "./emitPlot.js";
import { emitTable } from "./emitTable.js";
import { emitDivider } from "./shared.js";

// ─────────────────────────────────────────────────────────────
//  Button-Beschriftung: Text, Icon oder Icon+Text.
//  Ohne Icon exakt wie bisher (textContent) -> Bestands-Popups byte-identisch.
//  Icon-Groesse = 1em (folgt automatisch der Button-Schriftgroesse, kein fixes px).
//  SVG per innerHTML (jsStr = JSON.stringify -> die einfachen Anfuehrungszeichen
//  in den SVGs werden NICHT escaped, Ausgabe bleibt backslash-frei).
// ─────────────────────────────────────────────────────────────
function btnLabelCode(elVar, locStr, item) {
  const ic = item && item.icon && ICONS[item.icon];
  if (!ic) return `${elVar}.textContent = ${locStr};`;
  const P = `\n${I}    `;
  const showLabel = item.showLabel !== false; // Default: mit Text
  const iconRight = item.iconPos === "right";
  const flex =
    `${elVar}.style.display = 'inline-flex';` +
    `${P}${elVar}.style.alignItems = 'center';` +
    `${P}${elVar}.style.justifyContent = 'center';` +
    (showLabel ? `${P}${elVar}.style.gap = '8px';` : "");
  const ico =
    `var _ico_${elVar} = document.createElement('span');` +
    `${P}_ico_${elVar}.style.cssText = 'display:inline-flex;line-height:0;flex:0 0 auto;';` +
    `${P}_ico_${elVar}.innerHTML = ${jsStr(ic.svg)};` +
    `${P}var _sv_${elVar} = _ico_${elVar}.querySelector('svg'); if (_sv_${elVar}) { _sv_${elVar}.setAttribute('width', '1em'); _sv_${elVar}.setAttribute('height', '1em'); }`;
  if (!showLabel) {
    // Nur-Icon: Text als aria-label fuer Screenreader/Tooltip erhalten
    return `${flex}${P}${ico}${P}${elVar}.setAttribute('aria-label', String(${locStr}));${P}${elVar}.appendChild(_ico_${elVar});`;
  }
  const txt = `var _tx_${elVar} = document.createElement('span'); _tx_${elVar}.textContent = ${locStr};`;
  const appends = iconRight
    ? `${elVar}.appendChild(_tx_${elVar});${P}${elVar}.appendChild(_ico_${elVar});`
    : `${elVar}.appendChild(_ico_${elVar});${P}${elVar}.appendChild(_tx_${elVar});`;
  return `${flex}${P}${ico}${P}${txt}${P}${appends}`;
}

// ─────────────────────────────────────────────────────────────
//  EMIT: Symbol-Modus (registered + event) – subscribe/writeSymbol/…
// ─────────────────────────────────────────────────────────────
function emitText(parent, b, mb) {
  const bgc = b.bgColor && TEXT_BG[b.bgColor];
  const bgCss = bgc ? `background:${bgc.bg};color:${bgc.text};padding:8px 10px;border-radius:6px;` : '';
  const textColor = bgc ? jsStr(bgc.text) : `p.bodyText`;
  const hasHeading = (b.heading || "").trim() || (b.headingLoc || "").trim();
  const ic = b.icon && ICONS[b.icon];
  // Symbolfarbe: explizite Auswahl oder (leer) = Textfarbe uebernehmen
  const iconColorExpr = b.iconColor ? jsStr(b.iconColor) : textColor;
  // Umbruch-Normalisierung: Sprachvariablen enthalten teils literales Backslash-n
  // statt echter Umbrueche. Wir ersetzen es (backslash-frei via fromCharCode 92/10),
  // white-space:pre-wrap sorgt dann fuer den echten Zeilenumbruch.
  // WICHTIG: lokale Variablennamen muessen kollisionssicher sein. Der Parent-Container
  // heisst je nach Layout 'body' (einspaltig), 'gNcM' (Spalten) oder 'cv' (Zeile).
  // Ein lokales 'var body'/'var content' wuerde diesen Namen ueberdecken -> el wird in
  // sein eigenes Kind gehaengt -> HierarchyRequestError. Daher Suffix-Namen (…T).
  const headingBlock = hasHeading
    ? `\n${I}    var hdT = document.createElement('div');\n${I}    hdT.style.cssText = 'font-size:14px;font-weight:600;color:' + ${textColor} + ';margin-bottom:4px;white-space:pre-wrap;';\n${I}    var _hT = ${locExpr(b.headingLoc, b.heading)};\n${I}    hdT.textContent = (typeof _hT === 'string' ? _hT : String(_hT)).split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10));\n${I}    cntT.appendChild(hdT);`
    : '';
  const bodyBlock = `\n${I}    var bdyT = document.createElement('div');\n${I}    bdyT.style.cssText = 'font-size:14px;color:' + ${textColor} + ';line-height:1.5;white-space:pre-wrap;';\n${I}    var _tT = ${locExpr(b.loc, b.text)};\n${I}    bdyT.textContent = (typeof _tT === 'string' ? _tT : String(_tT)).split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10));\n${I}    cntT.appendChild(bdyT);`;
  if (ic) {
    // Mit Symbol: Flex-Zeile [Symbol][Inhalt]; SVG per innerHTML, currentColor faerbt es
    return `${I}// Text (mit Symbol)\n${I}(function () {\n${I}    var elT = document.createElement('div');\n${I}    elT.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:${mb};${bgCss}';\n${I}    var icoT = document.createElement('span');\n${I}    icoT.style.cssText = 'flex:0 0 auto;display:inline-flex;line-height:0;margin-top:1px;color:' + ${iconColorExpr} + ';';\n${I}    icoT.innerHTML = ${jsStr(ic.svg)};\n${I}    elT.appendChild(icoT);\n${I}    var cntT = document.createElement('div');\n${I}    cntT.style.cssText = 'flex:1 1 auto;min-width:0;';${headingBlock}${bodyBlock}\n${I}    elT.appendChild(cntT);\n${I}    ${parent}.appendChild(elT);\n${I}})();`;
  }
  // Ohne Symbol: cntT == elT (unveraendertes Layout, stabile Ausgabe fuer Bestands-Popups)
  return `${I}// Text\n${I}(function () {\n${I}    var elT = document.createElement('div');\n${I}    elT.style.cssText = 'margin-bottom:${mb};${bgCss}';\n${I}    var cntT = elT;${headingBlock}${bodyBlock}\n${I}    ${parent}.appendChild(elT);\n${I}})();`;
}
function emitRead(parent, b, mb) {
  const uStr = unitSuffix(b.unit);
  return `${I}// Wert lesen: ${b.symbol}\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:${mb};';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var valEl = document.createElement('span');\n${I}    valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';\n${I}    valEl.textContent = '…';\n${I}    row.appendChild(lbl); row.appendChild(valEl);\n${I}    ${parent}.appendChild(row);\n${I}    subscribe(${jsStr(wrapSym(b.symbol))}, function (v) { valEl.textContent = String(v) + ${jsStr(uStr)}; });\n${I}})();`;
}
function emitBool(parent, b, mb) {
  return `${I}// Boolean-Anzeige: ${b.symbol}\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:${mb};';\n${I}    var dot = document.createElement('span');\n${I}    dot.style.cssText = 'width:14px;height:14px;border-radius:50%;flex:0 0 auto;background:' + p.inactive + ';transition:background .15s;';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    row.appendChild(dot); row.appendChild(lbl);\n${I}    ${parent}.appendChild(row);\n${I}    subscribe(${jsStr(wrapSym(b.symbol))}, function (v) { dot.style.background = v ? p.active : p.inactive; });\n${I}})();`;
}
function emitCheck(parent, b, mb) {
  const sym = jsStr(wrapSym(b.symbol));
  return `${I}// Boolean setzen (Checkbox): ${b.symbol}\n${I}(function () {\n${I}    var wrap = document.createElement('label');\n${I}    wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:${mb};cursor:pointer;';\n${I}    var cb = document.createElement('input');\n${I}    cb.type = 'checkbox';\n${I}    cb.style.cssText = 'width:16px;height:16px;flex:0 0 auto;cursor:pointer;accent-color:' + p.active + ';';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    wrap.appendChild(cb); wrap.appendChild(lbl);\n${I}    ${parent}.appendChild(wrap);\n${I}    cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    subscribe(${sym}, function (v) { if (document.activeElement !== cb) cb.checked = !!v; });\n${I}    cb.addEventListener('change', function () { writeSymbol(${sym}, cb.checked); });\n${I}})();`;
}
function trigActionSym(b) {
  const t = jsStr(wrapSym(b.trigSym));
  const ms = parseInt(b.trigMs) || 500;
  if (b.trigMode === "setTrue") return `; writeSymbol(${t}, true)`;
  if (b.trigMode === "toggle") return `; toggleSymbol(${t})`;
  return `; pulseSymbol(${t}, ${ms})`;
}
function trigActionUC(b) {
  const t = jsStr(attrName(b.trigSym));
  const ms = parseInt(b.trigMs) || 500;
  if (b.trigMode === "setTrue") return `; sv(${t}, true)`;
  if (b.trigMode === "toggle") return `; sv(${t}, !gv(${t}, false))`;
  return `; pulse(${t}, ${ms})`;
}
function emitInput(parent, b, mb) {
  const sym = jsStr(wrapSym(b.symbol));
  const trig = (b.trigSym || "").trim() ? trigActionSym(b) : "";
  const isTime = b.dataType === "time";
  const isNum = !isTime && b.dataType !== "text";
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
  // TIME: SPS liefert ISO-8601-Dauer (z. B. PT3H5M20S). Anzeige/Eingabe als HH:MM:SS,
  // beim Absenden zurueck nach PTxHxMxS. Backslash-frei (kein Regex-Escape, nur split/charAt).
  const readAssign = isTime ? `input.value = durToHMS(v);` : `input.value = String(v);`;
  const commitBody = isTime ? `var val = hmsToDur(input.value); writeSymbol(${sym}, val);` : `${parse} writeSymbol(${sym}, val);`;
  const timeStyle = isTime ? `\n${I}    input.style.textAlign = 'center';\n${I}    input.placeholder = 'HH:MM:SS';` : "";
  const timeHelpers = isTime ? durHelpers() : "";
  return `${I}// Eingabefeld + Senden: ${b.symbol}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var lbl = document.createElement('div');\n${I}    lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var line = document.createElement('div');\n${I}    line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';\n${I}    var input = document.createElement('input');\n${I}    input.type = '${inputType}';\n${I}    input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;' +\n${I}        'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';\n${I}    input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });${timeStyle}\n${I}    subscribe(${sym}, function (v) { if (document.activeElement !== input) ${readAssign} });${timeHelpers}\n${I}    function commit() { ${commitBody} }\n${I}    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });${unitEl}${sendBlock}\n${I}    line.appendChild(input);${unitAppend}${sendAppend}\n${I}    wrap.appendChild(lbl); wrap.appendChild(line);\n${I}    ${parent}.appendChild(wrap);\n${I}})();`;
}
function progressParams(b) {
  const col = COLORS[b.color] || COLORS.blue;
  const mn = Number(b.min) || 0;
  const mxRaw = Number(b.max);
  const mx = isNaN(mxRaw) ? 100 : mxRaw;
  const dec = Math.max(0, parseInt(b.decimals) || 0);
  const unit = (b.unit || "").trim();
  const unitStr = unit ? (unit === "%" ? unit : " " + unit) : "";
  const showVal = b.showValue !== false;
  return { col, mn, mx, dec, unitStr, showVal };
}
function emitProgress(parent, b, mb) {
  const sym = jsStr(wrapSym(b.symbol));
  const { col, mn, mx, dec, unitStr, showVal } = progressParams(b);
  return `${I}// Ladebalken: ${b.symbol}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var head = document.createElement('div');\n${I}    head.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px;';\n${I}    var lbl = document.createElement('span');\n${I}    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var valEl = document.createElement('span');\n${I}    valEl.style.cssText = 'font-size:13px;font-weight:600;color:' + p.bodyText + ';font-variant-numeric:tabular-nums;';\n${I}    valEl.textContent = '–';\n${I}    head.appendChild(lbl);${showVal ? ` head.appendChild(valEl);` : ``}\n${I}    var track = document.createElement('div');\n${I}    track.style.cssText = 'position:relative;width:100%;height:14px;border-radius:7px;overflow:hidden;background:rgba(127,127,127,0.22);';\n${I}    var fill = document.createElement('div');\n${I}    fill.style.cssText = 'height:100%;width:0%;border-radius:7px;background:${col.bg};transition:width .25s ease;';\n${I}    track.appendChild(fill);\n${I}    wrap.appendChild(head); wrap.appendChild(track);\n${I}    ${parent}.appendChild(wrap);\n${I}    var MIN = ${mn}, MAX = ${mx};\n${I}    subscribe(${sym}, function (v) {\n${I}        var num = Number(v); if (isNaN(num)) return;\n${I}        var span = (MAX - MIN) || 1;\n${I}        var pct = (num - MIN) / span * 100;\n${I}        if (pct < 0) pct = 0; if (pct > 100) pct = 100;\n${I}        fill.style.width = pct.toFixed(1) + '%';\n${I}        valEl.textContent = num.toFixed(${dec}) + ${jsStr(unitStr)};\n${I}    });\n${I}})();`;
}
function emitButtons(parent, b, mb) {
  const btns = (b.buttons || []).slice(0, 2);
  const lines = btns.map((btn, idx) => {
    const sym = jsStr(wrapSym(btn.symbol));
    const isHold = btn.writeMode === "hold";
    const isConfirm = btn.writeMode === "holdConfirm";
    let action;
    if (btn.writeMode === "pulse") action = `pulseSymbol(${sym}, ${parseInt(btn.pulseMs) || 500})`;
    else if (btn.writeMode === "setTrue") action = `writeSymbol(${sym}, true)`;
    else if (btn.writeMode === "setFalse") action = `writeSymbol(${sym}, false)`;
    else if (btn.writeMode === "toggle") action = `toggleSymbol(${sym})`;
    const confirmAction = btn.confirmAction === "setTrue" ? `writeSymbol(${sym}, true)` : `pulseSymbol(${sym}, ${parseInt(btn.pulseMs) || 500})`;
    const col = COLORS[btn.color] || COLORS.blue;
    const close = btn.closeAfter ? `\n${I}        hideDialog();` : "";
    const v = "btn" + idx;
    const vis = (btn.visSym || "").trim()
      ? `\n${I}    ${v}.style.display = 'none';\n${I}    subscribe(${jsStr(wrapSym(btn.visSym))}, function (vis) { ${v}.style.display = vis ? '' : 'none'; });`
      : "";
    const fb = isHold && (btn.fbSym || "").trim()
      ? `\n${I}    subscribe(${jsStr(wrapSym(btn.fbSym))}, function (fbv) { ${v}.style.boxShadow = fbv ? '0 0 0 3px #22c55e' : 'none'; });`
      : "";
    const press = `\n${I}    ${v}.style.transition = 'transform .08s ease, filter .08s ease';\n${I}    ${v}.addEventListener('pointerdown', function () { ${v}.style.transform = 'scale(0.96)'; ${v}.style.filter = 'brightness(0.88)'; });\n${I}    var rel_${v} = function () { ${v}.style.transform = ''; ${v}.style.filter = ''; };\n${I}    ${v}.addEventListener('pointerup', rel_${v});\n${I}    ${v}.addEventListener('pointerleave', rel_${v});`;
    const conds = btn.enableIf || [];
    let enable = "";
    if (conds.length) {
      const valsInit = conds.map(() => "null").join(", ");
      const expr = conds.map((c, ci) => `(${cmpExpr("vals[" + ci + "]", condOp(c), condVal(c))})`).join(" && ");
      const subs = conds.map((c, ci) => `${I}        subscribe(${jsStr(wrapSym(c.symbol))}, function (v) { vals[${ci}] = v; upd(); });`).join("\n");
      enable = `\n${I}    (function () {\n${I}        var vals = [${valsInit}];\n${I}        function upd() {\n${I}            var enabled = ${expr};\n${I}            ${v}.disabled = !enabled;\n${I}            ${v}.style.opacity = enabled ? '1' : '0.45';\n${I}            ${v}.style.cursor = enabled ? 'pointer' : 'not-allowed';\n${I}        }\n${subs}\n${I}        upd();\n${I}    })();`;
    }
    let clickHandler;
    if (isHold) {
      clickHandler = `\n${I}    ${v}.addEventListener('pointerdown', function () { if (${v}.disabled) return; writeSymbol(${sym}, true); });\n${I}    var release_${v} = function () { if (${v}.disabled) return; writeSymbol(${sym}, false);${close} };\n${I}    ${v}.addEventListener('pointerup', release_${v});\n${I}    ${v}.addEventListener('pointerleave', release_${v});`;
    } else if (isConfirm) {
      const ms = parseInt(btn.confirmMs) || 3000;
      clickHandler = `\n${I}    ${v}.style.position = 'relative';\n${I}    ${v}.style.overflow = 'hidden';\n${I}    var fill_${v} = document.createElement('div');\n${I}    fill_${v}.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0%;background:rgba(255,255,255,0.35);pointer-events:none;';\n${I}    ${v}.appendChild(fill_${v});\n${I}    var timer_${v} = null;\n${I}    function cancel_${v}() {\n${I}        if (timer_${v}) { clearTimeout(timer_${v}); timer_${v} = null; }\n${I}        fill_${v}.style.transition = 'none';\n${I}        fill_${v}.style.width = '0%';\n${I}    }\n${I}    ${v}.addEventListener('pointerdown', function () {\n${I}        if (${v}.disabled) return;\n${I}        cancel_${v}();\n${I}        void fill_${v}.offsetWidth;\n${I}        requestAnimationFrame(function () {\n${I}            fill_${v}.style.transition = 'width ${ms}ms linear';\n${I}            fill_${v}.style.width = '100%';\n${I}        });\n${I}        timer_${v} = setTimeout(function () {\n${I}            timer_${v} = null;\n${I}            if (${v}.disabled) return;\n${I}            ${confirmAction};${close}\n${I}            fill_${v}.style.transition = 'none';\n${I}            fill_${v}.style.width = '0%';\n${I}        }, ${ms});\n${I}    });\n${I}    ${v}.addEventListener('pointerup', cancel_${v});\n${I}    ${v}.addEventListener('pointerleave', cancel_${v});`;
    } else {
      clickHandler = `\n${I}    ${v}.onclick = function (e) { e.stopPropagation(); ${action};${close} };`;
    }
    return `${I}    // ${btn.writeMode}: ${btn.symbol}\n${I}    var ${v} = document.createElement('button');\n${I}    ${v}.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    ${btnLabelCode(v, locExpr(btn.loc, btn.label), btn)}\n${I}    ${v}.addEventListener('pointerdown', function (e) { e.stopPropagation(); });${clickHandler}${vis}${fb}${press}${enable}\n${I}    row.appendChild(${v});`;
  }).join("\n");
  return `${I}// Buttons\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;gap:10px;margin-bottom:${mb};';\n${lines}\n${I}    ${parent}.appendChild(row);\n${I}})();`;
}
function emitButtonItem(parent, it) {
  const sym = jsStr(wrapSym(it.symbol));
  const isHold = it.writeMode === "hold";
  const isConfirm = it.writeMode === "holdConfirm";
  let action;
  if (it.writeMode === "pulse") action = `pulseSymbol(${sym}, ${parseInt(it.pulseMs) || 500})`;
  else if (it.writeMode === "setTrue") action = `writeSymbol(${sym}, true)`;
  else if (it.writeMode === "setFalse") action = `writeSymbol(${sym}, false)`;
  else if (it.writeMode === "toggle") action = `toggleSymbol(${sym})`;
  const confirmAction = it.confirmAction === "setTrue" ? `writeSymbol(${sym}, true)` : `pulseSymbol(${sym}, ${parseInt(it.pulseMs) || 500})`;
  const col = COLORS[it.color] || COLORS.blue;
  const close = it.closeAfter ? `\n${I}        hideDialog();` : "";
  const vis = (it.visSym || "").trim()
    ? `\n${I}    btn.style.display = 'none';\n${I}    subscribe(${jsStr(wrapSym(it.visSym))}, function (vis) { btn.style.display = vis ? '' : 'none'; });`
    : "";
  const fb = isHold && (it.fbSym || "").trim()
    ? `\n${I}    subscribe(${jsStr(wrapSym(it.fbSym))}, function (fbv) { btn.style.boxShadow = fbv ? '0 0 0 3px #22c55e' : 'none'; });`
    : "";
  const press = `\n${I}    btn.style.transition = 'transform .08s ease, filter .08s ease';\n${I}    btn.addEventListener('pointerdown', function () { btn.style.transform = 'scale(0.96)'; btn.style.filter = 'brightness(0.88)'; });\n${I}    var rel_btn = function () { btn.style.transform = ''; btn.style.filter = ''; };\n${I}    btn.addEventListener('pointerup', rel_btn);\n${I}    btn.addEventListener('pointerleave', rel_btn);`;
  const conds = it.enableIf || [];
  let enable = "";
  if (conds.length) {
    const valsInit = conds.map(() => "null").join(", ");
    const expr = conds.map((c, ci) => `(${cmpExpr("vals[" + ci + "]", condOp(c), condVal(c))})`).join(" && ");
    const subs = conds.map((c, ci) => `${I}        subscribe(${jsStr(wrapSym(c.symbol))}, function (v) { vals[${ci}] = v; upd(); });`).join("\n");
    enable = `\n${I}    (function () {\n${I}        var vals = [${valsInit}];\n${I}        function upd() {\n${I}            var enabled = ${expr};\n${I}            btn.disabled = !enabled;\n${I}            btn.style.opacity = enabled ? '1' : '0.45';\n${I}            btn.style.cursor = enabled ? 'pointer' : 'not-allowed';\n${I}        }\n${subs}\n${I}        upd();\n${I}    })();`;
  }
  let clickHandler;
  if (isHold) {
    clickHandler = `\n${I}    btn.addEventListener('pointerdown', function () { if (btn.disabled) return; writeSymbol(${sym}, true); });\n${I}    var release_btn = function () { if (btn.disabled) return; writeSymbol(${sym}, false);${close} };\n${I}    btn.addEventListener('pointerup', release_btn);\n${I}    btn.addEventListener('pointerleave', release_btn);`;
  } else if (isConfirm) {
    const ms = parseInt(it.confirmMs) || 3000;
    clickHandler = `\n${I}    btn.style.position = 'relative';\n${I}    btn.style.overflow = 'hidden';\n${I}    var fill_btn = document.createElement('div');\n${I}    fill_btn.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0%;background:rgba(255,255,255,0.35);pointer-events:none;';\n${I}    btn.appendChild(fill_btn);\n${I}    var timer_btn = null;\n${I}    function cancel_btn() {\n${I}        if (timer_btn) { clearTimeout(timer_btn); timer_btn = null; }\n${I}        fill_btn.style.transition = 'none';\n${I}        fill_btn.style.width = '0%';\n${I}    }\n${I}    btn.addEventListener('pointerdown', function () {\n${I}        if (btn.disabled) return;\n${I}        cancel_btn();\n${I}        void fill_btn.offsetWidth;\n${I}        requestAnimationFrame(function () {\n${I}            fill_btn.style.transition = 'width ${ms}ms linear';\n${I}            fill_btn.style.width = '100%';\n${I}        });\n${I}        timer_btn = setTimeout(function () {\n${I}            timer_btn = null;\n${I}            if (btn.disabled) return;\n${I}            ${confirmAction};${close}\n${I}            fill_btn.style.transition = 'none';\n${I}            fill_btn.style.width = '0%';\n${I}        }, ${ms});\n${I}    });\n${I}    btn.addEventListener('pointerup', cancel_btn);\n${I}    btn.addEventListener('pointerleave', cancel_btn);`;
  } else {
    clickHandler = `\n${I}    btn.onclick = function (e) { e.stopPropagation(); ${action};${close} };`;
  }
  return `${I}// Button (Zeilen-Element): ${it.writeMode}: ${it.symbol}\n${I}(function () {\n${I}    var btn = document.createElement('button');\n${I}    btn.style.cssText = 'width:100%;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    ${btnLabelCode("btn", locExpr(it.loc, it.label), it)}\n${I}    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });${clickHandler}${vis}${fb}${press}${enable}\n${I}    ${parent}.appendChild(btn);\n${I}})();`;
}
function emitButtonItemUC(parent, it) {
  const a = jsStr(attrName(it.symbol));
  const isHold = it.writeMode === "hold";
  const isConfirm = it.writeMode === "holdConfirm";
  let action;
  if (it.writeMode === "pulse") action = `pulse(${a}, ${parseInt(it.pulseMs) || 500})`;
  else if (it.writeMode === "setTrue") action = `sv(${a}, true)`;
  else if (it.writeMode === "setFalse") action = `sv(${a}, false)`;
  else if (it.writeMode === "toggle") action = `sv(${a}, !gv(${a}, false))`;
  const confirmAction = it.confirmAction === "setTrue" ? `sv(${a}, true)` : `pulse(${a}, ${parseInt(it.pulseMs) || 500})`;
  const col = COLORS[it.color] || COLORS.blue;
  const close = it.closeAfter ? `\n${I}        hideDialog();` : "";
  const vis = (it.visSym || "").trim()
    ? `\n${I}    btn.style.display = 'none';\n${I}    updaters.push(function () { btn.style.display = gv(${jsStr(attrName(it.visSym))}, false) ? '' : 'none'; });`
    : "";
  const fb = isHold && (it.fbSym || "").trim()
    ? `\n${I}    updaters.push(function () { btn.style.boxShadow = gv(${jsStr(attrName(it.fbSym))}, false) ? '0 0 0 3px #22c55e' : 'none'; });`
    : "";
  const press = `\n${I}    btn.style.transition = 'transform .08s ease, filter .08s ease';\n${I}    btn.addEventListener('pointerdown', function () { btn.style.transform = 'scale(0.96)'; btn.style.filter = 'brightness(0.88)'; });\n${I}    var rel_btn = function () { btn.style.transform = ''; btn.style.filter = ''; };\n${I}    btn.addEventListener('pointerup', rel_btn);\n${I}    btn.addEventListener('pointerleave', rel_btn);`;
  const conds = it.enableIf || [];
  let enable = "";
  if (conds.length) {
    const expr = conds.map((c) => `(${cmpExpr(`gv(${jsStr(attrName(c.symbol))}, null)`, condOp(c), condVal(c))})`).join(" && ");
    enable = `\n${I}    (function () {\n${I}        function upd() {\n${I}            var enabled = ${expr};\n${I}            btn.disabled = !enabled;\n${I}            btn.style.opacity = enabled ? '1' : '0.45';\n${I}            btn.style.cursor = enabled ? 'pointer' : 'not-allowed';\n${I}        }\n${I}        updaters.push(upd);\n${I}        upd();\n${I}    })();`;
  }
  let clickHandler;
  if (isHold) {
    clickHandler = `\n${I}    btn.addEventListener('pointerdown', function () { if (btn.disabled) return; sv(${a}, true); });\n${I}    var release_btn = function () { if (btn.disabled) return; sv(${a}, false);${close} };\n${I}    btn.addEventListener('pointerup', release_btn);\n${I}    btn.addEventListener('pointerleave', release_btn);`;
  } else if (isConfirm) {
    const ms = parseInt(it.confirmMs) || 3000;
    clickHandler = `\n${I}    btn.style.position = 'relative';\n${I}    btn.style.overflow = 'hidden';\n${I}    var fill_btn = document.createElement('div');\n${I}    fill_btn.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0%;background:rgba(255,255,255,0.35);pointer-events:none;';\n${I}    btn.appendChild(fill_btn);\n${I}    var timer_btn = null;\n${I}    function cancel_btn() {\n${I}        if (timer_btn) { clearTimeout(timer_btn); timer_btn = null; }\n${I}        fill_btn.style.transition = 'none';\n${I}        fill_btn.style.width = '0%';\n${I}    }\n${I}    btn.addEventListener('pointerdown', function () {\n${I}        if (btn.disabled) return;\n${I}        cancel_btn();\n${I}        void fill_btn.offsetWidth;\n${I}        requestAnimationFrame(function () {\n${I}            fill_btn.style.transition = 'width ${ms}ms linear';\n${I}            fill_btn.style.width = '100%';\n${I}        });\n${I}        timer_btn = setTimeout(function () {\n${I}            timer_btn = null;\n${I}            if (btn.disabled) return;\n${I}            ${confirmAction};${close}\n${I}            fill_btn.style.transition = 'none';\n${I}            fill_btn.style.width = '0%';\n${I}        }, ${ms});\n${I}    });\n${I}    btn.addEventListener('pointerup', cancel_btn);\n${I}    btn.addEventListener('pointerleave', cancel_btn);`;
  } else {
    clickHandler = `\n${I}    btn.onclick = function (e) { e.stopPropagation(); ${action};${close} };`;
  }
  return `${I}// Button (Zeilen-Element, Attribut): ${it.writeMode}: ${attrName(it.symbol)}\n${I}(function () {\n${I}    var btn = document.createElement('button');\n${I}    btn.style.cssText = 'width:100%;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    ${btnLabelCode("btn", locExpr(it.loc, it.label), it)}\n${I}    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });${clickHandler}${vis}${fb}${press}${enable}\n${I}    ${parent}.appendChild(btn);\n${I}})();`;
}
function emitItem(parent, it, mb) {
  if (it.kind === "read") return emitRead(parent, it, mb);
  if (it.kind === "bool") return emitBool(parent, it, mb);
  if (it.kind === "check") return emitCheck(parent, it, mb);
  if (it.kind === "input") return emitInput(parent, it, mb);
  if (it.kind === "button") return emitButtonItem(parent, it);
  return "";
}
function emitRow(parent, b) {
  const items = (b.items || []).slice(0, 4);
  const cols = items.map((it, idx) => {
    const cv = "rc" + idx;
    return `${I}    var ${cv} = document.createElement('div');\n${I}    ${cv}.style.cssText = 'flex:1;min-width:0;';\n${I}    rrow.appendChild(${cv});\n${emitItem(cv, it, "0px")}`;
  }).join("\n");
  return `${I}// Zeile (nebeneinander)\n${I}(function () {\n${I}    var rrow = document.createElement('div');\n${I}    rrow.style.cssText = 'display:flex;gap:16px;margin-bottom:16px;align-items:flex-start;';\n${cols}\n${I}    ${parent}.appendChild(rrow);\n${I}})();`;
}
function emitEnum(parent, b, mb) {
  const sym = jsStr(wrapSym(b.symbol));
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
  return `${I}// Enum-Anzeige (${isBadge ? "Badge" : "Text"}): ${b.symbol}\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:${mb};';\n${labelCode}${I}    var badge = document.createElement('span');\n${I}    row.appendChild(badge);\n${I}    ${parent}.appendChild(row);\n${I}    function paint(text, bg, fg) {\n${I}        badge.textContent = text;\n${paintBody}\n${I}    }\n${I}    function apply(v) {\n${chain}\n${I}        paint(${fbText}, ${jsStr(fbCol.bg)}, ${jsStr(fbCol.text)});\n${I}    }\n${I}    subscribe(${sym}, function (v) { apply(v); });\n${I}})();`;
}
function emitEnumSet(parent, b, mb) {
  const sym = jsStr(wrapSym(b.symbol));
  const opts = (b.map || []).map((e, i) => `${I}    var o${i} = document.createElement('option'); o${i}.value = ${jsStr(String(e.value))}; o${i}.textContent = ${locExpr(e.loc, e.text)}; sel.appendChild(o${i});`).join("\n");
  const parse = b.numeric ? "parseInt(sel.value, 10)" : "sel.value";
  const withBtn = !!b.sendButton;
  const trig = (b.trigSym || "").trim() ? trigActionSym(b) : "";
  const col = COLORS[b.sendColor] || COLORS.blue;
  const sendText = locExpr(b.sendLoc, b.sendLabel || "Setzen");
  const selCss = withBtn ? "flex:1;min-width:0;" : "width:100%;";
  const change = withBtn ? "" : `\n${I}    sel.addEventListener('change', function () { writeSymbol(${sym}, ${parse}); });`;
  const btn = withBtn
    ? `\n${I}    var line = document.createElement('div');\n${I}    line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';\n${I}    line.appendChild(sel);\n${I}    var send = document.createElement('button');\n${I}    send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:${col.bg};color:${col.text};';\n${I}    send.textContent = ${sendText};\n${I}    send.addEventListener('pointerdown', function (e) { e.stopPropagation(); });\n${I}    send.style.transition = 'transform .08s ease, filter .08s ease';\n${I}    send.addEventListener('pointerdown', function () { send.style.transform = 'scale(0.96)'; send.style.filter = 'brightness(0.88)'; });\n${I}    var rel_send = function () { send.style.transform = ''; send.style.filter = ''; };\n${I}    send.addEventListener('pointerup', rel_send);\n${I}    send.addEventListener('pointerleave', rel_send);\n${I}    send.onclick = function (e) { e.stopPropagation(); writeSymbol(${sym}, ${parse})${trig}; };\n${I}    line.appendChild(send);\n${I}    wrap.appendChild(lbl); wrap.appendChild(line);`
    : `\n${I}    wrap.appendChild(lbl); wrap.appendChild(sel);`;
  return `${I}// Enum setzen (Dropdown${withBtn ? " + Senden" : ""}): ${b.symbol}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var lbl = document.createElement('div');\n${I}    lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var sel = document.createElement('select');\n${I}    sel.style.cssText = '${selCss}box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;cursor:pointer;' +\n${I}        'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';\n${opts}\n${I}    sel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });${change}${btn}\n${I}    ${parent}.appendChild(wrap);\n${I}    subscribe(${sym}, function (v) { if (document.activeElement !== sel) sel.value = String(v); });\n${I}})();`;
}
function emitStatus(parent, b, mb) {
  const entries = b.map || [];
  const isBadge = b.display !== "text";
  const paintBody = isBadge
    ? `${I}        badge.style.cssText = 'display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;background:' + bg + ';color:' + fg + ';';`
    : `${I}        badge.style.cssText = 'font-size:14px;font-weight:600;color:' + bg + ';';`;
  const labelCode = (b.label || b.loc)
    ? `${I}    var lblEl = document.createElement('span');\n${I}    lblEl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';\n${I}    lblEl.textContent = ${locExpr(b.loc, b.label)} + ':';\n${I}    row.appendChild(lblEl);\n`
    : "";
  const stateInit = entries.map(() => "false").join(", ");
  const chain = entries.map((e, i) => {
    const col = COLORS[e.color] || COLORS.grey;
    return `${I}        if (states[${i}]) { paint(${locExpr(e.loc, e.text)}, ${jsStr(col.bg)}, ${jsStr(col.text)}); return; }`;
  }).join("\n");
  const fbCol = COLORS[b.fbColor] || COLORS.grey;
  const subs = entries.map((e, i) => `${I}    subscribe(${jsStr(wrapSym(e.symbol))}, function (v) { states[${i}] = v; apply(); });`).join("\n");
  return `${I}// Statusanzeige (${isBadge ? "Badge" : "Text"}) aus ${entries.length} Bools\n${I}(function () {\n${I}    var row = document.createElement('div');\n${I}    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:${mb};';\n${labelCode}${I}    var badge = document.createElement('span');\n${I}    row.appendChild(badge);\n${I}    ${parent}.appendChild(row);\n${I}    function paint(text, bg, fg) {\n${I}        badge.textContent = text;\n${paintBody}\n${I}    }\n${I}    var states = [${stateInit}];\n${I}    function apply() {\n${chain}\n${I}        paint(${locExpr(b.fbLoc, b.fbText)}, ${jsStr(fbCol.bg)}, ${jsStr(fbCol.text)});\n${I}    }\n${subs}\n${I}    apply();\n${I}})();`;
}
function blockCodeSym(b, parent) {
  if (b.type === "text") return emitText(parent, b, "16px");
  if (b.type === "read") return emitRead(parent, b, "16px");
  if (b.type === "bool") return emitBool(parent, b, "16px");
  if (b.type === "check") return emitCheck(parent, b, "16px");
  if (b.type === "input") return emitInput(parent, b, "16px");
  if (b.type === "progress") return emitProgress(parent, b, "16px");
  if (b.type === "plot") return emitPlot(parent, b);
  if (b.type === "table") return emitTable(parent, b);
  if (b.type === "divider") return emitDivider(parent, b);
  if (b.type === "row") return emitRow(parent, b);
  if (b.type === "enum") return emitEnum(parent, b, "16px");
  if (b.type === "enumset") return emitEnumSet(parent, b, "16px");
  if (b.type === "status") return emitStatus(parent, b, "16px");
  if (b.type === "button") return emitButtons(parent, b, "16px");
  return "";
}

export { emitText, emitRead, emitBool, emitCheck, trigActionSym, trigActionUC, emitInput, progressParams, emitProgress, emitButtons, emitButtonItem, emitButtonItemUC, emitItem, emitRow, emitEnum, emitEnumSet, emitStatus, blockCodeSym };