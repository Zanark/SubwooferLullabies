import './styles.css';
import {
  createBoxScene,
  createHandCursorScene,
  createPlayerScene,
  createShowcaseScene,
  type VisualizerMode,
} from './three-scenes';

type Song = {
  title: string;
  role: string;
  emotion: string;
  caption: string;
  genre: string;
  bpm: number;
  duration_seconds: number;
  kind: 'loop' | 'one-shot';
  album: string | null;
  track_number: number | null;
  bundle_path: string;
  cover: string;
  audio: string;
};

type Album = {
  title: string;
  description: string;
  tracks: string[];
  cover: string;
};

type Catalog = { songs: Song[]; albums: Album[] };

const base = import.meta.env.BASE_URL;
const asset = (path: string) => `${base}${path}`;
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application root is missing.');

app.innerHTML = `
  <canvas id="hand-3d" class="hand-cursor-canvas" aria-hidden="true"></canvas>
  <header class="masthead">
    <div>
      <p class="eyebrow">playable archive / no. 0014</p>
      <h1>subwoofer <span>lullabies</span></h1>
    </div>
    <div class="mast-actions">
      <p class="mast-copy">fourteen original code-composed tapes.<br>choose one, load it, press play.</p>
      <button id="random-play" class="random-play" type="button" disabled>
        <svg class="shuffle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7h3.7c2.1 0 3.4 1 4.8 3.3l1 1.7c1.3 2.2 2.5 3 4.7 3H21"></path>
          <path d="m18 12 3 3-3 3"></path>
          <path d="M3 17h3.7c1.6 0 2.7-.6 3.7-2"></path>
          <path d="M14 7h3.9H21"></path>
          <path d="m18 4 3 3-3 3"></path>
        </svg>
        <span>feeling lucky?</span>
        <strong>play a random tape</strong>
      </button>
    </div>
  </header>

  <main class="desk">
    <section class="library-panel" aria-label="Music library">
      <div class="library-ui">
        <label class="search">
          <span>find a cassette</span>
          <input id="search" type="search" autocomplete="off" placeholder="type a song title..." />
          <i aria-hidden="true"></i>
        </label>
        <div class="shelf-head">
          <button id="back" class="pixel-button back-button" type="button" hidden>← albums</button>
          <p id="shelf-label">select an album</p>
          <span id="result-count"></span>
        </div>
        <div id="shelf" class="cover-grid"></div>
      </div>

    </section>

    <section class="player-panel" aria-label="Cassette player">
      <div id="walkman-drop" class="walkman-drop">
        <p class="drop-hint">drop tape here</p>
        <canvas id="player-3d" class="scene-canvas player-canvas" aria-label="3D cassette player and headphones"></canvas>
        <div class="transport-controls" role="group" aria-label="Cassette transport controls">
          <button id="rewind" class="transport-button" type="button" disabled aria-label="Rewind ten seconds">
            <span aria-hidden="true">&#9664;&#9664;</span><small>rew</small>
          </button>
          <button id="play" class="transport-button play-button" type="button" disabled aria-label="Play selected cassette">
            <span class="play-icon" aria-hidden="true"></span>
            <span class="pause-icon" aria-hidden="true"></span>
            <small id="play-label">play</small>
          </button>
          <button id="stop" class="transport-button stop-button" type="button" disabled aria-label="Stop and rewind cassette">
            <span aria-hidden="true"></span><small>stop</small>
          </button>
          <button id="forward" class="transport-button" type="button" disabled aria-label="Fast-forward ten seconds">
            <span aria-hidden="true">&#9654;&#9654;</span><small>ff</small>
          </button>
        </div>
        <label class="volume-control">
          <span>vol</span>
          <input id="volume" type="range" min="0" max="1" value="0.8" step="0.05" aria-label="Player volume" />
        </label>
        <div id="status" class="status">choose a cassette</div>
        <div id="announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
      </div>
    </section>

    <section class="room-panel box-scene" aria-label="Messy 2010 teenager room">
      <canvas id="box-3d" class="scene-canvas box-canvas" aria-label="Interactive 3D room with loose cassettes on a desk"></canvas>
      <div class="crt-controls" role="group" aria-label="CRT visualizer">
        <span>crt signal</span>
        <button type="button" data-visualizer="scope" disabled>scope</button>
        <button type="button" data-visualizer="bars" disabled>bars</button>
        <button type="button" data-visualizer="radar" disabled>radar</button>
        <button type="button" data-visualizer="orbit" disabled>orbit</button>
        <button type="button" data-visualizer="tunnel" disabled>tunnel</button>
        <button type="button" data-visualizer="rain" disabled>rain</button>
      </div>
      <p class="canvas-help">move tapes around to search / drag one to the player</p>
    </section>
  </main>

  <footer>
    <p>original music + original artwork</p>
    <p>*fictional player. not affiliated with any hardware brand.</p>
  </footer>

  <div id="showcase" class="showcase" hidden>
    <canvas id="showcase-3d" class="scene-canvas showcase-canvas" aria-hidden="true"></canvas>
    <div class="showcase-copy">
      <span>loading side a / side b</span>
      <strong id="showcase-title"></strong>
    </div>
  </div>

  <audio id="audio" preload="metadata"></audio>
`;

const shelf = required<HTMLDivElement>('shelf');
const shelfLabel = required<HTMLParagraphElement>('shelf-label');
const resultCount = required<HTMLSpanElement>('result-count');
const search = required<HTMLInputElement>('search');
const back = required<HTMLButtonElement>('back');
const dropZone = required<HTMLDivElement>('walkman-drop');
const playButton = required<HTMLButtonElement>('play');
const playLabel = required<HTMLElement>('play-label');
const rewindButton = required<HTMLButtonElement>('rewind');
const stopButton = required<HTMLButtonElement>('stop');
const forwardButton = required<HTMLButtonElement>('forward');
const volume = required<HTMLInputElement>('volume');
const randomPlayButton = required<HTMLButtonElement>('random-play');
const audio = required<HTMLAudioElement>('audio');
const status = required<HTMLDivElement>('status');
const announcement = required<HTMLDivElement>('announcement');
const showcase = required<HTMLDivElement>('showcase');
const showcaseTitle = required<HTMLElement>('showcase-title');
const visualizerButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-visualizer]'));

let catalog: Catalog;
let currentAlbum: string | null = null;
let deskPreviewTitle: string | null = null;
let selected: Song | null = null;
let loading = false;
let boxScene: ReturnType<typeof createBoxScene>;
let handCursorScene: ReturnType<typeof createHandCursorScene>;
let playerScene: ReturnType<typeof createPlayerScene>;
let showcaseScene: ReturnType<typeof createShowcaseScene>;
let audioContext: AudioContext | null = null;
let audioSource: MediaElementAudioSourceNode | null = null;
let audioAnalyser: AnalyserNode | null = null;

function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}

function enableAudioAnalysis() {
  if (!audioContext) {
    audioContext = new AudioContext();
    audioSource = audioContext.createMediaElementSource(audio);
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256;
    audioAnalyser.smoothingTimeConstant = 0.68;
    audioAnalyser.minDecibels = -82;
    audioAnalyser.maxDecibels = -12;
    audioSource.connect(audioAnalyser);
    audioAnalyser.connect(audioContext.destination);
    boxScene.setAnalyser(audioAnalyser);
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch((error: unknown) => {
      console.error('Unable to start audio analysis.', error);
      status.textContent = 'audio visualizer unavailable';
    });
  }
}

function trackByTitle(title: string) {
  const song = catalog.songs.find((candidate) => candidate.title === title);
  if (!song) throw new Error(`Unknown cassette: ${title}`);
  return song;
}

function songCard(song: Song) {
  const button = document.createElement('button');
  button.className = 'cover-card song-card';
  button.classList.toggle('is-held', deskPreviewTitle === song.title);
  button.type = 'button';
  button.dataset.title = song.title;
  button.innerHTML = `
    <span class="cover-frame"><img src="${asset(song.cover)}" alt="" /></span>
    <strong>${song.title}</strong>
    <small>${song.genre} · ${song.bpm} bpm</small>
  `;
  button.addEventListener('click', () => loadCassette(song));
  return button;
}

function albumCard(album: Album) {
  const button = document.createElement('button');
  button.className = 'cover-card album-card';
  button.type = 'button';
  button.innerHTML = `
    <span class="cover-frame"><img src="${asset(album.cover)}" alt="" /></span>
    <strong>${album.title}</strong>
    <small>${album.tracks.length} cassette album</small>
  `;
  button.addEventListener('click', () => {
    currentAlbum = album.title;
    deskPreviewTitle = null;
    search.value = '';
    renderShelf();
  });
  return button;
}

function renderShelf() {
  const query = search.value.trim().toLowerCase();
  shelf.replaceChildren();
  if (deskPreviewTitle) {
    const song = trackByTitle(deskPreviewTitle);
    shelfLabel.textContent = 'cassette in hand';
    resultCount.textContent = 'drag to player or release to load';
    back.hidden = false;
    shelf.append(songCard(song));
    boxScene?.setSearchMatches([]);
    return;
  }
  if (query) {
    const matches = catalog.songs.filter((song) => song.title.toLowerCase().includes(query));
    shelfLabel.textContent = 'search results';
    resultCount.textContent = `${matches.length} found`;
    back.hidden = false;
    matches.forEach((song) => shelf.append(songCard(song)));
    if (!matches.length) {
      shelf.innerHTML = '<p class="empty">no tape found in this box.</p>';
    }
    boxScene?.setSearchMatches(matches.map((song) => song.title));
    return;
  }

  boxScene?.setSearchMatches([]);
  resultCount.textContent = '';
  if (currentAlbum) {
    const album = catalog.albums.find((candidate) => candidate.title === currentAlbum);
    shelfLabel.textContent = album?.title ?? 'album';
    back.hidden = false;
    album?.tracks.forEach((title) => shelf.append(songCard(trackByTitle(title))));
    return;
  }

  shelfLabel.textContent = 'select an album';
  back.hidden = true;
  catalog.albums.forEach((album) => shelf.append(albumCard(album)));
  for (const title of ['serenity', 'euphoria']) {
    const song = trackByTitle(title);
    const card = songCard(song);
    card.classList.add('single-card');
    card.querySelector('small')!.textContent = 'standalone cassette';
    shelf.append(card);
  }
}

async function loadCassette(song: Song, autoplay = false) {
  if (loading) return false;
  loading = true;
  audio.pause();
  setPlayingState(false);
  setTransportEnabled(false);
  randomPlayButton.disabled = true;
  audio.src = asset(song.audio);
  audio.loop = song.kind === 'loop';
  audio.muted = autoplay;
  const activation = autoplay
    ? audio.play().then(() => true).catch(() => false)
    : Promise.resolve(false);
  showcaseTitle.textContent = song.title;
  showcase.hidden = false;
  showcase.classList.add('is-showing');
  let loaded = false;

  try {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    } else {
      await showcaseScene.show({ ...song, cover: asset(song.cover) });
    }

    selected = song;
    await playerScene.setCassette({ ...song, cover: asset(song.cover) });
    await boxScene.setTrack({ ...song, cover: asset(song.cover) });
    setTransportEnabled(true);
    announcement.textContent = `${song.title} cassette loaded`;
    if (autoplay && await activation) {
      audio.currentTime = 0;
      audio.muted = false;
      setPlayingState(true);
      status.textContent = `playing / ${song.title}`;
    } else {
      audio.muted = false;
      status.textContent = song.kind === 'loop'
        ? `ready / ${formatDuration(song.duration_seconds)} loop`
        : `ready / ${formatDuration(song.duration_seconds)}`;
      playButton.focus({ preventScroll: true });
    }
    loaded = true;
  } catch (error) {
    audio.pause();
    audio.muted = false;
    selected = null;
    console.error(`Unable to load cassette: ${song.title}`, error);
    status.textContent = 'cassette load failed';
    announcement.textContent = `${song.title} cassette failed to load`;
  } finally {
    showcase.classList.remove('is-showing');
    showcase.hidden = true;
    loading = false;
    randomPlayButton.disabled = false;
  }
  return loaded;
}

function setPlayingState(active: boolean) {
  playButton.classList.toggle('is-playing', active);
  playButton.setAttribute('aria-label', active ? 'Pause selected cassette' : 'Play selected cassette');
  playLabel.textContent = active ? 'pause' : 'play';
  playerScene.setPlaying(active);
  boxScene.setPlaying(active);
  document.body.classList.toggle('playing', active);
}

function setTransportEnabled(enabled: boolean) {
  for (const button of [playButton, rewindButton, stopButton, forwardButton]) {
    button.disabled = !enabled;
  }
}

async function togglePlayback() {
  if (!selected) return;
  if (audio.paused) {
    try {
      enableAudioAnalysis();
      await audio.play();
      setPlayingState(true);
      status.textContent = `playing / ${selected.title}`;
      announcement.textContent = `${selected.title} playing`;
    } catch {
      status.textContent = 'browser blocked playback / press play again';
      announcement.textContent = 'Playback was blocked. Press play again.';
    }
  } else {
    audio.pause();
    setPlayingState(false);
    status.textContent = `paused / ${selected.title}`;
    announcement.textContent = `${selected.title} paused`;
  }
}

function playTransportClick() {
  enableAudioAnalysis();
  if (!audioContext) return;
  const start = audioContext.currentTime;
  const output = audioContext.createGain();
  output.gain.setValueAtTime(0.0001, start);
  output.gain.exponentialRampToValueAtTime(0.16, start + 0.004);
  output.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
  output.connect(audioContext.destination);

  const thunk = audioContext.createOscillator();
  thunk.type = 'square';
  thunk.frequency.setValueAtTime(118, start);
  thunk.frequency.exponentialRampToValueAtTime(54, start + 0.055);
  thunk.connect(output);
  thunk.start(start);
  thunk.stop(start + 0.075);

  const noise = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * 0.045), audioContext.sampleRate);
  const samples = noise.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);
  }
  const snap = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1650;
  filter.Q.value = 0.8;
  snap.buffer = noise;
  snap.connect(filter);
  filter.connect(output);
  snap.start(start);
  snap.stop(start + 0.045);
}

function stopPlayback() {
  if (!selected) return;
  audio.pause();
  audio.currentTime = 0;
  setPlayingState(false);
  status.textContent = `stopped / ${selected.title}`;
  announcement.textContent = `${selected.title} stopped and rewound`;
}

function seekBy(seconds: number) {
  if (!selected) return;
  const duration = Number.isFinite(audio.duration) ? audio.duration : selected.duration_seconds;
  audio.currentTime = Math.min(duration, Math.max(0, audio.currentTime + seconds));
  status.textContent = `${formatDuration(audio.currentTime)} / ${formatDuration(duration)}`;
}

async function playRandomTape() {
  if (loading || !catalog.songs.length) return;
  enableAudioAnalysis();
  const choices = catalog.songs.filter((song) => song.title !== selected?.title);
  const pool = choices.length ? choices : catalog.songs;
  const song = pool[Math.floor(Math.random() * pool.length)];
  await loadCassette(song, true);
}

playButton.addEventListener('click', () => {
  playTransportClick();
  void togglePlayback();
});
stopButton.addEventListener('click', stopPlayback);
rewindButton.addEventListener('click', () => seekBy(-10));
forwardButton.addEventListener('click', () => seekBy(10));
volume.addEventListener('input', () => {
  audio.volume = Number(volume.value);
});
randomPlayButton.addEventListener('click', playRandomTape);
audio.addEventListener('ended', () => {
  setPlayingState(false);
  status.textContent = selected ? `finished / ${selected.title}` : 'choose a cassette';
  announcement.textContent = selected ? `${selected.title} finished` : '';
});
audio.addEventListener('timeupdate', () => {
  if (selected && !audio.paused) {
    status.textContent = `${formatDuration(audio.currentTime)} / ${formatDuration(audio.duration || selected.duration_seconds)}`;
  }
});
visualizerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.visualizer as VisualizerMode;
    boxScene.setVisualizer(mode);
    visualizerButtons.forEach((candidate) => {
      candidate.classList.toggle('is-active', candidate === button);
      candidate.setAttribute('aria-pressed', String(candidate === button));
    });
  });
});
search.addEventListener('input', () => {
  deskPreviewTitle = null;
  renderShelf();
});
back.addEventListener('click', () => {
  currentAlbum = null;
  deskPreviewTitle = null;
  search.value = '';
  renderShelf();
});

function initGrain() {
  const canvas = required<HTMLCanvasElement>('grain');
  const context = canvas.getContext('2d');
  if (!context) return;
  const size = 160;
  canvas.width = size;
  canvas.height = size;
  const image = context.createImageData(size, size);
  for (let index = 0; index < image.data.length; index += 4) {
    const value = Math.random() > 0.52 ? 255 : 0;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = Math.random() * 20;
  }
  context.putImageData(image, 0, 0);
}

async function start() {
  const response = await fetch(asset('catalog.json'));
  if (!response.ok) throw new Error(`Catalog failed to load: ${response.status}`);
  catalog = await response.json() as Catalog;
  audio.volume = Number(volume.value);
  renderShelf();
  playerScene = createPlayerScene(required<HTMLCanvasElement>('player-3d'));
  handCursorScene = createHandCursorScene(required<HTMLCanvasElement>('hand-3d'));
  showcaseScene = createShowcaseScene(required<HTMLCanvasElement>('showcase-3d'));
  showcaseScene.preload(catalog.songs.map((song) => ({ ...song, cover: asset(song.cover) })));
  boxScene = createBoxScene(
    required<HTMLCanvasElement>('box-3d'),
    catalog.songs.map((song) => ({ ...song, cover: asset(song.cover) })),
    (title) => loadCassette(trackByTitle(title)),
    (title) => {
      deskPreviewTitle = title;
      renderShelf();
    },
    dropZone,
    handCursorScene,
  );
  const visualizerModes: VisualizerMode[] = ['scope', 'bars', 'radar', 'orbit', 'tunnel', 'rain'];
  const dailyVisualizer = visualizerModes[Math.floor(Date.now() / 86_400_000) % visualizerModes.length];
  boxScene.setVisualizer(dailyVisualizer);
  visualizerButtons.forEach((button) => {
    const active = button.dataset.visualizer === dailyVisualizer;
    button.disabled = false;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  randomPlayButton.disabled = false;
  initGrain();
}

start().catch((error: unknown) => {
  app.innerHTML = `<p class="fatal">the cassette archive failed to open.<br>${String(error)}</p>`;
});
