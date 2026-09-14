import { VIRTUAL_W, VIRTUAL_H, BOSS_ID } from "./config.js";
import { makeStorage } from "./storage.js";
import { makeAudio } from "./audio.js";
import { loadAssets } from "./sprites.js";
import { makeWorld } from "./world.js";
import { makeCatchScreen } from "./catchscreen.js";
import { makeHouseScreen } from "./housescreen.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const storage = makeStorage(localStorage);
const audio = makeAudio(storage);

const SND = { x: 20, y: 20, w: 64, h: 64 };            // Lautsprecher (oben links)
const NEW = { x: VIRTUAL_W - 84, y: 20, w: 64, h: 64 }; // Neues Spiel (oben rechts)

let screen = "world";
let confirmReset = false; // Bestätigungs-Overlay für Neues Spiel

const world = makeWorld({
  ctx, audio, storage,
  onEncounter: id => { catchScreen.start(id); screen = "catch"; },
  onEnterHouse: () => { house.enter(); screen = "house"; },
});
const catchScreen = makeCatchScreen({
  ctx, audio,
  onResult: ({ id, caught }) => {
    if (id === BOSS_ID) {
      if (caught) storage.setWon(true);       // gewonnen!
      else storage.penaltyAll();              // verpasst -> -1 auf alle
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

// Eingabe: Bildschirm- in virtuelle Koordinaten
function toVirtual(ev) {
  const r = canvas.getBoundingClientRect();
  const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
  const py = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
  return { x: px / r.width * VIRTUAL_W, y: py / r.height * VIRTUAL_H };
}
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// Bestätigungs-Overlay: zwei große Buttons
const YES = { x: VIRTUAL_W / 2 - 150, y: VIRTUAL_H / 2 - 40, w: 120, h: 120 };
const NO = { x: VIRTUAL_W / 2 + 30, y: VIRTUAL_H / 2 - 40, w: 120, h: 120 };

function handleTap(ev) {
  ev.preventDefault();
  const { x, y } = toVirtual(ev);
  if (confirmReset) {
    if (inRect(x, y, YES)) { storage.reset(); world.reset(); confirmReset = false; screen = "world"; }
    else if (inRect(x, y, NO)) { confirmReset = false; }
    return;
  }
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
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill(); ctx.stroke();
}

function drawSpeaker() {
  roundRect(SND, audio.isOn() ? "#2b8a3e" : "#888", "#1c1c1c");
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(SND.x + 18, SND.y + 26); ctx.lineTo(SND.x + 30, SND.y + 26);
  ctx.lineTo(SND.x + 42, SND.y + 14); ctx.lineTo(SND.x + 42, SND.y + 50);
  ctx.lineTo(SND.x + 30, SND.y + 38); ctx.lineTo(SND.x + 18, SND.y + 38); ctx.closePath(); ctx.fill();
  if (!audio.isOn()) {
    ctx.strokeStyle = "#c00"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(SND.x + 14, SND.y + 14); ctx.lineTo(SND.x + 52, SND.y + 52); ctx.stroke();
  }
}

function drawNewGame() {
  roundRect(NEW, "#c9a13b", "#1c1c1c");
  // Kreispfeil-Symbol (Neustart)
  const cx = NEW.x + 32, cy = NEW.y + 32;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(cx, cy, 16, Math.PI * 0.5, Math.PI * 2.1); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); // Pfeilspitze
  ctx.moveTo(cx + 16, cy - 12); ctx.lineTo(cx + 24, cy - 2); ctx.lineTo(cx + 8, cy - 2); ctx.closePath(); ctx.fill();
}

function drawConfirm() {
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
  // Neustart-Symbol groß oben
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 10; ctx.lineCap = "round";
  const cx = VIRTUAL_W / 2, cy = VIRTUAL_H / 2 - 150;
  ctx.beginPath(); ctx.arc(cx, cy, 44, Math.PI * 0.5, Math.PI * 2.1); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.moveTo(cx + 44, cy - 34); ctx.lineTo(cx + 64, cy - 6); ctx.lineTo(cx + 24, cy - 6); ctx.closePath(); ctx.fill();
  // JA (grüner Haken)
  roundRect(YES, "#2b8a3e", "#0d3");
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 12; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(YES.x + 28, YES.y + 62); ctx.lineTo(YES.x + 52, YES.y + 86); ctx.lineTo(YES.x + 96, YES.y + 34); ctx.stroke();
  // NEIN (rotes Kreuz)
  roundRect(NO, "#c0392b", "#900");
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(NO.x + 32, NO.y + 34); ctx.lineTo(NO.x + 88, NO.y + 90);
  ctx.moveTo(NO.x + 88, NO.y + 34); ctx.lineTo(NO.x + 32, NO.y + 90); ctx.stroke();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!confirmReset) {
    if (screen === "world") { world.update(dt); world.draw(); }
    else if (screen === "catch") { catchScreen.update(dt); catchScreen.draw(); }
    else if (screen === "house") { house.update(dt); house.draw(); }
  } else {
    // Standbild des aktuellen Screens, Overlay drüber
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
