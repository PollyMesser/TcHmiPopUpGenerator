// ── AC Analytics: Plot-Laufzeit (Plotly data/layout + Kennwert-Tabellen) ──
// Übertragen aus MachineDataStack frontend/src/components/{FiltrationCurveView,
// StepDurationView,GraphWidgetView}.tsx und theme/plotly.ts – übernommen sind die
// erzeugten Plotly-data/layout-Objekte, nicht die React-Komponenten.
//
// EINBETTUNGSREGELN (diese Datei wird abschnittsweise wörtlich in generierten
// TcHMI-Code kopiert, siehe scripts/build-runtime.mjs):
//   - ES5 (var/function), keine Imports, keine Template-Literale
//   - absolut KEIN Backslash (TcHMI entfernt Backslashes beim Einbetten)
//   - Abschnitte stehen zwischen "//#region <name>" und "//#endregion";
//     alles außerhalb (Kopf, export-Zeile) wird nicht eingebettet
//   - Funktionen beginnen mit "ac", um Kollisionen im Popup-Scope zu vermeiden

//#region common
// Farben wie --c1…--c6 / --text / --mute / --grid / --line der Maschinendaten-App
function acTheme(dark) {
    if (dark) return { text: '#e6edf3', mute: '#697787', grid: 'rgba(255,255,255,0.07)', line: '#2b3644', warn: '#f0a030',
        colorway: ['#4a9eff', '#38b48b', '#f0a030', '#d16ba5', '#8b9bff', '#e0605a'] };
    return { text: '#1b1f24', mute: '#9aa0a8', grid: 'rgba(0,0,0,0.07)', line: '#e8e5de', warn: '#c67c15',
        colorway: ['#2f66d4', '#12876f', '#c67c15', '#a8478a', '#5b62c9', '#c8483f'] };
}
function acWithAlpha(color, alpha) {
    var s = String(color || '').trim();
    if (s.length !== 7 || s.charAt(0) !== '#') return color;
    var n = parseInt(s.slice(1), 16);
    if (isNaN(n)) return color;
    return 'rgba(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + alpha + ')';
}
// Zahl de-DE, max. digits Nachkommastellen; null/NaN → '–'
function acNf(v, digits) {
    if (v === null || v === undefined || !isFinite(v)) return '–';
    return Number(v).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: digits === undefined ? 1 : digits });
}
// '2026-06-15' → '15.06.'
function acDeDay(iso) {
    if (!iso || iso.length < 10) return '–';
    return iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.';
}
// ISO-Kalenderwoche eines Montags 'YYYY-MM-DD' → 'KW 24/26'
function acIsoWeekLabel(iso) {
    var d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d.getTime())) return iso;
    var t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    var week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return 'KW ' + week + '/' + String(t.getUTCFullYear()).slice(2);
}
function acAxis(th, extra) {
    var a = { gridcolor: th.grid, zerolinecolor: th.grid, linecolor: th.line, tickcolor: th.line,
        tickfont: { color: th.mute, size: 12 }, automargin: true };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) a[k] = extra[k];
    return a;
}
// Basis-Layout (plotlyLayout() der App), danach widget-eigene Schlüssel
function acLayout(th, own) {
    var l = { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', colorway: th.colorway,
        font: { family: 'system-ui, -apple-system, Segoe UI, sans-serif', color: th.text, size: 13 },
        separators: ',.',
        margin: { l: 56, r: 16, t: 10, b: 44 }, xaxis: acAxis(th), yaxis: acAxis(th),
        legend: { orientation: 'h', y: -0.2, font: { color: th.mute, size: 12 } }, hovermode: 'closest' };
    for (var k in own) if (Object.prototype.hasOwnProperty.call(own, k)) l[k] = own[k];
    return l;
}
// ── kleine DOM-Helfer für Info-Zeile und Tabellen (doc = document) ──
function acEl(doc, tag, css, text) {
    var e = doc.createElement(tag);
    if (css) e.style.cssText = css;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
}
function acInfoLine(doc, th, parts) {
    return acEl(doc, 'div', 'font-size:13px;color:' + th.mute + ';margin:6px 0 10px;', parts.join(' · '));
}
// Tabelle: head = ['Spalte', …], rows = [{ cells: [..], bold?, muted?, swatch?, indent? }]; erste Spalte links
function acTable(doc, th, head, rows) {
    var wrap = acEl(doc, 'div', 'overflow-x:auto;margin-bottom:10px;');
    var t = acEl(doc, 'table', 'border-collapse:collapse;width:100%;font-size:14px;color:' + th.text + ';font-variant-numeric:tabular-nums;');
    var tr = acEl(doc, 'tr');
    for (var i = 0; i < head.length; i++) {
        tr.appendChild(acEl(doc, 'th', 'text-align:' + (i === 0 ? 'left' : 'right') + ';padding:6px 8px;border-bottom:1px solid ' + th.line + ';color:' + th.mute + ';font-weight:600;white-space:nowrap;', head[i]));
    }
    t.appendChild(tr);
    for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var rtr = acEl(doc, 'tr', row.bold ? 'font-weight:600;' : '');
        for (var c = 0; c < row.cells.length; c++) {
            var css = 'padding:6px 8px;border-bottom:1px solid ' + th.grid + ';text-align:' + (c === 0 ? 'left' : 'right') + ';white-space:nowrap;';
            if (row.muted) css += 'color:' + th.mute + ';';
            if (c === 0 && row.indent) css += 'padding-left:28px;';
            if (row.colspanFrom !== undefined && c === row.colspanFrom) css += 'text-align:left;';
            var td = acEl(doc, 'td', css);
            if (c === 0 && row.swatch) td.appendChild(acEl(doc, 'span', 'display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:8px;background:' + row.swatch + ';'));
            td.appendChild(doc.createTextNode ? doc.createTextNode(String(row.cells[c])) : acEl(doc, 'span', '', String(row.cells[c])));
            if (row.colspanFrom !== undefined && c === row.colspanFrom) td.setAttribute('colspan', String(head.length - c));
            rtr.appendChild(td);
        }
        t.appendChild(rtr);
    }
    wrap.appendChild(t);
    return wrap;
}
// Auffällige Zyklen: einklappbare Liste (nur Anzeige)
function acFlaggedList(doc, th, title, head, rows) {
    var box = acEl(doc, 'div', 'border-top:1px solid ' + th.line + ';padding-top:8px;margin-top:4px;');
    var open = false;
    var hdr = acEl(doc, 'div', 'cursor:pointer;font-size:14px;font-weight:600;color:' + th.text + ';padding:6px 0;user-select:none;', '▸ ' + title);
    var body = acTable(doc, th, head, rows);
    body.style.display = 'none';
    hdr.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    hdr.onclick = function () { open = !open; body.style.display = open ? '' : 'none'; hdr.textContent = (open ? '▾ ' : '▸ ') + title; };
    box.appendChild(hdr);
    box.appendChild(body);
    return box;
}
//#endregion

//#region filtration
// ── Filtrationskurven (CurveChart, InfoLine, FitTable, FlaggedTable) ──
// o = { showCycles: bool, approx: ['median', 'fit'], decimals: int }
function acFiltrationPlot(r, o, th) {
    var colorway = th.colorway;
    var multi = r.groups.length > 1;
    var unit = r.xMode === 'norm' ? '%' : 'min';
    var dec = o.decimals === undefined ? 1 : o.decimals;
    var fmt = '.' + dec + 'f';
    var approxOn = function (k) { return (o.approx || []).indexOf(k) >= 0; };
    var data = [], approx = [];
    var totalCycles = 0;
    r.groups.forEach(function (g) { totalCycles += g.n; });
    var cycleAlpha = Math.min(0.25, Math.max(0.06, 8 / Math.max(1, totalCycles)));
    r.groups.forEach(function (g, gi) {
        var color = colorway[gi % colorway.length] || '#4a9eff';
        var suffix = multi ? ' · ' + g.label : '';
        var lg = multi ? 'grp' + gi : undefined;
        if (o.showCycles) {
            g.cycles.forEach(function (c, ci) {
                data.push({ type: 'scatter', mode: 'lines', x: c.x, y: c.y, name: multi ? g.label : 'Zyklen', legendgroup: lg,
                    showlegend: ci === 0 && (!multi || (o.approx || []).length === 0),
                    line: { color: acWithAlpha(color, cycleAlpha), width: 1 },
                    hovertemplate: c.machine + ' · Zyklus ' + c.cycleNo + '<br>' + acDeDay(c.startedAt) + ' ' + c.startedAt.slice(11, 16) +
                        ' · Beschickung ' + acNf(c.durationMin, 1) + ' min<br>%{x:.1f} ' + unit + ': %{y:' + fmt + '}<extra></extra>' });
            });
        }
        if (approxOn('median')) {
            approx.push(
                { type: 'scatter', mode: 'lines', x: g.grid, y: g.q3, legendgroup: lg, showlegend: false, line: { width: 0, color: color }, hoverinfo: 'skip', connectgaps: false },
                { type: 'scatter', mode: 'lines', x: g.grid, y: g.q1, legendgroup: lg, name: '25.–75. Perzentil' + suffix, showlegend: !multi,
                    line: { width: 0, color: color }, fill: 'tonexty', fillcolor: acWithAlpha(color, 0.16), hoverinfo: 'skip', connectgaps: false },
                { type: 'scatter', mode: 'lines', x: g.grid, y: g.median, name: multi ? g.label : 'Median', legendgroup: lg, showlegend: true,
                    line: { color: color, width: 2.5 },
                    customdata: g.grid.map(function (_x, i) { return [g.q1[i], g.q3[i], g.nAt[i]]; }),
                    hovertemplate: 'Median' + suffix + '<br>%{x:.1f} ' + unit + ': %{y:' + fmt + '}<br>25.–75. Perzentil: %{customdata[0]:' + fmt +
                        '} – %{customdata[1]:' + fmt + '}<br>n = %{customdata[2]} Zyklen<extra></extra>' });
        }
        if (approxOn('fit') && g.fit) {
            var f = g.fit;
            approx.push({ type: 'scatter', mode: 'lines', x: g.grid, y: f.y, name: multi ? g.label : 'Sättigungsmodell', legendgroup: lg,
                showlegend: !multi || !approxOn('median'), line: { color: color, width: 2, dash: 'dash' },
                hovertemplate: 'Sättigungsmodell' + suffix + '<br>%{x:.1f} ' + unit + ': %{y:' + fmt + '}<br>A = ' + acNf(f.A, dec) +
                    ' · y₀ = ' + acNf(f.y0, dec) + ' · τ = ' + acNf(f.tau, 1) + ' ' + unit + '<extra></extra>' });
        }
    });
    for (var i = 0; i < approx.length; i++) data.push(approx[i]);

    var gridMax = 0;
    r.groups.forEach(function (g) { var last = g.grid[g.grid.length - 1]; if (last > gridMax) gridMax = last; });
    var xRange = r.xMode === 'norm' ? [0, 100] : [0, gridMax * 1.05];
    var cycleMax = [], yTop = 0, yMin = 0;
    r.groups.forEach(function (g) {
        g.cycles.forEach(function (c) {
            var mx = -Infinity;
            for (var k = 0; k < c.y.length; k++) { if (c.y[k] > mx) mx = c.y[k]; if (c.y[k] < yMin) yMin = c.y[k]; }
            cycleMax.push(mx);
        });
        if (approxOn('median')) g.q3.forEach(function (v) { if (v !== null && v > yTop) yTop = v; });
        if (approxOn('fit') && g.fit) g.fit.y.forEach(function (v) { if (v > yTop) yTop = v; });
    });
    if (o.showCycles && cycleMax.length) {
        cycleMax.sort(function (a, b) { return a - b; });
        yTop = Math.max(yTop, cycleMax[Math.floor((cycleMax.length - 1) * 0.9)]);
    }
    var layout = acLayout(th, {
        xaxis: acAxis(th, { title: { text: r.xMode === 'norm' ? 'Fortschritt der Beschickung [% der Beschickungsdauer]' : 'Zeit ab Beschickungsbeginn [min]', font: { color: th.mute, size: 12 } }, range: xRange, zeroline: false }),
        yaxis: acAxis(th, { title: { text: 'Filtrationsleistung [l/(m²·h)]', font: { color: th.mute, size: 12 } }, tickformat: fmt, range: yTop > 0 ? [yMin, yTop * 1.1] : undefined }),
        legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { color: th.mute, size: 12 } },
        margin: { l: 64, r: 16, t: 34, b: 52 }
    });
    return { data: data, layout: layout };
}
function acFiltrationInfo(r) {
    var i = r.info, parts = [i.usable + ' Zyklen ausgewertet'];
    if (i.excluded) parts.push(i.excluded + ' ausgeschlossen');
    if (i.noBeschickung) parts.push(i.noBeschickung + ' ohne auswertbare Beschickung');
    if (i.multiPhase) parts.push(i.multiPhase + ' mit mehreren Beschickungsphasen (nur erste gewertet)');
    return parts;
}
function acFiltrationTables(doc, r, o, th) {
    var box = acEl(doc, 'div', '');
    box.appendChild(acInfoLine(doc, th, acFiltrationInfo(r)));
    if (!r.groups.length) return box;
    var d = o.decimals === undefined ? 1 : o.decimals;
    var unit = r.xMode === 'norm' ? '%' : 'min';
    var showFit = (o.approx || []).indexOf('fit') >= 0;
    var multi = r.groups.length > 1;
    var head = [multi ? 'Gruppe' : '', 'Zyklen', 'Beschickung Md [min]', 'Start Md', 'Ende Md'];
    if (showFit) head = head.concat(['y₀', 'A', 'τ [' + unit + ']', '95 % bei [' + unit + ']', 'R²']);
    var anyUnsat = false;
    var rows = r.groups.map(function (g, gi) {
        var cells = [g.label, String(g.n), acNf(g.durationMedianMin, 1), acNf(g.startMedian, d), acNf(g.endMedian, d)];
        var row = { cells: cells, swatch: th.colorway[gi % th.colorway.length] };
        if (showFit) {
            if (g.fit) {
                if (!g.fit.saturated) anyUnsat = true;
                cells.push(acNf(g.fit.y0, d), acNf(g.fit.A, d), acNf(g.fit.tau, 1), acNf(g.fit.t95, 1) + (g.fit.saturated ? '' : ' *'), acNf(g.fit.r2, 3));
            } else {
                cells.push('zu wenige Daten für das Modell');
                row.muted = true; row.colspanFrom = cells.length - 1;
            }
        }
        return row;
    });
    box.appendChild(acTable(doc, th, head, rows));
    if (showFit && anyUnsat) {
        box.appendChild(acEl(doc, 'div', 'font-size:12px;color:' + th.mute + ';margin:-4px 0 8px;',
            '* 95 % des Anstiegs liegen außerhalb des beobachteten Bereichs – das Plateau wird innerhalb der Beschickung (noch) nicht erreicht, A ist dann eine Hochrechnung.'));
    }
    if (r.flagged.length) {
        box.appendChild(acFlaggedList(doc, th, 'Auffällige Zyklen (' + r.flagged.length + ')', ['Zyklus', 'Start', 'Beschickung [min]', 'Endwert', 'Auffälligkeit'],
            r.flagged.map(function (f) {
                return { cells: [f.machine + ' · ' + f.cycleNo + (f.excluded ? ' (ausgeschl.)' : ''), acDeDay(f.startedAt) + ' ' + f.startedAt.slice(11, 16),
                    acNf(f.durationMin, 1), acNf(f.end, d), f.reasons.join(' · ')], muted: f.excluded, colspanFrom: 4 };
            })));
    }
    return box;
}
//#endregion

//#region steps
// ── Schrittdauern (StepChart, InfoLine, SummaryTable, FlaggedTable) ──
// o = { series: ['cat:active', 'g:Beschicken', …], stats: ['avg','median','min','max','sum'], decimals: int }
var AC_STEP_STATS = [
    { v: 'avg', label: 'Mittelwert ± SD', short: 'Ø', dash: 'solid' },
    { v: 'median', label: 'Median', short: 'Md', dash: 'dash' },
    { v: 'min', label: 'Minimum', short: 'Min', dash: 'dot' },
    { v: 'max', label: 'Maximum', short: 'Max', dash: 'dashdot' },
    { v: 'sum', label: 'Summe', short: 'Σ', dash: 'solid' }
];
var AC_CAT_LABEL = { 'cat:active': 'Σ Aktivzeit', 'cat:secondary': 'Σ Nebenzeit', 'cat:total': 'Σ Prozesszeit' };
function acToMin(s) { return s === null || s === undefined ? null : s / 60; }
function acStepStat(s, stat) { return acToMin(stat === 'avg' ? s.mean : s[stat]); }
function acStepPlot(r, o, th) {
    var colorway = th.colorway;
    var byKey = {};
    r.categories.concat(r.groups).forEach(function (s) { byKey[s.key] = s; });
    // HMI: Datumsachse statt Kategorien (keine überlappenden Beschriftungen bei vielen Tagen)
    var x = r.buckets.slice();
    var xHover = r.bucket === 'week' ? 'KW %{x|%V/%y}' : '%{x|%d.%m.%Y}';
    var stats = o.stats || ['avg'];
    var sumOnY2 = stats.indexOf('sum') >= 0 && stats.length > 1;
    var fmt = '.' + (o.decimals === undefined ? 1 : o.decimals) + 'f';
    var catColor = { 'cat:active': colorway[0], 'cat:secondary': colorway[2], 'cat:total': colorway[4], 'g:Pause': colorway[5] };
    var stepColors = colorway.filter(function (_c, ci) { return ci !== 0 && ci !== 2 && ci !== 4 && ci !== 5; });
    var stepIdx = 0, data = [];
    (o.series || []).forEach(function (key) {
        var s = byKey[key];
        if (!s) return;
        var color = catColor[key] || stepColors[stepIdx++ % stepColors.length] || colorway[0];
        var label = AC_CAT_LABEL[s.key] || s.label;
        var n = s.series.map(function (b) { return b.n; });
        AC_STEP_STATS.forEach(function (opt) {
            if (stats.indexOf(opt.v) < 0) return;
            var yaxis = opt.v === 'sum' && sumOnY2 ? 'y2' : 'y';
            var y = s.series.map(function (b) { return acStepStat(b, opt.v); });
            if (opt.v === 'avg' && s.series.some(function (b) { return b.sd !== null; })) {
                var band = function (sign) {
                    return s.series.map(function (b) { return b.mean !== null && b.sd !== null ? Math.max(0, (b.mean + sign * b.sd) / 60) : null; });
                };
                data.push({ type: 'scatter', mode: 'lines', x: x, y: band(1), yaxis: yaxis, line: { width: 0, color: color }, hoverinfo: 'skip', showlegend: false },
                    { type: 'scatter', mode: 'lines', x: x, y: band(-1), yaxis: yaxis, line: { width: 0, color: color }, fill: 'tonexty',
                        fillcolor: acWithAlpha(color, 0.15), hoverinfo: 'skip', showlegend: false });
            }
            if (opt.v === 'sum') {
                data.push({ type: 'bar', name: label + ' · ' + opt.short, x: x, y: y, yaxis: yaxis, customdata: n,
                    marker: { color: acWithAlpha(color, 0.22), line: { color: color, width: 1 } },
                    hovertemplate: xHover + '<br>%{y:' + fmt + '} min · n = %{customdata}<extra>' + label + ' · ' + opt.label + '</extra>' });
                return;
            }
            data.push({ type: 'scatter', mode: 'lines+markers', name: label + ' · ' + opt.short, x: x, y: y, yaxis: yaxis, customdata: n,
                line: { color: color, dash: opt.dash }, marker: { color: color, size: 6 }, connectgaps: false,
                hovertemplate: xHover + '<br>%{y:' + fmt + '} min · n = %{customdata}<extra>' + label + ' · ' + opt.label + '</extra>' });
        });
    });
    var ax = function (title, extra) {
        var a = acAxis(th, { title: { text: title, font: { color: th.mute, size: 12 } }, tickformat: ',' + fmt, rangemode: 'tozero' });
        if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) a[k] = extra[k];
        return a;
    };
    var own = {
        legend: { orientation: 'h', y: -0.22, traceorder: 'normal', font: { color: th.mute, size: 12 } },
        barmode: 'group',
        xaxis: acAxis(th, r.bucket === 'week' ? { type: 'date', tickformat: 'KW %V' } : { type: 'date', tickformat: '%d.%m.' }),
        yaxis: ax(stats.length === 1 && stats[0] === 'sum' ? 'Summe [min]' : 'Dauer [min]')
    };
    if (sumOnY2) own.yaxis2 = ax('Summe [min]', { overlaying: 'y', side: 'right', showgrid: false });
    return { data: data, layout: acLayout(th, own) };
}
function acStepInfo(r) {
    var i = r.info, parts = [i.cycles + ' Zyklen ausgewertet'];
    if (i.pauseCycles) parts.push(i.pauseCycles + ' mit Pause (' + (i.pauseS < 3600 ? acNf(i.pauseS / 60, 0) + ' min' : acNf(i.pauseS / 3600, 1) + ' h') + ', nicht in Prozesszeit)');
    if (i.limitExcluded) parts.push(i.limitExcluded + ' Schrittwerte außerhalb Grenzwert');
    if (i.excludedCycles) parts.push(i.excludedCycles + ' Zyklen ausgeschlossen');
    if (i.categoryCycles < i.cycles) parts.push('Kategorien: ' + i.categoryCycles + ' Zyklen mit Aktivzeit');
    return parts;
}
function acStepTables(doc, r, o, th) {
    var box = acEl(doc, 'div', '');
    box.appendChild(acInfoLine(doc, th, acStepInfo(r)));
    if (!r.info.cycles) return box;
    var d = o.decimals === undefined ? 1 : o.decimals;
    var cells = function (s) {
        var t = s.total;
        return [String(t.n), acNf(acToMin(t.min), d), acNf(acToMin(t.max), d), acNf(acToMin(t.mean), d), acNf(acToMin(t.median), d),
            acNf(acToMin(t.sd), d), acNf(acToMin(t.sum), d), s.share === null ? '–' : acNf(s.share * 100, 1) + ' %'];
    };
    var rows = [];
    var section = function (label) { rows.push({ cells: [label, '', '', '', '', '', '', '', ''], bold: true, muted: true }); };
    var addGroups = function (cat) {
        r.groups.filter(function (g) { return g.category === cat; }).forEach(function (g) {
            rows.push({ cells: [g.label].concat(cells(g)) });
            if (o.showSubsteps) g.children.forEach(function (c) { rows.push({ cells: [c.label].concat(cells(c)), muted: true, indent: true }); });
        });
    };
    section('Aktivzeit'); addGroups('active');
    section('Nebenzeit'); addGroups('secondary');
    if (r.groups.some(function (g) { return g.category === 'pause'; })) { section('Pausenzeit (nur Zyklen mit Pause, nicht in Prozesszeit)'); addGroups('pause'); }
    section('Kategorien (Summe pro Zyklus)');
    var sw = [th.colorway[0], th.colorway[2], th.colorway[4]];
    r.categories.forEach(function (c, ci) { rows.push({ cells: [c.label].concat(cells(c)), bold: true, swatch: sw[ci] }); });
    box.appendChild(acTable(doc, th, ['Hauptschritt / Kategorie', 'n', 'Min [min]', 'Max [min]', 'Ø [min]', 'Median [min]', 'SD [min]', 'Summe [min]', 'Anteil'], rows));
    if (r.flagged.length) {
        box.appendChild(acFlaggedList(doc, th, 'Auffällige Zyklen (' + r.flagged.length + ')', ['Zyklus', 'Start', 'Prozesszeit [min]', 'Pause [min]', 'Auffälligkeit'],
            r.flagged.map(function (f) {
                return { cells: [f.machine + ' · ' + f.cycleNo + (f.excluded ? ' (ausgeschl.)' : ''), acDeDay(f.startedAt) + ' ' + f.startedAt.slice(11, 16),
                    acNf(f.processS / 60, d), f.pauseS ? acNf(f.pauseS / 60, d) : '–', f.reasons.join(' · ')], muted: f.excluded, colspanFrom: 4 };
            })));
    }
    return box;
}
//#endregion

//#region trend
// ── Verlaufsplot (Linie je Tag, Balken je Gruppe, Streudiagramm) ──
// o = { chart: 'line' | 'bar', decimals: int }
function acTrendAxes(kpis, decimals, th) {
    var units = [];
    kpis.forEach(function (k) { var u = k.unit || ''; if (units.indexOf(u) < 0) units.push(u); });
    var layout = {};
    units.forEach(function (unit, idx) {
        var axisNum = idx + 1;
        var vals = [];
        kpis.forEach(function (k) { if ((k.unit || '') === unit) { if (k.min !== null && isFinite(k.min)) vals.push(k.min); if (k.max !== null && isFinite(k.max)) vals.push(k.max); } });
        var lo = Math.min.apply(null, [0].concat(vals));
        var hi = Math.max.apply(null, [0].concat(vals));
        var pad = (hi - lo) * 0.08 || 1;
        var first = 0;
        for (var i = 0; i < kpis.length; i++) if ((kpis[i].unit || '') === unit) { first = i; break; }
        var color = th.colorway[first % th.colorway.length] || th.mute;
        var ax = { gridcolor: th.grid, zerolinecolor: th.grid, linecolor: color, tickcolor: color, tickfont: { color: color, size: 12 }, automargin: true,
            tickformat: ',.' + decimals + 'f', range: lo < 0 ? [lo - pad, hi + pad] : [0, hi + pad], rangemode: lo < 0 ? 'normal' : 'tozero',
            side: axisNum % 2 === 1 ? 'left' : 'right' };
        if (unit) ax.title = { text: '[' + unit + ']', font: { color: color, size: 12 } };
        if (axisNum > 1) ax.overlaying = 'y';
        if (axisNum > 2) { ax.anchor = 'free'; ax.autoshift = true; }
        layout[axisNum === 1 ? 'yaxis' : 'yaxis' + axisNum] = ax;
    });
    return { units: units, layout: layout, axisKey: function (unit) { var n = units.indexOf(unit || '') + 1; return n <= 1 ? 'y' : 'y' + n; } };
}
function acTrendPlot(r, o, th) {
    var dec = o.decimals === undefined ? 1 : o.decimals;
    var A = acTrendAxes(r.kpis, dec, th);
    var data = [];
    var name = function (k) { return k.unit ? k.label + ' [' + k.unit + ']' : k.label; };
    var hov = function (k, xFmt) { return (xFmt || '%{x}') + '<br>%{y:,.' + dec + 'f}' + (k.unit ? ' ' + k.unit : '') + '<extra>' + k.label + '</extra>'; };
    var own = { legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { color: th.mute, size: 12 } }, margin: { l: 56, r: 16, t: 34, b: 44 } };
    if (o.chart === 'bar') {
        var xb = r.groups.map(function (g) { return g.label; });
        r.kpis.forEach(function (k, i) {
            data.push({ type: 'bar', name: name(k), x: xb, y: r.groups.map(function (g) { return g.values[i]; }), yaxis: A.axisKey(k.unit),
                marker: { color: th.colorway[i % th.colorway.length] }, hovertemplate: hov(k) });
        });
        own.barmode = 'group';
    } else {
        var x = r.days.slice(); // ISO-Tage auf Datumsachse
        r.kpis.forEach(function (k, i) {
            var color = th.colorway[i % th.colorway.length];
            var yaxis = A.axisKey(k.unit);
            if (k.agg === 'avg' && k.dailySd.some(function (v) { return v !== null; })) {
                var up = k.daily.map(function (v, di) { var sd = k.dailySd[di]; return v !== null && sd !== null ? v + sd : null; });
                var dn = k.daily.map(function (v, di) { var sd = k.dailySd[di]; return v !== null && sd !== null ? v - sd : null; });
                data.push({ type: 'scatter', mode: 'lines', x: x, y: up, yaxis: yaxis, line: { width: 0, color: color }, hoverinfo: 'skip', showlegend: false, connectgaps: false },
                    { type: 'scatter', mode: 'lines', x: x, y: dn, yaxis: yaxis, line: { width: 0, color: color }, fill: 'tonexty',
                        fillcolor: acWithAlpha(color, 0.15), hoverinfo: 'skip', showlegend: false, connectgaps: false });
            }
            data.push({ type: 'scatter', mode: 'lines+markers', name: name(k), x: x, y: k.daily, yaxis: yaxis, line: { color: color },
                marker: { color: color, size: 6 }, connectgaps: false, hovertemplate: hov(k, '%{x|%d.%m.%Y}') });
        });
        own.xaxis = acAxis(th, { type: 'date', tickformat: '%d.%m.' });
    }
    for (var key in A.layout) if (Object.prototype.hasOwnProperty.call(A.layout, key)) own[key] = A.layout[key];
    return { data: data, layout: acLayout(th, own) };
}
// c = computeCorrelation()-Ergebnis; o = { xLabel, yLabel, decimals }
function acScatterPlot(c, o, th) {
    var dec = o.decimals === undefined ? 1 : o.decimals;
    var groups = [];
    c.points.forEach(function (p) { if (groups.indexOf(p.group) < 0) groups.push(p.group); });
    var data = groups.map(function (grp, gi) {
        var pts = c.points.filter(function (p) { return p.group === grp; });
        return { type: 'scatter', mode: 'markers', name: grp, x: pts.map(function (p) { return p.x; }), y: pts.map(function (p) { return p.y; }),
            marker: { size: 7, opacity: 0.7, color: th.colorway[gi % th.colorway.length] },
            hovertemplate: '%{x:,.' + dec + 'f} / %{y:,.' + dec + 'f}<extra>' + grp + '</extra>' };
    });
    var rLabel = c.r !== null && c.r !== undefined ? ' · r = ' + c.r.toFixed(2) : '';
    return { data: data, layout: acLayout(th, {
        xaxis: acAxis(th, { title: { text: o.xLabel || 'x', font: { color: th.mute, size: 12 } }, tickformat: ',.' + dec + 'f' }),
        yaxis: acAxis(th, { title: { text: (o.yLabel || 'y') + rLabel, font: { color: th.mute, size: 12 } }, tickformat: ',.' + dec + 'f' })
    }) };
}
//#endregion

export {
    acTheme, acWithAlpha, acNf, acDeDay, acIsoWeekLabel, acAxis, acLayout, acEl, acInfoLine, acTable, acFlaggedList,
    acFiltrationPlot, acFiltrationInfo, acFiltrationTables,
    AC_STEP_STATS, AC_CAT_LABEL, acToMin, acStepStat, acStepPlot, acStepInfo, acStepTables,
    acTrendAxes, acTrendPlot, acScatterPlot,
};
