// Zentrale Level-Daten (DOM-frei). Pro Level: Karls, Boss, Asset-Keys, Schwierigkeit.
const RARITY = { common: "common", uncommon: "uncommon", rare: "rare" };

function pk(id, name, rarity) {
  return { id, name, rarity, sprite: `assets/pokemon/${String(id).padStart(2, "0")}.png` };
}

const LEVEL1 = [
  pk(1, "Blitzkarlitz", RARITY.common), pk(2, "Bonkarlbon", RARITY.common),
  pk(3, "Feuferkarl", RARITY.common),   pk(4, "Flatterkarla", RARITY.common),
  pk(5, "Kacabarl", RARITY.uncommon),   pk(6, "Karlfer", RARITY.uncommon),
  pk(7, "Karlklotz", RARITY.uncommon),  pk(8, "Karlkutta", RARITY.rare),
  pk(9, "Krabbelkarlitto", RARITY.rare), pk(10, "Krakarle", RARITY.rare),
];

const LEVEL2 = [
  pk(21, "Kieselkarlo", RARITY.common),  pk(22, "Karatekarlo", RARITY.common),
  pk(23, "Blütenkarl", RARITY.common),   pk(24, "Frostkarl", RARITY.common),
  pk(25, "Spukarl", RARITY.uncommon),    pk(26, "Toxikarla", RARITY.uncommon),
  pk(27, "Mentakarl", RARITY.uncommon),  pk(28, "Drakarl", RARITY.rare),
  pk(29, "Glitzerkarla", RARITY.rare),   pk(30, "Düsterkarl", RARITY.rare),
];

export const LEVELS = [
  {
    n: 1, world: "world", house: "house", catchbg: "catchbg", grass: "grass",
    boss: { id: 11, name: "Lukas", sprite: "assets/pokemon/11.png" },
    diff: { bandMul: 1.0, speedMul: 1.0 },
    pokemon: LEVEL1,
  },
  {
    n: 2, world: "world2", house: "house2", catchbg: "catchbg2", grass: "grass2",
    boss: { id: 12, name: "Lena", sprite: "assets/pokemon/12.png" },
    diff: { bandMul: 0.85, speedMul: 0.9 },
    pokemon: LEVEL2,
  },
];

export const MAX_LEVEL = LEVELS.length;

export function levelData(n) {
  const i = Math.min(MAX_LEVEL, Math.max(1, n | 0)) - 1;
  return LEVELS[i];
}

export function pokemonForLevel(n) {
  return levelData(n).pokemon;
}
