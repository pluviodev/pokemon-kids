# Pokémon Kids Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein text-freies Pokémon-Sammelspiel für ein nicht-lesendes Kind: über eine Wiese laufen, raschelndem Gras folgen, in einer Fang-Szene mit Power-Leiste (ein Wurf) fangen, gefangene Pokémon im Haus sammeln.

**Architecture:** Statische Single-Page-Canvas-App ohne Build-Schritt. Ein `<canvas>` rendert drei Screens (Wiese / Fang / Haus), umgeschaltet über eine Zustandsmaschine in `main.js`. Reine Logik (Fang-Chance, Spawn-Gewichtung, Storage, Sammlung, Bewegung) lebt in kleinen, DOM-freien ES-Modulen und wird mit `node --test` getestet; Rendering/Animation ist browserseitig und wird per Checkliste manuell abgenommen.

**Tech Stack:** HTML5 Canvas, Vanilla-JS (ES-Module, `<script type="module">`), CSS. Tests: Node 22 eingebauter Runner (`node --test`). Persistenz: `localStorage`. Deploy: GitHub Pages.

## Global Constraints

- **Keine Schrift, keine Zahlen, keine Namen** irgendwo im Spielgeschehen — nur Symbole, Farben, Animation, Ton.
- **Keine Emojis** in der Darstellung — UI-Symbole werden gezeichnet (Canvas/SVG-Pfade), Pokémon sind gelieferte Sprites.
- Muss auf **Touch UND Tastatur/Maus** funktionieren.
- **Kein Build-Schritt**, alles statisch, offline lauffähig, GitHub-Pages-fähig.
- Logik-Module bleiben **DOM-frei** (kein `window`/`document`/`localStorage`-Direktzugriff) damit `node --test` sie laden kann; Abhängigkeiten werden injiziert.
- Virtuelle Auflösung fix **480×800** (Hochformat), per CSS auf den Viewport skaliert; alle Spielkoordinaten in diesem virtuellen Raum.
- **Ein Wurf pro Begegnung:** daneben → Pokémon flieht, kann später neu spawnen.
- 10 Pokémon, Sprites unter `assets/pokemon/01.png … 10.png` (vom Nutzer geliefert; bis dahin gezeichnete Platzhalter).

---

## File Structure

```
index.html                 # Canvas + Modul-Einstieg
css/style.css              # Vollbild-Layout, Canvas skaliert, kein Text
package.json               # type:module, test-Script
.gitignore
js/
  config.js                # Konstanten: Auflösung, Tempo, Rarity-Tabellen, Spawn-Parameter
  data.js                  # die 10 Pokémon (id, sprite-Pfad, rarity)
  catch.js                 # PURE: catchChance(), attemptCatch(), greenZone()
  spawn.js                 # PURE: pickSpawnId() gewichtet nach rarity
  movement.js              # PURE: stepPlayer(), hitsGrass(), atHouseDoor()
  powerbar.js              # PURE: markerPos(t) Dreieckswelle 0..1
  collection.js            # PURE: getSlots(caughtSet, data)
  storage.js               # makeStorage(backend): caught-Set + Sound-Flag laden/speichern
  sprites.js               # spritePath(id), Bild-Loader, gezeichnete Platzhalter, Idle-Wobble
  audio.js                 # WebAudio-Effekte + An/Aus
  world.js                 # Wiese-Screen: rendern, Bewegung, Raschel-Spawns, Kollision
  catchscreen.js           # Fang-Screen: rendern, Power-Leiste, Wurf, Feuerwerk
  housescreen.js           # Haus-Screen: 10 Slots rendern (Sprite oder Schatten)
  main.js                  # Einstieg, Game-Loop, Screen-Zustandsmaschine, Input
tests/
  data.test.js  catch.test.js  spawn.test.js  movement.test.js
  powerbar.test.js  collection.test.js  storage.test.js
assets/pokemon/            # Platzhalter jetzt, echte Sprites später
```

Prinzip: PURE-Module (oben) sind getestet; Screen-/Render-Module (`world/catchscreen/housescreen/main`) konsumieren sie und werden manuell im Browser abgenommen.

---

### Task 1: Projekt-Gerüst + Test-Harness

**Files:**
- Create: `package.json`, `.gitignore`, `index.html`, `css/style.css`, `js/config.js`, `js/main.js`
- Test: `tests/config.smoke.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `config.js` exportiert `VIRTUAL_W=480`, `VIRTUAL_H=800`, `PLAYER_SPEED`, `RARITIES` (Array `["common","uncommon","rare"]`), `EASE` (`{common:1.0,uncommon:0.75,rare:0.55}`), `GREEN_ZONE` (`{common:0.5,uncommon:0.35,rare:0.22}`), `SPAWN_WEIGHT` (`{common:5,uncommon:3,rare:1.5}`), `MAX_ACTIVE_SPAWNS=2`.

- [ ] **Step 1: Write the failing test**

`tests/config.smoke.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as config from "../js/config.js";

test("config exposes core constants", () => {
  assert.equal(config.VIRTUAL_W, 480);
  assert.equal(config.VIRTUAL_H, 800);
  assert.deepEqual(config.RARITIES, ["common", "uncommon", "rare"]);
  assert.equal(config.EASE.common, 1.0);
  assert.equal(config.GREEN_ZONE.rare, 0.22);
  assert.equal(config.MAX_ACTIVE_SPAWNS, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../js/config.js`.

- [ ] **Step 3: Create scaffolding + implementation**

`package.json`:
```json
{
  "name": "pokemon-kids",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
```

`.gitignore`:
```
node_modules/
.DS_Store
```

`js/config.js`:
```js
export const VIRTUAL_W = 480;
export const VIRTUAL_H = 800;
export const PLAYER_SPEED = 180; // virtuelle Pixel pro Sekunde
export const RARITIES = ["common", "uncommon", "rare"];
export const EASE = { common: 1.0, uncommon: 0.75, rare: 0.55 };
export const GREEN_ZONE = { common: 0.5, uncommon: 0.35, rare: 0.22 };
export const SPAWN_WEIGHT = { common: 5, uncommon: 3, rare: 1.5 };
export const MAX_ACTIVE_SPAWNS = 2;
export const SPAWN_INTERVAL = 2.5; // Sekunden zwischen Spawn-Versuchen
export const GRASS_HIT_RADIUS = 46; // virtuelle Pixel
export const POWERBAR_PERIOD = 1.4; // Sekunden für einen Hoch-Runter-Zyklus
```

`index.html`:
```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>Pokémon Kids</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <canvas id="game" width="480" height="800"></canvas>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

`css/style.css`:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  height: 100%; background: #1a1a1a; overflow: hidden;
  touch-action: none; user-select: none; -webkit-user-select: none;
}
body { display: flex; align-items: center; justify-content: center; }
#game {
  display: block;
  height: 100vh; width: auto;
  max-width: 100vw;
  image-rendering: pixelated;
  background: #7ec850;
}
```

`js/main.js` (Minimal-Stub, füllt später Task 12):
```js
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#7ec850";
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore index.html css/style.css js/config.js js/main.js tests/config.smoke.test.js
git commit -m "feat: Projekt-Gerüst + Test-Harness + Config-Konstanten"
```

---

### Task 2: Pokémon-Daten (10 Einträge)

**Files:**
- Create: `js/data.js`
- Test: `tests/data.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `POKEMON` — Array von 10 Objekten `{ id:1..10, sprite:string, rarity:"common"|"uncommon"|"rare" }`. `spriteFor(id)` gibt den Pfad. Verteilung: ids 1–4 common, 5–7 uncommon, 8–10 rare.

- [ ] **Step 1: Write the failing test**

`tests/data.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { POKEMON } from "../js/data.js";
import { RARITIES } from "../js/config.js";

test("there are exactly 10 pokemon with ids 1..10", () => {
  assert.equal(POKEMON.length, 10);
  assert.deepEqual(POKEMON.map(p => p.id), [1,2,3,4,5,6,7,8,9,10]);
});

test("every pokemon has a valid rarity and sprite path", () => {
  for (const p of POKEMON) {
    assert.ok(RARITIES.includes(p.rarity), `rarity ${p.rarity}`);
    assert.match(p.sprite, /^assets\/pokemon\/\d\d\.png$/);
  }
});

test("rarity distribution is 4 common, 3 uncommon, 3 rare", () => {
  const count = r => POKEMON.filter(p => p.rarity === r).length;
  assert.equal(count("common"), 4);
  assert.equal(count("uncommon"), 3);
  assert.equal(count("rare"), 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../js/data.js`.

- [ ] **Step 3: Write minimal implementation**

`js/data.js`:
```js
const RARITY_BY_ID = {
  1: "common", 2: "common", 3: "common", 4: "common",
  5: "uncommon", 6: "uncommon", 7: "uncommon",
  8: "rare", 9: "rare", 10: "rare",
};

export const POKEMON = Object.keys(RARITY_BY_ID).map(k => {
  const id = Number(k);
  return {
    id,
    sprite: `assets/pokemon/${String(id).padStart(2, "0")}.png`,
    rarity: RARITY_BY_ID[id],
  };
});

export function spriteFor(id) {
  const p = POKEMON.find(x => x.id === id);
  return p ? p.sprite : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/data.js tests/data.test.js
git commit -m "feat: 10 Pokémon-Daten mit rarity-Verteilung"
```

---

### Task 3: Fang-Logik (PURE)

**Files:**
- Create: `js/catch.js`
- Test: `tests/catch.test.js`

**Interfaces:**
- Consumes: `EASE`, `GREEN_ZONE` aus `config.js`.
- Produces:
  - `catchChance(pos, rarity)` → Zahl in [0,1]; `pos` (0=unten,1=oben) mal `EASE[rarity]`, geклemmt.
  - `attemptCatch(pos, rarity, rng=Math.random)` → boolean; `true` wenn `rng() < catchChance(...)`.
  - `greenZone(rarity)` → `{ from, to }` in [0,1] (obere Zone, `to=1`, `from=1-GREEN_ZONE[rarity]`).

- [ ] **Step 1: Write the failing test**

`tests/catch.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { catchChance, attemptCatch, greenZone } from "../js/catch.js";

test("catchChance scales with position and rarity ease", () => {
  assert.equal(catchChance(1, "common"), 1);
  assert.equal(catchChance(0, "common"), 0);
  assert.equal(catchChance(1, "rare"), 0.55);
  assert.ok(Math.abs(catchChance(0.5, "uncommon") - 0.375) < 1e-9);
});

test("catchChance clamps out-of-range positions", () => {
  assert.equal(catchChance(2, "common"), 1);
  assert.equal(catchChance(-1, "common"), 0);
});

test("attemptCatch uses injected rng deterministically", () => {
  assert.equal(attemptCatch(1, "common", () => 0.99), true);   // chance 1.0 > 0.99
  assert.equal(attemptCatch(0.5, "rare", () => 0.9), false);   // chance 0.275 < 0.9
});

test("greenZone sits at the top and shrinks with rarity", () => {
  assert.deepEqual(greenZone("common"), { from: 0.5, to: 1 });
  assert.deepEqual(greenZone("rare"), { from: 0.78, to: 1 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../js/catch.js`.

- [ ] **Step 3: Write minimal implementation**

`js/catch.js`:
```js
import { EASE, GREEN_ZONE } from "./config.js";

const clamp01 = x => Math.max(0, Math.min(1, x));

export function catchChance(pos, rarity) {
  return clamp01(clamp01(pos) * EASE[rarity]);
}

export function attemptCatch(pos, rarity, rng = Math.random) {
  return rng() < catchChance(pos, rarity);
}

export function greenZone(rarity) {
  const size = GREEN_ZONE[rarity];
  return { from: Number((1 - size).toFixed(10)), to: 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/catch.js tests/catch.test.js
git commit -m "feat: Fang-Chance-Logik (Position x Seltenheit, ein Wurf)"
```

---

### Task 4: Spawn-Logik (PURE)

**Files:**
- Create: `js/spawn.js`
- Test: `tests/spawn.test.js`

**Interfaces:**
- Consumes: `SPAWN_WEIGHT` aus `config.js`, `POKEMON` aus `data.js`.
- Produces: `pickSpawnId(rng=Math.random, pool=POKEMON)` → eine Pokémon-id, gewichtet nach `SPAWN_WEIGHT[rarity]`. Deterministisch bei injiziertem `rng`.

- [ ] **Step 1: Write the failing test**

`tests/spawn.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSpawnId } from "../js/spawn.js";

const pool = [
  { id: 1, rarity: "common" },   // weight 5
  { id: 2, rarity: "rare" },     // weight 1.5
];
// Gesamtgewicht 6.5. rng()*6.5: <5 -> id 1, sonst id 2.

test("low rng lands in the first (heavier) bucket", () => {
  assert.equal(pickSpawnId(() => 0.0, pool), 1);
  assert.equal(pickSpawnId(() => 0.7, pool), 1); // 0.7*6.5=4.55 < 5
});

test("high rng lands in the rare bucket", () => {
  assert.equal(pickSpawnId(() => 0.9, pool), 2); // 0.9*6.5=5.85 >= 5
});

test("always returns an id from the pool", () => {
  for (let i = 0; i < 20; i++) {
    const id = pickSpawnId(() => i / 20, pool);
    assert.ok([1, 2].includes(id));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../js/spawn.js`.

- [ ] **Step 3: Write minimal implementation**

`js/spawn.js`:
```js
import { SPAWN_WEIGHT } from "./config.js";
import { POKEMON } from "./data.js";

export function pickSpawnId(rng = Math.random, pool = POKEMON) {
  const total = pool.reduce((s, p) => s + SPAWN_WEIGHT[p.rarity], 0);
  let r = rng() * total;
  for (const p of pool) {
    r -= SPAWN_WEIGHT[p.rarity];
    if (r < 0) return p.id;
  }
  return pool[pool.length - 1].id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/spawn.js tests/spawn.test.js
git commit -m "feat: gewichtete Spawn-Auswahl nach Seltenheit"
```

---

### Task 5: Bewegungs-Logik (PURE)

**Files:**
- Create: `js/movement.js`
- Test: `tests/movement.test.js`

**Interfaces:**
- Consumes: nichts (Grenzen werden übergeben).
- Produces:
  - `stepPlayer(pos, target, speed, dt, bounds)` → neues `{x,y}`; bewegt `pos` Richtung `target` um `speed*dt`, ohne zu überschießen, geklemmt auf `bounds {minX,minY,maxX,maxY}`.
  - `hitsGrass(pos, point, radius)` → boolean; true wenn Distanz < radius.
  - `atHouseDoor(pos, door)` → boolean; true wenn `pos` in Rechteck `door {x,y,w,h}`.

- [ ] **Step 1: Write the failing test**

`tests/movement.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { stepPlayer, hitsGrass, atHouseDoor } from "../js/movement.js";

const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

test("stepPlayer moves toward target by speed*dt", () => {
  const p = stepPlayer({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, 1, bounds);
  assert.deepEqual(p, { x: 5, y: 0 });
});

test("stepPlayer does not overshoot the target", () => {
  const p = stepPlayer({ x: 0, y: 0 }, { x: 3, y: 4 }, 100, 1, bounds);
  assert.deepEqual(p, { x: 3, y: 4 }); // Distanz 5 < 100
});

test("stepPlayer clamps to bounds", () => {
  const p = stepPlayer({ x: 95, y: 0 }, { x: 200, y: 0 }, 100, 1, bounds);
  assert.equal(p.x, 100);
});

test("hitsGrass true only within radius", () => {
  assert.equal(hitsGrass({ x: 0, y: 0 }, { x: 3, y: 0 }, 5), true);
  assert.equal(hitsGrass({ x: 0, y: 0 }, { x: 6, y: 0 }, 5), false);
});

test("atHouseDoor detects point inside door rect", () => {
  const door = { x: 10, y: 10, w: 20, h: 20 };
  assert.equal(atHouseDoor({ x: 15, y: 15 }, door), true);
  assert.equal(atHouseDoor({ x: 40, y: 15 }, door), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../js/movement.js`.

- [ ] **Step 3: Write minimal implementation**

`js/movement.js`:
```js
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function stepPlayer(pos, target, speed, dt, bounds) {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  let nx = target.x, ny = target.y;
  const move = speed * dt;
  if (dist > move && dist > 0) {
    nx = pos.x + (dx / dist) * move;
    ny = pos.y + (dy / dist) * move;
  }
  return {
    x: clamp(nx, bounds.minX, bounds.maxX),
    y: clamp(ny, bounds.minY, bounds.maxY),
  };
}

export function hitsGrass(pos, point, radius) {
  return Math.hypot(pos.x - point.x, pos.y - point.y) < radius;
}

export function atHouseDoor(pos, door) {
  return pos.x >= door.x && pos.x <= door.x + door.w &&
         pos.y >= door.y && pos.y <= door.y + door.h;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/movement.js tests/movement.test.js
git commit -m "feat: reine Bewegungs-, Gras-Kollisions- und Tür-Logik"
```

---

### Task 6: Power-Leisten-Bewegung (PURE)

**Files:**
- Create: `js/powerbar.js`
- Test: `tests/powerbar.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces: `markerPos(t, period)` → Position in [0,1] als Dreieckswelle: bei `t=0` →0, bei `t=period/2` →1, bei `t=period` →0. Läuft gleichmäßig hoch und runter, endlos.

- [ ] **Step 1: Write the failing test**

`tests/powerbar.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { markerPos } from "../js/powerbar.js";

test("triangle wave hits 0 at start, 1 at mid, 0 at end", () => {
  assert.ok(Math.abs(markerPos(0, 2) - 0) < 1e-9);
  assert.ok(Math.abs(markerPos(1, 2) - 1) < 1e-9);
  assert.ok(Math.abs(markerPos(2, 2) - 0) < 1e-9);
});

test("is periodic and quarter point is 0.5", () => {
  assert.ok(Math.abs(markerPos(0.5, 2) - 0.5) < 1e-9);
  assert.ok(Math.abs(markerPos(2.5, 2) - markerPos(0.5, 2)) < 1e-9);
});

test("stays within [0,1] for arbitrary t", () => {
  for (let t = 0; t < 10; t += 0.13) {
    const p = markerPos(t, 1.4);
    assert.ok(p >= 0 && p <= 1);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../js/powerbar.js`.

- [ ] **Step 3: Write minimal implementation**

`js/powerbar.js`:
```js
export function markerPos(t, period) {
  const phase = ((t % period) + period) % period; // 0..period
  const half = period / 2;
  return phase <= half ? phase / half : 2 - phase / half;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/powerbar.js tests/powerbar.test.js
git commit -m "feat: Dreieckswellen-Bewegung für die Power-Leiste"
```

---

### Task 7: Sammlungs-Status (PURE)

**Files:**
- Create: `js/collection.js`
- Test: `tests/collection.test.js`

**Interfaces:**
- Consumes: `POKEMON` aus `data.js`.
- Produces: `getSlots(caughtSet, pool=POKEMON)` → Array in Pool-Reihenfolge von `{ id, sprite, rarity, caught:boolean }`; `caught` = `caughtSet.has(id)`.

- [ ] **Step 1: Write the failing test**

`tests/collection.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { getSlots } from "../js/collection.js";

const pool = [
  { id: 1, sprite: "a.png", rarity: "common" },
  { id: 2, sprite: "b.png", rarity: "rare" },
];

test("marks caught ids and leaves others as shadow", () => {
  const slots = getSlots(new Set([1]), pool);
  assert.equal(slots.length, 2);
  assert.deepEqual(slots[0], { id: 1, sprite: "a.png", rarity: "common", caught: true });
  assert.equal(slots[1].caught, false);
});

test("empty set means nothing caught", () => {
  const slots = getSlots(new Set(), pool);
  assert.ok(slots.every(s => s.caught === false));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../js/collection.js`.

- [ ] **Step 3: Write minimal implementation**

`js/collection.js`:
```js
import { POKEMON } from "./data.js";

export function getSlots(caughtSet, pool = POKEMON) {
  return pool.map(p => ({
    id: p.id,
    sprite: p.sprite,
    rarity: p.rarity,
    caught: caughtSet.has(p.id),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/collection.js tests/collection.test.js
git commit -m "feat: Sammlungs-Slot-Status (gefangen vs. Schatten)"
```

---

### Task 8: Storage (gefangene IDs + Sound-Flag)

**Files:**
- Create: `js/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: ein Backend mit `getItem(key)`/`setItem(key,val)` (default `localStorage`).
- Produces: `makeStorage(backend=localStorage)` → Objekt mit:
  - `loadCaught()` → `Set<number>` (leer wenn nichts/kaputt gespeichert).
  - `addCaught(id)` → speichert id in die Menge, gibt aktualisiertes `Set` zurück.
  - `isSoundOn()` → boolean (default `true`).
  - `setSound(on)` → speichert boolean.
  - Keys: `pk_caught` (JSON-Array), `pk_sound` (`"1"`/`"0"`).

- [ ] **Step 1: Write the failing test**

`tests/storage.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeStorage } from "../js/storage.js";

function fakeBackend() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    _map: m,
  };
}

test("loadCaught starts empty and addCaught persists ids", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.deepEqual([...s.loadCaught()], []);
  s.addCaught(3);
  s.addCaught(3); // idempotent
  s.addCaught(7);
  assert.deepEqual([...makeStorage(b).loadCaught()].sort(), [3, 7]);
});

test("corrupt caught data yields empty set", () => {
  const b = fakeBackend();
  b.setItem("pk_caught", "not-json");
  assert.deepEqual([...makeStorage(b).loadCaught()], []);
});

test("sound defaults on and can be toggled off", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.isSoundOn(), true);
  s.setSound(false);
  assert.equal(makeStorage(b).isSoundOn(), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../js/storage.js`.

- [ ] **Step 3: Write minimal implementation**

`js/storage.js`:
```js
const CAUGHT_KEY = "pk_caught";
const SOUND_KEY = "pk_sound";

export function makeStorage(backend = localStorage) {
  function loadCaught() {
    try {
      const raw = backend.getItem(CAUGHT_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.filter(n => Number.isInteger(n)));
    } catch {
      return new Set();
    }
  }
  function addCaught(id) {
    const set = loadCaught();
    set.add(id);
    backend.setItem(CAUGHT_KEY, JSON.stringify([...set]));
    return set;
  }
  function isSoundOn() {
    return backend.getItem(SOUND_KEY) !== "0";
  }
  function setSound(on) {
    backend.setItem(SOUND_KEY, on ? "1" : "0");
  }
  return { loadCaught, addCaught, isSoundOn, setSound };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS. Danach voller Lauf `npm test` → alle Suites grün.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat: localStorage-Storage für gefangene IDs + Sound-Flag"
```

---

### Task 9: Sprites & Platzhalter + Audio

**Files:**
- Create: `js/sprites.js`, `js/audio.js`, `assets/pokemon/.gitkeep`
- Test: `tests/sprites.test.js`

**Interfaces:**
- Consumes: `POKEMON` aus `data.js`.
- Produces:
  - `sprites.js`: `loadSprites(onReady)` lädt `POKEMON`-Bilder via `Image`; fehlt eines, wird ein **gezeichneter Platzhalter** (bunter Kreis mit Nummer-freiem Muster nach id) genutzt. `getSprite(id)` → `HTMLImageElement|HTMLCanvasElement`. `wobbleOffset(t, id)` → `{dx,dy}` kleines Idle-Wackeln (PURE, testbar).
  - `audio.js`: `makeAudio(storage)` → `{ play(name), toggle(), isOn() }` mit WebAudio-Beeps für `"throw"`, `"caught"`, `"flee"`, `"encounter"`; respektiert Sound-Flag; startet AudioContext erst nach erster Nutzergeste.
- Nur `wobbleOffset` wird unit-getestet (Rest ist browser-only, manuelle Abnahme).

- [ ] **Step 1: Write the failing test**

`tests/sprites.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { wobbleOffset } from "../js/sprites.js";

test("wobbleOffset is bounded and varies over time", () => {
  const a = wobbleOffset(0, 1);
  const b = wobbleOffset(0.5, 1);
  assert.ok(Math.abs(a.dy) <= 6 && Math.abs(a.dx) <= 6);
  assert.notDeepEqual(a, b);
});

test("different ids are phase-shifted (not identical at t=0)", () => {
  assert.notDeepEqual(wobbleOffset(0, 1), wobbleOffset(0, 2));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../js/sprites.js`.

- [ ] **Step 3: Write implementation**

`js/sprites.js`:
```js
import { POKEMON } from "./data.js";

export function wobbleOffset(t, id) {
  const phase = id * 0.7;
  return {
    dx: Math.sin(t * 3 + phase) * 3,
    dy: Math.cos(t * 4 + phase) * 5,
  };
}

const PLACEHOLDER_COLORS = [
  "#e05a5a", "#e0a15a", "#e0d75a", "#8fd45a", "#5ad0b0",
  "#5aa6e0", "#7d7de0", "#c25ae0", "#e05aa6", "#9a6a44",
];

function makePlaceholder(id) {
  const c = document.createElement("canvas");
  c.width = 96; c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = PLACEHOLDER_COLORS[(id - 1) % 10];
  g.beginPath(); g.arc(48, 48, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)";
  // id-abhängiges Punktmuster statt Zahl (text-frei)
  for (let i = 0; i < id; i++) {
    const a = (i / id) * Math.PI * 2;
    g.beginPath();
    g.arc(48 + Math.cos(a) * 18, 48 + Math.sin(a) * 18, 5, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

const cache = new Map();

export function loadSprites(onReady) {
  let pending = POKEMON.length;
  const done = () => { if (--pending === 0 && onReady) onReady(); };
  for (const p of POKEMON) {
    const img = new Image();
    img.onload = () => { cache.set(p.id, img); done(); };
    img.onerror = () => { cache.set(p.id, makePlaceholder(p.id)); done(); };
    img.src = p.sprite;
  }
}

export function getSprite(id) {
  return cache.get(id) || makePlaceholder(id);
}
```

`js/audio.js`:
```js
export function makeAudio(storage) {
  let ctx = null;
  const ensure = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
    return ctx;
  };
  const TONES = {
    throw:     [{ f: 440, d: 0.08 }],
    caught:    [{ f: 660, d: 0.1 }, { f: 880, d: 0.1 }, { f: 1320, d: 0.16 }],
    flee:      [{ f: 300, d: 0.12 }, { f: 180, d: 0.16 }],
    encounter: [{ f: 520, d: 0.06 }, { f: 780, d: 0.06 }],
  };
  function play(name) {
    if (!storage.isSoundOn()) return;
    const c = ensure(); if (!c) return;
    let t = c.currentTime;
    for (const note of TONES[name] || []) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "square";
      osc.frequency.value = note.f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.d);
      osc.connect(gain).connect(c.destination);
      osc.start(t); osc.stop(t + note.d);
      t += note.d;
    }
  }
  return {
    play,
    toggle() { storage.setSound(!storage.isSoundOn()); return storage.isSoundOn(); },
    isOn() { return storage.isSoundOn(); },
  };
}
```

`assets/pokemon/.gitkeep`: leere Datei (hält den Ordner im Repo).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/sprites.js js/audio.js assets/pokemon/.gitkeep tests/sprites.test.js
git commit -m "feat: Sprite-Loader mit gezeichneten Platzhaltern + WebAudio-Effekte"
```

---

### Task 10: Wiese-Screen (world.js) — Rendering, Bewegung, Raschel-Spawns

**Files:**
- Create: `js/world.js`
- Manuelle Abnahme (Browser); nutzt getestete PURE-Module.

**Interfaces:**
- Consumes: `stepPlayer/hitsGrass/atHouseDoor` (movement), `pickSpawnId` (spawn), `getSprite/wobbleOffset` (sprites), Konstanten aus config.
- Produces: `makeWorld({ canvas, ctx, audio, onEncounter, onEnterHouse })` → `{ update(dt), draw(), onPointer(x,y), setKeys(keyset), reset() }`.
  - Layout: Haus-Zone oben (y < 180) mit Tür-Rechteck `door={x:200,y:120,w:80,h:60}`; Wiese darunter. Spieler-Bounds `{minX:30,minY:200,maxX:450,maxY:770}`.
  - Spawns: bis `MAX_ACTIVE_SPAWNS` Raschel-Stellen `{x,y,id,phase}`, neuer Versuch alle `SPAWN_INTERVAL` s (Position zufällig in Wiese, id via `pickSpawnId`).
  - Läuft Spieler in ein Raschel-Feld (`hitsGrass`, Radius `GRASS_HIT_RADIUS`) → `onEncounter(id)`. Läuft er in `door` → `onEnterHouse()`.
  - Touch/Maus: Tippen setzt Lauf-Ziel. Tastatur: Pfeile/WASD setzen Richtung.

- [ ] **Step 1: Implement world.js**

`js/world.js`:
```js
import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_ACTIVE_SPAWNS,
         SPAWN_INTERVAL, GRASS_HIT_RADIUS } from "./config.js";
import { stepPlayer, hitsGrass, atHouseDoor } from "./movement.js";
import { pickSpawnId } from "./spawn.js";
import { getSprite, wobbleOffset } from "./sprites.js";

const DOOR = { x: 200, y: 120, w: 80, h: 60 };
const BOUNDS = { minX: 30, minY: 200, maxX: 450, maxY: 770 };

export function makeWorld({ ctx, audio, onEncounter, onEnterHouse }) {
  let player = { x: 240, y: 500 };
  let target = { x: 240, y: 500 };
  let keys = new Set();
  let spawns = [];
  let spawnTimer = 0;
  let t = 0;

  function reset() {
    player = { x: 240, y: 500 }; target = { ...player };
    spawns = []; spawnTimer = 0;
  }

  function trySpawn() {
    if (spawns.length >= MAX_ACTIVE_SPAWNS) return;
    const x = 60 + Math.random() * (VIRTUAL_W - 120);
    const y = 230 + Math.random() * (VIRTUAL_H - 300);
    spawns.push({ x, y, id: pickSpawnId(), phase: Math.random() * 6 });
  }

  function keyTarget() {
    let dx = 0, dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
    if (dx || dy) target = { x: player.x + dx * 40, y: player.y + dy * 40 };
  }

  function update(dt) {
    t += dt;
    keyTarget();
    player = stepPlayer(player, target, PLAYER_SPEED, dt, BOUNDS);
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) { spawnTimer = 0; trySpawn(); }
    // Tür?
    if (atHouseDoor(player, DOOR)) { onEnterHouse(); return; }
    // Begegnung?
    for (const s of spawns) {
      if (hitsGrass(player, s, GRASS_HIT_RADIUS)) {
        audio.play("encounter");
        const id = s.id;
        spawns = spawns.filter(x => x !== s);
        onEncounter(id);
        return;
      }
    }
  }

  function draw() {
    // Wiese
    ctx.fillStyle = "#7ec850"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    // Haus oben
    ctx.fillStyle = "#c98b52"; ctx.fillRect(160, 40, 160, 120);
    ctx.fillStyle = "#8a3b2f"; // Dach
    ctx.beginPath(); ctx.moveTo(150, 40); ctx.lineTo(240, 0); ctx.lineTo(330, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#5b2a1e"; ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h); // Tür
    // Raschel-Gras (wackelnde Büschel + Funkeln)
    for (const s of spawns) {
      const w = Math.sin(t * 12 + s.phase) * 6;
      ctx.strokeStyle = "#3f8f2f"; ctx.lineWidth = 6; ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + i * 12, s.y + 18);
        ctx.lineTo(s.x + i * 12 + w, s.y - 14);
        ctx.stroke();
      }
      // Funkeln
      ctx.fillStyle = "rgba(255,255,180," + (0.5 + 0.5 * Math.sin(t * 8 + s.phase)) + ")";
      ctx.beginPath(); ctx.arc(s.x + 16, s.y - 18, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Spieler (einfache gezeichnete Figur, kein Emoji)
    ctx.fillStyle = "#3355cc";
    ctx.beginPath(); ctx.arc(player.x, player.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd9b3";
    ctx.beginPath(); ctx.arc(player.x, player.y - 8, 9, 0, Math.PI * 2); ctx.fill();
  }

  return {
    update, draw, reset,
    onPointer(x, y) { target = { x, y }; },
    setKeys(k) { keys = k; },
  };
}
```

- [ ] **Step 2: Manuelle Browser-Abnahme (nach Task 12 verdrahtet)**

Checkliste (im Browser, nach Wiring): Figur folgt Tipp/Pfeiltasten; bleibt in Wiesen-Grenzen; Gras raschelt an 1–2 Stellen; Reinlaufen ins Gras löst Begegnung aus; Reinlaufen in die Tür öffnet Haus.

- [ ] **Step 3: Commit**

```bash
git add js/world.js
git commit -m "feat: Wiese-Screen mit Bewegung, raschelndem Gras und Begegnungen"
```

---

### Task 11: Fang-Screen (catchscreen.js) — Power-Leiste, Wurf, Feuerwerk

**Files:**
- Create: `js/catchscreen.js`
- Manuelle Abnahme (Browser); nutzt `markerPos`, `attemptCatch`, `greenZone`.

**Interfaces:**
- Consumes: `markerPos` (powerbar), `attemptCatch/greenZone` (catch), `getSprite/wobbleOffset` (sprites), `POKEMON`-Lookup für rarity, `POWERBAR_PERIOD`.
- Produces: `makeCatchScreen({ ctx, audio, onResult })` → `{ start(id), update(dt), draw(), onTap() }`.
  - `start(id)`: Begegnung beginnt, Phase `aim` (Marker läuft).
  - `onTap()` in Phase `aim`: Marker stoppen → `attemptCatch(pos, rarity)` → Phase `success` (Feuerwerk-Partikel + `audio.play("caught")`) oder `fail` (`audio.play("flee")`).
  - Nach kurzer Ergebnis-Animation ruft es `onResult({ id, caught })` und der Screen wird verlassen.
  - Feuerwerk: einfaches Partikelsystem (Position, Geschwindigkeit, Lebenszeit, Farbe), nur bei Erfolg.

- [ ] **Step 1: Implement catchscreen.js**

`js/catchscreen.js`:
```js
import { VIRTUAL_W, VIRTUAL_H, POWERBAR_PERIOD } from "./config.js";
import { markerPos } from "./powerbar.js";
import { attemptCatch, greenZone } from "./catch.js";
import { getSprite, wobbleOffset } from "./sprites.js";
import { POKEMON } from "./data.js";

const BAR = { x: 380, y: 200, w: 44, h: 400 }; // vertikale Leiste
const BALL = { x: 240, y: 690, r: 46 };

export function makeCatchScreen({ ctx, audio, onResult }) {
  let id = 1, rarity = "common";
  let phase = "aim";       // aim | success | fail
  let t = 0, resultT = 0;
  let markerT = 0, pos = 0;
  let particles = [];

  function start(newId) {
    id = newId;
    rarity = (POKEMON.find(p => p.id === id) || {}).rarity || "common";
    phase = "aim"; t = 0; markerT = 0; pos = 0; resultT = 0; particles = [];
  }

  function spawnFireworks() {
    particles = [];
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      particles.push({
        x: VIRTUAL_W / 2, y: 300,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, hue: Math.floor(Math.random() * 360),
      });
    }
  }

  function onTap() {
    if (phase !== "aim") return;
    pos = markerPos(markerT, POWERBAR_PERIOD);
    const caught = attemptCatch(pos, rarity);
    phase = caught ? "success" : "fail";
    resultT = 0;
    if (caught) { audio.play("caught"); spawnFireworks(); }
    else { audio.play("flee"); }
  }

  function update(dt) {
    t += dt;
    if (phase === "aim") { markerT += dt; return; }
    resultT += dt;
    if (phase === "success") {
      for (const p of particles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.life -= dt * 0.7;
      }
      particles = particles.filter(p => p.life > 0);
    }
    if (resultT > 1.6) onResult({ id, caught: phase === "success" });
  }

  function draw() {
    // Hintergrund (Begegnungs-Szene)
    ctx.fillStyle = "#bfe89a"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    ctx.fillStyle = "#9bd36f"; ctx.fillRect(0, 470, VIRTUAL_W, VIRTUAL_H - 470);
    // Wildes Pokémon groß, mit Wackeln
    const wob = wobbleOffset(t, id);
    const spr = getSprite(id);
    const size = 200;
    const shake = phase === "fail" ? Math.sin(t * 40) * 6 : 0;
    ctx.drawImage(spr, VIRTUAL_W / 2 - size / 2 + wob.dx + shake, 240 + wob.dy, size, size);
    // Power-Leiste
    const g = greenZone(rarity);
    ctx.fillStyle = "#ddd"; ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
    // rot->grün Verlauf
    const grad = ctx.createLinearGradient(0, BAR.y + BAR.h, 0, BAR.y);
    grad.addColorStop(0, "#e05a5a"); grad.addColorStop(1, "#5ad06a");
    ctx.fillStyle = grad; ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
    // grüne Zielzone hervorheben
    const zoneTopY = BAR.y + (1 - g.to) * BAR.h;
    const zoneH = (g.to - g.from) * BAR.h;
    ctx.strokeStyle = "#0a5"; ctx.lineWidth = 4;
    ctx.strokeRect(BAR.x - 2, zoneTopY, BAR.w + 4, zoneH);
    // Marker
    const mp = phase === "aim" ? markerPos(markerT, POWERBAR_PERIOD) : pos;
    const my = BAR.y + (1 - mp) * BAR.h;
    ctx.fillStyle = "#222"; ctx.fillRect(BAR.x - 8, my - 4, BAR.w + 16, 8);
    // Ball-Button (gezeichnet, kein Text)
    ctx.fillStyle = "#e03b3b";
    ctx.beginPath(); ctx.arc(BALL.x, BALL.y, BALL.r, 0, Math.PI, true); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(BALL.x, BALL.y, BALL.r, 0, Math.PI, false); ctx.fill();
    ctx.strokeStyle = "#222"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(BALL.x, BALL.y, BALL.r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BALL.x - BALL.r, BALL.y); ctx.lineTo(BALL.x + BALL.r, BALL.y); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(BALL.x, BALL.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    // Feuerwerk
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = `hsl(${p.hue},100%,60%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return { start, update, draw, onTap, ballHit(x, y) {
    return Math.hypot(x - BALL.x, y - BALL.y) <= BALL.r;
  }};
}
```

- [ ] **Step 2: Manuelle Browser-Abnahme (nach Task 12)**

Checkliste: Marker fährt hoch/runter; Tippen auf Ball stoppt ihn; hoch getroffen → oft gefangen mit Feuerwerk + Ton; niedrig/selten → flieht (Pokémon wackelt weg) + Ton; danach zurück zur Wiese; **nirgends Text/Zahlen**.

- [ ] **Step 3: Commit**

```bash
git add js/catchscreen.js
git commit -m "feat: Fang-Screen mit Power-Leiste, einem Wurf und Feuerwerk"
```

---

### Task 12: Haus-Screen + Verdrahtung/Game-Loop (main.js)

**Files:**
- Create: `js/housescreen.js`
- Modify: `js/main.js` (ersetzt den Stub aus Task 1)
- Manuelle Abnahme (Browser).

**Interfaces:**
- Consumes: alle Screens + `makeStorage`, `makeAudio`, `loadSprites`, `getSlots`, `getSprite`.
- Produces:
  - `housescreen.js`: `makeHouseScreen({ ctx, storage })` → `{ draw(), onTap(x,y) → "back"|null }`. Zeichnet 10 Slots (2×5). Gefangen → `getSprite(id)`, sonst grauer Schatten mit gezeichneter „?"-Form. Ein gezeichneter Zurück-Pfeil oben links; Tap darauf gibt `"back"`.
  - `main.js`: Zustandsmaschine `screen ∈ {world,catch,house}`, `requestAnimationFrame`-Loop mit `dt`, Skalierung Bildschirm→virtuelle Koordinaten, Pointer-/Keyboard-Dispatch, Verkabelung der Callbacks (`onEncounter`→catch, `onResult`→addCaught + zurück zu world, `onEnterHouse`→house), Lautsprecher-Symbol oben rechts (toggle).

- [ ] **Step 1: Implement housescreen.js**

`js/housescreen.js`:
```js
import { VIRTUAL_W, VIRTUAL_H } from "./config.js";
import { getSlots } from "./collection.js";
import { getSprite } from "./sprites.js";

const BACK = { x: 20, y: 20, w: 70, h: 70 };

export function makeHouseScreen({ ctx, storage }) {
  function draw() {
    ctx.fillStyle = "#5b3a24"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H); // Innenraum
    ctx.fillStyle = "#7a5233"; ctx.fillRect(0, 120, VIRTUAL_W, VIRTUAL_H - 120);
    // Zurück-Pfeil (gezeichnet)
    ctx.fillStyle = "#ffcf5a"; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
    ctx.strokeStyle = "#5b3a24"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(BACK.x + 48, BACK.y + 20); ctx.lineTo(BACK.x + 22, BACK.y + 35);
    ctx.lineTo(BACK.x + 48, BACK.y + 50); ctx.stroke();
    // 10 Slots, 2 Spalten x 5 Reihen
    const slots = getSlots(storage.loadCaught());
    const cols = 2, cellW = 200, cellH = 120, ox = 40, oy = 150;
    slots.forEach((s, i) => {
      const cx = ox + (i % cols) * (cellW + 10);
      const cy = oy + Math.floor(i / cols) * (cellH + 5);
      ctx.fillStyle = "#3f2817"; ctx.fillRect(cx, cy, cellW, cellH); // Regalfach
      if (s.caught) {
        ctx.drawImage(getSprite(s.id), cx + cellW / 2 - 48, cy + 12, 96, 96);
      } else {
        ctx.fillStyle = "#2a1a0f";
        ctx.beginPath(); ctx.arc(cx + cellW / 2, cy + 60, 40, 0, Math.PI * 2); ctx.fill();
        // gezeichnetes "?" (Kurve + Punkt), kein Textzeichen
        ctx.strokeStyle = "#6b5238"; ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(cx + cellW / 2, cy + 48, 14, Math.PI * 0.8, Math.PI * 2.1);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + cellW / 2, cy + 62); ctx.lineTo(cx + cellW / 2, cy + 74); ctx.stroke();
        ctx.fillStyle = "#6b5238";
        ctx.beginPath(); ctx.arc(cx + cellW / 2, cy + 86, 5, 0, Math.PI * 2); ctx.fill();
      }
    });
  }
  function onTap(x, y) {
    if (x >= BACK.x && x <= BACK.x + BACK.w && y >= BACK.y && y <= BACK.y + BACK.h) return "back";
    return null;
  }
  return { draw, onTap };
}
```

- [ ] **Step 2: Implement main.js (ersetzt Stub)**

`js/main.js`:
```js
import { VIRTUAL_W, VIRTUAL_H } from "./config.js";
import { makeStorage } from "./storage.js";
import { makeAudio } from "./audio.js";
import { loadSprites } from "./sprites.js";
import { makeWorld } from "./world.js";
import { makeCatchScreen } from "./catchscreen.js";
import { makeHouseScreen } from "./housescreen.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const storage = makeStorage(localStorage);
const audio = makeAudio(storage);

const SND = { x: VIRTUAL_W - 84, y: 20, w: 64, h: 64 };

let screen = "world";
const world = makeWorld({
  ctx, audio,
  onEncounter: id => { catchScreen.start(id); screen = "catch"; },
  onEnterHouse: () => { screen = "house"; },
});
const catchScreen = makeCatchScreen({
  ctx, audio,
  onResult: ({ id, caught }) => { if (caught) storage.addCaught(id); world.reset(); screen = "world"; },
});
const house = makeHouseScreen({ ctx, storage });

// Eingabe: Bildschirm- in virtuelle Koordinaten
function toVirtual(ev) {
  const r = canvas.getBoundingClientRect();
  const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
  const py = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
  return { x: px / r.width * VIRTUAL_W, y: py / r.height * VIRTUAL_H };
}
function inSpeaker(x, y) { return x >= SND.x && x <= SND.x + SND.w && y >= SND.y && y <= SND.y + SND.h; }

function handleTap(ev) {
  ev.preventDefault();
  const { x, y } = toVirtual(ev);
  if (inSpeaker(x, y)) { audio.toggle(); return; }
  if (screen === "world") world.onPointer(x, y);
  else if (screen === "catch") { if (catchScreen.ballHit(x, y)) catchScreen.onTap(); }
  else if (screen === "house") { if (house.onTap(x, y) === "back") screen = "world"; }
}
canvas.addEventListener("mousedown", handleTap);
canvas.addEventListener("touchstart", handleTap, { passive: false });

const keys = new Set();
window.addEventListener("keydown", e => { keys.add(e.key); world.setKeys(keys);
  if (screen === "catch" && (e.key === " " || e.key === "Enter")) catchScreen.onTap(); });
window.addEventListener("keyup", e => { keys.delete(e.key); world.setKeys(keys); });

function drawSpeaker() {
  ctx.fillStyle = audio.isOn() ? "#2b8a3e" : "#888";
  ctx.fillRect(SND.x, SND.y, SND.w, SND.h);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(SND.x + 18, SND.y + 26); ctx.lineTo(SND.x + 30, SND.y + 26);
  ctx.lineTo(SND.x + 42, SND.y + 14); ctx.lineTo(SND.x + 42, SND.y + 50);
  ctx.lineTo(SND.x + 30, SND.y + 38); ctx.lineTo(SND.x + 18, SND.y + 38); ctx.closePath(); ctx.fill();
  if (!audio.isOn()) {
    ctx.strokeStyle = "#c00"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(SND.x + 14, SND.y + 14); ctx.lineTo(SND.x + 52, SND.y + 52); ctx.stroke();
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (screen === "world") { world.update(dt); world.draw(); }
  else if (screen === "catch") { catchScreen.update(dt); catchScreen.draw(); }
  else if (screen === "house") { house.draw(); }
  drawSpeaker();
  requestAnimationFrame(loop);
}

loadSprites(() => { last = performance.now(); requestAnimationFrame(loop); });
```

- [ ] **Step 3: Voll-Abnahme im Browser**

Lokalen Server starten und öffnen:
```bash
python -m http.server 8080
```
Öffne `http://localhost:8080/`. Checkliste:
- Wiese: Figur folgt Tipp/Pfeilen, bleibt in Grenzen; Gras raschelt; ins Gras → Fang-Screen; in die Tür → Haus.
- Fang: Marker fährt; Ball-Tap/Leertaste stoppt; hoch = oft Fang + Feuerwerk + Ton; selten/niedrig = flieht + Ton; zurück zur Wiese.
- Haus: gefangene als Bild, Rest als Schatten mit „?"; Zurück-Pfeil führt zur Wiese.
- Lautsprecher oben rechts schaltet Ton stumm/an.
- Neu laden → gefangene Pokémon sind noch im Haus (localStorage).
- **Nirgends Text, Zahlen oder Namen.**

- [ ] **Step 4: Commit**

```bash
git add js/housescreen.js js/main.js
git commit -m "feat: Haus-Screen + Game-Loop, Screen-Zustandsmaschine, Input, Sound-Toggle"
```

---

### Task 13: README + GitHub-Pages-Deploy

**Files:**
- Create: `README.md` (ersetzt Default), `.nojekyll`

**Interfaces:**
- Consumes: fertige App.
- Produces: Deploy-Anleitung; GitHub Pages liefert die statischen Dateien vom `main`-Branch (Root).

- [ ] **Step 1: README + .nojekyll schreiben**

`README.md`:
```markdown
# Pokémon Kids

Winziges, text-freies Pokémon-Sammelspiel für kleine Kinder (die noch nicht lesen).
Über die Wiese laufen, dem raschelnden Gras folgen, mit einem Wurf fangen (Timing der
Power-Leiste), im Haus alle 10 sammeln. Touch **und** Tastatur. Speichert im Browser.

## Lokal starten
```
python -m http.server 8080
# dann http://localhost:8080/
```

## Eigene Sprites einsetzen
Lege 10 transparente PNGs unter `assets/pokemon/` ab: `01.png` … `10.png`.
Fehlt eins, zeichnet das Spiel automatisch einen bunten Platzhalter.

## Tests
```
npm test
```
```

`.nojekyll`: leere Datei (verhindert Jekyll-Verarbeitung auf GitHub Pages).

- [ ] **Step 2: Commit**

```bash
git add README.md .nojekyll
git commit -m "docs: README + .nojekyll für GitHub Pages"
```

- [ ] **Step 3: Push + Pages aktivieren**

```bash
git push origin main
gh api -X POST repos/pluviodev/pokemon-kids/pages -f source[branch]=main -f source[path]=/ 2>/dev/null || echo "Pages ggf. manuell im Repo-Setting aktivieren"
```
Danach ist das Spiel unter `https://pluviodev.github.io/pokemon-kids/` erreichbar (Aktivierung kann 1–2 Min. dauern).

---

## Self-Review-Notiz

- **Spec-Abdeckung:** Wiese/Rumlaufen (T10), raschelndes Gras als Wegweiser (T10), Fang-Screen mit Power-Leiste + ein Wurf (T3,T6,T11), Feuerwerk/Konfetti/Ton (T9,T11), Haus mit 10 Slots + Schatten (T7,T12), text-frei/keine Emojis (durchgängig, Global Constraints), Touch+Tastatur (T12), Speichern (T8,T12), 10 Pokémon + Seltenheit (T2,T3,T4) — alle abgedeckt.
- **Typen-Konsistenz:** `getSprite/wobbleOffset` (sprites), `pickSpawnId` (spawn), `markerPos` (powerbar), `catchChance/attemptCatch/greenZone` (catch), `getSlots` (collection), `makeStorage`-API — über alle Tasks identisch benannt/verwendet.
- **Platzhalter:** keine offenen TODO/TBD; jeder Code-Schritt zeigt vollständigen Code.
