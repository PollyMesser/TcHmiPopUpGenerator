import { jsStr, wrapSym, attrName, locExpr, unitSuffix, indentLines, I } from "./helpers.js";
import { PLOTLY_SRC, ENSURE_PLOTLY_SRC, RESIZE_SRC, OWN_SUBSCRIBE_SRC, bindSrc, optNum } from "./plotlyRuntime.js";

// ── Balkendiagramm: aktuelle Werte mehrerer Variablen oder eines PLC-Arrays ──
// Quelle 'list'  : feste Balkenliste (Symbol-Modus: subscribe, UC-Modus: gv-Attribut)
// Quelle 'array' : arraySymbol[i] bzw. arraySymbol[i]::member (bestätigter Zugriffspfad),
//                  immer per ADS-Symbol (auch im UC-Modus), optional begrenzt durch countSymbol.
// Optionale Grenzwerte: Linien + Balken außerhalb in Grenzwertfarbe.

const MAX_ARRAY_BARS = 100;

function barConfig(b, uc) {
  const isArray = b.source === "array";
  const bars = isArray ? [] : (b.bars || []).map((x) => ({
    src: uc ? ((x.symbol || "").trim() ? attrName(x.symbol) : "") : wrapSym(x.symbol),
    label: x.label || "",
    loc: (x.loc || "").trim(),
    color: x.color || "#3b82f6",
  }));
  const mn = optNum(b.min);
  const mx = optNum(b.max);
  return {
    isArray,
    bars,
    arraySymbol: isArray ? wrapSym(b.arraySymbol) : "",
    arrayCount: Math.min(MAX_ARRAY_BARS, Math.max(1, parseInt(b.arrayCount) || 1)),
    startIndex: Math.max(0, parseInt(b.startIndex) || 0),
    member: (b.member || "").trim(),
    countSymbol: isArray ? wrapSym(b.countSymbol) : "",
    labelPrefix: b.labelPrefix == null ? "" : String(b.labelPrefix),
    arrayColor: b.arrayColor || "#3b82f6",
    horizontal: b.orientation === "h",
    dec: Math.min(6, Math.max(0, parseInt(b.decimals) || 0)),
    unit: unitSuffix(b.unit),
    unitLabel: (b.unit || "").trim(),
    autoscale: b.autoscale !== false,
    min: mn === null ? 0 : mn,
    max: mx === null ? 100 : mx,
    showValues: b.showValues !== false,
    limLow: optNum(b.limitLow),
    limHigh: optNum(b.limitHigh),
    limColor: b.limitColor || "#ef4444",
    height: Math.max(120, parseInt(b.height) || 260),
  };
}

function emitBar(parent, b, uc) {
  const c = barConfig(b, uc);
  const caption = (b.caption || "").trim() || (b.captionLoc || "").trim();
  const captionCode = caption
    ? `    var cap = document.createElement('div');
    cap.style.cssText = 'font-size:20px;font-weight:600;color:' + p.titleColor + ';margin-bottom:6px;';
    cap.textContent = ${locExpr(b.captionLoc, b.caption)};
    wrapper.appendChild(cap);
`
    : "";
  const core = `// Balkendiagramm (${c.isArray ? "Array" : c.bars.length + " Werte"})
(function () {
    var PLOTLY_SRC = ${jsStr(PLOTLY_SRC)}; // Pfad ab HMI-Root – ggf. anpassen
    var SOURCE = ${jsStr(c.isArray ? "array" : "list")}; // 'list' | 'array'
    var BARS = ${JSON.stringify(c.bars, null, 4)};
    var ARRAY_SYMBOL = ${jsStr(c.arraySymbol)};
    var ARRAY_COUNT = ${c.arrayCount}, START_INDEX = ${c.startIndex};
    var MEMBER = ${jsStr(c.member)};
    var COUNT_SYMBOL = ${jsStr(c.countSymbol)};
    var LABEL_PREFIX = ${jsStr(c.labelPrefix)};
    var ARRAY_COLOR = ${jsStr(c.arrayColor)};
    var HORIZONTAL = ${c.horizontal};
    var DEC = ${c.dec}, UNIT = ${jsStr(c.unit)}, UNIT_LABEL = ${jsStr(c.unitLabel)};
    var AUTOSCALE = ${c.autoscale}, AX_MIN = ${c.min}, AX_MAX = ${c.max};
    var SHOW_VALUES = ${c.showValues};
    var LIM_LOW = ${c.limLow === null ? "null" : c.limLow}, LIM_HIGH = ${c.limHigh === null ? "null" : c.limHigh}, LIM_COLOR = ${jsStr(c.limColor)};
    var HEIGHT = ${c.height};
    var ownWatchers = [], ownSymbols = [];
    var plotDiv = null, wrapper = null, ro = null, onWinResize = null, ready = false, pending = null;
    var vals = [], visibleCount = -1;

${ENSURE_PLOTLY_SRC}
${RESIZE_SRC}
${OWN_SUBSCRIBE_SRC}
${bindSrc(uc)}
    // Schlichten ADS-Pfad aus '%s%...%/s%' herausschaelen (backslash-frei, keine Regex).
    function plainSym(s) {
        var plain = s || '';
        if (plain.indexOf('%s%') === 0) plain = plain.slice(3);
        var suf = '%/s%';
        if (plain.length >= suf.length && plain.slice(-suf.length) === suf) plain = plain.slice(0, -suf.length);
        return plain;
    }
    // Element-Symbol: arraySymbol[i] bzw. arraySymbol[i]::member (wie Tabelle, per readEx2 bestaetigt)
    function elemSym(i) {
        var base = plainSym(ARRAY_SYMBOL) + '[' + (START_INDEX + i) + ']';
        if (MEMBER) base += (MEMBER.charAt(0) === '.' || MEMBER.charAt(0) === ':' || MEMBER.charAt(0) === '[') ? MEMBER : ('::' + MEMBER);
        return '%s%' + base + '%/s%';
    }
    function barCount() { return SOURCE === 'array' ? ARRAY_COUNT : BARS.length; }
    function shownCount() { var n = barCount(); return (visibleCount >= 0 && visibleCount < n) ? visibleCount : n; }
    function barLabel(i) { return SOURCE === 'array' ? (LABEL_PREFIX + (START_INDEX + i)) : loc(BARS[i].loc, BARS[i].label); }
    function baseColor(i) { return SOURCE === 'array' ? ARRAY_COLOR : BARS[i].color; }
    function outOfLimits(v) { return (LIM_LOW !== null && v < LIM_LOW) || (LIM_HIGH !== null && v > LIM_HIGH); }
    function buildTrace() {
        var n = shownCount(), cats = [], nums = [], cols = [], txt = [];
        for (var i = 0; i < n; i++) {
            var v = vals[i];
            var ok = typeof v === 'number' && isFinite(v);
            cats.push(barLabel(i));
            nums.push(ok ? v : null);
            cols.push(ok && outOfLimits(v) ? LIM_COLOR : baseColor(i));
            txt.push(ok ? v.toFixed(DEC) + UNIT : '');
        }
        var tr = { type: 'bar', marker: { color: cols }, hoverinfo: 'none', cliponaxis: false };
        if (SHOW_VALUES) { tr.text = txt; tr.textposition = 'outside'; tr.textfont = { color: p.bodyText, size: 13 }; }
        if (HORIZONTAL) { tr.orientation = 'h'; tr.y = cats; tr.x = nums; } else { tr.x = cats; tr.y = nums; }
        return tr;
    }
    function limitShape(v) {
        return HORIZONTAL
            ? { type: 'line', xref: 'x', x0: v, x1: v, yref: 'paper', y0: 0, y1: 1, line: { color: LIM_COLOR, width: 1.5, dash: 'dash' } }
            : { type: 'line', yref: 'y', y0: v, y1: v, xref: 'paper', x0: 0, x1: 1, line: { color: LIM_COLOR, width: 1.5, dash: 'dash' } };
    }
    function buildLayout() {
        var shapes = [];
        if (LIM_LOW !== null) shapes.push(limitShape(LIM_LOW));
        if (LIM_HIGH !== null) shapes.push(limitShape(LIM_HIGH));
        var valAx = { gridcolor: p.border, zeroline: true, zerolinecolor: p.border, fixedrange: true, tickfont: { color: p.bodyText, size: 11 }, title: { text: UNIT_LABEL, font: { color: p.bodyText, size: 11 } } };
        if (!AUTOSCALE) { valAx.range = [AX_MIN, AX_MAX]; valAx.autorange = false; }
        var catAx = { fixedrange: true, tickfont: { color: p.bodyText, size: 12 }, automargin: true, type: 'category' };
        if (HORIZONTAL) catAx.autorange = 'reversed';
        return { autosize: true, height: HEIGHT, bargap: 0.3, showlegend: false, shapes: shapes,
            margin: { l: HORIZONTAL ? 10 : 48, r: (HORIZONTAL && SHOW_VALUES) ? 84 : 16, t: (SHOW_VALUES && !HORIZONTAL) ? 22 : 10, b: HORIZONTAL ? 36 : 10 },
            paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: p.bodyText },
            xaxis: HORIZONTAL ? valAx : catAx, yaxis: HORIZONTAL ? catAx : valAx };
    }
    function render() {
        if (pending) return;
        pending = setTimeout(function () { pending = null; if (!ready || !plotDiv || !window.Plotly) return; try { var pr = window.Plotly.react(plotDiv, [buildTrace()], buildLayout(), { displayModeBar: false, responsive: true, staticPlot: true }); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }, 80);
    }
    function setVal(i, v) { var n = Number(v); vals[i] = (v === null || v === undefined || v === '' || isNaN(n) || !isFinite(n)) ? null : n; render(); }

    // ── Aufbau ──
    wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;min-width:0;margin-bottom:16px;';
${captionCode}    plotDiv = document.createElement('div');
    plotDiv.style.cssText = 'width:100%;height:' + HEIGHT + 'px;min-width:0;';
    wrapper.appendChild(plotDiv);
    ${parent}.appendChild(wrapper);

    if (SOURCE === 'array') {
        if (ARRAY_SYMBOL) { for (var ai = 0; ai < ARRAY_COUNT; ai++) { (function (k) { subOwn(elemSym(k), function (v) { setVal(k, v); }); })(ai); } }
        if (COUNT_SYMBOL) subOwn(COUNT_SYMBOL, function (v) { var n = parseInt(v, 10); visibleCount = (isNaN(n) || n < 0) ? -1 : n; render(); });
    } else {
        BARS.forEach(function (bar, k) { bindV(bar.src, function (v) { setVal(k, v); }); });
    }

    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(function () { resize(); }); ro.observe(wrapper); }
    else { onWinResize = function () { resize(); }; window.addEventListener('resize', onWinResize); }

    teardowns.push(function () {
        for (var i = 0; i < ownWatchers.length; i++) { try { ownWatchers[i](); } catch (e) {} }
        for (var j = 0; j < ownSymbols.length; j++) { try { ownSymbols[j].destroy(); } catch (e) {} }
        ownWatchers = []; ownSymbols = [];
        if (pending) { clearTimeout(pending); pending = null; }
        if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
        if (onWinResize) { window.removeEventListener('resize', onWinResize); onWinResize = null; }
        try { if (window.Plotly && plotDiv) window.Plotly.purge(plotDiv); } catch (e) {}
        plotDiv = null; wrapper = null; ready = false;
    });

    ensurePlotly(function () {
        if (!plotDiv) return;
        ready = true;
        try { var pr = window.Plotly.newPlot(plotDiv, [buildTrace()], buildLayout(), { displayModeBar: false, responsive: true, staticPlot: true }); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
        resize();
    });
})();`;
  return indentLines(core, I);
}

export { barConfig, emitBar, MAX_ARRAY_BARS };
