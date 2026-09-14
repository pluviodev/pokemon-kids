const CAUGHT_KEY = "pk_caught";
const SOUND_KEY = "pk_sound";

export function makeStorage(backend = localStorage) {
  function loadCaught() {
    try {
      const raw = backend.getItem(CAUGHT_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.filter(n => Number.isInteger(n)));
    } catch {
      return new Set();
    }
  }
  function addCaught(id) {
    const set = loadCaught();
    set.add(id);
    backend.setItem(CAUGHT_KEY, JSON.stringify([...set]));
    return set;
  }
  function isSoundOn() {
    return backend.getItem(SOUND_KEY) !== "0";
  }
  function setSound(on) {
    backend.setItem(SOUND_KEY, on ? "1" : "0");
  }
  return { loadCaught, addCaught, isSoundOn, setSound };
}
