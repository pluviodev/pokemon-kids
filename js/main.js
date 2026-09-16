import { VIRTUAL_W, VIRTUAL_H, BOSS_ID } from "./config.js";
import { makeStorage } from "./storage.js";
import { makeAudio } from "./audio.js";
import { loadAssets } from "./sprites.js";
import { makeWorld } from "./world.js";
import { makeCatchScreen } from "./catchscreen.js";
import { makeHouseScreen } from "./housescreen.js";
import { makeWinScreen } from "./win.js";

const S = VIRTUAL_W;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const storage = makeStorage(localStorage);
const audio = makeAudio(storage);

const BSZ = 0.10 * S;
const SND = { x: 0.03 * S, y: 0.03 * S, w: BSZ, h: BSZ };            // Lautsprecher oben links
const NEW = { x: S - 0.03 * S - BSZ, y: 0.03 * S, w: BSZ, h: BSZ };  // Neues Spiel oben rechts

let screen = "world";
let confirmReset = false;

const world = makeWorld({
  ctx, audio, storage,
  onEncounter: id => { catchScreen.start(id); screen = "catch"; },
  onEnterHouse: () => { house.enter(); screen = "house"; },
});
const catchScreen = makeCatchScreen({
  ctx, audio, storage,
  onResult: ({ id, caught }) => {
    if (id === BOSS_ID) {
      if (caught) { storage.setWon(true); win.start(); screen = "win"; return; }
      storage.penaltyAll();
    } else if (caught) {
      storage.addCatch(id);
    }
    world.reset();
    screen = "world";
  },
});
const house = makeHouseScreen({
  ctx, storage,
  onExit: () => { world.exitHouse(); screen = "world"; },
});
const win = makeWinScreen({
  ctx, audio,
  onNewGame: () => { storage.reset(); world.reset(); screen = "world"; },
});

function toVirtual(ev) {
  const r = canvas.getBoundingClientRect();
  const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
  const py = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
  return { x: px / r.width * S, y: py / r.height * S };
}
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

const YES = { x: S / 2 - 0.19 * S, y: S / 2 - 0.03 * S, w: 0.15 * S, h: 0.15 * S };
const NO = { x: S / 2 + 0.04 * S, y: S / 2 - 0.03 * S, w: 0.15 * S, h: 0.15 * S };

function handleTap(ev) {
  ev.preventDefault();
  const { x, y } = toVirtual(ev);
  if (confirmReset) {
    if (inRect(x, y, YES)) { storage.reset(); world.reset(); confirmReset = false; screen = "world"; }
    else if (inRect(x, y, NO)) { confirmReset = false; }
    return;
  }
  if (screen === "win") { win.onTap(x, y); return; }
  if (inRect(x, y, SND)) { audio.toggle(); return; }
  if (inRect(x, y, NEW)) { confirmReset = true; return; }
  if (screen === "world") world.onPointer(x, y);
  else if (screen === "catch") { if (catchScreen.ballHit(x, y)) catchScreen.onTap(); }
  else if (screen === "house") house.onPointer(x, y);
}
canvas.addEventListener("mousedown", handleTap);
canvas.addEventListener("touchstart", handleTap, { passive: false });

const keys = new Set();
window.addEventListener("keydown", e => {
  keys.add(e.key); world.setKeys(keys); house.setKeys(keys);
  if (screen === "catch" && (e.key === " " || e.key === "Enter")) catchScreen.onTap();
});
window.addEventListener("keyup", e => { keys.delete(e.key); world.setKeys(keys); house.setKeys(keys); });

function roundRect(r, fill, stroke) {
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, r.w * 0.22); ctx.fill(); ctx.stroke();
}

function drawSpeaker() {
  roundRect(SND, audio.isOn() ? "#2b8a3e" : "#888", "#1c1c1c");
  const x = SND.x, y = SND.y, u = SND.w;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(x + 0.28 * u, y + 0.40 * u); ctx.lineTo(x + 0.46 * u, y + 0.40 * u);
  ctx.lineTo(x + 0.65 * u, y + 0.22 * u); ctx.lineTo(x + 0.65 * u, y + 0.78 * u);
  ctx.lineTo(x + 0.46 * u, y + 0.60 * u); ctx.lineTo(x + 0.28 * u, y + 0.60 * u); ctx.closePath(); ctx.fill();
  if (!audio.isOn()) {
    ctx.strokeStyle = "#c00"; ctx.lineWidth = u * 0.08;
    ctx.beginPath(); ctx.moveTo(x + 0.22 * u, y + 0.22 * u); ctx.lineTo(x + 0.8 * u, y + 0.8 * u); ctx.stroke();
  }
}

function drawRestartIcon(cx, cy, r, lw) {
  ctx.strokeStyle = "#fff"; ctx.lineWidth = lw; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.5, Math.PI * 2.1); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(cx + r, cy - r * 0.75); ctx.lineTo(cx + r * 1.5, cy - r * 0.12); ctx.lineTo(cx + r * 0.5, cy - r * 0.12);
  ctx.closePath(); ctx.fill();
}

function drawNewGame() {
  roundRect(NEW, "#c9a13b", "#1c1c1c");
  drawRestartIcon(NEW.x + NEW.w / 2, NEW.y + NEW.h / 2, NEW.w * 0.26, NEW.w * 0.1);
}

function drawConfirm() {
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, S, S);
  drawRestartIcon(S / 2, S / 2 - 0.2 * S, 0.06 * S, 0.02 * S);
  // JA (grüner Haken)
  roundRect(YES, "#2b8a3e", "#0d3");
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 0.02 * S; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(YES.x + 0.22 * YES.w, YES.y + 0.52 * YES.h);
  ctx.lineTo(YES.x + 0.42 * YES.w, YES.y + 0.72 * YES.h);
  ctx.lineTo(YES.x + 0.8 * YES.w, YES.y + 0.28 * YES.h); ctx.stroke();
  // NEIN (rotes Kreuz)
  roundRect(NO, "#c0392b", "#900");
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 0.02 * S;
  ctx.beginPath();
  ctx.moveTo(NO.x + 0.28 * NO.w, NO.y + 0.28 * NO.h); ctx.lineTo(NO.x + 0.72 * NO.w, NO.y + 0.72 * NO.h);
  ctx.moveTo(NO.x + 0.72 * NO.w, NO.y + 0.28 * NO.h); ctx.lineTo(NO.x + 0.28 * NO.w, NO.y + 0.72 * NO.h); ctx.stroke();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (screen === "win") {
    win.update(dt); win.draw();
    requestAnimationFrame(loop); // Sieger-Screen: keine Ecken-Buttons
    return;
  }
  if (!confirmReset) {
    if (screen === "world") { world.update(dt); world.draw(); }
    else if (screen === "catch") { catchScreen.update(dt); catchScreen.draw(); }
    else if (screen === "house") { house.update(dt); house.draw(); }
  } else {
    if (screen === "world") world.draw();
    else if (screen === "catch") catchScreen.draw();
    else if (screen === "house") house.draw();
  }
  drawSpeaker();
  drawNewGame();
  if (confirmReset) drawConfirm();
  requestAnimationFrame(loop);
}

loadAssets(() => { last = performance.now(); requestAnimationFrame(loop); });
