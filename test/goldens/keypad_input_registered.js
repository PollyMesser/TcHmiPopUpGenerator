// Auto-generiert vom AC_PopUp Generator – registrierte Funktion
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {
            function AC_KeypadInput(par1) {
                var uid = "AC_KeypadInput";
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

                    // Eingabefeld (Keypad AC_NumPad): ADS.AF_PLC.GVL.stP101::rValue
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:16px;';
                        var lbl = document.createElement('div');
                        lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
                        lbl.textContent = loc("L_PressSet", "Druck-Sollwert");
                        var line = document.createElement('div');
                        line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
                        var input = document.createElement('input');
                        input.type = 'text';
                        input.readOnly = true;
                        input.setAttribute('inputmode', 'none');
                        input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;cursor:pointer;font-variant-numeric:tabular-nums;' +
                            'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
                        input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        subscribe("%s%ADS.AF_PLC.GVL.stP101::rValue%/s%", function (v) { var num = Number(v); input.value = (v === '' || v === null || v === undefined || isNaN(num)) ? String(v == null ? '' : v) : num.toFixed(1); });
                        function openPad() {
                            if (input.disabled) return;
                            var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions) ? TcHmi.Functions.AC_HMI : null;
                            var f = fns ? fns.AC_NumPad : null;
                            if (typeof f !== 'function') { if (window.console) console.warn('AC_NumPad: Funktionsdatei nicht geladen.'); return; }
                            f({
                                symbol: "%s%ADS.AF_PLC.GVL.stP101::rValue%/s%",
                                writeSymbol: "%s%ADS.AF_PLC.GVL.stP101::rValue%/s%",
                                min: "%s%ADS.AF_PLC.GVL.stP101::rMin%/s%",
                                max: 16,
                                unit: "bar",
                                decimals: 1,
                                title: loc("L_PressSet", "Druck-Sollwert"),
                                onWritten: function () { pulseSymbol("%s%ADS.AF_PLC.GVL.stP101::xApply%/s%", 500); }
                            });
                        }
                        input.addEventListener('click', function (e) { e.stopPropagation(); openPad(); });
                        var unitEl = document.createElement('span');
                        unitEl.style.cssText = 'flex:0 0 auto;align-self:center;font-size:13px;color:' + p.bodyText + ';opacity:0.75;';
                        unitEl.textContent = "bar";
                        line.appendChild(input);
                        line.appendChild(unitEl);
                        wrap.appendChild(lbl); wrap.appendChild(line);
                        body.appendChild(wrap);
                    })();

                    // Eingabefeld (Keypad AC_NumPad): ADS.AF_PLC.GVL.nCount
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:16px;';
                        var lbl = document.createElement('div');
                        lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
                        lbl.textContent = "Stückzahl";
                        var line = document.createElement('div');
                        line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
                        var input = document.createElement('input');
                        input.type = 'text';
                        input.readOnly = true;
                        input.setAttribute('inputmode', 'none');
                        input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;cursor:pointer;font-variant-numeric:tabular-nums;' +
                            'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
                        input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        subscribe("%s%ADS.AF_PLC.GVL.nCount%/s%", function (v) { var num = Number(v); input.value = (v === '' || v === null || v === undefined || isNaN(num)) ? String(v == null ? '' : v) : num.toFixed(0); });
                        function openPad() {
                            if (input.disabled) return;
                            var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions) ? TcHmi.Functions.AC_HMI : null;
                            var f = fns ? fns.AC_NumPad : null;
                            if (typeof f !== 'function') { if (window.console) console.warn('AC_NumPad: Funktionsdatei nicht geladen.'); return; }
                            f({
                                symbol: "%s%ADS.AF_PLC.GVL.nCount%/s%",
                                writeSymbol: "%s%ADS.AF_PLC.GVL.nCountCmd%/s%",
                                min: 0,
                                max: null,
                                unit: "",
                                decimals: 0,
                                title: "Stückzahl"
                            });
                        }
                        input.addEventListener('click', function (e) { e.stopPropagation(); openPad(); });
                        line.appendChild(input);
                        wrap.appendChild(lbl); wrap.appendChild(line);
                        body.appendChild(wrap);
                    })();

                    // Zeile (nebeneinander)
                    (function () {
                        var rrow = document.createElement('div');
                        rrow.style.cssText = 'display:flex;gap:16px;margin-bottom:16px;align-items:center;';
                        var rc0 = document.createElement('div');
                        rc0.style.cssText = 'flex:1;min-width:0;';
                        rrow.appendChild(rc0);
                    // Wert lesen: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xValue
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:0px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "Wert";
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        rc0.appendChild(row);
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xValue%/s%", function (v) { valEl.textContent = String(v) + ""; });
                    })();
                        var rc1 = document.createElement('div');
                        rc1.style.cssText = 'flex:1;min-width:0;';
                        rrow.appendChild(rc1);
                    // Eingabefeld (Keypad AC_NumPad): ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:0px;';
                        var lbl = document.createElement('div');
                        lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
                        lbl.textContent = "Sollwert";
                        var line = document.createElement('div');
                        line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
                        var input = document.createElement('input');
                        input.type = 'text';
                        input.readOnly = true;
                        input.setAttribute('inputmode', 'none');
                        input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;cursor:pointer;font-variant-numeric:tabular-nums;' +
                            'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
                        input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint%/s%", function (v) { input.value = (v === null || v === undefined) ? '' : String(v); });
                        function openPad() {
                            if (input.disabled) return;
                            var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions) ? TcHmi.Functions.AC_HMI : null;
                            var f = fns ? fns.AC_NumPad : null;
                            if (typeof f !== 'function') { if (window.console) console.warn('AC_NumPad: Funktionsdatei nicht geladen.'); return; }
                            f({
                                symbol: "%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint%/s%",
                                writeSymbol: "%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint%/s%",
                                min: -10,
                                max: 10,
                                unit: "",
                                decimals: -1,
                                title: "Sollwert"
                            });
                        }
                        input.addEventListener('click', function (e) { e.stopPropagation(); openPad(); });
                        line.appendChild(input);
                        wrap.appendChild(lbl); wrap.appendChild(line);
                        rc1.appendChild(wrap);
                    })();
                        body.appendChild(rrow);
                    })();

                    box.appendChild(header);
                    box.appendChild(body);
                    overlay.appendChild(box);
                    document.body.appendChild(overlay);
                    makeDraggable(box, header);
                }

                buildDialog();
            }
            AC_HMI.AC_KeypadInput = AC_KeypadInput;
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx("AC_KeypadInput", 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.AC_KeypadInput);

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"registered","fnName":"AC_KeypadInput","title":"Titel","titleLoc":"","titleSource":"static","titleField":"TagName","titleFallback":"Titel","titleIcon":"","titleIconColor":"","maxWidth":400,"columns":1,"hostSuffix":".btn_PopUp","blocks":[{"id":"b105","type":"input","col":0,"label":"Druck-Sollwert","loc":"L_PressSet","symbol":"ADS.AF_PLC.GVL.stP101::rValue","dataType":"number","unit":"bar","sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"ADS.AF_PLC.GVL.stP101::xApply","trigMode":"pulse","trigMs":500,"keypad":true,"kpMin":"ADS.AF_PLC.GVL.stP101::rMin","kpMax":"16","kpDecimals":"1"},{"id":"b106","type":"input","col":0,"label":"Stückzahl","loc":"","symbol":"ADS.AF_PLC.GVL.nCount","dataType":"number","unit":"","sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"","trigMode":"pulse","trigMs":500,"writeSym":"ADS.AF_PLC.GVL.nCountCmd","keypad":true,"kpMin":"0","kpMax":"","kpDecimals":"0"},{"id":"b107","type":"row","col":0,"items":[{"id":"b110","kind":"read","label":"Wert","loc":"","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xValue"},{"id":"b111","kind":"input","label":"Sollwert","loc":"","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint","dataType":"number","sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"","trigMode":"pulse","trigMs":500,"keypad":true,"kpMin":"-10","kpMax":"10"}]}]}
