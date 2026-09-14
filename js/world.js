import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_ACTIVE_SPAWNS,
         SPAWN_INTERVAL, GRASS_HIT_RADIUS } from "./config.js";
import { stepPlayer, hitsGrass, atHouseDoor } from "./movement.js";
import { pickSpawnId } from "./spawn.js";
import { getSprite, wobbleOffset } from "./sprites.js";

const DOOR = { x: 200, y: 120, w: 80, h: 60 };
const BOUNDS = { minX: 30, minY: 200, maxX: 450, maxY: 770 };

export function makeWorld({ ctx, audio, onEncounter, onEnterHouse }) {
  let player = { x: 240, y: 500 };
  let target = { x: 240, y: 500 };
  let keys = new Set();
  let spawns = [];
  let spawnTimer = 0;
  let t = 0;

  function reset() {
    player = { x: 240, y: 500 }; target = { ...player };
    spawns = []; spawnTimer = 0;
  }

  function trySpawn() {
    if (spawns.length >= MAX_ACTIVE_SPAWNS) return;
    const x = 60 + Math.random() * (VIRTUAL_W - 120);
    const y = 230 + Math.random() * (VIRTUAL_H - 300);
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
    player = stepPlayer(player, target, PLAYER_SPEED, dt, BOUNDS);
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) { spawnTimer = 0; trySpawn(); }
    // Tür?
    if (atHouseDoor(player, DOOR)) { onEnterHouse(); return; }
    // Begegnung?
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
    // Wiese
    ctx.fillStyle = "#7ec850"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    // Haus oben
    ctx.fillStyle = "#c98b52"; ctx.fillRect(160, 40, 160, 120);
    ctx.fillStyle = "#8a3b2f"; // Dach
    ctx.beginPath(); ctx.moveTo(150, 40); ctx.lineTo(240, 0); ctx.lineTo(330, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#5b2a1e"; ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h); // Tür
    // Raschel-Gras (wackelnde Büschel + Funkeln)
    for (const s of spawns) {
      const w = Math.sin(t * 12 + s.phase) * 6;
      ctx.strokeStyle = "#3f8f2f"; ctx.lineWidth = 6; ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + i * 12, s.y + 18);
        ctx.lineTo(s.x + i * 12 + w, s.y - 14);
        ctx.stroke();
      }
      // Funkeln
      ctx.fillStyle = "rgba(255,255,180," + (0.5 + 0.5 * Math.sin(t * 8 + s.phase)) + ")";
      ctx.beginPath(); ctx.arc(s.x + 16, s.y - 18, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Spieler (einfache gezeichnete Figur, kein Emoji)
    ctx.fillStyle = "#3355cc";
    ctx.beginPath(); ctx.arc(player.x, player.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd9b3";
    ctx.beginPath(); ctx.arc(player.x, player.y - 8, 9, 0, Math.PI * 2); ctx.fill();
  }

  return {
    update, draw, reset,
    onPointer(x, y) { target = { x, y }; },
    setKeys(k) { keys = k; },
  };
}
