import { GREEN_ZONE } from "./config.js";

const clamp01 = x => Math.max(0, Math.min(1, x));

// Bandgröße nach Seltenheit (seltener = schmaler).
export function bandSize(rarity) {
  return GREEN_ZONE[rarity] ?? GREEN_ZONE.rare;
}

// Grünes Band um ein Zentrum bauen (bleibt in [0,1]).
export function makeBand(center, size) {
  return { from: clamp01(center - size / 2), to: clamp01(center + size / 2) };
}

// Zufälliges Zentrum, so dass das Band komplett auf der Leiste bleibt.
export function randomCenter(size, rng = Math.random) {
  const m = size / 2;
  return m + rng() * (1 - 2 * m);
}

// Treffer im Band = gefangen.
export function inBand(pos, band) {
  return pos >= band.from && pos <= band.to;
}
