import { VIRTUAL_W, VIRTUAL_H, POWERBAR_PERIOD, BOSS_ID, BOSS_BAND } from "./config.js";
import { markerPos } from "./powerbar.js";
import { bandSize, makeBand, randomCenter, inBand } from "./catch.js";
import { getImg, getSprite, wobbleOffset } from "./sprites.js";
import { POKEMON } from "./data.js";

const BAR = { x: 386, y: 210, w: 46, h: 400 };
const BALL = { x: 240, y: 706, r: 58 };
const POKE = { x: 240, y: 330 };
const THROW_TIME = 0.45;
const BAND_PERIOD = 1.9; // Band-Bewegung beim Boss (anders getaktet als Marker)

export function makeCatchScreen({ ctx, audio, onResult }) {
  let id = 1, isBoss = false;
  let phase = "aim";       // aim | throw | success | fail
  let t = 0, resultT = 0, throwT = 0;
  let markerT = 0, bandT = 0, pos = 0;
  let bandSz = 0.16, bandCenter = 0.5, band = { from: 0.4, to: 0.6 };
  let caught = false;
  let particles = [];

  function start(newId) {
    id = newId;
    isBoss = id === BOSS_ID;
    const rarity = (POKEMON.find(p => p.id === id) || {}).rarity || "rare";
    bandSz = isBoss ? BOSS_BAND : bandSize(rarity);
    bandCenter = randomCenter(bandSz);          // Zufallsposition
    band = makeBand(bandCenter, bandSz);
    phase = "aim"; t = 0; markerT = 0; bandT = 0; pos = 0;
    caught = false; particles = [];
  }

  // Beim Boss wandert das Band; sonst bleibt es fest.
  function currentBand() {
    if (!isBoss) return band;
    const m = bandSz / 2;
    const c = m + markerPos(bandT, BAND_PERIOD) * (1 - 2 * m);
    return makeBand(c, bandSz);
  }

  function spawnFireworks(n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 70 + Math.random() * 200;
      particles.push({
        x: POKE.x, y: POKE.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, hue: Math.floor(Math.random() * 360),
      });
    }
  }

  function onTap() {
    if (phase !== "aim") return;
    audio.play("throw");
    pos = markerPos(markerT, POWERBAR_PERIOD);
    caught = inBand(pos, currentBand());
    phase = "throw"; throwT = 0;
  }

  function update(dt) {
    t += dt;
    if (phase === "aim") { markerT += dt; if (isBoss) bandT += dt; return; }
    if (phase === "throw") {
      throwT += dt;
      if (throwT >= THROW_TIME) {
        phase = caught ? "success" : "fail";
        resultT = 0;
        if (caught) { audio.play("caught"); spawnFireworks(isBoss ? 140 : 70); }
        else audio.play("flee");
      }
      return;
    }
    resultT += dt;
    if (phase === "success") {
      if (isBoss && resultT < 1.2 && Math.floor(resultT * 8) % 2 === 0) spawnFireworks(12);
      for (const p of particles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 130 * dt; p.life -= dt * 0.6;
      }
      particles = particles.filter(p => p.life > 0);
    }
    if (resultT > (isBoss ? 2.4 : 1.6)) onResult({ id, caught });
  }

  function drawBall(x, y, r) {
    const img = getImg("ball");
    if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    else {
      ctx.fillStyle = "#e03b3b"; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = "#222"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function draw() {
    ctx.fillStyle = "#7fae5a"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    const bg = getImg("catchbg");
    if (bg) {
      const scale = Math.max(VIRTUAL_W / bg.width, VIRTUAL_H / bg.height);
      const dw = bg.width * scale, dh = bg.height * scale;
      ctx.drawImage(bg, (VIRTUAL_W - dw) / 2, (VIRTUAL_H - dh) / 2, dw, dh);
    }
    const hidden = phase === "success";
    if (!hidden) {
      const wob = wobbleOffset(t, id);
      const spr = getSprite(id);
      const size = isBoss ? 240 : 210;
      const shake = phase === "fail" ? Math.sin(t * 40) * 7 : 0;
      const ar = spr.width && spr.height ? spr.width / spr.height : 1;
      ctx.drawImage(spr, POKE.x - size * ar / 2 + wob.dx + shake, POKE.y - size / 2 + wob.dy, size * ar, size);
    }
    // Leiste + Band (nur beim Zielen)
    if (phase === "aim") {
      const b = currentBand();
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
      const zoneTopY = BAR.y + (1 - b.to) * BAR.h;
      const zoneH = (b.to - b.from) * BAR.h;
      ctx.fillStyle = "#2fbf3a"; ctx.fillRect(BAR.x, zoneTopY, BAR.w, zoneH);
      ctx.strokeStyle = "#0a5"; ctx.lineWidth = 3; ctx.strokeRect(BAR.x, zoneTopY, BAR.w, zoneH);
      ctx.strokeStyle = "#333"; ctx.lineWidth = 3; ctx.strokeRect(BAR.x, BAR.y, BAR.w, BAR.h);
      const mp = markerPos(markerT, POWERBAR_PERIOD);
      const my = BAR.y + (1 - mp) * BAR.h;
      ctx.fillStyle = "#111"; ctx.fillRect(BAR.x - 10, my - 5, BAR.w + 20, 10);
    }
    // Ball
    if (phase === "aim") drawBall(BALL.x, BALL.y, BALL.r);
    else if (phase === "throw") {
      const k = Math.min(1, throwT / THROW_TIME);
      const bx = BALL.x + (POKE.x - BALL.x) * k;
      const by = BALL.y + (POKE.y - BALL.y) * k - Math.sin(k * Math.PI) * 120;
      drawBall(bx, by, BALL.r * (1 - 0.35 * k));
    } else if (phase === "success") {
      drawBall(POKE.x, POKE.y + Math.min(40, resultT * 60), 30);
    } else if (phase === "fail") {
      drawBall(POKE.x + 60, POKE.y + 120 + resultT * 40, 34);
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = `hsl(${p.hue},100%,60%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return {
    start, update, draw, onTap,
    ballHit(x, y) { return Math.hypot(x - BALL.x, y - BALL.y) <= BALL.r + 6; },
  };
}
