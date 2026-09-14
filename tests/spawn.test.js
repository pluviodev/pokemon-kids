import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSpawnId } from "../js/spawn.js";

const pool = [
  { id: 1, rarity: "common" },   // weight 5
  { id: 2, rarity: "rare" },     // weight 1.5
];
// Gesamtgewicht 6.5. rng()*6.5: <5 -> id 1, sonst id 2.

test("low rng lands in the first (heavier) bucket", () => {
  assert.equal(pickSpawnId(() => 0.0, pool), 1);
  assert.equal(pickSpawnId(() => 0.7, pool), 1); // 0.7*6.5=4.55 < 5
});

test("high rng lands in the rare bucket", () => {
  assert.equal(pickSpawnId(() => 0.9, pool), 2); // 0.9*6.5=5.85 >= 5
});

test("always returns an id from the pool", () => {
  for (let i = 0; i < 20; i++) {
    const id = pickSpawnId(() => i / 20, pool);
    assert.ok([1, 2].includes(id));
  }
});
