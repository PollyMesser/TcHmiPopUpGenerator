import { ACCESS_GROUPS, ACCESS_RIGHTS } from "../constants/options.js";

// ── Gruppen-Berechtigungen: Modell + Kompilierung ──
// Interne Form (pro Scope: Popup ODER einzelner Baustein):
//   access = {
//     observe: { on: false, groups: { Admin:'Allow', Service:'Allow', … } },
//     operate: { on: false, groups: { … } },
//   }
// "on" ist der Opt-in-Schalter je Recht. Ohne aktives Recht wird KEIN
// Gating-Code erzeugt (Byte-Identität zum bisherigen Output).

const RIGHT_KEYS = ACCESS_RIGHTS.map((r) => r.key); // ['observe','operate']

// Default: beide Rechte aus, alle Gruppen auf "Allow" (harmlos bis aktiviert/verweigert).
function mkAccess() {
  const access = {};
  RIGHT_KEYS.forEach((rk) => {
    const groups = {};
    ACCESS_GROUPS.forEach((g) => { groups[g] = "Allow"; });
    access[rk] = { on: false, groups };
  });
  return access;
}

// Ist mindestens ein Recht aktiv? -> nur dann gibt es überhaupt Gating.
function accessActive(access) {
  if (!access) return false;
  return RIGHT_KEYS.some((rk) => access[rk] && access[rk].on);
}

// Kompiliert die Editor-Form in kompakte Allow-Listen für den generierten Code.
// Ergebnis: { observe:['Admin',…], operate:[…] } – nur Rechte mit on:true.
// null, wenn nichts aktiv ist.
function compileAccess(access) {
  if (!accessActive(access)) return null;
  const out = {};
  RIGHT_KEYS.forEach((rk) => {
    const r = access[rk];
    if (!r || !r.on) return;
    out[rk] = ACCESS_GROUPS.filter((g) => ((r.groups && r.groups[g]) || "Allow") === "Allow");
  });
  return out;
}

export { mkAccess, accessActive, compileAccess, RIGHT_KEYS };
