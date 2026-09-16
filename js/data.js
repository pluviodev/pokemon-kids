import { pokemonForLevel } from "./levels.js";

// Level-1-Karls (Rückwärtskompatibilität für Module, die direkt POKEMON nutzen).
export const POKEMON = pokemonForLevel(1);

export function spriteFor(id) {
  const p = POKEMON.find(x => x.id === id);
  return p ? p.sprite : null;
}
