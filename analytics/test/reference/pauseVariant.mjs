// ── Testdaten-Variante mit Pausen ──
// Die Referenz-CSV 2026-06_2.CSV enthält keine Pausenschritte (10–16). Damit die
// Pausenlogik (Schrittdauern: Pausenläufe; Filtrationskurven: herausgeschnittene
// Pausen) geprüft wird, werden deterministisch Zeilen umgeschrieben:
//   jeder 7. Zyklus (Index % 7 === 3):  jede 4. Zeile "Beschicken Druckstufe 2" → Pause (B1 leer / Manuelle / Watchdog)
//   jeder 11. Zyklus (Index % 11 === 5): jede 3. Zeile "Kuchenpflege" → "Pause Klarwasser"
// Aufruf als Skript schreibt die Datei für die SQLite-Referenz:
//   node pauseVariant.mjs <eingang.csv> <ausgang.csv>
import { readFileSync, writeFileSync } from "node:fs";

const PAUSES = ["Pause B1 leer", "Manuelle Pause", "Pause Watchdog"];

/** Text (Zeilen mit CRLF) → Text mit Pausen */
export function makePauseVariant(text) {
  const lines = text.split("\r\n");
  const cycIdx = new Map();
  let nB = 0, nK = 0, nP = 0;
  const out = lines.map((line, i) => {
    if (i === 0 || !line) return line;
    const f = line.split(";");
    if (!cycIdx.has(f[1])) cycIdx.set(f[1], cycIdx.size);
    const k = cycIdx.get(f[1]);
    if (k % 7 === 3 && f[14] === "Beschicken Druckstufe 2" && nB++ % 4 === 0) f[14] = PAUSES[nP++ % 3];
    else if (k % 11 === 5 && f[14] === "Kuchenpflege" && nK++ % 3 === 0) f[14] = "Pause Klarwasser";
    return f.join(";");
  });
  return out.join("\r\n");
}

if (process.argv[1] && process.argv[1].endsWith("pauseVariant.mjs") && process.argv[3]) {
  const src = readFileSync(process.argv[2], "latin1");
  writeFileSync(process.argv[3], makePauseVariant(src), "latin1");
}
