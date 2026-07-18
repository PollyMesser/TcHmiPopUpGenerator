function blockSummary(b) {
  if (b.type === "text") return (b.text || "").trim().slice(0, 44) || "—";
  if (b.type === "button") return b.buttons.map((x) => x.label).filter(Boolean).join(" · ") || "—";
  if (b.type === "row") return b.items.map((it) => it.label).filter(Boolean).join("  |  ") || "—";
  if (b.type === "plot") return (b.series || []).map((s) => s.label).filter(Boolean).join(" · ") || "Verlauf";
  if (b.type === "divider") return (b.label || "").trim() || "Linie";
  return b.label || "—";
}

// ── Spalten-Helfer ──
const clampCol = (b, cols) => Math.min(Math.max(b.col || 0, 0), cols - 1);
const groupByCol = (blocks, cols) => {
  const g = Array.from({ length: cols }, () => []);
  blocks.forEach((b) => { g[clampCol(b, cols)].push(b); });
  return g;
};

export { blockSummary, clampCol, groupByCol };
