import { nid, eid, pid } from "./ids.js";
import { DEFAULT_TIME_BUTTONS } from "./factories.js";

// ── Konfigurations-Kommentar für verlustfreien Re-Import ──
function buildConfigComment(cfg) {
  const c = {
    v: 1, mode: cfg.mode, fnName: cfg.fnName, title: cfg.title, titleLoc: cfg.titleLoc,
    titleSource: cfg.titleSource, titleField: cfg.titleField, titleFallback: cfg.titleFallback,
    titleIcon: cfg.titleIcon, titleIconColor: cfg.titleIconColor,
    maxWidth: cfg.maxWidth, columns: cfg.columns, hostSuffix: cfg.hostSuffix, blocks: cfg.blocks,
    // Popup-weite Gruppen-Berechtigungen NUR aufnehmen, wenn gesetzt – sonst
    // bliebe der Re-Import-Kommentar bestehender Popups nicht byte-identisch.
    ...(cfg.access ? { access: cfg.access } : {}),
  };
  return `\n// ── AC_PopUp Generator: Konfiguration für Re-Import (diese Zeilen nicht entfernen) ──\n// AC_POPUP_CONFIG_V1: ${JSON.stringify(c)}\n`;
}
function parseConfigComment(text) {
  const key = "AC_POPUP_CONFIG_V1:";
  const i = (text || "").indexOf(key);
  if (i < 0) return null;
  let rest = text.slice(i + key.length);
  const nl = rest.indexOf("\n");
  if (nl >= 0) rest = rest.slice(0, nl);
  try { return JSON.parse(rest.trim()); } catch (e) { return null; }
}
// Beim Import frische IDs vergeben (verhindert Kollisionen mit späteren Bausteinen)
function reidBlocks(blocks) {
  return (blocks || []).map((b) => {
    const nb = { ...b, id: nid() };
    if (nb.buttons) nb.buttons = nb.buttons.map((bt) => ({ ...bt, enableIf: (bt.enableIf || []).map((c) => ({ ...c, id: eid("c") })) }));
    if (nb.items) nb.items = nb.items.map((it) => ({ ...it, id: nid() }));
    if (nb.map) nb.map = nb.map.map((e) => ({ ...e, id: eid("m") }));
    if (nb.type === "table") {
      nb.columns = (nb.columns || []).map((c) => ({ ...c, id: eid("tc"), map: (c.map || []).map((e) => ({ ...e, id: eid("tm") })) }));
      nb.rows = (nb.rows || []).map((r) => ({ ...r, id: eid("tr"), cells: (r.cells || []).map((cl) => ({ ...cl })) }));
      nb.rules = (nb.rules || []).map((u) => ({ ...u, id: eid("tu") }));
      nb.rowFilters = (nb.rowFilters || []).map((f) => ({ ...f, id: eid("tf") }));

    }
    if (nb.type === "plot") {
      const axMap = {};
      nb.axes = (nb.axes || []).map((a) => { const nid2 = pid("a"); axMap[a.id] = nid2; return { ...a, id: nid2 }; });
      const fallbackAxis = nb.axes[0] ? nb.axes[0].id : undefined;
      const relink = (aid) => (axMap[aid] || fallbackAxis);
      nb.series = (nb.series || []).map((s) => ({ ...s, id: pid("s"), axisId: relink(s.axisId) }));
      nb.refLines = (nb.refLines || []).map((r) => ({ ...r, id: pid("r"), axisId: relink(r.axisId) }));
      nb.eventMarkers = (nb.eventMarkers || []).map((m) => ({ kind: m.kind === "metric" ? "metric" : "enum", showValue: m.showValue !== false, prefix: m.prefix || "", prefixLoc: m.prefixLoc || "", decimals: m.decimals || 0, ...m, id: pid("m"), mappings: (m.mappings || []).map((mp) => ({ ...mp, id: pid("mm") })) }));
      nb.timeButtons = (nb.timeButtons && nb.timeButtons.length ? nb.timeButtons : DEFAULT_TIME_BUTTONS).map((t) => ({ count: t.count, unit: t.unit, label: t.label, id: pid("t") }));
    }
    return nb;
  });
}

export { buildConfigComment, parseConfigComment, reidBlocks };