// Auto-generiert vom AC_PopUp Generator – registrierte Funktion
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {
            function AC_TableSortFilter(par1) {
                var uid = "AC_TableSortFilter";
                var watchers = [];   // watch-Abmelder
                var symbols = [];    // Symbole zum Freigeben
                var teardowns = [];  // Aufräum-Callbacks (z.B. Plot-Module)

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

                function hideDialog() {
                    for (var i = 0; i < watchers.length; i++) { try { watchers[i](); } catch (e) {} }
                    for (var j = 0; j < symbols.length; j++) { try { symbols[j].destroy(); } catch (e) {} }
                    watchers = []; symbols = [];
                    for (var t = 0; t < teardowns.length; t++) { try { teardowns[t](); } catch (e) {} }
                    teardowns = [];
                    var existing = document.getElementById(uid);
                    if (existing) existing.remove();
                }

                function makeDraggable(box, handle) {
                    handle.style.cursor = 'move';
                    handle.style.userSelect = 'none';
                    handle.style.touchAction = 'none';
                    var dragging = false, startX = 0, startY = 0, baseLeft = 0, baseTop = 0;
                    function onMove(e) {
                        if (!dragging) return;
                        box.style.left = (baseLeft + (e.clientX - startX)) + 'px';
                        box.style.top = (baseTop + (e.clientY - startY)) + 'px';
                    }
                    function onUp(e) {
                        dragging = false;
                        try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
                        document.removeEventListener('pointermove', onMove);
                        document.removeEventListener('pointerup', onUp);
                    }
                    handle.addEventListener('pointerdown', function (e) {
                        if (e.target && e.target.tagName === 'BUTTON') return;
                        dragging = true;
                        var rect = box.getBoundingClientRect();
                        box.style.left = rect.left + 'px';
                        box.style.top = rect.top + 'px';
                        box.style.transform = 'none';
                        baseLeft = rect.left; baseTop = rect.top;
                        startX = e.clientX; startY = e.clientY;
                        try { handle.setPointerCapture(e.pointerId); } catch (err) {}
                        document.addEventListener('pointermove', onMove);
                        document.addEventListener('pointerup', onUp);
                        e.preventDefault();
                    });
                }

                function buildDialog() {
                    hideDialog();
                    var p = getPalette();

                    var overlay = document.createElement('div');
                    overlay.id = uid;
                    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;';

                    var box = document.createElement('div');
                    box.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
                        'background:' + p.boxBg + ';border:1px solid ' + p.border + ';border-radius:12px;' +
                        'min-width:320px;width:400px;max-width:calc(100vw - 32px);max-height:calc(100vh - 48px);' +
                        'display:flex;flex-direction:column;overflow:hidden;box-shadow:' + p.shadow + ';pointer-events:auto;';

                    var header = document.createElement('div');
                    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
                        'padding:14px 20px;background:' + p.headerBg + ';border-radius:12px 12px 0 0;' +
                        'flex:0 0 auto;font-size:15px;font-weight:600;color:' + p.titleColor + ';';

                    var titleText = document.createElement('span');
                    titleText.textContent = "Titel";
                    var title = titleText;

                    var closeBtn = document.createElement('button');
                    closeBtn.style.cssText = 'border:none;background:transparent;color:' + p.closeColor + ';' +
                        'font-size:20px;line-height:1;cursor:pointer;padding:0 4px;margin:-4px -8px -4px 0;';
                    closeBtn.textContent = '×';
                    closeBtn.title = loc('L_Close', 'Schließen');
                    closeBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                    closeBtn.onclick = function (e) { e.stopPropagation(); hideDialog(); };

                    header.appendChild(title);
                    header.appendChild(closeBtn);

                    var body = document.createElement('div');
                    body.style.cssText = 'padding:20px;overflow-y:auto;flex:1 1 auto;min-height:0;';

                    // Generische Tabelle (eigenständiges Modul, eigener Lebenszyklus)
                    (function () {
                        var TCOLS = [
                        {
                            "kind": "read",
                            "header": "Priorität",
                            "loc": "",
                            "member": "",
                            "unit": "",
                            "dec": -1,
                            "label": "",
                            "lloc": "",
                            "wmode": "setTrue",
                            "pms": 300,
                            "map": [],
                            "sortable": true
                        },
                        {
                            "kind": "bool",
                            "header": "Quittiert",
                            "loc": "",
                            "member": "",
                            "unit": "",
                            "dec": -1,
                            "label": "",
                            "lloc": "",
                            "wmode": "setTrue",
                            "pms": 300,
                            "map": [],
                            "sortable": true
                        },
                        {
                            "kind": "text",
                            "header": "Text",
                            "loc": "",
                            "member": "",
                            "unit": "",
                            "dec": -1,
                            "label": "",
                            "lloc": "",
                            "wmode": "setTrue",
                            "pms": 300,
                            "map": []
                        }
                    ];
                        var TROWS = [
                        [
                            {
                                "s": "%s%ADS.…::nPrio0%/s%",
                                "t": "",
                                "loc": ""
                            },
                            {
                                "s": "%s%ADS.…::xAck0%/s%",
                                "t": "",
                                "loc": ""
                            },
                            {
                                "s": "",
                                "t": "Eintrag 0",
                                "loc": ""
                            }
                        ],
                        [
                            {
                                "s": "%s%ADS.…::nPrio1%/s%",
                                "t": "",
                                "loc": ""
                            },
                            {
                                "s": "%s%ADS.…::xAck1%/s%",
                                "t": "",
                                "loc": ""
                            },
                            {
                                "s": "",
                                "t": "Eintrag 1",
                                "loc": ""
                            }
                        ],
                        [
                            {
                                "s": "%s%ADS.…::nPrio2%/s%",
                                "t": "",
                                "loc": ""
                            },
                            {
                                "s": "%s%ADS.…::xAck2%/s%",
                                "t": "",
                                "loc": ""
                            },
                            {
                                "s": "",
                                "t": "Eintrag 2",
                                "loc": ""
                            }
                        ],
                        [
                            {
                                "s": "%s%ADS.…::nPrio3%/s%",
                                "t": "",
                                "loc": ""
                            },
                            {
                                "s": "%s%ADS.…::xAck3%/s%",
                                "t": "",
                                "loc": ""
                            },
                            {
                                "s": "",
                                "t": "Eintrag 3",
                                "loc": ""
                            }
                        ]
                    ];
                        var TRULES = [];
                        var TFILTERS = [
                        {
                            "c": 1,
                            "op": "notEmpty",
                            "v": ""
                        },
                        {
                            "c": 0,
                            "op": ">=",
                            "v": 1
                        }
                    ];
                        var ICON_SVGS = {};
                        var DATA_SOURCE = "static"; // 'static' | 'array'
                        var ARRAY_SYMBOL = '';
                        var COUNT_SYMBOL = '';
                        var ARRAY_COUNT = 10;
                        var START_INDEX = 0;
                        var SHOW_INDEX = false;
                        var SEARCH_ON = true;
                        var PAGE_SIZE = 0; // 0 = keine Pagination
                        var STRIPED = true;
                        var SHOW_HEADER = true;
                        var WATCH_LIMIT = 30;
                        var POLL_MS = 1000;
                        var DEFAULT_SORT_COL = 1; // -1 = keine Standardsortierung
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
                                led.style.cssText = 'display:inline-block;width:15px;height:15px;border-radius:50%;background:' + (on ? pp.active : pp.inactive) + ';';
                                td.style.textAlign = 'center';
                                td.appendChild(led);
                            } else if (col.kind === 'check') {
                                var cb = document.createElement('input');
                                cb.type = 'checkbox';
                                cb.checked = (v === true || v === 1 || v === '1' || v === 'true');
                                cb.style.cssText = 'width:18px;height:18px;cursor:pointer;';
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
                        var capText = "Sortiert & gefiltert";
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

                    box.appendChild(header);
                    box.appendChild(body);
                    overlay.appendChild(box);
                    document.body.appendChild(overlay);
                    makeDraggable(box, header);
                }

                buildDialog();
            }
            AC_HMI.AC_TableSortFilter = AC_TableSortFilter;
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx("AC_TableSortFilter", 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.AC_TableSortFilter);

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"registered","fnName":"AC_TableSortFilter","title":"Titel","titleLoc":"","titleSource":"static","titleField":"TagName","titleFallback":"Titel","titleIcon":"","titleIconColor":"","maxWidth":400,"columns":1,"hostSuffix":".btn_PopUp","blocks":[{"id":"b76","type":"table","col":0,"caption":"Sortiert & gefiltert","captionLoc":"","dataSource":"static","arraySymbol":"","arrayCount":10,"countSymbol":"","startIndex":0,"showIndex":false,"columns":[{"id":"tc82","kind":"read","header":"Priorität","headerLoc":"","headerIcon":"","headerIconColor":"","member":"","unit":"","decimals":"","label":"","loc":"","writeMode":"setTrue","pulseMs":300,"map":[],"sortable":true,"action":"symbol","fnName":"","paramSource":"member","paramMember":"","paramCol":-1},{"id":"tc83","kind":"bool","header":"Quittiert","headerLoc":"","headerIcon":"","headerIconColor":"","member":"","unit":"","decimals":"","label":"","loc":"","writeMode":"setTrue","pulseMs":300,"map":[],"sortable":true,"action":"symbol","fnName":"","paramSource":"member","paramMember":"","paramCol":-1},{"id":"tc84","kind":"text","header":"Text","headerLoc":"","headerIcon":"","headerIconColor":"","member":"","unit":"","decimals":"","label":"","loc":"","writeMode":"setTrue","pulseMs":300,"map":[],"sortable":false,"action":"symbol","fnName":"","paramSource":"member","paramMember":"","paramCol":-1}],"rows":[{"id":"tr85","cells":[{"symbol":"ADS.…::nPrio0","text":"","loc":""},{"symbol":"ADS.…::xAck0","text":"","loc":""},{"symbol":"","text":"Eintrag 0","loc":""}]},{"id":"tr86","cells":[{"symbol":"ADS.…::nPrio1","text":"","loc":""},{"symbol":"ADS.…::xAck1","text":"","loc":""},{"symbol":"","text":"Eintrag 1","loc":""}]},{"id":"tr87","cells":[{"symbol":"ADS.…::nPrio2","text":"","loc":""},{"symbol":"ADS.…::xAck2","text":"","loc":""},{"symbol":"","text":"Eintrag 2","loc":""}]},{"id":"tr88","cells":[{"symbol":"ADS.…::nPrio3","text":"","loc":""},{"symbol":"ADS.…::xAck3","text":"","loc":""},{"symbol":"","text":"Eintrag 3","loc":""}]}],"search":true,"pageSize":0,"striped":true,"showHeader":true,"watchLimit":30,"pollMs":1000,"rules":[],"rowFilters":[{"id":"tf91","colIndex":1,"op":"notEmpty","value":""},{"id":"tf92","colIndex":0,"op":">=","value":"1"}],"defaultSortCol":1,"defaultSortDir":"desc"}]}
