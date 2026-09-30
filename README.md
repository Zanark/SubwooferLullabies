<p align="center">
  <img src="docs/assets/subwoofer-lullabies-logo.svg" alt="Subwoofer Lullabies" width="820">
</p>

<p align="center">
  Original code-composed music, editable Strudel scores and a PS1-style cassette player.
</p>

<p align="center">
  <a href="https://zanark.github.io/SubwooferLullabies/"><strong>Play the cassette archive</strong></a>
  · <a href="STRUDEL/README.md">Browse the scores</a>
  · <a href="artwork/covers/index.html">View the cover gallery</a>
</p>

## STRUDEL collection

[Browse the cover gallery](STRUDEL/index.html) or [open the track catalogue](STRUDEL/README.md).

Each of the **14 one-word song folders** contains its current `.strudel` score, an
original `cover.png`, and a source-specific `RIGHTS.md` upload-risk assessment.
The collection includes the game music, both themes, short cues, and the original
Eurodance learning loop. Older revisions are not duplicated.

The music files are editable sources, not rendered audio. Copyright notes explain
known sample obligations and remaining uncertainty; they are not legal clearance or
a promise that uploads will never receive automated claims.

## Playable audio

The collection can be rendered locally as **stereo 48 kHz, 16-bit PCM WAVs** using
Strudel's browser audio engine. From the repository root, with Node.js 24 and
Microsoft Edge installed:

```powershell
node .\tools\export_audio.mjs
```

Open `AUDIO\index.html` afterward to listen or download individual files.
The twelve album WAVs are in `AUDIO\YeetThatGlowStick`; `serenity.wav` and
`euphoria.wav` are at the audio root. `AUDIO\manifest.json` records source/audio
hashes, cycle ranges, signal measurements, loaded samples and engine asset URLs.

Exports use the saved score defaults and catalogue durations. Loop tracks contain
one complete written form, not an automatically mastered seamless loop. No automatic
normalization or extra fades are added. An explicit reduction such as
`--gain-db euphoria=-3` prevents clipping without changing the score; it is recorded
in the manifest and player. Sample loading requires internet access;
the finished WAVs play offline. Rendering does not resolve the existing sample
permissions or attribution requirements.

The exporter uses isolated temporary browser profiles and closes them when finished.
It resumes only matching, hash-checked exports; it refuses stale or unrecorded files.
For a fresh output use `--output "C:\path\to\audio"`; use `--titles anticipation,serenity`
to select tracks or `--browser "C:\path\to\chrome.exe"` for another Chromium browser.
Generated `AUDIO` files are Git-ignored and are not automatically published.

## Playable website

[Open the live PS1 cassette desk](https://zanark.github.io/SubwooferLullabies/).

![The PS1-style cassette archive with its searchable library, tape queue, Three.js room and fictional portable player.](docs/assets/cassette-archive-room.png)

Browse or search by title, move physical tapes around Zanark's room, load one into
the fictional player or build a persistent drag-and-drop queue. The complete
experience includes a transparent two-second cassette inspection, mechanical
transport controls, animated reels, physical room-light switches, cover-reactive
lighting and a convex CRT with fourteen live audio-reactive signals.

The illustrated [website guide](docs/website.md) documents every interaction, the
queue model, all CRT signals, responsive behavior, Three.js/Vite architecture,
design invariants and the branch-restricted GitHub Pages pipeline.

```powershell
npm install
npm run dev
npm run build
```

The Vite, TypeScript and Three.js site deploys only from `deployment/pages`.
Its checked MP3 previews come from the verified local WAV exports. The player
is an original design and is not affiliated with Sony or another manufacturer.

## Songs

### [YeetThatGlowStick](STRUDEL/YeetThatGlowStick/README.md)

The **12-track retro game album**, with its own
[cover](STRUDEL/YeetThatGlowStick/cover.png) and [gallery](STRUDEL/YeetThatGlowStick/index.html).

![YeetThatGlowStick album cover](STRUDEL/YeetThatGlowStick/cover.png)

| Song | Arrangement |
|---|---|
| [anticipation](STRUDEL/YeetThatGlowStick/anticipation/anticipation.strudel) | Retro main-menu ambience |
| [dismay](STRUDEL/YeetThatGlowStick/dismay/dismay.strudel) | Opening cinematic |
| [vulnerability](STRUDEL/YeetThatGlowStick/vulnerability/vulnerability.strudel) | Level 1 / first light |
| [delight](STRUDEL/YeetThatGlowStick/delight/delight.strudel) | Item-discovery stinger |
| [curiosity](STRUDEL/YeetThatGlowStick/curiosity/curiosity.strudel) | Level 2 / human traces |
| [determination](STRUDEL/YeetThatGlowStick/determination/determination.strudel) | Level 3 / the long climb |
| [loss](STRUDEL/YeetThatGlowStick/loss/loss.strudel) | C-19 headlamp cinematic |
| [courage](STRUDEL/YeetThatGlowStick/courage/courage.strudel) | Legacy headlamp-discovery cue |
| [resilience](STRUDEL/YeetThatGlowStick/resilience/resilience.strudel) | Level 4 / floodwater |
| [hope](STRUDEL/YeetThatGlowStick/hope/hope.strudel) | Level 5 / near the surface |
| [relief](STRUDEL/YeetThatGlowStick/relief/relief.strudel) | Surface-ending cinematic |
| [perseverance](STRUDEL/YeetThatGlowStick/perseverance/perseverance.strudel) | Complete retro game theme |

### Standalone tracks

These non-chiptune tracks remain outside the album.

| Song | Arrangement |
|---|---|
| [serenity](STRUDEL/serenity/serenity.strudel) | Deep-calm underwater jazz |
| [euphoria](STRUDEL/euphoria/euphoria.strudel) | Independent Eurodance learning loop |

## Genre-aware cover artwork

Song titles and title paths are always **lowercase**. Twelve retro cues have newly drawn
**256 x 256 pixel scenes** with seven editable SpriteCanvas layers. **serenity** and
**euphoria** instead use smooth, original high-resolution illustrations.

All covers are **2048 x 2048**, with consistent lowercase layout. Retro/pixel covers
use **Cascadia Mono** for every text element; the two smooth covers retain **Segoe UI**.
Pixel illustration and high-resolution lettering remain separate editable sources.
Cover storytelling is environmental only: empty spaces, weathered infrastructure,
objects and light convey the emotion, with no depicted characters.
[Artwork sources and export instructions](artwork/covers/README.md) and the
[artwork gallery](artwork/covers/index.html) are saved separately from the songs.
The [album artwork sources](artwork/albums/YeetThatGlowStick/README.md) are separate
from those individual song designs. Each song keeps its own cover, score and rights note.
Decorative droplet symbols have been removed; water and reflections appear only as part
of the environment. The album reorganization and artwork changes do not alter the music.
