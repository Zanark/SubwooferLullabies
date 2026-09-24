# STRUDEL - Subwoofer Lullabies

Fourteen latest-version compositions and cues, including the original Eurodance learning
loop. Earlier revisions and cassette dialogue recordings are deliberately not duplicated.
The original game sources remain untouched.

**[Browse the cover gallery](index.html)**. Every title folder contains exactly:
`Title.strudel`, an original **2048 x 2048 RGB PNG** `cover.png`, and a tailored `RIGHTS.md`.
The one-word titles name the intended emotion; previous working titles remain in source
comments for provenance. All game music follows **Blim**, not the Guide's off-screen life.

| # | Title | Use | BPM | Export cycles | Duration | Artwork / note |
|---|---|---|---:|---|---|---|
| 01 | [Anticipation](Anticipation/Anticipation.strudel) | Main menu | 92 | 0-32 | 1:23.478 loop preview | [Cover](Anticipation/cover.png) / [Rights](Anticipation/RIGHTS.md) |
| 02 | [Dismay](Dismay/Dismay.strudel) | Opening cinematic | 80 | 0-10 | 30.000s one-shot | [Cover](Dismay/cover.png) / [Rights](Dismay/RIGHTS.md) |
| 03 | [Vulnerability](Vulnerability/Vulnerability.strudel) | Level 1 / First Light | 92 | 0-32 | 1:23.478 loop preview | [Cover](Vulnerability/cover.png) / [Rights](Vulnerability/RIGHTS.md) |
| 04 | [Delight](Delight/Delight.strudel) | Item discovery stinger | 120 | 0-1 | 2.000s one-shot | [Cover](Delight/cover.png) / [Rights](Delight/RIGHTS.md) |
| 05 | [Curiosity](Curiosity/Curiosity.strudel) | Level 2 / Someone Was Here | 88 | 0-32 | 1:27.273 loop preview | [Cover](Curiosity/cover.png) / [Rights](Curiosity/RIGHTS.md) |
| 06 | [Determination](Determination/Determination.strudel) | Level 3 / The Long Climb | 96 | 0-32 | 1:20.000 loop preview | [Cover](Determination/cover.png) / [Rights](Determination/RIGHTS.md) |
| 07 | [Loss](Loss/Loss.strudel) | Late-Level-3 C-19 cinematic | 96 | 0-8 | 20.000s one-shot | [Cover](Loss/cover.png) / [Rights](Loss/RIGHTS.md) |
| 08 | [Courage](Courage/Courage.strudel) | Legacy headlamp discovery proposal | 96 | 0-3 | 7.500s one-shot | [Cover](Courage/cover.png) / [Rights](Courage/RIGHTS.md) |
| 09 | [Resilience](Resilience/Resilience.strudel) | Level 4 / Flood Levels | 80 | 0-32 | 1:36.000 loop preview | [Cover](Resilience/cover.png) / [Rights](Resilience/RIGHTS.md) |
| 10 | [Hope](Hope/Hope.strudel) | Level 5 / Near the Surface | 88 | 0-32 | 1:27.273 loop preview | [Cover](Hope/cover.png) / [Rights](Hope/RIGHTS.md) |
| 11 | [Relief](Relief/Relief.strudel) | Surface ending | 80 | 0-9 | 27.000s one-shot | [Cover](Relief/cover.png) / [Rights](Relief/RIGHTS.md) |
| 12 | [Perseverance](Perseverance/Perseverance.strudel) | Complete game theme | 92 | 0-64 | 2:46.957 one-shot | [Cover](Perseverance/cover.png) / [Rights](Perseverance/RIGHTS.md) |
| 13 | [Serenity](Serenity/Serenity.strudel) | Deep-calm underwater jazz theme | 60 | 0-44 | 2:56.000 one-shot | [Cover](Serenity/cover.png) / [Rights](Serenity/RIGHTS.md) |
| 14 | [Euphoria](Euphoria/Euphoria.strudel) | Original Eurodance learning loop | 128 | 0-4 | 7.500s loop preview | [Cover](Euphoria/cover.png) / [Rights](Euphoria/RIGHTS.md) |

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

The packaging inputs and original cover renderer are in `..\tools`. The builder needs
Python with Pillow and NumPy, and the Windows Segoe UI fonts. It refuses to overwrite
an existing output, checks that source files do not change during the copy, and stages
the collection before publishing the completed folder.

```powershell
python .\tools\build_library.py --source-dir "C:\path\to\game\Assets\Audio\Music\Strudel" --output "C:\path\to\new-library"
python .\tools\build_library.py --verify-only --output ".\STRUDEL"
```

Euphoria's recovered chat source is kept in `..\tools\sources`. Rebuild instructions
run from the repository root, not from inside STRUDEL.
