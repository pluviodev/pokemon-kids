# Pokémon Kids — Beeren, Spielfeld & Ball (Paket 1, Design)

**Datum:** 2026-09-16
**Ausgangslage:** Spiel hat 2 Level (fangen → Haus-Sammlung → Boss → Aufstieg), Begleiter der auf der Wiese mitläuft. Kern ist bild-/ton-basiert, kein Lesen.

## Ziel

Ein neuer Belohnungs-/Spiel-Kreislauf: **Beeren** auf der Wiese sammeln → **Glas** füllt sich → bei je 20 wird ein **Spielzeug/Spiel** freigeschaltet (Feuerwerk-Popup mit Item-Bild). Ein **Spiel-Knopf** führt auf ein eigenes **Spielfeld** mit einer **Modus-Leiste unten**. **Paket 1** liefert das ganze Gerüst plus das erste Spiel: **Ball-Apportieren**. (Spiel 2 „Fußball/Torwart" und Spiel 3 „Fangen" folgen als eigene Pakete.)

## Design-Entscheidungen (mit jh geklärt)

1. **Beeren** erscheinen zwischen den Grasbüscheln, aber **viel seltener**; **Drüberlaufen** sammelt (kein Fang-Screen).
2. **Glas** zeigt Fortschritt 0→20; bei 20 → **Feuerwerk-Popup mit dem Item-Bild**, Glas auf 0.
3. Nach dem **ersten** Freischalten erscheint auf der Wiese rechts ein **normaler Spiel-Knopf** (kein X).
4. **Spielfeld-Screen:** Feld (`spielfeld.png`) im oberen, spielbaren Bereich; **untere, abgetrennte Leiste** mit den Modus-Buttons + **rotem X** (zurück zur Wiese). **Buttons liegen nie im spielbaren Feld** (kein versehentliches Drücken).
5. **Spiel 1 (Ball):** Figur steht mittig; **Tippen ins Feld = Ball dorthin werfen** (Bogen) → **Begleiter holt & bringt zurück** → wieder werfbar. **Kein Begleiter** → beim Betreten wird ein **zufälliger gefangener Karl** zugewiesen (wird echter Begleiter, Pfötchen im Haus).
6. **Speicher:** Beeren-Fortschritt + freigeschaltete Spiele **bleiben** (auch über Levelaufstieg). Nur „Neues Spiel" setzt sie zurück.
7. **Ball-Sprite** = `Sprites/ball.png` (rot-gelb) → eigenes Asset `playball.png` (der Fang-Pokéball `assets/ball.png` bleibt unangetastet). **Beere** zeichne ich als Canvas-Platzhalter.

## Architektur

Neue reine Logik in `js/toys.js` + Beeren-Zustand in `storage.js`; Beeren als Spawn-Typ in `world.js`; neuer `js/playscreen.js`; Verdrahtung (Spiel-Knopf, Popup, Routing) in `main.js`.

### `js/toys.js` (neu, DOM-frei, getestet)
Reihenfolge der freischaltbaren Spiele + Freischalt-Logik.
```
export const BERRIES_PER_TOY = 20;
export const TOYS = [
  { id: "ball", icon: "playball" },   // Paket 2/3 hängen hier "fussball"/"fangen" an
];
// Reine Progression: eine Beere dazu -> neuer Zustand + evtl. neu freigeschaltetes Toy.
export function collectBerry(berries, unlocked) {
  if (unlocked >= TOYS.length) return { berries, unlocked, unlockedToy: null }; // alles frei
  const b = berries + 1;
  if (b >= BERRIES_PER_TOY) return { berries: 0, unlocked: unlocked + 1, unlockedToy: TOYS[unlocked] };
  return { berries: b, unlocked, unlockedToy: null };
}
export function unlockedToys(unlocked) { return TOYS.slice(0, unlocked); }
```

### `js/storage.js` — Beeren + freigeschaltete Spiele
- Neue Schlüssel `pk_berries` (0..19), `pk_toys` (Anzahl freigeschaltet, 0..TOYS.length).
- `getBerries()` → int, `getToysUnlocked()` → int, `isPlayUnlocked()` → `getToysUnlocked() >= 1`.
- `collectBerry()`: liest Zustand, ruft `toys.collectBerry`, speichert `pk_berries`/`pk_toys`, gibt `unlockedToy` (Objekt|null) zurück (für das Popup).
- `setCompanion(id)` wird **öffentlich** (bisher intern) — für die Zufalls-Zuweisung im Ball-Modus.
- `reset()` leert zusätzlich `pk_berries` und `pk_toys`.
- `advanceLevel()` **lässt Beeren/Spiele unberührt** (Meta-Belohnung bleibt über Level).

### `js/world.js` — Beeren-Spawns + Glas
- Neuer Spawn-Typ „Beere": in `trySpawn` mit **kleiner Wahrscheinlichkeit** (viel seltener als Gras) einen Beeren-Spawn `{x, y, berry: true, phase}` hinzufügen (eigener Cap, z.B. max 1 gleichzeitig).
- In `update`: beim Treffer (`hitsGrass`-Nähe) eines Beeren-Spawns → `storage.collectBerry()`, Beere entfernen, Sound `caught`/eigener „pling"; Rückgabe `unlockedToy` per Callback `onBerry(unlockedToy)` an `main` (für Popup). **Kein** `onEncounter`.
- In `draw`: Beeren als kleines gezeichnetes Beeren-Sprite (Canvas: roter Kreis-Cluster + grünes Blatt) mit leichtem Wackeln. Zusätzlich **Glas** unten-links: Umriss + Füllstand `getBerries()/20`.

### `js/playscreen.js` (neu) — Spielfeld + Modus-Leiste + Ball
- `makePlayScreen({ ctx, storage, audio, onExit })`.
- **Layout:** `playfield.png` über den ganzen Screen; unten eine **opake Leiste** (Höhe ~0.14·S, y 0.86·S..S). Spielbarer Bereich = y < 0.86·S. Leiste enthält links die **Toy-Buttons** (je freigeschaltetem Spiel, Icon = `getImg(toy.icon)`), rechts das **rote X**.
- `enter()`: aktiver Modus = erstes freigeschaltetes Spiel („ball"). Ist `storage.getCompanion()` null → zufälligen gefangenen Karl des aktiven Levels wählen (`loadCounts`+`pokemonForLevel`) und `storage.setCompanion(id)`.
- **Tap-Routing (`onPointer`):** in der Leiste → Toy-Button (Modus wechseln) oder rotes X (`onExit()`); über der Leiste (Feld) → Aktion des aktiven Spiels.
- **Ball-Apportieren (Zustandsmaschine):** Figur fest (~0.5·S, 0.72·S).
  - `idle`: Ball liegt bei der Figur; Tap ins Feld → Ziel setzen, `thrown`.
  - `thrown`: Ball fliegt im Bogen Figur→Ziel (~0.5 s) → `fetch`.
  - `fetch`: Begleiter läuft per `followStep` zum Ball; nah genug → `carry` (Ball haftet am Begleiter).
  - `carry`: Begleiter läuft zurück zur Figur; Ball folgt; nah genug → `idle` (Ball wieder bei der Figur).
  - Kein Begleiter (kein gefangener Karl vorhanden) → Ball bleibt liegen; nächster Tap setzt ihn zur Figur zurück (Randfall).
- **Zeichnen:** Feld, Begleiter (`getSprite(companionId)`), Figur (`playerFrame("down",0)`), Ball (`getImg("playball")`), dann die untere Leiste (opak) mit Buttons + X.

### `js/main.js` — Spiel-Knopf, Popup, Routing
- **Spiel-Knopf** (rechte Kante, nur im `world`-Screen, nur wenn `storage.isPlayUnlocked()`): eigener Button (Icon = `playball` oder gezeichnetes Play-Symbol). Tap → `play.enter(); screen = "play"`.
- **`makePlayScreen`** konstruieren mit `onExit: () => { world.reset(); screen = "world"; }`.
- **Berren-Callback:** `world`-Konstruktion um `onBerry: (unlockedToy) => { if (unlockedToy) popup.show(unlockedToy.icon); }` erweitern.
- **Popup** (klein, in `main`): Zustand `{ active, icon, t }`; bei `show(icon)` Feuerwerk-Partikel + großes Item-Bild ~2,5 s (oder Tap) → aus. Im Loop über allem zeichnen; blockiert andere Taps solange aktiv.
- **Loop/Tap:** `screen === "play"` → `play.update/draw`, Taps an `play.onPointer`.

### `js/sprites.js` — neue Assets vorladen
- `MANIFEST` um `["playfield","assets/playfield.png"]` und `["playball","assets/playball.png"]` erweitern.

### `tools/process_assets.py` — Assets erzeugen
- `spielfeld.png` → `assets/playfield.png` (auf 900 skaliert).
- `Sprites/ball.png` → `assets/playball.png` (weißer Hintergrund per `cutout_flood`/`cutout_white` freigestellt, auf ~200 skaliert). **Nicht** `assets/ball.png` überschreiben.

## Datenfluss
1. Wiese: Beere getroffen → `storage.collectBerry()` → speichert; bei 20 → `unlockedToy` → `onBerry` → `main` zeigt Popup; nach 1. Unlock erscheint der Spiel-Knopf.
2. Spiel-Knopf → `play.enter()` (ggf. Zufalls-Begleiter) → `screen="play"`.
3. Spielfeld: Feld oben spielbar, Leiste unten Buttons+X; Ball-Modus apportiert; rotes X → `onExit` → Wiese.
4. „Neues Spiel" → Beeren/Spiele/Level/Zähler alle zurück.

## Tests (node --test, DOM-frei)
- **toys.js:** `collectBerry` zählt hoch; bei 20 → reset + `unlockedToy = TOYS[0]`; wenn alles frei → unverändert/null.
- **storage.js:** Beeren/Spiele persistieren; `collectBerry` schaltet bei 20 frei; `isPlayUnlocked`; `reset` leert Beeren+Spiele; `advanceLevel` **behält** sie.
- Bestehende Tests bleiben grün.

## Nicht in Paket 1 (später)
- Spiel 2 (Fußball/Torwart, `tor.png`+`Fußball.png`) und Spiel 3 (Fangen, `fangen.png`-Icon) — je eigenes Paket, je 20 Beeren.
- Kein Begleiter-Wechsel im Spielfeld (nur Zufalls-Zuweisung falls keiner da).

## Nicht im Scope (YAGNI)
- Keine echte Beeren-Grafik nötig (gezeichneter Platzhalter; jh kann später liefern).
- Kein Punktestand/Verlieren in den Spielen.
