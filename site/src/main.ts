import './styles.css';
import { createBoxScene, createPlayerScene, createShowcaseScene } from './three-scenes';

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
  <header class="masthead">
    <div>
      <p class="eyebrow">playable archive / no. 0014</p>
      <h1>subwoofer<br><span>lullabies</span></h1>
    </div>
    <p class="mast-copy">fourteen original code-composed tapes.<br>choose one, load it, press play.</p>
  </header>

  <main class="desk" aria-live="polite">
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

      <div class="box-scene">
        <div class="box-label">
          <span>random access</span>
          <strong>drag a 3d tape →</strong>
        </div>
        <canvas id="box-3d" class="scene-canvas box-canvas" aria-label="Interactive 3D box of cassettes"></canvas>
        <p class="canvas-help">click a tape or drag it across to the player</p>
      </div>
    </section>

    <section class="player-panel" aria-label="Cassette player">
      <div id="walkman-drop" class="walkman-drop">
        <p class="drop-hint">drop tape here</p>
        <canvas id="player-3d" class="scene-canvas player-canvas" aria-label="3D cassette player and headphones"></canvas>
        <button id="play" class="play-button" type="button" disabled aria-label="Play selected cassette">
          <span class="play-icon"></span>
          <span class="pause-icon"></span>
        </button>
        <div id="status" class="status">choose a cassette</div>
      </div>
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

  <div id="theater" class="theater" hidden aria-hidden="true">
    <div id="theater-art" class="theater-art"></div>
    <div class="theater-shade"></div>
    <button id="exit-theater" class="pixel-button exit-theater" type="button">return to archive</button>
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
const audio = required<HTMLAudioElement>('audio');
const status = required<HTMLDivElement>('status');
const showcase = required<HTMLDivElement>('showcase');
const showcaseTitle = required<HTMLElement>('showcase-title');
const theater = required<HTMLDivElement>('theater');
const theaterArt = required<HTMLDivElement>('theater-art');
const exitTheater = required<HTMLButtonElement>('exit-theater');
const masthead = document.querySelector<HTMLElement>('.masthead');
const libraryPanel = document.querySelector<HTMLElement>('.library-panel');
const footer = document.querySelector<HTMLElement>('footer');

let catalog: Catalog;
let currentAlbum: string | null = null;
let selected: Song | null = null;
let loading = false;
let boxScene: ReturnType<typeof createBoxScene>;
let playerScene: ReturnType<typeof createPlayerScene>;
let showcaseScene: ReturnType<typeof createShowcaseScene>;

function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}

function trackByTitle(title: string) {
  const song = catalog.songs.find((candidate) => candidate.title === title);
  if (!song) throw new Error(`Unknown cassette: ${title}`);
  return song;
}

function songCard(song: Song) {
  const button = document.createElement('button');
  button.className = 'cover-card song-card';
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
    search.value = '';
    renderShelf();
  });
  return button;
}

function renderShelf() {
  const query = search.value.trim().toLowerCase();
  shelf.replaceChildren();
  if (query) {
    const matches = catalog.songs.filter((song) => song.title.toLowerCase().includes(query));
    shelfLabel.textContent = 'search results';
    resultCount.textContent = `${matches.length} found`;
    back.hidden = false;
    matches.forEach((song) => shelf.append(songCard(song)));
    if (!matches.length) {
      shelf.innerHTML = '<p class="empty">no tape found in this box.</p>';
    }
    return;
  }

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

async function loadCassette(song: Song) {
  if (loading) return;
  loading = true;
  audio.pause();
  document.body.classList.remove('playing');
  playButton.classList.remove('is-playing');
  playerScene.setPlaying(false);
  playButton.disabled = true;
  showcaseTitle.textContent = song.title;
  showcase.hidden = false;
  showcase.classList.add('is-showing');

  try {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    } else {
      await showcaseScene.show({ ...song, cover: asset(song.cover) });
    }

    selected = song;
    audio.src = asset(song.audio);
    playerScene.setCassette({ ...song, cover: asset(song.cover) });
    status.textContent = `ready / ${formatDuration(song.duration_seconds)}`;
    theaterArt.style.backgroundImage = `url("${asset(song.cover)}")`;
    playButton.disabled = false;
    playButton.focus({ preventScroll: true });
  } catch (error) {
    console.error(`Unable to load cassette: ${song.title}`, error);
    status.textContent = 'cassette load failed';
  } finally {
    showcase.classList.remove('is-showing');
    showcase.hidden = true;
    loading = false;
  }
}

async function togglePlayback() {
  if (!selected) return;
  if (audio.paused) {
    try {
      await audio.play();
      playButton.classList.add('is-playing');
      playerScene.setPlaying(true);
      setTheaterMode(true);
      document.body.classList.add('playing');
      status.textContent = `playing / ${selected.title}`;
    } catch {
      status.textContent = 'browser blocked playback / press play again';
    }
  } else {
    audio.pause();
    playButton.classList.remove('is-playing');
    playerScene.setPlaying(false);
    document.body.classList.remove('playing');
    status.textContent = `paused / ${selected.title}`;
  }
}

function leaveTheater() {
  audio.pause();
  playButton.classList.remove('is-playing');
  playerScene.setPlaying(false);
  document.body.classList.remove('playing');
  setTheaterMode(false);
  status.textContent = selected ? `paused / ${selected.title}` : 'choose a cassette';
  playButton.focus({ preventScroll: true });
}

function setTheaterMode(active: boolean) {
  document.body.classList.toggle('theater-mode', active);
  theater.hidden = !active;
  theater.setAttribute('aria-hidden', String(!active));
  for (const element of [masthead, libraryPanel, footer]) {
    if (element) element.inert = active;
  }
  if (active) exitTheater.focus({ preventScroll: true });
}

playButton.addEventListener('click', togglePlayback);
audio.addEventListener('ended', () => {
  playButton.classList.remove('is-playing');
  playerScene.setPlaying(false);
  document.body.classList.remove('playing');
  status.textContent = selected ? `finished / ${selected.title}` : 'choose a cassette';
});
audio.addEventListener('timeupdate', () => {
  if (selected && !audio.paused) {
    status.textContent = `${formatDuration(audio.currentTime)} / ${formatDuration(audio.duration || selected.duration_seconds)}`;
  }
});
exitTheater.addEventListener('click', leaveTheater);
search.addEventListener('input', renderShelf);
back.addEventListener('click', () => {
  currentAlbum = null;
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
  renderShelf();
  playerScene = createPlayerScene(required<HTMLCanvasElement>('player-3d'));
  showcaseScene = createShowcaseScene(required<HTMLCanvasElement>('showcase-3d'));
  showcaseScene.preload(catalog.songs.map((song) => ({ ...song, cover: asset(song.cover) })));
  boxScene = createBoxScene(
    required<HTMLCanvasElement>('box-3d'),
    catalog.songs.map((song) => ({ ...song, cover: asset(song.cover) })),
    (title) => loadCassette(trackByTitle(title)),
    dropZone,
  );
  initGrain();
}

start().catch((error: unknown) => {
  app.innerHTML = `<p class="fatal">the cassette archive failed to open.<br>${String(error)}</p>`;
});
