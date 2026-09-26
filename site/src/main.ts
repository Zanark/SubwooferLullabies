import './styles.css';

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
          <strong>drag a tape →</strong>
        </div>
        <div id="cassette-box" class="cassette-box" aria-label="Box of draggable cassettes">
          <div class="box-flap flap-back"></div>
          <div class="box-flap flap-left"></div>
          <div class="box-flap flap-right"></div>
          <div id="box-tapes" class="box-tapes"></div>
          <div class="box-front"><span>fragile<br>music inside</span></div>
        </div>
      </div>
    </section>

    <section class="player-panel" aria-label="Cassette player">
      <div class="headphones" aria-hidden="true">
        <div class="headband"></div>
        <div class="ear left-ear"></div>
        <div class="ear right-ear"></div>
        <div class="cable"></div>
      </div>
      <div id="walkman-drop" class="walkman-drop">
        <p class="drop-hint">drop tape here</p>
        <div class="walkman">
          <div class="walkman-top">
            <i></i><i></i><i></i><i></i>
          </div>
          <div class="walkman-side"></div>
          <div class="brand">
            <span>SUBWAVE</span>
            <small>TPS-14 / stereo personal player</small>
          </div>
          <div class="walkman-stripe"></div>
          <div class="window">
            <div id="loaded-tape" class="loaded-tape">
              <span id="loaded-title">no tape</span>
              <div class="reel left-reel"></div>
              <div class="reel right-reel"></div>
              <div class="tape-line"></div>
            </div>
            <div class="window-shine"></div>
          </div>
          <div class="hardware">
            <span>auto reverse</span><b></b><span>dolby-ish*</span>
          </div>
          <button id="play" class="play-button" type="button" disabled aria-label="Play selected cassette">
            <span class="play-icon"></span>
            <span class="pause-icon"></span>
          </button>
          <div id="status" class="status">choose a cassette</div>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <p>original music + original artwork</p>
    <p>*fictional player. not affiliated with any hardware brand.</p>
  </footer>

  <div id="showcase" class="showcase" hidden>
    <div class="showcase-copy">
      <span>loading side a / side b</span>
      <strong id="showcase-title"></strong>
    </div>
    <div class="cassette-stage">
      <div id="hero-cassette" class="hero-cassette">
        <div class="cassette-face cassette-front">
          <div class="cassette-label">
            <span>subwoofer lullabies</span>
            <strong id="cassette-title"></strong>
            <small id="cassette-meta"></small>
          </div>
          <div class="cassette-reels"><i></i><b></b><i></i></div>
          <div class="cassette-bottom"></div>
        </div>
        <div class="cassette-face cassette-back">
          <img id="cassette-cover" alt="" />
          <span>side b / artwork</span>
        </div>
      </div>
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
const boxTapes = required<HTMLDivElement>('box-tapes');
const dropZone = required<HTMLDivElement>('walkman-drop');
const playButton = required<HTMLButtonElement>('play');
const audio = required<HTMLAudioElement>('audio');
const status = required<HTMLDivElement>('status');
const loadedTitle = required<HTMLSpanElement>('loaded-title');
const showcase = required<HTMLDivElement>('showcase');
const showcaseTitle = required<HTMLElement>('showcase-title');
const cassetteTitle = required<HTMLElement>('cassette-title');
const cassetteMeta = required<HTMLElement>('cassette-meta');
const cassetteCover = required<HTMLImageElement>('cassette-cover');
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
    const matches = catalog.songs.filter((song) =>
      [song.title, song.genre, song.role, song.emotion].some((value) => value.toLowerCase().includes(query)),
    );
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

function renderBox() {
  const angles = [-10, 7, -3, 12, -7, 4, -13, 9];
  boxTapes.replaceChildren();
  catalog.songs.forEach((song, index) => {
    const tape = document.createElement('button');
    tape.type = 'button';
    tape.className = 'box-tape';
    tape.draggable = true;
    tape.dataset.title = song.title;
    tape.style.setProperty('--tilt', `${angles[index % angles.length]}deg`);
    tape.style.setProperty('--depth', `${(index % 5) * 3}px`);
    tape.innerHTML = `<span>${song.title}</span><i></i><b></b>`;
    tape.addEventListener('click', () => loadCassette(song));
    tape.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', song.title);
      event.dataTransfer?.setDragImage(tape, tape.offsetWidth / 2, tape.offsetHeight / 2);
      dropZone.classList.add('awaiting-drop');
    });
    tape.addEventListener('dragend', () => dropZone.classList.remove('awaiting-drop'));
    boxTapes.append(tape);
  });
}

async function loadCassette(song: Song) {
  if (loading) return;
  loading = true;
  audio.pause();
  document.body.classList.remove('playing');
  playButton.classList.remove('is-playing');
  playButton.disabled = true;
  showcaseTitle.textContent = song.title;
  cassetteTitle.textContent = song.title;
  cassetteMeta.textContent = `${song.genre} / ${song.bpm} bpm`;
  cassetteCover.src = asset(song.cover);
  cassetteCover.alt = `${song.title} cover artwork`;
  showcase.hidden = false;
  requestAnimationFrame(() => showcase.classList.add('is-showing'));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  await new Promise((resolve) => setTimeout(resolve, reduced ? 250 : 3900));

  selected = song;
  audio.src = asset(song.audio);
  loadedTitle.textContent = song.title;
  status.textContent = `ready / ${formatDuration(song.duration_seconds)}`;
  theaterArt.style.backgroundImage = `url("${asset(song.cover)}")`;
  playButton.disabled = false;
  showcase.classList.remove('is-showing');
  await new Promise((resolve) => setTimeout(resolve, reduced ? 0 : 250));
  showcase.hidden = true;
  loading = false;
  playButton.focus({ preventScroll: true });
}

async function togglePlayback() {
  if (!selected) return;
  if (audio.paused) {
    try {
      await audio.play();
      playButton.classList.add('is-playing');
      setTheaterMode(true);
      document.body.classList.add('playing');
      status.textContent = `playing / ${selected.title}`;
    } catch {
      status.textContent = 'browser blocked playback / press play again';
    }
  } else {
    audio.pause();
    playButton.classList.remove('is-playing');
    document.body.classList.remove('playing');
    status.textContent = `paused / ${selected.title}`;
  }
}

function leaveTheater() {
  audio.pause();
  playButton.classList.remove('is-playing');
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

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('is-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-over'));
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('is-over', 'awaiting-drop');
  const title = event.dataTransfer?.getData('text/plain');
  if (title) loadCassette(trackByTitle(title));
});
playButton.addEventListener('click', togglePlayback);
audio.addEventListener('ended', () => {
  playButton.classList.remove('is-playing');
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
  renderBox();
  initGrain();
}

start().catch((error: unknown) => {
  app.innerHTML = `<p class="fatal">the cassette archive failed to open.<br>${String(error)}</p>`;
});
