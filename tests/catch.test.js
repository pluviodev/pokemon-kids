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
