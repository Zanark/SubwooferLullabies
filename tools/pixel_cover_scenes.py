"""Original 256px scene drawings; title typography is composed separately at export size."""

import math
import random

import numpy as np
from PIL import Image, ImageDraw

SIZE = 256
LAYER_NAMES = ["distance", "architecture", "subject", "materials", "water", "light", "foreground"]


def blend(a, b, amount):
    return tuple(round(x * (1 - amount) + y * amount) for x, y in zip(a, b))


class Scene:
    def __init__(self, song, index):
        self.song = song
        self.rng = random.Random(1907 + index * 379)
        dark, mid, accent, warm = [tuple(bytes.fromhex(c)) for c in song["palette"]]
        self.palette = []
        for a, b in [(blend(dark, (1, 4, 11), .7), accent), (dark, warm),
                     (dark, (179, 189, 181)), (mid, (235, 251, 218))]:
            self.palette.extend(blend(a, b, t / 15) for t in range(16))
        self.layers = {name: Image.new("RGBA", (SIZE, SIZE)) for name in LAYER_NAMES}
        self.use("distance")
        px = self.layers["distance"].load()
        for y in range(SIZE):
            for x in range(SIZE):
                distance = math.hypot((x - 133) / 170, (y - 106) / 172)
                level = max(0, min(6, round(6.5 * (1 - distance) + self.rng.random() * .55)))
                px[x, y] = (*self.c(level), 255)

    def c(self, index):
        return self.palette[max(0, min(63, int(index)))]

    def use(self, name):
        self.current = name
        self.draw = ImageDraw.Draw(self.layers[name])
        return self

    def rect(self, box, color, outline=None, width=1):
        self.draw.rectangle(tuple(round(v) for v in box), fill=self.c(color) if color is not None else None,
                            outline=self.c(outline) if outline is not None else None, width=width)

    def line(self, points, color, width=1):
        self.draw.line([(round(x), round(y)) for x, y in points], fill=self.c(color), width=width)

    def polygon(self, points, color):
        self.draw.polygon([(round(x), round(y)) for x, y in points], fill=self.c(color))

    def ellipse(self, box, color=None, outline=None, width=1):
        self.draw.ellipse(tuple(round(v) for v in box), fill=self.c(color) if color is not None else None,
                          outline=self.c(outline) if outline is not None else None, width=width)

    def dot(self, x, y, color):
        if 0 <= round(x) < SIZE and 0 <= round(y) < SIZE:
            self.draw.point((round(x), round(y)), fill=self.c(color))

    def texture(self, box, colors, count, strokes=False):
        x0, y0, x1, y1 = box
        for _ in range(count):
            x = self.rng.randint(x0, x1)
            y = self.rng.randint(y0, y1)
            color = self.rng.choice(colors)
            if strokes:
                self.line([(x, y), (min(x1, x + self.rng.randint(1, 5)), y)], color)
            else:
                self.dot(x, y, color)

    def arch(self, cx, cy, rx, ry, bottom, color):
        points = [(cx - rx, bottom)]
        points.extend((cx + math.cos(a) * rx, cy + math.sin(a) * ry)
                      for a in np.linspace(math.pi, math.pi * 2, 120))
        points.append((cx + rx, bottom))
        self.polygon(points, color)

    def masonry_arch(self, cx, cy, rx, ry, thickness, bottom, lit=10):
        self.arch(cx, cy, rx, ry, bottom, lit - 4)
        for row, y in enumerate(range(round(cy), bottom, 9)):
            for side in [-1, 1]:
                x = round(cx + side * rx)
                left, right = sorted([x, x - side * thickness])
                self.rect((left, y, right, y + 7), lit - 3 + row % 3)
                self.line([(left, y), (right, y)], lit)
        for i in range(25):
            a, b = math.pi + i * math.pi / 25, math.pi + (i + 1) * math.pi / 25
            points = [(cx + math.cos(t) * xr, cy + math.sin(t) * yr)
                      for t, xr, yr in [(a, rx, ry), (b, rx, ry), (b, rx - thickness, ry - thickness),
                                       (a, rx - thickness, ry - thickness)]]
            self.polygon(points, lit - 3 + i % 3)
            self.line([points[0], points[-1]], lit - 6)
            self.line([points[0], points[1]], lit)
        self.arch(cx, cy, rx - thickness, ry - thickness, bottom, 1)

    def bricks(self, box, base=6, mortar=2):
        x0, y0, x1, y1 = box
        self.rect(box, mortar)
        for row, y in enumerate(range(y0, y1, 12)):
            for x in range(x0 - (row % 2) * 13, x1, 27):
                left, right = max(x0, x), min(x1, x + 24)
                if left >= right:
                    continue
                level = base + self.rng.choice([-1, 0, 0, 1])
                self.rect((left, y + 1, right, min(y + 10, y1)), level)
                self.line([(left, y + 1), (right, y + 1)], level + 2)
                if right - left > 10:
                    self.line([(left + 3, y + 8), (left + 8, y + 8)], level - 1)

    def pipe(self, x, y0, y1, width=9):
        for dx in range(width):
            color = 34 + round(9 * math.sin(math.pi * dx / width))
            self.line([(x + dx, y0), (x + dx, y1)], color)
        for y in range(y0 + 16, y1, 33):
            self.rect((x - 2, y, x + width + 1, y + 4), 35)
            self.line([(x - 2, y), (x + width, y)], 46)
            self.dot(x - 1, y + 2, 56)
        self.line([(x + 2, y0), (x + 2, y1)], 7)

    def glow(self, x, y, rx, ry, peak=10, floor=1):
        pixels = self.layers[self.current].load()
        for py in range(max(0, y - ry), min(SIZE, y + ry + 1)):
            for px in range(max(0, x - rx), min(SIZE, x + rx + 1)):
                falloff = math.exp(-3 * (((px - x) / rx) ** 2 + ((py - y) / ry) ** 2))
                if falloff > .06:
                    level = round(floor + (peak - floor) * falloff)
                    pixels[px, py] = (*self.c(level), 255)

    def rod(self, x, y, dx, dy, warm=False):
        self.line([(x, y), (x + dx, y + dy)], 23 if warm else 6, 7)
        self.line([(x, y), (x + dx, y + dy)], 28 if warm else 11, 4)
        self.line([(x, y), (x + dx, y + dy)], 62, 2)
        self.ellipse((x - 2, y - 2, x + 2, y + 2), 63)
        self.line([(x + dx - 2, y + dy), (x + dx + 1, y + dy)], 42)

    def ripples(self, cx, cy, rx=16, count=5, color=9):
        for i in range(count):
            w, h = rx + i * 8, 2 + i * 2
            self.draw.arc((cx - w, cy - h, cx + w, cy + h), 182, 338, fill=self.c(color - i // 2))
            self.draw.arc((cx - w, cy - h, cx + w, cy + h), 12, 145, fill=self.c(color - i // 2 + 1))
            self.dot(cx - w + 4, cy + 1, color + 2)

    def water(self, horizon=174, lightx=128, base=2):
        self.use("water")
        for y in range(horizon, 256):
            self.line([(0, y), (255, y)], max(0, base + round((256 - y) / 35)))
        for _ in range(390):
            y = self.rng.randint(horizon, 240)
            x = self.rng.randint(0, 255)
            distance = abs(x - lightx) / (18 + (y - horizon) * .9)
            if distance < 1 and self.rng.random() < .6:
                level = self.rng.randint(7, 11)
            else:
                level = self.rng.randint(base + 1, base + 3)
            self.line([(x, y), (min(255, x + self.rng.randint(2, 10)), y)], level)

    def debris(self, floor=194):
        self.use("foreground")
        for x, r in [(8, 22), (240, 32), (23, 12), (221, 9)]:
            y = floor + self.rng.randint(-3, 15)
            self.polygon([(x - r, y + 8), (x - r // 2, y - 5), (x + r // 3, y - 2),
                          (x + r, y + 10), (x + r, 256), (x - r, 256)], 0)
            self.line([(x - r // 2, y - 5), (x + r // 3, y - 2)], 5)


def anticipation(s):
    s.use("architecture").bricks((0, 0, 255, 214), 5, 1)
    for rx, ry, t, cy, lit in [(108, 96, 15, 133, 10), (73, 68, 10, 138, 9),
                               (45, 45, 7, 143, 8), (24, 28, 4, 146, 7)]:
        s.masonry_arch(136, cy, rx, ry, t, 214, lit)
    s.use("materials").pipe(13, 34, 207, 10)
    s.pipe(232, 0, 184, 7)
    s.water(191, 143, 1)
    s.use("foreground")
    s.polygon([(0, 211), (119, 170), (122, 175), (26, 256), (0, 256)], 3)
    s.line([(0, 211), (120, 171)], 7)
    s.polygon([(256, 203), (155, 173), (153, 178), (236, 256), (256, 256)], 2)
    s.line([(255, 203), (155, 173)], 8)
    s.use("light").rod(141, 155, -4, 17)
    s.ripples(141, 201, 12, 5, 10)
    s.use("materials")
    for x, y in [(47, 139), (63, 89), (200, 110)]:
        s.line([(x, y), (x - 2, y + 13)], 4)


def dismay(s):
    s.use("distance").glow(132, 22, 105, 87, 44, 33)
    s.use("architecture")
    s.polygon([(0, 0), (106, 0), (87, 49), (46, 73), (0, 86)], 38)
    s.polygon([(157, 0), (256, 0), (256, 132), (211, 79), (175, 59)], 34)
    s.line([(0, 73), (49, 60), (80, 35), (95, 0)], 45, 2)
    s.line([(165, 0), (177, 44), (223, 67), (256, 106)], 40, 2)
    s.use("subject")
    for x, y, r in [(85, 100, 21), (175, 117, 29), (143, 62, 12), (57, 150, 10), (207, 168, 8)]:
        points = [(x - r, y - 4), (x + r // 2, y - r), (x + r, y + 5), (x - r // 2, y + r)]
        s.polygon(points, 37)
        s.polygon([points[0], points[1], (x, y), points[3]], 42)
        s.line([points[0], points[1]], 47)
        s.line([(x - 3, y - 6), (x + 4, y), (x, y + 6)], 34)
    s.use("materials")
    for _ in range(32):
        x, y = s.rng.randint(12, 241), s.rng.randint(40, 199)
        s.line([(x, y), (x - 3, y + s.rng.randint(3, 10))], 38)
    s.water(214, 131, 0)
    s.use("light").rod(125, 133, 12, 20, True)
    s.ripples(133, 223, 13, 4, 8)


def vulnerability(s):
    s.use("architecture")
    for rx, ry, t, lit in [(116, 114, 8, 6), (87, 90, 6, 5), (61, 66, 4, 4)]:
        s.masonry_arch(161, 153, rx, ry, t, 249, lit)
    s.use("materials").pipe(25, 0, 166, 5)
    s.polygon([(202, 99), (256, 88), (256, 97), (205, 109)], 37)
    s.line([(202, 99), (255, 88)], 44)
    s.polygon([(221, 65), (256, 59), (256, 64), (224, 71)], 34)
    s.water(206, 89, 0)
    s.use("foreground").polygon([(0, 177), (61, 156), (90, 162), (99, 178), (88, 240), (0, 256)], 0)
    s.line([(0, 177), (61, 156), (90, 162)], 7)
    s.line([(18, 181), (42, 174), (48, 179)], 3)
    s.line([(64, 185), (71, 198), (67, 213)], 2)
    s.line([(32, 165), (32, 142), (48, 140), (55, 144)], 36, 2)
    s.line([(47, 162), (47, 141)], 35, 2)
    s.line([(32, 142), (48, 140)], 43)
    s.line([(88, 163), (82, 166), (85, 171)], 5)
    s.use("light").rod(65, 153, 14, 3)
    s.ripples(167, 217, 19, 3, 5)


def delight(s):
    s.use("architecture").bricks((0, 0, 255, 217), 3, 1)
    s.masonry_arch(129, 121, 87, 97, 12, 219, 8)
    s.use("distance").glow(128, 111, 103, 96, 9, 1)
    s.use("subject")
    s.polygon([(54, 144), (124, 114), (204, 145), (133, 178)], 26)
    s.polygon([(54, 144), (133, 178), (133, 198), (55, 167)], 20)
    s.polygon([(133, 178), (204, 145), (204, 166), (133, 198)], 6)
    s.polygon([(62, 140), (124, 118), (193, 146), (131, 173)], 1)
    s.line([(55, 143), (124, 115), (204, 145)], 31, 2)
    s.line([(57, 165), (131, 196), (201, 165)], 23)
    s.use("materials").rect((116, 180, 130, 188), 27)
    for x, y in [(61, 148), (66, 165), (190, 157), (140, 181)]:
        s.rect((x, y, x + 3, y + 3), 30)
    s.use("light").rod(107, 118, 25, -37)
    for x, y, r in [(165, 95, 4), (89, 90, 3), (170, 145, 2)]:
        s.line([(x - r, y), (x + r, y)], 56)
        s.line([(x, y - r), (x, y + r)], 56)
        s.dot(x, y, 63)
    s.use("water").ripples(123, 221, 31, 2, 6)
    s.debris(219)


def curiosity(s):
    s.use("architecture").bricks((0, 0, 255, 212), 21, 16)
    s.use("materials").pipe(20, 0, 210, 9)
    s.line([(41, 130), (41, 60), (97, 60)], 29, 2)
    s.line([(85, 50), (98, 60), (86, 69)], 30, 2)
    s.rect((0, 204, 255, 210), 35)
    s.line([(0, 204), (255, 204)], 44)
    s.use("subject")
    s.rect((63, 95, 219, 190), 16)
    s.rect((67, 91, 215, 185), 26)
    s.rect((70, 94, 212, 182), 6)
    s.rect((77, 101, 205, 165), 27)
    s.rect((80, 105, 202, 119), 30)
    s.rect((80, 124, 202, 164), 1)
    for cx in [104, 177]:
        s.ellipse((cx - 17, 127, cx + 17, 161), 43)
        s.ellipse((cx - 14, 130, cx + 14, 158), 1)
        s.ellipse((cx - 7, 137, cx + 7, 151), 28)
        s.ellipse((cx - 3, 141, cx + 3, 147), 1)
        for a in np.linspace(0, math.pi * 2, 6, endpoint=False):
            s.line([(cx + math.cos(a) * 8, 144 + math.sin(a) * 8),
                    (cx + math.cos(a) * 12, 144 + math.sin(a) * 12)], 46, 2)
    s.rect((122, 137, 159, 150), 34)
    s.line([(123, 138), (158, 138)], 42)
    s.polygon([(106, 169), (178, 169), (189, 182), (94, 182)], 35)
    s.use("materials")
    for x in [73, 207]:
        for y in [97, 176]:
            s.ellipse((x - 1, y - 1, x + 2, y + 2), 46)
            s.dot(x, y, 1)
    s.line([(85, 111), (102, 111)], 21, 2)
    s.line([(85, 115), (129, 115)], 24)
    s.texture((77, 169, 90, 176), [7, 5, 27], 12, True)
    s.use("foreground").line([(47, 211), (59, 218), (84, 215), (95, 222)], 24)
    s.line([(47, 212), (58, 219), (83, 216), (95, 223)], 17)
    s.use("light").ripples(181, 225, 15, 3, 5)


def determination(s):
    s.use("architecture")
    s.polygon([(0, 0), (93, 0), (62, 240), (0, 256)], 34)
    s.polygon([(167, 0), (256, 0), (256, 256), (198, 240)], 33)
    for y in range(15, 241, 15):
        left = round(93 - y * .13)
        right = round(167 + y * .13)
        s.line([(0, y + 9), (left, y)], 37)
        s.line([(right, y), (255, y + 7)], 36)
        s.line([(left // 2 + (y % 3) * 3, y + 5), (left // 2 + (y % 3) * 3, y + 16)], 32)
    s.use("distance").glow(130, 31, 58, 96, 58, 2)
    s.use("subject")
    s.polygon([(109, 17), (148, 17), (143, 48), (116, 48)], 62)
    s.line([(117, 48), (82, 224)], 21, 5)
    s.line([(142, 48), (179, 224)], 21, 5)
    s.line([(117, 48), (82, 224)], 29, 2)
    s.line([(142, 48), (179, 224)], 27, 2)
    for i in range(17):
        y = 52 + i * 5 + i * i * .28
        delta = (y - 48) * .205
        if i == 11:
            s.line([(117 - delta, y), (125, y + 3)], 21, 5)
            s.line([(117 - delta, y - 1), (124, y + 2)], 29, 2)
            s.line([(143, y), (142 + delta, y)], 21, 5)
            s.line([(144, y - 1), (142 + delta, y - 1)], 29, 2)
        else:
            s.line([(117 - delta, y), (142 + delta, y)], 21, 5)
            s.line([(117 - delta, y - 1), (142 + delta, y - 1)], 29, 2)
        s.dot(118 - delta, y + 1, 46)
    s.use("materials").pipe(7, 0, 256, 7)
    for x, y in [(109, 88), (150, 103), (99, 141), (165, 168)]:
        s.line([(x, y), (x + 2, y - 5)], 47)
    s.ellipse((162, 155, 174, 159), outline=26)
    s.use("light").rod(172, 159, -3, 13)
    s.use("light").texture((112, 56, 150, 130), [8, 24, 37], 22)
    s.debris(230)


def loss(s):
    s.use("architecture").bricks((0, 0, 255, 230), 35, 32)
    s.use("subject")
    s.rect((90, 44, 198, 207), 42)
    s.rect((95, 48, 193, 203), 33)
    s.rect((101, 54, 188, 200), 0)
    s.line([(193, 49), (193, 201)], 47)
    s.line([(103, 106), (188, 106)], 42, 2)
    s.line([(103, 166), (188, 166)], 42, 2)
    s.polygon([(90, 44), (44, 69), (44, 212), (90, 206)], 37)
    s.line([(90, 44), (44, 69), (44, 212), (90, 206)], 45)
    for y in range(82, 110, 6):
        s.line([(53, y), (80, y - 14)], 32, 2)
        s.line([(53, y + 2), (80, y - 12)], 40)
    s.rect((78, 138, 82, 153), 26)
    s.line([(79, 139), (79, 149)], 31)
    s.use("materials")
    s.rect((117, 64, 156, 78), 36)
    s.rect((122, 68, 136, 69), 43)
    s.rect((142, 68, 152, 69), 43)
    s.line([(115, 158), (121, 145), (158, 145), (167, 158)], 21, 4)
    s.rect((129, 150, 157, 165), 39)
    for r, tint in [(11, 26), (8, 21), (6, 29), (3, 31)]:
        s.ellipse((145 - r, 157 - r, 145 + r, 157 + r), tint)
    s.dot(143, 154, 61)
    s.texture((92, 46, 187, 48), [23, 34, 41], 43)
    s.texture((46, 202, 86, 205), [33, 42, 23], 24, True)
    s.use("water").ripples(140, 225, 27, 3, 5)
    s.debris(237)


def courage(s):
    s.use("architecture")
    s.masonry_arch(203, 136, 113, 100, 10, 256, 22)
    s.masonry_arch(203, 148, 75, 72, 7, 256, 20)
    s.use("distance").glow(102, 139, 100, 94, 24, 16)
    s.use("light")
    s.polygon([(110, 132), (256, 57), (256, 201), (110, 148)], 19)
    s.polygon([(110, 134), (256, 84), (256, 184), (110, 145)], 22)
    s.polygon([(110, 136), (256, 108), (256, 159), (110, 143)], 25)
    s.texture((152, 116, 249, 166), [27, 28], 27)
    s.use("subject")
    s.line([(65, 128), (41, 137), (66, 157)], 35, 8)
    s.line([(66, 126), (40, 137)], 44, 2)
    s.rect((61, 119, 103, 162), 20)
    s.rect((64, 122, 104, 157), 24)
    s.line([(65, 122), (100, 122)], 29, 2)
    for x, ry, tint in [(104, 27, 35), (109, 25, 44), (112, 21, 20),
                         (113, 18, 30), (114, 12, 61)]:
        s.ellipse((x - 9, 140 - ry, x + 9, 140 + ry), tint)
    s.use("materials")
    for y in range(123, 154, 5):
        s.line([(73, y), (87, y)], 21)
    s.rect((67, 113, 78, 118), 40)
    s.use("foreground")
    s.polygon([(0, 195), (69, 169), (144, 183), (255, 179), (255, 256), (0, 256)], 1)
    s.line([(0, 195), (68, 169), (144, 183)], 23)
    s.ripples(139, 209, 25, 3, 6)


def resilience(s):
    s.use("architecture")
    for r, tint in [(103, 35), (99, 41), (93, 24), (89, 1), (74, 6), (70, 3),
                     (52, 5), (49, 1), (28, 4), (26, 0)]:
        s.ellipse((136 - r, 117 - r, 136 + r, 117 + r), tint)
    for angle in np.linspace(0, math.pi * 2, 20, endpoint=False):
        x, y = 136 + math.cos(angle) * 96, 117 + math.sin(angle) * 96
        s.rect((x - 2, y - 2, x + 2, y + 2), 45)
        s.dot(x + 1, y + 1, 21)
    s.use("materials").pipe(7, 0, 197, 12)
    for y in range(85, 137, 6):
        s.line([(8, y), (20, y)], 35)
    s.water(166, 146, 2)
    s.use("water")
    for i in range(16):
        points = [(x, 173 + i * 3 + math.sin(x / 27 + i * .6) * 3) for x in range(0, 256, 2)]
        s.line(points, 6 + (i % 4))
    s.use("light").rod(177, 163, -14, 9)
    s.debris(236)


def hope(s):
    s.use("architecture")
    s.masonry_arch(130, 101, 112, 88, 12, 256, 6)
    s.masonry_arch(130, 104, 88, 77, 9, 256, 5)
    s.use("light")
    s.ellipse((71, 17, 185, 60), 28)
    s.ellipse((89, 25, 165, 51), 61)
    for points, tint in [
        ([(99, 47), (110, 48), (89, 205), (47, 214)], 5),
        ([(121, 47), (136, 47), (167, 215), (116, 220)], 8),
        ([(149, 46), (156, 44), (232, 207), (192, 210)], 6)]:
        s.polygon(points, tint)
    s.use("foreground")
    for x, end in [(13, 108), (43, 139), (68, 75), (204, 140), (231, 101), (250, 154)]:
        points = [(x, 0), (x - 8, 31), (x + 3, 47), (x - 10, end)]
        s.line(points, 17, 6)
        s.line(points, 24, 2)
        s.line([(x - 4, 43), (x + 15, 66), (x + 11, 88)], 23)
    s.polygon([(0, 225), (73, 203), (113, 217), (175, 202), (255, 193), (255, 256), (0, 256)], 1)
    s.line([(112, 217), (175, 202), (255, 193)], 5)
    s.line([(155, 210), (155, 170)], 10, 2)
    s.polygon([(155, 191), (138, 174), (133, 173), (134, 184), (155, 196)], 7)
    s.polygon([(155, 185), (174, 164), (185, 161), (182, 174), (155, 192)], 13)
    s.line([(157, 186), (179, 166)], 60)
    s.use("light").texture((86, 61, 179, 158), [25, 8, 27], 33)


def relief(s):
    s.use("distance")
    for y in range(192):
        s.line([(0, y), (255, y)], 49 + min(9, round(y / 23)))
    s.ellipse((158, 30, 215, 87), 62)
    for x, y, w in [(25, 59, 63), (161, 108, 53), (-17, 94, 47)]:
        s.ellipse((x, y, x + w, y + 13), 61)
        s.ellipse((x + 17, y - 8, x + w - 9, y + 12), 61)
    s.use("architecture")
    for x, y, w in [(0, 130, 23), (30, 140, 43), (188, 132, 35), (223, 119, 32)]:
        s.rect((x, y, x + w, 165), 45)
        s.line([(x, y), (x + w, y)], 53)
    s.rect((0, 163, 255, 256), 40)
    s.line([(0, 165), (255, 165)], 53, 2)
    for y in [178, 201, 237]:
        s.line([(0, y), (255, y)], 35)
    for x in [-72, 37, 135, 226, 301]:
        s.line([(128 + (x - 128) * .3, 167), (x, 256)], 35)
    s.use("subject")
    for rx, ry, cy, tint in [(52, 23, 193, 45), (48, 21, 191, 56),
                             (44, 17, 192, 1), (38, 12, 193, 33)]:
        s.ellipse((143 - rx, cy - ry, 143 + rx, cy + ry), tint)
    s.ellipse((25, 189, 81, 209), 35)
    s.ellipse((24, 185, 80, 202), 43)
    for y in range(188, 201, 3):
        s.line([(32, y), (70, y)], 35)
    s.use("light").rod(135, 142, -9, 16)
    s.line([(153, 127), (144, 129), (140, 134)], 45)
    s.use("foreground")
    s.line([(232, 231), (230, 199)], 8, 2)
    s.line([(231, 214), (221, 207)], 10)
    s.line([(231, 211), (243, 194)], 11, 2)
    s.texture((4, 240, 251, 255), [34, 37, 44], 190)


def perseverance(s):
    s.use("architecture").bricks((0, 0, 50, 256), 4, 1)
    s.bricks((208, 0, 255, 256), 4, 1)
    s.use("distance").glow(135, 43, 83, 129, 10, 1)
    s.use("subject").ellipse((109, 21, 166, 49), 30)
    s.ellipse((117, 25, 157, 40), 62)
    route = [(64, 219), (175, 187), (80, 151), (177, 113), (105, 82), (138, 48)]
    for i in range(len(route) - 1):
        (x0, y0), (x1, y1) = route[i], route[i + 1]
        count = 12
        for j in range(count):
            t = j / count
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            s.rect((x - 7, y, x + 8, y + 5), 4)
            s.line([(x - 7, y), (x + 8, y)], 24)
        s.line([(x0 - 5, y0 - 14), (x1 - 5, y1 - 14)], 7)
        for t in [.0, .4, .8]:
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            s.line([(x - 5, y - 14), (x - 5, y)], 6)
    s.use("materials")
    s.rect((27, 133, 44, 175), 38)
    s.rect((30, 136, 42, 172), 1)
    s.rect((33, 161, 39, 164), 25)
    s.rect((215, 177, 238, 190), 22)
    for x in [220, 233]:
        s.ellipse((x - 2, 180, x + 2, 184), 44)
    s.line([(196, 0), (187, 26), (201, 45), (189, 66)], 24, 2)
    for x, y in [(107, 204), (138, 171), (121, 136), (145, 99)]:
        s.line([(x - 4, y), (x + 3, y - 1)], 43)
        s.line([(x - 2, y + 2), (x + 4, y + 1)], 36)
    s.line([(84, 212), (96, 209)], 5, 2)
    s.line([(126, 171), (137, 169)], 8, 2)
    s.use("light").rod(164, 110, 13, 0)
    s.water(233, 136, 0)
    s.use("water").ripples(134, 243, 28, 2, 6)


SCENES = {
    "anticipation": anticipation, "dismay": dismay, "vulnerability": vulnerability,
    "delight": delight, "curiosity": curiosity, "determination": determination,
    "loss": loss, "courage": courage, "resilience": resilience, "hope": hope,
    "relief": relief, "perseverance": perseverance,
}


def finish_materials(scene):
    title = scene.song["title"]
    key_lights = {
        "anticipation": (138, 158, 87), "dismay": (127, 32, 159),
        "vulnerability": (85, 141, 76), "delight": (127, 107, 115),
        "curiosity": (90, 88, 189), "determination": (130, 40, 157),
        "loss": (145, 154, 100), "courage": (112, 140, 185),
        "resilience": (172, 167, 167), "hope": (129, 49, 193),
        "relief": (188, 61, 230), "perseverance": (137, 49, 174),
    }
    lx, ly, radius = key_lights[title]
    y, x = np.mgrid[:SIZE, :SIZE]
    distance = ((x - lx) ** 2 + ((y - ly) * 1.1) ** 2) / radius ** 2
    light = np.exp(-distance * 1.6)
    edge = np.clip(1 - ((x - 128) / 175) ** 2, .30, 1)
    rng = np.random.default_rng(181 + list(SCENES).index(title))
    masks = []
    images = []
    for name, original in scene.layers.items():
        pixels = np.asarray(original).copy()
        alpha = pixels[:, :, 3]
        values = pixels[:, :, :3].astype(float)
        if name in {"architecture", "subject", "materials", "foreground"}:
            modulation = .4 + .95 * light
            if name == "subject":
                modulation += .2
            if title == "relief":
                modulation = .85 + light * .35
            # Coherent damp streaks and small chips, not indiscriminate white-noise grain.
            weather = (np.sin(x * .39 + np.sin(y * .028) * 2) * np.cos(y * .047) * .05 +
                       np.sin(x * .17 + y * .11) * .025)
            modulation = modulation + weather
            if name == "architecture":
                chips = rng.random((SIZE, SIZE))
                modulation = modulation - (chips < .025) * .16 + (chips > .993) * .12
            values *= (modulation * edge)[:, :, None]
        elif name == "distance":
            values *= (.5 + light * .35)[:, :, None]
        elif name == "water":
            values *= (.6 + light * .65)[:, :, None]
        masks.append(alpha)
        images.append(Image.fromarray(np.clip(values, 0, 255).astype("uint8")))
    atlas = Image.new("RGB", (SIZE, SIZE * len(images)))
    for i, image in enumerate(images):
        atlas.paste(image, (0, i * SIZE))
    reduced = atlas.quantize(colors=192, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    palette = reduced.getpalette()[:192 * 3] + [v for color in scene.palette for v in color]
    swatches = Image.new("P", (1, 1))
    swatches.putpalette(palette)
    indexed = atlas.quantize(palette=swatches, dither=Image.Dither.NONE)
    scene.palette = [tuple(palette[i:i + 3]) for i in range(0, len(palette), 3)]
    atlas = indexed.convert("RGB")
    for i, name in enumerate(scene.layers):
        layer = atlas.crop((0, i * SIZE, SIZE, (i + 1) * SIZE)).convert("RGBA")
        layer.putalpha(Image.fromarray(masks[i]))
        scene.layers[name] = layer


def render_pixel_scene(song, index):
    scene = Scene(song, index)
    SCENES[song["title"]](scene)
    finish_materials(scene)
    return scene
