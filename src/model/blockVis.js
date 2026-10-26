// ── Baustein-Sichtbarkeit (optional, je Baustein: b.visSym) ──
// Ein Baustein wird nur angezeigt, solange das angegebene Bool TRUE ist –
// im UserControl-Modus ein Attribut (getX), in den Symbol-Modi ein Symbol.
// Zweck: ein Popup für mehrere Maschinen-/Gerätevarianten, die SPS meldet,
// was vorhanden ist (z. B. Pumpe mit umschaltbarer Laufrichtung).
//
// Nicht für Diagramm-/Tabellen-Bausteine: diese messen beim Aufbau ihre
// Breite/Höhe; versteckt aufgebaut würden sie mit Größe 0 gezeichnet.
const BLOCK_VIS_EXCLUDED = ["plot", "bar", "gauge", "analysis", "table"];

function blockVisSupported(type) {
  return BLOCK_VIS_EXCLUDED.indexOf(type) < 0;
}

export { blockVisSupported, BLOCK_VIS_EXCLUDED };
