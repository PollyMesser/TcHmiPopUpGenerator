# AC_PopUp Generator

Ein React-Generator, mit dem sich verschiebbare, theme-fähige Popups für die **Beckhoff TwinCAT HMI** zusammenklicken lassen. Du konfigurierst Titel, Layout und Bausteine in einer Oberfläche, siehst eine Live-Vorschau und kopierst den fertigen, eigenständigen JavaScript-Code direkt in dein HMI-Projekt.

Kein Zeichnen von Popups in der HMI-Oberfläche mehr, keine handgeschriebenen `TcHmi.Symbol`-Aufrufe – Baustein wählen, Symbol/Attribut eintragen, Code kopieren.

## Features

- **Drei Ausgabe-Modi** – derselbe Baukasten erzeugt wahlweise eine registrierte Funktion, reines Event-JavaScript oder ein an ein UserControl gebundenes Skript (siehe unten).
- **Baukastenprinzip** – Popups aus wiederverwendbaren Bausteinen zusammensetzen, inklusive Statusanzeigen, Enums und bedingt sichtbaren/aktiven Buttons.
- **Spalten-Layout** – 1 bis 3 Spalten, Bausteine per Drag & Drop oder Pfeil-Buttons frei verschieben.
- **Live-Vorschau** mit Umschalter zwischen Dark- und Light-Theme.
- **Automatische Theme-Erkennung** im generierten Code: Das Popup liest die Hintergrund-Helligkeit der HMI aus und wählt selbstständig die passende Farbpalette.
- **Verschiebbar** per Kopfzeile (Maus und Touch).
- **Lokalisierung** – zu jedem Text optional ein Loc-Key für `GetLocalizedText`.
- **Sauberes Aufräumen** – alle `watch`-Abonnements/Symbole (Symbol-Modi) bzw. das Polling-Intervall (UserControl-Modus) werden beim Schließen wieder freigegeben.
- **Einklappbare Bausteine (Accordion)** in der Oberfläche mit Drag-Griff, damit auch größere Popups übersichtlich bleiben.
- **Import/Export** – jeder erzeugte Code enthält seine komplette Konfiguration als Kommentar und lässt sich im Tab „Import" verlustfrei zurück in den Editor laden.

## Ausgabe-Modi

| Modus | Wann verwenden | Datenzugriff |
|---|---|---|
| **Registrierte Funktion** | Klassischer Weg über `registerFunctionEx`, aufrufbar per `CallFunction`. | `TcHmi.Symbol` (ADS-Pfad) |
| **Event-JavaScript** | Reiner Funktionsrumpf ohne Registrierung, direkt als JavaScript-Action in ein Control-Event. Vermeidet den `par1`-Bug der Call-Function-Route. | `TcHmi.Symbol` (ADS-Pfad) |
| **UserControl-JS** | An ein UserControl gebunden; der Host wird über die ID der auslösenden Trigger-Fläche ermittelt (**Auslöser-Suffix**, z. B. `.btn_valve-h`). Werte werden über `getX()`/`setX()`-Attribute des Hosts gelesen/geschrieben, mit 1-Sekunden-Polling statt `watch`. | UC-Attribut/Parameter (`getX`/`setX`) |

Im UserControl-Modus wird bei jedem Symbol-/Attribut-Feld automatisch der reine Attributname verwendet (z. B. aus `ADS…::TagName` wird `TagName`); bei UC-Parametern trägst du direkt den Parameternamen mit großem Anfangsbuchstaben ein (TcHMI erzeugt `getTagName()`/`setTagName()`).

## Titel

Der Titel kann **statisch** (Text + optionaler Loc-Key) oder **dynamisch** aus einem Attribut (UserControl-Modus) bzw. Symbol (Symbol-Modi) gesetzt werden, mit Fallback-Text für den Fall, dass der Wert (noch) leer ist.

## Bausteine

| Baustein | Beschreibung |
|---|---|
| **Text** | Statischer Hinweistext. |
| **Wert lesen** | Zeigt den aktuellen Wert einer Variable an und aktualisiert sich live. |
| **Boolean-Anzeige** | Statuspunkt, grün bei `true`, grau bei `false` (nur lesend). |
| **Boolean setzen** | Checkbox, die den Wert liest und beim Umschalten schreibt. |
| **Eingabefeld** | Zahl- oder Texteingabe mit Senden-Button (Farbe wählbar), schreibt bei Klick oder Enter. |
| **Buttons** | Ein bis zwei Buttons nebeneinander, siehe „Buttons im Detail" unten. |
| **Zeile** | **Volle Breite** (bricht das Spalten-Layout), 1 bis 4 Elemente (Wert lesen / Boolean-Anzeige / Boolean setzen / Eingabefeld) nebeneinander. |
| **Enum-Anzeige** | Bildet einen Wert (Zahl/String, z. B. eine SPS-Enum) über eine Wert→Text-Tabelle auf einen Klartext ab, darstellbar als **Text** (farbig) oder **Tag/Badge**, mit Fallback für unbekannte Werte. |
| **Enum setzen** | Dropdown mit derselben Wert→Text-Logik, schreibt den zugehörigen Wert (numerisch oder String) zurück. |
| **Status (Bools)** | Für sich gegenseitig ausschließende Zustände, die *nicht* als SPS-Enum vorliegen (z. B. „Offen/Zu/Fährt/Störung" als einzelne Bools). Der erste `true` in der Liste gewinnt; Darstellung als **Text** oder **Tag/Badge**, mit Fallback, falls keiner true ist. |

### Buttons im Detail

- **Aktionen:** Impuls (`true → false`), Auf true setzen, Auf false setzen, Umschalten (toggle) – optional mit automatischem Schließen des Popups nach dem Klick.
- **Farbe:** je Button frei wählbar (Blau/Grün/Gelb/Rot/Grau).
- **Sichtbarkeit („Nur sichtbar wenn"):** optionales Bool-Symbol/-Attribut; ist die Bedingung falsch, wird der Button ausgeblendet (`display:none`), nicht nur deaktiviert.
- **Aktiv-Bedingungen („Aktiv wenn"):** beliebig viele UND-verknüpfte Bedingungen mit Operator (`=`, `≠`, `<`, `≤`, `>`, `≥`) und Wert (bool, Zahl oder Enum-Wert) – z. B. „Modus ≠ 1 UND Geschlossen = true". Bei Nichterfüllung wird der Button deaktiviert (`disabled`, reduzierte Opazität, `not-allowed`-Cursor), nicht ausgeblendet.
- **Klick-Feedback:** jeder Button drückt sich beim Antippen leicht zusammen und dunkelt kurz ab, unabhängig vom Modus.

## Spalten & Layout

1 bis 3 Spalten global wählbar. Alle Bausteine außer „Zeile" liegen in ihrer Spalte und lassen sich per Drag-Griff oder Pfeil-Buttons (hoch/runter/links/rechts) verschieben. **„Zeile"-Bausteine sind immer volle Breite** und unterbrechen dafür das Spalten-Raster an ihrer Position – der generierte Code baut dafür pro zusammenhängendem Abschnitt ein eigenes CSS-Grid, die Zeile selbst hängt direkt im Popup-Body.

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

1. Unter **Allgemein** den Ausgabe-Modus wählen, Funktionsname/UID, ggf. Auslöser-Suffix (UserControl-Modus), Titel(-Quelle) und Spaltenzahl festlegen.
2. Bausteine hinzufügen (bei mehreren Spalten: Zielspalte wählen), per Kopfzeile ein-/ausklappen, per Griff ⠿ oder Pfeil-Buttons umsortieren und konfigurieren.
3. Zu jedem Baustein das TwinCAT-Symbol bzw. UC-Attribut eintragen, z. B. `ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable` (Symbol-Modi) oder `TagName` (UserControl-Modus). Die `%s%…%/s%`-Klammerung für Symbole wird automatisch ergänzt.
4. In der Vorschau das Ergebnis kontrollieren (Dark/Light umschaltbar).
5. Im Tab **Code** den generierten Code kopieren.

### Generierten Code einbinden

**Registrierte Funktion:** eigenständige, per `registerFunctionEx` registrierte HMI-Funktion. In der HMI legst du dafür eine JavaScript-Funktionsdatei an und rufst die Funktion z. B. über eine Button-Aktion auf.

**Event-JavaScript:** der Rumpf ohne Registrierungs-Wrapper, direkt als `JavaScript`-Action in ein Control-Event einfügen.

**UserControl-JS:** ebenfalls als JavaScript-Action in ein Event (typischerweise auf der auslösenden Trigger-Fläche, z. B. einem Button), dessen ID mit dem konfigurierten **Auslöser-Suffix** endet. Das Skript ermittelt daraus den Host per `TcHmi.Controls.get(hostId)` und spricht dessen `getX()`/`setX()`-Attribute an.

Der Funktionsname/UID ist zugleich Bestandteil der DOM-ID des Popups – bei mehreren Popups eindeutige Namen vergeben (im UserControl-Modus wird zusätzlich automatisch die Host-ID angehängt, um Mehrfachinstanzen zu unterscheiden).

## Import & Export

Jeder generierte Code endet mit einer Kommentarzeile `AC_POPUP_CONFIG_V1: {...}`, die die komplette Konfiguration (Modus, Titel, Spalten, alle Bausteine) als JSON enthält. Im Tab **Import** lässt sich beliebiger, vom Generator erzeugter Code einfügen; „In Editor laden" liest die eingebettete Konfiguration zurück und baut den Editor-Zustand exakt nach – zum Weiterbearbeiten und erneuten Erzeugen.

Wichtig: Geladen wird die eingebettete Konfiguration, nicht der umgebende JavaScript-Text. Manuelle Änderungen direkt am generierten Code (statt im Generator) werden beim Re-Import nicht berücksichtigt; die Kommentarzeile sollte daher nicht gelöscht werden, wenn ein späterer Re-Import vorgesehen ist.

## Wie der generierte Code funktioniert

- **Theme-Erkennung:** `readBgLuminance()` ermittelt die Hintergrundfarbe des HMI-Roots und berechnet daraus die Helligkeit. Liegt sie unter dem Schwellwert, wird die dunkle Palette verwendet, sonst die helle.
- **Symbol-Zugriff (Symbol-Modi):** kleine Helfer kapseln `TcHmi.Symbol` – `subscribe` (lesen + überwachen), `writeSymbol`, `pulseSymbol` und `toggleSymbol`.
- **Attribut-Zugriff (UserControl-Modus):** `gv(name, default)`/`sv(name, value)` kapseln `host.getX()`/`host.setX()`, `pulse(name, ms)` für Impuls-Schreibvorgänge; `refresh()` durchläuft alle registrierten Updater, angestoßen durch ein 1-Sekunden-Intervall.
- **Aufräumen:** `hideDialog()` meldet alle Watches ab und gibt die Symbole frei (Symbol-Modi) bzw. stoppt das Polling-Intervall (UserControl-Modus) und entfernt das Popup aus dem DOM.
- **Verschiebbarkeit:** `makeDraggable()` verschiebt das Popup per Kopfzeile; Klicks auf Buttons/Eingaben lösen kein Verschieben aus.
- **Bedingte Buttons:** Sichtbarkeits- und Aktiv-Bedingungen laufen unabhängig voneinander über dieselben `subscribe`/`updaters`-Mechanismen wie die übrigen Bausteine.

## Bekannte Einschränkungen

- Die Theme-Erkennung greift beim Öffnen des Popups. Ein Theme-Wechsel bei bereits geöffnetem Popup wird nicht live nachgezogen.
- Der Selektor für den HMI-Root (`.TcHmi_Controls_System_TcHmiView`) hat einen Fallback auf `document.body`; bei abweichendem Aufbau ggf. anpassen.
- Beim Button „Impuls" mit aktivem „nach Klick schließen" schließt das Popup sofort, während der `false`-Schreibvorgang per Timeout nachläuft.
- Eine Zeile fasst maximal vier Elemente (nur read/bool/check/input, keine Enum-/Status-Bausteine), ein Button-Baustein maximal zwei Buttons.
- Enum- und Status-Bausteine lassen sich aktuell nicht als Element innerhalb einer „Zeile" verwenden – nur als eigenständiger Baustein.
- Der UserControl-Modus aktualisiert Anzeigen per Polling (1 s), nicht per sofortigem `watch`; bei sehr kurzlebigen Zustandswechseln kann das sichtbar verzögern.
- Import liest ausschließlich die eingebettete Konfigurationszeile, keinen beliebigen/handgeschriebenen JavaScript-Code.

## Technologie

- React (Hooks, Funktionskomponenten)
- Vite als Build-Tool
- lucide-react für Icons
- Zielumgebung des erzeugten Codes: Beckhoff TwinCAT HMI Framework (getestet gegen Framework-Version 14.3.500)

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz - siehe [LICENSE](LICENCE)
