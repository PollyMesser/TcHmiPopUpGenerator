// Auto-generiert vom AC_PopUp Generator – reines Event-JavaScript (ohne Registrierung)
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

(function () {
    var uid = "AC_EventPopup";
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
            'min-width:320px;width:380px;max-width:calc(100vw - 32px);max-height:calc(100vh - 48px);' +
            'display:flex;flex-direction:column;overflow:hidden;box-shadow:' + p.shadow + ';pointer-events:auto;';

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
            'padding:14px 20px;background:' + p.headerBg + ';border-radius:12px 12px 0 0;' +
            'flex:0 0 auto;font-size:15px;font-weight:600;color:' + p.titleColor + ';';

        var titleText = document.createElement('span');
        titleText.textContent = loc("L_MaintTitle", "Wartungshinweis");
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

        // Text
        (function () {
            var elT = document.createElement('div');
            elT.style.cssText = 'margin-bottom:16px;';
            var cntT = elT;
            var bdyT = document.createElement('div');
            bdyT.style.cssText = 'font-size:14px;color:' + p.bodyText + ';line-height:1.5;white-space:pre-wrap;';
            var _tT = "Wartung nur durch geschultes Personal.";
            bdyT.textContent = (typeof _tT === 'string' ? _tT : String(_tT)).split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10));
            cntT.appendChild(bdyT);
            body.appendChild(elT);
        })();

        // Wert lesen: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rTemp
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:16px;';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = "Temperatur";
            var valEl = document.createElement('span');
            valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
            valEl.textContent = '…';
            row.appendChild(lbl); row.appendChild(valEl);
            body.appendChild(row);
            subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rTemp%/s%", function (v) { valEl.textContent = String(v) + " °C"; });
        })();

        // Eingabefeld + Senden: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::tDauer
        (function () {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:16px;';
            var lbl = document.createElement('div');
            lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
            lbl.textContent = "Timer";
            var line = document.createElement('div');
            line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
            var input = document.createElement('input');
            input.type = 'text';
            input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;' +
                'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
            input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            input.style.textAlign = 'center';
            input.placeholder = 'HH:MM:SS';
            subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::tDauer%/s%", function (v) { if (document.activeElement !== input) input.value = durToHMS(v); });
            function durToHMS(iso) {
                iso = String(iso == null ? '' : iso).trim().toUpperCase();
                if (iso.charAt(0) !== 'P') return iso;
                var days = 0, hh = 0, mm = 0, ss = 0, ms = 0, num = '', inTime = false;
                for (var k = 1; k < iso.length; k++) {
                    var ch = iso.charAt(k);
                    if (ch === 'T') { inTime = true; num = ''; continue; }
                    if (ch === '.' || ch === ',') { num += '.'; continue; }
                    if (ch >= '0' && ch <= '9') { num += ch; continue; }
                    var val = parseFloat(num || '0'); num = '';
                    if (ch === 'D') days = val;
                    else if (ch === 'H') hh = val;
                    else if (ch === 'M') { if (inTime) mm = val; }
                    else if (ch === 'S') { ss = Math.floor(val); ms = Math.round((val - ss) * 1000); }
                }
                var totalH = days * 24 + hh;
                function p2(n) { n = Math.floor(n); return (n < 10 ? '0' : '') + n; }
                var out = p2(totalH) + ':' + p2(mm) + ':' + p2(ss);
                if (ms > 0) { var mstr = String(ms); while (mstr.length < 3) mstr = '0' + mstr; out += '.' + mstr; }
                return out;
            }
            function hmsToDur(str) {
                str = String(str == null ? '' : str).trim();
                if (str === '') return 'PT0S';
                if (str.charAt(0) === 'P' || str.charAt(0) === 'p') return str.toUpperCase();
                var ms = 0, dot = str.indexOf('.');
                if (dot >= 0) { var frac = (str.slice(dot + 1) + '000').slice(0, 3); ms = parseInt(frac, 10) || 0; str = str.slice(0, dot); }
                var parts = str.split(':'), h = 0, m = 0, s = 0;
                if (parts.length === 3) { h = parseInt(parts[0], 10) || 0; m = parseInt(parts[1], 10) || 0; s = parseInt(parts[2], 10) || 0; }
                else if (parts.length === 2) { m = parseInt(parts[0], 10) || 0; s = parseInt(parts[1], 10) || 0; }
                else { s = parseInt(parts[0], 10) || 0; }
                var total = h * 3600 + m * 60 + s;
                var oh = Math.floor(total / 3600), om = Math.floor((total % 3600) / 60), os = total % 60;
                var sStr = (ms > 0) ? (os + '.' + ('00' + ms).slice(-3)) : String(os);
                return 'PT' + oh + 'H' + om + 'M' + sStr + 'S';
            }
            function commit() { var val = hmsToDur(input.value); writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::tDauer%/s%", val); }
            input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });
            var send = document.createElement('button');
            send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#f59e0b;color:#1a1a1a;';
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
            body.appendChild(wrap);
        })();

        // Eingabefeld + Senden: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::sText
        (function () {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:16px;';
            var lbl = document.createElement('div');
            lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
            lbl.textContent = "Text-Eingabe";
            var line = document.createElement('div');
            line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
            var input = document.createElement('input');
            input.type = 'text';
            input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;' +
                'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
            input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::sText%/s%", function (v) { if (document.activeElement !== input) input.value = String(v); });
            function commit() { var val = input.value; writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::sText%/s%", val); }
            input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });
            line.appendChild(input);
            wrap.appendChild(lbl); wrap.appendChild(line);
            body.appendChild(wrap);
        })();

        // Buttons
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:10px;margin-bottom:16px;';
            // hold: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xHold
            var btn0 = document.createElement('button');
            btn0.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:#f59e0b;color:#1a1a1a;';
            btn0.textContent = "Halten";
            btn0.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            btn0.addEventListener('pointerdown', function () { if (btn0.disabled) return; writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xHold%/s%", true); });
            var release_btn0 = function () { if (btn0.disabled) return; writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xHold%/s%", false);
                hideDialog(); };
            btn0.addEventListener('pointerup', release_btn0);
            btn0.addEventListener('pointerleave', release_btn0);
            subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xHoldConfirmed%/s%", function (fbv) { btn0.style.boxShadow = fbv ? '0 0 0 3px #22c55e' : 'none'; });
            btn0.style.transition = 'transform .08s ease, filter .08s ease';
            btn0.addEventListener('pointerdown', function () { btn0.style.transform = 'scale(0.96)'; btn0.style.filter = 'brightness(0.88)'; });
            var rel_btn0 = function () { btn0.style.transform = ''; btn0.style.filter = ''; };
            btn0.addEventListener('pointerup', rel_btn0);
            btn0.addEventListener('pointerleave', rel_btn0);
            row.appendChild(btn0);
            // holdConfirm: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xConfirm
            var btn1 = document.createElement('button');
            btn1.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:#ef4444;color:#ffffff;';
            btn1.style.display = 'inline-flex';
            btn1.style.alignItems = 'center';
            btn1.style.justifyContent = 'center';
            var _ico_btn1 = document.createElement('span');
            _ico_btn1.style.cssText = 'display:inline-flex;line-height:0;flex:0 0 auto;';
            _ico_btn1.innerHTML = "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>";
            var _sv_btn1 = _ico_btn1.querySelector('svg'); if (_sv_btn1) { _sv_btn1.setAttribute('width', '1em'); _sv_btn1.setAttribute('height', '1em'); }
            btn1.setAttribute('aria-label', String("Bestätigen (halten)"));
            btn1.appendChild(_ico_btn1);
            btn1.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            btn1.style.position = 'relative';
            btn1.style.overflow = 'hidden';
            var fill_btn1 = document.createElement('div');
            fill_btn1.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0%;background:rgba(255,255,255,0.35);pointer-events:none;';
            btn1.appendChild(fill_btn1);
            var timer_btn1 = null;
            function cancel_btn1() {
                if (timer_btn1) { clearTimeout(timer_btn1); timer_btn1 = null; }
                fill_btn1.style.transition = 'none';
                fill_btn1.style.width = '0%';
            }
            btn1.addEventListener('pointerdown', function () {
                if (btn1.disabled) return;
                cancel_btn1();
                void fill_btn1.offsetWidth;
                requestAnimationFrame(function () {
                    fill_btn1.style.transition = 'width 2000ms linear';
                    fill_btn1.style.width = '100%';
                });
                timer_btn1 = setTimeout(function () {
                    timer_btn1 = null;
                    if (btn1.disabled) return;
                    writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xConfirm%/s%", true);
                hideDialog();
                    fill_btn1.style.transition = 'none';
                    fill_btn1.style.width = '0%';
                }, 2000);
            });
            btn1.addEventListener('pointerup', cancel_btn1);
            btn1.addEventListener('pointerleave', cancel_btn1);
            btn1.style.transition = 'transform .08s ease, filter .08s ease';
            btn1.addEventListener('pointerdown', function () { btn1.style.transform = 'scale(0.96)'; btn1.style.filter = 'brightness(0.88)'; });
            var rel_btn1 = function () { btn1.style.transform = ''; btn1.style.filter = ''; };
            btn1.addEventListener('pointerup', rel_btn1);
            btn1.addEventListener('pointerleave', rel_btn1);
            row.appendChild(btn1);
            body.appendChild(row);
        })();

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
        // Boolean-Anzeige: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xActive
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:0px;';
            var dot = document.createElement('span');
            dot.style.cssText = 'width:18px;height:18px;border-radius:50%;flex:0 0 auto;background:' + p.inactive + ';transition:background .15s;';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = "Aktiv";
            row.appendChild(dot); row.appendChild(lbl);
            rc0.appendChild(row);
            subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xActive%/s%", function (v) { dot.style.background = v ? p.active : p.inactive; });
        })();
            var rc1 = document.createElement('div');
            rc1.style.cssText = 'flex:1;min-width:0;';
            rrow.appendChild(rc1);
        // Boolean setzen (Checkbox): ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xAck
        (function () {
            var wrap = document.createElement('label');
            wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:0px;cursor:pointer;';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.style.cssText = 'width:20px;height:20px;flex:0 0 auto;cursor:pointer;accent-color:' + p.active + ';';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = "Quittieren";
            wrap.appendChild(cb); wrap.appendChild(lbl);
            rc1.appendChild(wrap);
            cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xAck%/s%", function (v) { if (document.activeElement !== cb) cb.checked = !!v; });
            cb.addEventListener('change', function () { writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xAck%/s%", cb.checked); });
        })();
            var rc2 = document.createElement('div');
            rc2.style.cssText = 'flex:1;min-width:0;';
            rrow.appendChild(rc2);
        // Button (Zeilen-Element): toggle: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xReset
        (function () {
            var btn = document.createElement('button');
            btn.style.cssText = 'width:100%;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:#6b7280;color:#ffffff;';
            btn.textContent = "Reset";
            btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            btn.onclick = function (e) { e.stopPropagation(); toggleSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xReset%/s%");
                hideDialog(); };
            btn.style.transition = 'transform .08s ease, filter .08s ease';
            btn.addEventListener('pointerdown', function () { btn.style.transform = 'scale(0.96)'; btn.style.filter = 'brightness(0.88)'; });
            var rel_btn = function () { btn.style.transform = ''; btn.style.filter = ''; };
            btn.addEventListener('pointerup', rel_btn);
            btn.addEventListener('pointerleave', rel_btn);
            rc2.appendChild(btn);
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
})();

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"event","fnName":"AC_EventPopup","title":"Wartungshinweis","titleLoc":"L_MaintTitle","titleSource":"static","titleField":"TagName","titleFallback":"Titel","titleIcon":"","titleIconColor":"","maxWidth":380,"columns":1,"hostSuffix":".btn_PopUp","blocks":[{"id":"b17","type":"text","col":0,"heading":"","headingLoc":"","text":"Wartung nur durch geschultes Personal.","loc":"","bgColor":"","icon":"","iconColor":""},{"id":"b18","type":"read","col":0,"label":"Temperatur","loc":"","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rTemp","unit":"°C"},{"id":"b19","type":"input","col":0,"label":"Timer","loc":"","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::tDauer","dataType":"time","unit":"","sendLabel":"Setzen","sendLoc":"","sendColor":"yellow","trigSym":"","trigMode":"pulse","trigMs":500,"sendButton":true},{"id":"b20","type":"input","col":0,"label":"Text-Eingabe","loc":"","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::sText","dataType":"text","unit":"","sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"","trigMode":"pulse","trigMs":500,"sendButton":false},{"id":"b21","type":"button","col":0,"buttons":[{"label":"Halten","loc":"","icon":"","iconPos":"left","showLabel":true,"symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xHold","writeMode":"hold","pulseMs":500,"closeAfter":true,"color":"yellow","visSym":"","enableIf":[],"fbSym":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xHoldConfirmed","confirmMs":3000,"confirmAction":"pulse"},{"label":"Bestätigen (halten)","loc":"","icon":"alert","iconPos":"right","showLabel":false,"symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xConfirm","writeMode":"holdConfirm","pulseMs":500,"closeAfter":true,"color":"red","visSym":"","enableIf":[],"fbSym":"","confirmMs":2000,"confirmAction":"setTrue"}]},{"id":"b22","type":"divider","col":0,"label":"","loc":"","inCol":false},{"id":"b23","type":"row","col":0,"items":[{"id":"b26","kind":"bool","label":"Aktiv","loc":"","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xActive"},{"id":"b27","kind":"check","label":"Quittieren","loc":"","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xAck"},{"id":"b28","kind":"button","label":"Reset","loc":"","icon":"","iconPos":"left","showLabel":true,"symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xReset","writeMode":"toggle","pulseMs":500,"closeAfter":true,"color":"grey","visSym":"","enableIf":[],"fbSym":"","confirmMs":3000,"confirmAction":"pulse"}]}]}
