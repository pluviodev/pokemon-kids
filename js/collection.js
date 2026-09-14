import { POKEMON } from "./data.js";
import { MAX_PER_SPECIES } from "./config.js";

// Slots mit Zählerstand: count (0..10) und maxed (10 erreicht -> golden).
export function getSlots(counts, pool = POKEMON) {
  return pool.map(p => {
    const count = counts[p.id] || 0;
    return {
      id: p.id,
      name: p.name,
      sprite: p.sprite,
      rarity: p.rarity,
      count,
      maxed: count >= MAX_PER_SPECIES,
    };
  });
}
