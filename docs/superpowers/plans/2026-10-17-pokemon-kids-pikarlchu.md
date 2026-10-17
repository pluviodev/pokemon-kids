# Pokémon Kids — Pikarlchu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pikarlchu taucht auf beiden Wiesen auf, wird durch 5 Treffer + schnelles Hämmern (Energie-Leiste → Donnerblitz) gefangen, steht danach auf einem Ehrenplatz im Haus und läuft als Begleiter mit, der auf 5 schnelle Taps hin blitzt.

**Architecture:** Neue DOM-freie Logik in `js/pika.js` (Auftritte, Trefferprüfung, Ladebalken, Tap-Salve) mit Unit-Tests. `storage.js` bekommt eigene, level-unabhängige Pika-Schlüssel. Neuer Screen `js/pikascreen.js` fürs Hämmer-Event. `world.js` zeigt Auftritte + HUD + Begleiter-Blitz, `housescreen.js` den Ehrenplatz, `main.js` verdrahtet den neuen Screen.

**Tech Stack:** Vanilla JS ES-Module, Canvas, kein Build. Tests: `node --test` (`npm test`). Assets über `tools/process_assets.py` (Pillow).

## Global Constraints

- **Kein Lesen nötig** — Bild/Ton/Animation. Einzige Textausnahme ist der Name, wie bei allen Karls.
- **Bestehendes Verhalten bleibt** — alle 58 vorhandenen Tests müssen grün bleiben.
- **Virtuelle Auflösung:** `S = VIRTUAL_W = 900`, quadratisch. Alle Koordinaten als Bruchteile von `S`.
- **Nirgends verlieren:** kein Timeout, kein Fehlschlag, keine Strafe. Verpasste Auftritte kommen wieder.
- **Level-unabhängig:** Pika-Zustand überlebt `advanceLevel()`, nur `reset()` löscht ihn.
- **ID 13** ist frei (11 = Lukas, 12 = Lena, 21–30 = Level 2). Name/Sprite kommen aus `pika.js`, **nicht** aus `levels.js`.
- **Commit-Sprache:** Deutsch, Präfix `feat:`/`fix:`/`chore:`. Kein Push (macht jh).
- Tests laufen mit `npm test` im Projektwurzelverzeichnis.

---

### Task 1: `pika.js` — Auftritte, Treffer, Laden, Salve (DOM-frei, getestet)

**Files:**
- Create: `js/pika.js`
- Create: `tests/pika.test.js`

**Interfaces:**
- Produces: `PIKA_ID`, `PIKA_NAME`, `PIKA_HITS_NEEDED`, `PEEK_SPOTS`, `pickAppearance`, `dashX`, `hitsAppearance`, `chargeStep`, `isBurst` + Tuning-Konstanten
- Consumed by: `storage.js` (nur `PIKA_ID`/`PIKA_HITS_NEEDED`), `world.js`, `pikascreen.js`, `housescreen.js`

**Step 1: Write the failing test**

```js
// tests/pika.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { PIKA_ID, PIKA_HITS_NEEDED, PEEK_SPOTS, pickAppearance, dashX,
         hitsAppearance, chargeStep, isBurst, DASH_Y } from "../js/pika.js";

test("PIKA_ID kollidiert mit keiner Level-ID", async () => {
  const { LEVELS } = await import("../js/levels.js");
  const used = new Set();
  for (const lv of LEVELS) { for (const p of lv.pokemon) used.add(p.id); used.add(lv.boss.id); }
  assert.ok(!used.has(PIKA_ID));
});

test("pickAppearance liefert beide Arten und nur gültige Werte", () => {
  let peek = 0, dash = 0;
  for (let i = 0; i < 400; i++) {
    const a = pickAppearance(Math.random);
    if (a.kind === "peek") { peek++; assert.ok(PEEK_SPOTS.includes(a.spot)); }
    else {
      dash++;
      assert.equal(typeof a.fromLeft, "boolean");
      assert.ok(a.y >= DASH_Y.min && a.y <= DASH_Y.max);
    }
  }
  assert.ok(peek > 0 && dash > 0);
});

test("dashX startet und endet ausserhalb des Bildes, laeuft monoton", () => {
  const w = 900, m = 120;
  assert.ok(dashX(0, 2, true, w, m) < 0);
  assert.ok(dashX(2, 2, true, w, m) > w);
  assert.ok(dashX(0, 2, false, w, m) > w);
  assert.ok(dashX(2, 2, false, w, m) < 0);
  let prev = -Infinity;
  for (let t = 0; t <= 2; t += 0.1) { const x = dashX(t, 2, true, w, m); assert.ok(x > prev); prev = x; }
});

test("dashX clampt ausserhalb von [0,dur]", () => {
  const w = 900, m = 120;
  assert.equal(dashX(-5, 2, true, w, m), dashX(0, 2, true, w, m));
  assert.equal(dashX(99, 2, true, w, m), dashX(2, 2, true, w, m));
});

test("hitsAppearance trifft innerhalb, daneben nicht", () => {
  assert.ok(hitsAppearance({ x: 100, y: 100 }, { x: 110, y: 115 }, 40));
  assert.ok(!hitsAppearance({ x: 100, y: 100 }, { x: 300, y: 115 }, 40));
});

test("chargeStep bleibt in [0,1], steigt mit Taps, faellt ohne", () => {
  assert.equal(chargeStep(0, 0.1, 0, 0.07, 0.12), 0);          // kein Unterlauf
  assert.ok(chargeStep(0.5, 0.1, 1, 0.07, 0.12) > 0.5);
  assert.ok(chargeStep(0.5, 0.1, 0, 0.07, 0.12) < 0.5);
  assert.equal(chargeStep(0.99, 0, 5, 0.07, 0.12), 1);         // kein Ueberlauf
});

test("chargeStep: genug schnelle Taps fuellen die Leiste", () => {
  let v = 0;
  for (let i = 0; i < 20; i++) v = chargeStep(v, 0.12, 1, 0.07, 0.12);
  assert.equal(v, 1);
});

test("isBurst erkennt 5 Taps im Fenster, ignoriert zu alte", () => {
  assert.ok(isBurst([9.2, 9.4, 9.6, 9.8, 10.0], 10.0, 5, 2));
  assert.ok(!isBurst([1, 2, 3, 4, 10.0], 10.0, 5, 2));
  assert.ok(!isBurst([9.8, 10.0], 10.0, 5, 2));
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/pika.js'`

**Step 3: Write minimal implementation**

```js
// js/pika.js
// Pikarlchu: Sonder-Karl ausserhalb der Level-Pools. Reine Logik, DOM-frei.

export const PIKA_ID = 13;
export const PIKA_NAME = "Pikarlchu";
export const PIKA_SPRITE = "assets/pokemon/13.png";
export const PIKA_HITS_NEEDED = 5;

// Auftritte
export const APPEAR_GAP = { min: 12, max: 20 };  // Sekunden zwischen Auftritten
export const PEEK_TIME = 2.5;                    // wie lange er hinter dem Objekt hervorlugt
export const DASH_TIME = 2.2;                    // wie lange ein Querlauf dauert
export const DASH_Y = { min: 0.34, max: 0.92 };  // Bruchteile von S
export const TAP_RADIUS = 0.085;                 // Bruchteil von S, bewusst grosszuegig

// Verstecke auf der Wiese (Bruchteile von S, aus world.png abgelesen; gilt fuer beide Level).
export const PEEK_SPOTS = [
  { x: 0.27, y: 0.21 },  // links neben dem Haus
  { x: 0.66, y: 0.21 },  // rechts neben dem Haus
  { x: 0.10, y: 0.17 },  // grosser Baum oben links
  { x: 0.92, y: 0.19 },  // grosser Baum oben rechts
  { x: 0.78, y: 0.18 },  // Zaun
  { x: 0.06, y: 0.38 },  // Stein links
  { x: 0.92, y: 0.64 },  // Stein rechts
  { x: 0.11, y: 0.91 },  // Stein unten links
  { x: 0.85, y: 0.92 },  // Stein unten rechts
];

// Laden im Fang-Event
export const CHARGE_GAIN = 0.07;   // pro Tap
export const CHARGE_DECAY = 0.12;  // pro Sekunde
// Begleiter-Blitz
export const BURST_NEED = 5;
export const BURST_WINDOW = 2.0;   // Sekunden
export const BURST_COOLDOWN = 3.0; // Sekunden Ruhe nach einer Show

const clamp01 = v => Math.max(0, Math.min(1, v));

// Zufaellig Lugen oder Flitzen.
export function pickAppearance(rng = Math.random) {
  if (rng() < 0.5) {
    const i = Math.min(PEEK_SPOTS.length - 1, Math.floor(rng() * PEEK_SPOTS.length));
    return { kind: "peek", spot: PEEK_SPOTS[i] };
  }
  return {
    kind: "dash",
    fromLeft: rng() < 0.5,
    y: DASH_Y.min + rng() * (DASH_Y.max - DASH_Y.min),
  };
}

// x-Position des Flitzers: startet und endet ausserhalb des Bildes.
export function dashX(t, dur, fromLeft, w, margin) {
  const k = clamp01(t / dur);
  const a = fromLeft ? -margin : w + margin;
  const b = fromLeft ? w + margin : -margin;
  return a + (b - a) * k;
}

// Grosszuegige Kreis-Trefferpruefung.
export function hitsAppearance(tap, pos, radius) {
  return Math.hypot(tap.x - pos.x, tap.y - pos.y) <= radius;
}

// Ladestand 0..1: Taps fuellen, Zeit leert.
export function chargeStep(level, dt, taps, gainPerTap, decayPerSec) {
  return clamp01(level + taps * gainPerTap - decayPerSec * dt);
}

// Liegen genug Taps im Zeitfenster?
export function isBurst(tapTimes, now, need, window) {
  let n = 0;
  for (const t of tapTimes) if (now - t <= window) n++;
  return n >= need;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 58 alte + 8 neue Tests

**Step 5: Commit**

```bash
git add js/pika.js tests/pika.test.js
git commit -m "feat: pika.js — Auftritts-, Treffer- und Lade-Logik für Pikarlchu"
```

---

### Task 2: `storage.js` — eigener, level-unabhängiger Pika-Zustand

**Files:**
- Modify: `js/storage.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Produces: `getPikaHits()`, `addPikaHit()`, `isPikaCaught()`, `setPikaCaught(on)`; `getCompanion()` akzeptiert zusätzlich `PIKA_ID`
- Consumed by: `world.js`, `pikascreen.js`, `housescreen.js`

**Step 1: Write the failing test**

An `tests/storage.test.js` anhängen (bestehende Tests unverändert lassen):

```js
test("Pika: Treffer zaehlen bis 5 und deckeln dort", () => {
  const s = makeStorage(mem());
  assert.equal(s.getPikaHits(), 0);
  for (let i = 0; i < 9; i++) s.addPikaHit();
  assert.equal(s.getPikaHits(), 5);
});

test("Pika: gefangen-Flag persistiert", () => {
  const b = mem();
  const s = makeStorage(b);
  assert.equal(s.isPikaCaught(), false);
  s.setPikaCaught(true);
  assert.equal(makeStorage(b).isPikaCaught(), true);
});

test("Pika ueberlebt den Levelaufstieg, Begleiter nicht", () => {
  const s = makeStorage(mem());
  s.addPikaHit(); s.addPikaHit(); s.setPikaCaught(true);
  s.setCompanion(1);
  s.advanceLevel();
  assert.equal(s.isPikaCaught(), true);
  assert.equal(s.getPikaHits(), 2);
  assert.equal(s.getCompanion(), null);
});

test("Neues Spiel loescht auch Pikarlchu", () => {
  const s = makeStorage(mem());
  s.addPikaHit(); s.setPikaCaught(true);
  s.reset();
  assert.equal(s.isPikaCaught(), false);
  assert.equal(s.getPikaHits(), 0);
});

test("getCompanion gibt Pikarlchu nur zurueck, wenn er gefangen ist", () => {
  const s = makeStorage(mem());
  s.setCompanion(PIKA_ID);
  assert.equal(s.getCompanion(), null);     // noch nicht gefangen
  s.setPikaCaught(true);
  assert.equal(s.getCompanion(), PIKA_ID);  // gilt in jedem Level
});
```

Import oben in der Testdatei ergänzen: `import { PIKA_ID } from "../js/pika.js";`

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `s.getPikaHits is not a function`

**Step 3: Write minimal implementation**

In `js/storage.js`:

```js
import { PIKA_ID, PIKA_HITS_NEEDED } from "./pika.js";

const PIKA_HITS_KEY = "pk_pika_hits";
const PIKA_CAUGHT_KEY = "pk_pika_caught";
```

Innerhalb von `makeStorage` ergänzen:

```js
  function getPikaHits() {
    const n = parseInt(backend.getItem(PIKA_HITS_KEY), 10);
    if (!Number.isInteger(n) || n < 0) return 0;
    return Math.min(PIKA_HITS_NEEDED, n);
  }
  function addPikaHit() {
    const n = Math.min(PIKA_HITS_NEEDED, getPikaHits() + 1);
    backend.setItem(PIKA_HITS_KEY, String(n));
    return n;
  }
  function isPikaCaught() { return backend.getItem(PIKA_CAUGHT_KEY) === "1"; }
  function setPikaCaught(on) { backend.setItem(PIKA_CAUGHT_KEY, on ? "1" : "0"); }
```

`getCompanion()` um den Sonderfall erweitern (Pikarlchu gehört zu keinem Level-Pool):

```js
  function getCompanion() {
    const id = parseInt(backend.getItem(COMPANION_KEY), 10);
    if (!Number.isInteger(id)) return null;
    if (id === PIKA_ID) return isPikaCaught() ? PIKA_ID : null;
    if (!activePool().some(p => p.id === id)) return null;
    return (loadCounts()[id] || 0) > 0 ? id : null;
  }
```

In `reset()` ergänzen (nur dort, **nicht** in `advanceLevel()`):

```js
    backend.setItem(PIKA_HITS_KEY, "0");
    setPikaCaught(false);
```

Und im Rückgabeobjekt `getPikaHits, addPikaHit, isPikaCaught, setPikaCaught` exportieren.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — alle Tests grün

**Step 5: Commit**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat: storage merkt Pikarlchu level-übergreifend (Treffer + gefangen)"
```

---

### Task 3: Sprite aufbereiten + vorladen

**Files:**
- Create: `Sprites/Pikarlchu.png` (Quelle, 80×80, vom Nutzer geliefert)
- Create: `assets/pokemon/13.png` (Ergebnis, 320 px)
- Modify: `tools/process_assets.py`
- Modify: `js/sprites.js`

**Step 1: Quelle ablegen**

Die gelieferte Datei `Pokémonsprite_025_Weiblich_HGSS.png` nach `Sprites/Pikarlchu.png` kopieren
(Alpha ist bereits vorhanden, kein Freistellen nötig).

**Step 2: Aufbereitung in `tools/process_assets.py` ergänzen**

Ans Ende der Datei, mit eigener Nearest-Neighbor-Skalierung — `fit()` nutzt LANCZOS und würde den
kleinen Sprite verwaschen:

```python
# Pikarlchu: kleiner DS-Sprite -> Nearest-Neighbor hochrechnen, damit er knackig bleibt.
pika = Image.open(os.path.join(SRC, "Pikarlchu.png")).convert("RGBA")
pika = trim(pika)
f = 320 / max(pika.size)
pika = pika.resize((round(pika.width * f), round(pika.height * f)), Image.NEAREST)
pika.save(os.path.join(OUT, "pokemon", "13.png"))
print("pokemon 13 Pikarlchu", pika.size)
```

Run: `"C:/Users/localUser/AppData/Local/Programs/Python/Python312/python.exe" tools/process_assets.py`
Expected: Zeile `pokemon 13 Pikarlchu (320, 314)`; `assets/pokemon/13.png` existiert.

**Step 3: In `js/sprites.js` vorladen**

`loadAssets` baut `pkEntries` nur aus `LEVELS` — Pikarlchu fehlt dort bewusst. Ergänzen:

```js
import { PIKA_ID, PIKA_SPRITE } from "./pika.js";
```

und direkt nach der Level-Schleife:

```js
  pkEntries.push(["pk" + PIKA_ID, PIKA_SPRITE]);   // Sonder-Karl ausserhalb der Level-Pools
```

**Step 4: Prüfen**

Run: `npm test`
Expected: PASS (unverändert 66 Tests) — der Sprite selbst wird im Browser geprüft.

**Step 5: Commit**

```bash
git add Sprites/Pikarlchu.png assets/pokemon/13.png tools/process_assets.py js/sprites.js
git commit -m "feat: Pikarlchu-Sprite aufbereitet (Nearest-Neighbor 320px) + vorgeladen"
```

---

### Task 4: `pikascreen.js` — Fang-Event (Hämmern → Donnerblitz)

**Files:**
- Create: `js/pikascreen.js`

**Interfaces:**
- Produces: `makePikaScreen({ ctx, audio, storage, onDone })` → `{ start, update, draw, onTap }`
- Consumed by: `main.js`

**Step 1: Implementierung**

```js
// js/pikascreen.js — Fang-Event fuer Pikarlchu: schnell tippen, bis die Energie reicht.
import { VIRTUAL_W } from "./config.js";
import { levelData } from "./levels.js";
import { getImg, getSprite } from "./sprites.js";
import { PIKA_ID, PIKA_NAME, CHARGE_GAIN, CHARGE_DECAY } from "./pika.js";
import { chargeStep } from "./pika.js";

const S = VIRTUAL_W;
const POKE = { x: 0.5 * S, y: 0.44 * S };
const BAR = { x: 0.18 * S, y: 0.76 * S, w: 0.64 * S, h: 0.09 * S };
const FLASH_TIME = 1.4;

export function makePikaScreen({ ctx, audio, storage, onDone }) {
  let level = 0, t = 0, taps = 0, phase = "charge", flashT = 0;
  let sparks = [];

  function start() {
    level = 0; t = 0; taps = 0; phase = "charge"; flashT = 0; sparks = [];
  }

  function onTap() {
    if (phase !== "charge") return;
    taps++;
    audio.play("zap");
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 320;
      sparks.push({ x: POKE.x, y: POKE.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
    }
  }

  function update(dt) {
    t += dt;
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.6; }
    sparks = sparks.filter(s => s.life > 0);

    if (phase === "charge") {
      level = chargeStep(level, dt, taps, CHARGE_GAIN, CHARGE_DECAY);
      taps = 0;
      if (level >= 1) { phase = "flash"; flashT = 0; audio.play("thunder"); }
      return;
    }
    flashT += dt;
    if (flashT >= FLASH_TIME) { storage.setPikaCaught(true); onDone(); }
  }

  function draw() {
    const lv = levelData(storage.getLevel());
    ctx.fillStyle = "#2b2f3a"; ctx.fillRect(0, 0, S, S);
    const bg = getImg(lv.catchbg);
    if (bg) {
      const sc = Math.max(S / bg.width, S / bg.height);
      const dw = bg.width * sc, dh = bg.height * sc;
      ctx.drawImage(bg, (S - dw) / 2, (S - dh) / 2, dw, dh);
    }

    // Name wie im normalen Fang-Screen
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold " + (0.05 * S) + "px system-ui, sans-serif";
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(PIKA_NAME, S / 2, 0.15 * S);
    ctx.fillStyle = "#ffd21e"; ctx.fillText(PIKA_NAME, S / 2, 0.15 * S);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    // Pikarlchu: zappelt staerker, je voller die Leiste
    const spr = getSprite(PIKA_ID);
    const size = 0.46 * S, ar = spr.width && spr.height ? spr.width / spr.height : 1;
    const shake = Math.sin(t * (18 + level * 40)) * (4 + level * 14);
    ctx.save();
    ctx.shadowColor = "rgba(255,230,80,0.95)";
    ctx.shadowBlur = 10 + level * 70;
    ctx.drawImage(spr, POKE.x - size * ar / 2 + shake, POKE.y - size / 2, size * ar, size);
    ctx.restore();

    for (const s of sparks) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = "#fff36b";
      ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Energie-Leiste
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.roundRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h * 0.4); ctx.fill();
    ctx.fillStyle = "#ffd21e";
    const fw = BAR.w * level;
    if (fw > 2) { ctx.beginPath(); ctx.roundRect(BAR.x, BAR.y, fw, BAR.h, BAR.h * 0.4); ctx.fill(); }
    ctx.strokeStyle = "#333"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h * 0.4); ctx.stroke();

    // Donnerblitz
    if (phase === "flash") {
      const k = flashT / FLASH_TIME;
      const strobe = Math.sin(flashT * 34) > -0.2 ? 1 : 0.25;
      ctx.globalAlpha = Math.max(0, (1 - k * 0.7) * strobe);
      ctx.fillStyle = "#fffbe0"; ctx.fillRect(0, 0, S, S);
      ctx.globalAlpha = 1;
    }
  }

  return { start, update, draw, onTap };
}
```

**Step 2: Prüfen**

Run: `npm test`
Expected: PASS (unverändert) — Rendering wird im Browser abgenommen.

**Step 3: Commit**

```bash
git add js/pikascreen.js
git commit -m "feat: pikascreen — Energie hämmern bis zum Donnerblitz"
```

---

### Task 5: `world.js` — Auftritte, Treffer, HUD, Begleiter-Blitz

**Files:**
- Modify: `js/world.js`

**Step 1: Zustand + Auftritte**

Importe ergänzen:

```js
import { PIKA_ID, PIKA_HITS_NEEDED, APPEAR_GAP, PEEK_TIME, DASH_TIME, TAP_RADIUS,
         BURST_NEED, BURST_WINDOW, BURST_COOLDOWN,
         pickAppearance, dashX, hitsAppearance, isBurst } from "./pika.js";
```

Signatur um `onPikaCatch` erweitern, Zustand anlegen:

```js
  let pika = null;              // {kind, spot|y, fromLeft, t}
  let pikaTimer = APPEAR_GAP.min;
  let pikaHitFx = [];           // Funken beim Treffer
  let tapTimes = [];            // fuer die Begleiter-Salve
  let burstT = -BURST_COOLDOWN; // Zeitpunkt der letzten Blitz-Show
```

In `reset()` und `exitHouse()` jeweils `pika = null; tapTimes = [];` ergänzen.

Hilfsfunktion für die aktuelle Position eines Auftritts (eine Quelle für Zeichnen **und** Treffer):

```js
  function pikaPos() {
    if (!pika) return null;
    if (pika.kind === "peek") return { x: pika.spot.x * S, y: pika.spot.y * S };
    return { x: dashX(pika.t, DASH_TIME, pika.fromLeft, S, 0.12 * S), y: pika.y * S };
  }
```

In `update(dt)` nach der Spawn-Logik:

```js
    // Pikarlchu-Auftritte (nur solange nicht gefangen, nicht waehrend des Bosses)
    if (!storage.isPikaCaught() && !spawns.some(s => s.boss)) {
      if (pika) {
        pika.t += dt;
        if (pika.t >= (pika.kind === "peek" ? PEEK_TIME : DASH_TIME)) pika = null;
      } else {
        pikaTimer -= dt;
        if (pikaTimer <= 0) {
          pika = { ...pickAppearance(Math.random), t: 0 };
          pikaTimer = APPEAR_GAP.min + Math.random() * (APPEAR_GAP.max - APPEAR_GAP.min);
        }
      }
    } else pika = null;

    for (const f of pikaHitFx) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt * 1.4; }
    pikaHitFx = pikaHitFx.filter(f => f.life > 0);
```

**Step 2: Tap zuerst auf Pikarlchu prüfen**

`onPointer` ersetzen — Treffer auf Pikarlchu darf **nicht** zusätzlich das Laufziel setzen:

```js
    onPointer(x, y) {
      const r = TAP_RADIUS * S;
      // 1) laufender Auftritt?
      const p = pikaPos();
      if (p && hitsAppearance({ x, y }, p, r)) {
        audio.play("zap");
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 300;
          pikaHitFx.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
        }
        pika = null;
        const hits = storage.addPikaHit();
        if (hits >= PIKA_HITS_NEEDED) onPikaCatch();
        return;
      }
      // 2) Begleiter Pikarlchu angetippt? -> Salve zaehlen
      if (companionId === PIKA_ID &&
          hitsAppearance({ x, y }, { x: companion.x, y: companion.y - 0.05 * S }, r)) {
        tapTimes.push(t);
        tapTimes = tapTimes.filter(ts => t - ts <= BURST_WINDOW);
        if (t - burstT >= BURST_COOLDOWN && isBurst(tapTimes, t, BURST_NEED, BURST_WINDOW)) {
          burstT = t; tapTimes = []; audio.play("thunder");
        }
        return;
      }
      target = { x, y };
    },
```

**Step 3: Zeichnen**

In `draw()` nach den Spawns, vor dem Begleiter:

```js
    // Pikarlchu-Auftritt
    const pp = pikaPos();
    if (pp) {
      const spr = getSprite(PIKA_ID);
      const h = 0.13 * S, ar = spr.width && spr.height ? spr.width / spr.height : 1;
      const wob = Math.sin(t * 9) * 0.008 * S;
      ctx.save();
      if (pika.kind === "peek") {
        // unten anschneiden -> steckt hinter dem Objekt
        ctx.beginPath(); ctx.rect(pp.x - h, pp.y - h, h * 2, h * 0.62); ctx.clip();
      }
      ctx.shadowColor = "rgba(255,230,80,0.9)"; ctx.shadowBlur = 18;
      ctx.drawImage(spr, pp.x - h * ar / 2 + wob, pp.y - h, h * ar, h);
      ctx.restore();
    }
    for (const f of pikaHitFx) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = "#fff36b";
      ctx.beginPath(); ctx.arc(f.x, f.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
```

Blitz-Zeichen-HUD (5 Stück) rechts neben dem Beeren-Glas, direkt nach dem Glas zeichnen:

```js
    // Pikarlchu-Treffer: 5 Blitz-Zeichen neben dem Glas
    if (!storage.isPikaCaught()) {
      const hits = storage.getPikaHits();
      for (let i = 0; i < PIKA_HITS_NEEDED; i++) {
        const bx = jx + jw + 0.03 * S + i * 0.045 * S, by = jy + jh * 0.5;
        ctx.save();
        ctx.fillStyle = i < hits ? "#ffd21e" : "rgba(0,0,0,0.35)";
        ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, by - 0.025 * S); ctx.lineTo(bx - 0.012 * S, by);
        ctx.lineTo(bx + 0.002 * S, by); ctx.lineTo(bx - 0.006 * S, by + 0.025 * S);
        ctx.lineTo(bx + 0.014 * S, by - 0.004 * S); ctx.lineTo(bx + 0.001 * S, by - 0.004 * S);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
```

Blitz-Show als Overlay ganz am Ende von `draw()`:

```js
    const bt = t - burstT;
    if (bt < 1.2) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - bt / 1.2)) * (Math.sin(bt * 40) > -0.3 ? 0.85 : 0.2);
      ctx.fillStyle = "#fffbe0"; ctx.fillRect(0, 0, S, S);
      ctx.restore();
    }
```

**Step 4: Prüfen**

Run: `npm test`
Expected: PASS (unverändert)

**Step 5: Commit**

```bash
git add js/world.js
git commit -m "feat: Wiese — Pikarlchu taucht auf, Treffer-HUD und Begleiter-Donnerblitz"
```

---

### Task 6: `housescreen.js` — Ehrenplatz

**Files:**
- Modify: `js/housescreen.js`

**Step 1: Position + Zeichnen**

Importe: `import { PIKA_ID, PIKA_NAME } from "./pika.js";`

Konstante neben den Podest-Daten (mittig an der Rückwand unter dem Gemälde, außerhalb von `BOUNDS`
→ `blocked()` bleibt unangetastet):

```js
const PIKA_SPOT = { x: 0.5 * S, y: 0.255 * S };
```

In `draw()` nach den Podesten:

```js
    // Ehrenplatz fuer Pikarlchu (level-unabhaengig)
    const pCaught = storage.isPikaCaught();
    ctx.save();
    ctx.fillStyle = "rgba(20,12,6,0.45)";                       // kleiner Sockel
    ctx.beginPath(); ctx.ellipse(PIKA_SPOT.x, PIKA_SPOT.y + 0.012 * S, 0.055 * S, 0.016 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (pCaught) {
      const spr = getSprite(PIKA_ID);
      const h = SPR_H, ar = spr.width && spr.height ? spr.width / spr.height : 1;
      ctx.save();
      ctx.shadowColor = "rgba(255,210,50,0.9)"; ctx.shadowBlur = 26;
      ctx.drawImage(spr, PIKA_SPOT.x - h * ar / 2, PIKA_SPOT.y - h + 12, h * ar, h);
      ctx.restore();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "bold " + (0.028 * S) + "px system-ui, sans-serif";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.strokeText(PIKA_NAME, PIKA_SPOT.x, PIKA_SPOT.y - 0.155 * S);
      ctx.fillStyle = "#ffd21e";
      ctx.fillText(PIKA_NAME, PIKA_SPOT.x, PIKA_SPOT.y - 0.155 * S);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      if (storage.getCompanion() === PIKA_ID) drawPaw(PIKA_SPOT.x, PIKA_SPOT.y + 0.03 * S);
    } else {
      ctx.fillStyle = "rgba(20,12,6,0.5)";
      ctx.beginPath(); ctx.arc(PIKA_SPOT.x, PIKA_SPOT.y - 0.03 * S, 0.045 * S, 0, Math.PI * 2); ctx.fill();
    }
```

> `drawPaw(x, y)` ist die vorhandene Pfötchen-Zeichenfunktion aus dem Begleiter-Feature —
> beim Umsetzen den dort benutzten Namen verwenden und ggf. zu einer Hilfsfunktion herausziehen,
> statt den Code zu duplizieren.

**Step 2: Tap auf den Ehrenplatz**

In `onPointer` **vor** der Podest-Prüfung:

```js
      if (storage.isPikaCaught() &&
          Math.hypot(x - PIKA_SPOT.x, y - PIKA_SPOT.y) <= 0.07 * S) {
        storage.toggleCompanion(PIKA_ID);   // verdraengt den Karl automatisch
        return;
      }
```

**Step 3: Prüfen + Commit**

Run: `npm test` → PASS

```bash
git add js/housescreen.js
git commit -m "feat: Haus — Ehrenplatz für Pikarlchu, antippen macht ihn zum Begleiter"
```

---

### Task 7: `main.js` + `audio.js` — Verdrahtung und Töne

**Files:**
- Modify: `js/main.js`
- Modify: `js/audio.js`

**Step 1: Töne**

In `audio.js` die `TONES`-Tabelle ergänzen:

```js
    zap:       [{ f: 1100, d: 0.05 }, { f: 1500, d: 0.05 }],
    thunder:   [{ f: 160, d: 0.22 }, { f: 90, d: 0.3 }, { f: 60, d: 0.35 }],
```

**Step 2: Screen verdrahten**

In `main.js`:

```js
import { makePikaScreen } from "./pikascreen.js";
```

`world` um den Rückruf erweitern:

```js
  onPikaCatch: () => { pikaScreen.start(); screen = "pika"; },
```

Screen anlegen (nach `play`):

```js
const pikaScreen = makePikaScreen({
  ctx, audio, storage,
  onDone: () => { world.reset(); screen = "world"; },
});
```

In `handleTap` beim Screen-Routing ergänzen:

```js
  else if (screen === "pika") pikaScreen.onTap();
```

Tastatur (Leertaste/Enter) analog zu `catch`:

```js
  if (screen === "pika" && (e.key === " " || e.key === "Enter")) pikaScreen.onTap();
```

In `loop()` bei den Screen-Zweigen ergänzen (sowohl im aktiven als auch im `confirmReset`-Zweig):

```js
    else if (screen === "pika") { pikaScreen.update(dt); pikaScreen.draw(); }
```
```js
    else if (screen === "pika") pikaScreen.draw();
```

**Step 3: Prüfen + Commit**

Run: `npm test` → PASS

```bash
git add js/main.js js/audio.js
git commit -m "feat: Pikarlchu-Fang-Event verdrahtet + Blitz-/Donner-Töne"
```

---

### Task 8: Endabnahme im Browser

**Files:** keine

**Step 1: Starten**

```
python -m http.server 8080
```
→ http://localhost:8080/

**Step 2: Checkliste (Touch **und** Tastatur)**

- [ ] Pikarlchu taucht auf der Wiese auf — beide Arten kommen vor (Lugen hinter Objekt, Flitzen quer durch)
- [ ] Beim Lugen steckt er sichtbar **hinter** dem Objekt (unten angeschnitten)
- [ ] Antippen trifft großzügig, Funken + Ton, er verschwindet; Laufziel wird dabei **nicht** gesetzt
- [ ] HUD neben dem Beeren-Glas füllt sich von 0 auf 5
- [ ] Beim 5. Treffer startet das Fang-Event
- [ ] Schnelles Hämmern füllt die Leiste, Pausieren lässt sie sinken — kein Scheitern möglich
- [ ] Volle Leiste → Donnerblitz, danach zurück auf die Wiese, keine Auftritte mehr
- [ ] Haus: Pikarlchu steht auf dem Ehrenplatz an der Rückwand, Name darüber
- [ ] Antippen macht ihn zum Begleiter (Pfötchen), ein Karl-Begleiter wird dabei abgelöst
- [ ] Draußen läuft er mit; 5 schnelle Taps auf ihn → Blitz-Show, danach Abklingzeit
- [ ] Levelaufstieg (Lukas besiegen): Pikarlchu bleibt gefangen, Begleiterwahl ist geleert
- [ ] „Neues Spiel" setzt Pikarlchu zurück
- [ ] Alte Abläufe unberührt: Gras-Fangen, Beeren, Spiele, Boss, Pokal

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: Pikarlchu — Abnahme-Feinschliff"
```

---

## Self-Review

- **Spec-Abdeckung:** Auftritte + 5 Treffer (T1, T5), Hämmer-Fang mit Donnerblitz (T1, T4), kein
  Verlieren (chargeStep ohne Timeout, Auftritte wiederholen sich), Level-Unabhängigkeit (T2),
  Ehrenplatz (T6), Begleiter + Blitz-Show (T2, T5), Sprite (T3), Verdrahtung (T7) — vollständig.
- **Typen-Konsistenz:** `PIKA_ID`/`PIKA_HITS_NEEDED` kommen überall aus `pika.js`; Trefferprüfung
  nutzt in `world.js` dieselbe `pikaPos()`-Quelle wie das Zeichnen, damit Sicht und Treffer nie
  auseinanderlaufen.
- **Risiko:** `onPointer` ist der einzige Ort, an dem Tap-Routing auf der Wiese passiert — die
  Pika-Prüfung muss **vor** dem Setzen von `target` stehen, sonst läuft die Figur bei jedem
  Pikarlchu-Tap los.
- **Offen gelassen:** `drawPaw` existiert aus dem Begleiter-Feature; beim Umsetzen prüfen, ob es
  bereits eine wiederverwendbare Funktion ist oder herausgezogen werden muss.
