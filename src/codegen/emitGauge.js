import { jsStr, wrapSym, attrName, locExpr, unitSuffix, indentLines, I } from "./helpers.js";
import { PLOTLY_SRC, ENSURE_PLOTLY_SRC, RESIZE_SRC, bindSrc, hexToRgba, optNum } from "./plotlyRuntime.js";

// ── Gauge / Tacho: Einzelwert als Plotly-Indicator (angular oder bullet) ──
// Eigenständiges Modul mit eigenem Lebenszyklus (teardowns), in Spalten nutzbar.
// Symbol-Modus: Wert/Sollwert/Min/Max per subscribe; UC-Modus: per gv() aus Attributen.

function gaugeConfig(b, uc) {
  const src = (s) => (uc ? ((s || "").trim() ? attrName(s) : "") : wrapSym(s));
  const mn = optNum(b.min);
  const mx = optNum(b.max);
  const min = mn === null ? 0 : mn;
  const max = mx === null || mx <= min ? min + 100 : mx;
  const bands = (b.bands || [])
    .map((s) => ({ from: optNum(s.from), to: optNum(s.to), color: hexToRgba(s.color, 0.35) }))
    .filter((s) => s.from !== null && s.to !== null && s.to > s.from)
    .map((s) => ({ range: [s.from, s.to], color: s.color }));
  const sp = b.setpointMode === "fixed" || b.setpointMode === "symbol" ? b.setpointMode : "none";
  return {
    valueSrc: src(b.symbol),
    minSrc: src(b.minSymbol),
    maxSrc: src(b.maxSymbol),
    spSrc: sp === "symbol" ? src(b.setpointSymbol) : "",
    spMode: sp,
    spValue: optNum(b.setpointValue),
    spColor: b.setpointColor || "#ef4444",
    min, max,
    dec: Math.min(6, Math.max(0, parseInt(b.decimals) || 0)),
    unit: unitSuffix(b.unit),
    shape: b.shape === "bullet" ? "bullet" : "angular",
    barColor: b.barColor || "#3b82f6",
    bands,
    height: Math.max(b.shape === "bullet" ? 70 : 140, parseInt(b.height) || (b.shape === "bullet" ? 90 : 220)),
  };
}

function emitGauge(parent, b, uc) {
  const c = gaugeConfig(b, uc);
  const label = (b.label || "").trim() || (b.loc || "").trim();
  const labelCode = label
    ? `    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';margin-bottom:2px;';
    lbl.textContent = ${locExpr(b.loc, b.label)};
    wrapper.appendChild(lbl);
`
    : "";
  const core = `// Gauge: ${(b.symbol || "").trim() || "(kein Symbol)"}
(function () {
    var PLOTLY_SRC = ${jsStr(PLOTLY_SRC)}; // Pfad ab HMI-Root – ggf. anpassen
    var VALUE_SRC = ${jsStr(c.valueSrc)};
    var MIN_SRC = ${jsStr(c.minSrc)}, MAX_SRC = ${jsStr(c.maxSrc)};
    var SP_MODE = ${jsStr(c.spMode)}; // 'none' | 'fixed' | 'symbol'
    var SP_SRC = ${jsStr(c.spSrc)};
    var SHAPE = ${jsStr(c.shape)}; // 'angular' | 'bullet'
    var DEC = ${c.dec}, UNIT = ${jsStr(c.unit)};
    var BAR_COLOR = ${jsStr(c.barColor)}, SP_COLOR = ${jsStr(c.spColor)};
    var BANDS = ${JSON.stringify(c.bands)};
    var HEIGHT = ${c.height};
    var st = { value: null, min: ${c.min}, max: ${c.max}, sp: ${c.spMode === "fixed" && c.spValue !== null ? c.spValue : "null"} };
    var plotDiv = null, wrapper = null, ro = null, onWinResize = null, ready = false, pending = null;

${ENSURE_PLOTLY_SRC}
${RESIZE_SRC}
${bindSrc(uc)}
    function rangeNow() { var lo = Number(st.min), hi = Number(st.max); if (!isFinite(lo)) lo = 0; if (!isFinite(hi) || hi <= lo) hi = lo + 100; return [lo, hi]; }
    function buildTrace() {
        var g = {
            shape: SHAPE,
            axis: { range: rangeNow(), tickcolor: p.bodyText, tickfont: { color: p.bodyText, size: 11 } },
            bar: { color: BAR_COLOR, thickness: SHAPE === 'bullet' ? 0.5 : 0.3 },
            bgcolor: 'rgba(127,127,127,0.12)', borderwidth: 0,
            steps: BANDS
        };
        if (SP_MODE !== 'none' && st.sp !== null && isFinite(Number(st.sp))) g.threshold = { line: { color: SP_COLOR, width: 4 }, thickness: 0.85, value: Number(st.sp) };
        return { type: 'indicator', mode: 'gauge+number', value: st.value === null ? undefined : st.value,
            number: { suffix: UNIT, valueformat: '.' + DEC + 'f', font: { color: p.bodyText, size: SHAPE === 'bullet' ? 22 : 30 } },
            gauge: g, domain: SHAPE === 'bullet' ? { x: [0, 0.74], y: [0.1, 0.9] } : { x: [0, 1], y: [0, 1] } };
    }
    function buildLayout() { return { autosize: true, height: HEIGHT, margin: SHAPE === 'bullet' ? { l: 8, r: 8, t: 6, b: 24 } : { l: 26, r: 26, t: 16, b: 6 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: p.bodyText } }; }
    // Updates bündeln (mehrere Abos feuern beim Aufbau kurz hintereinander)
    function render() {
        if (pending) return;
        pending = setTimeout(function () { pending = null; if (!ready || !plotDiv || !window.Plotly) return; try { var pr = window.Plotly.react(plotDiv, [buildTrace()], buildLayout(), { displayModeBar: false, responsive: true, staticPlot: true }); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }, 60);
    }

    // ── Aufbau ──
    wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;min-width:0;margin-bottom:16px;';
${labelCode}    plotDiv = document.createElement('div');
    plotDiv.style.cssText = 'width:100%;height:' + HEIGHT + 'px;min-width:0;';
    wrapper.appendChild(plotDiv);
    ${parent}.appendChild(wrapper);

    bindV(VALUE_SRC, function (v) { var n = Number(v); if (isNaN(n) || !isFinite(n)) return; st.value = n; render(); });
    bindV(MIN_SRC, function (v) { var n = Number(v); if (isNaN(n) || !isFinite(n)) return; st.min = n; render(); });
    bindV(MAX_SRC, function (v) { var n = Number(v); if (isNaN(n) || !isFinite(n)) return; st.max = n; render(); });
    if (SP_MODE === 'symbol') bindV(SP_SRC, function (v) { var n = Number(v); if (isNaN(n) || !isFinite(n)) return; st.sp = n; render(); });

    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(function () { resize(); }); ro.observe(wrapper); }
    else { onWinResize = function () { resize(); }; window.addEventListener('resize', onWinResize); }

    teardowns.push(function () {
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

export { gaugeConfig, emitGauge };
