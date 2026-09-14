import { test } from "node:test";
import assert from "node:assert/strict";
import { greenZone, isCatch } from "../js/catch.js";
import { GREEN_CENTER } from "../js/config.js";

test("greenZone is a small band centered on GREEN_CENTER", () => {
  const g = greenZone("common");
  assert.ok(Math.abs((g.from + g.to) / 2 - GREEN_CENTER) < 1e-9);
  assert.ok(g.to - g.from < 0.2); // klein
});

test("green zone shrinks with rarity", () => {
  const c = greenZone("common"), u = greenZone("uncommon"), r = greenZone("rare");
  assert.ok((c.to - c.from) > (u.to - u.from));
  assert.ok((u.to - u.from) > (r.to - r.from));
});

test("isCatch true only inside the band", () => {
  assert.equal(isCatch(GREEN_CENTER, "common"), true);       // Mitte trifft
  assert.equal(isCatch(0.2, "common"), false);               // weit daneben
  assert.equal(isCatch(1, "common"), false);                 // ganz oben daneben
});

test("rare band is so small the common-edge misses it", () => {
  const c = greenZone("common");
  // Punkt am Rand des common-Bands liegt außerhalb des schmalen rare-Bands
  assert.equal(isCatch(c.from, "rare"), false);
});
