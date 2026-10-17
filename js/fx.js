// Gewitter-Effekt: einschlagende Blitze + Entladung aus einem Punkt heraus.
// Bewusst GEDAEMPFT: der Hintergrund hellt weich auf, es wird nicht gestroboskopt.
// Die Wucht kommt aus den gezackten Blitzen, dem Ruetteln und dem Donner.
import { makeBolt, strikeSchedule } from "./bolt.js";

const STRIKE_LIFE = 0.16;   // wie lange ein einzelner Blitz steht
const GLOW_MAX = 0.42;      // Deckel fuer das Aufhellen (gedaempft)

export function makeStorm({ ctx, S }) {
  let t = 0, dur = 0, active = false;
  let pending = [];           // {at, kind}
  let bolts = [];             // {bolt, born, width}
  let rings = [];             // {x, y, born}
  let origin = { x: 0.5 * S, y: 0.5 * S };
  let shakeAmp = 0;

  // count = Einschlaege von oben, arms = Entladungsarme aus dem Zentrum
  function start({ count = 4, arms = 6, duration = 1.4, origin: o = null, shake = 12 } = {}) {
    t = 0; dur = duration; active = true;
    bolts = []; rings = [];
    origin = o || { x: 0.5 * S, y: 0.44 * S };
    shakeAmp = shake;
    pending = strikeSchedule(count, duration * 0.6).map(at => ({ at, kind: "sky" }));
    for (let i = 0; i < arms; i++) pending.push({ at: 0.02 + i * 0.03, kind: "arm", i, arms });
    pending.sort((a, b) => a.at - b.at);
  }

  function spawnSky() {
    // schlaegt irgendwo oben ein und endet nahe dem Zentrum
    const fromX = 0.1 * S + Math.random() * 0.8 * S;
    const to = {
      x: origin.x + (Math.random() * 2 - 1) * 0.18 * S,
      y: origin.y + (Math.random() * 2 - 1) * 0.08 * S,
    };
    bolts.push({
      bolt: makeBolt({ x: fromX, y: -0.05 * S }, to, Math.random, { detail: 5, jitter: 0.22 }),
      born: t, width: 7 + Math.random() * 5,
    });
    rings.push({ x: to.x, y: to.y, born: t });
  }

  function spawnArm(i, arms) {
    const a = (i / arms) * Math.PI * 2 + Math.random() * 0.4;
    const len = (0.22 + Math.random() * 0.16) * S;
    bolts.push({
      bolt: makeBolt(origin, { x: origin.x + Math.cos(a) * len, y: origin.y + Math.sin(a) * len },
                     Math.random, { detail: 4, jitter: 0.3, branchChance: 0.18 }),
      born: t, width: 4 + Math.random() * 3,
    });
  }

  function update(dt) {
    if (!active) return;
    t += dt;
    while (pending.length && pending[0].at <= t) {
      const p = pending.shift();
      if (p.kind === "sky") spawnSky(); else spawnArm(p.i, p.arms);
    }
    bolts = bolts.filter(b => t - b.born < STRIKE_LIFE);
    rings = rings.filter(r => t - r.born < 0.5);
    if (t > dur && pending.length === 0 && bolts.length === 0) active = false;
  }

  // Weiches Aufhellen: Summe abklingender Pulse, gedeckelt - kein Flackern.
  function glowLevel() {
    if (!active) return 0;
    let g = 0;
    for (const b of bolts) g += 1 - (t - b.born) / STRIKE_LIFE;
    const ausklang = Math.max(0, 1 - t / dur);
    return Math.min(GLOW_MAX, g * 0.16 + ausklang * 0.12);
  }

  function shakeOffset() {
    if (!active) return { dx: 0, dy: 0 };
    const k = Math.max(0, 1 - t / (dur * 0.7));
    const a = shakeAmp * k * k;
    return { dx: Math.sin(t * 47) * a, dy: Math.cos(t * 61) * a };
  }

  function strokeBolt(points, width, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  function draw() {
    if (!active) return;
    // 1) weiches Aufhellen des ganzen Bildes
    const g = glowLevel();
    if (g > 0.002) {
      ctx.save();
      ctx.globalAlpha = g;
      ctx.fillStyle = "#fdf6d8";
      ctx.fillRect(0, 0, S, S);
      ctx.restore();
    }
    // 2) Ringwellen am Einschlagpunkt
    ctx.save();
    for (const r of rings) {
      const k = (t - r.born) / 0.5;
      ctx.globalAlpha = Math.max(0, 1 - k) * 0.5;
      ctx.strokeStyle = "#fff6b0"; ctx.lineWidth = 8 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, k * 0.3 * S, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    // 3) die Blitze selbst: breiter Schein, heller Kern
    ctx.save();
    ctx.shadowColor = "rgba(180,220,255,0.95)";
    for (const b of bolts) {
      const k = (t - b.born) / STRIKE_LIFE;
      const a = Math.max(0, 1 - k * k);
      ctx.shadowBlur = 28;
      strokeBolt(b.bolt.points, b.width * 2.6, "rgba(130,190,255,0.75)", a * 0.75);
      for (const br of b.bolt.branches) strokeBolt(br, b.width * 1.5, "rgba(130,190,255,0.6)", a * 0.5);
      ctx.shadowBlur = 14;
      strokeBolt(b.bolt.points, b.width, "#ffffff", a);
      for (const br of b.bolt.branches) strokeBolt(br, b.width * 0.55, "#eaf4ff", a * 0.85);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  return { start, update, draw, shakeOffset, isActive: () => active };
}
