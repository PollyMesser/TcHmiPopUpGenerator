// Auto-generiert vom AC_PopUp Generator – registrierte Funktion
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {
            function AC_SkipRelease(par1) {
                var uid = "AC_SkipRelease";
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
                        'min-width:320px;width:460px;max-width:calc(100vw - 32px);max-height:calc(100vh - 48px);' +
                        'display:flex;flex-direction:column;overflow:hidden;box-shadow:' + p.shadow + ';pointer-events:auto;';

                    var header = document.createElement('div');
                    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
                        'padding:14px 20px;background:' + p.headerBg + ';border-radius:12px 12px 0 0;' +
                        'flex:0 0 auto;font-size:15px;font-weight:600;color:' + p.titleColor + ';';

                    var titleText = document.createElement('span');
                    titleText.textContent = "P-101";
                    subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::sTagName%/s%", function (v) { titleText.textContent = String(v); });
                    var titleIco = document.createElement('span');
                    titleIco.style.cssText = 'display:inline-flex;line-height:0;flex:0 0 auto;color:' + "#f59e0b" + ';';
                    titleIco.innerHTML = "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>";
                    var titleSvg = titleIco.querySelector('svg'); if (titleSvg) { titleSvg.setAttribute('width', '1em'); titleSvg.setAttribute('height', '1em'); }
                    var title = document.createElement('span');
                    title.style.cssText = 'display:inline-flex;align-items:center;gap:8px;min-width:0;';
                    title.appendChild(titleIco);
                    title.appendChild(titleText);

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
                    grid0.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;align-items:start;';
                    var g0c0 = document.createElement('div');
                    g0c0.style.cssText = 'min-width:0;padding-left:0px;padding-right:24px;';
                    grid0.appendChild(g0c0);

                    // Text (mit Symbol)
                    (function () {
                        var elT = document.createElement('div');
                        elT.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:16px;background:#fde047;color:#1a1a1a;padding:8px 10px;border-radius:6px;';
                        var icoT = document.createElement('span');
                        icoT.style.cssText = 'flex:0 0 auto;display:inline-flex;line-height:0;margin-top:1px;color:' + "#f59e0b" + ';';
                        icoT.innerHTML = "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>";
                        elT.appendChild(icoT);
                        var cntT = document.createElement('div');
                        cntT.style.cssText = 'flex:1 1 auto;min-width:0;';
                        var hdT = document.createElement('div');
                        hdT.style.cssText = 'font-size:14px;font-weight:600;color:' + "#1a1a1a" + ';margin-bottom:4px;white-space:pre-wrap;';
                        var _hT = loc("L_HeadHint", "Hinweis");
                        hdT.textContent = (typeof _hT === 'string' ? _hT : String(_hT)).split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10));
                        cntT.appendChild(hdT);
                        var bdyT = document.createElement('div');
                        bdyT.style.cssText = 'font-size:14px;color:' + "#1a1a1a" + ';line-height:1.5;white-space:pre-wrap;';
                        var _tT = loc("L_TextHint", "Bitte Freigabe prüfen.");
                        bdyT.textContent = (typeof _tT === 'string' ? _tT : String(_tT)).split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10));
                        cntT.appendChild(bdyT);
                        elT.appendChild(cntT);
                        g0c0.appendChild(elT);
                    })();

                    // Wert lesen: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPressure
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:16px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = loc("L_Druck", "Druck");
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        g0c0.appendChild(row);
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPressure%/s%", function (v) { valEl.textContent = String(v) + " bar"; });
                    })();

                    // Boolean-Anzeige: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipReleaseOffered
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;';
                        var dot = document.createElement('span');
                        dot.style.cssText = 'width:14px;height:14px;border-radius:50%;flex:0 0 auto;background:' + p.inactive + ';transition:background .15s;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = loc("L_SkipOffered", "Freigabe angeboten");
                        row.appendChild(dot); row.appendChild(lbl);
                        g0c0.appendChild(row);
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipReleaseOffered%/s%", function (v) { dot.style.background = v ? p.active : p.inactive; });
                    })();

                    // Boolean setzen (Checkbox): ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable
                    (function () {
                        var wrap = document.createElement('label');
                        wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer;';
                        var cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.style.cssText = 'width:16px;height:16px;flex:0 0 auto;cursor:pointer;accent-color:' + p.active + ';';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = loc("L_Enable", "Freigabe");
                        wrap.appendChild(cb); wrap.appendChild(lbl);
                        g0c0.appendChild(wrap);
                        cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable%/s%", function (v) { if (document.activeElement !== cb) cb.checked = !!v; });
                        cb.addEventListener('change', function () { writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable%/s%", cb.checked); });
                    })();

                    // Eingabefeld + Senden: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:16px;';
                        var lbl = document.createElement('div');
                        lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
                        lbl.textContent = loc("L_Setpoint", "Sollwert");
                        var line = document.createElement('div');
                        line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
                        var input = document.createElement('input');
                        input.type = 'number';
                        input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;' +
                            'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
                        input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint%/s%", function (v) { if (document.activeElement !== input) input.value = String(v); });
                        function commit() { var val = parseFloat(input.value); if (isNaN(val)) return; writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint%/s%", val); }
                        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });
                        var unitEl = document.createElement('span');
                        unitEl.style.cssText = 'flex:0 0 auto;align-self:center;font-size:13px;color:' + p.bodyText + ';opacity:0.75;';
                        unitEl.textContent = "bar";
                        var send = document.createElement('button');
                        send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#3b82f6;color:#ffffff;';
                        send.textContent = "Setzen";
                        send.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        send.style.transition = 'transform .08s ease, filter .08s ease';
                        send.addEventListener('pointerdown', function () { send.style.transform = 'scale(0.96)'; send.style.filter = 'brightness(0.88)'; });
                        var rel_send = function () { send.style.transform = ''; send.style.filter = ''; };
                        send.addEventListener('pointerup', rel_send);
                        send.addEventListener('pointerleave', rel_send);
                        send.onclick = function (e) { e.stopPropagation(); commit(); pulseSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xApply%/s%", 300); };
                        line.appendChild(input);
                        line.appendChild(unitEl);
                        line.appendChild(send);
                        wrap.appendChild(lbl); wrap.appendChild(line);
                        g0c0.appendChild(wrap);
                    })();

                    // Ladebalken: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPosition
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:16px;';
                        var head = document.createElement('div');
                        head.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = loc("L_Valve", "Ventilstellung");
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:13px;font-weight:600;color:' + p.bodyText + ';font-variant-numeric:tabular-nums;';
                        valEl.textContent = '–';
                        head.appendChild(lbl); head.appendChild(valEl);
                        var track = document.createElement('div');
                        track.style.cssText = 'position:relative;width:100%;height:14px;border-radius:7px;overflow:hidden;background:rgba(127,127,127,0.22);';
                        var fill = document.createElement('div');
                        fill.style.cssText = 'height:100%;width:0%;border-radius:7px;background:#22c55e;transition:width .25s ease;';
                        track.appendChild(fill);
                        wrap.appendChild(head); wrap.appendChild(track);
                        g0c0.appendChild(wrap);
                        var MIN = 0, MAX = 100;
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPosition%/s%", function (v) {
                            var num = Number(v); if (isNaN(num)) return;
                            var span = (MAX - MIN) || 1;
                            var pct = (num - MIN) / span * 100;
                            if (pct < 0) pct = 0; if (pct > 100) pct = 100;
                            fill.style.width = pct.toFixed(1) + '%';
                            valEl.textContent = num.toFixed(1) + "%";
                        });
                    })();
                    var g0c1 = document.createElement('div');
                    g0c1.style.cssText = 'min-width:0;padding-left:24px;padding-right:0px;' + 'border-left:1px solid ' + p.border + ';';
                    grid0.appendChild(g0c1);
                    // (Spalte 2 leer)
                    body.appendChild(grid0);

                    // Trennlinie mit Beschriftung
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'display:flex;align-items:center;gap:12px;margin:6px 0 18px;';
                        var l1 = document.createElement('div'); l1.style.cssText = 'flex:1;height:1px;background:' + p.border + ';';
                        var cap = document.createElement('span'); cap.style.cssText = 'flex:0 0 auto;font-size:12px;font-weight:600;letter-spacing:0.3px;color:' + p.closeColor + ';';
                        cap.textContent = loc("L_DivCtrl", "Steuerung");
                        var l2 = document.createElement('div'); l2.style.cssText = 'flex:1;height:1px;background:' + p.border + ';';
                        wrap.appendChild(l1); wrap.appendChild(cap); wrap.appendChild(l2);
                        body.appendChild(wrap);
                    })();

                    var grid1 = document.createElement('div');
                    grid1.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;align-items:start;';
                    var g1c0 = document.createElement('div');
                    g1c0.style.cssText = 'min-width:0;padding-left:0px;padding-right:24px;';
                    grid1.appendChild(g1c0);
                    // (Spalte 1 leer)
                    var g1c1 = document.createElement('div');
                    g1c1.style.cssText = 'min-width:0;padding-left:24px;padding-right:0px;' + 'border-left:1px solid ' + p.border + ';';
                    grid1.appendChild(g1c1);

                    // Buttons
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;gap:10px;margin-bottom:16px;';
                        // pulse: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipRelease
                        var btn0 = document.createElement('button');
                        btn0.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:#3b82f6;color:#ffffff;';
                        btn0.style.display = 'inline-flex';
                        btn0.style.alignItems = 'center';
                        btn0.style.justifyContent = 'center';
                        btn0.style.gap = '8px';
                        var _ico_btn0 = document.createElement('span');
                        _ico_btn0.style.cssText = 'display:inline-flex;line-height:0;flex:0 0 auto;';
                        _ico_btn0.innerHTML = "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg>";
                        var _sv_btn0 = _ico_btn0.querySelector('svg'); if (_sv_btn0) { _sv_btn0.setAttribute('width', '1em'); _sv_btn0.setAttribute('height', '1em'); }
                        var _tx_btn0 = document.createElement('span'); _tx_btn0.textContent = loc("L_SkipRelease", "Freigabe überspringen");
                        btn0.appendChild(_ico_btn0);
                        btn0.appendChild(_tx_btn0);
                        btn0.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        btn0.onclick = function (e) { e.stopPropagation(); pulseSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipRelease%/s%", 400);
                            hideDialog(); };
                        btn0.style.transition = 'transform .08s ease, filter .08s ease';
                        btn0.addEventListener('pointerdown', function () { btn0.style.transform = 'scale(0.96)'; btn0.style.filter = 'brightness(0.88)'; });
                        var rel_btn0 = function () { btn0.style.transform = ''; btn0.style.filter = ''; };
                        btn0.addEventListener('pointerup', rel_btn0);
                        btn0.addEventListener('pointerleave', rel_btn0);
                        row.appendChild(btn0);
                        // setTrue: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xCancel
                        var btn1 = document.createElement('button');
                        btn1.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:#6b7280;color:#ffffff;';
                        btn1.textContent = loc("L_Cancel", "Abbrechen");
                        btn1.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        btn1.onclick = function (e) { e.stopPropagation(); writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xCancel%/s%", true);
                            hideDialog(); };
                        btn1.style.transition = 'transform .08s ease, filter .08s ease';
                        btn1.addEventListener('pointerdown', function () { btn1.style.transform = 'scale(0.96)'; btn1.style.filter = 'brightness(0.88)'; });
                        var rel_btn1 = function () { btn1.style.transform = ''; btn1.style.filter = ''; };
                        btn1.addEventListener('pointerup', rel_btn1);
                        btn1.addEventListener('pointerleave', rel_btn1);
                        row.appendChild(btn1);
                        g1c1.appendChild(row);
                    })();
                    body.appendChild(grid1);

                    // Zeile (nebeneinander)
                    (function () {
                        var rrow = document.createElement('div');
                        rrow.style.cssText = 'display:flex;gap:16px;margin-bottom:16px;align-items:flex-start;';
                        var rc0 = document.createElement('div');
                        rc0.style.cssText = 'flex:1;min-width:0;';
                        rrow.appendChild(rc0);
                    // Wert lesen: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rActual
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:0px;';
                        var lbl = document.createElement('span');
                        lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lbl.textContent = loc("L_Ist", "Ist");
                        var valEl = document.createElement('span');
                        valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
                        valEl.textContent = '…';
                        row.appendChild(lbl); row.appendChild(valEl);
                        rc0.appendChild(row);
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rActual%/s%", function (v) { valEl.textContent = String(v) + ""; });
                    })();
                        var rc1 = document.createElement('div');
                        rc1.style.cssText = 'flex:1;min-width:0;';
                        rrow.appendChild(rc1);
                    // Eingabefeld + Senden: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rSoll
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:0px;';
                        var lbl = document.createElement('div');
                        lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
                        lbl.textContent = loc("L_Soll", "Soll");
                        var line = document.createElement('div');
                        line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
                        var input = document.createElement('input');
                        input.type = 'number';
                        input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;' +
                            'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
                        input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rSoll%/s%", function (v) { if (document.activeElement !== input) input.value = String(v); });
                        function commit() { var val = parseFloat(input.value); if (isNaN(val)) return; writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rSoll%/s%", val); }
                        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });
                        var send = document.createElement('button');
                        send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#3b82f6;color:#ffffff;';
                        send.textContent = "Setzen";
                        send.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        send.style.transition = 'transform .08s ease, filter .08s ease';
                        send.addEventListener('pointerdown', function () { send.style.transform = 'scale(0.96)'; send.style.filter = 'brightness(0.88)'; });
                        var rel_send = function () { send.style.transform = ''; send.style.filter = ''; };
                        send.addEventListener('pointerup', rel_send);
                        send.addEventListener('pointerleave', rel_send);
                        send.onclick = function (e) { e.stopPropagation(); commit(); };
                        line.appendChild(input);
                        line.appendChild(send);
                        wrap.appendChild(lbl); wrap.appendChild(line);
                        rc1.appendChild(wrap);
                    })();
                        body.appendChild(rrow);
                    })();

                    var grid2 = document.createElement('div');
                    grid2.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;align-items:start;';
                    var g2c0 = document.createElement('div');
                    g2c0.style.cssText = 'min-width:0;padding-left:0px;padding-right:24px;';
                    grid2.appendChild(g2c0);
                    // (Spalte 1 leer)
                    var g2c1 = document.createElement('div');
                    g2c1.style.cssText = 'min-width:0;padding-left:24px;padding-right:0px;' + 'border-left:1px solid ' + p.border + ';';
                    grid2.appendChild(g2c1);

                    // Enum-Anzeige (Badge): ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eState
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
                        var lblEl = document.createElement('span');
                        lblEl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lblEl.textContent = loc("L_State", "Zustand") + ':';
                        row.appendChild(lblEl);
                        var badge = document.createElement('span');
                        row.appendChild(badge);
                        g2c1.appendChild(row);
                        function paint(text, bg, fg) {
                            badge.textContent = text;
                            badge.style.cssText = 'display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;background:' + bg + ';color:' + fg + ';';
                        }
                        function apply(v) {
                            if (String(v) === "0") { paint("Aus", "#6b7280", "#ffffff"); return; }
                            if (String(v) === "1") { paint("Ein", "#22c55e", "#06240f"); return; }
                            if (String(v) === "2") { paint("Störung", "#ef4444", "#ffffff"); return; }
                            paint("Unbekannt", "#6b7280", "#ffffff");
                        }
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eState%/s%", function (v) { apply(v); });
                    })();

                    // Enum setzen (Dropdown + Senden): ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eMode
                    (function () {
                        var wrap = document.createElement('div');
                        wrap.style.cssText = 'margin-bottom:16px;';
                        var lbl = document.createElement('div');
                        lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
                        lbl.textContent = loc("L_Mode", "Modus");
                        var sel = document.createElement('select');
                        sel.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;cursor:pointer;' +
                            'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
                        var o0 = document.createElement('option'); o0.value = "0"; o0.textContent = "Hand"; sel.appendChild(o0);
                        var o1 = document.createElement('option'); o1.value = "1"; o1.textContent = "Automatik"; sel.appendChild(o1);
                        sel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        var line = document.createElement('div');
                        line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
                        line.appendChild(sel);
                        var send = document.createElement('button');
                        send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#22c55e;color:#06240f;';
                        send.textContent = "Übernehmen";
                        send.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                        send.style.transition = 'transform .08s ease, filter .08s ease';
                        send.addEventListener('pointerdown', function () { send.style.transform = 'scale(0.96)'; send.style.filter = 'brightness(0.88)'; });
                        var rel_send = function () { send.style.transform = ''; send.style.filter = ''; };
                        send.addEventListener('pointerup', rel_send);
                        send.addEventListener('pointerleave', rel_send);
                        send.onclick = function (e) { e.stopPropagation(); writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eMode%/s%", parseInt(sel.value, 10)); };
                        line.appendChild(send);
                        wrap.appendChild(lbl); wrap.appendChild(line);
                        g2c1.appendChild(wrap);
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eMode%/s%", function (v) { if (document.activeElement !== sel) sel.value = String(v); });
                    })();

                    // Statusanzeige (Badge) aus 2 Bools
                    (function () {
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
                        var lblEl = document.createElement('span');
                        lblEl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
                        lblEl.textContent = loc("L_Status", "Status") + ':';
                        row.appendChild(lblEl);
                        var badge = document.createElement('span');
                        row.appendChild(badge);
                        g2c1.appendChild(row);
                        function paint(text, bg, fg) {
                            badge.textContent = text;
                            badge.style.cssText = 'display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600;background:' + bg + ';color:' + fg + ';';
                        }
                        var states = [false, false];
                        function apply() {
                            if (states[0]) { paint("Läuft", "#22c55e", "#06240f"); return; }
                            if (states[1]) { paint("Störung", "#ef4444", "#ffffff"); return; }
                            paint("Bereit", "#6b7280", "#ffffff");
                        }
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xRunning%/s%", function (v) { states[0] = v; apply(); });
                        subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xFault%/s%", function (v) { states[1] = v; apply(); });
                        apply();
                    })();
                    body.appendChild(grid2);

                    box.appendChild(header);
                    box.appendChild(body);
                    overlay.appendChild(box);
                    document.body.appendChild(overlay);
                    makeDraggable(box, header);
                }

                buildDialog();
            }
            AC_HMI.AC_SkipRelease = AC_SkipRelease;
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx("AC_SkipRelease", 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.AC_SkipRelease);

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"registered","fnName":"AC_SkipRelease","title":"Titel","titleLoc":"","titleSource":"dynamic","titleField":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::sTagName","titleFallback":"P-101","titleIcon":"warning","titleIconColor":"#f59e0b","maxWidth":460,"columns":2,"hostSuffix":".btn_PopUp","blocks":[{"id":"b1","type":"text","col":0,"heading":"Hinweis","headingLoc":"L_HeadHint","text":"Bitte Freigabe prüfen.","loc":"L_TextHint","bgColor":"alarm","icon":"warning","iconColor":"#f59e0b"},{"id":"b2","type":"read","col":0,"label":"Druck","loc":"L_Druck","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPressure","unit":"bar"},{"id":"b3","type":"bool","col":0,"label":"Freigabe angeboten","loc":"L_SkipOffered","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipReleaseOffered"},{"id":"b4","type":"check","col":0,"label":"Freigabe","loc":"L_Enable","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable"},{"id":"b5","type":"input","col":0,"label":"Sollwert","loc":"L_Setpoint","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::nSetpoint","dataType":"number","unit":"bar","sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xApply","trigMode":"pulse","trigMs":300},{"id":"b6","type":"progress","col":0,"label":"Ventilstellung","loc":"L_Valve","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPosition","min":0,"max":100,"unit":"%","decimals":1,"showValue":true,"color":"green"},{"id":"b7","type":"divider","col":0,"label":"Steuerung","loc":"L_DivCtrl","inCol":false},{"id":"b8","type":"button","col":1,"buttons":[{"label":"Freigabe überspringen","loc":"L_SkipRelease","icon":"success","iconPos":"left","showLabel":true,"symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xSkipRelease","writeMode":"pulse","pulseMs":400,"closeAfter":true,"color":"blue","visSym":"","enableIf":[],"fbSym":"","confirmMs":3000,"confirmAction":"pulse"},{"label":"Abbrechen","loc":"L_Cancel","icon":"","iconPos":"left","showLabel":true,"symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xCancel","writeMode":"setTrue","pulseMs":500,"closeAfter":true,"color":"grey","visSym":"","enableIf":[],"fbSym":"","confirmMs":3000,"confirmAction":"pulse"}]},{"id":"b9","type":"row","col":1,"items":[{"id":"b12","kind":"read","label":"Ist","loc":"L_Ist","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rActual"},{"id":"b13","kind":"input","label":"Soll","loc":"L_Soll","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rSoll","dataType":"number","sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"","trigMode":"pulse","trigMs":500}]},{"id":"b14","type":"enum","col":1,"label":"Zustand","loc":"L_State","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eState","numeric":true,"display":"badge","map":[{"id":"e3","value":"0","loc":"","text":"Aus","color":"grey"},{"id":"e4","value":"1","loc":"","text":"Ein","color":"green"},{"id":"e5","value":"2","loc":"","text":"Störung","color":"red"}],"fbLoc":"","fbText":"Unbekannt","fbColor":"grey"},{"id":"b15","type":"enumset","col":1,"label":"Modus","loc":"L_Mode","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::eMode","numeric":true,"map":[{"id":"e8","value":"0","loc":"","text":"Hand","color":"blue"},{"id":"e9","value":"1","loc":"","text":"Automatik","color":"blue"}],"sendButton":true,"sendLabel":"Übernehmen","sendLoc":"","sendColor":"green","trigSym":"","trigMode":"pulse","trigMs":500},{"id":"b16","type":"status","col":1,"label":"Status","loc":"L_Status","display":"badge","map":[{"id":"s12","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xRunning","loc":"","text":"Läuft","color":"green"},{"id":"s13","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xFault","loc":"","text":"Störung","color":"red"}],"fbLoc":"","fbText":"Bereit","fbColor":"grey"}]}
