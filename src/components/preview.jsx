import React from "react";
import { COLORS, ICONS, TEXT_BG } from "../constants/palette.js";

// ── Vorschau-Renderer (Editor-Vorschau, nicht der generierte Code) ──
function ItemPreview({ cfg, pal, on, onToggle }) {
  if (cfg.kind === "read") {
    const u = (cfg.unit || "").trim();
    const uStr = u ? (u === "%" ? u : " " + u) : "";
    return (
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 14, color: pal.bodyText }}>{cfg.label}</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: pal.bodyText, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{"…" + uStr}</span>
      </div>
    );
  }
  if (cfg.kind === "bool") return (
    <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} title="Klicken zum Umschalten (nur Vorschau)">
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: on ? pal.active : pal.inactive, transition: "background .15s" }} />
      <span style={{ fontSize: 14, color: pal.bodyText }}>{cfg.label}</span>
    </div>
  );
  if (cfg.kind === "check") return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <input type="checkbox" checked={on} onChange={onToggle} style={{ width: 20, height: 20, flex: "0 0 auto", cursor: "pointer", accentColor: pal.active }} />
      <span style={{ fontSize: 14, color: pal.bodyText }}>{cfg.label}</span>
    </label>
  );
  if (cfg.kind === "button") { const c = COLORS[cfg.color] || COLORS.blue; return (
    <div style={{ padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, background: c.bg, color: c.text, textAlign: "center" }}>{cfg.label}</div>
  ); }
  const c = COLORS[cfg.sendColor] || COLORS.blue;
  const u = (cfg.unit || "").trim();
  return (
    <div>
      <div style={{ fontSize: 13, color: pal.bodyText, marginBottom: 6 }}>{cfg.label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input type={cfg.dataType === "time" || cfg.dataType === "text" ? "text" : "number"} placeholder={cfg.dataType === "time" ? "HH:MM:SS" : "…"}
          style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "9px 10px", borderRadius: 8, fontSize: 14, outline: "none", textAlign: cfg.dataType === "time" ? "center" : "right", border: `1px solid ${pal.border}`, background: pal.boxBg, color: pal.bodyText }} />
        {u && <span style={{ flex: "0 0 auto", alignSelf: "center", fontSize: 13, color: pal.bodyText, opacity: 0.75 }}>{u}</span>}
        {cfg.sendButton !== false && <div style={{ flex: "0 0 auto", padding: "0 16px", display: "flex", alignItems: "center", borderRadius: 8, fontSize: 13, fontWeight: 600, background: c.bg, color: c.text }}>{cfg.sendLabel || "Setzen"}</div>}
      </div>
    </div>
  );
}
function BlockPreview({ b, pal, on, onToggle }) {
  if (b.type === "text") { const bgc = b.bgColor && TEXT_BG[b.bgColor]; const hc = bgc ? bgc.text : pal.bodyText; const ic = b.icon && ICONS[b.icon]; const icColor = b.iconColor || hc; const content = (<div style={{ flex: ic ? "1 1 auto" : undefined, minWidth: ic ? 0 : undefined }}>{b.heading ? <div style={{ fontSize: 14, fontWeight: 600, color: hc, marginBottom: 4 }}>{b.heading}</div> : null}<div style={{ fontSize: 14, color: hc, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{b.text}</div></div>); return <div style={{ padding: bgc ? "8px 10px" : "0 0 3px", marginBottom: 16, background: bgc ? bgc.bg : "transparent", borderRadius: bgc ? 6 : 0, display: ic ? "flex" : "block", alignItems: "flex-start", gap: 8 }}>{ic ? <span style={{ flex: "0 0 auto", display: "inline-flex", lineHeight: 0, marginTop: 1, color: icColor }} dangerouslySetInnerHTML={{ __html: ic.svg }} /> : null}{content}</div>; }
  if (b.type === "button") return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      {b.buttons.map((bt, bi) => { const c = COLORS[bt.color] || COLORS.blue; return <div key={bi} style={{ flex: 1, padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, background: c.bg, color: c.text, textAlign: "center" }}>{bt.label}</div>; })}
    </div>
  );
  if (b.type === "row") return (
    <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
      {b.items.map((it) => <div key={it.id} style={{ flex: 1, minWidth: 0 }}><ItemPreview cfg={it} pal={pal} on={!!on[it.id]} onToggle={() => onToggle(it.id)} /></div>)}
    </div>
  );
  if (b.type === "enum") {
    const e0 = (b.map && b.map[0]) || null;
    const col = e0 ? (COLORS[e0.color] || COLORS.grey) : (COLORS[b.fbColor] || COLORS.grey);
    const txt = e0 ? (e0.text || "…") : (b.fbText || "…");
    const badgeStyle = b.display === "badge"
      ? { display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: col.bg, color: col.text }
      : { fontSize: 14, fontWeight: 600, color: col.bg };
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {(b.label || b.loc) ? <span style={{ fontSize: 14, color: pal.bodyText }}>{b.label}:</span> : null}
        <span style={badgeStyle}>{txt}</span>
      </div>
    );
  }
  if (b.type === "enumset") { const sc = COLORS[b.sendColor] || COLORS.blue; return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: pal.bodyText, marginBottom: 6 }}>{b.label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 8, fontSize: 14, border: `1px solid ${pal.border}`, background: pal.boxBg, color: pal.bodyText }}>
          <span>{(b.map && b.map[0]) ? (b.map[0].text || "…") : "…"}</span>
          <span style={{ color: pal.closeColor }}>▾</span>
        </div>
        {b.sendButton && <div style={{ flex: "0 0 auto", padding: "0 16px", display: "flex", alignItems: "center", borderRadius: 8, fontSize: 13, fontWeight: 600, background: sc.bg, color: sc.text }}>{b.sendLabel || "Setzen"}</div>}
      </div>
    </div>
  ); }
  if (b.type === "status") {
    const e0 = (b.map && b.map[0]) || null;
    const col = e0 ? (COLORS[e0.color] || COLORS.grey) : (COLORS[b.fbColor] || COLORS.grey);
    const txt = e0 ? (e0.text || "…") : (b.fbText || "…");
    const badgeStyle = b.display === "text"
      ? { fontSize: 14, fontWeight: 600, color: col.bg }
      : { display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: col.bg, color: col.text };
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {(b.label || b.loc) ? <span style={{ fontSize: 14, color: pal.bodyText }}>{b.label}:</span> : null}
        <span style={badgeStyle}>{txt}</span>
      </div>
    );
  }
  if (b.type === "plot") {
    const axLabel = (b.axes || []).map((a) => (a.label || a.unit ? `${a.label || ""}${a.unit ? " (" + a.unit + ")" : ""}` : "")).filter(Boolean).join(" · ");
    return (
      <div style={{ marginBottom: 16 }}>
        {(b.showToolbar || b.zoomEnabled !== false) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontSize: 13, fontWeight: 600, color: pal.titleColor }}>
            <span style={{ flex: 1 }}>{b.showToolbar ? (b.caption || "Verlauf") : ""}</span>
            {b.zoomEnabled !== false && <span style={{ border: `1px solid ${pal.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, color: pal.bodyText }}>{b.resetLabel != null ? (b.resetLabel || "Zurücksetzen") : "Zurücksetzen"}</span>}
            {b.showToolbar && <span style={{ border: `1px solid ${pal.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, color: pal.bodyText }}>{b.nowLabel != null ? (b.nowLabel || "Jetzt") : "Jetzt"}</span>}
          </div>
        )}
        {(b.timeButtons || []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {b.timeButtons.map((t) => (
              <span key={t.id} style={{ border: `1px solid ${pal.border}`, borderRadius: 5, padding: "2px 8px", fontSize: 11, color: pal.bodyText, background: pal.headerBg }}>{t.label || (t.unit === "all" ? "Alle" : (t.count + " " + t.unit))}</span>
            ))}
          </div>
        )}
        {(b.series || []).length >= 2 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 8 }}>
            {b.series.map((s) => (
              <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: pal.bodyText }}>
                <span style={{ width: 14, height: 3, borderRadius: 2, background: s.color }} />{s.label || "Signal"}
              </span>
            ))}
          </div>
        )}
        <div style={{ position: "relative", width: "100%", height: Math.max(120, Math.min(220, Number(b.plotHeight) || 360)), borderRadius: 8, border: `1px solid ${pal.border}`, background: "rgba(127,127,127,0.06)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="100%" height="100%" viewBox="0 0 300 140" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, opacity: 0.9 }}>
            {(b.series || []).slice(0, 4).map((s, i) => (
              <polyline key={s.id} fill="none" stroke={s.color} strokeWidth="1.5"
                points={`0,${90 - i * 12} 60,${70 - i * 10} 120,${95 - i * 8} 180,${55 - i * 12} 240,${80 - i * 6} 300,${50 - i * 10}`} />
            ))}
            {(b.refLines || []).map((r, i) => (
              <line key={r.id} x1="0" x2="300" y1={40 + i * 18} y2={40 + i * 18} stroke={r.color} strokeWidth="1" strokeDasharray={r.dash === "dot" ? "2,3" : r.dash === "dashdot" ? "6,3,2,3" : r.dash === "solid" ? "" : "5,4"} />
            ))}
          </svg>
          <span style={{ position: "relative", fontSize: 11, color: pal.bodyText, opacity: 0.7, background: pal.boxBg, padding: "2px 8px", borderRadius: 6 }}>
            Plotly-Vorschau {axLabel ? "· " + axLabel : ""}
          </span>
        </div>
        {!!b.showStats && (
          <div style={{ marginTop: 8, border: `1px solid ${pal.border}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: pal.bodyText }}>
              <span>▾</span><span style={{ flex: 1 }}>Statistik</span><span style={{ fontWeight: 400, opacity: 0.75 }}>Zeitraum:</span><span style={{ fontVariantNumeric: "tabular-nums" }}>3 h 30 min</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: pal.bodyText }}>
              <thead><tr>
                {["", "Min", "Max", "Mittel", "Median", "Aktuell"].map((h, hi) => (
                  <th key={hi} style={{ textAlign: hi === 0 ? "left" : "right", padding: "5px 10px", borderTop: `1px solid ${pal.border}`, fontWeight: 600, opacity: 0.8, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(b.series || []).map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: "5px 10px", borderTop: `1px solid ${pal.border}`, whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-block", width: 10, height: 3, borderRadius: 2, background: s.color, marginRight: 6, verticalAlign: "middle" }} />{s.label || "Signal"}
                    </td>
                    {["–", "–", "–", "–", "–"].map((v, vi) => (
                      <td key={vi} style={{ padding: "5px 10px", borderTop: `1px solid ${pal.border}`, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 11, color: pal.bodyText, opacity: 0.55, marginTop: 4 }}>
          {b.dataMode === "history" ? "History + Live" : "Live"} · {(b.series || []).length} Signal(e){(b.eventMarkers || []).length ? " · " + b.eventMarkers.length + " Marker" : ""}
        </div>
      </div>
    );
  }
  if (b.type === "table") {
    const nRows = b.dataSource === "array" ? Math.min(4, Math.max(1, parseInt(b.arrayCount) || 3)) : Math.min(4, (b.rows || []).length || 1);
    const cellPrev = (cl, ri) => {
      if (cl.kind === "text") { const cell = b.dataSource === "array" ? {} : (((b.rows || [])[ri] || {}).cells || [])[b.columns.indexOf(cl)] || {}; return <span>{cell.text || "Text"}</span>; }
      if (cl.kind === "bool") return <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: pal.inactive || "#9ca3af" }} />;
      if (cl.kind === "check") return <input type="checkbox" readOnly checked={false} style={{ pointerEvents: "none" }} />;
      if (cl.kind === "input") return <span style={{ display: "inline-block", width: 56, padding: "1px 5px", border: `1px solid ${pal.border}`, borderRadius: 4, textAlign: "right", opacity: 0.7 }}>–</span>;
      if (cl.kind === "button") return <span style={{ display: "inline-block", padding: "2px 10px", border: `1px solid ${pal.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{cl.label || "OK"}</span>;
      if (cl.kind === "enum") { const e = (cl.map || [])[ri % Math.max(1, (cl.map || []).length)] ; const col = COLORS[e?.color] || COLORS.grey; return <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 9, fontSize: 11, fontWeight: 600, background: col.bg, color: col.text }}>{e?.label || "?"}</span>; }
      if (cl.kind === "icon") { const e = (cl.map || [])[ri % Math.max(1, (cl.map || []).length)]; const col = COLORS[e?.color] || COLORS.grey; const ic = ICONS[e?.icon] || ICONS.info; return <span style={{ display: "inline-flex", color: col.bg, verticalAlign: "middle" }} dangerouslySetInnerHTML={{ __html: ic.svg }} />; }
      return <span style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>–</span>;
    };
    return (
      <div style={{ marginBottom: 16 }}>
        {(b.caption || b.search !== false) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: pal.titleColor }}>{b.caption || ""}</span>
            {b.search !== false && <span style={{ width: 120, padding: "3px 8px", border: `1px solid ${pal.border}`, borderRadius: 6, fontSize: 11, color: pal.bodyText, opacity: 0.6 }}>Suchen…</span>}
          </div>
        )}
        <div style={{ border: `1px solid ${pal.border}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: pal.bodyText }}>
            {b.showHeader !== false && (
              <thead><tr style={{ background: pal.headerBg }}>
                {!!b.showIndex && <th style={{ padding: "6px 10px", fontSize: 11, textAlign: "right", color: pal.titleColor }}>#</th>}
                {(b.columns || []).map((cl, ci) => (
                  <th key={cl.id} style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, color: pal.titleColor, textAlign: cl.kind === "read" || cl.kind === "input" ? "right" : "left", whiteSpace: "nowrap" }}>{cl.header || `Spalte ${ci + 1}`}</th>
                ))}
              </tr></thead>
            )}
            <tbody>
              {Array.from({ length: nRows }, (_, ri) => (
                <tr key={ri} style={{ background: b.striped !== false && ri % 2 === 1 ? "rgba(127,127,127,0.06)" : "transparent" }}>
                  {!!b.showIndex && <td style={{ padding: "5px 10px", borderTop: `1px solid ${pal.border}`, fontSize: 11, opacity: 0.6, textAlign: "right" }}>{(parseInt(b.startIndex) || 0) + ri}</td>}
                  {(b.columns || []).map((cl) => (
                    <td key={cl.id} style={{ padding: "5px 10px", borderTop: `1px solid ${pal.border}`, textAlign: cl.kind === "read" || cl.kind === "input" ? "right" : cl.kind === "text" ? "left" : "center", whiteSpace: "nowrap" }}>{cellPrev(cl, ri)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: pal.bodyText, opacity: 0.55, marginTop: 4 }}>
          <span>{b.dataSource === "array" ? `PLC-Array (max. ${b.arrayCount})` : `${(b.rows || []).length} feste Zeile(n)`}{(b.rules || []).length ? ` · ${b.rules.length} Regel(n)` : ""}</span>
          {Number(b.pageSize) > 0 && <span>‹ 1 / n ›</span>}
        </div>
      </div>
    );
  }
  if (b.type === "progress") {
    const col = COLORS[b.color] || COLORS.blue;
    const mn = Number(b.min) || 0;
    const mx = isNaN(Number(b.max)) ? 100 : Number(b.max);
    const dec = Math.max(0, parseInt(b.decimals) || 0);
    const unit = (b.unit || "").trim();
    const unitStr = unit ? (unit === "%" ? unit : " " + unit) : "";
    const sample = mn + (mx - mn) * 0.65;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 14, color: pal.bodyText }}>{b.label}</span>
          {b.showValue !== false && <span style={{ fontSize: 13, fontWeight: 600, color: pal.bodyText, fontVariantNumeric: "tabular-nums" }}>{sample.toFixed(dec) + unitStr}</span>}
        </div>
        <div style={{ position: "relative", width: "100%", height: 14, borderRadius: 7, overflow: "hidden", background: "rgba(127,127,127,0.22)" }}>
          <div style={{ height: "100%", width: "65%", borderRadius: 7, background: col.bg }} />
        </div>
      </div>
    );
  }
  if (b.type === "divider") {
    const cap = (b.label || "").trim();
    if (!cap) return <div style={{ height: 1, background: pal.border, margin: "6px 0 18px" }} />;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0 18px" }}>
        <div style={{ flex: 1, height: 1, background: pal.border }} />
        <span style={{ flex: "0 0 auto", fontSize: 12, fontWeight: 600, letterSpacing: 0.3, color: pal.closeColor }}>{cap}</span>
        <div style={{ flex: 1, height: 1, background: pal.border }} />
      </div>
    );
  }
  return <div style={{ marginBottom: 16 }}><ItemPreview cfg={{ ...b, kind: b.type }} pal={pal} on={!!on[b.id]} onToggle={() => onToggle(b.id)} /></div>;
}


export { ItemPreview, BlockPreview };
