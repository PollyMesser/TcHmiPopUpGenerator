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

// ── Auswertung: schematische Skizze (echte Daten erst zur Laufzeit vom Server) ──
function AnalysisPreview({ b, pal }) {
  const W = 600, H = 200;
  const c1 = "#4a9eff", c2 = "#38b48b", c3 = "#f0a030";
  const sat = (x, A, y0, tau) => A - (A - y0) * Math.exp(-x / tau);
  const path = (fn, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const x = i / n; return `${i ? "L" : "M"} ${(20 + x * (W - 40)).toFixed(1)} ${(H - 20 - fn(x) * (H - 40)).toFixed(1)}`; }).join(" ");
  let body;
  if (b.widget === "filtration") {
    // vereinfachte HMI-Fassung: Band (25.–75. Perzentil) + Median
    const up = (x) => Math.min(1, 1.25 * sat(x, 0.75, 0.15, 0.3)), dn = (x) => 0.75 * sat(x, 0.75, 0.15, 0.3);
    const pts = (fn) => Array.from({ length: 41 }, (_, i) => { const x = i / 40; return [20 + x * (W - 40), H - 20 - fn(x) * (H - 40)]; });
    const band = [...pts(up), ...pts(dn).reverse()].map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
    body = (<>
      <path d={band} fill={c1} fillOpacity="0.16" stroke="none" />
      <path d={path((x) => sat(x, 0.75, 0.15, 0.3))} stroke={c1} strokeWidth="3" fill="none" />
    </>);
  } else if (b.widget === "steps") {
    const ys = [0.5, 0.58, 0.62, 0.45, 0.4, 0.3, 0.38, 0.66, 0.35, 0.4];
    body = (<>
      {ys.map((y, i) => <rect key={i} x={30 + i * 56} y={H - 20 - y * 0.5 * (H - 40)} width="18" height={y * 0.5 * (H - 40)} fill={c1} fillOpacity="0.25" stroke={c1} />)}
      <path d={ys.map((y, i) => `${i ? "L" : "M"} ${39 + i * 56} ${H - 20 - y * (H - 40)}`).join(" ")} stroke={c1} strokeWidth="2" fill="none" />
      <path d={ys.map((y, i) => `${i ? "L" : "M"} ${39 + i * 56} ${H - 20 - 0.15 * (H - 40)}`).join(" ")} stroke={c3} strokeWidth="2" fill="none" />
    </>);
  } else if (b.chart === "scatter") {
    body = Array.from({ length: 60 }, (_, i) => <circle key={i} cx={30 + ((i * 37) % 540)} cy={H - 30 - ((i * 53) % 140)} r="3.5" fill={c1} fillOpacity="0.7" />);
  } else if (b.chart === "bar") {
    body = [0.5, 0.8, 0.35, 0.65, 0.9, 0.4].map((y, i) => <g key={i}><rect x={40 + i * 90} y={H - 20 - y * (H - 40)} width="26" height={y * (H - 40)} fill={c1} /><rect x={68 + i * 90} y={H - 20 - y * 0.6 * (H - 40)} width="26" height={y * 0.6 * (H - 40)} fill={c2} /></g>);
  } else {
    body = (<>
      <path d={path((x) => 0.5 + 0.25 * Math.sin(x * 7), 14)} stroke={c1} strokeWidth="2" fill="none" />
      <path d={path((x) => 0.3 + 0.1 * Math.cos(x * 5), 14)} stroke={c2} strokeWidth="2" fill="none" />
    </>);
  }
  const src = b.srcMode === "historize" && b.widget !== "trend" ? `${b.hzDomain || "TcHmiPostgresHistorize"}, letzte ${b.hzDays || 3} Tage, Berechnung im Panel`
    : b.srcMode === "server" ? `Server-Symbol ${b.srcSymbol || "?"}` : `${b.srcMethod || "GET"} ${b.srcUrl || "?"}`;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: pal.titleColor }}>{(b.caption || "").trim() || "Auswertung"}</span>
        <span style={{ fontSize: 14, border: `1px solid ${pal.border}`, borderRadius: 6, padding: "4px 10px", color: pal.bodyText }}>Aktualisieren</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", border: `1px dashed ${pal.border}`, borderRadius: 6 }}>
        <line x1="20" y1={H - 20} x2={W - 20} y2={H - 20} stroke={pal.border} />
        <line x1="20" y1="20" x2="20" y2={H - 20} stroke={pal.border} />
        {body}
      </svg>
      <div style={{ fontSize: 11, color: pal.bodyText, opacity: 0.6, marginTop: 6 }}>Skizze – Daten zur Laufzeit: {src}</div>
    </div>
  );
}

export { BarPreview, GaugePreview, AnalysisPreview };
