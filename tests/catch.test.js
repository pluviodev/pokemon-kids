import { test } from "node:test";
import assert from "node:assert/strict";
import { bandSize, makeBand, randomCenter, inBand } from "../js/catch.js";

test("bandSize shrinks with rarity", () => {
  assert.ok(bandSize("common") > bandSize("uncommon"));
  assert.ok(bandSize("uncommon") > bandSize("rare"));
});

test("makeBand centers a band and clamps to [0,1]", () => {
  const b = makeBand(0.5, 0.2);
  assert.ok(Math.abs((b.from + b.to) / 2 - 0.5) < 1e-9);
  assert.equal(makeBand(0.0, 0.2).from, 0);
  assert.equal(makeBand(1.0, 0.2).to, 1);
});

test("randomCenter keeps the whole band on the bar", () => {
  const size = 0.16;
  for (let i = 0; i <= 10; i++) {
    const c = randomCenter(size, () => i / 10);
    const b = makeBand(c, size);
    assert.ok(b.from >= 0 && b.to <= 1, `band ${b.from}-${b.to}`);
  }
});

test("randomCenter varies with rng", () => {
  assert.notEqual(randomCenter(0.1, () => 0.1), randomCenter(0.1, () => 0.9));
});

test("inBand true only inside", () => {
  const b = makeBand(0.5, 0.2); // 0.4..0.6
  assert.equal(inBand(0.5, b), true);
  assert.equal(inBand(0.39, b), false);
  assert.equal(inBand(0.61, b), false);
});
