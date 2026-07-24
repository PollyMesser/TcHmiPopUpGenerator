// Auto-generiert vom AC_PopUp Generator – eingebettet, UserControl-gebunden
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

/*
 * Als JavaScript-Action im onAttached des UserControls einfügen.
 * Container-ID (= Name des UserControls): MyUserControl
 * Host wird per TcHmi.Controls.get(id) aufgelöst; gelesen/geschrieben über getX/setX.
 */
(function (target) {
    var host = null, container = null;
    try { host = TcHmi.Controls.get(target); } catch (e) {}
    if (host && typeof host.getElement === 'function') { try { var _hel = host.getElement(); if (_hel && _hel[0]) container = _hel[0]; } catch (e) {} }
    if (!container && typeof target === 'string') container = document.getElementById(target);
    if (!container) { if (window.console) console.warn('AC_PopUp Embed (UserControl): Host/Container nicht gefunden:', target); return; }
    if (container.__acEmbedDestroy) { try { container.__acEmbedDestroy(); } catch (e) {} }

    var updaters = [];   // Werte-Aktualisierer (Polling)
    var intervalId = null;
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

    var p = getPalette();

    // Signalisiert eingebetteten Bausteinen (z.B. Tabelle) den Embed-Modus.
    var AC_EMBED = true;

    var csEmbed = window.getComputedStyle(container);
    if (csEmbed.position === 'static') container.style.position = 'relative';

    var body = document.createElement('div');
    body.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;box-sizing:border-box;overflow:auto;padding:12px;color:' + p.bodyText + ';';

        // Wert lesen (Attribut): Mode
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:16px;';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = loc("L_Mode", "Ist-Modus");
            var valEl = document.createElement('span');
            valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
            valEl.textContent = '…';
            row.appendChild(lbl); row.appendChild(valEl);
            body.appendChild(row);
            updaters.push(function () { valEl.textContent = String(gv("Mode", '')) + ""; });
        })();

        // Enum setzen (Attribut, Dropdown + Senden): Mode
        (function () {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:16px;';
            var lbl = document.createElement('div');
            lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';
            lbl.textContent = loc("L_ModeSet", "Modus");
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
            send.style.cssText = 'flex:0 0 auto;padding:0 16px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:#3b82f6;color:#ffffff;';
            send.textContent = "Übernehmen";
            send.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            send.style.transition = 'transform .08s ease, filter .08s ease';
            send.addEventListener('pointerdown', function () { send.style.transform = 'scale(0.96)'; send.style.filter = 'brightness(0.88)'; });
            var rel_send = function () { send.style.transform = ''; send.style.filter = ''; };
            send.addEventListener('pointerup', rel_send);
            send.addEventListener('pointerleave', rel_send);
            send.onclick = function (e) { e.stopPropagation(); sv("CmdMode", parseInt(sel.value, 10)); pulse("CmdSetMode", 300); };
            line.appendChild(send);
            wrap.appendChild(lbl); wrap.appendChild(line);
            body.appendChild(wrap);
            updaters.push(function () { if (document.activeElement !== sel) sel.value = String(gv("Mode", '')); });
        })();

    container.appendChild(body);

    refresh();
    intervalId = setInterval(function () {
        if (!body || !body.parentNode) { if (intervalId) { clearInterval(intervalId); intervalId = null; } return; }
        refresh();
    }, 1000);

    // Teardown auf dem Container hinterlegen (idempotenter Neuaufbau)
    container.__acEmbedDestroy = function () {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        for (var t = 0; t < teardowns.length; t++) { try { teardowns[t](); } catch (e) {} }
        teardowns = [];
        if (body && body.parentNode) body.parentNode.removeChild(body);
        body = null;
        try { delete container.__acEmbedDestroy; } catch (e) { container.__acEmbedDestroy = null; }
    };
})("MyUserControl");

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"embedUc","fnName":"AC_EmbedUc","title":"Titel","titleLoc":"","titleSource":"static","titleField":"TagName","titleFallback":"Titel","titleIcon":"","titleIconColor":"","maxWidth":400,"columns":1,"hostSuffix":".btn_PopUp","blocks":[{"id":"b101","type":"read","col":0,"label":"Ist-Modus","loc":"L_Mode","symbol":"Mode","unit":""},{"id":"b102","type":"enumset","col":0,"label":"Modus","loc":"L_ModeSet","symbol":"Mode","numeric":true,"map":[{"id":"e128","value":"0","loc":"","text":"Hand","color":"blue"},{"id":"e129","value":"1","loc":"","text":"Automatik","color":"blue"}],"sendButton":true,"sendLabel":"Übernehmen","sendLoc":"","sendColor":"blue","trigSym":"CmdSetMode","trigMode":"pulse","trigMs":300,"writeSym":"CmdMode"}],"embedTarget":"MyUserControl"}
