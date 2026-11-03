import { REF } from "./helpers.js";

// ─────────────────────────────────────────────────────────────
//  AC_Keyboard – eigenständige Funktionsdatei (registerFunctionEx)
//
//  Bildschirmtastatur für Texteingaben im Stil von AC_NumPad: QWERTZ mit Umlauten
//  und ß, Umschalttaste (einmal / Feststellen), Ebene Sonderzeichen, Cursor-Tasten,
//  Rücktaste, Leertaste, Abbrechen/Anwenden, Umschalter zum AC_NumPad.
//
//  Panel-Tastatur: Die Anzeige ist KEIN Eingabefeld (div mit eigenem Cursor), es wird
//  nie fokussiert – sonst öffnet das Linux-Panel seine eigene Bildschirmtastatur
//  (Test 03.11.2026, Dok. 66). Sondertasten als SVG, weil die Panel-Schrift keine
//  Symbolzeichen enthält.
//
//  Harte Regeln wie im übrigen Codegen:
//   - KEIN Backslash im erzeugten Code (TcHMI-Einbettung); Backslash/Apostroph-Taste
//     über String.fromCharCode
//   - Design/Palette identisch zu AC_NumPad (Dark/Light-Auto)
//   - ES5, keine Template-Literale im Ausgabecode
// ─────────────────────────────────────────────────────────────
const KEYBOARD_FN = "AC_Keyboard";

function generateKeyboard() {
  return `// Auto-generiert vom AC_PopUp Generator – Texteingabe (Bildschirmtastatur), registrierte Funktion
${REF}

/*
 * ${KEYBOARD_FN} – Bildschirmtastatur für Texteingaben
 *
 * Einbindung: im HMI-Projekt eine JavaScript-Funktionsdatei "${KEYBOARD_FN}" anlegen und
 * diesen Code komplett einfügen (wie AC_NumPad). Die Datei wird einmal geladen.
 *
 * Aufruf mit Optionsobjekt (z. B. JavaScript-Action an onPressed):
 *   TcHmi.Functions.AC_HMI.${KEYBOARD_FN}({
 *       symbol:    'ADS.PLC1.GVL.sName',   // lesen + schreiben (ohne %s%)
 *       title:     'Bezeichnung',
 *       maxLength: 32                      // leer = ohne Begrenzung
 *   });
 *
 * Weitere Optionen: writeSymbol (abweichendes Schreibziel), value + write(text) (eigener
 * Lese-/Schreibweg statt Symbol, z. B. Binder oder UserControl-Attribut), onWritten(text),
 * onClose(written), layout ('de'), numPad (false = kein Umschalter zum AC_NumPad),
 * numPadOptions ({ min, max, decimals, unit } für den Umschalter).
 *
 * Bedienung: ⇧ einmal = nächster Buchstabe groß, zweimal kurz hintereinander = feststellen.
 * ?123 = Sonderzeichen, ABC = zurück. Physische Tastatur: Zeichen, Pfeile, Pos1/Ende,
 * Rücktaste, Entf, Enter = Anwenden, Esc = Abbrechen.
 *
 * Lokalisierung (optional): L_Keyboard_Title, L_Keyboard_Space, L_Keyboard_Shift,
 * L_Keyboard_Symbols, L_Keyboard_Letters, L_Keyboard_NumPad, L_Keyboard_TooLong,
 * L_Keyboard_Writing, L_Keyboard_WriteError, L_Keyboard_Loading, L_NumPad_Left,
 * L_NumPad_Right, L_NumPad_Backspace, L_Cancel, L_Apply, L_Close
 */
(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {
            var UID = 'AC_Keyboard_Overlay';
            var current = null; // aktuell offene Instanz { close: function (written) }
            var BSL = String.fromCharCode(92), APOS = String.fromCharCode(39);

            // Tastaturbelegungen: je Ebene Zeilen aus Zeichen; Sondertasten werden je Zeile ergänzt
            var LAYOUTS = {
                de: {
                    letters: [
                        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß'],
                        ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
                        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
                        ['y', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-']
                    ],
                    symbols: [
                        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '='],
                        ['!', '"', '§', '$', '%', '&', '/', '(', ')', '?', '+'],
                        ['@', '#', '*', APOS, '_', ':', ';', '<', '>', '€', '°'],
                        ['^', '~', '|', BSL, '{', '}', '[', ']', 'µ', '²']
                    ]
                }
            };

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

            function getPalette() {
                if (readBgLuminance() < 0.5) {
                    return { boxBg:'#1a1d2e', border:'#2a2d3a', headerBg:'#161822', titleColor:'#ffffff',
                             closeColor:'#9aa0b4', bodyText:'#e0e0e0', muted:'#9aa0b4', keyBg:'#232738', modKey:'#2c3146',
                             inputBg:'#11131c', ok:'#22c55e', err:'#ef4444', accent:'#3b82f6',
                             shadow:'0 20px 60px rgba(0,0,0,0.5)', backdrop:'rgba(0,0,0,0.45)' };
                }
                return { boxBg:'#ffffff', border:'#d0d4de', headerBg:'#f2f4f8', titleColor:'#1a1d2e',
                         closeColor:'#6b7280', bodyText:'#333333', muted:'#6b7280', keyBg:'#f2f4f8', modKey:'#e3e7ef',
                         inputBg:'#ffffff', ok:'#16a34a', err:'#dc2626', accent:'#3b82f6',
                         shadow:'0 20px 60px rgba(0,0,0,0.2)', backdrop:'rgba(15,17,23,0.25)' };
            }

            // Symbolpfad normieren: '%…' unverändert, sonst in %s%…%/s% einschließen
            function toSym(s) {
                if (s === undefined || s === null) return '';
                s = String(s).trim();
                if (!s) return '';
                return s.charAt(0) === '%' ? s : '%s%' + s + '%/s%';
            }
            function toText(v) {
                if (v === undefined || v === null) return '';
                return String(v);
            }
            // Großschreibung je Zeichen; ß bleibt ß (toUpperCase ergäbe 'SS')
            function upper(ch) {
                if (ch === 'ß') return ch;
                var u = ch.toUpperCase();
                return u.length === 1 ? u : ch;
            }
            // Text auf maxLength kürzen (0 = ohne Begrenzung)
            function clip(text, maxLen) {
                return maxLen > 0 && text.length > maxLen ? text.slice(0, maxLen) : text;
            }

            function normOpts(a, title) {
                var o = (a && typeof a === 'object') ? a : { symbol: a, title: title };
                var ml = parseInt(o.maxLength, 10);
                return {
                    symbol: toSym(o.symbol),
                    writeSymbol: toSym(o.writeSymbol || o.symbol),
                    value: o.value,
                    write: typeof o.write === 'function' ? o.write : null,
                    maxLength: (isNaN(ml) || ml < 0) ? 0 : ml,
                    title: (o.title === undefined || o.title === null || o.title === '') ? loc('L_Keyboard_Title', 'Text eingeben') : String(o.title),
                    layout: (o.layout && LAYOUTS[o.layout]) ? o.layout : 'de',
                    numPad: o.numPad !== false,
                    numPadOptions: (o.numPadOptions && typeof o.numPadOptions === 'object') ? o.numPadOptions : {},
                    onWritten: typeof o.onWritten === 'function' ? o.onWritten : null,
                    onClose: typeof o.onClose === 'function' ? o.onClose : null
                };
            }

            // Schreiben über eigenen Weg (write) oder Symbol; ruft ok() bzw. bad() auf
            function writeValue(o, text, ok, bad) {
                if (o.write) {
                    try { o.write(text); } catch (e) { bad(); return; }
                    ok();
                    return;
                }
                try {
                    var ws = new TcHmi.Symbol(o.writeSymbol);
                    ws.write(text, function (data) {
                        try { ws.destroy(); } catch (e) {}
                        if (data && data.error !== undefined && data.error !== TcHmi.Errors.NONE) { bad(); return; }
                        ok();
                    });
                } catch (e) { bad(); }
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

            // SVG-Symbol aus Pfaden (24er Raster, Strich in Textfarbe)
            function keyIcon(paths, size) {
                var NS = 'http://www.w3.org/2000/svg';
                var svg = document.createElementNS(NS, 'svg');
                svg.setAttribute('viewBox', '0 0 24 24');
                svg.setAttribute('width', String(size || 24));
                svg.setAttribute('height', String(size || 24));
                svg.setAttribute('aria-hidden', 'true');
                svg.style.cssText = 'display:block;margin:0 auto;pointer-events:none;';
                for (var i = 0; i < paths.length; i++) {
                    var pth = document.createElementNS(NS, 'path');
                    pth.setAttribute('d', paths[i]);
                    pth.setAttribute('fill', 'none');
                    pth.setAttribute('stroke', 'currentColor');
                    pth.setAttribute('stroke-width', '2');
                    pth.setAttribute('stroke-linecap', 'round');
                    pth.setAttribute('stroke-linejoin', 'round');
                    svg.appendChild(pth);
                }
                return svg;
            }
            var ICON = {
                left: ['M19 12H5', 'M11 6l-6 6 6 6'],
                right: ['M5 12h14', 'M13 6l6 6-6 6'],
                bs: ['M21 5H8.5L2 12l6.5 7H21a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z', 'M11.5 9l6 6', 'M17.5 9l-6 6'],
                shift: ['M12 3l-8 8h4.5v9h7v-9H20z'],
                caps: ['M12 3l-8 7h4.5v6h7v-6H20z', 'M8.5 20h7'],
                numpad: ['M4 4h4v4H4z', 'M10 4h4v4h-4z', 'M16 4h4v4h-4z', 'M4 10h4v4H4z', 'M10 10h4v4h-4z', 'M16 10h4v4h-4z', 'M4 16h4v4H4z', 'M10 16h4v4h-4z', 'M16 16h4v4h-4z']
            };

            function AC_Keyboard(a, title) {
                var o = normOpts(a, title);
                if (!o.writeSymbol && !o.write) {
                    if (window.console) console.warn('AC_Keyboard: kein Symbol angegeben.');
                    return;
                }
                if (current) { try { current.close(false); } catch (e) {} }

                var p = getPalette();
                var L = LAYOUTS[o.layout];
                var watchers = [], symbols = [];
                var touched = false, busy = false, failMsg = '', closed = false, loading = false;
                var layer = 'letters', shift = 0, lastShiftAt = 0;   // shift: 0 aus, 1 einmal, 2 fest

                // ── Aufbau ──
                var overlay = document.createElement('div');
                overlay.id = UID;
                overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10050;background:' + p.backdrop + ';';

                var box = document.createElement('div');
                box.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
                    'background:' + p.boxBg + ';border:1px solid ' + p.border + ';border-radius:12px;' +
                    'width:900px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);box-sizing:border-box;' +
                    'display:flex;flex-direction:column;overflow:hidden;box-shadow:' + p.shadow + ';';

                var header = document.createElement('div');
                header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;' +
                    'padding:14px 20px;background:' + p.headerBg + ';border-radius:12px 12px 0 0;' +
                    'flex:0 0 auto;font-size:15px;font-weight:600;color:' + p.titleColor + ';';
                var titleEl = document.createElement('span');
                titleEl.style.cssText = 'flex:1 1 auto;min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.35;' +
                    'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;';
                titleEl.textContent = o.title;
                titleEl.title = o.title;
                var closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.style.cssText = 'border:none;background:transparent;color:' + p.closeColor + ';' +
                    'font-size:20px;line-height:1;cursor:pointer;padding:0 4px;margin:-4px -8px -4px 8px;';
                closeBtn.textContent = '×';
                closeBtn.title = loc('L_Close', 'Schließen');
                closeBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); });
                closeBtn.onclick = function (e) { e.stopPropagation(); close(false); };
                header.appendChild(titleEl);
                header.appendChild(closeBtn);

                var body = document.createElement('div');
                body.style.cssText = 'padding:16px 20px 20px;overflow-y:auto;flex:1 1 auto;min-height:0;';

                // Anzeige ohne Eingabeelement: Panel-Tastatur bleibt zu (kein bearbeitbares Element, kein Fokus)
                var disp = document.createElement('div');
                disp.setAttribute('role', 'textbox');
                disp.setAttribute('aria-readonly', 'true');
                disp.style.cssText = 'position:relative;box-sizing:border-box;height:52px;padding:10px 12px;border-radius:8px;' +
                    'font-size:22px;line-height:28px;text-align:left;white-space:pre;overflow:hidden;' +
                    'border:2px solid ' + p.border + ';background:' + p.inputBg + ';color:' + p.bodyText + ';transition:border-color .12s;' +
                    'user-select:none;-webkit-user-select:none;cursor:default;';
                // Editor-Zustand (gleiche Schnittstelle wie in AC_NumPad)
                var ed = {
                    value: '', selectionStart: 0, selectionEnd: 0,
                    setSelectionRange: function (s, t) {
                        var n = this.value.length;
                        this.selectionStart = Math.max(0, Math.min(n, s));
                        this.selectionEnd = Math.max(this.selectionStart, Math.min(n, t));
                        renderDisp();
                    }
                };
                function renderDisp() {
                    var v = ed.value, s = ed.selectionStart, t = ed.selectionEnd;
                    while (disp.firstChild) disp.removeChild(disp.firstChild);
                    disp.appendChild(document.createTextNode(v.slice(0, s)));
                    var mark;
                    if (s === t) {
                        mark = document.createElement('span');
                        mark.className = 'ac-kb-caret';
                        mark.style.cssText = 'display:inline-block;width:2px;height:28px;vertical-align:top;margin:0 -1px;background:' + p.bodyText + ';';
                        disp.appendChild(mark);
                        if (!v.length) {
                            var ph = document.createElement('span');
                            ph.style.cssText = 'color:' + p.muted + ';';
                            ph.textContent = '…';
                            disp.appendChild(ph);
                        }
                    } else {
                        mark = document.createElement('span');
                        mark.style.cssText = 'background:' + p.accent + ';color:#ffffff;border-radius:3px;';
                        mark.textContent = v.slice(s, t);
                        disp.appendChild(mark);
                    }
                    disp.appendChild(document.createTextNode(v.slice(t)));
                    // Cursor im sichtbaren Bereich halten (lange Texte scrollen waagrecht)
                    var x = mark.offsetLeft, w = disp.clientWidth;
                    if (x - disp.scrollLeft > w - 24) disp.scrollLeft = x - w + 24;
                    else if (x - disp.scrollLeft < 12) disp.scrollLeft = Math.max(0, x - 12);
                }
                if (!document.getElementById('AC_Keyboard_Style')) {
                    var st = document.createElement('style');
                    st.id = 'AC_Keyboard_Style';
                    st.textContent = '@keyframes ac-kb-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } } ' +
                        '.ac-kb-caret { animation: ac-kb-blink 1.06s step-end infinite; } ' +
                        '@media (prefers-reduced-motion: reduce) { .ac-kb-caret { animation: none; } }';
                    document.head.appendChild(st);
                }

                var status = document.createElement('div');
                status.style.cssText = 'min-height:18px;margin:6px 0 12px;display:flex;justify-content:space-between;gap:12px;font-size:13px;font-weight:600;color:' + p.muted + ';';
                var statusMsg = document.createElement('span');
                var counter = document.createElement('span');
                counter.style.cssText = 'font-variant-numeric:tabular-nums;font-weight:500;';
                status.appendChild(statusMsg);
                status.appendChild(counter);

                // ── Tasten ──
                function setEnabled(k, on) {
                    k.disabled = !on;
                    k.style.opacity = on ? '1' : '0.35';
                    k.style.cursor = on ? 'pointer' : 'not-allowed';
                }
                function mkKey(label, onPress, opt) {
                    opt = opt || {};
                    var k = document.createElement('button');
                    k.type = 'button';
                    if (label) k.textContent = label;
                    if (opt.icon) k.appendChild(keyIcon(opt.icon, opt.iconSize));
                    if (opt.title) k.title = opt.title;
                    k.style.cssText = 'box-sizing:border-box;height:54px;min-width:0;padding:0 4px;border-radius:8px;cursor:pointer;' +
                        'flex:' + (opt.grow || 1) + ' 1 0;font-size:' + (opt.fs || '21px') + ';font-weight:' + (opt.fw || '500') + ';touch-action:manipulation;' +
                        'border:' + (opt.bg ? 'none' : '1px solid ' + p.border) + ';background:' + (opt.bg || (opt.mod ? p.modKey : p.keyBg)) + ';color:' + (opt.fg || p.bodyText) + ';' +
                        'transition:transform .08s ease, filter .08s ease;';
                    k.addEventListener('mousedown', function (e) { e.preventDefault(); });
                    k.addEventListener('pointerdown', function (e) {
                        e.preventDefault(); e.stopPropagation();
                        if (k.disabled) return;
                        k.style.transform = 'scale(0.96)'; k.style.filter = 'brightness(0.88)';
                    });
                    var rel = function () { k.style.transform = ''; k.style.filter = ''; };
                    k.addEventListener('pointerup', rel);
                    k.addEventListener('pointerleave', rel);
                    k.onclick = function (e) { e.stopPropagation(); if (k.disabled || busy || loading) return; onPress(); };
                    return k;
                }
                function row() {
                    var r = document.createElement('div');
                    r.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';
                    return r;
                }

                // ── Textbearbeitung an der Cursorposition ──
                function getSel() { return [ed.selectionStart, ed.selectionEnd]; }
                function setCaret(s, t) { ed.setSelectionRange(s, t === undefined ? s : t); }
                function changed() { touched = true; failMsg = ''; refresh(); }
                function insert(ch) {
                    var s = getSel(), v = ed.value;
                    var nv = v.slice(0, s[0]) + ch + v.slice(s[1]);
                    if (o.maxLength > 0 && nv.length > o.maxLength) { failMsg = loc('L_Keyboard_TooLong', 'Maximale Länge erreicht'); refresh(); return; }
                    ed.value = nv;
                    setCaret(s[0] + ch.length);
                    if (shift === 1) { shift = 0; buildKeys(); }
                    changed();
                }
                function moveCaret(dir) {
                    var s = getSel(), pos;
                    if (s[0] !== s[1]) pos = dir < 0 ? s[0] : s[1];
                    else pos = Math.max(0, Math.min(ed.value.length, s[0] + dir));
                    setCaret(pos);
                }
                function backspace() {
                    var s = getSel(), v = ed.value;
                    if (s[0] !== s[1]) { ed.value = v.slice(0, s[0]) + v.slice(s[1]); setCaret(s[0]); }
                    else if (s[0] > 0) { ed.value = v.slice(0, s[0] - 1) + v.slice(s[0]); setCaret(s[0] - 1); }
                    else return;
                    changed();
                }
                function clearAll() { ed.value = ''; setCaret(0); changed(); }
                function pressShift() {
                    var now = Date.now();
                    if (shift === 2) shift = 0;
                    else if (shift === 1 && now - lastShiftAt < 450) shift = 2;
                    else shift = shift === 1 ? 0 : 1;
                    lastShiftAt = now;
                    buildKeys();
                }
                function setLayer(l) { layer = l; shift = 0; buildKeys(); }

                var keys = document.createElement('div');
                var bottom = document.createElement('div');
                var okBtn = null;
                function buildKeys() {
                    while (keys.firstChild) keys.removeChild(keys.firstChild);
                    var rowsDef = L[layer];
                    for (var ri = 0; ri < rowsDef.length; ri++) {
                        var r = row();
                        if (ri === 3) {
                            if (layer === 'letters') {
                                var sk = mkKey('', pressShift, { icon: shift === 2 ? ICON.caps : ICON.shift, grow: 2, mod: true, title: loc('L_Keyboard_Shift', 'Umschalten') });
                                if (shift > 0) { sk.style.background = shift === 2 ? p.accent : p.modKey; sk.style.color = shift === 2 ? '#ffffff' : p.accent; sk.style.border = '2px solid ' + p.accent; }
                                r.appendChild(sk);
                            }
                        }
                        for (var ci = 0; ci < rowsDef[ri].length; ci++) {
                            (function (ch) {
                                var shown = (layer === 'letters' && shift > 0) ? upper(ch) : ch;
                                r.appendChild(mkKey(shown, function () { insert(shown); }));
                            })(rowsDef[ri][ci]);
                        }
                        if (ri === 0) r.appendChild(mkKey('', backspace, { icon: ICON.bs, grow: 1.5, mod: true, title: loc('L_NumPad_Backspace', 'Zeichen löschen') }));
                        keys.appendChild(r);
                    }
                    // untere Reihe: Ebene, NumPad, Leertaste, Cursor, Abbrechen, Anwenden
                    while (bottom.firstChild) bottom.removeChild(bottom.firstChild);
                    bottom.style.cssText = 'display:flex;gap:6px;';
                    bottom.appendChild(layer === 'letters'
                        ? mkKey('?123', function () { setLayer('symbols'); }, { grow: 1.5, mod: true, fs: '17px', fw: '600', title: loc('L_Keyboard_Symbols', 'Sonderzeichen') })
                        : mkKey('ABC', function () { setLayer('letters'); }, { grow: 1.5, mod: true, fs: '17px', fw: '600', title: loc('L_Keyboard_Letters', 'Buchstaben') }));
                    if (o.numPad && typeof AC_HMI.AC_NumPad === 'function') {
                        bottom.appendChild(mkKey('', toNumPad, { icon: ICON.numpad, iconSize: 22, grow: 1.2, mod: true, title: loc('L_Keyboard_NumPad', 'Zahlenblock') }));
                    }
                    bottom.appendChild(mkKey(loc('L_Keyboard_Space', 'Leertaste'), function () { insert(' '); }, { grow: 5, fs: '15px', fg: p.muted }));
                    bottom.appendChild(mkKey('', function () { moveCaret(-1); }, { icon: ICON.left, mod: true, title: loc('L_NumPad_Left', 'Cursor links') }));
                    bottom.appendChild(mkKey('', function () { moveCaret(1); }, { icon: ICON.right, mod: true, title: loc('L_NumPad_Right', 'Cursor rechts') }));
                    bottom.appendChild(mkKey(loc('L_Cancel', 'Abbrechen'), function () { close(false); }, { grow: 2, bg: '#6b7280', fg: '#ffffff', fs: '15px', fw: '600' }));
                    okBtn = mkKey(loc('L_Apply', 'Anwenden'), commit, { grow: 2.4, bg: '#3b82f6', fg: '#ffffff', fs: '16px', fw: '600' });
                    bottom.appendChild(okBtn);
                    refresh();
                }

                body.appendChild(disp);
                body.appendChild(status);
                body.appendChild(keys);
                body.appendChild(bottom);
                box.appendChild(header);
                box.appendChild(body);
                overlay.appendChild(box);

                function refresh() {
                    if (closed || !okBtn) return;
                    var msg = '', tone = 'muted';
                    if (loading) msg = loc('L_Keyboard_Loading', 'Wert wird gelesen …');
                    else if (busy) msg = loc('L_Keyboard_Writing', 'Wird geschrieben …');
                    else if (failMsg) { msg = failMsg; tone = 'err'; }
                    statusMsg.textContent = msg;
                    statusMsg.style.color = tone === 'err' ? p.err : p.muted;
                    counter.textContent = o.maxLength > 0 ? (ed.value.length + ' / ' + o.maxLength) : '';
                    disp.style.borderColor = tone === 'err' ? p.err : (touched ? p.accent : p.border);
                    setEnabled(okBtn, !busy && !loading);
                }

                // ── Schreiben ──
                function commit() {
                    if (busy || closed || loading) return;
                    var text = ed.value;
                    busy = true;
                    refresh();
                    writeValue(o, text, function () {
                        if (closed) return;
                        if (o.onWritten) { try { o.onWritten(text); } catch (e) {} }
                        close(true);
                    }, function () {
                        busy = false;
                        failMsg = loc('L_Keyboard_WriteError', 'Schreiben fehlgeschlagen');
                        refresh();
                    });
                }

                // Umschalter: Text an AC_NumPad übergeben; NumPad schreibt über denselben Weg
                function toNumPad() {
                    var np = AC_HMI.AC_NumPad;
                    if (typeof np !== 'function') return;
                    var text = ed.value.trim().split(',').join('.');
                    var n = Number(text);
                    var po = o.numPadOptions;
                    close(false, true);
                    np({
                        value: (text !== '' && !isNaN(n) && isFinite(n)) ? n : undefined,
                        min: po.min, max: po.max, unit: po.unit, decimals: po.decimals,
                        title: o.title,
                        write: function (v) { writeValue(o, String(v), function () {}, function () {}); },
                        onWritten: function (v) { if (o.onWritten) { try { o.onWritten(String(v)); } catch (e) {} } },
                        onClose: o.onClose
                    });
                }

                // ── Schließen / Aufräumen ──
                function close(written, silent) {
                    if (closed) return;
                    closed = true;
                    document.removeEventListener('keydown', onKey, true);
                    for (var i = 0; i < watchers.length; i++) { try { watchers[i](); } catch (e) {} }
                    for (var j = 0; j < symbols.length; j++) { try { symbols[j].destroy(); } catch (e) {} }
                    watchers = []; symbols = [];
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    if (current && current.close === close) current = null;
                    if (!silent && o.onClose) { try { o.onClose(!!written); } catch (e) {} }
                }
                current = { close: close };

                // ── Startwert: eigener Wert (value) oder Symbol lesen; komplett markiert ──
                function applyValue(v) {
                    if (closed || touched) return;
                    loading = false;
                    ed.value = clip(toText(v), o.maxLength);
                    setCaret(0, ed.value.length);
                    refresh();
                }

                // ── Physische Tastatur (solange offen), ohne Fokus auf einem Eingabeelement ──
                function onKey(e) {
                    if (closed) return;
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    var k = e.key, handled = true;
                    if (k === 'Enter') commit();
                    else if (k === 'Escape') close(false);
                    else if (busy || loading) handled = (k && k.length === 1);
                    else if (k === 'ArrowLeft') moveCaret(-1);
                    else if (k === 'ArrowRight') moveCaret(1);
                    else if (k === 'Home') setCaret(0);
                    else if (k === 'End') setCaret(ed.value.length);
                    else if (k === 'Backspace') backspace();
                    else if (k === 'Delete') clearAll();
                    else if (k && k.length === 1) insert(k);
                    else handled = false;
                    if (handled) { e.preventDefault(); e.stopPropagation(); }
                }
                document.addEventListener('keydown', onKey, true);
                disp.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); });
                overlay.addEventListener('pointerdown', function (e) {
                    if (e.target === overlay) e.preventDefault();
                });
                // Fokus eines Seitenfelds lösen (sonst bleibt eine offene Panel-Tastatur stehen)
                try { var ae = document.activeElement; if (ae && ae !== document.body && ae.blur) ae.blur(); } catch (e) {}

                document.body.appendChild(overlay);
                makeDraggable(box, header);
                buildKeys();
                if (o.value !== undefined) {
                    applyValue(o.value);
                } else if (o.symbol) {
                    loading = true;
                    refresh();
                    try {
                        var vs = new TcHmi.Symbol(o.symbol);
                        symbols.push(vs);
                        watchers.push(vs.watch(function (data) {
                            if (data.error !== TcHmi.Errors.NONE) { loading = false; refresh(); return; }
                            applyValue(data.value);
                        }));
                    } catch (e) { loading = false; refresh(); }
                }
                renderDisp();
            }
            AC_HMI.${KEYBOARD_FN} = ${KEYBOARD_FN};
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx('${KEYBOARD_FN}', 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.${KEYBOARD_FN});
`;
}

export { KEYBOARD_FN, generateKeyboard };
