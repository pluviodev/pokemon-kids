# Pokémon Kids — Begleiter-Karl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein im Haus angetippter, gefangener Karl läuft draußen auf der Wiese als Begleiter hinter der Spielfigur her.

**Architecture:** Neue getestete Folge-Mathematik in `js/follow.js` (DOM-frei). `storage.js` merkt sich den Begleiter (gültig nur bei gefangenem Karl des aktiven Levels, geleert bei Levelwechsel/Reset). `housescreen.js` bekommt Tap-zum-Auswählen + Pfötchen-Marker. `world.js` lässt den Begleiter der Figur folgen und zeichnet ihn.

**Tech Stack:** Vanilla JS ES-Module, Canvas, kein Build. Tests: `node --test` (`npm test`).

## Global Constraints

- **Kein Lesen nötig** — reine Bild/Ton/Animation. Kein neues Bild-Asset (Pfötchen wird per Canvas gezeichnet).
- **Bestehendes Verhalten bleibt** — alle 40 vorhandenen Tests müssen grün bleiben.
- **Virtuelle Auflösung:** `S = VIRTUAL_W = 900`, quadratisch. Alle Koordinaten als Bruchteile von `S`.
- **Nur draußen:** Begleiter erscheint ausschließlich im `world`-Screen (nicht Haus, nicht Fang-Screen).
- **Nur einer** gleichzeitig; Persistenz via localStorage-Schlüssel `pk_companion`; geleert bei `advanceLevel()` und `reset()`.
- **Commit-Sprache:** Deutsch, Präfix `feat:`/`refactor:`. Kein Push (macht jh).
- Tests laufen mit `npm test` im Projektwurzelverzeichnis `Desktop/Claude Projects/Pokemon Kids`.

---

### Task 1: `follow.js` — Folge-Mathematik (DOM-frei, getestet)

**Files:**
- Create: `js/follow.js`
- Create: `tests/follow.test.js`

**Interfaces:**
- Produces:
  - `followStep(pos, target, speed, dt, minDist)` → `{x, y}`: bewegt `pos` Richtung `target`, stoppt bei Abstand ≤ `minDist` (kein Überschießen; keine Bewegung wenn schon näher als `minDist`).
  - `trailTarget(player, dir, gap)` → `{x, y}`: Punkt `gap` Pixel **hinter** dem Spieler, entgegen der Blickrichtung `dir` ∈ `{"up","down","left","right"}`.

- [ ] **Step 1: Write the failing test**

`tests/follow.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { followStep, trailTarget } from "../js/follow.js";

test("followStep bewegt Richtung Ziel, ohne minDist zu unterschreiten", () => {
  const p = followStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 50, 1, 10);
  assert.equal(Math.round(p.x), 50);   // 50 px in 1 s
  assert.equal(Math.round(p.y), 0);
});

test("followStep überschießt nicht: stoppt bei minDist vom Ziel", () => {
  const p = followStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 1000, 1, 10);
  assert.equal(Math.round(p.x), 90);   // hält 10 px Abstand
});

test("followStep bleibt stehen, wenn schon näher als minDist", () => {
  const p = followStep({ x: 95, y: 0 }, { x: 100, y: 0 }, 1000, 1, 10);
  assert.deepEqual(p, { x: 95, y: 0 });
});

test("trailTarget liegt hinter dem Spieler je Blickrichtung", () => {
  const pl = { x: 100, y: 100 };
  assert.deepEqual(trailTarget(pl, "up", 20), { x: 100, y: 120 });    // schaut hoch -> Begleiter unten
  assert.deepEqual(trailTarget(pl, "down", 20), { x: 100, y: 80 });
  assert.deepEqual(trailTarget(pl, "left", 20), { x: 120, y: 100 });
  assert.deepEqual(trailTarget(pl, "right", 20), { x: 80, y: 100 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/follow.js'`

- [ ] **Step 3: Write `js/follow.js`**

```js
// Folge-Mathematik für den Begleiter (DOM-frei, testbar).

// Bewegt pos Richtung target, stoppt bei Abstand <= minDist (kein Überschießen).
export function followStep(pos, target, speed, dt, minDist) {
  const dx = target.x - pos.x, dy = target.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d <= minDist) return { x: pos.x, y: pos.y };
  const step = Math.min(speed * dt, d - minDist);
  return { x: pos.x + (dx / d) * step, y: pos.y + (dy / d) * step };
}

// Punkt gap Pixel hinter dem Spieler (entgegen der Blickrichtung).
const BEHIND = {
  up: { x: 0, y: 1 }, down: { x: 0, y: -1 },
  left: { x: 1, y: 0 }, right: { x: -1, y: 0 },
};
export function trailTarget(player, dir, gap) {
  const o = BEHIND[dir] || { x: 0, y: 0 };
  return { x: player.x + o.x * gap, y: player.y + o.y * gap };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 4 neue follow-Tests grün, alle bisherigen grün.

- [ ] **Step 5: Commit**

```bash
git add js/follow.js tests/follow.test.js
git commit -m "feat: follow.js — Folge-Mathematik für den Begleiter (followStep/trailTarget)"
```

---

### Task 2: `storage.js` — Begleiter merken (gültig, level-abhängig, löschbar)

**Files:**
- Modify: `js/storage.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Consumes: bestehende `getLevel()`, `loadCounts()`, `activePool()` (intern).
- Produces:
  - `getCompanion()` → number|null: gespeicherte ID, aber nur wenn sie zum aktiven Level gehört **und** gefangen ist (count > 0); sonst `null`.
  - `toggleCompanion(id)`: ist `id` bereits gespeichert → leeren; sonst auf `id` setzen.
  - `advanceLevel()` und `reset()` leeren zusätzlich `pk_companion`.

- [ ] **Step 1: Write the failing tests** (an `tests/storage.test.js` anhängen)

```js
test("Begleiter: default null, toggle setzt und schaltet wieder aus", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.getCompanion(), null);
  s.addCatch(3);
  s.toggleCompanion(3);
  assert.equal(makeStorage(b).getCompanion(), 3);
  s.toggleCompanion(3);                 // nochmal -> aus
  assert.equal(makeStorage(b).getCompanion(), null);
});

test("getCompanion ignoriert nicht gefangene IDs", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.toggleCompanion(4);                 // 4 ist NICHT gefangen
  assert.equal(s.getCompanion(), null);
});

test("getCompanion ignoriert IDs, die nicht zum aktiven Level gehören", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.addCatch(1);
  s.toggleCompanion(1);
  s.setLevel(2);                        // 1 gehört nicht zu Level 2
  assert.equal(makeStorage(b).getCompanion(), null);
});

test("advanceLevel und reset leeren den Begleiter", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.addCatch(2); s.toggleCompanion(2);
  s.advanceLevel();
  assert.equal(makeStorage(b).getCompanion(), null);
  const s2 = makeStorage(b);
  s2.setLevel(1); s2.addCatch(2); s2.toggleCompanion(2);
  s2.reset();
  assert.equal(makeStorage(b).getCompanion(), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `s.getCompanion is not a function`

- [ ] **Step 3: Modify `js/storage.js`**

Nach `const LEVEL_KEY = "pk_level";` einfügen:
```js
const COMPANION_KEY = "pk_companion";
```

Innerhalb `makeStorage`, nach der Funktion `activePool()`, einfügen:
```js
  function getCompanion() {
    const id = parseInt(backend.getItem(COMPANION_KEY), 10);
    if (!Number.isInteger(id)) return null;
    if (!activePool().some(p => p.id === id)) return null;
    return (loadCounts()[id] || 0) > 0 ? id : null;
  }
  function setCompanion(id) { backend.setItem(COMPANION_KEY, id == null ? "" : String(id)); }
  function toggleCompanion(id) {
    const cur = parseInt(backend.getItem(COMPANION_KEY), 10);
    setCompanion(cur === id ? null : id);
  }
```

In `reset()` vor dem schließenden `}` (nach `setWon(false);`) ergänzen:
```js
    setCompanion(null);
```

In `advanceLevel()` vor dem schließenden `}` (nach `setWon(false);`) ergänzen:
```js
    setCompanion(null);
```

Das `return`-Objekt um `getCompanion, toggleCompanion` erweitern:
```js
  return { loadCounts, getCount, addCatch, penaltyAll, isWon, setWon, reset,
           getLevel, setLevel, advanceLevel, getCompanion, toggleCompanion, isSoundOn, setSound };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — neue Begleiter-Storage-Tests grün, alle bisherigen grün.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat: storage merkt Begleiter (nur gefangen+aktives Level; Reset bei Levelwechsel)"
```

---

### Task 3: `housescreen.js` — Tap-zum-Auswählen + Pfötchen-Marker

**Files:**
- Modify: `js/housescreen.js`

**Interfaces:**
- Consumes: `storage.getCompanion()`, `storage.toggleCompanion(id)`, `storage.loadCounts()`, `pokemonForLevel(lv.n)`, bestehende `pedestalPos(i)`.
- Produces: Tap auf ein Podest mit gefangenem Karl wählt/entwählt den Begleiter; auf dessen Podest wird ein Pfötchen gezeichnet.

- [ ] **Step 1: Trefferprüfung + Auswahl in `onPointer`**

In `js/housescreen.js`, füge innerhalb `makeHouseScreen` (z.B. direkt vor dem `return {`-Block) die Trefferfunktion ein:
```js
  // Tap-Trefferzone um ein Podest (großzügig, kindgerecht) -> id des gefangenen Karls oder null
  function companionHitId(x, y) {
    const counts = storage.loadCounts();
    const pool = pokemonForLevel(lv.n);
    for (let i = 0; i < pool.length; i++) {
      const p = pedestalPos(i);
      const inBox = x > p.x - 0.08 * S && x < p.x + 0.08 * S &&
                    y > p.y - 0.20 * S && y < p.y + 0.07 * S;
      if (inBox && (counts[pool[i].id] || 0) > 0) return pool[i].id;
    }
    return null;
  }
```

Ersetze im `return`-Objekt die Zeile:
```js
    onPointer(x, y) { target = { x, y }; },
```
durch:
```js
    onPointer(x, y) {
      const id = companionHitId(x, y);
      if (id != null) { storage.toggleCompanion(id); return; } // Karl antippen = Begleiter
      target = { x, y };
    },
```

- [ ] **Step 2: Pfötchen-Zeichner + Marker in `draw()`**

Füge in `js/housescreen.js` auf Modulebene (z.B. nach `function pedestalPos(...)`) den Pfötchen-Zeichner ein:
```js
// Kleines Pfötchen (Pad + 4 Zehen), zeigt den aktuellen Begleiter an.
function drawPaw(ctx, cx, cy, r) {
  ctx.save();
  ctx.fillStyle = "#ff5aa6"; ctx.strokeStyle = "#fff"; ctx.lineWidth = r * 0.18;
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.35, r * 0.7, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  for (const [ox, oy, s] of [[-0.7, -0.55, 0.32], [-0.28, -0.8, 0.34], [0.28, -0.8, 0.34], [0.7, -0.55, 0.32]]) {
    ctx.beginPath(); ctx.arc(cx + ox * r, cy + oy * r, r * s, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
```

In `draw()`, direkt nach `const slots = getSlots(storage.loadCounts(), pokemonForLevel(lv.n));`, den aktuellen Begleiter holen:
```js
    const companionId = storage.getCompanion();
```

In der `slots.forEach((s, i) => { ... })`-Schleife, unmittelbar nach `const p = pedestalPos(i);`, den Marker zeichnen:
```js
      if (s.id === companionId) drawPaw(ctx, p.x + 0.055 * S, p.y - 0.17 * S, 0.032 * S);
```

- [ ] **Step 3: Browser-Verifikation**

Run: `python -m http.server 8080`, `http://localhost:8080/?neu`.
Fange ein paar Karls (oder Konsole: `localStorage.setItem("pk_counts",JSON.stringify({1:2,2:2})); location.reload()`), geh ins Haus:
1. Tippe einen gefangenen Karl → Pfötchen erscheint auf seinem Podest.
2. Tippe einen anderen gefangenen → Pfötchen wandert dorthin.
3. Tippe den aktuellen nochmal → Pfötchen weg.
4. Tippe ein leeres Podest / neben die Karls → Figur läuft normal dorthin (kein Marker).
Expected: Auswahl/Toggle funktioniert, Laufen bleibt sonst normal.

- [ ] **Step 4: Verify no test regressions**

Run: `npm test`
Expected: PASS (housescreen ist browser-only, keine Tests brechen).

- [ ] **Step 5: Commit**

```bash
git add js/housescreen.js
git commit -m "feat: Haus — gefangenen Karl antippen wählt Begleiter (Pfötchen-Marker)"
```

---

### Task 4: `world.js` — Begleiter folgt & wird gezeichnet

**Files:**
- Modify: `js/world.js`

**Interfaces:**
- Consumes: `storage.getCompanion()`, `getSprite(id)`, `followStep`, `trailTarget`, bestehende `player`, `dir`, `t`, `PLAYER_SPEED`.

- [ ] **Step 1: Imports ergänzen**

In `js/world.js` nach der Zeile `import { levelData, pokemonForLevel } from "./levels.js";` einfügen:
```js
import { getImg, playerFrame, getSprite } from "./sprites.js";
import { followStep, trailTarget } from "./follow.js";
```
und die bestehende Zeile
```js
import { getImg, playerFrame } from "./sprites.js";
```
entfernen (durch die neue Import-Zeile oben ersetzt — `getSprite` kommt dazu).

- [ ] **Step 2: Begleiter-Zustand + Laden**

Nach `let lv = levelData(storage.getLevel());` einfügen:
```js
  let companionId = null;
  let companion = { x: player.x, y: player.y };
  const GAP = 0.11 * S, MIN_DIST = 0.05 * S;

  function loadCompanion() {
    companionId = storage.getCompanion();
    companion = { x: player.x, y: player.y };
  }
```

In `reset()` als letzte Zeile (vor dem `}`) einfügen:
```js
    loadCompanion();
```

In `exitHouse()` als letzte Zeile (vor dem `}`) einfügen — damit eine Auswahl aus dem Haus sofort greift:
```js
    loadCompanion();
```

- [ ] **Step 2b: Erststart initialisieren**

`reset()` wird beim Boot nicht automatisch aufgerufen; die Wiese ist der Start-Screen. Damit der Begleiter beim ersten Laden erscheint, füge direkt **nach** der `loadCompanion`-Funktionsdefinition (auf Konstruktor-Ebene, nach dem `MIN_DIST`-Block und der Funktion) den Aufruf ein:
```js
  loadCompanion();
```

- [ ] **Step 3: Begleiter in `update(dt)` bewegen**

In `update(dt)`, direkt nach `player = stepPlayer(player, target, PLAYER_SPEED, dt, BOUNDS);`, einfügen:
```js
    if (companionId != null) {
      const tgt = trailTarget(player, dir, GAP);
      companion = followStep(companion, tgt, PLAYER_SPEED, dt, MIN_DIST);
    }
```

- [ ] **Step 4: Begleiter in `draw()` zeichnen (vor der Spielfigur)**

In `draw()`, unmittelbar **vor** dem Block, der die Spielfigur zeichnet (die Zeile `const step = moving ? ...`), einfügen:
```js
    if (companionId != null) {
      const spr = getSprite(companionId);
      const ch = 0.11 * S, car = spr.width && spr.height ? spr.width / spr.height : 1;
      const bob = Math.sin(t * 6) * 0.012 * S;
      ctx.drawImage(spr, companion.x - ch * car / 2, companion.y - ch + bob, ch * car, ch);
    }
```

- [ ] **Step 5: Browser-Verifikation**

Run: `python -m http.server 8080`, `http://localhost:8080/?neu`.
1. Karls fangen, ins Haus, einen als Begleiter antippen (Pfötchen), Haus verlassen.
2. Auf der Wiese läuft der Begleiter der Figur hinterher, hält kleinen Abstand, wackelt sanft.
3. Ins Gras laufen → Fang-Screen ohne Begleiter; zurück → Begleiter wieder da.
4. Im Haus den Begleiter heimschicken (nochmal antippen) → draußen läuft keiner mehr mit.
5. Level 1 → Level 2 (Boss schlagen oder Konsole): Begleiter ist weg, bis im neuen Haus neu gewählt.
Expected: flüssiges Hinterherlaufen, kein Kleben auf der Figur, korrektes An/Aus.

- [ ] **Step 6: Verify no test regressions**

Run: `npm test`
Expected: PASS (world ist browser-only).

- [ ] **Step 7: Commit**

```bash
git add js/world.js
git commit -m "feat: Begleiter folgt der Figur auf der Wiese (followStep/trailTarget)"
```

---

### Task 5: Endabnahme

**Files:** keine Code-Änderung (nur Verifikation).

- [ ] **Step 1: Alle Tests grün**

Run: `npm test`
Expected: alle bisherigen + neue Tests (follow + storage-Begleiter) grün.

- [ ] **Step 2: Modul-Smoke**

Run:
```bash
node -e "Promise.all(['follow','storage','world','housescreen'].map(m=>import('./js/'+m+'.js'))).then(()=>console.log('Module ok')).catch(e=>{console.error(e.message);process.exit(1)})"
```
Expected: `Module ok` (world/housescreen laufen im Import nicht in DOM-Code, nur Factory-Definition).

- [ ] **Step 3: Gesamter Durchlauf im Browser**

`?neu`, frischer Stand: fangen → Haus → Begleiter wählen → Wiese (folgt) → wechseln → heimschicken → Level 2 (Begleiter geleert, neu wählbar). Alles ohne Ruckler/Kleben.

- [ ] **Step 4: Feinjustage (optional)**

Fühlt sich der Abstand/das Tempo gut an? Bei Bedarf `GAP`/`MIN_DIST` in `world.js` justieren. Pfötchen zu klein/groß? Radius in `drawPaw`-Aufruf (`0.032 * S`) anpassen. Danach committen:
```bash
git add -A && git commit -m "tweak: Begleiter-Feinschliff (Abstand/Marker)"
```

---

## Self-Review

**Spec-Abdeckung:**
- Auswahl im Haus (Tap gefangen = Begleiter, Toggle, Wechsel) → Task 3 ✓
- Pfötchen-Marker → Task 3 ✓
- Nur draußen mitlaufen → Task 4 ✓
- Speicher `pk_companion`, nur gültig/gefangen/aktives Level → Task 2 ✓
- Geleert bei Levelaufstieg + Reset → Task 2 ✓
- Folge-Mathematik (Abstand/Dead-Zone, hinter dem Spieler) → Task 1 ✓
- Tests (storage + follow) → Task 1, 2 ✓
- Kein neues Asset (Pfötchen gezeichnet) → Task 3 ✓

**Placeholder-Scan:** kein „TBD/TODO"; jeder Code-Step zeigt vollständigen Code.

**Typ-Konsistenz:** `getCompanion()`/`toggleCompanion(id)` (Task 2) exakt so in Task 3+4 genutzt. `followStep(pos,target,speed,dt,minDist)` und `trailTarget(player,dir,gap)` (Task 1) exakt so in Task 4 aufgerufen. `getSprite(id)` aus sprites.js (in Task 4 zum Import ergänzt) liefert das Karl-Bild. `pedestalPos(i)`/`pokemonForLevel(lv.n)` bestehen bereits in housescreen. `loadCompanion()` in reset/exitHouse/Boot konsistent.
