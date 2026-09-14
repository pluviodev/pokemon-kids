import { test } from "node:test";
import assert from "node:assert/strict";
import { makeStorage } from "../js/storage.js";
import { MAX_PER_SPECIES } from "../js/config.js";

function fakeBackend() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    _map: m,
  };
}

test("counts start at 0 and addCatch increments, capped at MAX_PER_SPECIES", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.getCount(3), 0);
  for (let i = 0; i < MAX_PER_SPECIES + 4; i++) s.addCatch(3);
  assert.equal(makeStorage(b).getCount(3), MAX_PER_SPECIES); // gedeckelt
});

test("penaltyAll subtracts one from every counter (min 0) and clears won", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.addCatch(1); s.addCatch(1); s.addCatch(2);
  s.setWon(true);
  s.penaltyAll();
  const s2 = makeStorage(b);
  assert.equal(s2.getCount(1), 1);
  assert.equal(s2.getCount(2), 0);
  assert.equal(s2.getCount(5), 0); // war 0, bleibt 0
  assert.equal(s2.isWon(), false);
});

test("won flag persists and reset wipes everything", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.addCatch(4); s.setWon(true);
  assert.equal(makeStorage(b).isWon(), true);
  s.reset();
  const s2 = makeStorage(b);
  assert.equal(s2.getCount(4), 0);
  assert.equal(s2.isWon(), false);
});

test("corrupt counts data yields all zeros", () => {
  const b = fakeBackend();
  b.setItem("pk_counts", "not-json");
  assert.equal(makeStorage(b).getCount(1), 0);
});

test("sound defaults on and can be toggled off", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.isSoundOn(), true);
  s.setSound(false);
  assert.equal(makeStorage(b).isSoundOn(), false);
});
