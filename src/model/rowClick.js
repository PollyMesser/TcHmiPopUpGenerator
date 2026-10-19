// ── Tabelle: Zeilenklick -> Funktion ──
// Tippen auf eine Datenzeile ruft TcHmi.Functions.AC_HMI[fn](Parameter) auf.
// Parameterquelle wie bei Funktions-Buttons (resolveParam im generierten Code):
//   'member' -> Struct-Member je Zeile (nur Array-Modus, versteckt mitgelesen)
//   'col'    -> Wert einer Spalte (vals[r][pcol])
//   'index'  -> Zeilenindex START_INDEX + r
//   'none'   -> ohne Parameter
// mark: angetippte Zeile markieren. Die Markierung haengt am Parameterwert, nicht an
// der Zeilenposition -> sie wandert mit, wenn sich das Array verschiebt (Ringpuffer).
//
// Block-Felder (alle optional, fehlend = aus -> Bestands-Configs byte-identisch):
//   rowClick, rowFnName, rowParamSource, rowParamMember, rowParamCol, rowMark

const ROW_PARAM_SOURCES = ["member", "col", "index", "none"];

// Standard-Parameterquelle: Array -> Member, feste Zeilen -> Spaltenwert
const rowParamSourceOf = (b) => {
  const isArr = b && b.dataSource === "array";
  const p = b && b.rowParamSource;
  if (ROW_PARAM_SOURCES.includes(p) && (isArr || p !== "member")) return p;
  return isArr ? "member" : "col";
};

// Normalisierte Laufzeit-Konfiguration oder null (Zeilenklick aus bzw. ohne Funktionsname)
function rowClickOf(b) {
  if (!b || !b.rowClick) return null;
  const fn = String(b.rowFnName || "").trim();
  if (!fn) return null;
  const psrc = rowParamSourceOf(b);
  const n = parseInt(b.rowParamCol);
  return {
    fn,
    psrc,
    pmember: psrc === "member" ? String(b.rowParamMember || "").trim() : "",
    pcol: psrc === "col" && !isNaN(n) && n >= 0 ? n : -1,
    mark: b.rowMark !== false,
  };
}

export { ROW_PARAM_SOURCES, rowParamSourceOf, rowClickOf };
