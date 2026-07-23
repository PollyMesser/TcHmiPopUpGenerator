// ── Minimaler Assert-Helfer für die Logik-Tests (kein Testframework nötig) ──
let count = 0;
const failures = [];

function assertEqual(actual, expected, msg) {
  count++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures.push(`${msg}: erwartet ${e}, erhalten ${a}`);
}
function assert(cond, msg) {
  count++;
  if (!cond) failures.push(msg);
}
function report(label) {
  if (failures.length) {
    console.error(`✗ ${label}: ${failures.length}/${count} Prüfungen fehlgeschlagen:`);
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log(`✓ ${label}: alle ${count} Prüfungen bestanden.`);
}

export { assertEqual, assert, report };
