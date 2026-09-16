import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_ACTIVE_SPAWNS,
         SPAWN_INTERVAL, GRASS_HIT_RADIUS } from "./config.js";
import { stepPlayer, hitsGrass, atHouseDoor } from "./movement.js";
import { pickSpawnId, allMaxed } from "./spawn.js";
import { getImg, playerFrame, getSprite } from "./sprites.js";
import { levelData, pokemonForLevel } from "./levels.js";
import { followStep, trailTarget } from "./follow.js";

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
  let lv = levelData(storage.getLevel());

  let companionId = null;
  let companion = { x: player.x, y: player.y };
  const GAP = 0.11 * S, MIN_DIST = 0.05 * S;

  function loadCompanion() {
    companionId = storage.getCompanion();
    companion = { x: player.x, y: player.y };
  }
  loadCompanion(); // Erststart (Wiese ist Start-Screen, reset() läuft dabei nicht)

  function reset() {
    lv = levelData(storage.getLevel());
    player = { x: 0.5 * S, y: 0.65 * S }; target = { ...player };
    spawns = []; spawnTimer = 0; dir = "down"; moving = false; wasInDoor = false;
    loadCompanion();
  }

  function exitHouse() {
    target = { ...player };
    wasInDoor = true;
    loadCompanion();
  }

  function trySpawn() {
    const counts = storage.loadCounts();
    const pool = pokemonForLevel(lv.n);
    const bossId = lv.boss.id;
    if (allMaxed(counts, pool)) {
      if (storage.isWon()) { spawns = []; return; }
      if (!spawns.some(s => s.id === bossId)) {
        // großes Grasbüschel ganz unten -> reingehen startet den Bossfight
        spawns = [{ x: 0.5 * S, y: 0.90 * S, id: bossId, phase: 0, boss: true }];
      }
      return;
    }
    if (spawns.length >= MAX_ACTIVE_SPAWNS) return;
    const x = 0.14 * S + Math.random() * 0.72 * S;
    const y = 0.34 * S + Math.random() * 0.56 * S;
    spawns.push({ x, y, id: pickSpawnId(Math.random, counts, pool, bossId), phase: Math.random() * 6 });
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

    if (companionId != null) {
      const tgt = trailTarget(player, dir, GAP);
      companion = followStep(companion, tgt, PLAYER_SPEED, dt, MIN_DIST);
    }

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
    const world = getImg(lv.world);
    if (world) ctx.drawImage(world, 0, 0, S, S); // ganzes Bild

    // Grasbüschel-Sprite mit Wackeln + umherfliegenden gelben Punkten
    function drawGrass(s, h, dotCount) {
      const spr = getImg(lv.grass);
      const sway = Math.sin(t * 3 + s.phase) * 0.09; // Neigung hin/her
      if (spr) {
        const ar = spr.width / spr.height, w = h * ar;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(sway);
        ctx.drawImage(spr, -w / 2, -h, w, h);
        ctx.restore();
      }
      for (let i = 0; i < dotCount; i++) {
        const a = t * 2.2 + (i / dotCount) * Math.PI * 2 + s.phase;
        const dx = Math.cos(a) * h * 0.95;
        const dy = -h * 0.55 + Math.sin(a * 1.4) * h * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6 + i);
        ctx.fillStyle = "#ffe64d";
        ctx.shadowColor = "rgba(255,230,80,0.9)"; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(s.x + dx, s.y + dy, h * 0.055, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    for (const s of spawns) {
      drawGrass(s, s.boss ? 0.26 * S : 0.13 * S, s.boss ? 9 : 5);
    }

    if (companionId != null) {
      const spr = getSprite(companionId);
      const ch = 0.11 * S, car = spr.width && spr.height ? spr.width / spr.height : 1;
      const bob = Math.sin(t * 6) * 0.012 * S;
      ctx.drawImage(spr, companion.x - ch * car / 2, companion.y - ch + bob, ch * car, ch);
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
