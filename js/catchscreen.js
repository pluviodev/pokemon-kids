import { VIRTUAL_W, VIRTUAL_H, POWERBAR_PERIOD, PERIOD_BY_RARITY, BOSS_ID, BOSS_BAND } from "./config.js";
import { markerPos } from "./powerbar.js";
import { bandSize, makeBand, randomCenter, inBand } from "./catch.js";
import { getImg, getSprite, wobbleOffset } from "./sprites.js";
import { POKEMON } from "./data.js";

const S = VIRTUAL_W;
const BAR = { x: 0.83 * S, y: 0.28 * S, w: 0.09 * S, h: 0.50 * S };
const BALL = { x: 0.5 * S, y: 0.85 * S, r: 0.11 * S };
const POKE = { x: 0.5 * S, y: 0.42 * S };
const THROW_TIME = 0.45;
const BAND_PERIOD = 3.0; // Band-Bewegung beim Boss – bewusst anderes Tempo als der Marker (2.0)

export function makeCatchScreen({ ctx, audio, onResult }) {
  let id = 1, isBoss = false, name = "";
  let phase = "aim";       // aim | throw | success | fail
  let t = 0, resultT = 0, throwT = 0;
  let markerT = 0, bandT = 0, pos = 0;
  let markerPeriod = POWERBAR_PERIOD;
  let bandSz = 0.16, band = { from: 0.4, to: 0.6 };
  let caught = false;
  let particles = [];

  function start(newId) {
    id = newId;
    isBoss = id === BOSS_ID;
    const entry = POKEMON.find(p => p.id === id) || {};
    name = isBoss ? "Lukas" : (entry.name || "");
    const rarity = entry.rarity || "rare";
    bandSz = isBoss ? BOSS_BAND : bandSize(rarity);
    markerPeriod = isBoss ? POWERBAR_PERIOD : (PERIOD_BY_RARITY[rarity] || POWERBAR_PERIOD);
    band = makeBand(randomCenter(bandSz), bandSz);
    phase = "aim"; t = 0; markerT = 0; bandT = 0; pos = 0;
    caught = false; particles = [];
  }

  function currentBand() {
    if (!isBoss) return band;
    const m = bandSz / 2;
    const c = m + markerPos(bandT, BAND_PERIOD) * (1 - 2 * m);
    return makeBand(c, bandSz);
  }

  function spawnFireworks(n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (120 + Math.random() * 340);
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
    pos = markerPos(markerT, markerPeriod);
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
        if (caught) { audio.play("caught"); spawnFireworks(isBoss ? 160 : 80); }
        else audio.play("flee");
      }
      return;
    }
    resultT += dt;
    if (phase === "success") {
      if (isBoss && resultT < 1.2 && Math.floor(resultT * 8) % 2 === 0) spawnFireworks(16);
      for (const p of particles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt * 0.6;
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
    ctx.fillStyle = "#7fae5a"; ctx.fillRect(0, 0, S, S);
    const bg = getImg("catchbg");
    if (bg) {
      const scale = Math.max(S / bg.width, S / bg.height);
      const dw = bg.width * scale, dh = bg.height * scale;
      ctx.drawImage(bg, (S - dw) / 2, (S - dh) / 2, dw, dh);
    }
    const hidden = phase === "success";
    if (!hidden && name) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "bold " + (0.05 * S) + "px system-ui, sans-serif";
      ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.strokeText(name, S / 2, 0.15 * S);
      ctx.fillStyle = isBoss ? "#ffd21e" : "#ffffff";
      ctx.fillText(name, S / 2, 0.15 * S);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    }
    if (!hidden) {
      const wob = wobbleOffset(t, id);
      const spr = getSprite(id);
      const size = (isBoss ? 0.52 : 0.46) * S;
      const shake = phase === "fail" ? Math.sin(t * 40) * 12 : 0;
      const ar = spr.width && spr.height ? spr.width / spr.height : 1;
      ctx.drawImage(spr, POKE.x - size * ar / 2 + wob.dx + shake, POKE.y - size / 2 + wob.dy, size * ar, size);
    }
    if (phase === "aim") {
      const b = currentBand();
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
      const zoneTopY = BAR.y + (1 - b.to) * BAR.h;
      const zoneH = (b.to - b.from) * BAR.h;
      ctx.fillStyle = "#2fbf3a"; ctx.fillRect(BAR.x, zoneTopY, BAR.w, zoneH);
      ctx.strokeStyle = "#0a5"; ctx.lineWidth = 4; ctx.strokeRect(BAR.x, zoneTopY, BAR.w, zoneH);
      ctx.strokeStyle = "#333"; ctx.lineWidth = 4; ctx.strokeRect(BAR.x, BAR.y, BAR.w, BAR.h);
      const mp = markerPos(markerT, markerPeriod);
      const my = BAR.y + (1 - mp) * BAR.h;
      ctx.fillStyle = "#111"; ctx.fillRect(BAR.x - 18, my - 9, BAR.w + 36, 18);
    }
    if (phase === "aim") drawBall(BALL.x, BALL.y, BALL.r);
    else if (phase === "throw") {
      const k = Math.min(1, throwT / THROW_TIME);
      const bx = BALL.x + (POKE.x - BALL.x) * k;
      const by = BALL.y + (POKE.y - BALL.y) * k - Math.sin(k * Math.PI) * 0.2 * S;
      drawBall(bx, by, BALL.r * (1 - 0.35 * k));
    } else if (phase === "success") {
      drawBall(POKE.x, POKE.y + Math.min(0.06 * S, resultT * 0.09 * S), 0.055 * S);
    } else if (phase === "fail") {
      drawBall(POKE.x + 0.12 * S, POKE.y + 0.2 * S + resultT * 0.08 * S, 0.06 * S);
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = `hsl(${p.hue},100%,60%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return {
    start, update, draw, onTap,
    ballHit(x, y) { return Math.hypot(x - BALL.x, y - BALL.y) <= BALL.r + 10; },
  };
}
