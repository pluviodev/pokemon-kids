# Pokémon Kids — Beeren, Spielfeld & Ball (Paket 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beeren auf der Wiese sammeln → Glas füllt sich → bei 20 wird per Feuerwerk-Popup ein Spiel freigeschaltet; ein Spiel-Knopf führt aufs Spielfeld mit unterer Modus-Leiste, wo Spiel 1 (Ball-Apportieren) spielbar ist.

**Architecture:** Reine Freischalt-Logik in `js/toys.js` (getestet). Beeren-/Spiel-Zustand persistiert in `storage.js`. `world.js` bekommt seltene Beeren-Spawns + Glas-HUD. Neuer `js/playscreen.js` zeichnet Feld + untere Leiste + Ball-Apportieren (nutzt `follow.js`). `main.js` verdrahtet Spiel-Knopf, Freischalt-Popup und Screen-Routing.

**Tech Stack:** Vanilla JS ES-Module, Canvas, kein Build. Tests: `node --test` (`npm test`). Assets: Python + Pillow (`tools/process_assets.py`).

## Global Constraints

- **Kein Lesen nötig** — Bild/Ton/Animation. Beere = gezeichneter Canvas-Platzhalter (kein Asset).
- **Bestehendes Verhalten bleibt** — alle 48 vorhandenen Tests grün.
- **Virtuelle Auflösung:** `S = VIRTUAL_W = 900`, quadratisch; Koordinaten als Bruchteile von `S`.
- **Ball-Asset:** `Sprites/ball.png` → `assets/playball.png`. **`assets/ball.png` (Fang-Pokéball) NICHT überschreiben.**
- **Beeren + freigeschaltete Spiele persistieren** über Levelaufstieg; nur `reset()` (Neues Spiel) leert sie.
- **Buttons nie im spielbaren Feld** — Modus-Buttons + rotes X leben in der unteren Leiste (y ≥ `0.86·S`).
- **Commit-Sprache:** Deutsch, `feat:`/`refactor:`. Kein Push (macht jh).
- Tests: `npm test` im Projektwurzelverzeichnis `Desktop/Claude Projects/Pokemon Kids`.

---

### Task 1: `toys.js` — Freischalt-Logik (DOM-frei, getestet)

**Files:**
- Create: `js/toys.js`
- Create: `tests/toys.test.js`

**Interfaces:**
- Produces:
  - `TOYS` — Array `[{ id:"ball", icon:"playball" }]`
  - `BERRIES_PER_TOY` = 20
  - `collectBerry(berries, unlocked)` → `{ berries, unlocked, unlockedToy }` (unlockedToy = neu freigeschaltetes Toy-Objekt oder null)
  - `unlockedToys(unlocked)` → Array der ersten `unlocked` Toys

- [ ] **Step 1: Write the failing test**

`tests/toys.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { TOYS, BERRIES_PER_TOY, collectBerry, unlockedToys } from "../js/toys.js";

test("collectBerry zählt hoch ohne Freischaltung unter der Schwelle", () => {
  const r = collectBerry(0, 0);
  assert.deepEqual(r, { berries: 1, unlocked: 0, unlockedToy: null });
});

test("collectBerry schaltet bei der Schwelle frei und setzt zurück", () => {
  const r = collectBerry(BERRIES_PER_TOY - 1, 0);
  assert.equal(r.berries, 0);
  assert.equal(r.unlocked, 1);
  assert.deepEqual(r.unlockedToy, TOYS[0]);
});

test("collectBerry tut nichts mehr, wenn alle Spiele frei sind", () => {
  const r = collectBerry(0, TOYS.length);
  assert.deepEqual(r, { berries: 0, unlocked: TOYS.length, unlockedToy: null });
});

test("unlockedToys gibt die ersten n Toys", () => {
  assert.deepEqual(unlockedToys(0), []);
  assert.deepEqual(unlockedToys(1), [TOYS[0]]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/toys.js'`

- [ ] **Step 3: Write `js/toys.js`**

```js
// Freischaltbare Spiele + Beeren-Freischalt-Logik (DOM-frei, testbar).
export const BERRIES_PER_TOY = 20;

export const TOYS = [
  { id: "ball", icon: "playball" },   // Paket 2/3 hängen hier "fussball"/"fangen" an
];

// Eine Beere dazu -> neuer Zustand + evtl. neu freigeschaltetes Toy (sonst null).
export function collectBerry(berries, unlocked) {
  if (unlocked >= TOYS.length) return { berries, unlocked, unlockedToy: null };
  const b = berries + 1;
  if (b >= BERRIES_PER_TOY) return { berries: 0, unlocked: unlocked + 1, unlockedToy: TOYS[unlocked] };
  return { berries: b, unlocked, unlockedToy: null };
}

export function unlockedToys(unlocked) {
  return TOYS.slice(0, unlocked);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 4 neue toys-Tests grün, alle bisherigen grün.

- [ ] **Step 5: Commit**

```bash
git add js/toys.js tests/toys.test.js
git commit -m "feat: toys.js — Beeren-Freischalt-Logik (collectBerry/TOYS)"
```

---

### Task 2: `storage.js` — Beeren + freigeschaltete Spiele

**Files:**
- Modify: `js/storage.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Consumes: `collectBerry` aus `toys.js` (importiert als `toyCollect`).
- Produces:
  - `getBerries()` → int (0..19), `getToysUnlocked()` → int, `isPlayUnlocked()` → bool.
  - `collectBerry()` → `unlockedToy` (Objekt|null): erhöht/speichert Beeren+Spiele, gibt neu freigeschaltetes Toy zurück.
  - `setCompanion(id)` wird **öffentlich** (im return-Objekt).
  - `reset()` leert zusätzlich Beeren+Spiele; `advanceLevel()` lässt sie unberührt.

- [ ] **Step 1: Write the failing tests** (an `tests/storage.test.js` anhängen)

```js
import { TOYS } from "../js/toys.js";

test("Beeren zählen hoch und schalten bei 20 ein Spiel frei", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.getBerries(), 0);
  assert.equal(s.isPlayUnlocked(), false);
  let unlocked = null;
  for (let i = 0; i < 20; i++) unlocked = s.collectBerry();
  assert.deepEqual(unlocked, TOYS[0]);          // 20. Beere schaltet frei
  const s2 = makeStorage(b);
  assert.equal(s2.getToysUnlocked(), 1);
  assert.equal(s2.getBerries(), 0);
  assert.equal(s2.isPlayUnlocked(), true);
});

test("reset leert Beeren + Spiele, advanceLevel behält sie", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  for (let i = 0; i < 20; i++) s.collectBerry();  // 1 Spiel frei
  s.collectBerry(); s.collectBerry();             // 2 Beeren
  s.advanceLevel();
  const s2 = makeStorage(b);
  assert.equal(s2.getToysUnlocked(), 1);          // bleibt über Level
  assert.equal(s2.getBerries(), 2);
  s2.reset();
  const s3 = makeStorage(b);
  assert.equal(s3.getToysUnlocked(), 0);
  assert.equal(s3.getBerries(), 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `s.getBerries is not a function`

- [ ] **Step 3: Modify `js/storage.js`**

Ergänze die Import-Zeile oben (nach dem bestehenden `levels.js`-Import):
```js
import { collectBerry as toyCollect } from "./toys.js";
```

Nach `const COMPANION_KEY = "pk_companion";` einfügen:
```js
const BERRIES_KEY = "pk_berries";
const TOYS_KEY = "pk_toys";
```

Innerhalb `makeStorage`, nach `toggleCompanion`, einfügen:
```js
  function getBerries() { const n = parseInt(backend.getItem(BERRIES_KEY), 10); return Number.isInteger(n) && n > 0 ? n : 0; }
  function getToysUnlocked() { const n = parseInt(backend.getItem(TOYS_KEY), 10); return Number.isInteger(n) && n > 0 ? n : 0; }
  function isPlayUnlocked() { return getToysUnlocked() >= 1; }
  function collectBerry() {
    const r = toyCollect(getBerries(), getToysUnlocked());
    backend.setItem(BERRIES_KEY, String(r.berries));
    backend.setItem(TOYS_KEY, String(r.unlocked));
    return r.unlockedToy;
  }
```

In `reset()` vor dem schließenden `}` ergänzen:
```js
    backend.setItem(BERRIES_KEY, "0");
    backend.setItem(TOYS_KEY, "0");
```

Erweitere das `return`-Objekt um die neuen Funktionen **und** `setCompanion`:
```js
  return { loadCounts, getCount, addCatch, penaltyAll, isWon, setWon, reset,
           getLevel, setLevel, advanceLevel, getCompanion, setCompanion, toggleCompanion,
           getBerries, getToysUnlocked, isPlayUnlocked, collectBerry, isSoundOn, setSound };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — neue Storage-Tests grün, alle bisherigen grün (advanceLevel/reset lassen bestehendes Verhalten intakt).

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat: storage — Beeren + freigeschaltete Spiele (bleiben über Level, reset leert)"
```

---

### Task 3: Assets — Spielfeld + Ball + Vorladen

**Files:**
- Modify: `tools/process_assets.py`
- Modify: `js/sprites.js`

**Interfaces:**
- Produces (Dateien): `assets/playfield.png`, `assets/playball.png`. `getImg("playfield")` / `getImg("playball")` liefern die Bilder.

- [ ] **Step 1: `tools/process_assets.py` erweitern**

Am Ende von `tools/process_assets.py` anfügen:
```python
# Spielfeld (Fußballfeld) -> playfield.png
pf = Image.open(os.path.join(SRC, "spielfeld.png")).convert("RGBA")
pf = fit(pf, 900)
pf.save(os.path.join(OUT, "playfield.png"))
print("playfield", pf.size)

# Spiel-Ball (rot-gelb) -> playball.png (weißer Hintergrund per Flood-Fill freistellen).
# NICHT assets/ball.png (Fang-Pokéball) überschreiben!
pb = fit(cutout_flood(Image.open(os.path.join(SRC, "ball.png")), tol=45), 200)
pb.save(os.path.join(OUT, "playball.png"))
print("playball", pb.size)
```

- [ ] **Step 2: Pipeline ausführen**

Run: `python tools/process_assets.py`
Expected: Zeilen `playfield (900, 900)` und `playball (…)` ohne Fehler.

- [ ] **Step 3: Dateien + Freistellung prüfen**

Run: `ls assets/playfield.png assets/playball.png`
Expected: beide existieren. Öffne `assets/playball.png` im Betrachter — Ball freigestellt (Hintergrund transparent), rot-gelb erhalten. Falls weißer Rand bleibt: `tol=45` → `tol=55` erhöhen und Step 2 wiederholen.

- [ ] **Step 4: `js/sprites.js` — Assets vorladen**

In `js/sprites.js` das `MANIFEST`-Array um zwei Einträge ergänzen (nach der `grass2`-Zeile):
```js
  ["playfield", "assets/playfield.png"],
  ["playball", "assets/playball.png"],
```

- [ ] **Step 5: Verify no test regressions + Asset-404-Check**

Run: `npm test`
Expected: PASS (sprites-Logik unverändert).
Run: `python -m http.server 8080`, `http://localhost:8080/?neu`, Konsole → keine 404 für `playfield.png`/`playball.png`.

- [ ] **Step 6: Commit**

```bash
git add tools/process_assets.py js/sprites.js assets/playfield.png assets/playball.png
git commit -m "feat: Assets Spielfeld + Spiel-Ball erzeugt und vorgeladen"
```

---

### Task 4: `world.js` — Beeren-Spawns + Glas-HUD

**Files:**
- Modify: `js/world.js`

**Interfaces:**
- Consumes: `storage.collectBerry()`, `storage.getBerries()`.
- Produces: `makeWorld({..., onBerry})` — `onBerry(unlockedToy)` wird beim Einsammeln aufgerufen (unlockedToy = Objekt|null).

- [ ] **Step 1: `onBerry` in die Factory aufnehmen**

Ändere die Signatur:
```js
export function makeWorld({ ctx, audio, storage, onEncounter, onEnterHouse }) {
```
zu:
```js
export function makeWorld({ ctx, audio, storage, onEncounter, onEnterHouse, onBerry }) {
```

- [ ] **Step 2: Seltene Beeren-Spawns in `trySpawn`**

In `trySpawn`, ersetze:
```js
    if (spawns.length >= MAX_ACTIVE_SPAWNS) return;
    const x = 0.14 * S + Math.random() * 0.72 * S;
    const y = 0.34 * S + Math.random() * 0.56 * S;
    spawns.push({ x, y, id: pickSpawnId(Math.random, counts, pool, bossId), phase: Math.random() * 6 });
```
durch:
```js
    // selten eine Beere (viel seltener als Gras), unabhängig vom Gras-Limit, max 1
    if (!spawns.some(s => s.berry) && Math.random() < 0.12) {
      spawns.push({ x: 0.14 * S + Math.random() * 0.72 * S, y: 0.34 * S + Math.random() * 0.56 * S, berry: true, phase: Math.random() * 6 });
    }
    if (spawns.filter(s => !s.berry).length >= MAX_ACTIVE_SPAWNS) return;
    const x = 0.14 * S + Math.random() * 0.72 * S;
    const y = 0.34 * S + Math.random() * 0.56 * S;
    spawns.push({ x, y, id: pickSpawnId(Math.random, counts, pool, bossId), phase: Math.random() * 6 });
```

- [ ] **Step 3: Beeren einsammeln statt fangen (in `update`)**

Ersetze in `update` den Treffer-Block:
```js
    for (const s of spawns) {
      const rad = s.boss ? GRASS_HIT_RADIUS * 1.8 : GRASS_HIT_RADIUS;
      if (hitsGrass(player, s, rad)) {
        audio.play("encounter");
        const id = s.id;
        spawns = spawns.filter(x => x !== s);
        onEncounter(id);
        return;
      }
    }
```
durch:
```js
    for (const s of spawns) {
      const rad = s.boss ? GRASS_HIT_RADIUS * 1.8 : GRASS_HIT_RADIUS;
      if (hitsGrass(player, s, rad)) {
        spawns = spawns.filter(x => x !== s);
        if (s.berry) {
          audio.play("caught");
          onBerry(storage.collectBerry());     // Beere einsammeln (kein Fang-Screen)
        } else {
          audio.play("encounter");
          onEncounter(s.id);
        }
        return;
      }
    }
```

- [ ] **Step 4: Beere zeichnen + Glas-HUD (in `draw`)**

Füge in `draw()`, unmittelbar vor der `for (const s of spawns)`-Zeichenschleife, eine lokale `drawBerry`-Funktion ein:
```js
    function drawBerry(s) {
      const sway = Math.sin(t * 3 + s.phase) * 0.08;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(sway);
      ctx.fillStyle = "#d63a4a"; ctx.strokeStyle = "#7a1420"; ctx.lineWidth = 3;
      for (const dx of [-0.018 * S, 0.018 * S]) {
        ctx.beginPath(); ctx.arc(dx, 0, 0.028 * S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = "#3aa03a";
      ctx.beginPath(); ctx.ellipse(0, -0.03 * S, 0.02 * S, 0.01 * S, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
```
Ersetze die Zeichenschleife:
```js
    for (const s of spawns) {
      drawGrass(s, s.boss ? 0.26 * S : 0.13 * S, s.boss ? 9 : 5);
    }
```
durch:
```js
    for (const s of spawns) {
      if (s.berry) drawBerry(s);
      else drawGrass(s, s.boss ? 0.26 * S : 0.13 * S, s.boss ? 9 : 5);
    }
```

Füge am **Ende** von `draw()` (nach dem Spielfigur-Block, vor dem schließenden `}`) das Glas-HUD ein:
```js
    // Glas unten-links: Beeren-Fortschritt 0..20
    const jx = 0.05 * S, jy = 0.79 * S, jw = 0.09 * S, jh = 0.14 * S;
    const p = Math.min(1, storage.getBerries() / 20);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(jx, jy, jw, jh, 8); ctx.fill(); ctx.stroke();
    const innerH = jh - 8, fh = innerH * p;
    ctx.fillStyle = "#d63a4a";
    ctx.fillRect(jx + 4, jy + 4 + (innerH - fh), jw - 8, fh);
    ctx.restore();
```

- [ ] **Step 5: Browser-Verifikation**

Run: `python -m http.server 8080`, `http://localhost:8080/?neu`.
Auf der Wiese herumlaufen: gelegentlich erscheint eine **Beere** (rote Doppelbeere + Blatt); Drüberlaufen → *pling*, das **Glas** unten-links füllt sich. Karls/Boss unverändert.
(Zum schnellen Test: Konsole `for(let i=0;i<19;i++) {}` — oder einfach ein paar Beeren einsammeln.)
Expected: Beeren erscheinen selten, Einsammeln füllt das Glas, keine Fang-Screen bei Beeren.

- [ ] **Step 6: Verify no test regressions**

Run: `npm test`
Expected: PASS (world ist browser-only).

- [ ] **Step 7: Commit**

```bash
git add js/world.js
git commit -m "feat: Wiese — seltene Beeren einsammeln + Glas-HUD"
```

---

### Task 5: `playscreen.js` — Spielfeld + Modus-Leiste + Ball-Apportieren

**Files:**
- Create: `js/playscreen.js`

**Interfaces:**
- Consumes: `getImg`, `getSprite`, `playerFrame` (sprites.js), `pokemonForLevel` (levels.js), `followStep` (follow.js), `unlockedToys` (toys.js); `storage.getCompanion/setCompanion/getLevel/loadCounts/getToysUnlocked`.
- Produces: `makePlayScreen({ ctx, storage, audio, onExit })` → `{ enter, update, draw, onPointer }`.

- [ ] **Step 1: `js/playscreen.js` schreiben**

```js
import { VIRTUAL_W } from "./config.js";
import { getImg, getSprite, playerFrame } from "./sprites.js";
import { pokemonForLevel } from "./levels.js";
import { followStep } from "./follow.js";
import { unlockedToys } from "./toys.js";

const S = VIRTUAL_W;
const BAR_Y = 0.86 * S;                 // untere Leiste (opak); darüber = spielbar
const PLAYER = { x: 0.5 * S, y: 0.72 * S };
const BALL_R = 0.045 * S;
const THROW_TIME = 0.5;
const FETCH_SPEED = 340;
const NEAR = 0.05 * S;
const BTN = 0.10 * S;

const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function toyButtonRect(i) { return { x: 0.04 * S + i * (BTN + 0.02 * S), y: BAR_Y + (S - BAR_Y - BTN) / 2, w: BTN, h: BTN }; }
const XBTN = { x: S - 0.04 * S - BTN, y: BAR_Y + (S - BAR_Y - BTN) / 2, w: BTN, h: BTN };

export function makePlayScreen({ ctx, storage, audio, onExit }) {
  let mode = "ball";
  let companionId = null;
  let companion = { x: PLAYER.x, y: PLAYER.y };
  let ball = { x: PLAYER.x, y: PLAYER.y - 0.02 * S };
  let phase = "idle";                   // idle | thrown | fetch | carry
  let throwT = 0, from = null, to = null, t = 0;

  function pickCompanion() {
    if (storage.getCompanion() != null) return storage.getCompanion();
    const counts = storage.loadCounts();
    const caught = pokemonForLevel(storage.getLevel()).filter(p => (counts[p.id] || 0) > 0);
    if (caught.length === 0) return null;
    const id = caught[Math.floor(Math.random() * caught.length)].id;
    storage.setCompanion(id);
    return id;
  }

  function enter() {
    companionId = pickCompanion();
    companion = { x: PLAYER.x - 0.12 * S, y: PLAYER.y };
    ball = { x: PLAYER.x, y: PLAYER.y - 0.02 * S };
    phase = "idle"; throwT = 0; from = to = null;
    const toys = unlockedToys(storage.getToysUnlocked());
    mode = toys.length ? toys[0].id : "ball";
  }

  function throwBall(x, y) {
    if (phase !== "idle") return;
    if (companionId == null) { ball = { x: PLAYER.x, y: PLAYER.y - 0.02 * S }; return; }
    from = { ...ball };
    to = { x, y: Math.min(y, BAR_Y - 0.03 * S) };
    phase = "thrown"; throwT = 0; audio.play("throw");
  }

  function onPointer(x, y) {
    if (y >= BAR_Y) {                   // Leiste: nur Buttons/X, keine Spielaktion
      if (inRect(x, y, XBTN)) { onExit(); return; }
      const toys = unlockedToys(storage.getToysUnlocked());
      for (let i = 0; i < toys.length; i++) if (inRect(x, y, toyButtonRect(i))) { mode = toys[i].id; return; }
      return;
    }
    if (mode === "ball") throwBall(x, y);
  }

  function update(dt) {
    t += dt;
    if (phase === "thrown") {
      throwT += dt; const k = Math.min(1, throwT / THROW_TIME);
      ball = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 0.12 * S };
      if (k >= 1) phase = "fetch";
    } else if (phase === "fetch") {
      companion = followStep(companion, ball, FETCH_SPEED, dt, NEAR);
      if (Math.hypot(companion.x - ball.x, companion.y - ball.y) <= NEAR + 1) phase = "carry";
    } else if (phase === "carry") {
      companion = followStep(companion, PLAYER, FETCH_SPEED, dt, NEAR);
      ball = { x: companion.x, y: companion.y - 0.02 * S };
      if (Math.hypot(companion.x - PLAYER.x, companion.y - PLAYER.y) <= NEAR + 1) {
        phase = "idle"; ball = { x: PLAYER.x, y: PLAYER.y - 0.02 * S }; audio.play("caught");
      }
    }
  }

  function button(r, active, fill) {
    ctx.fillStyle = fill || (active ? "#3aa0d0" : "#5c5c72");
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, r.w * 0.22); ctx.fill(); ctx.stroke();
  }
  function drawX(r) {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = r.w * 0.12; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(r.x + 0.3 * r.w, r.y + 0.3 * r.h); ctx.lineTo(r.x + 0.7 * r.w, r.y + 0.7 * r.h);
    ctx.moveTo(r.x + 0.7 * r.w, r.y + 0.3 * r.h); ctx.lineTo(r.x + 0.3 * r.w, r.y + 0.7 * r.h);
    ctx.stroke();
  }

  function draw() {
    const field = getImg("playfield");
    if (field) ctx.drawImage(field, 0, 0, S, S);
    else { ctx.fillStyle = "#5aa84a"; ctx.fillRect(0, 0, S, S); }

    if (companionId != null) {
      const spr = getSprite(companionId);
      const h = 0.12 * S, ar = spr.width && spr.height ? spr.width / spr.height : 1;
      ctx.drawImage(spr, companion.x - h * ar / 2, companion.y - h, h * ar, h);
    }
    const fr = playerFrame("down", 0);
    if (fr.img) { const h = 0.15 * S, w = h * (fr.img.width / fr.img.height); ctx.drawImage(fr.img, PLAYER.x - w / 2, PLAYER.y - h + 14, w, h); }
    const b = getImg("playball");
    if (b) ctx.drawImage(b, ball.x - BALL_R, ball.y - BALL_R, BALL_R * 2, BALL_R * 2);

    // untere Leiste (opak) + Buttons + rotes X
    ctx.fillStyle = "#23232f"; ctx.fillRect(0, BAR_Y, S, S - BAR_Y);
    const toys = unlockedToys(storage.getToysUnlocked());
    toys.forEach((toy, i) => {
      const r = toyButtonRect(i); button(r, toy.id === mode);
      const ic = getImg(toy.icon);
      if (ic) ctx.drawImage(ic, r.x + 0.12 * r.w, r.y + 0.12 * r.h, r.w * 0.76, r.h * 0.76);
    });
    button(XBTN, false, "#c0392b"); drawX(XBTN);
  }

  return { enter, update, draw, onPointer };
}
```

- [ ] **Step 2: Syntaxcheck**

Run: `node --check js/playscreen.js`
Expected: kein Fehler.

- [ ] **Step 3: Commit**

```bash
git add js/playscreen.js
git commit -m "feat: playscreen — Spielfeld, Modus-Leiste, Ball-Apportieren"
```

---

### Task 6: `main.js` — Spiel-Knopf, Freischalt-Popup, Routing

**Files:**
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `makePlayScreen`, `storage.isPlayUnlocked()`, `getImg`, `world.reset()`.

- [ ] **Step 1: Imports + Screen/Popup-State**

Ergänze bei den Imports (nach `import { makeWinScreen } from "./win.js";`):
```js
import { makePlayScreen } from "./playscreen.js";
```
Stelle sicher, dass `getImg` aus sprites.js importiert ist; die bestehende Zeile
```js
import { loadAssets } from "./sprites.js";
```
ersetzen durch:
```js
import { loadAssets, getImg } from "./sprites.js";
```

Nach `let confirmReset = false;` einfügen:
```js
const BSZ2 = 0.10 * S;
const PLAY = { x: S - 0.03 * S - BSZ2, y: 0.5 * S - BSZ2 / 2, w: BSZ2, h: BSZ2 }; // Spiel-Knopf rechts
let popup = { active: false, icon: null, t: 0, parts: [] };
```

- [ ] **Step 2: `world`-Callback + `play`-Screen konstruieren**

Ergänze in der `makeWorld({ ... })`-Konstruktion den `onBerry`-Callback (nach `onEnterHouse: ...`):
```js
  onBerry: (unlockedToy) => { if (unlockedToy) showPopup(unlockedToy.icon); },
```

Nach der `win`-Konstruktion einfügen:
```js
const play = makePlayScreen({
  ctx, storage, audio,
  onExit: () => { world.reset(); screen = "world"; },
});
```

- [ ] **Step 3: Popup-Logik (Feuerwerk + Item-Bild)**

Nach den `YES`/`NO`-Rects (vor `handleTap`) einfügen:
```js
function showPopup(icon) {
  popup = { active: true, icon, t: 0, parts: [] };
  for (let i = 0; i < 80; i++) {
    const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 340;
    popup.parts.push({ x: S / 2, y: 0.4 * S, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hue: Math.floor(Math.random() * 360), life: 1 });
  }
  audio.play("caught");
}
function updatePopup(dt) {
  popup.t += dt;
  for (const p of popup.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt * 0.5; }
  popup.parts = popup.parts.filter(p => p.life > 0);
  if (popup.t > 2.5) popup.active = false;
}
function drawPopup() {
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, S, S);
  for (const p of popup.parts) {
    ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = `hsl(${p.hue},100%,60%)`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const ic = getImg(popup.icon);
  if (ic) { const h = 0.34 * S, w = h * (ic.width / ic.height); ctx.drawImage(ic, S / 2 - w / 2, 0.4 * S - h / 2, w, h); }
}
```

- [ ] **Step 4: Tap-Routing erweitern**

Ersetze in `handleTap` den Kopf:
```js
function handleTap(ev) {
  ev.preventDefault();
  const { x, y } = toVirtual(ev);
  if (confirmReset) {
```
durch:
```js
function handleTap(ev) {
  ev.preventDefault();
  const { x, y } = toVirtual(ev);
  if (popup.active) { popup.active = false; return; }   // Popup wegtippen
  if (screen === "play") { play.onPointer(x, y); return; }
  if (confirmReset) {
```

Ergänze im `world`-Zweig den Spiel-Knopf. Ersetze:
```js
  if (screen === "world") world.onPointer(x, y);
```
durch:
```js
  if (screen === "world") {
    if (storage.isPlayUnlocked() && inRect(x, y, PLAY)) { play.enter(); screen = "play"; return; }
    world.onPointer(x, y);
  }
```

- [ ] **Step 5: Spiel-Knopf zeichnen**

Nach `function drawNewGame() { ... }` einfügen:
```js
function drawPlayButton() {
  roundRect(PLAY, "#2b8a3e", "#0d3");
  const ic = getImg("playball");
  if (ic) ctx.drawImage(ic, PLAY.x + 0.14 * PLAY.w, PLAY.y + 0.14 * PLAY.h, PLAY.w * 0.72, PLAY.h * 0.72);
}
```

- [ ] **Step 6: Loop erweitern (play-Screen + Popup)**

Ersetze in `loop(now)` den Block:
```js
  if (screen === "win") {
    win.update(dt); win.draw();
    requestAnimationFrame(loop); // Sieger-Screen: keine Ecken-Buttons
    return;
  }
```
durch:
```js
  if (screen === "win") {
    win.update(dt); win.draw();
    requestAnimationFrame(loop); // Sieger-Screen: keine Ecken-Buttons
    return;
  }
  if (screen === "play") {
    if (!popup.active) play.update(dt);
    play.draw();
    if (popup.active) { updatePopup(dt); drawPopup(); }
    requestAnimationFrame(loop);   // eigene Leiste statt Ecken-Buttons
    return;
  }
```

Ersetze weiter unten im Loop:
```js
  drawSpeaker();
  drawNewGame();
  if (confirmReset) drawConfirm();
  requestAnimationFrame(loop);
```
durch:
```js
  drawSpeaker();
  if (screen === "world" && storage.isPlayUnlocked()) drawPlayButton();
  drawNewGame();
  if (confirmReset) drawConfirm();
  if (popup.active) { updatePopup(dt); drawPopup(); }
  requestAnimationFrame(loop);
```

- [ ] **Step 7: Verify + Browser-Verifikation**

Run: `node --check js/main.js && npm test`
Expected: Syntax ok, alle Tests grün.
Browser (`?neu`): Beeren sammeln bis 20 → **Feuerwerk-Popup mit Ball-Bild**; danach **Spiel-Knopf rechts**. Knopf → **Spielfeld**: unten Leiste mit Ball-Button + rotem X; ins Feld tippen → Ball fliegt, Begleiter holt ihn & bringt zurück; rotes X → zurück zur Wiese. Ohne Begleiter → beim Betreten wird einer zugewiesen (Pfötchen im Haus).

- [ ] **Step 8: Commit**

```bash
git add js/main.js
git commit -m "feat: Spiel-Knopf, Freischalt-Popup und Spielfeld-Routing"
```

---

### Task 7: Endabnahme

**Files:** keine Code-Änderung (nur Verifikation).

- [ ] **Step 1: Alle Tests grün**

Run: `npm test`
Expected: alle bisherigen + neue (toys + storage-Beeren) grün.

- [ ] **Step 2: Modul-Smoke**

Run (main.js NICHT importieren — DOM-Top-Level):
```bash
node -e "Promise.all(['toys','storage','world','playscreen'].map(m=>import('./js/'+m+'.js'))).then(()=>console.log('Module ok')).catch(e=>{console.error(e.message);process.exit(1)})"
```
Expected: `Module ok`.

- [ ] **Step 3: Voller Durchlauf im Browser**

`?neu`: Beeren sammeln (selten) → Glas füllt → bei 20 Popup mit Ball → Spiel-Knopf → Spielfeld → Ball werfen, Begleiter apportiert → rotes X zurück. Level 2 erreichen → Beeren/Spiel bleiben. „Neues Spiel" → alles zurück (kein Spiel-Knopf mehr).

- [ ] **Step 4: Feinjustage (optional)**

Beeren-Häufigkeit (`0.12` in `world.js`), Glas-Position, Fetch-Tempo (`FETCH_SPEED`/`NEAR` in `playscreen.js`), Popup-Dauer (`2.5` in `main.js`). Bei Bedarf anpassen + committen:
```bash
git add -A && git commit -m "tweak: Beeren/Spielfeld-Feinschliff"
```

---

## Self-Review

**Spec-Abdeckung:**
- Beeren selten auf der Wiese, Drüberlaufen sammelt → Task 4 ✓
- Glas 0→20 → Task 4 (HUD) ✓
- Popup mit Item-Bild bei 20 → Task 6 ✓
- Spiel-Knopf rechts nach 1. Freischalten → Task 6 ✓
- Spielfeld + untere Leiste (Buttons + rotes X, nie im Feld) → Task 5 ✓
- Spiel 1 Ball-Apportieren + Zufalls-Begleiter → Task 5 ✓
- Persistenz Beeren/Spiele über Level, reset leert → Task 2 ✓
- Assets playfield/playball (Pokéball unangetastet) → Task 3 ✓
- Tests toys + storage → Task 1, 2 ✓

**Placeholder-Scan:** kein „TBD/TODO"; jeder Code-Step zeigt vollständigen Code.

**Typ-Konsistenz:** `collectBerry` (toys, rein) vs `storage.collectBerry()` (no-arg, gibt unlockedToy) klar getrennt; `unlockedToys(n)` in playscreen genutzt; `storage.getBerries/getToysUnlocked/isPlayUnlocked/setCompanion` in world/playscreen/main exakt so verwendet; `makeWorld({...,onBerry})` passt zur main-Konstruktion; `makePlayScreen({ctx,storage,audio,onExit})` passt zur main-Konstruktion; Asset-Keys `playfield`/`playball` in sprites-Manifest (Task 3) und playscreen/main verwendet.
