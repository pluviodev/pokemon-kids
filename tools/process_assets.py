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

# Player-Spritesheet: 2 Spalten x 4 Reihen
sheet = Image.open(os.path.join(SRC, "ChatGPT Image 14. Sept. 2026, 14_04_45.png")).convert("RGBA")
cols, rows = 2, 4
cw, ch = sheet.width // cols, sheet.height // rows
cells = []
for r in range(rows):
    for c in range(cols):
        cells.append(sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)))
# gemeinsame Trim-Box über alle Zellen (Füße/Größe bleiben ausgerichtet)
boxes = [cell.getbbox() for cell in cells if cell.getbbox()]
ux0 = min(b[0] for b in boxes); uy0 = min(b[1] for b in boxes)
ux1 = max(b[2] for b in boxes); uy1 = max(b[3] for b in boxes)
scale = 200.0 / (uy1 - uy0)  # Zielhöhe ~200px
for idx, cell in enumerate(cells):
    r, c = idx // cols, idx % cols
    fr = cell.crop((ux0, uy0, ux1, uy1))
    fr = fr.resize((int(fr.width * scale), int(fr.height * scale)), Image.LANCZOS)
    fr.save(os.path.join(OUT, "player", f"{r}_{c}.png"))
print("player frames", cols * rows, "size", (int((ux1-ux0)*scale), int((uy1-uy0)*scale)))
