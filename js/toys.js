// Freischaltbare Spiele + Beeren-Freischalt-Logik (DOM-frei, testbar).
export const BERRIES_PER_TOY = 20;

export const TOYS = [
  { id: "ball", icon: "playball" },   // Paket 2/3 hängen hier "fussball"/"fangen" an
];

// Eine Beere dazu -> neuer Zustand + evtl. neu freigeschaltetes Toy (sonst null).
export function collectBerry(berries, unlocked) {
  if (unlocked >= TOYS.length) return { berries, unlocked, unlockedToy: null };
  const b = berries + 1;
  if (b >= BERRIES_PER_TOY) return { berries: 0, unlocked: unlocked + 1, unlockedToy: TOYS[unlocked] };
  return { berries: b, unlocked, unlockedToy: null };
}

export function unlockedToys(unlocked) {
  return TOYS.slice(0, unlocked);
}
