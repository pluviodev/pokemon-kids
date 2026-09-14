import { test } from "node:test";
import assert from "node:assert/strict";
import * as config from "../js/config.js";

test("config exposes core constants", () => {
  assert.equal(config.VIRTUAL_W, 900);
  assert.equal(config.VIRTUAL_H, 900);
  assert.deepEqual(config.RARITIES, ["common", "uncommon", "rare"]);
  assert.equal(config.EASE.common, 1.0);
  assert.equal(config.GREEN_ZONE.rare, 0.14);
  assert.equal(config.MAX_ACTIVE_SPAWNS, 2);
});
