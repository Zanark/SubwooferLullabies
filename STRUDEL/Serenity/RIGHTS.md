# Serenity - upload and copyright risk note

**Reviewed:** 2026-09-24  
**Track:** Deep-calm underwater jazz theme / formerly *Keep Climbing: Still Water*  
**Source file:** `Serenity.strudel`  
**Source SHA-256:** `9edbd8cfaa0051359bf24e7d7bebbf03790d2319af7f3969f62cdaeb93c9bbb8`

The same journey is held in stillness, with space to rest between small gestures.

## Educated estimate

**Known attribution obligations and partly verified soundfont provenance; actual automated-claim likelihood is unknown.**

The default piano has a documented attribution license, and the FluidR3 upstream license is verified. These are more concrete permissions than those established for the drum banks, but the samples remain shared/nonexclusive and the exact original-SF2-to-WebAudioFont conversion chain was not fully established. Following known obligations improves release documentation; it does not establish a measured probability of claims.

This is a qualitative assessment of identified exposure, not a measured probability.
No defensible percentage or universal "safe anywhere" rating is available. No rendered
recording was submitted to a fingerprint service, compared against a commercial music
catalogue, uploaded to a platform, or reviewed by a lawyer for this assessment.

## What is actually in this track

Default `piano`: Salamander Grand Piano V3 by Alexander Holm. `gm_epiano1.n(1)`: `0040_FluidR3_GM_sf2_file`. `gm_acoustic_bass.n(1)`: `0320_FluidR3_GM_sf2_file`. Droplets and underwater noise use built-in `sine` and `brown` synthesis. There are no sampled drum-bank hits or voice recordings in this version.

Salamander is CC BY 3.0; include appropriate credit, its license link and a truthful processing description. No rendered-music attribution waiver was verified. CC BY is not ShareAlike and does not by itself place the entire original composition under CC BY. FluidR3's upstream README and COPYING identify MIT, not the separate GPL license for Debian packaging. Preserve its applicable notices when redistributing soundfont/sample data. No requirement to GPL-license this song or publish its composition code was established, and no explicit render-specific attribution waiver was found. The exact conversion-source chain remains partly unverified.

This is one part of the same AI-assisted game score. Recurring notes, water textures and motifs also occur in other folders in this collection. In particular, Anticipation and Vulnerability share substantial material; Perseverance and Serenity develop related motifs. Treat them as related arrangements when working with a distributor, rather than competing exclusive references.

## Before uploading

- Include this piano credit in the upload description and release credits: Piano samples: Salamander Grand Piano V3 by Alexander Holm, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), [source](https://archive.org/details/SalamanderGrandPianoV3), via Strudel. Samples sequenced and processed in this recording.
- Conservatively credit: Electric piano and acoustic bass: FluidR3 by Frank Wen and contributors, [MIT license](https://sources.debian.org/src/fluid-soundfont/3.1-5/COPYING/); WebAudioFont data via Strudel. Retain the complete upstream notice with release documentation; this short credit is not a substitute for notices required when redistributing sample data.
- Record the runtime/preset versions used for the actual render, since default sample maps can change. For strict clearance, resolve the remaining conversion provenance or replace those presets with instruments whose chain you can document.
- Treat upload permission and Content ID reference eligibility separately. Do not claim exclusive ownership of the shared piano, electric-piano or bass samples.
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

- [YouTube: How Content ID works](https://support.google.com/youtube/answer/2797370?hl=en): Uploads are matched against submitted reference files; this review did not access that reference database or scan a rendered recording.
- [YouTube: Copyright claims versus removal requests](https://support.google.com/youtube/answer/7002106?hl=en): Content ID claims and copyright-removal requests are different processes; a claim is not itself a copyright strike.
- [YouTube: Content eligible for Content ID](https://support.google.com/youtube/answer/2605065?hl=en): References require exclusive rights and sufficiently distinctive material. Nonexclusive third-party content and production loops raise reference-eligibility issues, independently of upload permission.
- [YouTube: Learn about Content ID claims](https://support.google.com/youtube/answer/6013276?hl=en): Review a claim before responding; disputes need a valid basis and may escalate.
- [U.S. Copyright Office: Copyright and artificial intelligence findings](https://www.copyright.gov/newsnet/2025/1060.html): AI assistance does not automatically bar protection, but U.S. protection requires qualifying human expression, not merely supplying prompts. This is not a rule for every jurisdiction.
- [Strudel: Default REPL sound registration](https://codeberg.org/uzu/strudel/src/branch/main/website/src/repl/prebake.mjs): Identifies Salamander piano and registers piano, VCSL and tidal-drum-machines separately. Runtime mappings can change.
- [Strudel sample collection: Sources and credits](https://github.com/felixroos/dough-samples/blob/main/README.md): Identifies Salamander as CC BY and VCSL as CC0, but only links tidal-drum-machines. VCSL's CC0 label cannot be transferred to the drum banks.
- [FreePats: Salamander Grand Piano](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html): Documents Alexander Holm's Salamander piano, CC BY 3.0 and V3 downloads.
- [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/): Allows commercial sharing and adaptation subject to its terms, including attribution. It is not a ShareAlike license; no musical-render attribution waiver was established.
- [Strudel: General MIDI soundfont preset map](https://codeberg.org/uzu/strudel/src/branch/main/packages/soundfonts/gm.mjs): Index 1 selects 0040_FluidR3_GM_sf2_file for gm_epiano1 and 0320_FluidR3_GM_sf2_file for gm_acoustic_bass in the inspected map.
- [Strudel: WebAudioFont loader](https://codeberg.org/uzu/strudel/src/branch/main/packages/soundfonts/fontloader.mjs): The inspected default loader uses the Felix Roos WebAudioFont data host; a working download is not independently a license grant.
- [FluidR3: Upstream README preserved in Debian source](https://sources.debian.org/src/fluid-soundfont/3.1-5/README/): Frank Wen explicitly releases Fluid under the MIT license and describes contributions to its sample collection.
- [FluidR3: Upstream MIT permission notice](https://sources.debian.org/src/fluid-soundfont/3.1-5/COPYING/): Requires retention of the copyright and permission notice in copies or substantial portions. Debian packaging licenses are separate from the upstream soundfont license.
- [WebAudioFont data: Separate upstream soundfont licenses](https://github.com/surikov/webaudiofontdata/blob/master/README.md): Links separate source licenses for FluidR3 and other banks. Its repository license alone does not prove the entire original-binary-to-preset permission chain.
- [Strudel: Synthesizers](https://strudel.cc/learn/synths/): Documents basic waveforms and generated noise. These are distinct from external recordings, soundfonts and sample-backed wavetables.

**Bottom line:** Use the provided sample credits and retain the supporting licenses; shared-sample claims and the residual conversion-provenance question are not eliminated. This is informational guidance, not legal advice.
