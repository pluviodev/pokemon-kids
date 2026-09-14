import { test } from "node:test";
import assert from "node:assert/strict";
import { getSlots } from "../js/collection.js";

const pool = [
  { id: 1, sprite: "a.png", rarity: "common" },
  { id: 2, sprite: "b.png", rarity: "rare" },
];

test("marks caught ids and leaves others as shadow", () => {
  const slots = getSlots(new Set([1]), pool);
  assert.equal(slots.length, 2);
  assert.deepEqual(slots[0], { id: 1, sprite: "a.png", rarity: "common", caught: true });
  assert.equal(slots[1].caught, false);
});

test("empty set means nothing caught", () => {
  const slots = getSlots(new Set(), pool);
  assert.ok(slots.every(s => s.caught === false));
});
