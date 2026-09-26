"""Original, typography-free cover illustrations; Pillow and NumPy only.

The piano is an authored, lit three-dimensional mesh with a reflected floor
pass. The vinyl is an analytic shaded surface with individually drawn grooves
and a continuously curved light sculpture. Neither scene reads source images.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def _unit(vector):
    vector = np.asarray(vector, dtype=np.float32)
    return vector / np.linalg.norm(vector, axis=-1, keepdims=True).clip(1e-8)


def _rgb_image(array):
    np.clip(array, 0, 255, out=array)
    return Image.fromarray(array.astype(np.uint8), "RGB")


def _screen(base, light, strength=1.0):
    light = np.asarray(light.convert("RGB"))
    base = np.asarray(base.convert("RGB"))
    result = np.empty_like(base)
    for start in range(0, len(base), 128):
        region = slice(start, start + 128)
        pixels = base[region].astype(np.float32)
        pixels += (255 - pixels) * (light[region].astype(np.float32) / 255) * strength
        result[region] = np.clip(pixels, 0, 255).astype(np.uint8)
    return Image.fromarray(result, "RGB")


def _glow(base, lines, radii):
    for radius, strength in radii:
        base = _screen(base, lines.filter(ImageFilter.GaussianBlur(radius)), strength)
    return _screen(base, lines)


def _bezier(a, b, c, d, count=24):
    t = np.linspace(0, 1, count, endpoint=False)[:, None]
    return ((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b
            + 3 * (1 - t) * t * t * c + t ** 3 * d)


def _cross2(a, b):
    return a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]


def _outline():
    points = [np.array([[-1.0, 0.0], [1.0, 0.0], [1.0, 0.35]])]
    for controls in (
        ((1, .35), (1, .66), (.53, .68), (.53, 1.03)),
        ((.53, 1.03), (.52, 1.30), (.81, 1.40), (.77, 1.80)),
        ((.77, 1.80), (.74, 2.30), (.21, 2.57), (-.34, 2.58)),
        ((-.34, 2.58), (-.78, 2.58), (-1, 2.40), (-1, 2.04)),
    ):
        points.append(_bezier(*(np.array(p) for p in controls), count=18))
    return np.concatenate(points)


def _triangulate(points):
    """Ear clipping preserves the grand piano's concave waist."""
    vertices = list(range(len(points)))
    area = sum(_cross2(points[i], points[(i + 1) % len(points)])
               for i in range(len(points)))
    if area < 0:
        vertices.reverse()
    triangles = []
    while len(vertices) > 3:
        found = False
        for cursor, b in enumerate(vertices):
            a, c = vertices[cursor - 1], vertices[(cursor + 1) % len(vertices)]
            pa, pb, pc = points[[a, b, c]]
            cross = _cross2(pb - pa, pc - pa)
            if cross < 1e-9:
                continue
            other = [k for k in vertices if k not in (a, b, c)]
            q = points[other]
            inside = ((_cross2(pb - pa, q - pa) > 1e-8)
                      & (_cross2(pc - pb, q - pb) > 1e-8)
                      & (_cross2(pa - pc, q - pc) > 1e-8))
            if inside.any():
                continue
            triangles.append((a, b, c))
            vertices.remove(b)
            found = True
            break
        if not found:
            raise ValueError("The authored piano outline cannot be triangulated.")
    triangles.append(tuple(vertices))
    return triangles


class _Piano:
    RIGHT = np.array((.873, .488, 0), dtype=np.float32)
    DOWN = np.array((.301, -.539, -.786), dtype=np.float32)
    VIEW = _unit((.384, -.686, .617))
    KEY_LIGHT = _unit((-.55, -.30, 1))
    RIM_LIGHT = _unit((.65, .75, .8))

    def __init__(self, size):
        self.size = size
        self.faces = []
        self.center = np.array((.415, .676))
        self.scale = .151

    def project(self, vertices):
        vertices = np.asarray(vertices)
        return (np.stack((vertices @ self.RIGHT, vertices @ self.DOWN), axis=-1)
                * self.scale + self.center) * self.size

    def face(self, vertices, color, gloss=.3, normals=None):
        vertices = np.asarray(vertices, dtype=np.float32)
        if normals is None:
            normal = _unit(np.cross(vertices[1] - vertices[0],
                                    vertices[2] - vertices[0]))
            normals = np.broadcast_to(normal, vertices.shape).copy()
        for i in range(1, len(vertices) - 1):
            index = [0, i, i + 1]
            self.faces.append((vertices[index], np.asarray(normals)[index],
                               np.asarray(color, dtype=np.float32), gloss))

    def box(self, lower, upper, color, gloss=.3):
        x, y, z = lower
        X, Y, Z = upper
        for face in (
            ((x, y, Z), (X, y, Z), (X, Y, Z), (x, Y, Z)),
            ((x, y, z), (x, Y, z), (X, Y, z), (X, y, z)),
            ((x, y, z), (X, y, z), (X, y, Z), (x, y, Z)),
            ((X, y, z), (X, Y, z), (X, Y, Z), (X, y, Z)),
            ((X, Y, z), (x, Y, z), (x, Y, Z), (X, Y, Z)),
            ((x, Y, z), (x, y, z), (x, y, Z), (x, Y, Z)),
        ):
            self.face(face, color, gloss)

    def tube(self, start, end, radius, color, gloss=.5, end_radius=None, sides=10):
        start, end = np.array(start), np.array(end)
        axis = _unit(end - start)
        reference = np.array((0, 0, 1) if abs(axis[2]) < .9 else (0, 1, 0))
        u = _unit(np.cross(axis, reference))
        v = np.cross(axis, u)
        end_radius = radius if end_radius is None else end_radius
        angles = np.arange(sides) * (2 * np.pi / sides)
        normals = np.cos(angles)[:, None] * u + np.sin(angles)[:, None] * v
        first = start + normals * radius
        second = end + normals * end_radius
        for i in range(sides):
            j = (i + 1) % sides
            self.face([first[i], first[j], second[j], second[i]], color, gloss,
                      [normals[i], normals[j], normals[j], normals[i]])

    def shell(self, outline, bottom, top, color, gloss=.5, transform=None):
        midpoint = outline.mean(axis=0)
        rings = []
        for height, inset in ((bottom, .012), (bottom + .017, 0),
                              (top - .017, 0), (top, .014)):
            ring = np.column_stack((outline * (1 - inset) + midpoint * inset,
                                    np.full(len(outline), height)))
            rings.append(ring if transform is None else transform(ring))
        for lower, upper in zip(rings[:-1], rings[1:]):
            for i in range(len(outline)):
                j = (i + 1) % len(outline)
                self.face([lower[i], lower[j], upper[j], upper[i]], color, gloss)
        for a, b, c in _triangulate(outline):
            self.face(rings[-1][[a, b, c]], color, gloss)
            self.face(rings[0][[c, b, a]], color, gloss)

    def build(self):
        ebony = (11, 32, 37)
        rim = (24, 55, 56)
        brass = (127, 110, 68)
        contour = _outline()
        self.shell(contour, 1.03, 1.29, ebony, .85)
        inner = contour * (.93, .94) + (.005, .05)
        self.shell(inner, 1.286, 1.300, (102, 98, 65), .22)
        for x, length in zip(np.linspace(-.85, .48, 31),
                             np.linspace(2.10, .92, 31)):
            self.tube((x, .20, 1.315), (x * .8 - .06, length, 1.315),
                      .0024, (156, 151, 104), .7, sides=4)
        for a, b in (((-.78, .19), (-.72, 2.25)),
                     ((-.19, .18), (-.32, 2.37)),
                     ((.52, .20), (.36, 1.53))):
            self.tube((*a, 1.34), (*b, 1.34), .026, brass, .55, sides=8)
        self.tube((-.89, 1.96, 1.33), (.34, 1.77, 1.33),
                  .027, (101, 93, 55), .4)
        self.box((-.91, -.09, 1.292), (.90, .09, 1.37), ebony, .7)
        self.box((-.965, -.37, 1.035), (.965, .015, 1.13), ebony, .8)
        self.box((-.968, -.39, 1.025), (.968, -.355, 1.07), rim, .8)
        self.box((-.987, -.385, 1.075), (-.881, .16, 1.235), ebony, .85)
        self.box((.881, -.385, 1.075), (.987, .16, 1.235), ebony, .85)
        self.box((-.883, -.041, 1.134), (.883, -.020, 1.154), (84, 44, 36), .15)
        count = 52
        width = 1.76 / count
        # The seven-note pattern starts on A, matching an 88-key piano.
        black_after = {0, 2, 3, 5, 6}
        for i in range(count):
            x = -.88 + i * width
            warm = 1 - .055 * (i / count)
            self.box((x + .0018, -.351, 1.129),
                     (x + width - .0018, -.036, 1.153),
                     tuple(warm * c for c in (218, 220, 186)), .31)
            if i % 7 in black_after and i < count - 1:
                self.box((x + width * .70, -.207, 1.154),
                         (x + width * 1.29, -.035, 1.196),
                         (9, 20, 23), .8)
        for x, y in ((-.84, .10), (.84, .12), (-.53, 2.23)):
            self.tube((x, y, .065), (x, y, 1.065), .039, ebony, .85,
                      end_radius=.074, sides=12)
            self.tube((x, y, .064), (x, y, .12), .043, brass, .65)
            self.tube((x - .045, y, .038), (x + .045, y, .038),
                      .037, (71, 76, 59), .55, sides=12)
        for x in (-.23, .23):
            self.tube((x, .035, .33), (x * 1.1, .05, 1.045),
                      .022, ebony, .6)
        self.box((-.27, -.02, .27), (.27, .08, .34), ebony, .65)
        for x in (-.16, 0, .16):
            self.box((x - .036, -.22, .235), (x + .036, .06, .265), brass, .7)

        angle = .46

        def open_lid(vertices):
            out = vertices.copy()
            offset = vertices[:, 0] + 1
            out[:, 0] = -1 + offset * math.cos(angle)
            out[:, 2] += offset * math.sin(angle)
            return out

        lid = contour.copy()
        lid[:, 1] += .045
        self.shell(lid, 1.37, 1.416, (18, 47, 50), .93, open_lid)
        # A fine brass hinge and a physically connected prop keep the lid readable.
        self.tube((-1, .14, 1.39), (-1, 2.05, 1.39), .012, brass, .7)
        upper = open_lid(np.array([[.40, .76, 1.37]], dtype=np.float32))[0]
        self.tube((.60, .76, 1.31), upper, .017, (116, 116, 79), .65)
        return self

    def render(self, mirrored=False):
        n = self.size
        pixels = np.zeros((n, n, 4), dtype=np.uint8)
        depths = np.full((n, n), -np.inf, dtype=np.float32)
        half_key = _unit(self.KEY_LIGHT + self.VIEW)
        half_rim = _unit(self.RIM_LIGHT + self.VIEW)
        for source, normals, color, gloss in self.faces:
            vertices = source.copy()
            if mirrored:
                vertices[:, 2] *= -1
            xy = self.project(vertices)
            z = vertices @ self.VIEW
            xmin, ymin = np.floor(xy.min(axis=0)).astype(int)
            xmax, ymax = np.ceil(xy.max(axis=0)).astype(int)
            xmin, ymin = max(0, xmin), max(0, ymin)
            xmax, ymax = min(n - 1, xmax), min(n - 1, ymax)
            if xmin > xmax or ymin > ymax:
                continue
            a, b, c = xy
            denominator = ((b[1] - c[1]) * (a[0] - c[0])
                           + (c[0] - b[0]) * (a[1] - c[1]))
            if abs(denominator) < 1e-6:
                continue
            yy, xx = np.mgrid[ymin:ymax + 1, xmin:xmax + 1].astype(np.float32)
            xx += .5
            yy += .5
            w0 = ((b[1] - c[1]) * (xx - c[0])
                  + (c[0] - b[0]) * (yy - c[1])) / denominator
            w1 = ((c[1] - a[1]) * (xx - c[0])
                  + (a[0] - c[0]) * (yy - c[1])) / denominator
            w2 = 1 - w0 - w1
            depth = w0 * z[0] + w1 * z[1] + w2 * z[2]
            target_depth = depths[ymin:ymax + 1, xmin:xmax + 1]
            keep = (w0 >= -1e-5) & (w1 >= -1e-5) & (w2 >= -1e-5) & (depth > target_depth)
            if not keep.any():
                continue
            weights = np.stack((w0[keep], w1[keep], w2[keep]), axis=1)
            normal = _unit(weights @ normals)
            view_dot = normal @ self.VIEW
            normal[view_dot < 0] *= -1
            diffuse = np.maximum(normal @ self.KEY_LIGHT, 0)
            backlight = np.maximum(normal @ self.RIM_LIGHT, 0)
            fresnel = (1 - np.abs(normal @ self.VIEW)) ** 3
            spec = np.maximum(normal @ half_key, 0) ** (16 + 105 * gloss)
            edge_spec = np.maximum(normal @ half_rim, 0) ** 42
            world = weights @ source
            reflected_beam = np.exp(-((world[:, 0] + .43 * world[:, 1] - .20) / .30) ** 2)
            result = color * (.35 + .72 * diffuse[:, None] + .21 * backlight[:, None])
            result += np.array((56, 115, 110)) * (
                .11 * fresnel[:, None] + .22 * reflected_beam[:, None] * gloss)
            result += np.array((189, 211, 179)) * spec[:, None] * gloss * .86
            result += np.array((58, 173, 169)) * edge_spec[:, None] * gloss * .9
            # Refracted light gently modulates the polished surfaces.
            caustic = np.maximum(0, np.cos(world[:, 0] * 8 + world[:, 1] * 5
                                         + .8 * np.sin(world[:, 1] * 7))) ** 20
            result += caustic[:, None] * np.array((5, 11, 9))
            target = pixels[ymin:ymax + 1, xmin:xmax + 1]
            target[keep, :3] = np.clip(result, 0, 255).astype(np.uint8)
            target[keep, 3] = 255
            target_depth[keep] = depth[keep]
        return Image.fromarray(pixels, "RGBA")


def _underwater_tile(n, start, end):
    y, x = np.mgrid[start:end, :n].astype(np.float32) / n
    field = np.empty((end - start, n, 3), dtype=np.float32)
    field[:] = (4, 16, 24)
    glow = np.exp(-(((x - .48) / .31) ** 2 + ((y - .32) / .40) ** 2))
    field += glow[..., None] * (10, 50, 53)
    for origin, slope, width, strength in (
        (.18, .25, .044, .55), (.29, .19, .066, .65),
        (.40, .10, .025, .46), (.53, -.045, .057, .35),
        (.77, -.20, .024, .24),
    ):
        beam = np.exp(-((x - origin - slope * y) / (width + y * .03)) ** 2)
        beam *= np.exp(-y * 2.4) * strength
        beam *= .80 + .20 * np.sin(y * 9 + x * 15)
        field += beam[..., None] * (25, 77, 75)
    floor = np.exp(-(((x - .51) / .33) ** 2 + ((y - .682) / .074) ** 2))
    field += floor[..., None] * (12, 40, 40)
    # Analytic caustic networks lie on the distant sand rather than in the water.
    u = (x - .5) / (.13 + (y - .52).clip(.015))
    v = 1 / (y - .40).clip(.06)
    weave = np.abs(np.sin(8 * u + 1.1 * np.sin(v * .66))
                   + .65 * np.sin(2.8 * v + u * 4))
    caustics = np.exp(-weave * 22) * floor
    field += caustics[..., None] * (8, 22, 20)
    surface = np.exp(-((y - .13 - .005 * np.sin(11 * x)) / .035) ** 2)
    field += surface[..., None] * (1, 4, 5)
    return np.clip(field, 0, 255).astype(np.uint8)


def _underwater_background(n):
    result = np.empty((n, n, 3), dtype=np.uint8)
    for start in range(0, n, 192):
        end = min(start + 192, n)
        result[start:end] = _underwater_tile(n, start, end)
    return Image.fromarray(result, "RGB")


def _serenity(n, rng):
    image = _underwater_background(n).convert("RGBA")
    piano = _Piano(n).build()
    reflection = piano.render(mirrored=True)
    alpha = np.asarray(reflection.getchannel("A"), dtype=np.float32)
    yy = np.arange(n, dtype=np.float32)[:, None] / n
    alpha *= .28 * np.exp(-np.maximum(yy - .65, 0) * 17)
    reflection.putalpha(Image.fromarray(alpha.astype(np.uint8), "L"))
    image.alpha_composite(reflection.filter(ImageFilter.GaussianBlur(n * .0024)))
    shadows = Image.new("RGBA", (n, n))
    draw = ImageDraw.Draw(shadows)
    for x, y, radius in ((-.84, .10, .13), (.84, .12, .14), (-.53, 2.23, .13)):
        point = piano.project([[x, y, 0]])[0]
        draw.ellipse((point[0] - n * radius * .4, point[1] - n * .008,
                      point[0] + n * radius * .4, point[1] + n * .008),
                     fill=(0, 7, 11, 175))
    image.alpha_composite(shadows.filter(ImageFilter.GaussianBlur(n * .006)))
    broad_shadow = Image.new("RGBA", (n, n))
    ImageDraw.Draw(broad_shadow).ellipse(
        (n * .24, n * .61, n * .74, n * .715), fill=(0, 7, 10, 105))
    image.alpha_composite(broad_shadow.filter(ImageFilter.GaussianBlur(n * .022)))
    del reflection, alpha, shadows, broad_shadow
    image.alpha_composite(piano.render())

    particles = Image.new("RGBA", (n, n))
    draw = ImageDraw.Draw(particles)
    for i in range(62):
        x, y = rng.uniform(.18, .84), rng.uniform(.15, .70)
        if .26 < x < .67 and .31 < y < .61:
            continue
        radius = rng.uniform(.00035, .0011) * n
        alpha = int(rng.uniform(14, 49))
        draw.ellipse((x * n - radius, y * n - radius, x * n + radius, y * n + radius),
                     fill=(145, 192, 172, alpha))
    for x, y, radius in (
        (.656, .392, .0036), (.667, .355, .0026), (.661, .318, .0018),
        (.338, .427, .0020), (.331, .393, .0014), (.683, .277, .0022),
    ):
        bounds = ((x - radius) * n, (y - radius) * n,
                  (x + radius) * n, (y + radius) * n)
        draw.arc(bounds, 165, 323, fill=(117, 192, 178, 126),
                 width=max(1, round(n * .00065)))
        draw.arc(bounds, 345, 95, fill=(44, 103, 104, 80),
                 width=max(1, round(n * .0005)))
        draw.ellipse(((x - radius * .6) * n, (y - radius * .75) * n,
                      (x - radius * .2) * n, (y - radius * .4) * n),
                     fill=(208, 223, 192, 147))
    image = image.convert("RGBA")
    image.alpha_composite(particles)
    return image.convert("RGB")


def _colored_curve(canvas, points, colors, width):
    pixels = np.asarray(canvas).copy()
    radius = max(.35, width / 2)
    height, length = pixels.shape[:2]
    for i in range(len(points) - 1):
        a, b = points[i:i + 2]
        lo = np.floor(np.minimum(a, b) - radius - 1).astype(int)
        hi = np.ceil(np.maximum(a, b) + radius + 1).astype(int)
        x0, y0 = max(0, lo[0]), max(0, lo[1])
        x1, y1 = min(length, hi[0]), min(height, hi[1])
        if x0 >= x1 or y0 >= y1:
            continue
        y, x = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        x, y = x + .5 - a[0], y + .5 - a[1]
        delta = b - a
        fraction = np.clip((x * delta[0] + y * delta[1]) /
                           max(float(delta @ delta), 1e-8), 0, 1)
        distance = np.sqrt((x - delta[0] * fraction) ** 2
                           + (y - delta[1] * fraction) ** 2)
        coverage = np.clip(radius + .5 - distance, 0, 1)
        source = np.clip(coverage[..., None] * colors[i], 0, 255).astype(np.uint8)
        region = pixels[y0:y1, x0:x1]
        np.maximum(region, source, out=region)
    canvas.paste(Image.fromarray(pixels, "RGB"))


def _pulse(n, reflected=False):
    t = np.linspace(0, 1, 1600, dtype=np.float32)
    envelope = np.maximum(np.sin(np.pi * t), 0) ** 1.3
    x = .155 + .69 * t
    y = .471 - .115 * np.sin(t * np.pi * 5.4 - .45) * envelope
    y -= .035 * np.sin(t * np.pi)
    if reflected:
        y = .677 + (.65 - y) * .24
    colors = np.empty((len(t), 3))
    for c, values in enumerate(((66, 182, 255), (220, 142, 118), (227, 226, 139))):
        colors[:, c] = np.interp(t, (0, .52, 1), values)
    taper = np.minimum(np.clip(t / .06, 0, 1), np.clip((1 - t) / .06, 0, 1))
    colors *= (.20 + .80 * taper ** .5)[:, None]
    return t, np.column_stack((x, y)) * n, colors


def _vinyl_tile(n, start, end):
    y, x = np.mgrid[start:end, :n].astype(np.float32) / n
    field = np.empty((end - start, n, 3), dtype=np.float32)
    field[:] = (10, 8, 24)
    purple = np.exp(-(((x - .53) / .35) ** 2 + ((y - .40) / .34) ** 2))
    field += purple[..., None] * (32, 16, 46)
    coral = np.exp(-(((x - .73) / .23) ** 2 + ((y - .53) / .22) ** 2))
    field += coral[..., None] * (35, 8, 13)
    cyan = np.exp(-(((x - .28) / .17) ** 2 + ((y - .45) / .22) ** 2))
    field += cyan[..., None] * (0, 18, 25)
    floor = np.exp(-(((x - .5) / .34) ** 2 + ((y - .684) / .054) ** 2))
    field += floor[..., None] * (27, 9, 31)
    image = _rgb_image(field)
    del field, purple, coral, cyan, floor

    # The slight shear and squash make the record a physical inclined disc.
    cx, cy, radius = .510, .437, .217
    squash, shear = .94, -.145
    v = (y - cy) / squash
    u = (x - cx) - shear * v
    r = np.sqrt((u / .90) ** 2 + v ** 2) / radius
    angle = np.arctan2(v, u / .90)
    halo = np.exp(-((r - 1.005) / .060) ** 2)
    bloom = np.zeros((end - start, n, 3), dtype=np.float32)
    mix = (.5 + .5 * np.sin(angle - .5))[..., None]
    edge_color = (np.array((53, 214, 226), dtype=np.float32) * (1 - mix)
                  + np.array((255, 109, 139), dtype=np.float32) * mix)
    bloom += halo[..., None] * edge_color * .44
    glow = _rgb_image(bloom)
    del bloom, halo, x, y, u, v

    disc = np.empty((end - start, n, 3), dtype=np.float32)
    disc[:] = (8, 11, 22)
    broad_sheen = np.maximum(0, np.cos(angle + 2.0)) ** 10
    second_sheen = np.maximum(0, np.cos(angle - .90)) ** 14
    grooves = .5 + .5 * np.sin(r * 2 * np.pi * 176 + .24 * np.sin(angle * 2))
    disc += (3 + grooves[..., None] * 9) * np.array((.75, .74, 1), dtype=np.float32)
    disc += broad_sheen[..., None] * np.array((25, 91, 92), dtype=np.float32) * (.2 + .8 * grooves[..., None])
    disc += second_sheen[..., None] * np.array((93, 34, 58), dtype=np.float32) * (.25 + .75 * grooves[..., None])
    for track in (.324, .431, .547, .679, .803, .914):
        gap = np.exp(-((r - track) / .0032) ** 2)
        disc *= 1 - .24 * gap[..., None]
        disc += np.exp(-((r - track - .007) / .0018) ** 2)[..., None] * np.array((7, 10, 14), dtype=np.float32)
    del gap
    spectral = (.5 + .5 * np.sin(18 * r + 2 * angle))[..., None]
    disc += broad_sheen[..., None] * spectral * np.array((19, 7, 27), dtype=np.float32)
    rim = np.exp(-((r - .989) / .008) ** 2)
    disc += edge_color * rim[..., None] * 1.05
    inner_rim = np.exp(-((r - .971) / .0028) ** 2)
    disc += inner_rim[..., None] * np.array((41, 79, 84), dtype=np.float32)
    label = r < .255
    label_color = np.empty((np.count_nonzero(label), 3), dtype=np.float32)
    label_color[:] = (34, 25, 42)
    label_color += np.maximum(0, -np.sin(angle[label]))[..., None] * np.array((58, 29, 31), dtype=np.float32)
    label_color += np.exp(-((r[label] - .241) / .007) ** 2)[..., None] * np.array((59, 43, 51), dtype=np.float32)
    label_color += np.exp(-((r[label] - .146) / .0025) ** 2)[..., None] * np.array((26, 21, 28), dtype=np.float32)
    disc[label] = label_color
    del label_color, label
    disc[r < .028] = (4, 8, 16)
    spindle_rim = np.exp(-((r - .033) / .008) ** 2)
    disc += spindle_rim[..., None] * np.array((81, 107, 104), dtype=np.float32)
    disc_image = _rgb_image(disc).convert("RGBA")
    disc_image.putalpha(Image.fromarray(
        np.clip((1.003 - r) * n * radius * 255, 0, 255).astype(np.uint8), "L"))
    return image, glow, disc_image


def _euphoria(n, rng):
    image = Image.new("RGB", (n, n))
    glow = Image.new("RGB", (n, n))
    disc_image = Image.new("RGBA", (n, n))
    for start in range(0, n, 192):
        background_tile, glow_tile, disc_tile = _vinyl_tile(n, start, min(start + 192, n))
        image.paste(background_tile, (0, start))
        glow.paste(glow_tile, (0, start))
        disc_image.paste(disc_tile, (0, start))
    image = _screen(image, glow.filter(ImageFilter.GaussianBlur(n * .009)))
    del glow, background_tile, glow_tile, disc_tile
    # A dark material thickness is visible underneath the bright machined edge.
    thickness = Image.new("RGBA", (n, n))
    edge = disc_image.copy()
    edge.putalpha(edge.getchannel("A").point(lambda value: int(value * .85)))
    thickness.alpha_composite(edge, (round(n * .003), round(n * .005)))
    image = image.convert("RGBA")
    image.alpha_composite(thickness)
    image.alpha_composite(disc_image)
    del disc_image, thickness, edge

    reflection = Image.new("RGB", (n, n))
    t, reflected_points, colors = _pulse(n, reflected=True)
    colors *= np.exp(-np.maximum(reflected_points[:, 1] / n - .68, 0)[:, None] * 16) * .35
    _colored_curve(reflection, reflected_points, colors, n * .0038)
    a = np.linspace(0, 2 * np.pi, 750)
    reflected_ring = np.column_stack((.510 + .187 * np.cos(a),
                                      .679 + .021 * np.sin(a))) * n
    ring_colors = np.empty((len(a), 3))
    for c, pair in enumerate(((18, 65), (58, 20), (70, 51))):
        ring_colors[:, c] = pair[0] + (pair[1] - pair[0]) * (.5 + .5 * np.cos(a))
    _colored_curve(reflection, reflected_ring, ring_colors, n * .002)
    image = _screen(image, reflection.filter(ImageFilter.GaussianBlur(n * .008)))
    floor_lines = Image.new("RGB", (n, n))
    draw = ImageDraw.Draw(floor_lines)
    for i in range(30):
        yy = rng.uniform(.665, .757)
        half = rng.uniform(.003, .060)
        xx = rng.normal(.51, .115)
        strength = max(0, 1 - (yy - .665) / .095)
        color = tuple(int(v * strength) for v in (31, 15, 42))
        draw.line((n * (xx - half), yy * n, n * (xx + half), yy * n),
                  fill=color, width=max(1, round(n * rng.uniform(.0005, .0015))))
    image = _screen(image, floor_lines.filter(ImageFilter.GaussianBlur(n * .0012)))
    del reflection, floor_lines

    t, points, colors = _pulse(n)
    outer = Image.new("RGB", (n, n))
    core = Image.new("RGB", (n, n))
    # Close parallel trajectories give the light a silk-ribbon material.
    for phase, opacity, offset in ((-.10, .32, -.009), (.075, .26, .008)):
        thread = points.copy()
        thread[:, 1] += n * (offset * np.sin(np.pi * t) +
                             .004 * np.sin(t * np.pi * 5.4 + phase))
        _colored_curve(outer, thread, colors * opacity, n * .0008)
    _colored_curve(outer, points, colors * .90, n * .0045)
    core_colors = colors * .58 + 106
    core_colors *= np.clip(np.sin(np.pi * t) * 9, 0, 1)[:, None] ** .3
    _colored_curve(core, points, core_colors, n * .00155)
    image = _glow(image, outer, ((n * .024, .32), (n * .008, .57), (n * .0028, .65)))
    image = _screen(image, core)
    del outer, core

    # Restrained elliptical echoes continue the musical movement into space.
    orbit = Image.new("RGB", (n, n))
    a = np.linspace(.08, 1.03 * np.pi, 500)
    orbit_points = np.column_stack((
        .504 + .277 * np.cos(a),
        .445 + .071 * np.sin(a) - .051 * np.cos(a),
    )) * n
    orbit_colors = np.tile((87., 59., 124.), (len(a), 1))
    orbit_colors *= np.sin(np.linspace(0, np.pi, len(a)))[:, None] ** .65
    _colored_curve(orbit, orbit_points, orbit_colors, n * .00065)
    image = _glow(image, orbit, ((n * .0035, .4),))
    dust = Image.new("RGBA", (n, n))
    draw = ImageDraw.Draw(dust)
    for i in range(24):
        px, py = rng.uniform(.21, .82), rng.uniform(.21, .66)
        rr = rng.uniform(.00035, .0011) * n
        draw.ellipse((px * n - rr, py * n - rr, px * n + rr, py * n + rr),
                     fill=(181, 139, 189, int(rng.uniform(20, 62))))
    image = image.convert("RGBA")
    image.alpha_composite(dust)
    return image.convert("RGB")


def _finish(image, size, rng, title):
    n = image.width
    if n != size:
        image = image.resize((size, size), Image.Resampling.LANCZOS)
    source = np.asarray(image)
    result = np.empty_like(source)
    target = np.array((5, 10, 18) if title == "serenity" else (9, 7, 20),
                      dtype=np.float32)
    for start in range(0, size, 192):
        end = min(start + 192, size)
        array = source[start:end].astype(np.float32)
        y, x = np.mgrid[start:end, :size].astype(np.float32) / size
        edge = np.clip(((x - .5) / .66) ** 2 + ((y - .43) / .79) ** 2, 0, 1)
        array *= (1 - .45 * edge ** 1.5)[..., None]
        bottom = np.clip((y - .735) / .135, 0, 1)
        bottom = bottom * bottom * (3 - 2 * bottom)
        array *= 1 - bottom[..., None] * .85
        array += target * bottom[..., None] * .85
        array += rng.normal(0, .46, (end - start, size, 1)).astype(np.float32)
        result[start:end] = np.clip(array, 0, 255).astype(np.uint8)
    return Image.fromarray(result, "RGB")


def render_scene(title: str, size: int = 2048) -> Image.Image:
    """Render ``serenity`` or ``euphoria`` as deterministic square RGB artwork.

    No lettering is drawn. The bottom fifth is intentionally quiet for cover
    typography. Working-resolution supersampling is bounded to limit CPU memory.
    """
    if title not in ("serenity", "euphoria"):
        raise ValueError(f"Unsupported scene {title!r}; expected 'serenity' or 'euphoria'.")
    if isinstance(size, bool) or not isinstance(size, int) or not 64 <= size <= 4096:
        raise ValueError("size must be an integer between 64 and 4096.")
    working_size = min(4096, max(size, math.ceil(size * (1.5 if size <= 1024 else 1.25))))
    rng = np.random.default_rng(13257 if title == "serenity" else 80419)
    renderer = _serenity if title == "serenity" else _euphoria
    return _finish(renderer(working_size, rng), size, rng, title)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--size", type=int, default=2048)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for title in ("serenity", "euphoria"):
        image = render_scene(title, args.size)
        image.save(args.output / f"{title}.png")
        image.resize((768, 768), Image.Resampling.LANCZOS).save(
            args.output / f"{title}-preview.png")
        print(f"{title}: {image.size}, {image.mode} -> {args.output / f'{title}.png'}")


if __name__ == "__main__":
    main()
