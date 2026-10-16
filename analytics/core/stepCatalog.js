// ── Schrittkatalog der Filterpressen-Steuerung (SPS-Schrittnummern) ──
// Übertragen aus MachineDataStack backend/src/lib/step-catalog.ts (Typen entfernt).
// Die Nummer ist der Schlüssel. Kategorien:
//   active    = Aktivzeit (Beschicken 5–9, Nachpressen Membran 19, Kuchenpflege 20)
//   secondary = Nebenzeit (übrige Prozessschritte)
//   pause     = Pausenzeit 10–16 – eigene Größe, nicht Teil der Prozesszeit
//   ignored   = nicht gewertet: 0, 24, 90–99 und alle Schritte außerhalb des Katalogs

/** @typedef {'active'|'secondary'|'pause'|'ignored'} StepCategory */
/** @typedef {{ no: number, name: string, group: string|null, category: StepCategory }} CatalogStep */

const S = (no, name, group, category) => ({ no, name, group, category });

/** @type {CatalogStep[]} */
export const STEP_CATALOG = [
  S(0, "Kein Schritt (0)", null, "ignored"),
  S(1, "Filterpresse Schließen", "Schließen", "secondary"),
  S(2, "Prüfung Startkriterien", "Schließen", "secondary"),
  S(3, "Dichtheitsprüfung", "Schließen", "secondary"),
  S(4, "Prüfung Startkriterien 2", "Schließen", "secondary"),
  S(5, "Beschickung Befüllen", "Beschicken", "active"),
  S(6, "Beschicken Druckstufe 1", "Beschicken", "active"),
  S(7, "Beschicken Druckstufe 2", "Beschicken", "active"),
  S(8, "Beschicken Druckstufe 3", "Beschicken", "active"),
  S(9, "Beschicken Druckstufe 4", "Beschicken", "active"),
  S(10, "Manuelle Pause", "Pause", "pause"),
  S(11, "Pause B1 leer", "Pause", "pause"),
  S(12, "Pause Freigabe fehlt", "Pause", "pause"),
  S(13, "Pause Klarwasser", "Pause", "pause"),
  S(14, "Pause Filtratbehälter MAX", "Pause", "pause"),
  S(15, "Pause Watchdog", "Pause", "pause"),
  S(16, "Pause Wechsel Reststoffbehälter", "Pause", "pause"),
  S(17, "Spaltwäsche 1", "Spaltwäsche", "secondary"),
  S(18, "Spaltwäsche 2", "Spaltwäsche", "secondary"),
  S(19, "Nachpressen Membran", "Nachpressen Membran", "active"),
  S(20, "Kuchenpflege", "Kuchenpflege", "active"),
  S(21, "Prüfen Öffnen OK", "Öffnen", "secondary"),
  S(22, "Filterpresse Öffnen", "Öffnen", "secondary"),
  S(23, "Kuchenauswurf", "Kuchenauswurf", "secondary"),
  S(24, "Zyklus beendet", null, "ignored"),
  S(90, "Handmodus", null, "ignored"),
  S(91, "Hand Schließen", null, "ignored"),
  S(92, "Hand Dichtheitsprüfung", null, "ignored"),
  S(93, "Hand Beschicken", null, "ignored"),
  S(94, "Hand Membrannachpressen", null, "ignored"),
  S(95, "Hand Filterkuchenpflege", null, "ignored"),
  S(96, "Hand Entlasten und Öffnen", null, "ignored"),
  S(97, "Hand Kuchen Entleeren", null, "ignored"),
  S(98, "Hand Tuchspülen", null, "ignored"),
  S(99, "Kein Schritt aktiv", null, "ignored"),
];

export const CATALOG_BY_NO = new Map(STEP_CATALOG.map((s) => [s.no, s]));

// Vergleichsform für Schritttexte (Groß-/Kleinschreibung, Umlaute, Sonderzeichen egal)
export function normalizeStepText(s) {
  return String(s)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

const CATALOG_BY_TEXT = new Map([
  ...STEP_CATALOG.map((s) => [normalizeStepText(s.name), s.no]),
  [normalizeStepText("0"), 0],
]);

/** Schritttext → Katalognummer, null = nicht im Katalog */
export function catalogNoForText(text) {
  const n = CATALOG_BY_TEXT.get(normalizeStepText(text));
  return n === undefined ? null : n;
}

/** @returns {StepCategory} */
export function stepCategory(no) {
  const s = CATALOG_BY_NO.get(no);
  return s ? s.category : "ignored";
}
export function stepGroup(no) {
  const s = CATALOG_BY_NO.get(no);
  return s ? s.group : null;
}
export function stepName(no) {
  const s = CATALOG_BY_NO.get(no);
  return s ? s.name : "Schritt " + no;
}

const nosWhere = (pred) => STEP_CATALOG.filter(pred).map((s) => s.no);
export const PROCESS_STEP_NOS = nosWhere((s) => s.category !== "ignored");
export const PAUSE_STEP_NOS = nosWhere((s) => s.category === "pause");
export const BESCHICK_STEP_NOS = nosWhere((s) => s.group === "Beschicken");

const PROCESS_SET = new Set(PROCESS_STEP_NOS);
const PAUSE_SET = new Set(PAUSE_STEP_NOS);
const BESCHICK_SET = new Set(BESCHICK_STEP_NOS);

/** Prozessschritt = zählt zur Zyklusdauer (Aktiv-, Neben- oder Pausenzeit) */
export const isProcessStep = (no) => PROCESS_SET.has(no);
export const isPauseStep = (no) => PAUSE_SET.has(no);
export const isBeschickStep = (no) => BESCHICK_SET.has(no);

export const PAUSE_GROUP = "Pause";

// Reihenfolge der Hauptschritte = kleinste Katalognummer
const GROUP_ORDER = new Map();
for (const st of STEP_CATALOG) {
  if (st.group != null && !GROUP_ORDER.has(st.group)) GROUP_ORDER.set(st.group, st.no);
}
export const groupOrder = (g) => (GROUP_ORDER.has(g) ? GROUP_ORDER.get(g) : Number.POSITIVE_INFINITY);

/** Voreinstellung Aktivzeit: Hauptschritte der Kategorie 'active' */
export const DEFAULT_ACTIVE_GROUPS = [...new Set(STEP_CATALOG.filter((s) => s.category === "active").map((s) => s.group))];
