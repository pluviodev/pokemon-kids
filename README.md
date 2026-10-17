# Pokémon Kids

Pokémon-Sammelspiel für ein kleines Kind, das noch **nicht lesen kann**. Alles läuft über Bilder,
Farben, Bewegung und Ton — über die Wiese laufen, dem raschelnden Gras folgen, mit einem Wurf
fangen, die Sammlung im Haus anschauen, einen Karl als Begleiter mitnehmen und mit ihm spielen.
Touch **und** Tastatur. Speichert im Browser.

**Live:** https://pluviodev.github.io/pokemon-kids/

## Was man tut

### Wiese
Die Figur läuft dorthin, wo man hintippt. Grasbüschel wackeln und sprühen gelbe Punkte — da steckt
ein Karl. Reinlaufen startet die Begegnung. Seltener liegt eine **Waldbeere** herum: einsammeln
füllt das Glas unten links.

### Fangen
Ein Marker wandert über die Leiste, Tippen auf den Ball stoppt ihn. Im **grünen Band** = gefangen,
daneben = der Karl flieht (kommt später wieder). Seltenere Karls haben ein schmaleres Band und
einen schnelleren Marker — alles bewusst kindgerecht langsam eingestellt. **Ein Wurf pro Begegnung.**

Von jeder Art braucht man **5 Stück** (`MAX_PER_SPECIES`). Ist eine Art voll, wird ihr Sprite
golden und sie taucht nicht mehr auf.

### Haus
Begehbar; die Tür unten führt raus. Auf 10 Podesten steht die Sammlung des aktuellen Levels mit
Name und Zähler, leere Plätze zeigen einen Schatten. Einen **gefangenen Karl antippen** macht ihn
zum Begleiter (Pfötchen-Marker), nochmal antippen schickt ihn heim — immer nur einer.

### Boss und Level
Sind alle 10 Arten golden, erscheint unten ein großes Grasbüschel: der **Boss**. Beide Balken
bewegen sich. Treffer = Sieg, daneben = jede Art verliert einen Zähler.

- **Level 1** — Karls 1–10, Boss **Lukas**. Sieg → direkt weiter zu Level 2.
- **Level 2** — zehn neue Karls (21–30), dunklere Wiese und Haus, etwas schmalere Bänder,
  Boss **Lena**. Sieg → Pokal-Screen.

Beim Levelaufstieg werden Zähler und Begleiterwahl geleert, Beeren und Spiele bleiben.

### Spielen
Je **15 Beeren** schaltet ein Spiel frei (`BERRIES_PER_TOY`); danach erscheint rechts ein
Spiel-Knopf. Gespielt wird mit dem aktuellen Begleiter:

1. **Ball werfen** — hinwerfen, der Begleiter holt ihn und bringt ihn zurück
2. **Fußball** — aufs Tor schießen, der Begleiter steht im Tor und hält
3. **Fangen** — der Begleiter rennt weg, man muss ihn erwischen

### Pikarlchu
Ein Sonder-Karl außerhalb der Level-Pools (ID 13), der auf **beiden** Wiesen auftaucht: entweder
lugt er hinter Haus, Baum, Zaun oder Stein hervor, oder er flitzt einmal quer durchs Bild. Direkt
antippen zählt — die fünf Blitz-Zeichen neben dem Beerenglas füllen sich.

Beim fünften Mal kommt sein **Fang-Event**: schnell auf ihn hämmern, bis die Energie-Leiste voll
ist — dann schlägt ein **Donnerblitz** ein und er ist gefangen. Hier kann man nichts verlieren,
es dauert nur länger oder kürzer.

Danach steht er auf dem **Ehrenplatz** an der Rückwand im Haus. Antippen macht ihn zum Begleiter
(er verdrängt den Karl). Läuft er mit, lässt ihn **5× schnelles Antippen** blitzen, dass der
ganze Bildschirm zuckt. Pikarlchu bleibt über den Levelaufstieg hinweg erhalten — nur
„Neues Spiel" setzt ihn zurück.

## Steuerung

- **Touch/Maus:** Stelle antippen, die Figur läuft dorthin. Im Fang-Screen den **Ball** antippen.
  Oben links Ton an/aus, oben rechts Neues Spiel (mit Ja/Nein-Bestätigung).
- **Tastatur:** Pfeiltasten oder WASD zum Laufen, **Leertaste/Enter** zum Werfen bzw. Hämmern.

## Lokal starten

```
python -m http.server 8080
# dann http://localhost:8080/
```

Kein Build-Schritt: statische Seite, ES-Module, Canvas **900×900** (quadratisch, damit das ganze
Hintergrundbild groß auf Tablet und PC passt).

## Aufbau

```
index.html          Canvas + Einstieg
js/
  main.js           Game-Loop, Screen-Umschaltung, Ecken-Buttons
  world.js          Wiese: Laufen, Spawns, Beeren, Begleiter, Pikarlchu-Auftritte
  catchscreen.js    Fang-Screen mit Zielband
  pikascreen.js     Pikarlchus Hämmer-Event
  housescreen.js    Haus: Sammlung, Begleiterwahl, Ehrenplatz
  playscreen.js     Ball / Fußball / Fangen
  win.js            Pokal-Screen
  levels.js         Level-Daten (Karls, Boss, Asset-Keys, Schwierigkeit)
  storage.js        localStorage (Zähler, Level, Begleiter, Beeren, Spiele, Pikarlchu)
  sprites.js        Asset-Laden, Platzhalter, Gold-Variante, Spieler-Frames
  audio.js          kurze Töne per WebAudio
  catch.js spawn.js movement.js powerbar.js follow.js toys.js pika.js collection.js
                    reine Logik, DOM-frei und getestet
tools/process_assets.py   Rohbilder aus Sprites/ -> assets/
docs/superpowers/         Design-Specs und TDD-Umsetzungspläne je Feature
```

Die Logik-Module sind bewusst **DOM-frei** (Abhängigkeiten werden injiziert), damit `node --test`
sie laden kann. Rendering und Animation werden manuell im Browser abgenommen.

## Sprites

Fertige Assets liegen in `assets/`, die Rohbilder in `Sprites/`. Aufbereitet wird mit:

```
python tools/process_assets.py
```

- `assets/pokemon/01–10.png` Level 1, `21–30.png` Level 2
- `11.png` Boss Lukas, `12.png` Boss Lena, `13.png` Pikarlchu
- `assets/player/<reihe>_<frame>.png` Lauf-Frames (Reihe 0 = hoch, 1 = links, 3 = runter; rechts = links gespiegelt)
- Hintergründe: `world/house/catchbg/grass` (+ `…2` für Level 2), dazu `ball`, `berry`,
  `playfield`, `goal`, `soccerball`, `arrow`, `pokal`

Fehlt ein Pokémon-PNG, zeichnet das Spiel automatisch einen bunten Platzhalter. Kleine Sprites
(z.B. aus alten Spielen) werden mit **Nearest-Neighbor** hochgerechnet, nicht mit LANCZOS —
sonst verwaschen die Pixel.

## Tests

```
npm test     # node --test, reine Logik ohne DOM
```

Rendering/Animation per Checkliste im jeweiligen Plan unter `docs/superpowers/plans/`.

## Leitplanken

Wer hier weiterbaut, sollte das beachten:

- **Keine Schrift und keine Zahlen** im Spielgeschehen — Rückmeldung über Symbol, Farbe, Bewegung
  und Ton. Einzige bewusste Ausnahmen: die Namen der Karls und der „X/5"-Zähler.
- **Man kann nichts endgültig verlieren.** Verpasste Pokémon kommen wieder, es gibt keine
  Sackgasse und kein Zeitlimit.
- **Kindgerecht heißt langsamer und größer, als es sich für Erwachsene richtig anfühlt.** Die
  Fang-Balken wurden mehrfach entschärft, das grüne Band verdoppelt, der Haus-Ausgang vergrößert.
- Große Tap-Ziele, Touch **und** Tastatur, kein Build-Schritt, offline lauffähig.
