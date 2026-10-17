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
    zap:       [{ f: 1100, d: 0.05 }, { f: 1500, d: 0.05 }],
  };

  // Rauschpuffer, einmal erzeugt und wiederverwendet (2,5 s reichen fuer den Donner).
  let noiseBuf = null;
  function noise(c) {
    if (!noiseBuf) {
      const n = Math.floor(c.sampleRate * 2.5);
      noiseBuf = c.createBuffer(1, n, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    return src;
  }

  // Donner: heller Knall, der in ein tiefes, lang ausrollendes Grollen faellt.
  function playThunder() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime, dur = 2.2;

    const src = noise(c);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3200, t0);
    lp.frequency.exponentialRampToValueAtTime(130, t0 + dur);   // Knall -> Grollen
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.45, t0 + 0.015);      // Einschlag
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);      // rollt aus
    src.connect(lp).connect(g).connect(c.destination);
    src.start(t0); src.stop(t0 + dur);

    // tiefes Rumpeln darunter
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(70, t0);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + dur);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.32, t0 + 0.05);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.9);
    osc.connect(og).connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur);
  }

  // Knistern beim Aufladen: kurzer Rausch-Zisch ueber dem Piep.
  function playCrackle() {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime, dur = 0.09;
    const src = noise(c);
    const hp = c.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 1800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(hp).connect(g).connect(c.destination);
    src.start(t0); src.stop(t0 + dur);
  }

  function play(name) {
    if (!storage.isSoundOn()) return;
    const c = ensure(); if (!c) return;
    if (name === "thunder") { playThunder(); return; }
    if (name === "zap") playCrackle();          // Zisch + Piep zusammen
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
