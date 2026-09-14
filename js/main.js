import { VIRTUAL_W, VIRTUAL_H } from "./config.js";
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

const SND = { x: VIRTUAL_W - 84, y: 20, w: 64, h: 64 };

let screen = "world";
const world = makeWorld({
  ctx, audio,
  onEncounter: id => { catchScreen.start(id); screen = "catch"; },
  onEnterHouse: () => { house.enter(); screen = "house"; },
});
const catchScreen = makeCatchScreen({
  ctx, audio,
  onResult: ({ id, caught }) => { if (caught) storage.addCaught(id); world.reset(); screen = "world"; },
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
function inSpeaker(x, y) { return x >= SND.x && x <= SND.x + SND.w && y >= SND.y && y <= SND.y + SND.h; }

function handleTap(ev) {
  ev.preventDefault();
  const { x, y } = toVirtual(ev);
  if (inSpeaker(x, y)) { audio.toggle(); return; }
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

function drawSpeaker() {
  ctx.fillStyle = audio.isOn() ? "#2b8a3e" : "#888";
  ctx.fillRect(SND.x, SND.y, SND.w, SND.h);
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

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (screen === "world") { world.update(dt); world.draw(); }
  else if (screen === "catch") { catchScreen.update(dt); catchScreen.draw(); }
  else if (screen === "house") { house.update(dt); house.draw(); }
  drawSpeaker();
  requestAnimationFrame(loop);
}

loadAssets(() => { last = performance.now(); requestAnimationFrame(loop); });
