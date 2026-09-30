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
type QueueEntry = { id: string; title: string };

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

    <aside id="queue-panel" class="queue-panel" aria-label="Playback queue">
      <div class="queue-head">
        <div>
          <span>continuous play</span>
          <strong>tape queue</strong>
        </div>
        <output id="queue-count">0</output>
      </div>
      <div class="queue-actions" role="group" aria-label="Queue controls">
        <button id="queue-add" type="button" disabled>add selected</button>
        <button id="queue-shuffle" type="button" disabled>shuffle</button>
        <button id="queue-next" type="button" disabled>next</button>
        <button id="queue-clear" type="button" disabled>clear</button>
      </div>
      <ol id="queue-list" class="queue-list"></ol>
      <p id="queue-empty" class="queue-empty">drag a cassette here<br>or select songs above</p>
    </aside>

    <section id="player-panel" class="player-panel" aria-label="Cassette player">
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
        <label class="sr-only">
          <span>Player volume</span>
          <input id="volume" type="range" min="0" max="1" value="0.8" step="0.05" aria-label="Player volume" />
        </label>
        <div id="status" class="status">choose a cassette</div>
        <div id="announcement" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
      </div>
    </section>

    <section id="room-panel" class="room-panel box-scene" aria-label="Messy 2010 teenager room">
      <canvas id="box-3d" class="scene-canvas box-canvas" aria-label="Interactive 3D room with loose cassettes on a desk"></canvas>
      <button id="toggle-crt-isolation" class="crt-isolation-button" type="button" aria-pressed="false" hidden>dim surroundings</button>
      <button id="exit-crt-focus" class="crt-back-button" type="button" hidden>back to room</button>
      <div class="crt-controls" role="group" aria-label="CRT visualizer">
        <span>crt signal</span>
        <button type="button" data-visualizer="scope" disabled>scope</button>
        <button type="button" data-visualizer="bars" disabled>bars</button>
        <button type="button" data-visualizer="atari" disabled>atari</button>
        <button type="button" data-visualizer="tunnel" disabled>tunnel</button>
        <button type="button" data-visualizer="rain" disabled>rain</button>
        <button type="button" data-visualizer="vectors" disabled>vectors</button>
        <button type="button" data-visualizer="spiral" disabled>spiral</button>
        <button type="button" data-visualizer="stars" disabled>stars</button>
        <button type="button" data-visualizer="plasma" disabled>plasma</button>
        <button type="button" data-visualizer="copper" disabled>copper</button>
        <button type="button" data-visualizer="kaleido" disabled>kaleido</button>
        <button type="button" data-visualizer="metaballs" disabled>metaballs</button>
        <button type="button" data-visualizer="rotozoom" disabled>rotozoom</button>
        <button type="button" data-visualizer="glitch" disabled>glitch</button>
      </div>
      <p class="canvas-help">move tapes / drag to player / click tv or wall switches</p>
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
const playerPanel = required<HTMLElement>('player-panel');
const queuePanel = required<HTMLElement>('queue-panel');
const queueList = required<HTMLOListElement>('queue-list');
const queueCount = required<HTMLOutputElement>('queue-count');
const queueEmpty = required<HTMLParagraphElement>('queue-empty');
const queueAddButton = required<HTMLButtonElement>('queue-add');
const queueShuffleButton = required<HTMLButtonElement>('queue-shuffle');
const queueNextButton = required<HTMLButtonElement>('queue-next');
const queueClearButton = required<HTMLButtonElement>('queue-clear');
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
const roomPanel = required<HTMLElement>('room-panel');
const toggleCrtIsolationButton = required<HTMLButtonElement>('toggle-crt-isolation');
const exitCrtFocusButton = required<HTMLButtonElement>('exit-crt-focus');
const visualizerButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-visualizer]'));

let catalog: Catalog;
let currentAlbum: string | null = null;
let deskPreviewTitle: string | null = null;
let selected: Song | null = null;
let queue: QueueEntry[] = [];
let activeQueueId: string | null = null;
let currentSource: 'direct' | 'queue' | null = null;
const selectedTitles = new Set<string>();
const cassetteFocusReasons = new Set<string>();
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

function setCassetteFocus(reason: string, active: boolean, revealPlayer = false) {
  if (active) cassetteFocusReasons.add(reason);
  else cassetteFocusReasons.delete(reason);

  const focused = cassetteFocusReasons.size > 0;
  document.body.classList.toggle('cassette-focus-mode', focused);
  playerPanel.classList.toggle('is-cassette-focus-target', focused);
  queuePanel.classList.toggle('is-cassette-focus-companion', focused);

  if (active && revealPlayer) {
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    playerPanel.scrollIntoView({ behavior, block: 'center' });
  }
}

function enableAudioAnalysis() {
  if (!audioContext) {
    audioContext = new AudioContext();
    audioSource = audioContext.createMediaElementSource(audio);
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 256;
    audioAnalyser.smoothingTimeConstant = 0.5;
    audioAnalyser.minDecibels = -90;
    audioAnalyser.maxDecibels = -18;
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

function createQueueEntry(title: string): QueueEntry {
  return { id: crypto.randomUUID(), title };
}

function persistQueue() {
  localStorage.setItem('subwoofer-lullabies-queue', JSON.stringify(queue));
}

function updateQueueAddButton() {
  if (selectedTitles.size) {
    queueAddButton.disabled = false;
    queueAddButton.textContent = `add selected (${selectedTitles.size})`;
    return;
  }
  const album = currentAlbum
    ? catalog.albums.find((candidate) => candidate.title === currentAlbum)
    : null;
  queueAddButton.disabled = !album;
  queueAddButton.textContent = album ? `add album (${album.tracks.length})` : 'add selected';
}

function renderQueue() {
  queueList.replaceChildren();
  const activeInQueue = activeQueueId && queue.some((entry) => entry.id === activeQueueId);

  if (selected && currentSource === 'direct' && !activeInQueue) {
    const current = document.createElement('li');
    current.className = 'queue-item is-current is-external';
    current.innerHTML = `
      <span class="queue-index">now</span>
      <span class="queue-title-window"><span class="queue-title-text">${selected.title}</span></span>
      <span class="queue-source">direct</span>
    `;
    queueList.append(current);
  }

  queue.forEach((entry, index) => {
    const item = document.createElement('li');
    item.className = 'queue-item';
    item.classList.toggle('is-current', entry.id === activeQueueId);
    item.draggable = true;
    item.dataset.queueId = entry.id;
    item.innerHTML = `
      <button class="queue-play" type="button" aria-label="Play ${entry.title}">
        <span class="queue-index">${String(index + 1).padStart(2, '0')}</span>
        <span class="queue-title-window"><span class="queue-title-text">${entry.title}</span></span>
      </button>
      <span class="queue-reorder">
        <button type="button" data-move="-1" aria-label="Move ${entry.title} up">▲</button>
        <button type="button" data-move="1" aria-label="Move ${entry.title} down">▼</button>
        <button type="button" data-remove aria-label="Remove ${entry.title}">×</button>
      </span>
    `;
    item.querySelector<HTMLButtonElement>('.queue-play')!.addEventListener('click', () => {
      void playQueueEntry(entry.id);
    });
    item.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => {
      button.disabled = Number(button.dataset.move) < 0 ? index === 0 : index === queue.length - 1;
      button.addEventListener('click', () => moveQueueEntry(entry.id, Number(button.dataset.move)));
    });
    item.querySelector<HTMLButtonElement>('[data-remove]')!.addEventListener('click', () => {
      queue = queue.filter((candidate) => candidate.id !== entry.id);
      if (activeQueueId === entry.id) activeQueueId = null;
      persistQueue();
      renderQueue();
    });
    item.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('application/x-queue-entry', entry.id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragover', (event) => {
      if (!event.dataTransfer?.types.includes('application/x-queue-entry')) return;
      event.preventDefault();
    });
    item.addEventListener('drop', (event) => {
      const draggedId = event.dataTransfer?.getData('application/x-queue-entry');
      if (!draggedId || draggedId === entry.id) return;
      event.preventDefault();
      reorderQueue(draggedId, entry.id);
    });
    queueList.append(item);
  });

  queueCount.value = String(queue.length);
  queueCount.textContent = String(queue.length).padStart(2, '0');
  queueEmpty.hidden = Boolean(queue.length || selected);
  queueShuffleButton.disabled = queue.length < 2;
  queueNextButton.disabled = queue.length === 0;
  queueClearButton.disabled = queue.length === 0;

  requestAnimationFrame(() => {
    queueList.querySelectorAll<HTMLElement>('.is-current .queue-title-window').forEach((windowElement) => {
      const text = windowElement.querySelector<HTMLElement>('.queue-title-text');
      if (!text || text.scrollWidth <= windowElement.clientWidth) return;
      text.style.setProperty('--marquee-distance', `${text.scrollWidth - windowElement.clientWidth}px`);
      text.classList.add('is-scrolling');
    });
  });
}

function addTitlesToQueue(titles: string[]) {
  const validTitles = titles.filter((title) => catalog.songs.some((song) => song.title === title));
  if (!validTitles.length) return;
  queue.push(...validTitles.map(createQueueEntry));
  persistQueue();
  renderQueue();
  announcement.textContent = `${validTitles.length} ${validTitles.length === 1 ? 'cassette' : 'cassettes'} added to queue`;
}

function moveQueueEntry(id: string, offset: number) {
  const index = queue.findIndex((entry) => entry.id === id);
  const target = Math.min(queue.length - 1, Math.max(0, index + offset));
  if (index < 0 || target === index) return;
  const [entry] = queue.splice(index, 1);
  queue.splice(target, 0, entry);
  persistQueue();
  renderQueue();
}

function reorderQueue(draggedId: string, targetId: string) {
  const from = queue.findIndex((entry) => entry.id === draggedId);
  const to = queue.findIndex((entry) => entry.id === targetId);
  if (from < 0 || to < 0 || from === to) return;
  const [entry] = queue.splice(from, 1);
  queue.splice(to, 0, entry);
  persistQueue();
  renderQueue();
}

function songCard(song: Song) {
  const card = document.createElement('article');
  card.className = 'cover-card song-card';
  card.classList.toggle('is-held', deskPreviewTitle === song.title);
  card.classList.toggle('is-selected', selectedTitles.has(song.title));
  card.draggable = true;
  card.dataset.title = song.title;
  card.innerHTML = `
    <button class="cover-card-main" type="button">
      <span class="cover-frame"><img src="${asset(song.cover)}" alt="" /></span>
      <strong>${song.title}</strong>
      <small>${song.genre} · ${song.bpm} bpm</small>
    </button>
    <button class="queue-select" type="button" aria-pressed="${selectedTitles.has(song.title)}" aria-label="Select ${song.title} for queue">
      ${selectedTitles.has(song.title) ? '✓' : '+'}
    </button>
  `;
  card.querySelector<HTMLButtonElement>('.cover-card-main')!.addEventListener('click', () => {
    activeQueueId = null;
    void loadCassette(song);
  });
  card.querySelector<HTMLButtonElement>('.queue-select')!.addEventListener('click', () => {
    if (selectedTitles.has(song.title)) selectedTitles.delete(song.title);
    else selectedTitles.add(song.title);
    renderShelf();
  });
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer?.setData('application/x-cassette-title', song.title);
    event.dataTransfer?.setData('text/plain', song.title);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    setCassetteFocus('library-drag', true);
  });
  card.addEventListener('dragend', () => setCassetteFocus('library-drag', false));
  return card;
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
    updateQueueAddButton();
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
    updateQueueAddButton();
    return;
  }

  boxScene?.setSearchMatches([]);
  resultCount.textContent = '';
  if (currentAlbum) {
    const album = catalog.albums.find((candidate) => candidate.title === currentAlbum);
    shelfLabel.textContent = album?.title ?? 'album';
    back.hidden = false;
    album?.tracks.forEach((title) => shelf.append(songCard(trackByTitle(title))));
    updateQueueAddButton();
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
  updateQueueAddButton();
}

async function loadCassette(
  song: Song,
  autoplay = false,
  queueEntryId: string | null = null,
  skipShowcase = false,
) {
  if (loading) return false;
  loading = true;
  if (!skipShowcase) setCassetteFocus('cassette-showcase', true, true);
  audio.pause();
  setPlayingState(false);
  setTransportEnabled(false);
  randomPlayButton.disabled = true;
  audio.src = asset(song.audio);
  playerScene.setProgress(0);
  audio.loop = queueEntryId === null && song.kind === 'loop';
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
    if (skipShowcase) {
      showcase.classList.remove('is-showing');
      showcase.hidden = true;
    } else if (reduced) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    } else {
      await showcaseScene.show({ ...song, cover: asset(song.cover) });
    }

    selected = song;
    activeQueueId = queueEntryId;
    currentSource = queueEntryId ? 'queue' : 'direct';
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
    renderQueue();
  } catch (error) {
    audio.pause();
    audio.muted = false;
    selected = null;
    activeQueueId = null;
    currentSource = null;
    renderQueue();
    console.error(`Unable to load cassette: ${song.title}`, error);
    status.textContent = 'cassette load failed';
    announcement.textContent = `${song.title} cassette failed to load`;
  } finally {
    showcase.classList.remove('is-showing');
    showcase.hidden = true;
    loading = false;
    randomPlayButton.disabled = false;
    if (!skipShowcase) setCassetteFocus('cassette-showcase', false);
  }

  return loaded;
}

async function playQueueEntry(id: string, immediate = false) {
  const entry = queue.find((candidate) => candidate.id === id);
  if (!entry || loading) return;
  enableAudioAnalysis();
  await loadCassette(trackByTitle(entry.title), true, entry.id, immediate);
}

async function playNextQueued() {
  if (!queue.length || loading) return;
  const currentIndex = activeQueueId
    ? queue.findIndex((entry) => entry.id === activeQueueId)
    : -1;
  const nextIndex = currentIndex + 1;
  if (nextIndex >= queue.length) {
    activeQueueId = null;
    currentSource = null;
    renderQueue();
    status.textContent = 'queue finished';
    announcement.textContent = 'Queue finished';
    return;
  }
  await playQueueEntry(queue[nextIndex].id, true);
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
  playerScene?.setTransportEnabled(enabled);
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
  playerScene.setProgress(0);
  setPlayingState(false);
  status.textContent = `stopped / ${selected.title}`;
  announcement.textContent = `${selected.title} stopped and rewound`;
}

function seekBy(seconds: number) {
  if (!selected) return;
  const duration = Number.isFinite(audio.duration) ? audio.duration : selected.duration_seconds;
  audio.currentTime = Math.min(duration, Math.max(0, audio.currentTime + seconds));
  playerScene.setProgress(duration > 0 ? audio.currentTime / duration : 0);
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
  playerScene?.setVolume(audio.volume);
});
randomPlayButton.addEventListener('click', playRandomTape);
audio.addEventListener('ended', () => {
  setPlayingState(false);
  playerScene.setProgress(1);
  if (activeQueueId) {
    void playNextQueued();
    return;
  }
  status.textContent = selected ? `finished / ${selected.title}` : 'choose a cassette';
  announcement.textContent = selected ? `${selected.title} finished` : '';
});
audio.addEventListener('timeupdate', () => {
  if (!selected) return;
  const duration = Number.isFinite(audio.duration) ? audio.duration : selected.duration_seconds;
  playerScene.setProgress(duration > 0 ? audio.currentTime / duration : 0);
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
exitCrtFocusButton.addEventListener('click', () => {
  boxScene.setCrtFocus(false);
});
toggleCrtIsolationButton.addEventListener('click', () => {
  const active = document.body.classList.toggle('crt-isolation-mode');
  toggleCrtIsolationButton.setAttribute('aria-pressed', String(active));
  toggleCrtIsolationButton.textContent = active ? 'restore surroundings' : 'dim surroundings';
});
queueAddButton.addEventListener('click', () => {
  if (selectedTitles.size) {
    addTitlesToQueue([...selectedTitles]);
    selectedTitles.clear();
    renderShelf();
    return;
  }
  const album = currentAlbum
    ? catalog.albums.find((candidate) => candidate.title === currentAlbum)
    : null;
  if (album) addTitlesToQueue(album.tracks);
});
queueShuffleButton.addEventListener('click', () => {
  const currentIndex = activeQueueId
    ? queue.findIndex((entry) => entry.id === activeQueueId)
    : -1;
  const current = currentIndex >= 0 ? queue.splice(currentIndex, 1)[0] : null;
  for (let index = queue.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [queue[index], queue[swap]] = [queue[swap], queue[index]];
  }
  if (current) queue.unshift(current);
  persistQueue();
  renderQueue();
});
queueNextButton.addEventListener('click', () => {
  void playNextQueued();
});
queueClearButton.addEventListener('click', () => {
  queue = [];
  activeQueueId = null;
  persistQueue();
  renderQueue();
  announcement.textContent = 'Queue cleared';
});

for (const target of [queuePanel, dropZone]) {
  target.addEventListener('dragover', (event) => {
    if (!event.dataTransfer?.types.includes('application/x-cassette-title')) return;
    event.preventDefault();
    target.classList.add('is-over');
  });
  target.addEventListener('dragleave', (event) => {
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    target.classList.remove('is-over');
  });
  target.addEventListener('drop', (event) => {
    const title = event.dataTransfer?.getData('application/x-cassette-title');
    target.classList.remove('is-over');
    if (!title) return;
    event.preventDefault();
    if (target === queuePanel) addTitlesToQueue([title]);
    else {
      activeQueueId = null;
      void loadCassette(trackByTitle(title));
    }
  });
}
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
  try {
    const storedQueue = JSON.parse(localStorage.getItem('subwoofer-lullabies-queue') ?? '[]') as QueueEntry[];
    queue = storedQueue.filter((entry) => (
      typeof entry.id === 'string'
      && typeof entry.title === 'string'
      && catalog.songs.some((song) => song.title === entry.title)
    ));
  } catch {
    queue = [];
  }
  audio.volume = Number(volume.value);
  renderShelf();
  renderQueue();
  playerScene = createPlayerScene(required<HTMLCanvasElement>('player-3d'), (value) => {
    audio.volume = value;
    volume.value = String(value);
  }, (action) => {
    const button = {
      rewind: rewindButton,
      play: playButton,
      stop: stopButton,
      forward: forwardButton,
    }[action];
    button.click();
  });
  const transportFocusTargets = [
    ['rewind', rewindButton],
    ['play', playButton],
    ['stop', stopButton],
    ['forward', forwardButton],
  ] as const;
  for (const [action, button] of transportFocusTargets) {
    button.addEventListener('focus', () => playerScene.setTransportFocus(action));
    button.addEventListener('blur', () => playerScene.setTransportFocus(null));
  }
  playerScene.setVolume(audio.volume);
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
    (active) => setCassetteFocus('physical-drag', active),
    (active) => {
      roomPanel.classList.toggle('is-crt-focused', active);
      if (!active) {
        document.body.classList.remove('crt-isolation-mode');
        toggleCrtIsolationButton.setAttribute('aria-pressed', 'false');
        toggleCrtIsolationButton.textContent = 'dim surroundings';
      }
      toggleCrtIsolationButton.hidden = !active;
      exitCrtFocusButton.hidden = !active;
    },
    dropZone,
    queuePanel,
    (title) => addTitlesToQueue([title]),
    handCursorScene,
  );
  const visualizerModes: VisualizerMode[] = [
    'scope',
    'bars',
    'atari',
    'tunnel',
    'rain',
    'vectors',
    'spiral',
    'stars',
    'plasma',
    'copper',
    'kaleido',
    'metaballs',
    'rotozoom',
    'glitch',
  ];
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
