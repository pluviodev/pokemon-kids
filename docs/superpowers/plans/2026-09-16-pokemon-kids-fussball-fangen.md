# Pokémon Kids — Fußball + Fangen (Paket 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zwei weitere Spielfeld-Modi — „Fußball" (auf's Tor schießen, Begleiter als Torwart) und „Fangen" (Begleiter läuft weg, Figur tippt sich hin und fängt).

**Architecture:** `toys.js` bekommt zwei weitere freischaltbare Spiele. `follow.js` bekommt zwei reine, getestete Helfer (`fleeStep`, `keeperSaves`). `playscreen.js` wird um die zwei Modus-Zweige erweitert (Figur beweglich nur im Fangen-Modus), mit geteiltem Konfetti-Jubel. Drei neue Assets (Tor, Fußball, Pfeil).

**Tech Stack:** Vanilla JS ES-Module, Canvas, kein Build. Tests: `node --test` (`npm test`). Assets: Python + Pillow (`tools/process_assets.py`).

## Global Constraints

- **Kein Lesen, kein Punktestand/Verlieren** — reiner Spaß, Bild/Ton/Animation.
- **Bestehendes Verhalten bleibt** — alle 54 vorhandenen Tests grün; Spiel 1 (Ball) unverändert spielbar.
- **Virtuelle Auflösung:** `S = VIRTUAL_W = 900`; Koordinaten als Bruchteile von `S`.
- **Begleiter = Spielkamerad in allen Modi** (Fetcher/Torwart/Flüchtender); kein Begleiter → Zufalls-Zuweisung in `enter()`.
- **Buttons nie im spielbaren Feld** — Modus-Buttons + rotes X in der unteren Leiste (y ≥ `0.86·S`).
- **Freischalt-Reihenfolge:** `TOYS = [ball, fussball, fangen]`.
- **Commit-Sprache:** Deutsch, `feat:`. Kein Push (macht jh).
- Tests: `npm test` im Projektwurzelverzeichnis `Desktop/Claude Projects/Pokemon Kids`.

---

### Task 1: `follow.js` — `fleeStep` + `keeperSaves` (getestet)

**Files:**
- Modify: `js/follow.js`
- Modify: `tests/follow.test.js`

**Interfaces:**
- Produces:
  - `fleeStep(pos, threat, speed, dt, bounds)` → `{x,y}`: weg von `threat`, Schritt `speed*dt`, auf `bounds` (`{minX,minY,maxX,maxY}`) geklemmt, leichter Mitte-Drall am Rand.
  - `keeperSaves(ballX, keeperX, reach)` → bool: `|ballX-keeperX| <= reach`.

- [ ] **Step 1: Write the failing tests** (an `tests/follow.test.js` anhängen)

```js
import { fleeStep, keeperSaves } from "../js/follow.js";

test("fleeStep bewegt sich vom Verfolger weg", () => {
  const B = { minX: 0, minY: 0, maxX: 200, maxY: 200 };
  const p = fleeStep({ x: 100, y: 100 }, { x: 90, y: 100 }, 50, 1, B);
  assert.ok(p.x > 100);          // Verfolger links -> flieht nach rechts
  assert.equal(Math.round(p.y), 100);
});

test("fleeStep bleibt in den Grenzen (kein Rauslaufen)", () => {
  const B = { minX: 0, minY: 0, maxX: 200, maxY: 200 };
  const p = fleeStep({ x: 199, y: 100 }, { x: 0, y: 100 }, 1000, 1, B);
  assert.ok(p.x <= 200 && p.x >= 0);
  assert.ok(p.y <= 200 && p.y >= 0);
});

test("keeperSaves hält bei Nähe, sonst Tor", () => {
  assert.equal(keeperSaves(100, 105, 10), true);
  assert.equal(keeperSaves(100, 130, 10), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `fleeStep is not a function`.

- [ ] **Step 3: `js/follow.js` erweitern** (ans Dateiende anfügen)

```js
// Bewegt pos WEG von threat (in bounds), mit leichtem Drall zur Feldmitte am Rand.
export function fleeStep(pos, threat, speed, dt, bounds) {
  let dx = pos.x - threat.x, dy = pos.y - threat.y;
  let d = Math.hypot(dx, dy);
  if (d < 1e-6) { dx = 1; dy = 0; d = 1; }      // deterministisch nach rechts
  let nx = dx / d, ny = dy / d;
  const cx = (bounds.minX + bounds.maxX) / 2, cy = (bounds.minY + bounds.maxY) / 2;
  const mx = (bounds.maxX - bounds.minX) * 0.18, my = (bounds.maxY - bounds.minY) * 0.18;
  let bx = 0, by = 0;
  if (pos.x < bounds.minX + mx || pos.x > bounds.maxX - mx) bx = cx - pos.x;
  if (pos.y < bounds.minY + my || pos.y > bounds.maxY - my) by = cy - pos.y;
  const bl = Math.hypot(bx, by);
  if (bl > 1e-6) { nx += (bx / bl) * 0.6; ny += (by / bl) * 0.6; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; }
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x + nx * speed * dt)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, pos.y + ny * speed * dt)),
  };
}

// Torwart hält, wenn er nah genug am Ball ist.
export function keeperSaves(ballX, keeperX, reach) {
  return Math.abs(ballX - keeperX) <= reach;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — neue follow-Tests grün, alle bisherigen grün.

- [ ] **Step 5: Commit**

```bash
git add js/follow.js tests/follow.test.js
git commit -m "feat: follow.js — fleeStep + keeperSaves (Fangen/Fußball-Mathe)"
```

---

### Task 2: `toys.js` — Fußball + Fangen freischaltbar

**Files:**
- Modify: `js/toys.js`
- Modify: `tests/toys.test.js`

**Interfaces:**
- Produces: `TOYS` mit 3 Einträgen (`ball`, `fussball`, `fangen`).

- [ ] **Step 1: Write the failing test** (an `tests/toys.test.js` anhängen)

```js
test("es gibt drei freischaltbare Spiele in fester Reihenfolge", () => {
  assert.equal(TOYS.length, 3);
  assert.deepEqual(TOYS.map(t => t.id), ["ball", "fussball", "fangen"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `TOYS.length` ist 1, erwartet 3.

- [ ] **Step 3: `js/toys.js` — TOYS erweitern**

Ersetze das `TOYS`-Array:
```js
export const TOYS = [
  { id: "ball", icon: "playball" },
];
```
durch:
```js
export const TOYS = [
  { id: "ball", icon: "playball" },
  { id: "fussball", icon: "soccerball" },
  { id: "fangen", icon: "arrow" },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — toys-Tests grün (inkl. Storage-Freischalt-Tests, die auf `TOYS[0]` prüfen und weiter passen).

- [ ] **Step 5: Commit**

```bash
git add js/toys.js tests/toys.test.js
git commit -m "feat: toys.js — Fußball + Fangen als freischaltbare Spiele"
```

---

### Task 3: Assets — Tor, Fußball, Pfeil

**Files:**
- Modify: `tools/process_assets.py`
- Modify: `js/sprites.js`

**Interfaces:**
- Produces (Dateien): `assets/goal.png`, `assets/soccerball.png`, `assets/arrow.png`. `getImg("goal"|"soccerball"|"arrow")` liefern die Bilder.

- [ ] **Step 1: `tools/process_assets.py` erweitern** (ans Dateiende anfügen)

```python
# Tor -> goal.png (weißen Hintergrund per Flood-Fill freistellen; Netz/Pfosten bleiben)
goal = cutout_flood(Image.open(os.path.join(SRC, "tor.png")), tol=40)
goal = fit(goal, 620)
goal.save(os.path.join(OUT, "goal.png"))
print("goal", goal.size)

# Fußball -> soccerball.png (weiß freistellen; innenliegende weiße Felder bleiben)
sb = fit(cutout_flood(Image.open(os.path.join(SRC, "Fußball.png")), tol=45), 200)
sb.save(os.path.join(OUT, "soccerball.png"))
print("soccerball", sb.size)

# Pfeil (Fangen-Icon) -> arrow.png (weiß freistellen; Pfeil ist rot-gelb, unkritisch)
arrow = fit(cutout_white(Image.open(os.path.join(SRC, "fangen.png"))), 200)
arrow.save(os.path.join(OUT, "arrow.png"))
print("arrow", arrow.size)
```

- [ ] **Step 2: Pipeline ausführen**

Run: `python tools/process_assets.py`
Expected: Zeilen `goal …`, `soccerball …`, `arrow …` ohne Fehler.

- [ ] **Step 3: Freistellung prüfen (mit Fallback)**

Öffne `assets/goal.png`, `assets/soccerball.png`, `assets/arrow.png` im Betrachter.
- Ball/Pfeil: Hintergrund transparent, Motiv erhalten.
- **Tor:** Pfosten + Netz sollen sichtbar bleiben, nur der Außen-Hintergrund weg. Falls der Flood zu viel vom Netz/den Pfosten frisst (Tor „löchrig"), in Step 1 für das Tor `cutout_flood(..., tol=40)` auf **`cutout_white(Image.open(...tor.png...), tol=24)`** umstellen (entfernt nur nahezu reines Weiß) und Step 2 wiederholen.

- [ ] **Step 4: `js/sprites.js` — Assets vorladen**

Ergänze im `MANIFEST` (nach den `playfield`/`playball`-Zeilen):
```js
  ["goal", "assets/goal.png"],
  ["soccerball", "assets/soccerball.png"],
  ["arrow", "assets/arrow.png"],
```

- [ ] **Step 5: Verify + 404-Check**

Run: `npm test` → PASS.
Run: `python -m http.server 8080`, `http://localhost:8080/?neu`, Konsole → keine 404 für `goal.png`/`soccerball.png`/`arrow.png`.

- [ ] **Step 6: Commit**

```bash
git add tools/process_assets.py js/sprites.js assets/goal.png assets/soccerball.png assets/arrow.png
git commit -m "feat: Assets Tor + Fußball + Pfeil erzeugt und vorgeladen"
```

---

### Task 4: `playscreen.js` — Fußball- + Fangen-Modus

**Files:**
- Modify: `js/playscreen.js` (vollständige Neufassung)

**Interfaces:**
- Consumes: `PLAYER_SPEED` (config), `stepPlayer` (movement.js), `fleeStep`/`keeperSaves`/`followStep` (follow.js), `getImg`/`getSprite`/`playerFrame` (sprites.js), `pokemonForLevel` (levels.js), `unlockedToys` (toys.js).
- Produces: unveränderte Schnittstelle `makePlayScreen({ ctx, storage, audio, onExit })` → `{ enter, update, draw, onPointer }`; 3 Modi (`ball`/`fussball`/`fangen`).

- [ ] **Step 1: `js/playscreen.js` komplett ersetzen**

```js
import { VIRTUAL_W, PLAYER_SPEED } from "./config.js";
import { getImg, getSprite, playerFrame } from "./sprites.js";
import { pokemonForLevel } from "./levels.js";
import { followStep, fleeStep, keeperSaves } from "./follow.js";
import { stepPlayer } from "./movement.js";
import { unlockedToys } from "./toys.js";

const S = VIRTUAL_W;
const BAR_Y = 0.86 * S;                 // untere Leiste (opak); darüber = spielbar
const HOME = { x: 0.5 * S, y: 0.72 * S }; // feste Figur-Position (Ball/Fußball)
const BALL_R = 0.045 * S;
const THROW_TIME = 0.5;
const FETCH_SPEED = 340;
const NEAR = 0.05 * S;
const BTN = 0.10 * S;
// Fußball
const GOAL_Y = 0.15 * S, KEEPER_Y = 0.20 * S, GOAL_HALF = 0.28 * S, KEEPER_REACH = 0.06 * S, SHOT_TIME = 0.5;
// Fangen
const FIELD = { minX: 0.06 * S, minY: 0.10 * S, maxX: 0.94 * S, maxY: BAR_Y - 0.04 * S };
const FLEE_SPEED = 285, CATCH_R = 0.07 * S;

const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function toyButtonRect(i) { return { x: 0.04 * S + i * (BTN + 0.02 * S), y: BAR_Y + (S - BAR_Y - BTN) / 2, w: BTN, h: BTN }; }
const XBTN = { x: S - 0.04 * S - BTN, y: BAR_Y + (S - BAR_Y - BTN) / 2, w: BTN, h: BTN };

export function makePlayScreen({ ctx, storage, audio, onExit }) {
  let mode = "ball";
  let companionId = null;
  let companion = { x: HOME.x, y: HOME.y };
  let player = { x: HOME.x, y: HOME.y };
  let target = { x: HOME.x, y: HOME.y };
  let ball = { x: HOME.x, y: HOME.y - 0.02 * S };
  let phase = "idle";
  let throwT = 0, resultT = 0, from = null, to = null, t = 0;
  let particles = [];

  function pickCompanion() {
    if (storage.getCompanion() != null) return storage.getCompanion();
    const counts = storage.loadCounts();
    const caught = pokemonForLevel(storage.getLevel()).filter(p => (counts[p.id] || 0) > 0);
    if (caught.length === 0) return null;
    const id = caught[Math.floor(Math.random() * caught.length)].id;
    storage.setCompanion(id);
    return id;
  }

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 300;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hue: Math.floor(Math.random() * 360), life: 1 });
    }
  }
  function updateParticles(dt) {
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt * 0.6; }
    particles = particles.filter(p => p.life > 0);
  }
  function farFrom(pt) {
    for (let i = 0; i < 20; i++) {
      const x = FIELD.minX + Math.random() * (FIELD.maxX - FIELD.minX);
      const y = FIELD.minY + Math.random() * (FIELD.maxY - FIELD.minY);
      if (Math.hypot(x - pt.x, y - pt.y) > 0.4 * S) return { x, y };
    }
    return { x: FIELD.minX, y: FIELD.minY };
  }

  function resetMode() {
    player = { x: HOME.x, y: HOME.y }; target = { ...player };
    ball = { x: HOME.x, y: HOME.y - 0.02 * S };
    particles = [];
    if (mode === "ball") { phase = "idle"; companion = { x: HOME.x - 0.12 * S, y: HOME.y }; }
    else if (mode === "fussball") { phase = "aim"; companion = { x: 0.5 * S, y: KEEPER_Y }; }
    else { phase = "run"; companion = { x: 0.5 * S, y: 0.30 * S }; } // fangen
  }

  function enter() {
    companionId = pickCompanion();
    const toys = unlockedToys(storage.getToysUnlocked());
    mode = toys.length ? toys[0].id : "ball";
    resetMode();
  }

  // --- Ball (apportieren) ---
  function throwBall(x, y) {
    if (phase !== "idle") return;
    if (companionId == null) { ball = { x: HOME.x, y: HOME.y - 0.02 * S }; return; }
    from = { ...ball }; to = { x, y: Math.min(y, BAR_Y - 0.03 * S) };
    phase = "thrown"; throwT = 0; audio.play("throw");
  }
  function updateBall(dt) {
    if (phase === "thrown") {
      throwT += dt; const k = Math.min(1, throwT / THROW_TIME);
      ball = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 0.12 * S };
      if (k >= 1) phase = "fetch";
    } else if (phase === "fetch") {
      companion = followStep(companion, ball, FETCH_SPEED, dt, NEAR);
      if (Math.hypot(companion.x - ball.x, companion.y - ball.y) <= NEAR + 1) phase = "carry";
    } else if (phase === "carry") {
      companion = followStep(companion, HOME, FETCH_SPEED, dt, NEAR);
      ball = { x: companion.x, y: companion.y - 0.02 * S };
      if (Math.hypot(companion.x - HOME.x, companion.y - HOME.y) <= NEAR + 1) { phase = "idle"; ball = { x: HOME.x, y: HOME.y - 0.02 * S }; audio.play("caught"); }
    }
  }

  // --- Fußball (Torwart) ---
  function shoot(x) {
    if (phase !== "aim") return;
    from = { x: HOME.x, y: HOME.y - 0.02 * S };
    to = { x: Math.max(0.5 * S - GOAL_HALF, Math.min(0.5 * S + GOAL_HALF, x)), y: GOAL_Y };
    phase = "shot"; throwT = 0; audio.play("throw");
  }
  function updateFussball(dt) {
    companion = { x: 0.5 * S + Math.sin(t * 1.7) * (GOAL_HALF - 0.04 * S), y: KEEPER_Y };
    if (phase === "shot") {
      throwT += dt; const k = Math.min(1, throwT / SHOT_TIME);
      ball = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      if (k >= 1) {
        phase = keeperSaves(ball.x, companion.x, KEEPER_REACH) ? "save" : "goal";
        resultT = 0;
        if (phase === "goal") { burst(ball.x, ball.y, 44); audio.play("caught"); } else audio.play("flee");
      }
    } else if (phase === "goal" || phase === "save") {
      resultT += dt; updateParticles(dt);
      if (resultT > 1.0) { phase = "aim"; ball = { x: HOME.x, y: HOME.y - 0.02 * S }; }
    }
  }

  // --- Fangen ---
  function updateFangen(dt) {
    player = stepPlayer(player, target, PLAYER_SPEED, dt, FIELD);
    companion = fleeStep(companion, player, FLEE_SPEED, dt, FIELD);
    if (Math.hypot(player.x - companion.x, player.y - companion.y) <= CATCH_R) {
      burst(companion.x, companion.y, 34); audio.play("caught");
      companion = farFrom(player);
    }
    updateParticles(dt);
  }

  function onPointer(x, y) {
    if (y >= BAR_Y) {
      if (inRect(x, y, XBTN)) { onExit(); return; }
      const toys = unlockedToys(storage.getToysUnlocked());
      for (let i = 0; i < toys.length; i++) if (inRect(x, y, toyButtonRect(i))) { if (toys[i].id !== mode) { mode = toys[i].id; resetMode(); } return; }
      return;
    }
    if (mode === "ball") throwBall(x, y);
    else if (mode === "fussball") shoot(x);
    else target = { x: Math.max(FIELD.minX, Math.min(FIELD.maxX, x)), y: Math.max(FIELD.minY, Math.min(FIELD.maxY, y)) };
  }

  function update(dt) {
    t += dt;
    if (mode === "ball") updateBall(dt);
    else if (mode === "fussball") updateFussball(dt);
    else updateFangen(dt);
  }

  // --- Zeichnen ---
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
  function drawParticles() {
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = `hsl(${p.hue},100%,60%)`; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function drawMon(pos, h) {
    const spr = getSprite(companionId); if (!spr) return;
    const ar = spr.width && spr.height ? spr.width / spr.height : 1;
    ctx.drawImage(spr, pos.x - h * ar / 2, pos.y - h, h * ar, h);
  }
  function drawFigure(pos) {
    const fr = playerFrame("down", 0);
    if (fr.img) { const h = 0.15 * S, w = h * (fr.img.width / fr.img.height); ctx.drawImage(fr.img, pos.x - w / 2, pos.y - h + 14, w, h); }
  }

  function draw() {
    const field = getImg("playfield");
    if (field) ctx.drawImage(field, 0, 0, S, S);
    else { ctx.fillStyle = "#5aa84a"; ctx.fillRect(0, 0, S, S); }

    if (mode === "fussball") {
      const g = getImg("goal");
      if (g) { const w = 2 * GOAL_HALF + 0.06 * S, h = w * (g.height / g.width); ctx.drawImage(g, 0.5 * S - w / 2, GOAL_Y - h * 0.7, w, h); }
    }
    if (companionId != null) drawMon(companion, 0.12 * S);
    drawFigure(player);
    if (mode !== "fangen") {
      const img = mode === "fussball" ? getImg("soccerball") : getImg("playball");
      if (img) ctx.drawImage(img, ball.x - BALL_R, ball.y - BALL_R, BALL_R * 2, BALL_R * 2);
    }
    drawParticles();

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

- [ ] **Step 2: Syntax + Import prüfen**

Run: `node --check js/playscreen.js && node -e "import('./js/playscreen.js').then(()=>console.log('lädt')).catch(e=>{console.error(e.message);process.exit(1)})"`
Expected: kein Fehler, `lädt`.

- [ ] **Step 3: update-Pfad aller Modi ohne Fehler**

Run (treibt alle 3 Modi durch, ohne draw = DOM):
```bash
node -e "
import('./js/playscreen.js').then(({makePlayScreen})=>{
  const audio={play(){}};
  const storage={getCompanion:()=>1,loadCounts:()=>({1:2}),getLevel:()=>1,getToysUnlocked:()=>3,setCompanion(){}};
  const ps=makePlayScreen({ctx:{},storage,audio,onExit(){}});
  for (const m of ['ball','fussball','fangen']) {
    ps.enter();
    ps.onPointer(0.5*900, 0.86*900+0.02*900); // Modus-Button-Reihe (kein Absturz)
    ps.onPointer(0.5*900, 0.4*900);            // Spielaktion
    for(let i=0;i<200;i++) ps.update(0.03);
  }
  console.log('alle Modi update ok');
}).catch(e=>{console.error(e.message);process.exit(1)});
"
```
Expected: `alle Modi update ok`.

- [ ] **Step 4: Browser-Verifikation**

`?neu`; per Konsole alle Spiele freischalten + einen Karl fangen:
```js
localStorage.setItem("pk_toys","3"); localStorage.setItem("pk_counts",JSON.stringify({1:3,2:3})); localStorage.setItem("pk_berries","0"); location.reload();
```
Spiel-Knopf → Spielfeld: unten **3 Buttons + rotes X**. Ball wie gehabt. **Fußball:** Tor oben, Torwart fährt hin und her; tippen schießt; neben den Torwart = Konfetti-Tor, auf ihn = gehalten. **Fangen:** tippen bewegt die Figur, Begleiter flieht (langsamer, meidet Ecken), Berührung = Konfetti + er poppt woanders auf. Rotes X → zurück.

- [ ] **Step 5: Commit**

```bash
git add js/playscreen.js
git commit -m "feat: playscreen — Fußball- (Torwart) + Fangen-Modus"
```

---

### Task 5: Endabnahme

**Files:** keine Code-Änderung.

- [ ] **Step 1: Alle Tests grün**

Run: `npm test`
Expected: alle bisherigen + neue (follow/toys) grün.

- [ ] **Step 2: Modul-Smoke**

Run:
```bash
node -e "Promise.all(['follow','toys','playscreen','storage','world'].map(m=>import('./js/'+m+'.js'))).then(()=>console.log('Module ok')).catch(e=>{console.error(e.message);process.exit(1)})"
```
Expected: `Module ok`.

- [ ] **Step 3: Voller Durchlauf im Browser**

`?neu`: Beeren sammeln → 3× je 20 → alle 3 Spiele frei (je Popup); Spielfeld: alle 3 Modi durchspielen; Wechsel über die untere Leiste; rotes X zurück; „Neues Spiel" setzt alles zurück.

- [ ] **Step 4: Feinjustage (optional)**

Torwart-Tempo (`t*1.7`), `KEEPER_REACH`, `GOAL_HALF`, `FLEE_SPEED`/`CATCH_R`, Schuss-/Fetch-Tempo. Bei Bedarf anpassen + committen:
```bash
git add -A && git commit -m "tweak: Fußball/Fangen-Feinschliff"
```

---

## Self-Review

**Spec-Abdeckung:**
- Begleiter als Spielkamerad in allen Modi → Task 4 (`pickCompanion`, `drawMon`) ✓
- Fußball: Tor oben, Tap-Schuss, Torwart links↔rechts, Tor/gehalten → Task 4 (`updateFussball`, `shoot`, `keeperSaves`) ✓
- Fangen: Tap-Bewegung, Begleiter flieht (langsamer, meidet Ränder), Berührung fängt → Task 4 (`updateFangen`, `fleeStep`, `farFrom`) ✓
- Freischalt-Reihenfolge ball/fussball/fangen → Task 2 ✓
- Assets goal/soccerball/arrow → Task 3 ✓
- Tests fleeStep/keeperSaves + TOYS.length → Task 1, 2 ✓
- Buttons nur in der Leiste → Task 4 (`onPointer` y≥BAR_Y) ✓

**Placeholder-Scan:** kein „TBD/TODO"; jeder Code-Step zeigt vollständigen Code.

**Typ-Konsistenz:** `fleeStep(pos,threat,speed,dt,bounds)` / `keeperSaves(ballX,keeperX,reach)` (Task 1) exakt so in playscreen (Task 4) genutzt; `TOYS`-Icons `soccerball`/`arrow` (Task 2) = Asset-Keys (Task 3) = `getImg`-Aufrufe (Task 4); `stepPlayer`/`PLAYER_SPEED` bestehende Signaturen; `makePlayScreen`-Schnittstelle unverändert (main.js braucht keine Änderung).
