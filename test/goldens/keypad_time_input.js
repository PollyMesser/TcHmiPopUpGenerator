// Auto-generiert vom AC_PopUp Generator – registrierte Funktion
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {
            function AC_KeypadTime(par1) {
                var uid = "AC_KeypadTime";
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

                    // Zeit-Eingabefeld (Keypad AC_NumPad, Eingabe in s): ADS.AF_PLC.GVL.stLeak::tHold
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:16px;';
                        var lbl = document.createElement('div');
                        lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
                        lbl.textContent = "Haltezeit";
                        var line = document.createElement('div');
                        line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
                        var input = document.createElement('input');
                        input.type = 'text';
                        input.readOnly = true;
                        input.setAttribute('inputmode', 'none');
                        input.placeholder = 'HH:MM:SS';
                        input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:center;cursor:pointer;font-variant-numeric:tabular-nums;' +
                            'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
                        input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        var curSec = NaN;
                        function isoToSec(iso) {
                            if (typeof iso === 'number') return iso / 1000; // ms (Zahl) -> s
                            iso = String(iso == null ? '' : iso).trim().toUpperCase();
                            if (iso.charAt(0) !== 'P') return NaN;
                            var sec = 0, num = '', inTime = false;
                            for (var k = 1; k < iso.length; k++) {
                                var ch = iso.charAt(k);
                                if (ch === 'T') { inTime = true; num = ''; continue; }
                                if (ch === '.' || ch === ',') { num += '.'; continue; }
                                if (ch >= '0' && ch <= '9') { num += ch; continue; }
                                var val = parseFloat(num || '0'); num = '';
                                if (ch === 'D') sec += val * 86400;
                                else if (ch === 'H') sec += val * 3600;
                                else if (ch === 'M') { if (inTime) sec += val * 60; }
                                else if (ch === 'S') sec += val;
                            }
                            return sec;
                        }
                        function secToHMS(t) {
                            if (isNaN(t)) return '';
                            var ms = Math.round((t - Math.floor(t)) * 1000), s = Math.floor(t);
                            function p2(n) { return (n < 10 ? '0' : '') + n; }
                            var out = p2(Math.floor(s / 3600)) + ':' + p2(Math.floor((s % 3600) / 60)) + ':' + p2(s % 60);
                            if (ms > 0) { var mstr = String(ms); while (mstr.length < 3) mstr = '0' + mstr; out += '.' + mstr; }
                            return out;
                        }
                        function show(v) { curSec = isoToSec(v); input.value = secToHMS(curSec); }
                        subscribe("%s%ADS.AF_PLC.GVL.stLeak::tHold%/s%", function (v) { show(v); });
                        function openPad() {
                            if (input.disabled) return;
                            var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions) ? TcHmi.Functions.AC_HMI : null;
                            var f = fns ? fns.AC_NumPad : null;
                            if (typeof f !== 'function') { if (window.console) console.warn('AC_NumPad: Funktionsdatei nicht geladen.'); return; }
                            f({
                                value: isNaN(curSec) ? '' : curSec / 1,
                                write: function (val) { var iso = 'PT' + (Math.round(Number(val) * 1 * 1000) / 1000) + 'S'; writeSymbol("%s%ADS.AF_PLC.GVL.stLeak::tHold%/s%", iso); },
                                min: 0,
                                max: 600,
                                unit: "s",
                                decimals: 0,
                                title: "Haltezeit"
                            });
                        }
                        input.addEventListener('click', function (e) { e.stopPropagation(); openPad(); });
                        var unitEl = document.createElement('span');
                        unitEl.style.cssText = 'flex:0 0 auto;align-self:center;font-size:13px;color:' + p.bodyText + ';opacity:0.75;';
                        unitEl.textContent = "HH:MM:SS";
                        line.appendChild(input);
                        line.appendChild(unitEl);
                        wrap.appendChild(lbl); wrap.appendChild(line);
                        body.appendChild(wrap);
                    })();

                    // Zeit-Eingabefeld (Keypad AC_NumPad, Eingabe in min): ADS.AF_PLC.GVL.tTimeout
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:16px;';
                        var lbl = document.createElement('div');
                        lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
                        lbl.textContent = "Timeout";
                        var line = document.createElement('div');
                        line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
                        var input = document.createElement('input');
                        input.type = 'text';
                        input.readOnly = true;
                        input.setAttribute('inputmode', 'none');
                        input.placeholder = 'HH:MM:SS';
                        input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:center;cursor:pointer;font-variant-numeric:tabular-nums;' +
                            'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
                        input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        var curSec = NaN;
                        function isoToSec(iso) {
                            if (typeof iso === 'number') return iso / 1000; // ms (Zahl) -> s
                            iso = String(iso == null ? '' : iso).trim().toUpperCase();
                            if (iso.charAt(0) !== 'P') return NaN;
                            var sec = 0, num = '', inTime = false;
                            for (var k = 1; k < iso.length; k++) {
                                var ch = iso.charAt(k);
                                if (ch === 'T') { inTime = true; num = ''; continue; }
                                if (ch === '.' || ch === ',') { num += '.'; continue; }
                                if (ch >= '0' && ch <= '9') { num += ch; continue; }
                                var val = parseFloat(num || '0'); num = '';
                                if (ch === 'D') sec += val * 86400;
                                else if (ch === 'H') sec += val * 3600;
                                else if (ch === 'M') { if (inTime) sec += val * 60; }
                                else if (ch === 'S') sec += val;
                            }
                            return sec;
                        }
                        function secToHMS(t) {
                            if (isNaN(t)) return '';
                            var ms = Math.round((t - Math.floor(t)) * 1000), s = Math.floor(t);
                            function p2(n) { return (n < 10 ? '0' : '') + n; }
                            var out = p2(Math.floor(s / 3600)) + ':' + p2(Math.floor((s % 3600) / 60)) + ':' + p2(s % 60);
                            if (ms > 0) { var mstr = String(ms); while (mstr.length < 3) mstr = '0' + mstr; out += '.' + mstr; }
                            return out;
                        }
                        function show(v) { curSec = isoToSec(v); input.value = secToHMS(curSec); }
                        subscribe("%s%ADS.AF_PLC.GVL.tTimeout%/s%", function (v) { show(v); });
                        function openPad() {
                            if (input.disabled) return;
                            var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions) ? TcHmi.Functions.AC_HMI : null;
                            var f = fns ? fns.AC_NumPad : null;
                            if (typeof f !== 'function') { if (window.console) console.warn('AC_NumPad: Funktionsdatei nicht geladen.'); return; }
                            f({
                                value: isNaN(curSec) ? '' : curSec / 60,
                                write: function (val) { var iso = 'PT' + (Math.round(Number(val) * 60 * 1000) / 1000) + 'S'; writeSymbol("%s%ADS.AF_PLC.GVL.tTimeout%/s%", iso); },
                                min: null,
                                max: "%s%ADS.AF_PLC.GVL.fMaxMin%/s%",
                                unit: "min",
                                decimals: 1,
                                title: "Timeout",
                                onWritten: function () { pulseSymbol("%s%ADS.AF_PLC.GVL.xApply%/s%", 300); }
                            });
                        }
                        input.addEventListener('click', function (e) { e.stopPropagation(); openPad(); });
                        line.appendChild(input);
                        wrap.appendChild(lbl); wrap.appendChild(line);
                        body.appendChild(wrap);
                    })();

                    box.appendChild(header);
                    box.appendChild(body);
                    overlay.appendChild(box);
                    document.body.appendChild(overlay);
                    makeDraggable(box, header);
                }

                buildDialog();
            }
            AC_HMI.AC_KeypadTime = AC_KeypadTime;
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx("AC_KeypadTime", 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.AC_KeypadTime);

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"registered","fnName":"AC_KeypadTime","title":"Titel","titleLoc":"","titleSource":"static","titleField":"TagName","titleFallback":"Titel","titleIcon":"","titleIconColor":"","maxWidth":400,"columns":1,"hostSuffix":".btn_PopUp","blocks":[{"id":"b122","type":"input","col":0,"label":"Haltezeit","loc":"","symbol":"ADS.AF_PLC.GVL.stLeak::tHold","dataType":"time","unit":"HH:MM:SS","sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"","trigMode":"pulse","trigMs":500,"keypad":true,"kpTimeUnit":"s","kpMin":"0","kpMax":"600","kpDecimals":"0"},{"id":"b123","type":"input","col":0,"label":"Timeout","loc":"","symbol":"ADS.AF_PLC.GVL.tTimeout","dataType":"time","unit":"","sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"ADS.AF_PLC.GVL.xApply","trigMode":"pulse","trigMs":300,"keypad":true,"kpTimeUnit":"min","kpMin":"","kpMax":"ADS.AF_PLC.GVL.fMaxMin","kpDecimals":"1"}]}
