"""Package the selected scores, original covers and source-specific rights notes."""

import argparse
import hashlib
import html
import json
import re
import shutil
import tempfile
from pathlib import Path

from PIL import Image

from library_layout import ALBUMS, bundle_path, location, validate_albums

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"
ARTWORK = ROOT / "artwork" / "covers"
ALBUM_ARTWORK = ROOT / "artwork" / "albums"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def duration(song):
    return song["end_cycle"] * 240 / song["bpm"]


def display_duration(song):
    seconds = duration(song)
    return f"{seconds:.3f}s" if seconds < 60 else f"{int(seconds // 60)}:{seconds % 60:06.3f}"


def source_for(song, source_directory):
    if song["title"] == "euphoria":
        return TOOLS / "sources" / "Euphoria.strudel"
    return source_directory / song["source"]


def cover_sources(songs):
    manifest = json.loads((ARTWORK / "manifest.json").read_text(encoding="utf-8"))
    records = {song["title"]: song for song in manifest["songs"]}
    if set(records) != {song["title"] for song in songs}:
        raise ValueError("The artwork collection must match the song catalog.")
    media = {song["title"]: song["cover_medium"] for song in songs}
    covers = {}
    for title, record in records.items():
        folder = ARTWORK / title
        source = folder / record["source"]
        export = folder / "cover.png"
        if (record["medium"] != media[title]
                or sha256(source) != record["source_sha256"]
                or sha256(folder / "scene.png") != record["scene_sha256"]
                or sha256(folder / "design.json") != record["design_sha256"]
                or sha256(folder / "provenance.json") != record["provenance_sha256"]
                or sha256(export) != record["export_sha256"]):
            raise ValueError(f"Stale artwork for {title}; run tools\\cover_pipeline.py.")
        covers[title] = export
    return manifest, covers


def album_sources():
    records = []
    for album in ALBUMS:
        folder = ALBUM_ARTWORK / album["title"]
        artwork = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
        if artwork["title"] != album["title"]:
            raise ValueError(f"Album artwork title differs: {folder}")
        if artwork["tracks"] != album["tracks"] or artwork["track_count"] != len(album["tracks"]):
            raise ValueError(f"Album artwork and track order differ: {folder}")
        files = {
            "source_sha256": artwork["source"], "scene_sha256": "scene.png",
            "design_sha256": "design.json", "provenance_sha256": "provenance.json",
            "export_sha256": "cover.png",
        }
        for field, filename in files.items():
            if sha256(folder / filename) != artwork[field]:
                raise ValueError(f"Stale album artwork: {folder / filename}")
        records.append({
            **album, "directory": album["title"], "cover": f"{album['title']}/cover.png",
            "cover_sha256": artwork["export_sha256"],
            "cover_source": f"../artwork/albums/{album['title']}/{artwork['source']}",
            "cover_design": f"../artwork/albums/{album['title']}/design.json",
        })
    return records


def rights_note(song, digest, research):
    group = research["groups"][song["sample_group"]]
    title = song["title"]
    if title == "euphoria":
        relationship = (
            "Recovered from the original Eurodance learning example in the conversation. "
            "It was supplied as an original example, not a transcription of the requested "
            "commercial song. That stated intent is not an independent similarity clearance. "
            "Do not describe this as a licensed cover/remix of that commercial recording."
        )
    else:
        relationship = (
            "This is one part of the same AI-assisted game score. Recurring notes, water "
            "textures and motifs also occur in other folders in this collection. In particular, "
            "anticipation and vulnerability share substantial material; perseverance and serenity "
            "develop related motifs. Treat them as related arrangements when working with a "
            "distributor, rather than competing exclusive references."
        )
    sources = list(dict.fromkeys(research["common_source_ids"] + group["source_ids"]))
    links = "\n".join(
        f"- [{research['sources'][key]['title']}]({research['sources'][key]['url']}): "
        f"{research['sources'][key]['finding']}" for key in sources
    )
    actions = "\n".join(f"- {item}" for item in group["actions"])
    art = (
        "Its illustration is original 256 x 256 native pixel art with seven editable SpriteCanvas "
        "layers, enlarged 8x without smoothing before high-resolution typography is added."
        if song["cover_medium"] == "pixel" else
        "Its illustration is an original smooth 2048 x 2048 digital image, drawn locally from "
        "the saved Python scene recipe; it is not pixel art or a stock photograph."
    )
    font_note = (
        "Lowercase lettering uses locally installed Cascadia Mono, published under the\n"
        "[SIL Open Font License 1.1](https://github.com/microsoft/cascadia-code/blob/main/LICENSE).\n"
        "The font is rasterized into the artwork; no font files are embedded or redistributed.\n"
        "The font licence does not require documents created with it to use that same licence."
        if song["cover_medium"] == "pixel" else
        "Lowercase lettering is rasterized from locally installed Windows\n"
        "Segoe UI fonts. No font files are embedded or redistributed. Microsoft's\n"
        "[font-output FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq) distinguishes\n"
        "permitted graphic output from redistribution of font software, subject to the applicable\n"
        "software licence."
    )
    return f"""# {title} - upload and copyright risk note

**Reviewed:** {research['review_date']}  
**Track:** {song['role']} / formerly *{song['original_title']}*  
**Source file:** `{title}.strudel`  
**Source SHA-256:** `{digest}`

{song['emotion']}

## VERDICT

- **YouTube:** {group['platform_verdicts']['youtube']}
- **SoundCloud:** {group['platform_verdicts']['soundcloud']}

These are low-confidence practical expectations, not measured probabilities or upload-test
results; where sample rights remain unresolved, no most-likely outcome is asserted.

## Educated estimate

**{group['verdict']}**

{group['rationale']}

This is a qualitative assessment of identified exposure, not a measured probability.
No defensible percentage or universal "safe anywhere" rating is available. No rendered
recording was submitted to a fingerprint service, compared against a commercial music
catalogue, uploaded to a platform, or reviewed by a lawyer for this assessment.

## What is actually in this track

{group['inventory']}

{group['licensing']}

{relationship}

## Before uploading

{actions}
- Export your own recording from this source; retain the score, render settings, dated
  files and licensing evidence. Reassess if you add vocals, samples, video, or other art.
- Read the destination platform and distributor's current policies. A successful upload
  check on one platform is not clearance for other platforms or future claims.
- If a claim arrives, inspect the claimant and matched passage. Dispute only with a valid,
  evidence-backed basis; this note is not proof that any particular claim is mistaken.

## Important distinctions

"Getting copyrighted" is not what happens when a platform flags a song. Where eligible,
copyright generally arises on fixation under the applicable law; uploading does not
itself grant somebody else ownership. Copyrightability, sample permission, automated
matching, Content ID eligibility, monetization and infringement are separate questions.

On YouTube, a Content ID claim is normally distinct from a copyright strike; a valid
copyright removal request can remove a video and cause a strike. Original or licensed
audio can still be matched or claimed. Other platforms have different systems.

These compositions were generated with AI assistance and iterated through user direction.
That history does not guarantee exclusive copyright in every generated note. Under the
US Copyright Office's stated approach, protectable human authorship is assessed separately
from purely AI-generated material; other jurisdictions may differ. Preserve evidence of
your actual human selection, arrangement and edits. This is not a jurisdiction-specific
legal opinion or a registration determination.

The adjacent cover is original locally drawn artwork, not downloaded stock art or copied
game sprites. {art} {font_note} The editable art/design sources are in `artwork/covers/{title}` at the
repository root. This provenance is not a guarantee of copyrightability or a licence for
unrelated assets. The image/type revision does not clear any music-sample obligations above.

## Sources and limitations

{links}

**Bottom line:** {group['bottom_line']} This is informational guidance, not legal advice.
"""


def readme(songs):
    rows = []
    for index, song in enumerate(songs, 1):
        title = song["title"]
        path = bundle_path(song).as_posix()
        kind = "loop preview" if song["kind"] == "loop" else "one-shot"
        rows.append(
            f"| {index:02d} | [{title}]({path}/{title}.strudel) | {song['role']} | "
            f"{song['bpm']} | 0-{song['end_cycle']} | {display_duration(song)} {kind} | "
            f"[Cover]({path}/cover.png) / [Rights]({path}/RIGHTS.md) |"
        )
    return """# STRUDEL - Subwoofer Lullabies

Fourteen latest-version compositions and cues, including the original Eurodance learning
loop. Earlier revisions and cassette dialogue recordings are deliberately not duplicated.
The original game sources remain untouched.

## Albums and standalone tracks

**[YeetThatGlowStick](YeetThatGlowStick/README.md)** groups the twelve retro/chiptune
game tracks, from anticipation through perseverance, with its own
[album cover](YeetThatGlowStick/cover.png) and [track gallery](YeetThatGlowStick/index.html).
The non-chiptune **serenity** and independent **euphoria** remain separate title folders.

**[Browse the cover gallery](index.html)**. Every title folder contains exactly:
`title.strudel`, an original **2048 x 2048 PNG** `cover.png`, and a tailored `RIGHTS.md`.
Song titles and title paths are always lowercase. The one-word titles name the intended emotion; previous working titles remain in source
comments for provenance. All game music follows **Blim**, not the Guide's off-screen life.

| # | Title | Use | BPM | Export cycles | Duration | Artwork / note |
|---|---|---|---:|---|---|---|
""" + "\n".join(rows) + """

## Playback

These are editable **Strudel sources, not rendered WAV/MP3 files**. Paste one complete
file into https://strudel.cc/ and start from a stopped clock. One-shot clocks may keep
running after the notes end; Stop and Play to replay. Sampled instruments need network
access initially. Let them load before recording/exporting the complete track.

Use the table's export cycles, 48000 Hz, and Multi Channel Orbits **off** for a stereo
preview. Loop durations describe one full written form, not a mastered seamless loop.
Do not cut off echoes or assume a cold export makes a click-free repeating asset.
serenity is the latest sparse 60-BPM version, with water gain 0.1 and export end 44.

courage is a retained legacy headlamp proposal; **loss** is the current C-19 cinematic.
loss defaults to the 20-second preview with `cassetteHoldSeconds = 0`; the complete
recorded cassette requires a separately coordinated longer film/score hold.

anticipation and vulnerability retain their selectable stem/handoff modes. determination
retains its story presets; hope retains the post-final-journal preset. The collection does
not change those defaults or fix historical source quirks.

The original `CUE_SHEET.txt` and `MENU_LEVEL01_TRANSITION.txt` are archived here as reference
snapshots; their old filenames and paths refer to the game project. Source comments naming
these documents refer to these root-level copies. `catalog.json` maps every new title to
its original file and records byte-level source/cover hashes.

## Rights are assessed, not guaranteed

Each `RIGHTS.md` is specific to its source's instruments and provenance. The estimates
are qualitative: **no invented percentages, automated-claim clearance or "copyright-free"
guarantee**. Composition copyright, sample permission, automated claims and eligibility
to claim other people's videos are different matters. No audio was uploaded for checking.

Do not infer a blanket music/sample licence from this repository. Read the sampled-track
notes in particular before release, attribution or Content ID enrolment.

## Original cover artwork

The twelve retro game cues have original **256 x 256 layered pixel illustrations**.
**serenity** and **euphoria** have smooth **2048 x 2048 digital illustrations**, not pixel art.
All retro/pixel covers use **Cascadia Mono** for titles, wordmarks, captions and numbers.
The two smooth covers retain **Segoe UI Light / Segoe UI**. All fourteen share lowercase
type, consistent spacing and restrained labels. Pixel scenes are enlarged 8x with nearest-neighbor scaling; lettering
is composed separately, so the finished covers are not exclusively pixel-grid exports.
No characters are depicted: empty spaces, worn infrastructure, objects and light carry
the story and its emotion.

[Artwork sources and export instructions](../artwork/covers/README.md) live separately
from the three-file song bundles. Each pixel scene is a standalone seven-layer SpriteCanvas
project, below the editor's cell limit. Image scenes retain their original drawing recipes;
every cover has an editable typography design. No stock imagery, copied game sprites or
font files are distributed. SpriteCanvas's shared model and renderer run locally without
changing the live studio. No image-generation service or review proposal was used.

## Rebuilding a separate copy

The packaging inputs are in `..\\tools`. The builder needs Python with Pillow and the
saved artwork sources/exports in `..\\artwork\\covers` and `..\\artwork\\albums`.
Album membership and order come from `tools/album_catalog.json`. It refuses to overwrite
an existing output, checks that source files do not change during the copy, and stages
the collection before publishing the completed folder. It copies current checked artwork
exports rather than regenerating earlier cover designs.

```powershell
python .\\tools\\build_library.py --source-dir "C:\\path\\to\\game\\Assets\\Audio\\Music\\Strudel" --output "C:\\path\\to\\new-library"
python .\\tools\\build_library.py --verify-only --output ".\\STRUDEL"
```

euphoria's recovered chat source is kept in `..\\tools\\sources`. Rebuild instructions
run from the repository root, not from inside STRUDEL.
"""


def gallery(songs, album=None):
    cards = []
    for i, song in enumerate(songs, 1):
        t = html.escape(song["title"])
        path = t if album else bundle_path(song).as_posix()
        cards.append(f"""<article>
<a href="{path}/cover.png" aria-label="Open {t} cover"><img src="{path}/cover.png" alt="{t}: {html.escape(song['emotion'])}" width="2048" height="2048" loading="lazy"></a>
<div class="body"><div class="eyebrow">{i:02d} / {html.escape(song['genre'])}</div>
<h2>{t}</h2><p>{html.escape(song['emotion'])}</p>
<div class="meta">{song['bpm']} BPM / {display_duration(song)} / {song['kind']}</div>
<nav><a href="{path}/{t}.strudel">Music source</a><a href="{path}/RIGHTS.md">Rights note</a></nav></div></article>""")
    if album:
        title = html.escape(album["title"])
        heading = f"""<h1>{title}</h1><div class="album">
<a href="cover.png"><img src="cover.png" alt="{title} album cover" width="2048" height="2048"></a>
<div><p>{html.escape(album['description'])}</p>
<p>{len(songs)} editable Strudel tracks. Not rendered audio or a rights-cleared release.</p>
<nav><a href="README.md">Album notes</a><a href="../index.html">Full collection</a></nav></div></div>"""
    else:
        title = "STRUDEL | Subwoofer Lullabies"
        heading = """<h1>Small lights.<br>Long echoes.</h1>
<p>Fourteen original AI-assisted compositions and cues. Twelve retro tracks in
YeetThatGlowStick; serenity and euphoria remain standalone. Editable source music,
not audio playback or a rights-cleared release.</p>
<div class="album"><a href="YeetThatGlowStick/index.html">
<img src="YeetThatGlowStick/cover.png" alt="YeetThatGlowStick album cover" width="2048" height="2048"></a>
<div><h2>YeetThatGlowStick</h2><p>The twelve-track retro game soundtrack.</p>
<nav><a href="YeetThatGlowStick/index.html">Open album</a><a href="README.md">Full catalogue</a></nav></div></div>"""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
""" + """<style>
:root{color-scheme:dark;font-family:Segoe UI,system-ui,sans-serif;background:#091d24;color:#dddcca}
*{box-sizing:border-box}body{margin:0}header,main,footer{max-width:1440px;margin:auto;padding:48px 32px}
header{padding-bottom:20px}h1{font-weight:300;font-size:clamp(2.5rem,6vw,5rem);margin:14px 0}
.eyebrow{letter-spacing:.18em;font-size:.7rem;color:#8bc5ba}header p{max-width:760px;line-height:1.8;color:#afbfbc}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:28px}
article{background:#10272f;border:1px solid #24434b;border-radius:4px;overflow:hidden}
img{display:block;width:100%;height:auto;aspect-ratio:1}a{color:#a8d9cb;text-decoration:none}
a:hover{text-decoration:underline}a:focus-visible{outline:2px solid #f0dba3;outline-offset:4px}
.body{padding:22px}h2{font-size:1.8rem;font-weight:300;margin:10px 0}.body p{min-height:76px;line-height:1.55;color:#afbfbc}
.meta{font-size:.75rem;color:#afbfbc}nav{display:flex;gap:20px;margin-top:22px;font-size:.8rem}
.album{display:flex;gap:32px;align-items:center;margin-top:32px}.album>a{flex:0 0 280px}
.album img{max-width:280px}.album p{max-width:620px}
footer{font-size:.8rem;line-height:1.7;color:#afbfbc;border-top:1px solid #24434b}
@media(max-width:680px){.album{display:block}.album img{max-width:100%}}
@media(max-width:520px){header,main,footer{padding:24px 18px}}
</style></head><body><header><div class="eyebrow">SUBWOOFER LULLABIES / THE STRUDEL COLLECTION</div>
""" + heading + "</header><main>\n" + "\n".join(cards) + """
</main><footer>Original environmental artwork; lowercase song titles. Existing game scores are preserved;
the learning loop was recovered from the conversation. Read each rights note before publishing.
No probability of automated claims or universal copyright clearance is promised.</footer></body></html>
"""


def album_readme(album, songs):
    rows = "\n".join(
        f"| {i:02d} | [{s['title']}]({s['title']}/{s['title']}.strudel) | {s['role']} | "
        f"[Cover]({s['title']}/cover.png) / [Rights]({s['title']}/RIGHTS.md) |"
        for i, s in enumerate(songs, 1)
    )
    return f"""# {album['title']}

{album['description']}

![{album['title']} album cover](cover.png)

**[Browse this album](index.html)** / **[Full collection](../README.md)**

## Track list

| # | Song | Arrangement | Artwork / note |
|---|---|---|---|
{rows}

Only the twelve retro/chiptune tracks belong to this album. The non-chiptune
[serenity](../serenity/serenity.strudel) and independent
[euphoria](../euphoria/euphoria.strudel) remain outside it. Song titles stay lowercase;
the album keeps the requested **YeetThatGlowStick** name.

These are preserved Strudel sources, not a mastered audio album. See the
[collection playback/export guide](../README.md#playback) for timing and sample loading.
The original [cue sheet](../CUE_SHEET.txt) and
[menu transition](../MENU_LEVEL01_TRANSITION.txt) remain at the collection root.
courage is the legacy discovery cue; loss is the current C-19 cinematic score.

## Cover and rights

The original album cover uses character-free environmental pixel art and clean
monospace lettering. [Editable source, typography and provenance](../../artwork/albums/{album['title']}/README.md)
are saved separately; each track keeps its own individual cover.

Read every track's linked rights note before publishing audio. In particular,
anticipation, vulnerability and perseverance retain unresolved TR707 sample provenance.
Grouping these sources into an album does not clear sample permissions, establish
exclusive copyright or guarantee acceptance by YouTube, SoundCloud or Content ID.

`album.json` records track order, local score paths and cover hashes.
"""


def write_collection_pages(output, manifest):
    songs = manifest["songs"]
    records = {song["title"]: song for song in songs}
    for album in manifest["albums"]:
        folder = output / album["directory"]
        folder.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ALBUM_ARTWORK / album["title"] / "cover.png", folder / "cover.png")
        tracks = [records[title] for title in album["tracks"]]
        (folder / "README.md").write_text(album_readme(album, tracks), encoding="utf-8", newline="\n")
        (folder / "index.html").write_text(gallery(tracks, album), encoding="utf-8", newline="\n")
        (folder / "album.json").write_text(json.dumps({
            "title": album["title"], "description": album["description"],
            "audio_rendered": False, "cover": "cover.png", "cover_sha256": album["cover_sha256"],
            "tracks": [{"number": i, "title": s["title"], "source": f"{s['title']}/{s['title']}.strudel",
                        "source_sha256": s["source_sha256"], "cover_sha256": s["cover_sha256"]}
                       for i, s in enumerate(tracks, 1)],
        }, indent=2) + "\n", encoding="utf-8", newline="\n")
    (output / "catalog.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")
    (output / "README.md").write_text(readme(songs), encoding="utf-8", newline="\n")
    (output / "index.html").write_text(gallery(songs), encoding="utf-8", newline="\n")


def verify_cover(path, expected_hash):
    if sha256(path) != expected_hash:
        raise ValueError(f"Cover changed: {path}")
    with Image.open(path) as image:
        if image.size != (2048, 2048) or image.mode not in {"RGB", "RGBA"} or image.format != "PNG":
            raise ValueError(f"Incorrect cover format: {path}")
        image.verify()
    with Image.open(path) as image:
        if image.mode == "RGBA" and image.getchannel("A").getextrema() != (255, 255):
            raise ValueError(f"Cover background must be opaque: {path}")


def verify(output):
    manifest = json.loads((output / "catalog.json").read_text(encoding="utf-8"))
    songs = manifest["songs"]
    canonical = json.loads((TOOLS / "song_catalog.json").read_text(encoding="utf-8"))
    if len(songs) != 14 or [s["title"] for s in songs] != [s["title"] for s in canonical]:
        raise ValueError("The selected collection must match the canonical 14-song catalog.")
    validate_albums(songs)
    if any(not re.fullmatch(r"[a-z]+", song["title"]) for song in songs):
        raise ValueError("Every song title must be one lowercase ASCII word.")
    folders = {path.name for path in output.iterdir() if path.is_dir()}
    if folders != {bundle_path(song).parts[0] for song in songs}:
        raise ValueError("Unexpected or missing album/standalone folders.")
    expected_albums = album_sources()
    if manifest.get("albums") != expected_albums:
        raise ValueError("Stale or missing album metadata.")
    for album in expected_albums:
        folder = output / album["directory"]
        expected = set(album["tracks"]) | {"cover.png", "README.md", "index.html", "album.json"}
        if {p.name for p in folder.iterdir()} != expected:
            raise ValueError(f"Incomplete album: {folder}")
        verify_cover(folder / "cover.png", album["cover_sha256"])
        info = json.loads((folder / "album.json").read_text(encoding="utf-8"))
        tracks = [next(s for s in songs if s["title"] == t) for t in album["tracks"]]
        expected_tracks = [
            {"number": i, "title": s["title"], "source": f"{s['title']}/{s['title']}.strudel",
             "source_sha256": s["source_sha256"], "cover_sha256": s["cover_sha256"]}
            for i, s in enumerate(tracks, 1)
        ]
        if (info["tracks"] != expected_tracks or info["title"] != album["title"]
                or info["cover"] != "cover.png" or info["cover_sha256"] != album["cover_sha256"]
                or info["description"] != album["description"] or info["audio_rendered"] is not False):
            raise ValueError(f"Stale album track list: {folder}")
        if ((folder / "README.md").read_text(encoding="utf-8") != album_readme(album, tracks)
                or (folder / "index.html").read_text(encoding="utf-8") != gallery(tracks, album)):
            raise ValueError(f"Stale album documentation: {folder}")
    covers = set()
    for song in songs:
        if any(song.get(key) != value for key, value in location(song).items()):
            raise ValueError(f"Incorrect album membership/path: {song['title']}")
        folder = output / bundle_path(song)
        expected = {f"{song['title']}.strudel", "cover.png", "RIGHTS.md"}
        if {path.name for path in folder.iterdir()} != expected:
            raise ValueError(f"Incomplete bundle: {folder}")
        if sha256(folder / f"{song['title']}.strudel") != song["source_sha256"]:
            raise ValueError(f"Source changed: {folder}")
        cover_hash = sha256(folder / "cover.png")
        if cover_hash != song["cover_sha256"] or cover_hash in covers:
            raise ValueError(f"Cover changed or duplicated: {folder}")
        covers.add(cover_hash)
        verify_cover(folder / "cover.png", song["cover_sha256"])
        note = (folder / "RIGHTS.md").read_text(encoding="utf-8")
        if song["source_sha256"] not in note or "Educated estimate" not in note or "https://" not in note:
            raise ValueError(f"Incomplete rights note: {folder}")
        if note.count("\n## VERDICT\n") != 1:
            raise ValueError(f"Missing or duplicate platform verdict section: {folder}")
        verdict = note.split("\n## VERDICT\n", 1)[1].split("\n## ", 1)[0]
        lines = [line for line in verdict.splitlines() if line.startswith("- ")]
        prefixes = ["- **YouTube:** ", "- **SoundCloud:** "]
        if len(lines) != 2 or any(
            not line.startswith(prefix) or not line[len(prefix):].strip()
            for line, prefix in zip(lines, prefixes)
        ):
            raise ValueError(f"Expected one verdict line per platform: {folder}")
    if covers.intersection(album["cover_sha256"] for album in expected_albums):
        raise ValueError("The album needs its own cover, not a reused song cover.")
    if ((output / "README.md").read_text(encoding="utf-8") != readme(songs)
            or (output / "index.html").read_text(encoding="utf-8") != gallery(songs)):
        raise ValueError("Stale collection documentation.")
    print("14 complete bundles: 12 album tracks, 2 standalone tracks, preserved scores and checked covers/rights.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "STRUDEL")
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    output = args.output.resolve()
    if args.verify_only:
        verify(output)
        return
    if args.source_dir is None:
        parser.error("--source-dir is required when building")
    source_directory = args.source_dir.resolve(strict=True)
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite an existing collection: {output}")
    songs = json.loads((TOOLS / "song_catalog.json").read_text(encoding="utf-8"))
    research = json.loads((TOOLS / "rights_research.json").read_text(encoding="utf-8"))
    if len(songs) != 14 or len({s["title"] for s in songs}) != 14:
        raise ValueError("Expected 14 unique titles.")
    if any(not re.fullmatch(r"[a-z]+", s["title"]) for s in songs):
        raise ValueError("Every title must be one lowercase ASCII word.")
    validate_albums(songs)
    artwork, covers = cover_sources(songs)
    albums = album_sources()
    art_records = {record["title"]: record for record in artwork["songs"]}
    hashes = {s["title"]: sha256(source_for(s, source_directory)) for s in songs}
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".strudel-stage-", dir=output.parent) as temporary:
        stage = Path(temporary) / "collection"
        stage.mkdir()
        records = []
        for number, song in enumerate(songs, 1):
            title = song["title"]
            folder = stage / bundle_path(song)
            folder.mkdir(parents=True)
            source = source_for(song, source_directory)
            shutil.copyfile(source, folder / f"{title}.strudel")
            shutil.copyfile(covers[title], folder / "cover.png")
            (folder / "RIGHTS.md").write_text(
                rights_note(song, hashes[title], research), encoding="utf-8", newline="\n")
            records.append({
                **song, **location(song), "duration_seconds": round(duration(song), 6),
                "source_sha256": hashes[title], "cover_sha256": sha256(folder / "cover.png"),
                "source_origin": "recovered-chat-example" if title == "euphoria" else "game-project-current-source",
                "cover_source": f"..\\artwork\\covers\\{title}\\{art_records[title]['source']}",
                "cover_design": f"..\\artwork\\covers\\{title}\\design.json",
            })
            print(f"{number:02d}/14 {title}", flush=True)
        for name in ["CUE_SHEET.txt", "MENU_LEVEL01_TRANSITION.txt"]:
            shutil.copyfile(source_directory / name, stage / name)
        write_collection_pages(stage, {
            "created": research["review_date"],
            "scope": "Latest version of 13 game scores/cues plus the original Eurodance learning loop.",
            "audio_rendered": False,
            "cover_art": artwork["description"],
            "albums": albums,
            "songs": records,
        })
        for song in songs:
            if sha256(source_for(song, source_directory)) != hashes[song["title"]]:
                raise RuntimeError(f"Source changed during packaging: {song['source']}; nothing published.")
        verify(stage)
        stage.rename(output)
    print(f"Created {output}")


if __name__ == "__main__":
    main()
