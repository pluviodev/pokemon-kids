import { test } from "node:test";
import assert from "node:assert/strict";
import { makeStorage } from "../js/storage.js";
import { MAX_PER_SPECIES } from "../js/config.js";
import { pokemonForLevel } from "../js/levels.js";
import { TOYS } from "../js/toys.js";

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

test("Begleiter: default null, toggle setzt und schaltet wieder aus", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.getCompanion(), null);
  s.addCatch(3);
  s.toggleCompanion(3);
  assert.equal(makeStorage(b).getCompanion(), 3);
  s.toggleCompanion(3);                 // nochmal -> aus
  assert.equal(makeStorage(b).getCompanion(), null);
});

test("getCompanion ignoriert nicht gefangene IDs", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.toggleCompanion(4);                 // 4 ist NICHT gefangen
  assert.equal(s.getCompanion(), null);
});

test("getCompanion ignoriert IDs, die nicht zum aktiven Level gehören", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.addCatch(1);
  s.toggleCompanion(1);
  s.setLevel(2);                        // 1 gehört nicht zu Level 2
  assert.equal(makeStorage(b).getCompanion(), null);
});

test("advanceLevel und reset leeren den Begleiter", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.addCatch(2); s.toggleCompanion(2);
  s.advanceLevel();
  assert.equal(makeStorage(b).getCompanion(), null);
  const s2 = makeStorage(b);
  s2.setLevel(1); s2.addCatch(2); s2.toggleCompanion(2);
  s2.reset();
  assert.equal(makeStorage(b).getCompanion(), null);
});

test("Beeren zählen hoch und schalten bei 20 ein Spiel frei", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  assert.equal(s.getBerries(), 0);
  assert.equal(s.isPlayUnlocked(), false);
  let unlocked = null;
  for (let i = 0; i < 20; i++) unlocked = s.collectBerry();
  assert.deepEqual(unlocked, TOYS[0]);          // 20. Beere schaltet frei
  const s2 = makeStorage(b);
  assert.equal(s2.getToysUnlocked(), 1);
  assert.equal(s2.getBerries(), 0);
  assert.equal(s2.isPlayUnlocked(), true);
});

test("reset leert Beeren + Spiele, advanceLevel behält sie", () => {
  const b = fakeBackend();
  const s = makeStorage(b);
  s.collectBerry(); s.collectBerry();             // 2 Beeren, noch nichts frei
  s.advanceLevel();
  const s2 = makeStorage(b);
  assert.equal(s2.getBerries(), 2);               // Beeren bleiben über Level
  assert.equal(s2.getToysUnlocked(), 0);
  for (let i = 0; i < 18; i++) s2.collectBerry(); // 2 + 18 = 20 -> Spiel frei
  assert.equal(s2.getToysUnlocked(), 1);
  s2.advanceLevel();
  assert.equal(makeStorage(b).getToysUnlocked(), 1); // Freischaltung bleibt über Level
  s2.reset();
  const s3 = makeStorage(b);
  assert.equal(s3.getToysUnlocked(), 0);
  assert.equal(s3.getBerries(), 0);
});
