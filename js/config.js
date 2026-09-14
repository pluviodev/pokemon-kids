export const VIRTUAL_W = 480;
export const VIRTUAL_H = 800;
export const PLAYER_SPEED = 180; // virtuelle Pixel pro Sekunde
export const RARITIES = ["common", "uncommon", "rare"];
export const EASE = { common: 1.0, uncommon: 0.75, rare: 0.55 };
// Kleiner grüner Zielbereich (Bruchteil der Leiste). Treffen = gefangen, sonst nicht.
// Seltenere Pokémon = kleinerer Bereich.
export const GREEN_ZONE = { common: 0.16, uncommon: 0.11, rare: 0.07 };
export const GREEN_CENTER = 0.8; // Mitte des Zielbereichs auf der Leiste (0=unten,1=oben)
export const SPAWN_WEIGHT = { common: 5, uncommon: 3, rare: 1.5 };
export const MAX_ACTIVE_SPAWNS = 2;
export const SPAWN_INTERVAL = 2.5; // Sekunden zwischen Spawn-Versuchen
export const GRASS_HIT_RADIUS = 46; // virtuelle Pixel
export const POWERBAR_PERIOD = 1.4; // Sekunden für einen Hoch-Runter-Zyklus
