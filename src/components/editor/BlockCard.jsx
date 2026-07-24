import React from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, GripVertical, Flag, Minus } from "lucide-react";
import { T } from "../../constants/theme.js";
import { DASH_OPTS, ICONS, MAX_AXES, PLOT_COLORS, TEXT_BG } from "../../constants/palette.js";
import { BLOCK_META, ITEM_KINDS, TIME_UNITS, WRITE_OPTS } from "../../constants/options.js";
import { blockSummary, clampCol } from "../../model/layout.js";
import { condOp, condVal } from "../../codegen/helpers.js";
import { ColorSwatches, Field, HexSwatches, IconBtn, IconPicker, IconColorPicker, Select, TextArea, TextInput } from "../primitives.jsx";
import { ButtonItemFields, InputFields, ReadBoolFields, TriggerFields, WriteSymField } from "../fields.jsx";
import { AccessFields } from "../access.jsx";

// ── Baustein-Karte des Editors (Accordion + Griff-Drag), auch für volle-Breite-Zeilen ──
// ui: Ansichts-Zustand aus App(); actions: alle Block-Handler aus App().
function BlockCard({ b, opts, ui, actions }) {
  const { openId, setOpenId, dragId, setDragId, grabbedId, setGrabbedId, dropTarget, setDropTarget, columns, mode, sm } = ui;
  const { patch, remove, moveVertical, moveFlat, moveHorizontal, patchBtn, addBtn, removeBtn, addCond, removeCond, patchCond, patchItem, addItem, removeItem, setItemKind, addItemCond, removeItemCond, patchItemCond, patchEntry, addEnumEntry, addStatusEntry, removeEntry, addAxis, removeAxis, patchAxis, addSeries, removeSeries, patchSeries, addRef, removeRef, patchRef, addMarker, removeMarker, patchMarker, addMapping, removeMapping, patchMapping, addTimeBtn, removeTimeBtn, patchTimeBtn, handleDrop, patchTblCol, addTblCol, removeTblCol, moveTblCol, addTblRow, removeTblRow, patchTblCell, addTblMap, removeTblMap, patchTblMap, addTblRule, removeTblRule, patchTblRule, addRowFilter, removeRowFilter, patchRowFilter } = actions;
    const { c, i, colLen, fullWidth } = opts;
    const [tblColDrag, setTblColDrag] = React.useState(null); // Index der gerade gezogenen Tabellenspalte
    const meta = BLOCK_META[b.type]; const Icon = meta.icon; const open = openId === b.id;
    const isDropBefore = dropTarget && dropTarget.beforeId === b.id;
    const dropCol = fullWidth ? clampCol(b, columns) : c;
    return (
      <div key={b.id}
        draggable={grabbedId === b.id}
        onDragStart={() => setDragId(b.id)}
        onDragEnd={() => { setDragId(null); setGrabbedId(null); setDropTarget(null); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ col: dropCol, beforeId: b.id }); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(dropCol, b.id); }}
        style={{
          background: open ? T.panel2 : T.panel, border: `1px solid ${open ? T.accentDim : T.border}`,
          borderTop: isDropBefore ? `2px solid ${T.accent}` : `1px solid ${open ? T.accentDim : T.border}`,
          borderRadius: 7, padding: 8, marginBottom: 8, opacity: dragId === b.id ? 0.4 : 1,
        }}>
        <div onClick={() => setOpenId(open ? null : b.id)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <span onMouseDown={(e) => { e.stopPropagation(); setGrabbedId(b.id); }} onMouseUp={() => setGrabbedId(null)} onClick={(e) => e.stopPropagation()} title="Ziehen zum Verschieben" style={{ flex: "0 0 auto", cursor: "grab", display: "flex" }}>
            <GripVertical size={14} color={T.muted} />
          </span>
          <ChevronRight size={14} color={T.muted} style={{ flex: "0 0 auto", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
          <Icon size={14} color={T.accent} style={{ flex: "0 0 auto" }} />
          <span style={{ fontSize: 12, fontWeight: 600, flex: "0 0 auto" }}>{meta.label}</span>
          {fullWidth && <span style={{ fontSize: 9, fontWeight: 700, color: T.accent, border: `1px solid ${T.accentDim}`, borderRadius: 4, padding: "1px 4px", flex: "0 0 auto" }}>VOLLE BREITE</span>}
          {!open && <span style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>· {blockSummary(b)}</span>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 2, flex: "0 0 auto" }}>
            {fullWidth ? (
              <>
                <IconBtn onClick={() => moveFlat(b.id, -1)} title="Nach oben"><ChevronUp size={14} /></IconBtn>
                <IconBtn onClick={() => moveFlat(b.id, 1)} title="Nach unten"><ChevronDown size={14} /></IconBtn>
              </>
            ) : (
              <>
                <IconBtn disabled={i === 0} onClick={() => moveVertical(b.id, -1)} title="Nach oben"><ChevronUp size={14} /></IconBtn>
                <IconBtn disabled={i === colLen - 1} onClick={() => moveVertical(b.id, 1)} title="Nach unten"><ChevronDown size={14} /></IconBtn>
                {columns > 1 && <IconBtn disabled={c === 0} onClick={() => moveHorizontal(b.id, -1)} title="Spalte links"><ChevronLeft size={14} /></IconBtn>}
                {columns > 1 && <IconBtn disabled={c === columns - 1} onClick={() => moveHorizontal(b.id, 1)} title="Spalte rechts"><ChevronRight size={14} /></IconBtn>}
              </>
            )}
            <IconBtn danger onClick={() => remove(b.id)} title="Löschen"><Trash2 size={14} /></IconBtn>
          </div>
        </div>

        {open && (
          <div style={{ marginTop: 10 }}>
            {b.type === "text" && (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 2 }}><Field label="ÜBERSCHRIFT (optional)"><TextInput value={b.heading || ""} onChange={(e) => patch(b.id, { heading: e.target.value })} placeholder="leer = keine Überschrift" /></Field></div>
                  <div style={{ flex: 2 }}><Field label="ÜBERSCHRIFT LOC-KEY (optional)"><TextInput value={b.headingLoc || ""} onChange={(e) => patch(b.id, { headingLoc: e.target.value })} placeholder="L_…" /></Field></div>
                </div>
                <Field label="TEXT"><TextArea value={b.text} onChange={(e) => patch(b.id, { text: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.loc} onChange={(e) => patch(b.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                  <div style={{ flex: 2 }}>
                    <Field label="HINTERGRUND">
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => patch(b.id, { bgColor: "" })}
                          title="Normaler Hintergrund"
                          style={{ width: 26, height: 26, borderRadius: 6, cursor: "pointer", background: T.input, border: `2px solid ${!b.bgColor ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {!b.bgColor && <Check size={13} color={T.accent} />}
                        </button>
                        {Object.entries(TEXT_BG).map(([key, c]) => (
                          <button type="button" key={key} onClick={() => patch(b.id, { bgColor: key })}
                            title={c.label}
                            style={{ width: 26, height: 26, borderRadius: 6, cursor: "pointer", background: c.bg, border: `2px solid ${b.bgColor === key ? T.text : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {b.bgColor === key && <Check size={13} color={c.text} />}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <div style={{ flex: 2 }}>
                    <Field label="SYMBOL">
                      <IconPicker value={b.icon || ""} onChange={(k) => patch(b.id, { icon: k })} />
                    </Field>
                  </div>
                  {b.icon ? (
                    <div style={{ flex: 2 }}>
                      <Field label="SYMBOLFARBE">
                        <IconColorPicker value={b.iconColor || ""} onChange={(hex) => patch(b.id, { iconColor: hex })} />
                      </Field>
                    </div>
                  ) : null}
                </div>
              </>
            )}
            {(b.type === "read" || b.type === "bool" || b.type === "check") && <ReadBoolFields cfg={b} mode={mode} onPatch={(o) => patch(b.id, o)} />}
            {b.type === "input" && <InputFields cfg={b} mode={mode} onPatch={(o) => patch(b.id, o)} />}

            {b.type === "divider" && (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 2 }}><Field label="BESCHRIFTUNG (optional)"><TextInput value={b.label} onChange={(e) => patch(b.id, { label: e.target.value })} placeholder="leer = nur Linie" /></Field></div>
                  <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.loc} onChange={(e) => patch(b.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                </div>
                {columns > 1 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginTop: 2, marginBottom: 6 }}>
                    <input type="checkbox" checked={!!b.inCol} onChange={(e) => patch(b.id, { inCol: e.target.checked })} /> Nur innerhalb der Spalte (nicht über die volle Breite)
                  </label>
                )}
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>Ohne Beschriftung eine schlichte horizontale Linie, mit Text eine mittig beschriftete Trennlinie. Standard: volle Breite (bricht das Spalten-Grid). Mit aktivierter Option bleibt die Linie in ihrer Spalte – dann gelten die Spalten-Steuerungen (links/rechts) wie bei anderen Bausteinen.</div>
              </>
            )}

            {b.type === "progress" && (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 2 }}><Field label="LABEL"><TextInput value={b.label} onChange={(e) => patch(b.id, { label: e.target.value })} /></Field></div>
                  <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.loc} onChange={(e) => patch(b.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                </div>
                <Field label={sm.label}><TextInput value={b.symbol} onChange={(e) => patch(b.id, { symbol: e.target.value })} placeholder={sm.ph} /></Field>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}><Field label="MIN"><TextInput type="number" value={b.min} onChange={(e) => patch(b.id, { min: e.target.value })} /></Field></div>
                  <div style={{ flex: 1 }}><Field label="MAX"><TextInput type="number" value={b.max} onChange={(e) => patch(b.id, { max: e.target.value })} /></Field></div>
                  <div style={{ width: 84 }}><Field label="EINHEIT"><TextInput value={b.unit} onChange={(e) => patch(b.id, { unit: e.target.value })} placeholder="%" /></Field></div>
                  <div style={{ width: 96 }}><Field label="NACHKOMMA"><TextInput type="number" value={b.decimals} onChange={(e) => patch(b.id, { decimals: e.target.value })} /></Field></div>
                </div>
                <Field label="FARBE"><ColorSwatches value={b.color} onChange={(cc) => patch(b.id, { color: cc })} /></Field>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginTop: 2, marginBottom: 6 }}>
                  <input type="checkbox" checked={b.showValue !== false} onChange={(e) => patch(b.id, { showValue: e.target.checked })} /> Wert rechts anzeigen
                </label>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>Füllung = (Wert − Min) / (Max − Min), begrenzt auf 0–100 %. Für ein Proportionalventil z.B. Min 0, Max 100, Einheit %.</div>
              </>
            )}

            {b.type === "plot" && (() => {
              const axisOpts = (b.axes || []).map((a, i) => ({ value: a.id, label: (a.label || a.unit) ? `${a.label || "Achse " + (i + 1)}${a.unit ? " (" + a.unit + ")" : ""}` : "Achse " + (i + 1) }));
              return (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 2 }}><Field label="ÜBERSCHRIFT"><TextInput value={b.caption} onChange={(e) => patch(b.id, { caption: e.target.value })} /></Field></div>
                  <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.captionLoc} onChange={(e) => patch(b.id, { captionLoc: e.target.value })} placeholder="L_…" /></Field></div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}><Field label="DATENQUELLE"><Select value={b.dataMode} onChange={(e) => patch(b.id, { dataMode: e.target.value })} options={[{ value: "live", label: "Nur Live" }, { value: "history", label: "History + Live" }]} /></Field></div>
                  <div style={{ width: 110 }}><Field label="HÖHE (px)"><TextInput type="number" value={b.plotHeight} onChange={(e) => patch(b.id, { plotHeight: e.target.value })} /></Field></div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}><Field label="LIVE-FENSTER (s)"><TextInput type="number" value={b.followSec} onChange={(e) => patch(b.id, { followSec: e.target.value })} /></Field></div>
                  <div style={{ flex: 1 }}><Field label="HISTORY LADEN (s)"><TextInput type="number" value={b.historyLoadSec} onChange={(e) => patch(b.id, { historyLoadSec: e.target.value })} /></Field></div>
                  <div style={{ flex: 1 }}><Field label="MAX. PUNKTE"><TextInput type="number" value={b.maxPoints} onChange={(e) => patch(b.id, { maxPoints: e.target.value })} /></Field></div>
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!b.showRangeslider} onChange={(e) => patch(b.id, { showRangeslider: e.target.checked })} /> Range-Slider
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                    <input type="checkbox" checked={b.showXAxis !== false} onChange={(e) => patch(b.id, { showXAxis: e.target.checked })} /> X-Achse anzeigen
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!b.showToolbar} onChange={(e) => patch(b.id, { showToolbar: e.target.checked })} /> Überschrift + „Jetzt"
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                    <input type="checkbox" checked={b.zoomEnabled !== false} onChange={(e) => patch(b.id, { zoomEnabled: e.target.checked })} /> Zoom (Maus/Rad) + „Zurücksetzen"
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!b.showStats} onChange={(e) => patch(b.id, { showStats: e.target.checked })} /> Statistik-Tabelle
                  </label>
                </div>
                {!!b.showStats && (
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "-2px 0 8px" }}>Min · Max · Mittel · Median · Aktuell je Signal, dazu der Zeitraum (z.&#8202;B. „3 h 30 min"). Bezug ist der sichtbare Ausschnitt (folgt Zoom und Zeitraum-Buttons), Aktualisierung live mit jedem Server-Push. Einklappbar im Popup. Spaltentitel lokalisierbar über die Keys L_Stat_Title, L_Stat_Range, L_Stat_Min, L_Stat_Max, L_Stat_Mean, L_Stat_Median, L_Stat_Now.</div>
                )}

                {(b.showToolbar || b.zoomEnabled !== false) && (
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 6 }}>BUTTON-BESCHRIFTUNGEN</div>
                    {b.showToolbar && (
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 2 }}><Field label="JETZT-BUTTON"><TextInput value={b.nowLabel != null ? b.nowLabel : "Jetzt"} onChange={(e) => patch(b.id, { nowLabel: e.target.value })} /></Field></div>
                        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.nowLoc || ""} onChange={(e) => patch(b.id, { nowLoc: e.target.value })} placeholder="L_…" /></Field></div>
                      </div>
                    )}
                    {b.zoomEnabled !== false && (
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 2 }}><Field label="ZURÜCKSETZEN-BUTTON"><TextInput value={b.resetLabel != null ? b.resetLabel : "Zurücksetzen"} onChange={(e) => patch(b.id, { resetLabel: e.target.value })} /></Field></div>
                        <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.resetLoc || ""} onChange={(e) => patch(b.id, { resetLoc: e.target.value })} placeholder="L_…" /></Field></div>
                      </div>
                    )}
                  </div>
                )}

                {b.dataMode === "history" && (
                  <div style={{ fontSize: 11, color: T.accent, border: `1px solid ${T.accentDim}`, borderRadius: 6, padding: "6px 8px", marginBottom: 10, lineHeight: 1.5 }}>
                    Hinweis: History läuft über <code style={{ color: T.text }}>TcHmiSqliteHistorize.GetTrendLineData</code> (Subscription, History + Live in einem Stream). <b>Live-Fenster (s)</b> = Breite des mitlaufenden Ausschnitts; <b>History laden (s)</b> = wie tief geladen wird bzw. wie weit die Zeitraum-Buttons zurückreichen (Live-Fenster ≤ History laden). Buttons frieren die Ansicht ein und zeigen den statischen Ausschnitt; „Jetzt"/„Zurücksetzen" gehen zurück ins Live-Fenster. Voraussetzung: die Symbole müssen historisiert sein.
                  </div>
                )}

                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>ZEITRAUM-BUTTONS ({(b.timeButtons || []).length})</div>
                {(b.timeButtons || []).map((t) => (
                  <div key={t.id} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-end" }}>
                    <div style={{ width: 70 }}><Field label="ANZAHL"><TextInput type="number" value={t.count} disabled={t.unit === "all"} onChange={(e) => patchTimeBtn(b.id, t.id, { count: e.target.value })} /></Field></div>
                    <div style={{ width: 120 }}><Field label="EINHEIT"><Select value={t.unit} onChange={(e) => patchTimeBtn(b.id, t.id, { unit: e.target.value })} options={TIME_UNITS} /></Field></div>
                    <div style={{ flex: 1 }}><Field label="BESCHRIFTUNG"><TextInput value={t.label} onChange={(e) => patchTimeBtn(b.id, t.id, { label: e.target.value })} /></Field></div>
                    <div style={{ marginBottom: 10 }}><IconBtn danger onClick={() => removeTimeBtn(b.id, t.id)}><Trash2 size={13} /></IconBtn></div>
                  </div>
                ))}
                {(b.timeButtons || []).length < 8 && (
                  <button onClick={() => addTimeBtn(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                    <Plus size={12} color={T.accent} /> Zeitraum-Button
                  </button>
                )}
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "4px 0 2px" }}>Buttons über dem Plot zum schnellen Zeitraum-Sprung. „Alle" zeigt den kompletten Verlauf; ohne Buttons wird die Leiste ausgeblendet.</div>

                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>Y-ACHSEN ({(b.axes || []).length}/{MAX_AXES})</div>
                {(b.axes || []).map((a, ai) => (
                  <div key={a.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Achse {ai + 1} · {ai % 2 === 0 ? "links" : "rechts"}</span>
                      {b.axes.length > 1 && <div style={{ marginLeft: "auto" }}><IconBtn danger onClick={() => removeAxis(b.id, a.id)}><Trash2 size={13} /></IconBtn></div>}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 2 }}><Field label="TITEL"><TextInput value={a.label} onChange={(e) => patchAxis(b.id, a.id, { label: e.target.value })} /></Field></div>
                      <div style={{ flex: 2 }}><Field label="LOC-KEY"><TextInput value={a.loc} onChange={(e) => patchAxis(b.id, a.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                      <div style={{ width: 74 }}><Field label="EINHEIT"><TextInput value={a.unit} onChange={(e) => patchAxis(b.id, a.id, { unit: e.target.value })} /></Field></div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginBottom: 10 }}>
                        <input type="checkbox" checked={!!a.autoscale} onChange={(e) => patchAxis(b.id, a.id, { autoscale: e.target.checked })} /> Autoskala
                      </label>
                      {!a.autoscale && <div style={{ width: 80 }}><Field label="MIN"><TextInput type="number" value={a.min} onChange={(e) => patchAxis(b.id, a.id, { min: e.target.value })} /></Field></div>}
                      {!a.autoscale && <div style={{ width: 80 }}><Field label="MAX"><TextInput type="number" value={a.max} onChange={(e) => patchAxis(b.id, a.id, { max: e.target.value })} /></Field></div>}
                    </div>
                    <Field label="FARBE"><HexSwatches value={a.color} onChange={(hx) => patchAxis(b.id, a.id, { color: hx })} /></Field>
                    {mode === "usercontrol" && (
                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                        <div style={{ flex: 2 }}><Field label="TITEL ← PARAM"><TextInput value={a.labelParam || ""} onChange={(e) => patchAxis(b.id, a.id, { labelParam: e.target.value })} placeholder="getX (leer = statisch)" /></Field></div>
                        <div style={{ flex: 1 }}><Field label="MIN ← PARAM"><TextInput value={a.minParam || ""} onChange={(e) => patchAxis(b.id, a.id, { minParam: e.target.value })} placeholder="getX" /></Field></div>
                        <div style={{ flex: 1 }}><Field label="MAX ← PARAM"><TextInput value={a.maxParam || ""} onChange={(e) => patchAxis(b.id, a.id, { maxParam: e.target.value })} placeholder="getX" /></Field></div>
                      </div>
                    )}
                  </div>
                ))}
                {(b.axes || []).length < MAX_AXES && (
                  <button onClick={() => addAxis(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                    <Plus size={12} color={T.accent} /> Achse
                  </button>
                )}

                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "12px 0 6px" }}>SIGNALE ({(b.series || []).length})</div>
                {(b.series || []).map((s, si) => (
                  <div key={s.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Signal {si + 1}</span>
                      {b.series.length > 1 && <div style={{ marginLeft: "auto" }}><IconBtn danger onClick={() => removeSeries(b.id, s.id)}><Trash2 size={13} /></IconBtn></div>}
                    </div>
                    <Field label="SYMBOL"><TextInput value={s.symbol} onChange={(e) => patchSeries(b.id, s.id, { symbol: e.target.value })} placeholder="ADS.PLC.MAIN…::fWert" /></Field>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 2 }}><Field label="NAME"><TextInput value={s.label} onChange={(e) => patchSeries(b.id, s.id, { label: e.target.value })} /></Field></div>
                      <div style={{ flex: 2 }}><Field label="LOC-KEY"><TextInput value={s.loc} onChange={(e) => patchSeries(b.id, s.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                      <div style={{ width: 120 }}><Field label="ACHSE"><Select value={s.axisId} onChange={(e) => patchSeries(b.id, s.id, { axisId: e.target.value })} options={axisOpts} /></Field></div>
                    </div>
                    <Field label="FARBE"><HexSwatches value={s.color} onChange={(hx) => patchSeries(b.id, s.id, { color: hx })} /></Field>
                    {mode === "usercontrol" && (
                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                        <div style={{ flex: 2 }}><Field label="SYMBOLPFAD ← PARAM"><TextInput value={s.symbolParam || ""} onChange={(e) => patchSeries(b.id, s.id, { symbolParam: e.target.value })} placeholder="getX (leer = statisch)" /></Field></div>
                        <div style={{ flex: 2 }}><Field label="NAME ← PARAM"><TextInput value={s.labelParam || ""} onChange={(e) => patchSeries(b.id, s.id, { labelParam: e.target.value })} placeholder="getX" /></Field></div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => addSeries(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                  <Plus size={12} color={T.accent} /> Signal
                </button>

                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "12px 0 6px" }}>REFERENZLINIEN ({(b.refLines || []).length})</div>
                {(b.refLines || []).map((r, ri) => (
                  <div key={r.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Linie {ri + 1}</span>
                      <div style={{ marginLeft: "auto" }}><IconBtn danger onClick={() => removeRef(b.id, r.id)}><Trash2 size={13} /></IconBtn></div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}><Field label="QUELLE"><Select value={r.mode} onChange={(e) => patchRef(b.id, r.id, { mode: e.target.value })} options={[{ value: "fixed", label: "Fester Wert" }, { value: "symbol", label: "Aus Symbol" }]} /></Field></div>
                      {r.mode === "fixed"
                        ? <div style={{ width: 90 }}><Field label="WERT"><TextInput type="number" value={r.value} onChange={(e) => patchRef(b.id, r.id, { value: e.target.value })} /></Field></div>
                        : <div style={{ flex: 2 }}><Field label="SYMBOL"><TextInput value={r.symbol} onChange={(e) => patchRef(b.id, r.id, { symbol: e.target.value })} placeholder="ADS.…::rGrenzwert" /></Field></div>}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 2 }}><Field label="LABEL"><TextInput value={r.label} onChange={(e) => patchRef(b.id, r.id, { label: e.target.value })} /></Field></div>
                      <div style={{ flex: 2 }}><Field label="LOC-KEY"><TextInput value={r.loc} onChange={(e) => patchRef(b.id, r.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                      <div style={{ width: 120 }}><Field label="ACHSE"><Select value={r.axisId} onChange={(e) => patchRef(b.id, r.id, { axisId: e.target.value })} options={axisOpts} /></Field></div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}><Field label="STIL"><Select value={r.dash} onChange={(e) => patchRef(b.id, r.id, { dash: e.target.value })} options={DASH_OPTS} /></Field></div>
                      <div style={{ flex: 1 }}><Field label="FARBE"><HexSwatches value={r.color} onChange={(hx) => patchRef(b.id, r.id, { color: hx })} /></Field></div>
                    </div>
                    {mode === "usercontrol" && (
                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                        {r.mode === "symbol"
                          ? <div style={{ flex: 2 }}><Field label="SYMBOLPFAD ← PARAM"><TextInput value={r.symbolParam || ""} onChange={(e) => patchRef(b.id, r.id, { symbolParam: e.target.value })} placeholder="getX (leer = statisch)" /></Field></div>
                          : <div style={{ flex: 2 }}><Field label="WERT ← PARAM"><TextInput value={r.valueParam || ""} onChange={(e) => patchRef(b.id, r.id, { valueParam: e.target.value })} placeholder="getX (leer = statisch)" /></Field></div>}
                        <div style={{ flex: 2 }}><Field label="LABEL ← PARAM"><TextInput value={r.labelParam || ""} onChange={(e) => patchRef(b.id, r.id, { labelParam: e.target.value })} placeholder="getX" /></Field></div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => addRef(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                  <Plus size={12} color={T.accent} /> Referenzlinie
                </button>

                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "12px 0 6px", display: "flex", alignItems: "center", gap: 6 }}><Flag size={12} color={T.muted} /> SETPOINT-MARKER ({(b.eventMarkers || []).length})</div>
                {(b.eventMarkers || []).map((m, mi) => (
                  <div key={m.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Marker {mi + 1}</span>
                      <div style={{ marginLeft: "auto" }}><IconBtn danger onClick={() => removeMarker(b.id, m.id)}><Trash2 size={13} /></IconBtn></div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <div style={{ width: 180 }}><Field label="ART"><Select value={m.kind || "enum"} onChange={(e) => patchMarker(b.id, m.id, { kind: e.target.value })} options={[{ value: "enum", label: "Enum (Wert → Text)" }, { value: "metric", label: "Metrisch (bei Änderung)" }]} /></Field></div>
                      <div style={{ flex: 1 }}><Field label={m.kind === "metric" ? "METRISCHE VARIABLE" : "ENUM-SYMBOL"}><TextInput value={m.symbol} onChange={(e) => patchMarker(b.id, m.id, { symbol: e.target.value })} placeholder={m.kind === "metric" ? "ADS.…::nZyklusNr" : "ADS.…::eStep"} /></Field></div>
                    </div>
                    {mode === "usercontrol" && (
                      <div style={{ marginTop: 2 }}><Field label="SYMBOLPFAD ← PARAM"><TextInput value={m.symbolParam || ""} onChange={(e) => patchMarker(b.id, m.id, { symbolParam: e.target.value })} placeholder="getX (leer = statisch)" /></Field></div>
                    )}
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}><Field label="STIL"><Select value={m.dash} onChange={(e) => patchMarker(b.id, m.id, { dash: e.target.value })} options={DASH_OPTS} /></Field></div>
                      <div style={{ flex: 1 }}><Field label="MODUS"><Select value={m.mode} onChange={(e) => patchMarker(b.id, m.id, { mode: e.target.value })} options={[{ value: "all", label: "Alle behalten" }, { value: "latest", label: "Nur letzte" }]} /></Field></div>
                      <div style={{ flex: 1 }}><Field label="FARBE"><HexSwatches value={m.color} onChange={(hx) => patchMarker(b.id, m.id, { color: hx })} /></Field></div>
                    </div>
                    <div style={{ display: "flex", gap: 16, margin: "2px 0 8px" }}>
                      {m.kind !== "metric" && (
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                          <input type="checkbox" checked={!!m.onlyMapped} onChange={(e) => patchMarker(b.id, m.id, { onlyMapped: e.target.checked })} /> Nur gemappte Werte
                        </label>
                      )}
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!m.markInitial} onChange={(e) => patchMarker(b.id, m.id, { markInitial: e.target.checked })} /> Startwert markieren
                      </label>
                    </div>
                    {m.kind === "metric" ? (
                      <>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginBottom: 8 }}>
                          <input type="checkbox" checked={m.showValue !== false} onChange={(e) => patchMarker(b.id, m.id, { showValue: e.target.checked })} /> Wert an der Linie ausgeben
                        </label>
                        <div style={{ display: "flex", gap: 10 }}>
                          <div style={{ flex: 2 }}><Field label="PRÄFIX (optional)"><TextInput value={m.prefix || ""} onChange={(e) => patchMarker(b.id, m.id, { prefix: e.target.value })} placeholder="z.B. Zyklus " /></Field></div>
                          <div style={{ flex: 2 }}><Field label="PRÄFIX LOC-KEY"><TextInput value={m.prefixLoc || ""} onChange={(e) => patchMarker(b.id, m.id, { prefixLoc: e.target.value })} placeholder="L_…" /></Field></div>
                          <div style={{ width: 84 }}><Field label="NACHKOMMA"><TextInput type="number" value={m.decimals || 0} onChange={(e) => patchMarker(b.id, m.id, { decimals: e.target.value })} /></Field></div>
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>Zieht bei jeder Wertänderung eine senkrechte Linie. Beschriftung = Präfix + Wert (z.B. „Zyklus 42"). Ohne Wert-Ausgabe nur die Linie (bzw. nur der Präfix-Text).</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "2px 0 6px" }}>WERT → BESCHRIFTUNG</div>
                        {(m.mappings || []).map((mp) => (
                          <div key={mp.id} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-end" }}>
                            <div style={{ width: 64 }}><Field label="WERT"><TextInput value={mp.value} onChange={(e) => patchMapping(b.id, m.id, mp.id, { value: e.target.value })} /></Field></div>
                            {mode === "usercontrol" && <div style={{ width: 84 }}><Field label="← PARAM"><TextInput value={mp.valueParam || ""} onChange={(e) => patchMapping(b.id, m.id, mp.id, { valueParam: e.target.value })} placeholder="getX" /></Field></div>}
                            <div style={{ flex: 1 }}><Field label="TEXT"><TextInput value={mp.label} onChange={(e) => patchMapping(b.id, m.id, mp.id, { label: e.target.value })} /></Field></div>
                            <div style={{ flex: 1 }}><Field label="LOC-KEY"><TextInput value={mp.loc} onChange={(e) => patchMapping(b.id, m.id, mp.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                            <div style={{ marginBottom: 10 }}><IconBtn danger onClick={() => removeMapping(b.id, m.id, mp.id)}><Trash2 size={13} /></IconBtn></div>
                          </div>
                        ))}
                        <button onClick={() => addMapping(b.id, m.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                          <Plus size={12} color={T.accent} /> Zuordnung
                        </button>
                      </>
                    )}
                  </div>
                ))}
                <button onClick={() => addMarker(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                  <Plus size={12} color={T.accent} /> Marker
                </button>

                <div style={{ fontSize: 11, color: T.muted, marginTop: 10, lineHeight: 1.5 }}>Der Plot lädt <code style={{ color: T.text }}>Assets/plotly-3.6.0.min.js</code> einmalig nach und räumt beim Schließen des Popups selbst auf. Volle Breite, unabhängig vom Ausgabemodus.</div>
              </>
              );
            })()}

            {b.type === "button" && (
              <>
                {b.buttons.map((bt, bi) => (
                  <div key={bi} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Button {bi + 1}</span>
                      {b.buttons.length > 1 && <div style={{ marginLeft: "auto" }}><IconBtn danger onClick={() => removeBtn(b.id, bi)}><Trash2 size={13} /></IconBtn></div>}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 2 }}><Field label="BESCHRIFTUNG"><TextInput value={bt.label} onChange={(e) => patchBtn(b.id, bi, { label: e.target.value })} /></Field></div>
                      <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={bt.loc} onChange={(e) => patchBtn(b.id, bi, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ flex: 3 }}><Field label="SYMBOL (optional)"><IconPicker value={bt.icon || ""} onChange={(k) => patchBtn(b.id, bi, { icon: k })} /></Field></div>
                      {bt.icon ? (
                        <>
                          <div style={{ width: 120 }}><Field label="POSITION"><Select value={bt.iconPos || "left"} onChange={(e) => patchBtn(b.id, bi, { iconPos: e.target.value })} options={[{ value: "left", label: "Links" }, { value: "right", label: "Rechts" }]} /></Field></div>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", paddingTop: 22 }}>
                            <input type="checkbox" checked={bt.showLabel !== false} onChange={(e) => patchBtn(b.id, bi, { showLabel: e.target.checked })} /> mit Text
                          </label>
                        </>
                      ) : null}
                    </div>
                    <Field label={sm.label}><TextInput value={bt.symbol} onChange={(e) => patchBtn(b.id, bi, { symbol: e.target.value })} placeholder={sm.ph} /></Field>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}><Field label="AKTION"><Select value={bt.writeMode} onChange={(e) => patchBtn(b.id, bi, { writeMode: e.target.value })} options={WRITE_OPTS} /></Field></div>
                      {(bt.writeMode === "pulse" || (bt.writeMode === "holdConfirm" && bt.confirmAction !== "setTrue")) && <div style={{ width: 90 }}><Field label="EIN-DAUER (ms)"><TextInput type="number" value={bt.pulseMs} onChange={(e) => patchBtn(b.id, bi, { pulseMs: e.target.value })} /></Field></div>}
                    </div>
                    {bt.writeMode === "hold" && (
                      <>
                        <Field label={`RÜCKMELDESYMBOL (optional, ${mode === "usercontrol" ? "Attribut-Bool" : "Symbol-Bool"})`}>
                          <TextInput value={bt.fbSym || ""} onChange={(e) => patchBtn(b.id, bi, { fbSym: e.target.value })} placeholder={mode === "usercontrol" ? "z.B. Confirmed (leer = keine Markierung)" : "ADS.…::xConfirmed (leer = keine Markierung)"} />
                        </Field>
                        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "-4px 0 8px" }}>Schreibt true beim Drücken, false beim Loslassen (auch wenn der Zeiger den Button während des Drückens verlässt). Sobald dieses Symbol true meldet, erscheint ein grüner Rahmen als Bestätigung – zum Loslassen loslassen.</div>
                      </>
                    )}
                    {bt.writeMode === "holdConfirm" && (
                      <>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                          <div style={{ width: 110 }}><Field label="HALTEZEIT (ms)"><TextInput type="number" value={bt.confirmMs == null ? 3000 : bt.confirmMs} onChange={(e) => patchBtn(b.id, bi, { confirmMs: e.target.value })} /></Field></div>
                          <div style={{ flex: 1 }}><Field label="NACH BESTÄTIGUNG"><Select value={bt.confirmAction || "pulse"} onChange={(e) => patchBtn(b.id, bi, { confirmAction: e.target.value })} options={[{ value: "pulse", label: "Impuls (true → false)" }, { value: "setTrue", label: "Auf true setzen" }]} /></Field></div>
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "-4px 0 8px" }}>Erst nach durchgehendem Halten über die Haltezeit wird geschrieben (mit Fortschrittsanzeige im Button). Vorzeitiges Loslassen bricht ab, ohne zu schreiben.</div>
                      </>
                    )}
                    <Field label="FARBE"><ColorSwatches value={bt.color} onChange={(cc) => patchBtn(b.id, bi, { color: cc })} /></Field>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginTop: 2, marginBottom: 8 }}>
                      <input type="checkbox" checked={!!bt.closeAfter} onChange={(e) => patchBtn(b.id, bi, { closeAfter: e.target.checked })} /> Popup nach Klick schließen
                    </label>
                    <Field label={`NUR SICHTBAR WENN ${mode === "usercontrol" ? "(Attribut-Bool)" : "(Symbol-Bool)"} – optional`}>
                      <TextInput value={bt.visSym || ""} onChange={(e) => patchBtn(b.id, bi, { visSym: e.target.value })} placeholder={mode === "usercontrol" ? "z.B. Fault (leer = immer sichtbar)" : "ADS.…::xFault (leer = immer sichtbar)"} />
                    </Field>
                    <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "6px 0 6px" }}>AKTIV WENN (alle Bedingungen erfüllt)</div>
                    {(bt.enableIf || []).map((cnd) => (
                      <div key={cnd.id} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}><Field label={mode === "usercontrol" ? "ATTRIBUT" : "SYMBOL"}><TextInput value={cnd.symbol} onChange={(e) => patchCond(b.id, bi, cnd.id, { symbol: e.target.value })} placeholder={mode === "usercontrol" ? "z.B. Mode" : "ADS.…::eMode"} /></Field></div>
                        <div style={{ width: 62 }}><Field label="OP"><Select value={condOp(cnd)} onChange={(e) => patchCond(b.id, bi, cnd.id, { op: e.target.value })} options={[{ value: "==", label: "=" }, { value: "!=", label: "≠" }, { value: "<", label: "<" }, { value: "<=", label: "≤" }, { value: ">", label: ">" }, { value: ">=", label: "≥" }]} /></Field></div>
                        <div style={{ width: 72 }}><Field label="WERT"><TextInput value={condVal(cnd)} onChange={(e) => patchCond(b.id, bi, cnd.id, { value: e.target.value })} placeholder="1 / true" /></Field></div>
                        <div style={{ marginBottom: 10 }}><IconBtn danger onClick={() => removeCond(b.id, bi, cnd.id)}><Trash2 size={13} /></IconBtn></div>
                      </div>
                    ))}
                    <button onClick={() => addCond(b.id, bi)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                      <Plus size={12} color={T.accent} /> Bedingung {(bt.enableIf || []).length ? "(UND)" : ""}
                    </button>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Keine Bedingung = immer aktiv. Wert kann bool (true/false), Zahl oder Enum sein – z.B. Mode ≠ 1.</div>
                    <AccessFields access={bt.access} onChange={(a) => patchBtn(b.id, bi, { access: a })} title="GRUPPEN-BERECHTIGUNG (dieser Button)" />
                  </div>
                ))}
                {b.buttons.length < 2 && (
                  <button onClick={() => addBtn(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                    <Plus size={12} color={T.accent} /> Zweiter Button
                  </button>
                )}
              </>
            )}

            {b.type === "row" && (
              <>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Volle Breite · 1–4 Elemente nebeneinander</div>
                {b.items.map((it, ii) => (
                  <div key={it.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Element {ii + 1}</span>
                      {b.items.length > 1 && <div style={{ marginLeft: "auto" }}><IconBtn danger onClick={() => removeItem(b.id, ii)}><Trash2 size={13} /></IconBtn></div>}
                    </div>
                    <Field label="TYP"><Select value={it.kind} onChange={(e) => setItemKind(b.id, ii, e.target.value)} options={ITEM_KINDS} /></Field>
                    {it.kind === "button"
                      ? (
                        <>
                          <div style={{ display: "flex", gap: 10 }}>
                            <div style={{ flex: 2 }}><Field label="BESCHRIFTUNG"><TextInput value={it.label} onChange={(e) => patchItem(b.id, ii, { label: e.target.value })} /></Field></div>
                            <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={it.loc} onChange={(e) => patchItem(b.id, ii, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                          </div>
                          <ButtonItemFields it={it} mode={mode}
                            onPatch={(o) => patchItem(b.id, ii, o)}
                            onAddCond={() => addItemCond(b.id, ii)}
                            onRemoveCond={(cid) => removeItemCond(b.id, ii, cid)}
                            onPatchCond={(cid, p) => patchItemCond(b.id, ii, cid, p)} />
                        </>
                      )
                      : it.kind === "input"
                        ? <InputFields cfg={it} mode={mode} onPatch={(o) => patchItem(b.id, ii, o)} />
                        : <ReadBoolFields cfg={it} mode={mode} onPatch={(o) => patchItem(b.id, ii, o)} />}
                  </div>
                ))}
                {b.items.length < 4 && (
                  <button onClick={() => addItem(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                    <Plus size={12} color={T.accent} /> Element ({b.items.length}/4)
                  </button>
                )}
              </>
            )}

            {b.type === "table" && (() => {
              const KIND_OPTS = [["read", "Wert (lesen)"], ["text", "Text (statisch)"], ["bool", "LED (Bool)"], ["check", "Checkbox (schreiben)"], ["input", "Eingabe (schreiben)"], ["button", "Button"], ["enum", "Badge (Enum)"], ["icon", "Symbol (SVG)"]];
              const OPS = ["==", "!=", ">", ">=", "<", "<="];
              const isArr = b.dataSource === "array";
              const boundKinds = ["read", "bool", "check", "input", "enum", "icon", "button"];
              return (
                <>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 2 }}><Field label="ÜBERSCHRIFT (optional)"><TextInput value={b.caption || ""} onChange={(e) => patch(b.id, { caption: e.target.value })} /></Field></div>
                    <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.captionLoc || ""} onChange={(e) => patch(b.id, { captionLoc: e.target.value })} placeholder="L_…" /></Field></div>
                    <div style={{ flex: 2 }}>
                      <Field label="DATENQUELLE">
                        <Select value={b.dataSource || "static"} onChange={(e) => patch(b.id, { dataSource: e.target.value })} options={[{ value: "static", label: "Feste Zeilen (Editor)" }, { value: "array", label: "PLC-Array (dynamisch)" }]} />
                      </Field>
                    </div>
                  </div>
                  {isArr && (
                    <>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 4 }}><Field label="ARRAY-SYMBOL (Array of Struct)"><TextInput value={b.arraySymbol || ""} onChange={(e) => patch(b.id, { arraySymbol: e.target.value })} placeholder="ADS.AF_PLC.MAIN.GVL.aAlarms" /></Field></div>
                        <div style={{ flex: 1 }}><Field label="MAX. ZEILEN"><TextInput value={b.arrayCount} onChange={(e) => patch(b.id, { arrayCount: e.target.value })} /></Field></div>
                        <div style={{ flex: 1 }}><Field label="START-INDEX"><TextInput value={b.startIndex} onChange={(e) => patch(b.id, { startIndex: e.target.value })} /></Field></div>
                        <div style={{ flex: 3 }}><Field label="ANZAHL-SYMBOL (optional)"><TextInput value={b.countSymbol || ""} onChange={(e) => patch(b.id, { countSymbol: e.target.value })} placeholder="…::nCount" /></Field></div>
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "-2px 0 8px" }}>Jede gebundene Zelle liest arraySymbol[i] + MEMBER (z. B. <code>::bTriggered</code>) — der per readEx2 bestätigte Element-Pfad. MEMBER ohne führendes „::", „." oder „[" bekommt automatisch „::" davor. Bis WATCH-LIMIT einzelne Watches (bestätigt), darüber EINE Sammel-Subscription (Standard-Protokollweg, in diesem Projekt noch nicht per WS-Mitschnitt verifiziert). ANZAHL-SYMBOL begrenzt die angezeigten Zeilen.</div>
                    </>
                  )}

                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>SPALTEN</div>
                  {(b.columns || []).map((cl, ci) => (
                    <div key={cl.id}
                      onDragOver={(e) => { if (tblColDrag != null) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
                      onDrop={(e) => {
                        if (tblColDrag == null) return;
                        e.preventDefault();
                        const from = tblColDrag;
                        setTblColDrag(null);
                        if (from === ci) return;
                        // moveTblCol tauscht nur Nachbarn -> schrittweise von from nach ci
                        const dir = from < ci ? 1 : -1;
                        for (let k = from; k !== ci; k += dir) moveTblCol(b.id, k, dir);
                      }}
                      style={{ border: `1px solid ${tblColDrag === ci ? T.accent : T.border}`, borderRadius: 6, padding: 8, marginBottom: 6, opacity: tblColDrag === ci ? 0.5 : 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <span
                          draggable
                          onDragStart={(e) => { setTblColDrag(ci); e.dataTransfer.effectAllowed = "move"; }}
                          onDragEnd={() => setTblColDrag(null)}
                          title="Ziehen zum Umsortieren"
                          style={{ flex: "0 0 auto", cursor: "grab", display: "flex", alignItems: "center", paddingBottom: 6 }}><GripVertical size={13} color={T.muted} /></span>
                        <div style={{ flex: 2 }}><Field label={`SPALTE ${ci + 1} – TYP`}><Select value={cl.kind} onChange={(e) => patchTblCol(b.id, cl.id, { kind: e.target.value })} options={KIND_OPTS.map(([v, l]) => ({ value: v, label: l }))} /></Field></div>
                        <div style={{ flex: 2 }}><Field label="ÜBERSCHRIFT"><TextInput value={cl.header || ""} onChange={(e) => patchTblCol(b.id, cl.id, { header: e.target.value })} /></Field></div>
                        <div style={{ flex: 2 }}><Field label="LOC-KEY"><TextInput value={cl.headerLoc || ""} onChange={(e) => patchTblCol(b.id, cl.id, { headerLoc: e.target.value })} placeholder="L_…" /></Field></div>
                        {isArr && cl.kind !== "text" && <div style={{ flex: 2 }}><Field label="MEMBER"><TextInput value={cl.member || ""} onChange={(e) => patchTblCol(b.id, cl.id, { member: e.target.value })} placeholder="bAck" /></Field></div>}
                        {(cl.kind === "read" || cl.kind === "input") && <div style={{ flex: 1 }}><Field label="EINHEIT"><TextInput value={cl.unit || ""} onChange={(e) => patchTblCol(b.id, cl.id, { unit: e.target.value })} /></Field></div>}
                        {cl.kind === "read" && <div style={{ flex: 1 }}><Field label="DEZIMALEN"><TextInput value={cl.decimals} onChange={(e) => patchTblCol(b.id, cl.id, { decimals: e.target.value })} placeholder="auto" /></Field></div>}
                        {cl.kind === "input" && <div style={{ flex: 2 }}><Field label="EINGABE-TYP"><Select value={cl.inputType || "auto"} onChange={(e) => patchTblCol(b.id, cl.id, { inputType: e.target.value })} options={[{ value: "auto", label: "Auto (Zahl/Text)" }, { value: "number", label: "Zahl" }, { value: "text", label: "Text" }, { value: "time", label: "Zeit (HH:MM:SS)" }]} /></Field></div>}
                        <IconBtn disabled={ci === 0} title="Spalte nach links" onClick={() => moveTblCol(b.id, ci, -1)}><ChevronLeft size={13} /></IconBtn>
                        <IconBtn disabled={ci === b.columns.length - 1} title="Spalte nach rechts" onClick={() => moveTblCol(b.id, ci, 1)}><ChevronRight size={13} /></IconBtn>
                        <IconBtn danger disabled={b.columns.length <= 1} title="Spalte entfernen" onClick={() => removeTblCol(b.id, ci)}><Trash2 size={13} /></IconBtn>
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginTop: 6 }}>
                        <input type="checkbox" checked={!!cl.sortable} onChange={(e) => patchTblCol(b.id, cl.id, { sortable: e.target.checked })} /> Sortierbar (Klick auf Kopfzeile sortiert)
                      </label>
                      <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "flex-start" }}>
                        <div style={{ flex: 3 }}><Field label="KOPF-SYMBOL (optional)"><IconPicker value={cl.headerIcon || ""} onChange={(k) => patchTblCol(b.id, cl.id, { headerIcon: k })} /></Field></div>
                        {cl.headerIcon ? <div style={{ flex: 2 }}><Field label="SYMBOLFARBE"><IconColorPicker value={cl.headerIconColor || ""} onChange={(hex) => patchTblCol(b.id, cl.id, { headerIconColor: hex })} noneTitle="Wie Kopftext" /></Field></div> : null}
                      </div>
                      {cl.kind === "button" && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ flex: 2 }}><Field label="BUTTON-TEXT"><TextInput value={cl.label || ""} onChange={(e) => patchTblCol(b.id, cl.id, { label: e.target.value })} /></Field></div>
                            <div style={{ flex: 2 }}><Field label="LOC-KEY"><TextInput value={cl.loc || ""} onChange={(e) => patchTblCol(b.id, cl.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                            <div style={{ flex: 2 }}>
                              <Field label="ART">
                                <Select value={cl.action || "symbol"} onChange={(e) => patchTblCol(b.id, cl.id, { action: e.target.value })} options={[{ value: "symbol", label: "Symbol schreiben" }, { value: "fn", label: "Funktion aufrufen" }]} />
                              </Field>
                            </div>
                          </div>
                          {(cl.action || "symbol") === "symbol" ? (
                            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                              <div style={{ flex: 2 }}>
                                <Field label="AKTION">
                                  <Select value={cl.writeMode || "setTrue"} onChange={(e) => patchTblCol(b.id, cl.id, { writeMode: e.target.value })} options={[{ value: "setTrue", label: "TRUE schreiben" }, { value: "setFalse", label: "FALSE schreiben" }, { value: "toggle", label: "Umschalten" }, { value: "pulse", label: "Puls (true→false)" }]} />
                                </Field>
                              </div>
                              {cl.writeMode === "pulse" && <div style={{ flex: 1 }}><Field label="PULS (ms)"><TextInput value={cl.pulseMs} onChange={(e) => patchTblCol(b.id, cl.id, { pulseMs: e.target.value })} /></Field></div>}
                              <div style={{ flex: 3 }} />
                            </div>
                          ) : (
                            <>
                              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                <div style={{ flex: 3 }}><Field label="FUNKTIONSNAME (TcHmi.Functions.AC_HMI.…)"><TextInput value={cl.fnName || ""} onChange={(e) => patchTblCol(b.id, cl.id, { fnName: e.target.value })} placeholder="skipReleasePopUp" /></Field></div>
                                <div style={{ flex: 2 }}>
                                  <Field label="PARAMETER AUS">
                                    <Select value={cl.paramSource || "member"} onChange={(e) => patchTblCol(b.id, cl.id, { paramSource: e.target.value })}
                                      options={
                                        (isArr ? [{ value: "member", label: "PLC-Member (versteckt)" }] : []).concat([
                                          { value: "col", label: "Spaltenwert" },
                                          { value: "index", label: "Zeilenindex" },
                                          { value: "none", label: "Kein Parameter" },
                                        ])
                                      } />
                                  </Field>
                                </div>
                              </div>
                              {(cl.paramSource || "member") === "member" && isArr && (
                                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                  <div style={{ flex: 1 }}><Field label="PARAMETER-MEMBER (z. B. nId — muss keine Spalte sein)"><TextInput value={cl.paramMember || ""} onChange={(e) => patchTblCol(b.id, cl.id, { paramMember: e.target.value })} placeholder="nId" /></Field></div>
                                </div>
                              )}
                              {(cl.paramSource || "member") === "col" && (
                                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                  <div style={{ flex: 1 }}>
                                    <Field label="PARAMETER-SPALTE">
                                      <Select value={cl.paramCol == null ? -1 : cl.paramCol} onChange={(e) => patchTblCol(b.id, cl.id, { paramCol: parseInt(e.target.value) })}
                                        options={[{ value: -1, label: "— wählen —" }].concat(
                                          (b.columns || []).map((c2, ci2) => ({ value: ci2, label: `Spalte ${ci2 + 1}${c2.header ? " – " + c2.header : ""}` }))
                                        )} />
                                    </Field>
                                  </div>
                                </div>
                              )}
                              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "6px 0 0" }}>Ruft beim Klick <code style={{ color: T.text }}>TcHmi.Functions.AC_HMI.{cl.fnName || "…"}(Parameter)</code> auf. Der Parameter wird automatisch typisiert (Zahl wenn numerisch, sonst Text). „PLC-Member (versteckt)" liest den angegebenen Struct-Member je Zeile separat mit — auch ohne eigene Spalte. So bekommt z. B. die Zeile mit Fehler 101 den Aufruf mit Parameter 101.</div>
                            </>
                          )}
                        </div>
                      )}
                      {(cl.kind === "enum" || cl.kind === "icon") && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 4 }}>WERT → {cl.kind === "icon" ? "SYMBOL → FARBE" : "TEXT → FARBE"}</div>
                          {(cl.map || []).map((e) => (
                            <div key={e.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                              <div style={{ width: 70 }}><TextInput value={e.value} onChange={(ev) => patchTblMap(b.id, cl.id, e.id, { value: ev.target.value })} placeholder="Wert" /></div>
                              {cl.kind === "icon" ? (
                                <div style={{ width: 130 }}><Select value={e.icon || "info"} onChange={(ev) => patchTblMap(b.id, cl.id, e.id, { icon: ev.target.value })} options={Object.entries(ICONS).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
                              ) : (
                                <div style={{ flex: 1 }}><TextInput value={e.label} onChange={(ev) => patchTblMap(b.id, cl.id, e.id, { label: ev.target.value })} placeholder="Text" /></div>
                              )}
                              <div style={{ flex: 1 }}><TextInput value={e.loc || ""} onChange={(ev) => patchTblMap(b.id, cl.id, e.id, { loc: ev.target.value })} placeholder="LOC-KEY" /></div>
                              <ColorSwatches value={e.color} onChange={(cc) => patchTblMap(b.id, cl.id, e.id, { color: cc })} />
                              <IconBtn danger title="Eintrag entfernen" onClick={() => removeTblMap(b.id, cl.id, e.id)}><Trash2 size={12} /></IconBtn>
                            </div>
                          ))}
                          <IconBtn title="Eintrag hinzufügen" onClick={() => addTblMap(b.id, cl.id)}><Plus size={13} /></IconBtn>
                        </div>
                      )}
                      <AccessFields access={cl.access} onChange={(a) => patchTblCol(b.id, cl.id, { access: a })} title="GRUPPEN-BERECHTIGUNG (diese Spalte)" />
                    </div>
                  ))}
                  <div style={{ marginBottom: 10 }}><IconBtn title="Spalte hinzufügen" onClick={() => addTblCol(b.id)}><Plus size={14} /></IconBtn></div>

                  {!isArr && (
                    <>
                      <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>ZEILEN (pro Spalte: Symbol bzw. Text)</div>
                      {(b.rows || []).map((r, ri) => (
                        <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: T.muted, width: 20, textAlign: "right", flex: "0 0 auto" }}>{ri + 1}</span>
                          {(b.columns || []).map((cl, ci) => {
                            const cell = (r.cells || [])[ci] || {};
                            if (cl.kind === "text") return (
                              <div key={cl.id} style={{ flex: 1, display: "flex", gap: 4 }}>
                                <TextInput value={cell.text || ""} onChange={(e) => patchTblCell(b.id, r.id, ci, { text: e.target.value })} placeholder="Text" />
                                <TextInput value={cell.loc || ""} onChange={(e) => patchTblCell(b.id, r.id, ci, { loc: e.target.value })} placeholder="L_…" />
                              </div>
                            );
                            if (boundKinds.includes(cl.kind)) return (
                              <div key={cl.id} style={{ flex: 1 }}><TextInput value={cell.symbol || ""} onChange={(e) => patchTblCell(b.id, r.id, ci, { symbol: e.target.value })} placeholder={`Symbol (${cl.header || cl.kind})`} /></div>
                            );
                            return <div key={cl.id} style={{ flex: 1 }} />;
                          })}
                          <IconBtn danger title="Zeile entfernen" onClick={() => removeTblRow(b.id, r.id)}><Trash2 size={12} /></IconBtn>
                        </div>
                      ))}
                      <div style={{ marginBottom: 10 }}><IconBtn title="Zeile hinzufügen" onClick={() => addTblRow(b.id)}><Plus size={14} /></IconBtn></div>
                    </>
                  )}

                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>FÄRBE-REGELN (Wert einer Spalte → Zeile/Zelle einfärben)</div>
                  {(b.rules || []).map((u) => (
                    <div key={u.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <div style={{ flex: 2 }}><Select value={u.colIndex} onChange={(e) => patchTblRule(b.id, u.id, { colIndex: parseInt(e.target.value) })} options={(b.columns || []).map((cl, ci) => ({ value: ci, label: `Spalte ${ci + 1}${cl.header ? " – " + cl.header : ""}` }))} /></div>
                      <div style={{ width: 60 }}><Select value={u.op} onChange={(e) => patchTblRule(b.id, u.id, { op: e.target.value })} options={OPS.map((o) => ({ value: o, label: o }))} /></div>
                      <div style={{ width: 90 }}><TextInput value={u.value} onChange={(e) => patchTblRule(b.id, u.id, { value: e.target.value })} placeholder="true / 5 / Text" /></div>
                      <div style={{ width: 90 }}><Select value={u.target} onChange={(e) => patchTblRule(b.id, u.id, { target: e.target.value })} options={[{ value: "row", label: "Zeile" }, { value: "cell", label: "Zelle" }]} /></div>
                      <ColorSwatches value={u.color} onChange={(cc) => patchTblRule(b.id, u.id, { color: cc })} />
                      <IconBtn danger title="Regel entfernen" onClick={() => removeTblRule(b.id, u.id)}><Trash2 size={12} /></IconBtn>
                    </div>
                  ))}
                  <div style={{ marginBottom: 10 }}><IconBtn title="Regel hinzufügen" onClick={() => addTblRule(b.id)}><Plus size={14} /></IconBtn></div>

                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>ZEILENFILTER (Zeile nur zeigen, wenn ALLE Bedingungen erfüllt)</div>
                  {(b.rowFilters || []).map((f) => (
                    <div key={f.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <div style={{ flex: 2 }}><Select value={f.colIndex} onChange={(e) => patchRowFilter(b.id, f.id, { colIndex: parseInt(e.target.value) })} options={(b.columns || []).map((cl, ci) => ({ value: ci, label: `Spalte ${ci + 1}${cl.header ? " – " + cl.header : ""}` }))} /></div>
                      <div style={{ width: 140 }}><Select value={f.op} onChange={(e) => patchRowFilter(b.id, f.id, { op: e.target.value })} options={[{ value: "notZero", label: "≠ 0 / nicht leer" }, { value: "notEmpty", label: "nicht leer" }, { value: "==", label: "=" }, { value: "!=", label: "≠" }, { value: ">", label: ">" }, { value: ">=", label: "≥" }, { value: "<", label: "<" }, { value: "<=", label: "≤" }]} /></div>
                      {(f.op !== "notEmpty" && f.op !== "notZero") && <div style={{ width: 90 }}><TextInput value={f.value} onChange={(e) => patchRowFilter(b.id, f.id, { value: e.target.value })} placeholder="Wert" /></div>}
                      <IconBtn danger title="Filter entfernen" onClick={() => removeRowFilter(b.id, f.id)}><Trash2 size={12} /></IconBtn>
                    </div>
                  ))}
                  <div style={{ marginBottom: 6 }}><IconBtn title="Filter hinzufügen" onClick={() => addRowFilter(b.id)}><Plus size={14} /></IconBtn></div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>Blendet Zeilen dauerhaft aus, deren Wert die Bedingung nicht erfüllt — z. B. „Spalte 1 ≠ 0 / nicht leer", um leere Struct-Einträge auszublenden. Die Prüfung läuft zur Laufzeit bei jedem Datenupdate (kein Cache, aber ressourcenschonend, da nur ein Vergleich pro Zeile).</div>

                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>STANDARDSORTIERUNG (beim Öffnen)</div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 2 }}>
                      <Field label="SPALTE">
                        <Select
                          value={b.defaultSortCol == null ? -1 : b.defaultSortCol}
                          onChange={(e) => patch(b.id, { defaultSortCol: parseInt(e.target.value) })}
                          options={[{ value: -1, label: "— keine —" }].concat(
                            (b.columns || [])
                              .map((cl, ci) => ({ cl, ci }))
                              .filter(({ cl }) => cl.sortable)
                              .map(({ cl, ci }) => ({ value: ci, label: `Spalte ${ci + 1}${cl.header ? " – " + cl.header : ""}` }))
                          )}
                        />
                      </Field>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Field label="RICHTUNG">
                        <Select
                          value={b.defaultSortDir || "asc"}
                          onChange={(e) => patch(b.id, { defaultSortDir: e.target.value })}
                          options={[{ value: "asc", label: "Aufsteigend" }, { value: "desc", label: "Absteigend" }]}
                        />
                      </Field>
                    </div>
                    <div style={{ flex: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 8 }}>Nur als „sortierbar" markierte Spalten erscheinen hier. Ohne Standardsortierung startet die Tabelle in Datenreihenfolge; Klick auf eine sortierbare Kopfzeile ändert Spalte/Richtung zur Laufzeit.</div>

                  <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                      <input type="checkbox" checked={b.search !== false} onChange={(e) => patch(b.id, { search: e.target.checked })} /> Suchfeld
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                      <input type="checkbox" checked={b.striped !== false} onChange={(e) => patch(b.id, { striped: e.target.checked })} /> Zebra-Streifen
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                      <input type="checkbox" checked={b.showHeader !== false} onChange={(e) => patch(b.id, { showHeader: e.target.checked })} /> Kopfzeile
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer" }}>
                      <input type="checkbox" checked={!!b.showIndex} onChange={(e) => patch(b.id, { showIndex: e.target.checked })} /> Index-Spalte
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}><Field label="SEITENGRÖSSE (0 = aus)"><TextInput value={b.pageSize} onChange={(e) => patch(b.id, { pageSize: e.target.value })} /></Field></div>
                    <div style={{ flex: 1 }}><Field label="WATCH-LIMIT"><TextInput value={b.watchLimit} onChange={(e) => patch(b.id, { watchLimit: e.target.value })} /></Field></div>
                    <div style={{ flex: 1 }}><Field label="SAMMEL-INTERVALL (ms)"><TextInput value={b.pollMs} onChange={(e) => patch(b.id, { pollMs: e.target.value })} /></Field></div>
                    <div style={{ flex: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 8 }}>Bis WATCH-LIMIT gebundene Zellen: einzelne Symbol-Watches (bestätigte API). Darüber: EINE Server-Subscription mit allen Symbolen im Sammel-Intervall — Standard-Protokollweg, in diesem Projekt noch nicht per WS-Mitschnitt verifiziert. Suchfeld-Placeholder lokalisierbar über L_Tbl_Search.</div>
                </>
              );
            })()}

            {(b.type === "enum" || b.type === "enumset") && (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 2 }}><Field label="LABEL"><TextInput value={b.label} onChange={(e) => patch(b.id, { label: e.target.value })} /></Field></div>
                  <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.loc} onChange={(e) => patch(b.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                </div>
                <Field label={sm.label}><TextInput value={b.symbol} onChange={(e) => patch(b.id, { symbol: e.target.value })} placeholder={sm.ph} /></Field>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, cursor: "pointer", marginBottom: 8 }}>
                  <input type="checkbox" checked={!!b.numeric} onChange={(e) => patch(b.id, { numeric: e.target.checked })} /> Wert ist numerisch (parseInt beim Schreiben)
                </label>
                {b.type === "enumset" && <WriteSymField cfg={b} mode={mode} onPatch={(o) => patch(b.id, o)} />}
                {b.type === "enumset" && (
                  <>
                    <div style={{ borderTop: `1px solid ${T.border}`, margin: "2px 0 8px" }} />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: T.muted, cursor: "pointer", marginBottom: 6 }}>
                      <input type="checkbox" checked={!!b.sendButton} onChange={(e) => patch(b.id, { sendButton: e.target.checked })} /> MIT SENDEN-BUTTON
                    </label>
                    {b.sendButton ? (
                      <>
                        <div style={{ display: "flex", gap: 10 }}>
                          <div style={{ flex: 2 }}><Field label="TEXT"><TextInput value={b.sendLabel} onChange={(e) => patch(b.id, { sendLabel: e.target.value })} /></Field></div>
                          <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.sendLoc} onChange={(e) => patch(b.id, { sendLoc: e.target.value })} placeholder="L_…" /></Field></div>
                        </div>
                        <Field label="FARBE"><ColorSwatches value={b.sendColor} onChange={(c) => patch(b.id, { sendColor: c })} /></Field>
                        <TriggerFields cfg={b} onPatch={(o) => patch(b.id, o)} mode={mode} />
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 4 }}>Ohne Button wird der Wert sofort bei Auswahl geschrieben. Mit Button erst beim Klick.</div>
                    )}
                  </>
                )}
                {b.type === "enum" && (
                  <Field label="DARSTELLUNG">
                    <div style={{ display: "flex", gap: 8 }}>
                      {[["text", "Text"], ["badge", "Tag / Badge"]].map(([v, lab]) => {
                        const selD = (b.display || "text") === v;
                        return <button key={v} onClick={() => patch(b.id, { display: v })}
                          style={{ flex: 1, background: selD ? T.panel2 : "transparent", color: selD ? T.text : T.muted, border: `1px solid ${selD ? T.accentDim : T.border}`, borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{lab}</button>;
                      })}
                    </div>
                  </Field>
                )}
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>WERT → TEXT{b.type === "enum" ? " → FARBE" : ""}</div>
                {b.map.map((e) => (
                  <div key={e.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                      <div style={{ width: 64 }}><Field label="WERT"><TextInput value={e.value} onChange={(ev) => patchEntry(b.id, e.id, { value: ev.target.value })} /></Field></div>
                      <div style={{ flex: 1 }}><Field label="LOC-KEY"><TextInput value={e.loc} onChange={(ev) => patchEntry(b.id, e.id, { loc: ev.target.value })} placeholder="L_…" /></Field></div>
                      <div style={{ flex: 1 }}><Field label="TEXT"><TextInput value={e.text} onChange={(ev) => patchEntry(b.id, e.id, { text: ev.target.value })} /></Field></div>
                      <div style={{ marginBottom: 10 }}><IconBtn danger onClick={() => removeEntry(b.id, e.id)}><Trash2 size={13} /></IconBtn></div>
                    </div>
                    {b.type === "enum" && <div style={{ paddingLeft: 2 }}><ColorSwatches value={e.color} onChange={(cc) => patchEntry(b.id, e.id, { color: cc })} /></div>}
                  </div>
                ))}
                <button onClick={() => addEnumEntry(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                  <Plus size={12} color={T.accent} /> Wert
                </button>
                {b.type === "enum" && (
                  <>
                    <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "10px 0 6px" }}>FALLBACK (unbekannter Wert)</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}><Field label="LOC-KEY (optional)"><TextInput value={b.fbLoc} onChange={(e) => patch(b.id, { fbLoc: e.target.value })} placeholder="L_…" /></Field></div>
                      <div style={{ flex: 1 }}><Field label="TEXT (optional)"><TextInput value={b.fbText} onChange={(e) => patch(b.id, { fbText: e.target.value })} /></Field></div>
                    </div>
                    <Field label="FARBE"><ColorSwatches value={b.fbColor} onChange={(cc) => patch(b.id, { fbColor: cc })} /></Field>
                    <div style={{ fontSize: 11, color: T.muted }}>Text leer lassen → Rohwert anzeigen.</div>
                  </>
                )}
              </>
            )}

            {b.type === "status" && (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 2 }}><Field label="LABEL (optional)"><TextInput value={b.label} onChange={(e) => patch(b.id, { label: e.target.value })} /></Field></div>
                  <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.loc} onChange={(e) => patch(b.id, { loc: e.target.value })} placeholder="L_…" /></Field></div>
                </div>
                <Field label="DARSTELLUNG">
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["badge", "Tag / Badge"], ["text", "Text"]].map(([v, lab]) => {
                      const sel = (b.display || "badge") === v;
                      return <button key={v} onClick={() => patch(b.id, { display: v })}
                        style={{ flex: 1, background: sel ? T.panel2 : "transparent", color: sel ? T.text : T.muted, border: `1px solid ${sel ? T.accentDim : T.border}`, borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{lab}</button>;
                    })}
                  </div>
                </Field>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "4px 0 6px" }}>BOOLS (erster true gewinnt)</div>
                {b.map.map((e) => (
                  <div key={e.id} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Bool</span>
                      {b.map.length > 1 && <div style={{ marginLeft: "auto" }}><IconBtn danger onClick={() => removeEntry(b.id, e.id)}><Trash2 size={13} /></IconBtn></div>}
                    </div>
                    <Field label={sm.label}><TextInput value={e.symbol} onChange={(ev) => patchEntry(b.id, e.id, { symbol: ev.target.value })} placeholder={sm.ph} /></Field>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 2 }}><Field label="TEXT"><TextInput value={e.text} onChange={(ev) => patchEntry(b.id, e.id, { text: ev.target.value })} /></Field></div>
                      <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={e.loc} onChange={(ev) => patchEntry(b.id, e.id, { loc: ev.target.value })} placeholder="L_…" /></Field></div>
                    </div>
                    <Field label="FARBE"><ColorSwatches value={e.color} onChange={(cc) => patchEntry(b.id, e.id, { color: cc })} /></Field>
                  </div>
                ))}
                {b.map.length < 6 && (
                  <button onClick={() => addStatusEntry(b.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.text, border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                    <Plus size={12} color={T.accent} /> Bool
                  </button>
                )}
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, margin: "10px 0 6px" }}>FALLBACK (keiner true)</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 2 }}><Field label="TEXT"><TextInput value={b.fbText} onChange={(e) => patch(b.id, { fbText: e.target.value })} /></Field></div>
                  <div style={{ flex: 2 }}><Field label="LOC-KEY (optional)"><TextInput value={b.fbLoc} onChange={(e) => patch(b.id, { fbLoc: e.target.value })} placeholder="L_…" /></Field></div>
                </div>
                <Field label="FARBE"><ColorSwatches value={b.fbColor} onChange={(cc) => patch(b.id, { fbColor: cc })} /></Field>
              </>
            )}

            <AccessFields access={b.access} onChange={(a) => patch(b.id, { access: a })} title="GRUPPEN-BERECHTIGUNG (dieser Baustein)" />
          </div>
        )}
      </div>
    );
}

export { BlockCard };