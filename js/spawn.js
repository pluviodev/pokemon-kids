import { SPAWN_WEIGHT, MAX_PER_SPECIES, BOSS_ID } from "./config.js";
import { POKEMON } from "./data.js";

// Arten, die noch nicht 10x gefangen wurden.
export function availableIds(counts, pool = POKEMON) {
  return pool.filter(p => (counts[p.id] || 0) < MAX_PER_SPECIES);
}

// Alle 10 Arten golden?
export function allMaxed(counts, pool = POKEMON) {
  return availableIds(counts, pool).length === 0;
}

// Nächstes Spawn: gewichtet unter den noch offenen Arten; sind alle golden -> Boss.
export function pickSpawnId(rng = Math.random, counts = {}, pool = POKEMON, bossId = BOSS_ID) {
  const avail = availableIds(counts, pool);
  if (avail.length === 0) return bossId;
  const total = avail.reduce((s, p) => s + SPAWN_WEIGHT[p.rarity], 0);
  let r = rng() * total;
  for (const p of avail) {
    r -= SPAWN_WEIGHT[p.rarity];
    if (r < 0) return p.id;
  }
  return avail[avail.length - 1].id;
}
