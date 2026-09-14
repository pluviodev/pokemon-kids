import { VIRTUAL_W, VIRTUAL_H } from "./config.js";
import { getSlots } from "./collection.js";
import { getSprite, getImg } from "./sprites.js";

const BACK = { x: 18, y: 18, w: 72, h: 72 };
const OFY = (VIRTUAL_H - VIRTUAL_W) / 2; // Haus-Bild quadratisch, vertikal zentriert
// Podest-Positionen (Bruchteile des Haus-Bilds), gemessen aus house.png
const XS = [0.171, 0.335, 0.498, 0.663, 0.827];
const ROW_Y = [0.34, 0.60];

export function makeHouseScreen({ ctx, storage }) {
  function pedestal(i) {
    const fx = XS[i % 5];
    const fy = ROW_Y[Math.floor(i / 5)];
    return { x: fx * VIRTUAL_W, y: OFY + fy * VIRTUAL_W };
  }

  function draw() {
    ctx.fillStyle = "#4a3420"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H); // Letterbox
    const house = getImg("house");
    if (house) ctx.drawImage(house, 0, OFY, VIRTUAL_W, VIRTUAL_W);

    const slots = getSlots(storage.loadCaught());
    slots.forEach((s, i) => {
      const p = pedestal(i);
      if (s.caught) {
        const spr = getSprite(s.id);
        const h = 96, ar = spr.width && spr.height ? spr.width / spr.height : 1;
        ctx.drawImage(spr, p.x - h * ar / 2, p.y - h + 18, h * ar, h);
      } else {
        // Schatten-Silhouette + gezeichnetes "?" (kein Textzeichen)
        ctx.fillStyle = "rgba(20,12,6,0.55)";
        ctx.beginPath(); ctx.arc(p.x, p.y - 20, 30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#d8c49a"; ctx.lineWidth = 6; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(p.x, p.y - 30, 11, Math.PI * 0.85, Math.PI * 2.15);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 19); ctx.lineTo(p.x, p.y - 8); ctx.stroke();
        ctx.fillStyle = "#d8c49a";
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Zurück-Pfeil (gezeichnet)
    ctx.fillStyle = "#ffcf5a"; ctx.strokeStyle = "#5b3a24"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(BACK.x, BACK.y, BACK.w, BACK.h, 14); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#5b3a24"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(BACK.x + 48, BACK.y + 20); ctx.lineTo(BACK.x + 24, BACK.y + 36);
    ctx.lineTo(BACK.x + 48, BACK.y + 52); ctx.stroke();
  }

  function onTap(x, y) {
    if (x >= BACK.x && x <= BACK.x + BACK.w && y >= BACK.y && y <= BACK.y + BACK.h) return "back";
    return null;
  }
  return { draw, onTap };
}
