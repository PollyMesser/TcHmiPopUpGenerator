import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { T } from "../constants/theme.js";
import { WRITE_OPTS } from "../constants/options.js";
import { condOp, condVal } from "../codegen/helpers.js";
import { Field, TextInput, Select, ColorSwatches, IconBtn, IconPicker } from "./primitives.jsx";

// ── Feld-Editoren für Bausteine/Zeilenelemente ──
function symMeta(mode) {
  return mode === "usercontrol"
    ? { label: "ATTRIBUT (getX/setX)", ph: "z.B. Running" }
    : { label: "SYMBOL", ph: "ADS.PLC.MAIN…::xVar" };
}
// Optionales, vom Lese-Symbol abweichendes SCHREIB-Ziel (z. B. Command-Muster
// Mode lesen / CmdMode schreiben). Leer = Lesen und Schreiben auf demselben
// Symbol/Attribut (Bestandsverhalten, byte-identisch).
function writeSymMeta(mode) {
  return mode === "usercontrol"
    ? { label: "SCHREIB-ATTRIBUT (setX, optional)", ph: "leer = wie Lese-Attribut (z.B. CmdMode)" }
    : { label: "SCHREIB-SYMBOL (optional, abweichend)", ph: "leer = wie Lese-Symbol" };
}
function WriteSymField({ cfg, onPatch, mode }) {
  const wm = writeSymMeta(mode);
  return (
    <>
      <Field label={wm.label}><TextInput value={cfg.writeSym || ""} onChange={(e) => onPatch({ writeSym: e.target.value })} placeholder={wm.ph} /></Field>
      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "-4px 0 8px" }}>Leer = Lesen und Schreiben über dasselbe {mode === "usercontrol" ? "Attribut" : "Symbol"}. Gesetzt = der Ist-Wert wird oben gelesen, geschrieben wird hierhin (z. B. Command-Attribut).</div>
    </>
  );
}
function ReadBoolFields({ cfg, onPatch, mode }) {
  const sm = symMeta(mode);
  const isRead = cfg.type === "read" || cfg.kind === "read";
  const isCheck = cfg.type === "check" || cfg.kind === "check";
  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="LABEL"><TextInput value={cfg.label} onChange={(e) => onPatch({ label: e.target.value })} /></Field></div>
        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={cfg.loc} onChange={(e) => onPatch({ loc: e.target.value })} placeholder="L_…" /></Field></div>
      </div>
      {isRead ? (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}><Field label={sm.label}><TextInput value={cfg.symbol} onChange={(e) => onPatch({ symbol: e.target.value })} placeholder={sm.ph} /></Field></div>
          <div style={{ width: 96 }}><Field label="EINHEIT (optional)"><TextInput value={cfg.unit || ""} onChange={(e) => onPatch({ unit: e.target.value })} placeholder="z.B. bar" /></Field></div>
        </div>
      ) : (
        <>
          <Field label={sm.label}><TextInput value={cfg.symbol} onChange={(e) => onPatch({ symbol: e.target.value })} placeholder={sm.ph} /></Field>
          {isCheck && <WriteSymField cfg={cfg} onPatch={onPatch} mode={mode} />}
        </>
      )}
    </>
  );
}
function ButtonItemFields({ it, onPatch, mode, onAddCond, onRemoveCond, onPatchCond }) {
  const sm = symMeta(mode);
  return (
    <>
      <Field label={sm.label}><TextInput value={it.symbol} onChange={(e) => onPatch({ symbol: e.target.value })} placeholder={sm.ph} /></Field>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}><Field label="AKTION"><Select value={it.writeMode} onChange={(e) => onPatch({ writeMode: e.target.value })} options={WRITE_OPTS} /></Field></div>
        {(it.writeMode === "pulse" || (it.writeMode === "holdConfirm" && it.confirmAction !== "setTrue")) && <div style={{ width: 90 }}><Field label="EIN-DAUER (ms)"><TextInput type="number" value={it.pulseMs} onChange={(e) => onPatch({ pulseMs: e.target.value })} /></Field></div>}
      </div>
      {it.writeMode === "hold" && (
        <>
          <Field label={`RÜCKMELDESYMBOL (optional, ${mode === "usercontrol" ? "Attribut-Bool" : "Symbol-Bool"})`}>
            <TextInput value={it.fbSym || ""} onChange={(e) => onPatch({ fbSym: e.target.value })} placeholder={mode === "usercontrol" ? "z.B. Confirmed (leer = keine Markierung)" : "ADS.…::xConfirmed (leer = keine Markierung)"} />
          </Field>
          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "-4px 0 8px" }}>Schreibt true beim Drücken, false beim Loslassen (auch wenn der Zeiger den Button während des Drückens verlässt). Sobald dieses Symbol true meldet, erscheint ein grüner Rahmen als Bestätigung – zum Loslassen loslassen.</div>
        </>
      )}
      {it.writeMode === "holdConfirm" && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ width: 110 }}><Field label="HALTEZEIT (ms)"><TextInput type="number" value={it.confirmMs == null ? 3000 : it.confirmMs} onChange={(e) => onPatch({ confirmMs: e.target.value })} /></Field></div>
            <div style={{ flex: 1 }}><Field label="NACH BESTÄTIGUNG"><Select value={it.confirmAction || "pulse"} onChange={(e) => onPatch({ confirmAction: e.target.value })} options={[{ value: "pulse", label: "Impuls (true → false)" }, { value: "setTrue", label: "Auf true setzen" }]} /></Field></div>
          </div>
          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "-4px 0 8px" }}>Erst nach durchgehendem Halten über die Haltezeit wird geschrieben (mit Fortschrittsanzeige im Button). Vorzeitiges Loslassen bricht ab, ohne zu schreiben.</div>
        </>
      )}
      <Field label="FARBE"><ColorSwatches value={it.color} onChange={(cc) => onPatch({ color: cc })} /></Field>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 4 }}>
        <div style={{ flex: 3 }}><Field label="SYMBOL (optional)"><IconPicker value={it.icon || ""} onChange={(k) => onPatch({ icon: k })} /></Field></div>
        {it.icon ? (
          <>
            <div style={{ width: 120 }}><Field label="POSITION"><Select value={it.iconPos || "left"} onChange={(e) => onPatch({ iconPos: e.target.value })} options={[{ value: "left", label: "Links" }, { value: "right", label: "Rechts" }]} /></Field></div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", paddingTop: 22 }}>
              <input type="checkbox" checked={it.showLabel !== false} onChange={(e) => onPatch({ showLabel: e.target.checked })} /> mit Text
            </label>
          </>
        ) : null}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginTop: 2, marginBottom: 8 }}>
        <input type="checkbox" checked={!!it.closeAfter} onChange={(e) => onPatch({ closeAfter: e.target.checked })} /> Popup nach Klick schließen
      </label>

      <Field label={`NUR SICHTBAR WENN ${mode === "usercontrol" ? "(Attribut-Bool)" : "(Symbol-Bool)"} – optional`}>
        <TextInput value={it.visSym || ""} onChange={(e) => onPatch({ visSym: e.target.value })} placeholder={mode === "usercontrol" ? "z.B. Fault (leer = immer sichtbar)" : "ADS.…::xFault (leer = immer sichtbar)"} />
      </Field>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "6px 0 6px" }}>AKTIV WENN (alle Bedingungen erfüllt)</div>
      {(it.enableIf || []).map((cnd) => (
        <div key={cnd.id} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}><Field label={mode === "usercontrol" ? "ATTRIBUT" : "SYMBOL"}><TextInput value={cnd.symbol} onChange={(e) => onPatchCond(cnd.id, { symbol: e.target.value })} placeholder={mode === "usercontrol" ? "z.B. Mode" : "ADS.…::eMode"} /></Field></div>
          <div style={{ width: 62 }}><Field label="OP"><Select value={condOp(cnd)} onChange={(e) => onPatchCond(cnd.id, { op: e.target.value })} options={[{ value: "==", label: "=" }, { value: "!=", label: "≠" }, { value: "<", label: "<" }, { value: "<=", label: "≤" }, { value: ">", label: ">" }, { value: ">=", label: "≥" }]} /></Field></div>
          <div style={{ width: 72 }}><Field label="WERT"><TextInput value={condVal(cnd)} onChange={(e) => onPatchCond(cnd.id, { value: e.target.value })} placeholder="1 / true" /></Field></div>
          <div style={{ marginBottom: 10 }}><IconBtn danger onClick={() => onRemoveCond(cnd.id)}><Trash2 size={13} /></IconBtn></div>
        </div>
      ))}
      <button onClick={onAddCond} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
        <Plus size={12} color={T.accent} /> Bedingung {(it.enableIf || []).length ? "(UND)" : ""}
      </button>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Keine Bedingung = immer aktiv. Wert kann bool (true/false), Zahl oder Enum sein – z.B. Mode ≠ 1.</div>
    </>
  );
}
function TriggerFields({ cfg, onPatch, mode }) {
  const sm = symMeta(mode);
  const tm = cfg.trigMode || "pulse";
  const hasTrig = (cfg.trigSym || "").trim();
  return (
    <>
      <div style={{ borderTop: `1px dashed ${T.border}`, margin: "8px 0" }} />
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, fontWeight: 600 }}>TRIGGER-VARIABLE (optional – z. B. SPS-Flanke)</div>
      <Field label={sm.label}><TextInput value={cfg.trigSym || ""} onChange={(e) => onPatch({ trigSym: e.target.value })} placeholder="leer = nur Wert schreiben" /></Field>
      {hasTrig ? (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}><Field label="AKTION"><Select value={tm} onChange={(e) => onPatch({ trigMode: e.target.value })} options={[{ value: "pulse", label: "Puls (true→false)" }, { value: "setTrue", label: "Setzen (true)" }, { value: "toggle", label: "Umschalten" }]} /></Field></div>
            {tm === "pulse" && <div style={{ width: 110 }}><Field label="PULS (ms)"><TextInput value={cfg.trigMs == null ? 500 : cfg.trigMs} onChange={(e) => onPatch({ trigMs: parseInt(e.target.value) || 0 })} /></Field></div>}
          </div>
          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 4 }}>Beim Klick wird zuerst der Wert geschrieben, dann diese Variable ausgelöst. Für eine SPS-Flanke eignet sich „Setzen (true)" mit Reset in der SPS oder „Puls".</div>
        </>
      ) : null}
    </>
  );
}
function InputFields({ cfg, onPatch, mode }) {
  const sm = symMeta(mode);
  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="LABEL"><TextInput value={cfg.label} onChange={(e) => onPatch({ label: e.target.value })} /></Field></div>
        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={cfg.loc} onChange={(e) => onPatch({ loc: e.target.value })} placeholder="L_…" /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}><Field label={sm.label}><TextInput value={cfg.symbol} onChange={(e) => onPatch({ symbol: e.target.value })} placeholder={sm.ph} /></Field></div>
        <div style={{ width: 96 }}><Field label="DATENTYP"><Select value={cfg.dataType} onChange={(e) => onPatch({ dataType: e.target.value })} options={[{ value: "number", label: "Zahl" }, { value: "text", label: "Text" }, { value: "time", label: "Zeit (HH:MM:SS)" }]} /></Field></div>
        <div style={{ width: 92 }}><Field label="EINHEIT (optional)"><TextInput value={cfg.unit || ""} onChange={(e) => onPatch({ unit: e.target.value })} placeholder="z.B. bar" /></Field></div>
      </div>
      <WriteSymField cfg={cfg} onPatch={onPatch} mode={mode} />
      <div style={{ borderTop: `1px solid ${T.border}`, margin: "2px 0 8px" }} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: T.muted, cursor: "pointer", marginBottom: 6 }}>
        <input type="checkbox" checked={cfg.sendButton !== false} onChange={(e) => onPatch({ sendButton: e.target.checked })} /> SENDEN-BUTTON ANZEIGEN
      </label>
      {cfg.sendButton !== false && (
        <>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 2 }}><Field label="TEXT"><TextInput value={cfg.sendLabel} onChange={(e) => onPatch({ sendLabel: e.target.value })} /></Field></div>
            <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={cfg.sendLoc} onChange={(e) => onPatch({ sendLoc: e.target.value })} placeholder="L_…" /></Field></div>
          </div>
          <Field label="FARBE"><ColorSwatches value={cfg.sendColor} onChange={(c) => onPatch({ sendColor: c })} /></Field>
          <TriggerFields cfg={cfg} onPatch={onPatch} mode={mode} />
        </>
      )}
      {cfg.sendButton === false && (
        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 4 }}>Ohne Button wird der Wert nur mit Enter übernommen.</div>
      )}
    </>
  );
}

export { symMeta, WriteSymField, ReadBoolFields, ButtonItemFields, TriggerFields, InputFields };