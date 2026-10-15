// ── Standardwerte der Allgemein-Einstellungen ──
// Einzige Quelle für "leeres Popup" (Reset-Button). Der Modus (Funktionsart ×
// Darstellung) ist bewusst NICHT enthalten: Ein Reset behält den gewählten
// Modus bei, weil man typischerweise mehrere Popups derselben Art nacheinander
// baut.
export const EMPTY_POPUP = Object.freeze({
  fnName: "AC_PopUp",
  title: "",
  titleLoc: "",
  titleSource: "static",
  titleField: "TagName",
  titleFallback: "Titel",
  titleIcon: "",
  titleIconColor: "",
  maxWidth: 400,
  columns: 1,
  hostSuffix: ".btn_PopUp",
  embedTarget: "MeinContainer",
  access: undefined,
  blocks: Object.freeze([]),
});
