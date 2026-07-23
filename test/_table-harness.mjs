// ── Führt den ECHTEN von emitTable() erzeugten Code per node:vm aus und ──
// exponiert seine internen Funktionen/Variablen für Logik-Tests. Das prüft
// das tatsächliche Verhalten des Codegens (Sortierung, Zeilenfilter,
// Button->Funktion), nicht eine Schatten-Nachimplementierung, die bei einer
// künftigen Codegen-Änderung stillschweigend auseinanderlaufen könnte.
import vm from "node:vm";
import { emitTable } from "../src/codegen/emitTable.js";
import { makeElement, makeSandbox } from "./_dom-stub.mjs";

// Namen, die 1:1 aus dem generierten IIFE exponiert werden (Referenzsemantik:
// Arrays/Objekte/Funktionen bleiben live verbunden). Primitive (sortCol,
// sortDir, page, query, dynCount) brauchen Getter/Setter-Closures, weil ein
// direktes `hook.sortCol = x` sonst nur die Kopie im Hook-Objekt änderte.
const REF_NAMES = [
  "TCOLS", "TROWS", "TFILTERS", "TRULES", "vals", "paramVals", "tbody",
  "cmpSort", "sortValue", "isBoolCol", "sortVisible", "toggleSort",
  "passesFilters", "isEmptyVal", "isZeroVal", "rowMatches", "cellSearchText",
  "resolveParam", "callColFn", "effectiveCount", "renderBody", "setVal",
  "symFor", "updateSortIndicators",
];

function buildTableHooks(block, parentVarName = "parent") {
  const raw = emitTable(parentVarName, block);
  const marker = raw.lastIndexOf("})();");
  if (marker < 0) throw new Error("emitTable-Output endet nicht mit '})();' – Hook-Injektion nicht möglich.");
  const hookAssign = `
    __hooks__.value = {
      ${REF_NAMES.map((n) => `${n}: ${n}`).join(",\n      ")},
      getSortCol: function () { return sortCol; }, setSortCol: function (v) { sortCol = v; },
      getSortDir: function () { return sortDir; }, setSortDir: function (v) { sortDir = v; },
      getPage: function () { return page; }, setPage: function (v) { page = v; },
      getQuery: function () { return query; }, setQuery: function (v) { query = v; },
      getDynCount: function () { return dynCount; },
    };
`;
  const injected = raw.slice(0, marker) + hookAssign + raw.slice(marker);

  const { sandbox, documentStub } = makeSandbox();
  const context = vm.createContext(sandbox);
  context[parentVarName] = makeElement("div");
  // emitTable()-Output nutzt "teardowns" als von außen bereitgestelltes Array
  // (im echten Popup von innerSymbol/innerUC/innerEmbed deklariert) – hier
  // stellen wir es selbst bereit, damit der Standalone-Lauf nicht platzt.
  context.teardowns = [];
  context.__hooks__ = { value: null };
  vm.runInContext(injected, context, { filename: "emitTable-under-test.js" });
  if (!context.__hooks__.value) throw new Error("Hook wurde nicht erreicht – emitTable-Output hat vor dem Ende geworfen?");
  return { ...context.__hooks__.value, TcHmi: context.TcHmi, document: documentStub };
}

export { buildTableHooks };
