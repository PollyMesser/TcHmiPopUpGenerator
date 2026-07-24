// ── Minimale DOM/TcHMI-Stubs, um generierten Codegen-Output per node:vm ──
// tatsächlich auszuführen (nicht nur als String zu vergleichen). Deckt genau
// das ab, was die Popup-Module (emitTable/emitSymbol/embed) zur Laufzeit
// anfassen: createElement/appendChild/removeChild/textContent/style/
// addEventListener, plus TcHmi.Symbol/Functions/Controls/Server.
function makeElement(tag) {
  const el = {
    tagName: tag,
    style: {},
    children: [],
    _listeners: {},
    disabled: false,
    checked: false,
    value: "",
    className: "",
    title: "",
    parentNode: null,
    appendChild(child) { el.children.push(child); child.parentNode = el; return child; },
    removeChild(child) {
      const i = el.children.indexOf(child);
      if (i >= 0) el.children.splice(i, 1);
      child.parentNode = null;
      return child;
    },
    addEventListener(type, fn) { (el._listeners[type] || (el._listeners[type] = [])).push(fn); },
    removeEventListener(type, fn) {
      const a = el._listeners[type];
      if (!a) return;
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    },
    setAttribute(k, v) { el[k] = v; },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(el, k) ? el[k] : null; },
    querySelector() { return null; },
    // Nur Tag-Selektoren (komma-getrennt), genau das, was der generierte
    // operate-Gate-Code nutzt: 'button, input, select, textarea'.
    querySelectorAll(selector) {
      const tags = String(selector || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const out = [];
      const rec = (node) => {
        (node.children || []).forEach((c) => {
          if (tags.includes(String(c.tagName).toLowerCase())) out.push(c);
          rec(c);
        });
      };
      rec(el);
      return out;
    },
  };
  Object.defineProperty(el, "firstChild", { get() { return el.children[0] || null; } });
  Object.defineProperty(el, "textContent", {
    get() { return el._textContent || ""; },
    set(v) { el._textContent = v; el.children = []; },
  });
  return el;
}

// ── TcHmi-Stub: Symbol/Functions/Controls/Server minimal, aber funktional genug ──
class FakeSymbol {
  constructor(path) { this.path = path; }
  watch() { return () => {}; }
  write() {}
  read(cb) { if (cb) cb({ error: 0, value: undefined }); }
  destroy() {}
}

function makeTcHmiStub() {
  const registerCalls = [];
  const controlsRegistry = {};
  return {
    registerCalls,
    controlsRegistry,
    TcHmi: {
      Symbol: FakeSymbol,
      Errors: { NONE: 0 },
      Functions: {
        getFunction: () => undefined,
        AC_HMI: {},
        registerFunctionEx: (name, ns, fn) => { registerCalls.push({ name, ns, fn }); },
      },
      Controls: { get: (name) => controlsRegistry[name] || null },
      Server: {
        requestEx: () => {},
        // Default: kein Nutzer in Gruppen. Tests überschreiben das gezielt, um
        // die Gruppen-Auflösung (userIsInGroups) im generierten Code zu prüfen.
        getCurrentUser: () => null,
        getCurrentUserConfig: () => ({ state: 4, userIsInGroups: [] }),
      },
    },
  };
}

function makeSandbox() {
  const { TcHmi, registerCalls, controlsRegistry } = makeTcHmiStub();
  const documentStub = {
    createElement: (t) => makeElement(t),
    getElementById: () => null,
    querySelector: () => null,
    documentElement: makeElement("html"),
    body: makeElement("body"),
    activeElement: null,
    head: makeElement("head"),
  };
  const sandbox = {
    document: documentStub,
    window: { getComputedStyle: () => ({ backgroundColor: "" }), requestAnimationFrame: (fn) => fn(), addEventListener: () => {}, removeEventListener: () => {}, console },
    TcHmi,
    console,
    setTimeout, clearTimeout,
    // UC-/Embed-Polling nutzt setInterval; im Test nur als No-op-Stub (der
    // initiale refresh() laeuft ohnehin synchron vor dem Intervall).
    setInterval: () => 0, clearInterval: () => {},
  };
  return { sandbox, registerCalls, controlsRegistry, documentStub };
}

export { makeElement, makeSandbox };
