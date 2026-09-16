# Pokémon Kids — Fußball + Fangen (Paket 2, Design)

**Datum:** 2026-09-16
**Ausgangslage:** Paket 1 ist gebaut: Beeren → Glas → Freischalt-Popup → Spielfeld-Screen (`playscreen.js`) mit unterer Modus-Leiste; Spiel 1 „Ball-Apportieren" läuft. Der Begleiter ist der Spielkamerad auf dem Feld. `TOYS` (in `toys.js`) hat aktuell 1 Eintrag (`ball`).

## Ziel

Die zwei weiteren Spiele als je einen Modus im Spielfeld: **Spiel 2 „Fußball" (Torwart)** und **Spiel 3 „Fangen"**. Jedes weitere Spiel wird durch die nächsten 20 Beeren freigeschaltet (Feuerwerk-Popup mit Icon). Kein Verlieren, kein Punktestand.

## Design-Entscheidungen (mit jh geklärt)

1. **Begleiter = Spielkamerad in allen Modi** (holt Ball / hütet Tor / flieht beim Fangen). Kein Begleiter beim Betreten → zufälliger gefangener Karl wird zugewiesen (bestehende Logik in `playscreen.enter()`).
2. **Spiel 2 (Fußball):** großes **Tor oben**, **Figur + Ball unten Mitte**; Tap = Schuss Richtung Tap nach oben; **Torwart (Begleiter) fährt links↔rechts** vorm Tor; Ball an der Torlinie: Torwart nah → **gehalten** (Ball prallt zur Figur zurück), sonst → **Tor** (Konfetti). Danach Ball zurück, nächster Schuss.
3. **Spiel 3 (Fangen):** Figur **läuft per Antippen**; **Begleiter flieht** (weg von der Figur, meidet Ränder), **langsamer als die Figur** → einholbar; **Berührung → Jubel** (Partikel + Sound), Begleiter poppt woanders auf und flieht weiter.
4. **Freischalt-Reihenfolge:** `TOYS = [ball, fussball, fangen]` → 2. Unlock = Fußball, 3. = Fangen.

## Architektur

Additive Erweiterung: `toys.js` (Liste), `follow.js` (2 reine Helfer), `playscreen.js` (2 Modus-Zweige + bewegliche Figur im Fangen-Modus), `process_assets.py`/`sprites.js` (3 neue Assets).

### `js/toys.js`
`TOYS` erweitern:
```
export const TOYS = [
  { id: "ball", icon: "playball" },
  { id: "fussball", icon: "soccerball" },
  { id: "fangen", icon: "arrow" },
];
```
Die Freischalt-Logik (`collectBerry`) bleibt unverändert und schaltet nun bis 3 Spiele frei.

### `js/follow.js` (2 neue reine Funktionen, getestet)
- `fleeStep(pos, threat, speed, dt, bounds)` → `{x,y}`: bewegt `pos` **weg** von `threat` (Richtung `pos−threat`, normiert), Schrittweite `speed*dt`, Ergebnis auf `bounds` (`{minX,minY,maxX,maxY}`) geklemmt. Nahe an einem Rand wird zusätzlich ein leichter Drall zur Feldmitte addiert (meidet Ecken). Steht `pos==threat`, weicht es deterministisch nach rechts aus.
- `keeperSaves(ballX, keeperX, reach)` → bool: `Math.abs(ballX − keeperX) <= reach` (Torwart hält, wenn er nah genug am Ball ist).

### `js/playscreen.js`
- `enter()` setzt `mode` auf das **zuletzt gewählte / erste** freigeschaltete Spiel (unverändert), setzt Figur-Position zurück und modus-spezifischen Zustand.
- **Figur beweglich nur im Fangen-Modus:** `player` wird eine veränderliche Variable (Start = feste Mitte). Bei `ball`/`fussball` bleibt sie fest; bei `fangen` bewegt sie sich per Tap-Ziel (`stepPlayer`).
- **Modus-Zweige** in `update`/`draw`/`onPointer`:
  - `ball` (bestehend, unverändert).
  - `fussball`: Zustände `aim`→`shot`→(`goal`|`save`)→`aim`. Tap im Feld setzt Schuss-Ziel; Ball fliegt von der Figur zur Torlinie Richtung Ziel-x; Torwart oszilliert `keeperX` links↔rechts vorm Tor; erreicht der Ball die Torlinie → `keeperSaves` entscheidet Tor/Halten. Tor → Konfetti-Burst; Halten → Ball prallt zurück. Danach Ball zurück zur Figur.
  - `fangen`: Tap setzt Lauf-Ziel der Figur (`stepPlayer`, Feldgrenzen = Spielbereich über der Leiste); Begleiter flieht via `fleeStep` (Speed < Figur-Speed); Abstand ≤ Fang-Radius → Jubel-Burst + Sound, Begleiter neu positionieren (zufällig, weit weg) und weiter fliehen.
- **Tap-Routing bleibt:** Leiste (y ≥ `BAR_Y`) → Buttons/rotes X; über der Leiste → Aktion des aktiven Modus. Buttons nie im Feld.
- Gemeinsamer Konfetti-Helfer (`burst`/`updateParticles`) für Tor- und Fang-Jubel.

### `tools/process_assets.py` + `js/sprites.js`
- `tor.png` → `assets/goal.png` (weiß freistellen; wird im Spiel groß gezeichnet — keine feste Vergrößerung nötig, Zeichengröße steuert das).
- `Fußball.png` → `assets/soccerball.png` (weiß freistellen).
- `fangen.png` → `assets/arrow.png` (freistellen/trimmen; Button-Icon).
- `sprites.js`-`MANIFEST` um `goal`, `soccerball`, `arrow` erweitern.

## Datenfluss
1. Beeren → 2. Unlock „Fußball", 3. Unlock „Fangen" (Popup mit Icon, bestehende Logik).
2. Spielfeld: untere Leiste zeigt jetzt bis zu 3 Buttons + rotes X; Button wählt Modus.
3. Fußball: Tippen schießt, Torwart hält/lässt durch. Fangen: Tippen bewegt Figur, Begleiter flieht, Berührung fängt.

## Tests (node --test, DOM-frei)
- **follow.js:** `fleeStep` bewegt weg vom Verfolger und bleibt in `bounds` (auch am Rand); `keeperSaves` true bei Nähe, false sonst.
- **toys.js:** bestehende Tests bleiben grün; `TOYS.length === 3` (neue Assertion).
- Bestehende Tests grün.

## Nicht im Scope (YAGNI)
- Kein Punktestand, keine Level/Schwierigkeit in den Spielen.
- Keine eigene Torwart-/Flucht-KI über das Beschriebene hinaus (einfache, kindgerechte Heuristik).
- Kein Wechsel des Begleiters im Spielfeld.
