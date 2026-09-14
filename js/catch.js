import { EASE, GREEN_ZONE } from "./config.js";

const clamp01 = x => Math.max(0, Math.min(1, x));

export function catchChance(pos, rarity) {
  return clamp01(clamp01(pos) * EASE[rarity]);
}

export function attemptCatch(pos, rarity, rng = Math.random) {
  return rng() < catchChance(pos, rarity);
}

export function greenZone(rarity) {
  const size = GREEN_ZONE[rarity];
  return { from: Number((1 - size).toFixed(10)), to: 1 };
}
