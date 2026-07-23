// Auto-generiert vom AC_PopUp Generator – UserControl-gebundenes Event-JavaScript
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

(function (ev) {
    // ── Host-Control über die geklickte Trigger-Fläche ermitteln ──
    var host = null;
    var clicked = (ev && ev.target && ev.target.closest) ? ev.target.closest('[id$=".btn_Detail"]') : null;
    if (clicked) {
        var hostId = clicked.id.split(".btn_Detail")[0];
        host = TcHmi.Controls.get(hostId);
    }

    var uid = "AC_UcPopup" + '_' + (host ? String(host.getId()).replace(/[^A-Za-z0-9_]/g, '_') : 'popup');
    var updaters = [];   // Werte-Aktualisierer (Polling)
    var intervalId = null;
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

    // ── Attribut-Helfer (getX/setX am Host-Control) ──
    function gv(name, def) {
        if (host && typeof host['get' + name] === 'function') {
            var v = host['get' + name]();
            return (v === null || v === undefined) ? def : v;
        }
        return def;
    }
    function sv(name, val) {
        if (host && typeof host['set' + name] === 'function') { host['set' + name](val); }
    }
    function pulse(name, ms) {
        sv(name, true);
        setTimeout(function () { sv(name, false); }, ms || 500);
    }
    function refresh() {
        for (var i = 0; i < updaters.length; i++) { try { updaters[i](); } catch (e) {} }
    }

    function hideDialog() {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
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
            'min-width:320px;width:420px;max-width:calc(100vw - 32px);max-height:calc(100vh - 48px);' +
            'display:flex;flex-direction:column;overflow:hidden;box-shadow:' + p.shadow + ';pointer-events:auto;';

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
            'padding:14px 20px;background:' + p.headerBg + ';border-radius:12px 12px 0 0;' +
            'flex:0 0 auto;font-size:15px;font-weight:600;color:' + p.titleColor + ';';

        var titleText = document.createElement('span');
        titleText.textContent = gv("TagName", "P-XXX");
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

        // Wert lesen (Attribut): Value
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:16px;';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = "Wert";
            var valEl = document.createElement('span');
            valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
            valEl.textContent = '…';
            row.appendChild(lbl); row.appendChild(valEl);
            body.appendChild(row);
            updaters.push(function () { valEl.textContent = String(gv("Value", '')) + "%"; });
        })();

        // Boolean-Anzeige (Attribut): Enabled
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;';
            var dot = document.createElement('span');
            dot.style.cssText = 'width:14px;height:14px;border-radius:50%;flex:0 0 auto;background:' + p.inactive + ';transition:background .15s;';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = "Freigegeben";
            row.appendChild(dot); row.appendChild(lbl);
            body.appendChild(row);
            updaters.push(function () { dot.style.background = gv("Enabled", false) ? p.active : p.inactive; });
        })();

        // Boolean setzen (Attribut, Checkbox): Active
        (function () {
            var wrap = document.createElement('label');
            wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer;';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.style.cssText = 'width:16px;height:16px;flex:0 0 auto;cursor:pointer;accent-color:' + p.active + ';';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = "Aktiv setzen";
            wrap.appendChild(cb); wrap.appendChild(lbl);
            body.appendChild(wrap);
            cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            cb.addEventListener('change', function () { sv("Active", cb.checked); });
            updaters.push(function () { if (document.activeElement !== cb) cb.checked = !!gv("Active", false); });
        })();

        // Eingabefeld + Senden (Attribut): Setpoint
        (function () {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:16px;';
            var lbl = document.createElement('div');
            lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
            lbl.textContent = "Sollwert";
            var line = document.createElement('div');
            line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';
            var input = document.createElement('input');
            input.type = 'number';
            input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;' +
                'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
            input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            function commit() { var val = parseFloat(input.value); if (isNaN(val)) return; sv("Setpoint", val); }
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
            send.onclick = function (e) { e.stopPropagation(); commit(); sv("Apply", !gv("Apply", false)); };
            line.appendChild(input);
            line.appendChild(unitEl);
            line.appendChild(send);
            wrap.appendChild(lbl); wrap.appendChild(line);
            body.appendChild(wrap);
            updaters.push(function () { if (input.value === '' && document.activeElement !== input) input.value = String(gv("Setpoint", '')); });
        })();

        // Ladebalken (Attribut): FillLevel
        (function () {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:16px;';
            var head = document.createElement('div');
            head.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px;';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = "Füllstand";
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
            body.appendChild(wrap);
            var MIN = 0, MAX = 100;
            updaters.push(function () {
                var num = Number(gv("FillLevel", NaN)); if (isNaN(num)) return;
                var span = (MAX - MIN) || 1;
                var pct = (num - MIN) / span * 100;
                if (pct < 0) pct = 0; if (pct > 100) pct = 100;
                fill.style.width = pct.toFixed(1) + '%';
                valEl.textContent = num.toFixed(0) + "%";
            });
        })();

        // Buttons (Attribut)
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:10px;margin-bottom:16px;';
            // pulse: Confirm
            var btn0 = document.createElement('button');
            btn0.style.cssText = 'flex:1;padding:12px 0;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;background:#22c55e;color:#06240f;';
            btn0.textContent = "Übernehmen";
            btn0.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            btn0.onclick = function (e) { e.stopPropagation(); pulse("Confirm", 250);
                hideDialog(); };
            btn0.style.transition = 'transform .08s ease, filter .08s ease';
            btn0.addEventListener('pointerdown', function () { btn0.style.transform = 'scale(0.96)'; btn0.style.filter = 'brightness(0.88)'; });
            var rel_btn0 = function () { btn0.style.transform = ''; btn0.style.filter = ''; };
            btn0.addEventListener('pointerup', rel_btn0);
            btn0.addEventListener('pointerleave', rel_btn0);
            (function () {
                function upd() {
                    var enabled = (gv("Mode", null) == 1) && (gv("Fault", null) != true);
                    btn0.disabled = !enabled;
                    btn0.style.opacity = enabled ? '1' : '0.45';
                    btn0.style.cursor = enabled ? 'pointer' : 'not-allowed';
                }
                updaters.push(upd);
                upd();
            })();
            row.appendChild(btn0);
            body.appendChild(row);
        })();

        // Enum-Anzeige (Text, Attribut): State
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
            var lblEl = document.createElement('span');
            lblEl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lblEl.textContent = "Status" + ':';
            row.appendChild(lblEl);
            var badge = document.createElement('span');
            row.appendChild(badge);
            body.appendChild(row);
            function paint(text, bg, fg) {
                badge.textContent = text;
                badge.style.cssText = 'font-size:14px;font-weight:600;color:' + bg + ';';
            }
            function apply(v) {
                if (String(v) === "idle") { paint("Bereit", "#6b7280", "#ffffff"); return; }
                if (String(v) === "run") { paint("Läuft", "#22c55e", "#06240f"); return; }
                paint(String(v), "#6b7280", "#ffffff");
            }
            updaters.push(function () { apply(gv("State", null)); });
        })();

        // Enum setzen (Attribut, Dropdown): Mode
        (function () {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:16px;';
            var lbl = document.createElement('div');
            lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
            lbl.textContent = "Betriebsart";
            var sel = document.createElement('select');
            sel.style.cssText = 'width:100%;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;cursor:pointer;' +
                'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';
            var o0 = document.createElement('option'); o0.value = "0"; o0.textContent = "Hand"; sel.appendChild(o0);
            var o1 = document.createElement('option'); o1.value = "1"; o1.textContent = "Automatik"; sel.appendChild(o1);
            var o2 = document.createElement('option'); o2.value = "2"; o2.textContent = "Service"; sel.appendChild(o2);
            sel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            sel.addEventListener('change', function () { sv("Mode", parseInt(sel.value, 10)); });
            wrap.appendChild(lbl); wrap.appendChild(sel);
            body.appendChild(wrap);
            updaters.push(function () { if (document.activeElement !== sel) sel.value = String(gv("Mode", '')); });
        })();

        // Statusanzeige (Text) aus 2 Attribut-Bools
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
            var lblEl = document.createElement('span');
            lblEl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lblEl.textContent = "Sammelstatus" + ':';
            row.appendChild(lblEl);
            var badge = document.createElement('span');
            row.appendChild(badge);
            body.appendChild(row);
            function paint(text, bg, fg) {
                badge.textContent = text;
                badge.style.cssText = 'font-size:14px;font-weight:600;color:' + bg + ';';
            }
            function apply() {
                if (gv("Running", false)) { paint("Läuft", "#22c55e", "#06240f"); return; }
                if (gv("Fault", false)) { paint("Störung", "#ef4444", "#ffffff"); return; }
                paint("Aus", "#6b7280", "#ffffff");
            }
            updaters.push(apply);
            apply();
        })();

        // Trennlinie mit Beschriftung
        (function () {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;align-items:center;gap:12px;margin:6px 0 18px;';
            var l1 = document.createElement('div'); l1.style.cssText = 'flex:1;height:1px;background:' + p.border + ';';
            var cap = document.createElement('span'); cap.style.cssText = 'flex:0 0 auto;font-size:12px;font-weight:600;letter-spacing:0.3px;color:' + p.closeColor + ';';
            cap.textContent = "Ende";
            var l2 = document.createElement('div'); l2.style.cssText = 'flex:1;height:1px;background:' + p.border + ';';
            wrap.appendChild(l1); wrap.appendChild(cap); wrap.appendChild(l2);
            body.appendChild(wrap);
        })();

        box.appendChild(header);
        box.appendChild(body);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        makeDraggable(box, header);

        refresh();
        intervalId = setInterval(function () {
            if (!document.getElementById(uid)) { clearInterval(intervalId); intervalId = null; return; }
            refresh();
        }, 1000);
    }

    buildDialog();
})(typeof event !== 'undefined' ? event : (typeof window !== 'undefined' ? window.event : null));

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"usercontrol","fnName":"AC_UcPopup","title":"Detailansicht","titleLoc":"","titleSource":"dynamic","titleField":"TagName","titleFallback":"P-XXX","titleIcon":"","titleIconColor":"","maxWidth":420,"columns":1,"hostSuffix":".btn_Detail","blocks":[{"id":"b29","type":"read","col":0,"label":"Wert","loc":"","symbol":"Value","unit":"%"},{"id":"b30","type":"bool","col":0,"label":"Freigegeben","loc":"","symbol":"Enabled"},{"id":"b31","type":"check","col":0,"label":"Aktiv setzen","loc":"","symbol":"Active"},{"id":"b32","type":"input","col":0,"label":"Sollwert","loc":"","symbol":"Setpoint","dataType":"number","unit":"bar","sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"Apply","trigMode":"toggle","trigMs":500},{"id":"b33","type":"progress","col":0,"label":"Füllstand","loc":"","symbol":"FillLevel","min":0,"max":100,"unit":"%","decimals":0,"showValue":true,"color":"blue"},{"id":"b34","type":"button","col":0,"buttons":[{"label":"Übernehmen","loc":"","icon":"","iconPos":"left","showLabel":true,"symbol":"Confirm","writeMode":"pulse","pulseMs":250,"closeAfter":true,"color":"green","visSym":"","enableIf":[{"id":"c14","symbol":"Mode","op":"==","value":"1"},{"id":"c15","symbol":"Fault","op":"!=","value":"true"}],"fbSym":"","confirmMs":3000,"confirmAction":"pulse"}]},{"id":"b35","type":"enum","col":0,"label":"Status","loc":"","symbol":"State","numeric":false,"display":"text","map":[{"id":"e18","value":"idle","loc":"","text":"Bereit","color":"grey"},{"id":"e19","value":"run","loc":"","text":"Läuft","color":"green"}],"fbLoc":"","fbText":"","fbColor":"grey"},{"id":"b36","type":"enumset","col":0,"label":"Betriebsart","loc":"","symbol":"Mode","numeric":true,"map":[{"id":"e22","value":"0","loc":"","text":"Hand","color":"blue"},{"id":"e23","value":"1","loc":"","text":"Automatik","color":"blue"},{"id":"e24","value":"2","loc":"","text":"Service","color":"blue"}],"sendButton":false,"sendLabel":"Setzen","sendLoc":"","sendColor":"blue","trigSym":"","trigMode":"pulse","trigMs":500},{"id":"b37","type":"status","col":0,"label":"Sammelstatus","loc":"","display":"text","map":[{"id":"s27","symbol":"Running","loc":"","text":"Läuft","color":"green"},{"id":"s28","symbol":"Fault","loc":"","text":"Störung","color":"red"}],"fbLoc":"","fbText":"Aus","fbColor":"grey"},{"id":"b38","type":"divider","col":0,"label":"Ende","loc":"","inCol":false}]}
