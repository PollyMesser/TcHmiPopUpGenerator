import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { T } from "../../constants/theme.js";
import { Field, IconBtn, Select, TextInput } from "../primitives.jsx";
import { mkTrendCol, mkStepLimit, ANALYSIS_DEFAULTS } from "../../model/factories.js";
import { STEP_CATALOG, groupOrder } from "../../../analytics/core/stepCatalog.js";
import { METRICS, AGGS } from "../../../analytics/core/metrics.js";

// ── Editor: Auswertung (Maschinendaten) ──
// Filtrationskurven / Schrittdauern / Verlauf. Die Berechnung läuft serverseitig
// (analytics/core); hier werden Datenquelle, Anfrage-Optionen und Darstellung gepflegt.

const sectionHead = { fontSize: 11, color: T.muted, fontWeight: 600, margin: "12px 0 6px" };
const hint = { fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 6 };
const addBtnStyle = { display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" };
const chipRow = { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 };

function Check({ checked, onChange, children }) {
  return <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {children}</label>;
}
// Mehrfachauswahl als Chips (Reihenfolge = Klickreihenfolge, wie w.series in der App)
function Chips({ options, value, onChange }) {
  const set = value || [];
  return (
    <div style={chipRow}>
      {options.map((o) => {
        const on = set.includes(o.value);
        return <button key={o.value} onClick={() => onChange(on ? set.filter((v) => v !== o.value) : [...set, o.value])}
          style={{ background: on ? T.accentDim : "transparent", color: on ? "#062611" : T.text, border: `1px solid ${on ? T.accentDim : T.border}`, borderRadius: 12, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{o.label}</button>;
      })}
    </div>
  );
}

// Hauptschritte der Prozesszeit (ohne Pause), Reihenfolge laut Katalog
const MAIN_GROUPS = [...new Set(STEP_CATALOG.filter((s) => s.group && s.category !== "pause" && s.category !== "ignored").map((s) => s.group))]
  .sort((a, b) => groupOrder(a) - groupOrder(b));
const STEP_SERIES_OPTS = [
  { value: "cat:active", label: "Σ Aktivzeit" }, { value: "cat:secondary", label: "Σ Nebenzeit" }, { value: "cat:total", label: "Σ Prozesszeit" },
  ...MAIN_GROUPS.map((g) => ({ value: "g:" + g, label: g })), { value: "g:Pause", label: "Pause" },
];
const STAT_OPTS = [{ value: "avg", label: "Ø ± SD" }, { value: "median", label: "Median" }, { value: "min", label: "Min" }, { value: "max", label: "Max" }, { value: "sum", label: "Σ Summe (Balken)" }];
const METRIC_OPTS = METRICS.map((m) => ({ value: m.key, label: m.unit ? `${m.label} [${m.unit}]` : m.label }));
const AGG_LABEL = { avg: "Mittelwert", min: "Minimum", max: "Maximum", sum: "Summe", median: "Median" };
const AGG_OPTS = AGGS.map((a) => ({ value: a, label: AGG_LABEL[a] }));

function AnalysisEditor({ b, patch, mode }) {
  const set = (p) => patch(b.id, p);
  const uc = mode === "usercontrol";
  // Widget-Wechsel: Überschrift/Demo-URL mitziehen, solange sie noch dem Standard des alten Widgets entsprechen
  const changeWidget = (w) => {
    const old = ANALYSIS_DEFAULTS[b.widget] || {};
    const nu = ANALYSIS_DEFAULTS[w] || {};
    const p = { widget: w };
    if (!b.caption || b.caption === old.caption) p.caption = nu.caption;
    if (!b.srcUrl || b.srcUrl === old.srcUrl) p.srcUrl = nu.srcUrl;
    set(p);
  };
  const cols = b.trendColumns || [];
  const hz = b.srcMode === "historize" && b.widget !== "trend";
  const limits = b.stepLimits || [];
  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="AUSWERTUNG"><Select value={b.widget} onChange={(e) => changeWidget(e.target.value)} options={[{ value: "filtration", label: "Filtrationskurven" }, { value: "steps", label: "Schrittdauern" }, { value: "trend", label: "Verlauf / Balken / Streu" }]} /></Field></div>
        <div style={{ width: 100 }}><Field label="HÖHE (px)"><TextInput type="number" value={b.height} onChange={(e) => set({ height: e.target.value })} /></Field></div>
        <div style={{ width: 96 }}><Field label="NACHKOMMA"><TextInput type="number" value={b.decimals} onChange={(e) => set({ decimals: e.target.value })} /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="ÜBERSCHRIFT"><TextInput value={b.caption} onChange={(e) => set({ caption: e.target.value })} /></Field></div>
        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.captionLoc} onChange={(e) => set({ captionLoc: e.target.value })} placeholder="L_…" /></Field></div>
      </div>

      {b.widget === "filtration" && (
        <div style={hint}>Filtrationsleistung während der Beschickung, x-Achse in % der Beschickungsdauer: Median-Kurve mit Band (25.–75. Perzentil) über alle Zyklen, darunter Zyklenzahl und Mediane von Beschickungsdauer, Start- und Endwert. Gruppierung nach Material folgt später.</div>
      )}

      {b.widget === "steps" && (
        <>
          <div style={sectionHead}>SCHRITTDAUERN</div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 160 }}><Field label="ZEITACHSE"><Select value={b.bucket} onChange={(e) => set({ bucket: e.target.value })} options={[{ value: "day", label: "Tag" }, { value: "week", label: "Woche (KW)" }]} /></Field></div>
          </div>
          <Field label="KURVEN"><Chips options={STEP_SERIES_OPTS} value={b.stepSeries} onChange={(v) => set({ stepSeries: v })} /></Field>
          <Field label="STATISTIKEN (Strichart)"><Chips options={STAT_OPTS} value={b.stepStats} onChange={(v) => set({ stepStats: v })} /></Field>
          <Field label="AKTIVZEIT = HAUPTSCHRITTE"><Chips options={MAIN_GROUPS.map((g) => ({ value: g, label: g }))} value={b.activeGroups} onChange={(v) => set({ activeGroups: v })} /></Field>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>GRENZWERTE JE HAUPTSCHRITT (min) – außerhalb: Schritt fällt für den Zyklus heraus</div>
          {limits.map((l) => (
            <div key={l.id} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 2 }}><Field label="HAUPTSCHRITT"><Select value={l.group} onChange={(e) => set({ stepLimits: limits.map((x) => (x.id === l.id ? { ...x, group: e.target.value } : x)) })} options={MAIN_GROUPS.map((g) => ({ value: g, label: g }))} /></Field></div>
              <div style={{ width: 90 }}><Field label="MIN"><TextInput type="number" value={l.minMin} onChange={(e) => set({ stepLimits: limits.map((x) => (x.id === l.id ? { ...x, minMin: e.target.value } : x)) })} placeholder="–" /></Field></div>
              <div style={{ width: 90 }}><Field label="MAX"><TextInput type="number" value={l.maxMin} onChange={(e) => set({ stepLimits: limits.map((x) => (x.id === l.id ? { ...x, maxMin: e.target.value } : x)) })} placeholder="–" /></Field></div>
              <div style={{ marginBottom: 12 }}><IconBtn danger onClick={() => set({ stepLimits: limits.filter((x) => x.id !== l.id) })} title="Entfernen"><Trash2 size={13} /></IconBtn></div>
            </div>
          ))}
          <button onClick={() => set({ stepLimits: [...limits, mkStepLimit(MAIN_GROUPS[0])] })} style={addBtnStyle}><Plus size={12} color={T.accent} /> Grenzwert</button>
          <div style={{ marginTop: 8 }}><Check checked={!!b.showSubsteps} onChange={(v) => set({ showSubsteps: v })}>Unterschritte in der Tabelle zeigen</Check></div>
        </>
      )}

      {b.widget === "trend" && (
        <>
          <div style={sectionHead}>VERLAUF</div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field label="DARSTELLUNG"><Select value={b.chart} onChange={(e) => set({ chart: e.target.value })} options={[{ value: "line", label: "Linie (je Tag)" }, { value: "bar", label: "Balken (je Gruppe)" }, { value: "scatter", label: "Streudiagramm" }]} /></Field></div>
            {b.chart !== "line" && <div style={{ flex: 1 }}><Field label={b.chart === "scatter" ? "FARBE NACH" : "GRUPPIERUNG"}><Select value={b.trendGroupBy} onChange={(e) => set({ trendGroupBy: e.target.value })} options={[{ value: "none", label: "Keine (Gesamt)" }, { value: "material", label: "Material" }, { value: "serien_nr", label: "Maschine" }, { value: "schritt", label: "Schritt" }, { value: "tag", label: "Tag" }, { value: "kunde", label: "Kunde" }]} /></Field></div>}
          </div>
          {b.chart === "scatter" ? (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><Field label="X-ACHSE"><Select value={b.scX} onChange={(e) => set({ scX: e.target.value })} options={METRIC_OPTS} /></Field></div>
              <div style={{ flex: 1 }}><Field label="Y-ACHSE"><Select value={b.scY} onChange={(e) => set({ scY: e.target.value })} options={METRIC_OPTS} /></Field></div>
            </div>
          ) : (
            <>
              {cols.map((c) => (
                <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 2 }}><Field label="KENNZAHL"><Select value={c.key} onChange={(e) => set({ trendColumns: cols.map((x) => (x.id === c.id ? { ...x, key: e.target.value } : x)) })} options={METRIC_OPTS} /></Field></div>
                  <div style={{ flex: 1 }}><Field label="AGGREGAT"><Select value={c.agg} onChange={(e) => set({ trendColumns: cols.map((x) => (x.id === c.id ? { ...x, agg: e.target.value } : x)) })} options={AGG_OPTS} /></Field></div>
                  {cols.length > 1 && <div style={{ marginBottom: 12 }}><IconBtn danger onClick={() => set({ trendColumns: cols.filter((x) => x.id !== c.id) })} title="Entfernen"><Trash2 size={13} /></IconBtn></div>}
                </div>
              ))}
              {cols.length < 6 && <button onClick={() => set({ trendColumns: [...cols, mkTrendCol("druck_zulauf", "avg")] })} style={addBtnStyle}><Plus size={12} color={T.accent} /> Kennzahl</button>}
              <div style={{ ...hint, marginTop: 6 }}>Gleiche Einheit teilt sich eine y-Achse; bei „Mittelwert“ zeigt die Linie zusätzlich ±1 SD als Band.</div>
            </>
          )}
        </>
      )}

      <div style={sectionHead}>DATENQUELLE (Ergebnis-JSON)</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 230 }}><Field label="ART"><Select value={hz ? "historize" : (b.srcMode === "historize" ? "http" : b.srcMode)} onChange={(e) => set({ srcMode: e.target.value })}
          options={[...(b.widget !== "trend" ? [{ value: "historize", label: "Historize (Berechnung im Panel)" }] : []), { value: "http", label: "HTTP (URL)" }, { value: "server", label: "TcHMI-Server-Symbol" }]} /></Field></div>
        {hz ? <div style={{ flex: 1 }}><Field label="HISTORIZE-DOMAIN"><Select value={b.hzDomain || "TcHmiPostgresHistorize"} onChange={(e) => set({ hzDomain: e.target.value })} options={[{ value: "TcHmiPostgresHistorize", label: "TcHmiPostgresHistorize" }, { value: "TcHmiSqliteHistorize", label: "TcHmiSqliteHistorize" }]} /></Field></div>
        : b.srcMode === "server"
          ? <div style={{ flex: 1 }}><Field label="SERVER-SYMBOL"><TextInput value={b.srcSymbol} onChange={(e) => set({ srcSymbol: e.target.value })} placeholder="AC_Analytics.Compute" /></Field></div>
          : (
            <>
              <div style={{ flex: 1 }}><Field label="URL"><TextInput value={b.srcUrl} onChange={(e) => set({ srcUrl: e.target.value })} placeholder="Assets/ac-analytics-demo/filtration.json" /></Field></div>
              <div style={{ width: 90 }}><Field label="METHODE"><Select value={b.srcMethod} onChange={(e) => set({ srcMethod: e.target.value })} options={[{ value: "GET", label: "GET" }, { value: "POST", label: "POST" }]} /></Field></div>
            </>
          )}
      </div>
      {hz && (
        <>
          <Field label="SCHRITTNUMMER – historisiertes Symbol (voller Pfad)"><TextInput value={b.hzStepSymbol} onChange={(e) => set({ hzStepSymbol: e.target.value })} placeholder="ADS.AF_PLC.MAIN.…::nStep" /></Field>
          <Field label="ZYKLUSNUMMER – historisiertes Symbol (voller Pfad)"><TextInput value={b.hzCycleSymbol} onChange={(e) => set({ hzCycleSymbol: e.target.value })} placeholder="ADS.AF_PLC.MAIN.…::nCycle" /></Field>
          {b.widget === "filtration" && <Field label="FILTRATIONSLEISTUNG – historisiertes Symbol (voller Pfad)"><TextInput value={b.hzLeistungSymbol} onChange={(e) => set({ hzLeistungSymbol: e.target.value })} placeholder="ADS.AF_PLC.MAIN.…::fLeistung" /></Field>}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field label="ZEITRAUM (Tage)"><TextInput type="number" value={b.hzDays} onChange={(e) => set({ hzDays: e.target.value })} /></Field></div>
            <div style={{ flex: 1 }}><Field label="AUFZEICHNUNGSINTERVALL (s)"><TextInput type="number" value={b.hzIntervalS} onChange={(e) => set({ hzIntervalS: e.target.value })} /></Field></div>
            <div style={{ flex: 1 }}><Field label="MASCHINE (Bezeichnung)"><TextInput value={b.hzMachine} onChange={(e) => set({ hzMachine: e.target.value })} placeholder="AC1118" /></Field></div>
          </div>
          <div style={hint}>
            Holt die Rohwerte per {b.hzDomain || "TcHmiPostgresHistorize"}.GetTrendLineData und rechnet im Panel. Rohdaten kommen nur, wenn der Zeitraum weniger Punkte hat als displayWidth – der Baustein setzt displayWidth deshalb auf ca. {Math.ceil(((Number(b.hzDays) || 3) * 86400) / Math.max(1, Number(b.hzIntervalS) || 10) * 1.25).toLocaleString("de-DE")} (Zeitraum ÷ Intervall + 25 %). Das Intervall muss zur Historize-Einstellung passen; meldet der Baustein „verdichtet“, Zeitraum verkürzen. Symbolnamen genau wie in der historizedSymbolList.
          </div>
        </>
      )}
      {!hz && <div style={hint}>
        {b.srcMode === "server"
          ? "ReadWrite auf das Server-Symbol: writeValue = Anfrage-JSON (Widget, Optionen, Filter), readValue = Ergebnis. Server-Seite: analytics/server/handler.js."
          : b.srcMethod === "POST"
            ? "POST mit Anfrage-JSON im Body (Widget, Optionen, Filter); Antwort = Ergebnis-JSON. Server-Seite: analytics/server/handler.js."
            : "GET lädt fertiges Ergebnis-JSON (z. B. Demo-Dateien aus analytics/demo im HMI-Ordner Assets/ac-analytics-demo). Optionen und Filter wirken dann nicht – sie gehen nur bei POST/Server-Symbol an den Server."}
      </div>}
      {!hz && <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><Field label="MASCHINEN (Komma-getrennt, leer = alle)"><TextInput value={b.machines} onChange={(e) => set({ machines: e.target.value })} placeholder="AC1118" /></Field></div>
        <div style={{ flex: 2 }}><Field label={uc ? "MASCHINE ← ATTRIBUT (optional)" : "MASCHINE ← SYMBOL (optional)"}><TextInput value={b.machineSymbol} onChange={(e) => set({ machineSymbol: e.target.value })} placeholder={uc ? "MachineSerial" : "ADS.PLC.MAIN…::sSerial"} /></Field></div>
      </div>}
      <div style={{ display: "flex", gap: 10 }}>
        {!hz && <div style={{ flex: 1 }}><Field label="LETZTE TAGE (0 = alle)"><TextInput type="number" value={b.lastDays} onChange={(e) => set({ lastDays: e.target.value })} /></Field></div>}
        <div style={{ flex: 1 }}><Field label="ZEITZONE (Tageszuordnung)"><TextInput value={b.timeZone} onChange={(e) => set({ timeZone: e.target.value })} placeholder="Europe/Berlin" /></Field></div>
        <div style={{ flex: 1 }}><Field label="AKTUALISIEREN (min, 0 = aus)"><TextInput type="number" value={b.refreshMin} onChange={(e) => set({ refreshMin: e.target.value })} /></Field></div>
      </div>
      <div style={{ marginBottom: 6 }}><Check checked={b.showTables !== false} onChange={(v) => set({ showTables: v })}>{b.widget === "trend" ? "(keine Tabellen bei Verlauf)" : "Info-Zeile, Kennwert-Tabelle und auffällige Zyklen zeigen"}</Check></div>
    </>
  );
}

export { AnalysisEditor };
