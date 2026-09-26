"""Draw or re-export genre-aware covers, keeping editable art separate from typography."""

import argparse
import hashlib
import html
import io
import json
import re
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from pixel_cover_scenes import render_pixel_scene
from library_layout import bundle_path, location, validate_albums

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "artwork" / "covers"
FONT_ROOT = Path(r"C:\Windows\Fonts")
DESCRIPTION = (
    "Original character-free, environment-led artwork: twelve layered 256px SpriteCanvas pixel scenes and two "
    "smooth 2048px digital illustrations, with lowercase monospace type for pixel covers and "
    "Segoe UI type for smooth covers."
)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8", newline="\n")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png_bytes(image):
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def typography_fonts(medium):
    pixel = medium == "pixel"
    title_font = "CascadiaMono.ttf" if pixel else "segoeuil.ttf"
    label_font = "CascadiaMono.ttf" if pixel else "segoeui.ttf"
    return {
        "title_font": title_font, "title_font_sha256": digest(FONT_ROOT / title_font),
        "label_font": label_font, "label_font_sha256": digest(FONT_ROOT / label_font),
        "font_provenance": (
            "Locally installed Cascadia Mono, SIL OFL 1.1; rasterized text only, no font redistribution."
            if pixel else "Installed Windows Segoe UI; rasterized text only, no font redistribution."
        ),
        "font_policy": (
            "https://github.com/microsoft/cascadia-code/blob/main/LICENSE"
            if pixel else "https://learn.microsoft.com/en-us/typography/fonts/font-faq"
        ),
    }


def typography_design(song, number):
    return {
        "version": 1, "title": song["title"], "number": number,
        "medium": song["cover_medium"], "width": 2048, "height": 2048,
        **typography_fonts(song["cover_medium"]),
        "title_size": 152, "title_xy": [124, 1690], "title_color": "#f3efe2",
        "wordmark": "subwoofer lullabies", "wordmark_xy": [130, 119], "wordmark_size": 32,
        "tracking": 5, "caption": song["caption"].lower(), "caption_xy": [131, 1890],
        "caption_size": 25, "accent": f"#{song['palette'][2]}",
        "image_source": f"{song['title']}.spritecanvas.json" if song["cover_medium"] == "pixel" else "scene.png",
    }


def tracked(draw, xy, text, font, color, spacing):
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=font, fill=color, anchor="lt")
        x += draw.textlength(char, font=font) + spacing
    return x


def compose(scene, design):
    title = design["title"]
    if not re.fullmatch("[a-z]+", title):
        raise ValueError(f"Titles must be lowercase ASCII words: {title}")
    for key in ["title_font", "label_font"]:
        if digest(FONT_ROOT / design[key]) != design[f"{key}_sha256"]:
            raise ValueError(f"Font differs from the saved design: {design[key]}")
    expected = (256, 256) if design["medium"] == "pixel" else (2048, 2048)
    if scene.size != expected:
        raise ValueError(f"{title}: expected native scene size {expected}, got {scene.size}")
    # Shade before nearest-neighbor scaling so pixel artwork retains its native grid.
    arr = np.asarray(scene.convert("RGB"), dtype=np.float32)
    y = np.linspace(0, 1, arr.shape[0])[:, None, None]
    bottom = np.clip((y - .73) / .27, 0, 1) ** .85 * .92
    top = np.clip((.21 - y) / .21, 0, 1) * .68
    arr = arr * (1 - np.maximum(bottom, top)) + np.array([3, 10, 14]) * np.maximum(bottom, top)
    image = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"))
    if design["medium"] == "pixel":
        image = image.resize((2048, 2048), Image.Resampling.NEAREST)
    d = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(str(FONT_ROOT / design["title_font"]), design["title_size"])
    small = ImageFont.truetype(str(FONT_ROOT / design["label_font"]), design["wordmark_size"])
    caption = ImageFont.truetype(str(FONT_ROOT / design["label_font"]), design["caption_size"])
    if design["medium"] == "pixel":
        for face, text in [(title_font, title), (small, design["wordmark"] + f"{design['number']:02d}"),
                           (caption, design["caption"])]:
            advances = [face.getlength(char) for char in set(text)]
            if advances and max(advances) - min(advances) > 1 / 64:
                raise ValueError(f"{title}: all retro/pixel lettering must use a monospace font.")
    bounds = d.textbbox(design["title_xy"], title, font=title_font, anchor="lt")
    if bounds[2] > 1918 or bounds[3] > 1865:
        raise ValueError(f"{title}: typography exceeds its safe area.")
    d.text(design["title_xy"], title, font=title_font, fill=design["title_color"], anchor="lt")
    right = tracked(d, design["wordmark_xy"], design["wordmark"], small, "#e2e9df", design["tracking"])
    if right > 1700:
        raise ValueError("Wordmark overlaps the collection index.")
    d.text((1915, 119), f"{design['number']:02d}", font=small, fill=design["title_color"], anchor="rt")
    d.line((130, 1644, 218, 1644), fill=design["accent"], width=3)
    tracked(d, design["caption_xy"], design["caption"], caption, "#b9c9c3", 4)
    return image


def draw_sources(songs, selected, handoff_path, redraw):
    baseline = read_json(handoff_path) if handoff_path else None
    for number, song in enumerate(songs, 1):
        if song["title"] not in selected:
            continue
        folder = ART / song["title"]
        if folder.exists() and not redraw:
            raise FileExistsError(f"{folder}: --redraw explicitly replaces authored sources.")
        if song["cover_medium"] == "pixel" and baseline is None:
            raise ValueError("--handoff is required to draw new SpriteCanvas sources.")
    if baseline:
        project = baseline["project"]
        if baseline.get("proposal") or any(layer["locked"] for layer in project["layers"]):
            raise ValueError("The drawing baseline must have no pending proposal or locked layers.")
        if any(pixel for frame in project["frames"] for pixels in frame["cels"].values() for pixel in pixels):
            raise ValueError("Use the preserved blank baseline, not an active artwork.")
    for number, song in enumerate(songs, 1):
        title = song["title"]
        if title not in selected:
            continue
        folder = ART / title
        folder.mkdir(parents=True, exist_ok=True)
        if song["cover_medium"] == "pixel":
            drawing = render_pixel_scene(song, number)
            layers = [{"id": name, "name": name, "visible": True, "locked": False, "opacity": 1}
                      for name in drawing.layers]
            cels = {name: ["#%02X%02X%02X%02X" % pixel if pixel[3] else None
                           for pixel in image.get_flattened_data()] for name, image in drawing.layers.items()}
            project = {
                "format": "spritecanvas", "version": 1, "id": baseline["project"]["id"], "name": title,
                "width": 256, "height": 256, "palette": ["#%02X%02X%02X" % color for color in drawing.palette],
                "layers": layers, "frames": [{"id": title, "duration": 10000, "cels": cels}],
            }
            (folder / f"{title}.spritecanvas.json").write_text(json.dumps(project) + "\n", encoding="utf-8")
            save_json(folder / "provenance.json", {
                "baseline_project_id": baseline["project"]["id"], "baseline_revision": baseline["revision"],
                "handoff_sha256": digest(handoff_path), "recipe": "../../../tools/pixel_cover_scenes.py",
                "recipe_sha256": digest(ROOT / "tools" / "pixel_cover_scenes.py"),
                "native_pixels": [256, 256], "editable_cells": 256 * 256 * len(layers),
                "live_studio_mutated": False,
            })
        else:
            from image_cover_scenes import render_scene
            render_scene(title, 2048).convert("RGB").save(folder / "scene.png")
            save_json(folder / "provenance.json", {
                "recipe": "../../../tools/image_cover_scenes.py", "native_pixels": [2048, 2048],
                "recipe_sha256": digest(ROOT / "tools" / "image_cover_scenes.py"),
                "medium": "original smooth digital illustration", "external_images": [],
            })
        save_json(folder / "design.json", typography_design(song, number))
        print(f"Drawn {title}", flush=True)


def artwork_gallery(records):
    cards = []
    for record in records:
        t = html.escape(record["title"])
        label = "256px layered pixel scene" if record["medium"] == "pixel" else "2048px smooth illustration"
        source = html.escape(record["source"])
        cards.append(f'<article><a href="{t}/cover.png"><img src="{t}/preview.png" alt="{t}" '
                     f'width="512" height="512"></a><h2>{t}</h2><p>{label}</p>'
                     f'<a href="{t}/{source}">art source</a> / <a href="{t}/design.json">typography</a></article>')
    return """<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>subwoofer lullabies / covers</title><style>
:root{color-scheme:dark;font:16px Segoe UI,system-ui,sans-serif;background:#07141b;color:#e9e9dd}
body{max-width:1600px;margin:60px auto;padding:0 30px}h1{font-size:48px;font-weight:300}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:30px}
img{width:100%;height:auto}h2{font-size:24px;font-weight:300;margin-bottom:8px}
p{color:#9cb3b1}a{color:#9ccec0;text-decoration:none}article{padding-bottom:24px}
</style><h1>small lights. long echoes.</h1><p>fourteen original covers / a shared lowercase identity</p><main>
""" + "\n".join(cards) + "</main></html>\n"


def export(songs, selected, studio, check):
    pixel_sources = [str(ART / s["title"] / f"{s['title']}.spritecanvas.json") for s in songs
                     if s["title"] in selected and s["cover_medium"] == "pixel"]
    if pixel_sources:
        command = ["node", str(ROOT / "tools" / "render_spritecanvas.mjs"), "--studio-root", str(studio)]
        subprocess.run(command + (["--check"] if check else []) + pixel_sources, check=True)
    manifest_path = ART / "manifest.json"
    previous = read_json(manifest_path) if manifest_path.exists() else {"songs": []}
    records = {item["title"]: item for item in previous["songs"]}
    for song in songs:
        title = song["title"]
        if title not in selected:
            continue
        folder = ART / title
        design = read_json(folder / "design.json")
        if design["title"] != title or design["medium"] != song["cover_medium"]:
            raise ValueError(f"{title}: design does not match the catalog.")
        with Image.open(folder / "scene.png") as scene:
            cover = compose(scene, design)
        products = {
            "cover.png": png_bytes(cover),
            "preview.png": png_bytes(cover.resize((512, 512), Image.Resampling.LANCZOS)),
        }
        source = f"{title}.spritecanvas.json" if song["cover_medium"] == "pixel" else "scene.png"
        record = {
            "title": title, "medium": song["cover_medium"], "source": source,
            "source_sha256": digest(folder / source), "scene_sha256": digest(folder / "scene.png"),
            "design_sha256": digest(folder / "design.json"),
            "provenance_sha256": digest(folder / "provenance.json"),
            "export_sha256": hashlib.sha256(products["cover.png"]).hexdigest(),
        }
        if check and record != records.get(title):
            raise ValueError(f"{title}: stale manifest, re-export the edited sources.")
        for name, data in products.items():
            destination = folder / name
            if check:
                if destination.read_bytes() != data:
                    raise ValueError(f"{title}: stale {name}")
            else:
                destination.write_bytes(data)
        records[title] = record
    ordered = [records[s["title"]] for s in songs if s["title"] in records]
    manifest = {"producer": "subwooferlullabies-genre-covers-v2", "description": DESCRIPTION, "songs": ordered}
    if not check:
        save_json(manifest_path, manifest)
        (ART / "index.html").write_text(artwork_gallery(ordered), encoding="utf-8")
    print(f"{len(selected)} cover exports {'match saved sources' if check else 'saved'}.")
    return manifest


def install(songs, manifest):
    from build_library import album_sources, rights_note, verify, write_collection_pages
    if len(manifest["songs"]) != len(songs):
        raise ValueError("All fourteen covers must be exported before installation.")
    output = ROOT / "STRUDEL"
    current = read_json(output / "catalog.json")
    validate_albums(songs)
    albums = album_sources()
    previous = {s["title"].lower(): s for s in current["songs"]}
    records = {s["title"]: s for s in manifest["songs"]}
    research = read_json(ROOT / "tools" / "rights_research.json")
    installed_albums = {album["title"] for album in current.get("albums", [])}
    for album in albums:
        folder = output / album["directory"]
        if album["title"] not in installed_albums and folder.exists():
            raise FileExistsError(f"Refusing to initialize an existing album folder: {folder}")
    for album in current.get("albums", []):
        if digest(output / album["cover"]) != album["cover_sha256"]:
            raise ValueError(f"{album['title']}: installed album artwork changed independently.")
    for song in songs:
        title = song["title"]
        old = previous[title]
        folder = output / old.get("bundle_path", old["title"])
        target = output / bundle_path(song)
        if folder != target and target.exists():
            raise FileExistsError(f"Refusing to overwrite a moved song bundle: {target}")
        if folder != target or old["title"] != title:
            temporary = output / f".rename-{title}"
            if temporary.exists():
                raise FileExistsError(temporary)
            if target.parent.exists() and not target.parent.is_dir():
                raise NotADirectoryError(target.parent)
        if digest(folder / f"{old['title']}.strudel") != old["source_sha256"]:
            raise ValueError(f"{title}: score changed independently.")
        if digest(folder / "cover.png") != old["cover_sha256"]:
            raise ValueError(f"{title}: installed artwork changed independently.")
        if digest(ART / title / "cover.png") != records[title]["export_sha256"]:
            raise ValueError(f"{title}: art export changed after rendering.")
    updated = []
    for song in songs:
        title = song["title"]
        old = previous[title]
        folder = output / old.get("bundle_path", old["title"])
        target = output / bundle_path(song)
        if folder != target or old["title"] != title:
            temporary = output / f".rename-{title}"
            if temporary.exists():
                raise FileExistsError(temporary)
            folder.rename(temporary)
            score = temporary / f"{old['title']}.strudel"
            score.rename(temporary / ".score-rename")
            (temporary / ".score-rename").rename(temporary / f"{title}.strudel")
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary.rename(target)
        folder = target
        shutil.copyfile(ART / title / "cover.png", folder / "cover.png")
        (folder / "RIGHTS.md").write_text(
            rights_note(song, old["source_sha256"], research), encoding="utf-8", newline="\n")
        updated.append({**old, **song, **location(song), "cover_sha256": records[title]["export_sha256"],
                        "cover_source": f"..\\artwork\\covers\\{title}\\{records[title]['source']}",
                        "cover_design": f"..\\artwork\\covers\\{title}\\design.json"})
    current["songs"] = updated
    current["cover_art"] = DESCRIPTION
    current["albums"] = albums
    write_collection_pages(output, current)
    verify(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--studio-root", type=Path, required=True)
    parser.add_argument("--draw", action="store_true", help="Draw new scene sources; otherwise export saved sources.")
    parser.add_argument("--redraw", action="store_true", help="Explicitly replace sources with drawing recipes.")
    parser.add_argument("--handoff", type=Path)
    parser.add_argument("--titles", nargs="+")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--install", action="store_true")
    args = parser.parse_args()
    if args.check and (args.draw or args.redraw or args.install):
        parser.error("--check is read-only.")
    if args.redraw and not args.draw:
        parser.error("--redraw requires --draw.")
    songs = read_json(ROOT / "tools" / "song_catalog.json")
    all_titles = {s["title"] for s in songs}
    selected = set(args.titles or all_titles)
    if not selected <= all_titles:
        parser.error(f"Unknown titles: {selected - all_titles}")
    if args.install and selected != all_titles:
        parser.error("Install only a complete export pass.")
    if args.draw:
        draw_sources(songs, selected, args.handoff, args.redraw)
    manifest = export(songs, selected, args.studio_root, args.check)
    if args.install:
        install(songs, manifest)


if __name__ == "__main__":
    main()
