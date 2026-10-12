"""Generate dedicated 151:89 cassette backs for the original fourteen songs."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artwork" / "covers"
CATALOG = ROOT / "tools" / "song_catalog.json"
FONTS = Path(r"C:\Windows\Fonts")
MASTER_SIZE = (3020, 1780)
EXPORT_SIZE = (1510, 890)
PREVIEW_SIZE = (755, 445)
SCENE_SIZE = 840
SCENE_TOP = 355


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha_file(path):
    return sha_bytes(path.read_bytes())


def png_bytes(image):
    from io import BytesIO

    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def json_bytes(value):
    return (json.dumps(value, indent=2) + "\n").encode("utf-8")


def fit_font(draw, text, filename, size, max_width):
    font = ImageFont.truetype(str(FONTS / filename), size)
    while draw.textlength(text, font=font) > max_width and size > 20:
        size -= 1
        font = ImageFont.truetype(str(FONTS / filename), size)
    if draw.textlength(text, font=font) > max_width:
        raise ValueError(f"Cannot fit cassette-back title: {text}")
    return font


def palette(song):
    return [np.array([int(value[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)
            for value in song["palette"]]


def background(song):
    width, height = MASTER_SIZE
    colors = palette(song)
    y, x = np.ogrid[:height, :width]
    vertical = np.clip(y / height, 0, 1)[..., None]
    base = colors[0] * (1 - vertical) + colors[1] * vertical
    glow = np.exp(-(((x - width / 2) / (width * .42)) ** 2
                    + ((y - height * .34) / (height * .72)) ** 2))[..., None]
    side = np.exp(-(((x - width / 2) / (width * .72)) ** 2
                    + ((y - height * .60) / (height * .95)) ** 2))[..., None]
    pixels = base * (.58 + .20 * side) + colors[2] * (.14 * glow)
    pixels = np.clip(pixels, 0, 255).astype("uint8")
    image = Image.fromarray(pixels, "RGB")
    draw = ImageDraw.Draw(image, "RGBA")
    if song["cover_medium"] == "pixel":
        for row in range(0, height, 32):
            draw.line((0, row, width, row), fill=(*colors[2].astype(int), 10), width=2)
        for column in range(0, width, 48):
            draw.line((column, 0, column, height), fill=(*colors[0].astype(int), 12), width=2)
        seed = int(hashlib.sha256(song["title"].encode("ascii")).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        for _ in range(190):
            px = int(rng.integers(0, width // 16) * 16)
            py = int(rng.integers(0, height // 16) * 16)
            tone = colors[2] if rng.random() > .5 else colors[3]
            draw.rectangle((px, py, px + int(rng.integers(8, 34)), py + int(rng.integers(3, 12))),
                           fill=(*tone.astype(int), int(rng.integers(5, 17))))
    else:
        for offset in range(-height, width, 54):
            draw.line((offset, height, offset + height, 0), fill=(*colors[2].astype(int), 7), width=2)
    return image


def scene_panel(scene, medium):
    if medium == "pixel":
        panel = Image.new("RGB", (SCENE_SIZE, SCENE_SIZE), "#05090b")
        native = scene.convert("RGB").resize((768, 768), Image.Resampling.NEAREST)
        panel.paste(native, (36, 36))
        draw = ImageDraw.Draw(panel, "RGBA")
        draw.rectangle((18, 18, SCENE_SIZE - 19, SCENE_SIZE - 19), outline=(225, 237, 224, 54), width=6)
        draw.rectangle((28, 28, SCENE_SIZE - 29, SCENE_SIZE - 29), outline=(0, 0, 0, 145), width=8)
        return panel, None
    panel = scene.convert("RGB").resize((SCENE_SIZE, SCENE_SIZE), Image.Resampling.LANCZOS)
    mask = Image.new("L", panel.size)
    ImageDraw.Draw(mask).rounded_rectangle((34, 34, SCENE_SIZE - 34, SCENE_SIZE - 34),
                                           radius=65, fill=255)
    return panel, mask.filter(ImageFilter.GaussianBlur(28))


def render(song, number):
    folder = ART / song["title"]
    scene_path = folder / "scene.png"
    if not scene_path.exists():
        raise FileNotFoundError(scene_path)
    with Image.open(scene_path) as source:
        expected = (256, 256) if song["cover_medium"] == "pixel" else (2048, 2048)
        if source.size != expected:
            raise ValueError(f"{song['title']}: expected {expected}, got {source.size}")
        image = background(song)
        panel, mask = scene_panel(source, song["cover_medium"])
    left = (MASTER_SIZE[0] - SCENE_SIZE) // 2
    if mask is None:
        image.paste(panel, (left, SCENE_TOP))
    else:
        image.paste(panel, (left, SCENE_TOP), mask)

    draw = ImageDraw.Draw(image)
    pixel = song["cover_medium"] == "pixel"
    title_font_name = "CascadiaMono.ttf" if pixel else "segoeuil.ttf"
    label_font_name = "CascadiaMono.ttf" if pixel else "segoeui.ttf"
    title_font = fit_font(draw, song["title"], title_font_name, 116, 2280)
    label_font = ImageFont.truetype(str(FONTS / label_font_name), 29)
    number_font = ImageFont.truetype(str(FONTS / label_font_name), 54)
    title_color = "#f3efe2"
    label_color = "#b7c7c2"
    draw.text((MASTER_SIZE[0] / 2, 95), song["title"], font=title_font,
              anchor="mt", fill=title_color)
    collection = ("YEETTHATGLOWSTICK  /  SUBWOOFER LULLABIES"
                  if song["title"] not in {"serenity", "euphoria"}
                  else "STANDALONE  /  SUBWOOFER LULLABIES")
    draw.text((MASTER_SIZE[0] / 2, 258), collection, font=label_font,
              anchor="mt", fill=label_color)
    draw.text((2800, 105), f"{number:02d}", font=number_font, anchor="rt", fill=title_color)
    accent = "#" + song["palette"][2]
    draw.rectangle((220, 202, 420, 210), fill=accent)
    return image


def products(song, number):
    master = render(song, number)
    export = master.resize(EXPORT_SIZE, Image.Resampling.LANCZOS)
    preview = master.resize(PREVIEW_SIZE, Image.Resampling.LANCZOS)
    folder = ART / song["title"]
    scene_path = folder / "scene.png"
    master_data = png_bytes(master)
    export_data = png_bytes(export)
    from io import BytesIO

    preview_buffer = BytesIO()
    preview.save(preview_buffer, format="JPEG", quality=94, subsampling=0)
    design = {
        "title": song["title"],
        "size": list(MASTER_SIZE),
        "export": list(EXPORT_SIZE),
        "preview": list(PREVIEW_SIZE),
        "layout": ("Complete native scene in a protected central panel over newly composed palette "
                   "atmosphere; no stretch or square center-crop."),
        "scene_bounds_export": [545, 177.5, 965, 597.5],
        "reel_centers_export": [[295, 555], [1215, 555]],
        "reel_guard_radius": 240,
        "lower_mechanical_keepout_export": {
            "center": [755, 850], "size": [925, 215], "rotation_degrees": 4.01,
        },
        "typography": "Upper band only; lowercase title and collection label remain outside all keepouts.",
        "medium": song["cover_medium"],
        "resampling": "nearest-neighbor scene panel" if song["cover_medium"] == "pixel" else "Lanczos scene panel",
        "source_scene_sha256": sha_file(scene_path),
        "master_sha256": sha_bytes(master_data),
        "export_sha256": sha_bytes(export_data),
        "holes": False,
        "people_added": False,
    }
    return {
        folder / "cassette-back-master.png": master_data,
        folder / "cassette-back.png": export_data,
        folder / "cassette-back-preview.jpg": preview_buffer.getvalue(),
        folder / "cassette-back-design.json": json_bytes(design),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    songs = json.loads(CATALOG.read_text(encoding="utf-8"))
    if len(songs) != 14:
        raise ValueError(f"Expected fourteen original songs, got {len(songs)}")
    for number, song in enumerate(songs, 1):
        for path, data in products(song, number).items():
            if args.check:
                if not path.exists() or path.read_bytes() != data:
                    raise ValueError(f"{song['title']}: stale or missing {path.name}")
            else:
                path.write_bytes(data)
        print(f"{song['title']}: cassette back {'verified' if args.check else 'generated'}")


if __name__ == "__main__":
    main()
