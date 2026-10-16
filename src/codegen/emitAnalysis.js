import { jsStr, wrapSym, attrName, locExpr, indentLines, I } from "./helpers.js";
import { PLOTLY_SRC, ENSURE_PLOTLY_SRC, RESIZE_SRC } from "./plotlyRuntime.js";
import { RUNTIME_SECTIONS } from "../../analytics/plots/runtimeSource.generated.js";
import { METRICS } from "../../analytics/core/metrics.js";

// ── Auswertung (Maschinendaten): Filtrationskurven / Schrittdauern / Verlauf ──
// Das Modul rechnet NICHT selbst: Es holt das fertige Ergebnis-JSON (berechnet
// mit analytics/core, z. B. in einer TcHMI-Server-Extension oder einem Dienst)
// und zeichnet es mit den Plot-Buildern aus analytics/plots/runtime.js, die hier
// abschnittsweise wörtlich eingebettet werden (backslash-frei, ES5).
//
// Datenquellen:
//   historize – Rohdaten per <Domain>.GetTrendLineData (TcHmiPostgresHistorize / TcHmiSqliteHistorize),
//               Zusammenführen + Berechnung IM BROWSER (Rechenkern AC_CORE, eingebettet);
//               nur Filtrationskurven und Schrittdauern. Abfrageformat am 07.10.2026 in der HMI bestätigt.
//   http      – fetch(URL); GET (z. B. statische Demo-JSON im HMI-Projekt) oder POST mit Anfrage-JSON
//   server    – TcHmi.Server.requestEx, ReadWrite auf ein Server-Symbol, writeValue = Anfrage-JSON,
//               readValue = Ergebnis (Objekt oder JSON-String)
// http (POST) und server sind in der echten HMI noch NICHT verifiziert (keine Server-Seite vorhanden).

// Symbolpfad für historizedSymbolList: voller Pfad ohne %s%-Klammern
const plainPath = (s) => { let v = String(s || "").trim(); if (v.indexOf("%s%") === 0) v = v.slice(3); if (v.slice(-4) === "%/s%") v = v.slice(0, -4); return v; };

// ── Historize: Rohdaten holen, zusammenführen, im Browser rechnen ──
// Bestätigt (07.10.2026): ReadWrite auf <Domain>.GetTrendLineData, Symbol = voller Pfad,
// KEIN version-Feld, axesData[i] positionsgleich zu yAxes[i], Punkte { x: ISO-UTC, y },
// weniger Rohpunkte als displayWidth → Rohdaten. displayWidth wird deshalb aus Zeitraum
// und Aufzeichnungsintervall mit 25 % Reserve berechnet; kommen trotzdem ~displayWidth
// Punkte, war die Antwort verdichtet → Fehlermeldung statt falscher Schrittzeiten.
const HISTORIZE_FETCH = `        if (SOURCE.mode === 'historize') {
            if (!SOURCE.stepSym || !SOURCE.cycleSym || (WIDGET === 'filtration' && !SOURCE.leistungSym)) { cb(loc('L_AnalysisNoSource', 'Historize-Symbole nicht vollständig konfiguriert')); return; }
            var width = AC_CORE.rawDisplayWidth(SOURCE.days, SOURCE.intervalS);
            var yAxes = [{ symbol: SOURCE.stepSym }, { symbol: SOURCE.cycleSym }];
            if (SOURCE.leistungSym) yAxes.push({ symbol: SOURCE.leistungSym });
            try {
                TcHmi.Server.requestEx({ requestType: 'ReadWrite', commands: [{ symbol: SOURCE.domain + '.GetTrendLineData', commandOptions: ['SendErrorMessage', 'SendWriteValue'],
                    writeValue: { chartName: 'AC_Analysis_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), xAxisStart: new Date(Date.now() - SOURCE.days * 864e5).toISOString(),
                        xAxisEnd: 'Latest', yAxes: yAxes, displayWidth: width, analyticsType: [] } }] }, null, function (data) {
                    if (!data || data.error !== TcHmi.Errors.NONE || !data.response || !data.response.commands || !data.response.commands.length) { cb(loc('L_AnalysisServerError', 'Historize-Abfrage fehlgeschlagen')); return; }
                    var cmd = data.response.commands[0];
                    if (cmd.error && cmd.error.code) { cb((cmd.error.message || cmd.error.reason || 'Fehler') + ' (' + cmd.error.code + ')'); return; }
                    var ax = cmd.readValue && cmd.readValue.axesData;
                    if (!ax || ax.length < yAxes.length) { cb(loc('L_AnalysisBadData', 'Historize-Antwort unvollständig')); return; }
                    for (var ai = 0; ai < ax.length; ai++) {
                        if (AC_CORE.looksCompressed(ax[ai], width)) { cb(loc('L_AnalysisCompressed', 'Daten wurden verdichtet – Zeitraum verkürzen oder Intervall prüfen')); return; }
                    }
                    setStatus(loc('L_AnalysisComputing', 'berechnet …'));
                    setTimeout(function () {
                        try {
                            var rows = AC_CORE.mergeHistorizeSeries({ step: ax[0], cycle: ax[1], metrics: SOURCE.leistungSym ? { leistung: ax[2] } : {} },
                                { machine: SOURCE.machine, toleranceS: SOURCE.intervalS / 2 });
                            var opts = JSON.parse(JSON.stringify(PARAMS.options));
                            opts.timeZone = PARAMS.timeZone;
                            cb(null, WIDGET === 'filtration' ? AC_CORE.computeFiltrationCurves(rows, opts) : AC_CORE.computeStepDurations(rows, opts));
                        } catch (e) { cb(String(e && e.message || e)); }
                    }, 30);
                });
            } catch (e) { cb(String(e && e.message || e)); }
            return;
        }
`;

const WIDGET_SECTION = { filtration: "filtration", steps: "steps", trend: "trend" };

// Minuten-Feld des Editors → Sekunden; leer/ungültig → null
const minToS = (v) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v) * 60);
const list = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

/** Anfrage-JSON an den Server (siehe analytics/server/handler.js) */
function analysisParams(b) {
  const filter = { machines: list(b.machines), lastDays: Math.max(0, parseInt(b.lastDays) || 0) };
  const timeZone = (b.timeZone || "").trim() || "UTC";
  if (b.widget === "filtration") {
    // HMI-Fassung vereinfacht: fest % der Beschickungsdauer, keine Gruppierung (Material folgt später)
    return { widget: "filtration", options: { xMode: "norm", groupBy: "none", excluded: [] }, filter, timeZone };
  }
  if (b.widget === "steps") {
    const limits = (b.stepLimits || [])
      .map((l) => ({ group: l.group, minS: minToS(l.minMin), maxS: minToS(l.maxMin) }))
      .filter((l) => l.group && (l.minS != null || l.maxS != null));
    return { widget: "steps", options: { bucket: b.bucket === "week" ? "week" : "day", activeGroups: (b.activeGroups || []).length ? b.activeGroups : null, limits, excluded: [] }, filter, timeZone };
  }
  if (b.chart === "scatter") {
    return { widget: "scatter", options: { x: b.scX || "druck_zulauf", y: b.scY || "leistung", groupBy: b.trendGroupBy || "none" }, filter, timeZone };
  }
  const columns = (b.trendColumns || []).filter((c) => c.key).map((c) => ({ key: c.key, agg: c.agg || "avg" }));
  return { widget: "trend", options: { columns: columns.length ? columns : [{ key: "leistung", agg: "avg" }], groupBy: b.chart === "bar" ? (b.trendGroupBy || "material") : "tag" }, filter, timeZone };
}

/** Darstellungs-Optionen für die Plot-Builder */
const metricLabel = (key) => { const m = METRICS.find((x) => x.key === key); return m ? (m.unit ? m.label + " [" + m.unit + "]" : m.label) : key; };
function analysisView(b) {
  const decimals = Math.min(4, Math.max(0, parseInt(b.decimals) || 0));
  if (b.widget === "filtration") {
    // HMI-Fassung vereinfacht: nur Median + Band (25.–75. Perzentil), keine Einzellinien, kein Modell
    return { showCycles: false, approx: ["median"], decimals };
  }
  if (b.widget === "steps") {
    return { series: (b.stepSeries || []).length ? b.stepSeries : ["cat:active", "cat:secondary", "cat:total"],
      stats: (b.stepStats || []).length ? b.stepStats : ["avg"], decimals, showSubsteps: !!b.showSubsteps };
  }
  return { chart: b.chart === "bar" || b.chart === "scatter" ? b.chart : "line", decimals,
    xLabel: metricLabel(b.scX || "druck_zulauf"), yLabel: metricLabel(b.scY || "leistung") };
}

function emitAnalysis(parent, b, uc) {
  const widget = WIDGET_SECTION[b.widget] ? b.widget : "filtration";
  const params = analysisParams({ ...b, widget });
  const view = analysisView({ ...b, widget });
  const historize = b.srcMode === "historize" && widget !== "trend";
  const src = historize
    ? { mode: "historize", domain: b.hzDomain === "TcHmiSqliteHistorize" ? "TcHmiSqliteHistorize" : "TcHmiPostgresHistorize",
        stepSym: plainPath(b.hzStepSymbol), cycleSym: plainPath(b.hzCycleSymbol), leistungSym: widget === "filtration" ? plainPath(b.hzLeistungSymbol) : "",
        days: Math.min(31, Math.max(0.25, Number(b.hzDays) || 3)), intervalS: Math.max(1, Number(b.hzIntervalS) || 10), machine: (b.hzMachine || "").trim() || "Maschine" }
    : b.srcMode === "server"
      ? { mode: "server", symbol: (b.srcSymbol || "").trim() }
      : { mode: "http", url: (b.srcUrl || "").trim(), method: b.srcMethod === "POST" ? "POST" : "GET" };
  const machineSrc = !historize && (b.machineSymbol || "").trim() ? (uc ? attrName(b.machineSymbol) : wrapSym(b.machineSymbol)) : "";
  const height = Math.max(200, parseInt(b.height) || 380);
  const refreshMs = Math.max(0, Number(b.refreshMin) || 0) * 60000;
  const showTables = b.showTables !== false;
  const runtime = RUNTIME_SECTIONS.common + RUNTIME_SECTIONS[WIDGET_SECTION[widget]] + (historize ? RUNTIME_SECTIONS.core : "");
  const plotCall = widget === "filtration" ? "acFiltrationPlot(res, VIEW, th)"
    : widget === "steps" ? "acStepPlot(res, VIEW, th)"
      : "(VIEW.chart === 'scatter' ? acScatterPlot(res, VIEW, th) : acTrendPlot(res, VIEW, th))";
  const tablesCall = widget === "filtration" ? "acFiltrationTables(document, res, VIEW, th)"
    : widget === "steps" ? "acStepTables(document, res, VIEW, th)" : "null";
  const emptyCheck = widget === "filtration" ? "!res.groups || !res.groups.length"
    : widget === "steps" ? "!res.info || !res.info.cycles"
      : "(VIEW.chart === 'scatter' ? !res.points || !res.points.length : !res.n)";
  const machineCode = !machineSrc ? "" : uc
    ? `    function machineNow() { var v = gv(${jsStr(machineSrc)}, ''); return v === null || v === undefined ? '' : String(v); }\n`
    : `    var machineVal = '';\n    function machineNow() { return machineVal; }\n`;
  const machineSub = !machineSrc || uc ? "" : `    var machineTimer = null;
    subscribe(${jsStr(machineSrc)}, function (v) { var s = v === null || v === undefined ? '' : String(v); if (s === machineVal) return; machineVal = s; if (machineTimer) clearTimeout(machineTimer); machineTimer = setTimeout(function () { machineTimer = null; load(); }, 300); });
`;
  const machineApply = machineSrc ? "        var mv = machineNow(); if (mv) req.filter.machines = [mv];\n" : "";

  const core = `// Auswertung (${widget}) – ${historize ? "Historize-Rohdaten, Berechnung im Browser" : "Ergebnis vom Server"}, Plotly-Darstellung
(function () {
    var PLOTLY_SRC = ${jsStr(PLOTLY_SRC)}; // Pfad ab HMI-Root – ggf. anpassen
    var WIDGET = ${jsStr(widget)};
    var SOURCE = ${JSON.stringify(src)};
    var PARAMS = ${JSON.stringify(params)};
    var VIEW = ${JSON.stringify(view)};
    var HEIGHT = ${height}, REFRESH_MS = ${refreshMs}, SHOW_TABLES = ${showTables};
    var plotDiv = null, wrapper = null, tablesBox = null, statusEl = null, ro = null, onWinResize = null, timer = null, reqSeq = 0, lastRes = null;

${runtime}
${ENSURE_PLOTLY_SRC}
${RESIZE_SRC}
${machineCode}    function setStatus(text, isError) { if (!statusEl) return; statusEl.textContent = text || ''; statusEl.style.color = isError ? '#ef4444' : p.bodyText; }
    function request() {
        var req = JSON.parse(JSON.stringify(PARAMS));
${machineApply}        return req;
    }
    // Ergebnis holen: cb(err, result)
    function fetchResult(cb) {
        var req = request();
${historize ? HISTORIZE_FETCH : ""}        if (SOURCE.mode === 'server') {
            if (!SOURCE.symbol) { cb(loc('L_AnalysisNoSource', 'Kein Server-Symbol konfiguriert')); return; }
            try {
                TcHmi.Server.requestEx({ requestType: 'ReadWrite', commands: [{ symbol: SOURCE.symbol, commandOptions: ['SendErrorMessage'], writeValue: req }] }, {}, function (data) {
                    if (!data || data.error !== TcHmi.Errors.NONE || !data.response || !data.response.commands || !data.response.commands.length) { cb(loc('L_AnalysisServerError', 'Server-Anfrage fehlgeschlagen')); return; }
                    var cmd = data.response.commands[0];
                    if (cmd.error && cmd.error.code) { cb((cmd.error.message || 'Fehler') + ' (' + cmd.error.code + ')'); return; }
                    var v = cmd.readValue;
                    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { cb(loc('L_AnalysisBadData', 'Antwort ist kein gültiges JSON')); return; } }
                    cb(null, v);
                });
            } catch (e) { cb(String(e && e.message || e)); }
            return;
        }
        if (!SOURCE.url) { cb(loc('L_AnalysisNoSource', 'Keine URL konfiguriert')); return; }
        var init = SOURCE.method === 'POST' ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) } : { method: 'GET', cache: 'no-store' };
        try {
            fetch(SOURCE.url, init).then(function (resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.json();
            }).then(function (v) { cb(null, v); }, function (e) { cb(String(e && e.message || e)); });
        } catch (e) { cb(String(e && e.message || e)); }
    }
    function render(res) {
        if (!plotDiv || !window.Plotly) return;
        var th = acTheme(isDarkMode());
        if (${emptyCheck}) {
            try { window.Plotly.purge(plotDiv); } catch (e) {}
            plotDiv.style.display = 'none';
            setStatus(loc('L_AnalysisEmpty', 'Keine auswertbaren Daten für die aktuelle Auswahl'));
        } else {
            plotDiv.style.display = '';
            var pl = ${plotCall};
            pl.layout.height = HEIGHT;
            try { var pr = window.Plotly.react(plotDiv, pl.data, pl.layout, { displayModeBar: false, responsive: true }); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
            setStatus('');
        }
        if (tablesBox) {
            tablesBox.textContent = '';
            var tb = SHOW_TABLES ? ${tablesCall} : null;
            if (tb) tablesBox.appendChild(tb);
        }
    }
    function load() {
        var my = ++reqSeq;
        setStatus(loc('L_AnalysisLoading', 'lädt …'));
        fetchResult(function (err, res) {
            if (my !== reqSeq || !plotDiv) return; // veraltete Antwort / Popup geschlossen
            if (err) { setStatus(loc('L_AnalysisError', 'Fehler') + ': ' + err, true); return; }
            lastRes = res;
            ensurePlotly(function () { if (plotDiv) render(lastRes); });
        });
    }

    // ── Aufbau ──
    wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;min-width:0;margin-bottom:16px;';
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:6px;';
    var cap = document.createElement('span');
    cap.style.cssText = 'flex:1 1 auto;font-size:20px;font-weight:600;color:' + p.titleColor + ';';
    cap.textContent = ${locExpr(b.captionLoc, b.caption || "")};
    statusEl = document.createElement('span');
    statusEl.style.cssText = 'flex:0 1 auto;font-size:14px;color:' + p.bodyText + ';opacity:.8;';
    var refreshBtn = document.createElement('button');
    refreshBtn.textContent = loc('L_Refresh', 'Aktualisieren');
    refreshBtn.style.cssText = 'flex:0 0 auto;border:1px solid ' + p.border + ';background:transparent;color:' + p.bodyText + ';font-size:16px;font-weight:600;cursor:pointer;padding:6px 12px;border-radius:6px;';
    refreshBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    refreshBtn.onclick = function (e) { e.stopPropagation(); load(); };
    bar.appendChild(cap); bar.appendChild(statusEl); bar.appendChild(refreshBtn);
    wrapper.appendChild(bar);
    plotDiv = document.createElement('div');
    plotDiv.style.cssText = 'width:100%;height:' + HEIGHT + 'px;min-width:0;';
    plotDiv.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    wrapper.appendChild(plotDiv);
    tablesBox = document.createElement('div');
    tablesBox.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    wrapper.appendChild(tablesBox);
    ${parent}.appendChild(wrapper);

    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(function () { resize(); }); ro.observe(wrapper); }
    else { onWinResize = function () { resize(); }; window.addEventListener('resize', onWinResize); }
${machineSub}    if (REFRESH_MS > 0) timer = setInterval(load, REFRESH_MS);

    teardowns.push(function () {
        reqSeq++;
        if (timer) { clearInterval(timer); timer = null; }${machineSrc && !uc ? "\n        if (machineTimer) { clearTimeout(machineTimer); machineTimer = null; }" : ""}
        if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
        if (onWinResize) { window.removeEventListener('resize', onWinResize); onWinResize = null; }
        try { if (window.Plotly && plotDiv) window.Plotly.purge(plotDiv); } catch (e) {}
        plotDiv = null; wrapper = null; tablesBox = null; statusEl = null; lastRes = null;
    });

    load();
})();`;
  return indentLines(core, I);
}

export { emitAnalysis, analysisParams, analysisView };
