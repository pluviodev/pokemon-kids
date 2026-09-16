# Pokémon Kids — Level 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein zweites Level (10 neue Karls, neue Wiese/Fang-BG/Haus, Boss Lena, minimal schwerer), das nach dem Besiegen von Lukas startet und mit dem großen Pokal-Screen endet.

**Architecture:** Neues DOM-freies `levels.js` hält pro Level die Karls, den Boss, die Asset-Keys und die Schwierigkeits-Faktoren. `storage.js` verwaltet die aktive Level-Nummer und führt Zähler pro Level. Render-Module (`world/house/catch/win`) lesen das aktive Level und ziehen den passenden Hintergrund, Boss und Karl-Pool. Die Asset-Pipeline erzeugt die neuen Bilder.

**Tech Stack:** Vanilla JS ES-Module, Canvas, kein Build. Tests: `node --test` (`npm test`). Asset-Pipeline: Python + Pillow (`tools/process_assets.py`).

## Global Constraints

- **Kein Text/Zahlen-Verbot-Ausnahme:** Namen + Zähler „X/5" sind bereits bewusst erlaubt (jh gewünscht) — dieses Verhalten NICHT ändern.
- **Level 1 bleibt bit-identisch im Verhalten** — alle 30 bestehenden Tests müssen grün bleiben.
- **Virtuelle Auflösung:** `VIRTUAL_W = VIRTUAL_H = 900`, quadratisch. Alle Screen-Koordinaten als Bruchteile von `S = VIRTUAL_W`.
- **IDs:** Level-1-Karls 1–10, Lukas 11. Level-2-Karls 21–30, Lena 12. Zähler pro Level getrennt.
- **Schwierigkeit Level 2:** `bandMul = 0.85` (Band schmaler), `speedMul = 0.9` (Marker-Periode kürzer = schneller).
- **Commit-Sprache:** Deutsch, Präfix `feat:`/`refactor:`/`chore:` wie im Repo üblich. Kein Push (macht jh).
- Node-Tests laufen mit `npm test` im Projektwurzelverzeichnis `Desktop/Claude Projects/Pokemon Kids`.

---

### Task 1: `levels.js` — zentrale Level-Daten + `data.js` daraus speisen

**Files:**
- Create: `js/levels.js`
- Create: `tests/levels.test.js`
- Modify: `js/data.js`

**Interfaces:**
- Produces:
  - `LEVELS` — Array von 2 Objekten `{ n, world, house, catchbg, grass, boss:{id,name,sprite}, diff:{bandMul,speedMul}, pokemon:[{id,name,rarity,sprite}] }`
  - `MAX_LEVEL` — number (`2`)
  - `levelData(n)` — Objekt für Level `n` (clamped 1..MAX_LEVEL)
  - `pokemonForLevel(n)` — Array der 10 Karl-Objekte
  - `data.js` re-exportiert unverändert `POKEMON` (= Level-1-Karls) und `spriteFor(id)`

- [ ] **Step 1: Write the failing test**

`tests/levels.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, MAX_LEVEL, levelData, pokemonForLevel } from "../js/levels.js";

test("zwei Level, jedes mit 10 Karls und einem Boss", () => {
  assert.equal(MAX_LEVEL, 2);
  assert.equal(LEVELS.length, 2);
  for (const lv of LEVELS) {
    assert.equal(lv.pokemon.length, 10);
    assert.ok(lv.boss && typeof lv.boss.id === "number");
    assert.ok(typeof lv.diff.bandMul === "number" && typeof lv.diff.speedMul === "number");
  }
});

test("alle Karl- und Boss-IDs sind projektweit eindeutig", () => {
  const ids = [];
  for (const lv of LEVELS) { lv.pokemon.forEach(p => ids.push(p.id)); ids.push(lv.boss.id); }
  assert.equal(new Set(ids).size, ids.length);
});

test("Level 1 = Karls 1..10 + Boss 11; Level 2 = Karls 21..30 + Boss 12", () => {
  assert.deepEqual(pokemonForLevel(1).map(p => p.id), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(levelData(1).boss.id, 11);
  assert.deepEqual(pokemonForLevel(2).map(p => p.id), [21,22,23,24,25,26,27,28,29,30]);
  assert.equal(levelData(2).boss.id, 12);
});

test("levelData clamped außerhalb des Bereichs", () => {
  assert.equal(levelData(0).n, 1);
  assert.equal(levelData(99).n, 2);
});

test("Level 2 ist schwerer (schmaleres Band, schnellerer Marker)", () => {
  assert.ok(levelData(2).diff.bandMul < 1);
  assert.ok(levelData(2).diff.speedMul < 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/levels.js'`

- [ ] **Step 3: Write `js/levels.js`**

```js
// Zentrale Level-Daten (DOM-frei). Pro Level: Karls, Boss, Asset-Keys, Schwierigkeit.
const RARITY = { common: "common", uncommon: "uncommon", rare: "rare" };

function pk(id, name, rarity) {
  return { id, name, rarity, sprite: `assets/pokemon/${String(id).padStart(2, "0")}.png` };
}

const LEVEL1 = [
  pk(1, "Blitzkarlitz", RARITY.common), pk(2, "Bonkarlbon", RARITY.common),
  pk(3, "Feuferkarl", RARITY.common),   pk(4, "Flatterkarla", RARITY.common),
  pk(5, "Kacabarl", RARITY.uncommon),   pk(6, "Karlfer", RARITY.uncommon),
  pk(7, "Karlklotz", RARITY.uncommon),  pk(8, "Karlkutta", RARITY.rare),
  pk(9, "Krabbelkarlitto", RARITY.rare), pk(10, "Krakarle", RARITY.rare),
];

const LEVEL2 = [
  pk(21, "Kieselkarlo", RARITY.common),  pk(22, "Karatekarlo", RARITY.common),
  pk(23, "Blütenkarl", RARITY.common),   pk(24, "Frostkarl", RARITY.common),
  pk(25, "Spukarl", RARITY.uncommon),    pk(26, "Toxikarla", RARITY.uncommon),
  pk(27, "Mentakarl", RARITY.uncommon),  pk(28, "Drakarl", RARITY.rare),
  pk(29, "Glitzerkarla", RARITY.rare),   pk(30, "Düsterkarl", RARITY.rare),
];

export const LEVELS = [
  {
    n: 1, world: "world", house: "house", catchbg: "catchbg", grass: "grass",
    boss: { id: 11, name: "Lukas", sprite: "assets/pokemon/11.png" },
    diff: { bandMul: 1.0, speedMul: 1.0 },
    pokemon: LEVEL1,
  },
  {
    n: 2, world: "world2", house: "house2", catchbg: "catchbg2", grass: "grass2",
    boss: { id: 12, name: "Lena", sprite: "assets/pokemon/12.png" },
    diff: { bandMul: 0.85, speedMul: 0.9 },
    pokemon: LEVEL2,
  },
];

export const MAX_LEVEL = LEVELS.length;

export function levelData(n) {
  const i = Math.min(MAX_LEVEL, Math.max(1, n | 0)) - 1;
  return LEVELS[i];
}

export function pokemonForLevel(n) {
  return levelData(n).pokemon;
}
```

- [ ] **Step 4: Refactor `js/data.js` to source Level 1 from `levels.js`**

Replace the whole file with:
```js
import { pokemonForLevel } from "./levels.js";

// Level-1-Karls (Rückwärtskompatibilität für Module, die direkt POKEMON nutzen).
export const POKEMON = pokemonForLevel(1);

export function spriteFor(id) {
  const p = POKEMON.find(x => x.id === id);
  return p ? p.sprite : null;
}
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `npm test`
Expected: PASS — neue `levels.test.js` grün, `data.test.js` weiterhin grün (POKEMON = 10 Karls ids 1..10).

- [ ] **Step 6: Commit**

```bash
git add js/levels.js js/data.js tests/levels.test.js
git commit -m "feat: levels.js mit Level-1/2-Daten; data.js bezieht POKEMON daraus"
```

---

### Task 2: `storage.js` — aktive Level-Nummer + Zähler pro Level

**Files:**
- Modify: `js/storage.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Consumes: `pokemonForLevel(n)`, `MAX_LEVEL` aus `levels.js`
- Produces (zusätzlich zum bestehenden API): `getLevel()` → number, `setLevel(n)` → void, `advanceLevel()` → void (Level+1 bis MAX_LEVEL, Zähler leeren, won false). `loadCounts/addCatch/penaltyAll` iterieren jetzt über `pokemonForLevel(getLevel())`.

- [ ] **Step 1: Write the failing tests** (an `tests/storage.test.js` anhängen)

```js
import { pokemonForLevel } from "../js/levels.js";

test("Level startet bei 1 und advanceLevel erhöht + leert Zähler + löscht won", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.getLevel(), 1);
  s.addCatch(1); s.addCatch(1); s.setWon(true);
  s.advanceLevel();
  const s2 = makeStorage(b);
  assert.equal(s2.getLevel(), 2);
  assert.equal(s2.getCount(1), 0);   // Zähler geleert
  assert.equal(s2.isWon(), false);
});

test("advanceLevel überschreitet MAX_LEVEL nicht", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.advanceLevel(); s.advanceLevel(); s.advanceLevel();
  assert.equal(makeStorage(b).getLevel(), 2);
});

test("loadCounts initialisiert die Karls des aktiven Levels", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.setLevel(2);
  const counts = makeStorage(b).loadCounts();
  for (const p of pokemonForLevel(2)) assert.equal(counts[p.id], 0);
  assert.ok(!(1 in counts)); // keine Level-1-IDs im Level-2-Set
});

test("reset setzt Level zurück auf 1", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.setLevel(2);
  s.reset();
  assert.equal(makeStorage(b).getLevel(), 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `s.getLevel is not a function`

- [ ] **Step 3: Modify `js/storage.js`**

Ändere Import-Zeile 1:
```js
import { POKEMON } from "./data.js";
```
zu:
```js
import { pokemonForLevel, MAX_LEVEL } from "./levels.js";
```

Nach `const WON_KEY = "pk_won";` einfügen:
```js
const LEVEL_KEY = "pk_level";
```

Innerhalb `makeStorage`, VOR `loadCounts`, einfügen:
```js
  function getLevel() {
    const n = parseInt(backend.getItem(LEVEL_KEY), 10);
    return Number.isInteger(n) && n >= 1 ? Math.min(MAX_LEVEL, n) : 1;
  }
  function setLevel(n) { backend.setItem(LEVEL_KEY, String(Math.min(MAX_LEVEL, Math.max(1, n | 0)))); }
  function activePool() { return pokemonForLevel(getLevel()); }
```

Ersetze in `loadCounts`, `penaltyAll` die Schleifen `for (const p of POKEMON)` durch `for (const p of activePool())`.

Ersetze `reset` durch:
```js
  function reset() {
    backend.setItem(COUNTS_KEY, JSON.stringify({}));
    setLevel(1);
    setWon(false);
  }
```

Füge nach `reset` ein:
```js
  function advanceLevel() {
    setLevel(getLevel() + 1);
    backend.setItem(COUNTS_KEY, JSON.stringify({}));
    setWon(false);
  }
```

Erweitere das `return`-Objekt um `getLevel, setLevel, advanceLevel`:
```js
  return { loadCounts, getCount, addCatch, penaltyAll, isWon, setWon, reset,
           getLevel, setLevel, advanceLevel, isSoundOn, setSound };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — neue Storage-Tests grün, bestehende Storage-Tests grün (Default-Level 1 → altes Verhalten).

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat: storage kennt aktives Level (getLevel/setLevel/advanceLevel), Zähler pro Level"
```

---

### Task 3: `spawn.js` — Boss-ID pro Level statt globaler Konstante

**Files:**
- Modify: `js/spawn.js`
- Modify: `tests/spawn.test.js`

**Interfaces:**
- Produces: `pickSpawnId(rng, counts, pool, bossId = BOSS_ID)` — gibt bei allen maxed `bossId` zurück. Signatur rückwärtskompatibel (Default = Level-1-Boss 11).

- [ ] **Step 1: Write the failing test** (an `tests/spawn.test.js` anhängen)

```js
test("pickSpawnId gibt den übergebenen bossId zurück (Level 2 = 12)", () => {
  assert.equal(pickSpawnId(() => 0.5, { 1: 10, 2: 10 }, pool, 12), 12);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — gibt `11` (BOSS_ID) statt `12` zurück.

- [ ] **Step 3: Modify `js/spawn.js`**

Ändere die Signatur:
```js
export function pickSpawnId(rng = Math.random, counts = {}, pool = POKEMON) {
  const avail = availableIds(counts, pool);
  if (avail.length === 0) return BOSS_ID;
```
zu:
```js
export function pickSpawnId(rng = Math.random, counts = {}, pool = POKEMON, bossId = BOSS_ID) {
  const avail = availableIds(counts, pool);
  if (avail.length === 0) return bossId;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — neuer Test grün, bestehender `pickSpawnId returns BOSS`-Test (ohne bossId-Arg) weiter grün.

- [ ] **Step 5: Commit**

```bash
git add js/spawn.js tests/spawn.test.js
git commit -m "feat: pickSpawnId nimmt bossId je Level (Default = Level-1-Boss)"
```

---

### Task 4: Asset-Pipeline — neue Karls, Lena, Level-2-BGs, dunkles Gras erzeugen

**Files:**
- Modify: `tools/process_assets.py`

**Interfaces:**
- Produces (Dateien): `assets/pokemon/21..30.png`, `assets/pokemon/12.png` (Lena), `assets/world2.png`, `assets/house2.png`, `assets/catchbg2.png`, `assets/grass2.png`.

- [ ] **Step 1: Erweitere `tools/process_assets.py`**

Nach dem `CREATURES`-Block (Level 1) einfügen:
```python
# Level-2-Kreaturen -> id 21..30 (Reihenfolge = rarity-Zuordnung in levels.js)
CREATURES2 = [
    "Kieselkarlo, der Quarzhorn-Buddler",
    "Karatekarlo, der Rotpanda-Känguru-Kämpfer",
    "Blütenkarl, der Blütenschirmträger",
    "Frostkarl, der Eis-Knirps",
    "Spukarl, der schüchterne Kerzengeist",
    "Toxikarla mit leuchtendem Giftnebel",
    "Mentakarl, der schwebende Kristallseher",
    "Drakarl, der kleine Sternendrache",
    "Glitzerkarla, das schwebende Feenreh",
    "Düsterkarl, der Schattenmasken-Schleicher",
]
for i, name in enumerate(CREATURES2, start=21):
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    im = fit(trim(im), 320)
    im.save(os.path.join(OUT, "pokemon", f"{i:02d}.png"))
    print("pokemon L2", i, name, im.size)
```

Nach dem Level-1-Hintergrund-Block einfügen:
```python
# Level-2-Hintergründe
for src_name, out_name, box in [("Draußen Level 2", "world2", 720),
                                ("Drinnen Level 2", "house2", 720)]:
    im = Image.open(os.path.join(SRC, src_name + ".png")).convert("RGBA")
    im = fit(im, box)
    im.save(os.path.join(OUT, out_name + ".png"))
    print("bg L2", out_name, im.size)

fb2 = Image.open(os.path.join(SRC, "Fang Background Level2.png")).convert("RGBA")
fb2 = fit(fb2, 900)
fb2.save(os.path.join(OUT, "catchbg2.png"))
print("catchbg2", fb2.size)
```

`cutout_white` wird für Lukas definiert; nach dem Lukas-Block einfügen (Lena, id 12):
```python
lena = fit(cutout_white(Image.open(os.path.join(SRC, "lena.png"))), 360)
lena.save(os.path.join(OUT, "pokemon", "12.png"))
print("lena", lena.size)
```

Nach dem `grass`-Block (dunkle Variante für Level 2) einfügen:
```python
# Dunkleres Grasbüschel für Level 2 (RGB * 0.7, Alpha bleibt)
g2 = Image.open(os.path.join(OUT, "grass.png")).convert("RGBA")
r, gg, b, a = g2.split()
from PIL import ImageEnhance
g2 = Image.merge("RGBA", (
    ImageEnhance.Brightness(r).enhance(0.7),
    ImageEnhance.Brightness(gg).enhance(0.7),
    ImageEnhance.Brightness(b).enhance(0.7),
    a,
))
g2.save(os.path.join(OUT, "grass2.png"))
print("grass2", g2.size)
```

- [ ] **Step 2: Pipeline ausführen**

Run: `cd "Desktop/Claude Projects/Pokemon Kids" && python tools/process_assets.py`
Expected: Ausgabezeilen `pokemon L2 21..30`, `lena`, `bg L2 world2/house2`, `catchbg2`, `grass2` ohne Fehler.

- [ ] **Step 3: Dateien verifizieren**

Run: `ls assets/pokemon/12.png assets/pokemon/21.png assets/pokemon/30.png assets/world2.png assets/house2.png assets/catchbg2.png assets/grass2.png`
Expected: alle 7 Pfade existieren.

- [ ] **Step 4: Lena-Freistellung + neue Karls visuell prüfen**

Öffne `assets/pokemon/12.png` (Lena) und stichprobenartig `21.png`/`30.png` im Bildbetrachter — Hintergrund transparent, Figur vollständig. Falls Lena weißen Rand behält: `cutout_white`-Toleranz testweise auf `tol=48` erhöhen und Step 2 wiederholen.

- [ ] **Step 5: Commit**

```bash
git add tools/process_assets.py assets/pokemon/12.png assets/pokemon/21.png assets/pokemon/22.png assets/pokemon/23.png assets/pokemon/24.png assets/pokemon/25.png assets/pokemon/26.png assets/pokemon/27.png assets/pokemon/28.png assets/pokemon/29.png assets/pokemon/30.png assets/world2.png assets/house2.png assets/catchbg2.png assets/grass2.png
git commit -m "feat: Level-2-Assets erzeugt (10 neue Karls, Lena, world2/house2/catchbg2, dunkles Gras)"
```

---

### Task 5: `sprites.js` — alle Level-Assets vorladen

**Files:**
- Modify: `js/sprites.js`

**Interfaces:**
- Consumes: `LEVELS` aus `levels.js`
- Produces: `getImg(key)` liefert auch `world2/house2/catchbg2/grass2`; `getSprite(id)` liefert Karls 21–30 und Boss 12; unveränderte Signaturen.

- [ ] **Step 1: Modify `js/sprites.js`**

Ändere Zeile 1:
```js
import { POKEMON } from "./data.js";
```
zu:
```js
import { POKEMON } from "./data.js";
import { LEVELS } from "./levels.js";
```

Ergänze im `MANIFEST`-Array die Level-2-Hintergründe (nach der `grass`-Zeile):
```js
  ["world2", "assets/world2.png"],
  ["house2", "assets/house2.png"],
  ["catchbg2", "assets/catchbg2.png"],
  ["grass2", "assets/grass2.png"],
```

Ersetze in `loadAssets` den `entries`-Aufbau:
```js
  const entries = [
    ...MANIFEST,
    ...POKEMON.map(p => ["pk" + p.id, p.sprite]),
    ["pk11", "assets/pokemon/11.png"], // Lukas (Boss)
  ];
```
durch (lädt alle Karls + beide Bosse aller Level):
```js
  const pkEntries = [];
  for (const lv of LEVELS) {
    for (const p of lv.pokemon) pkEntries.push(["pk" + p.id, p.sprite]);
    pkEntries.push(["pk" + lv.boss.id, lv.boss.sprite]);
  }
  const entries = [...MANIFEST, ...pkEntries];
```

- [ ] **Step 2: Verify no test regressions**

Run: `npm test`
Expected: PASS — `sprites.test.js` unverändert grün (getImg/getSprite/playerFrame-Logik unangetastet).

- [ ] **Step 3: Smoke-Check im Browser**

Run: `python -m http.server 8080` (im Projektordner), öffne `http://localhost:8080/?neu`, DevTools-Konsole → keine 404 für `world2.png/house2.png/catchbg2.png/grass2.png/pokemon/12.png/21..30.png`.
Expected: Spiel startet normal (Level 1), keine fehlenden Assets in der Konsole.

- [ ] **Step 4: Commit**

```bash
git add js/sprites.js
git commit -m "feat: sprites lädt alle Level-Assets vor (Level-2-BGs, neue Karls, Lena)"
```

---

### Task 6: `world.js` — Wiese level-abhängig (BG, Gras, Boss, Pool)

**Files:**
- Modify: `js/world.js`

**Interfaces:**
- Consumes: `storage.getLevel()`, `levelData(n)`, `pokemonForLevel(n)`; `pickSpawnId(rng, counts, pool, bossId)`, `allMaxed(counts, pool)`.

- [ ] **Step 1: Modify imports in `js/world.js`**

Ändere Zeile 1–4:
```js
import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_ACTIVE_SPAWNS,
         SPAWN_INTERVAL, GRASS_HIT_RADIUS, BOSS_ID } from "./config.js";
import { stepPlayer, hitsGrass, atHouseDoor } from "./movement.js";
import { pickSpawnId, allMaxed } from "./spawn.js";
import { getImg, playerFrame } from "./sprites.js";
```
zu:
```js
import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_ACTIVE_SPAWNS,
         SPAWN_INTERVAL, GRASS_HIT_RADIUS } from "./config.js";
import { stepPlayer, hitsGrass, atHouseDoor } from "./movement.js";
import { pickSpawnId, allMaxed } from "./spawn.js";
import { getImg, playerFrame } from "./sprites.js";
import { levelData, pokemonForLevel } from "./levels.js";
```

- [ ] **Step 2: Level-Kontext beim reset lesen**

Füge in `makeWorld` nach `let wasInDoor = false;` ein:
```js
  let lv = levelData(storage.getLevel());
```
Und in `reset()` als erste Zeile:
```js
    lv = levelData(storage.getLevel());
```

- [ ] **Step 3: Boss-ID + Pool in `trySpawn` nutzen**

Ersetze `trySpawn` durch:
```js
  function trySpawn() {
    const counts = storage.loadCounts();
    const pool = pokemonForLevel(lv.n);
    const bossId = lv.boss.id;
    if (allMaxed(counts, pool)) {
      if (storage.isWon()) { spawns = []; return; }
      if (!spawns.some(s => s.id === bossId)) {
        spawns = [{ x: 0.5 * S, y: 0.90 * S, id: bossId, phase: 0, boss: true }];
      }
      return;
    }
    if (spawns.length >= MAX_ACTIVE_SPAWNS) return;
    const x = 0.14 * S + Math.random() * 0.72 * S;
    const y = 0.34 * S + Math.random() * 0.56 * S;
    spawns.push({ x, y, id: pickSpawnId(Math.random, counts, pool, bossId), phase: Math.random() * 6 });
  }
```

- [ ] **Step 4: Level-abhängigen Hintergrund + Gras zeichnen**

In `draw()` ersetze `const world = getImg("world");` durch `const world = getImg(lv.world);`.
In der lokalen Funktion `drawGrass` ersetze `const spr = getImg("grass");` durch `const spr = getImg(lv.grass);`.

- [ ] **Step 5: Browser-Verifikation Level 1 (Regression)**

`python -m http.server 8080`, `http://localhost:8080/?neu` → Level 1 sieht aus wie zuvor (gleiche Wiese, gleiches Gras, Karls spawnen, Lukas-Grasbüschel bei allen golden).
Expected: kein visueller Unterschied zu vorher.

- [ ] **Step 6: Commit**

```bash
git add js/world.js
git commit -m "refactor: world zieht BG/Gras/Boss/Pool aus dem aktiven Level"
```

---

### Task 7: `housescreen.js` — Haus level-abhängig

**Files:**
- Modify: `js/housescreen.js`

**Interfaces:**
- Consumes: `storage.getLevel()`, `levelData(n)`, `pokemonForLevel(n)`; `getSlots(counts, pool)`.

- [ ] **Step 1: Imports + Level-Kontext**

Ändere die Import-Zeilen 1–4 — ergänze nach `import { stepPlayer } from "./movement.js";`:
```js
import { levelData, pokemonForLevel } from "./levels.js";
```

Füge in `makeHouseScreen` nach `let wasInExit = true;` ein:
```js
  let lv = levelData(storage.getLevel());
```
Und in `enter()` als erste Zeile:
```js
    lv = levelData(storage.getLevel());
```

- [ ] **Step 2: BG + Slots level-abhängig**

In `draw()` ersetze `const house = getImg("house");` durch `const house = getImg(lv.house);`.
Ersetze `const slots = getSlots(storage.loadCounts());` durch `const slots = getSlots(storage.loadCounts(), pokemonForLevel(lv.n));`.

- [ ] **Step 3: Podest-Positionen an `house2.png` prüfen**

Öffne im Spiel Level 1 → Haus (Podeste sitzen). Für Level 2 wird `house2.png` gezeichnet; die Konstanten `XS`/`ROW_Y` sind Bruchteile. Prüfe optisch nach Task 9 (wenn Level 2 spielbar), ob die neuen Karls auf den Podesten von `house2.png` sitzen. Falls `Drinnen Level 2.png` ein anderes Podest-Raster hat: `XS`/`ROW_Y` NICHT global ändern (bricht Level 1), sondern level-abhängig machen:
```js
// oben, statt const XS/ROW_Y:
const PEDESTALS = {
  1: { xs: [0.171, 0.335, 0.498, 0.663, 0.827], rows: [0.34, 0.60] },
  2: { xs: [0.171, 0.335, 0.498, 0.663, 0.827], rows: [0.34, 0.60] }, // an house2.png anpassen
};
```
und `pedestalPos(i)` sowie `blocked()` `PEDESTALS[lv.n]` nutzen lassen. **Nur umsetzen, falls die Positionen in `house2.png` tatsächlich abweichen** — sonst diesen Step als „geprüft, identisch" abhaken.

- [ ] **Step 4: Browser-Verifikation Level 1 (Regression)**

Haus in Level 1 betreten → Podeste, Namen, „X/5", Gold, Ausgang unverändert.

- [ ] **Step 5: Commit**

```bash
git add js/housescreen.js
git commit -m "refactor: housescreen zieht BG + Sammlung aus dem aktiven Level"
```

---

### Task 8: `catchscreen.js` — Fang-Screen level-abhängig (BG, Boss, Schwierigkeit)

**Files:**
- Modify: `js/catchscreen.js`
- Modify: `js/main.js` (nur die `makeCatchScreen`-Konstruktion, um `storage` zu übergeben)

**Interfaces:**
- Consumes: `storage.getLevel()`, `levelData(n)`, `pokemonForLevel(n)`.
- Produces: `makeCatchScreen({ ctx, audio, storage, onResult })` — `start(id)` liest das aktive Level für BG, Boss-Name/-Sprite, Karl-Meta und Schwierigkeit.

- [ ] **Step 1: Imports anpassen in `js/catchscreen.js`**

Ändere Zeile 1 + 5:
```js
import { VIRTUAL_W, VIRTUAL_H, POWERBAR_PERIOD, PERIOD_BY_RARITY, BOSS_ID, BOSS_BAND } from "./config.js";
...
import { POKEMON } from "./data.js";
```
zu:
```js
import { VIRTUAL_W, VIRTUAL_H, POWERBAR_PERIOD, PERIOD_BY_RARITY, BOSS_BAND } from "./config.js";
...
import { levelData, pokemonForLevel } from "./levels.js";
```

- [ ] **Step 2: `storage` in die Factory aufnehmen + Level-State**

Ändere die Signatur:
```js
export function makeCatchScreen({ ctx, audio, onResult }) {
```
zu:
```js
export function makeCatchScreen({ ctx, audio, storage, onResult }) {
```
Füge nach `let particles = [];` (vor `function start`) ein:
```js
  let lv = levelData(1);
```

- [ ] **Step 3: `start()` level-abhängig machen**

Ersetze die Funktion `start` durch:
```js
  function start(newId) {
    lv = levelData(storage.getLevel());
    id = newId;
    isBoss = id === lv.boss.id;
    const entry = pokemonForLevel(lv.n).find(p => p.id === id) || {};
    name = isBoss ? lv.boss.name : (entry.name || "");
    const rarity = entry.rarity || "rare";
    bandSz = (isBoss ? BOSS_BAND : bandSize(rarity)) * lv.diff.bandMul;
    markerPeriod = (isBoss ? POWERBAR_PERIOD : (PERIOD_BY_RARITY[rarity] || POWERBAR_PERIOD)) * lv.diff.speedMul;
    band = makeBand(randomCenter(bandSz), bandSz);
    phase = "aim"; t = 0; markerT = 0; bandT = 0; pos = 0;
    caught = false; particles = [];
  }
```

- [ ] **Step 4: Level-abhängigen Fang-Hintergrund zeichnen**

In `draw()` ersetze `const bg = getImg("catchbg");` durch `const bg = getImg(lv.catchbg);`.

- [ ] **Step 5: `main.js` — storage an catchScreen übergeben**

In `js/main.js` ändere die Konstruktion:
```js
const catchScreen = makeCatchScreen({
  ctx, audio,
  onResult: ({ id, caught }) => {
```
zu:
```js
const catchScreen = makeCatchScreen({
  ctx, audio, storage,
  onResult: ({ id, caught }) => {
```
(Die `onResult`-Logik selbst kommt in Task 9.)

- [ ] **Step 6: Verify no test regressions + Browser Level 1**

Run: `npm test` → PASS (catchscreen ist browser-only, keine Tests brechen).
Browser `?neu`: Level 1 Fang-Screen unverändert (Balken-Tempo/Bandgröße wie zuvor, weil `diff = 1.0`), Lukas-Boss-Name erscheint.

- [ ] **Step 7: Commit**

```bash
git add js/catchscreen.js js/main.js
git commit -m "feat: Fang-Screen level-abhängig (BG, Boss, Band/Tempo je Schwierigkeit)"
```

---

### Task 9: `main.js` + `win.js` — Ablauf (Level-Aufstieg nach Lukas, Pokal nach Lena)

**Files:**
- Modify: `js/main.js`
- Modify: `js/win.js`

**Interfaces:**
- Consumes: `storage.getLevel()`, `storage.advanceLevel()`, `MAX_LEVEL`, `levelData(n)`, `pokemonForLevel(n)`.
- Produces: `win.start(pool)` — Sieger-Screen zeigt die Karls aus `pool`.

- [ ] **Step 1: `main.js` — Boss-Handling im `onResult`**

Ändere Import Zeile 1:
```js
import { VIRTUAL_W, VIRTUAL_H, BOSS_ID } from "./config.js";
```
zu:
```js
import { VIRTUAL_W, VIRTUAL_H } from "./config.js";
import { levelData, pokemonForLevel, MAX_LEVEL } from "./levels.js";
```

Ersetze den `onResult`-Body:
```js
  onResult: ({ id, caught }) => {
    if (id === BOSS_ID) {
      if (caught) { storage.setWon(true); win.start(); screen = "win"; return; }
      storage.penaltyAll();
    } else if (caught) {
      storage.addCatch(id);
    }
    world.reset();
    screen = "world";
  },
```
durch:
```js
  onResult: ({ id, caught }) => {
    const lv = levelData(storage.getLevel());
    if (id === lv.boss.id) {
      if (caught) {
        if (lv.n < MAX_LEVEL) {
          storage.advanceLevel();          // Level 1 geschafft -> direkt nächste Wiese
        } else {
          storage.setWon(true);
          win.start(pokemonForLevel(lv.n)); // letztes Level -> Pokal-Screen
          screen = "win";
          return;
        }
      } else {
        storage.penaltyAll();
      }
    } else if (caught) {
      storage.addCatch(id);
    }
    world.reset();
    screen = "world";
  },
```

- [ ] **Step 2: `win.js` — Ring zeigt übergebenen Pool**

Ändere in `js/win.js` Zeile 3:
```js
import { POKEMON } from "./data.js";
```
zu:
```js
import { pokemonForLevel } from "./levels.js";
```

Ändere die Factory-Rückgabe so, dass `start` einen Pool annimmt. Ersetze `function start()`:
```js
  function start() {
    t = 0; spawnAcc = 0; soundAcc = 0; popped = false;
    particles = []; confetti = []; partyStarted = false;
    audio.play("caught");
    for (let i = 0; i < 60; i++) confetti.push(newConfetti());
  }
```
durch:
```js
  let pool = pokemonForLevel(1);
  function start(p) {
    if (p) pool = p;
    t = 0; spawnAcc = 0; soundAcc = 0; popped = false;
    particles = []; confetti = []; partyStarted = false;
    audio.play("caught");
    for (let i = 0; i < 60; i++) confetti.push(newConfetti());
  }
```

Ersetze in `drawPokemonRing` alle `POKEMON` durch `pool`:
```js
  function drawPokemonRing() {
    const R = ringRadius();
    for (let i = 0; i < pool.length; i++) {
      const ang = i / pool.length * Math.PI * 2 + t * 0.5;
      const x = CX + Math.cos(ang) * R;
      const y = CY + Math.sin(ang) * R * 0.8;
      const hop = -Math.abs(Math.sin(t * 5 + i)) * 0.035 * S;
      const spr = getSprite(pool[i].id);
      const h = 0.13 * S, ar = spr.width && spr.height ? spr.width / spr.height : 1;
      ctx.save();
      ctx.translate(x, y + hop);
      ctx.rotate(Math.sin(t * 4 + i) * 0.12);
      ctx.drawImage(spr, -h * ar / 2, -h, h * ar, h);
      ctx.restore();
    }
  }
```

- [ ] **Step 3: Verify no test regressions**

Run: `npm test`
Expected: PASS (main/win sind browser-only).

- [ ] **Step 4: Voller Durchspiel-Test im Browser**

`python -m http.server 8080`, `http://localhost:8080/?neu`. Zum schnellen Testen des Bosses in DevTools-Konsole:
```js
// alle Level-1-Karls auf max setzen -> Lukas-Grasbüschel erscheint
localStorage.setItem("pk_counts", JSON.stringify({1:5,2:5,3:5,4:5,5:5,6:5,7:5,8:5,9:5,10:5}));
localStorage.setItem("pk_level","1"); localStorage.setItem("pk_won","0"); location.reload();
```
Verifiziere:
1. Unten erscheint das (helle) Level-1-Grasbüschel → reinlaufen → Lukas (Boss-Band + Marker bewegen sich).
2. Lukas fangen → kurze Feuerwerk-Feier → **direkt neue Wiese** (Level 2: neuer BG, dunkleres Gras), **kein Pokal-Screen**.
3. Haus betreten → 10 **neue** Karls als Schatten, „0/5".
4. Fang-Screen eines neuen Karls: Band spürbar schmaler + Marker schneller als Level 1.
5. Level-2-Karls maxen (Konsole: `pk_counts` mit ids 21..30 auf 5, `pk_level=2`) → Lena-Grasbüschel → Lena fangen → **großer Pokal-Sieger-Screen** mit den **neuen** Karls im Tanz-Ring.
6. „Neues Spiel" (Pokal-Screen oder Ecke) → zurück auf Level 1, alte Karls, alles 0.

- [ ] **Step 5: Commit**

```bash
git add js/main.js js/win.js
git commit -m "feat: Level-Aufstieg nach Lukas (direkt Level 2), Pokal-Screen erst nach Lena"
```

---

### Task 10: Endabnahme + Gesamt-Test

**Files:** keine Code-Änderung (nur Verifikation), ggf. Feinjustage.

- [ ] **Step 1: Alle Tests grün**

Run: `npm test`
Expected: alle bestehenden + neuen Tests grün (30 alt + neue aus Task 1–3).

- [ ] **Step 2: Regressions-Durchlauf Level 1**

`?neu`, frischer `localStorage`: Level 1 komplett normal spielbar (Wiese, Karls fangen, Haus, Lukas) — kein Verhalten geändert.

- [ ] **Step 3: Podest-Sitz Level 2 final prüfen**

In Level 2 ins Haus: sitzen die 10 neuen Karls sauber auf den Podesten von `house2.png`? Falls nicht → Task 7 Step 3 (level-abhängiges `PEDESTALS`) umsetzen und `XS`/`ROW_Y` für Level 2 an `house2.png` anpassen, dann erneut prüfen.

- [ ] **Step 4: Schwierigkeit gegenprüfen**

Level-2-Fang gefühlt minimal schwerer, aber für ein kleines Kind machbar. Falls zu schwer/leicht: `diff` in `js/levels.js` justieren (`bandMul`/`speedMul`), erneut testen.

- [ ] **Step 5: Abschluss-Commit (falls Feinjustage)**

```bash
git add -A
git commit -m "tweak: Level-2-Feinschliff (Podeste/Schwierigkeit)"
```

---

## Self-Review

**Spec-Abdeckung:**
- Level-Begriff/`levels.js` → Task 1 ✓
- Fortschritt pro Level/`advanceLevel` → Task 2 ✓
- Boss-ID pro Level → Task 3 (spawn), Task 9 (main) ✓
- Assets (neue Karls, Lena, BGs, dunkles Gras) → Task 4 ✓
- Vorladen aller Assets → Task 5 ✓
- Level-abhängige Render (Wiese/Haus/Fang/Win) → Task 6–9 ✓
- Ablauf B (kein Pokal nach Lukas, Pokal nach Lena) → Task 9 ✓
- Schwierigkeit Level 2 (bandMul/speedMul) → Task 1 (Werte) + Task 8 (Anwendung) ✓
- Tests (levels/storage/spawn) → Task 1–3 ✓

**Placeholder-Scan:** kein „TBD/TODO"; jeder Code-Step zeigt vollständigen Code. Task 7 Step 3 / Task 10 Step 3 sind bedingte Anpassungen mit vollständigem Code — bewusst als „nur falls Positionen abweichen".

**Typ-Konsistenz:** `getLevel/setLevel/advanceLevel` (Task 2) konsistent in Task 6–9 genutzt. `levelData(n)` liefert `.n/.world/.house/.catchbg/.grass/.boss.{id,name,sprite}/.diff.{bandMul,speedMul}/.pokemon` — überall so verwendet. `pickSpawnId(rng,counts,pool,bossId)` (Task 3) exakt so in Task 6 aufgerufen. `win.start(pool)` (Task 9) passt zu `main.js`-Aufruf. `makeCatchScreen({ctx,audio,storage,onResult})` (Task 8) passt zur `main.js`-Konstruktion.
