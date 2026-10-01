# Cassette loading sound

`cassette-load.wav` is a trimmed website interaction effect derived from the
user-supplied file:

- Downloaded filename: `freesound_community-cassette-ffww-cassetera-96765.mp3`
- Pixabay asset: [Cassette FFWW cassetera](https://pixabay.com/sound-effects/cassette-ffww-cassetera-96765/)
- Original Freesound creator credited by the listing: `koraps`
- License reference: [Pixabay Content License](https://pixabay.com/service/license-summary/)
- Source SHA-256: `051330b6ee280531385a0cbc6100846b72381d51933d7622efed9e45d7248fc5`

The 5.568-second source contains its useful mechanical actions near the start
and then decays into a long near-silent tail. The website derivative keeps
`0.000-2.050` seconds, converts it to mono 24 kHz 16-bit PCM, raises the peak
to `0.5`, applies a 5 ms fade-in and a 180 ms fade-out, and has SHA-256:

`6bce1f056c4bc5230ec03c8ec8e52b7dc1f2a80519ef96d73e95fd3c1c067d74`

The effect is integrated into the cassette-loading interaction and is not
presented as a standalone sound-effects download.

## Walkman button press

`button-press.wav` is a timing-corrected interaction derivative of the user-supplied
file:

- Downloaded filename: `button_press.mp3`
- Source duration: `1.28` seconds
- Source encoding reported by Windows: `256 kbps MP3`
- Source file size: `40,960` bytes
- Source SHA-256:
  `5a7c47db4df45f27155bb0d1380fbbf652f997453c3ceac7d7baeb7c40910269`
- Retained source interval: `0.388-0.820` seconds
- Output: mono 44.1 kHz 16-bit PCM WAV
- Output duration: `0.432` seconds
- Output file size: `38,146` bytes
- Processing: 2 ms fade-in and 40 ms fade-out
- Output SHA-256:
  `d9322a36999be776f423f6af38f173e0604f8ec91414d34988dc069653a3781a`

No external source or license information was supplied or independently
established. The recording is used only as the interaction sound for the
fictional Walkman's PLAY/PAUSE and STOP buttons. The removed lead-in delayed the
main audible onset by approximately 400 ms. The physical Three.js controls now
start this derivative on pointer-down, at the same moment their keycaps begin
travelling inward.
