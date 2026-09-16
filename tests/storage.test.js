import { test } from "node:test";
import assert from "node:assert/strict";
import { makeStorage } from "../js/storage.js";
import { MAX_PER_SPECIES } from "../js/config.js";
import { pokemonForLevel } from "../js/levels.js";

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

test("Level startet bei 1 und advanceLevel erhöht + leert Zähler + löscht won", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.getLevel(), 1);
  s.addCatch(1); s.addCatch(1); s.setWon(true);
  s.advanceLevel();
  const s2 = makeStorage(b);
  assert.equal(s2.getLevel(), 2);
  assert.equal(s2.getCount(1), 0);   // Zähler geleert
  assert.equal(s2.isWon(), false);
});

test("advanceLevel überschreitet MAX_LEVEL nicht", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.advanceLevel(); s.advanceLevel(); s.advanceLevel();
  assert.equal(makeStorage(b).getLevel(), 2);
});

test("loadCounts initialisiert die Karls des aktiven Levels", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.setLevel(2);
  const counts = makeStorage(b).loadCounts();
  for (const p of pokemonForLevel(2)) assert.equal(counts[p.id], 0);
  assert.ok(!(1 in counts)); // keine Level-1-IDs im Level-2-Set
});

test("reset setzt Level zurück auf 1", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.setLevel(2);
  s.reset();
  assert.equal(makeStorage(b).getLevel(), 1);
});
