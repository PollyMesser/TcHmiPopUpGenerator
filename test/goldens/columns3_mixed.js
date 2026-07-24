// Auto-generiert vom AC_PopUp Generator – registrierte Funktion
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {
            function AC_ThreeCols(par1) {
                var uid = "AC_ThreeCols";
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
                        'min-width:320px;width:780px;max-width:calc(100vw - 32px);max-height:calc(100vh - 48px);' +
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

                    var grid0 = document.createElement('div');
                    grid0.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;align-items:start;';
                    var g0c0 = document.createElement('div');
                    g0c0.style.cssText = 'min-width:0;padding-left:0px;padding-right:24px;';
                    grid0.appendChild(g0c0);

                    // Text
                    (function () {
                        var elT = document.createElement('div');
                        elT.style.cssText = 'margin-bottom:16px;';
                        var cntT = elT;
                        var bdyT = document.createElement('div');
                        bdyT.style.cssText = 'font-size:14px;color:' + p.bodyText + ';line-height:1.5;white-space:pre-wrap;';
                        var _tT = "Spalte 1";
                        bdyT.textContent = (typeof _tT === 'string' ? _tT : String(_tT)).split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10));
                        cntT.appendChild(bdyT);
                        g0c0.appendChild(elT);
                    })();

                    // Wert lesen: ADS.…::rA
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:16px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "Wert A";
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        g0c0.appendChild(row);
                        subscribe("%s%ADS.…::rA%/s%", function (v) { valEl.textContent = String(v) + ""; });
                    })();

                    // Trennlinie mit Beschriftung
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'display:flex;align-items:center;gap:12px;margin:6px 0 18px;';
                        var l1 = document.createElement('div'); l1.style.cssText = 'flex:1;height:1px;background:' + p.border + ';';
                        var cap = document.createElement('span'); cap.style.cssText = 'flex:0 0 auto;font-size:12px;font-weight:600;letter-spacing:0.3px;color:' + p.closeColor + ';';
                        cap.textContent = "In Spalte 1";
                        var l2 = document.createElement('div'); l2.style.cssText = 'flex:1;height:1px;background:' + p.border + ';';
                        wrap.appendChild(l1); wrap.appendChild(cap); wrap.appendChild(l2);
                        g0c0.appendChild(wrap);
                    })();

                    // Boolean-Anzeige: ADS.…::xA
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;';
                        var dot = document.createElement('span');
                        dot.style.cssText = 'width:18px;height:18px;border-radius:50%;flex:0 0 auto;background:' + p.inactive + ';transition:background .15s;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "Bool A";
                        row.appendChild(dot); row.appendChild(lbl);
                        g0c0.appendChild(row);
                        subscribe("%s%ADS.…::xA%/s%", function (v) { dot.style.background = v ? p.active : p.inactive; });
                    })();
                    var g0c1 = document.createElement('div');
                    g0c1.style.cssText = 'min-width:0;padding-left:24px;padding-right:24px;' + 'border-left:1px solid ' + p.border + ';';
                    grid0.appendChild(g0c1);

                    // Wert lesen: ADS.…::rB
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:16px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "Wert B";
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        g0c1.appendChild(row);
                        subscribe("%s%ADS.…::rB%/s%", function (v) { valEl.textContent = String(v) + ""; });
                    })();

                    // Boolean setzen (Checkbox): ADS.…::xB
                    (function () {
                        var wrap = document.createElement('label');
                        wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer;';
                        var cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.style.cssText = 'width:20px;height:20px;flex:0 0 auto;cursor:pointer;accent-color:' + p.active + ';';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "Check B";
                        wrap.appendChild(cb); wrap.appendChild(lbl);
                        g0c1.appendChild(wrap);
                        cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        subscribe("%s%ADS.…::xB%/s%", function (v) { if (document.activeElement !== cb) cb.checked = !!v; });
                        cb.addEventListener('change', function () { writeSymbol("%s%ADS.…::xB%/s%", cb.checked); });
                    })();
                    var g0c2 = document.createElement('div');
                    g0c2.style.cssText = 'min-width:0;padding-left:24px;padding-right:0px;' + 'border-left:1px solid ' + p.border + ';';
                    grid0.appendChild(g0c2);

                    // Wert lesen: ADS.…::rC
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:16px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "Wert C";
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        g0c2.appendChild(row);
                        subscribe("%s%ADS.…::rC%/s%", function (v) { valEl.textContent = String(v) + ""; });
                    })();

                    // Ladebalken: ADS.…::rC2
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:16px;';
                        var head = document.createElement('div');
                        head.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "Balken C";
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:13px;font-weight:600;color:' + p.bodyText + ';font-variant-numeric:tabular-nums;';
                        valEl.textContent = '–';
                        head.appendChild(lbl); head.appendChild(valEl);
                        var track = document.createElement('div');
                        track.style.cssText = 'position:relative;width:100%;height:14px;border-radius:7px;overflow:hidden;background:rgba(127,127,127,0.22);';
                        var fill = document.createElement('div');
                        fill.style.cssText = 'height:100%;width:0%;border-radius:7px;background:#3b82f6;transition:width .25s ease;';
                        track.appendChild(fill);
                        wrap.appendChild(head); wrap.appendChild(track);
                        g0c2.appendChild(wrap);
                        var MIN = 0, MAX = 10;
                        subscribe("%s%ADS.…::rC2%/s%", function (v) {
                            var num = Number(v); if (isNaN(num)) return;
                            var span = (MAX - MIN) || 1;
                            var pct = (num - MIN) / span * 100;
                            if (pct < 0) pct = 0; if (pct > 100) pct = 100;
                            fill.style.width = pct.toFixed(1) + '%';
                            valEl.textContent = num.toFixed(0) + "%";
                        });
                    })();
                    body.appendChild(grid0);

                    // Trennlinie
                    (function () {
                        var hr = document.createElement('div');
                        hr.style.cssText = 'height:1px;background:' + p.border + ';margin:6px 0 18px;';
                        body.appendChild(hr);
                    })();

                    // Zeile (nebeneinander)
                    (function () {
                        var rrow = document.createElement('div');
                        rrow.style.cssText = 'display:flex;gap:16px;margin-bottom:16px;align-items:center;';
                        var rc0 = document.createElement('div');
                        rc0.style.cssText = 'flex:1;min-width:0;';
                        rrow.appendChild(rc0);
                    // Wert lesen: ADS.…::r1
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:0px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "R1";
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        rc0.appendChild(row);
                        subscribe("%s%ADS.…::r1%/s%", function (v) { valEl.textContent = String(v) + ""; });
                    })();
                        var rc1 = document.createElement('div');
                        rc1.style.cssText = 'flex:1;min-width:0;';
                        rrow.appendChild(rc1);
                    // Wert lesen: ADS.…::r2
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:0px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "R2";
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        rc1.appendChild(row);
                        subscribe("%s%ADS.…::r2%/s%", function (v) { valEl.textContent = String(v) + ""; });
                    })();
                        var rc2 = document.createElement('div');
                        rc2.style.cssText = 'flex:1;min-width:0;';
                        rrow.appendChild(rc2);
                    // Wert lesen: ADS.…::r3
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:0px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "R3";
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        rc2.appendChild(row);
                        subscribe("%s%ADS.…::r3%/s%", function (v) { valEl.textContent = String(v) + ""; });
                    })();
                        var rc3 = document.createElement('div');
                        rc3.style.cssText = 'flex:1;min-width:0;';
                        rrow.appendChild(rc3);
                    // Wert lesen: ADS.…::r4
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:0px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = "R4";
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        rc3.appendChild(row);
                        subscribe("%s%ADS.…::r4%/s%", function (v) { valEl.textContent = String(v) + ""; });
                    })();
                        body.appendChild(rrow);
                    })();

                    var grid1 = document.createElement('div');
                    grid1.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;align-items:start;';
                    var g1c0 = document.createElement('div');
                    g1c0.style.cssText = 'min-width:0;padding-left:0px;padding-right:24px;';
                    grid1.appendChild(g1c0);
                    // (Spalte 1 leer)
                    var g1c1 = document.createElement('div');
                    g1c1.style.cssText = 'min-width:0;padding-left:24px;padding-right:24px;' + 'border-left:1px solid ' + p.border + ';';
                    grid1.appendChild(g1c1);

                    // Text
                    (function () {
                        var elT = document.createElement('div');
                        elT.style.cssText = 'margin-bottom:16px;';
                        var cntT = elT;
                        var bdyT = document.createElement('div');
                        bdyT.style.cssText = 'font-size:14px;color:' + p.bodyText + ';line-height:1.5;white-space:pre-wrap;';
                        var _tT = "Nach der Zeile, wieder im Grid";
                        bdyT.textContent = (typeof _tT === 'string' ? _tT : String(_tT)).split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10));
                        cntT.appendChild(bdyT);
                        g1c1.appendChild(elT);
                    })();
                    var g1c2 = document.createElement('div');
                    g1c2.style.cssText = 'min-width:0;padding-left:24px;padding-right:0px;' + 'border-left:1px solid ' + p.border + ';';
                    grid1.appendChild(g1c2);
                    // (Spalte 3 leer)
                    body.appendChild(grid1);

                    box.appendChild(header);
                    box.appendChild(body);
                    overlay.appendChild(box);
                    document.body.appendChild(overlay);
                    makeDraggable(box, header);
                }

                buildDialog();
            }
            AC_HMI.AC_ThreeCols = AC_ThreeCols;
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx("AC_ThreeCols", 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.AC_ThreeCols);

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"registered","fnName":"AC_ThreeCols","title":"Titel","titleLoc":"","titleSource":"static","titleField":"TagName","titleFallback":"Titel","titleIcon":"","titleIconColor":"","maxWidth":780,"columns":3,"hostSuffix":".btn_PopUp","blocks":[{"id":"b53","type":"text","col":0,"heading":"","headingLoc":"","text":"Spalte 1","loc":"","bgColor":"","icon":"","iconColor":""},{"id":"b54","type":"read","col":0,"label":"Wert A","loc":"","symbol":"ADS.…::rA","unit":""},{"id":"b55","type":"divider","col":0,"label":"In Spalte 1","loc":"","inCol":true},{"id":"b56","type":"bool","col":0,"label":"Bool A","loc":"","symbol":"ADS.…::xA"},{"id":"b57","type":"read","col":1,"label":"Wert B","loc":"","symbol":"ADS.…::rB","unit":""},{"id":"b58","type":"check","col":1,"label":"Check B","loc":"","symbol":"ADS.…::xB"},{"id":"b59","type":"read","col":2,"label":"Wert C","loc":"","symbol":"ADS.…::rC","unit":""},{"id":"b60","type":"progress","col":2,"label":"Balken C","loc":"","symbol":"ADS.…::rC2","min":0,"max":10,"unit":"%","decimals":0,"showValue":true,"color":"blue"},{"id":"b61","type":"divider","col":0,"label":"","loc":"","inCol":false},{"id":"b62","type":"row","col":0,"items":[{"id":"b65","kind":"read","label":"R1","loc":"","symbol":"ADS.…::r1"},{"id":"b66","kind":"read","label":"R2","loc":"","symbol":"ADS.…::r2"},{"id":"b67","kind":"read","label":"R3","loc":"","symbol":"ADS.…::r3"},{"id":"b68","kind":"read","label":"R4","loc":"","symbol":"ADS.…::r4"}]},{"id":"b69","type":"text","col":1,"heading":"","headingLoc":"","text":"Nach der Zeile, wieder im Grid","loc":"","bgColor":"","icon":"","iconColor":""}]}
