#!/usr/bin/env node
// ── Logik-Test: Plot-Einstellwerte an UC-Parameter gebunden ──
// Führt ein UserControl-Popup mit einem an Parameter gebundenen Plot aus und
// prüft, dass die Einstellwerte zur Laufzeit tatsächlich per getX vom Host
// gelesen werden (die Bindung feuert synchron beim Aufbau, vor initPlot).
// Plotly ist im Stub nicht vorhanden -> das Zeichnen selbst wird NICHT geprüft
// (nur in der echten HMI verifizierbar), wohl aber die Parameter-Auflösung.
import vm from "node:vm";
import { generate } from "../src/codegen/index.js";
import { newBlock, mkRef, mkMarker, mkMapping } from "../src/model/factories.js";
import { makeElement, makeSandbox } from "./_dom-stub.mjs";
import { assert, report } from "./_assert.mjs";

const plot = newBlock("plot");
plot.axes[0] = { ...plot.axes[0], label: "Druck", labelParam: "AxTitle", min: 0, max: 100, autoscale: false, minParam: "AxMin", maxParam: "AxMax" };
plot.series[0] = { ...plot.series[0], symbol: "ADS.AF_PLC.MAIN::fWert", symbolParam: "SigPath", label: "Signal", labelParam: "SigName" };
plot.refLines = [{ ...mkRef(plot.axes[0].id), mode: "fixed", value: 90, valueParam: "RefVal", label: "G", labelParam: "RefLabel" }];
plot.eventMarkers = [{ ...mkMarker(), symbol: "ADS.AF_PLC.MAIN::eStep", symbolParam: "MkPath", mappings: [{ ...mkMapping("1", "Auto"), valueParam: "MapVal0" }] }];

const cfg = {
  mode: "usercontrol", fnName: "AC_PlotUc", hostSuffix: ".btn_Plot",
  title: "", titleLoc: "", titleSource: "static", titleField: "", titleFallback: "", titleIcon: "", titleIconColor: "",
  maxWidth: 400, columns: 1, blocks: [plot],
};
const code = generate(cfg);

const { sandbox, controlsRegistry } = makeSandbox();
const calls = {};
const rec = (name, val) => { calls[name] = (calls[name] || 0) + 1; return val; };
const trigger = makeElement("div"); trigger.nodeType = 1; trigger.id = "MyUc.btn_Plot";
trigger.closest = (sel) => (sel === '[id$=".btn_Plot"]' ? trigger : null);
controlsRegistry.MyUc = {
  getId: () => "MyUc",
  getElement: () => [trigger],
  getAxTitle: () => rec("AxTitle", "Ist-Druck"),
  getAxMin: () => rec("AxMin", 5),
  getAxMax: () => rec("AxMax", 95),
  getSigPath: () => rec("SigPath", "ADS.X::fLive"),
  getSigName: () => rec("SigName", "Live"),
  getRefVal: () => rec("RefVal", 80),
  getRefLabel: () => rec("RefLabel", "Limit"),
  getMkPath: () => rec("MkPath", "ADS.X::eSt"),
  getMapVal0: () => rec("MapVal0", 2),
};
sandbox.event = { target: trigger };

let threw = false;
try { vm.runInContext(code, vm.createContext(sandbox), { filename: "plot-uc.js" }); } catch (e) { threw = true; if (process.env.DEBUG) console.error(e); }
assert(!threw, "Plot-UC: UserControl-Popup mit gebundenem Plot läuft ohne Exception");

["AxTitle", "AxMin", "AxMax", "SigPath", "SigName", "RefVal", "RefLabel", "MkPath", "MapVal0"].forEach((n) => {
  assert(calls[n] >= 1, `Plot-UC-Param: getX '${n}' wurde aufgerufen (Einstellwert aus Parameter gelesen)`);
});

report("plot-uc-logic");
