import { POKEMON } from "./data.js";

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
  // id-abhängiges Punktmuster statt Zahl (text-frei)
  for (let i = 0; i < id; i++) {
    const a = (i / id) * Math.PI * 2;
    g.beginPath();
    g.arc(48 + Math.cos(a) * 18, 48 + Math.sin(a) * 18, 5, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

const cache = new Map();

export function loadSprites(onReady) {
  let pending = POKEMON.length;
  const done = () => { if (--pending === 0 && onReady) onReady(); };
  for (const p of POKEMON) {
    const img = new Image();
    img.onload = () => { cache.set(p.id, img); done(); };
    img.onerror = () => { cache.set(p.id, makePlaceholder(p.id)); done(); };
    img.src = p.sprite;
  }
}

export function getSprite(id) {
  return cache.get(id) || makePlaceholder(id);
}
