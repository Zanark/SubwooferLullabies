# STRUDEL - Subwoofer Lullabies

Fourteen latest-version compositions and cues, including the original Eurodance learning
loop. Earlier revisions and cassette dialogue recordings are deliberately not duplicated.
The original game sources remain untouched.

**[Browse the cover gallery](index.html)**. Every title folder contains exactly:
`title.strudel`, an original **2048 x 2048 PNG** `cover.png`, and a tailored `RIGHTS.md`.
Song titles and title paths are always lowercase. The one-word titles name the intended emotion; previous working titles remain in source
comments for provenance. All game music follows **Blim**, not the Guide's off-screen life.

| # | Title | Use | BPM | Export cycles | Duration | Artwork / note |
|---|---|---|---:|---|---|---|
| 01 | [anticipation](anticipation/anticipation.strudel) | Main menu | 92 | 0-32 | 1:23.478 loop preview | [Cover](anticipation/cover.png) / [Rights](anticipation/RIGHTS.md) |
| 02 | [dismay](dismay/dismay.strudel) | Opening cinematic | 80 | 0-10 | 30.000s one-shot | [Cover](dismay/cover.png) / [Rights](dismay/RIGHTS.md) |
| 03 | [vulnerability](vulnerability/vulnerability.strudel) | Level 1 / First Light | 92 | 0-32 | 1:23.478 loop preview | [Cover](vulnerability/cover.png) / [Rights](vulnerability/RIGHTS.md) |
| 04 | [delight](delight/delight.strudel) | Item discovery stinger | 120 | 0-1 | 2.000s one-shot | [Cover](delight/cover.png) / [Rights](delight/RIGHTS.md) |
| 05 | [curiosity](curiosity/curiosity.strudel) | Level 2 / Someone Was Here | 88 | 0-32 | 1:27.273 loop preview | [Cover](curiosity/cover.png) / [Rights](curiosity/RIGHTS.md) |
| 06 | [determination](determination/determination.strudel) | Level 3 / The Long Climb | 96 | 0-32 | 1:20.000 loop preview | [Cover](determination/cover.png) / [Rights](determination/RIGHTS.md) |
| 07 | [loss](loss/loss.strudel) | Late-Level-3 C-19 cinematic | 96 | 0-8 | 20.000s one-shot | [Cover](loss/cover.png) / [Rights](loss/RIGHTS.md) |
| 08 | [courage](courage/courage.strudel) | Legacy headlamp discovery proposal | 96 | 0-3 | 7.500s one-shot | [Cover](courage/cover.png) / [Rights](courage/RIGHTS.md) |
| 09 | [resilience](resilience/resilience.strudel) | Level 4 / Flood Levels | 80 | 0-32 | 1:36.000 loop preview | [Cover](resilience/cover.png) / [Rights](resilience/RIGHTS.md) |
| 10 | [hope](hope/hope.strudel) | Level 5 / Near the Surface | 88 | 0-32 | 1:27.273 loop preview | [Cover](hope/cover.png) / [Rights](hope/RIGHTS.md) |
| 11 | [relief](relief/relief.strudel) | Surface ending | 80 | 0-9 | 27.000s one-shot | [Cover](relief/cover.png) / [Rights](relief/RIGHTS.md) |
| 12 | [perseverance](perseverance/perseverance.strudel) | Complete game theme | 92 | 0-64 | 2:46.957 one-shot | [Cover](perseverance/cover.png) / [Rights](perseverance/RIGHTS.md) |
| 13 | [serenity](serenity/serenity.strudel) | Deep-calm underwater jazz theme | 60 | 0-44 | 2:56.000 one-shot | [Cover](serenity/cover.png) / [Rights](serenity/RIGHTS.md) |
| 14 | [euphoria](euphoria/euphoria.strudel) | Original Eurodance learning loop | 128 | 0-4 | 7.500s loop preview | [Cover](euphoria/cover.png) / [Rights](euphoria/RIGHTS.md) |

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

The packaging inputs are in `..\tools`. The builder needs Python with Pillow and the
saved artwork sources/exports in `..\artwork\covers`. It refuses to overwrite
an existing output, checks that source files do not change during the copy, and stages
the collection before publishing the completed folder. It copies current checked artwork
exports rather than regenerating earlier cover designs.

```powershell
python .\tools\build_library.py --source-dir "C:\path\to\game\Assets\Audio\Music\Strudel" --output "C:\path\to\new-library"
python .\tools\build_library.py --verify-only --output ".\STRUDEL"
```

euphoria's recovered chat source is kept in `..\tools\sources`. Rebuild instructions
run from the repository root, not from inside STRUDEL.
