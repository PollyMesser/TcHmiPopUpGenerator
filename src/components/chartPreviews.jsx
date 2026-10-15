import React from "react";

// ── Editor-Vorschau für Balkendiagramm und Gauge ──
// Statische SVG/DIV-Attrappen mit Beispielwerten (kein Plotly im Generator).
// Das echte Rendering erfolgt zur Laufzeit in der HMI per Plotly.

const num = (v, d) => { const n = Number(v); return v === "" || v == null || !isFinite(n) ? d : n; };
const optNum = (v) => { const s = v == null ? "" : String(v).trim(); if (s === "") return null; const n = Number(s); return isFinite(n) ? n : null; };
const unitStr = (u) => { u = (u || "").trim(); return u ? (u === "%" ? u : " " + u) : ""; };
const SAMPLE = [0.62, 0.81, 0.45, 0.93, 0.28, 0.7, 0.55, 0.38];

function hexA(hex, a) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || ""));
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function BarPreview({ b, pal }) {
  const isArray = b.source === "array";
  const n = isArray ? Math.min(12, Math.max(1, parseInt(b.arrayCount) || 1)) : (b.bars || []).length;
  const lo = b.autoscale === false ? num(b.min, 0) : 0;
  const hi = b.autoscale === false ? num(b.max, 100) : 100;
  const span = (hi - lo) || 1;
  const limLow = optNum(b.limitLow), limHigh = optNum(b.limitHigh);
  const dec = Math.max(0, parseInt(b.decimals) || 0);
  const items = Array.from({ length: n }, (_, i) => {
    const v = lo + span * SAMPLE[i % SAMPLE.length];
    const out = (limLow !== null && v < limLow) || (limHigh !== null && v > limHigh);
    const base = isArray ? b.arrayColor : (b.bars[i] || {}).color;
    return {
      label: isArray ? `${b.labelPrefix || ""}${(parseInt(b.startIndex) || 0) + i}` : ((b.bars[i] || {}).label || ""),
      pct: Math.max(0, Math.min(100, (v - lo) / span * 100)),
      color: out ? b.limitColor : base,
      text: v.toFixed(dec) + unitStr(b.unit),
    };
  });
  const limPct = (v) => Math.max(0, Math.min(100, (v - lo) / span * 100));
  const h = Math.max(120, parseInt(b.height) || 260);
  const horizontal = b.orientation === "h";
  const cap = (b.caption || "").trim();
  const limLines = [limLow, limHigh].filter((v) => v !== null);
  return (
    <div style={{ marginBottom: 16 }}>
      {cap && <div style={{ fontSize: 20, fontWeight: 600, color: pal.titleColor, marginBottom: 6 }}>{cap}</div>}
      {!horizontal ? (
        <div style={{ position: "relative", height: Math.min(h, 220), display: "flex", alignItems: "flex-end", gap: 10, padding: "18px 4px 22px", borderBottom: `1px solid ${pal.border}` }}>
          {limLines.map((v, k) => <div key={k} style={{ position: "absolute", left: 0, right: 0, bottom: `calc(22px + (100% - 40px) * ${limPct(v) / 100})`, borderTop: `1.5px dashed ${b.limitColor}` }} />)}
          {items.map((it, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", position: "relative" }}>
              {b.showValues !== false && <div style={{ fontSize: 11, color: pal.bodyText, marginBottom: 2, whiteSpace: "nowrap" }}>{it.text}</div>}
              <div style={{ width: "70%", height: `${it.pct}%`, background: it.color, borderRadius: "3px 3px 0 0" }} />
              <div style={{ position: "absolute", bottom: -20, fontSize: 11, color: pal.bodyText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{it.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 70, fontSize: 12, color: pal.bodyText, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>
              <div style={{ flex: 1, position: "relative", height: 16 }}>
                {limLines.map((v, k) => <div key={k} style={{ position: "absolute", top: -3, bottom: -3, left: `${limPct(v)}%`, borderLeft: `1.5px dashed ${b.limitColor}` }} />)}
                <div style={{ width: `${it.pct}%`, height: "100%", background: it.color, borderRadius: "0 3px 3px 0" }} />
              </div>
              {b.showValues !== false && <span style={{ width: 64, fontSize: 11, color: pal.bodyText, fontVariantNumeric: "tabular-nums" }}>{it.text}</span>}
            </div>
          ))}
        </div>
      )}
      {isArray && <div style={{ fontSize: 10, color: pal.bodyText, opacity: 0.6, marginTop: 6 }}>Vorschau mit Beispielwerten · Array: {(b.arraySymbol || "").trim() || "(kein Symbol)"}[{parseInt(b.startIndex) || 0}…]</div>}
    </div>
  );
}

function GaugePreview({ b, pal }) {
  const lo = num(b.min, 0);
  const hi0 = num(b.max, 100);
  const hi = hi0 > lo ? hi0 : lo + 100;
  const span = hi - lo;
  const v = lo + span * 0.62;
  const dec = Math.max(0, parseInt(b.decimals) || 0);
  const frac = (x) => Math.max(0, Math.min(1, (x - lo) / span));
  const bands = (b.bands || []).map((s) => ({ f: optNum(s.from), t: optNum(s.to), c: hexA(s.color, 0.35) })).filter((s) => s.f !== null && s.t !== null && s.t > s.f);
  const sp = b.setpointMode === "fixed" ? optNum(b.setpointValue) : (b.setpointMode === "symbol" ? lo + span * 0.8 : null);
  const label = (b.label || "").trim();
  const text = v.toFixed(dec) + unitStr(b.unit);

  if (b.shape === "bullet") {
    return (
      <div style={{ marginBottom: 16 }}>
        {label && <div style={{ fontSize: 14, color: pal.bodyText, marginBottom: 4 }}>{label}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: pal.bodyText, minWidth: 70, fontVariantNumeric: "tabular-nums" }}>{text}</span>
          <div style={{ flex: 1, position: "relative", height: 26, background: "rgba(127,127,127,0.12)", borderRadius: 3 }}>
            {bands.map((s, i) => <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${frac(s.f) * 100}%`, width: `${(frac(s.t) - frac(s.f)) * 100}%`, background: s.c }} />)}
            <div style={{ position: "absolute", top: "25%", bottom: "25%", left: 0, width: `${frac(v) * 100}%`, background: b.barColor }} />
            {sp !== null && <div style={{ position: "absolute", top: -2, bottom: -2, left: `${frac(sp) * 100}%`, borderLeft: `4px solid ${b.setpointColor}` }} />}
          </div>
        </div>
      </div>
    );
  }

  const W = 220, H = 130, cx = W / 2, cy = 118, r = 92, sw = 26;
  const pt = (f, rr) => { const a = Math.PI * (1 - f); return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)]; };
  const arc = (f0, f1, rr) => { const [x0, y0] = pt(f0, rr); const [x1, y1] = pt(f1, rr); return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${rr} ${rr} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ fontSize: 14, color: pal.bodyText, marginBottom: 2 }}>{label}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 300, display: "block", margin: "0 auto" }}>
        <path d={arc(0, 1, r)} stroke="rgba(127,127,127,0.18)" strokeWidth={sw} fill="none" />
        {bands.map((s, i) => <path key={i} d={arc(frac(s.f), frac(s.t), r)} stroke={s.c} strokeWidth={sw} fill="none" />)}
        <path d={arc(0, frac(v), r)} stroke={b.barColor} strokeWidth={sw * 0.35} fill="none" />
        {sp !== null && (() => { const [x0, y0] = pt(frac(sp), r - sw * 0.45); const [x1, y1] = pt(frac(sp), r + sw * 0.45); return <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={b.setpointColor} strokeWidth={4} />; })()}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="600" fill={pal.bodyText}>{text}</text>
        <text x={pt(0, r)[0]} y={cy + 10} textAnchor="middle" fontSize="10" fill={pal.bodyText} opacity="0.7">{lo}</text>
        <text x={pt(1, r)[0]} y={cy + 10} textAnchor="middle" fontSize="10" fill={pal.bodyText} opacity="0.7">{hi}</text>
      </svg>
    </div>
  );
}

export { BarPreview, GaugePreview };
