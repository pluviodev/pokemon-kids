# Pokémon Kids — Level 2 (Design)

**Datum:** 2026-09-16
**Ausgangslage:** Spiel hat aktuell EIN Level (10 Karls je 5× fangen → alle golden → Grasbüschel-Boss **Lukas** → Sieger-Screen mit Pokal → „Neues Spiel" resettet). Alle Assets für Level 2 liegen bereits in `Sprites/`.

## Ziel

Ein zweites Level, das nach dem Besiegen von Lukas startet: 10 neue Karls, neue Wiese, neuer Fang-Hintergrund, neuer Boss **Lena**, minimal schwerer. Nach Lena kommt der große Pokal-Sieger-Screen.

## Design-Entscheidungen (mit jh geklärt)

1. **Nach Lukas:** *kein* großer Pokal-Screen — nur die kurze Fang-Feier (die im Fang-Screen ohnehin ~2,4 s läuft), dann direkt raus auf die neue Wiese (Level 2). Der große Pokal-Screen kommt erst nach Level 2.
2. **Level 2 endet mit Boss** (gleiche Struktur wie Level 1), Boss = **Lena** (`Sprites/lena.png`).
3. **Haus in Level 2** zeigt die **10 neuen Karls** (frisch leer); die alten 10 sind abgeschlossen und verschwinden.
4. **Alle Assets vorhanden** — keine Platzhalter.
5. **Level 2 minimal schwerer:** grünes Band ~15 % schmaler, Marker ~10 % schneller.

## Architektur

Der bestehende Code ist gut vorbereitet: `spawn.js`, `collection.js` nehmen bereits einen `pool`-Parameter. Fest verdrahtete Level-1-Stellen: `BOSS_ID=11` (config), `"Lukas"` (catchscreen), BG-Keys `world/house/catchbg`, direkte `POKEMON`-Nutzung in `storage.js` und `win.js`.

### Neu: `js/levels.js` (pure data, DOM-frei, testbar)

Zentrales `LEVELS`-Array. Pro Level:
- `pokemon`: Array der 10 Karls `{ id, name, rarity, sprite }`
- `boss`: `{ id, name, sprite }`
- Asset-Keys: `world`, `house`, `catchbg`, `grass`
- `diff`: `{ bandMul, speedMul }`

```
LEVELS = [
  { n:1, world:"world",  house:"house",  catchbg:"catchbg",  grass:"grass",
    boss:{ id:11, name:"Lukas", sprite:"assets/pokemon/11.png" },
    diff:{ bandMul:1.0,  speedMul:1.0 },
    pokemon:[ ids 1..10 (unverändert) ] },
  { n:2, world:"world2", house:"house2", catchbg:"catchbg2", grass:"grass2",
    boss:{ id:12, name:"Lena", sprite:"assets/pokemon/12.png" },
    diff:{ bandMul:0.85, speedMul:0.9 },
    pokemon:[ ids 21..30 (neu) ] },
]
```

Helfer: `levelData(n)`, `pokemonForLevel(n)`, `MAX_LEVEL`.

**ID-Vergabe:** Level-1-Karls behalten 1–10, Lukas 11. Level-2-Karls 21–30, Lena 12. (Eigene IDs → keine Kollision; Zähler pro Level ohnehin getrennt.)

**Seltenheiten Level 2** (4 häufig / 3 mittel / 3 selten):
- häufig: Kieselkarlo, Karatekarlo, Blütenkarl, Frostkarl
- mittel: Spukarl, Toxikarla, Mentakarl
- selten: Drakarl, Glitzerkarla, Düsterkarl

### `js/data.js`
Behält `POKEMON` = Level-1-Set (Rückwärtskompatibilität), Definition wandert nach `levels.js` und wird von dort bezogen. Kein Verhalten für Level 1 ändert sich.

### `js/storage.js`
- Neuer Schlüssel `pk_level` (1/2, Default 1); `getLevel()`, `setLevel(n)`.
- `loadCounts()` / `addCatch()` / `penaltyAll()` arbeiten über **`pokemonForLevel(getLevel())`** statt fest `POKEMON` (Level 1 = identisches Verhalten).
- `advanceLevel()`: `setLevel(level+1)` (max `MAX_LEVEL`), Zähler `{}` (leer), `setWon(false)`.
- `reset()`: Level 1, Zähler leer, won false.

### `js/config.js`
`BOSS_ID` bleibt für Level 1 bestehen (Rückwärtskompatibilität), wird aber nicht mehr als globale Wahrheit genutzt — Boss-ID kommt aus `levelData`.

### `js/catch.js` / Fang-Schwierigkeit
`bandSize(rarity)` bleibt; in `catchscreen` wird `bandSz *= diff.bandMul` und `markerPeriod *= diff.speedMul` angewandt (Boss-Band `BOSS_BAND` ebenso × bandMul, Boss-Marker-Periode × speedMul).

### Render-Module lesen aktives Level
- `world.js`: `getImg(levelData(level).world)`, Grasbüschel `getImg(levelData(level).grass)`, Boss-ID + Pool aus `levelData`/`pokemonForLevel` an `pickSpawnId`/`allMaxed`.
- `housescreen.js`: `getImg(levelData(level).house)`, `getSlots(counts, pokemonForLevel(level))`. Podest-Positionen ggf. an `house2.png` angepasst (am Bild geprüft).
- `catchscreen.js`: `getImg(levelData(level).catchbg)`, Boss-Name/-Sprite + Karl-Meta aus aktivem Level statt Hardcode „Lukas"/`POKEMON.find`. Bekommt dazu `storage` (oder Level-Meta bei `start()`).
- `win.js`: `drawPokemonRing` zeigt `pokemonForLevel(level)` (das zuletzt gespielte Level).

Level wird beim Boot einmal gelesen und bei Screen-Wechseln aktualisiert (Screens fragen `storage.getLevel()` beim Betreten ab).

### `main.js` — Ablauf
Boss gefangen (`id === levelData(level).boss.id`, `caught === true`):
- `level < MAX_LEVEL` → `storage.advanceLevel()`, `world.reset()`, `screen = "world"` (die Fang-Feier lief schon im Fang-Screen).
- sonst (letztes Level) → `storage.setWon(true)`, `win.start(pokemonForLevel(level))`, `screen = "win"`.

Boss verpasst → `storage.penaltyAll()` (aktives Level), zurück zur Wiese. Normale Karls → `addCatch`.

### `js/sprites.js`
`loadAssets` lädt **alle** Assets beider Level vor: Karl-Sprites 1–10 & 21–30, Bosse 11 & 12, BG-Sets `world/house/catchbg` **und** `world2/house2/catchbg2`, `grass` **und** `grass2`. `getSprite(id)` funktioniert unverändert über die ID.

### `tools/process_assets.py`
Ergänzt:
- 10 neue Karls → `assets/pokemon/21..30.png`
- Lena → `assets/pokemon/12.png` (weißer BG per Flood-Fill freistellen, wie Lukas)
- `Draußen Level 2.png` → `world2.png`, `Drinnen Level 2.png` → `house2.png`, `Fang Background Level2.png` → `catchbg2.png`
- `grass2.png` = abgedunkelte Variante von `grass.png` (Helligkeit ×~0,7)

## Tests (node --test, DOM-frei)

- **levels.js:** Struktur (2 Level, je 10 Karls, eindeutige IDs, Boss gesetzt, diff-Faktoren).
- **storage.js:** `advanceLevel` erhöht Level + leert Zähler; `loadCounts` initialisiert das aktive Level-Set; `reset` zurück auf Level 1.
- **spawn.js:** mit Level-2-Pool liefert `pickSpawnId` bei allen maxed die Level-2-Boss-ID (12); `availableIds` respektiert Pool.
- Bestehende 30 Tests bleiben grün (Level-1-Verhalten unverändert).

## Nicht im Scope (YAGNI)

- Kein Level 3+, kein Level-Auswahlmenü, keine Zwischen-Level-Story.
- Kein gemischtes Haus (alle 20) — bewusst nur die 10 aktuellen.
- Kein Übersprung/Cheat zu Level 2.

## Offene Kleinigkeiten (bei Umsetzung zu prüfen)

- Podest-Positionen in `house2.png` am Bild verifizieren (evtl. leichte Anpassung ggü. Level 1).
- Tür-/Ausgang-/Bounds-Zonen: nur anpassen falls `Draußen Level 2` / `Drinnen Level 2` andere Tür-Position haben; sonst 1:1 übernehmen.
