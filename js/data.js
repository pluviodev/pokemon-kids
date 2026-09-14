const RARITY_BY_ID = {
  1: "common", 2: "common", 3: "common", 4: "common",
  5: "uncommon", 6: "uncommon", 7: "uncommon",
  8: "rare", 9: "rare", 10: "rare",
};

export const POKEMON = Object.keys(RARITY_BY_ID).map(k => {
  const id = Number(k);
  return {
    id,
    sprite: `assets/pokemon/${String(id).padStart(2, "0")}.png`,
    rarity: RARITY_BY_ID[id],
  };
});

export function spriteFor(id) {
  const p = POKEMON.find(x => x.id === id);
  return p ? p.sprite : null;
}
