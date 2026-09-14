import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_ACTIVE_SPAWNS,
         SPAWN_INTERVAL, GRASS_HIT_RADIUS, BOSS_ID } from "./config.js";
import { stepPlayer, hitsGrass, atHouseDoor } from "./movement.js";
import { pickSpawnId, allMaxed } from "./spawn.js";
import { getImg, playerFrame } from "./sprites.js";

const S = VIRTUAL_W; // quadratisch
// Türzone (Trigger) unter der Haustür; Spielfeld = Gras unter dem Haus
const DOOR = { x: 0.43 * S, y: 0.14 * S, w: 0.14 * S, h: 0.16 * S };
const BOUNDS = { minX: 0.05 * S, minY: 0.28 * S, maxX: 0.95 * S, maxY: 0.97 * S };
const GRASS = "#95c83a";
const PLAYER_H = 0.15 * S;

export function makeWorld({ ctx, audio, storage, onEncounter, onEnterHouse }) {
  let player = { x: 0.5 * S, y: 0.65 * S };
  let target = { x: 0.5 * S, y: 0.65 * S };
  let keys = new Set();
  let spawns = [];
  let spawnTimer = 0;
  let t = 0;
  let dir = "down";
  let stepT = 0, moving = false;
  let wasInDoor = false;

  function reset() {
    player = { x: 0.5 * S, y: 0.65 * S }; target = { ...player };
    spawns = []; spawnTimer = 0; dir = "down"; moving = false; wasInDoor = false;
  }

  function exitHouse() {
    target = { ...player };
    wasInDoor = true;
  }

  function trySpawn() {
    const counts = storage.loadCounts();
    if (allMaxed(counts)) {
      if (storage.isWon()) { spawns = []; return; }
      if (!spawns.some(s => s.id === BOSS_ID)) {
        // großes Grasbüschel ganz unten -> reingehen startet den Bossfight
        spawns = [{ x: 0.5 * S, y: 0.90 * S, id: BOSS_ID, phase: 0, boss: true }];
      }
      return;
    }
    if (spawns.length >= MAX_ACTIVE_SPAWNS) return;
    const x = 0.14 * S + Math.random() * 0.72 * S;
    const y = 0.34 * S + Math.random() * 0.56 * S;
    spawns.push({ x, y, id: pickSpawnId(Math.random, counts), phase: Math.random() * 6 });
  }

  function keyTarget() {
    let dx = 0, dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
    if (dx || dy) target = { x: player.x + dx * 80, y: player.y + dy * 80 };
  }

  function update(dt) {
    t += dt;
    keyTarget();
    const dx = target.x - player.x, dy = target.y - player.y;
    const distToTarget = Math.hypot(dx, dy);
    moving = distToTarget > 4;
    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
      else dir = dy > 0 ? "down" : "up";
      stepT += dt;
    } else stepT = 0;
    player = stepPlayer(player, target, PLAYER_SPEED, dt, BOUNDS);

    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) { spawnTimer = 0; trySpawn(); }

    const inDoor = atHouseDoor(player, DOOR);
    if (inDoor && !wasInDoor) { wasInDoor = true; onEnterHouse(); return; }
    wasInDoor = inDoor;

    for (const s of spawns) {
      const rad = s.boss ? GRASS_HIT_RADIUS * 1.8 : GRASS_HIT_RADIUS;
      if (hitsGrass(player, s, rad)) {
        audio.play("encounter");
        const id = s.id;
        spawns = spawns.filter(x => x !== s);
        onEncounter(id);
        return;
      }
    }
  }

  function draw() {
    ctx.fillStyle = GRASS; ctx.fillRect(0, 0, S, S);
    const world = getImg("world");
    if (world) ctx.drawImage(world, 0, 0, S, S); // ganzes Bild

    for (const s of spawns) {
      if (s.boss) {
        // doppelt großes, wackelndes Grasbüschel (keine kleinen mehr)
        const sway = Math.sin(t * 10 + s.phase) * 24;
        ctx.strokeStyle = "#2f7d22"; ctx.lineWidth = 24; ctx.lineCap = "round";
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(s.x + i * 28, s.y + 64);
          ctx.lineTo(s.x + i * 28 + sway, s.y - 64);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,255,150," + (0.4 + 0.6 * Math.abs(Math.sin(t * 8 + s.phase))) + ")";
        for (const sp of [[54, -66], [-50, -26], [70, 12], [0, -80]]) {
          ctx.beginPath(); ctx.arc(s.x + sp[0], s.y + sp[1], 10, 0, Math.PI * 2); ctx.fill();
        }
        continue;
      }
      const w = Math.sin(t * 12 + s.phase) * 12;
      ctx.strokeStyle = "#2f7d22"; ctx.lineWidth = 12; ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + i * 22, s.y + 34);
        ctx.lineTo(s.x + i * 22 + w, s.y - 26);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,150," + (0.4 + 0.6 * Math.abs(Math.sin(t * 8 + s.phase))) + ")";
      for (const sp of [[30, -34], [-28, -14], [38, 8]]) {
        ctx.beginPath(); ctx.arc(s.x + sp[0], s.y + sp[1], 6, 0, Math.PI * 2); ctx.fill();
      }
    }

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
    update, draw, reset, exitHouse,
    onPointer(x, y) { target = { x, y }; },
    setKeys(k) { keys = k; },
  };
}
