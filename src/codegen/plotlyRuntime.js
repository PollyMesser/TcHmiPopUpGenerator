// ── Gemeinsame Laufzeit-Bausteine für Plotly-basierte Chart-Module ──
// (Balkendiagramm, Gauge). Der bestehende Verlauf-Plot (emitPlot.js) bringt
// seine eigenen Helfer mit und bleibt unverändert (Golden-Master-neutral).
//
// Alle Snippets sind backslash-frei (harte TcHMI-Einbettungsregel) und werden
// INNERHALB des jeweiligen Modul-IIFE eingefügt. Erwartet im Modul-Scope:
//   plotDiv (DOM-Element, null nach dem Abbau)

// Pfad ab HMI-Root – identisch zum Verlauf-Plot, damit Plotly nur einmal geladen wird.
const PLOTLY_SRC = "Assets/plotly-3.6.0.min.js";

// Plotly bei Bedarf nachladen. Mehrere Module teilen sich denselben <script>-Tag
// (id 'ac-plotly-loader'); wartende Module hängen sich an dessen load-Event.
const ENSURE_PLOTLY_SRC = `    function ensurePlotly(cb) {
        if (window.Plotly) { cb(); return; }
        var existing = document.getElementById('ac-plotly-loader');
        if (existing) { existing.addEventListener('load', cb); return; }
        var s = document.createElement('script'); s.id = 'ac-plotly-loader'; s.src = PLOTLY_SRC;
        s.onload = function () { cb(); };
        s.onerror = function () { if (plotDiv) { plotDiv.textContent = loc('L_PlotLoadError', 'Plotly konnte nicht geladen werden: ' + PLOTLY_SRC); plotDiv.style.color = p.bodyText; plotDiv.style.fontSize = '16px'; } };
        document.head.appendChild(s);
    }`;

// Größe nur anpassen, wenn das Element tatsächlich sichtbar ist (sonst rechnet
// Plotly mit 0 px und zeichnet falsch).
const RESIZE_SRC = `    function isDisplayed() { return !!plotDiv && plotDiv.offsetParent !== null && plotDiv.clientWidth > 1 && plotDiv.clientHeight > 1; }
    function resize() { if (!window.Plotly || !isDisplayed()) return; try { var pr = window.Plotly.Plots.resize(plotDiv); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }`;

// Eigene ADS-Abos des Moduls (unabhängig vom Popup-subscribe, damit es auch im
// UserControl-Modus für Array-Elemente funktioniert). Abbau im teardown.
const OWN_SUBSCRIBE_SRC = `    function subOwn(symbolStr, onChange) {
        if (!symbolStr) return;
        try { var sym = new TcHmi.Symbol(symbolStr); ownSymbols.push(sym); ownWatchers.push(sym.watch(function (data) { if (data.error !== TcHmi.Errors.NONE) return; onChange(data.value); })); } catch (e) {}
    }`;

// Wertequelle je Modus: Symbol-Modus -> Popup-subscribe; UC-Modus -> Attribut
// per gv() im Polling, nur bei Änderung weiterreichen.
function bindSrc(uc) {
  if (uc) {
    return `    function bindV(attr, onChange) {
        if (!attr) return;
        var first = true, last = null;
        updaters.push(function () { var v = gv(attr, null); if (v === null) return; if (!first && v === last) return; first = false; last = v; onChange(v); });
    }`;
  }
  return `    function bindV(symbolStr, onChange) { if (symbolStr) subscribe(symbolStr, onChange); }`;
}

// Hex-Farbe (#rrggbb) mit Alpha als rgba()-String – zur Generierzeit berechnet.
function hexToRgba(hex, alpha) {
  const h = String(hex || "").trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(h);
  if (!m) return h || "rgba(127,127,127," + alpha + ")";
  const n = parseInt(m[1], 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
}

// Optionale Zahl aus Editor-Feld: "" / ungültig -> null
function optNum(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

export { PLOTLY_SRC, ENSURE_PLOTLY_SRC, RESIZE_SRC, OWN_SUBSCRIBE_SRC, bindSrc, hexToRgba, optNum };
