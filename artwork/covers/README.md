# covers

Fourteen original compositions, one restrained lowercase cover identity. The approved
subjects are retained: sewer arches, a fall, a precarious empty ledge, a discovery, a cassette,
a ladder, a waiting lamp, a beam, floodwater, roots, daylight and an ascending journey;
plus an underwater piano and a neon record.

**Environmental storytelling only:** no depicted characters, faces, bodies or character
silhouettes. Scale, broken infrastructure, worn routes, abandoned objects, water and light
carry the narrative. The empty ledge suggests exposure; damaged rungs and polished rails
suggest repeated effort; fading light markers lead up the switchback journey.
Decorative droplet icons are not a collection-wide motif. Water, caustics and reflections
remain where they belong in the environment; the music's droplet sounds are unchanged.

## Sources and media

- Twelve retro/chiptune game cues: `title/title.spritecanvas.json`, seven editable
  layers on a genuine **256 x 256 native grid**. `scene.png` is the native composite.
- `serenity` and `euphoria`: original smooth **2048 x 2048** `scene.png` illustrations.
  Their reproducible drawing source is `tools/image_cover_scenes.py`, not a SpriteCanvas
  project, stock photograph, upscaled pixel drawing or external image-generation result.
- Every `design.json` stores separately editable lowercase titles, font references,
  layout, colors and caption settings. Final `cover.png` is 2048px; `preview.png` is 512px.

Pixel scenes are enlarged 8x with nearest-neighbor interpolation after native-grid
shading. Clean antialiased **monospace** typography is added at output size. Consequently the final
covers contain pixel imagery **and smooth lettering**, not exclusively enlarged pixels.
Each SpriteCanvas project uses 458,752 editable cells. There is deliberately no combined
twelve-frame project: that would exceed the editor's two-million-cell limit.

Open an individual project as a local document in SpriteCanvas when editing it.
The export pipeline uses its shared model/PNG renderer locally. It does not submit a
proposal, accept artwork or overwrite the running studio's workspace.

## Re-export without redrawing

From the repository root, with Python/Pillow/NumPy, Node and the SpriteCanvas checkout:

```powershell
python .\tools\cover_pipeline.py --studio-root "C:\devdesk\gamedesk\SpriteCanvas"
python .\tools\cover_pipeline.py --studio-root "C:\devdesk\gamedesk\SpriteCanvas" --check
python .\tools\cover_pipeline.py --studio-root "C:\devdesk\gamedesk\SpriteCanvas" --install
```

The first command renders **saved** editable sources and typography. `--check` is
read-only. `--install` replaces all fourteen song cover PNGs and synchronizes metadata,
rights-note artwork provenance and galleries, after guarding the installed music/cover
hashes. It does not change score bytes or music-rights conclusions.
It respects `tools/album_catalog.json`: twelve retro bundles live under
`STRUDEL/YeetThatGlowStick`, while serenity and euphoria remain at the collection root.
The separate [album artwork](../albums/YeetThatGlowStick/README.md) must be exported
before installation; the installer includes its checked cover and regenerates album pages.

To intentionally regenerate scenes from their original drawing recipes, use `--draw`.
Existing source folders require the additional explicit `--redraw` switch. These switches
replace manual artwork/design edits and are **not** the normal export route.
Pixel drawing also requires `--handoff` pointing to the protected blank SpriteCanvas
handoff recorded in each `provenance.json`. `--titles title ...` limits drawing/export;
installation always requires a complete fourteen-cover export.

## Type and image provenance

All scene imagery is drawn locally from original code; no external image assets or game
sprites are included. Every text element on retro/pixel covers uses locally installed
**Cascadia Mono**: titles, wordmarks, captions and collection numbers, in all export sizes.
The renderer rejects proportional lettering on these covers. The older pixel archive's
original bitmap fonts already have fixed-width character cells.

The smooth `serenity` and `euphoria` covers retain **Segoe UI Light** and **Segoe UI**.
Font hashes are recorded so a different font cannot silently
change an export. Reproduction requires the matching installed fonts or an explicit
design/font-hash update. Font binaries are **not** distributed.

Cascadia Mono is published under the
[SIL Open Font License 1.1](https://github.com/microsoft/cascadia-code/blob/main/LICENSE);
documents created with the font do not inherit its font-software licence.
For Segoe UI, Microsoft's [font-output FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq)
permits graphic output under the applicable software licence and distinguishes this from
redistributing font files. Rasterized lettering does not embed the font software. This
does not establish exclusive copyright in AI-assisted artwork or clear the songs' sample
rights. Read the individual `RIGHTS.md` notes.

The previous all-pixel covers and recipes remain under `artwork/archive/pixel-covers-v1` as a
historical reference only. They are not used by the current packaging pipeline.
