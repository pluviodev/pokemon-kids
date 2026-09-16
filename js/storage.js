import { pokemonForLevel, MAX_LEVEL } from "./levels.js";
import { MAX_PER_SPECIES } from "./config.js";
import { collectBerry as toyCollect } from "./toys.js";

const COUNTS_KEY = "pk_counts";
const SOUND_KEY = "pk_sound";
const WON_KEY = "pk_won";
const LEVEL_KEY = "pk_level";
const COMPANION_KEY = "pk_companion";
const BERRIES_KEY = "pk_berries";
const TOYS_KEY = "pk_toys";

export function makeStorage(backend = localStorage) {
  function getLevel() {
    const n = parseInt(backend.getItem(LEVEL_KEY), 10);
    return Number.isInteger(n) && n >= 1 ? Math.min(MAX_LEVEL, n) : 1;
  }
  function setLevel(n) { backend.setItem(LEVEL_KEY, String(Math.min(MAX_LEVEL, Math.max(1, n | 0)))); }
  function activePool() { return pokemonForLevel(getLevel()); }

  function getCompanion() {
    const id = parseInt(backend.getItem(COMPANION_KEY), 10);
    if (!Number.isInteger(id)) return null;
    if (!activePool().some(p => p.id === id)) return null;
    return (loadCounts()[id] || 0) > 0 ? id : null;
  }
  function setCompanion(id) { backend.setItem(COMPANION_KEY, id == null ? "" : String(id)); }
  function toggleCompanion(id) {
    const cur = parseInt(backend.getItem(COMPANION_KEY), 10);
    setCompanion(cur === id ? null : id);
  }

  function getBerries() { const n = parseInt(backend.getItem(BERRIES_KEY), 10); return Number.isInteger(n) && n > 0 ? n : 0; }
  function getToysUnlocked() { const n = parseInt(backend.getItem(TOYS_KEY), 10); return Number.isInteger(n) && n > 0 ? n : 0; }
  function isPlayUnlocked() { return getToysUnlocked() >= 1; }
  function collectBerry() {
    const r = toyCollect(getBerries(), getToysUnlocked());
    backend.setItem(BERRIES_KEY, String(r.berries));
    backend.setItem(TOYS_KEY, String(r.unlocked));
    return r.unlockedToy;
  }

  function loadCounts() {
    const counts = {};
    for (const p of activePool()) counts[p.id] = 0;
    try {
      const raw = backend.getItem(COUNTS_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        for (const p of activePool()) {
          const n = obj[p.id];
          if (Number.isInteger(n) && n > 0) counts[p.id] = Math.min(MAX_PER_SPECIES, n);
        }
      }
    } catch { /* kaputt -> alles 0 */ }
    return counts;
  }
  function saveCounts(counts) {
    backend.setItem(COUNTS_KEY, JSON.stringify(counts));
  }
  function getCount(id) {
    return loadCounts()[id] || 0;
  }
  function addCatch(id) {
    const counts = loadCounts();
    counts[id] = Math.min(MAX_PER_SPECIES, (counts[id] || 0) + 1);
    saveCounts(counts);
    return counts;
  }
  function penaltyAll() {
    const counts = loadCounts();
    for (const p of activePool()) counts[p.id] = Math.max(0, (counts[p.id] || 0) - 1);
    saveCounts(counts);
    setWon(false);
    return counts;
  }
  function isWon() { return backend.getItem(WON_KEY) === "1"; }
  function setWon(on) { backend.setItem(WON_KEY, on ? "1" : "0"); }
  function reset() {
    backend.setItem(COUNTS_KEY, JSON.stringify({}));
    setLevel(1);
    setWon(false);
    setCompanion(null);
    backend.setItem(BERRIES_KEY, "0");
    backend.setItem(TOYS_KEY, "0");
  }
  function advanceLevel() {
    setLevel(getLevel() + 1);
    backend.setItem(COUNTS_KEY, JSON.stringify({}));
    setWon(false);
    setCompanion(null);
  }
  function isSoundOn() { return backend.getItem(SOUND_KEY) !== "0"; }
  function setSound(on) { backend.setItem(SOUND_KEY, on ? "1" : "0"); }

  return { loadCounts, getCount, addCatch, penaltyAll, isWon, setWon, reset,
           getLevel, setLevel, advanceLevel, getCompanion, setCompanion, toggleCompanion,
           getBerries, getToysUnlocked, isPlayUnlocked, collectBerry, isSoundOn, setSound };
}
