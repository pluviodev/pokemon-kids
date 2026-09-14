import { test } from "node:test";
import assert from "node:assert/strict";
import { markerPos } from "../js/powerbar.js";

test("triangle wave hits 0 at start, 1 at mid, 0 at end", () => {
  assert.ok(Math.abs(markerPos(0, 2) - 0) < 1e-9);
  assert.ok(Math.abs(markerPos(1, 2) - 1) < 1e-9);
  assert.ok(Math.abs(markerPos(2, 2) - 0) < 1e-9);
});

test("is periodic and quarter point is 0.5", () => {
  assert.ok(Math.abs(markerPos(0.5, 2) - 0.5) < 1e-9);
  assert.ok(Math.abs(markerPos(2.5, 2) - markerPos(0.5, 2)) < 1e-9);
});

test("stays within [0,1] for arbitrary t", () => {
  for (let t = 0; t < 10; t += 0.13) {
    const p = markerPos(t, 1.4);
    assert.ok(p >= 0 && p <= 1);
  }
});
