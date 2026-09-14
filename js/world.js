import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_ACTIVE_SPAWNS,
         SPAWN_INTERVAL, GRASS_HIT_RADIUS } from "./config.js";
import { stepPlayer, hitsGrass, atHouseDoor } from "./movement.js";
import { pickSpawnId } from "./spawn.js";
import { getImg, playerFrame } from "./sprites.js";

const DOOR = { x: 200, y: 116, w: 80, h: 60 };
const BOUNDS = { minX: 40, minY: 128, maxX: 440, maxY: 780 };
const GRASS = "#95c83a";

export function makeWorld({ ctx, audio, onEncounter, onEnterHouse }) {
  let player = { x: 240, y: 520 };
  let target = { x: 240, y: 520 };
  let keys = new Set();
  let spawns = [];
  let spawnTimer = 0;
  let t = 0;
  let dir = "down";
  let stepT = 0, moving = false;

  function reset() {
    player = { x: 240, y: 520 }; target = { ...player };
    spawns = []; spawnTimer = 0; dir = "down"; moving = false;
  }

  function trySpawn() {
    if (spawns.length >= MAX_ACTIVE_SPAWNS) return;
    const x = 60 + Math.random() * (VIRTUAL_W - 120);
    const y = 250 + Math.random() * (VIRTUAL_H - 340);
    spawns.push({ x, y, id: pickSpawnId(), phase: Math.random() * 6 });
  }

  function keyTarget() {
    let dx = 0, dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
    if (dx || dy) target = { x: player.x + dx * 40, y: player.y + dy * 40 };
  }

  function update(dt) {
    t += dt;
    keyTarget();
    const prev = player;
    player = stepPlayer(player, target, PLAYER_SPEED, dt, BOUNDS);
    const mdx = player.x - prev.x, mdy = player.y - prev.y;
    moving = Math.abs(mdx) + Math.abs(mdy) > 0.1;
    if (moving) {
      if (Math.abs(mdx) > Math.abs(mdy)) dir = mdx > 0 ? "right" : "left";
      else dir = mdy > 0 ? "down" : "up";
      stepT += dt;
    } else {
      stepT = 0;
    }
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) { spawnTimer = 0; trySpawn(); }
    if (atHouseDoor(player, DOOR)) { onEnterHouse(); return; }
    for (const s of spawns) {
      if (hitsGrass(player, s, GRASS_HIT_RADIUS)) {
        audio.play("encounter");
        const id = s.id;
        spawns = spawns.filter(x => x !== s);
        onEncounter(id);
        return;
      }
    }
  }

  function draw() {
    // Hintergrund: Wiese-mit-Haus oben, Gras darunter auffüllen
    ctx.fillStyle = GRASS; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    const world = getImg("world");
    if (world) ctx.drawImage(world, 0, 0, VIRTUAL_W, VIRTUAL_W); // 480x480 oben
    // Raschel-Gras (wackelnde Büschel + Funkeln) als Wegweiser
    for (const s of spawns) {
      const w = Math.sin(t * 12 + s.phase) * 7;
      ctx.strokeStyle = "#2f7d22"; ctx.lineWidth = 7; ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + i * 13, s.y + 20);
        ctx.lineTo(s.x + i * 13 + w, s.y - 16);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,150," + (0.4 + 0.6 * Math.abs(Math.sin(t * 8 + s.phase))) + ")";
      for (const sp of [[18, -20], [-16, -8], [22, 4]]) {
        ctx.beginPath(); ctx.arc(s.x + sp[0], s.y + sp[1], 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Spieler (animierte Lauffigur)
    const step = moving ? (Math.floor(stepT / 0.18) % 2) : 0;
    const fr = playerFrame(dir, step);
    const h = 82, w = fr.img ? h * (fr.img.width / fr.img.height) : 46;
    if (fr.img) {
      ctx.save();
      if (fr.flip) {
        ctx.translate(player.x, 0); ctx.scale(-1, 1);
        ctx.drawImage(fr.img, -w / 2, player.y - h + 8, w, h);
      } else {
        ctx.drawImage(fr.img, player.x - w / 2, player.y - h + 8, w, h);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = "#3355cc";
      ctx.beginPath(); ctx.arc(player.x, player.y - 20, 16, 0, Math.PI * 2); ctx.fill();
    }
  }

  return {
    update, draw, reset,
    onPointer(x, y) { target = { x, y }; },
    setKeys(k) { keys = k; },
  };
}
