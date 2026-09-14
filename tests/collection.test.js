import { test } from "node:test";
import assert from "node:assert/strict";
import { getSlots } from "../js/collection.js";

const pool = [
  { id: 1, name: "Ein", sprite: "a.png", rarity: "common" },
  { id: 2, name: "Zwei", sprite: "b.png", rarity: "rare" },
];

test("slots carry name, count and maxed flag", () => {
  const slots = getSlots({ 1: 10, 2: 3 }, pool);
  assert.deepEqual(slots[0], { id: 1, name: "Ein", sprite: "a.png", rarity: "common", count: 10, maxed: true });
  assert.deepEqual(slots[1], { id: 2, name: "Zwei", sprite: "b.png", rarity: "rare", count: 3, maxed: false });
});

test("missing counts default to 0/not maxed", () => {
  const slots = getSlots({}, pool);
  assert.ok(slots.every(s => s.count === 0 && s.maxed === false));
});
