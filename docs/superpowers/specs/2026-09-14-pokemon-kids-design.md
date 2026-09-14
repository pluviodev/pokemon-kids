# Pokémon Kids — Design-Spec

**Datum:** 2026-09-14
**Repo:** pluviodev/pokemon-kids

## Ziel

Ein sehr einfaches Pokémon-Sammel-Spiel für ein **kleines Kind, das noch nicht lesen kann**.
Kernprinzip: **Keine Schrift, keine Zahlen, keine Namen** — alles wird über Bilder, Farben,
Animation und Ton vermittelt. Große, bunte Symbol-Buttons für kleine Finger. Läuft auf
Tablet (Touch) **und** Desktop (Tastatur/Maus), offline, ohne Build-Schritt, deploybar auf
GitHub Pages.

## Nicht-Ziele (YAGNI)

- Kein Text-UI, keine Menüs mit Wörtern, keine Punktezahlen/Prozentanzeigen.
- Kein Login, kein Backend, keine Netzwerk-Features.
- Keine Kämpfe/Level/EP — nur Fangen & Sammeln.
- Kein Build-Tool, kein Framework.

## Plattform & Technik

- Statische Webseite, reines HTML/CSS/JS, **kein Build**.
- **Canvas** fürs Rendering (Welt, Fang-Szene, Animationen).
- Steuerung **Touch UND Tastatur/Maus**.
- Persistenz über `localStorage`.
- Deploybar auf GitHub Pages (wie das Graffiti-Tool).

### Projektstruktur

```
pokemon-kids/
  index.html
  css/style.css
  js/
    main.js         # Einstieg, Game-Loop, Screen-Umschaltung
    world.js        # Wiese-Screen: Figur laufen, Pokémon-Spawns, Begegnung
    catch.js        # Fang-Screen: Power-Leiste, Wurf, Ergebnis, Feuerwerk
    collection.js   # Haus-Screen: 10 Slots, gefangen/Schatten
    data.js         # die 10 Pokémon (Sprite-Datei + Seltenheit)
    sprites.js      # Laden & Animieren der Sprites (Hüpfen/Wackeln)
    storage.js      # localStorage: gefangene Pokémon speichern/laden
    audio.js        # kleine Soundeffekte + An/Aus
  assets/
    pokemon/01.png … 10.png   # vom Nutzer geliefert (transparente Sprites)
    (figur, haus, wiese, ball, feuerwerk — per Canvas/eigene Grafik erstellt)
```

JS als `<script type="module">` für saubere kleine Module ohne Build.

## Bildschirme (3 Screens)

Genau **drei** Zustände, je einer aktiv:

### 1. 🗺️ Wiese (Overworld)
- Passt komplett auf einen Screen (Mini-Map, kein Scrollen).
- **Oben:** kleines **Haus** (Eingang → Sammlung).
- **Unten/Mitte:** grüne **Wiese**, hier spawnen Pokémon.
- **Spielfigur** läuft frei:
  - Touch: antippen wohin → Figur läuft dorthin.
  - Tastatur: Pfeiltasten / WASD.
- **Raschelndes Gras als Wegweiser:** Pokémon stehen nicht offen herum. Stattdessen
  **wackelt/raschelt an einer zufälligen Stelle ein Grasbüschel** (mit kleinem Funkeln),
  damit das nicht-lesende Kind sofort sieht, **wo es hinlaufen** soll. Welches Pokémon
  drinsteckt, wird erst im Fang-Screen verraten (Überraschung).
- Immer nur **1–2 Raschel-Stellen gleichzeitig**, damit das Ziel klar bleibt.
  Spawn-/Raschel-Rate je nach Seltenheit (seltene rascheln seltener).
- Läuft die Figur **ins raschelnde Gras** (Kollision) → Übergang zum Fang-Screen.
- Läuft die Figur ins **Haus** → Sammlungs-Screen.
- Ecke: **Lautsprecher-Symbol** (Ton an/aus).

### 2. ⚔️ Fang-Screen (Begegnung, wie ein Pokémon-Kampf)
- Kurzer visueller **Übergang** (Aufblitzen/Wisch) beim Betreten.
- Das wilde Pokémon steht **groß mittig**, leichte Wackel-/Hüpf-Animation.
- Unten: großer **Ball-Button** (Symbol) + **Power-Leiste**.
- **Power-Leiste (text-frei):**
  - Vertikale Leiste, ein Marker fährt gleichmäßig **hoch und runter**.
  - Eine **grüne „gute" Zone** — bei häufigen Pokémon **groß**, bei seltenen **klein**.
  - Farbverlauf zeigt die Chance visuell (unten rot → oben grün). **Keine Zahl.**
- Ablauf:
  1. Ball-Button tippen → Marker fährt.
  2. Nochmal tippen → Marker **stoppt**.
  3. Trefferhöhe × Seltenheit ergibt die Fang-Chance (intern, nicht angezeigt).
  4. Ball fliegt, Pokémon hüpft rein, **Wackel-Wackel**-Animation.
  5. **Erfolg:** ✨ Sterne/Konfetti + kleines **Feuerwerk** + fröhlicher Ton → Pokémon
     „fliegt" in die Sammlung → zurück zur Wiese.
  6. **Fehlschlag:** sanftes „Puff" + leiser Ton, **man darf gleich nochmal**
     (kinderfreundlich, kein Frust). Nach **2–3 Fehlversuchen** „entwischt" es → zurück
     zur Wiese, taucht später neu auf.
- Alle Rückmeldungen rein visuell/akustisch, **nie ein Wort**.

### 3. 🏠 Haus / Sammlung
- **10 feste Slots**, einer pro Pokémon-Art.
- Gefangen → farbiges **Sprite** im Slot.
- Noch nicht gefangen → grauer **Schatten mit „?"-Form** (reines Bild, kein Name/Text).
- Ziel: alle 10 Slots füllen.
- Symbol-Button zurück zur Wiese.

## Die 10 Pokémon (`data.js`)

Jedes Pokémon ist ein Objekt:

```js
{ id: 1, sprite: "assets/pokemon/01.png", rarity: "common" }
```

- **rarity:** `common` | `uncommon` | `rare`.
- Wirkung von rarity:
  - **Spawn-Gewicht:** common taucht häufig auf, rare selten.
  - **Fang-Schwierigkeit:** rare hat eine **kleinere grüne Zone** in der Power-Leiste
    und einen niedrigeren Chance-Faktor.
- Verteilung (Vorschlag, anpassbar): 4× common, 3× uncommon, 3× rare.
- Sprites liefert der Nutzer (`01.png`…`10.png`, transparenter Hintergrund).
- Animation macht das Spiel: leichtes Hüpfen/Wackeln (Idle), stärkeres Wackeln beim Fangen.

## Fang-Mechanik (Details, intern)

- Marker-Position `p` ∈ [0..1] (0 = unten, 1 = oben).
- Basis-Chance = `p` (höher treffen = besser).
- Endgültige Chance = `p × ease[rarity]` (z.B. common 1.0, uncommon 0.75, rare 0.5).
- Grüne Zone (visuelles Ziel) skaliert mit rarity (common breit, rare schmal) —
  dient der optischen Führung; die eigentliche Chance ergibt sich aus der Höhe.
- Zufalls-Roll entscheidet Erfolg. Fehlversuche zählen pro Begegnung; nach 3 → entwischt.

## Persistenz (`storage.js`)

- Gespeichert wird nur, **welche Pokémon-IDs gefangen** wurden (Set in `localStorage`).
- Beim Start laden → Sammlung wiederherstellen.
- Kein Reset-Knopf in v1 (bewusst simpel; kann später kommen).

## Audio (`audio.js`)

- Kleine, freundliche Effekte: Ball werfen, gefangen-Jingle, entwischt-Plopp,
  Begegnungs-Blitz.
- **Lautsprecher-Symbol** zum An/Aus (Zustand in `localStorage`).
- WebAudio oder kurze eingebettete Audio-Dateien; startet erst nach erster
  Nutzer-Interaktion (Browser-Autoplay-Regel).

## Barrierefreiheit für Nicht-Leser (Leitplanken)

- **Nirgends** Text, Zahlen oder Namen im Spielgeschehen.
- Buttons ausschließlich als klare, große Symbole.
- Farbe + Bewegung + Ton als Rückmeldung, redundant (nicht nur Farbe allein).
- Großzügige Tap-Ziele, verzeihende Fang-Mechanik.

## Teststrategie

- Kleine, isolierbare Module → Unit-Tests für Logik ohne DOM:
  - Fang-Chance-Berechnung (Höhe × rarity, Grenzen 0/1).
  - Spawn-Gewichtung nach rarity.
  - Storage: speichern/laden/roundtrip von gefangenen IDs.
  - Sammlungs-Status (gefangen vs. Schatten) aus Storage.
- Manuelle Abnahme im Browser (Touch + Tastatur): laufen, Begegnung, fangen,
  Feuerwerk, Haus, Speichern über Neuladen.

## Offene Punkte / später

- Optionaler Reset-Knopf.
- Mehr als 10 Pokémon / mehrere Wiesen.
- Eigene Sprites für Figur/Haus nachreichbar (ersetzen die Canvas-Grafik).
