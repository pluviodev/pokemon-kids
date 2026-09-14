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
