// Pikarlchu: Sonder-Karl ausserhalb der Level-Pools. Reine Logik, DOM-frei.

export const PIKA_ID = 13;
export const PIKA_NAME = "Pikarlchu";
export const PIKA_SPRITE = "assets/pokemon/13.png";
export const PIKA_HITS_NEEDED = 5;

// Auftritte
export const APPEAR_GAP = { min: 12, max: 20 };  // Sekunden zwischen Auftritten
export const PEEK_TIME = 2.5;                    // wie lange er hinter dem Objekt hervorlugt
export const DASH_TIME = 2.2;                    // wie lange ein Querlauf dauert
export const DASH_Y = { min: 0.34, max: 0.92 };  // Bruchteile von S
export const TAP_RADIUS = 0.085;                 // Bruchteil von S, bewusst grosszuegig

// Hoehe, mit der ein Auftritt gezeichnet wird (world.js nutzt dieselbe Zahl).
export const PEEK_H = 0.13;
// Beim Lugen wird unten angeschnitten -> nur der obere Teil ist zu sehen.
export const PEEK_VISIBLE = 0.62;

// Belegte Flaechen, hinter denen Pikarlchu NICHT auftauchen darf (Bruchteile von S):
// die drei Ecken-Buttons und das Beeren-/Blitz-HUD unten links. Sonst steckt er
// hinter einem Knopf und das Kind sieht ihn nicht. Siehe Test in tests/pika.test.js.
export const BLOCKED_AREAS = [
  { x0: 0.03, y0: 0.03, x1: 0.13, y1: 0.13 },  // Ton-Knopf oben links
  { x0: 0.87, y0: 0.03, x1: 0.97, y1: 0.13 },  // Neues Spiel oben rechts
  { x0: 0.87, y0: 0.45, x1: 0.97, y1: 0.55 },  // Spiel-Knopf rechts mittig
  { x0: 0.05, y0: 0.79, x1: 0.14, y1: 0.94 },  // Beeren-Glas unten links
  { x0: 0.15, y0: 0.82, x1: 0.37, y1: 0.90 },  // 5 Blitz-Zeichen daneben
];

// Verstecke auf der Wiese (Bruchteile von S, aus world.png abgelesen; gilt fuer beide Level).
// Bewusst nur am Haus und unten bei den Rand-Buechen - oben verdecken die Buttons alles.
export const PEEK_SPOTS = [
  { x: 0.27, y: 0.21 },  // links neben dem Haus
  { x: 0.66, y: 0.21 },  // rechts neben dem Haus
  { x: 0.76, y: 0.18 },  // Zaun rechts vom Haus
  { x: 0.12, y: 0.70 },  // Busch am linken Rand, ueber dem Beeren-Glas
  { x: 0.92, y: 0.84 },  // Buesche am rechten Rand unten
  { x: 0.86, y: 0.93 },  // Stein unten rechts
  { x: 0.72, y: 0.96 },  // Buesche unten, rechts der Mitte
  { x: 0.50, y: 0.97 },  // Grasbuesche unten mittig
];

// Sichtbares Rechteck eines Lug-Auftritts (fuer Tests und Trefferzone).
export function peekVisibleBox(spot, ar = 1.02) {
  const halfW = PEEK_H * ar / 2;
  return {
    x0: spot.x - halfW, x1: spot.x + halfW,
    y0: spot.y - PEEK_H, y1: spot.y - PEEK_H * (1 - PEEK_VISIBLE),
  };
}

// Laden im Fang-Event
export const CHARGE_GAIN = 0.07;   // pro Tap
export const CHARGE_DECAY = 0.12;  // pro Sekunde
// Begleiter-Blitz
export const BURST_NEED = 5;
export const BURST_WINDOW = 2.0;   // Sekunden
export const BURST_COOLDOWN = 3.0; // Sekunden Ruhe nach einer Show

const clamp01 = v => Math.max(0, Math.min(1, v));

// Zufaellig Lugen oder Flitzen.
export function pickAppearance(rng = Math.random) {
  if (rng() < 0.5) {
    const i = Math.min(PEEK_SPOTS.length - 1, Math.floor(rng() * PEEK_SPOTS.length));
    return { kind: "peek", spot: PEEK_SPOTS[i] };
  }
  return {
    kind: "dash",
    fromLeft: rng() < 0.5,
    y: DASH_Y.min + rng() * (DASH_Y.max - DASH_Y.min),
  };
}

// x-Position des Flitzers: startet und endet ausserhalb des Bildes.
export function dashX(t, dur, fromLeft, w, margin) {
  const k = clamp01(t / dur);
  const a = fromLeft ? -margin : w + margin;
  const b = fromLeft ? w + margin : -margin;
  return a + (b - a) * k;
}

// Grosszuegige Kreis-Trefferpruefung.
export function hitsAppearance(tap, pos, radius) {
  return Math.hypot(tap.x - pos.x, tap.y - pos.y) <= radius;
}

// Ladestand 0..1: Taps fuellen, Zeit leert.
export function chargeStep(level, dt, taps, gainPerTap, decayPerSec) {
  return clamp01(level + taps * gainPerTap - decayPerSec * dt);
}

// Liegen genug Taps im Zeitfenster?
export function isBurst(tapTimes, now, need, window) {
  let n = 0;
  for (const t of tapTimes) if (now - t <= window) n++;
  return n >= need;
}
