"""Bereitet die gelieferten Sprites für das Web auf:
- 10 Kreaturen -> assets/pokemon/01..10.png (transparent zugeschnitten, skaliert)
- Draussen/Drinnen -> assets/world.png / assets/house.png (skaliert)
- Player-Spritesheet -> assets/player/{row}_{col}.png (Grid geschnitten, gemeinsam getrimmt)
"""
import os
from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), "..", "Sprites")
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

# Reihenfolge = id 1..10
CREATURES = [
    "Blitzkarlitz", "Bonkarlbon", "Feuferkarl", "Flatterkarla", "Kacabarl",
    "Karlfer", "Karlklotz", "Karlkutta", "Krabbelkarlitto", "Krakarle",
]

def trim(im):
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im

def fit(im, box):
    im = im.copy()
    im.thumbnail((box, box), Image.LANCZOS)
    return im

os.makedirs(os.path.join(OUT, "pokemon"), exist_ok=True)
os.makedirs(os.path.join(OUT, "player"), exist_ok=True)

# Kreaturen
for i, name in enumerate(CREATURES, start=1):
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    im = fit(trim(im), 320)
    im.save(os.path.join(OUT, "pokemon", f"{i:02d}.png"))
    print("pokemon", i, name, im.size)

# Hintergründe
for src_name, out_name, box in [("Draußen", "world", 720), ("Drinnen", "house", 720)]:
    im = Image.open(os.path.join(SRC, src_name + ".png")).convert("RGBA")
    im = fit(im, box)
    im.save(os.path.join(OUT, out_name + ".png"))
    print("bg", out_name, im.size)

# Fang-Hintergrund (Wald-Lichtung)
fb = Image.open(os.path.join(SRC, "Fang Background.png")).convert("RGBA")
fb = fit(fb, 900)
fb.save(os.path.join(OUT, "catchbg.png"))
print("catchbg", fb.size)

# Pokeball freistellen: grauen Hintergrund per Flood-Fill von den Ecken entfernen,
# danach kreisförmig maskieren (Schatten weg), zuschneiden.
def cutout_ball(im, tol=42):
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    from collections import deque
    seen = [[False] * w for _ in range(h)]
    q = deque()
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    bg = px[0, 0]
    for cx, cy in corners:
        if not seen[cy][cx]:
            q.append((cx, cy)); seen[cy][cx] = True
    def close(a, b):
        return abs(a[0]-b[0]) < tol and abs(a[1]-b[1]) < tol and abs(a[2]-b[2]) < tol
    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        if not close((r, g, b), bg):
            continue
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                seen[ny][nx] = True; q.append((nx, ny))
    # roten Ball-Bereich finden -> Zentrum/Radius für Kreismaske
    xs, ys = [], []
    for y in range(0, h, 3):
        for x in range(0, w, 3):
            r, g, b, a = px[x, y]
            if a and r > 120 and r > g + 40 and r > b + 40:
                xs.append(x); ys.append(y)
    cx = sum(xs) / len(xs); top = min(ys)
    left = min(xs); right = max(xs)
    rad = max((right - left) / 2, (sum(ys)/len(ys) - top)) + 6
    cy = top + rad
    mask = Image.new("L", (w, h), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((cx - rad, cy - rad, cx + rad, cy + rad), fill=255)
    im.putalpha(mask)
    return trim(im)

ball = cutout_ball(Image.open(os.path.join(SRC, "Pokeball.png")))
ball = fit(ball, 240)
ball.save(os.path.join(OUT, "ball.png"))
print("ball", ball.size)

# Lukas (11. Pokémon): weißen Hintergrund per Flood-Fill freistellen
def cutout_white(im, tol=36):
    im = im.convert("RGBA")
    px = im.load(); w, h = im.size
    from collections import deque
    seen = [[False] * w for _ in range(h)]
    q = deque()
    for cx, cy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if not seen[cy][cx]:
            q.append((cx, cy)); seen[cy][cx] = True
    def white(p): return p[0] > 255 - tol and p[1] > 255 - tol and p[2] > 255 - tol
    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        if not white((r, g, b)):
            continue
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                seen[ny][nx] = True; q.append((nx, ny))
    return trim(im)

lukas = fit(cutout_white(Image.open(os.path.join(SRC, "lukas.png"))), 360)
lukas.save(os.path.join(OUT, "pokemon", "11.png"))
print("lukas", lukas.size)

# Player-Spritesheet: 2 Spalten x 4 Reihen.
# Jeden Frame EINZELN freischneiden und dann zentriert + fußbündig auf eine
# einheitliche Leinwand setzen -> beim Frame-Wechsel springt die Figur nicht.
sheet = Image.open(os.path.join(SRC, "ChatGPT Image 14. Sept. 2026, 14_04_45.png")).convert("RGBA")
cols, rows = 2, 4
cw, ch = sheet.width // cols, sheet.height // rows
import numpy as np
trimmed, cxs = [], []
for r in range(rows):
    for c in range(cols):
        cell = sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
        bb = cell.getbbox()
        fr = cell.crop(bb) if bb else cell
        a = np.array(fr.split()[3])
        ys, xs = np.nonzero(a > 20)
        cxs.append(float(xs.mean()))  # horizontaler Alpha-Schwerpunkt (Körpermitte)
        trimmed.append(fr)
maxH = max(fr.height for fr in trimmed)
# Leinwand breit genug, damit jede am Schwerpunkt zentrierte Figur reinpasst
half = max(max(cx, fr.width - cx) for fr, cx in zip(trimmed, cxs))
canvasW = int(2 * half) + 8
scale = 200.0 / maxH
for idx, (fr, cx) in enumerate(zip(trimmed, cxs)):
    r, c = idx // cols, idx % cols
    canvas = Image.new("RGBA", (canvasW, maxH), (0, 0, 0, 0))
    px = int(round(canvasW / 2 - cx))       # Körpermitte -> Leinwandmitte
    canvas.paste(fr, (px, maxH - fr.height), fr)  # Füße unten bündig
    canvas = canvas.resize((int(canvasW * scale), 200), Image.LANCZOS)
    canvas.save(os.path.join(OUT, "player", f"{r}_{c}.png"))
print("player frames", cols * rows, "canvas", (int(canvasW * scale), 200))
