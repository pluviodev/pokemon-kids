# Pokémon Kids — Pikarlchu (Design)

**Datum:** 2026-10-17
**Ausgangslage:** Spiel hat 2 Level (fangen → Haus-Sammlung → Boss → Aufstieg), Begleiter-System
(`follow.js`, Auswahl im Haus), Beeren + freischaltbare Spiele (`toys.js`, `playscreen.js`).
Gefangen wird über das grüne Zielband. Kern bleibt bild-/ton-basiert, kein Lesen
(Namen + „X/5"-Zähler sind bewusste Ausnahmen).

## Ziel

Das Kind vermisst Pikachu und den Donnerblitz. **Pikarlchu** kommt als einmaliger Sonder-Karl
dazu: er taucht auf der Wiese auf und wird **nicht** über das Zielband gefangen, sondern durch
**schnelles Draufhämmern**, bis er genug Energie für einen Donnerblitz hat. Danach läuft er als
Begleiter mit und blitzt auf Kommando — ein Spielzeug, kein Fortschrittsbalken.

## Design-Entscheidungen (mit jh geklärt)

1. **Zwei Auftrittsarten auf der Wiese:** entweder **Lugen** (ploppt halb hinter Haus, Zaun,
   Busch oder Stein hervor) oder **Flitzen** (rennt einmal quer durch, links→rechts oder
   rechts→links, zufällige Höhe). Zufällig gewählt.
   **Nachtrag 2026-10-17 (nach dem ersten Test):** Verstecke liegen nur noch **am Haus und unten
   bei den Rand-Büschen**. Oben und rechts verdecken die Ecken-Buttons (Ton, Neues Spiel, Spiel)
   und unten links das Beeren-/Blitz-HUD die Figur — vier der ursprünglich neun Verstecke waren
   unsichtbar. `BLOCKED_AREAS` in `pika.js` hält diese Flächen fest, ein Test in
   `tests/pika.test.js` prüft jedes Versteck dagegen.
2. **Direkt antippen** zählt (großzügiger Radius), egal wo die Figur steht. **5 Treffer** → Fang-Event.
3. **Fang-Event = Hämmern:** Energie-Leiste füllt sich pro Tap, sinkt langsam, wenn man aufhört.
   Voll → mächtiger Donnerblitz → gefangen.
4. **Nirgends verlieren.** Verpasster Auftritt = kommt wieder. Im Fang-Event kein Timeout, kein
   Scheitern — nur schneller oder langsamer.
5. **Level-übergreifend:** Pikarlchu gehört zu keinem Level-Pool. Er erscheint auf **beiden**
   Wiesen und bleibt über den Levelaufstieg erhalten. Nur „Neues Spiel" setzt ihn zurück.
6. **Unabhängig von den Bossen:** zählt nicht zum 10er-Set, blockiert Lukas/Lena nicht und wird
   von `penaltyAll()` nicht angefasst.
7. **Ehrenplatz im Haus** statt 11. Podest (die 10 Podeste wechseln pro Level): mittig an der
   Rückwand unter dem Gemälde, in beiden Häusern dieselbe Stelle.
8. **Begleiter nach den bestehenden Regeln:** nur einer gleichzeitig — Pikarlchu **verdrängt**
   den Karl-Begleiter und umgekehrt. Nochmal antippen = heimschicken.
9. **Donnerblitz als Begleiter:** 5 schnelle Taps auf ihn → Blitz-Show mit Screen-Zucken, danach
   kurze Abklingzeit. Reine Show, keine Spielwirkung.
10. **Sprite:** geliefertes 80×80-PNG, per Nearest-Neighbor auf 320 px hochgerechnet (bleibt
    knackig pixelig), ID **13** (11 = Lukas, 12 = Lena, 21–30 = Level 2).

## Architektur

Additiv. Ein neues getestetes Logik-Modul, ein neuer Screen, Eingriffe in vier bestehende Module.

### `js/pika.js` (neu) — reine Logik, DOM-frei

- `PIKA_ID = 13`, `PIKA_NAME = "Pikarlchu"`, `PIKA_HITS_NEEDED = 5`.
- `pickAppearance(rng)` → `{ kind: "peek", spot }` oder `{ kind: "dash", fromLeft, y }`.
  `spot` kommt aus einer festen Liste von Versteck-Punkten (Haus, Bäume, Zaun, Tonne, Steine),
  `y` aus dem begehbaren Höhenbereich.
- `dashX(t, dur, fromLeft, w)` → x-Position des Flitzers zum Zeitpunkt t (linear, startet/endet
  außerhalb des Bildes).
- `hitsAppearance(tap, pos, radius)` → bool: großzügige Kreis-Trefferprüfung.
- `chargeStep(level, dt, taps, gainPerTap, decayPerSec)` → neuer Ladestand 0..1 (geclampt,
  kein Unterlauf, kein Überlauf).
- `isBurst(tapTimes, now, need, window)` → bool: ob in den letzten `window` Sekunden `need`
  Taps liegen (für den Begleiter-Blitz).

### `js/storage.js` — eigener Zustand

- Neue Schlüssel `pk_pika_hits` (0..5) und `pk_pika_caught` ("1"/"0").
- `getPikaHits()`, `addPikaHit()` → neuer Stand (deckelt bei 5), `isPikaCaught()`, `setPikaCaught(on)`.
- `getCompanion()` liefert zusätzlich `PIKA_ID`, wenn Pikarlchu gefangen und gewählt ist
  (die Level-Pool-Prüfung gilt für ihn nicht).
- `advanceLevel()` lässt die Pika-Schlüssel **unangetastet**, leert aber wie bisher den Begleiter.
- `reset()` leert sie mit.

### `js/world.js` — Auftritte + Tap + Begleiter-Blitz

- Eigener Zustand `pikaAppearance` (null oder `{kind, spot|y, fromLeft, t}`) und `pikaTimer`.
  Nur aktiv, wenn `!storage.isPikaCaught()` und kein Boss-Grasbüschel läuft.
- `update(dt)`: Timer herunterzählen → `pickAppearance`; Auftritt nach Ablauf der Standzeit bzw.
  nach Verlassen des Bildes wieder entfernen.
- `onPointer(x, y)`: **zuerst** prüfen, ob der Tap Pikarlchu trifft (Auftritt oder Begleiter) —
  nur wenn nicht, wird wie bisher das Laufziel gesetzt.
  - Auftritt getroffen → `storage.addPikaHit()`, Funken-Effekt, Auftritt weg; beim 5. Treffer
    `onPikaCatch()` → Fang-Event.
  - Begleiter getroffen → Tap-Zeit merken; `isBurst(...)` → Blitz-Show starten (Vollbild-Zucken,
    Donner), danach Abklingzeit.
- `draw()`: Auftritt zeichnen (beim Lugen unten angeschnitten, damit er „hinter" dem Objekt
  steckt), Blitz-Zeichen-HUD neben dem Beeren-Glas, Blitz-Show als Overlay.

### `js/pikascreen.js` (neu) — Fang-Event

- Eigener Screen wie `catchscreen`/`playscreen`: Hintergrund = `catchbg` des aktiven Levels,
  Pikarlchu groß in der Mitte, Energie-Leiste darunter.
- Jeder Tap/Leertaste: `chargeStep` mit Tap-Gewinn, dazwischen Abfall; Sprite wird heller,
  Funken dichter, Ton höher.
- Leiste voll → Donnerblitz (Vollbild weiß-gelb, Donner, Funken), dann `onDone()` →
  `setPikaCaught(true)`, zurück auf die Wiese.
- Kein Timeout, kein Fehlschlag.

### `js/housescreen.js` — Ehrenplatz

- Feste Position `PIKA_SPOT` (mittig Rückwand unter dem Gemälde), außerhalb der Laufzone →
  keine Änderung an `blocked()` oder `BOUNDS`.
- Nicht gefangen → Schatten wie bei leeren Podesten. Gefangen → Sprite + Name, auf gezeichnetem
  Sockel; Pfötchen-Marker, wenn er Begleiter ist.
- Tap auf den Ehrenplatz → `storage.toggleCompanion(PIKA_ID)` (verdrängt den Karl automatisch,
  da nur ein Schlüssel).

### `js/main.js` — Verdrahtung

- Neuer Screen-Zustand `pika`; `world.onPikaCatch` → `pikaScreen.start()`, `onDone` → zurück zu `world`.
- Tap-Routing und Tastatur (Leertaste/Enter) für den neuen Screen wie bei `catch`.

### `js/sprites.js` / `tools/process_assets.py` / `js/levels.js`

- `13.png` vorladen; `getSprite(13)` muss ohne Level-Pool funktionieren (Name/Sprite kommen aus
  `pika.js`, nicht aus `levels.js`).
- `process_assets.py`: `Sprites/Pikarlchu.png` → trimmen → **Nearest-Neighbor** auf 320 →
  `assets/pokemon/13.png` (nicht LANCZOS wie die anderen, sonst matscht der kleine Sprite).

## Datenfluss

1. Wiese: Timer → `pickAppearance` → Auftritt sichtbar.
2. Tap trifft → `addPikaHit()` → HUD füllt sich. 5. Treffer → Fang-Event.
3. Hämmern → `chargeStep` bis 1.0 → Donnerblitz → `setPikaCaught(true)` → zurück zur Wiese,
   keine Auftritte mehr.
4. Haus: Tap auf Ehrenplatz → `toggleCompanion(13)`.
5. Wiese: Begleiter läuft mit (`followStep`/`trailTarget` wie bisher); 5 schnelle Taps auf ihn
   → `isBurst` → Blitz-Show.
6. Levelaufstieg: Pika-Zustand bleibt, Begleiterwahl wird wie bisher geleert.

## Tests (node --test, DOM-frei)

- **pika:** `pickAppearance` liefert nur gültige Spots/Höhen und beide Arten über viele Ziehungen;
  `dashX` startet und endet außerhalb des Bildes und läuft monoton; `hitsAppearance` trifft
  innerhalb und daneben nicht; `chargeStep` bleibt in [0,1], steigt mit Taps, fällt ohne;
  `isBurst` erkennt 5 Taps im Fenster und ignoriert zu alte.
- **storage:** Hits zählen bis 5 und deckeln; `isPikaCaught` persistiert; `advanceLevel()` lässt
  Pika-Zustand stehen und leert den Begleiter; `reset()` leert alles; `getCompanion()` gibt
  `13` zurück, wenn gefangen und gewählt, sonst `null`.
- Bestehende 58 Tests bleiben grün.

## Nicht im Scope (YAGNI)

- Keine Kämpfe, keine Attacken gegen andere Karls, keine Spielwirkung des Blitzes.
- Kein zweiter Begleiter, keine Pikarlchu-Variante pro Level, keine Entwicklung.
- Kein Pikarlchu im Fang-Screen der Karls, in `playscreen` oder im Sieger-Screen.
- Kein neues Hintergrund-Asset; Sockel, Funken, HUD und Blitz werden gezeichnet.
