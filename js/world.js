import { VIRTUAL_W, VIRTUAL_H, PLAYER_SPEED, MAX_ACTIVE_SPAWNS,
         SPAWN_INTERVAL, GRASS_HIT_RADIUS } from "./config.js";
import { stepPlayer, hitsGrass, atHouseDoor } from "./movement.js";
import { pickSpawnId, allMaxed } from "./spawn.js";
import { getImg, playerFrame, getSprite } from "./sprites.js";
import { levelData, pokemonForLevel } from "./levels.js";
import { followStep, trailTarget } from "./follow.js";
import { BERRIES_PER_TOY } from "./toys.js";
import { PIKA_ID, PIKA_HITS_NEEDED, APPEAR_GAP, PEEK_TIME, DASH_TIME, TAP_RADIUS,
         BURST_NEED, BURST_WINDOW, BURST_COOLDOWN,
         pickAppearance, dashX, hitsAppearance, isBurst } from "./pika.js";

const S = VIRTUAL_W; // quadratisch
// Türzone (Trigger) unter der Haustür; Spielfeld = Gras unter dem Haus
const DOOR = { x: 0.43 * S, y: 0.14 * S, w: 0.14 * S, h: 0.16 * S };
const BOUNDS = { minX: 0.05 * S, minY: 0.28 * S, maxX: 0.95 * S, maxY: 0.97 * S };
const GRASS = "#95c83a";
const PLAYER_H = 0.15 * S;

export function makeWorld({ ctx, audio, storage, onEncounter, onEnterHouse, onBerry, onPikaCatch }) {
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

  // Pikarlchu: Auftritte auf der Wiese + Blitz-Salve als Begleiter
  let pika = null;               // {kind, spot|y, fromLeft, t}
  let pikaTimer = APPEAR_GAP.min;
  let pikaHitFx = [];
  let tapTimes = [];
  let burstT = -BURST_COOLDOWN;

  // Eine Quelle fuer Zeichnen UND Treffer, damit Sicht und Tap nie auseinanderlaufen.
  const PIKA_H = 0.13 * S;              // Zeichenhoehe des Auftritts
  function pikaPos() {                  // Fusspunkt (dort steht er)
    if (!pika) return null;
    if (pika.kind === "peek") return { x: pika.spot.x * S, y: pika.spot.y * S };
    return { x: dashX(pika.t, DASH_TIME, pika.fromLeft, S, 0.12 * S), y: pika.y * S };
  }
  // Mitte der SICHTBAREN Figur: beim Lugen ist er unten angeschnitten, der Kopf
  // sitzt also deutlich hoeher als der Fusspunkt - sonst tippt das Kind daneben.
  function pikaHitCenter() {
    const p = pikaPos();
    if (!p) return null;
    return { x: p.x, y: p.y - PIKA_H * (pika.kind === "peek" ? 0.68 : 0.5) };
  }

  function loadCompanion() {
    companionId = storage.getCompanion();
    companion = { x: player.x, y: player.y };
  }
  loadCompanion(); // Erststart (Wiese ist Start-Screen, reset() läuft dabei nicht)

  function reset() {
    lv = levelData(storage.getLevel());
    player = { x: 0.5 * S, y: 0.65 * S }; target = { ...player };
    spawns = []; spawnTimer = 0; dir = "down"; moving = false; wasInDoor = false;
    pika = null; pikaHitFx = []; tapTimes = [];
    loadCompanion();
  }

  function exitHouse() {
    target = { ...player };
    wasInDoor = true;
    pika = null; tapTimes = [];
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
    // Beere (seltener als Gras, aber grob jedes 3. Mal), unabhängig vom Gras-Limit, max 1
    if (!spawns.some(s => s.berry) && Math.random() < 0.30) {
      spawns.push({ x: 0.14 * S + Math.random() * 0.72 * S, y: 0.34 * S + Math.random() * 0.56 * S, berry: true, phase: Math.random() * 6 });
    }
    if (spawns.filter(s => !s.berry).length >= MAX_ACTIVE_SPAWNS) return;
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

    // Pikarlchu-Auftritte: nur solange nicht gefangen und kein Boss wartet
    if (!storage.isPikaCaught() && !spawns.some(s => s.boss)) {
      if (pika) {
        pika.t += dt;
        if (pika.t >= (pika.kind === "peek" ? PEEK_TIME : DASH_TIME)) pika = null;
      } else {
        pikaTimer -= dt;
        if (pikaTimer <= 0) {
          pika = { ...pickAppearance(Math.random), t: 0 };
          pikaTimer = APPEAR_GAP.min + Math.random() * (APPEAR_GAP.max - APPEAR_GAP.min);
        }
      }
    } else pika = null;

    for (const f of pikaHitFx) { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt * 1.4; }
    pikaHitFx = pikaHitFx.filter(f => f.life > 0);

    const inDoor = atHouseDoor(player, DOOR);
    if (inDoor && !wasInDoor) { wasInDoor = true; onEnterHouse(); return; }
    wasInDoor = inDoor;

    for (const s of spawns) {
      const rad = s.boss ? GRASS_HIT_RADIUS * 1.8 : GRASS_HIT_RADIUS;
      if (hitsGrass(player, s, rad)) {
        spawns = spawns.filter(x => x !== s);
        if (s.berry) {
          audio.play("caught");
          onBerry(storage.collectBerry());     // Beere einsammeln (kein Fang-Screen)
        } else {
          audio.play("encounter");
          onEncounter(s.id);
        }
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
    function drawBerry(s) {
      const sway = Math.sin(t * 3 + s.phase) * 0.08;
      const spr = getImg("berry");
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(sway);
      if (spr) {
        const h = 0.10 * S, w = h * (spr.width / spr.height);
        ctx.drawImage(spr, -w / 2, -h * 0.7, w, h);
      } else {
        ctx.fillStyle = "#d63a4a"; ctx.beginPath(); ctx.arc(0, 0, 0.03 * S, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    for (const s of spawns) {
      if (s.berry) drawBerry(s);
      else drawGrass(s, s.boss ? 0.26 * S : 0.13 * S, s.boss ? 9 : 5);
    }

    // Pikarlchu-Auftritt
    const pp = pikaPos();
    if (pp) {
      const spr = getSprite(PIKA_ID);
      const h = PIKA_H, ar = spr.width && spr.height ? spr.width / spr.height : 1;
      const wob = Math.sin(t * 9) * 0.008 * S;
      ctx.save();
      if (pika.kind === "peek") {
        // unten anschneiden -> er steckt sichtbar hinter dem Objekt
        ctx.beginPath(); ctx.rect(pp.x - h, pp.y - h, h * 2, h * 0.62); ctx.clip();
      }
      ctx.shadowColor = "rgba(255,230,80,0.9)"; ctx.shadowBlur = 18;
      ctx.drawImage(spr, pp.x - h * ar / 2 + wob, pp.y - h, h * ar, h);
      ctx.restore();
    }
    for (const f of pikaHitFx) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = "#fff36b";
      ctx.beginPath(); ctx.arc(f.x, f.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

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

    // Glas unten-links: Beeren-Fortschritt 0..BERRIES_PER_TOY
    const jx = 0.05 * S, jy = 0.79 * S, jw = 0.09 * S, jh = 0.14 * S;
    const p = Math.min(1, storage.getBerries() / BERRIES_PER_TOY);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(jx, jy, jw, jh, 8); ctx.fill(); ctx.stroke();
    const innerH = jh - 8, fh = innerH * p;
    ctx.fillStyle = "#d63a4a";
    ctx.fillRect(jx + 4, jy + 4 + (innerH - fh), jw - 8, fh);
    ctx.restore();

    // Pikarlchu-Treffer: 5 Blitz-Zeichen neben dem Glas
    if (!storage.isPikaCaught()) {
      const hits = storage.getPikaHits();
      for (let i = 0; i < PIKA_HITS_NEEDED; i++) {
        const bx = jx + jw + 0.03 * S + i * 0.045 * S, by = jy + jh * 0.5;
        ctx.save();
        ctx.fillStyle = i < hits ? "#ffd21e" : "rgba(0,0,0,0.35)";
        ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, by - 0.025 * S);
        ctx.lineTo(bx - 0.012 * S, by);
        ctx.lineTo(bx + 0.002 * S, by);
        ctx.lineTo(bx - 0.006 * S, by + 0.025 * S);
        ctx.lineTo(bx + 0.014 * S, by - 0.004 * S);
        ctx.lineTo(bx + 0.001 * S, by - 0.004 * S);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    // Donnerblitz-Show des Begleiters
    const bt = t - burstT;
    if (bt < 1.2) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - bt / 1.2) * (Math.sin(bt * 40) > -0.3 ? 0.85 : 0.2);
      ctx.fillStyle = "#fffbe0"; ctx.fillRect(0, 0, S, S);
      ctx.restore();
    }
  }

  return {
    update, draw, reset, exitHouse,
    onPointer(x, y) {
      const r = TAP_RADIUS * S;
      // 1) laufender Auftritt getroffen? -> zaehlt, Figur laeuft dabei NICHT los
      const p = pikaHitCenter();
      if (p && hitsAppearance({ x, y }, p, r)) {
        audio.play("zap");
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 300;
          pikaHitFx.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
        }
        pika = null;
        const hits = storage.addPikaHit();
        if (hits >= PIKA_HITS_NEEDED) onPikaCatch();
        return;
      }
      // 2) Begleiter Pikarlchu angetippt? -> Salve zaehlen
      if (companionId === PIKA_ID &&
          hitsAppearance({ x, y }, { x: companion.x, y: companion.y - 0.05 * S }, r)) {
        tapTimes = tapTimes.filter(ts => t - ts <= BURST_WINDOW);
        tapTimes.push(t);
        if (t - burstT >= BURST_COOLDOWN && isBurst(tapTimes, t, BURST_NEED, BURST_WINDOW)) {
          burstT = t; tapTimes = []; audio.play("thunder");
        }
        return;
      }
      target = { x, y };
    },
    setKeys(k) { keys = k; },
  };
}
