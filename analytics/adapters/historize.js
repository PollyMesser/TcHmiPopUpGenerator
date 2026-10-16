// ── Adapter: TcHmiPostgresHistorize / TcHmiSqliteHistorize → Messzeilen ──
// Wandelt die Antwort von GetTrendLineData (axesData[i] positionsgleich zu
// yAxes[i], Punkte { x: ISO-8601 UTC, y }) in Messzeilen für analytics/core um.
//
// Bestätigt am 07.10.2026 (TcHmiPostgresHistorize):
//   - Symbolname = voller Pfad wie in historizedSymbolList (z. B. ADS.AF_PLC.MAIN.BF310.State.fValue)
//   - Zeitstempel ISO 8601 UTC mit Z und Millisekunden
//   - weniger Rohpunkte als displayWidth → Rohdaten; sonst ein Punkt je Zeitfenster/displayWidth
//   - erster Punkt eines Segments mit flags: "Start"
//
// Zusammenführen: Jedes Symbol wird für sich historisiert, die Zeitstempel der
// Symbole sind deshalb nicht identisch. Takt ist die Schrittnummer-Reihe (für
// beide Widgets nötig); je Takt-Zeitstempel gelten
//   - Zyklusnummer: letzter Wert bis t (+ Toleranz) – sie ändert sich sprunghaft
//   - Leistung u. a.: zeitlich nächster Wert innerhalb ± Toleranz, sonst null
// Toleranz = halbes Aufzeichnungsintervall. So entstehen keine Doppelzeilen im
// Abstand weniger Millisekunden (würden das typische Intervall der
// Schrittdauer-Berechnung verfälschen).
//
// ES5-kompatibel geschrieben (wird mit dem Rechenkern in den HMI-Code eingebettet).

function toSec(x) {
  if (typeof x === "number") return x > 1e11 ? x / 1000 : x;
  var t = Date.parse(x);
  return isNaN(t) ? null : t / 1000;
}

/** Punkte → sortierte { t, v } (ungültige entfernt) */
function cleanSeries(points) {
  var out = [];
  for (var i = 0; i < (points || []).length; i++) {
    var p = points[i];
    if (!p) continue;
    var t = toSec(p.x);
    var v = p.y === null || p.y === undefined || p.y === "" ? null : Number(p.y);
    if (t === null || (v !== null && !isFinite(v))) continue;
    out.push({ t: t, v: v });
  }
  out.sort(function (a, b) { return a.t - b.t; });
  return out;
}

/**
 * @param {{ step: object[], cycle: object[], metrics?: Record<string, object[]> }} series
 *        Rohpunkte je Rolle: step/cycle Pflicht, metrics z. B. { leistung: [...] }
 * @param {{ machine?: string, toleranceS?: number }} [opts] toleranceS Standard 5 s (halbes 10-s-Intervall)
 * @returns {object[]} Messzeilen { machine, cycleNo, ts, step, ...metrics }
 */
export function mergeHistorizeSeries(series, opts) {
  opts = opts || {};
  var tol = opts.toleranceS != null ? opts.toleranceS : 5;
  var machine = opts.machine || "Maschine";
  var steps = cleanSeries(series.step);
  var cycles = cleanSeries(series.cycle);
  var metricKeys = Object.keys(series.metrics || {});
  var metrics = {};
  metricKeys.forEach(function (k) { metrics[k] = cleanSeries(series.metrics[k]); });

  var rows = [];
  var ci = -1;
  var mi = {};
  metricKeys.forEach(function (k) { mi[k] = 0; });
  for (var i = 0; i < steps.length; i++) {
    var t = steps[i].t;
    if (steps[i].v === null) continue;
    // Zyklusnummer: letzter Wert bis t + tol
    while (ci + 1 < cycles.length && cycles[ci + 1].t <= t + tol) ci++;
    if (ci < 0 || cycles[ci].v === null) continue; // vor dem ersten Zykluswert: keine Zuordnung
    var row = { machine: machine, cycleNo: Math.round(cycles[ci].v), ts: Math.round(t), step: Math.round(steps[i].v) };
    // Kennzahlen: nächster Punkt innerhalb ± tol
    for (var k = 0; k < metricKeys.length; k++) {
      var key = metricKeys[k];
      var s = metrics[key];
      var j = mi[key];
      while (j + 1 < s.length && s[j + 1].t <= t) j++;
      mi[key] = j;
      var best = null, bestD = Infinity;
      for (var q = j; q <= j + 1 && q < s.length; q++) {
        if (q < 0) continue;
        var d = Math.abs(s[q].t - t);
        if (d < bestD) { bestD = d; best = s[q]; }
      }
      row[key] = best && bestD <= tol ? best.v : null;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Erkennt verdichtete Antworten: kommen (fast) so viele Punkte wie displayWidth,
 * hat der Server vermutlich Zeitfenster zusammengefasst statt Rohdaten zu liefern.
 */
export function looksCompressed(points, displayWidth) {
  return (points || []).length >= Math.floor(displayWidth * 0.98);
}

/** displayWidth so wählen, dass der Zeitraum sicher weniger Rohpunkte hat (+25 % Reserve) */
export function rawDisplayWidth(days, intervalS) {
  return Math.ceil((days * 86400) / Math.max(1, intervalS) * 1.25) + 10;
}
