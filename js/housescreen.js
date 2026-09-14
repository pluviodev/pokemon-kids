import { VIRTUAL_W, VIRTUAL_H } from "./config.js";
import { getSlots } from "./collection.js";
import { getSprite } from "./sprites.js";

const BACK = { x: 20, y: 20, w: 70, h: 70 };

export function makeHouseScreen({ ctx, storage }) {
  function draw() {
    ctx.fillStyle = "#5b3a24"; ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H); // Innenraum
    ctx.fillStyle = "#7a5233"; ctx.fillRect(0, 120, VIRTUAL_W, VIRTUAL_H - 120);
    // Zurück-Pfeil (gezeichnet)
    ctx.fillStyle = "#ffcf5a"; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
    ctx.strokeStyle = "#5b3a24"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(BACK.x + 48, BACK.y + 20); ctx.lineTo(BACK.x + 22, BACK.y + 35);
    ctx.lineTo(BACK.x + 48, BACK.y + 50); ctx.stroke();
    // 10 Slots, 2 Spalten x 5 Reihen
    const slots = getSlots(storage.loadCaught());
    const cols = 2, cellW = 200, cellH = 120, ox = 40, oy = 150;
    slots.forEach((s, i) => {
      const cx = ox + (i % cols) * (cellW + 10);
      const cy = oy + Math.floor(i / cols) * (cellH + 5);
      ctx.fillStyle = "#3f2817"; ctx.fillRect(cx, cy, cellW, cellH); // Regalfach
      if (s.caught) {
        ctx.drawImage(getSprite(s.id), cx + cellW / 2 - 48, cy + 12, 96, 96);
      } else {
        ctx.fillStyle = "#2a1a0f";
        ctx.beginPath(); ctx.arc(cx + cellW / 2, cy + 60, 40, 0, Math.PI * 2); ctx.fill();
        // gezeichnetes "?" (Kurve + Punkt), kein Textzeichen
        ctx.strokeStyle = "#6b5238"; ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(cx + cellW / 2, cy + 48, 14, Math.PI * 0.8, Math.PI * 2.1);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + cellW / 2, cy + 62); ctx.lineTo(cx + cellW / 2, cy + 74); ctx.stroke();
        ctx.fillStyle = "#6b5238";
        ctx.beginPath(); ctx.arc(cx + cellW / 2, cy + 86, 5, 0, Math.PI * 2); ctx.fill();
      }
    });
  }
  function onTap(x, y) {
    if (x >= BACK.x && x <= BACK.x + BACK.w && y >= BACK.y && y <= BACK.y + BACK.h) return "back";
    return null;
  }
  return { draw, onTap };
}
