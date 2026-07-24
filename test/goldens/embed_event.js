// Auto-generiert vom AC_PopUp Generator – eingebettet, Event-JavaScript (ohne Registrierung)
/// <reference path="./../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.3.500/runtimes/native1.12-tchmi/TcHmi.d.ts" />

/*
 * Als JavaScript-Action in ein Event einfügen (z. B. View onAttached).
 * Zielcontainer wird unten fest übergeben: MeinContainer
 * = Name eines Container-Controls (empfohlen) oder id eines rohen divs mit echter Größe.
 * Aufräumen (optional, z. B. onDetached): resolveTarget(ziel).__acEmbedDestroy && …()
 */
(function (target) {
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

    // body fuellt das Elternelement (inset:0): bei einem Container mit
    // definierter Groesse (TcHmiContainer hat i.d.R. feste Geometrie)
    // orientiert sich Breite UND Hoehe am Parent, viel Inhalt scrollt im
    // body selbst. Absolut positioniert (nicht fliessend), damit es im
    // absolut aufgebauten TcHmiContainer nicht nach unten rutscht.
    var body = document.createElement('div');
    body.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;box-sizing:border-box;overflow:auto;padding:12px;color:' + p.bodyText + ';';

        // Wert lesen: ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPressure
        (function () {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:16px;';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = loc("L_P", "Druck");
            var valEl = document.createElement('span');
            valEl.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';text-align:right;font-variant-numeric:tabular-nums;';
            valEl.textContent = '…';
            row.appendChild(lbl); row.appendChild(valEl);
            body.appendChild(row);
            subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPressure%/s%", function (v) { valEl.textContent = String(v) + " bar"; });
        })();

        // Boolean setzen (Checkbox): ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable
        (function () {
            var wrap = document.createElement('label');
            wrap.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer;';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.style.cssText = 'width:20px;height:20px;flex:0 0 auto;cursor:pointer;accent-color:' + p.active + ';';
            var lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:14px;color:' + p.bodyText + ';';
            lbl.textContent = loc("L_Enable", "Freigabe");
            wrap.appendChild(cb); wrap.appendChild(lbl);
            body.appendChild(wrap);
            cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            subscribe("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable%/s%", function (v) { if (document.activeElement !== cb) cb.checked = !!v; });
            cb.addEventListener('change', function () { writeSymbol("%s%ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable%/s%", cb.checked); });
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
})("MeinContainer");

// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──
// AC_POPUP_CONFIG_V1: {"v":1,"mode":"embedEvent","fnName":"AC_EmbedEvent","title":"Titel","titleLoc":"","titleSource":"static","titleField":"TagName","titleFallback":"Titel","titleIcon":"","titleIconColor":"","maxWidth":400,"columns":1,"hostSuffix":".btn_PopUp","blocks":[{"id":"b99","type":"read","col":0,"label":"Druck","loc":"L_P","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::rPressure","unit":"bar"},{"id":"b100","type":"check","col":0,"label":"Freigabe","loc":"L_Enable","symbol":"ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable"}],"embedTarget":"MeinContainer"}
