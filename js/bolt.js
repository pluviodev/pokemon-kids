// Verzweigter Blitz als reine Geometrie (DOM-frei, testbar).
// Mittelpunkt-Verschiebung: Strecke immer wieder halbieren und den neuen
// Mittelpunkt quer zur Strecke auslenken - die Auslenkung halbiert sich je Runde.

export function makeBolt(from, to, rng = Math.random, opts = {}) {
  const {
    detail = 5,          // Halbierungs-Runden -> 2^detail + 1 Punkte
    jitter = 0.28,       // erste Auslenkung als Anteil der Gesamtlaenge
    branchChance = 0.22, // Wahrscheinlichkeit je Punkt, dass ein Ast abgeht
    branches: wantBranches = true,
  } = opts;

  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;

  let pts = [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
  let amp = len * jitter;
  for (let d = 0; d < detail; d++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const sx = b.x - a.x, sy = b.y - a.y;
      const sl = Math.hypot(sx, sy) || 1;
      const nx = -sy / sl, ny = sx / sl;         // Normale zur Strecke
      const off = (rng() * 2 - 1) * amp;
      next.push({ x: (a.x + b.x) / 2 + nx * off, y: (a.y + b.y) / 2 + ny * off }, b);
    }
    pts = next;
    amp *= 0.5;
  }

  const branches = [];
  if (wantBranches && branchChance > 0) {
    const ang0 = Math.atan2(dy, dx);
    for (let i = 2; i < pts.length - 2; i++) {
      if (rng() >= branchChance) continue;
      const p = pts[i];
      const bl = len * (0.18 + rng() * 0.3);
      const ang = ang0 + (rng() < 0.5 ? -1 : 1) * (0.4 + rng() * 0.6);
      const end = { x: p.x + Math.cos(ang) * bl, y: p.y + Math.sin(ang) * bl };
      branches.push(makeBolt(p, end, rng, {
        detail: Math.max(1, detail - 2), jitter: jitter * 0.8, branches: false,
      }).points);
    }
  }

  return { points: pts, branches };
}

// Einschlag-Zeitpunkte: der erste sofort, die weiteren versetzt im Fenster.
export function strikeSchedule(count, window, rng = Math.random) {
  const ts = [0];
  for (let i = 1; i < count; i++) {
    const anteil = i / count;
    ts.push(Math.min(window, window * anteil * (0.7 + rng() * 0.5)));
  }
  // streng aufsteigend halten, auch wenn der Zufall mal zurueckspringt
  for (let i = 1; i < ts.length; i++) {
    if (ts[i] <= ts[i - 1]) ts[i] = Math.min(window, ts[i - 1] + window * 0.04);
  }
  return ts;
}
