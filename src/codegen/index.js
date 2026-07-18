import { jsStr, locExpr, sanitizeFn, dedent, REF } from "./helpers.js";
import { blockCodeSym } from "./emitSymbol.js";
import { blockCodeUC } from "./emitUserControl.js";
import { buildBodyContent, buildTitleStmt } from "./shared.js";
import { innerSymbol, innerUC } from "./templates.js";
import { buildConfigComment } from "../model/config.js";

// ── Haupt-Generator ──
function generate(cfg) { return generateCode(cfg) + buildConfigComment(cfg); }
function generateCode(cfg) {
  const fn = sanitizeFn(cfg.fnName) || "AC_PopUp";
  const titleExpr = locExpr(cfg.titleLoc, cfg.title);
  const mw = Math.max(320, parseInt(cfg.maxWidth) || 400);
  const cols = Math.min(Math.max(parseInt(cfg.columns) || 1, 1), 3);
  const titleStmt = buildTitleStmt(cfg.mode, cfg.titleSource, cfg.titleField, cfg.titleFallback, titleExpr);

  if (cfg.mode === "usercontrol") {
    const suffix = (cfg.hostSuffix || ".btn_PopUp").trim() || ".btn_PopUp";
    const bodyContent = buildBodyContent(cfg.blocks, cols, blockCodeUC);
    const inner = dedent(innerUC(fn, titleStmt, mw, bodyContent), 12);
    return `// Auto-generiert vom AC_PopUp Generator – UserControl-gebundenes Event-JavaScript
${REF}

(function (ev) {
    // ── Host-Control über die geklickte Trigger-Fläche ermitteln ──
    var host = null;
    var clicked = (ev && ev.target && ev.target.closest) ? ev.target.closest('[id$=${jsStr(suffix)}]') : null;
    if (clicked) {
        var hostId = clicked.id.split(${jsStr(suffix)})[0];
        host = TcHmi.Controls.get(hostId);
    }

${inner}
})(typeof event !== 'undefined' ? event : (typeof window !== 'undefined' ? window.event : null));
`;
  }

  const bodyContent = buildBodyContent(cfg.blocks, cols, blockCodeSym);

  if (cfg.mode === "event") {
    const inner = dedent(innerSymbol(jsStr(fn), titleStmt, mw, bodyContent), 12);
    return `// Auto-generiert vom AC_PopUp Generator – reines Event-JavaScript (ohne Registrierung)
${REF}

(function () {
${inner}
})();
`;
  }

  return `// Auto-generiert vom AC_PopUp Generator – registrierte Funktion
${REF}

(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {
            function ${fn}(par1) {
${innerSymbol(jsStr(fn), titleStmt, mw, bodyContent)}
            }
            AC_HMI.${fn} = ${fn};
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx(${jsStr(fn)}, 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.${fn});
`;
}

export { generate, generateCode };
