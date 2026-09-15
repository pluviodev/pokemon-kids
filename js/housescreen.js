import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_PER_SPECIES } from "./config.js";
import { getSlots } from "./collection.js";
import { getSprite, getGoldSprite, getImg, playerFrame } from "./sprites.js";
import { stepPlayer } from "./movement.js";

const S = VIRTUAL_W; // quadratisch, Haus-Bild füllt das ganze Feld
const XS = [0.171, 0.335, 0.498, 0.663, 0.827];
const ROW_Y = [0.34, 0.60];
const BOUNDS = { minX: 0.08 * S, minY: 0.27 * S, maxX: 0.92 * S, maxY: 0.95 * S };
// Großzügiger Ausgangs-Streifen unten (kindgerecht: viel Platz zum Antippen).
// Abstand zur unteren Podest-Reihe (y 0.60) bleibt, damit man nicht versehentlich rausläuft.
const EXIT = { x: 0.12 * S, y: 0.80 * S, w: 0.76 * S, h: 0.19 * S };
const PLAYER_H = 0.15 * S;
const SPR_H = 0.15 * S;

function pedestalPos(i) {
  return { x: XS[i % 5] * S, y: ROW_Y[Math.floor(i / 5)] * S };
}

// Statuen/Podeste sind Hindernisse (schmaler Fuß -> dazwischen laufbar)
function blocked(x, y) {
  for (let i = 0; i < 10; i++) {
    const p = pedestalPos(i);
    if (x > p.x - 0.05 * S && x < p.x + 0.05 * S && y > p.y - 0.02 * S && y < p.y + 0.016 * S) return true;
  }
  return false;
}

export function makeHouseScreen({ ctx, storage, onExit }) {
  let player = { x: 0.5 * S, y: 0.92 * S };
  let target = { x: 0.5 * S, y: 0.92 * S };
  let keys = new Set();
  let dir = "up";
  let stepT = 0, moving = false, t = 0;
  let wasInExit = true;

  function enter() {
    player = { x: 0.5 * S, y: 0.92 * S }; target = { ...player };
    dir = "up"; moving = false; wasInExit = true;
  }

  function keyTarget() {
    let dx = 0, dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
    if (dx || dy) target = { x: player.x + dx * 80, y: player.y + dy * 80 };
  }

  const inExit = p => p.x >= EXIT.x && p.x <= EXIT.x + EXIT.w && p.y >= EXIT.y && p.y <= EXIT.y + EXIT.h;

  function update(dt) {
    t += dt;
    keyTarget();
    const dx = target.x - player.x, dy = target.y - player.y;
    const dist = Math.hypot(dx, dy);
    moving = dist > 4;
    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
      else dir = dy > 0 ? "down" : "up";
      stepT += dt;
    } else stepT = 0;

    const nx = stepPlayer(player, { x: target.x, y: player.y }, PLAYER_SPEED, dt, BOUNDS);
    if (!blocked(nx.x, player.y)) player = { x: nx.x, y: player.y };
    const ny = stepPlayer(player, { x: player.x, y: target.y }, PLAYER_SPEED, dt, BOUNDS);
    if (!blocked(player.x, ny.y)) player = { x: player.x, y: ny.y };

    const nowExit = inExit(player);
    if (nowExit && !wasInExit) { onExit(); return; }
    wasInExit = nowExit;
  }

  function draw() {
    ctx.fillStyle = "#4a3420"; ctx.fillRect(0, 0, S, S);
    const house = getImg("house");
    if (house) ctx.drawImage(house, 0, 0, S, S);

    const slots = getSlots(storage.loadCounts());
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    slots.forEach((s, i) => {
      const p = pedestalPos(i);
      if (s.count > 0) {
        const spr = s.maxed ? getGoldSprite(s.id) : getSprite(s.id);
        const h = SPR_H, ar = spr.width && spr.height ? spr.width / spr.height : 1;
        if (s.maxed) { ctx.save(); ctx.shadowColor = "rgba(255,210,50,0.9)"; ctx.shadowBlur = 30; }
        ctx.drawImage(spr, p.x - h * ar / 2, p.y - h + 20, h * ar, h);
        if (s.maxed) ctx.restore();
        // Name über dem Sprite (auf Spaltenbreite skaliert)
        let px = 0.03 * S;
        for (; px >= 0.018 * S; px--) { ctx.font = "bold " + px + "px system-ui, sans-serif"; if (ctx.measureText(s.name).width <= 0.16 * S) break; }
        ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.8)";
        ctx.strokeText(s.name, p.x, p.y - 0.155 * S);
        ctx.fillStyle = s.maxed ? "#ffd21e" : "#ffffff";
        ctx.fillText(s.name, p.x, p.y - 0.155 * S);
      } else {
        ctx.fillStyle = "rgba(20,12,6,0.5)";
        ctx.beginPath(); ctx.arc(p.x, p.y - 0.03 * S, 0.045 * S, 0, Math.PI * 2); ctx.fill();
      }
      // Zähler X/10
      ctx.font = "bold " + (0.038 * S) + "px system-ui, sans-serif";
      const label = s.count + "/" + MAX_PER_SPECIES;
      ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.strokeText(label, p.x, p.y + 0.05 * S);
      ctx.fillStyle = s.maxed ? "#ffd21e" : "#ffffff";
      ctx.fillText(label, p.x, p.y + 0.05 * S);
    });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    const step = moving ? (Math.floor(stepT / 0.22) % 2) : 0;
    const fr = playerFrame(dir, step);
    const h = PLAYER_H, w = fr.img ? h * (fr.img.width / fr.img.height) : 0.1 * S;
    if (fr.img) {
      ctx.save();
      if (fr.flip) {
        ctx.translate(player.x, 0); ctx.scale(-1, 1);
        ctx.drawImage(fr.img, -w / 2, player.y - h + 14, w, h);
      } else {
        ctx.drawImage(fr.img, player.x - w / 2, player.y - h + 14, w, h);
      }
      ctx.restore();
    }
  }

  return {
    enter, update, draw,
    onPointer(x, y) { target = { x, y }; },
    setKeys(k) { keys = k; },
  };
}
