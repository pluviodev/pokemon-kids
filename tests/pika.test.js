import test from "node:test";
import assert from "node:assert/strict";
import { PIKA_ID, PIKA_HITS_NEEDED, PEEK_SPOTS, pickAppearance, dashX,
         hitsAppearance, chargeStep, isBurst, DASH_Y,
         BLOCKED_AREAS, peekVisibleBox } from "../js/pika.js";

test("PIKA_ID kollidiert mit keiner Level-ID", async () => {
  const { LEVELS } = await import("../js/levels.js");
  const used = new Set();
  for (const lv of LEVELS) { for (const p of lv.pokemon) used.add(p.id); used.add(lv.boss.id); }
  assert.ok(!used.has(PIKA_ID));
});

test("pickAppearance liefert beide Arten und nur gueltige Werte", () => {
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

// Regression: ein Versteck unter einem Button ist fuer das Kind unsichtbar.
test("kein Versteck liegt unter einem Button oder dem HUD", () => {
  for (const spot of PEEK_SPOTS) {
    const b = peekVisibleBox(spot);
    for (const a of BLOCKED_AREAS) {
      const overlaps = b.x0 < a.x1 && b.x1 > a.x0 && b.y0 < a.y1 && b.y1 > a.y0;
      assert.ok(!overlaps,
        `Versteck (${spot.x}, ${spot.y}) ueberlappt belegte Flaeche ` +
        `(${a.x0},${a.y0})-(${a.x1},${a.y1})`);
    }
  }
});

test("jedes Versteck liegt vollstaendig im Bild", () => {
  for (const spot of PEEK_SPOTS) {
    const b = peekVisibleBox(spot);
    assert.ok(b.x0 >= 0 && b.x1 <= 1 && b.y0 >= 0 && b.y1 <= 1,
      `Versteck (${spot.x}, ${spot.y}) ragt aus dem Bild`);
  }
});
