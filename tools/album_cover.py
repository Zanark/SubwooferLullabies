"""Draw the original album scene, or export its saved, editable artwork."""

import argparse
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True

from PIL import Image

from cover_pipeline import (
    compose,
    digest,
    png_bytes,
    read_json,
    save_json,
    typography_design,
)
from pixel_cover_scenes import Scene

ROOT = Path(__file__).resolve().parent.parent
TITLE = "YeetThatGlowStick"
ART = ROOT / "artwork" / "albums" / TITLE
SOURCE = f"{TITLE}.spritecanvas.json"
TRACKS = [
    "anticipation", "dismay", "vulnerability", "delight", "curiosity",
    "determination", "loss", "courage", "resilience", "hope", "relief",
    "perseverance",
]
DESCRIPTION = (
    "Original environment-only pixel artwork for the twelve-track YeetThatGlowStick "
    "game soundtrack: an abandoned cistern, worn rising stairs, broken rails, "
    "distant daylight and a cyan glowstick floating above its ripples. "
    "No characters, faces, bodies, character silhouettes or decorative droplet symbols. "
    "Seven editable native 256px layers; separately composed Cascadia Mono type."
)
COLORS = [
    "040c12", "07151c", "0a1e26", "102b34", "163c45", "215059",
    "31646a", "4e7e80", "76a39a", "9ac2ae", "bed6bc", "e8ecd0",
    "11292e", "193337", "244448", "315255", "406264", "577879",
    "76908a", "9ca999", "181f22", "2b2a29", "41372f", "5b493b",
    "78604a", "967c56", "b79d6b", "d7c795", "092934", "103e48",
    "145662", "207985", "309d9f", "53c7bd", "87e9cf", "cdffe2",
    "101b25", "172a35", "223b47", "344e58", "51656a", "71817b",
    "a9b99e", "d1d9b6", "f6f0ce", "fcf9e1", "295651", "43736a",
]
LAYER_LABELS = {
    "distance": "01 - chamber depth",
    "architecture": "02 - cistern masonry",
    "subject": "03 - rising stairway",
    "materials": "04 - pipes and worn rails",
    "water": "05 - water and reflections",
    "light": "06 - daylight and glowstick",
    "foreground": "07 - broken foreground ledges",
}


def arc(scene, box, start, end, color, width=1):
    scene.draw.arc(box, start, end, fill=scene.c(color), width=width)


def draw_scene():
    """A new composition; no individual song scene or image is used."""
    scene = Scene({"title": "yeetthatglowstick", "palette": [
        "07151c", "215059", "87e9cf", "d7c795",
    ]}, 12)
    scene.palette = [tuple(bytes.fromhex(color)) for color in COLORS]
    scene.layers["distance"] = Image.new("RGBA", (256, 256), (*scene.c(1), 255))
    scene.use("distance")
    scene.arch(150, 103, 87, 100, 209, 2)
    scene.arch(151, 99, 66, 89, 204, 3)
    scene.arch(153, 101, 49, 86, 202, 4)
    scene.polygon([(119, 44), (178, 38), (174, 183), (100, 196)], 5)
    scene.polygon([(131, 43), (166, 39), (151, 180), (113, 180)], 6)

    # Broad cylindrical wall panels converge toward a small, high opening.
    scene.use("architecture")
    scene.polygon([(0, 0), (133, 0), (112, 34), (89, 68), (70, 112),
                   (65, 183), (0, 211)], 12)
    scene.polygon([(181, 0), (256, 0), (256, 217), (210, 194),
                   (197, 113), (186, 61), (170, 37)], 13)
    scene.polygon([(0, 0), (75, 0), (49, 76), (29, 160), (0, 195)], 2)
    scene.polygon([(236, 0), (256, 0), (256, 211), (238, 188),
                   (227, 102)], 2)
    scene.polygon([(43, 0), (91, 0), (69, 59), (45, 119), (33, 181),
                   (15, 189), (21, 114)], 14)
    scene.polygon([(88, 0), (113, 0), (88, 57), (69, 117), (64, 179),
                   (46, 186), (48, 118)], 15)
    scene.polygon([(187, 0), (216, 0), (221, 65), (230, 120),
                   (245, 195), (225, 186), (211, 112), (200, 59)], 14)
    scene.polygon([(217, 0), (233, 0), (238, 81), (253, 186),
                   (244, 194), (230, 120)], 12)

    for points, color in [
        ([(89, 0), (67, 59), (44, 118), (32, 182)], 17),
        ([(111, 0), (89, 57), (71, 117), (65, 177)], 16),
        ([(187, 0), (200, 59), (213, 113), (226, 184)], 17),
        ([(215, 0), (221, 65), (232, 120), (246, 194)], 16),
    ]:
        scene.line(points, color)
    for y, left, middle, right in [
        (25, 77, 101, 192), (51, 67, 91, 199),
        (81, 54, 80, 205), (111, 45, 73, 212),
        (140, 39, 68, 218), (164, 35, 66, 224),
    ]:
        scene.line([(left, y), (middle, y - 9)], 3)
        scene.line([(left, y + 1), (middle, y - 8)], 16)
        scene.line([(right, y - 7), (right + 23, y + 5)], 3)
        scene.line([(right, y - 6), (right + 23, y + 6)], 15)

    # Selected recessed masonry, rather than a field of random texture.
    for x, y, w, h, color in [
        (4, 36, 29, 14, 13), (2, 56, 26, 13, 12),
        (1, 77, 20, 14, 13), (0, 100, 18, 15, 12),
        (41, 25, 27, 12, 15), (36, 43, 26, 14, 14),
        (29, 65, 26, 13, 13), (78, 16, 22, 12, 16),
        (213, 33, 21, 12, 15), (217, 52, 22, 14, 13),
        (221, 73, 24, 15, 14), (228, 99, 27, 17, 13),
        (235, 126, 20, 19, 12),
    ]:
        scene.rect((x, y, x + w, y + h), color)
        scene.line([(x + 1, y), (x + w - 2, y)], color + 1)
        scene.line([(x, y + h), (x + w, y + h)], 2)

    # Low disused outfall, visibly architectural and empty.
    scene.arch(65, 130, 29, 35, 186, 3)
    scene.arch(65, 130, 25, 31, 186, 16)
    scene.arch(65, 131, 20, 27, 188, 0)
    for i in range(11):
        theta = math.pi + i * math.pi / 10
        scene.line([
            (65 + math.cos(theta) * 26, 130 + math.sin(theta) * 32),
            (65 + math.cos(theta) * 21, 130 + math.sin(theta) * 27),
        ], 3)
    scene.line([(40, 131), (40, 183)], 17)
    scene.line([(86, 133), (86, 175)], 5)
    for y in [143, 155, 169, 182]:
        scene.line([(37, y), (44, y)], 3)
        scene.line([(85, y), (91, y)], 3)
    scene.polygon([(48, 170), (79, 163), (84, 176), (45, 185)], 1)
    scene.line([(48, 171), (62, 168)], 3)

    # The elliptic manhole rim and warm throat establish the exit, not a sun icon.
    scene.polygon([(126, 40), (179, 38), (185, 65), (121, 73)], 14)
    scene.ellipse((119, 28, 185, 58), 2)
    scene.ellipse((122, 28, 183, 54), 24)
    scene.ellipse((125, 29, 181, 52), 41)
    scene.ellipse((130, 31, 178, 49), 27)
    scene.ellipse((133, 32, 177, 46), 44)
    scene.ellipse((138, 34, 173, 43), 45)
    arc(scene, (123, 27, 183, 54), 3, 170, 19, 2)
    arc(scene, (130, 29, 178, 48), 6, 172, 43)
    for x, y in [(132, 30), (145, 28), (161, 28), (175, 32)]:
        scene.line([(x, y), (x + 2, y + 4)], 22)
    scene.polygon([(171, 19), (198, 13), (209, 18), (181, 24)], 20)
    scene.line([(173, 19), (198, 14), (207, 18)], 26)
    scene.line([(180, 20), (197, 17)], 23)
    for x in [177, 185, 193]:
        scene.line([(x, 17), (x + 7, 20)], 0)

    # Cantilevered treads grow with perspective; the irregular route is traversable.
    scene.use("subject")
    steps = [
        (158, 61, 15), (163, 66, 16), (168, 71, 17),
        (173, 77, 18), (179, 84, 20), (185, 92, 21),
        (191, 101, 23), (197, 111, 25), (203, 122, 27),
        (209, 134, 29), (216, 147, 31), (222, 161, 34),
        (229, 176, 37), (237, 193, 40),
    ]
    scene.polygon([(153, 63), (178, 76), (209, 121), (247, 192),
                   (244, 210), (219, 194), (185, 125), (161, 85)], 1)
    scene.polygon([(174, 79), (183, 80), (220, 135), (255, 189),
                   (255, 211), (228, 187), (201, 126)], 12)
    for i, (x, y, width) in enumerate(steps):
        left, right = round(x - width / 2), round(x + width / 2)
        depth = 3 + i // 4
        scene.polygon([(left, y), (right, y - 4), (right + 3, y),
                       (left + 2, y + depth)], 16 if i < 7 else 15)
        scene.polygon([(left + 2, y + depth), (right + 3, y),
                       (right + 3, y + depth), (left + 2, y + depth * 2)], 3)
        scene.line([(left, y), (right, y - 4)], 19 if i < 6 else 17)
        scene.line([(left + 2, y + depth), (right + 2, y)], 7 if i > 9 else 16)
        if i in [3, 7, 10, 12]:
            scene.line([(left + 6, y + 1), (left + 10, y)], 3)
            scene.line([(right - 7, y - 2), (right - 3, y - 3)], 18)
    scene.polygon([(216, 189), (256, 181), (256, 204), (220, 211)], 12)
    scene.line([(218, 191), (255, 184)], 17)
    scene.line([(220, 203), (255, 195)], 3)

    scene.use("materials")
    # Thin interrupted rails and empty mounting holes, not humanoid forms.
    rail_points = [(x - width / 2 + 1, y - 13 - i // 4)
                   for i, (x, y, width) in enumerate(steps)]
    for first, last in [(0, 4), (6, 9), (11, 13)]:
        scene.line(rail_points[first:last + 1], 20, 3)
        scene.line(rail_points[first:last + 1], 25)
    for i in [0, 2, 4, 6, 8, 11, 13]:
        x, y, width = steps[i]
        rx, ry = rail_points[i]
        scene.line([(rx, ry), (rx + 1, y + 2)], 21, 2)
        scene.line([(rx, ry), (rx, y + 1)], 24)
        scene.line([(rx - 1, y + 2), (rx + 3, y + 1)], 2)
    scene.line([rail_points[4], (169, 65), (173, 63)], 25)
    scene.line([rail_points[9], (203, 118), (204, 123)], 23, 2)
    scene.line([(219, 161), (224, 155)], 20, 2)

    # A thick foreground service pipe, with coherent corrosion and flange bolts.
    scene.line([(17, -2), (17, 136), (21, 157), (29, 164), (35, 164)], 0, 17)
    scene.line([(17, -2), (17, 136), (21, 157), (29, 164), (35, 164)], 22, 12)
    scene.line([(13, 0), (13, 136), (17, 156), (24, 163), (31, 165)], 24, 3)
    scene.line([(20, 0), (20, 136), (24, 153), (30, 159), (37, 159)], 12, 3)
    scene.line([(16, 8), (16, 43)], 25)
    scene.line([(16, 69), (16, 112)], 23)
    for y in [38, 99, 140]:
        scene.rect((8, y, 24, y + 6), 21)
        scene.line([(8, y), (24, y)], 24)
        scene.rect((10, y + 2, 11, y + 3), 40)
        scene.rect((21, y + 2, 22, y + 3), 40)
    scene.rect((33, 156, 38, 171), 20)
    scene.line([(34, 157), (34, 170)], 24)
    scene.ellipse((34, 159, 41, 168), 0)
    for points, color in [
        ([(56, 54), (52, 67), (52, 76), (48, 87)], 3),
        ([(79, 68), (77, 77), (75, 78), (74, 91)], 4),
        ([(43, 125), (42, 135), (39, 147)], 3),
        ([(222, 41), (222, 54), (226, 61)], 3),
        ([(233, 89), (234, 99), (237, 103)], 3),
        ([(67, 22), (65, 27), (64, 27)], 18),
        ([(55, 102), (62, 101)], 17),
        ([(48, 160), (44, 159)], 7),
    ]:
        scene.line(points, color)
    for points, color in [
        ([(44, 31), (45, 36), (43, 42), (43, 49)], 13),
        ([(47, 32), (47, 39), (45, 45)], 14),
        ([(58, 78), (56, 89), (56, 94)], 13),
        ([(61, 77), (60, 83)], 16),
        ([(81, 33), (79, 44), (77, 49)], 14),
        ([(86, 94), (83, 108), (83, 117)], 13),
        ([(88, 96), (86, 105)], 15),
        ([(216, 55), (218, 66), (218, 73)], 12),
        ([(211, 27), (212, 33), (214, 37)], 13),
        ([(237, 113), (240, 126), (240, 134)], 13),
    ]:
        scene.line(points, color, 2)
    for x, y, width, color in [
        (54, 45, 4, 16), (48, 69, 3, 15), (76, 89, 3, 17),
        (210, 54, 4, 16), (231, 126, 5, 14),
    ]:
        scene.line([(x, y), (x + width, y - 1)], color)
    scene.line([(25, 43), (26, 49), (25, 55)], 22)
    scene.line([(23, 105), (25, 111), (24, 116)], 22)
    scene.line([(102, 0), (101, 22), (107, 42), (104, 63)], 1, 2)
    scene.line([(102, 0), (102, 22), (108, 41)], 23)

    # Still water: deliberate bands and broken reflections, never random speckling.
    scene.use("water")
    scene.polygon([(0, 198), (53, 184), (112, 176), (188, 177),
                   (215, 193), (256, 201), (256, 256), (0, 256)], 2)
    scene.polygon([(53, 187), (113, 181), (181, 180), (207, 192),
                   (198, 205), (80, 215), (37, 208)], 3)
    scene.polygon([(86, 183), (144, 181), (155, 193), (128, 204),
                   (76, 205), (63, 194)], 28)
    scene.polygon([(116, 182), (172, 180), (183, 186), (147, 191)], 14)
    for y, pieces, color in [
        (184, [(135, 152), (157, 166)], 18),
        (187, [(122, 133), (140, 157), (163, 176)], 17),
        (190, [(124, 148), (156, 161)], 16),
        (194, [(143, 162), (170, 179)], 15),
        (199, [(148, 161), (167, 189)], 5),
        (205, [(127, 147), (162, 180)], 4),
        (212, [(130, 153), (174, 193)], 3),
        (191, [(36, 49), (185, 203)], 4),
        (197, [(29, 43), (193, 211)], 4),
        (207, [(39, 67), (204, 222)], 3),
        (220, [(56, 86), (148, 173)], 3),
        (230, [(47, 77), (107, 151), (182, 218)], 3),
    ]:
        for left, right in pieces:
            scene.line([(left, y), (right, y)], color)

    for box, start, end, color in [
        ((84, 179, 124, 190), 8, 156, 32),
        ((84, 179, 124, 190), 190, 329, 31),
        ((70, 178, 137, 198), 4, 164, 31),
        ((70, 178, 137, 198), 199, 249, 30),
        ((57, 176, 153, 207), 13, 137, 30),
        ((57, 176, 153, 207), 199, 231, 29),
        ((43, 173, 170, 217), 25, 130, 29),
    ]:
        arc(scene, box, start, end, color)
    for y, left, right, color in [
        (183, 94, 109, 31), (186, 98, 117, 33), (190, 88, 101, 32),
        (193, 96, 115, 31), (197, 93, 107, 30), (202, 103, 115, 30),
        (209, 94, 110, 29), (216, 108, 128, 28),
    ]:
        scene.line([(left, y), (right, y)], color)

    scene.use("light")
    # Low-alpha native-pixel beams keep the masonry editable underneath.
    scene.draw.polygon([(138, 45), (171, 44), (175, 169), (69, 191)],
                       fill=(*scene.c(43), 17))
    scene.draw.polygon([(144, 46), (153, 46), (117, 171), (91, 181)],
                       fill=(*scene.c(44), 15))
    scene.draw.polygon([(166, 46), (173, 45), (191, 155), (168, 160)],
                       fill=(*scene.c(43), 11))
    scene.draw.ellipse((70, 165, 133, 196), fill=(*scene.c(32), 24))
    scene.draw.ellipse((82, 170, 125, 187), fill=(*scene.c(33), 26))
    # Cap, barrel and clip make this a physical glowstick rather than a light dash.
    scene.line([(92, 185), (115, 176)], 29, 8)
    scene.line([(92, 183), (114, 175)], 32, 6)
    scene.line([(93, 182), (113, 175)], 34, 4)
    scene.line([(94, 181), (113, 174)], 35, 2)
    scene.line([(91, 181), (94, 186)], 6, 3)
    scene.line([(91, 181), (93, 185)], 9)
    scene.line([(114, 173), (117, 177)], 9, 3)
    scene.line([(117, 174), (120, 172), (119, 169), (117, 169)], 33)
    scene.line([(97, 188), (108, 185)], 34)
    scene.line([(100, 190), (113, 190)], 33)
    scene.use("foreground")
    scene.polygon([(0, 182), (27, 180), (47, 189), (67, 193),
                   (73, 201), (63, 215), (18, 237), (0, 239)], 0)
    scene.polygon([(0, 181), (27, 179), (49, 188), (65, 193),
                   (52, 202), (21, 208), (0, 207)], 12)
    scene.line([(1, 181), (27, 179), (47, 188), (65, 193)], 5)
    scene.line([(42, 186), (47, 188), (65, 193)], 7)
    scene.line([(16, 186), (22, 191), (18, 195), (29, 202)], 1)
    scene.line([(43, 194), (40, 197), (31, 198)], 2)
    scene.polygon([(45, 191), (49, 188), (55, 190), (52, 194)], 15)
    scene.line([(46, 191), (49, 189), (53, 190)], 17)
    scene.polygon([(229, 203), (246, 195), (256, 194), (256, 256),
                   (215, 256), (219, 219)], 0)
    scene.line([(229, 204), (247, 196), (255, 195)], 4)
    scene.polygon([(0, 246), (41, 238), (57, 243), (77, 247),
                   (76, 256), (0, 256)], 0)
    return scene


def validate_baseline(path, studio):
    baseline = read_json(path)
    if baseline.get("format") != "spritecanvas-handoff" or baseline.get("version") != 1:
        raise ValueError("Provide an unchanged SpriteCanvas v1 handoff.")
    revision = baseline.get("revision")
    if type(revision) is not int or revision < 0:
        raise ValueError("The handoff must record its actual saved revision.")
    project = baseline["project"]
    if baseline.get("proposal") or any(layer["locked"] for layer in project["layers"]):
        raise ValueError("The baseline must have no proposal or locked layers.")
    if any(pixel for frame in project["frames"] for cel in frame["cels"].values() for pixel in cel):
        raise ValueError("Refusing an active artwork: use a protected blank handoff.")
    script = (
        "import {readFileSync} from 'node:fs';"
        "import {pathToFileURL} from 'node:url';"
        "const {validateProject}=await import(pathToFileURL(process.argv[1]));"
        "validateProject(JSON.parse(readFileSync(process.argv[2])).project);"
    )
    subprocess.run([
        "node", "--input-type=module", "-e", script,
        str(studio / "web" / "lib" / "model.js"), str(path),
    ], check=True)
    return baseline


def draw_sources(handoff, studio, redraw):
    authored = [ART / name for name in [
        SOURCE, "scene.png", "design.json", "provenance.json",
        "cover.png", "preview.png", "manifest.json",
    ]]
    if not redraw and any(path.exists() for path in authored):
        raise FileExistsError("Authored sources exist; only --draw --redraw may replace them.")
    baseline = validate_baseline(handoff, studio)
    # Resolve fonts and draw in memory before replacing any saved source.
    design = typography_design({
        "title": "yeetthatglowstick", "cover_medium": "pixel",
        "caption": "original game soundtrack", "palette": [
            "07151c", "215059", "87e9cf", "d7c795",
        ],
    }, len(TRACKS))
    design.update({
        "image_source": SOURCE, "album_title": TITLE,
        "number_meaning": "track count", "title_size": 152,
    })
    drawing = draw_scene()
    layers = [
        {"id": name, "name": LAYER_LABELS[name], "visible": True,
         "locked": False, "opacity": 1}
        for name in drawing.layers
    ]
    cels = {
        name: ["#%02X%02X%02X%02X" % pixel if pixel[3] else None
               for pixel in image.get_flattened_data()]
        for name, image in drawing.layers.items()
    }
    palette = ["#%02X%02X%02XFF" % color for color in drawing.palette]
    palette.extend(dict.fromkeys(
        pixel for cel in cels.values() for pixel in cel
        if pixel and not pixel.endswith("FF")
    ))
    project = {
        "format": "spritecanvas", "version": 1, "id": baseline["project"]["id"],
        "name": TITLE, "width": 256, "height": 256, "palette": palette,
        "layers": layers, "frames": [{"id": "album-static", "duration": 10000, "cels": cels}],
    }
    ART.mkdir(parents=True, exist_ok=True)
    (ART / SOURCE).write_text(json.dumps(project) + "\n", encoding="utf-8", newline="\n")
    save_json(ART / "design.json", design)
    save_json(ART / "provenance.json", {
        "baseline_project_id": baseline["project"]["id"],
        "baseline_revision": baseline["revision"],
        "handoff_sha256": digest(handoff),
        "baseline": "Protected blank saved handoff; original handoff kept unchanged.",
        "recipe": "../../../tools/album_cover.py",
        "recipe_sha256": digest(Path(__file__)),
        "drawing_helpers": "../../../tools/pixel_cover_scenes.py",
        "drawing_helpers_sha256": digest(ROOT / "tools" / "pixel_cover_scenes.py"),
        "native_pixels": [256, 256], "editable_cells": 256 * 256 * 7,
        "frames": 1, "working_palette_swatches": len(palette),
        "original_composition": True, "external_images": [],
        "live_studio_mutated": False, "proposal_submitted": False,
        "font_binaries_distributed": False,
    })


def export(studio, check):
    design = read_json(ART / "design.json")
    if (design["title"] != "yeetthatglowstick" or design["medium"] != "pixel"
            or design["image_source"] != SOURCE or design["number"] != len(TRACKS)):
        raise ValueError("Saved design does not match this twelve-track album.")
    for key in ["title_font", "label_font"]:
        if design[key] != "CascadiaMono.ttf":
            raise ValueError("Every album text element must use Cascadia Mono.")
    project = read_json(ART / SOURCE)
    if project["name"] != TITLE or len(project["layers"]) != 7 or len(project["frames"]) != 1:
        raise ValueError("Album source must remain a seven-layer, single-frame project.")
    command = [
        "node", str(ROOT / "tools" / "render_spritecanvas.mjs"), "--studio-root", str(studio),
    ]
    subprocess.run(command + (["--check"] if check else []) + [str(ART / SOURCE)], check=True)
    with Image.open(ART / "scene.png") as scene:
        cover = compose(scene, design)
    products = {
        "cover.png": png_bytes(cover),
        "preview.png": png_bytes(cover.resize((512, 512), Image.Resampling.LANCZOS)),
    }
    manifest = {
        "title": TITLE, "description": DESCRIPTION, "source": SOURCE,
        "source_sha256": digest(ART / SOURCE),
        "scene_sha256": digest(ART / "scene.png"),
        "design_sha256": digest(ART / "design.json"),
        "provenance_sha256": digest(ART / "provenance.json"),
        "export_sha256": hashlib.sha256(products["cover.png"]).hexdigest(),
        "preview_sha256": hashlib.sha256(products["preview.png"]).hexdigest(),
        "medium": "pixel", "native_size": [256, 256], "export_size": [2048, 2048],
        "preview_size": [512, 512], "track_count": len(TRACKS), "tracks": TRACKS,
        "excluded_tracks": ["serenity", "euphoria"],
    }
    if check:
        if read_json(ART / "manifest.json") != manifest:
            raise ValueError("Stale album manifest; re-export saved sources.")
        for name, data in products.items():
            if (ART / name).read_bytes() != data:
                raise ValueError(f"Stale album export: {name}")
    else:
        for name, data in products.items():
            (ART / name).write_bytes(data)
        save_json(ART / "manifest.json", manifest)
    print(f"{TITLE}: {'saved sources and exports match' if check else 'saved-source exports written'}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--studio-root", type=Path, required=True)
    parser.add_argument("--check", action="store_true", help="Read-only source/export comparison.")
    parser.add_argument("--draw", action="store_true", help="Create the original layered sources.")
    parser.add_argument("--handoff", type=Path, help="Protected, blank SpriteCanvas handoff for --draw.")
    parser.add_argument("--redraw", action="store_true", help="Allow --draw to replace authored sources.")
    args = parser.parse_args()
    if args.redraw and not args.draw:
        parser.error("--redraw is only valid with --draw.")
    if args.handoff and not args.draw:
        parser.error("--handoff is only valid with --draw.")
    if args.check and args.draw:
        parser.error("--check is read-only and cannot be combined with --draw.")
    if args.draw and not args.handoff:
        parser.error("--draw requires --handoff.")
    if not (args.studio_root / "web" / "lib" / "model.js").is_file():
        parser.error("--studio-root must contain SpriteCanvas's web\\lib\\model.js.")
    if args.draw:
        draw_sources(args.handoff, args.studio_root, args.redraw)
    export(args.studio_root, args.check)


if __name__ == "__main__":
    main()
