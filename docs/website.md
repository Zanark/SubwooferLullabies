# Playable cassette archive

The [Subwoofer Lullabies cassette archive](https://zanark.github.io/SubwooferLullabies/)
turns the fourteen-track collection into an interactive PS1-style bedroom desk. It is
not a flat skin around an audio element: the room, tapes, hand, portable player, wall
switches and convex television are rendered as low-poly Three.js geometry.

![The complete desktop cassette archive, with the library and queue above the dark bedroom desk and fictional portable player.](assets/cassette-archive-room.png)

*The desktop composition keeps the searchable library and persistent queue above the
room. The Three.js room occupies the left two-thirds of the lower row; the fictional
SUBWAVE player occupies the right third.*

## 1. Experience map

```mermaid
flowchart TB
    A[Open the cassette archive]
    B{Choose a tape}
    C[Search or open an album]
    D[Click a song in the grid]
    E[Pick a random tape]
    F[Drag a physical desk cassette]
    G[Two-second transparent cassette inspection]
    P[Held cassette rotates in the dimmed left stage]
    H{Drop destination}
    I[Load into SUBWAVE player]
    J[Append to persistent queue]
    K[Play browser audio]
    L[Animate reels and progress]
    M[Illuminate matching desk tape]
    N[Drive CRT cover and visualizer]
    O[Advance to next queued tape]

    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    C --> D
    D --> I
    E --> G
    F --> P
    P --> H
    G --> I
    H --> I
    H --> J
    I --> K
    J --> K
    K --> L
    K --> M
    K --> N
    K --> O
    O --> K
```

Grid-card clicks play the physical transport thunk, wait 30ms, then load and autoplay
directly without dimming the page, making the player glow or running the cassette
inspection. Flows that retain the transparent inspection rotate the cassette for two
seconds, showing its handwritten title on the front and the track artwork on the back
without replacing the room with a theater.

## 2. Finding and handling tapes

The library offers three paths into the same physical interaction:

- Search matches song titles only. Matching cassettes rise from the desk, rotate and
  sit under warm spotlights whose sources remain above the visible room framing.
- Album and standalone cover cards open a grid of songs. Clicking a song plays the
  transport thunk and automatically starts it after a 30ms mechanical pause, without
  player focus or cassette rotation. Dragging the card keeps the physical
  cassette-handling flow. A song can also be selected for the queue. Open albums keep
  exactly three songs in each row and expose only one complete row at a time; later
  rows remain inside the fixed library area and are reached by vertical scrolling.
- **Play a random tape** chooses a non-current song without clearing or rearranging
  the saved queue.

Every physical cassette can be repositioned on the desk. Hovering or dragging a tape
summons a transparent low-poly hand; while the tape remains held, a larger copy rotates
continuously at three-quarters of the standard inspection speed in the dimmed left
stage so its handwritten front and artwork back remain visible. Releasing, cancelling
or dropping the tape removes that held preview immediately. A physically held tape
loads without replaying the separate two-second inspection. Empty room space and
ordinary controls retain the native pointer. Pointer capture, cancellation handling
and edge auto-scroll allow the same interaction to work with mouse or touch.

Picking up a physical cassette, dragging a library card or starting the transparent
two-second cassette showcase automatically enters **player focus**. The masthead,
library, room and footer dim almost completely while the SUBWAVE player blooms in
cyan, mint and warm orange light. The queue remains fully visible and interactive so
the cassette can still be routed to **play now** or **play later** without leaving the
focused composition.

## 3. The fictional portable player

The **SUBWAVE TPS-14** is an original fictional design inspired by the proportions and
materials of portable cassette players without copying a real manufacturer.

- The surrounding headphones use an original low-poly retro on-ear design: padded black arch, exposed silver adjustment rails and yokes, round metal speaker caps with perforated grilles, thick orange foam cushions, channel marks and separate hanging cables.
- REW, PLAY/PAUSE, STOP and FF are separate raycastable 3D keys mounted in recessed sockets across the player's lower front face. Their icons, pressed depth, disabled finish and active PLAY/PAUSE state are rendered as part of the WebGL device rather than as a floating browser-control strip.
- Dropping a cassette onto an empty player runs a two-second mechanical loading sequence based on front-compartment portable cassette players: the transparent door pivots outward from its bottom hinge, the cassette descends into the visible inner bay and spindles, and the door closes before transport becomes available. This happens only while the player is empty; later drops retain the established two-second cassette inspection and replacement flow.
- That first empty-player sequence plays the trimmed `site/public/sfx/cassette-load.wav` mechanical recording in sync with the two-second door animation. The effect follows the shared player/TV volume and does not replay for later cassette replacements. Source, license reference, hashes and the exact trim are recorded in `site/public/sfx/PROVENANCE.md`.
- PLAY/PAUSE produces a short Web Audio transport thunk.
- The Walkman's PLAY/PAUSE and STOP keys play the supplied 1.28-second
  `site/public/sfx/button-press.mp3` recording at the shared player/TV volume.
  Grid autoplay and the CRT transport retain their existing synthesized thunk.
- The long lower groove is the draggable volume control.
- The shorter upper groove is a position indicator with no elapsed-time text.
- Both visible cassette reels rotate clockwise at a restrained visual speed while
  playback is active.
- Directly loading or randomly choosing a tape changes the current cassette without
  mutating the persistent queue.

Audio is supplied by fourteen committed 160 kbps MP3 derivatives of the verified
full-length WAV exports. Catalogue `loop` tracks repeat during direct playback;
queue playback disables looping so the browser can advance to the next entry.

## 4. Continuous-play queue

The top-right tape queue is stored in browser local storage and survives reloads.
Users can:

- select multiple song cards and append them together;
- append every song from the currently open album;
- drag a library card or physical Three.js cassette into the queue;
- shuffle, play next, clear, remove or move individual entries;
- drag queue rows to reorder them;
- see the current song highlighted automatically; and
- read long active titles through an automatic horizontal marquee.

The current direct/random track appears separately from the saved entries. This keeps
spontaneous playback from silently destroying a carefully arranged queue.

## 5. Zanark's room

The room is a dark Indian teenager's desk around 2010, built from deliberately chunky
geometry, low-resolution textures, nearest-neighbor filtering and flat-shaded
materials.

- The panoramic back wall and laminate desk span the complete room viewport.
- Fourteen loose cassettes share the desk with books, CD cases, pencils, a feature
  phone and a warm table lamp.
- A handmade wooden plaque identifies **Zanark's room**. The earlier film-homage
  posters are parked in code and are not currently mounted.
- Physical wall switches independently control the overhead light and table lamp.
- With both circuits off, the room remains near-black except for local emissive
  sources such as the CRT, switch indicators and active lamp bulb.

The CRT samples the dominant hue of the current cover for its room lighting, but the
screen itself preserves and brightens the cover's individual colors. A shadowed,
forward/downward pool reaches across the desk without creating an implausible rear-wall
halo. During playback, the matching physical cassette receives a stationary
cover-colored glow.

## 6. Convex CRT and signal library

Clicking the television moves the room camera into a centered first-person view. The
screen is a bowed low-poly mesh with recessed bezel, deep cabinet, speaker grille and
bright phosphor bloom. A crossed-eye icon darkens the rest of the page without turning
off the room; it changes to an open-eye icon for restoring visibility. Accessible
labels and tooltips continue to describe both states, while the top-right back icon
restores the original camera.

Signal selection now occupies a compact rail to the left of the room instead of
covering the bottom of the television. Its smaller labels scroll inside the rail when
needed, and the chevron control collapses it to a narrow tab so the room can reclaim
the space.

The television's right-side control strip is also functional Three.js geometry. Its
recessed key mirrors the shared PLAY/PAUSE transport state, while the illuminated
rotary knob follows a 270-degree arc and changes the same browser-audio volume used by
the SUBWAVE player's slider when dragged horizontally or vertically. Both controls
remain raycastable in the wide room and first-person CRT views.

All signals use live Web Audio analyser data. Nonlinear frequency amplification and
adaptive waveform gain keep quieter recordings visibly responsive.

| Signal | Visual family |
|---|---|
| `scope` | Adaptive time-domain waveform |
| `bars` | Nonlinear frequency columns |
| `pong` | Beat-reactive Pong with frequency-driven paddles, scored rallies, music-accelerated rebounds and a capped blue transient spark around the ball; pressing Pong resets both scores |
| `pipes` | Classic screensaver-inspired multicolor pipes with square turns, rounded joints, beveled highlights and audio-driven thickness |
| `rain` | Matrix-style green code streams with bright heads and frequency-sized trails |
| `tesla` | Central audio coil with vectors-style adaptive waveform sensitivity driving bolt reach, direction, thickness and jagged motion |
| `radar` | Circular phosphor scope with a constant-speed sweep and targets that illuminate only on detected beats |
| `stars` | Constant-speed radial space flight with outward-moving stars and depth-lengthened trails; no audio reactivity |
| `reaction` | Pixelated Gray-Scott reaction-diffusion colonies with beat-seeded growth and frequency-shaped chemistry |
| `copper` | Moving horizontal raster/copper bands |
| `boids` | Flocking pixel birds whose speed, spacing and formation react across the live spectrum |
| `metaballs` | Audio-sized chunky scalar-field blobs |
| `synthwave` | Fixed neon sun and skyline with a continuously advancing perspective grid and road markers |
| `fireworks` | Bottom-launched rockets driven by adaptive low-frequency hits and high-frequency transients, with a short anti-spam cooldown; each rises to a randomized height before an independent pixel-particle burst |

![Contact sheet showing the CRT signal modes over the same playing cover.](assets/crt-signals-contact-sheet.png)

*The common cover and camera framing make the visual differences explicit. The
fourteen-mode library deliberately separates oscilloscope, spectrum, game, Matrix,
electrical, radar, starfield, screensaver, simulation, synthwave and
particle families instead of retaining near-duplicate effects.*

An intermittent phosphor scan band also crosses the complete television image from
top to bottom. This refresh sweep is independent of the selected signal.

## 7. Responsive composition

At desktop widths, the library spans the top row. The lower row uses a two-thirds room
and one-third player split, with the room on the left. Below 1181 px the sections stack
instead of compressing the Three.js scenes.

Above 1920 px, the masthead and workstation use nearly the full viewport with 32 px
outer gutters and a 3000 px maximum workspace. The three primary cover cards remain in
bounded columns instead of drifting apart on 2K and ultrawide monitors. Controls wrap
rather than introducing horizontal scrolling, and the enlarged interface typography
remains readable at normal browser zoom.

## 8. Runtime architecture

```mermaid
flowchart TB
    A[tools/song_catalog.json]
    B[scripts/prepare-site-assets.mjs]
    C[Generated site catalogue and artwork]
    D[site/src/main.ts]
    E[Queue, search, audio and DOM state]
    F[site/src/three-scenes.ts]
    G[Three.js room, hand, tapes, player and CRT]
    H[Web Audio analyser]
    I[Vite production bundle]
    J[GitHub Pages artifact]

    A --> B
    B --> C
    C --> D
    D --> E
    D --> F
    E --> H
    H --> F
    F --> G
    D --> I
    F --> I
    I --> J
```

`site/src/main.ts` owns catalogue navigation, queue persistence, audio transport,
drag/drop targets and CRT controls. `site/src/three-scenes.ts` owns the WebGL scenes,
physical interaction, lighting, cassette animation and canvas-based CRT rendering.

## 9. Local development

Requirements are Node.js 24 and a modern browser with WebGL and Web Audio support.
From the repository root:

```powershell
npm install
npm run dev
```

Create the production bundle with:

```powershell
npm run build
```

The build first runs `scripts/prepare-site-assets.mjs`, then TypeScript checking and
Vite. Generated output is written to `dist` and remains Git-ignored.

## 10. GitHub Pages deployment

The production site is intentionally isolated to the `deployment/pages` branch.
`.github/workflows/deploy-pages.yml` runs on pushes to that branch and also guards both
jobs with:

```yaml
if: github.ref == 'refs/heads/deployment/pages'
```

The workflow installs dependencies with `npm ci`, builds the Vite site, uploads
`dist`, and deploys through the `pages-deployment` environment. The Vite base path is
`/SubwooferLullabies/`, matching the project Pages URL.

## 11. Design invariants

Future changes should preserve these constraints:

1. Physical room objects remain genuine Three.js geometry rather than CSS pseudo-3D.
2. The PS1 treatment remains low-poly, pixelated and nearest-neighbor filtered.
3. The fictional player must not acquire Sony branding or copied manufacturer art.
4. Search continues to match titles only.
5. Direct and random playback never clear or reorder the saved queue.
6. CRT lighting remains directional and physically local; no rear-wall halo or
   uniform color wash over the cover.
7. CRT modes remain visibly different rather than multiplying variants of the same
   ring, waveform or particle family.
8. Desktop, 2K, ultrawide and stacked layouts avoid horizontal page scrolling.
9. Deployment remains restricted to `deployment/pages`.
