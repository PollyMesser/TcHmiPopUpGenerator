// ── Adapter: Maschinen-CSV-Export → Messzeilen ──
// Für Tests (Referenz-CSV) und Offline-Auswertungen. Entspricht dem CSV-Import
// der App (services/csv-import.ts + lib/column-match.ts), ohne Datenbank:
//  - Trennzeichen ';' oder ',' (Erkennung an der Kopfzeile), bei ';' Dezimalkomma
//  - Spalten per Synonym-Liste zugeordnet (Groß-/Kleinschreibung, Umlaute, Sonderzeichen egal)
//  - Schritt: Schrittnummer-Spalte hat Vorrang, sonst Schritttext über den Katalog;
//    unbekannte Texte bekommen Nummern ab 1000 (nicht gewertet)
//  - Zeitstempel = Datum + Zeit "als UTC" (wie die App) → Epoche in Sekunden
// Erwartet bereits dekodierten Text (Node: Buffer → decodeCsvBuffer()).

import { catalogNoForText } from "../core/stepCatalog.js";

const FIELDS = [
  { key: "cycleNo", syn: ["zyklusnummer", "zyklusnr", "zyklusno", "zyklusnumber", "cyclenumber", "cycleno", "cyclenr", "znr"] },
  { key: "schritt", syn: ["schritt", "step", "phase", "stufe", "schritttext", "steptext"] },
  { key: "schritt_nr", syn: ["schrittnr", "schrittnummer", "schrittno", "nrschritt", "stepnr", "stepno", "stepnumber", "stepid", "schrittid"] },
  { key: "machine", syn: ["sernr", "seriennr", "seriennummer", "serialno", "serialnr", "serialnumber", "serial", "snr", "sn", "maschinennr", "maschinennummer", "anlagennr"] },
  { key: "datum", syn: ["datum", "date", "tag", "day"] },
  { key: "zeit", syn: ["zeit", "time", "uhrzeit"] },
  { key: "material", syn: ["material", "medium", "werkstoff"] },
  { key: "customer", syn: ["kunde", "customer", "client", "auftraggeber", "kundenname"] },
  { key: "druck_zulauf", num: true, syn: ["druckzulauf", "zulaufdruck", "pzulauf", "druckein", "einlassdruck", "inletpressure"] },
  { key: "druck_membran", num: true, syn: ["druckmembran", "membrandruck", "pmembran", "membranepressure"] },
  { key: "druck_hydraulik", num: true, syn: ["druckhydraulik", "hydraulikdruck", "phydraulik", "hydraulicpressure"] },
  { key: "leistung_pumpe", num: true, syn: ["leistungpumpe", "pumpenleistung", "pumpleistung", "ppumpe", "pumppower"] },
  { key: "neigung", num: true, syn: ["neigung", "tilt", "winkel", "angle", "inclination"] },
  { key: "behaelter_niveau", num: true, syn: ["behaelterniveau", "behalterniveau", "fuellstand", "fullstand", "niveau", "level", "tanklevel"] },
  { key: "zyklus_zeit", num: true, syn: ["zykluszeit", "zyklusdauer", "cycletime", "cycleduration", "zeitzyklus", "dauer"] },
  { key: "leistung", num: true, syn: ["leistung", "power", "kw", "gesamtleistung"] },
  { key: "zyklus_durchsatz", num: true, syn: ["zyklusdurchsatz", "durchsatz", "throughput", "durchsatzzyklus", "cyclethroughput"] },
  { key: "druckindex", num: true, syn: ["druckindex", "pressureindex", "pindex", "druckkennzahl"] },
];

export function normalizeHeader(s) {
  return String(s).toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

/** Node: Buffer → Text (UTF-8, Fallback Latin-1 wie die App) */
export function decodeCsvBuffer(buf) {
  const utf8 = buf.toString("utf-8");
  const text = utf8.includes("�") ? buf.toString("latin1") : utf8;
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // BOM entfernen
}

function toNumber(raw, germanDecimals) {
  const s = (raw == null ? "" : String(raw)).trim();
  if (s === "") return null;
  const n = Number(germanDecimals ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw) {
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  return m ? m[3] + "-" + m[2] + "-" + m[1] : null;
}

// Einfacher Zeilen-Splitter (die Maschinen-Exporte enthalten keine Anführungszeichen-Felder)
function splitLine(line, delim) {
  if (line.indexOf('"') < 0) return line.split(delim).map((s) => s.trim());
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/**
 * @param {string} text CSV-Inhalt
 * @param {{ machine?: string }} [opts] machine überschreibt die Seriennummer-Spalte
 * @returns {{ rows: object[], unknownSteps: Record<string, number>, mapping: Record<string, number> }}
 */
export function parseMachineCsv(text, opts = {}) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) throw new Error("CSV ist leer.");
  const first = lines[0];
  const delim = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : ",";
  const german = delim === ";";
  const header = splitLine(first, delim).map(normalizeHeader);
  const mapping = {};
  const used = new Set();
  for (const f of FIELDS) {
    const idx = header.findIndex((h, i) => !used.has(i) && f.syn.includes(h));
    if (idx >= 0) { mapping[f.key] = idx; used.add(idx); }
  }
  for (const req of ["cycleNo", "datum", "zeit"]) {
    if (mapping[req] == null) throw new Error("Pflichtspalte fehlt: " + req);
  }
  if (mapping.schritt == null && mapping.schritt_nr == null) throw new Error("Pflichtspalte fehlt: Schritt oder Schrittnummer");
  if (mapping.machine == null && !opts.machine) throw new Error("Maschine fehlt (Seriennummer-Spalte oder opts.machine)");

  const unknownSteps = {};
  let nextUnknown = 1000;
  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = splitLine(lines[li], delim);
    const get = (k) => (mapping[k] == null ? undefined : cells[mapping[k]]);
    const cycleNo = toNumber(get("cycleNo"), false);
    if (cycleNo == null) throw new Error("Zeile " + (li + 1) + ": Zyklusnummer ist keine Zahl");
    let step = null;
    if (mapping.schritt_nr != null) {
      const n = toNumber(get("schritt_nr"), false);
      if (n != null && Number.isInteger(n)) step = n;
    }
    if (step == null && mapping.schritt != null) {
      const raw = (get("schritt") || "").trim();
      if (raw !== "") {
        const n = toNumber(raw, false);
        if (n != null && Number.isInteger(n)) step = n;
        else {
          const c = catalogNoForText(raw);
          if (c != null) step = c;
          else {
            if (unknownSteps[raw] == null) unknownSteps[raw] = nextUnknown++;
            step = unknownSteps[raw];
          }
        }
      }
    }
    if (step == null) step = 0;
    const datum = normalizeDate(get("datum") || "");
    if (!datum) throw new Error("Zeile " + (li + 1) + ": Datum unbekanntes Format");
    let zeit = (get("zeit") || "").trim();
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(zeit)) throw new Error("Zeile " + (li + 1) + ": Zeit muss HH:MM[:SS] sein");
    if (zeit.length === 5) zeit += ":00";
    const ts = Date.parse(datum + "T" + zeit + "Z") / 1000;
    const row = {
      machine: opts.machine || (get("machine") || "").trim(),
      cycleNo, ts, step,
      material: (get("material") || "").trim() || null,
      customer: (get("customer") || "").trim() || null,
    };
    for (const f of FIELDS) if (f.num) row[f.key] = toNumber(get(f.key), german);
    rows.push(row);
  }
  return { rows, unknownSteps, mapping };
}
