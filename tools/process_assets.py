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

# Level-2-Kreaturen -> id 21..30 (Reihenfolge = rarity-Zuordnung in levels.js)
CREATURES2 = [
    "Kieselkarlo, der Quarzhorn-Buddler",
    "Karatekarlo, der Rotpanda-Känguru-Kämpfer",
    "Blütenkarl, der Blütenschirmträger",
    "Frostkarl, der Eis-Knirps",
    "Spukarl, der schüchterne Kerzengeist",
    "Toxikarla mit leuchtendem Giftnebel",
    "Mentakarl, der schwebende Kristallseher",
    "Drakarl, der kleine Sternendrache",
    "Glitzerkarla, das schwebende Feenreh",
    "Düsterkarl, der Schattenmasken-Schleicher",
]
for i, name in enumerate(CREATURES2, start=21):
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    im = fit(trim(im), 320)
    im.save(os.path.join(OUT, "pokemon", f"{i:02d}.png"))
    print("pokemon L2", i, name, im.size)

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

# Level-2-Hintergründe
for src_name, out_name, box in [("Draußen Level 2", "world2", 720),
                                ("Drinnen Level 2", "house2", 720)]:
    im = Image.open(os.path.join(SRC, src_name + ".png")).convert("RGBA")
    im = fit(im, box)
    im.save(os.path.join(OUT, out_name + ".png"))
    print("bg L2", out_name, im.size)

fb2 = Image.open(os.path.join(SRC, "Fang Background Level2.png")).convert("RGBA")
fb2 = fit(fb2, 900)
fb2.save(os.path.join(OUT, "catchbg2.png"))
print("catchbg2", fb2.size)

# Flood-Fill von den Ecken (entfernt nur den ZUSAMMENHÄNGENDEN Außen-Hintergrund;
# eingeschlossene helle Flächen bleiben -> gut für den Ball auf Weiß)
def cutout_flood(im, tol=40):
    im = im.convert("RGBA"); px = im.load(); w, h = im.size
    from collections import deque
    seen = [[False] * w for _ in range(h)]; q = deque()
    bg = px[0, 0]
    for cx, cy in [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]:
        if not seen[cy][cx]: q.append((cx, cy)); seen[cy][cx] = True
    def close(a, b): return abs(a[0]-b[0]) < tol and abs(a[1]-b[1]) < tol and abs(a[2]-b[2]) < tol
    while q:
        x, y = q.popleft(); r, g, b, a = px[x, y]
        if not close((r, g, b), bg): continue
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                seen[ny][nx] = True; q.append((nx, ny))
    return trim(im)

# Farb-Key: ALLE Pixel nahe der Ecken-Farbe transparent (auch eingeschlossene) ->
# gut für den Pokal auf Blau (Pokal selbst ist silber/weiß, kein Blau)
def cutout_key(im, tol=60):
    im = im.convert("RGBA"); px = im.load(); w, h = im.size
    bg = px[0, 0]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r-bg[0]) < tol and abs(g-bg[1]) < tol and abs(b-bg[2]) < tol:
                px[x, y] = (r, g, b, 0)
    return trim(im)

ball = fit(cutout_flood(Image.open(os.path.join(SRC, "Pokeball.png"))), 240)
ball.save(os.path.join(OUT, "ball.png"))
print("ball", ball.size)

pokal = fit(cutout_key(Image.open(os.path.join(SRC, "Pokal.png"))), 520)
pokal.save(os.path.join(OUT, "pokal.png"))
print("pokal", pokal.size)

# Grasbüschel (rosa Hintergrund) freistellen
grass = fit(cutout_flood(Image.open(os.path.join(SRC, "Gras.png")), tol=46), 240)
grass.save(os.path.join(OUT, "grass.png"))
print("grass", grass.size)
print("ball", ball.size)

# Dunkleres Grasbüschel für Level 2 (RGB * 0.7, Alpha bleibt)
from PIL import ImageEnhance
g2 = Image.open(os.path.join(OUT, "grass.png")).convert("RGBA")
gr_, gg_, gb_, ga_ = g2.split()
g2 = Image.merge("RGBA", (
    ImageEnhance.Brightness(gr_).enhance(0.7),
    ImageEnhance.Brightness(gg_).enhance(0.7),
    ImageEnhance.Brightness(gb_).enhance(0.7),
    ga_,
))
g2.save(os.path.join(OUT, "grass2.png"))
print("grass2", g2.size)

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

# Lena (Level-2-Boss, id 12): cremefarbenen Hintergrund per Ecken-Flood-Fill freistellen
lena = fit(cutout_flood(Image.open(os.path.join(SRC, "lena.png")), tol=50), 360)
lena.save(os.path.join(OUT, "pokemon", "12.png"))
print("lena", lena.size)

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

# Seiten-Frame 1_1: Beine zusammenschieben (nach unten hin stärker),
# damit sich beim Laufen "gespreizt <-> zusammen" abwechselt = sichtbarer Schritt.
def legs_together(img, f_min=0.5):
    a = np.array(img); H, W = a.shape[:2]
    ys, xs = np.nonzero(a[:, :, 3] > 20)
    cx = float(xs.mean()); top = ys.min(); bot = ys.max()
    leg_top = top + 0.55 * (bot - top)  # ab Hüfte
    out = np.zeros_like(a)
    for y in range(H):
        f = 1.0 if y <= leg_top else 1 - (1 - f_min) * ((y - leg_top) / max(1, (bot - leg_top)))
        f = max(f_min, f)
        for x in range(W):
            sx = int(round(cx + (x - cx) / f))
            if 0 <= sx < W:
                out[y, x] = a[y, sx]
    return Image.fromarray(out)

p11 = os.path.join(OUT, "player", "1_1.png")
legs_together(Image.open(p11).convert("RGBA")).save(p11)
print("legs_together -> 1_1.png")
