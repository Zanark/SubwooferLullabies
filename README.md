# SubwooferLullabies
Music generated with code

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

The `deployment/pages` branch contains a Vite and TypeScript static site for
GitHub Pages. It presents the collection as a PS1-inspired cassette archive:
search or browse the album grid, click a song or drag a cassette into the
fictional portable player, inspect both cassette sides, and play the rendered
track in theater mode.

```powershell
npm install
npm run dev
npm run build
```

The checked `site/public/audio` MP3 previews are derived from the verified local
WAV exports. Run `npm run audio:encode` only after intentionally regenerating
the complete `AUDIO` manifest. The Pages workflow builds and deploys only from
`deployment/pages`; the repository's Pages source must remain **GitHub Actions**.
The player is an original design and is not affiliated with Sony or another
hardware manufacturer.

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
