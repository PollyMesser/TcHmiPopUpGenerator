#!/usr/bin/env node
// ── Logik-Test: AC_Keyboard (eigenständige Funktionsdatei) ──
// Babel-Parse, 0 Backslashes, Registrierung, Panel-Regeln (kein input, kein focus(),
// kein contenteditable, keine Symbolzeichen ausserhalb der Roboto-Abdeckung) und reine
// Helfer (upper/clip/normOpts/toSym) per Hook aus dem ECHTEN Output.
// Die DOM-Bedienung (Tasten, Umschalten, Cursor) braucht einen echten Browser.
import vm from "node:vm";
import { parse } from "@babel/parser";
import { generateKeyboard, KEYBOARD_FN } from "../src/codegen/emitKeyboard.js";
import { makeSandbox } from "./_dom-stub.mjs";
import { assertEqual, assert, report } from "./_assert.mjs";

const code = generateKeyboard();
let parsed = true;
try { parse(code, { sourceType: "script" }); } catch (e) { parsed = false; }
assert(parsed, "Keyboard-Code ist syntaktisch gültiges JS (Babel)");
assertEqual((code.match(/\\/g) || []).length, 0, "Keyboard-Code ist backslash-frei");
assertEqual((code.match(/registerFunctionEx\(/g) || []).length, 1, "genau eine Registrierung");
assertEqual(generateKeyboard(), code, "Ausgabe ist deterministisch");
// Panel-Tastatur: kein Eingabeelement, kein Fokus (Test am Christ-Panel 03.11.2026)
assertEqual((code.match(/createElement\('input'\)/g) || []).length, 0, "kein input-Element");
assertEqual((code.match(/\.focus\(/g) || []).length, 0, "nie focus()");
assertEqual((code.match(/contentEditable|contenteditable/g) || []).length, 0, "kein contenteditable");
// Symbolzeichen (Pfeile, Geometrie, Technik) fehlen in der Panel-Schrift -> nur ausserhalb von Kommentaren pruefen
const codeNoComments = code.split("\n").filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join("\n");
const bad = [...codeNoComments].filter((c) => { const o = c.codePointAt(0); return (o >= 0x2190 && o <= 0x23ff) || (o >= 0x25a0 && o <= 0x27bf); });
assertEqual(bad, [], "keine Symbolzeichen U+2190–23FF / U+25A0–27BF im Code (Sondertasten als SVG)");

const hookLine = `AC_HMI.${KEYBOARD_FN} = ${KEYBOARD_FN};`;
assert(code.includes(hookLine), "Export-Zeile für Hook vorhanden");
const injected = code.replace(hookLine, hookLine + " AC_HMI.__kb = { upper: upper, clip: clip, normOpts: normOpts, toSym: toSym, LAYOUTS: LAYOUTS };");
const S = makeSandbox();
const ctx = vm.createContext(S.sandbox);
vm.runInContext(injected, ctx, { filename: "AC_Keyboard-under-test.js" });
assertEqual(S.registerCalls.map((c) => [c.name, c.ns]), [[KEYBOARD_FN, "TcHmi.Functions.AC_HMI"]], "registerFunctionEx(AC_Keyboard, TcHmi.Functions.AC_HMI)");
const kb = ctx.TcHmi.Functions.AC_HMI.__kb;

assertEqual(["a", "ä", "ö", "ü", "ß", "1", ","].map(kb.upper), ["A", "Ä", "Ö", "Ü", "ß", "1", ","], "upper: Umlaute groß, ß bleibt");
assertEqual([kb.clip("abcdef", 4), kb.clip("abc", 4), kb.clip("abcdef", 0)], ["abcd", "abc", "abcdef"], "clip: maxLength, 0 = ohne Grenze");
assertEqual(kb.toSym("GVL.s"), "%s%GVL.s%/s%", "toSym schließt ein");
const n1 = kb.normOpts({ symbol: "GVL.s", maxLength: "32" });
assertEqual([n1.symbol, n1.writeSymbol, n1.maxLength, n1.layout, n1.numPad], ["%s%GVL.s%/s%", "%s%GVL.s%/s%", 32, "de", true], "normOpts: Symbol, maxLength, Standard-Layout de, NumPad-Umschalter an");
const n2 = kb.normOpts({ value: "x", write: () => {}, maxLength: -3, numPad: false, layout: "xx" });
assertEqual([n2.maxLength, n2.layout, n2.numPad, typeof n2.write], [0, "de", false, "function"], "normOpts: ungültige Länge/Layout -> 0/de; numPad false");
const de = kb.LAYOUTS.de;
assertEqual([de.letters.length, de.symbols.length], [4, 4], "Layout de: je 4 Zeichenzeilen");
const all = [].concat(...de.letters, ...de.symbols);
assert(["ä", "ö", "ü", "ß", "z", "y", "€", "@", "\\", "'"].every((c) => all.includes(c)), "Layout de enthält QWERTZ, Umlaute, ß, €, @, Backslash, Apostroph");
assertEqual(de.letters[1][5] + de.letters[3][0], "zy", "QWERTZ: z in Zeile 2, y in Zeile 4");

report("keyboard-logic");
