import { VIRTUAL_W } from "./config.js";
import { getImg, getSprite, playerFrame } from "./sprites.js";
import { pokemonForLevel } from "./levels.js";
import { followStep } from "./follow.js";
import { unlockedToys } from "./toys.js";

const S = VIRTUAL_W;
const BAR_Y = 0.86 * S;                 // untere Leiste (opak); darüber = spielbar
const PLAYER = { x: 0.5 * S, y: 0.72 * S };
const BALL_R = 0.045 * S;
const THROW_TIME = 0.5;
const FETCH_SPEED = 340;
const NEAR = 0.05 * S;
const BTN = 0.10 * S;

const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function toyButtonRect(i) { return { x: 0.04 * S + i * (BTN + 0.02 * S), y: BAR_Y + (S - BAR_Y - BTN) / 2, w: BTN, h: BTN }; }
const XBTN = { x: S - 0.04 * S - BTN, y: BAR_Y + (S - BAR_Y - BTN) / 2, w: BTN, h: BTN };

export function makePlayScreen({ ctx, storage, audio, onExit }) {
  let mode = "ball";
  let companionId = null;
  let companion = { x: PLAYER.x, y: PLAYER.y };
  let ball = { x: PLAYER.x, y: PLAYER.y - 0.02 * S };
  let phase = "idle";                   // idle | thrown | fetch | carry
  let throwT = 0, from = null, to = null, t = 0;

  function pickCompanion() {
    if (storage.getCompanion() != null) return storage.getCompanion();
    const counts = storage.loadCounts();
    const caught = pokemonForLevel(storage.getLevel()).filter(p => (counts[p.id] || 0) > 0);
    if (caught.length === 0) return null;
    const id = caught[Math.floor(Math.random() * caught.length)].id;
    storage.setCompanion(id);
    return id;
  }

  function enter() {
    companionId = pickCompanion();
    companion = { x: PLAYER.x - 0.12 * S, y: PLAYER.y };
    ball = { x: PLAYER.x, y: PLAYER.y - 0.02 * S };
    phase = "idle"; throwT = 0; from = to = null;
    const toys = unlockedToys(storage.getToysUnlocked());
    mode = toys.length ? toys[0].id : "ball";
  }

  function throwBall(x, y) {
    if (phase !== "idle") return;
    if (companionId == null) { ball = { x: PLAYER.x, y: PLAYER.y - 0.02 * S }; return; }
    from = { ...ball };
    to = { x, y: Math.min(y, BAR_Y - 0.03 * S) };
    phase = "thrown"; throwT = 0; audio.play("throw");
  }

  function onPointer(x, y) {
    if (y >= BAR_Y) {                   // Leiste: nur Buttons/X, keine Spielaktion
      if (inRect(x, y, XBTN)) { onExit(); return; }
      const toys = unlockedToys(storage.getToysUnlocked());
      for (let i = 0; i < toys.length; i++) if (inRect(x, y, toyButtonRect(i))) { mode = toys[i].id; return; }
      return;
    }
    if (mode === "ball") throwBall(x, y);
  }

  function update(dt) {
    t += dt;
    if (phase === "thrown") {
      throwT += dt; const k = Math.min(1, throwT / THROW_TIME);
      ball = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 0.12 * S };
      if (k >= 1) phase = "fetch";
    } else if (phase === "fetch") {
      companion = followStep(companion, ball, FETCH_SPEED, dt, NEAR);
      if (Math.hypot(companion.x - ball.x, companion.y - ball.y) <= NEAR + 1) phase = "carry";
    } else if (phase === "carry") {
      companion = followStep(companion, PLAYER, FETCH_SPEED, dt, NEAR);
      ball = { x: companion.x, y: companion.y - 0.02 * S };
      if (Math.hypot(companion.x - PLAYER.x, companion.y - PLAYER.y) <= NEAR + 1) {
        phase = "idle"; ball = { x: PLAYER.x, y: PLAYER.y - 0.02 * S }; audio.play("caught");
      }
    }
  }

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

  function draw() {
    const field = getImg("playfield");
    if (field) ctx.drawImage(field, 0, 0, S, S);
    else { ctx.fillStyle = "#5aa84a"; ctx.fillRect(0, 0, S, S); }

    if (companionId != null) {
      const spr = getSprite(companionId);
      const h = 0.12 * S, ar = spr.width && spr.height ? spr.width / spr.height : 1;
      ctx.drawImage(spr, companion.x - h * ar / 2, companion.y - h, h * ar, h);
    }
    const fr = playerFrame("down", 0);
    if (fr.img) { const h = 0.15 * S, w = h * (fr.img.width / fr.img.height); ctx.drawImage(fr.img, PLAYER.x - w / 2, PLAYER.y - h + 14, w, h); }
    const b = getImg("playball");
    if (b) ctx.drawImage(b, ball.x - BALL_R, ball.y - BALL_R, BALL_R * 2, BALL_R * 2);

    // untere Leiste (opak) + Buttons + rotes X
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
