# Archived first pixel-cover edition

**Historical only.** These September 26 covers were superseded by the
[genre-aware collection](../../covers/README.md). Original casing, bitmap lettering,
sources, hashes and rendered images are retained as a revision record, not current
production artwork. On September 27, character depictions were also removed from the
three affected archived scenes, all their exports and the browsing collection. This
visible archive now follows the environment-only direction; it is not a byte-identical
snapshot of the former character artwork. The first-edition exporter is not a supported
production entry point; use the current mixed-media pipeline.

Original artwork drawn programmatically as editable pixels and rendered with SpriteCanvas's
shared model and PNG renderer. SpriteCanvas is the editor/renderer, not an image-generation
service. No stock artwork, copied game sprites or third-party font binaries are included.

**[Browse the saved artwork](index.html)**. All covers were created and saved directly at
the user's request; no studio proposal or acceptance was submitted.

## Files and resolution

Each title folder contains its authoritative `Title.spritecanvas.json`, a native `128 x 128`
PNG, a `512 x 512` preview, and a `2048 x 2048` cover export. Enlargements are exact nearest-
neighbor pixel copies: 4x and 16x, without antialiasing or invented extra detail.

All source projects have seven useful layers: atmosphere, architecture, main subject,
details, lighting, foreground/water, and original pixel lettering. Backgrounds are opaque;
unpainted pixels in individual layers remain transparent. Each cover uses at most 16
deliberate palette swatches.

`collection.spritecanvas.json` is a derived browsing project with one static cover on each
of 14 frames. The frames are **not an animation**; their 10-second durations simply avoid
rapid cycling if Play is clicked. The complete collection contains 1,605,632 editable cells,
under SpriteCanvas's two-million-cell limit.

`manifest.json` maps frame numbers to titles and records source/export hashes. The original
blank studio baseline was revision 3; its ID is retained in the saved collection. The live
studio was not replaced. Private handoffs are kept outside this repository.

## Historical sources

The individual SpriteCanvas documents can still be opened as local files. Do not install
these archived covers over the current mixed-media edition. Current editing/export
instructions are in `artwork/covers/README.md`; the maintained entry point is
`tools/cover_pipeline.py`.

Music sources and platform/sample-risk conclusions were not changed by the artwork work.
Each song's rights note records the new pixel-art provenance without claiming legal clearance.
