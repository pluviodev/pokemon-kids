import { test } from "node:test";
import assert from "node:assert/strict";
import { TOYS, BERRIES_PER_TOY, collectBerry, unlockedToys } from "../js/toys.js";

test("collectBerry zählt hoch ohne Freischaltung unter der Schwelle", () => {
  const r = collectBerry(0, 0);
  assert.deepEqual(r, { berries: 1, unlocked: 0, unlockedToy: null });
});

test("collectBerry schaltet bei der Schwelle frei und setzt zurück", () => {
  const r = collectBerry(BERRIES_PER_TOY - 1, 0);
  assert.equal(r.berries, 0);
  assert.equal(r.unlocked, 1);
  assert.deepEqual(r.unlockedToy, TOYS[0]);
});

test("collectBerry tut nichts mehr, wenn alle Spiele frei sind", () => {
  const r = collectBerry(0, TOYS.length);
  assert.deepEqual(r, { berries: 0, unlocked: TOYS.length, unlockedToy: null });
});

test("unlockedToys gibt die ersten n Toys", () => {
  assert.deepEqual(unlockedToys(0), []);
  assert.deepEqual(unlockedToys(1), [TOYS[0]]);
});
