// ── Abhaengigkeiten zwischen Tabellenspalten ──
// Welche Teile einer Tabelle lesen den Wert einer Spalte (per Spaltenindex)?
//   Farbregeln (rules.colIndex), Zeilenfilter (rowFilters.colIndex),
//   Standardsortierung (defaultSortCol), Funktions-Buttons mit Parameter
//   aus Spalte (paramSource 'col' / paramCol) und Text-Vorlagen mit {N}.
// Genutzt vom Editor (Hinweis „Verwendet von …“, Warnung vor dem Loeschen)
// und vom Codegen (observe-gesperrte Spalte trotzdem lesen, wenn etwas
// von ihr abhaengt). Normalisierung identisch zu tableBlockConfig().
import { parseTpl } from "./locTemplate.js";

const idxOf = (v) => Math.max(0, parseInt(v) || 0);

// Liefert je Spalte ein Array von Abhaengigkeiten: { kind, label }.
//   kind: 'rule' | 'filter' | 'sort' | 'param' | 'tpl'
function tableColDeps(b) {
  const cols = (b && b.columns) || [];
  const out = cols.map(() => []);
  const add = (ci, kind, label) => { if (ci >= 0 && ci < out.length) out[ci].push({ kind, label }); };
  const colName = (c, i) => (c.header || "").trim() || (c.headerLoc || "").trim() || `Spalte ${i + 1}`;

  (b.rules || []).forEach((u, i) => add(idxOf(u.colIndex), "rule", `Farbregel ${i + 1}`));
  (b.rowFilters || []).forEach((f, i) => add(idxOf(f.colIndex), "filter", `Zeilenfilter ${i + 1}`));
  const ds = parseInt(b.defaultSortCol);
  if (!isNaN(ds) && ds >= 0) add(ds, "sort", "Standardsortierung");
  cols.forEach((c, i) => {
    if (c.kind === "button" && c.action === "fn" && c.paramSource === "col") {
      const pc = parseInt(c.paramCol);
      if (!isNaN(pc) && pc >= 0) add(pc, "param", `Button „${(c.label || "").trim() || colName(c, i)}“ (Parameter)`);
    }
    if (c.kind === "text" && (c.locTpl || "").trim()) {
      const seen = {};
      [c.locTpl, c.textTpl].forEach((src) => parseTpl(src).parts.forEach((pt) => {
        if (pt && typeof pt === "object" && pt.c !== undefined && pt.c !== i && !seen[pt.c]) { seen[pt.c] = 1; add(pt.c, "tpl", `Text-Vorlage „${colName(c, i)}“`); }
      }));
    }
  });
  return out;
}

export { tableColDeps };
