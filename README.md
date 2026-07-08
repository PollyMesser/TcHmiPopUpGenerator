# AC_PopUp Generator

Ein kleiner React-Generator, mit dem sich verschiebbare, theme-fähige Popups für die **Beckhoff TwinCAT HMI** zusammenklicken lassen. Du konfigurierst Titel und Bausteine in einer Oberfläche, siehst eine Live-Vorschau und kopierst den fertigen, eigenständigen JavaScript-Code direkt in dein HMI-Projekt.

Kein Zeichnen von Popups in der HMI-Oberfläche mehr, keine handgeschriebenen `TcHmi.Symbol`-Aufrufe – Baustein wählen, Symbol eintragen, Code kopieren.

## Features

- **Baukastenprinzip** – Popups aus wiederverwendbaren Bausteinen zusammensetzen.
- **Live-Vorschau** mit Umschalter zwischen Dark- und Light-Theme.
- **Automatische Theme-Erkennung** im generierten Code: Das Popup liest die Hintergrund-Helligkeit der HMI aus und wählt selbstständig die passende Farbpalette.
- **Verschiebbar** per Kopfzeile (Maus und Touch).
- **Lokalisierung** – zu jedem Text optional ein Loc-Key für `GetLocalizedText`.
- **Sauberes Aufräumen** – alle `watch`-Abonnements und Symbole werden beim Schließen wieder freigegeben.
- **Einklappbare Bausteine** in der Oberfläche, damit auch größere Popups übersichtlich bleiben.

## Bausteine

| Baustein | Beschreibung |
|---|---|
| **Text** | Statischer Hinweistext. |
| **Wert lesen** | Zeigt den aktuellen Wert einer Variable an und aktualisiert sich live. |
| **Boolean-Anzeige** | Statuspunkt, grün bei `true`, grau bei `false` (nur lesend). |
| **Boolean setzen** | Checkbox, die den Wert liest und beim Umschalten schreibt. |
| **Eingabefeld** | Zahl- oder Texteingabe mit Senden-Button (Farbe wählbar), schreibt bei Klick oder Enter. |
| **Buttons** | Ein bis zwei Buttons nebeneinander mit wählbarer Aktion und Farbe. |
| **Zeile** | Zwei Elemente (Wert lesen / Boolean-Anzeige / Boolean setzen / Eingabefeld) nebeneinander. |

Für Buttons stehen die Aktionen **Impuls** (`true → false`), **Auf true setzen**, **Auf false setzen** und **Umschalten (toggle)** zur Verfügung, jeweils optional mit automatischem Schließen nach dem Klick.

## Voraussetzungen

- [Node.js](https://nodejs.org/) (LTS empfohlen)
- npm

## Installation & Start

```bash
# Vite-Projekt anlegen
npm create vite@latest ac-popup -- --template react
cd ac-popup

# Abhängigkeiten installieren
npm install
npm install lucide-react

# App-Code einsetzen: Inhalt des Generators nach src/App.jsx kopieren
# (ersetzt die vom Template gelieferte App.jsx komplett)

# Entwicklungsserver starten
npm run dev
```

Das Tool nutzt ausschließlich Inline-Styles – **kein Tailwind oder weiteres Styling-Setup** nötig. Einzige externe Abhängigkeit ist `lucide-react` für die Icons.

> **Hinweis:** Die von Vite mitgelieferte `src/index.css` zentriert den Body und begrenzt die Breite von `#root`. Falls die Oberfläche eingequetscht wirkt, die entsprechenden Regeln (`body { display:flex; place-items:center }` und `max-width` auf `#root`) entfernen oder die Datei leeren.

## Benutzung

1. Unter **Allgemein** Funktionsname, Titel, optionalen Loc-Key und die maximale Breite festlegen.
2. Bausteine hinzufügen, per Kopfzeile ein-/ausklappen, umsortieren und konfigurieren.
3. Zu jedem Baustein das TwinCAT-Symbol eintragen, z. B. `ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable`. Die `%s%…%/s%`-Klammerung wird automatisch ergänzt.
4. In der Vorschau das Ergebnis kontrollieren (Dark/Light umschaltbar).
5. Im Tab **Code** den generierten Code kopieren.

### Generierten Code einbinden

Der erzeugte Code ist eine eigenständige, per `registerFunctionEx` registrierte HMI-Funktion. In der HMI legst du dafür eine JavaScript-Funktionsdatei an und rufst die Funktion z. B. über eine Button-Aktion (`Execute JS`/`CallFunction`) auf.

Der Funktionsname aus dem Feld **Funktionsname** ist zugleich der Registrierungsname und die DOM-ID des Popups – bei mehreren Popups also eindeutige Namen vergeben.

## Wie der generierte Code funktioniert

- **Theme-Erkennung:** `readBgLuminance()` ermittelt die Hintergrundfarbe des HMI-Roots und berechnet daraus die Helligkeit. Liegt sie unter dem Schwellwert, wird die dunkle Palette verwendet, sonst die helle.
- **Symbol-Zugriff:** kleine Helfer kapseln `TcHmi.Symbol` – `subscribe` (lesen + überwachen), `writeSymbol`, `pulseSymbol` und `toggleSymbol`.
- **Aufräumen:** `hideDialog()` meldet alle Watches ab, gibt die Symbole frei und entfernt das Popup aus dem DOM.
- **Verschiebbarkeit:** `makeDraggable()` verschiebt das Popup per Kopfzeile; Klicks auf Buttons lösen kein Verschieben aus.

## Bekannte Einschränkungen

- Die Theme-Erkennung greift beim Öffnen des Popups. Ein Theme-Wechsel bei bereits geöffnetem Popup wird nicht live nachgezogen.
- Der Selektor für den HMI-Root (`.TcHmi_Controls_System_TcHmiView`) hat einen Fallback auf `document.body`; bei abweichendem Aufbau ggf. anpassen.
- Beim Button „Impuls" mit aktivem „nach Klick schließen" schließt das Popup sofort, während der `false`-Schreibvorgang per Timeout nachläuft.
- Eine Zeile fasst maximal zwei Elemente, ein Button-Baustein maximal zwei Buttons.

## Technologie

- React (Hooks, Funktionskomponenten)
- Vite als Build-Tool
- lucide-react für Icons
- Zielumgebung des erzeugten Codes: Beckhoff TwinCAT HMI Framework

## Lizenz

Noch festzulegen. Bis dahin gelten die Standard-Urheberrechte der Autorin.