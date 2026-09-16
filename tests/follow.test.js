import { test } from "node:test";
import assert from "node:assert/strict";
import { followStep, trailTarget, fleeStep, keeperSaves } from "../js/follow.js";

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
