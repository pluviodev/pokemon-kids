import { POKEMON } from "./data.js";
import { MAX_PER_SPECIES } from "./config.js";

const COUNTS_KEY = "pk_counts";
const SOUND_KEY = "pk_sound";
const WON_KEY = "pk_won";

export function makeStorage(backend = localStorage) {
  function loadCounts() {
    const counts = {};
    for (const p of POKEMON) counts[p.id] = 0;
    try {
      const raw = backend.getItem(COUNTS_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        for (const p of POKEMON) {
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
    for (const p of POKEMON) counts[p.id] = Math.max(0, (counts[p.id] || 0) - 1);
    saveCounts(counts);
    setWon(false);
    return counts;
  }
  function isWon() { return backend.getItem(WON_KEY) === "1"; }
  function setWon(on) { backend.setItem(WON_KEY, on ? "1" : "0"); }
  function reset() {
    backend.setItem(COUNTS_KEY, JSON.stringify({}));
    setWon(false);
  }
  function isSoundOn() { return backend.getItem(SOUND_KEY) !== "0"; }
  function setSound(on) { backend.setItem(SOUND_KEY, on ? "1" : "0"); }

  return { loadCounts, getCount, addCatch, penaltyAll, isWon, setWon, reset, isSoundOn, setSound };
}
