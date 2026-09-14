import { POKEMON } from "./data.js";

export function getSlots(caughtSet, pool = POKEMON) {
  return pool.map(p => ({
    id: p.id,
    sprite: p.sprite,
    rarity: p.rarity,
    caught: caughtSet.has(p.id),
  }));
}
