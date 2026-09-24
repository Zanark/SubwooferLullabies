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

from draw_covers import render_cover

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def duration(song):
    return song["end_cycle"] * 240 / song["bpm"]


def display_duration(song):
    seconds = duration(song)
    return f"{seconds:.3f}s" if seconds < 60 else f"{int(seconds // 60)}:{seconds % 60:06.3f}"


def source_for(song, source_directory):
    if song["title"] == "Euphoria":
        return TOOLS / "sources" / "Euphoria.strudel"
    return source_directory / song["source"]


def rights_note(song, digest, research):
    group = research["groups"][song["sample_group"]]
    title = song["title"]
    if title == "Euphoria":
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
            "Anticipation and Vulnerability share substantial material; Perseverance and Serenity "
            "develop related motifs. Treat them as related arrangements when working with a "
            "distributor, rather than competing exclusive references."
        )
    sources = list(dict.fromkeys(research["common_source_ids"] + group["source_ids"]))
    links = "\n".join(
        f"- [{research['sources'][key]['title']}]({research['sources'][key]['url']}): "
        f"{research['sources'][key]['finding']}" for key in sources
    )
    actions = "\n".join(f"- {item}" for item in group["actions"])
    return f"""# {title} - upload and copyright risk note

**Reviewed:** {research['review_date']}  
**Track:** {song['role']} / formerly *{song['original_title']}*  
**Source file:** `{title}.strudel`  
**Source SHA-256:** `{digest}`

{song['emotion']}

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

The adjacent cover is an original locally generated geometric illustration, not downloaded
stock art or copied game sprites. It contains rasterized system-font lettering, not a
redistributed font file. That provenance reduces identified third-party-art concerns but
is not a guarantee of copyrightability or a licence for unrelated assets.

## Sources and limitations

{links}

**Bottom line:** {group['bottom_line']} This is informational guidance, not legal advice.
"""


def readme(songs):
    rows = []
    for index, song in enumerate(songs, 1):
        title = song["title"]
        kind = "loop preview" if song["kind"] == "loop" else "one-shot"
        rows.append(
            f"| {index:02d} | [{title}]({title}/{title}.strudel) | {song['role']} | "
            f"{song['bpm']} | 0-{song['end_cycle']} | {display_duration(song)} {kind} | "
            f"[Cover]({title}/cover.png) / [Rights]({title}/RIGHTS.md) |"
        )
    return """# STRUDEL - Subwoofer Lullabies

Fourteen latest-version compositions and cues, including the original Eurodance learning
loop. Earlier revisions and cassette dialogue recordings are deliberately not duplicated.
The original game sources remain untouched.

**[Browse the cover gallery](index.html)**. Every title folder contains exactly:
`Title.strudel`, an original **2048 x 2048 RGB PNG** `cover.png`, and a tailored `RIGHTS.md`.
The one-word titles name the intended emotion; previous working titles remain in source
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
Serenity is the latest sparse 60-BPM version, with water gain 0.1 and export end 44.

Courage is a retained legacy headlamp proposal; **Loss** is the current C-19 cinematic.
Loss defaults to the 20-second preview with `cassetteHoldSeconds = 0`; the complete
recorded cassette requires a separately coordinated longer film/score hold.

Anticipation and Vulnerability retain their selectable stem/handoff modes. Determination
retains its story presets; Hope retains the post-final-journal preset. The collection does
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

The covers are locally drawn, seeded geometric illustrations created for this collection.
No game sprites, stock imagery, web textures or third-party illustrations are included.
Each has its own scene, palette, emotion and one-word title. Rendered system-font lettering
is part of the PNG; no font binaries are included.

## Rebuilding a separate copy

The packaging inputs and original cover renderer are in `..\\tools`. The builder needs
Python with Pillow and NumPy, and the Windows Segoe UI fonts. It refuses to overwrite
an existing output, checks that source files do not change during the copy, and stages
the collection before publishing the completed folder.

```powershell
python .\\tools\\build_library.py --source-dir "C:\\path\\to\\game\\Assets\\Audio\\Music\\Strudel" --output "C:\\path\\to\\new-library"
python .\\tools\\build_library.py --verify-only --output ".\\STRUDEL"
```

Euphoria's recovered chat source is kept in `..\\tools\\sources`. Rebuild instructions
run from the repository root, not from inside STRUDEL.
"""


def gallery(songs):
    cards = []
    for i, song in enumerate(songs, 1):
        t = html.escape(song["title"])
        cards.append(f"""<article>
<a href="{t}/cover.png" aria-label="Open {t} cover"><img src="{t}/cover.png" alt="{t}: {html.escape(song['emotion'])}" width="2048" height="2048" loading="lazy"></a>
<div class="body"><div class="eyebrow">{i:02d} / {html.escape(song['genre'])}</div>
<h2>{t}</h2><p>{html.escape(song['emotion'])}</p>
<div class="meta">{song['bpm']} BPM / {display_duration(song)} / {song['kind']}</div>
<nav><a href="{t}/{t}.strudel">Music source</a><a href="{t}/RIGHTS.md">Rights note</a></nav></div></article>""")
    return """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>STRUDEL | Subwoofer Lullabies</title>
<style>
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
footer{font-size:.8rem;line-height:1.7;color:#afbfbc;border-top:1px solid #24434b}
@media(max-width:520px){header,main,footer{padding:24px 18px}}
</style></head><body><header><div class="eyebrow">SUBWOOFER LULLABIES / THE STRUDEL COLLECTION</div>
<h1>Small lights.<br>Long echoes.</h1>
<p>Fourteen original AI-assisted compositions and cues. One emotion, one score and one
original cover per folder. Editable source music; not audio playback or a rights-cleared release.</p>
<a href="README.md">Playback and catalogue notes</a></header><main>
""" + "\n".join(cards) + """
</main><footer>Original procedural cover artwork. Existing game scores are preserved;
the learning loop was recovered from the conversation. Read each rights note before publishing.
No probability of automated claims or universal copyright clearance is promised.</footer></body></html>
"""


def verify(output):
    manifest = json.loads((output / "catalog.json").read_text(encoding="utf-8"))
    songs = manifest["songs"]
    if len(songs) != 14:
        raise ValueError("The selected collection must have 14 songs.")
    folders = {path.name for path in output.iterdir() if path.is_dir()}
    if folders != {song["title"] for song in songs}:
        raise ValueError("Unexpected or missing title folders.")
    covers = set()
    for song in songs:
        folder = output / song["title"]
        expected = {f"{song['title']}.strudel", "cover.png", "RIGHTS.md"}
        if {path.name for path in folder.iterdir()} != expected:
            raise ValueError(f"Incomplete bundle: {folder}")
        if sha256(folder / f"{song['title']}.strudel") != song["source_sha256"]:
            raise ValueError(f"Source changed: {folder}")
        cover_hash = sha256(folder / "cover.png")
        if cover_hash != song["cover_sha256"] or cover_hash in covers:
            raise ValueError(f"Cover changed or duplicated: {folder}")
        covers.add(cover_hash)
        with Image.open(folder / "cover.png") as image:
            if image.size != (2048, 2048) or image.mode != "RGB" or image.format != "PNG":
                raise ValueError(f"Incorrect cover format: {folder}")
            image.verify()
        note = (folder / "RIGHTS.md").read_text(encoding="utf-8")
        if song["source_sha256"] not in note or "Educated estimate" not in note or "https://" not in note:
            raise ValueError(f"Incomplete rights note: {folder}")
    print("14 complete bundles: preserved scores, unique 2048-square RGB covers, tailored rights notes.")


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
    if any(not re.fullmatch(r"[A-Z][a-z]+", s["title"]) for s in songs):
        raise ValueError("Every title must be one ASCII word.")
    hashes = {s["title"]: sha256(source_for(s, source_directory)) for s in songs}
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".strudel-stage-", dir=output.parent) as temporary:
        stage = Path(temporary) / "collection"
        stage.mkdir()
        records = []
        for number, song in enumerate(songs, 1):
            title = song["title"]
            folder = stage / title
            folder.mkdir()
            source = source_for(song, source_directory)
            shutil.copyfile(source, folder / f"{title}.strudel")
            render_cover(song, number, folder / "cover.png")
            (folder / "RIGHTS.md").write_text(
                rights_note(song, hashes[title], research), encoding="utf-8", newline="\n")
            records.append({
                **song, "duration_seconds": round(duration(song), 6),
                "source_sha256": hashes[title], "cover_sha256": sha256(folder / "cover.png"),
                "source_origin": "recovered-chat-example" if title == "Euphoria" else "game-project-current-source",
            })
            print(f"{number:02d}/14 {title}", flush=True)
        for name in ["CUE_SHEET.txt", "MENU_LEVEL01_TRANSITION.txt"]:
            shutil.copyfile(source_directory / name, stage / name)
        (stage / "catalog.json").write_text(json.dumps({
            "created": research["review_date"],
            "scope": "Latest version of 13 game scores/cues plus the original Eurodance learning loop.",
            "audio_rendered": False,
            "cover_art": "Original local procedural illustrations; 2048x2048 RGB PNG.",
            "songs": records,
        }, indent=2) + "\n", encoding="utf-8")
        (stage / "README.md").write_text(readme(records), encoding="utf-8", newline="\n")
        (stage / "index.html").write_text(gallery(records), encoding="utf-8", newline="\n")
        for song in songs:
            if sha256(source_for(song, source_directory)) != hashes[song["title"]]:
                raise RuntimeError(f"Source changed during packaging: {song['source']}; nothing published.")
        verify(stage)
        stage.rename(output)
    print(f"Created {output}")


if __name__ == "__main__":
    main()
