// Auto-generiert vom AC_PopUp Generator – reines Event-JavaScript (ohne Registrierung)
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

(function () {
    var uid = "AC_ButtonConfirmDone";
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

        // Baustein nur sichtbar, wenn Symbol ADS.AF_PLC.Globale_Variablen.bManual = TRUE
        (function () {
            var visW = document.createElement('div');
            visW.style.cssText = 'min-width:0;display:none;';
        // Text
        (function () {
            var elT = document.createElement('div');
            elT.style.cssText = 'margin-bottom:16px;';
            var cntT = elT;
            var bdyT = document.createElement('div');
            bdyT.style.cssText = 'font-size:14px;color:' + p.bodyText + ';line-height:1.5;white-space:pre-wrap;';
            var _tT = "Hinweis";
            bdyT.textContent = (typeof _tT === 'string' ? _tT : String(_tT)).split(String.fromCharCode(92) + 'n').join(String.fromCharCode(10));
            cntT.appendChild(bdyT);
            visW.appendChild(elT);
        })();
            body.appendChild(visW);
            subscribe("%s%ADS.AF_PLC.Globale_Variablen.bManual%/s%", function (vis) { visW.style.display = vis ? '' : 'none'; });
        })();

        // Buttons
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:10px;margin-bottom:16px;';
            // holdConfirm: AC_HMI.AC_ValveResetAll
            var btn0 = document.createElement('button');
            btn0.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:#f59e0b;color:#1a1a1a;';
            btn0.textContent = "Alle Ventile Auto";
            btn0.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            btn0.style.position = 'relative';
            btn0.style.overflow = 'hidden';
            var fill_btn0 = document.createElement('div');
            fill_btn0.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0%;background:#22c55e;pointer-events:none;';
            var lab_btn0 = document.createElement('span');
            lab_btn0.style.cssText = 'position:relative;z-index:1;pointer-events:none;';
            while (btn0.firstChild) { lab_btn0.appendChild(btn0.firstChild); }
            btn0.appendChild(lab_btn0);
            btn0.appendChild(fill_btn0);
            var timer_btn0 = null;
            function cancel_btn0() {
                if (timer_btn0) { clearTimeout(timer_btn0); timer_btn0 = null; }
                fill_btn0.style.transition = 'none';
                fill_btn0.style.width = '0%';
            }
            btn0.addEventListener('pointerdown', function () {
                if (btn0.disabled) return;
                cancel_btn0();
                void fill_btn0.offsetWidth;
                requestAnimationFrame(function () {
                    fill_btn0.style.transition = 'width 3000ms linear';
                    fill_btn0.style.width = '100%';
                });
                timer_btn0 = setTimeout(function () {
                    timer_btn0 = null;
                    if (btn0.disabled) return;
                    (function () { try { var f = TcHmi.Functions.AC_HMI && TcHmi.Functions.AC_HMI["AC_ValveResetAll"]; if (typeof f === 'function') { f(); } else if (window.console) { console.warn('AC_PopUp: Funktion nicht gefunden: AC_HMI.' + "AC_ValveResetAll"); } } catch (err) { if (window.console) console.warn(err); } })();
                    fill_btn0.style.transition = 'none';
                    fill_btn0.style.width = '0%';
                }, 3000);
            });
            btn0.addEventListener('pointerup', cancel_btn0);
            btn0.addEventListener('pointerleave', cancel_btn0);
            btn0.style.transition = 'transform .08s ease, filter .08s ease';
            btn0.addEventListener('pointerdown', function () { btn0.style.transform = 'scale(0.96)'; btn0.style.filter = 'brightness(0.88)'; });
            var rel_btn0 = function () { btn0.style.transform = ''; btn0.style.filter = ''; };
            btn0.addEventListener('pointerup', rel_btn0);
            btn0.addEventListener('pointerleave', rel_btn0);
            btn0.style.position = 'relative';
            var done_btn0 = document.createElement('span');
            done_btn0.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);display:none;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#ffffff;pointer-events:none;z-index:2;';
            done_btn0.innerHTML = "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='#16a34a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'/></svg>";
            btn0.appendChild(done_btn0);
            subscribe("%s%ADS.AF_PLC.Globale_Variablen.bManual%/s%", function (x) { done_btn0.style.display = ((!!x) === false) ? 'inline-flex' : 'none'; });
            row.appendChild(btn0);
            body.appendChild(row);
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
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"event","fnName":"AC_ButtonConfirmDone","title":"Titel","titleLoc":"","titleSource":"static","titleField":"TagName","titleFallback":"Titel","titleIcon":"","titleIconColor":"","maxWidth":400,"columns":1,"hostSuffix":".btn_PopUp","blocks":[{"id":"b127","type":"text","col":0,"heading":"","headingLoc":"","text":"Hinweis","loc":"","bgColor":"","icon":"","iconColor":"","visSym":"ADS.AF_PLC.Globale_Variablen.bManual"},{"id":"b128","type":"button","col":0,"buttons":[{"label":"Alle Ventile Auto","loc":"","icon":"","iconPos":"left","showLabel":true,"symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xConfirm","writeMode":"holdConfirm","pulseMs":500,"closeAfter":false,"color":"yellow","visSym":"","enableIf":[],"fbSym":"","confirmMs":3000,"confirmAction":"fn","fnName":"AC_ValveResetAll","confirmFill":"green","doneSym":"ADS.AF_PLC.Globale_Variablen.bManual","doneVal":"false"}]}]}
