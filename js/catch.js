import { GREEN_ZONE, GREEN_CENTER } from "./config.js";

const clamp01 = x => Math.max(0, Math.min(1, x));

// Kleines grünes Zielband, zentriert um GREEN_CENTER; seltener = schmaler.
export function greenZone(rarity) {
  const size = GREEN_ZONE[rarity];
  return {
    from: clamp01(GREEN_CENTER - size / 2),
    to: clamp01(GREEN_CENTER + size / 2),
  };
}

// Treffer im grünen Band = gefangen (deterministisch, keine Wahrscheinlichkeit).
export function isCatch(pos, rarity) {
  const g = greenZone(rarity);
  return pos >= g.from && pos <= g.to;
}
