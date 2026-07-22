import React from "react";
import { Check, Minus } from "lucide-react";
import { T } from "../constants/theme.js";
import { COLORS, ICONS, PLOT_COLORS } from "../constants/palette.js";
// ── kleine UI-Bausteine des Generators ──
function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, letterSpacing: 0.3 }}>{label}</div>
      {children}
    </label>
  );
}
const inputStyle = { width: "100%", boxSizing: "border-box", background: T.input, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, outline: "none" };
function TextInput(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
function TextArea(props) { return <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 60, fontFamily: "inherit", ...(props.style || {}) }} />; }
function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{ ...inputStyle, appearance: "none" }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function ColorSwatches({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {Object.keys(COLORS).map((k) => {
        const c = COLORS[k]; const sel = value === k;
        return <button key={k} onClick={() => onChange(k)} title={c.label}
          style={{ width: 24, height: 24, borderRadius: 6, background: c.bg, border: sel ? `2px solid ${T.text}` : "2px solid transparent", boxShadow: sel ? `0 0 0 1px ${T.border}` : "none", cursor: "pointer" }} />;
      })}
    </div>
  );
}
function HexSwatches({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {PLOT_COLORS.map((c) => {
        const sel = value === c.hex;
        return <button key={c.hex} onClick={() => onChange(c.hex)} title={c.name}
          style={{ width: 22, height: 22, borderRadius: 6, background: c.hex, border: sel ? `2px solid ${T.text}` : "2px solid transparent", boxShadow: sel ? `0 0 0 1px ${T.border}` : "none", cursor: "pointer" }} />;
      })}
    </div>
  );
}

function IconBtn({ children, onClick, disabled, danger, title }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e); }} disabled={disabled} title={title}
      style={{ background: "transparent", border: "none", color: disabled ? "#454a57" : danger ? T.danger : T.muted, cursor: disabled ? "default" : "pointer", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}>
      {children}
    </button>
  );
}
function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, background: active ? T.panel2 : "transparent", color: active ? T.text : T.muted, border: `1px solid ${active ? T.border : "transparent"}`, borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
      {children}
    </button>
  );
}
// Symbol-Auswahl: identisches Verhalten/Styling wie der bisherige Inline-Picker im Text-Block.
// value = Icon-Key ("" = keins). onChange(key) liefert den neuen Key ("" bei "kein Symbol").
function IconPicker({ value, onChange, allowNone = true, noneTitle = "Kein Symbol" }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {allowNone && (
        <button type="button" onClick={() => onChange("")} title={noneTitle}
          style={{ width: 26, height: 26, borderRadius: 6, cursor: "pointer", background: T.input, border: `2px solid ${!value ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted }}>
          {!value ? <Check size={13} color={T.accent} /> : <Minus size={14} />}
        </button>
      )}
      {Object.entries(ICONS).map(([key, ic]) => (
        <button type="button" key={key} onClick={() => onChange(key)} title={ic.label}
          style={{ width: 26, height: 26, borderRadius: 6, cursor: "pointer", background: T.input, border: `2px solid ${value === key ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: value === key ? T.accent : T.muted }}>
          <span style={{ display: "inline-flex", lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: ic.svg.replace("width='18' height='18'", "width='16' height='16'") }} />
        </button>
      ))}
    </div>
  );
}
 
// Symbolfarbe: "A" = uebernehmen (leerer Wert), sonst eine Palette-Hexfarbe.
// value = Hex ("" = uebernehmen). onChange(hex) liefert Hex ("" bei "A").
function IconColorPicker({ value, onChange, noneTitle = "Wie Textfarbe" }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button type="button" onClick={() => onChange("")} title={noneTitle}
        style={{ width: 22, height: 22, borderRadius: 6, cursor: "pointer", background: T.input, border: `2px solid ${!value ? T.accent : T.border}`, color: T.muted, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>A</button>
      {PLOT_COLORS.map((c) => (
        <button type="button" key={c.hex} onClick={() => onChange(c.hex)} title={c.name}
          style={{ width: 22, height: 22, borderRadius: 6, cursor: "pointer", background: c.hex, border: `2px solid ${value === c.hex ? T.text : "transparent"}`, boxShadow: value === c.hex ? `0 0 0 1px ${T.border}` : "none" }} />
      ))}
    </div>
  );
}

export { Field, inputStyle, TextInput, TextArea, Select, ColorSwatches, HexSwatches, IconBtn, Tab, IconPicker, IconColorPicker };
