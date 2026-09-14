const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function stepPlayer(pos, target, speed, dt, bounds) {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  let nx = target.x, ny = target.y;
  const move = speed * dt;
  if (dist > move && dist > 0) {
    nx = pos.x + (dx / dist) * move;
    ny = pos.y + (dy / dist) * move;
  }
  return {
    x: clamp(nx, bounds.minX, bounds.maxX),
    y: clamp(ny, bounds.minY, bounds.maxY),
  };
}

export function hitsGrass(pos, point, radius) {
  return Math.hypot(pos.x - point.x, pos.y - point.y) < radius;
}

export function atHouseDoor(pos, door) {
  return pos.x >= door.x && pos.x <= door.x + door.w &&
         pos.y >= door.y && pos.y <= door.y + door.h;
}
