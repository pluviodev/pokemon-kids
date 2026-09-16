# Pokémon Kids — Begleiter-Karl (Design)

**Datum:** 2026-09-16
**Ausgangslage:** Spiel hat 2 Level (fangen → Haus-Sammlung → Boss → Aufstieg). Gefangene Karls stehen nur als Statuen im Haus. Kern ist bild-/ton-basiert, kein Lesen (Namen + „X/5"-Zähler sind bewusste Ausnahmen).

## Ziel

Ein neues, „fundamentales" Standbein: die Sammlung wird lebendig. Das Kind tippt im Haus einen gefangenen Karl an → dieser **läuft draußen auf der Wiese als Begleiter mit**. Macht das Fangen/Sammeln bedeutsam über das Regal hinaus, bleibt kinderleicht (kein Verlieren, keine Aufgaben).

## Design-Entscheidungen (mit jh geklärt)

1. **Auswahl im Haus:** gefangenen Karl (count > 0) antippen = Begleiter. Nochmal denselben = heimschicken (keiner). Anderen = wechseln. Leere Podeste tun nichts.
2. **Nur draußen:** der Begleiter läuft nur auf der Wiese (`world`) mit. Im Haus bleiben alle Karls als Sammlung auf den Podesten. Im Fang-Screen kein Begleiter (Fokus aufs Fangen).
3. **Marker:** auf dem Podest des aktuellen Begleiters ein kleines Pfötchen-Zeichen (für Nicht-Leser sichtbar, wer dabei ist).
4. **Nur einer** gleichzeitig.
5. **Persistenz:** Wahl bleibt über Sitzungen (localStorage). **Beim Levelaufstieg und „Neues Spiel" geleert** — im neuen Level frisch aus dem neuen 10er-Set wählen.
6. **Reines Mitlaufen:** folgt dem Weg mit kleinem Abstand + sanftem Hüpf-Wackeln. Keine Kämpfe/Aufgaben (Reaktionen ggf. später).

## Architektur

Kleine, additive Änderung an drei bestehenden Modulen + eine getestete Hilfsfunktion. Keine neuen Screens.

### `js/storage.js` — Begleiter-Zustand
- Neuer Schlüssel `pk_companion` (ID als String, oder leer = keiner).
- `getCompanion()` → number|null: liefert die gespeicherte ID **nur**, wenn sie zum aktiven Level gehört und der Karl gefangen ist (count > 0); sonst `null`.
- `toggleCompanion(id)`: ist `id` bereits Begleiter → leeren (`null`); sonst auf `id` setzen. (Aufrufer stellt sicher, dass `id` gefangen ist.)
- `advanceLevel()` und `reset()` leeren `pk_companion` zusätzlich zu ihrem bisherigen Verhalten.

### `js/housescreen.js` — Auswahl + Marker
- Beim Tap auf ein Podest (bestehende `onPointer`/Pedestal-Trefferprüfung): wenn der getroffene Slot `count > 0` hat → `storage.toggleCompanion(slot.id)`.
- In `draw()`: auf dem Podest, dessen `id === storage.getCompanion()`, ein kleines **Pfötchen** zeichnen (einfache Canvas-Form, oben am Podest, gut sichtbar). Kein neues Asset nötig.
- Pedestal-Trefferzone: nutzt dieselbe Spalten-/Reihen-Geometrie wie die Anzeige (`XS`/`ROW_Y`), großzügige Tap-Fläche (kindgerecht), keine Kollision mit der bestehenden EXIT-Zone unten.

### `js/world.js` — Mitlaufen
- Beim `reset()`/Betreten die Begleiter-ID aus `storage.getCompanion()` lesen; Sprite via `getSprite(id)`.
- Eigene Position `companion = {x,y}`, startet an der Spielerposition.
- In `update(dt)`: Ziel = ein Punkt **hinter** dem Spieler (letzte Bewegungsrichtung, kleiner Abstand). Bewegung über die neue Hilfsfunktion (Mindestabstand-Dead-Zone, gleiches Tempo wie Spieler).
- In `draw()`: Begleiter-Sprite klein (~0,11·S) mit sanftem Bob (sinus) an seiner Position zeichnen — **vor** der Grasbüschel-/Spawn-Ebene, aber **vor** der Spielerfigur (Begleiter zuerst, Spieler danach → Spieler liegt bei Overlap oben). Kein Begleiter gesetzt → nichts zeichnen.
- Während `catch`/Boss ist der Begleiter nicht sichtbar (anderer Screen); nach Rückkehr auf die Wiese wieder da (aus Storage).

### `js/follow.js` (neu) — getestete Folge-Mathematik
- `followStep(pos, target, speed, dt, minDist)` → neue Position: bewegt `pos` Richtung `target`, aber stoppt, sobald der Abstand ≤ `minDist` (Dead-Zone → Begleiter klebt nicht auf dem Spieler, trippelt nur nach). Rein, DOM-frei.
- `trailTarget(player, dir, gap)` → `{x,y}`: Punkt um `gap` **entgegen** der Blickrichtung hinter dem Spieler (dir ∈ {up,down,left,right}). Rein, DOM-frei.

## Datenfluss

1. Haus: Tap auf gefangenes Podest → `storage.toggleCompanion(id)` → `pk_companion` gesetzt/geleert; Pfötchen-Marker aktualisiert sich beim nächsten `draw()`.
2. Wiese betreten: `world.reset()` liest `getCompanion()`; falls gesetzt, Begleiter erscheint an Spielerposition.
3. Jeder Frame: `trailTarget` bestimmt Punkt hinter dem Spieler, `followStep` bewegt den Begleiter dorthin.
4. Levelaufstieg / Neues Spiel: `pk_companion` geleert → kein Begleiter, bis im neuen Haus neu gewählt.

## Tests (node --test, DOM-frei)

- **storage:** `toggleCompanion` setzt/leert; `getCompanion` gibt nur gefangene IDs des aktiven Levels zurück (fremde/ungefangene → null); `advanceLevel`/`reset` leeren den Begleiter.
- **follow:** `followStep` bewegt Richtung Ziel, stoppt bei `minDist` (kein Überschießen, keine Bewegung wenn schon nah); `trailTarget` liegt in der korrekten Richtung hinter dem Spieler für alle 4 Richtungen.
- Bestehende Tests bleiben grün.

## Nicht im Scope (YAGNI)

- Kein Begleiter im Haus oder Fang-Screen.
- Keine Aufgaben, Kämpfe, Buddeln, Reaktionen des Begleiters.
- Kein zweiter Begleiter, keine Begleiter-Level/-Zufriedenheit.
- Kein neues Bild-Asset (Pfötchen wird gezeichnet).
