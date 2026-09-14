import { test } from "node:test";
import assert from "node:assert/strict";
import { POKEMON } from "../js/data.js";
import { RARITIES } from "../js/config.js";

test("there are exactly 10 pokemon with ids 1..10", () => {
  assert.equal(POKEMON.length, 10);
  assert.deepEqual(POKEMON.map(p => p.id), [1,2,3,4,5,6,7,8,9,10]);
});

test("every pokemon has a valid rarity and sprite path", () => {
  for (const p of POKEMON) {
    assert.ok(RARITIES.includes(p.rarity), `rarity ${p.rarity}`);
    assert.match(p.sprite, /^assets\/pokemon\/\d\d\.png$/);
  }
});

test("rarity distribution is 4 common, 3 uncommon, 3 rare", () => {
  const count = r => POKEMON.filter(p => p.rarity === r).length;
  assert.equal(count("common"), 4);
  assert.equal(count("uncommon"), 3);
  assert.equal(count("rare"), 3);
});
