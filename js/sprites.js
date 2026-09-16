import { LEVELS } from "./levels.js";

export function wobbleOffset(t, id) {
  const phase = id * 0.7;
  return {
    dx: Math.sin(t * 3 + phase) * 3,
    dy: Math.cos(t * 4 + phase) * 5,
  };
}

const PLACEHOLDER_COLORS = [
  "#e05a5a", "#e0a15a", "#e0d75a", "#8fd45a", "#5ad0b0",
  "#5aa6e0", "#7d7de0", "#c25ae0", "#e05aa6", "#9a6a44",
];

function makePlaceholder(id) {
  const c = document.createElement("canvas");
  c.width = 96; c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = PLACEHOLDER_COLORS[(id - 1) % 10];
  g.beginPath(); g.arc(48, 48, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < id; i++) {
    const a = (i / id) * Math.PI * 2;
    g.beginPath();
    g.arc(48 + Math.cos(a) * 18, 48 + Math.sin(a) * 18, 5, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

const images = new Map();

// Feste Bild-Assets (Hintergründe, Ball, Spieler-Frames)
const MANIFEST = [
  ["world", "assets/world.png"],
  ["house", "assets/house.png"],
  ["catchbg", "assets/catchbg.png"],
  ["ball", "assets/ball.png"],
  ["pokal", "assets/pokal.png"],
  ["grass", "assets/grass.png"],
  ["world2", "assets/world2.png"],
  ["house2", "assets/house2.png"],
  ["catchbg2", "assets/catchbg2.png"],
  ["grass2", "assets/grass2.png"],
  ["playfield", "assets/playfield.png"],
  ["playball", "assets/playball.png"],
  ["goal", "assets/goal.png"],
  ["soccerball", "assets/soccerball.png"],
  ["arrow", "assets/arrow.png"],
  ["berry", "assets/berry.png"],
  ["p_up_0", "assets/player/0_0.png"],
  ["p_up_1", "assets/player/0_1.png"],
  ["p_left_0", "assets/player/1_0.png"],
  ["p_left_1", "assets/player/1_1.png"],
  ["p_down_0", "assets/player/3_0.png"],
  ["p_down_1", "assets/player/3_1.png"],
];

export function loadAssets(onReady) {
  const pkEntries = [];
  for (const lv of LEVELS) {
    for (const p of lv.pokemon) pkEntries.push(["pk" + p.id, p.sprite]);
    pkEntries.push(["pk" + lv.boss.id, lv.boss.sprite]); // Boss je Level
  }
  const entries = [...MANIFEST, ...pkEntries];
  let pending = entries.length;
  const done = () => { if (--pending === 0 && onReady) onReady(); };
  for (const [key, src] of entries) {
    const img = new Image();
    img.onload = () => { images.set(key, img); done(); };
    img.onerror = () => {
      // Pokémon-Fallback = gezeichneter Platzhalter; sonstige Assets ohne Bild
      if (key.startsWith("pk")) images.set(key, makePlaceholder(Number(key.slice(2))));
      done();
    };
    img.src = src;
  }
}

export function getImg(key) {
  return images.get(key) || null;
}

export function getSprite(id) {
  return images.get("pk" + id) || makePlaceholder(id);
}

// Gold-getönte Variante (für 10/10 fertig gefangene Arten), gecacht.
const goldCache = new Map();
export function getGoldSprite(id) {
  if (goldCache.has(id)) return goldCache.get(id);
  const spr = getSprite(id);
  const c = document.createElement("canvas");
  c.width = spr.width; c.height = spr.height;
  const g = c.getContext("2d");
  g.drawImage(spr, 0, 0);
  g.globalCompositeOperation = "source-atop"; // nur auf die Sprite-Pixel
  g.fillStyle = "rgba(255,205,40,0.55)";
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "source-over";
  goldCache.set(id, c);
  return c;
}

// Spieler-Frame: dir in {up,down,left,right}, step 0/1. Rechts = gespiegeltes Links.
export function playerFrame(dir, step) {
  if (dir === "right") return { img: getImg("p_left_" + step), flip: true };
  const key = "p_" + (dir === "up" ? "up" : dir === "left" ? "left" : "down") + "_" + step;
  return { img: getImg(key), flip: false };
}
