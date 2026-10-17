// Fang-Event fuer Pikarlchu: schnell tippen, bis die Energie fuer den Donnerblitz reicht.
// Kein Timeout, kein Scheitern - nur schneller oder langsamer.
import { VIRTUAL_W } from "./config.js";
import { levelData } from "./levels.js";
import { getImg, getSprite } from "./sprites.js";
import { PIKA_ID, PIKA_NAME, CHARGE_GAIN, CHARGE_DECAY, chargeStep } from "./pika.js";
import { makeStorm } from "./fx.js";

const S = VIRTUAL_W;
const POKE = { x: 0.5 * S, y: 0.44 * S };
const BAR = { x: 0.18 * S, y: 0.76 * S, w: 0.64 * S, h: 0.09 * S };
const FLASH_TIME = 2.0;   // laenger, damit das Gewitter ausrollen kann

export function makePikaScreen({ ctx, audio, storage, onDone }) {
  let level = 0, t = 0, taps = 0, phase = "charge", flashT = 0;
  let sparks = [];
  const storm = makeStorm({ ctx, S });

  function start() {
    level = 0; t = 0; taps = 0; phase = "charge"; flashT = 0; sparks = [];
  }

  function onTap() {
    if (phase !== "charge") return;
    taps++;
    audio.play("zap");
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 320;
      sparks.push({ x: POKE.x, y: POKE.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
    }
  }

  function update(dt) {
    t += dt;
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.6; }
    sparks = sparks.filter(s => s.life > 0);

    if (phase === "charge") {
      level = chargeStep(level, dt, taps, CHARGE_GAIN, CHARGE_DECAY);
      taps = 0;
      if (level >= 1) {
        phase = "flash"; flashT = 0;
        audio.play("thunder");
        storm.start({ count: 5, arms: 8, duration: FLASH_TIME, origin: POKE, shake: 16 });
      }
      return;
    }
    flashT += dt;
    storm.update(dt);
    if (flashT >= FLASH_TIME) { storage.setPikaCaught(true); onDone(); }
  }

  function draw() {
    const sh = storm.shakeOffset();
    ctx.save();
    ctx.translate(sh.dx, sh.dy);
    const lv = levelData(storage.getLevel());
    ctx.fillStyle = "#2b2f3a"; ctx.fillRect(0, 0, S, S);
    const bg = getImg(lv.catchbg);
    if (bg) {
      const sc = Math.max(S / bg.width, S / bg.height);
      const dw = bg.width * sc, dh = bg.height * sc;
      ctx.drawImage(bg, (S - dw) / 2, (S - dh) / 2, dw, dh);
    }

    // Name wie im normalen Fang-Screen
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold " + (0.05 * S) + "px system-ui, sans-serif";
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(PIKA_NAME, S / 2, 0.15 * S);
    ctx.fillStyle = "#ffd21e"; ctx.fillText(PIKA_NAME, S / 2, 0.15 * S);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    // Pikarlchu zappelt staerker und leuchtet heller, je voller die Leiste
    const spr = getSprite(PIKA_ID);
    const size = 0.46 * S, ar = spr.width && spr.height ? spr.width / spr.height : 1;
    const shake = Math.sin(t * (18 + level * 40)) * (4 + level * 14);
    ctx.save();
    ctx.shadowColor = "rgba(255,230,80,0.95)";
    ctx.shadowBlur = 10 + level * 70;
    ctx.drawImage(spr, POKE.x - size * ar / 2 + shake, POKE.y - size / 2, size * ar, size);
    ctx.restore();

    for (const s of sparks) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = "#fff36b";
      ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Energie-Leiste
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.roundRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h * 0.4); ctx.fill();
    const fw = BAR.w * level;
    if (fw > 2) {
      ctx.fillStyle = "#ffd21e";
      ctx.beginPath(); ctx.roundRect(BAR.x, BAR.y, fw, BAR.h, BAR.h * 0.4); ctx.fill();
    }
    ctx.strokeStyle = "#333"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h * 0.4); ctx.stroke();

    ctx.restore();          // Ruetteln endet hier - das Gewitter bleibt ruhig im Rahmen
    storm.draw();
  }

  return { start, update, draw, onTap };
}
