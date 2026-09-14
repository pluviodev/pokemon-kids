import { SPAWN_WEIGHT } from "./config.js";
import { POKEMON } from "./data.js";

export function pickSpawnId(rng = Math.random, pool = POKEMON) {
  const total = pool.reduce((s, p) => s + SPAWN_WEIGHT[p.rarity], 0);
  let r = rng() * total;
  for (const p of pool) {
    r -= SPAWN_WEIGHT[p.rarity];
    if (r < 0) return p.id;
  }
  return pool[pool.length - 1].id;
}
