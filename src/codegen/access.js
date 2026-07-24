import { compileAccess, accessActive } from "../model/access.js";
import { I } from "./helpers.js";

// ── Codegen für Gruppen-Berechtigungen ──
// Strikt opt-in: Existiert weder popup-weit noch an einem Baustein eine aktive
// Berechtigung, wird NICHTS erzeugt (Byte-Identität zum bisherigen Output).

// Braucht ein Baustein Gating? (Baustein selbst ODER ein einzelner Button)
function blockNeedsAccess(b) {
  if (accessActive(b.access)) return true;
  if (b.type === "button") return (b.buttons || []).some((bt) => accessActive(bt.access));
  if (b.type === "table") return (b.columns || []).some((c) => accessActive(c.access));
  return false;
}

// Wird an irgendeiner Stelle (Popup, Baustein oder Button) eine Berechtigung
// genutzt? Steuert, ob der Runtime-Helfer überhaupt eingebettet wird.
function anyAccess(cfg) {
  if (accessActive(cfg.access)) return true;
  return (cfg.blocks || []).some(blockNeedsAccess);
}

// Runtime-Helfer (einmal pro Popup, nur wenn benötigt). Läuft im IIFE-Body,
// wo TcHmi in Scope ist. Semantik: Whitelist / "Allow gewinnt" – erlaubt, wenn
// der User in mindestens einer erlaubten Gruppe ist; leere/fehlende Liste =
// Recht nicht eingeschränkt. Backslash-frei (TcHMI-Einbettungsregel).
function accessHelperSrc() {
  return [
    `${I}// ── Gruppen-Berechtigungen (TcHmi.Server.getCurrentUserConfig().userIsInGroups) ──`,
    `${I}function acCurrentGroups() {`,
    `${I}    try { var c = TcHmi.Server.getCurrentUserConfig(); return (c && c.userIsInGroups) || []; } catch (e) { return []; }`,
    `${I}}`,
    `${I}function acAllowed(allowGroups) {`,
    `${I}    if (!allowGroups) return true;`,
    `${I}    var g = acCurrentGroups();`,
    `${I}    for (var i = 0; i < allowGroups.length; i++) { if (g.indexOf(allowGroups[i]) >= 0) return true; }`,
    `${I}    return false;`,
    `${I}}`,
  ].join("\n");
}

// Popup-weite Gates: observe verhindert das Öffnen (return vor dem Anhängen),
// operate deaktiviert alle Bedienelemente im body. prefix läuft am Anfang des
// bodyContent, suffix am Ende (body ist dann gefüllt, aber noch nicht angehängt).
function popupGuards(cfg) {
  const compiled = compileAccess(cfg.access);
  if (!compiled) return { prefix: "", suffix: "" };
  const lit = JSON.stringify(compiled);
  const prefix = [
    `${I}var __acPopup = ${lit};`,
    `${I}if (!acAllowed(__acPopup.observe)) return; // Popup für diese Gruppe nicht anzeigen`,
  ].join("\n");
  const suffix = [
    `${I}if (!acAllowed(__acPopup.operate)) { var __acPE = body.querySelectorAll('button, input, select, textarea'); for (var __acPi = 0; __acPi < __acPE.length; __acPi++) { if (__acPE[__acPi].getAttribute && __acPE[__acPi].getAttribute('data-ac-view')) continue; __acPE[__acPi].disabled = true; } body.style.opacity = '0.6'; }`,
  ].join("\n");
  return { prefix, suffix };
}

// Per-Baustein-Gate: umschließt den unveränderten Emitter-Output eines Bausteins.
// emit(parentVar) liefert den Baustein-Code für den übergebenen Ziel-Container.
// Ohne aktive Berechtigung wird emit(parent) unverändert zurückgegeben
// (Byte-Identität). Sonst: observe = gar nicht bauen/anhängen, operate =
// Bedienelemente im Wrapper deaktivieren + dimmen.
function gateBlock(b, parent, emit) {
  const compiled = compileAccess(b.access);
  if (!compiled) return emit(parent);
  const lit = JSON.stringify(compiled);
  const inner = emit("accW");
  return [
    `${I}// Baustein mit Gruppen-Berechtigung`,
    `${I}(function () {`,
    `${I}    var __acR = ${lit};`,
    `${I}    if (!acAllowed(__acR.observe)) return;`,
    `${I}    var accW = document.createElement('div');`,
    `${I}    accW.style.cssText = 'min-width:0;';`,
    inner,
    `${I}    if (!acAllowed(__acR.operate)) {`,
    `${I}        var __acE = accW.querySelectorAll('button, input, select, textarea');`,
    `${I}        for (var __aci = 0; __aci < __acE.length; __aci++) { if (__acE[__aci].getAttribute && __acE[__aci].getAttribute('data-ac-view')) continue; __acE[__aci].disabled = true; }`,
    `${I}        accW.style.opacity = '0.55';`,
    `${I}    }`,
    `${I}    ${parent}.appendChild(accW);`,
    `${I}})();`,
  ].join("\n");
}

// Per-Button-Gate (innerhalb eines Buttons-Bausteins). Der Button-Code besteht
// aus "head" (Erzeugen/Stylen/Handler des Buttons, Ziel-Variable v) und der
// append-Zeile (row.appendChild(v)). Ohne aktive Button-Berechtigung wird
// head + append unverändert zusammengesetzt (Byte-Identität). Sonst:
// observe = Button gar nicht erzeugen/anhängen, operate = Button disabled+dim.
function gateButton(head, append, access, v) {
  const compiled = compileAccess(access);
  if (!compiled) return `${head}\n${append}`;
  const lit = JSON.stringify(compiled);
  return [
    `${I}    if (acAllowed(${lit}.observe)) {`,
    head,
    `${I}    if (!acAllowed(${lit}.operate)) { ${v}.disabled = true; ${v}.style.opacity = '0.55'; }`,
    append,
    `${I}    }`,
  ].join("\n");
}

export { anyAccess, blockNeedsAccess, accessHelperSrc, popupGuards, gateBlock, gateButton };
