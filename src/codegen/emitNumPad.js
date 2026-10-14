import { REF, jsStr, wrapSym, locExpr, attrName, I } from "./helpers.js";
import { COLORS } from "../constants/palette.js";

// ─────────────────────────────────────────────────────────────
//  AC_NumPad – eigenständige Funktionsdatei (registerFunctionEx)
//
//  Zahleneingabe-Popup mit Min/Max-Prüfung, Ziffernblock, Cursor-Tasten,
//  Rücktaste/DEL, Abbrechen/OK. Wird EINMAL als Funktionsdatei ins HMI-Projekt
//  gelegt und von Eingabefeld-Bausteinen, Tabellen-Zellen (Zelltyp
//  „Eingabe" + Keypad) und beliebigen nativen Controls (JS-Action) aufgerufen.
//
//  Harte Regeln wie im übrigen Codegen:
//   - KEIN Backslash im erzeugten Code (TcHMI-Einbettung)
//   - Design/Palette identisch zu den generierten Popups (Dark/Light-Auto)
//   - ES5, keine Template-Literale im Ausgabecode
// ─────────────────────────────────────────────────────────────
const NUMPAD_FN = "AC_NumPad";

function generateNumPad() {
  const okC = COLORS.blue;
  const cancelC = COLORS.grey;
  return `// Auto-generiert vom AC_PopUp Generator – Zahleneingabe (NumPad), registrierte Funktion
${REF}

/*
 * ${NUMPAD_FN} – Zahleneingabe-Popup mit Min/Max-Prüfung
 *
 * Einbindung: im HMI-Projekt eine JavaScript-Funktionsdatei "${NUMPAD_FN}" anlegen und
 * diesen Code komplett einfügen. Die Datei wird einmal geladen; alle generierten
 * Popups (Eingabefeld/Tabelle mit Option "Keypad") und eigene Controls rufen sie auf.
 *
 * Aufruf mit Optionsobjekt (empfohlen, z. B. JavaScript-Action an onPressed):
 *   TcHmi.Functions.AC_HMI.${NUMPAD_FN}({
 *       symbol:   'ADS.PLC1.GVL.stP101::rValue',  // lesen + schreiben (ohne %s%)
 *       min:      'ADS.PLC1.GVL.stP101::rMin',    // Symbol, Zahl oder leer (= ohne Grenze)
 *       max:      16,
 *       unit:     'bar',
 *       decimals: 1,                              // 0 = Ganzzahl, leer = frei
 *       title:    'Druck P101'
 *   });
 *
 * Kurzform (Positionsparameter):
 *   TcHmi.Functions.AC_HMI.${NUMPAD_FN}('ADS.PLC1.GVL.rP101', 0, 'ADS.PLC1.GVL.rP101_Max', 'bar', 1, 'Druck');
 *
 * Weitere Optionen: writeSymbol (abweichendes Schreibziel), value + write(v) (eigener
 * Lese-/Schreibweg statt Symbol, z. B. UserControl-Attribute), onWritten(v), onClose(written).
 *
 * WICHTIG: Symbolpfade als TEXT übergeben (nicht als Symbol-Bindung) – sonst kommt
 * der Wert statt des Pfads an. Min/Max werden beim Öffnen per watch gelesen;
 * OK ist erst aktiv, wenn beide Grenzen bekannt sind und der Wert im Bereich liegt.
 *
 * Lokalisierung (optional): L_NumPad_Title, L_NumPad_Min, L_NumPad_Max, L_NumPad_Ok,
 * L_NumPad_TooLow, L_NumPad_TooHigh, L_NumPad_Invalid, L_NumPad_Decimals, L_NumPad_Integer,
 * L_NumPad_Empty, L_NumPad_Loading, L_NumPad_LimitError, L_NumPad_Writing,
 * L_NumPad_WriteError, L_Cancel, L_OK, L_Close
 */
(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {
            var UID = 'AC_NumPad_Overlay';
            var current = null; // aktuell offene Instanz { close: function (written) }

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
                             closeColor:'#9aa0b4', bodyText:'#e0e0e0', muted:'#9aa0b4', keyBg:'#232738',
                             inputBg:'#11131c', ok:'#22c55e', err:'#ef4444',
                             shadow:'0 20px 60px rgba(0,0,0,0.5)', backdrop:'rgba(0,0,0,0.45)' };
                }
                return { boxBg:'#ffffff', border:'#d0d4de', headerBg:'#f2f4f8', titleColor:'#1a1d2e',
                         closeColor:'#6b7280', bodyText:'#333333', muted:'#6b7280', keyBg:'#f2f4f8',
                         inputBg:'#ffffff', ok:'#16a34a', err:'#dc2626',
                         shadow:'0 20px 60px rgba(0,0,0,0.2)', backdrop:'rgba(15,17,23,0.25)' };
            }

            // Symbolpfad normieren: '%…' unverändert, sonst in %s%…%/s% einschließen
            function toSym(s) {
                if (s === undefined || s === null) return '';
                s = String(s).trim();
                if (!s) return '';
                return s.charAt(0) === '%' ? s : '%s%' + s + '%/s%';
            }
            function toNum(v) {
                if (typeof v === 'number') return v;
                return Number(String(v).trim().split(',').join('.'));
            }
            function isNumLike(v) {
                if (typeof v === 'number') return isFinite(v);
                if (typeof v !== 'string') return false;
                var t = v.trim();
                if (t === '') return false;
                var n = toNum(t);
                return !isNaN(n) && isFinite(n);
            }

            // Eingabetext prüfen (ohne Regex): optionales '-', Ziffern, max. ein '.'
            // state: 'empty' | 'invalid' | 'decimals' | 'ok'
            function parseEntry(text, decimals) {
                var s = String(text === undefined || text === null ? '' : text).trim().split(',').join('.');
                if (s === '') return { state: 'empty' };
                var i = 0, digits = 0, dot = false, frac = 0;
                if (s.charAt(0) === '-') i = 1;
                for (; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch >= '0' && ch <= '9') { digits++; if (dot) frac++; }
                    else if (ch === '.' && !dot) { dot = true; }
                    else return { state: 'invalid' };
                }
                if (digits === 0) return { state: 'invalid' };
                if (decimals >= 0 && frac > decimals) return { state: 'decimals', frac: frac };
                var num = Number(s);
                if (isNaN(num) || !isFinite(num)) return { state: 'invalid' };
                return { state: 'ok', num: num, frac: frac };
            }

            // Bereichsprüfung mit relativer Toleranz (REAL aus der SPS, z. B. 0.1 -> 0.100000001)
            function checkRange(num, lo, hi) {
                function eps(x) { return Math.max(1, Math.abs(x)) * 0.000001; }
                if (lo !== null && lo !== undefined && num < lo - eps(lo)) return 'low';
                if (hi !== null && hi !== undefined && num > hi + eps(hi)) return 'high';
                return '';
            }

            function fmtNum(v, decimals) {
                if (v === undefined || v === null || v === '') return '';
                var n = Number(v);
                if (typeof v === 'boolean' || isNaN(n) || !isFinite(n)) return String(v);
                if (decimals >= 0) return n.toFixed(decimals);
                return String(Math.round(n * 1000000) / 1000000);
            }

            function normOpts(a, min, max, unit, decimals, title) {
                var o = (a && typeof a === 'object') ? a : { symbol: a, min: min, max: max, unit: unit, decimals: decimals, title: title };
                var d = (o.decimals === undefined || o.decimals === null || o.decimals === '') ? -1 : parseInt(o.decimals, 10);
                if (isNaN(d) || d < 0) d = -1;
                return {
                    symbol: toSym(o.symbol),
                    writeSymbol: toSym(o.writeSymbol || o.symbol),
                    value: o.value,
                    write: typeof o.write === 'function' ? o.write : null,
                    min: o.min,
                    max: o.max,
                    unit: (o.unit === undefined || o.unit === null) ? '' : String(o.unit).trim(),
                    decimals: d,
                    title: (o.title === undefined || o.title === null || o.title === '') ? loc('L_NumPad_Title', 'Wert eingeben') : String(o.title),
                    onWritten: typeof o.onWritten === 'function' ? o.onWritten : null,
                    onClose: typeof o.onClose === 'function' ? o.onClose : null
                };
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

            function ${NUMPAD_FN}(a, min, max, unit, decimals, title) {
                var o = normOpts(a, min, max, unit, decimals, title);
                if (!o.writeSymbol && !o.write) {
                    if (window.console) console.warn('${NUMPAD_FN}: kein Symbol angegeben.');
                    return;
                }
                if (current) { try { current.close(false); } catch (e) {} }

                var p = getPalette();
                var watchers = [], symbols = [];
                var touched = false, busy = false, failMsg = '', closed = false;
                var unitSfx = o.unit ? (o.unit === '%' ? '%' : ' ' + o.unit) : '';

                // ── Grenzwerte: Zahl (fest), Symbol (watch) oder leer (keine Grenze) ──
                function setupLimit(src) {
                    var L = { val: null, state: 'none' };
                    if (src === undefined || src === null || src === '') return L;
                    if (typeof src === 'number' && !isFinite(src)) { L.state = 'err'; return L; }
                    if (isNumLike(src)) { L.val = toNum(src); L.state = 'ok'; return L; }
                    if (typeof src !== 'string') return L;
                    L.state = 'wait';
                    try {
                        var sym = new TcHmi.Symbol(toSym(src));
                        symbols.push(sym);
                        watchers.push(sym.watch(function (data) {
                            if (closed) return;
                            if (data.error !== TcHmi.Errors.NONE) { L.state = 'err'; refresh(); return; }
                            var n = Number(data.value);
                            if (isNaN(n) || !isFinite(n)) { L.state = 'err'; } else { L.val = n; L.state = 'ok'; }
                            refresh();
                        }));
                    } catch (e) { L.state = 'err'; }
                    return L;
                }

                // ── Aufbau ──
                var overlay = document.createElement('div');
                overlay.id = UID;
                overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10050;background:' + p.backdrop + ';';

                var box = document.createElement('div');
                box.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
                    'background:' + p.boxBg + ';border:1px solid ' + p.border + ';border-radius:12px;' +
                    'width:420px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);box-sizing:border-box;' +
                    'display:flex;flex-direction:column;overflow:hidden;box-shadow:' + p.shadow + ';';

                var header = document.createElement('div');
                header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;' +
                   'padding:14px 20px;background:' + p.headerBg + ';border-radius:12px 12px 0 0;' +
                    'flex:0 0 auto;font-size:15px;font-weight:600;color:' + p.titleColor + ';';
                var titleEl = document.createElement('span');
                titleEl.style.cssText = 'flex:1 1 auto;min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.35;' +
                    'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;';
                titleEl.textContent = o.title;
                titleEl.title = o.title;   // voller Text als Tooltip
                var closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.style.cssText = 'border:none;background:transparent;color:' + p.closeColor + ';' +
                    'font-size:20px;line-height:1;cursor:pointer;padding:0 4px;margin:-4px -8px -4px 8px;';
                closeBtn.textContent = '×';
                closeBtn.title = loc('L_Close', 'Schließen');
                closeBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                closeBtn.onclick = function (e) { e.stopPropagation(); close(false); };
                header.appendChild(titleEl);
                header.appendChild(closeBtn);

                var body = document.createElement('div');
                body.style.cssText = 'padding:18px 20px 20px;overflow-y:auto;flex:1 1 auto;min-height:0;';

                // Bereichszeile: [Min]  [Eingabe + Einheit]  [Max]
                function mkLimitBox(labelKey, labelFb, align) {
                    var w = document.createElement('div');
                    w.style.cssText = 'flex:0 0 72px;min-width:0;text-align:' + align + ';';
                    var l = document.createElement('div');
                    l.style.cssText = 'font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:' + p.muted + ';margin-bottom:2px;';
                    l.textContent = loc(labelKey, labelFb);
                    var v = document.createElement('div');
                    v.style.cssText = 'font-size:14px;font-weight:500;color:' + p.bodyText + ';font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                    v.textContent = '–';
                    w.appendChild(l); w.appendChild(v);
                    return { wrap: w, val: v };
                }
                var range = document.createElement('div');
                range.style.cssText = 'display:flex;align-items:center;gap:10px;';
                var minBox = mkLimitBox('L_NumPad_Min', 'Min', 'right');
                var maxBox = mkLimitBox('L_NumPad_Max', 'Max', 'left');
                var field = document.createElement('div');
                field.style.cssText = 'flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;';
                var input = document.createElement('input');
                input.type = 'text';
                input.setAttribute('inputmode', 'none');
                input.setAttribute('autocomplete', 'off');
                input.setAttribute('spellcheck', 'false');
                input.placeholder = '…';
                input.style.cssText = 'flex:1 1 auto;min-width:0;width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;' +
                    'font-size:24px;font-weight:600;text-align:right;outline:none;font-variant-numeric:tabular-nums;' +
                    'border:2px solid ' + p.border + ';background:' + p.inputBg + ';color:' + p.bodyText + ';transition:border-color .12s;';
                field.appendChild(input);
                if (o.unit) {
                    var unitEl = document.createElement('span');
                    unitEl.style.cssText = 'flex:0 0 auto;font-size:14px;color:' + p.bodyText + ';opacity:0.75;';
                    unitEl.textContent = o.unit;
                    field.appendChild(unitEl);
                }
                range.appendChild(minBox.wrap);
                range.appendChild(field);
                range.appendChild(maxBox.wrap);

                var status = document.createElement('div');
                status.style.cssText = 'min-height:18px;margin:8px 0 16px;text-align:center;font-size:13px;font-weight:600;color:' + p.muted + ';';

                // ── Tasten ──
                function setEnabled(k, on) {
                    k.disabled = !on;
                    k.style.opacity = on ? '1' : '0.35';
                    k.style.cursor = on ? 'pointer' : 'not-allowed';
                }
                function mkKey(label, onPress, bg, fg, fs) {
                    var k = document.createElement('button');
                    k.type = 'button';
                    k.textContent = label;
                    k.style.cssText = 'box-sizing:border-box;height:52px;min-width:0;padding:0 6px;border-radius:8px;cursor:pointer;' +
                        'font-size:' + (fs || '20px') + ';font-weight:600;font-variant-numeric:tabular-nums;touch-action:manipulation;' +
                        'border:' + (bg ? 'none' : '1px solid ' + p.border) + ';background:' + (bg || p.keyBg) + ';color:' + (fg || p.bodyText) + ';' +
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
                    k.onclick = function (e) { e.stopPropagation(); if (k.disabled || busy) return; onPress(); };
                    return k;
                }

                // ── Textbearbeitung an der Cursorposition ──
                function getSel() {
                    var s = input.selectionStart, t = input.selectionEnd;
                    if (s === null || s === undefined) { s = input.value.length; t = s; }
                    return [s, t];
                }
                function setCaret(a, b) {
                    try { input.focus(); } catch (e) {}
                    try { input.setSelectionRange(a, b === undefined ? a : b); } catch (e) {}
                }
                function changed() { touched = true; failMsg = ''; refresh(); }
                function insert(ch) {
                    var s = getSel(), v = input.value;
                    if (ch === '.') {
                        if (o.decimals === 0) return;
                        var rest = v.slice(0, s[0]) + v.slice(s[1]);
                        if (rest.indexOf('.') >= 0) return;
                    }
                    input.value = v.slice(0, s[0]) + ch + v.slice(s[1]);
                    setCaret(s[0] + ch.length);
                    changed();
                }
                function toggleSign() {
                    var s = getSel(), v = input.value;
                    if (v.charAt(0) === '-') { input.value = v.slice(1); setCaret(Math.max(0, s[0] - 1), Math.max(0, s[1] - 1)); }
                    else { input.value = '-' + v; setCaret(s[0] + 1, s[1] + 1); }
                    changed();
                }
                function moveCaret(dir) {
                    var s = getSel(), pos;
                    if (s[0] !== s[1]) pos = dir < 0 ? s[0] : s[1];
                    else pos = Math.max(0, Math.min(input.value.length, s[0] + dir));
                    setCaret(pos);
                }
                function backspace() {
                    var s = getSel(), v = input.value;
                    if (s[0] !== s[1]) { input.value = v.slice(0, s[0]) + v.slice(s[1]); setCaret(s[0]); }
                    else if (s[0] > 0) { input.value = v.slice(0, s[0] - 1) + v.slice(s[0]); setCaret(s[0] - 1); }
                    else return;
                    changed();
                }
                function clearAll() { input.value = ''; setCaret(0); changed(); }

                var keys = document.createElement('div');
                keys.style.cssText = 'display:flex;gap:14px;align-items:stretch;';
                var grid = document.createElement('div');
                grid.style.cssText = 'flex:1 1 auto;min-width:0;display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;';
                var digitOrder = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];
                for (var di = 0; di < digitOrder.length; di++) {
                    (function (d) { grid.appendChild(mkKey(d, function () { insert(d); })); })(digitOrder[di]);
                }
                var dotKey = mkKey('.', function () { insert('.'); });
                var signKey = mkKey('±', toggleSign);
                grid.appendChild(dotKey);
                grid.appendChild(signKey);

                var side = document.createElement('div');
                side.style.cssText = 'flex:0 0 140px;display:flex;flex-direction:column;gap:8px;';
                function pair(k1, k2) {
                    var r = document.createElement('div');
                    r.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
                    r.appendChild(k1); r.appendChild(k2);
                    return r;
                }
                var leftKey = mkKey('←', function () { moveCaret(-1); });
                var rightKey = mkKey('→', function () { moveCaret(1); });
                var bsKey = mkKey('⌫', backspace);
                var delKey = mkKey('DEL', clearAll, null, null, '15px');
                leftKey.title = loc('L_NumPad_Left', 'Cursor links');
                rightKey.title = loc('L_NumPad_Right', 'Cursor rechts');
                bsKey.title = loc('L_NumPad_Backspace', 'Zeichen löschen');
                delKey.title = loc('L_NumPad_Clear', 'Eingabe löschen');
                var spacer = document.createElement('div');
                spacer.style.cssText = 'flex:1 1 auto;min-height:0;';
                var cancelBtn = mkKey(loc('L_Cancel', 'Abbrechen'), function () { close(false); }, '${cancelC.bg}', '${cancelC.text}', '14px');
                var okBtn = mkKey(loc('L_Apply', 'Anwenden'), commit, '${okC.bg}', '${okC.text}', '16px');
                side.appendChild(pair(leftKey, rightKey));
                side.appendChild(pair(bsKey, delKey));
                side.appendChild(spacer);
                side.appendChild(cancelBtn);
                side.appendChild(okBtn);
                keys.appendChild(grid);
                keys.appendChild(side);

                body.appendChild(range);
                body.appendChild(status);
                body.appendChild(keys);
                box.appendChild(header);
                box.appendChild(body);
                overlay.appendChild(box);

                // Tasten, die von den Grenzen abhängen
                if (o.decimals === 0) setEnabled(dotKey, false);

                var lo = setupLimit(o.min);
                var hi = setupLimit(o.max);

                function limitText(L) {
                    if (L.state === 'ok') return fmtNum(L.val, o.decimals) + unitSfx;
                    if (L.state === 'wait') return '…';
                    if (L.state === 'err') return '?';
                    return '–';
                }

                // ── Zustand auswerten: Statuszeile, Rahmenfarbe, OK-Freigabe ──
                function evaluate() {
                    if (lo.state === 'wait' || hi.state === 'wait') return { ok: false, msg: loc('L_NumPad_Loading', 'Grenzwerte werden gelesen …'), tone: 'muted' };
                    if (lo.state === 'err' || hi.state === 'err') return { ok: false, msg: loc('L_NumPad_LimitError', 'Grenzwert nicht lesbar'), tone: 'err' };
                    var r = parseEntry(input.value, o.decimals);
                    if (r.state === 'empty') return { ok: false, msg: loc('L_NumPad_Empty', 'Bitte Wert eingeben'), tone: 'muted' };
                    if (r.state === 'invalid') return { ok: false, msg: loc('L_NumPad_Invalid', 'Ungültige Eingabe'), tone: 'err' };
                    if (r.state === 'decimals') {
                        if (o.decimals === 0) return { ok: false, msg: loc('L_NumPad_Integer', 'Nur ganze Zahlen erlaubt'), tone: 'err' };
                        return { ok: false, msg: loc('L_NumPad_Decimals', 'Zu viele Nachkommastellen') + ' (max. ' + o.decimals + ')', tone: 'err' };
                    }
                    var rg = checkRange(r.num, lo.val, hi.val);
                    if (rg === 'low') return { ok: false, msg: loc('L_NumPad_TooLow', 'Wert zu klein'), tone: 'err' };
                    if (rg === 'high') return { ok: false, msg: loc('L_NumPad_TooHigh', 'Wert zu groß'), tone: 'err' };
                    return { ok: true, num: r.num, msg: loc('L_NumPad_Ok', 'o.k.'), tone: 'ok' };
                }
                function refresh() {
                    if (closed || !lo || !hi) return { ok: false };
                    minBox.val.textContent = limitText(lo);
                    maxBox.val.textContent = limitText(hi);
                    setEnabled(signKey, !(lo.state === 'ok' && lo.val >= 0));
                    var ev = evaluate();
                    var msg = ev.msg, tone = ev.tone;
                    if (busy) { msg = loc('L_NumPad_Writing', 'Wird geschrieben …'); tone = 'muted'; }
                    else if (failMsg) { msg = failMsg; tone = 'err'; }
                    var col = tone === 'ok' ? p.ok : (tone === 'err' ? p.err : p.muted);
                    status.textContent = msg;
                    status.style.color = col;
                    input.style.borderColor = tone === 'muted' ? p.border : col;
                    setEnabled(okBtn, ev.ok && !busy);
                    return ev;
                }

                // ── Schreiben ──
                function done(num) {
                    if (o.onWritten) { try { o.onWritten(num); } catch (e) {} }
                    close(true);
                }
                function fail() {
                    busy = false;
                    failMsg = loc('L_NumPad_WriteError', 'Schreiben fehlgeschlagen');
                    refresh();
                }
                function commit() {
                    if (busy || closed) return;
                    var ev = refresh();
                    if (!ev.ok) return;
                    var num = o.decimals === 0 ? Math.round(ev.num) : ev.num;
                    busy = true;
                    refresh();
                    if (o.write) {
                        try { o.write(num); } catch (e) { fail(); return; }
                        done(num);
                        return;
                    }
                    try {
                        var ws = new TcHmi.Symbol(o.writeSymbol);
                        ws.write(num, function (data) {
                            try { ws.destroy(); } catch (e) {}
                            if (closed) return;
                            if (data && data.error !== undefined && data.error !== TcHmi.Errors.NONE) { fail(); return; }
                            done(num);
                        });
                    } catch (e) { fail(); }
                }

                // ── Schließen / Aufräumen ──
                function close(written) {
                    if (closed) return;
                    closed = true;
                    for (var i = 0; i < watchers.length; i++) { try { watchers[i](); } catch (e) {} }
                    for (var j = 0; j < symbols.length; j++) { try { symbols[j].destroy(); } catch (e) {} }
                    watchers = []; symbols = [];
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    if (current && current.close === close) current = null;
                    if (o.onClose) { try { o.onClose(!!written); } catch (e) {} }
                }
                current = { close: close };

                // ── Startwert: eigener Wert (value) oder Symbol lesen ──
                function applyValue(v) {
                    if (closed || touched) return;
                    input.value = fmtNum(v, o.decimals);
                    setCaret(0, input.value.length); // komplett markiert: erste Ziffer ersetzt den Wert
                    refresh();
                }
                if (o.value !== undefined) {
                    applyValue(o.value);
                } else if (o.symbol) {
                    try {
                        var vs = new TcHmi.Symbol(o.symbol);
                        symbols.push(vs);
                        watchers.push(vs.watch(function (data) {
                            if (data.error !== TcHmi.Errors.NONE) return;
                            applyValue(data.value);
                        }));
                    } catch (e) {}
                }

                // ── Physische Tastatur: Ziffern/Komma/Punkt/Minus, Enter = OK, Esc = Abbrechen ──
                input.addEventListener('keydown', function (e) {
                    e.stopPropagation();
                    var k = e.key;
                    if (k === 'Enter') { e.preventDefault(); commit(); return; }
                    if (k === 'Escape') { e.preventDefault(); close(false); return; }
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    if (k && k.length === 1) {
                        e.preventDefault();
                        if (busy) return;
                        if (k >= '0' && k <= '9') insert(k);
                        else if (k === '.' || k === ',') insert('.');
                        else if (k === '-') { if (!signKey.disabled) toggleSign(); }
                    }
                });
                input.addEventListener('input', function () { changed(); });
                input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                overlay.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape') { e.stopPropagation(); close(false); }
                });
                overlay.addEventListener('pointerdown', function (e) {
                    if (e.target === overlay) { e.preventDefault(); setCaret(getSel()[0], getSel()[1]); }
                });

                document.body.appendChild(overlay);
                makeDraggable(box, header);
                refresh();
                setCaret(0, input.value.length);
            }
            AC_HMI.${NUMPAD_FN} = ${NUMPAD_FN};
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx('${NUMPAD_FN}', 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.${NUMPAD_FN});
`;
}

// ─────────────────────────────────────────────────────────────
//  Aufrufer-Seite: Eingabefeld-Baustein mit Option „Keypad"
//  (Symbol-Modi und UserControl-Modus). Nur aktiv bei b.keypad && Datentyp Zahl,
//  sonst wird der unveraenderte Bestands-Emitter genutzt (Golden-neutral).
// ─────────────────────────────────────────────────────────────
const isNumStr = (s) => { s = String(s == null ? "" : s).trim().replace(",", "."); return s !== "" && !isNaN(Number(s)) && isFinite(Number(s)); };
const numLit = (s) => String(Number(String(s).trim().replace(",", ".")));
const kpDecimals = (b) => { const t = String(b.kpDecimals == null ? "" : b.kpDecimals).trim(); if (t === "") return -1; const n = parseInt(t, 10); return isNaN(n) || n < 0 ? -1 : n; };
const usesKeypad = (b) => !!b.keypad && b.dataType !== "text" && b.dataType !== "time";

// Grenze im Symbol-Modus: Zahl -> Literal, Text -> Symbolpfad, leer -> null
function kpLimitSym(src) {
  const t = String(src == null ? "" : src).trim();
  if (!t) return "null";
  return isNumStr(t) ? numLit(t) : jsStr(wrapSym(t));
}
// Grenze im UC-Modus: Zahl -> Literal, Text -> Attribut (beim Oeffnen gelesen; fehlt es -> NaN -> OK gesperrt)
function kpLimitUC(src) {
  const t = String(src == null ? "" : src).trim();
  if (!t) return "null";
  return isNumStr(t) ? numLit(t) : `Number(gv(${jsStr(attrName(t))}, NaN))`;
}

// trig = Trigger-Code der Bestands-Emitter ("; pulseSymbol(...)" bzw. "; pulse(...)") oder ""
function emitInputKeypad(parent, b, mb, uc, trig) {
  const dec = kpDecimals(b);
  const unit = (b.unit || "").trim();
  const fmt = dec >= 0
    ? `var num = Number(v); input.value = (v === '' || v === null || v === undefined || isNaN(num)) ? String(v == null ? '' : v) : num.toFixed(${dec});`
    : `input.value = (v === null || v === undefined) ? '' : String(v);`;
  const onWritten = trig ? `,\n${I}            onWritten: function () { ${trig.replace(/^; /, "")}; }` : "";
  const unitEl = unit
    ? `\n${I}    var unitEl = document.createElement('span');\n${I}    unitEl.style.cssText = 'flex:0 0 auto;align-self:center;font-size:13px;color:' + p.bodyText + ';opacity:0.75;';\n${I}    unitEl.textContent = ${jsStr(unit)};`
    : "";
  const unitAppend = unit ? `\n${I}    line.appendChild(unitEl);` : "";
  let src, readSrc;
  if (uc) {
    const a = jsStr(attrName(b.symbol));
    const wa = jsStr(attrName((b.writeSym || "").trim() ? b.writeSym : b.symbol));
    src = `value: gv(${a}, ''),\n${I}            write: function (val) { sv(${wa}, val); },\n${I}            min: ${kpLimitUC(b.kpMin)},\n${I}            max: ${kpLimitUC(b.kpMax)},`;
    readSrc = `\n${I}    updaters.push(function () { var v = gv(${a}, ''); ${fmt} });`;
  } else {
    const sym = jsStr(wrapSym(b.symbol));
    const wsym = jsStr(wrapSym((b.writeSym || "").trim() ? b.writeSym : b.symbol));
    src = `symbol: ${sym},\n${I}            writeSymbol: ${wsym},\n${I}            min: ${kpLimitSym(b.kpMin)},\n${I}            max: ${kpLimitSym(b.kpMax)},`;
    readSrc = `\n${I}    subscribe(${sym}, function (v) { ${fmt} });`;
  }
  const what = uc ? `${attrName(b.symbol)} (Attribut)` : b.symbol;
  return `${I}// Eingabefeld (Keypad ${NUMPAD_FN}): ${what}\n${I}(function () {\n${I}    var wrap = document.createElement('div');\n${I}    wrap.style.cssText = 'margin-bottom:${mb};';\n${I}    var lbl = document.createElement('div');\n${I}    lbl.style.cssText = 'font-size:13px;color:' + p.bodyText + ';margin-bottom:6px;';\n${I}    lbl.textContent = ${locExpr(b.loc, b.label)};\n${I}    var line = document.createElement('div');\n${I}    line.style.cssText = 'display:flex;gap:8px;align-items:stretch;';\n${I}    var input = document.createElement('input');\n${I}    input.type = 'text';\n${I}    input.readOnly = true;\n${I}    input.setAttribute('inputmode', 'none');\n${I}    input.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;padding:9px 10px;border-radius:8px;font-size:14px;outline:none;text-align:right;cursor:pointer;font-variant-numeric:tabular-nums;' +\n${I}        'border:1px solid ' + p.border + ';background:' + p.boxBg + ';color:' + p.bodyText + ';';\n${I}    input.addEventListener('pointerdown', function (e) { e.stopPropagation(); });${readSrc}\n${I}    function openPad() {\n${I}        if (input.disabled) return;\n${I}        var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions) ? TcHmi.Functions.AC_HMI : null;\n${I}        var f = fns ? fns.${NUMPAD_FN} : null;\n${I}        if (typeof f !== 'function') { if (window.console) console.warn('${NUMPAD_FN}: Funktionsdatei nicht geladen.'); return; }\n${I}        f({\n${I}            ${src}\n${I}            unit: ${jsStr(unit)},\n${I}            decimals: ${dec},\n${I}            title: ${locExpr(b.loc, b.label)}${onWritten}\n${I}        });\n${I}    }\n${I}    input.addEventListener('click', function (e) { e.stopPropagation(); openPad(); });${unitEl}\n${I}    line.appendChild(input);${unitAppend}\n${I}    wrap.appendChild(lbl); wrap.appendChild(line);\n${I}    ${parent}.appendChild(wrap);\n${I}})();`;
}

export { NUMPAD_FN, generateNumPad, usesKeypad, emitInputKeypad, isNumStr, numLit };
