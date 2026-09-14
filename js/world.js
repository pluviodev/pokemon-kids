import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_ACTIVE_SPAWNS,
         SPAWN_INTERVAL, GRASS_HIT_RADIUS, BOSS_ID } from "./config.js";
import { stepPlayer, hitsGrass, atHouseDoor } from "./movement.js";
import { pickSpawnId, allMaxed } from "./spawn.js";
import { getImg, playerFrame } from "./sprites.js";

const DOOR = { x: 196, y: 130, w: 66, h: 66 };
const BOUNDS = { minX: 22, minY: 150, maxX: 458, maxY: 792 };
const GRASS = "#95c83a";

export function makeWorld({ ctx, audio, storage, onEncounter, onEnterHouse }) {
  let player = { x: 240, y: 540 };
  let target = { x: 240, y: 540 };
  let keys = new Set();
  let spawns = [];
  let spawnTimer = 0;
  let t = 0;
  let dir = "down";
  let stepT = 0, moving = false;
  let wasInDoor = false;

  function reset() {
    player = { x: 240, y: 540 }; target = { ...player };
    spawns = []; spawnTimer = 0; dir = "down"; moving = false; wasInDoor = false;
  }

  // Beim Verlassen des Hauses: stehen bleiben, Tür „entschärft" bis man rausläuft
  function exitHouse() {
    target = { ...player };
    wasInDoor = true;
  }

  function trySpawn() {
    const counts = storage.loadCounts();
    // Alle Arten golden: Boss (Lukas) erscheint einmalig, solange nicht gewonnen
    if (allMaxed(counts)) {
      if (storage.isWon()) { spawns = []; return; }
      if (!spawns.some(s => s.id === BOSS_ID)) {
        spawns = [{ x: VIRTUAL_W / 2, y: 430, id: BOSS_ID, phase: 0, boss: true }];
      }
      return;
    }
    if (spawns.length >= MAX_ACTIVE_SPAWNS) return;
    const x = 60 + Math.random() * (VIRTUAL_W - 120);
    const y = 260 + Math.random() * (VIRTUAL_H - 340);
    spawns.push({ x, y, id: pickSpawnId(Math.random, counts), phase: Math.random() * 6 });
  }

  function keyTarget() {
    let dx = 0, dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) dy += 1;
    if (dx || dy) target = { x: player.x + dx * 50, y: player.y + dy * 50 };
  }

  function update(dt) {
    t += dt;
    keyTarget();
    // Richtung & Lauf-Status aus dem Ziel ableiten (stabil, kein Frame-Flackern)
    const dx = target.x - player.x, dy = target.y - player.y;
    const distToTarget = Math.hypot(dx, dy);
    moving = distToTarget > 3;
    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? "right" : "left";
      else dir = dy > 0 ? "down" : "up";
      stepT += dt;
    } else {
      stepT = 0;
    }
    player = stepPlayer(player, target, PLAYER_SPEED, dt, BOUNDS);

    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) { spawnTimer = 0; trySpawn(); }

    // Tür: nur beim Reinlaufen auslösen (steigende Flanke)
    const inDoor = atHouseDoor(player, DOOR);
    if (inDoor && !wasInDoor) { wasInDoor = true; onEnterHouse(); return; }
    wasInDoor = inDoor;

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
    // Hintergrund bildschirmfüllend (Cover-Crop, kein grüner Rest)
    ctx.fillStyle = GRASS; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    const world = getImg("world");
    if (world) {
      const scale = Math.max(VIRTUAL_W / world.width, VIRTUAL_H / world.height);
      const dw = world.width * scale, dh = world.height * scale;
      ctx.drawImage(world, (VIRTUAL_W - dw) / 2, (VIRTUAL_H - dh) / 2, dw, dh);
    }
    // Raschel-Gras (Wegweiser) bzw. Boss (Lukas) sichtbar mit Gold-Glühen
    for (const s of spawns) {
      if (s.boss) {
        const spr = getImg("pk11");
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 3));
        ctx.save();
        ctx.shadowColor = "rgba(255,210,50," + pulse + ")";
        ctx.shadowBlur = 40;
        const size = 150, ar = spr && spr.height ? spr.width / spr.height : 1;
        if (spr) ctx.drawImage(spr, s.x - size * ar / 2, s.y - size, size * ar, size);
        ctx.restore();
        continue;
      }
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
    // Spieler (2-Frame-Lauf, ruhig getaktet; Füße am player.y verankert)
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
    } else {
      ctx.fillStyle = "#3355cc";
      ctx.beginPath(); ctx.arc(player.x, player.y - 20, 16, 0, Math.PI * 2); ctx.fill();
    }
  }

  return {
    update, draw, reset, exitHouse,
    onPointer(x, y) { target = { x, y }; },
    setKeys(k) { keys = k; },
  };
}
