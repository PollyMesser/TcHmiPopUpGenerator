import { jsStr, locExpr, sanitizeFn, dedent, REF } from "./helpers.js";
import { blockCodeSym } from "./emitSymbol.js";
import { blockCodeUC } from "./emitUserControl.js";
import { buildBodyContent, buildTitleStmt } from "./shared.js";
import { innerSymbol, innerUC, innerEmbed, innerEmbedUC } from "./templates.js";
import { anyAccess, accessHelperSrc, popupGuards } from "./access.js";
import { buildConfigComment } from "../model/config.js";

// ── Body-Inhalt inkl. Gruppen-Berechtigungen ──
// Ohne jede aktive Berechtigung ist das Ergebnis exakt buildBodyContent(...)
// (Byte-Identität). Sonst wird der Runtime-Helfer vorangestellt und der Body
// popup-weit umschlossen (observe verhindert Öffnen, operate sperrt Bedienung).
function buildBody(cfg, cols, emit) {
  const raw = buildBodyContent(cfg.blocks, cols, emit);
  if (!anyAccess(cfg)) return raw;
  const { prefix, suffix } = popupGuards(cfg);
  const parts = [accessHelperSrc()];
  if (prefix) parts.push(prefix);
  parts.push(raw);
  if (suffix) parts.push(suffix);
  return parts.join("\n");
}

// ── Haupt-Generator ──
function generate(cfg) { return generateCode(cfg) + buildConfigComment(cfg); }
function generateCode(cfg) {
  const fn = sanitizeFn(cfg.fnName) || "AC_PopUp";
  const titleExpr = locExpr(cfg.titleLoc, cfg.title);
  const mw = Math.max(320, parseInt(cfg.maxWidth) || 400);
  const cols = Math.min(Math.max(parseInt(cfg.columns) || 1, 1), 3);
  const titleStmt = buildTitleStmt(cfg.mode, cfg.titleSource, cfg.titleField, cfg.titleFallback, titleExpr, cfg.titleIcon, cfg.titleIconColor);

  if (cfg.mode === "embed") {
    const bodyContentEmbed = buildBody(cfg, cols, blockCodeSym);
    const inner = dedent(innerEmbed(bodyContentEmbed), 12);
    return `// Auto-generiert vom AC_PopUp Generator – eingebettet (in Zielcontainer, kein Overlay)
${REF}

/*
 * Aufruf am View-Event onAttached:   TcHmi.Functions.AC_HMI.${fn}('MeinContainer');
 * Abbau am View-Event onDetached:    TcHmi.Functions.AC_HMI.${fn}Destroy('MeinContainer');
 * 'MeinContainer' = Name eines Container-Controls (empfohlen) oder id eines rohen divs
 * mit echter Größe in der View.
 */
(function (/** @type {globalThis.TcHmi} */ TcHmi) {
    var Functions;
    (function (/** @type {globalThis.TcHmi.Functions} */ Functions) {
        var AC_HMI;
        (function (AC_HMI) {

            function resolveTarget(t) {
                if (!t) return null;
                if (typeof t === 'object') {
                    if (t.nodeType === 1) return t;                    // DOM-Element
                    if (typeof t.getElement === 'function') {          // TcHMI-Control-Objekt
                        try { var e = t.getElement(); if (e && e[0]) return e[0]; } catch (err) {}
                    }
                    return null;
                }
                if (typeof t === 'string') {
                    var byId = document.getElementById(t);             // rohes div per id
                    if (byId) return byId;
                    try {                                              // TcHMI-Control per Name
                        var ctrl = TcHmi.Controls.get(t);
                        if (ctrl && typeof ctrl.getElement === 'function') {
                            var el = ctrl.getElement();
                            if (el && el[0]) return el[0];
                        }
                    } catch (err) {}
                    try { return document.querySelector(t); } catch (err) { return null; } // CSS-Selektor
                }
                return null;
            }

            function ${fn}Destroy(target) {
                var container = resolveTarget(target);
                if (container && container.__acEmbedDestroy) { try { container.__acEmbedDestroy(); } catch (e) {} }
            }
            AC_HMI.${fn}Destroy = ${fn}Destroy;

            function ${fn}(target) {
${inner}
            }
            AC_HMI.${fn} = ${fn};
        })(AC_HMI = Functions.AC_HMI || (Functions.AC_HMI = {}));
    })(Functions = TcHmi.Functions || (TcHmi.Functions = {}));
})(TcHmi);
TcHmi.Functions.registerFunctionEx(${jsStr(fn)}, 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.${fn});
TcHmi.Functions.registerFunctionEx(${jsStr(fn + "Destroy")}, 'TcHmi.Functions.AC_HMI', TcHmi.Functions.AC_HMI.${fn}Destroy);
`;
  }

  // ── event + embed: reine IIFE, direkt mit konfigurierter Container-ID aufgerufen ──
  // Symbol-Datenzugriff (wie event). Kein registerFunctionEx, kein Destroy-Export;
  // idempotenter Neuaufbau über container.__acEmbedDestroy. Zur Bereinigung bei
  // onDetached kann dieselbe Container-ID per .__acEmbedDestroy() aufgeräumt werden.
  if (cfg.mode === "embedEvent") {
    const bodyContentEmbed = buildBody(cfg, cols, blockCodeSym);
    const inner = dedent(innerEmbed(bodyContentEmbed), 12);
    const tgt = jsStr((cfg.embedTarget || "").trim());
    return `// Auto-generiert vom AC_PopUp Generator – eingebettet, Event-JavaScript (ohne Registrierung)
${REF}

/*
 * Als JavaScript-Action in ein Event einfügen (z. B. View onAttached).
 * Zielcontainer wird unten fest übergeben: ${(cfg.embedTarget || "").trim() || "(Container-ID im Generator setzen)"}
 * = Name eines Container-Controls (empfohlen) oder id eines rohen divs mit echter Größe.
 * Aufräumen (optional, z. B. onDetached): resolveTarget(ziel).__acEmbedDestroy && …()
 */
(function (target) {
    function resolveTarget(t) {
        if (!t) return null;
        if (typeof t === 'object') {
            if (t.nodeType === 1) return t;                    // DOM-Element
            if (typeof t.getElement === 'function') {          // TcHMI-Control-Objekt
                try { var e = t.getElement(); if (e && e[0]) return e[0]; } catch (err) {}
            }
            return null;
        }
        if (typeof t === 'string') {
            var byId = document.getElementById(t);             // rohes div per id
            if (byId) return byId;
            try {                                              // TcHMI-Control per Name
                var ctrl = TcHmi.Controls.get(t);
                if (ctrl && typeof ctrl.getElement === 'function') {
                    var el = ctrl.getElement();
                    if (el && el[0]) return el[0];
                }
            } catch (err) {}
            try { return document.querySelector(t); } catch (err) { return null; } // CSS-Selektor
        }
        return null;
    }
${inner}
})(${tgt});
`;
  }

  // ── usercontrol + embed: UC-Datenzugriff (gv/sv + Polling), rendert in den ──
  // Host-Container. Host + Container aus der übergebenen Container-ID (UC-Name):
  // TcHmi.Controls.get(id) -> Host, dessen Element -> Container. Als JS-Action
  // im onAttached des UserControls einfügen; die ID unten auf das UC setzen.
  if (cfg.mode === "embedUc") {
    const bodyContentUC = buildBody(cfg, cols, blockCodeUC);
    const inner = dedent(innerEmbedUC(bodyContentUC), 12);
    const tgt = jsStr((cfg.embedTarget || "").trim());
    return `// Auto-generiert vom AC_PopUp Generator – eingebettet, UserControl-gebunden
${REF}

/*
 * Als JavaScript-Action im onAttached des UserControls einfügen.
 * Container-ID (= Name des UserControls): ${(cfg.embedTarget || "").trim() || "(Container-ID im Generator setzen)"}
 * Host wird per TcHmi.Controls.get(id) aufgelöst; gelesen/geschrieben über getX/setX.
 */
(function (target) {
${inner}
})(${tgt});
`;
  }

  if (cfg.mode === "usercontrol") {
    const suffix = (cfg.hostSuffix || ".btn_PopUp").trim() || ".btn_PopUp";
    const bodyContent = buildBody(cfg, cols, blockCodeUC);
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

  const bodyContent = buildBody(cfg, cols, blockCodeSym);

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