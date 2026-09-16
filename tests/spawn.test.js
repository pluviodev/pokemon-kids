import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSpawnId, availableIds, allMaxed } from "../js/spawn.js";
import { BOSS_ID, MAX_PER_SPECIES } from "../js/config.js";

const pool = [
  { id: 1, rarity: "common" },
  { id: 2, rarity: "rare" },
];

test("availableIds excludes maxed species", () => {
  const counts = { 1: MAX_PER_SPECIES, 2: 3 };
  assert.deepEqual(availableIds(counts, pool).map(p => p.id), [2]);
});

test("allMaxed true only when every species is maxed", () => {
  assert.equal(allMaxed({ 1: MAX_PER_SPECIES, 2: MAX_PER_SPECIES }, pool), true);
  assert.equal(allMaxed({ 1: MAX_PER_SPECIES, 2: MAX_PER_SPECIES - 1 }, pool), false);
});

test("pickSpawnId never returns a maxed species", () => {
  const counts = { 1: MAX_PER_SPECIES, 2: 0 };
  for (let i = 0; i < 20; i++) {
    assert.equal(pickSpawnId(() => i / 20, counts, pool), 2);
  }
});

test("pickSpawnId returns BOSS when all species maxed", () => {
  assert.equal(pickSpawnId(() => 0.5, { 1: 10, 2: 10 }, pool), BOSS_ID);
});

test("pickSpawnId gibt den übergebenen bossId zurück (Level 2 = 12)", () => {
  assert.equal(pickSpawnId(() => 0.5, { 1: 10, 2: 10 }, pool, 12), 12);
});
