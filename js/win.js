import { VIRTUAL_W } from "./config.js";
import { getImg, getSprite } from "./sprites.js";
import { pokemonForLevel } from "./levels.js";

const S = VIRTUAL_W;
// Zeitachse (Sekunden)
const T_POP = 0.6;        // Ball wächst/wackelt in der Mitte
const T_DANCE_END = 3.4;  // 10 Pokémon kommen raus + tanzen
const T_PARTY_END = 7.6;  // Feuerwerk rastet aus (Solitär-Kaskade)
const CX = S / 2, CY = 0.42 * S, RING = 0.30 * S;
const BTN = { x: S / 2 - 0.16 * S, y: 0.74 * S, w: 0.32 * S, h: 0.13 * S };

export function makeWinScreen({ ctx, audio, onNewGame }) {
  let t = 0, spawnAcc = 0, soundAcc = 0, popped = false;
  let particles = [], confetti = [];
  let partyStarted = false;

  let pool = pokemonForLevel(1);
  function start(p) {
    if (p) pool = p;
    t = 0; spawnAcc = 0; soundAcc = 0; popped = false;
    particles = []; confetti = []; partyStarted = false;
    audio.play("caught");
    for (let i = 0; i < 60; i++) confetti.push(newConfetti());
  }
  function newConfetti() {
    return { x: Math.random() * S, y: Math.random() * -S, vy: 120 + Math.random() * 200,
             vx: (Math.random() - 0.5) * 60, hue: Math.floor(Math.random() * 360), r: 5 + Math.random() * 6 };
  }
  function burst(x, y, n, up) {
    for (let i = 0; i < n; i++) {
      const a = up ? (-Math.PI / 2 + (Math.random() - 0.5) * 1.8) : (Math.random() * Math.PI * 2);
      const sp = 220 + Math.random() * 560;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        hue: Math.floor(Math.random() * 360), r: 5 + Math.random() * 8, life: 1 });
    }
  }

  function phase() {
    if (t < T_POP) return "pop";
    if (t < T_DANCE_END) return "dance";
    if (t < T_PARTY_END) return "party";
    return "trophy";
  }

  function update(dt) {
    t += dt;
    const ph = phase();
    if (ph === "pop" && !popped && t > T_POP * 0.5) { popped = true; audio.play("throw"); }
    if (ph === "dance") {
      for (const c of confetti) {
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.y > S) Object.assign(c, newConfetti(), { y: -10 });
      }
    }
    if (ph === "party") {
      spawnAcc += dt; soundAcc += dt;
      while (spawnAcc > 0.10) {
        spawnAcc -= 0.10;
        burst(0.12 * S + Math.random() * 0.76 * S, S * 0.98, 12, true);
        if (Math.random() < 0.7) burst(Math.random() * S, (0.2 + Math.random() * 0.5) * S, 10, false);
      }
      if (soundAcc > 0.45) { soundAcc = 0; audio.play("throw"); }
      for (const p of particles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1000 * dt;
        if (p.y > S) { p.y = S; p.vy *= -0.6; p.vx *= 0.72; }
        p.life -= dt * 0.14;
      }
      particles = particles.filter(p => p.life > 0 && p.x > -30 && p.x < S + 30);
    }
  }

  function ringRadius() {
    // Pokémon fliegen aus dem Ball: Radius wächst kurz nach dem Pop
    const k = Math.max(0, Math.min(1, (t - T_POP) / 0.5));
    return RING * k;
  }

  function drawPokemonRing() {
    const R = ringRadius();
    for (let i = 0; i < pool.length; i++) {
      const ang = i / pool.length * Math.PI * 2 + t * 0.5;
      const x = CX + Math.cos(ang) * R;
      const y = CY + Math.sin(ang) * R * 0.8;
      const hop = -Math.abs(Math.sin(t * 5 + i)) * 0.035 * S;
      const spr = getSprite(pool[i].id);
      const h = 0.13 * S, ar = spr.width && spr.height ? spr.width / spr.height : 1;
      ctx.save();
      ctx.translate(x, y + hop);
      ctx.rotate(Math.sin(t * 4 + i) * 0.12);
      ctx.drawImage(spr, -h * ar / 2, -h, h * ar, h);
      ctx.restore();
    }
  }

  function drawRestart(cx, cy, r, lw) {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = lw; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.5, Math.PI * 2.1); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx + r, cy - r * 0.75); ctx.lineTo(cx + r * 1.5, cy - r * 0.1); ctx.lineTo(cx + r * 0.5, cy - r * 0.1);
    ctx.closePath(); ctx.fill();
  }

  function draw() {
    const ph = phase();
    if (ph === "pop" || ph === "dance") {
      ctx.fillStyle = "#0e0e18"; ctx.fillRect(0, 0, S, S);
      // Konfetti
      for (const c of confetti) {
        ctx.fillStyle = `hsl(${c.hue},90%,60%)`;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
      }
      // Ball in der Mitte (öffnet sich)
      const ball = getImg("ball");
      if (ph === "pop" && ball) {
        const gr = 0.16 * S * Math.min(1, t / T_POP);
        const shake = Math.sin(t * 40) * 6;
        ctx.drawImage(ball, CX - gr + shake, CY - gr, gr * 2, gr * 2);
      } else if (ringRadius() < RING * 0.3 && ball) {
        const fade = 1 - ringRadius() / (RING * 0.3);
        ctx.globalAlpha = fade; const gr = 0.16 * S;
        ctx.drawImage(ball, CX - gr, CY - gr, gr * 2, gr * 2); ctx.globalAlpha = 1;
      }
      if (ph === "dance") drawPokemonRing();
      partyStarted = false;
      return;
    }
    if (ph === "party") {
      if (!partyStarted) { ctx.fillStyle = "#0e0e18"; ctx.fillRect(0, 0, S, S); partyStarted = true; }
      ctx.fillStyle = "rgba(14,14,24,0.09)"; ctx.fillRect(0, 0, S, S); // Schweife bleiben
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = `hsl(${p.hue},100%,60%)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    // Trophäen-Screen
    ctx.fillStyle = "#141426"; ctx.fillRect(0, 0, S, S);
    ctx.save(); ctx.globalAlpha = 0.22;
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `hsl(${(i * 30 + t * 40) % 360},100%,60%)`;
      ctx.lineWidth = 8;
      const a = i / 12 * Math.PI * 2 + t * 0.3;
      ctx.beginPath(); ctx.moveTo(S / 2, 0.34 * S);
      ctx.lineTo(S / 2 + Math.cos(a) * S, 0.34 * S + Math.sin(a) * S); ctx.stroke();
    }
    ctx.restore();
    const pk = getImg("pokal");
    if (pk) {
      const h = 0.44 * S, ar = pk.width / pk.height, bob = Math.sin(t * 2) * 0.01 * S;
      ctx.save(); ctx.shadowColor = "rgba(255,220,80,0.95)"; ctx.shadowBlur = 70;
      ctx.drawImage(pk, S / 2 - h * ar / 2, 0.14 * S + bob, h * ar, h);
      ctx.restore();
    }
    ctx.fillStyle = "#2b8a3e"; ctx.strokeStyle = "#0d3"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(BTN.x, BTN.y, BTN.w, BTN.h, BTN.h * 0.3); ctx.fill(); ctx.stroke();
    drawRestart(BTN.x + BTN.w / 2, BTN.y + BTN.h / 2, BTN.h * 0.3, BTN.h * 0.1);
  }

  function onTap(x, y) {
    if (phase() !== "trophy") return; // Feier NICHT abbrechbar
    if (x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h) onNewGame();
  }

  return { start, update, draw, onTap };
}
