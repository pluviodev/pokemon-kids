import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED } from "./config.js";
import { getSlots } from "./collection.js";
import { getSprite, getImg, playerFrame } from "./sprites.js";
import { stepPlayer } from "./movement.js";

const OFY = (VIRTUAL_H - VIRTUAL_W) / 2; // Haus-Bild quadratisch, vertikal zentriert
const XS = [0.171, 0.335, 0.498, 0.663, 0.827];
const ROW_Y = [0.34, 0.60];
const BOUNDS = { minX: 58, minY: 300, maxX: 422, maxY: 612 };
const EXIT = { x: 198, y: 598, w: 84, h: 48 }; // Tür unten = raus

function pedestalPos(i) {
  const fx = XS[i % 5];
  const fy = ROW_Y[Math.floor(i / 5)];
  return { x: fx * VIRTUAL_W, y: OFY + fy * VIRTUAL_W };
}

// Statuen/Podeste sind Hindernisse (Fuß-Rechteck)
function blocked(x, y) {
  for (let i = 0; i < 10; i++) {
    const p = pedestalPos(i);
    // nur der Podest-Fuß blockt (schmal genug, um dazwischen zu laufen)
    if (x > p.x - 26 && x < p.x + 26 && y > p.y - 16 && y < p.y + 14) return true;
  }
  return false;
}

export function makeHouseScreen({ ctx, storage, onExit }) {
  let player = { x: 240, y: 600 };
  let target = { x: 240, y: 600 };
  let keys = new Set();
  let dir = "up";
  let stepT = 0, moving = false, t = 0;
  let wasInExit = true;

  function enter() {
    player = { x: 240, y: 600 }; target = { ...player };
    dir = "up"; moving = false; wasInExit = true;
  }

  function keyTarget() {
    let dx = 0, dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
    if (dx || dy) target = { x: player.x + dx * 50, y: player.y + dy * 50 };
  }

  function inExit(p) {
    return p.x >= EXIT.x && p.x <= EXIT.x + EXIT.w && p.y >= EXIT.y && p.y <= EXIT.y + EXIT.h;
  }

  function update(dt) {
    t += dt;
    keyTarget();
    const dx = target.x - player.x, dy = target.y - player.y;
    const dist = Math.hypot(dx, dy);
    moving = dist > 3;
    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
      else dir = dy > 0 ? "down" : "up";
      stepT += dt;
    } else stepT = 0;

    // Achsen-getrennt bewegen + an Hindernissen abgleiten
    const nx = stepPlayer(player, { x: target.x, y: player.y }, PLAYER_SPEED, dt, BOUNDS);
    if (!blocked(nx.x, player.y)) player = { x: nx.x, y: player.y };
    const ny = stepPlayer(player, { x: player.x, y: target.y }, PLAYER_SPEED, dt, BOUNDS);
    if (!blocked(player.x, ny.y)) player = { x: player.x, y: ny.y };

    // Tür unten: nur beim Reinlaufen (steigende Flanke) raus
    const nowExit = inExit(player);
    if (nowExit && !wasInExit) { onExit(); return; }
    wasInExit = nowExit;
  }

  function draw() {
    ctx.fillStyle = "#4a3420"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    const house = getImg("house");
    if (house) ctx.drawImage(house, 0, OFY, VIRTUAL_W, VIRTUAL_W);

    const slots = getSlots(storage.loadCaught());
    slots.forEach((s, i) => {
      const p = pedestalPos(i);
      if (s.caught) {
        const spr = getSprite(s.id);
        const h = 92, ar = spr.width && spr.height ? spr.width / spr.height : 1;
        ctx.drawImage(spr, p.x - h * ar / 2, p.y - h + 16, h * ar, h);
      } else {
        ctx.fillStyle = "rgba(20,12,6,0.5)";
        ctx.beginPath(); ctx.arc(p.x, p.y - 18, 26, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#d8c49a"; ctx.lineWidth = 6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(p.x, p.y - 26, 10, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 16); ctx.lineTo(p.x, p.y - 6); ctx.stroke();
        ctx.fillStyle = "#d8c49a"; ctx.beginPath(); ctx.arc(p.x, p.y + 2, 4, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Spieler (läuft im Raum)
    const step = moving ? (Math.floor(stepT / 0.22) % 2) : 0;
    const fr = playerFrame(dir, step);
    const h = 84, w = fr.img ? h * (fr.img.width / fr.img.height) : 46;
    if (fr.img) {
      ctx.save();
      if (fr.flip) {
        ctx.translate(player.x, 0); ctx.scale(-1, 1);
        ctx.drawImage(fr.img, -w / 2, player.y - h + 8, w, h);
      } else {
        ctx.drawImage(fr.img, player.x - w / 2, player.y - h + 8, w, h);
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
