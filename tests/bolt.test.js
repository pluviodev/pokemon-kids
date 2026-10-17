import test from "node:test";
import assert from "node:assert/strict";
import { makeBolt, strikeSchedule } from "../js/bolt.js";

// Deterministischer Zufall, damit Tests reproduzierbar sind.
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

test("Blitz behaelt Start- und Endpunkt exakt", () => {
  const from = { x: 100, y: 0 }, to = { x: 420, y: 600 };
  const b = makeBolt(from, to, seeded(1));
  assert.deepEqual(b.points[0], from);
  assert.deepEqual(b.points[b.points.length - 1], to);
});

test("Detailstufe bestimmt die Punktzahl (2^detail + 1)", () => {
  for (const detail of [1, 2, 3, 5]) {
    const b = makeBolt({ x: 0, y: 0 }, { x: 100, y: 100 }, seeded(7), { detail });
    assert.equal(b.points.length, Math.pow(2, detail) + 1);
  }
});

test("Blitz ist gezackt, nicht gerade", () => {
  const b = makeBolt({ x: 0, y: 0 }, { x: 0, y: 500 }, seeded(3), { detail: 5 });
  const abgelenkt = b.points.filter(p => Math.abs(p.x) > 1).length;
  assert.ok(abgelenkt > 5, "zu wenige Punkte weichen von der Geraden ab");
});

test("ohne Verzweigungs-Chance gibt es keine Aeste", () => {
  const b = makeBolt({ x: 0, y: 0 }, { x: 300, y: 300 }, seeded(5), { branchChance: 0 });
  assert.equal(b.branches.length, 0);
});

test("mit Verzweigungs-Chance 1 entstehen Aeste, die am Hauptblitz haengen", () => {
  const b = makeBolt({ x: 0, y: 0 }, { x: 0, y: 600 }, seeded(9), { detail: 4, branchChance: 1 });
  assert.ok(b.branches.length > 0);
  for (const br of b.branches) {
    assert.ok(br.length >= 2);
    const start = br[0];
    const haengtDran = b.points.some(p => p.x === start.x && p.y === start.y);
    assert.ok(haengtDran, "Ast beginnt nicht auf dem Hauptblitz");
  }
});

test("gleicher Seed gibt denselben Blitz", () => {
  const a = makeBolt({ x: 0, y: 0 }, { x: 200, y: 400 }, seeded(42));
  const b = makeBolt({ x: 0, y: 0 }, { x: 200, y: 400 }, seeded(42));
  assert.deepEqual(a.points, b.points);
});

test("Zacken bleiben in einem vernuenftigen Schlauch um die Gerade", () => {
  const from = { x: 0, y: 0 }, to = { x: 0, y: 600 };
  const b = makeBolt(from, to, seeded(11), { detail: 5, jitter: 0.28 });
  for (const p of b.points) assert.ok(Math.abs(p.x) <= 600 * 0.6);
});

test("strikeSchedule: n Einschlaege, aufsteigend, innerhalb des Fensters", () => {
  const ts = strikeSchedule(5, 1.2, seeded(4));
  assert.equal(ts.length, 5);
  assert.equal(ts[0], 0);                       // erster schlaegt sofort ein
  for (let i = 1; i < ts.length; i++) assert.ok(ts[i] > ts[i - 1]);
  assert.ok(ts[ts.length - 1] <= 1.2);
});
