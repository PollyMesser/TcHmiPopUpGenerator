import { T } from "../constants/theme.js";
import { ACCESS_GROUPS, ACCESS_RIGHTS } from "../constants/options.js";
import { mkAccess } from "../model/access.js";

// ── Editor für Gruppen-Berechtigungen (Popup-weit ODER pro Baustein) ──
// access: internes Objekt (siehe model/access.js) oder undefined (= keine).
// onChange(next|undefined): undefined schaltet die Berechtigung ganz ab.
function AccessFields({ access, onChange, title = "GRUPPEN-BERECHTIGUNG" }) {
  const active = !!access;
  const setRight = (rk, patch) => {
    const base = access || mkAccess();
    onChange({ ...base, [rk]: { ...base[rk], ...patch } });
  };
  const setGroup = (rk, g, val) => {
    const base = access || mkAccess();
    onChange({ ...base, [rk]: { ...base[rk], groups: { ...base[rk].groups, [g]: val } } });
  };
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, marginTop: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: T.muted, cursor: "pointer" }}>
        <input type="checkbox" checked={active} onChange={() => onChange(active ? undefined : mkAccess())} /> {title}
      </label>
      {active && (
        <>
          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, margin: "6px 0 8px" }}>
            Auflösung zur Laufzeit über <code style={{ color: T.text }}>getCurrentUserConfig().userIsInGroups</code>. Nur Gruppen mit „Erlaubt" sehen bzw. bedienen das Element (Allow gewinnt).
          </div>
          {ACCESS_RIGHTS.map((r) => {
            const rk = r.key;
            const ra = access[rk] || { on: false, groups: {} };
            return (
              <div key={rk} style={{ marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.text, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!ra.on} onChange={(e) => setRight(rk, { on: e.target.checked })} /> {r.label}
                </label>
                {ra.on && (
                  <>
                    <div style={{ fontSize: 11, color: T.muted, margin: "2px 0 6px", paddingLeft: 24 }}>{r.hint}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 24 }}>
                      {ACCESS_GROUPS.map((g) => {
                        const val = (ra.groups && ra.groups[g]) || "Allow";
                        return (
                          <div key={g} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ flex: 1, fontSize: 12, color: T.text }}>{g}</span>
                            {[["Allow", "Erlaubt", T.accent, "#062611"], ["Deny", "Verweigert", T.danger, "#ffffff"]].map(([v, lab, bg, fg]) => {
                              const sel = val === v;
                              return (
                                <button key={v} type="button" onClick={() => setGroup(rk, g, v)}
                                  style={{ padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 5, cursor: "pointer",
                                    background: sel ? bg : "transparent", color: sel ? fg : T.muted, border: `1px solid ${sel ? bg : T.border}` }}>
                                  {lab}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export { AccessFields };
