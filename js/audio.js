export function makeAudio(storage) {
  let ctx = null;
  const ensure = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
    return ctx;
  };
  const TONES = {
    throw:     [{ f: 440, d: 0.08 }],
    caught:    [{ f: 660, d: 0.1 }, { f: 880, d: 0.1 }, { f: 1320, d: 0.16 }],
    flee:      [{ f: 300, d: 0.12 }, { f: 180, d: 0.16 }],
    encounter: [{ f: 520, d: 0.06 }, { f: 780, d: 0.06 }],
  };
  function play(name) {
    if (!storage.isSoundOn()) return;
    const c = ensure(); if (!c) return;
    let t = c.currentTime;
    for (const note of TONES[name] || []) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "square";
      osc.frequency.value = note.f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.d);
      osc.connect(gain).connect(c.destination);
      osc.start(t); osc.stop(t + note.d);
      t += note.d;
    }
  }
  return {
    play,
    toggle() { storage.setSound(!storage.isSoundOn()); return storage.isSoundOn(); },
    isOn() { return storage.isSoundOn(); },
  };
}
