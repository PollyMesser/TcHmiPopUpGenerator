import React from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { T } from "../../constants/theme.js";
import { PLOT_COLORS } from "../../constants/palette.js";
import { mkBar, mkGaugeBand } from "../../model/factories.js";
import { MAX_ARRAY_BARS } from "../../codegen/emitBar.js";
import { Field, HexSwatches, IconBtn, Select, TextInput } from "../primitives.jsx";

// ── Editor-Felder für Balkendiagramm und Gauge ──
// Eigenständig (nur `patch` + `sm` aus der BlockCard): Unterlisten (Balken,
// Farbbereiche) werden hier immutabel über patch(b.id, {...}) gepflegt.

const subCard = { border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 };
const sectionHead = { fontSize: 11, color: T.muted, fontWeight: 600, margin: "12px 0 6px" };
const addBtnStyle = { display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" };
const hint = { fontSize: 11, color: T.muted, lineHeight: 1.5 };
const checkRow = { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" };

function Check({ checked, onChange, children }) {
  return <label style={checkRow}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {children}</label>;
}

// ── Balkendiagramm ──
function BarEditor({ b, patch, sm, mode }) {
  const bars = b.bars || [];
  const setBars = (next) => patch(b.id, { bars: next });
  const patchBar = (id, p) => setBars(bars.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const moveBar = (idx, dir) => {
    const j = idx + dir; if (j < 0 || j >= bars.length) return;
    const next = bars.slice(); const t = next[idx]; next[idx] = next[j]; next[j] = t; setBars(next);
  };
  const isArray = b.source === "array";
  const uc = mode === "usercontrol";
  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="ÜBERSCHRIFT (optional)"><TextInput value={b.caption} onChange={(e) => patch(b.id, { caption: e.target.value })} /></Field></div>
        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.captionLoc} onChange={(e) => patch(b.id, { captionLoc: e.target.value })} placeholder="L_…" /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="DATENQUELLE"><Select value={b.source} onChange={(e) => patch(b.id, { source: e.target.value })} options={[{ value: "list", label: "Feste Liste" }, { value: "array", label: "PLC-Array" }]} /></Field></div>
        <div style={{ flex: 1 }}><Field label="AUSRICHTUNG"><Select value={b.orientation} onChange={(e) => patch(b.id, { orientation: e.target.value })} options={[{ value: "v", label: "Senkrecht (Säulen)" }, { value: "h", label: "Waagerecht (Balken)" }]} /></Field></div>
        <div style={{ width: 100 }}><Field label="HÖHE (px)"><TextInput type="number" value={b.height} onChange={(e) => patch(b.id, { height: e.target.value })} /></Field></div>
      </div>

      {!isArray && (
        <>
          <div style={sectionHead}>BALKEN ({bars.length})</div>
          {bars.map((x, xi) => (
            <div key={x.id} style={subCard}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Balken {xi + 1}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                  <IconBtn disabled={xi === 0} onClick={() => moveBar(xi, -1)} title="Nach oben"><ChevronUp size={13} /></IconBtn>
                  <IconBtn disabled={xi === bars.length - 1} onClick={() => moveBar(xi, 1)} title="Nach unten"><ChevronDown size={13} /></IconBtn>
                  {bars.length > 1 && <IconBtn danger onClick={() => setBars(bars.filter((y) => y.id !== x.id))} title="Entfernen"><Trash2 size={13} /></IconBtn>}
                </div>
              </div>
              <Field label={sm.label}><TextInput value={x.symbol} onChange={(e) => patchBar(x.id, { symbol: e.target.value })} placeholder={sm.ph} /></Field>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 2 }}><Field label="BESCHRIFTUNG"><TextInput value={x.label} onChange={(e) => patchBar(x.id, { label: e.target.value })} /></Field></div>
                <div style={{ flex: 2 }}><Field label="LOC-KEY"><TextInput value={x.loc} onChange={(e) => patchBar(x.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
              </div>
              <Field label="FARBE"><HexSwatches value={x.color} onChange={(hx) => patchBar(x.id, { color: hx })} /></Field>
            </div>
          ))}
          <button onClick={() => setBars([...bars, mkBar("Wert " + (bars.length + 1), (bars[bars.length - 1] || {}).color || PLOT_COLORS[0].hex)])} style={addBtnStyle}>
            <Plus size={12} color={T.accent} /> Balken
          </button>
        </>
      )}

      {isArray && (
        <>
          <Field label="ARRAY-SYMBOL"><TextInput value={b.arraySymbol} onChange={(e) => patch(b.id, { arraySymbol: e.target.value })} placeholder="ADS.AF_PLC.MAIN.aTanks" /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field label={`ANZAHL (max. ${MAX_ARRAY_BARS})`}><TextInput type="number" value={b.arrayCount} onChange={(e) => patch(b.id, { arrayCount: e.target.value })} /></Field></div>
            <div style={{ flex: 1 }}><Field label="STARTINDEX"><TextInput type="number" value={b.startIndex} onChange={(e) => patch(b.id, { startIndex: e.target.value })} /></Field></div>
            <div style={{ flex: 1 }}><Field label="MEMBER (optional)"><TextInput value={b.member} onChange={(e) => patch(b.id, { member: e.target.value })} placeholder="rLevel" /></Field></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 2 }}><Field label="ANZAHL-SYMBOL (optional)"><TextInput value={b.countSymbol} onChange={(e) => patch(b.id, { countSymbol: e.target.value })} placeholder="ADS.AF_PLC.MAIN.nTankCount" /></Field></div>
            <div style={{ flex: 1 }}><Field label="BESCHRIFTUNG-PRÄFIX"><TextInput value={b.labelPrefix} onChange={(e) => patch(b.id, { labelPrefix: e.target.value })} placeholder="Pos. " /></Field></div>
          </div>
          <Field label="FARBE"><HexSwatches value={b.arrayColor} onChange={(hx) => patch(b.id, { arrayColor: hx })} /></Field>
          <div style={hint}>Je Balken wird <code>Array[i]</code> bzw. <code>Array[i]::Member</code> abonniert (Startindex + 0 … Anzahl − 1). Mit Anzahl-Symbol werden nur die ersten n Balken gezeigt. Beschriftung = Präfix + Index.{uc ? " Auch im UserControl-Modus per ADS-Symbol." : ""}</div>
        </>
      )}

      <div style={sectionHead}>WERTEACHSE</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 84 }}><Field label="EINHEIT"><TextInput value={b.unit} onChange={(e) => patch(b.id, { unit: e.target.value })} placeholder="%" /></Field></div>
        <div style={{ width: 96 }}><Field label="NACHKOMMA"><TextInput type="number" value={b.decimals} onChange={(e) => patch(b.id, { decimals: e.target.value })} /></Field></div>
        <div style={{ flex: 1 }}><Field label="MIN"><TextInput type="number" value={b.min} disabled={b.autoscale !== false} onChange={(e) => patch(b.id, { min: e.target.value })} /></Field></div>
        <div style={{ flex: 1 }}><Field label="MAX"><TextInput type="number" value={b.max} disabled={b.autoscale !== false} onChange={(e) => patch(b.id, { max: e.target.value })} /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
        <Check checked={b.autoscale !== false} onChange={(v) => patch(b.id, { autoscale: v })}>Autoskalierung</Check>
        <Check checked={b.showValues !== false} onChange={(v) => patch(b.id, { showValues: v })}>Werte an den Balken</Check>
      </div>

      <div style={sectionHead}>GRENZWERTE (optional)</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="UNTERE GRENZE"><TextInput type="number" value={b.limitLow} onChange={(e) => patch(b.id, { limitLow: e.target.value })} placeholder="leer = aus" /></Field></div>
        <div style={{ flex: 1 }}><Field label="OBERE GRENZE"><TextInput type="number" value={b.limitHigh} onChange={(e) => patch(b.id, { limitHigh: e.target.value })} placeholder="leer = aus" /></Field></div>
      </div>
      <Field label="GRENZWERTFARBE"><HexSwatches value={b.limitColor} onChange={(hx) => patch(b.id, { limitColor: hx })} /></Field>
      <div style={hint}>Grenzwerte erscheinen als gestrichelte Linien; Balken außerhalb werden in der Grenzwertfarbe gezeichnet.</div>
    </>
  );
}

// ── Gauge / Tacho ──
function GaugeEditor({ b, patch, sm, mode }) {
  const srcWord = mode === "usercontrol" ? "ATTRIBUT" : "SYMBOL";
  const bands = b.bands || [];
  const setBands = (next) => patch(b.id, { bands: next });
  const patchBand = (id, p) => setBands(bands.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const sp = b.setpointMode || "none";
  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="LABEL"><TextInput value={b.label} onChange={(e) => patch(b.id, { label: e.target.value })} /></Field></div>
        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.loc} onChange={(e) => patch(b.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
      </div>
      <Field label={sm.label}><TextInput value={b.symbol} onChange={(e) => patch(b.id, { symbol: e.target.value })} placeholder={sm.ph} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="FORM"><Select value={b.shape} onChange={(e) => patch(b.id, { shape: e.target.value, height: e.target.value === "bullet" ? 90 : 220 })} options={[{ value: "angular", label: "Rundinstrument" }, { value: "bullet", label: "Bullet (waagerecht)" }]} /></Field></div>
        <div style={{ width: 84 }}><Field label="EINHEIT"><TextInput value={b.unit} onChange={(e) => patch(b.id, { unit: e.target.value })} placeholder="bar" /></Field></div>
        <div style={{ width: 96 }}><Field label="NACHKOMMA"><TextInput type="number" value={b.decimals} onChange={(e) => patch(b.id, { decimals: e.target.value })} /></Field></div>
        <div style={{ width: 100 }}><Field label="HÖHE (px)"><TextInput type="number" value={b.height} onChange={(e) => patch(b.id, { height: e.target.value })} /></Field></div>
      </div>

      <div style={sectionHead}>SKALA</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="MIN"><TextInput type="number" value={b.min} onChange={(e) => patch(b.id, { min: e.target.value })} /></Field></div>
        <div style={{ flex: 1 }}><Field label="MAX"><TextInput type="number" value={b.max} onChange={(e) => patch(b.id, { max: e.target.value })} /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label={`MIN ← ${srcWord} (optional)`}><TextInput value={b.minSymbol} onChange={(e) => patch(b.id, { minSymbol: e.target.value })} placeholder="leer = statisch" /></Field></div>
        <div style={{ flex: 1 }}><Field label={`MAX ← ${srcWord} (optional)`}><TextInput value={b.maxSymbol} onChange={(e) => patch(b.id, { maxSymbol: e.target.value })} placeholder="leer = statisch" /></Field></div>
      </div>
      <Field label="ZEIGER-/BALKENFARBE"><HexSwatches value={b.barColor} onChange={(hx) => patch(b.id, { barColor: hx })} /></Field>

      <div style={sectionHead}>FARBBEREICHE ({bands.length})</div>
      {bands.map((x) => (
        <div key={x.id} style={{ display: "flex", gap: 10, alignItems: "flex-end", ...subCard, padding: "8px 10px" }}>
          <div style={{ width: 90 }}><Field label="VON"><TextInput type="number" value={x.from} onChange={(e) => patchBand(x.id, { from: e.target.value })} /></Field></div>
          <div style={{ width: 90 }}><Field label="BIS"><TextInput type="number" value={x.to} onChange={(e) => patchBand(x.id, { to: e.target.value })} /></Field></div>
          <div style={{ flex: 1 }}><Field label="FARBE"><HexSwatches value={x.color} onChange={(hx) => patchBand(x.id, { color: hx })} /></Field></div>
          <div style={{ marginBottom: 12 }}><IconBtn danger onClick={() => setBands(bands.filter((y) => y.id !== x.id))} title="Entfernen"><Trash2 size={13} /></IconBtn></div>
        </div>
      ))}
      <button onClick={() => { const last = bands[bands.length - 1]; const from = last ? last.to : b.min; setBands([...bands, mkGaugeBand(from, b.max, PLOT_COLORS[2].hex)]); }} style={addBtnStyle}>
        <Plus size={12} color={T.accent} /> Farbbereich
      </button>

      <div style={sectionHead}>SOLLWERT-MARKE</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 150 }}><Field label="QUELLE"><Select value={sp} onChange={(e) => patch(b.id, { setpointMode: e.target.value })} options={[{ value: "none", label: "Keine" }, { value: "fixed", label: "Fester Wert" }, { value: "symbol", label: mode === "usercontrol" ? "Aus Attribut" : "Aus Symbol" }]} /></Field></div>
        {sp === "fixed" && <div style={{ flex: 1 }}><Field label="WERT"><TextInput type="number" value={b.setpointValue} onChange={(e) => patch(b.id, { setpointValue: e.target.value })} /></Field></div>}
        {sp === "symbol" && <div style={{ flex: 1 }}><Field label={sm.label}><TextInput value={b.setpointSymbol} onChange={(e) => patch(b.id, { setpointSymbol: e.target.value })} placeholder={sm.ph} /></Field></div>}
      </div>
      {sp !== "none" && <Field label="MARKENFARBE"><HexSwatches value={b.setpointColor} onChange={(hx) => patch(b.id, { setpointColor: hx })} /></Field>}
      <div style={hint}>Farbbereiche werden halbtransparent hinter dem Zeiger gezeichnet. Min/Max können optional live aus der PLC kommen (überschreiben dann die statischen Werte).</div>
    </>
  );
}

export { BarEditor, GaugeEditor };
