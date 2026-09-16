// Folge-Mathematik für den Begleiter (DOM-frei, testbar).

// Bewegt pos Richtung target, stoppt bei Abstand <= minDist (kein Überschießen).
export function followStep(pos, target, speed, dt, minDist) {
  const dx = target.x - pos.x, dy = target.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d <= minDist) return { x: pos.x, y: pos.y };
  const step = Math.min(speed * dt, d - minDist);
  return { x: pos.x + (dx / d) * step, y: pos.y + (dy / d) * step };
}

// Punkt gap Pixel hinter dem Spieler (entgegen der Blickrichtung).
const BEHIND = {
  up: { x: 0, y: 1 }, down: { x: 0, y: -1 },
  left: { x: 1, y: 0 }, right: { x: -1, y: 0 },
};
export function trailTarget(player, dir, gap) {
  const o = BEHIND[dir] || { x: 0, y: 0 };
  return { x: player.x + o.x * gap, y: player.y + o.y * gap };
}

// Bewegt pos WEG von threat (in bounds), mit leichtem Drall zur Feldmitte am Rand.
export function fleeStep(pos, threat, speed, dt, bounds) {
  let dx = pos.x - threat.x, dy = pos.y - threat.y;
  let d = Math.hypot(dx, dy);
  if (d < 1e-6) { dx = 1; dy = 0; d = 1; }      // deterministisch nach rechts
  let nx = dx / d, ny = dy / d;
  const cx = (bounds.minX + bounds.maxX) / 2, cy = (bounds.minY + bounds.maxY) / 2;
  const mx = (bounds.maxX - bounds.minX) * 0.18, my = (bounds.maxY - bounds.minY) * 0.18;
  let bx = 0, by = 0;
  if (pos.x < bounds.minX + mx || pos.x > bounds.maxX - mx) bx = cx - pos.x;
  if (pos.y < bounds.minY + my || pos.y > bounds.maxY - my) by = cy - pos.y;
  const bl = Math.hypot(bx, by);
  if (bl > 1e-6) { nx += (bx / bl) * 0.6; ny += (by / bl) * 0.6; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; }
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x + nx * speed * dt)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, pos.y + ny * speed * dt)),
  };
}

// Torwart hält, wenn er nah genug am Ball ist.
export function keeperSaves(ballX, keeperX, reach) {
  return Math.abs(ballX - keeperX) <= reach;
}
