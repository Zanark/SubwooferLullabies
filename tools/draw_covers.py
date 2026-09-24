"""Render original procedural cover illustrations; no stock or game art is used."""

import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, PngImagePlugin

SIZE = 2048
SCALE = SIZE / 1000
FONT_ROOT = Path(r"C:\Windows\Fonts")


def rgb(value):
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def coord(values):
    return tuple(round(value * SCALE) for value in values)


class Canvas:
    def __init__(self, song, number):
        self.song = song
        self.number = number
        self.colors = [rgb(value) for value in song["palette"]]
        self.random = random.Random(number * 1943)
        y, x = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32) / SIZE
        low, high, accent, _ = [np.array(c, dtype=np.float32) for c in self.colors]
        light = np.exp(-(((x - 0.55) / 0.55) ** 2 + ((y - 0.36) / 0.5) ** 2) * 2)
        frame = low + (high - low) * light[:, :, None]
        mist = np.exp(-(((x - 0.50) / 0.24) ** 2 + ((y - 0.42) / 0.28) ** 2) * 2)
        frame += accent * mist[:, :, None] * 0.07
        rng = np.random.default_rng(number * 83)
        frame += rng.normal(0, 0.8, (SIZE, SIZE, 1))
        self.image = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).convert("RGBA")

    def layer(self, painter, blur=0):
        overlay = Image.new("RGBA", self.image.size)
        painter(ImageDraw.Draw(overlay))
        if blur:
            overlay = overlay.filter(ImageFilter.GaussianBlur(blur * SCALE))
        self.image = Image.alpha_composite(self.image, overlay)

    def line(self, points, color, width=1):
        self.layer(lambda d: d.line([coord(p) for p in points], fill=color,
                                    width=max(1, round(width * SCALE)), joint="curve"))

    def polygon(self, points, color):
        self.layer(lambda d: d.polygon([coord(p) for p in points], fill=color))

    def ellipse(self, box, color, width=1, fill=None):
        self.layer(lambda d: d.ellipse(coord(box), fill=fill, outline=color,
                                       width=max(1, round(width * SCALE))))

    def rect(self, box, color, width=1, fill=None, radius=0):
        self.layer(lambda d: d.rounded_rectangle(coord(box), radius=radius * SCALE,
                                                 fill=fill, outline=color,
                                                 width=max(1, round(width * SCALE))))

    def glow(self, x, y, radius=20, strength=90, color=None):
        c = color or self.colors[2]
        self.layer(lambda d: d.ellipse(coord((x-radius, y-radius, x+radius, y+radius)),
                                       fill=(*c, strength)), blur=radius * 0.8)

    def droplet(self, x, y, size=8, color=None):
        c = color or self.colors[2]
        self.glow(x, y, size * 3, 110, c)
        self.polygon([(x, y-size*2), (x-size, y), (x, y+size), (x+size, y)], (*c, 190))
        self.ellipse((x-size*0.72, y-size*0.1, x+size*0.72, y+size), (*c, 240),
                     fill=(*c, 210))

    def ripples(self, x, y, scale=1, count=6):
        c = self.colors[2]
        for i in range(count):
            w = (28 + i * 27) * scale
            h = (5 + i * 6) * scale
            self.ellipse((x-w, y-h, x+w, y+h), (*c, max(12, 95-i*13)), 0.9)

    def capsule(self, x, y, length=65, angle=-30):
        r = math.radians(angle)
        a = (x-math.cos(r)*length/2, y-math.sin(r)*length/2)
        b = (x+math.cos(r)*length/2, y+math.sin(r)*length/2)
        self.glow(x, y, 35, 85)
        self.line([a, b], (*self.colors[2], 65), 15)
        self.line([a, b], (*self.colors[2], 230), 5)
        self.ellipse((a[0]-3, a[1]-3, a[0]+3, a[1]+3), (232, 247, 216, 250),
                     fill=(232, 247, 216, 250))

    def dust(self, count=85):
        for _ in range(count):
            x, y = self.random.uniform(110, 890), self.random.uniform(145, 715)
            r = self.random.choice([0.4, 0.6, 1])
            self.ellipse((x-r, y-r, x+r, y+r), (*self.colors[2], self.random.randint(15, 65)),
                         fill=(*self.colors[2], self.random.randint(10, 45)))


def draw_scene(c):
    a, b = c.colors[2], c.colors[3]
    scene = c.song["scene"]
    if scene == "threshold":
        for i in range(7):
            pad = i * 26
            c.layer(lambda d, p=pad, i=i: d.arc(coord((155+p, 168+p, 845-p, 900-p)),
                    180, 360, fill=(*a, 30+i*6), width=round((5-i*0.4)*SCALE)))
            c.line([(155+pad, 532), (155+pad, 680-pad*0.15)], (*a, 35), 2)
            c.line([(845-pad, 532), (845-pad, 680-pad*0.15)], (*a, 35), 2)
        c.glow(500, 460, 70, 50)
        c.capsule(510, 521, 64, -70)
        c.ripples(505, 648, 1.25)
        c.line([(170, 684), (445, 557), (560, 557), (830, 684)], (*b, 75), 1)
    elif scene == "fracture":
        c.ellipse((245, 174, 755, 684), (*b, 100), 1.5)
        for i in range(5):
            left, top = 267+i*80, 295+c.random.randrange(-45, 35)
            c.polygon([(left, top), (left+83, top-23), (left+65, top+45), (left+15, top+74)],
                      (*b, 38+i*6))
        c.line([(295, 315), (394, 374), (460, 345), (501, 441), (578, 416), (700, 470)],
               (*a, 140), 2)
        c.capsule(515, 570, 65, 56)
        for i in range(32):
            x = 200+i*19
            y = c.random.randrange(172, 460)
            c.line([(x, y), (x-8, y+35)], (*b, 33), 1)
        c.ripples(520, 690, 0.9)
    elif scene == "ledge":
        c.ellipse((208, 169, 806, 767), (*b, 27), 2)
        c.polygon([(150, 610), (453, 558), (493, 593), (477, 736), (150, 736)], (9, 19, 29, 255))
        c.line([(150, 610), (453, 558), (493, 593)], (*b, 100), 2)
        c.capsule(440, 557, 39, -65)
        for x, y in [(735, 624), (674, 451), (598, 335)]:
            c.polygon([(x-52, y), (x+40, y-6), (x+30, y+24), (x-40, y+26)], (*b, 25))
        c.droplet(588, 355, 5)
        c.ripples(581, 710, 0.9, 4)
    elif scene == "discovery":
        c.glow(500, 439, 120, 55)
        for size, alpha in [(176, 40), (125, 95), (97, 50)]:
            points = [(500, 420-size), (500+size, 420), (500, 420+size), (500-size, 420), (500, 420-size)]
            c.line(points, (*a, alpha), 1.5)
        c.capsule(500, 423, 122, -38)
        for x, y in [(290, 305), (698, 363), (355, 571), (651, 582)]:
            c.line([(x-7, y), (x+7, y)], (*a, 100), 1)
            c.line([(x, y-7), (x, y+7)], (*a, 100), 1)
        c.ripples(500, 677, 1.15, 4)
    elif scene == "cassette":
        c.glow(500, 436, 130, 40, b)
        c.rect((266, 316, 734, 591), (*a, 165), 2.5, fill=(18, 27, 27, 220), radius=21)
        c.rect((293, 343, 707, 541), (*a, 58), 1, radius=9)
        c.rect((324, 376, 676, 468), (*a, 90), 1.5, radius=10)
        for x in (380, 620):
            c.ellipse((x-36, 386, x+36, 458), (*a, 155), 2)
            c.ellipse((x-10, 412, x+10, 432), (*a, 180), 1.2)
        c.line([(415, 419), (584, 419)], (*a, 55), 2)
        c.polygon([(392, 554), (410, 497), (590, 497), (608, 554)], (*a, 24))
        c.line([(225, 603), (195, 603), (195, 232), (460, 232)], (*b, 130), 2)
        c.line([(440, 216), (462, 232), (440, 248)], (*b, 160), 2)
        c.droplet(738, 268, 6, b)
    elif scene == "ladder":
        for i in range(6):
            x = 160+i*45
            c.line([(x, 729), (420+(i*10), 181)], (*b, 22+i*5), 1.5)
            c.line([(1000-x, 729), (580-(i*10), 181)], (*b, 22+i*5), 1.5)
        c.line([(441, 699), (481, 216)], (*a, 160), 3)
        c.line([(559, 699), (519, 216)], (*a, 160), 3)
        for i in range(14):
            y = 245+i*31
            w = 21+(y-245)*0.065
            c.line([(500-w, y), (500+w, y)], (*a, 135), 2.7)
        c.glow(500, 212, 70, 90)
        c.capsule(581, 542, 48, 65)
    elif scene == "locker":
        c.rect((351, 218, 645, 668), (*a, 75), 3, fill=(8, 19, 25, 255), radius=6)
        c.rect((381, 246, 616, 638), (*a, 30), 1)
        c.line([(380, 367), (616, 367)], (*b, 110), 2)
        c.line([(380, 548), (616, 548)], (*b, 85), 2)
        c.polygon([(351, 218), (234, 298), (238, 721), (351, 668)], (*a, 23))
        c.line([(351, 218), (234, 298), (238, 721), (351, 668)], (*a, 115), 2)
        for y in [330, 344, 358]:
            c.line([(260, y), (323, y-18)], (*a, 65), 2)
        c.glow(490, 501, 47, 70, b)
        c.rect((457, 489, 522, 534), (*b, 170), 2, fill=(37, 40, 32, 230), radius=12)
        c.ellipse((476, 499, 506, 529), (*b, 200), 1, fill=(*b, 80))
        c.line([(435, 511), (450, 478), (518, 479), (541, 512)], (*b, 95), 3)
        c.ripples(471, 731, 0.65, 3)
    elif scene == "beam":
        c.polygon([(425, 447), (764, 242), (800, 647)], (*a, 12))
        c.polygon([(442, 447), (754, 301), (788, 582)], (*a, 21))
        c.line([(444, 438), (754, 301)], (*a, 40), 1)
        c.line([(444, 451), (788, 582)], (*a, 40), 1)
        c.rect((303, 406, 449, 496), (*b, 125), 2, fill=(30, 30, 25, 210), radius=20)
        c.ellipse((395, 415, 451, 489), (*a, 220), 3)
        c.glow(427, 448, 58, 140)
        c.line([(306, 427), (258, 450), (307, 477)], (*b, 145), 7)
        c.ripples(530, 657, 1, 4)
    elif scene == "current":
        c.ellipse((216, 210, 788, 710), (*b, 62), 24)
        c.ellipse((237, 232, 767, 688), (*b, 32), 2)
        for j in range(14):
            points = []
            for x in range(142, 867, 5):
                y = 364+j*23+math.sin(x/88+j*0.36)*20
                points.append((x, y))
            c.line(points, (*a, 24+j*3), 1.4)
        c.capsule(529, 469, 70, -38)
        c.droplet(338, 233, 7)
    elif scene == "roots":
        c.glow(500, 196, 145, 100)
        for i in range(5):
            x = 330+i*95
            c.polygon([(x, 171), (x+16, 171), (x+90, 667), (x-68, 687)], (*a, 7+i*2))
        for i in range(11):
            x = 130+i*73
            points = [(x, 160)]
            for j in range(1, 6):
                points.append((x+c.random.randrange(-45, 46), 160+j*33))
            c.line(points, (*b, 95), max(1, 5-i%4))
            branch = points[3]
            c.line([branch, (branch[0]+38, branch[1]+29), (branch[0]+49, branch[1]+53)], (*b, 85), 1.5)
        c.polygon([(150, 693), (290, 650), (389, 675), (634, 644), (852, 683), (852, 741), (150, 741)],
                  (14, 37, 31, 180))
        c.capsule(501, 658, 51, -18)
    elif scene == "surface":
        c.glow(501, 321, 210, 60)
        c.ellipse((300, 159, 702, 560), (*a, 130), 1, fill=(*a, 105))
        c.polygon([(139, 589), (265, 493), (342, 540), (476, 492), (580, 539), (754, 481), (875, 558),
                   (875, 733), (139, 733)], (18, 43, 46, 185))
        c.ellipse((342, 569, 665, 666), (*b, 140), 4, fill=(10, 29, 33, 255))
        c.ellipse((371, 585, 636, 643), (*a, 75), 1)
        c.droplet(507, 573, 7, a)
        c.line([(423, 697), (421, 652), (577, 652), (579, 697)], (*b, 80), 2)
    elif scene == "journey":
        points = [(314, 695), (589, 653), (402, 577), (645, 515),
                  (422, 442), (643, 365), (451, 288), (531, 194)]
        c.line(points, (*a, 50), 18)
        c.line(points, (*a, 135), 2)
        for i, (x, y) in enumerate(points):
            c.glow(x, y, 17+i, 65)
            c.ellipse((x-8, y-8, x+8, y+8), (*a, 220), 1.5, fill=(*b, 120))
        c.glow(531, 194, 70, 90)
        c.line([(270, 743), (270, 147), (737, 147), (737, 743)], (*b, 22), 1)
        c.ripples(510, 724, 1.1, 3)
    elif scene == "stillness":
        c.glow(511, 351, 175, 34)
        for j in range(8):
            points = [(x, 338+j*43+math.sin(x/195+j*0.22)*18) for x in range(151, 850, 4)]
            c.line(points, (*a, 22+j*4), 1)
        for x in (300, 400, 510, 620, 719):
            c.polygon([(x, 162), (x+18, 162), (x+70, 610), (x-95, 657)], (*a, 5))
        c.ripples(511, 540, 1.65, 7)
        c.droplet(511, 330, 9)
        for i in range(12):
            x = 335+i*28
            c.line([(x, 649), (x, 686+math.sin(i/3)*8)], (*b, 32), 1)
        c.line([(335, 649), (643, 649)], (*b, 35), 1)
    elif scene == "pulse":
        c.glow(489, 410, 157, 70)
        for i in range(7):
            pad = i*18
            c.ellipse((201+pad, 196+pad, 799-pad, 692-pad), (*a, 35+i*14), 1.3)
        points = [(170, 455), (301, 455), (333, 420), (360, 482), (415, 324),
                  (470, 552), (526, 380), (574, 464), (642, 425), (685, 455), (831, 455)]
        c.line(points, (*b, 45), 12)
        c.line(points, (*b, 205), 2.5)
        for x in range(226, 810, 49):
            c.line([(x, 623), (500+(x-500)*0.1, 509)], (*a, 26), 1)
    else:
        raise ValueError(f"Unknown cover scene: {scene}")


def fit_font(text, size, maximum, bold=False):
    file = FONT_ROOT / ("segoeuib.ttf" if bold else "segoeuil.ttf")
    for value in range(size, 24, -1):
        font = ImageFont.truetype(str(file), value)
        if font.getlength(text) <= maximum:
            return font
    raise ValueError(f"Title cannot fit: {text}")


def tracked(draw, text, xy, font, fill, spacing):
    x, y = xy
    for char in text:
        draw.text((round(x), y), char, font=font, fill=fill)
        x += font.getlength(char) + spacing
    return x


def render_cover(song, number, path):
    for font in ["segoeui.ttf", "segoeuil.ttf", "segoeuib.ttf"]:
        if not (FONT_ROOT / font).is_file():
            raise FileNotFoundError(f"Required local rendering font: {FONT_ROOT / font}")
    c = Canvas(song, number)
    c.dust()
    draw_scene(c)
    c.rect((63, 64, 937, 936), (*c.colors[2], 28), 0.8)
    c.line([(92, 752), (908, 752)], (*c.colors[2], 65), 0.8)
    c.line([(92, 109), (177, 109)], (*c.colors[2], 160), 1.7)
    c.layer(lambda d: d.rectangle(coord((65, 765, 935, 935)), fill=(*c.colors[0], 60)))
    draw = ImageDraw.Draw(c.image)
    small = ImageFont.truetype(str(FONT_ROOT / "segoeui.ttf"), 22)
    label = ImageFont.truetype(str(FONT_ROOT / "segoeui.ttf"), 19)
    tracked(draw, "SUBWOOFER LULLABIES", coord((91, 82)), small, (229, 228, 213, 235), 4)
    draw.text(coord((860, 82)), f"{number:02d}", font=small, fill=(*c.colors[2], 225))
    title = song["title"].upper()
    font = fit_font(title, 134, 1648)
    draw.text(coord((88, 773)), title, font=font, fill=(239, 236, 219, 255),
              stroke_width=0)
    tracked(draw, song["caption"], coord((94, 862)), label, (*c.colors[2], 220), 2.7)
    tracked(draw, song["genre"], coord((94, 906)), label, (220, 223, 213, 175), 2)
    tempo = f"{song['bpm']} BPM"
    draw.text(coord((832, 904)), tempo, font=label, fill=(220, 223, 213, 175))
    info = PngImagePlugin.PngInfo()
    info.add_text("Title", song["title"])
    info.add_text("Description", song["emotion"])
    info.add_text("Creation", "Original local procedural illustration; no imported artwork.")
    c.image.convert("RGB").save(path, pnginfo=info, compress_level=6)
