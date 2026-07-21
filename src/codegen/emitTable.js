import { jsStr, wrapSym, locExpr, indentLines, I } from "./helpers.js";
import { COLORS, ICONS } from "../constants/palette.js";

// ── Tabellen-Baustein: eigenständiges Modul (modus-unabhängig, eigene Watches/Subscription) ──
// Datenquellen:
//   'static' – Zell-Symbole einzeln im Editor; bis watchLimit per TcHmi.Symbol.watch (BESTÄTIGT),
//              darüber EINE Server-Subscription mit N Read-Commands (Protokoll-Standard,
//              in diesem Projekt noch NICHT per WS-Mitschnitt verifiziert).
//   'array'  – EIN TcHmi.Symbol.watch auf das ganze PLC-Array (BESTÄTIGTE API); Spalten
//              greifen per Member-Name (JSON-Feldname der Struktur) auf die Zeilenobjekte zu.
function tableBlockConfig(b) {
  const colsOut = (b.columns || []).map((c) => ({
    kind: c.kind || "read",
    header: c.header || "", loc: (c.headerLoc || "").trim(),
    member: (c.member || "").trim(),
    unit: c.unit || "", dec: c.decimals === "" || c.decimals == null ? -1 : Math.max(0, parseInt(c.decimals) || 0),
    label: c.label || "", lloc: (c.loc || "").trim(),
    wmode: c.writeMode || "setTrue", pms: Math.max(50, Number(c.pulseMs) || 300),
    map: (c.map || []).map((e) => ({
      v: String(e.value == null ? "" : e.value).trim(),
      label: e.label || "", loc: (e.loc || "").trim(),
      color: (COLORS[e.color] || COLORS.grey).bg, text: (COLORS[e.color] || COLORS.grey).text,
      icon: ICONS[e.icon] ? e.icon : "info",
    })),
  }));
  const rowsOut = (b.dataSource === "array") ? [] : (b.rows || []).map((r) =>
    (b.columns || []).map((c, ci) => {
      const cl = (r.cells || [])[ci] || {};
      return { s: cl.symbol ? wrapSym(cl.symbol) : "", t: cl.text || "", loc: (cl.loc || "").trim() };
    }));
  // Nur tatsächlich genutzte Icon-SVGs einbetten
  const usedIcons = {};
  colsOut.forEach((c) => { if (c.kind === "icon") c.map.forEach((e) => { usedIcons[e.icon] = ICONS[e.icon].svg; }); });
  // Regel-Wert bei der Generierung typisieren (true/false/Zahl/String)
  const parseRuleVal = (raw) => {
    const t = String(raw == null ? "" : raw).trim();
    if (t === "true") return true;
    if (t === "false") return false;
    if (t !== "" && !isNaN(Number(t))) return Number(t);
    return t;
  };
  const rulesOut = (b.rules || []).map((u) => ({
    c: Math.max(0, parseInt(u.colIndex) || 0), op: u.op || "==", v: parseRuleVal(u.value),
    t: u.target === "cell" ? "cell" : "row", color: (COLORS[u.color] || COLORS.red).bg,
  }));
  const J = (o) => JSON.stringify(o, null, 4);
  return {
    cols: J(colsOut), rows: J(rowsOut), rules: J(rulesOut), icons: J(usedIcons),
    dataSource: b.dataSource === "array" ? "array" : "static",
    arraySymbol: b.arraySymbol ? jsStr(wrapSym(b.arraySymbol)) : "''",
    countSymbol: b.countSymbol ? jsStr(wrapSym(b.countSymbol)) : "''",
    arrayCount: Math.max(1, parseInt(b.arrayCount) || 10),
    startIndex: Math.max(0, parseInt(b.startIndex) || 0),
    showIndex: b.showIndex ? "true" : "false",
    search: b.search !== false ? "true" : "false",
    pageSize: Math.max(0, parseInt(b.pageSize) || 0),
    striped: b.striped !== false ? "true" : "false",
    showHeader: b.showHeader !== false ? "true" : "false",
    watchLimit: Math.max(0, parseInt(b.watchLimit) || 30),
    pollMs: Math.max(200, parseInt(b.pollMs) || 1000),
    captionExpr: locExpr(b.captionLoc, b.caption || ""),
  };
}

function emitTable(parent, b) {
  const c = tableBlockConfig(b);
  const core = `// Generische Tabelle (eigenständiges Modul, eigener Lebenszyklus)
(function () {
    var TCOLS = ${c.cols};
    var TROWS = ${c.rows};
    var TRULES = ${c.rules};
    var ICON_SVGS = ${c.icons};
    var DATA_SOURCE = ${jsStr(c.dataSource)}; // 'static' | 'array'
    var ARRAY_SYMBOL = ${c.arraySymbol};
    var COUNT_SYMBOL = ${c.countSymbol};
    var ARRAY_COUNT = ${c.arrayCount};
    var START_INDEX = ${c.startIndex};
    var SHOW_INDEX = ${c.showIndex};
    var SEARCH_ON = ${c.search};
    var PAGE_SIZE = ${c.pageSize}; // 0 = keine Pagination
    var STRIPED = ${c.striped};
    var SHOW_HEADER = ${c.showHeader};
    var WATCH_LIMIT = ${c.watchLimit};
    var POLL_MS = ${c.pollMs};

    var watchers = [], symbols = [], batchSubId = null, renderQueued = false;
    var vals = [];        // vals[zeile][spalte] – Rohwerte
    var rowCount = DATA_SOURCE === 'static' ? TROWS.length : ARRAY_COUNT;
    var dynCount = -1;    // Wert aus COUNT_SYMBOL (-1 = unbenutzt)
    var page = 0, query = '';
    var tbody = null, pageInfo = null, prevBtn = null, nextBtn = null, wrap = null;

    function locT(key, fallback) {
        try { var f = TcHmi.Functions.getFunction('GetLocalizedText'); if (f) { var t = f(key); if (t !== null && t !== undefined && t !== '') return t; } } catch (e) {}
        return fallback || key;
    }
    function bgLumT() {
        var cand = [document.querySelector('.TcHmi_Controls_System_TcHmiView'), document.getElementById('Content'), document.body, document.documentElement];
        for (var i = 0; i < cand.length; i++) { var el = cand[i]; if (!el) continue; var bg = window.getComputedStyle(el).backgroundColor; var m = bg && bg.match(/[0-9.]+/g); if (!m) continue; var r = +m[0], g = +m[1], bl = +m[2], a = m.length > 3 ? +m[3] : 1; if (a < 0.1) continue; return (0.299 * r + 0.587 * g + 0.114 * bl) / 255; }
        return 0.15;
    }
    function palT() {
        if (bgLumT() < 0.5) return { border:'#2a2d3a', headerBg:'#161822', titleColor:'#ffffff', bodyText:'#e0e0e0', boxBg:'#1a1d2e', active:'#22c55e', inactive:'#4b5563', stripe:'rgba(255,255,255,0.04)' };
        return { border:'#d0d4de', headerBg:'#f2f4f8', titleColor:'#1a1d2e', bodyText:'#333333', boxBg:'#ffffff', active:'#16a34a', inactive:'#9ca3af', stripe:'rgba(0,0,0,0.03)' };
    }
    function subscribeT(symbolStr, onChange) {
        try { var sym = new TcHmi.Symbol(symbolStr); symbols.push(sym); watchers.push(sym.watch(function (data) { if (data.error !== TcHmi.Errors.NONE) return; onChange(data.value); })); } catch (e) {}
    }
    function writeT(symbolStr, value) { try { new TcHmi.Symbol(symbolStr).write(value); } catch (e) {} }
    function plainSymT(symbolStr) {
        var plain = symbolStr || '';
        if (plain.indexOf('%s%') === 0) plain = plain.slice(3);
        var suf = '%/s%';
        if (plain.length >= suf.length && plain.slice(-suf.length) === suf) plain = plain.slice(0, -suf.length);
        return plain;
    }
    // Dynamischer Element-Pfad: Array-Symbol + [index] + Member.
    // Bestaetigt per readEx2: Struct-Member nach dem Index werden mit '::' angehaengt
    // (z. B. aAlarmHmi[0]::bTriggered). Member mit fuehrendem '::', '.' oder '[' bleibt
    // unveraendert, sonst wird '::' vorangestellt.
    function dynSym(r, member) {
        var base = plainSymT(ARRAY_SYMBOL) + '[' + (START_INDEX + r) + ']';
        if (member) base += (member.charAt(0) === '.' || member.charAt(0) === ':' || member.charAt(0) === '[') ? member : ('::' + member);
        return '%s%' + base + '%/s%';
    }
    function symFor(r, ci) {
        if (DATA_SOURCE === 'array') return dynSym(r, TCOLS[ci].member);
        var cell = (TROWS[r] || [])[ci];
        return cell && cell.s ? cell.s : '';
    }
    function setVal(r, ci, v) {
        if (!vals[r]) vals[r] = [];
        vals[r][ci] = v;
        queueRender();
    }
    function queueRender() {
        if (renderQueued) return;
        renderQueued = true;
        window.requestAnimationFrame(function () { renderQueued = false; renderBody(); });
    }
    function fmtRead(ci, v) {
        var col = TCOLS[ci];
        if (v === undefined || v === null) return '–';
        var out;
        var num = Number(v);
        if (typeof v !== 'boolean' && v !== '' && !isNaN(num) && isFinite(num)) out = col.dec >= 0 ? num.toFixed(col.dec) : String(v);
        else out = String(v);
        if (col.unit) out += (col.unit === '%' ? col.unit : ' ' + col.unit);
        return out;
    }
    function mapEntry(ci, v) {
        var m = TCOLS[ci].map, sv = String(v === undefined || v === null ? '' : v).trim();
        var svb = (sv === '1' || sv === 'true') ? 'true' : ((sv === '0' || sv === 'false') ? 'false' : null);
        for (var i = 0; i < m.length; i++) {
            if (m[i].v === sv) return m[i];
            if (svb !== null && (m[i].v === svb || ((m[i].v === '1' || m[i].v === 'true') && svb === 'true') || ((m[i].v === '0' || m[i].v === 'false') && svb === 'false'))) return m[i];
        }
        return null;
    }
    function cellSearchText(r, ci) {
        var col = TCOLS[ci], v = vals[r] ? vals[r][ci] : undefined;
        if (col.kind === 'text') { var cell = (TROWS[r] || [])[ci] || {}; return locT(cell.loc, cell.t); }
        if (col.kind === 'read' || col.kind === 'input') return fmtRead(ci, v);
        if (col.kind === 'enum' || col.kind === 'icon') { var e = mapEntry(ci, v); return e ? locT(e.loc, e.label) : String(v === undefined ? '' : v); }
        return '';
    }
    function rowMatches(r, q) {
        if (!q) return true;
        if (SHOW_INDEX && String(START_INDEX + r).indexOf(q) >= 0) return true;
        for (var ci = 0; ci < TCOLS.length; ci++) { if (cellSearchText(r, ci).toLowerCase().indexOf(q) >= 0) return true; }
        return false;
    }
    function cmpT(a, op, v) {
        if (typeof v === 'boolean') { var ab = (a === true || a === 1 || a === '1' || a === 'true'); return op === '!=' ? ab !== v : ab === v; }
        if (typeof v === 'number') {
            var an = Number(a);
            if (isNaN(an)) return false;
            if (op === '==') return an === v; if (op === '!=') return an !== v;
            if (op === '>') return an > v; if (op === '>=') return an >= v;
            if (op === '<') return an < v; if (op === '<=') return an <= v;
            return false;
        }
        var as = String(a === undefined || a === null ? '' : a);
        return op === '!=' ? as !== String(v) : as === String(v);
    }
    function effectiveCount() {
        var n = rowCount;
        if (DATA_SOURCE === 'array') { if (dynCount >= 0 && dynCount < n) n = dynCount; if (n > ARRAY_COUNT) n = ARRAY_COUNT; }
        return n;
    }
    function buildCellEl(r, ci, pp) {
        var col = TCOLS[ci];
        var td = document.createElement('td');
        td.style.cssText = 'padding:6px 10px;border-top:1px solid ' + pp.border + ';font-size:13px;color:' + pp.bodyText + ';white-space:nowrap;'
            + ((col.kind === 'read' || col.kind === 'input') ? 'text-align:right;font-variant-numeric:tabular-nums;' : '');
        var v = vals[r] ? vals[r][ci] : undefined;
        if (col.kind === 'text') {
            var cell = (TROWS[r] || [])[ci] || {};
            td.textContent = locT(cell.loc, cell.t);
        } else if (col.kind === 'read') {
            td.textContent = fmtRead(ci, v);
        } else if (col.kind === 'bool') {
            var led = document.createElement('span');
            var on = (v === true || v === 1 || v === '1' || v === 'true');
            led.style.cssText = 'display:inline-block;width:12px;height:12px;border-radius:50%;background:' + (on ? pp.active : pp.inactive) + ';';
            td.style.textAlign = 'center';
            td.appendChild(led);
        } else if (col.kind === 'check') {
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = (v === true || v === 1 || v === '1' || v === 'true');
            cb.style.cssText = 'width:15px;height:15px;cursor:pointer;';
            cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            cb.addEventListener('change', function () { var s = symFor(r, ci); if (s) writeT(s, cb.checked); });
            td.style.textAlign = 'center';
            td.appendChild(cb);
        } else if (col.kind === 'input') {
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.value = (v === undefined || v === null) ? '' : String(v);
            inp.style.cssText = 'width:80px;padding:3px 6px;border:1px solid ' + pp.border + ';border-radius:5px;background:' + pp.boxBg + ';color:' + pp.bodyText + ';font-size:13px;text-align:right;';
            inp.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            var send = function () {
                var s = symFor(r, ci); if (!s) return;
                var raw = inp.value;
                var num = Number(raw);
                writeT(s, raw !== '' && !isNaN(num) && isFinite(num) ? num : raw);
            };
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { send(); inp.blur(); } });
            inp.addEventListener('blur', send);
            td.appendChild(inp);
        } else if (col.kind === 'button') {
            var btn = document.createElement('button');
            btn.textContent = locT(col.lloc, col.label || 'OK');
            btn.style.cssText = 'padding:4px 12px;border:1px solid ' + pp.border + ';border-radius:6px;background:transparent;color:' + pp.bodyText + ';font-size:12px;font-weight:600;cursor:pointer;';
            btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            btn.onclick = function (e) {
                e.stopPropagation();
                var s = symFor(r, ci); if (!s) return;
                if (col.wmode === 'setFalse') writeT(s, false);
                else if (col.wmode === 'toggle') { var cur = vals[r] ? vals[r][ci] : undefined; writeT(s, !(cur === true || cur === 1 || cur === '1' || cur === 'true')); }
                else if (col.wmode === 'pulse') { writeT(s, true); setTimeout(function () { writeT(s, false); }, col.pms); }
                else writeT(s, true);
            };
            td.style.textAlign = 'center';
            td.appendChild(btn);
        } else if (col.kind === 'enum') {
            var e2 = mapEntry(ci, v);
            var badge = document.createElement('span');
            badge.style.cssText = 'display:inline-block;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;background:' + (e2 ? e2.color : pp.inactive) + ';color:' + (e2 ? e2.text : '#ffffff') + ';';
            badge.textContent = e2 ? locT(e2.loc, e2.label) : (v === undefined || v === null ? '–' : String(v));
            td.style.textAlign = 'center';
            td.appendChild(badge);
        } else if (col.kind === 'icon') {
            var e3 = mapEntry(ci, v);
            if (e3 && ICON_SVGS[e3.icon]) {
                var ic = document.createElement('span');
                ic.style.cssText = 'display:inline-flex;color:' + e3.color + ';vertical-align:middle;';
                ic.innerHTML = ICON_SVGS[e3.icon];
                ic.title = locT(e3.loc, e3.label);
                td.appendChild(ic);
            } else { td.textContent = '–'; }
            td.style.textAlign = 'center';
        }
        return td;
    }
    function renderBody() {
        if (!tbody) return;
        var pp = palT();
        var n = effectiveCount();
        var q = query.toLowerCase();
        var visible = [];
        for (var r = 0; r < n; r++) { if (rowMatches(r, q)) visible.push(r); }
        var pages = PAGE_SIZE > 0 ? Math.max(1, Math.ceil(visible.length / PAGE_SIZE)) : 1;
        if (page >= pages) page = pages - 1;
        if (page < 0) page = 0;
        var slice = PAGE_SIZE > 0 ? visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : visible;
        while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
        slice.forEach(function (r, vi) {
            var tr = document.createElement('tr');
            if (STRIPED && vi % 2 === 1) tr.style.background = pp.stripe;
            if (SHOW_INDEX) {
                var tdIdx = document.createElement('td');
                tdIdx.textContent = String(START_INDEX + r);
                tdIdx.style.cssText = 'padding:6px 10px;border-top:1px solid ' + pp.border + ';font-size:12px;color:' + pp.bodyText + ';opacity:.6;text-align:right;font-variant-numeric:tabular-nums;';
                tr.appendChild(tdIdx);
            }
            var cellEls = [];
            for (var ci = 0; ci < TCOLS.length; ci++) { var td = buildCellEl(r, ci, pp); cellEls.push(td); tr.appendChild(td); }
            for (var ui = 0; ui < TRULES.length; ui++) {
                var rule = TRULES[ui];
                var a = vals[r] ? vals[r][rule.c] : undefined;
                if (!cmpT(a, rule.op, rule.v)) continue;
                if (rule.t === 'row') tr.style.background = rule.color + '22';
                else if (cellEls[rule.c]) cellEls[rule.c].style.background = rule.color + '33';
            }
            tbody.appendChild(tr);
        });
        if (pageInfo) {
            pageInfo.textContent = pages > 1 || PAGE_SIZE > 0 ? ((page + 1) + ' / ' + pages) : '';
            if (prevBtn) prevBtn.disabled = page <= 0;
            if (nextBtn) nextBtn.disabled = page >= pages - 1;
        }
    }

    // ── DOM-Aufbau ──
    var pp0 = palT();
    wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;min-width:0;margin-bottom:16px;';
    var capText = ${c.captionExpr};
    if (capText || SEARCH_ON) {
        var top = document.createElement('div');
        top.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';
        var cap = document.createElement('span');
        cap.style.cssText = 'flex:1 1 auto;font-size:13px;font-weight:600;color:' + pp0.titleColor + ';';
        cap.textContent = capText;
        top.appendChild(cap);
        if (SEARCH_ON) {
            var se = document.createElement('input');
            se.type = 'text';
            se.placeholder = locT('L_Tbl_Search', 'Suchen…');
            se.style.cssText = 'flex:0 0 auto;width:160px;padding:4px 8px;border:1px solid ' + pp0.border + ';border-radius:6px;background:' + pp0.boxBg + ';color:' + pp0.bodyText + ';font-size:12px;';
            se.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            se.addEventListener('input', function () { query = se.value || ''; page = 0; renderBody(); });
            top.appendChild(se);
        }
        wrap.appendChild(top);
    }
    var scroller = document.createElement('div');
    scroller.style.cssText = 'overflow:auto;max-height:60vh;border:1px solid ' + pp0.border + ';border-radius:8px;';
    var tbl = document.createElement('table');
    tbl.style.cssText = 'width:100%;border-collapse:collapse;';
    if (SHOW_HEADER) {
        var thead = document.createElement('thead');
        var hr = document.createElement('tr');
        hr.style.cssText = 'background:' + pp0.headerBg + ';';
        var heads = [];
        if (SHOW_INDEX) heads.push('#');
        TCOLS.forEach(function (col) { heads.push(locT(col.loc, col.header)); });
        heads.forEach(function (h, hi) {
            var th = document.createElement('th');
            th.textContent = h;
            var isIdx = SHOW_INDEX && hi === 0;
            var col0 = TCOLS[SHOW_INDEX ? hi - 1 : hi];
            var right = !isIdx && col0 && (col0.kind === 'read' || col0.kind === 'input');
            th.style.cssText = 'position:sticky;top:0;z-index:1;background:' + pp0.headerBg + ';padding:7px 10px;font-size:12px;font-weight:600;color:' + pp0.titleColor + ';text-align:' + (right || isIdx ? 'right' : 'left') + ';white-space:nowrap;';
            hr.appendChild(th);
        });
        thead.appendChild(hr);
        tbl.appendChild(thead);
    }
    tbody = document.createElement('tbody');
    tbl.appendChild(tbody);
    scroller.appendChild(tbl);
    wrap.appendChild(scroller);
    if (PAGE_SIZE > 0) {
        var pager = document.createElement('div');
        pager.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:6px;';
        var pbStyle = 'padding:2px 10px;border:1px solid ' + pp0.border + ';border-radius:6px;background:transparent;color:' + pp0.bodyText + ';font-size:12px;cursor:pointer;';
        prevBtn = document.createElement('button'); prevBtn.textContent = '‹'; prevBtn.style.cssText = pbStyle;
        nextBtn = document.createElement('button'); nextBtn.textContent = '›'; nextBtn.style.cssText = pbStyle;
        pageInfo = document.createElement('span'); pageInfo.style.cssText = 'font-size:12px;color:' + pp0.bodyText + ';opacity:.75;font-variant-numeric:tabular-nums;';
        prevBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        nextBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        prevBtn.onclick = function (e) { e.stopPropagation(); page -= 1; renderBody(); };
        nextBtn.onclick = function (e) { e.stopPropagation(); page += 1; renderBody(); };
        pager.appendChild(prevBtn); pager.appendChild(pageInfo); pager.appendChild(nextBtn);
        wrap.appendChild(pager);
    }
    ${parent}.appendChild(wrap);

    // ── Datenanbindung ──
    // Beide Modi erzeugen konkrete Element-Symbole und binden sie identisch an:
    //   statisch → im Editor gesetzte Zell-Symbole
    //   array    → arraySymbol[i]::member (per readEx2 bestaetigter Zugriffspfad)
    // Bis WATCH_LIMIT einzelne TcHmi.Symbol.watch (bestaetigt), darueber EINE
    // Server-Subscription (Protokoll-Standard, in diesem Projekt noch nicht per
    // WS-Mitschnitt verifiziert).
    if (DATA_SOURCE === 'array' && COUNT_SYMBOL) subscribeT(COUNT_SYMBOL, function (v) { var n = parseInt(v); dynCount = isNaN(n) ? -1 : n; queueRender(); });
    var bound = [];
    var srcRows = DATA_SOURCE === 'array' ? ARRAY_COUNT : TROWS.length;
    for (var r0 = 0; r0 < srcRows; r0++) {
        for (var c0 = 0; c0 < TCOLS.length; c0++) {
            var k = TCOLS[c0].kind;
            if (k === 'text') continue;
            var needsRead = (k === 'read' || k === 'bool' || k === 'check' || k === 'input' || k === 'enum' || k === 'icon' || (k === 'button' && TCOLS[c0].wmode === 'toggle'));
            var s0 = symFor(r0, c0);
            if (needsRead && s0) bound.push({ r: r0, c: c0, s: s0 });
        }
    }
    if (bound.length <= WATCH_LIMIT) {
        bound.forEach(function (bd) { subscribeT(bd.s, function (v) { setVal(bd.r, bd.c, v); }); });
    } else {
        try {
            TcHmi.Server.requestEx({
                requestType: 'Subscription',
                intervalTime: POLL_MS,
                commands: bound.map(function (bd) { return { symbol: plainSymT(bd.s), commandOptions: ['SendErrorMessage'] }; })
            }, {}, function (data) {
                if (!data || data.error !== TcHmi.Errors.NONE) return;
                var resp = data.response;
                if (!resp || !resp.commands) return;
                if (resp.id != null) batchSubId = resp.id;
                for (var i = 0; i < resp.commands.length && i < bound.length; i++) {
                    var cmd = resp.commands[i];
                    if (cmd.error != null && cmd.error !== 0) continue;
                    var bd = bound[i];
                    if (!vals[bd.r]) vals[bd.r] = [];
                    vals[bd.r][bd.c] = cmd.readValue;
                }
                queueRender();
            });
        } catch (e) {}
    }
    renderBody();

    // Aufräumen beim Schließen des Popups (siehe hideDialog -> teardowns)
    teardowns.push(function () {
        for (var i = 0; i < watchers.length; i++) { try { watchers[i](); } catch (e) {} }
        for (var j = 0; j < symbols.length; j++) { try { symbols[j].destroy(); } catch (e) {} }
        watchers = []; symbols = [];
        if (batchSubId != null) { try { TcHmi.Server.requestEx({ requestType: 'ReadWrite', commands: [{ symbol: 'Unsubscribe', commandOptions: ['SendErrorMessage'], writeValue: batchSubId }] }, {}, function () {}); } catch (e) {} batchSubId = null; }
        tbody = null; wrap = null; pageInfo = null; prevBtn = null; nextBtn = null;
    });
})();`;
  return indentLines(core, I);
}

export { tableBlockConfig, emitTable };
