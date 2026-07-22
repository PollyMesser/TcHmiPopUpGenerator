import { jsStr, wrapSym, locExpr, wrapSymAny, indentLines, I } from "./helpers.js";
import { DEFAULT_TIME_BUTTONS } from "../model/factories.js";

// ── Plot-Baustein: eigenständiges Modul (modus-unabhängig, eigene subscribe/watchers) ──
function plotBlockConfig(b) {
  const axIndex = (axisId) => { const i = (b.axes || []).findIndex((a) => a.id === axisId); return i < 0 ? 0 : i; };
  const axesOut = (b.axes || []).map((a) => ({ label: a.label || "", loc: (a.loc || "").trim(), unit: a.unit || "", color: a.color, autoscale: !!a.autoscale, min: Number(a.min) || 0, max: Number(a.max) || 100 }));
  const seriesOut = (b.series || []).map((s) => ({ symbol: wrapSym(s.symbol), label: s.label || "", loc: (s.loc || "").trim(), color: s.color, axis: axIndex(s.axisId) }));
  const refsOut = (b.refLines || []).map((r) => ({ mode: r.mode, value: Number(r.value) || 0, symbol: r.mode === "symbol" ? wrapSym(r.symbol) : "", label: r.label || "", loc: (r.loc || "").trim(), color: r.color, dash: r.dash || "dash", axis: axIndex(r.axisId) }));
  const markersOut = (b.eventMarkers || []).map((m) => ({ kind: m.kind === "metric" ? "metric" : "enum", symbol: wrapSymAny(m.symbol), color: m.color, dash: m.dash || "dot", mode: m.mode === "latest" ? "latest" : "all", onlyMapped: !!m.onlyMapped, markInitial: !!m.markInitial, showValue: m.showValue !== false, prefix: m.prefix || "", prefixLoc: (m.prefixLoc || "").trim(), decimals: Math.max(0, parseInt(m.decimals) || 0), mappings: (m.mappings || []).map((mp) => ({ value: String(mp.value == null ? "" : mp.value).trim(), label: mp.label || "", loc: (mp.loc || "").trim() })) }));
  const tbs = (b.timeButtons && b.timeButtons.length) ? b.timeButtons : DEFAULT_TIME_BUTTONS;
  const timeBtnsOut = tbs.map((t) => t.unit === "all"
    ? { step: "all", label: t.label || "Alle" }
    : { count: Math.max(1, Number(t.count) || 1), step: t.unit, stepmode: "backward", label: t.label || (String(Math.max(1, Number(t.count) || 1)) + " " + t.unit) });
  const J = (o) => JSON.stringify(o, null, 4);
  return {
    axes: J(axesOut), series: J(seriesOut), refLines: J(refsOut), markers: J(markersOut), timeButtons: J(timeBtnsOut),
    dataMode: b.dataMode === "history" ? "history" : "live",
    followMs: Math.max(1, Number(b.followSec) || 300) * 1000,
    historyMs: Math.max(60, Number(b.historyLoadSec) || 3600) * 1000,
    maxPoints: Math.max(10, Number(b.maxPoints) || 3600),
    plotHeight: Math.max(200, Number(b.plotHeight) || 360),
    showRs: b.showRangeslider ? "true" : "false",
    showXAxis: b.showXAxis !== false ? "true" : "false",
    showToolbar: b.showToolbar ? "true" : "false",
    showZoom: b.zoomEnabled !== false ? "true" : "false",
    initialFollow: b.dataMode === "history" ? "false" : "true",
    captionExpr: locExpr(b.captionLoc, b.caption || "Verlauf"),
    nowExpr: locExpr(b.nowLoc, b.nowLabel || "Jetzt"),
    resetExpr: locExpr(b.resetLoc, b.resetLabel || "Zurücksetzen"),
  };
}
function emitPlot(parent, b) {
  const c = plotBlockConfig(b);
  // ── Statistik-Tabelle (optional): Alle Einfügepunkte sind leere Strings, wenn
  //    showStats aus ist – der generierte Code bleibt dann byte-identisch. ──
  const S = !!b.showStats;
  const statsFns = !S ? "" : `    // ── Statistik-Tabelle (Bezug: sichtbarer x-Ausschnitt, live aktualisiert) ──
    var statsWrap = null, statsCells = [], statsRangeEl = null, statsOpen = true;
    function fmtStatNum(v) { var a = Math.abs(v); var d = a >= 100 ? 0 : (a >= 10 ? 1 : 2); return v.toFixed(d); }
    function fmtStatDur(ms) {
        if (!isFinite(ms) || ms < 0) ms = 0;
        var s = Math.round(ms / 1000);
        var d = Math.floor(s / 86400); s -= d * 86400;
        var h = Math.floor(s / 3600); s -= h * 3600;
        var m = Math.floor(s / 60); s -= m * 60;
        var out = [];
        if (d) out.push(d + ' d');
        if (h) out.push(h + ' h');
        if (m) out.push(m + ' min');
        if (!d && !h && s) out.push(s + ' s');
        return out.length ? out.join(' ') : '0 s';
    }
    function updateStats() {
        if (!statsWrap || !plotDiv || !plotDiv.data) return;
        var r = (plotDiv.layout && plotDiv.layout.xaxis) ? plotDiv.layout.xaxis.range : null;
        var r0 = r ? new Date(r[0]).getTime() : NaN;
        var r1 = r ? new Date(r[1]).getTime() : NaN;
        if (isNaN(r0) || isNaN(r1)) {
            // Fallback vor dem ersten Relayout: gesamte vorhandene Datenspanne
            r0 = Infinity; r1 = -Infinity;
            plotDiv.data.forEach(function (tr) { var xs = tr.x || []; if (xs.length) { var a = (xs[0] instanceof Date) ? xs[0].getTime() : new Date(xs[0]).getTime(); var z = (xs[xs.length - 1] instanceof Date) ? xs[xs.length - 1].getTime() : new Date(xs[xs.length - 1]).getTime(); if (a < r0) r0 = a; if (z > r1) r1 = z; } });
            if (!isFinite(r0) || !isFinite(r1)) return;
        }
        if (statsRangeEl) statsRangeEl.textContent = fmtStatDur(r1 - r0);
        series.forEach(function (s, i) {
            var cells = statsCells[i]; var tr = plotDiv.data[i];
            if (!cells || !tr) return;
            var u = axes[s.axis] ? (axes[s.axis].unit || '') : '';
            var suf = u ? (u === '%' ? u : ' ' + u) : '';
            var xs = tr.x || [], ys = tr.y || [], vals = [];
            for (var k = 0; k < xs.length; k++) {
                var t = (xs[k] instanceof Date) ? xs[k].getTime() : new Date(xs[k]).getTime();
                if (t >= r0 && t <= r1) { var v = Number(ys[k]); if (!isNaN(v) && isFinite(v)) vals.push(v); }
            }
            var cur = null;
            for (var q = ys.length - 1; q >= 0; q--) { var cv = Number(ys[q]); if (!isNaN(cv) && isFinite(cv)) { cur = cv; break; } }
            cells.cur.textContent = cur === null ? '–' : fmtStatNum(cur) + suf;
            if (!vals.length) { cells.min.textContent = '–'; cells.max.textContent = '–'; cells.mean.textContent = '–'; cells.med.textContent = '–'; return; }
            var mn = vals[0], mx = vals[0], sum = 0;
            for (var w = 0; w < vals.length; w++) { var vv = vals[w]; if (vv < mn) mn = vv; if (vv > mx) mx = vv; sum += vv; }
            var sorted = vals.slice().sort(function (a2, b2) { return a2 - b2; });
            var med = (sorted.length % 2 === 1) ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
            cells.min.textContent = fmtStatNum(mn) + suf;
            cells.max.textContent = fmtStatNum(mx) + suf;
            cells.mean.textContent = fmtStatNum(sum / vals.length) + suf;
            cells.med.textContent = fmtStatNum(med) + suf;
        });
    }
`;
  const statsDom = !S ? "" : `    // Statistik-Tabelle unter dem Plot (einklappbar)
    statsWrap = document.createElement('div');
    statsWrap.style.cssText = 'margin-top:8px;border:1px solid ' + pp.border + ';border-radius:8px;overflow:hidden;';
    var stHead = document.createElement('div');
    stHead.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;font-size:16px;font-weight:600;color:' + pp.bodyText + ';';
    var stArrow = document.createElement('span'); stArrow.textContent = '▾'; stArrow.style.cssText = 'flex:0 0 auto;transition:transform .15s;';
    var stTitle = document.createElement('span'); stTitle.textContent = locP('L_Stat_Title', 'Statistik'); stTitle.style.cssText = 'flex:1 1 auto;';
    var stRangeLbl = document.createElement('span'); stRangeLbl.style.cssText = 'flex:0 0 auto;font-weight:400;opacity:.75;'; stRangeLbl.textContent = locP('L_Stat_Range', 'Zeitraum') + ':';
    statsRangeEl = document.createElement('span'); statsRangeEl.style.cssText = 'flex:0 0 auto;font-variant-numeric:tabular-nums;';
    stHead.appendChild(stArrow); stHead.appendChild(stTitle); stHead.appendChild(stRangeLbl); stHead.appendChild(statsRangeEl);
    statsWrap.appendChild(stHead);
    var stTblWrap = document.createElement('div');
    stTblWrap.style.cssText = 'overflow-x:auto;';
    var stTbl = document.createElement('table');
    stTbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:16px;color:' + pp.bodyText + ';';
    var stThead = document.createElement('tr');
    ['', locP('L_Stat_Min', 'Min'), locP('L_Stat_Max', 'Max'), locP('L_Stat_Mean', 'Mittel'), locP('L_Stat_Median', 'Median'), locP('L_Stat_Now', 'Aktuell')].forEach(function (h, hi) {
        var th = document.createElement('th');
        th.textContent = h;
        th.style.cssText = 'text-align:' + (hi === 0 ? 'left' : 'right') + ';padding:5px 10px;border-top:1px solid ' + pp.border + ';font-weight:600;opacity:.8;white-space:nowrap;';
        stThead.appendChild(th);
    });
    stTbl.appendChild(stThead);
    series.forEach(function (s) {
        var strow = document.createElement('tr');
        var tdName = document.createElement('td');
        tdName.style.cssText = 'padding:5px 10px;border-top:1px solid ' + pp.border + ';white-space:nowrap;';
        var stsw = document.createElement('span'); stsw.style.cssText = 'display:inline-block;width:10px;height:3px;border-radius:2px;background:' + s.color + ';margin-right:6px;vertical-align:middle;';
        var stnm = document.createElement('span'); stnm.textContent = locP(s.loc, s.label);
        tdName.appendChild(stsw); tdName.appendChild(stnm); strow.appendChild(tdName);
        var cells = {};
        ['min', 'max', 'mean', 'med', 'cur'].forEach(function (key) {
            var td = document.createElement('td');
            td.textContent = '–';
            td.style.cssText = 'padding:5px 10px;border-top:1px solid ' + pp.border + ';text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;';
            cells[key] = td; strow.appendChild(td);
        });
        statsCells.push(cells); stTbl.appendChild(strow);
    });
    stTblWrap.appendChild(stTbl); statsWrap.appendChild(stTblWrap);
    stHead.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    stHead.onclick = function () { statsOpen = !statsOpen; stTblWrap.style.display = statsOpen ? '' : 'none'; stArrow.style.transform = statsOpen ? '' : 'rotate(-90deg)'; };
    wrapper.appendChild(statsWrap);
`;
  const hookPush = S ? " updateStats();" : "";
  const hookLive = S ? " updateStats();" : "";
  const hookRelayout = S ? " updateStats();" : "";
  const hookInit = S ? " updateStats();" : "";
  const hookTear = S ? " statsWrap = null; statsCells = []; statsRangeEl = null;" : "";
  const core = `// Plotly-Verlauf (eigenständiges Modul, eigener Lebenszyklus)
(function () {
    var axes = ${c.axes};
    var series = ${c.series};
    var refLines = ${c.refLines};
    var eventMarkers = ${c.markers};
    var TIME_BUTTONS = ${c.timeButtons};

    var DATA_MODE        = ${jsStr(c.dataMode)}; // 'live' | 'history'
    var FOLLOW_WINDOW_MS = ${c.followMs};
    var HISTORY_LOAD_MS  = ${c.historyMs};
    var MAX_POINTS       = ${c.maxPoints};
    var MAX_EVENT_LINES  = 40;
    var SHOW_RANGESLIDER = ${c.showRs};
    var SHOW_X_AXIS      = ${c.showXAxis};
    var SHOW_TOOLBAR     = ${c.showToolbar};
    var PLOT_HEIGHT      = ${c.plotHeight};
    var ZOOM_ENABLED     = ${c.showZoom};
    var PLOTLY_SRC       = 'Assets/plotly-3.6.0.min.js'; // Pfad ab HMI-Root – ggf. anpassen

    var watchers = [], symbols = [], plotDiv = null, wrapper = null, ro = null, onWinResize = null, trendHandle = null;
    // Eindeutiger chartName pro Popup-Instanz (Zeit + Zufall), damit mehrere gleichzeitig
    // offene Trend-Popups/Embeds niemals denselben chartName teilen (serverseitiges
    // Verhalten bei gleichzeitig gleichem chartName war im Test nicht geprueft).
    var trendChartName = 'AC_HMI_TrendPopup_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var followMode = ${c.initialFollow}, suppressRelayout = false, initialXRange = null, lastNewestMs = 0, setupDone = false;
    var refValues = {}, eventLines = [], markerLast = {}, currentPalette = null;

    function locP(key, fallback) {
        try { var f = TcHmi.Functions.getFunction('GetLocalizedText'); if (f) { var t = f(key); if (t !== null && t !== undefined && t !== '') return t; } } catch (e) {}
        return fallback || key;
    }
    function bgLum() {
        var cand = [document.querySelector('.TcHmi_Controls_System_TcHmiView'), document.getElementById('Content'), document.body, document.documentElement];
        for (var i = 0; i < cand.length; i++) { var el = cand[i]; if (!el) continue; var bg = window.getComputedStyle(el).backgroundColor; var m = bg && bg.match(/[0-9.]+/g); if (!m) continue; var r = +m[0], g = +m[1], bl = +m[2], a = m.length > 3 ? +m[3] : 1; if (a < 0.1) continue; return (0.299 * r + 0.587 * g + 0.114 * bl) / 255; }
        return 0.15;
    }
    function pal() {
        if (bgLum() < 0.5) return { boxBg:'#1a1d2e', border:'#2a2d3a', headerBg:'#161822', titleColor:'#ffffff', bodyText:'#e0e0e0', grid:'rgba(255,255,255,0.10)', accent:'#3b82f6' };
        return { boxBg:'#ffffff', border:'#d0d4de', headerBg:'#f2f4f8', titleColor:'#1a1d2e', bodyText:'#333333', grid:'rgba(0,0,0,0.10)', accent:'#3b82f6' };
    }
    function subscribeP(symbolStr, onChange) {
        try { var sym = new TcHmi.Symbol(symbolStr); symbols.push(sym); watchers.push(sym.watch(function (data) { if (data.error !== TcHmi.Errors.NONE) return; onChange(data.value); })); } catch (e) {}
    }
    // Schlichten ADS-Pfad aus '%s%...%/s%' herausschaelen (backslash-frei, keine Regex).
    function plainSym(symbolStr) {
        var plain = symbolStr || '';
        if (plain.indexOf('%s%') === 0) plain = plain.slice(3);
        var suf = '%/s%';
        if (plain.length >= suf.length && plain.slice(-suf.length) === suf) plain = plain.slice(0, -suf.length);
        return plain;
    }
    // History + Live in EINEM Stream: TcHmiSqliteHistorize.GetTrendLineData als Subscription.
    // Contract per WS-Mitschnitt bestaetigt (16.07.2026): chartName frei waehlbar,
    // Aufschluesselung erfolgt ueber yAxes; readValue.axesData ist positionsgleich zu yAxes.
    // Der Server liefert bei jedem Push das komplette Fenster (serverseitig auf displayWidth ausgeduennt).
    function subscribeTrendData(symbolList, lookbackIso, displayWidth, chartName, onSeries) {
        try {
            var yAxes = symbolList.map(function (s) { return { symbol: plainSym(s) }; });
            var handle = { subscriptionId: null };
            TcHmi.Server.requestEx({
                requestType: 'Subscription',
                intervalTime: 1000,
                commands: [{
                    symbol: 'TcHmiSqliteHistorize.GetTrendLineData',
                    version: 1,
                    commandOptions: ['SendErrorMessage', 'SendWriteValue'],
                    writeValue: { chartName: chartName, xAxisStart: lookbackIso, xAxisEnd: 'Latest', yAxes: yAxes, displayWidth: displayWidth || 960, analyticsType: [] }
                }]
            }, {}, function (data) {
                if (!data || data.error !== TcHmi.Errors.NONE) return;
                var resp = data.response;
                if (!resp || !resp.commands || !resp.commands.length) return;
                if (resp.id != null) handle.subscriptionId = resp.id;
                var cmd = resp.commands[0];
                if (cmd.error != null && cmd.error !== 0) return;
                var rv = cmd.readValue;
                if (!rv || !rv.axesData) return;
                onSeries(rv.axesData.map(function (arr) { return (arr || []).map(function (pt) { return { t: pt.x, v: pt.y }; }); }));
            });
            return handle;
        } catch (e) { return { subscriptionId: null }; }
    }
    function unsubscribeTrend(handle) {
        if (!handle || handle.subscriptionId == null) return;
        try { TcHmi.Server.requestEx({ requestType: 'ReadWrite', commands: [{ symbol: 'Unsubscribe', commandOptions: ['SendErrorMessage'], writeValue: handle.subscriptionId }] }, {}, function () {}); } catch (e) {}
        handle.subscriptionId = null;
    }
    function ensurePlotly(cb) {
        if (window.Plotly) { cb(); return; }
        var existing = document.getElementById('ac-plotly-loader');
        if (existing) { existing.addEventListener('load', cb); return; }
        var s = document.createElement('script'); s.id = 'ac-plotly-loader'; s.src = PLOTLY_SRC;
        s.onload = function () { cb(); };
        s.onerror = function () { if (plotDiv) { plotDiv.textContent = locP('L_PlotLoadError', 'Plotly konnte nicht geladen werden: ' + PLOTLY_SRC); plotDiv.style.color = pal().bodyText; plotDiv.style.fontSize = '20px'; } };
        document.head.appendChild(s);
    }
    function axisRef(idx) { return idx === 0 ? 'y' : ('y' + (idx + 1)); }
    function refValue(r, k) { return r.mode === 'symbol' ? (refValues[k] != null ? refValues[k] : r.value) : r.value; }
    function buildShapes() {
        var shapes = refLines.map(function (r, k) { var v = refValue(r, k); return { type:'line', xref:'paper', x0:0, x1:1, yref: axisRef(r.axis || 0), y0:v, y1:v, line:{ color:r.color, width:1.5, dash:r.dash || 'dash' }, layer:'above' }; });
        eventLines.forEach(function (ev) { shapes.push({ type:'line', xref:'x', x0:ev.t, x1:ev.t, yref:'paper', y0:0, y1:1, line:{ color:ev.color, width:1.5, dash:ev.dash || 'dot' }, layer:'above' }); });
        return shapes;
    }
    function buildAnnotations(pp) {
        var anns = refLines.map(function (r, k) { var v = refValue(r, k); return { xref:'paper', x:0.01, xanchor:'left', yref: axisRef(r.axis || 0), y:v, yanchor:'bottom', text: locP(r.loc, r.label), showarrow:false, font:{ color:r.color, size:10 }, bgcolor:pp.boxBg, opacity:0.85 }; });
        eventLines.forEach(function (ev) { anns.push({ xref:'x', x:ev.t, xanchor:'left', yref:'paper', y:1, yanchor:'top', text: ev.text, showarrow:false, font:{ color:ev.color, size:10 }, bgcolor:pp.boxBg, opacity:0.9 }); });
        return anns;
    }
    function refreshEventLayer() { if (!plotDiv || !window.Plotly || !currentPalette) return; suppressRelayout = true; window.Plotly.relayout(plotDiv, { shapes: buildShapes(), annotations: buildAnnotations(currentPalette) }).then(function () { suppressRelayout = false; }).catch(function () { suppressRelayout = false; }); }
    function pushEventLine(m, k, v) {
        var text = null;
        if (m.kind === 'metric') {
            // Metrische Variable: bei jeder Änderung markieren, optional Wert (mit Präfix) ausgeben
            var pfx = locP(m.prefixLoc, m.prefix);
            if (m.showValue) {
                var num = Number(v);
                var vs = (!isNaN(num) && isFinite(num)) ? num.toFixed(m.decimals || 0) : String(v);
                text = (pfx ? pfx : '') + vs;
            } else {
                text = pfx ? pfx : '';
            }
        } else {
            for (var i = 0; i < m.mappings.length; i++) { if (String(m.mappings[i].value) === String(v)) { text = locP(m.mappings[i].loc, m.mappings[i].label); break; } }
            if (text === null) { if (m.onlyMapped) return; text = String(v); }
        }
        if (m.mode === 'latest') { eventLines = eventLines.filter(function (e) { return e.mk !== k; }); }
        eventLines.push({ mk: k, t: new Date(), text: text, color: m.color, dash: m.dash });
        while (eventLines.length > MAX_EVENT_LINES) eventLines.shift();
        refreshEventLayer();
    }
    function buildTraces() { return series.map(function (s) { return { x: [], y: [], mode: 'lines', name: locP(s.loc, s.label), line: { width: 2, color: s.color }, yaxis: axisRef(s.axis || 0), visible: true }; }); }
    function buildLayout(pp) {
        var AX_STEP = 0.07, leftCount = 0, rightCount = 0;
        axes.forEach(function (a, i) { if (i % 2 === 0) leftCount++; else rightCount++; });
        var leftInset = leftCount > 1 ? (leftCount - 1) * AX_STEP : 0;
        var rightInset = rightCount > 1 ? (rightCount - 1) * AX_STEP : 0;
        var layout = { autosize: true, margin: { l: 56, r: 56, t: 14, b: SHOW_RANGESLIDER ? (SHOW_X_AXIS ? 14 : 10) : (SHOW_X_AXIS ? 34 : 8) }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { color: pp.bodyText, size: 11 }, dragmode: ZOOM_ENABLED ? 'zoom' : false, showlegend: false, shapes: buildShapes(), annotations: buildAnnotations(pp),
            xaxis: { type: 'date', gridcolor: pp.grid, zeroline: false, fixedrange: !ZOOM_ENABLED, domain: [leftInset, 1 - rightInset], showticklabels: SHOW_X_AXIS, ticks: SHOW_X_AXIS ? 'outside' : '', rangeselector: (TIME_BUTTONS && TIME_BUTTONS.length) ? { x: 0, y: 1.12, bgcolor: pp.headerBg, activecolor: pp.accent, bordercolor: pp.border, borderwidth: 1, font: { color: pp.bodyText, size: 11 }, buttons: TIME_BUTTONS } : { visible: false }, rangeslider: SHOW_RANGESLIDER ? { visible: true, thickness: 0.10, bgcolor: pp.headerBg, bordercolor: pp.border, borderwidth: 1 } : { visible: false } } };
        var li = 0, ri = 0;
        axes.forEach(function (a, i) {
            var key = i === 0 ? 'yaxis' : ('yaxis' + (i + 1));
            var side, free = false, position;
            if (i % 2 === 0) { side = 'left'; if (li > 0) { free = true; position = li * AX_STEP; } li++; }
            else { side = 'right'; if (ri > 0) { free = true; position = 1 - ri * AX_STEP; } ri++; }
            var ttl = locP(a.loc, a.label); ttl = (ttl ? ttl : '') + (a.unit ? ((ttl ? ' ' : '') + '(' + a.unit + ')') : '');
            var ax = { title: { text: ttl, font: { color: a.color, size: 11 } }, tickfont: { color: a.color, size: 10 }, color: a.color, gridcolor: i === 0 ? pp.grid : 'rgba(0,0,0,0)', zeroline: false, side: side, fixedrange: !ZOOM_ENABLED };
            if (i > 0) ax.overlaying = 'y';
            if (free) { ax.anchor = 'free'; ax.position = position; } else { ax.anchor = 'x'; }
            if (!a.autoscale) { ax.range = [a.min, a.max]; ax.autorange = false; }
            layout[key] = ax;
        });
        return layout;
    }
    function applyFollow() { if (!followMode || !plotDiv || !window.Plotly) return; var now = Date.now(); suppressRelayout = true; window.Plotly.relayout(plotDiv, { 'xaxis.range': [new Date(now - FOLLOW_WINDOW_MS), new Date(now)] }).then(function () { suppressRelayout = false; }).catch(function () { suppressRelayout = false; }); }
    // History: Fenster (Breite HISTORY_LOAD_MS) ans neueste Datum schieben.
    // Breite des mitlaufenden Live-Ausschnitts (kann kleiner sein als die geladene Historie).
    function liveWinMs() { return Math.min(FOLLOW_WINDOW_MS, HISTORY_LOAD_MS); }
    function rollHistory() { if (!plotDiv || !window.Plotly || !lastNewestMs) return; var w = liveWinMs(); suppressRelayout = true; window.Plotly.relayout(plotDiv, { 'xaxis.range': [new Date(lastNewestMs - w), new Date(lastNewestMs)] }).then(function () { suppressRelayout = false; }).catch(function () { suppressRelayout = false; }); }
    function jumpToNow() { followMode = true; if (DATA_MODE === 'history') rollHistory(); else applyFollow(); }
    function resetView() {
        if (!plotDiv || !window.Plotly) return;
        var upd = {};
        axes.forEach(function (a, i) {
            var key = i === 0 ? 'yaxis' : ('yaxis' + (i + 1));
            if (!a.autoscale) { upd[key + '.range'] = [a.min, a.max]; upd[key + '.autorange'] = false; }
            else { upd[key + '.autorange'] = true; }
        });
        if (DATA_MODE === 'history') { followMode = true; }
        else { followMode = true; } // Live: zurück zum Mitlaufen
        suppressRelayout = true;
        window.Plotly.relayout(plotDiv, upd).then(function () { suppressRelayout = false; if (followMode) { if (DATA_MODE === 'history') rollHistory(); else applyFollow(); } }).catch(function () { suppressRelayout = false; });
    }
${statsFns}    function isDisplayed() { return !!plotDiv && plotDiv.offsetParent !== null && plotDiv.clientWidth > 1 && plotDiv.clientHeight > 1; }
    function resize() { if (!window.Plotly || !isDisplayed()) return; try { var p = window.Plotly.Plots.resize(plotDiv); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    // Sichtbaren Zustand herstellen: nach echtem Layout den beabsichtigten x-Bereich neu anwenden.
    function reapplyView() {
        if (!isDisplayed() || !window.Plotly || !plotDiv) return;
        if (DATA_MODE === 'history') { if (followMode) rollHistory(); }
        else if (followMode) applyFollow();
    }
    function initPlot(pp) {
        currentPalette = pp;
        ensurePlotly(function () {
            if (!plotDiv) return;
            window.Plotly.newPlot(plotDiv, buildTraces(), buildLayout(pp), { displayModeBar: false, responsive: true, scrollZoom: ZOOM_ENABLED });
            plotDiv.on('plotly_relayout', function (ev) { if (suppressRelayout || !setupDone) return; if (ev['xaxis.autorange'] === true) { followMode = true; reapplyView(); } else if (ev['xaxis.range'] !== undefined || ev['xaxis.range[0]'] !== undefined) { followMode = false; }${hookRelayout} });
            if (DATA_MODE === 'history') {
                // History + Live in EINEM Subscription-Stream. Fenster (Breite HISTORY_LOAD_MS)
                // läuft mit den neuesten Daten mit, solange nicht manuell gezoomt/gepannt wurde.
                followMode = true;
                var endMs = Date.now(), startMs = endMs - liveWinMs();
                initialXRange = [new Date(startMs), new Date(endMs)];
                suppressRelayout = true; window.Plotly.relayout(plotDiv, { 'xaxis.range': [new Date(startMs), new Date(endMs)] }).then(function () { suppressRelayout = false; }).catch(function () { suppressRelayout = false; });
                var lookbackIso = 'PT' + Math.max(1, Math.round(HISTORY_LOAD_MS / 1000)) + 'S';
                var symbolList = series.map(function (s) { return s.symbol; });
                trendHandle = subscribeTrendData(symbolList, lookbackIso, Math.max(200, plotDiv.clientWidth || 960), trendChartName, function (seriesData) {
                    if (!plotDiv || !window.Plotly || !seriesData || !seriesData.length) return;
                    var xs = [], ys = [], idx = [], newestMs = 0;
                    seriesData.forEach(function (arr, i) {
                        if (i >= series.length) return; // Sicherheit: nur bekannte Traces bedienen
                        var xarr = arr.map(function (pt) { return new Date(pt.t); });
                        if (xarr.length) { var lm = xarr[xarr.length - 1].getTime(); if (lm > newestMs) newestMs = lm; }
                        xs.push(xarr); ys.push(arr.map(function (pt) { return pt.v; })); idx.push(i);
                    });
                    if (newestMs) lastNewestMs = newestMs;
                    // Suppress ueber restyle UND Roll halten, damit der Relayout-Handler
                    // die programmatische Aenderung nicht als Nutzer-Zoom missversteht.
                    suppressRelayout = true;
                    var afterData = idx.length ? window.Plotly.restyle(plotDiv, { x: xs, y: ys }, idx) : Promise.resolve();
                    afterData.then(function () {
                        if (followMode && newestMs && isDisplayed()) {
                            return window.Plotly.relayout(plotDiv, { 'xaxis.range': [new Date(newestMs - liveWinMs()), new Date(newestMs)] });
                        }
                    }).then(function () { suppressRelayout = false;${hookPush} }).catch(function () { suppressRelayout = false; });
                });
            } else {
                // Reiner Live-Modus (unveraendert): pro Signal per TcHmi.Symbol.watch anhaengen.
                series.forEach(function (s, i) { subscribeP(s.symbol, function (v) { if (!plotDiv) return; var num = Number(v); if (isNaN(num)) return; window.Plotly.extendTraces(plotDiv, { x: [[new Date()]], y: [[num]] }, [i], MAX_POINTS); applyFollow();${hookLive} }); });
            }
            refLines.forEach(function (r, k) { if (r.mode === 'symbol' && r.symbol) { subscribeP(r.symbol, function (v) { var num = Number(v); if (isNaN(num)) return; refValues[k] = num; if (!plotDiv || !window.Plotly) return; var upd = {}; upd['shapes[' + k + '].y0'] = num; upd['shapes[' + k + '].y1'] = num; upd['annotations[' + k + '].y'] = num; suppressRelayout = true; window.Plotly.relayout(plotDiv, upd).then(function () { suppressRelayout = false; }).catch(function () { suppressRelayout = false; }); }); } });
            eventMarkers.forEach(function (m, k) { if (!m.symbol) return; subscribeP(m.symbol, function (v) { var key = 'm' + k; var first = !(key in markerLast); if (!first && String(markerLast[key]) === String(v)) return; markerLast[key] = v; if (first && !m.markInitial) return; pushEventLine(m, k, v); }); });
            resize(); setupDone = true;${hookInit}
            if (DATA_MODE === 'live') applyFollow(); else reapplyView();
        });
    }

    // ── Aufbau in den Popup-Body ──
    var pp = pal();
    wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;min-width:0;margin-bottom:16px;';
    if (SHOW_TOOLBAR || ZOOM_ENABLED) {
        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:20px;font-weight:600;color:' + pp.titleColor + ';';
        var cap = document.createElement('span'); cap.style.cssText = 'flex:1 1 auto;'; if (SHOW_TOOLBAR) cap.textContent = ${c.captionExpr};
        bar.appendChild(cap);
        var btnStyle = 'flex:0 0 auto;border:1px solid ' + pp.border + ';background:transparent;color:' + pp.bodyText + ';font-size:16px;font-weight:600;cursor:pointer;padding:4px 10px;border-radius:6px;';
        if (ZOOM_ENABLED) {
            var resetBtn = document.createElement('button');
            resetBtn.style.cssText = btnStyle;
            resetBtn.textContent = ${c.resetExpr}; resetBtn.title = locP('L_ResetViewHint', 'Zoom/Ansicht auf Ausgangszustand zurücksetzen');
            resetBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            resetBtn.onclick = function (e) { e.stopPropagation(); resetView(); };
            bar.appendChild(resetBtn);
        }
        if (SHOW_TOOLBAR) {
            var nowBtn = document.createElement('button');
            nowBtn.style.cssText = btnStyle;
            nowBtn.textContent = ${c.nowExpr}; nowBtn.title = locP('L_JumpNowHint', 'Zum aktuellen Zeitpunkt springen');
            nowBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            nowBtn.onclick = function (e) { e.stopPropagation(); jumpToNow(); };
            bar.appendChild(nowBtn);
        }
        wrapper.appendChild(bar);
    }
    if (series.length >= 2) {
        var legend = document.createElement('div');
        legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;margin-bottom:10px;';
        series.forEach(function (s, i) {
            var lab = document.createElement('label'); lab.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:16px;color:' + pp.bodyText + ';';
            var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; cb.style.cssText = 'width:14px;height:14px;flex:0 0 auto;cursor:pointer;accent-color:' + s.color + ';';
            cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            cb.addEventListener('change', function () { if (!plotDiv || !window.Plotly) return; window.Plotly.restyle(plotDiv, { visible: cb.checked ? true : 'legendonly' }, [i]); });
            var sw = document.createElement('span'); sw.style.cssText = 'width:14px;height:3px;border-radius:2px;flex:0 0 auto;background:' + s.color + ';';
            var txt = document.createElement('span'); txt.textContent = locP(s.loc, s.label);
            lab.appendChild(cb); lab.appendChild(sw); lab.appendChild(txt); legend.appendChild(lab);
        });
        wrapper.appendChild(legend);
    }
    plotDiv = document.createElement('div');
    plotDiv.style.cssText = 'width:100%;height:' + PLOT_HEIGHT + 'px;min-width:0;';
    plotDiv.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    wrapper.appendChild(plotDiv);
${statsDom}    ${parent}.appendChild(wrapper);

    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(function () { resize(); reapplyView(); }); ro.observe(wrapper); }
    else { onWinResize = function () { resize(); reapplyView(); }; window.addEventListener('resize', onWinResize); }

    // Aufräumen beim Schließen des Popups (siehe hideDialog -> teardowns)
    teardowns.push(function () {
        for (var i = 0; i < watchers.length; i++) { try { watchers[i](); } catch (e) {} }
        for (var j = 0; j < symbols.length; j++) { try { symbols[j].destroy(); } catch (e) {} }
        watchers = []; symbols = [];
        if (trendHandle) { unsubscribeTrend(trendHandle); trendHandle = null; }
        if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
        if (onWinResize) { window.removeEventListener('resize', onWinResize); onWinResize = null; }
        try { if (window.Plotly && plotDiv) window.Plotly.purge(plotDiv); } catch (e) {}
        plotDiv = null; wrapper = null;${hookTear}
    });

    initPlot(pp);
})();`;
  return indentLines(core, I);
}

export { plotBlockConfig, emitPlot };
