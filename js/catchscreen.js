import { VIRTUAL_W, VIRTUAL_H, POWERBAR_PERIOD } from "./config.js";
import { markerPos } from "./powerbar.js";
import { attemptCatch, greenZone } from "./catch.js";
import { getSprite, wobbleOffset } from "./sprites.js";
import { POKEMON } from "./data.js";

const BAR = { x: 380, y: 200, w: 44, h: 400 }; // vertikale Leiste
const BALL = { x: 240, y: 690, r: 46 };

export function makeCatchScreen({ ctx, audio, onResult }) {
  let id = 1, rarity = "common";
  let phase = "aim";       // aim | success | fail
  let t = 0, resultT = 0;
  let markerT = 0, pos = 0;
  let particles = [];

  function start(newId) {
    id = newId;
    rarity = (POKEMON.find(p => p.id === id) || {}).rarity || "common";
    phase = "aim"; t = 0; markerT = 0; pos = 0; resultT = 0; particles = [];
  }

  function spawnFireworks() {
    particles = [];
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      particles.push({
        x: VIRTUAL_W / 2, y: 300,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, hue: Math.floor(Math.random() * 360),
      });
    }
  }

  function onTap() {
    if (phase !== "aim") return;
    audio.play("throw");
    pos = markerPos(markerT, POWERBAR_PERIOD);
    const caught = attemptCatch(pos, rarity);
    phase = caught ? "success" : "fail";
    resultT = 0;
    if (caught) { audio.play("caught"); spawnFireworks(); }
    else { audio.play("flee"); }
  }

  function update(dt) {
    t += dt;
    if (phase === "aim") { markerT += dt; return; }
    resultT += dt;
    if (phase === "success") {
      for (const p of particles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.life -= dt * 0.7;
      }
      particles = particles.filter(p => p.life > 0);
    }
    if (resultT > 1.6) onResult({ id, caught: phase === "success" });
  }

  function draw() {
    // Hintergrund (Begegnungs-Szene)
    ctx.fillStyle = "#bfe89a"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    ctx.fillStyle = "#9bd36f"; ctx.fillRect(0, 470, VIRTUAL_W, VIRTUAL_H - 470);
    // Wildes Pokémon groß, mit Wackeln
    const wob = wobbleOffset(t, id);
    const spr = getSprite(id);
    const size = 200;
    const shake = phase === "fail" ? Math.sin(t * 40) * 6 : 0;
    ctx.drawImage(spr, VIRTUAL_W / 2 - size / 2 + wob.dx + shake, 240 + wob.dy, size, size);
    // Power-Leiste
    const g = greenZone(rarity);
    ctx.fillStyle = "#ddd"; ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
    // rot->grün Verlauf
    const grad = ctx.createLinearGradient(0, BAR.y + BAR.h, 0, BAR.y);
    grad.addColorStop(0, "#e05a5a"); grad.addColorStop(1, "#5ad06a");
    ctx.fillStyle = grad; ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
    // grüne Zielzone hervorheben
    const zoneTopY = BAR.y + (1 - g.to) * BAR.h;
    const zoneH = (g.to - g.from) * BAR.h;
    ctx.strokeStyle = "#0a5"; ctx.lineWidth = 4;
    ctx.strokeRect(BAR.x - 2, zoneTopY, BAR.w + 4, zoneH);
    // Marker
    const mp = phase === "aim" ? markerPos(markerT, POWERBAR_PERIOD) : pos;
    const my = BAR.y + (1 - mp) * BAR.h;
    ctx.fillStyle = "#222"; ctx.fillRect(BAR.x - 8, my - 4, BAR.w + 16, 8);
    // Ball-Button (gezeichnet, kein Text)
    ctx.fillStyle = "#e03b3b";
    ctx.beginPath(); ctx.arc(BALL.x, BALL.y, BALL.r, 0, Math.PI, true); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(BALL.x, BALL.y, BALL.r, 0, Math.PI, false); ctx.fill();
    ctx.strokeStyle = "#222"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(BALL.x, BALL.y, BALL.r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BALL.x - BALL.r, BALL.y); ctx.lineTo(BALL.x + BALL.r, BALL.y); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(BALL.x, BALL.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    // Feuerwerk
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = `hsl(${p.hue},100%,60%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return {
    start, update, draw, onTap,
    ballHit(x, y) { return Math.hypot(x - BALL.x, y - BALL.y) <= BALL.r; },
  };
}
