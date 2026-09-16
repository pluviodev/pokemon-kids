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
