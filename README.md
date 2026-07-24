# AC_PopUp Generator

Ein React-Generator, mit dem sich verschiebbare, theme-fähige Popups für die **Beckhoff TwinCAT HMI** zusammenklicken lassen. Du konfigurierst Titel, Layout und Bausteine in einer Oberfläche, siehst eine Live-Vorschau und kopierst den fertigen, eigenständigen JavaScript-Code direkt in dein HMI-Projekt.

Kein Zeichnen von Popups in der HMI-Oberfläche mehr, keine handgeschriebenen `TcHmi.Symbol`-Aufrufe – Baustein wählen, Symbol/Attribut eintragen, Code kopieren.

## Features

- **Funktionsart × Darstellung** – frei kombinierbar: **Funktionsart** (registrierte Funktion, reines Event-JavaScript oder an ein UserControl gebundenes Skript) und **Darstellung** (verschiebbares Popup-Overlay oder direkt **eingebettet** in einen Zielcontainer). Alle sechs Kombinationen werden erzeugt (siehe unten).
- **Baukastenprinzip** – Popups aus wiederverwendbaren Bausteinen zusammensetzen, inklusive Statusanzeigen, Enums, Ladebalken, Tabellen, Trendkurven (Plot) und bedingt sichtbaren/aktiven Buttons.
- **Gruppen-Berechtigungen** – popup-weit, pro Baustein, pro Button und **pro Tabellenspalte**: „Sehen" (observe) blendet aus, „Bedienen" (operate) sperrt die Bedienung. Auflösung zur Laufzeit über `getCurrentUserConfig().userIsInGroups`.
- **Getrenntes Schreib-Ziel** – bei *Enum setzen*, *Eingabefeld* und *Boolean setzen* optional aus einem Symbol/Attribut **lesen** und in ein **anderes** schreiben (z. B. Command-Muster `Mode` lesen / `CmdMode` schreiben, per Trigger `CmdSetMode` in die SPS übernehmen).
- **Spalten-Layout** – 1 bis 3 Spalten, Bausteine per Drag & Drop oder Pfeil-Buttons frei verschieben.
- **Live-Vorschau** mit Umschalter zwischen Dark- und Light-Theme.
- **Automatische Theme-Erkennung** im generierten Code: Das Popup liest die Hintergrund-Helligkeit der HMI aus und wählt selbstständig die passende Farbpalette.
- **Verschiebbar** per Kopfzeile (Maus und Touch).
- **Lokalisierung** – zu jedem Text optional ein Loc-Key für `GetLocalizedText` (auch für die Plot-Buttons „Jetzt"/„Zurücksetzen", Achsentitel, Signal- und Markerbeschriftungen).
- **Sauberes Aufräumen** – alle `watch`-Abonnements/Symbole (Symbol-Modi) bzw. das Polling-Intervall (UserControl-Modus) werden beim Schließen wieder freigegeben; eigenständige Module (Plot) räumen zusätzlich über eigene Teardown-Callbacks auf.
- **Einklappbare Bausteine (Accordion)** in der Oberfläche mit Drag-Griff, damit auch größere Popups übersichtlich bleiben.
- **Import/Export** – jeder erzeugte Code enthält seine komplette Konfiguration als Kommentar und lässt sich im Tab „Import" verlustfrei zurück in den Editor laden.
- **Backslash-freier Code** – der erzeugte JavaScript-Code kommt ohne Backslash-Escapes und ohne Regex mit maskiertem Slash aus, damit er die JavaScript-Action-Einbettung der TcHMI unbeschädigt übersteht.

## Ausgabe-Modi

Im Tab **Allgemein** wählst du zwei Achsen getrennt: die **Funktionsart** (bestimmt Wrapper und Datenzugriff) und die **Darstellung** (Popup oder eingebettet).

### Funktionsart (Datenzugriff)

| Funktionsart | Wann verwenden | Datenzugriff |
|---|---|---|
| **Registrierte Funktion** | Klassischer Weg über `registerFunctionEx`, aufrufbar per `CallFunction`. | `TcHmi.Symbol` (ADS-Pfad) |
| **Event-JavaScript** | Reiner Funktionsrumpf ohne Registrierung, direkt als JavaScript-Action in ein Control-Event. Vermeidet den `par1`-Bug der Call-Function-Route. | `TcHmi.Symbol` (ADS-Pfad) |
| **UserControl-JS** | An ein UserControl gebunden; der Host wird über die ID der auslösenden Trigger-Fläche ermittelt (**Auslöser-Suffix**, z. B. `.btn_valve-h`). Werte über `getX()`/`setX()`-Attribute des Hosts, mit 1-Sekunden-Polling statt `watch`. | UC-Attribut/Parameter (`getX`/`setX`) |

### Darstellung

| Darstellung | Verhalten |
|---|---|
| **Popup (Overlay)** | Verschiebbares Overlay-Fenster mit Kopfzeile und Schließen-Button. |
| **Eingebettet** | Rendert direkt in einen Zielcontainer statt als Overlay; kein Drag, keine Kopfzeile. Die Größe orientiert sich am Elternelement (füllt einen Container mit fester Größe). |

Die Kombination beider Achsen bestimmt, **wie der Ziel-Container im Embed-Modus ermittelt wird**:

| Kombination | Einbindung / Ziel-Container |
|---|---|
| registriert + Embed | `registerFunctionEx`; Aufruf `AC_HMI.Fn('Container')` an `onAttached`, Abbau `AC_HMI.FnDestroy('Container')` an `onDetached`. |
| event + Embed | Reine IIFE, die direkt mit der im Generator gesetzten **Container-ID** aufgerufen wird. |
| usercontrol + Embed | Als JS-Action im `onAttached` des Ziel-Elements. Container **und** Host werden – wie im UC-Popup – aus dem auslösenden Element abgeleitet: `event.target.closest('[id$=SUFFIX]')` ist der Container, die ID davor der Host (`TcHmi.Controls.get`). Dadurch **mehrfachinstanzen-sicher** (jede UC-Instanz hat ihre eigene, dynamische ID). |

Im UserControl-Modus wird bei jedem Symbol-/Attribut-Feld automatisch der reine Attributname verwendet (z. B. aus `ADS…::TagName` wird `TagName`); bei UC-Parametern trägst du direkt den Parameternamen mit großem Anfangsbuchstaben ein (TcHMI erzeugt `getTagName()`/`setTagName()`).

> **Hinweis zum Plot-Baustein:** Der Verlauf-Plot ist bewusst **modus-unabhängig** und abonniert seine Signale immer direkt per `TcHmi.Symbol` (ADS) – unabhängig davon, wie die übrigen Bausteine ihre Daten lesen. Im **UserControl-Modus** können seine *Einstellwerte* (Achsentitel/Min/Max, Signal-Symbolpfade/Namen, Referenzlinien, Marker) zusätzlich beim Aufbau aus UC-Parametern gelesen werden – siehe „Verlauf (Plot) im Detail".

## Titel

Der Titel kann **statisch** (Text + optionaler Loc-Key) oder **dynamisch** aus einem Attribut (UserControl-Modus) bzw. Symbol (Symbol-Modi) gesetzt werden, mit Fallback-Text für den Fall, dass der Wert (noch) leer ist.

## Bausteine

| Baustein | Beschreibung |
|---|---|
| **Text** | Statischer Hinweistext. |
| **Wert lesen** | Zeigt den aktuellen Wert einer Variable an und aktualisiert sich live. Label links, Wert **rechtsbündig**; optional eine **Einheit**, die an den Wert angehängt wird (`%` direkt, sonst mit Leerzeichen). |
| **Boolean-Anzeige** | Statuspunkt, grün bei `true`, grau bei `false` (nur lesend). |
| **Boolean setzen** | Checkbox, die den Wert liest und beim Umschalten schreibt. Optional **getrenntes Schreib-Attribut** (lesen ≠ schreiben). |
| **Eingabefeld** | Eingabe als **Zahl, Text oder Zeit** (`HH:MM:SS` ↔ ISO-8601-Dauer) mit Senden-Button (Farbe wählbar), schreibt bei Klick oder Enter. Feldinhalt **rechtsbündig**, optionale **Einheit** neben dem Feld. Optional **getrenntes Schreib-Attribut** und Trigger-Variable (z. B. SPS-Flanke). |
| **Ladebalken** | Horizontaler Fortschrittsbalken für Prozent-/Analogwerte (z. B. Proportionalventil). Min/Max/Einheit/Nachkommastellen und Farbe konfigurierbar, Wert optional rechts eingeblendet. Füllung = (Wert − Min) / (Max − Min), auf 0–100 % begrenzt. |
| **Verlauf (Plot)** | Plotly-basierte Trendkurve, **volle Breite**. Live oder History+Live, mehrere Y-Achsen, Referenzlinien, Setpoint-Marker u. v. m. – siehe „Verlauf (Plot) im Detail". |
| **Tabelle** | Such-, blätter- und sortierbare Tabelle aus **festen Zeilen** oder einem **PLC-Array** (Array of Struct). Spaltentypen: Wert lesen, Text, LED (Bool), Checkbox, Eingabe (Zahl/Text/**Zeit**), Button (Symbol schreiben oder Funktion aufrufen), Badge (Enum), Symbol (SVG). Färbe-Regeln, Zeilenfilter, Standardsortierung; **Berechtigung pro Spalte** möglich. |
| **Buttons** | Ein bis zwei Buttons nebeneinander, siehe „Buttons im Detail". |
| **Zeile** | **Volle Breite** (bricht das Spalten-Layout), 1 bis 4 Elemente (Wert lesen / Boolean-Anzeige / Boolean setzen / Eingabefeld – Eingabe wahlweise Zahl/Text/Zeit / Button) nebeneinander. |
| **Enum-Anzeige** | Bildet einen Wert (Zahl/String, z. B. eine SPS-Enum) über eine Wert→Text-Tabelle auf einen Klartext ab, darstellbar als **Text** (farbig) oder **Tag/Badge**, mit Fallback für unbekannte Werte. |
| **Enum setzen** | Dropdown mit derselben Wert→Text-Logik, schreibt den zugehörigen Wert (numerisch oder String) zurück; zeigt beim Öffnen den aktuellen Wert. Optional **getrenntes Schreib-Attribut** und Senden-Button + Trigger. |
| **Status (Bools)** | Für sich gegenseitig ausschließende Zustände, die *nicht* als SPS-Enum vorliegen (z. B. „Offen/Zu/Fährt/Störung" als einzelne Bools). Der erste `true` in der Liste gewinnt; Darstellung als **Text** oder **Tag/Badge**, mit Fallback, falls keiner true ist. |
| **Trennlinie** | **Volle Breite**. Horizontale Linie zum optischen Gliedern; ohne Beschriftung eine schlichte Linie, mit Text eine mittig beschriftete Trennlinie (Linie – Text – Linie). |

### Buttons im Detail

- **Aktionen:** Impuls (`true → false`), Auf true setzen, Auf false setzen, Umschalten (toggle) – optional mit automatischem Schließen des Popups nach dem Klick.
- **Farbe:** je Button frei wählbar (Blau/Grün/Gelb/Rot/Grau).
- **Sichtbarkeit („Nur sichtbar wenn"):** optionales Bool-Symbol/-Attribut; ist die Bedingung falsch, wird der Button ausgeblendet (`display:none`), nicht nur deaktiviert.
- **Aktiv-Bedingungen („Aktiv wenn"):** beliebig viele UND-verknüpfte Bedingungen mit Operator (`=`, `≠`, `<`, `≤`, `>`, `≥`) und Wert (bool, Zahl oder Enum-Wert) – z. B. „Modus ≠ 1 UND Geschlossen = true". Bei Nichterfüllung wird der Button deaktiviert (`disabled`, reduzierte Opazität, `not-allowed`-Cursor), nicht ausgeblendet.
- **Klick-Feedback:** jeder Button drückt sich beim Antippen leicht zusammen und dunkelt kurz ab, unabhängig vom Modus.

### Verlauf (Plot) im Detail

Der Plot-Baustein erzeugt ein in sich geschlossenes Plotly-Modul und ist immer volle Breite.

- **Datenquelle:** *Nur Live* (mitlaufendes Zeitfenster) oder *History + Live* (Verlauf laden und live fortschreiben). Konfigurierbar sind Live-Fenster (s), zu ladende History-Dauer (s) und die maximale Punktzahl je Signal.
- **Y-Achsen:** bis zu 4, automatisch abwechselnd links/rechts angeordnet, je Achse Titel/Loc-Key, Einheit, Farbe sowie Autoskala oder feste Min/Max-Grenzen.
- **Signale:** beliebig viele Kurven, je Signal Symbol, Name/Loc-Key, Farbe und zugeordnete Y-Achse. Ab zwei Signalen erscheint eine anklickbare Legende (Kurven ein-/ausblenden).
- **Referenzlinien:** feste Werte oder symbolgebundene (live nachgeführte) waagerechte Linien, je mit Beschriftung, Achse, Linienstil und Farbe.
- **Setpoint-Marker:** senkrechte Ereignislinien auf Basis einer Variablen. Zwei Arten:
  - **Enum (Wert → Text):** Bei bestimmten Werten wird eine Linie mit zugeordnetem Klartext gezogen (Wert→Text-Tabelle, optional „nur gemappte Werte").
  - **Metrisch (bei Änderung):** Bei *jeder* Wertänderung wird eine Linie gezogen – z. B. bei einer Zyklusnummer, um den Beginn eines neuen Zyklus zu sehen. Der Wert kann optional an der Linie ausgegeben werden (mit optionalem Präfix, z. B. „Zyklus 42", und Nachkommastellen).
  - Je Marker: Linienstil, Farbe, Modus „Alle behalten" oder „Nur letzte" sowie „Startwert markieren".
- **Zeitraum-Buttons:** frei konfigurierbare Schnellwahl über dem Plot (Anzahl beliebig, je Button Anzahl + Einheit von Sekunden bis Jahre oder „Alle" für den kompletten Verlauf, plus Beschriftung). Ohne Buttons wird die Leiste ausgeblendet.
- **Zoom:** per Schalter an-/abschaltbar. Bei aktivem Zoom (Maus/Rad) erscheint zusätzlich ein **„Zurücksetzen"-Button**, der die Ausgangsansicht wiederherstellt (feste Achsen auf ihren Bereich, Auto-Achsen auf Autorange; im History-Modus zurück auf den geladenen Zeitraum, im Live-Modus zurück aufs Mitlaufen). Ist der Zoom aus, sind die Achsen gegen versehentliches Verziehen gesperrt.
- **Toolbar:** optionale Überschrift plus **„Jetzt"-Button** (zum aktuellen Zeitpunkt springen). Die Beschriftungen von „Jetzt" und „Zurücksetzen" sind mit eigenem Text und optionalem Loc-Key lokalisierbar.
- **Range-Slider:** optionale Übersichtsleiste unter dem Plot.
- **Plotly-Einbindung:** Das Modul lädt `Assets/plotly-3.6.0.min.js` einmalig nach (gemeinsamer Loader, kein Doppelladen bei mehreren Plots). Passt der Pfad in deinem Projekt nicht, ist das die einzige Stelle zum Anpassen.
- **UC-Parameter-Bindung (nur UserControl-Modus):** Einzelne Einstellwerte können statt statisch aus **UC-Parametern** (`getX`) kommen – je Feld optional: Achsentitel/Min/Max, Signal-Symbolpfad und -Name, Referenzlinien-Wert bzw. -Symbolpfad und -Label, Setpoint-Marker-Symbolpfad und Mapping-Werte. Die gebundenen Werte werden **einmal beim Aufbau** (beim Attach) gelesen und dann fixiert – kein Live-Nachführen. Symbolpfade aus Parametern werden automatisch geklammert und wie üblich per ADS abonniert.
- **Aufräumen:** Beim Schließen des Popups gibt das Plot-Modul seine Abonnements/Symbole frei, trennt den ResizeObserver und ruft `Plotly.purge` auf.

> **History-Vorbehalt:** Der History-Modus setzt auf `TcHmiSqliteHistorize.Query` (über `TcHmi.Server.requestEx`). Diese Query-API ist noch **nicht gegen die eingesetzte Historize-Extension bestätigt** – der History-Modus ist entsprechend ungetestet. Der **Live-Modus** ist davon unabhängig und der sichere Pfad. Der Editor blendet im History-Modus einen entsprechenden Hinweis ein.

## Spalten & Layout

1 bis 3 Spalten global wählbar. Alle Bausteine außer „Zeile", „Verlauf (Plot)" und „Trennlinie" liegen in ihrer Spalte und lassen sich per Drag-Griff oder Pfeil-Buttons (hoch/runter/links/rechts) verschieben. **„Zeile"-, „Plot"- und „Trennlinie"-Bausteine sind immer volle Breite** und unterbrechen dafür das Spalten-Raster an ihrer Position – der generierte Code baut dafür pro zusammenhängendem Abschnitt ein eigenes CSS-Grid, die volle-Breite-Bausteine hängen direkt im Popup-Body.

## Popup-Breite

Im Feld **BREITE (px)** legst du die Fensterbreite fest. Das Popup bekommt diese feste Breite, wird aber nie breiter als der sichtbare Bereich (`max-width: calc(100vw - 32px)`), damit es auf keiner Auflösung über den Rand läuft. Untergrenze ist 320 px, Standard 400 px, nach oben gibt es keine harte Grenze außer dem Viewport. Für 2–3 Spalten empfiehlt sich mehr Breite (Faustregel ab ca. 560 px, für breite Layouts 700–900 px).

## Gruppen-Berechtigungen

Zu jedem Popup, Baustein, Button und **jeder Tabellenspalte** lässt sich optional eine Gruppen-Berechtigung setzen. Es gibt zwei Rechte, die getrennt aktiviert werden:

- **Sehen (observe):** Bei „Verweigert" wird das Element gar nicht erst aufgebaut/angehängt – popup-weit verhindert es sogar das Öffnen, bei einer Tabellenspalte entfällt die ganze Spalte (Kopf + Zellen, ohne Subscription).
- **Bedienen (operate):** Das Element bleibt sichtbar, aber die Bedienelemente (Buttons, Eingaben, Checkboxen, Dropdowns) werden deaktiviert und abgedimmt; bei einer Spalte nur deren Bedienzellen.

Die Auflösung erfolgt zur Laufzeit über `TcHmi.Server.getCurrentUserConfig().userIsInGroups` (Whitelist, „Allow gewinnt"). Feiner gesetzte Berechtigungen (Baustein/Button/Spalte) überschreiben die popup-weite. Ohne aktivierte Berechtigung wird **kein** zusätzlicher Code erzeugt – bestehende Popups bleiben unverändert.

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

Das Tool nutzt ausschließlich Inline-Styles – **kein Tailwind oder weiteres Styling-Setup** nötig. Einzige externe Abhängigkeit der Generator-Oberfläche ist `lucide-react` für die Icons. Für die **erzeugten** Plot-Popups muss im HMI-Projekt zusätzlich `plotly-3.6.0.min.js` unter `Assets/` liegen (Pfad im Plot-Code anpassbar).

> **Hinweis:** Die von Vite mitgelieferte `src/index.css` zentriert den Body und begrenzt die Breite von `#root`. Falls die Oberfläche eingequetscht wirkt, die entsprechenden Regeln (`body { display:flex; place-items:center }` und `max-width` auf `#root`) entfernen oder die Datei leeren.

## Benutzung

1. Unter **Allgemein** die **Funktionsart** und die **Darstellung** wählen, dazu Funktionsname/UID, ggf. Auslöser-/Container-Suffix (UserControl) bzw. Container-ID (event + Embed), Titel(-Quelle), Breite und Spaltenzahl festlegen.
2. Bausteine hinzufügen (bei mehreren Spalten: Zielspalte wählen), per Kopfzeile ein-/ausklappen, per Griff ⠿ oder Pfeil-Buttons umsortieren und konfigurieren.
3. Zu jedem Baustein das TwinCAT-Symbol bzw. UC-Attribut eintragen, z. B. `ADS.AF_PLC.MAIN.IFC_Sequencer.HMI::xEnable` (Symbol-Modi) oder `TagName` (UserControl-Modus). Die `%s%…%/s%`-Klammerung für Symbole wird automatisch ergänzt.
4. In der Vorschau das Ergebnis kontrollieren (Dark/Light umschaltbar).
5. Im Tab **Code** den generierten Code kopieren.

### Generierten Code einbinden

**Registrierte Funktion:** eigenständige, per `registerFunctionEx` registrierte HMI-Funktion. In der HMI legst du dafür eine JavaScript-Funktionsdatei an und rufst die Funktion z. B. über eine Button-Aktion auf.

**Event-JavaScript:** der Rumpf ohne Registrierungs-Wrapper, direkt als `JavaScript`-Action in ein Control-Event einfügen.

**UserControl-JS:** ebenfalls als JavaScript-Action in ein Event (typischerweise auf der auslösenden Trigger-Fläche, z. B. einem Button), dessen ID mit dem konfigurierten **Auslöser-Suffix** endet. Das Skript ermittelt daraus den Host per `TcHmi.Controls.get(hostId)` und spricht dessen `getX()`/`setX()`-Attribute an.

**Eingebettet (statt Popup):** rendert direkt in einen Zielcontainer.
- *registriert + Embed:* an `onAttached` `AC_HMI.Fn('Container')` aufrufen, an `onDetached` `AC_HMI.FnDestroy('Container')`. „Container" = Name eines Container-Controls oder id eines rohen divs mit echter Größe.
- *event + Embed:* die erzeugte IIFE wird bereits mit der im Generator gesetzten **Container-ID** aufgerufen – als JS-Action ins Event einfügen.
- *usercontrol + Embed:* als JS-Action ins `onAttached` des Ziel-Elements (id endet auf den Suffix). Container und Host werden daraus abgeleitet – funktioniert dadurch auch bei mehreren UC-Instanzen.

Der Funktionsname/UID ist zugleich Bestandteil der DOM-ID des Popups – bei mehreren Popups eindeutige Namen vergeben (im UserControl-Modus wird zusätzlich automatisch die Host-ID angehängt, um Mehrfachinstanzen zu unterscheiden).

## Import & Export

Jeder generierte Code endet mit einer Kommentarzeile `AC_POPUP_CONFIG_V1: {...}`, die die komplette Konfiguration (Modus, Titel, Breite, Spalten, alle Bausteine) als JSON enthält. Im Tab **Import** lässt sich beliebiger, vom Generator erzeugter Code einfügen; „In Editor laden" liest die eingebettete Konfiguration zurück und baut den Editor-Zustand exakt nach – zum Weiterbearbeiten und erneuten Erzeugen. Beim Import werden frische IDs vergeben; beim Plot bleiben dabei die Achsen-Zuordnungen von Signalen und Referenzlinien erhalten.

Wichtig: Geladen wird die eingebettete Konfiguration, nicht der umgebende JavaScript-Text. Manuelle Änderungen direkt am generierten Code (statt im Generator) werden beim Re-Import nicht berücksichtigt; die Kommentarzeile sollte daher nicht gelöscht werden, wenn ein späterer Re-Import vorgesehen ist.

## Wie der generierte Code funktioniert

- **Theme-Erkennung:** `readBgLuminance()` ermittelt die Hintergrundfarbe des HMI-Roots und berechnet daraus die Helligkeit. Liegt sie unter dem Schwellwert, wird die dunkle Palette verwendet, sonst die helle.
- **Symbol-Zugriff (Symbol-Modi):** kleine Helfer kapseln `TcHmi.Symbol` – `subscribe` (lesen + überwachen), `writeSymbol`, `pulseSymbol` und `toggleSymbol`.
- **Attribut-Zugriff (UserControl-Modus):** `gv(name, default)`/`sv(name, value)` kapseln `host.getX()`/`host.setX()`, `pulse(name, ms)` für Impuls-Schreibvorgänge; `refresh()` durchläuft alle registrierten Updater, angestoßen durch ein 1-Sekunden-Intervall.
- **Plot-Modul:** eigenständige IIFE mit eigener Symbol-Anbindung, Plotly-Loader, Achsen-/Trace-/Shape-Aufbau, Live-Follow und Marker-Logik. Es registriert seinen Aufräum-Callback in der `teardowns`-Liste des Popup-Gerüsts.
- **Aufräumen:** `hideDialog()` meldet alle Watches ab und gibt die Symbole frei (Symbol-Modi) bzw. stoppt das Polling-Intervall (UserControl-Modus), ruft alle `teardowns` auf (u. a. Plot-Aufräumen) und entfernt das Popup aus dem DOM.
- **Verschiebbarkeit:** `makeDraggable()` verschiebt das Popup per Kopfzeile; Klicks auf Buttons/Eingaben/Plot lösen kein Verschieben aus.
- **Bedingte Buttons:** Sichtbarkeits- und Aktiv-Bedingungen laufen unabhängig voneinander über dieselben `subscribe`/`updaters`-Mechanismen wie die übrigen Bausteine.

## Bekannte Einschränkungen

- Die Theme-Erkennung greift beim Öffnen des Popups. Ein Theme-Wechsel bei bereits geöffnetem Popup wird nicht live nachgezogen.
- Der Selektor für den HMI-Root (`.TcHmi_Controls_System_TcHmiView`) hat einen Fallback auf `document.body`; bei abweichendem Aufbau ggf. anpassen.
- Beim Button „Impuls" mit aktivem „nach Klick schließen" schließt das Popup sofort, während der `false`-Schreibvorgang per Timeout nachläuft.
- Eine Zeile fasst maximal vier Elemente (Wert lesen / Boolean-Anzeige / Boolean setzen / Eingabefeld / Button; keine Enum-/Status-/Tabellen-/Plot-Bausteine), ein Button-Baustein maximal zwei Buttons.
- Enum-, Status- und Plot-Bausteine lassen sich nicht als Element innerhalb einer „Zeile" verwenden – nur als eigenständiger Baustein.
- Der UserControl-Modus aktualisiert Anzeigen per Polling (1 s), nicht per sofortigem `watch`; bei sehr kurzlebigen Zustandswechseln kann das sichtbar verzögern. Der Plot-Baustein ist davon ausgenommen – er nutzt in allen Modi direkte `watch`-Abonnements.
- **History-Modus des Plots** setzt auf die noch unbestätigte `TcHmiSqliteHistorize.Query`-API und ist ungetestet; Live ist der sichere Pfad.
- Der Plot benötigt `plotly-3.6.0.min.js` unter `Assets/` (Pfad im Code anpassbar); ohne die Datei zeigt der Plotbereich einen Ladefehler.
- Import liest ausschließlich die eingebettete Konfigurationszeile, keinen beliebigen/handgeschriebenen JavaScript-Code.

## Technologie

- React (Hooks, Funktionskomponenten)
- Vite als Build-Tool
- lucide-react für Icons
- Plotly (im erzeugten Plot-Popup, aus `Assets/plotly-3.6.0.min.js`)
- Zielumgebung des erzeugten Codes: Beckhoff TwinCAT HMI Framework (getestet gegen Framework-Version 14.3.500)

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz - siehe [LICENSE](LICENCE)