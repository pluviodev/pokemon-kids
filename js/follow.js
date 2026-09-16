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
