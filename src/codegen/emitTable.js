import { jsStr, wrapSym, locExpr, indentLines, I, durHelpers } from "./helpers.js";
import { COLORS, ICONS, TABLE_SIZES } from "../constants/palette.js";
import { compileAccess, accessActive } from "../model/access.js";
import { parseTpl } from "../model/locTemplate.js";
import { isNumStr, NUMPAD_FN } from "./emitNumPad.js";
import { tableColDeps } from "../model/tableDeps.js";
import { tableLayoutOf, tableSizeOf, fieldWidthOf, pageAutoOf } from "../model/tableLayout.js";
import { rowClickOf } from "../model/rowClick.js";

const TPL_BOUND_KINDS = ["read", "bool", "check", "input", "enum", "icon"];
const ENUM_DISPLAYS = ["text", "ctext", "dot"];
// Anzeigeformate fuer Lesespalten: 'dur' = TIME (ISO-8601-Dauer) -> HH:MM:SS,
// 'dt' = DATE_AND_TIME wie von der SPS geliefert -> TT.MM.JJJJ hh:mm:ss (ohne Zeitzonen-Umrechnung),
// 'dtl' = DATE_AND_TIME als UTC interpretiert und in Ortszeit des Panels angezeigt.
const READ_FORMATS = ["dur", "dt", "dtl"];

// ── Tabellen-Baustein: eigenständiges Modul (modus-unabhängig, eigene Watches/Subscription) ──
// Datenquellen:
//   'static' – Zell-Symbole einzeln im Editor; bis watchLimit per TcHmi.Symbol.watch (BESTÄTIGT),
//              darüber EINE Server-Subscription mit N Read-Commands (Protokoll-Standard,
//              in diesem Projekt noch NICHT per WS-Mitschnitt verifiziert).
//   'array'  – EIN TcHmi.Symbol.watch auf das ganze PLC-Array (BESTÄTIGTE API); Spalten
//              greifen per Member-Name (JSON-Feldname der Struktur) auf die Zeilenobjekte zu.
const kpLim = (src) => {
  const t = String(src == null ? "" : src).trim();
  if (!t) return null;
  return isNumStr(t) ? { n: Number(t.replace(",", ".")) } : { m: t };
};
// Nachkommastellen je Einheit: "bar=2; °=1; min=1" -> { bar: 2, "°": 1, min: 1 }.
// Trenner ';' oder ',' zwischen Eintraegen, '=' zwischen Einheit und Stellen (0..6).
// Ungueltige Eintraege werden ignoriert; ohne gueltigen Eintrag -> null.
const decMapOf = (src) => {
  const out = {};
  let n = 0;
  String(src == null ? "" : src).split(/[;,]/).forEach((part) => {
    const eq = part.lastIndexOf("=");
    if (eq <= 0) return;
    const unit = part.slice(0, eq).trim();
    const d = parseInt(part.slice(eq + 1).trim(), 10);
    if (!unit || isNaN(d) || d < 0) return;
    out[unit] = Math.min(6, d);
    n++;
  });
  return n ? out : null;
};

function tableBlockConfig(b) {
  const isArr = b.dataSource === "array";
  const touch = tableLayoutOf(b) === "touch";
  // Text-Vorlage -> Teile-Array. {member} wird auf eine sichtbare, ungesperrte Spalte
  // mit demselben Member umgebogen (Wert ist dort ohnehin abonniert); sonst bleibt es
  // eine Member-Referenz und wird separat gelesen (TPL_MEMBERS, nur Array-Modus).
  const tplParts = (src) => parseTpl(src).parts.map((pt) => {
    if (typeof pt === "string" || !pt.m) return pt;
    if (!isArr) return pt;
    const ci = (b.columns || []).findIndex((cc) => TPL_BOUND_KINDS.includes(cc.kind) && !accessActive(cc.access) && (cc.member || "").trim() === pt.m);
    return ci >= 0 ? (pt.p ? { c: ci, p: pt.p } : { c: ci }) : pt;
  });
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
    // sortable nur setzen, wenn aktiv -> Bestands-JSON bleibt byte-identisch
    ...(c.sortable ? { sortable: true } : {}),
    // Eingabe-Typ nur setzen, wenn explizit gewaehlt (time/text/number) -> Bestands-JSON byte-identisch;
    // ohne itype gilt das bisherige Auto-Verhalten (Zahl wenn numerisch, sonst Text).
    ...((c.kind === "input" && (c.inputType === "time" || c.inputType === "text" || c.inputType === "number")) ? { itype: c.inputType } : {}),
    // Keypad (AC_NumPad) nur setzen, wenn aktiv und Zahl/Auto -> Bestands-JSON byte-identisch.
    // kp.min/kp.max: null (keine Grenze) | { n: Zahl } | { m: Member/Geschwister-Variable }
    ...((c.kind === "input" && c.keypad && c.inputType !== "text" && c.inputType !== "time") ? { kp: { min: kpLim(c.kpMin), max: kpLim(c.kpMax) } } : {}),
    // Spalten-Berechtigung nur setzen, wenn aktiv -> Bestands-JSON byte-identisch.
    // acc = { observe?:[Gruppen], operate?:[Gruppen] } (nur aktivierte Rechte).
    ...(accessActive(c.access) ? { acc: compileAccess(c.access) } : {}),
    // Kopf-Icon nur setzen, wenn gewaehlt -> Bestands-JSON bleibt byte-identisch
    ...(ICONS[c.headerIcon] ? { hicon: c.headerIcon, ...((c.headerIconColor || "").trim() ? { hicolor: c.headerIconColor } : {}) } : {}),
    // Button-Funktionsaktion nur setzen, wenn action==='fn' -> Bestands-Buttons byte-identisch
    ...((c.kind === "button" && c.action === "fn") ? {
      action: "fn",
      fnName: (c.fnName || "").trim(),
      psrc: (c.paramSource === "col" || c.paramSource === "index" || c.paramSource === "none") ? c.paramSource : "member",
      pmember: (c.paramMember || "").trim(),
      pcol: (function () { var n = parseInt(c.paramCol); return (isNaN(n) || n < 0) ? -1 : n; })(),
    } : {}),
    // Text-Vorlage (dynamischer Loc-Key je Zeile) nur setzen, wenn gefuellt -> Bestands-JSON byte-identisch.
    //   ltpl = Loc-Key-Teile, ftpl = Fallback-Teile (optional; ohne Fallback wird der Key angezeigt).
    ...((c.kind === "text" && (c.locTpl || "").trim()) ? {
      ltpl: tplParts(c.locTpl),
      ...((c.textTpl || "").trim() ? { ftpl: tplParts(c.textTpl) } : {}),
    } : {}),
    // Enum-Darstellung nur setzen, wenn nicht Badge (Default) -> Bestands-JSON byte-identisch.
    ...((c.kind === "enum" && ENUM_DISPLAYS.includes(c.enumDisplay)) ? { edisp: c.enumDisplay } : {}),
    // Zeilenabhaengige Darstellung (nur Array-Modus, Wert lesen/Eingabe), jeweils nur wenn gesetzt
    // -> Bestands-JSON byte-identisch:
    //   unitm  = Member mit der Einheit je Zeile (ersetzt die feste Einheit)
    //   hasm   = Member (BOOL): Zelle nur anzeigen/bedienbar, wenn TRUE, sonst '–'
    //   decmap = Nachkommastellen je Einheit, sonst gilt dec
    ...((isArr && (c.kind === "read" || c.kind === "input") && (c.unitMember || "").trim()) ? { unitm: c.unitMember.trim() } : {}),
    ...((isArr && (c.kind === "read" || c.kind === "input") && (c.hasMember || "").trim()) ? { hasm: c.hasMember.trim() } : {}),
    ...((isArr && (c.kind === "read" || c.kind === "input") && decMapOf(c.decMap)) ? { decmap: decMapOf(c.decMap) } : {}),
    // Ausgeblendete Spalte: wird gelesen (Filter/Regeln/Sortierung/Parameter/Suche), aber nicht
    // angezeigt. Nur setzen, wenn aktiv -> Bestands-JSON byte-identisch.
    ...(c.hidden ? { hide: true } : {}),
    // Anzeigeformat Dauer/Datum-Zeit (nur Lesespalten). Nur setzen, wenn gewaehlt -> Bestands-JSON byte-identisch.
    ...((c.kind === "read" && READ_FORMATS.includes(c.format)) ? { fmt: c.format } : {}),
    // Touch-Layout: einheitliche Feldbreite (ch) fuer Eingabe UND Keypad-Button einer Spalte.
    // Nur im Touch-Layout gesetzt -> kompakte Bestandstabellen byte-identisch.
    ...((touch && c.kind === "input") ? { fw: fieldWidthOf(c, isArr) } : {}),
    // Textspalte kuerzen + per Tippen aufklappen: clamp = max. Breite in ch, 0 = Restbreite der
    // Tabelle. Nur setzen, wenn aktiv -> Bestands-JSON byte-identisch.
    //   cmin = Mindestbreite in ch (Standard 4, hoechstens clamp), Spalte wird nie schmaler.
    ...((c.kind === "text" && c.clamp) ? (function () {
      var n = parseInt(c.clampWidth); var w = (isNaN(n) || n < 1) ? 0 : Math.min(200, n);
      var m = parseInt(c.clampMin); var mn = (isNaN(m) || m < 1) ? 4 : Math.min(200, m);
      if (w && mn > w) mn = w;
      return { clamp: w, cmin: mn };
    })() : {}),
  }));
  // Member, die nur fuer Text-Vorlagen zusaetzlich gelesen werden muessen
  const tplMembers = [];
  if (isArr) colsOut.forEach((c) => [].concat(c.ltpl || [], c.ftpl || []).forEach((pt) => {
    if (pt && typeof pt === "object" && pt.m && tplMembers.indexOf(pt.m) < 0) tplMembers.push(pt.m);
  }));
  // Member fuer zeilenabhaengige Einheit/Vorhanden-Kennbit (je Zeile mitgelesen)
  const rowMembers = [];
  colsOut.forEach((c) => [c.unitm, c.hasm].forEach((m) => { if (m && rowMembers.indexOf(m) < 0) rowMembers.push(m); }));
  const rowsOut = (b.dataSource === "array") ? [] : (b.rows || []).map((r) =>
    (b.columns || []).map((c, ci) => {
      const cl = (r.cells || [])[ci] || {};
      return { s: cl.symbol ? wrapSym(cl.symbol) : "", t: cl.text || "", loc: (cl.loc || "").trim() };
    }));
  // Nur tatsächlich genutzte Icon-SVGs einbetten
  const usedIcons = {};
  colsOut.forEach((c) => { if (c.kind === "icon") c.map.forEach((e) => { usedIcons[e.icon] = ICONS[e.icon].svg; }); if (c.hicon && ICONS[c.hicon]) usedIcons[c.hicon] = ICONS[c.hicon].svg; });
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
  // Sichtbarkeitsregeln (Zeilenfilter): Zeile nur zeigen, wenn ALLE Regeln erfuellt sind.
  // op 'notEmpty' = nicht leer/null/'' ; 'notZero' = nicht 0 und nicht leer ; sonst
  // Standard-Operator gegen v. Nur setzen, wenn Regeln existieren (Golden-neutral).
  const filtersOut = (b.rowFilters || []).map((u) => ({
    c: Math.max(0, parseInt(u.colIndex) || 0),
    op: (u.op === "notEmpty" || u.op === "notZero") ? u.op : (u.op || "!="),
    v: parseRuleVal(u.value),
  }));
  const J = (o) => JSON.stringify(o, null, 4);
  return {
    colsArr: colsOut, tplMembers, rowMembers,
    cols: J(colsOut), rows: J(rowsOut), rules: J(rulesOut), icons: J(usedIcons),
    filters: J(filtersOut),
    dataSource: b.dataSource === "array" ? "array" : "static",
    arraySymbol: b.arraySymbol ? jsStr(wrapSym(b.arraySymbol)) : "''",
    countSymbol: b.countSymbol ? jsStr(wrapSym(b.countSymbol)) : "''",
    arrayCount: Math.max(1, parseInt(b.arrayCount) || 10),
    startIndex: Math.max(0, parseInt(b.startIndex) || 0),
    showIndex: b.showIndex ? "true" : "false",
    search: b.search !== false ? "true" : "false",
    // Zeilen pro Seite automatisch: Startwert = Minimum (Pager wird dadurch immer aufgebaut)
    pageSize: pageAutoOf(b) ? pageAutoOf(b).min : Math.max(0, parseInt(b.pageSize) || 0),
    striped: b.striped !== false ? "true" : "false",
    showHeader: b.showHeader !== false ? "true" : "false",
    watchLimit: Math.max(0, parseInt(b.watchLimit) || 30),
    pollMs: Math.max(200, parseInt(b.pollMs) || 1000),
    captionExpr: locExpr(b.captionLoc, b.caption || ""),
    defaultSortCol: (function () {
      var n = parseInt(b.defaultSortCol);
      if (isNaN(n) || n < 0 || n >= colsOut.length) return -1;
      return n;
    })(),
    defaultSortDir: b.defaultSortDir === "desc" ? "desc" : "asc",
    // Zeilenklick -> Funktion (null = aus)
    rowClick: rowClickOf(b),
  };
}

function emitTable(parent, b) {
  const c = tableBlockConfig(b);
  // ── Darstellung: 'touch' (Groessenstufe aus TABLE_SIZES als CSS-Variablen am Wrapper) oder
  // 'compact' (bisherige Literal-Styles, byte-identisch). tv(kompakt, touch) waehlt je Stelle.
  const touch = tableLayoutOf(b) === "touch";
  const TS = TABLE_SIZES[tableSizeOf(b)];
  const tv = (compact, touchSrc) => (touch ? touchSrc : compact);
  const sizeVars = `--ac-fs:${TS.fs}px;--ac-hfs:${TS.hfs}px;--ac-rh:${TS.rh}px;--ac-ctl:${TS.ctl}px;--ac-led:${TS.led}px;--ac-pb:${TS.pb}px;--ac-pfs:${TS.pfs}px;`;
  // Eingabe-Typen der Spalten: bestimmen, ob Zeit-Helfer eingebettet werden und
  // ob die (byte-neutrale) erweiterte Zell-Input-Logik statt der Original-Variante
  // erzeugt wird. Ohne getypte Input-Spalte bleibt der Modul-Text byte-identisch.
  const cols0 = b.columns || [];
  const hasTime = cols0.some((cc) => cc.kind === "input" && cc.inputType === "time");
  const hasTypedInput = cols0.some((cc) => cc.kind === "input" && (cc.inputType === "time" || cc.inputType === "text" || cc.inputType === "number"));
  const timeHelpers = hasTime ? durHelpers("") + "\n" : "";
  // Text-Vorlagen / Enum-Darstellung: Zusatzlogik nur erzeugen, wenn genutzt
  // (sonst bleibt der Modul-Text byte-identisch -> Golden Master unveraendert).
  const hasTpl = c.colsArr.some((cc) => cc.ltpl);
  const hasTplMembers = c.tplMembers.length > 0;
  const hasEnumDisp = c.colsArr.some((cc) => cc.edisp);
  // Gekuerzte Textspalten (clamp): Zusatzlogik nur erzeugen, wenn genutzt (Golden-neutral).
  const hasClamp = c.colsArr.some((cc) => cc.clamp !== undefined);
  // Zeilen pro Seite automatisch (Phase 6): Zusatzlogik nur erzeugen, wenn gewaehlt (Golden-neutral).
  const pageAuto = pageAutoOf(b);
  const autoDecl = pageAuto ? `\n    var PAGE_AUTO = ${JSON.stringify(pageAuto)}; // Zeilen pro Seite aus verfuegbarer Hoehe: min/max Zeilen, Zeilenhoehe rhMin..rhMax (0 = gemessen)\n    var autoRO = null, autoQueued = false, autoRowH = 0;` : "";
  const autoHelpers = pageAuto ? `    // ── Zeilen pro Seite automatisch: verfuegbare Hoehe ausnutzen ──
    // Eingebettet: Hoehe des scrollenden Elternelements (Embed-Body) ab Tabellenanfang, abzueglich
    // Kopfzeile, Pager und Abstand -> Tabelle sollte der letzte Baustein sein. Popup: 60vh wie der Scroller.
    // Zeilenzahl = Hoehe / Mindest-Zeilenhoehe (Touch: Groessenstufe; kompakt: kleinste gemessene Zeile),
    // begrenzt auf PAGE_AUTO.min..max. Touch verteilt den Rest bis rhMax auf die Zeilen (--ac-rh am tbody,
    // damit die Kopfzeile nicht mitwaechst). Beim Wechsel bleibt der erste sichtbare Datensatz sichtbar.
    function scrollParentT(el) {
        var n = el ? el.parentNode : null;
        while (n && n.nodeType === 1) {
            var cs = window.getComputedStyle(n);
            if (cs && (cs.overflowY === 'auto' || cs.overflowY === 'scroll')) return n;
            n = n.parentNode;
        }
        return null;
    }
    function autoArea() {
        if (!tbody || !wrap) return 0;
        var thH = (typeof thead !== 'undefined' && thead) ? thead.getBoundingClientRect().height : 0;
        var pgH = (typeof pager !== 'undefined' && pager) ? pager.getBoundingClientRect().height + 8 : 0;
        if (typeof AC_EMBED !== 'undefined' && AC_EMBED) {
            var sp = scrollParentT(wrap);
            if (!sp) return 0;
            var pb = parseFloat(window.getComputedStyle(sp).paddingBottom) || 0;
            var off = scroller.getBoundingClientRect().top - sp.getBoundingClientRect().top + sp.scrollTop;
            return Math.floor(sp.clientHeight - pb - off - thH - pgH - 16 - 2) - 1; // 1 px Reserve gegen Rundung
        }
        return Math.floor(window.innerHeight * 0.6 - thH - 2) - 1;
    }
    function autoFit() {
        autoQueued = false;
        if (!tbody) return;
        var area = autoArea();
        if (!(area > 0)) return;
        var rhMin = PAGE_AUTO.rhMin;
        if (!rhMin) {
            var rs = tbody.children;
            for (var i = 0; i < rs.length; i++) { var h = Math.ceil(rs[i].getBoundingClientRect().height); if (h > 0 && (!rhMin || h < rhMin)) rhMin = h; } // aufgerundet: Bruchteil-Pixel duerfen nicht ueberlaufen
            if (!rhMin) return; // noch keine Zeile zum Messen
        }
        var n = Math.floor(area / rhMin);
        if (n < PAGE_AUTO.min) n = PAGE_AUTO.min;
        if (n > PAGE_AUTO.max) n = PAGE_AUTO.max;
        var rh = 0;
        if (PAGE_AUTO.rhMax) { rh = Math.floor(area / n); if (rh < PAGE_AUTO.rhMin) rh = PAGE_AUTO.rhMin; if (rh > PAGE_AUTO.rhMax) rh = PAGE_AUTO.rhMax; }
        if (n === PAGE_SIZE && rh === autoRowH) return;
        var first = page * PAGE_SIZE;
        PAGE_SIZE = n;
        page = Math.floor(first / n);
        if (rh && rh !== autoRowH) { autoRowH = rh; tbody.style.setProperty('--ac-rh', rh + 'px'); }
        renderBody();
    }
    function queueAutoFit() {
        if (autoQueued) return;
        autoQueued = true;
        window.requestAnimationFrame(autoFit);
    }
` : "";
  const clampDecl = hasClamp ? `\n    var expanded = {};    // aufgeklappte Textzellen: expanded['zeile:spalte'] (Datenzeile -> ueberlebt Neuaufbau, Sortieren, Blaettern)\n    var clampEls = [];    // gekuerzte Zellen der aktuellen Seite (fuer die Pfeil-Anzeige nach dem Einfuegen)` : "";
  const clampHelpers = hasClamp ? `    // ── Gekuerzte Textzellen: einzeilig mit Ellipse, Tippen klappt mehrzeilig auf (mehrere gleichzeitig) ──
    // col.clamp = max. Breite in ch; 0 = Restbreite (td width:100% + max-width:0). col.cmin = Mindestbreite in ch:
    // so viele Zeichen bleiben mindestens sichtbar (+1ch fuer die Ellipse, +1.2em Pfeil, +20px Zellen-Padding).
    function clampMinW(col, pad) { return 'calc(' + (col.cmin + 1) + 'ch + 1.2em' + (pad ? ' + 20px' : '') + ')'; }
    // Der Zustand liegt in expanded[] statt im DOM, weil renderBody() bei jeder Wertaenderung neu aufbaut.
    var CL_CLOSED = String.fromCharCode(9656), CL_OPEN = String.fromCharCode(9662);
    function clampText(td, r, ci) {
        var col = TCOLS[ci];
        var key = r + ':' + ci;
        var open = expanded[key] === true;
        var txt = td.textContent;
        td.textContent = '';
        if (!col.clamp) { td.style.width = '100%'; td.style.maxWidth = '0'; }
        td.style.minWidth = clampMinW(col, true);
        td.style.whiteSpace = 'normal';
        var box = document.createElement('div');
        box.style.cssText = 'display:flex;align-items:flex-start;gap:6px;min-width:' + clampMinW(col, false) + ';' + (col.clamp ? 'max-width:' + col.clamp + 'ch;' : '');
        var tx = document.createElement('span');
        tx.textContent = txt;
        tx.style.cssText = 'flex:1 1 auto;min-width:0;' + (open ? 'white-space:pre-wrap;overflow-wrap:anywhere;' : 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;');
        var ind = document.createElement('span');
        ind.textContent = open ? CL_OPEN : CL_CLOSED;
        ind.style.cssText = 'flex:0 0 auto;opacity:.55;font-size:.8em;line-height:1.6;';
        box.appendChild(tx);
        box.appendChild(ind);
        td.appendChild(box);
        td.style.touchAction = 'manipulation';
        td.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        td.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!expanded[key] && !(tx.scrollWidth > tx.clientWidth + 1)) return; // passt vollstaendig -> nichts aufzuklappen
            if (expanded[key]) delete expanded[key]; else expanded[key] = true;
            renderBody();
        });
        clampEls.push({ td: td, tx: tx, ind: ind, open: open });
    }
    // Nach dem Einfuegen: Pfeil/Cursor nur bei tatsaechlich gekuerztem oder aufgeklapptem Text
    function clampCheck() {
        for (var i = 0; i < clampEls.length; i++) {
            var ce = clampEls[i];
            var cut = ce.open || ce.tx.scrollWidth > ce.tx.clientWidth + 1;
            ce.ind.style.visibility = cut ? 'visible' : 'hidden';
            ce.td.style.cursor = cut ? 'pointer' : '';
            if (cut && !ce.open) ce.tx.title = ce.tx.textContent;
        }
        clampEls = [];
    }
` : "";
  // Zeilenklick -> Funktion: Zusatzlogik nur erzeugen, wenn aktiv (Golden-neutral).
  const rowClick = c.rowClick;
  const hasRowClick = !!rowClick;
  const rowClickDecl = hasRowClick ? `\n    var ROW_CLICK = ${JSON.stringify(rowClick)}; // Zeilenklick: AC_HMI[fn](Parameter); psrc member/col/index/none; mark = angetippte Zeile markieren\n    var rowSel = null;    // Schluessel (Parameterwert) der markierten Zeile – haengt am Datensatz, nicht an der Position\n    var press = null;     // laufender Tipp auf eine Zeile: { key, p, x, y, tr }` : "";
  const rowClickHelpers = hasRowClick ? `    // ── Zeilenklick: Tippen auf eine Datenzeile ruft TcHmi.Functions.AC_HMI[ROW_CLICK.fn](Parameter) ──
    // Der Parameter wird beim Antippen (pointerdown) festgehalten: baut die Tabelle bis zum Loslassen neu auf
    // (Wertaenderung, verschobenes Array), gilt trotzdem der Datensatz, den der Bediener gesehen hat.
    // Bedienzellen (Button, Eingabe, Checkbox, Keypad) und gekuerzte Textzellen loesen keinen Zeilenklick aus.
    function rowKey(r) {
        if (ROW_CLICK.psrc === 'none') return 'r' + r;
        var p = resolveParam(r, ROW_CLICK);
        return (p === undefined || p === null || p === '') ? null : String(p);
    }
    function rowOfT(el) {
        for (var n = el; n && n !== tbody; n = n.parentNode) { if (String(n.tagName || '').toUpperCase() === 'TR') return n; }
        return null;
    }
    function isCtlTarget(el, tr) {
        for (var n = el; n && n !== tr; n = n.parentNode) {
            var t = String(n.tagName || '').toUpperCase();
            if (t === 'BUTTON' || t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA' || t === 'A') return true;
            if (t === 'TD' && n.querySelectorAll && n.querySelectorAll('button, input, select, textarea').length) return true; // Bedienzelle: auch das Tippen neben das Element
        }
        return false;
    }
    function rowClicked(pr) {
        var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions && TcHmi.Functions.AC_HMI) ? TcHmi.Functions.AC_HMI : null;
        var fn = fns ? fns[ROW_CLICK.fn] : null;
        if (typeof fn !== 'function') { if (window.console) console.warn('Tabelle: Zeilenklick-Funktion AC_HMI.' + ROW_CLICK.fn + ' nicht geladen.'); return; }
        if (ROW_CLICK.mark) { rowSel = pr.key; renderBody(); }
        try { if (ROW_CLICK.psrc === 'none') fn(); else fn(pr.p); } catch (e) {}
    }
    function endPress() { if (press && press.tr) press.tr.style.opacity = ''; press = null; }
    function bindRowClick(tr, r, pp) {
        tr.style.cursor = 'pointer';
        tr.style.touchAction = 'manipulation';
        var key = (ROW_CLICK.mark || press) ? rowKey(r) : null;
        if (ROW_CLICK.mark && rowSel !== null && key === rowSel) {
            tr.style.background = pp.active + '24';
            tr.style.boxShadow = 'inset 4px 0 0 ' + pp.active;
        }
        if (press && key !== null && press.key === key) { tr.style.opacity = '.6'; press.tr = tr; }
    }
` : "";
  const rowClickBind = hasRowClick ? `
    // Zeilenklick: Ereignisse am (bleibenden) tbody, nicht an den bei jedem Update neu gebauten Zeilen
    tbody.addEventListener('pointerdown', function (e) {
        endPress();
        var tr = rowOfT(e.target);
        if (!tr || tr._acRow === undefined || isCtlTarget(e.target, tr)) return;
        var key = rowKey(tr._acRow);
        if (key === null) return; // Parameter (noch) ohne Wert
        press = { key: key, p: ROW_CLICK.psrc === 'none' ? undefined : resolveParam(tr._acRow, ROW_CLICK), x: e.clientX, y: e.clientY, tr: tr };
        tr.style.opacity = '.6';
    });
    tbody.addEventListener('pointerup', function (e) {
        var pr = press;
        endPress();
        if (!pr) return;
        if (Math.abs((e.clientX || 0) - (pr.x || 0)) > 12 || Math.abs((e.clientY || 0) - (pr.y || 0)) > 12) return; // gewischt/gezogen
        rowClicked(pr);
    });
    tbody.addEventListener('pointercancel', endPress); // z. B. Scrollen per Touch
    tbody.addEventListener('pointerleave', endPress);` : "";
  // Anzeigeformate Dauer/Datum-Zeit fuer Lesespalten (Golden-neutral).
  const hasFmt = c.colsArr.some((cc) => cc.fmt);
  const hasDurFmt = c.colsArr.some((cc) => cc.fmt === "dur");
  const fmtHelpers = hasFmt ? `    // ── Anzeigeformate Lesespalten: Dauer (TIME) und Datum/Zeit (DATE_AND_TIME) ──
    // TIME kommt als ISO-8601-Dauer ('PT1H2M3.5S'), DATE_AND_TIME als ISO-Zeitstempel ('2026-10-19T08:12:00').
    // Zahlen: TIME = Millisekunden, DATE_AND_TIME = Sekunden seit 1970.
    //   'dur' -> HH:MM:SS (DEZIMALEN = Sekundenbruchteile, Standard ganze Sekunden)
    //   'dt'  -> TT.MM.JJJJ hh:mm:ss wie geliefert (keine Zeitzonen-Umrechnung)
    //   'dtl' -> als UTC gelesen, in Ortszeit des Panels angezeigt
    function durSec(v) {
        if (v === undefined || v === null || v === '') return null;
        if (typeof v === 'number') return isFinite(v) ? v / 1000 : null;
        var s = String(v).trim().toUpperCase();
        if (s.charAt(0) !== 'P') { var n0 = Number(s); return (s !== '' && isFinite(n0)) ? n0 / 1000 : null; }
        var tot = 0, num = '', inTime = false;
        for (var k = 1; k < s.length; k++) {
            var ch = s.charAt(k);
            if (ch === 'T') { inTime = true; num = ''; continue; }
            if (ch === '.' || ch === ',') { num += '.'; continue; }
            if (ch >= '0' && ch <= '9') { num += ch; continue; }
            var val = parseFloat(num || '0'); num = '';
            if (ch === 'W') tot += val * 604800;
            else if (ch === 'D') tot += val * 86400;
            else if (ch === 'H') tot += val * 3600;
            else if (ch === 'M') { if (inTime) tot += val * 60; }
            else if (ch === 'S') tot += val;
        }
        return tot;
    }
    function p2T(n) { return (n < 10 ? '0' : '') + n; }
    function fmtDur(v, dec) {
        var sec = durSec(v);
        if (sec === null) return (v === undefined || v === null || v === '') ? '–' : String(v);
        var neg = sec < 0;
        var d = dec > 0 ? Math.min(3, dec) : 0, f = Math.pow(10, d);
        var tot = Math.round((neg ? -sec : sec) * f);  // ganze Einheiten von 1/f Sekunden
        var h = Math.floor(tot / (3600 * f)), m = Math.floor((tot % (3600 * f)) / (60 * f)), sf = tot % (60 * f);
        var ss = d ? (sf / f).toFixed(d) : String(sf);
        if (sf < 10 * f) ss = '0' + ss;
        return (neg ? '-' : '') + p2T(h) + ':' + p2T(m) + ':' + ss;
    }
    function fmtDT(v, local) {
        if (v === undefined || v === null || v === '') return '–';
        var dt, utc = false;
        if (typeof v === 'number') { dt = new Date(v * 1000); utc = !local; }
        else {
            var s = String(v).trim();
            if (!local) {
                var y = s.slice(0, 4), mo = s.slice(5, 7), dd = s.slice(8, 10);
                if (s.charAt(4) !== '-' || s.charAt(7) !== '-' || isNaN(Number(y + mo + dd))) return s;
                var out = dd + '.' + mo + '.' + y;
                if (s.length >= 16 && (s.charAt(10) === 'T' || s.charAt(10) === ' ')) out += ' ' + s.slice(11, 16) + (s.charAt(16) === ':' ? s.slice(16, 19) : '');
                return out;
            }
            var last = s.charAt(s.length - 1);
            var zoned = last === 'Z' || last === 'z' || s.lastIndexOf('+') > 10 || s.lastIndexOf('-') > 10;
            dt = new Date(zoned ? s : s + 'Z');
        }
        if (isNaN(dt.getTime())) return String(v);
        var a = utc ? [dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear(), dt.getUTCHours(), dt.getUTCMinutes(), dt.getUTCSeconds()]
                    : [dt.getDate(), dt.getMonth() + 1, dt.getFullYear(), dt.getHours(), dt.getMinutes(), dt.getSeconds()];
        return p2T(a[0]) + '.' + p2T(a[1]) + '.' + a[2] + ' ' + p2T(a[3]) + ':' + p2T(a[4]) + ':' + p2T(a[5]);
    }
    function fmtSpecial(col, v) { return col.fmt === 'dur' ? fmtDur(v, col.dec) : fmtDT(v, col.fmt === 'dtl'); }
` : "";
  const fmtHookRead = hasFmt ? `\n        if (col.fmt) return fmtSpecial(col, v);` : "";
  const fmtHookParts = hasFmt ? `\n        if (col.fmt) return { n: fmtSpecial(col, v), u: '' };` : "";
  const sortFmtSrc = hasDurFmt ? `\n        if (col.fmt === 'dur') { var dsec = durSec(vals[r] ? vals[r][ci] : undefined); return dsec === null ? undefined : dsec; }` : "";
  const pmemberRowSrc = hasRowClick ? `\n        if (ROW_CLICK.psrc === 'member' && ROW_CLICK.pmember) pmembers[ROW_CLICK.pmember] = true; // Zeilenklick-Parameter` : "";
  const tplHelpers = hasTpl ? `    // ── Text-Vorlagen: Loc-Key je Zeile aus Literalen + Zellwerten zusammensetzen ──
    // Teil: 'Text' | { c: Spalte } | { m: Member } | { x: 1 } (Zeilenindex), optional p = Stellen (fuehrende Nullen).
    // Fehlt ein referenzierter Wert noch (PLC liefert nach), wird '–' angezeigt.
    function tplVal(r, pt) {
        if (typeof pt === 'string') return pt;
        var v;
        if (pt.x) v = START_INDEX + r;
        else if (pt.m) v = tplVals[pt.m] ? tplVals[pt.m][r] : undefined;
        else v = vals[r] ? vals[r][pt.c] : undefined;
        if (v === undefined || v === null) return null;
        var s = String(v).trim();
        if (pt.p) {
            var n = Number(s);
            if (s !== '' && !isNaN(n) && isFinite(n) && n >= 0 && Math.floor(n) === n) { s = String(n); while (s.length < pt.p) s = '0' + s; }
        }
        return s;
    }
    function tplStr(r, parts) {
        var out = '';
        for (var i = 0; i < parts.length; i++) { var s = tplVal(r, parts[i]); if (s === null) return null; out += s; }
        return out;
    }
    function tplText(r, col) {
        var key = tplStr(r, col.ltpl);
        if (key === null) return '–';
        var fb = col.ftpl ? tplStr(r, col.ftpl) : null;
        return locT(key, fb !== null && fb !== '' ? fb : key);
    }
` : "";
  const tplValsDecl = hasTpl ? `\n    var tplVals = {};     // tplVals[member][zeile] – nur fuer Text-Vorlagen gelesene Member (Array-Modus)` : "";
  const searchTextSrc = hasTpl
    ? `if (col.kind === 'text') { if (col.ltpl) return tplText(r, col); var cell = (TROWS[r] || [])[ci] || {}; return locT(cell.loc, cell.t); }`
    : `if (col.kind === 'text') { var cell = (TROWS[r] || [])[ci] || {}; return locT(cell.loc, cell.t); }`;
  const textCellSrc = hasTpl
    ? `            if (col.ltpl) { td.textContent = tplText(r, col); } else {
                var cell = (TROWS[r] || [])[ci] || {};
                td.textContent = locT(cell.loc, cell.t);
            }`
    : `            var cell = (TROWS[r] || [])[ci] || {};
            td.textContent = locT(cell.loc, cell.t);`;
  const enumCellSrc = hasEnumDisp
    ? `            var e2 = mapEntry(ci, v);
            var etx = e2 ? locT(e2.loc, e2.label) : (v === undefined || v === null ? '–' : String(v));
            if (col.edisp === 'text') {
                td.textContent = etx;
            } else if (col.edisp === 'ctext') {
                td.textContent = etx;
                if (e2) { td.style.color = e2.color; td.style.fontWeight = '600'; }
            } else if (col.edisp === 'dot') {
                var dot = document.createElement('span');
                dot.style.cssText = 'display:inline-block;${tv("width:11px;height:11px;", "width:.65em;height:.65em;")}border-radius:50%;margin-right:8px;vertical-align:middle;background:' + (e2 ? e2.color : pp.inactive) + ';';
                var dtx = document.createElement('span');
                dtx.style.verticalAlign = 'middle';
                dtx.textContent = etx;
                td.appendChild(dot);
                td.appendChild(dtx);
            } else {
                var badge = document.createElement('span');
                badge.style.cssText = 'display:inline-block;${tv("padding:2px 10px;border-radius:10px;font-size:16px;", "padding:4px 12px;border-radius:12px;font-size:var(--ac-hfs);")}font-weight:600;background:' + (e2 ? e2.color : pp.inactive) + ';color:' + (e2 ? e2.text : '#ffffff') + ';';
                badge.textContent = etx;
                td.style.textAlign = 'center';
                td.appendChild(badge);
            }`
    : `            var e2 = mapEntry(ci, v);
            var badge = document.createElement('span');
            badge.style.cssText = 'display:inline-block;${tv("padding:2px 10px;border-radius:10px;font-size:16px;", "padding:4px 12px;border-radius:12px;font-size:var(--ac-hfs);")}font-weight:600;background:' + (e2 ? e2.color : pp.inactive) + ';color:' + (e2 ? e2.text : '#ffffff') + ';';
            badge.textContent = e2 ? locT(e2.loc, e2.label) : (v === undefined || v === null ? '–' : String(v));
            td.style.textAlign = 'center';
            td.appendChild(badge);`;
  const tplMembersSrc = hasTplMembers ? `
    // ── Text-Vorlagen: zusaetzlich gelesene Struct-Member ──
    // Member aus {member}-Referenzen, die keine eigene (sichtbare) Spalte haben, werden
    // je Zeile per Element-Pfad (dynSym) separat abonniert; Aenderung -> neu zeichnen.
    var TPL_MEMBERS = ${JSON.stringify(c.tplMembers)};
    if (DATA_SOURCE === 'array') {
        TPL_MEMBERS.forEach(function (member) {
            if (!tplVals[member]) tplVals[member] = [];
            for (var tr0 = 0; tr0 < ARRAY_COUNT; tr0++) {
                (function (rr) {
                    subscribeT(dynSym(rr, member), function (v) { tplVals[member][rr] = v; queueRender(); });
                })(tr0);
            }
        });
    }` : "";
  // Spalten-Berechtigungen: nur wenn mind. eine Spalte access hat, wird die
  // Sichtbarkeits-/Bedien-Logik erzeugt. acAllowed() stammt aus dem Popup-Body-
  // Scope (accessHelperSrc, eingebettet sobald irgendein Element Rechte nutzt).
  // COL_VIS/COL_OP werden EINMAL beim Aufbau ausgewertet (Gruppen des Users
  // aendern sich zur Popup-Laufzeit nicht). observe-Deny = Spalte gar nicht
  // rendern/binden; operate-Deny = Bedienelemente der Zelle deaktivieren.
  const hasColAccess = cols0.some((cc) => accessActive(cc.access));
  // Ausgeblendete Spalten (col.hide): weiterhin gebunden und durchsuchbar, aber ohne
  // Kopf-/Datenzelle. COL_SHOW = angezeigt (nicht ausgeblendet UND observe erlaubt).
  // Ohne ausgeblendete Spalte bleibt der Modul-Text byte-identisch (COL_VIS wie bisher).
  const hasHide = c.colsArr.some((cc) => cc.hide);
  const showArr = hasHide ? "COL_SHOW" : "COL_VIS";
  // observe-gesperrte Spalten, von denen Filter/Regeln/Sortierung/Button-Parameter/
  // Text-Vorlagen abhaengen, werden trotzdem gelesen (sonst z. B. Filter 'notZero' ->
  // alle Zeilen weg, Parameter null). Angezeigt/durchsucht werden sie weiterhin nicht.
  const colDeps = tableColDeps(b);
  const obsDep = c.colsArr.map((cc, i) => !!(cc.acc && cc.acc.observe) && colDeps[i].length > 0);
  const hasObsDep = hasColAccess && obsDep.some(Boolean);
  const colVisDecl = (hasColAccess
    ? `\n    var COL_VIS = TCOLS.map(function (col) { return !col.acc || acAllowed(col.acc.observe); });\n    var COL_OP = TCOLS.map(function (col) { return !col.acc || acAllowed(col.acc.operate); });`
    : "")
    + (hasHide
      ? (hasColAccess
        ? `\n    var COL_SHOW = TCOLS.map(function (col, i) { return !col.hide && COL_VIS[i]; }); // angezeigt: nicht ausgeblendet und observe erlaubt`
        : `\n    var COL_SHOW = TCOLS.map(function (col) { return !col.hide; }); // ausgeblendete Spalten: gelesen, nicht angezeigt`)
      : "")
    + (hasObsDep ? `\n    var COL_DEP = ${JSON.stringify(obsDep)}; // observe-gesperrt, aber benoetigt (Filter/Regel/Sortierung/Parameter/Vorlage) -> trotzdem lesen` : "");
  const bindSkip = hasColAccess ? (hasObsDep ? ` if (!COL_VIS[c0] && !COL_DEP[c0]) continue;` : ` if (!COL_VIS[c0]) continue;`) : "";
  const headSkip = (hasColAccess || hasHide) ? ` if (!isIdx && col0 && !${showArr}[colIdx]) return;` : "";
  const searchColSkip = hasColAccess ? `if (!COL_VIS[ci]) continue; ` : "";
  const bodyCellLoop = hasColAccess
    ? `for (var ci = 0; ci < TCOLS.length; ci++) { if (!${showArr}[ci]) { cellEls.push(null); continue; } var td = buildCellEl(r, ci, pp); if (!COL_OP[ci]) { var __oe = td.querySelectorAll('button, input, select, textarea'); for (var __oi = 0; __oi < __oe.length; __oi++) __oe[__oi].disabled = true; td.style.opacity = '0.55'; } cellEls.push(td); tr.appendChild(td); }`
    : (hasHide
      ? `for (var ci = 0; ci < TCOLS.length; ci++) { if (!COL_SHOW[ci]) { cellEls.push(null); continue; } var td = buildCellEl(r, ci, pp); cellEls.push(td); tr.appendChild(td); }`
      : `for (var ci = 0; ci < TCOLS.length; ci++) { var td = buildCellEl(r, ci, pp); cellEls.push(td); tr.appendChild(td); }`);
  // Zeilenabhaengige Einheit/Nachkommastellen/Vorhanden: Zusatzlogik nur erzeugen,
  // wenn eine Spalte unitm/hasm/decmap nutzt (sonst Modul-Text byte-identisch).
  const hasRowFmt = c.colsArr.some((cc) => cc.unitm || cc.hasm || cc.decmap);
  const rArg = hasRowFmt ? ", r" : "";
  const xValsDecl = hasRowFmt ? `\n    var xVals = {};       // xVals[member][zeile] – zeilenabhaengige Einheit/Kennbits (Array-Modus)` : "";
  const fmtReadSrc = hasRowFmt
    ? `    // Zahl und Einheit getrennt (Einheit/Nachkommastellen ggf. je Zeile, siehe rowUnit/rowDec).
    // r === undefined -> Spalten-Einstellung (z. B. Aufrufe ohne Zeilenbezug).
    function fmtParts(ci, v, r) {
        var col = TCOLS[ci];
        if (r !== undefined && !rowHas(r, col)) return { n: '–', u: '' };
        if (v === undefined || v === null) return { n: '–', u: '' };${fmtHookParts}
        var unit = r !== undefined ? rowUnit(r, col) : col.unit;
        var dec = rowDec(col, unit);
        var num = Number(v);
        if (typeof v !== 'boolean' && v !== '' && !isNaN(num) && isFinite(num)) return { n: dec >= 0 ? num.toFixed(dec) : String(v), u: unit };
        return { n: String(v), u: unit };
    }
    function fmtRead(ci, v, r) {
        var f = fmtParts(ci, v, r);
        if (f.n === '–') return f.n;
        return f.u ? f.n + (f.u === '%' ? f.u : ' ' + f.u) : f.n;
    }`
    : `    function fmtRead(ci, v) {
        var col = TCOLS[ci];
        if (v === undefined || v === null) return '–';${fmtHookRead}
        var out;
        var num = Number(v);
        if (typeof v !== 'boolean' && v !== '' && !isNaN(num) && isFinite(num)) out = col.dec >= 0 ? num.toFixed(col.dec) : String(v);
        else out = String(v);
        if (col.unit) out += (col.unit === '%' ? col.unit : ' ' + col.unit);
        return out;
    }`;
  const rowFmtHelpers = hasRowFmt ? `    // ── Zeilenabhaengige Darstellung: Einheit, Nachkommastellen, Vorhanden-Kennbit ──
    //   col.unitm  -> Einheit aus Struct-Member der Zeile (sonst col.unit)
    //   col.decmap -> Nachkommastellen je Einheit (sonst col.dec)
    //   col.hasm   -> BOOL-Member: FALSE/noch unbekannt = Zelle zeigt '–', keine Eingabe
    function xGet(m, r) { return xVals[m] ? xVals[m][r] : undefined; }
    function setX(m, r, v) { if (!xVals[m]) xVals[m] = []; xVals[m][r] = v; queueRender(); }
    function rowHas(r, col) {
        if (!col.hasm) return true;
        var b = xGet(col.hasm, r);
        return b === true || b === 1 || b === '1' || b === 'true';
    }
    function rowUnit(r, col) {
        if (!col.unitm) return col.unit;
        var u = xGet(col.unitm, r);
        return (u === undefined || u === null) ? '' : String(u).trim();
    }
    function rowDec(col, unit) {
        if (col.decmap && unit && Object.prototype.hasOwnProperty.call(col.decmap, unit)) return col.decmap[unit];
        return col.dec;
    }
    // Wert in eine Zelle/einen Button schreiben. Mit unitm: Zahl und Einheit in eigenen
    // Spans, Einheit mit fester Mindestbreite -> Zahlen stehen buendig untereinander.
    function putVal(el, ci, v, r) {
        var col = TCOLS[ci];
        if (!col.unitm) { el.textContent = fmtRead(ci, v, r); return; }
        var f = fmtParts(ci, v, r);
        el.textContent = '';
        var ns = document.createElement('span');
        ns.textContent = f.n;
        el.appendChild(ns);
        var us = document.createElement('span');
        us.textContent = f.u;
        us.style.cssText = 'display:inline-block;min-width:3.2em;margin-left:.3em;text-align:left;opacity:.75;';
        el.appendChild(us);
    }
` : "";
  const naCellSrc = hasRowFmt ? `
        if (col.hasm && !rowHas(r, col)) {
            td.textContent = '–';
            td.style.textAlign = 'center';
            td.style.color = pp.inactive;
            return td;
        }` : "";
  const readCellSrc = hasRowFmt ? `putVal(td, ci, v, r);` : `td.textContent = fmtRead(ci, v);`;
  const kpBtnTextSrc = hasRowFmt ? `putVal(kb, ci, v, r);` : `kb.textContent = fmtRead(ci, v);`;
  const kpUnitDecSrc = hasRowFmt ? `unit: rowUnit(r, col), decimals: rowDec(col, rowUnit(r, col))` : `unit: col.unit, decimals: col.dec`;
  const sortNaSrc = hasRowFmt ? `\n        if ((col.kind === 'read' || col.kind === 'input') && !rowHas(r, col)) return undefined;` : "";
  const xBindSrc = hasRowFmt ? `
    // Zeilenabhaengige Einheit/Kennbits: Member je Zeile auf demselben Weg wie die Zellen lesen
    var XMEMBERS = ${JSON.stringify(c.rowMembers)};
    if (DATA_SOURCE === 'array') XMEMBERS.forEach(function (m) { for (var xr = 0; xr < ARRAY_COUNT; xr++) bound.push({ r: xr, c: -1, m: m, s: dynSym(xr, m) }); });` : "";
  const watchSetSrc = hasRowFmt ? `if (bd.m) setX(bd.m, bd.r, v); else setVal(bd.r, bd.c, v);` : `setVal(bd.r, bd.c, v);`;
  const batchXSrc = hasRowFmt ? `
                    if (bd.m) { if (!xVals[bd.m]) xVals[bd.m] = []; xVals[bd.m][bd.r] = cmd.readValue; continue; }` : "";
  // Keypad-Spalten (AC_NumPad): Zusatzlogik nur erzeugen, wenn genutzt (Golden-neutral).
  const hasKeypad = c.colsArr.some((cc) => cc.kp);
  const kpHelpers = hasKeypad ? `    // ── Keypad (${NUMPAD_FN}): Zelle oeffnet das Zahleneingabe-Popup ──
    // Grenzwerte je Zeile: feste Zahl oder Geschwister-Member derselben Struktur.
    //   Array-Modus: ARRAY[START_INDEX + r]::<member>
    //   statisch:    Zellsymbol, letzter Pfadteil (nach '::' bzw. '.') durch <member> ersetzt
    function siblingSym(s, m) {
        var plain = plainSymT(s);
        var a = plain.lastIndexOf('::'), d = plain.lastIndexOf('.');
        var cut = a > d ? a : d;
        if (cut < 0) return '';
        var lead = m.charAt(0);
        return '%s%' + plain.slice(0, cut) + ((lead === '.' || lead === ':') ? m : (a > d ? '::' : '.') + m) + '%/s%';
    }
    function kpLimit(r, ci, lim) {
        if (!lim) return null;
        if (lim.n !== undefined) return lim.n;
        if (DATA_SOURCE === 'array') return dynSym(r, lim.m);
        var s = symFor(r, ci);
        var sib = s ? siblingSym(s, lim.m) : '';
        return sib || NaN; // nicht ableitbar -> NaN -> ${NUMPAD_FN} sperrt OK
    }
    function kpTitle(r, ci) {
        var col = TCOLS[ci];
        var t = locT(col.loc, col.header);
        for (var k = 0; k < TCOLS.length; k++) {
            if (TCOLS[k].kind !== 'text') continue;
            var name = cellSearchText(r, k);
            if (name && name !== '–') return t ? t + ' – ' + name : name;
            break;
        }
        if (DATA_SOURCE === 'array') return (t ? t + ' ' : '') + '[' + (START_INDEX + r) + ']';
        return t;
    }
    function openPadT(r, ci) {
        var col = TCOLS[ci];
        var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions) ? TcHmi.Functions.AC_HMI : null;
        var f = fns ? fns.${NUMPAD_FN} : null;
        if (typeof f !== 'function') { if (window.console) console.warn('${NUMPAD_FN}: Funktionsdatei nicht geladen.'); return; }
        var s = symFor(r, ci); if (!s) return;
        f({ symbol: s, min: kpLimit(r, ci, col.kp.min), max: kpLimit(r, ci, col.kp.max), ${kpUnitDecSrc}, title: kpTitle(r, ci) });
    }
` : "";
  const kpCellSrc = hasKeypad ? `        } else if (col.kind === 'input' && col.kp) {
            var kb = document.createElement('button');
            kb.type = 'button';
            ${kpBtnTextSrc}
            kb.style.cssText = ${tv("'min-width:80px;padding:3px 8px;", "'width:' + col.fw + 'ch;min-height:calc(var(--ac-rh) - 16px);box-sizing:content-box;padding:3px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation;")}border:1px solid ' + pp.border + ';border-radius:5px;background:' + pp.boxBg + ';color:' + pp.bodyText + ';${tv("font-size:18px;", "font-size:var(--ac-fs);")}text-align:right;font-variant-numeric:tabular-nums;cursor:pointer;';
            kb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            kb.onclick = function (e) { e.stopPropagation(); if (kb.disabled) return; openPadT(r, ci); };
            td.appendChild(kb);
` : "";
  const inputCellSrc = hasTypedInput
    ? `            var inp = document.createElement('input');
            var itype = col.itype || '';
            inp.type = 'text';
            inp.value = (v === undefined || v === null) ? '' : (itype === 'time' ? durToHMS(v) : String(v));
            inp.style.cssText = ${tv("'width:80px;padding:3px 6px;", "'width:' + col.fw + 'ch;height:calc(var(--ac-rh) - 16px);box-sizing:content-box;padding:3px 10px;font-variant-numeric:tabular-nums;")}border:1px solid ' + pp.border + ';border-radius:5px;background:' + pp.boxBg + ';color:' + pp.bodyText + ';${tv("font-size:18px;", "font-size:var(--ac-fs);")}text-align:' + (itype === 'time' ? 'center' : 'right') + ';';
            if (itype === 'time') inp.placeholder = 'HH:MM:SS';
            inp.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            var send = function () {
                var s = symFor(r, ci); if (!s) return;
                var raw = inp.value;
                if (itype === 'time') { writeT(s, hmsToDur(raw)); return; }
                if (itype === 'text') { writeT(s, raw); return; }
                var num = Number(raw);
                if (itype === 'number') { if (raw !== '' && !isNaN(num) && isFinite(num)) writeT(s, num); return; }
                writeT(s, raw !== '' && !isNaN(num) && isFinite(num) ? num : raw);
            };
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { send(); inp.blur(); } });
            inp.addEventListener('blur', send);
            td.appendChild(inp);`
    : `            var inp = document.createElement('input');
            inp.type = 'text';
            inp.value = (v === undefined || v === null) ? '' : String(v);
            inp.style.cssText = ${tv("'width:80px;padding:3px 6px;", "'width:' + col.fw + 'ch;height:calc(var(--ac-rh) - 16px);box-sizing:content-box;padding:3px 10px;font-variant-numeric:tabular-nums;")}border:1px solid ' + pp.border + ';border-radius:5px;background:' + pp.boxBg + ';color:' + pp.bodyText + ';${tv("font-size:18px;", "font-size:var(--ac-fs);")}text-align:right;';
            inp.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            var send = function () {
                var s = symFor(r, ci); if (!s) return;
                var raw = inp.value;
                var num = Number(raw);
                writeT(s, raw !== '' && !isNaN(num) && isFinite(num) ? num : raw);
            };
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { send(); inp.blur(); } });
            inp.addEventListener('blur', send);
            td.appendChild(inp);`;
  // Touch-Pager: zusaetzliche Buttons
  const pagerVarsSrc = tv(``, `
    var firstBtn = null, lastBtn = null; // Touch-Pager: erste/letzte Seite`);
  // Checkbox-Zelle: Touch -> groesser, ganze Zelle tippbar
  const checkCellSrc = tv(`            cb.style.cssText = 'width:18px;height:18px;cursor:pointer;';
            cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            cb.addEventListener('change', function () { var s = symFor(r, ci); if (s) writeT(s, cb.checked); });
`, `            cb.style.cssText = 'width:var(--ac-ctl);height:var(--ac-ctl);margin:0;vertical-align:middle;cursor:pointer;accent-color:' + pp.active + ';';
            cb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            cb.addEventListener('change', function () { var s = symFor(r, ci); if (s) writeT(s, cb.checked); });
            // Touch: ganze Zelle ist Trefferflaeche; operate-Sperre greift ueber cb.disabled
            td.style.cursor = 'pointer';
            td.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            td.addEventListener('click', function (e) { if (e.target === cb || cb.disabled) return; cb.checked = !cb.checked; var s = symFor(r, ci); if (s) writeT(s, cb.checked); });
`);
  // Pager-Zustand: Touch -> auch erste/letzte + Abdimmen
  const pagerUpdSrc = tv(`            if (prevBtn) prevBtn.disabled = page <= 0;
            if (nextBtn) nextBtn.disabled = page >= pages - 1;
`, `            if (prevBtn) prevBtn.disabled = page <= 0;
            if (nextBtn) nextBtn.disabled = page >= pages - 1;
            if (firstBtn) firstBtn.disabled = page <= 0;
            if (lastBtn) lastBtn.disabled = page >= pages - 1;
            [firstBtn, prevBtn, nextBtn, lastBtn].forEach(function (pb) { if (pb) pb.style.opacity = pb.disabled ? '.35' : '1'; });
`);
  // Pager: Touch -> grosse Tastflaechen + erste/letzte Seite
  const pagerSrc = tv(`        pager.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:6px;';
        var pbStyle = 'padding:2px 10px;border:1px solid ' + pp0.border + ';border-radius:6px;background:transparent;color:' + pp0.bodyText + ';font-size:16px;cursor:pointer;';
        prevBtn = document.createElement('button'); prevBtn.textContent = '‹'; prevBtn.style.cssText = pbStyle; prevBtn.setAttribute('data-ac-view', '1');
        nextBtn = document.createElement('button'); nextBtn.textContent = '›'; nextBtn.style.cssText = pbStyle; nextBtn.setAttribute('data-ac-view', '1');
        pageInfo = document.createElement('span'); pageInfo.style.cssText = 'font-size:16px;color:' + pp0.bodyText + ';opacity:.75;font-variant-numeric:tabular-nums;';
        prevBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        nextBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        prevBtn.onclick = function (e) { e.stopPropagation(); page -= 1; renderBody(); };
        nextBtn.onclick = function (e) { e.stopPropagation(); page += 1; renderBody(); };
        pager.appendChild(prevBtn); pager.appendChild(pageInfo); pager.appendChild(nextBtn);
`, `        // Touch-Pager: Tastflaechen var(--ac-pb) (mind. 40-52 px), erste/letzte Seite, Seitenanzeige mittig
        pager.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:8px;';
        var pbStyle = 'width:var(--ac-pb);height:var(--ac-pb);padding:0;display:inline-flex;align-items:center;justify-content:center;border:1px solid ' + pp0.border + ';border-radius:8px;background:transparent;color:' + pp0.bodyText + ';font-size:var(--ac-pfs);line-height:1;cursor:pointer;touch-action:manipulation;';
        var mkPb = function (txt, title, go) {
            var bt = document.createElement('button');
            bt.type = 'button'; bt.textContent = txt; bt.title = title; bt.style.cssText = pbStyle; bt.setAttribute('data-ac-view', '1');
            bt.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            bt.onclick = function (e) { e.stopPropagation(); if (bt.disabled) return; go(); renderBody(); };
            return bt;
        };
        firstBtn = mkPb('«', locT('L_Tbl_First', 'Erste Seite'), function () { page = 0; });
        prevBtn = mkPb('‹', locT('L_Tbl_Prev', 'Vorherige Seite'), function () { page -= 1; });
        nextBtn = mkPb('›', locT('L_Tbl_Next', 'Nächste Seite'), function () { page += 1; });
        lastBtn = mkPb('»', locT('L_Tbl_Last', 'Letzte Seite'), function () { page = 1e9; }); // renderBody begrenzt auf letzte Seite
        pageInfo = document.createElement('span'); pageInfo.style.cssText = 'min-width:4.5em;text-align:center;font-size:var(--ac-pfs);color:' + pp0.bodyText + ';opacity:.8;font-variant-numeric:tabular-nums;';
        pager.appendChild(firstBtn); pager.appendChild(prevBtn); pager.appendChild(pageInfo); pager.appendChild(nextBtn); pager.appendChild(lastBtn);
`);
  const core = `// Generische Tabelle (eigenständiges Modul, eigener Lebenszyklus)
(function () {
    var TCOLS = ${c.cols};
    var TROWS = ${c.rows};
    var TRULES = ${c.rules};
    var TFILTERS = ${c.filters};
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
    var DEFAULT_SORT_COL = ${c.defaultSortCol}; // -1 = keine Standardsortierung
    var DEFAULT_SORT_DIR = ${jsStr(c.defaultSortDir)}; // 'asc' | 'desc'

    var watchers = [], symbols = [], batchSubId = null, renderQueued = false;
    var vals = [];        // vals[zeile][spalte] – Rohwerte
    var paramVals = {};   // paramVals[member][zeile] – versteckte Button-Funktionsparameter (Array-Modus)
    var rowCount = DATA_SOURCE === 'static' ? TROWS.length : ARRAY_COUNT;
    var dynCount = -1;    // Wert aus COUNT_SYMBOL (-1 = unbenutzt)
    var page = 0, query = '';
    var sortCol = DEFAULT_SORT_COL, sortDir = DEFAULT_SORT_DIR; // aktive Sortierung
    var tbody = null, pageInfo = null, prevBtn = null, nextBtn = null, wrap = null;${pagerVarsSrc}
    var sortThs = []; // { el: <span Pfeil>, col: <Spaltenindex> } je sortierbarer Kopfzelle${colVisDecl}${tplValsDecl}${xValsDecl}${clampDecl}${autoDecl}${rowClickDecl}

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
    // Auto-Typisierung: numerisch, wenn der Rohwert eine endliche Zahl ist; sonst String.
    // Bool bleibt Bool. undefined/null -> null (Funktion entscheidet selbst).
    function autoType(v) {
        if (v === undefined || v === null) return null;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v;
        var s = String(v).trim();
        var n = Number(s);
        if (s !== '' && !isNaN(n) && isFinite(n)) return n;
        return v;
    }
    // Button-Funktionsparameter fuer Zeile r ermitteln (nur bei col.action==='fn').
    //   psrc 'member' -> versteckter Array-Member aus paramVals (Array-Modus)
    //   psrc 'col'    -> Wert einer sichtbaren Spalte (vals[r][pcol])
    //   psrc 'index'  -> Zeilenindex START_INDEX + r
    //   psrc 'none'   -> kein Parameter (undefined)
    function resolveParam(r, col) {
        if (col.psrc === 'index') return START_INDEX + r;
        if (col.psrc === 'none') return undefined;
        if (col.psrc === 'col') { var pc = col.pcol; return autoType((pc >= 0 && vals[r]) ? vals[r][pc] : undefined); }
        // 'member' (Default): versteckter Kanal
        var m = col.pmember;
        var store = m ? paramVals[m] : null;
        return autoType(store ? store[r] : undefined);
    }
    function callColFn(r, ci) {
        var col = TCOLS[ci];
        var name = col.fnName;
        if (!name) return;
        var fns = (typeof TcHmi !== 'undefined' && TcHmi.Functions && TcHmi.Functions.AC_HMI) ? TcHmi.Functions.AC_HMI : null;
        var fn = fns ? fns[name] : null;
        if (typeof fn !== 'function') return; // still fehlschlagen wie die Schreibpfade
        var param = resolveParam(r, col);
        try { if (col.psrc === 'none') fn(); else fn(param); } catch (e) {}
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
${fmtReadSrc}
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
        ${searchTextSrc}
        if (col.kind === 'read' || col.kind === 'input') return fmtRead(ci, v${rArg});
        if (col.kind === 'enum' || col.kind === 'icon') { var e = mapEntry(ci, v); return e ? locT(e.loc, e.label) : String(v === undefined ? '' : v); }
        return '';
    }
    function rowMatches(r, q) {
        if (!q) return true;
        if (SHOW_INDEX && String(START_INDEX + r).indexOf(q) >= 0) return true;
        for (var ci = 0; ci < TCOLS.length; ci++) { ${searchColSkip}if (cellSearchText(r, ci).toLowerCase().indexOf(q) >= 0) return true; }
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
    // Zeilenfilter: Zeile ist nur sichtbar, wenn ALLE Filterregeln erfuellt sind.
    // Werte werden zur Laufzeit geprueft (kein Cache) — billig gegenueber den
    // Subscriptions und immer korrekt, auch wenn die PLC Zeilen spaeter fuellt.
    function isEmptyVal(a) {
        if (a === undefined || a === null) return true;
        if (typeof a === 'string') return a.trim() === '';
        return false;
    }
    function isZeroVal(a) {
        if (isEmptyVal(a)) return true;
        var n = Number(a);
        return !isNaN(n) && isFinite(n) && n === 0;
    }
    function passesFilters(r) {
        if (!TFILTERS.length) return true;
        for (var i = 0; i < TFILTERS.length; i++) {
            var f = TFILTERS[i];
            var a = vals[r] ? vals[r][f.c] : undefined;
            if (f.op === 'notEmpty') { if (isEmptyVal(a)) return false; }
            else if (f.op === 'notZero') { if (isZeroVal(a)) return false; }
            else { if (!cmpT(a, f.op, f.v)) return false; }
        }
        return true;
    }
    function effectiveCount() {
        var n = rowCount;
        if (DATA_SOURCE === 'array') { if (dynCount >= 0 && dynCount < n) n = dynCount; if (n > ARRAY_COUNT) n = ARRAY_COUNT; }
        return n;
    }
${tplHelpers}${timeHelpers}${rowFmtHelpers}${fmtHelpers}${kpHelpers}${clampHelpers}${autoHelpers}${rowClickHelpers}    function buildCellEl(r, ci, pp) {
        var col = TCOLS[ci];
        var td = document.createElement('td');
        td.style.cssText = '${tv("padding:6px 10px;", "padding:4px 10px;height:var(--ac-rh);box-sizing:border-box;vertical-align:middle;")}border-top:1px solid ' + pp.border + ';${tv("font-size:18px;", "font-size:var(--ac-fs);")}color:' + pp.bodyText + ';white-space:nowrap;'
            + ((col.kind === 'read' || col.kind === 'input') ? 'text-align:right;font-variant-numeric:tabular-nums;' : '');
        var v = vals[r] ? vals[r][ci] : undefined;${naCellSrc}
        if (col.kind === 'text') {
${textCellSrc}${hasClamp ? "\n            if (col.clamp !== undefined) clampText(td, r, ci);" : ""}
        } else if (col.kind === 'read') {
            ${readCellSrc}
        } else if (col.kind === 'bool') {
            var led = document.createElement('span');
            var on = (v === true || v === 1 || v === '1' || v === 'true');
            led.style.cssText = 'display:inline-block;${tv("width:15px;height:15px;", "width:var(--ac-led);height:var(--ac-led);vertical-align:middle;")}border-radius:50%;background:' + (on ? pp.active : pp.inactive) + ';'${tv("", " + (on ? 'box-shadow:0 0 6px ' + pp.active + ';' : '')")};
            td.style.textAlign = 'center';
            td.appendChild(led);
        } else if (col.kind === 'check') {
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = (v === true || v === 1 || v === '1' || v === 'true');
${checkCellSrc}            td.style.textAlign = 'center';
            td.appendChild(cb);
${kpCellSrc}        } else if (col.kind === 'input') {
${inputCellSrc}
        } else if (col.kind === 'button') {
            var btn = document.createElement('button');
            btn.textContent = locT(col.lloc, col.label || 'OK');
            btn.style.cssText = '${tv("padding:4px 12px;", "min-width:var(--ac-pb);min-height:calc(var(--ac-rh) - 8px);padding:4px 14px;touch-action:manipulation;")}border:1px solid ' + pp.border + ';border-radius:6px;background:transparent;color:' + pp.bodyText + ';${tv("font-size:16px;", "font-size:var(--ac-hfs);")}font-weight:600;cursor:pointer;';
            btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            btn.onclick = function (e) {
                e.stopPropagation();
                if (col.action === 'fn') { callColFn(r, ci); return; }
                var s = symFor(r, ci); if (!s) return;
                if (col.wmode === 'setFalse') writeT(s, false);
                else if (col.wmode === 'toggle') { var cur = vals[r] ? vals[r][ci] : undefined; writeT(s, !(cur === true || cur === 1 || cur === '1' || cur === 'true')); }
                else if (col.wmode === 'pulse') { writeT(s, true); setTimeout(function () { writeT(s, false); }, col.pms); }
                else writeT(s, true);
            };
            td.style.textAlign = 'center';
            td.appendChild(btn);
        } else if (col.kind === 'enum') {
${enumCellSrc}
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
    // Sortierschluessel je Zeile fuer die aktive Spalte: text -> lokalisierter Text,
    // sonst der Rohwert. Wird typrichtig verglichen (Zahl/Bool/String).
    function sortValue(r, ci) {
        var col = TCOLS[ci];${sortNaSrc}${sortFmtSrc}
        if (col.kind === 'text') return cellSearchText(r, ci);
        return vals[r] ? vals[r][ci] : undefined;
    }
    // Boolartig, wenn die Spalte bool/check ist ODER (icon) nur true/false abbildet.
    // Solche Werte kommen aus der PLC als true/false, 1/0 oder '1'/'0'/'true'/'false'.
    function isBoolCol(ci) {
        var k = TCOLS[ci].kind;
        return k === 'bool' || k === 'check';
    }
    function toBool01(v) {
        return (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;
    }
    function cmpSort(a, b, ci) {
        var ua = (a === undefined || a === null), ub = (b === undefined || b === null);
        if (ua && ub) return 0;
        if (ua) return 1;   // leere Werte immer ans Ende
        if (ub) return -1;
        // Boolartige Spalte: beide Werte einheitlich auf 0/1 normalisieren
        if (isBoolCol(ci) || typeof a === 'boolean' || typeof b === 'boolean') {
            return toBool01(a) - toBool01(b);
        }
        var na = Number(a), nb = Number(b);
        var numA = (a !== '' && !isNaN(na) && isFinite(na));
        var numB = (b !== '' && !isNaN(nb) && isFinite(nb));
        if (numA && numB) return na - nb;
        var sa = String(a), sb = String(b);
        return sa < sb ? -1 : (sa > sb ? 1 : 0);
    }
    function sortVisible(list) {
        var dir = sortDir === 'desc' ? -1 : 1;
        list.sort(function (ra, rb) {
            var d = cmpSort(sortValue(ra, sortCol), sortValue(rb, sortCol), sortCol);
            if (d !== 0) return dir * d;
            return ra - rb; // stabil: bei Gleichstand Zeilenreihenfolge behalten
        });
    }
    function toggleSort(ci) {
        if (sortCol === ci) { sortDir = (sortDir === 'asc') ? 'desc' : 'asc'; }
        else { sortCol = ci; sortDir = 'asc'; }
        page = 0;
        updateSortIndicators();
        renderBody();
    }
    var ARR_UP = String.fromCharCode(9650), ARR_DN = String.fromCharCode(9660), ARR_NEUTRAL = String.fromCharCode(9652);
    function updateSortIndicators() {
        for (var i = 0; i < sortThs.length; i++) {
            var s = sortThs[i];
            if (s.col === sortCol) { s.el.textContent = sortDir === 'desc' ? ARR_DN : ARR_UP; s.el.style.opacity = '.9'; }
            else { s.el.textContent = ARR_NEUTRAL; s.el.style.opacity = '.3'; }
        }
    }
    function renderBody() {
        if (!tbody) return;
        var pp = palT();
        var n = effectiveCount();
        var q = query.toLowerCase();
        var visible = [];
        for (var r = 0; r < n; r++) { if (passesFilters(r) && rowMatches(r, q)) visible.push(r); }
        if (sortCol >= 0 && sortCol < TCOLS.length) sortVisible(visible);
        var pages = PAGE_SIZE > 0 ? Math.max(1, Math.ceil(visible.length / PAGE_SIZE)) : 1;
        if (page >= pages) page = pages - 1;
        if (page < 0) page = 0;
        var slice = PAGE_SIZE > 0 ? visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : visible;
        while (tbody.firstChild) tbody.removeChild(tbody.firstChild);${hasClamp ? "\n        clampEls = [];" : ""}
        slice.forEach(function (r, vi) {
            var tr = document.createElement('tr');
            if (STRIPED && vi % 2 === 1) tr.style.background = pp.stripe;${hasRowClick ? "\n            tr._acRow = r; bindRowClick(tr, r, pp);" : ""}
            if (SHOW_INDEX) {
                var tdIdx = document.createElement('td');
                tdIdx.textContent = String(START_INDEX + r);
                tdIdx.style.cssText = '${tv("padding:6px 10px;", "padding:4px 10px;height:var(--ac-rh);box-sizing:border-box;vertical-align:middle;")}border-top:1px solid ' + pp.border + ';${tv("font-size:16px;", "font-size:var(--ac-hfs);")}color:' + pp.bodyText + ';opacity:.6;text-align:right;font-variant-numeric:tabular-nums;';
                tr.appendChild(tdIdx);
            }
            var cellEls = [];
            ${bodyCellLoop}
            for (var ui = 0; ui < TRULES.length; ui++) {
                var rule = TRULES[ui];
                var a = vals[r] ? vals[r][rule.c] : undefined;
                if (!cmpT(a, rule.op, rule.v)) continue;
                if (rule.t === 'row') tr.style.background = rule.color + '22';
                else if (cellEls[rule.c]) cellEls[rule.c].style.background = rule.color + '33';
            }
            tbody.appendChild(tr);
        });${hasClamp ? "\n        clampCheck();" : ""}${pageAuto ? "\n        queueAutoFit(); // Zeilenzahl/-hoehe pruefen (z. B. erste gemessene Zeile, geaenderte Hoehe)" : ""}
        if (pageInfo) {
            pageInfo.textContent = pages > 1 || PAGE_SIZE > 0 ? ((page + 1) + ' / ' + pages) : '';
${pagerUpdSrc}        }
    }

    // ── DOM-Aufbau ──
    var pp0 = palT();
    wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;width:100%;min-width:0;margin-bottom:16px;${touch ? sizeVars : ""}';
    var capText = ${c.captionExpr};
    if (capText || SEARCH_ON) {
        var top = document.createElement('div');
        top.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';
        var cap = document.createElement('span');
        cap.style.cssText = 'flex:1 1 auto;${tv("font-size:18px;", "font-size:var(--ac-fs);")}font-weight:600;color:' + pp0.titleColor + ';';
        cap.textContent = capText;
        top.appendChild(cap);
        if (SEARCH_ON) {
            var se = document.createElement('input');
            se.type = 'text';
            se.placeholder = locT('L_Tbl_Search', 'Suchen…');
            se.style.cssText = '${tv("flex:0 0 auto;width:160px;padding:4px 8px;", "flex:0 1 auto;width:220px;min-width:120px;height:var(--ac-pb);box-sizing:border-box;padding:4px 10px;")}border:1px solid ' + pp0.border + ';border-radius:6px;background:' + pp0.boxBg + ';color:' + pp0.bodyText + ';${tv("font-size:16px;", "font-size:var(--ac-hfs);")}';
            se.setAttribute('data-ac-view', '1'); // Ansichtssteuerung: bleibt bei operate-Deny nutzbar
            se.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            se.addEventListener('input', function () { query = se.value || ''; page = 0; renderBody(); });
            top.appendChild(se);
        }
        wrap.appendChild(top);
    }
    var scroller = document.createElement('div');
    var scrollerMaxH = (typeof AC_EMBED !== 'undefined' && AC_EMBED) ? '' : 'max-height:60vh;';
    scroller.style.cssText = 'overflow:auto;' + scrollerMaxH + 'border:1px solid ' + pp0.border + ';border-radius:8px;';
    var tbl = document.createElement('table');
    tbl.style.cssText = 'width:100%;border-collapse:collapse;';
    if (SHOW_HEADER) {
        var thead = document.createElement('thead');
        var hr = document.createElement('tr');
        hr.style.cssText = 'background:' + pp0.headerBg + ';';
        var heads = [];
        if (SHOW_INDEX) heads.push('#');
        TCOLS.forEach(function (col) { heads.push(locT(col.loc, col.header)); });
        sortThs = [];
        heads.forEach(function (h, hi) {
            var th = document.createElement('th');
            var isIdx = SHOW_INDEX && hi === 0;
            var colIdx = SHOW_INDEX ? hi - 1 : hi;
            var col0 = TCOLS[colIdx];${headSkip}
            var right = !isIdx && col0 && (col0.kind === 'read' || col0.kind === 'input');
            var canSort = !isIdx && col0 && col0.sortable === true;
            var hIcon = !isIdx && col0 && col0.hicon && ICON_SVGS[col0.hicon];
            th.style.cssText = 'position:sticky;top:0;z-index:1;background:' + pp0.headerBg + ';${tv("padding:7px 10px;font-size:16px;", "padding:6px 10px;height:var(--ac-rh);box-sizing:border-box;vertical-align:middle;font-size:var(--ac-hfs);")}font-weight:600;color:' + pp0.titleColor + ';text-align:' + (right || isIdx ? 'right' : 'left') + ';white-space:nowrap;' + (canSort ? 'cursor:pointer;user-select:none;' : '');${hasClamp ? "\n            if (!isIdx && col0 && col0.clamp !== undefined) { th.style.overflow = 'hidden'; th.style.textOverflow = 'ellipsis'; th.title = h; th.style.minWidth = clampMinW(col0, true); if (col0.clamp) th.style.maxWidth = col0.clamp + 'ch'; else { th.style.width = '100%'; th.style.maxWidth = '0'; } }" : ""}
            if (hIcon) {
                var inner = document.createElement('span');
                inner.style.cssText = 'display:inline-flex;align-items:center;gap:6px;vertical-align:middle;justify-content:' + (right || isIdx ? 'flex-end' : 'flex-start') + ';';
                var hico = document.createElement('span');
                hico.style.cssText = 'display:inline-flex;line-height:0;flex:0 0 auto;color:' + (col0.hicolor || pp0.titleColor) + ';';
                hico.innerHTML = ICON_SVGS[col0.hicon];
                var _hsv = hico.querySelector('svg'); if (_hsv) { _hsv.setAttribute('width', '1em'); _hsv.setAttribute('height', '1em'); }
                inner.appendChild(hico);
                var labh = document.createElement('span');
                labh.textContent = h;
                inner.appendChild(labh);
                th.appendChild(inner);
                if (canSort) {
                    var arrh = document.createElement('span');
                    arrh.style.cssText = 'display:inline-block;margin-left:5px;${tv("font-size:10px;", "font-size:.75em;")}opacity:.55;';
                    inner.appendChild(arrh);
                    sortThs.push({ el: arrh, col: colIdx });
                    th.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                    (function (idx) { th.onclick = function (e) { e.stopPropagation(); toggleSort(idx); }; })(colIdx);
                }
            } else if (canSort) {
                var lab = document.createElement('span');
                lab.textContent = h;
                var arr = document.createElement('span');
                arr.style.cssText = 'display:inline-block;margin-left:5px;${tv("font-size:10px;", "font-size:.75em;")}opacity:.55;';
                th.appendChild(lab);
                th.appendChild(arr);
                sortThs.push({ el: arr, col: colIdx });
                th.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
                (function (idx) { th.onclick = function (e) { e.stopPropagation(); toggleSort(idx); }; })(colIdx);
            } else {
                th.textContent = h;
            }
            hr.appendChild(th);
        });
        thead.appendChild(hr);
        tbl.appendChild(thead);
    }
    updateSortIndicators();
    tbody = document.createElement('tbody');${rowClickBind}
    tbl.appendChild(tbody);
    scroller.appendChild(tbl);
    wrap.appendChild(scroller);
    if (PAGE_SIZE > 0) {
        var pager = document.createElement('div');
${pagerSrc}        wrap.appendChild(pager);
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
            var k = TCOLS[c0].kind;${bindSkip}
            if (k === 'text') continue;
            var needsRead = (k === 'read' || k === 'bool' || k === 'check' || k === 'input' || k === 'enum' || k === 'icon' || (k === 'button' && TCOLS[c0].wmode === 'toggle'));
            var s0 = symFor(r0, c0);
            if (needsRead && s0) bound.push({ r: r0, c: c0, s: s0 });
        }
    }${xBindSrc}
    if (bound.length <= WATCH_LIMIT) {
        bound.forEach(function (bd) { subscribeT(bd.s, function (v) { ${watchSetSrc} }); });
    } else {
        // Zuordnung der Antworten ueber den Symbolnamen: Nach der ersten Antwort
        // schickt der Server nur noch geaenderte Werte, die Position i passt dann
        // nicht mehr zu bound[i]. (Bestaetigt an der Alarmtabelle, 345 Zellen.)
        var boundBySym = {};
        bound.forEach(function (bd) { boundBySym[plainSymT(bd.s)] = bd; });
        var warnedUnknownSym = false;
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
                var full = resp.commands.length === bound.length;   // vollstaendige Antwort (z. B. die erste)
                for (var i = 0; i < resp.commands.length; i++) {
                    var cmd = resp.commands[i];
                    if (cmd.error != null && cmd.error !== 0) continue;
                    var bd = boundBySym[cmd.symbol];
                    if (!bd && full) bd = bound[i];                  // Rueckfall nur bei vollstaendiger Antwort
                    if (!bd) {
                        if (!warnedUnknownSym && window.console) { warnedUnknownSym = true; console.warn('AC_PopUp Tabelle: unbekanntes Symbol in Subscription-Antwort:', cmd.symbol); }
                        continue;
                    }${batchXSrc}
                    if (!vals[bd.r]) vals[bd.r] = [];
                    vals[bd.r][bd.c] = cmd.readValue;
                }
                queueRender();
            });
        } catch (e) {}
    }

    // ── Versteckter Parameter-Kanal ──
    // Fuer Buttons mit action==='fn' und psrc==='member' (Array-Modus) wird der als
    // Parameter dienende Struct-Member je Zeile separat gelesen, auch wenn er keine
    // sichtbare Spalte hat. Element-Pfad wie bei sichtbaren Zellen (dynSym).
    if (DATA_SOURCE === 'array') {
        var pmembers = {}; // eindeutige Member sammeln
        for (var pc0 = 0; pc0 < TCOLS.length; pc0++) {
            var pcol = TCOLS[pc0];
            if (pcol.kind === 'button' && pcol.action === 'fn' && pcol.psrc === 'member' && pcol.pmember) pmembers[pcol.pmember] = true;
        }${pmemberRowSrc}
        Object.keys(pmembers).forEach(function (member) {
            if (!paramVals[member]) paramVals[member] = [];
            for (var pr = 0; pr < ARRAY_COUNT; pr++) {
                (function (rr) {
                    var ps = dynSym(rr, member);
                    if (ps) subscribeT(ps, function (v) { paramVals[member][rr] = v; });
                })(pr);
            }
        });
    }${tplMembersSrc}
    renderBody();${pageAuto ? `
    // Groessenaenderung des Containers/Fensters -> Zeilen pro Seite neu bestimmen
    if (typeof ResizeObserver !== 'undefined' && typeof AC_EMBED !== 'undefined' && AC_EMBED) {
        var autoSp = scrollParentT(wrap);
        if (autoSp) { try { autoRO = new ResizeObserver(function () { queueAutoFit(); }); autoRO.observe(autoSp); } catch (e) { autoRO = null; } }
    }
    window.addEventListener('resize', queueAutoFit);` : ""}

    // Aufräumen beim Schließen des Popups (siehe hideDialog -> teardowns)
    teardowns.push(function () {
        for (var i = 0; i < watchers.length; i++) { try { watchers[i](); } catch (e) {} }
        for (var j = 0; j < symbols.length; j++) { try { symbols[j].destroy(); } catch (e) {} }
        watchers = []; symbols = [];
        if (batchSubId != null) { try { TcHmi.Server.requestEx({ requestType: 'ReadWrite', commands: [{ symbol: 'Unsubscribe', commandOptions: ['SendErrorMessage'], writeValue: batchSubId }] }, {}, function () {}); } catch (e) {} batchSubId = null; }
        tbody = null; wrap = null; pageInfo = null; prevBtn = null; nextBtn = null;${tv("", " firstBtn = null; lastBtn = null;")}${pageAuto ? "\n        if (autoRO) { try { autoRO.disconnect(); } catch (e) {} autoRO = null; }\n        window.removeEventListener('resize', queueAutoFit);" : ""}
    });
})();`;
  return indentLines(core, I);
}

export { tableBlockConfig, emitTable };