// Auto-generiert vom AC_PopUp Generator – eingebettet (in Zielcontainer, kein Overlay)
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

/*
 * Aufruf am View-Event onAttached:   TcHmi.Functions.AC_HMI.AC_EmbedArrayPlot('MeinContainer');
 * Abbau am View-Event onDetached:    TcHmi.Functions.AC_HMI.AC_EmbedArrayPlotDestroy('MeinContainer');
 * 'MeinContainer' = Name eines Container-Controls (empfohlen) oder id eines rohen divs
 * mit echter Größe in der View.
 */
(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {

            function resolveTarget(t) {
                if (!t) return null;
                if (typeof t === 'object') {
                    if (t.nodeType === 1) return t;                    // DOM-Element
                    if (typeof t.getElement === 'function') {          // TcHMI-Control-Objekt
                        try { var e = t.getElement(); if (e && e[0]) return e[0]; } catch (err) {}
                    }
                    return null;
                }
                if (typeof t === 'string') {
                    var byId = document.getElementById(t);             // rohes div per id
                    if (byId) return byId;
                    try {                                              // TcHMI-Control per Name
                        var ctrl = TcHmi.Controls.get(t);
                        if (ctrl && typeof ctrl.getElement === 'function') {
                            var el = ctrl.getElement();
                            if (el && el[0]) return el[0];
                        }
                    } catch (err) {}
                    try { return document.querySelector(t); } catch (err) { return null; } // CSS-Selektor
                }
                return null;
            }

            function AC_EmbedArrayPlotDestroy(target) {
                var container = resolveTarget(target);
                if (container && container.__acEmbedDestroy) { try { container.__acEmbedDestroy(); } catch (e) {} }
            }
            AC_HMI.AC_EmbedArrayPlotDestroy = AC_EmbedArrayPlotDestroy;

            function AC_EmbedArrayPlot(target) {
    var container = resolveTarget(target);
    if (!container) { if (window.console) console.warn('AC_PopUp Embed: Container nicht gefunden:', target); return; }
    if (container.__acEmbedDestroy) { try { container.__acEmbedDestroy(); } catch (e) {} }

    var watchers = [];   // watch-Abmelder
    var symbols = [];    // Symbole zum Freigeben
    var teardowns = [];  // Aufraeum-Callbacks (z.B. Tabellen-/Plot-Module)

    function loc(key, fallback) {
        try {
            var f = TcHmi.Functions.getFunction('GetLocalizedText');
            if (f) {
                var text = f(key);
                if (text !== null && text !== undefined && text !== '') return text;
            }
        } catch (e) {}
        return fallback || key;
    }

    function readBgLuminance() {
        var candidates = [
            document.querySelector('.TcHmi_Controls_System_TcHmiView'),
            document.getElementById('Content'),
            document.body,
            document.documentElement
        ];
        for (var i = 0; i < candidates.length; i++) {
            var el = candidates[i];
            if (!el) continue;
            var bg = window.getComputedStyle(el).backgroundColor;
            var m = bg && bg.match(/[0-9.]+/g);
            if (!m) continue;
            var r = +m[0], g = +m[1], b = +m[2];
            var a = m.length > 3 ? +m[3] : 1;
            if (a < 0.1) continue;
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }
        return 0.15;
    }
    function isDarkMode() { return readBgLuminance() < 0.5; }

    function getPalette() {
        if (isDarkMode()) {
            return { boxBg:'#1a1d2e', border:'#2a2d3a', headerBg:'#161822', titleColor:'#ffffff',
                     closeColor:'#9aa0b4', bodyText:'#e0e0e0', active:'#22c55e', inactive:'#4b5563',
                     shadow:'0 20px 60px rgba(0,0,0,0.5)' };
        }
        return { boxBg:'#ffffff', border:'#d0d4de', headerBg:'#f2f4f8', titleColor:'#1a1d2e',
                 closeColor:'#6b7280', bodyText:'#333333', active:'#16a34a', inactive:'#9ca3af',
                 shadow:'0 20px 60px rgba(0,0,0,0.2)' };
    }

    function subscribe(symbolStr, onChange) {
        try {
            var sym = new TcHmi.Symbol(symbolStr);
            symbols.push(sym);
            watchers.push(sym.watch(function (data) {
                if (data.error !== TcHmi.Errors.NONE) return;
                onChange(data.value);
            }));
        } catch (e) {}
    }
    function writeSymbol(symbolStr, value) {
        try { new TcHmi.Symbol(symbolStr).write(value); } catch (e) {}
    }
    function pulseSymbol(symbolStr, ms) {
        try {
            var sym = new TcHmi.Symbol(symbolStr);
            sym.write(true);
            setTimeout(function () { sym.write(false); }, ms);
        } catch (e) {}
    }
    function toggleSymbol(symbolStr) {
        try {
            var sym = new TcHmi.Symbol(symbolStr);
            sym.read(function (data) {
                if (data.error !== TcHmi.Errors.NONE) return;
                sym.write(!data.value);
            });
        } catch (e) {}
    }

    var p = getPalette();

    // Signalisiert eingebetteten Bausteinen (z.B. Tabelle) den Embed-Modus:
    // z.B. entfaellt die feste Scroller-Hoehe -> der Container scrollt.
    var AC_EMBED = true;

    // Zielcontainer darf absolut positionierte Kinder halten und scrollen
    var csEmbed = window.getComputedStyle(container);
    if (csEmbed.position === 'static') container.style.position = 'relative';
    if (csEmbed.overflow === 'visible' || csEmbed.overflowY === 'visible') container.style.overflowY = 'auto';

    // body oben-links verankern: fliessender Einschub wuerde im absolut
    // positionierten TcHmiContainer nach unten rutschen. Kein bottom/height
    // -> waechst mit dem Inhalt; der Container scrollt bei vielen Zeilen.
    var body = document.createElement('div');
    body.style.cssText = 'position:absolute;top:0;left:0;right:0;box-sizing:border-box;padding:12px;color:' + p.bodyText + ';';

        // Generische Tabelle (eigenständiges Modul, eigener Lebenszyklus)
        (function () {
            var TCOLS = [
            {
                "kind": "read",
                "header": "Wert",
                "loc": "",
                "member": "rValue",
                "unit": "bar",
                "dec": 2,
                "label": "",
                "lloc": "",
                "wmode": "setTrue",
                "pms": 300,
                "map": [],
                "sortable": true
            },
            {
                "kind": "enum",
                "header": "Status",
                "loc": "",
                "member": "eStatus",
                "unit": "",
                "dec": -1,
                "label": "",
                "lloc": "",
                "wmode": "setTrue",
                "pms": 300,
                "map": [
                    {
                        "v": "0",
                        "label": "OK",
                        "loc": "",
                        "color": "#22c55e",
                        "text": "#06240f",
                        "icon": "info"
                    },
                    {
                        "v": "1",
                        "label": "Fehler",
                        "loc": "",
                        "color": "#ef4444",
                        "text": "#ffffff",
                        "icon": "info"
                    }
                ]
            }
        ];
            var TROWS = [];
            var TRULES = [];
            var TFILTERS = [];
            var ICON_SVGS = {};
            var DATA_SOURCE = "array"; // 'static' | 'array'
            var ARRAY_SYMBOL = "%s%ADS.…::aEmbedArr%/s%";
            var COUNT_SYMBOL = '';
            var ARRAY_COUNT = 8;
            var START_INDEX = 0;
            var SHOW_INDEX = false;
            var SEARCH_ON = true;
            var PAGE_SIZE = 0; // 0 = keine Pagination
            var STRIPED = true;
            var SHOW_HEADER = true;
            var WATCH_LIMIT = 30;
            var POLL_MS = 1000;
            var DEFAULT_SORT_COL = 0; // -1 = keine Standardsortierung
            var DEFAULT_SORT_DIR = "desc"; // 'asc' | 'desc'

            var watchers = [], symbols = [], batchSubId = null, renderQueued = false;
            var vals = [];        // vals[zeile][spalte] – Rohwerte
            var paramVals = {};   // paramVals[member][zeile] – versteckte Button-Funktionsparameter (Array-Modus)
            var rowCount = DATA_SOURCE === 'static' ? TROWS.length : ARRAY_COUNT;
            var dynCount = -1;    // Wert aus COUNT_SYMBOL (-1 = unbenutzt)
            var page = 0, query = '';
            var sortCol = DEFAULT_SORT_COL, sortDir = DEFAULT_SORT_DIR; // aktive Sortierung
            var tbody = null, pageInfo = null, prevBtn = null, nextBtn = null, wrap = null;
            var sortThs = []; // { el: <span Pfeil>, col: <Spaltenindex> } je sortierbarer Kopfzelle

            function locT(key, fallback) {
                try { var f = TcHmi.Functions.getFunction('GetLocalizedText'); if (f) { var t = f(key); if (t !== null && t !== undefined && t !== '') return t; } } catch (e) {}
                return fallback || key;
            }
            function bgLumT() {
                var cand = [document.querySelector('.TcHmi_Controls_System_TcHmiView'), document.getElementById('Content'), document.body, document.documentElement];
                for (var i = 0; i < cand.length; i++) { var el = cand[i]; if (!el) continue; var bg = window.getComputedStyle(el).backgroundColor; var m = bg && bg.match(/[0-9.]+/g); if (!m) continue; var r = +m[0], g = +m[1], bl = +m[2], a = m.length > 3 ? +m[3] : 1; if (a < 0.1) continue; return (0.299 * r + 0.587 * g + 0.114 * bl) / 255; }
                return 0.15;
            }
            function palT() {
                if (bgLumT() < 0.5) return { border:'#2a2d3a', headerBg:'#161822', titleColor:'#ffffff', bodyText:'#e0e0e0', boxBg:'#1a1d2e', active:'#22c55e', inactive:'#4b5563', stripe:'rgba(255,255,255,0.04)' };
                return { border:'#d0d4de', headerBg:'#f2f4f8', titleColor:'#1a1d2e', bodyText:'#333333', boxBg:'#ffffff', active:'#16a34a', inactive:'#9ca3af', stripe:'rgba(0,0,0,0.03)' };
            }
            function subscribeT(symbolStr, onChange) {
                try { var sym = new TcHmi.Symbol(symbolStr); symbols.push(sym); watchers.push(sym.watch(function (data) { if (data.error !== TcHmi.Errors.NONE) return; onChange(data.value); })); } catch (e) {}
            }
            function writeT(symbolStr, value) { try { new TcHmi.Symbol(symbolStr).write(value); } catch (e) {} }
            function plainSymT(symbolStr) {
                var plain = symbolStr || '';
                if (plain.indexOf('%s%') === 0) plain = plain.slice(3);
                var suf = '%/s%';
                if (plain.length >= suf.length && plain.slice(-suf.length) === suf) plain = plain.slice(0, -suf.length);
                return plain;
            }
            // Dynamischer Element-Pfad: Array-Symbol + [index] + Member.
            // Bestaetigt per readEx2: Struct-Member nach dem Index werden mit '::' angehaengt
            // (z. B. aAlarmHmi[0]::bTriggered). Member mit fuehrendem '::', '.' oder '[' bleibt
            // unveraendert, sonst wird '::' vorangestellt.
            function dynSym(r, member) {
                var base = plainSymT(ARRAY_SYMBOL) + '[' + (START_INDEX + r) + ']';
                if (member) base += (member.charAt(0) === '.' || member.charAt(0) === ':' || member.charAt(0) === '[') ? member : ('::' + member);
                return '%s%' + base + '%/s%';
            }
            function symFor(r, ci) {
                if (DATA_SOURCE === 'array') return dynSym(r, TCOLS[ci].member);
                var cell = (TROWS[r] || [])[ci];
                return cell && cell.s ? cell.s : '';
            }
            // Auto-Typisierung: numerisch, wenn der Rohwert eine endliche Zahl ist; sonst String.
            // Bool bleibt Bool. undefined/null -> null (Funktion entscheidet selbst).
            function autoType(v) {
                if (v === undefined || v === null) return null;
                if (typeof v === 'boolean') return v;
                if (typeof v === 'number') return v;
                var s = String(v).trim();
                var n = Number(s);
                if (s !== '' && !isNaN(n) && isFinite(n)) return n;
                return v;
            }
            // Button-Funktionsparameter fuer Zeile r ermitteln (nur bei col.action==='fn').
            //   psrc 'member' -> versteckter Array-Member aus paramVals (Array-Modus)
            //   psrc 'col'    -> Wert einer sichtbaren Spalte (vals[r][pcol])
            //   psrc 'index'  -> Zeilenindex START_INDEX + r
            //   psrc 'none'   -> kein Parameter (undefined)
            function resolveParam(r, col) {
                if (col.psrc === 'index') return START_INDEX + r;
                if (col.psrc === 'none') return undefined;
                if (col.psrc === 'col') { var pc = col.pcol; return autoType((pc >= 0 && vals[r]) ? vals[r][pc] : undefined); }
                // 'member' (Default): versteckter Kanal
                var m = col.pmember;
                var store = m ? paramVals[m] : null;
                return autoType(store ? store[r] : undefined);
            }
            function callColFn(r, ci) {
                var col = TCOLS[ci];
                var name = col.fnName;
                if (!name) return;
                var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions && TcHmi.Functions.AC_HMI) ? TcHmi.Functions.AC_HMI : null;
                var fn = fns ? fns[name] : null;
                if (typeof fn !== 'function') return; // still fehlschlagen wie die Schreibpfade
                var param = resolveParam(r, col);
                try { if (col.psrc === 'none') fn(); else fn(param); } catch (e) {}
            }
            function setVal(r, ci, v) {
                if (!vals[r]) vals[r] = [];
                vals[r][ci] = v;
                queueRender();
            }
            function queueRender() {
                if (renderQueued) return;
                renderQueued = true;
                window.requestAnimationFrame(function () { renderQueued = false; renderBody(); });
            }
            function fmtRead(ci, v) {
                var col = TCOLS[ci];
                if (v === undefined || v === null) return '–';
                var out;
                var num = Number(v);
                if (typeof v !== 'boolean' && v !== '' && !isNaN(num) && isFinite(num)) out = col.dec >= 0 ? num.toFixed(col.dec) : String(v);
                else out = String(v);
                if (col.unit) out += (col.unit === '%' ? col.unit : ' ' + col.unit);
                return out;
            }
            function mapEntry(ci, v) {
                var m = TCOLS[ci].map, sv = String(v === undefined || v === null ? '' : v).trim();
                var svb = (sv === '1' || sv === 'true') ? 'true' : ((sv === '0' || sv === 'false') ? 'false' : null);
                for (var i = 0; i < m.length; i++) {
                    if (m[i].v === sv) return m[i];
                    if (svb !== null && (m[i].v === svb || ((m[i].v === '1' || m[i].v === 'true') && svb === 'true') || ((m[i].v === '0' || m[i].v === 'false') && svb === 'false'))) return m[i];
                }
                return null;
            }
            function cellSearchText(r, ci) {
                var col = TCOLS[ci], v = vals[r] ? vals[r][ci] : undefined;
                if (col.kind === 'text') { var cell = (TROWS[r] || [])[ci] || {}; return locT(cell.loc, cell.t); }
                if (col.kind === 'read' || col.kind === 'input') return fmtRead(ci, v);
                if (col.kind === 'enum' || col.kind === 'icon') { var e = mapEntry(ci, v); return e ? locT(e.loc, e.label) : String(v === undefined ? '' : v); }
                return '';
            }
            function rowMatches(r, q) {
                if (!q) return true;
                if (SHOW_INDEX && String(START_INDEX + r).indexOf(q) >= 0) return true;
                for (var ci = 0; ci < TCOLS.length; ci++) { if (cellSearchText(r, ci).toLowerCase().indexOf(q) >= 0) return true; }
                return false;
            }
            function cmpT(a, op, v) {
                if (typeof v === 'boolean') { var ab = (a === true || a === 1 || a === '1' || a === 'true'); return op === '!=' ? ab !== v : ab === v; }
                if (typeof v === 'number') {
                    var an = Number(a);
                    if (isNaN(an)) return false;
                    if (op === '==') return an === v; if (op === '!=') return an !== v;
                    if (op === '>') return an > v; if (op === '>=') return an >= v;
                    if (op === '<') return an < v; if (op === '<=') return an <= v;
                    return false;
                }
                var as = String(a === undefined || a === null ? '' : a);
                return op === '!=' ? as !== String(v) : as === String(v);
            }
            // Zeilenfilter: Zeile ist nur sichtbar, wenn ALLE Filterregeln erfuellt sind.
            // Werte werden zur Laufzeit geprueft (kein Cache) — billig gegenueber den
            // Subscriptions und immer korrekt, auch wenn die PLC Zeilen spaeter fuellt.
            function isEmptyVal(a) {
                if (a === undefined || a === null) return true;
                if (typeof a === 'string') return a.trim() === '';
                return false;
            }
            function isZeroVal(a) {
                if (isEmptyVal(a)) return true;
                var n = Number(a);
                return !isNaN(n) && isFinite(n) && n === 0;
            }
            function passesFilters(r) {
                if (!TFILTERS.length) return true;
                for (var i = 0; i < TFILTERS.length; i++) {
                    var f = TFILTERS[i];
                    var a = vals[r] ? vals[r][f.c] : undefined;
                    if (f.op === 'notEmpty') { if (isEmptyVal(a)) return false; }
                    else if (f.op === 'notZero') { if (isZeroVal(a)) return false; }
                    else { if (!cmpT(a, f.op, f.v)) return false; }
                }
                return true;
            }
            function effectiveCount() {
                var n = rowCount;
                if (DATA_SOURCE === 'array') { if (dynCount >= 0 && dynCount < n) n = dynCount; if (n > ARRAY_COUNT) n = ARRAY_COUNT; }
                return n;
            }
            function buildCellEl(r, ci, pp) {
                var col = TCOLS[ci];
                var td = document.createElement('td');
                td.style.cssText = 'padding:6px 10px;border-top:1px solid ' + pp.border + ';font-size:18px;color:' + pp.bodyText + ';white-space:nowrap;'
                    + ((col.kind === 'read' || col.kind === 'input') ? 'text-align:right;font-variant-numeric:tabular-nums;' : '');
                var v = vals[r] ? vals[r][ci] : undefined;
                if (col.kind === 'text') {
                    var cell = (TROWS[r] || [])[ci] || {};
                    td.textContent = locT(cell.loc, cell.t);
                } else if (col.kind === 'read') {
                    td.textContent = fmtRead(ci, v);
                } else if (col.kind === 'bool') {
                    var led = document.createElement('span');
                    var on = (v === true || v === 1 || v === '1' || v === 'true');
                    led.style.cssText = 'display:inline-block;width:12px;height:12px;border-radius:50%;background:' + (on ? pp.active : pp.inactive) + ';';
                    td.style.textAlign = 'center';
                    td.appendChild(led);
                } else if (col.kind === 'check') {
                    var cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.checked = (v === true || v === 1 || v === '1' || v === 'true');
                    cb.style.cssText = 'width:15px;height:15px;cursor:pointer;';
                    cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                    cb.addEventListener('change', function () { var s = symFor(r, ci); if (s) writeT(s, cb.checked); });
                    td.style.textAlign = 'center';
                    td.appendChild(cb);
                } else if (col.kind === 'input') {
                    var inp = document.createElement('input');
                    inp.type = 'text';
                    inp.value = (v === undefined || v === null) ? '' : String(v);
                    inp.style.cssText = 'width:80px;padding:3px 6px;border:1px solid ' + pp.border + ';border-radius:5px;background:' + pp.boxBg + ';color:' + pp.bodyText + ';font-size:18px;text-align:right;';
                    inp.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                    var send = function () {
                        var s = symFor(r, ci); if (!s) return;
                        var raw = inp.value;
                        var num = Number(raw);
                        writeT(s, raw !== '' && !isNaN(num) && isFinite(num) ? num : raw);
                    };
                    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { send(); inp.blur(); } });
                    inp.addEventListener('blur', send);
                    td.appendChild(inp);
                } else if (col.kind === 'button') {
                    var btn = document.createElement('button');
                    btn.textContent = locT(col.lloc, col.label || 'OK');
                    btn.style.cssText = 'padding:4px 12px;border:1px solid ' + pp.border + ';border-radius:6px;background:transparent;color:' + pp.bodyText + ';font-size:16px;font-weight:600;cursor:pointer;';
                    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                    btn.onclick = function (e) {
                        e.stopPropagation();
                        if (col.action === 'fn') { callColFn(r, ci); return; }
                        var s = symFor(r, ci); if (!s) return;
                        if (col.wmode === 'setFalse') writeT(s, false);
                        else if (col.wmode === 'toggle') { var cur = vals[r] ? vals[r][ci] : undefined; writeT(s, !(cur === true || cur === 1 || cur === '1' || cur === 'true')); }
                        else if (col.wmode === 'pulse') { writeT(s, true); setTimeout(function () { writeT(s, false); }, col.pms); }
                        else writeT(s, true);
                    };
                    td.style.textAlign = 'center';
                    td.appendChild(btn);
                } else if (col.kind === 'enum') {
                    var e2 = mapEntry(ci, v);
                    var badge = document.createElement('span');
                    badge.style.cssText = 'display:inline-block;padding:2px 10px;border-radius:10px;font-size:16px;font-weight:600;background:' + (e2 ? e2.color : pp.inactive) + ';color:' + (e2 ? e2.text : '#ffffff') + ';';
                    badge.textContent = e2 ? locT(e2.loc, e2.label) : (v === undefined || v === null ? '–' : String(v));
                    td.style.textAlign = 'center';
                    td.appendChild(badge);
                } else if (col.kind === 'icon') {
                    var e3 = mapEntry(ci, v);
                    if (e3 && ICON_SVGS[e3.icon]) {
                        var ic = document.createElement('span');
                        ic.style.cssText = 'display:inline-flex;color:' + e3.color + ';vertical-align:middle;';
                        ic.innerHTML = ICON_SVGS[e3.icon];
                        ic.title = locT(e3.loc, e3.label);
                        td.appendChild(ic);
                    } else { td.textContent = '–'; }
                    td.style.textAlign = 'center';
                }
                return td;
            }
            // Sortierschluessel je Zeile fuer die aktive Spalte: text -> lokalisierter Text,
            // sonst der Rohwert. Wird typrichtig verglichen (Zahl/Bool/String).
            function sortValue(r, ci) {
                var col = TCOLS[ci];
                if (col.kind === 'text') return cellSearchText(r, ci);
                return vals[r] ? vals[r][ci] : undefined;
            }
            // Boolartig, wenn die Spalte bool/check ist ODER (icon) nur true/false abbildet.
            // Solche Werte kommen aus der PLC als true/false, 1/0 oder '1'/'0'/'true'/'false'.
            function isBoolCol(ci) {
                var k = TCOLS[ci].kind;
                return k === 'bool' || k === 'check';
            }
            function toBool01(v) {
                return (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;
            }
            function cmpSort(a, b, ci) {
                var ua = (a === undefined || a === null), ub = (b === undefined || b === null);
                if (ua && ub) return 0;
                if (ua) return 1;   // leere Werte immer ans Ende
                if (ub) return -1;
                // Boolartige Spalte: beide Werte einheitlich auf 0/1 normalisieren
                if (isBoolCol(ci) || typeof a === 'boolean' || typeof b === 'boolean') {
                    return toBool01(a) - toBool01(b);
                }
                var na = Number(a), nb = Number(b);
                var numA = (a !== '' && !isNaN(na) && isFinite(na));
                var numB = (b !== '' && !isNaN(nb) && isFinite(nb));
                if (numA && numB) return na - nb;
                var sa = String(a), sb = String(b);
                return sa < sb ? -1 : (sa > sb ? 1 : 0);
            }
            function sortVisible(list) {
                var dir = sortDir === 'desc' ? -1 : 1;
                list.sort(function (ra, rb) {
                    var d = cmpSort(sortValue(ra, sortCol), sortValue(rb, sortCol), sortCol);
                    if (d !== 0) return dir * d;
                    return ra - rb; // stabil: bei Gleichstand Zeilenreihenfolge behalten
                });
            }
            function toggleSort(ci) {
                if (sortCol === ci) { sortDir = (sortDir === 'asc') ? 'desc' : 'asc'; }
                else { sortCol = ci; sortDir = 'asc'; }
                page = 0;
                updateSortIndicators();
                renderBody();
            }
            var ARR_UP = String.fromCharCode(9650), ARR_DN = String.fromCharCode(9660), ARR_NEUTRAL = String.fromCharCode(9652);
            function updateSortIndicators() {
                for (var i = 0; i < sortThs.length; i++) {
                    var s = sortThs[i];
                    if (s.col === sortCol) { s.el.textContent = sortDir === 'desc' ? ARR_DN : ARR_UP; s.el.style.opacity = '.9'; }
                    else { s.el.textContent = ARR_NEUTRAL; s.el.style.opacity = '.3'; }
                }
            }
            function renderBody() {
                if (!tbody) return;
                var pp = palT();
                var n = effectiveCount();
                var q = query.toLowerCase();
                var visible = [];
                for (var r = 0; r < n; r++) { if (passesFilters(r) && rowMatches(r, q)) visible.push(r); }
                if (sortCol >= 0 && sortCol < TCOLS.length) sortVisible(visible);
                var pages = PAGE_SIZE > 0 ? Math.max(1, Math.ceil(visible.length / PAGE_SIZE)) : 1;
                if (page >= pages) page = pages - 1;
                if (page < 0) page = 0;
                var slice = PAGE_SIZE > 0 ? visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : visible;
                while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
                slice.forEach(function (r, vi) {
                    var tr = document.createElement('tr');
                    if (STRIPED && vi % 2 === 1) tr.style.background = pp.stripe;
                    if (SHOW_INDEX) {
                        var tdIdx = document.createElement('td');
                        tdIdx.textContent = String(START_INDEX + r);
                        tdIdx.style.cssText = 'padding:6px 10px;border-top:1px solid ' + pp.border + ';font-size:16px;color:' + pp.bodyText + ';opacity:.6;text-align:right;font-variant-numeric:tabular-nums;';
                        tr.appendChild(tdIdx);
                    }
                    var cellEls = [];
                    for (var ci = 0; ci < TCOLS.length; ci++) { var td = buildCellEl(r, ci, pp); cellEls.push(td); tr.appendChild(td); }
                    for (var ui = 0; ui < TRULES.length; ui++) {
                        var rule = TRULES[ui];
                        var a = vals[r] ? vals[r][rule.c] : undefined;
                        if (!cmpT(a, rule.op, rule.v)) continue;
                        if (rule.t === 'row') tr.style.background = rule.color + '22';
                        else if (cellEls[rule.c]) cellEls[rule.c].style.background = rule.color + '33';
                    }
                    tbody.appendChild(tr);
                });
                if (pageInfo) {
                    pageInfo.textContent = pages > 1 || PAGE_SIZE > 0 ? ((page + 1) + ' / ' + pages) : '';
                    if (prevBtn) prevBtn.disabled = page <= 0;
                    if (nextBtn) nextBtn.disabled = page >= pages - 1;
                }
            }

            // ── DOM-Aufbau ──
            var pp0 = palT();
            wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;flex-direction:column;width:100%;min-width:0;margin-bottom:16px;';
            var capText = "Live-Array";
            if (capText || SEARCH_ON) {
                var top = document.createElement('div');
                top.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';
                var cap = document.createElement('span');
                cap.style.cssText = 'flex:1 1 auto;font-size:18px;font-weight:600;color:' + pp0.titleColor + ';';
                cap.textContent = capText;
                top.appendChild(cap);
                if (SEARCH_ON) {
                    var se = document.createElement('input');
                    se.type = 'text';
                    se.placeholder = locT('L_Tbl_Search', 'Suchen…');
                    se.style.cssText = 'flex:0 0 auto;width:160px;padding:4px 8px;border:1px solid ' + pp0.border + ';border-radius:6px;background:' + pp0.boxBg + ';color:' + pp0.bodyText + ';font-size:16px;';
                    se.setAttribute('data-ac-view', '1'); // Ansichtssteuerung: bleibt bei operate-Deny nutzbar
                    se.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                    se.addEventListener('input', function () { query = se.value || ''; page = 0; renderBody(); });
                    top.appendChild(se);
                }
                wrap.appendChild(top);
            }
            var scroller = document.createElement('div');
            var scrollerMaxH = (typeof AC_EMBED !== 'undefined' && AC_EMBED) ? '' : 'max-height:60vh;';
            scroller.style.cssText = 'overflow:auto;' + scrollerMaxH + 'border:1px solid ' + pp0.border + ';border-radius:8px;';
            var tbl = document.createElement('table');
            tbl.style.cssText = 'width:100%;border-collapse:collapse;';
            if (SHOW_HEADER) {
                var thead = document.createElement('thead');
                var hr = document.createElement('tr');
                hr.style.cssText = 'background:' + pp0.headerBg + ';';
                var heads = [];
                if (SHOW_INDEX) heads.push('#');
                TCOLS.forEach(function (col) { heads.push(locT(col.loc, col.header)); });
                sortThs = [];
                heads.forEach(function (h, hi) {
                    var th = document.createElement('th');
                    var isIdx = SHOW_INDEX && hi === 0;
                    var colIdx = SHOW_INDEX ? hi - 1 : hi;
                    var col0 = TCOLS[colIdx];
                    var right = !isIdx && col0 && (col0.kind === 'read' || col0.kind === 'input');
                    var canSort = !isIdx && col0 && col0.sortable === true;
                    var hIcon = !isIdx && col0 && col0.hicon && ICON_SVGS[col0.hicon];
                    th.style.cssText = 'position:sticky;top:0;z-index:1;background:' + pp0.headerBg + ';padding:7px 10px;font-size:16px;font-weight:600;color:' + pp0.titleColor + ';text-align:' + (right || isIdx ? 'right' : 'left') + ';white-space:nowrap;' + (canSort ? 'cursor:pointer;user-select:none;' : '');
                    if (hIcon) {
                        var inner = document.createElement('span');
                        inner.style.cssText = 'display:inline-flex;align-items:center;gap:6px;vertical-align:middle;justify-content:' + (right || isIdx ? 'flex-end' : 'flex-start') + ';';
                        var hico = document.createElement('span');
                        hico.style.cssText = 'display:inline-flex;line-height:0;flex:0 0 auto;color:' + (col0.hicolor || pp0.titleColor) + ';';
                        hico.innerHTML = ICON_SVGS[col0.hicon];
                        var _hsv = hico.querySelector('svg'); if (_hsv) { _hsv.setAttribute('width', '1em'); _hsv.setAttribute('height', '1em'); }
                        inner.appendChild(hico);
                        var labh = document.createElement('span');
                        labh.textContent = h;
                        inner.appendChild(labh);
                        th.appendChild(inner);
                        if (canSort) {
                            var arrh = document.createElement('span');
                            arrh.style.cssText = 'display:inline-block;margin-left:5px;font-size:10px;opacity:.55;';
                            inner.appendChild(arrh);
                            sortThs.push({ el: arrh, col: colIdx });
                            th.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                            (function (idx) { th.onclick = function (e) { e.stopPropagation(); toggleSort(idx); }; })(colIdx);
                        }
                    } else if (canSort) {
                        var lab = document.createElement('span');
                        lab.textContent = h;
                        var arr = document.createElement('span');
                        arr.style.cssText = 'display:inline-block;margin-left:5px;font-size:10px;opacity:.55;';
                        th.appendChild(lab);
                        th.appendChild(arr);
                        sortThs.push({ el: arr, col: colIdx });
                        th.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        (function (idx) { th.onclick = function (e) { e.stopPropagation(); toggleSort(idx); }; })(colIdx);
                    } else {
                        th.textContent = h;
                    }
                    hr.appendChild(th);
                });
                thead.appendChild(hr);
                tbl.appendChild(thead);
            }
            updateSortIndicators();
            tbody = document.createElement('tbody');
            tbl.appendChild(tbody);
            scroller.appendChild(tbl);
            wrap.appendChild(scroller);
            if (PAGE_SIZE > 0) {
                var pager = document.createElement('div');
                pager.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:6px;';
                var pbStyle = 'padding:2px 10px;border:1px solid ' + pp0.border + ';border-radius:6px;background:transparent;color:' + pp0.bodyText + ';font-size:16px;cursor:pointer;';
                prevBtn = document.createElement('button'); prevBtn.textContent = '‹'; prevBtn.style.cssText = pbStyle; prevBtn.setAttribute('data-ac-view', '1');
                nextBtn = document.createElement('button'); nextBtn.textContent = '›'; nextBtn.style.cssText = pbStyle; nextBtn.setAttribute('data-ac-view', '1');
                pageInfo = document.createElement('span'); pageInfo.style.cssText = 'font-size:16px;color:' + pp0.bodyText + ';opacity:.75;font-variant-numeric:tabular-nums;';
                prevBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                nextBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                prevBtn.onclick = function (e) { e.stopPropagation(); page -= 1; renderBody(); };
                nextBtn.onclick = function (e) { e.stopPropagation(); page += 1; renderBody(); };
                pager.appendChild(prevBtn); pager.appendChild(pageInfo); pager.appendChild(nextBtn);
                wrap.appendChild(pager);
            }
            body.appendChild(wrap);

            // ── Datenanbindung ──
            // Beide Modi erzeugen konkrete Element-Symbole und binden sie identisch an:
            //   statisch → im Editor gesetzte Zell-Symbole
            //   array    → arraySymbol[i]::member (per readEx2 bestaetigter Zugriffspfad)
            // Bis WATCH_LIMIT einzelne TcHmi.Symbol.watch (bestaetigt), darueber EINE
            // Server-Subscription (Protokoll-Standard, in diesem Projekt noch nicht per
            // WS-Mitschnitt verifiziert).
            if (DATA_SOURCE === 'array' && COUNT_SYMBOL) subscribeT(COUNT_SYMBOL, function (v) { var n = parseInt(v); dynCount = isNaN(n) ? -1 : n; queueRender(); });
            var bound = [];
            var srcRows = DATA_SOURCE === 'array' ? ARRAY_COUNT : TROWS.length;
            for (var r0 = 0; r0 < srcRows; r0++) {
                for (var c0 = 0; c0 < TCOLS.length; c0++) {
                    var k = TCOLS[c0].kind;
                    if (k === 'text') continue;
                    var needsRead = (k === 'read' || k === 'bool' || k === 'check' || k === 'input' || k === 'enum' || k === 'icon' || (k === 'button' && TCOLS[c0].wmode === 'toggle'));
                    var s0 = symFor(r0, c0);
                    if (needsRead && s0) bound.push({ r: r0, c: c0, s: s0 });
                }
            }
            if (bound.length <= WATCH_LIMIT) {
                bound.forEach(function (bd) { subscribeT(bd.s, function (v) { setVal(bd.r, bd.c, v); }); });
            } else {
                try {
                    TcHmi.Server.requestEx({
                        requestType: 'Subscription',
                        intervalTime: POLL_MS,
                        commands: bound.map(function (bd) { return { symbol: plainSymT(bd.s), commandOptions: ['SendErrorMessage'] }; })
                    }, {}, function (data) {
                        if (!data || data.error !== TcHmi.Errors.NONE) return;
                        var resp = data.response;
                        if (!resp || !resp.commands) return;
                        if (resp.id != null) batchSubId = resp.id;
                        for (var i = 0; i < resp.commands.length && i < bound.length; i++) {
                            var cmd = resp.commands[i];
                            if (cmd.error != null && cmd.error !== 0) continue;
                            var bd = bound[i];
                            if (!vals[bd.r]) vals[bd.r] = [];
                            vals[bd.r][bd.c] = cmd.readValue;
                        }
                        queueRender();
                    });
                } catch (e) {}
            }

            // ── Versteckter Parameter-Kanal ──
            // Fuer Buttons mit action==='fn' und psrc==='member' (Array-Modus) wird der als
            // Parameter dienende Struct-Member je Zeile separat gelesen, auch wenn er keine
            // sichtbare Spalte hat. Element-Pfad wie bei sichtbaren Zellen (dynSym).
            if (DATA_SOURCE === 'array') {
                var pmembers = {}; // eindeutige Member sammeln
                for (var pc0 = 0; pc0 < TCOLS.length; pc0++) {
                    var pcol = TCOLS[pc0];
                    if (pcol.kind === 'button' && pcol.action === 'fn' && pcol.psrc === 'member' && pcol.pmember) pmembers[pcol.pmember] = true;
                }
                Object.keys(pmembers).forEach(function (member) {
                    if (!paramVals[member]) paramVals[member] = [];
                    for (var pr = 0; pr < ARRAY_COUNT; pr++) {
                        (function (rr) {
                            var ps = dynSym(rr, member);
                            if (ps) subscribeT(ps, function (v) { paramVals[member][rr] = v; });
                        })(pr);
                    }
                });
            }
            renderBody();

            // Aufräumen beim Schließen des Popups (siehe hideDialog -> teardowns)
            teardowns.push(function () {
                for (var i = 0; i < watchers.length; i++) { try { watchers[i](); } catch (e) {} }
                for (var j = 0; j < symbols.length; j++) { try { symbols[j].destroy(); } catch (e) {} }
                watchers = []; symbols = [];
                if (batchSubId != null) { try { TcHmi.Server.requestEx({ requestType: 'ReadWrite', commands: [{ symbol: 'Unsubscribe', commandOptions: ['SendErrorMessage'], writeValue: batchSubId }] }, {}, function () {}); } catch (e) {} batchSubId = null; }
                tbody = null; wrap = null; pageInfo = null; prevBtn = null; nextBtn = null;
            });
        })();

        // Plotly-Verlauf (eigenständiges Modul, eigener Lebenszyklus)
        (function () {
            var axes = [
            {
                "label": "",
                "loc": "",
                "unit": "%",
                "color": "#3b82f6",
                "autoscale": false,
                "min": 0,
                "max": 100
            }
        ];
            var series = [
            {
                "symbol": "%s%ADS.AF_PLC.MAIN.…::fWert%/s%",
                "label": "Signal",
                "loc": "",
                "color": "#3b82f6",
                "axis": 0
            }
        ];
            var refLines = [];
            var eventMarkers = [];
            var TIME_BUTTONS = [
            {
                "count": 1,
                "step": "hour",
                "stepmode": "backward",
                "label": "1 h"
            },
            {
                "count": 6,
                "step": "hour",
                "stepmode": "backward",
                "label": "6 h"
            },
            {
                "count": 24,
                "step": "hour",
                "stepmode": "backward",
                "label": "24 h"
            },
            {
                "count": 7,
                "step": "day",
                "stepmode": "backward",
                "label": "1 Woche"
            },
            {
                "step": "all",
                "label": "Alle"
            }
        ];

            var DATA_MODE        = "live"; // 'live' | 'history'
            var FOLLOW_WINDOW_MS = 300000;
            var HISTORY_LOAD_MS  = 3600000;
            var MAX_POINTS       = 3600;
            var MAX_EVENT_LINES  = 40;
            var SHOW_RANGESLIDER = true;
            var SHOW_X_AXIS      = true;
            var SHOW_TOOLBAR     = true;
            var PLOT_HEIGHT      = 220;
            var ZOOM_ENABLED     = true;
            var PLOTLY_SRC       = 'Assets/plotly-3.6.0.min.js'; // Pfad ab HMI-Root – ggf. anpassen

            var watchers = [], symbols = [], plotDiv = null, wrapper = null, ro = null, onWinResize = null, trendHandle = null;
            // Eindeutiger chartName pro Popup-Instanz (Zeit + Zufall), damit mehrere gleichzeitig
            // offene Trend-Popups/Embeds niemals denselben chartName teilen (serverseitiges
            // Verhalten bei gleichzeitig gleichem chartName war im Test nicht geprueft).
            var trendChartName = 'AC_HMI_TrendPopup_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            var followMode = true, suppressRelayout = false, initialXRange = null, lastNewestMs = 0, setupDone = false;
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
            function isDisplayed() { return !!plotDiv && plotDiv.offsetParent !== null && plotDiv.clientWidth > 1 && plotDiv.clientHeight > 1; }
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
                    plotDiv.on('plotly_relayout', function (ev) { if (suppressRelayout || !setupDone) return; if (ev['xaxis.autorange'] === true) { followMode = true; reapplyView(); } else if (ev['xaxis.range'] !== undefined || ev['xaxis.range[0]'] !== undefined) { followMode = false; } });
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
                            }).then(function () { suppressRelayout = false; }).catch(function () { suppressRelayout = false; });
                        });
                    } else {
                        // Reiner Live-Modus (unveraendert): pro Signal per TcHmi.Symbol.watch anhaengen.
                        series.forEach(function (s, i) { subscribeP(s.symbol, function (v) { if (!plotDiv) return; var num = Number(v); if (isNaN(num)) return; window.Plotly.extendTraces(plotDiv, { x: [[new Date()]], y: [[num]] }, [i], MAX_POINTS); applyFollow(); }); });
                    }
                    refLines.forEach(function (r, k) { if (r.mode === 'symbol' && r.symbol) { subscribeP(r.symbol, function (v) { var num = Number(v); if (isNaN(num)) return; refValues[k] = num; if (!plotDiv || !window.Plotly) return; var upd = {}; upd['shapes[' + k + '].y0'] = num; upd['shapes[' + k + '].y1'] = num; upd['annotations[' + k + '].y'] = num; suppressRelayout = true; window.Plotly.relayout(plotDiv, upd).then(function () { suppressRelayout = false; }).catch(function () { suppressRelayout = false; }); }); } });
                    eventMarkers.forEach(function (m, k) { if (!m.symbol) return; subscribeP(m.symbol, function (v) { var key = 'm' + k; var first = !(key in markerLast); if (!first && String(markerLast[key]) === String(v)) return; markerLast[key] = v; if (first && !m.markInitial) return; pushEventLine(m, k, v); }); });
                    resize(); setupDone = true;
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
                var cap = document.createElement('span'); cap.style.cssText = 'flex:1 1 auto;'; if (SHOW_TOOLBAR) cap.textContent = "Embed-Trend";
                bar.appendChild(cap);
                var btnStyle = 'flex:0 0 auto;border:1px solid ' + pp.border + ';background:transparent;color:' + pp.bodyText + ';font-size:16px;font-weight:600;cursor:pointer;padding:4px 10px;border-radius:6px;';
                if (ZOOM_ENABLED) {
                    var resetBtn = document.createElement('button');
                    resetBtn.style.cssText = btnStyle;
                    resetBtn.textContent = "Zurücksetzen"; resetBtn.title = locP('L_ResetViewHint', 'Zoom/Ansicht auf Ausgangszustand zurücksetzen');
                    resetBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                    resetBtn.onclick = function (e) { e.stopPropagation(); resetView(); };
                    bar.appendChild(resetBtn);
                }
                if (SHOW_TOOLBAR) {
                    var nowBtn = document.createElement('button');
                    nowBtn.style.cssText = btnStyle;
                    nowBtn.textContent = "Jetzt"; nowBtn.title = locP('L_JumpNowHint', 'Zum aktuellen Zeitpunkt springen');
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
            body.appendChild(wrapper);

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
                plotDiv = null; wrapper = null;
            });

            initPlot(pp);
        })();

    container.appendChild(body);

    // Teardown auf dem Container hinterlegen (von aussen ueber Destroy aufrufbar)
    container.__acEmbedDestroy = function () {
        for (var t = 0; t < teardowns.length; t++) { try { teardowns[t](); } catch (e) {} }
        teardowns = [];
        for (var i = 0; i < watchers.length; i++) { try { watchers[i](); } catch (e) {} }
        for (var j = 0; j < symbols.length; j++) { try { symbols[j].destroy(); } catch (e) {} }
        watchers = []; symbols = [];
        if (body && body.parentNode) body.parentNode.removeChild(body);
        body = null;
        try { delete container.__acEmbedDestroy; } catch (e) { container.__acEmbedDestroy = null; }
    };
            }
            AC_HMI.AC_EmbedArrayPlot = AC_EmbedArrayPlot;
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx("AC_EmbedArrayPlot", 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.AC_EmbedArrayPlot);
TcHmi.Functions.registerFunctionEx("AC_EmbedArrayPlotDestroy", 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.AC_EmbedArrayPlotDestroy);

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"embed","fnName":"AC_EmbedArrayPlot","title":"Titel","titleLoc":"","titleSource":"static","titleField":"TagName","titleFallback":"Titel","titleIcon":"","titleIconColor":"","maxWidth":700,"columns":1,"hostSuffix":".btn_PopUp","blocks":[{"id":"b74","type":"table","col":0,"caption":"Live-Array","captionLoc":"","dataSource":"array","arraySymbol":"ADS.…::aEmbedArr","arrayCount":8,"countSymbol":"","startIndex":0,"showIndex":false,"columns":[{"id":"tc76","kind":"read","header":"Wert","headerLoc":"","headerIcon":"","headerIconColor":"","member":"rValue","unit":"bar","decimals":2,"label":"","loc":"","writeMode":"setTrue","pulseMs":300,"map":[],"sortable":true,"action":"symbol","fnName":"","paramSource":"member","paramMember":"","paramCol":-1},{"id":"tc77","kind":"enum","header":"Status","headerLoc":"","headerIcon":"","headerIconColor":"","member":"eStatus","unit":"","decimals":"","label":"","loc":"","writeMode":"setTrue","pulseMs":300,"map":[{"id":"tm78","value":"0","label":"OK","loc":"","color":"green","icon":"info"},{"id":"tm79","value":"1","label":"Fehler","loc":"","color":"red","icon":"info"}],"sortable":false,"action":"symbol","fnName":"","paramSource":"member","paramMember":"","paramCol":-1}],"rows":[],"search":true,"pageSize":0,"striped":true,"showHeader":true,"watchLimit":30,"pollMs":1000,"rules":[],"rowFilters":[],"defaultSortCol":0,"defaultSortDir":"desc"},{"id":"b75","type":"plot","col":0,"caption":"Embed-Trend","captionLoc":"","dataMode":"live","followSec":300,"historyLoadSec":3600,"maxPoints":3600,"plotHeight":220,"showRangeslider":true,"showXAxis":true,"showToolbar":true,"zoomEnabled":true,"nowLabel":"Jetzt","nowLoc":"","resetLabel":"Zurücksetzen","resetLoc":"","timeButtons":[{"id":"t48","count":1,"unit":"hour","label":"1 h"},{"id":"t49","count":6,"unit":"hour","label":"6 h"},{"id":"t50","count":24,"unit":"hour","label":"24 h"},{"id":"t51","count":7,"unit":"day","label":"1 Woche"},{"id":"t52","count":0,"unit":"all","label":"Alle"}],"axes":[{"id":"a39","label":"","loc":"","unit":"%","color":"#3b82f6","autoscale":false,"min":0,"max":100}],"series":[{"id":"s40","symbol":"ADS.AF_PLC.MAIN.…::fWert","label":"Signal","loc":"","color":"#3b82f6","axisId":"a39"}],"refLines":[],"eventMarkers":[]}]}
