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
