import { test } from "node:test";
import assert from "node:assert/strict";
import { makeStorage } from "../js/storage.js";

function fakeBackend() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    _map: m,
  };
}

test("loadCaught starts empty and addCaught persists ids", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.deepEqual([...s.loadCaught()], []);
  s.addCaught(3);
  s.addCaught(3); // idempotent
  s.addCaught(7);
  assert.deepEqual([...makeStorage(b).loadCaught()].sort(), [3, 7]);
});

test("corrupt caught data yields empty set", () => {
  const b = fakeBackend();
  b.setItem("pk_caught", "not-json");
  assert.deepEqual([...makeStorage(b).loadCaught()], []);
});

test("sound defaults on and can be toggled off", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.isSoundOn(), true);
  s.setSound(false);
  assert.equal(makeStorage(b).isSoundOn(), false);
});
