import { VIRTUAL_W, PLAYER_SPEED } from "./config.js";
import { getImg, getSprite, playerFrame } from "./sprites.js";
import { pokemonForLevel } from "./levels.js";
import { followStep, fleeStep, keeperSaves } from "./follow.js";
import { stepPlayer } from "./movement.js";
import { unlockedToys } from "./toys.js";

const S = VIRTUAL_W;
const BAR_Y = 0.86 * S;                 // untere Leiste (opak); darüber = spielbar
const HOME = { x: 0.5 * S, y: 0.72 * S }; // feste Figur-Position (Ball/Fußball)
const BALL_R = 0.045 * S;
const THROW_TIME = 0.5;
const FETCH_SPEED = 340;
const NEAR = 0.05 * S;
const BTN = 0.10 * S;
// Fußball
const GOAL_Y = 0.15 * S, KEEPER_Y = 0.20 * S, GOAL_HALF = 0.28 * S, KEEPER_REACH = 0.06 * S, SHOT_TIME = 0.5;
// Fangen
const FIELD = { minX: 0.06 * S, minY: 0.10 * S, maxX: 0.94 * S, maxY: BAR_Y - 0.04 * S };
const FLEE_SPEED = 285, CATCH_R = 0.07 * S;

const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function toyButtonRect(i) { return { x: 0.04 * S + i * (BTN + 0.02 * S), y: BAR_Y + (S - BAR_Y - BTN) / 2, w: BTN, h: BTN }; }
const XBTN = { x: S - 0.04 * S - BTN, y: BAR_Y + (S - BAR_Y - BTN) / 2, w: BTN, h: BTN };

export function makePlayScreen({ ctx, storage, audio, onExit }) {
  let mode = "ball";
  let companionId = null;
  let companion = { x: HOME.x, y: HOME.y };
  let player = { x: HOME.x, y: HOME.y };
  let target = { x: HOME.x, y: HOME.y };
  let ball = { x: HOME.x, y: HOME.y - 0.02 * S };
  let phase = "idle";
  let throwT = 0, resultT = 0, from = null, to = null, t = 0;
  let particles = [];

  function pickCompanion() {
    if (storage.getCompanion() != null) return storage.getCompanion();
    const counts = storage.loadCounts();
    const caught = pokemonForLevel(storage.getLevel()).filter(p => (counts[p.id] || 0) > 0);
    if (caught.length === 0) return null;
    const id = caught[Math.floor(Math.random() * caught.length)].id;
    storage.setCompanion(id);
    return id;
  }

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 300;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hue: Math.floor(Math.random() * 360), life: 1 });
    }
  }
  function updateParticles(dt) {
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt * 0.6; }
    particles = particles.filter(p => p.life > 0);
  }
  function farFrom(pt) {
    for (let i = 0; i < 20; i++) {
      const x = FIELD.minX + Math.random() * (FIELD.maxX - FIELD.minX);
      const y = FIELD.minY + Math.random() * (FIELD.maxY - FIELD.minY);
      if (Math.hypot(x - pt.x, y - pt.y) > 0.4 * S) return { x, y };
    }
    return { x: FIELD.minX, y: FIELD.minY };
  }

  function resetMode() {
    player = { x: HOME.x, y: HOME.y }; target = { ...player };
    ball = { x: HOME.x, y: HOME.y - 0.02 * S };
    particles = [];
    if (mode === "ball") { phase = "idle"; companion = { x: HOME.x - 0.12 * S, y: HOME.y }; }
    else if (mode === "fussball") { phase = "aim"; companion = { x: 0.5 * S, y: KEEPER_Y }; }
    else { phase = "run"; companion = { x: 0.5 * S, y: 0.30 * S }; } // fangen
  }

  function enter() {
    companionId = pickCompanion();
    const toys = unlockedToys(storage.getToysUnlocked());
    mode = toys.length ? toys[0].id : "ball";
    resetMode();
  }

  // --- Ball (apportieren) ---
  function throwBall(x, y) {
    if (phase !== "idle") return;
    if (companionId == null) { ball = { x: HOME.x, y: HOME.y - 0.02 * S }; return; }
    from = { ...ball }; to = { x, y: Math.min(y, BAR_Y - 0.03 * S) };
    phase = "thrown"; throwT = 0; audio.play("throw");
  }
  function updateBall(dt) {
    if (phase === "thrown") {
      throwT += dt; const k = Math.min(1, throwT / THROW_TIME);
      ball = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 0.12 * S };
      if (k >= 1) phase = "fetch";
    } else if (phase === "fetch") {
      companion = followStep(companion, ball, FETCH_SPEED, dt, NEAR);
      if (Math.hypot(companion.x - ball.x, companion.y - ball.y) <= NEAR + 1) phase = "carry";
    } else if (phase === "carry") {
      companion = followStep(companion, HOME, FETCH_SPEED, dt, NEAR);
      ball = { x: companion.x, y: companion.y - 0.02 * S };
      if (Math.hypot(companion.x - HOME.x, companion.y - HOME.y) <= NEAR + 1) { phase = "idle"; ball = { x: HOME.x, y: HOME.y - 0.02 * S }; audio.play("caught"); }
    }
  }

  // --- Fußball (Torwart) ---
  function shoot(x) {
    if (phase !== "aim") return;
    from = { x: HOME.x, y: HOME.y - 0.02 * S };
    to = { x: Math.max(0.5 * S - GOAL_HALF, Math.min(0.5 * S + GOAL_HALF, x)), y: GOAL_Y };
    phase = "shot"; throwT = 0; audio.play("throw");
  }
  function updateFussball(dt) {
    companion = { x: 0.5 * S + Math.sin(t * 1.7) * (GOAL_HALF - 0.04 * S), y: KEEPER_Y };
    if (phase === "shot") {
      throwT += dt; const k = Math.min(1, throwT / SHOT_TIME);
      ball = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      if (k >= 1) {
        phase = keeperSaves(ball.x, companion.x, KEEPER_REACH) ? "save" : "goal";
        resultT = 0;
        if (phase === "goal") { burst(ball.x, ball.y, 44); audio.play("caught"); } else audio.play("flee");
      }
    } else if (phase === "goal" || phase === "save") {
      resultT += dt; updateParticles(dt);
      if (resultT > 1.0) { phase = "aim"; ball = { x: HOME.x, y: HOME.y - 0.02 * S }; }
    }
  }

  // --- Fangen ---
  function updateFangen(dt) {
    player = stepPlayer(player, target, PLAYER_SPEED, dt, FIELD);
    companion = fleeStep(companion, player, FLEE_SPEED, dt, FIELD);
    if (Math.hypot(player.x - companion.x, player.y - companion.y) <= CATCH_R) {
      burst(companion.x, companion.y, 34); audio.play("caught");
      companion = farFrom(player);
    }
    updateParticles(dt);
  }

  function onPointer(x, y) {
    if (y >= BAR_Y) {
      if (inRect(x, y, XBTN)) { onExit(); return; }
      const toys = unlockedToys(storage.getToysUnlocked());
      for (let i = 0; i < toys.length; i++) if (inRect(x, y, toyButtonRect(i))) { if (toys[i].id !== mode) { mode = toys[i].id; resetMode(); } return; }
      return;
    }
    if (mode === "ball") throwBall(x, y);
    else if (mode === "fussball") shoot(x);
    else target = { x: Math.max(FIELD.minX, Math.min(FIELD.maxX, x)), y: Math.max(FIELD.minY, Math.min(FIELD.maxY, y)) };
  }

  function update(dt) {
    t += dt;
    if (mode === "ball") updateBall(dt);
    else if (mode === "fussball") updateFussball(dt);
    else updateFangen(dt);
  }

  // --- Zeichnen ---
  function button(r, active, fill) {
    ctx.fillStyle = fill || (active ? "#3aa0d0" : "#5c5c72");
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, r.w * 0.22); ctx.fill(); ctx.stroke();
  }
  function drawX(r) {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = r.w * 0.12; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(r.x + 0.3 * r.w, r.y + 0.3 * r.h); ctx.lineTo(r.x + 0.7 * r.w, r.y + 0.7 * r.h);
    ctx.moveTo(r.x + 0.7 * r.w, r.y + 0.3 * r.h); ctx.lineTo(r.x + 0.3 * r.w, r.y + 0.7 * r.h);
    ctx.stroke();
  }
  function drawParticles() {
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = `hsl(${p.hue},100%,60%)`; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function drawMon(pos, h) {
    const spr = getSprite(companionId); if (!spr) return;
    const ar = spr.width && spr.height ? spr.width / spr.height : 1;
    ctx.drawImage(spr, pos.x - h * ar / 2, pos.y - h, h * ar, h);
  }
  function drawFigure(pos) {
    const fr = playerFrame("down", 0);
    if (fr.img) { const h = 0.15 * S, w = h * (fr.img.width / fr.img.height); ctx.drawImage(fr.img, pos.x - w / 2, pos.y - h + 14, w, h); }
  }

  function draw() {
    const field = getImg("playfield");
    if (field) ctx.drawImage(field, 0, 0, S, S);
    else { ctx.fillStyle = "#5aa84a"; ctx.fillRect(0, 0, S, S); }

    if (mode === "fussball") {
      const g = getImg("goal");
      if (g) { const w = 2 * GOAL_HALF + 0.06 * S, h = w * (g.height / g.width); ctx.drawImage(g, 0.5 * S - w / 2, GOAL_Y - h * 0.7, w, h); }
    }
    if (companionId != null) drawMon(companion, 0.12 * S);
    drawFigure(player);
    if (mode !== "fangen") {
      const img = mode === "fussball" ? getImg("soccerball") : getImg("playball");
      if (img) ctx.drawImage(img, ball.x - BALL_R, ball.y - BALL_R, BALL_R * 2, BALL_R * 2);
    }
    drawParticles();

    ctx.fillStyle = "#23232f"; ctx.fillRect(0, BAR_Y, S, S - BAR_Y);
    const toys = unlockedToys(storage.getToysUnlocked());
    toys.forEach((toy, i) => {
      const r = toyButtonRect(i); button(r, toy.id === mode);
      const ic = getImg(toy.icon);
      if (ic) ctx.drawImage(ic, r.x + 0.12 * r.w, r.y + 0.12 * r.h, r.w * 0.76, r.h * 0.76);
    });
    button(XBTN, false, "#c0392b"); drawX(XBTN);
  }

  return { enter, update, draw, onPointer };
}
