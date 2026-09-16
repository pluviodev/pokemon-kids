import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, MAX_LEVEL, levelData, pokemonForLevel } from "../js/levels.js";

test("zwei Level, jedes mit 10 Karls und einem Boss", () => {
  assert.equal(MAX_LEVEL, 2);
  assert.equal(LEVELS.length, 2);
  for (const lv of LEVELS) {
    assert.equal(lv.pokemon.length, 10);
    assert.ok(lv.boss && typeof lv.boss.id === "number");
    assert.ok(typeof lv.diff.bandMul === "number" && typeof lv.diff.speedMul === "number");
  }
});

test("alle Karl- und Boss-IDs sind projektweit eindeutig", () => {
  const ids = [];
  for (const lv of LEVELS) { lv.pokemon.forEach(p => ids.push(p.id)); ids.push(lv.boss.id); }
  assert.equal(new Set(ids).size, ids.length);
});

test("Level 1 = Karls 1..10 + Boss 11; Level 2 = Karls 21..30 + Boss 12", () => {
  assert.deepEqual(pokemonForLevel(1).map(p => p.id), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(levelData(1).boss.id, 11);
  assert.deepEqual(pokemonForLevel(2).map(p => p.id), [21,22,23,24,25,26,27,28,29,30]);
  assert.equal(levelData(2).boss.id, 12);
});

test("levelData clamped außerhalb des Bereichs", () => {
  assert.equal(levelData(0).n, 1);
  assert.equal(levelData(99).n, 2);
});

test("Level 2 ist schwerer (schmaleres Band, schnellerer Marker)", () => {
  assert.ok(levelData(2).diff.bandMul < 1);
  assert.ok(levelData(2).diff.speedMul < 1);
});
