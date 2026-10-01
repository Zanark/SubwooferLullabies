import * as THREE from 'three';

export type VisualSong = {
  title: string;
  genre: string;
  bpm: number;
  cover: string;
};

type SceneController = {
  dispose(): void;
};

export type HandCursorController = SceneController & {
  hover(x: number, y: number, active: boolean): void;
  grab(title: string, cover: string, x: number, y: number): void;
  move(x: number, y: number, overPlayer: boolean): void;
  release(dropped: boolean): void;
};

export type VisualizerMode =
  | 'scope'
  | 'bars'
  | 'pipes'
  | 'rain'
  | 'tesla'
  | 'radar'
  | 'stars'
  | 'atari'
  | 'reaction'
  | 'copper'
  | 'boids'
  | 'metaballs'
  | 'synthwave'
  | 'fireworks';

export type TransportAction = 'rewind' | 'play' | 'stop' | 'forward';

export type BoxSceneController = SceneController & {
  setTrack(song: VisualSong): Promise<void>;
  setPlaying(active: boolean): void;
  setTransportEnabled(active: boolean): void;
  setVolume(value: number): void;
  setAnalyser(analyser: AnalyserNode): void;
  setVisualizer(mode: VisualizerMode): void;
  setSearchMatches(titles: string[]): void;
  setCrtFocus(active: boolean): void;
};

export type PlayerSceneController = SceneController & {
  setCassette(song: VisualSong, animateDoor?: boolean): Promise<void>;
  setPlaying(value: boolean): void;
  setTransportEnabled(value: boolean): void;
  setTransportFocus(action: TransportAction | null): void;
  setVolume(value: number): void;
  setProgress(value: number): void;
};

type CassetteParts = {
  group: THREE.Group;
  reels: THREE.Group[];
  label: THREE.Mesh;
  front: THREE.Mesh;
  back: THREE.Mesh;
};

const COLORS = {
  ink: 0x07151c,
  dark: 0x10191b,
  tape: 0x344543,
  tapeEdge: 0x151d1e,
  label: 0xd3c99d,
  reel: 0xbdae7f,
  cardboard: 0xa86e42,
  cardboardDark: 0x6b4028,
  cardboardLight: 0xc58c55,
  blue: 0x416d88,
  blueDark: 0x203e52,
  metal: 0x9bacaa,
  orange: 0xde823d,
  glass: 0x193038,
};

function material(color: number, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.04,
    flatShading: true,
    ...options,
  });
}

function box(
  width: number,
  height: number,
  depth: number,
  color: number,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color));
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function canvasTexture(
  primary: string,
  secondary = '',
  background = '#d3c99d',
  foreground = '#173138',
  fontScale = 1,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas texture context unavailable.');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(25, 43, 43, .17)';
  for (let y = 0; y < canvas.height; y += 12) context.fillRect(0, y, canvas.width, 3);
  context.strokeStyle = foreground;
  context.lineWidth = 10;
  context.strokeRect(13, 13, canvas.width - 26, canvas.height - 26);
  context.fillStyle = foreground;
  context.font = `700 ${58 * fontScale}px monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const fitted = primary.length > 16 ? primary.slice(0, 16) : primary;
  context.fillText(fitted, canvas.width / 2, fontScale > 1 ? 104 : 112);
  context.font = `700 ${22 * fontScale}px monospace`;
  context.fillText(secondary.toUpperCase(), canvas.width / 2, fontScale > 1 ? 194 : 184);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.userData.owned = true;
  return texture;
}

function roomPlaqueTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Room plaque context unavailable.');
  context.imageSmoothingEnabled = false;
  context.fillStyle = '#8b5535';
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 16) {
    context.fillStyle = y % 32 === 0 ? '#a56b43' : '#77452f';
    context.fillRect(0, y, canvas.width, 5);
  }
  context.strokeStyle = '#3c241e';
  context.lineWidth = 9;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.fillStyle = '#ead7a4';
  context.font = '700 47px "Segoe Print", "Comic Sans MS", cursive';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.rotate(-0.018);
  context.fillText("Zanark's room", canvas.width / 2 - 1, canvas.height / 2 + 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.userData.owned = true;
  return texture;
}

type MoviePosterKind = 'web' | 'masala' | 'campus' | 'rogue' | 'three';

function moviePosterTexture(kind: MoviePosterKind, title: string, subtitle: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 240;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Movie poster context unavailable.');
  context.imageSmoothingEnabled = false;

  const palette = {
    web: ['#182833', '#7a8d94', '#a9362d', '#d3d6c7'],
    masala: ['#d94f24', '#f0ad31', '#26342c', '#f4e5ad'],
    campus: ['#d8dfd2', '#725b4c', '#315e55', '#f6f0d7'],
    rogue: ['#8c672f', '#d1a552', '#211b1a', '#b32625'],
    three: ['#ddaa37', '#f0d56b', '#2b3a37', '#ce493b'],
  }[kind];
  context.fillStyle = palette[0];
  context.fillRect(0, 0, 160, 240);
  for (let index = 0; index < 90; index++) {
    context.fillStyle = index % 3 ? `${palette[1]}22` : `${palette[3]}18`;
    context.fillRect((index * 37) % 160, (index * 61) % 205, 2 + index % 5, 1 + index % 3);
  }

  if (kind === 'web') {
    context.fillStyle = '#263944';
    for (let x = 0; x < 160; x += 18) context.fillRect(x, 116 - x % 28, 14, 89 + x % 28);
    context.strokeStyle = '#a7b8bb';
    context.lineWidth = 2;
    for (let x = 8; x < 160; x += 19) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x - 18, 185);
      context.stroke();
    }
    const drawCrawler = (x: number, color: string, mirrored: boolean) => {
      context.save();
      context.translate(x, 88);
      context.scale(mirrored ? -1 : 1, 1);
      context.fillStyle = color;
      context.fillRect(-8, -17, 16, 21);
      context.fillRect(-6, -27, 12, 12);
      context.fillRect(-20, -12, 14, 6);
      context.fillRect(7, -8, 24, 6);
      context.fillRect(-17, 2, 14, 7);
      context.fillRect(5, 3, 18, 7);
      context.strokeStyle = '#d8ddd4';
      context.lineWidth = 1;
      for (let line = -5; line <= 5; line += 5) {
        context.beginPath();
        context.moveTo(line, -26);
        context.lineTo(line * 2, 4);
        context.stroke();
      }
      context.restore();
    };
    drawCrawler(96, palette[2], false);
    drawCrawler(47, '#171c20', true);
  } else if (kind === 'masala') {
    context.fillStyle = palette[1];
    for (let ring = 0; ring < 7; ring++) {
      context.beginPath();
      context.arc(80, 78, 16 + ring * 15, 0, Math.PI * 2);
      context.globalAlpha = 0.12;
      context.fill();
    }
    context.globalAlpha = 1;
    context.fillStyle = palette[2];
    context.fillRect(31, 56, 28, 72);
    context.fillRect(99, 48, 28, 80);
    context.fillRect(35, 37, 20, 22);
    context.fillRect(103, 29, 20, 22);
    context.fillStyle = '#eee3bf';
    context.fillRect(103, 52, 20, 60);
    context.fillStyle = '#6d271d';
    for (let dancer = 0; dancer < 5; dancer++) {
      context.fillRect(30 + dancer * 23, 139 + dancer % 2 * 8, 11, 37);
      context.fillRect(27 + dancer * 23, 132 + dancer % 2 * 8, 17, 9);
    }
  } else if (kind === 'campus') {
    context.fillStyle = '#eef0e5';
    context.fillRect(0, 0, 160, 184);
    context.fillStyle = '#a68268';
    context.fillRect(52, 27, 56, 82);
    context.fillStyle = '#332822';
    context.fillRect(58, 18, 44, 23);
    context.fillStyle = '#1b2523';
    context.fillRect(67, 55, 7, 7);
    context.fillRect(87, 55, 7, 7);
    context.fillRect(73, 80, 19, 4);
    context.fillStyle = palette[2];
    context.fillRect(17, 107, 23, 55);
    context.fillRect(120, 101, 23, 61);
    context.fillStyle = '#d8d4c1';
    context.fillRect(20, 89, 17, 20);
    context.fillRect(123, 83, 17, 20);
    for (let line = 0; line < 6; line++) {
      context.fillStyle = line % 2 ? '#b7c1b7' : '#d8dcd4';
      context.fillRect(0, 12 + line * 27, 46, 5);
      context.fillRect(114, 8 + line * 29, 46, 5);
    }
  } else if (kind === 'rogue') {
    context.fillStyle = '#b98b43';
    for (let line = 0; line < 13; line++) {
      context.fillStyle = line % 2 ? '#71452155' : '#d8b65b44';
      context.fillRect(6, 8 + line * 14, 148, 3);
    }
    context.fillStyle = '#181718';
    context.fillRect(30, 47, 48, 115);
    context.fillRect(84, 61, 43, 101);
    context.fillRect(38, 28, 31, 28);
    context.fillRect(91, 37, 29, 28);
    context.fillStyle = '#d8b56b';
    context.fillRect(39, 42, 29, 8);
    context.fillStyle = '#050505';
    context.fillRect(40, 37, 12, 7);
    context.fillRect(55, 37, 12, 7);
    context.fillStyle = '#8f2522';
    context.fillRect(84, 148, 62, 10);
  } else {
    context.fillStyle = '#edcf64';
    for (let line = 0; line < 12; line++) context.fillRect(0, 13 + line * 16, 160, 2);
    context.strokeStyle = '#96702c';
    context.lineWidth = 2;
    for (let scribble = 0; scribble < 12; scribble++) {
      context.beginPath();
      context.moveTo((scribble * 31) % 150, 12 + (scribble * 47) % 150);
      context.lineTo((scribble * 53) % 150, 18 + (scribble * 29) % 150);
      context.stroke();
    }
    ['#c93f37', '#2d71a8', '#4f9b48'].forEach((color, index) => {
      const x = 24 + index * 49;
      context.fillStyle = color;
      context.fillRect(x, 123, 29, 43);
      context.fillRect(x - 5, 115, 39, 15);
      context.fillStyle = palette[2];
      context.fillRect(x + 7, 76, 15, 40);
      context.fillRect(x + 3, 66, 23, 17);
      context.fillRect(x - 3, 87, 35, 8);
    });
  }

  context.fillStyle = 'rgba(7,10,11,.9)';
  context.fillRect(0, 184, 160, 56);
  context.fillStyle = palette[3];
  context.font = title.length > 13 ? '700 13px monospace' : '700 16px monospace';
  context.textAlign = 'center';
  context.fillText(title.toUpperCase(), 80, 207);
  context.fillStyle = palette[1];
  context.font = '700 7px monospace';
  context.fillText(subtitle.toUpperCase(), 80, 221);
  context.strokeStyle = palette[2];
  context.lineWidth = 4;
  context.strokeRect(2, 2, 156, 236);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.userData.owned = true;
  return texture;
}

function textureMaterial(texture: THREE.Texture, transparent = false) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function maskingTapeTexture(title: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Masking tape texture context unavailable.');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#d6bd7b';
  context.beginPath();
  context.moveTo(8, 13);
  context.lineTo(500, 5);
  context.lineTo(507, 101);
  context.lineTo(16, 108);
  context.closePath();
  context.fill();
  context.fillStyle = 'rgba(107, 76, 38, .16)';
  for (let x = 18; x < 500; x += 19) context.fillRect(x, 11, 2, 88);
  context.fillStyle = '#2c2520';
  context.font = '700 48px "Segoe Print", "Comic Sans MS", cursive';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const fitted = title.length > 20 ? `${title.slice(0, 19)}…` : title;
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2 + 2);
  context.rotate(-0.018);
  context.fillText(fitted, 0, 0);
  context.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.userData.owned = true;
  return texture;
}

const coverTextures = new Map<string, Promise<THREE.Texture>>();

function loadCoverTexture(path: string) {
  let pending = coverTextures.get(path);
  if (!pending) {
    pending = new THREE.TextureLoader().loadAsync(path).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }).catch((error: unknown) => {
      console.warn(`Unable to load cassette cover: ${path}`, error);
      coverTextures.delete(path);
      const fallback = canvasTexture('cover unavailable', 'audio remains playable', '#15272c', '#edf0d7');
      fallback.userData.owned = false;
      return fallback;
    });
    coverTextures.set(path, pending);
  }
  return pending;
}

function disposeMaterial(source: THREE.Material | THREE.Material[]) {
  const materials = Array.isArray(source) ? source : [source];
  materials.forEach((entry) => {
    const mapped = entry as THREE.Material & { map?: THREE.Texture | null };
    if (mapped.map?.userData.owned) mapped.map.dispose();
    entry.dispose();
  });
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    disposeMaterial(child.material);
  });
}

function createCassette(title: string, cover?: THREE.Texture): CassetteParts {
  const group = new THREE.Group();
  const body = box(3.4, 2.18, 0.34, COLORS.tape, [0, 0, 0]);
  group.add(body);

  const edge = box(3.12, 1.9, 0.38, COLORS.tapeEdge, [0, 0, 0]);
  group.add(edge);

  const frontTexture = canvasTexture('', '', '#1b292a', '#1b292a');
  const front = new THREE.Mesh(new THREE.PlaneGeometry(3.02, 1.78), textureMaterial(frontTexture));
  front.position.set(0, 0, 0.201);
  group.add(front);

  const labelTexture = maskingTapeTexture(title);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.68, 0.56), textureMaterial(labelTexture, true));
  label.position.set(0, 0.58, 0.218);
  group.add(label);

  const backTexture = cover ?? canvasTexture('side b', 'subwoofer lullabies', '#192525', '#d3c99d');
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.02, 1.78), textureMaterial(backTexture));
  back.position.set(0, 0, -0.201);
  back.rotation.y = Math.PI;
  group.add(back);

  const reels: THREE.Group[] = [];
  for (const x of [-0.92, 0.92]) {
    const reel = new THREE.Group();
    reel.position.set(x, -0.22, 0.24);
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.15, 12),
      material(COLORS.reel, { roughness: 0.65 }),
    );
    outer.geometry.rotateX(Math.PI / 2);
    reel.add(outer);

    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.17, 8),
      material(COLORS.dark),
    );
    inner.geometry.rotateX(Math.PI / 2);
    inner.position.z = 0.09;
    reel.add(inner);
    for (let spoke = 0; spoke < 3; spoke++) {
      const bar = box(0.34, 0.055, 0.055, COLORS.label, [0, 0, 0.19], [0, 0, spoke * Math.PI / 3]);
      reel.add(bar);
    }
    group.add(reel);
    reels.push(reel);
  }

  group.add(box(1.2, 0.13, 0.08, 0x281b17, [0, -0.22, 0.3]));
  const lower = box(1.85, 0.43, 0.38, 0xa79a72, [0, -0.81, 0], [-0.07, 0, 0]);
  group.add(lower);
  group.userData.title = title;
  group.userData.reels = reels;
  return { group, reels, label, front, back };
}

function crtGlassGeometry(width: number, height: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 12, 9);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const nx = x / (width * 0.5);
    const ny = y / (height * 0.5);
    positions.setX(index, x * (1 - ny * ny * 0.075));
    positions.setY(index, y * (1 - nx * nx * 0.055));
    const bulge = Math.max(0, 1 - nx * nx) * Math.max(0, 1 - ny * ny);
    positions.setZ(index, bulge * 0.68);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function setupRenderer(canvas: HTMLCanvasElement, alpha = true) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const resize = (camera: THREE.PerspectiveCamera) => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio, 1) * 0.58;
    const width = Math.max(1, Math.floor(rect.width * scale));
    const height = Math.max(1, Math.floor(rect.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false);
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    }
  };
  return { renderer, resize };
}

function addLighting(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0x9dd8d0, 0x16232b, 2.2));
  const key = new THREE.DirectionalLight(0xffd6a1, 3.4);
  key.position.set(-5, 9, 8);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x54a9c8, 2.1);
  rim.position.set(8, 2, -5);
  scene.add(rim);
}

function animateScene(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  resize: (camera: THREE.PerspectiveCamera) => void,
  update: (time: number, delta: number) => void,
) {
  let frame = 0;
  let prior = performance.now();
  let disposed = false;
  const render = (time: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    if (time - prior < 1000 / 30) return;
    const delta = Math.min((time - prior) / 1000, 0.1);
    prior = time;
    resize(camera);
    update(time / 1000, delta);
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(render);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    renderer.dispose();
  };
}

export function createHandCursorScene(canvas: HTMLCanvasElement): HandCursorController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  camera.position.set(0, 0, 8);
  const { renderer, resize } = setupRenderer(canvas);
  const key = new THREE.DirectionalLight(0xffd3a0, 3.5);
  key.position.set(-3, 5, 7);
  scene.add(key, new THREE.HemisphereLight(0xd6a06f, 0x351d24, 2.2));

  const hand = new THREE.Group();
  hand.rotation.set(0.08, -0.18, -0.18);
  scene.add(hand);

  const skin = 0x9b5e3f;
  const skinLight = 0xc17a50;
  hand.add(box(1.5, 1.65, 0.42, skin, [0, -0.25, 0]));
  hand.add(box(0.85, 1.25, 0.38, skin, [0, -1.55, -0.04]));
  hand.add(box(0.95, 0.28, 0.47, skinLight, [0, 0.48, 0.02]));

  const fingers: THREE.Group[] = [];
  for (let index = 0; index < 4; index++) {
    const finger = new THREE.Group();
    finger.position.set(-0.57 + index * 0.38, 0.52, 0);
    const length = index === 0 || index === 3 ? 0.92 : 1.08;
    const proximal = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, length, 2, 5),
      material(index % 2 ? skinLight : skin),
    );
    proximal.position.y = length * 0.5;
    finger.add(proximal);
    const tip = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.155, 0.45, 2, 5),
      material(skinLight),
    );
    tip.position.set(0, length + 0.28, 0.03);
    tip.rotation.x = -0.18;
    finger.add(tip);
    hand.add(finger);
    fingers.push(finger);
  }

  const thumb = new THREE.Group();
  thumb.position.set(-0.86, -0.12, 0.1);
  thumb.rotation.z = 0.78;
  const thumbMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.2, 0.85, 2, 5),
    material(skinLight),
  );
  thumbMesh.position.y = 0.45;
  thumb.add(thumbMesh);
  hand.add(thumb);

  let heldCassette: CassetteParts | null = null;
  let grip = 0;
  let targetGrip = 0;
  let overPlayer = false;
  let hideTimer = 0;

  function position(x: number, y: number) {
    canvas.style.left = `${x - canvas.clientWidth * 0.5}px`;
    canvas.style.top = `${y - canvas.clientHeight * 0.42}px`;
  }

  function setCassette(title: string, coverPath: string) {
    if (heldCassette) {
      hand.remove(heldCassette.group);
      disposeObject(heldCassette.group);
    }
    heldCassette = createCassette(title);
    heldCassette.group.scale.setScalar(0.46);
    heldCassette.group.position.set(0.05, 0.52, 0.72);
    heldCassette.group.rotation.set(-0.08, 0.04, -0.05);
    hand.add(heldCassette.group);
    const activeCassette = heldCassette;
    void loadCoverTexture(coverPath).then((cover) => {
      if (heldCassette !== activeCassette) return;
      disposeMaterial(activeCassette.back.material);
      activeCassette.back.material = textureMaterial(cover);
    });
  }

  const disposeAnimation = animateScene(renderer, scene, camera, resize, (_time, delta) => {
    grip += (targetGrip - grip) * Math.min(1, delta * 14);
    fingers.forEach((finger, index) => {
      finger.rotation.x = -grip * (1.03 + index * 0.04);
      finger.rotation.z = (index - 1.5) * (0.035 + (1 - grip) * 0.055);
    });
    thumb.rotation.x = -grip * 0.68;
    thumb.rotation.z = 0.78 - grip * 0.44;
    hand.rotation.z += ((overPlayer ? 0.18 : -0.18) - hand.rotation.z) * 0.12;
    hand.rotation.y += ((overPlayer ? 0.16 : -0.18) - hand.rotation.y) * 0.12;
    if (heldCassette) {
      heldCassette.group.position.z = 0.72 + grip * 0.16;
      const cassetteRotation = overPlayer ? 0.08 : -0.05;
      heldCassette.group.rotation.z += (cassetteRotation - heldCassette.group.rotation.z) * 0.12;
    }
  });

  return {
    hover(x, y, active) {
      if (targetGrip > 0) return;
      position(x, y);
      canvas.classList.toggle('is-visible', active);
    },
    grab(title, cover, x, y) {
      window.clearTimeout(hideTimer);
      position(x, y);
      setCassette(title, cover);
      targetGrip = 1;
      canvas.classList.remove('is-dropping');
      canvas.classList.add('is-visible', 'is-grabbing');
    },
    move(x, y, isOverPlayer) {
      position(x, y);
      overPlayer = isOverPlayer;
      canvas.classList.toggle('is-over-player', isOverPlayer);
    },
    release(dropped) {
      targetGrip = 0;
      canvas.classList.remove('is-grabbing', 'is-over-player');
      if (dropped) canvas.classList.add('is-dropping');
      hideTimer = window.setTimeout(() => {
        canvas.classList.remove('is-visible', 'is-dropping');
        if (heldCassette) {
          hand.remove(heldCassette.group);
          disposeObject(heldCassette.group);
          heldCassette = null;
        }
      }, dropped ? 280 : 150);
    },
    dispose() {
      window.clearTimeout(hideTimer);
      disposeObject(hand);
      disposeAnimation();
    },
  };
}

export function createBoxScene(
  canvas: HTMLCanvasElement,
  songs: VisualSong[],
  onSelect: (title: string, droppedOnPlayer: boolean) => void,
  onInspect: (title: string) => void,
  onCassetteFocusChange: (active: boolean) => void,
  onCrtFocusChange: (active: boolean) => void,
  onTogglePlayback: () => void,
  onVolumeChange: (value: number) => void,
  dropTarget: HTMLElement,
  queueTarget: HTMLElement,
  onQueue: (title: string) => void,
  handCursor: HandCursorController,
): BoxSceneController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  camera.position.set(0, 8, 17);
  camera.lookAt(0, -0.85, 0);
  const { renderer, resize } = setupRenderer(canvas);
  const darknessMaterial = new THREE.MeshBasicMaterial({
    color: 0x010204,
    transparent: true,
    opacity: 0.42,
    depthTest: false,
    depthWrite: false,
  });
  const darknessVeil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), darknessMaterial);
  darknessVeil.position.z = -0.2;
  darknessVeil.renderOrder = 900;
  darknessVeil.frustumCulled = false;
  camera.add(darknessVeil);
  scene.add(camera);
  const nightAmbient = new THREE.HemisphereLight(0x637b86, 0x1b1014, 0.88);
  scene.add(nightAmbient);
  const moonlight = new THREE.DirectionalLight(0x557a8c, 0.95);
  moonlight.position.set(7, 5, -4);
  scene.add(moonlight);
  const roomLight = new THREE.PointLight(0xffd7a0, 0, 20, 1.45);
  roomLight.position.set(1.2, 5.4, 1.6);
  roomLight.castShadow = true;
  scene.add(roomLight);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(44, 11), material(0x4b2924, { roughness: 1 }));
  wall.position.set(0, 1.6, -4.8);
  wall.receiveShadow = true;
  scene.add(wall);

  const roomPlaque = new THREE.Group();
  roomPlaque.position.set(0, 2.15, -4.54);
  roomPlaque.rotation.z = -0.025;
  roomPlaque.add(box(5.25, 1.55, 0.2, 0x563426, [0, 0, 0]));
  const plaqueFace = new THREE.Mesh(
    new THREE.PlaneGeometry(4.95, 1.28),
    textureMaterial(roomPlaqueTexture()),
  );
  plaqueFace.position.z = 0.115;
  roomPlaque.add(plaqueFace);
  for (const x of [-2.25, 2.25]) {
    const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 6), material(0x7f7769));
    nail.position.set(x, 0.58, 0.17);
    nail.rotation.x = Math.PI / 2;
    roomPlaque.add(nail);
  }
  const cord = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.18, 0.63, 0.02),
        new THREE.Vector3(0, 1.65, 0.02),
        new THREE.Vector3(2.18, 0.63, 0.02),
      ]),
      10,
      0.035,
      5,
      false,
    ),
    material(0x5b3928),
  );
  roomPlaque.add(cord);
  scene.add(roomPlaque);

  type WallSwitch = {
    group: THREE.Group;
    rocker: THREE.Mesh;
    indicator: THREE.MeshStandardMaterial;
    state: boolean;
    kind: 'room' | 'lamp';
  };

  function createWallSwitch(label: string, kind: WallSwitch['kind'], x: number, initialState: boolean) {
    const group = new THREE.Group();
    group.position.set(x, -0.25, -4.55);
    group.add(box(0.92, 1.35, 0.16, 0xd5c6a2, [0, 0, 0]));
    group.add(box(0.72, 1.12, 0.09, 0x8f826b, [0, 0, 0.12]));
    const rocker = box(0.42, 0.62, 0.2, 0x2f3535, [0, -0.05, 0.23]);
    group.add(rocker);
    const indicator = material(initialState ? 0xffb34d : 0x372820, {
      emissive: initialState ? 0xff6d24 : 0x000000,
      emissiveIntensity: initialState ? 1.8 : 0,
      roughness: 0.45,
      transparent: true,
    });
    const indicatorMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), indicator);
    indicatorMesh.position.set(0, 0.43, 0.23);
    indicatorMesh.renderOrder = 1000;
    group.add(indicatorMesh);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.24),
      textureMaterial(canvasTexture(label, 'light', '#d5c6a2', '#30261f'), true),
    );
    labelMesh.position.set(0, -0.52, 0.2);
    group.add(labelMesh);
    group.userData.switchKind = kind;
    scene.add(group);
    return { group, rocker, indicator, state: initialState, kind } satisfies WallSwitch;
  }

  const wallSwitches = [
    createWallSwitch('ROOM', 'room', 2.45, false),
    createWallSwitch('LAMP', 'lamp', 3.72, true),
  ];
  const switchRoots = wallSwitches.map(({ group }) => group);

  const tapeGroup = new THREE.Group();
  scene.add(tapeGroup);

  const tapeRoots: THREE.Group[] = [];
  const tapeByTitle = new Map<string, THREE.Group>();
  const searchSpotlights = new Map<THREE.Group, THREE.Group>();
  const activeTapeGlowCanvas = document.createElement('canvas');
  activeTapeGlowCanvas.width = 96;
  activeTapeGlowCanvas.height = 96;
  const activeTapeGlowContext = activeTapeGlowCanvas.getContext('2d');
  if (!activeTapeGlowContext) throw new Error('Cassette glow context unavailable.');
  const activeTapeGlowGradient = activeTapeGlowContext.createRadialGradient(48, 48, 4, 48, 48, 48);
  activeTapeGlowGradient.addColorStop(0, 'rgba(255,255,255,.95)');
  activeTapeGlowGradient.addColorStop(0.32, 'rgba(255,255,255,.58)');
  activeTapeGlowGradient.addColorStop(1, 'rgba(255,255,255,0)');
  activeTapeGlowContext.fillStyle = activeTapeGlowGradient;
  activeTapeGlowContext.fillRect(0, 0, 96, 96);
  const activeTapeGlowTexture = new THREE.CanvasTexture(activeTapeGlowCanvas);
  let activeTape: THREE.Group | null = null;
  let activeTapePlaying = false;
  const cassetteLayouts: Array<[[number, number, number], [number, number, number], number]> = [
    [[0.05, -1.775, -1.2], [-Math.PI / 2, 0, -0.32], 0.44],
    [[1.62, -1.77, -0.72], [-Math.PI / 2, 0, 0.21], 0.44],
    [[2.88, -1.765, -1.25], [-Math.PI / 2, 0, -0.14], 0.44],
    [[4.55, -1.77, -0.7], [-Math.PI / 2, 0, 0.31], 0.44],
    [[6.38, -1.775, -1.18], [-Math.PI / 2, 0, -0.25], 0.44],
    [[0.48, -1.765, 0.28], [-Math.PI / 2, 0, 0.16], 0.44],
    [[2.12, -1.76, 0.48], [-Math.PI / 2, 0, -0.28], 0.44],
    [[3.5, -1.755, -0.05], [-Math.PI / 2, 0, 0.24], 0.44],
    [[5.2, -1.765, 0.45], [-Math.PI / 2, 0, -0.12], 0.44],
    [[7.02, -1.76, 0.12], [-Math.PI / 2, 0, 0.29], 0.42],
    [[1.12, -1.755, 1.38], [-Math.PI / 2, 0, -0.22], 0.43],
    [[2.76, -1.75, 1.18], [-Math.PI / 2, 0, 0.33], 0.43],
    [[4.32, -1.745, 1.48], [-Math.PI / 2, 0, -0.3], 0.43],
    [[6.08, -1.75, 1.27], [-Math.PI / 2, 0, 0.17], 0.43],
  ];
  songs.forEach((song, index) => {
    const cassette = createCassette(song.title);
    const [position, rotation, scale] = cassetteLayouts[index];
    cassette.group.scale.setScalar(scale);
    cassette.group.position.set(...position);
    cassette.group.rotation.set(...rotation);
    tapeGroup.add(cassette.group);
    void loadCoverTexture(song.cover).then((cover) => {
      disposeMaterial(cassette.back.material);
      cassette.back.material = textureMaterial(cover);
    });
    cassette.group.userData.home = cassette.group.position.clone();
    cassette.group.userData.rotationHome = cassette.group.rotation.clone();
    cassette.group.userData.cover = song.cover;
    const glowMaterial = new THREE.MeshBasicMaterial({
      map: activeTapeGlowTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.35), glowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(cassette.group.position.x, -1.86, cassette.group.position.z);
    glow.renderOrder = 954;
    scene.add(glow);
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(3.58, 2.34, 0.44), shellMaterial);
    shell.renderOrder = 955;
    cassette.group.add(shell);
    cassette.group.userData.activeGlow = glow;
    cassette.group.userData.activeGlowMaterial = glowMaterial;
    cassette.group.userData.activeGlowShellMaterial = shellMaterial;
    tapeRoots.push(cassette.group);
    tapeByTitle.set(song.title, cassette.group);
  });

  function clearSearchSpotlights() {
    searchSpotlights.forEach((spotlight, tape) => {
      scene.remove(spotlight);
      disposeObject(spotlight);
      tape.userData.searchMatch = false;
      if (tape !== pressed) {
        tape.position.copy(tape.userData.home);
        tape.rotation.copy(tape.userData.rotationHome);
      }
    });
    searchSpotlights.clear();
  }

  function addSearchSpotlight(tape: THREE.Group) {
    const spotlight = new THREE.Group();
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd477,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const coneHeight = 9.6;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.05, coneHeight, 12, 1, true), coneMaterial);
    cone.position.y = -1.7 + coneHeight / 2;
    spotlight.add(cone);

    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(1.08, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffcf65,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -1.7;
    spotlight.add(pool);

    const glow = new THREE.PointLight(0xffc45c, 3.8, 4.2, 1.7);
    glow.position.y = -0.45;
    spotlight.add(glow);
    spotlight.position.set(tape.position.x, 0, tape.position.z);
    scene.add(spotlight);
    searchSpotlights.set(tape, spotlight);
    tape.userData.searchMatch = true;
  }

  scene.add(box(25, 0.65, 7.5, 0x70442e, [0, -2.28, 0]));
  scene.add(box(25, 0.12, 7.5, 0xa56a3d, [0, -1.91, 0]));

  const television = new THREE.Group();
  television.position.set(-5.5, -0.02, -0.05);
  television.rotation.y = 0.18;
  television.add(box(5.8, 4.45, 3.1, 0x34302d, [0, 0, 0]));
  television.add(box(4.55, 3.35, 0.18, 0x11191b, [-0.38, 0.24, 1.61]));
  television.add(box(0.58, 3.15, 0.18, 0x252625, [2.24, 0.25, 1.63]));
  for (let row = -5; row <= 5; row++) {
    television.add(box(0.32, 0.045, 0.03, 0x777164, [2.24, 0.25 + row * 0.23, 1.74]));
  }

  const tvPlayControl = new THREE.Group();
  tvPlayControl.position.set(2.24, 0.05, 1.72);
  tvPlayControl.userData.tvAudioControl = 'play';
  const tvPlaySocket = box(0.62, 0.58, 0.12, 0x171719, [0, 0, 0]);
  const tvPlayCapMaterial = material(0x697574, {
    emissive: 0x000000,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0.82,
  });
  const tvPlayCap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.2), tvPlayCapMaterial);
  tvPlayCap.position.z = 0.13;
  tvPlayCap.castShadow = true;
  const tvPlayIconMaterial = new THREE.MeshBasicMaterial({ color: 0x263033 });
  const tvPlayTriangleShape = new THREE.Shape();
  tvPlayTriangleShape.moveTo(-0.1, -0.13);
  tvPlayTriangleShape.lineTo(0.15, 0);
  tvPlayTriangleShape.lineTo(-0.1, 0.13);
  tvPlayTriangleShape.closePath();
  const tvPlayTriangle = new THREE.Mesh(
    new THREE.ShapeGeometry(tvPlayTriangleShape),
    tvPlayIconMaterial,
  );
  tvPlayTriangle.position.z = 0.245;
  const tvPauseBars = new THREE.Group();
  tvPauseBars.add(box(0.07, 0.25, 0.035, 0x263033, [-0.07, 0, 0]));
  tvPauseBars.add(box(0.07, 0.25, 0.035, 0x263033, [0.07, 0, 0]));
  tvPauseBars.position.z = 0.245;
  tvPauseBars.visible = false;
  tvPlayControl.add(tvPlaySocket, tvPlayCap, tvPlayTriangle, tvPauseBars);

  const tvVolumeControl = new THREE.Group();
  tvVolumeControl.position.set(2.24, -0.65, 1.72);
  tvVolumeControl.userData.tvAudioControl = 'volume';
  const tvVolumeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.29, 0.055, 6, 16),
    material(0x171719),
  );
  tvVolumeRing.position.z = 0.06;
  const tvVolumeKnobMaterial = material(0xc28a3d, {
    emissive: 0x5f2b0d,
    emissiveIntensity: 0.35,
  });
  const tvVolumeKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.27, 0.2, 10),
    tvVolumeKnobMaterial,
  );
  tvVolumeKnob.rotation.x = Math.PI / 2;
  tvVolumeKnob.position.z = 0.16;
  tvVolumeKnob.castShadow = true;
  const tvVolumeIndicator = new THREE.Group();
  tvVolumeIndicator.add(box(0.055, 0.2, 0.035, 0xf3deb0, [0, 0.13, 0]));
  tvVolumeIndicator.position.z = 0.285;
  const tvVolumeTicks: THREE.MeshStandardMaterial[] = [];
  for (let index = 0; index < 11; index++) {
    const angle = THREE.MathUtils.degToRad(135 - index * 27);
    const tickMaterial = material(0x554438, {
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.035), tickMaterial);
    tick.position.set(-Math.sin(angle) * 0.39, Math.cos(angle) * 0.39, 0.07);
    tick.rotation.z = angle;
    tvVolumeTicks.push(tickMaterial);
    tvVolumeControl.add(tick);
  }
  tvVolumeControl.add(tvVolumeRing, tvVolumeKnob, tvVolumeIndicator);
  const tvAudioControlRoots = [tvPlayControl, tvVolumeControl];
  television.add(tvPlayControl, tvVolumeControl);

  television.add(box(1.25, 0.16, 0.16, 0x171717, [0.2, -1.91, 1.66]));
  television.add(box(1.0, 0.24, 0.62, 0x27201f, [-1.6, -2.36, 0]));
  television.add(box(1.0, 0.24, 0.62, 0x27201f, [1.6, -2.36, 0]));
  const antennaLeft = box(0.08, 2.2, 0.08, 0x8f8c7d, [-0.55, 3.3, -0.2], [0, 0, -0.28]);
  const antennaRight = box(0.08, 2.2, 0.08, 0x8f8c7d, [0.55, 3.3, -0.2], [0, 0, 0.28]);
  television.add(antennaLeft, antennaRight);

  const crtCanvas = document.createElement('canvas');
  crtCanvas.width = 320;
  crtCanvas.height = 240;
  const crtContextResult = crtCanvas.getContext('2d');
  if (!crtContextResult) throw new Error('CRT screen context unavailable.');
  const crtContext: CanvasRenderingContext2D = crtContextResult;
  const crtTexture = new THREE.CanvasTexture(crtCanvas);
  crtTexture.colorSpace = THREE.SRGBColorSpace;
  crtTexture.magFilter = THREE.NearestFilter;
  crtTexture.minFilter = THREE.NearestFilter;
  const crtScreen = new THREE.Mesh(crtGlassGeometry(4.12, 2.94), textureMaterial(crtTexture, true));
  crtScreen.position.set(-0.38, 0.25, 1.72);
  crtScreen.renderOrder = 1000;
  television.add(crtScreen);
  const glassHighlight = new THREE.Mesh(
    crtGlassGeometry(4.14, 2.96),
    new THREE.MeshStandardMaterial({
      color: 0xb9d6ce,
      transparent: true,
      opacity: 0.12,
      roughness: 0.18,
      metalness: 0,
      flatShading: true,
      depthWrite: false,
    }),
  );
  glassHighlight.position.set(-0.38, 0.25, 1.745);
  glassHighlight.renderOrder = 1001;
  television.add(glassHighlight);
  scene.add(television);

  const crtLightTarget = new THREE.Object3D();
  crtLightTarget.position.set(-4.25, -1.82, 6.4);
  scene.add(crtLightTarget);
  const crtSpill = new THREE.SpotLight(0x8fcbd1, 52, 18, 0.96, 0.78, 1.05);
  crtSpill.position.set(-5.45, 0.28, 2.12);
  crtSpill.target = crtLightTarget;
  crtSpill.castShadow = true;
  crtSpill.shadow.mapSize.set(512, 512);
  crtSpill.shadow.bias = -0.001;
  scene.add(crtSpill);
  const crtGlow = new THREE.PointLight(0x8fcbd1, 28, 3.4, 1.7);
  crtGlow.position.set(-5.45, 0.28, 2.18);
  scene.add(crtGlow);
  const crtGlowCanvas = document.createElement('canvas');
  crtGlowCanvas.width = 128;
  crtGlowCanvas.height = 128;
  const crtGlowContext = crtGlowCanvas.getContext('2d');
  if (!crtGlowContext) throw new Error('CRT glow context unavailable.');
  const crtGlowGradient = crtGlowContext.createRadialGradient(64, 64, 4, 64, 64, 64);
  crtGlowGradient.addColorStop(0, 'rgba(255,255,255,.92)');
  crtGlowGradient.addColorStop(0.42, 'rgba(255,255,255,.38)');
  crtGlowGradient.addColorStop(1, 'rgba(255,255,255,0)');
  crtGlowContext.fillStyle = crtGlowGradient;
  crtGlowContext.fillRect(0, 0, 128, 128);
  const crtGlowTexture = new THREE.CanvasTexture(crtGlowCanvas);
  const crtDeskGlowMaterial = new THREE.MeshBasicMaterial({
    map: crtGlowTexture,
    color: 0x8fcbd1,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const crtDeskGlow = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 7.2), crtDeskGlowMaterial);
  crtDeskGlow.position.set(-5.2, -1.82, 1.8);
  crtDeskGlow.rotation.x = -Math.PI / 2;
  crtDeskGlow.renderOrder = 951;
  scene.add(crtDeskGlow);
  const crtScreenGlowMaterial = crtDeskGlowMaterial.clone();
  const crtScreenGlow = new THREE.Mesh(crtGlassGeometry(5.35, 3.95), crtScreenGlowMaterial);
  crtScreenGlow.position.set(-0.38, 0.25, 1.79);
  crtScreenGlow.renderOrder = 1002;
  television.add(crtScreenGlow);
  const crtFocusPosition = television.localToWorld(new THREE.Vector3(0.05, 0.15, 7.6));
  const crtFocusTarget = television.localToWorld(new THREE.Vector3(0.05, 0.15, 1.72));

  const books = new THREE.Group();
  books.position.set(-1.05, -1.84, 1.55);
  books.rotation.y = 0.16;
  [0x315b74, 0xb76b3c, 0xd4bd72, 0x52704d].forEach((color, index) => {
    books.add(box(1.75, 0.18, 1.05, color, [0, index * 0.2, 0]));
  });
  scene.add(books);

  const cdStack = new THREE.Group();
  cdStack.position.set(-2.85, -1.83, -0.65);
  cdStack.rotation.set(0.08, -0.22, -0.12);
  [0x6aa3af, 0xd06b52, 0x9897b9].forEach((color, index) => {
    const caseMesh = box(1.2, 0.08, 1.2, color, [index * 0.16, index * 0.1, index * 0.07]);
    (caseMesh.material as THREE.MeshStandardMaterial).transparent = true;
    (caseMesh.material as THREE.MeshStandardMaterial).opacity = 0.72;
    cdStack.add(caseMesh);
  });
  scene.add(cdStack);

  const phone = new THREE.Group();
  phone.position.set(-1.05, -1.07, 1.55);
  phone.rotation.set(-0.04, 0.16, -0.08);
  phone.add(box(0.7, 0.14, 1.35, 0x24282b, [0, 0, 0]));
  phone.add(box(0.48, 0.04, 0.62, 0x6b938e, [0, 0.1, -0.18]));
  phone.add(box(0.42, 0.04, 0.28, 0xb8a67c, [0, 0.1, 0.38]));
  scene.add(phone);

  const lamp = new THREE.Group();
  lamp.position.set(-1.3, -1.82, -1.25);
  lamp.scale.setScalar(1.12);
  const lampMetal = material(0x587079, { roughness: 0.58, metalness: 0.24 });
  const lampShadeMaterial = new THREE.MeshStandardMaterial({
    color: 0xc76a3d,
    emissive: 0x5c2412,
    emissiveIntensity: 0.7,
    roughness: 0.72,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.18, 8), lampMetal);
  lampBase.position.y = 0.08;
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.75, 6), lampMetal);
  lampStem.position.set(0, 0.94, 0);
  const lampArm = box(0.15, 1.75, 0.15, 0x38515a, [0.5, 2.05, 0], [0, 0, -0.62]);
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.78, 1.0, 7, 1, true),
    lampShadeMaterial,
  );
  lampShade.position.set(1.03, 2.63, 0);
  lampShade.rotation.z = -0.62;
  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd991,
    emissive: 0xff9b42,
    emissiveIntensity: 2.6,
    roughness: 0.3,
    flatShading: true,
    transparent: true,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 5), bulbMaterial);
  bulb.position.set(1.25, 2.31, 0);
  bulb.renderOrder = 1000;
  lamp.add(lampBase, lampStem, lampArm, lampShade, bulb);
  scene.add(lamp);

  const lampTarget = new THREE.Object3D();
  lampTarget.position.set(2.4, -1.82, 0.35);
  scene.add(lampTarget);
  const lampLight = new THREE.SpotLight(0xffaa55, 34, 14, 0.78, 0.76, 1.35);
  lampLight.position.set(0.08, 0.78, -1.25);
  lampLight.target = lampTarget;
  lampLight.castShadow = true;
  scene.add(lampLight);
  const lampGlow = new THREE.PointLight(0xffb060, 5.5, 6.5, 1.5);
  lampGlow.position.set(0.08, 0.78, -1.25);
  scene.add(lampGlow);
  let roomLightOn = false;
  let lampOn = true;

  function applySwitchVisual(control: WallSwitch) {
    control.rocker.rotation.x = control.state ? -0.28 : 0.28;
    control.rocker.position.y = control.state ? -0.01 : -0.09;
    control.indicator.color.setHex(control.state ? 0xffb34d : 0x372820);
    control.indicator.emissive.setHex(control.state ? 0xff6d24 : 0x000000);
    control.indicator.emissiveIntensity = control.state ? 1.8 : 0;
  }

  function toggleWallSwitch(control: WallSwitch) {
    control.state = !control.state;
    if (control.kind === 'room') roomLightOn = control.state;
    else lampOn = control.state;
    applySwitchVisual(control);
  }

  wallSwitches.forEach(applySwitchVisual);

  const pencilCup = new THREE.Group();
  pencilCup.position.set(-3.9, -1.41, -1.4);
  pencilCup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 1.05, 7), material(0x416f78)));
  for (let index = 0; index < 4; index++) {
    pencilCup.add(box(0.08, 1.55, 0.08, index % 2 ? 0xd8a34b : 0xc7592f, [-0.2 + index * 0.14, 0.92, 0], [0, 0, (index - 1.5) * 0.08]));
  }
  scene.add(pencilCup);

  let crtCover: CanvasImageSource | null = null;
  let crtPlaying = false;
  let visualizerMode: VisualizerMode = 'scope';
  let audioAnalyser: AnalyserNode | null = null;
  let frequencyData = new Uint8Array(0);
  let waveformData = new Uint8Array(0);
  let smoothedEnergy = 0;
  let smoothedBass = 0;
  let smoothedScopePeak = 0.08;
  let tvTransportEnabled = false;
  let tvVolume = 0.8;

  function refreshTvPlayControl() {
    tvPlayCapMaterial.color.setHex(
      tvTransportEnabled ? crtPlaying ? 0xde823d : 0xc7d0bb : 0x657d81,
    );
    tvPlayCapMaterial.emissive.setHex(tvTransportEnabled && crtPlaying ? 0x6f2f0c : 0x000000);
    tvPlayCapMaterial.emissiveIntensity = tvTransportEnabled && crtPlaying ? 0.8 : 0;
    tvPlayCapMaterial.opacity = tvTransportEnabled ? 1 : 0.62;
    tvPlayTriangle.visible = !crtPlaying;
    tvPauseBars.visible = crtPlaying;
    tvPlayIconMaterial.color.setHex(tvTransportEnabled ? 0x192124 : 0x24383d);
    tvPauseBars.children.forEach((bar) => {
      const barMaterial = (bar as THREE.Mesh).material as THREE.MeshStandardMaterial;
      barMaterial.color.setHex(tvTransportEnabled ? 0x192124 : 0x24383d);
    });
  }

  function setTvVolume(value: number, notify = false) {
    tvVolume = THREE.MathUtils.clamp(value, 0, 1);
    tvVolumeIndicator.rotation.z = THREE.MathUtils.degToRad(135 - tvVolume * 270);
    const activeTick = Math.round(tvVolume * (tvVolumeTicks.length - 1));
    tvVolumeTicks.forEach((tickMaterial, index) => {
      const active = index <= activeTick;
      tickMaterial.color.setHex(active ? 0xe3b35f : 0x554438);
      tickMaterial.emissive.setHex(active ? 0x7a310d : 0x000000);
      tickMaterial.emissiveIntensity = active ? 0.7 : 0;
    });
    tvVolumeKnobMaterial.emissiveIntensity = 0.25 + tvVolume * 0.55;
    if (notify) onVolumeChange(tvVolume);
  }

  refreshTvPlayControl();
  setTvVolume(tvVolume);
  const pong = {
    ballX: 0.5,
    ballY: 0.5,
    velocityX: 0.34,
    velocityY: 0.24,
    leftPaddleY: 0.5,
    rightPaddleY: 0.5,
    leftScore: 0,
    rightScore: 0,
    lastTime: 0,
    beatLatched: false,
    beatPulse: 0,
    impactPulse: 0,
  };
  const radar = {
    lastTime: 0,
    beatLatched: false,
    blipLevels: new Float32Array(8),
  };
  const fireworks = {
    lastTime: 0,
    beatLatched: false,
    beatCount: 0,
    rockets: [] as {
      x: number;
      y: number;
      targetY: number;
      speed: number;
      drift: number;
      color: number;
    }[],
    bursts: [] as {
      x: number;
      y: number;
      age: number;
      duration: number;
      particles: {
        angle: number;
        speed: number;
        size: number;
        color: number;
      }[];
    }[],
  };
  const pipes = {
    lastTime: 0,
    stepAccumulator: 0,
    heads: [] as {
      x: number;
      y: number;
      direction: number;
      color: number;
      steps: number;
    }[],
    segments: [] as {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      direction: number;
      color: number;
    }[],
  };
  const boids = {
    lastTime: 0,
    agents: [] as {
      x: number;
      y: number;
      vx: number;
      vy: number;
    }[],
  };
  const reaction = {
    width: 72,
    height: 48,
    u: new Float32Array(72 * 48),
    v: new Float32Array(72 * 48),
    nextU: new Float32Array(72 * 48),
    nextV: new Float32Array(72 * 48),
    seeded: false,
    beatLatched: false,
  };
  const crtLightColor = new THREE.Color(0x8fcbd1);

  function updateCrtLightColor(image: CanvasImageSource) {
    const sample = document.createElement('canvas');
    sample.width = 12;
    sample.height = 12;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const hueWeights = new Float32Array(12);
    const hueRed = new Float32Array(12);
    const hueGreen = new Float32Array(12);
    const hueBlue = new Float32Array(12);
    const pixelColor = new THREE.Color();
    const pixelHsl = { h: 0, s: 0, l: 0 };
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      const luminance = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 765;
      const chroma = (
        Math.max(pixels[index], pixels[index + 1], pixels[index + 2])
        - Math.min(pixels[index], pixels[index + 1], pixels[index + 2])
      ) / 255;
      if (alpha < 0.08 || luminance < 0.06) continue;
      pixelColor.setRGB(pixels[index] / 255, pixels[index + 1] / 255, pixels[index + 2] / 255);
      pixelColor.getHSL(pixelHsl);
      const hueIndex = Math.min(11, Math.floor(pixelHsl.h * 12));
      const pixelWeight = alpha * (0.2 + luminance * 1.4) * (0.2 + chroma * 3.4);
      hueWeights[hueIndex] += pixelWeight;
      hueRed[hueIndex] += pixels[index] * pixelWeight;
      hueGreen[hueIndex] += pixels[index + 1] * pixelWeight;
      hueBlue[hueIndex] += pixels[index + 2] * pixelWeight;
    }
    let dominantHue = 0;
    for (let index = 1; index < hueWeights.length; index++) {
      if (hueWeights[index] > hueWeights[dominantHue]) dominantHue = index;
    }
    const weight = hueWeights[dominantHue];
    if (!weight) return;
    crtLightColor.setRGB(
      hueRed[dominantHue] / weight / 255,
      hueGreen[dominantHue] / weight / 255,
      hueBlue[dominantHue] / weight / 255,
    );
    const sampledHsl = { h: 0, s: 0, l: 0 };
    crtLightColor.getHSL(sampledHsl);
    crtLightColor.setHSL(
      sampledHsl.h,
      THREE.MathUtils.clamp(Math.max(sampledHsl.s * 1.5, 0.72), 0.72, 0.95),
      THREE.MathUtils.clamp(sampledHsl.l * 1.1, 0.42, 0.65),
    );
    crtSpill.color.copy(crtLightColor);
    crtGlow.color.copy(crtLightColor);
    crtDeskGlowMaterial.color.copy(crtLightColor);
    crtScreenGlowMaterial.color.copy(crtLightColor);
  }

  function updateActiveTapeColor(image: CanvasImageSource) {
    if (!activeTape) return;
    const sample = document.createElement('canvas');
    sample.width = 10;
    sample.height = 10;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const color = new THREE.Color();
    const hsl = { h: 0, s: 0, l: 0 };
    let bestWeight = 0;
    let bestColor = new THREE.Color(0xf0a95c);
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      color.setRGB(pixels[index] / 255, pixels[index + 1] / 255, pixels[index + 2] / 255);
      color.getHSL(hsl);
      const weight = alpha * hsl.s * (0.35 + hsl.l);
      if (weight > bestWeight) {
        bestWeight = weight;
        bestColor = color.clone();
      }
    }
    bestColor.getHSL(hsl);
    bestColor.setHSL(hsl.h, Math.max(0.72, hsl.s), THREE.MathUtils.clamp(hsl.l * 1.35, 0.52, 0.7));
    (activeTape.userData.activeGlowMaterial as THREE.MeshBasicMaterial).color.copy(bestColor);
    (activeTape.userData.activeGlowShellMaterial as THREE.MeshBasicMaterial).color.copy(bestColor);
  }

  function averageBand(start: number, end: number) {
    if (!frequencyData.length) return 0;
    const first = Math.min(
      frequencyData.length - 1,
      Math.max(0, Math.floor(start * frequencyData.length)),
    );
    const last = Math.min(frequencyData.length, Math.max(first + 1, Math.ceil(end * frequencyData.length)));
    let total = 0;
    for (let index = first; index < last; index++) total += frequencyData[index];
    return total / (last - first) / 255;
  }

  function sensitiveBand(start: number, end: number, gain = 1.85) {
    return THREE.MathUtils.clamp(Math.pow(averageBand(start, end), 0.68) * gain, 0, 1);
  }

  function drawCrt(time: number) {
    const width = crtCanvas.width;
    const height = crtCanvas.height;
    if (crtPlaying && audioAnalyser) {
      audioAnalyser.getByteFrequencyData(frequencyData);
      audioAnalyser.getByteTimeDomainData(waveformData);
    } else {
      frequencyData.fill(0);
      waveformData.fill(128);
    }
    const bass = sensitiveBand(0, 0.12, 1.65);
    const mid = sensitiveBand(0.12, 0.48, 1.8);
    const treble = sensitiveBand(0.48, 1, 2);
    const energy = bass * 0.45 + mid * 0.38 + treble * 0.17;
    smoothedEnergy += (energy - smoothedEnergy) * (energy > smoothedEnergy ? 0.48 : 0.12);
    smoothedBass += (bass - smoothedBass) * (bass > smoothedBass ? 0.62 : 0.1);
    const beat = Math.max(0, bass - smoothedEnergy * 0.82);
    let waveformPeak = 0;
    for (const value of waveformData) {
      waveformPeak = Math.max(waveformPeak, Math.abs(value - 128) / 128);
    }
    smoothedScopePeak += (waveformPeak - smoothedScopePeak) * (
      waveformPeak > smoothedScopePeak ? 0.62 : 0.09
    );
    const waveformGain = THREE.MathUtils.clamp(
      0.92 / Math.max(smoothedScopePeak, 0.045),
      2.2,
      7,
    );
    crtContext.fillStyle = '#071214';
    crtContext.fillRect(0, 0, width, height);
    let coverX = 0;
    let coverY = 0;
    let coverWidth = width;
    let coverHeight = height;
    if (crtCover) {
      const sourceWidth = Number((crtCover as { width?: number }).width) || width;
      const sourceHeight = Number((crtCover as { height?: number }).height) || height;
      const sourceRatio = sourceWidth / sourceHeight;
      const targetRatio = width / height;
      coverWidth = sourceRatio > targetRatio ? width : height * sourceRatio;
      coverHeight = sourceRatio > targetRatio ? width / sourceRatio : height;
      coverX = (width - coverWidth) / 2;
      coverY = (height - coverHeight) / 2;
      crtContext.globalAlpha = crtPlaying ? 0.72 : 0.9;
      crtContext.drawImage(crtCover, coverX, coverY, coverWidth, coverHeight);
      crtContext.globalAlpha = 1;
    } else {
      crtContext.fillStyle = '#6c9288';
      crtContext.font = '700 18px monospace';
      crtContext.textAlign = 'center';
      crtContext.fillText('NO SIGNAL / PICK A TAPE', width / 2, height / 2);
    }

    if (crtPlaying) {
      if (crtCover) {
        crtContext.save();
        crtContext.globalCompositeOperation = 'screen';
        crtContext.filter = 'blur(5px) brightness(1.8) saturate(1.35)';
        crtContext.globalAlpha = 0.42;
        crtContext.drawImage(crtCover, coverX, coverY, coverWidth, coverHeight);
        crtContext.filter = 'brightness(1.65) saturate(1.22) contrast(1.08)';
        crtContext.globalAlpha = 0.58;
        crtContext.drawImage(crtCover, coverX, coverY, coverWidth, coverHeight);
        crtContext.restore();
      }
      crtContext.strokeStyle = '#f4d789';
      crtContext.fillStyle = '#e66a32';
      crtContext.lineWidth = 5;
      if (visualizerMode === 'scope') {
        const scopeAmplitude = height * 0.44;
        crtContext.beginPath();
        for (let x = 0; x <= width; x += 5) {
          const sampleIndex = Math.min(
            waveformData.length - 1,
            Math.floor(x / width * waveformData.length),
          );
          const sample = waveformData.length
            ? THREE.MathUtils.clamp((waveformData[sampleIndex] - 128) / 128 * waveformGain, -1, 1)
            : 0;
          const y = height / 2 + sample * scopeAmplitude;
          if (x === 0) crtContext.moveTo(x, y);
          else crtContext.lineTo(x, y);
        }
        crtContext.stroke();
      } else if (visualizerMode === 'bars') {
        for (let index = 0; index < 16; index++) {
          const start = index / 16;
          const measured = sensitiveBand(start * start, ((index + 1) / 16) ** 2, 2);
          const floor = 0.075 + index / 15 * 0.045;
          const sharedMotion = smoothedEnergy * (0.12 + index / 15 * 0.08);
          const bandEnergy = THREE.MathUtils.clamp(floor + measured * 0.82 + sharedMotion, 0, 1);
          const barHeight = 10 + bandEnergy * 178;
          crtContext.fillRect(10 + index * 19, height - 28 - barHeight, 11, barHeight);
        }
      } else if (visualizerMode === 'atari') {
        const delta = pong.lastTime ? Math.min(time - pong.lastTime, 0.05) : 1 / 60;
        pong.lastTime = time;
        const beatTriggered = beat > 0.055 && !pong.beatLatched;
        if (beatTriggered) {
          pong.beatLatched = true;
          const horizontalBoost = 0.04 + beat * 0.2;
          pong.velocityX = Math.sign(pong.velocityX || 1)
            * Math.min(0.78, Math.abs(pong.velocityX) + horizontalBoost);
          pong.velocityY += Math.sign(pong.velocityY || (mid > treble ? 1 : -1))
            * (0.025 + beat * 0.11);
          pong.beatPulse = 1;
        } else if (beat < 0.025) {
          pong.beatLatched = false;
        }

        const paddleHeight = 0.2 + mid * 0.1;
        const paddleLimit = paddleHeight / 2 + 0.055;
        const leftTarget = THREE.MathUtils.clamp(
          pong.ballY + Math.sin(time * 1.7) * (0.025 + bass * 0.035),
          paddleLimit,
          1 - paddleLimit,
        );
        const rightTarget = THREE.MathUtils.clamp(
          pong.ballY + Math.cos(time * 1.43) * (0.025 + treble * 0.04),
          paddleLimit,
          1 - paddleLimit,
        );
        const leftStep = delta * (0.42 + bass * 0.5);
        const rightStep = delta * (0.42 + mid * 0.5);
        pong.leftPaddleY += THREE.MathUtils.clamp(leftTarget - pong.leftPaddleY, -leftStep, leftStep);
        pong.rightPaddleY += THREE.MathUtils.clamp(rightTarget - pong.rightPaddleY, -rightStep, rightStep);

        pong.ballX += pong.velocityX * delta;
        pong.ballY += pong.velocityY * delta;
        const ballRadius = 0.018;
        if (pong.ballY <= ballRadius || pong.ballY >= 1 - ballRadius) {
          pong.ballY = THREE.MathUtils.clamp(pong.ballY, ballRadius, 1 - ballRadius);
          pong.velocityY = pong.ballY < 0.5
            ? Math.abs(pong.velocityY)
            : -Math.abs(pong.velocityY);
          pong.impactPulse = 1;
        }

        const leftPaddleX = 0.075;
        const rightPaddleX = 0.925;
        const hitPaddle = (paddleY: number) => (
          Math.abs(pong.ballY - paddleY) <= paddleHeight / 2 + ballRadius
        );
        if (
          pong.velocityX < 0
          && pong.ballX <= leftPaddleX + ballRadius
          && pong.ballX >= leftPaddleX - ballRadius
          && hitPaddle(pong.leftPaddleY)
        ) {
          const offset = (pong.ballY - pong.leftPaddleY) / (paddleHeight / 2);
          pong.ballX = leftPaddleX + ballRadius;
          pong.velocityX = Math.min(0.82, Math.abs(pong.velocityX) * (1.02 + beat * 0.22));
          pong.velocityY = THREE.MathUtils.clamp(
            pong.velocityY + offset * 0.24 + (bass - 0.5) * 0.04,
            -0.62,
            0.62,
          );
          pong.impactPulse = 1;
        } else if (
          pong.velocityX > 0
          && pong.ballX >= rightPaddleX - ballRadius
          && pong.ballX <= rightPaddleX + ballRadius
          && hitPaddle(pong.rightPaddleY)
        ) {
          const offset = (pong.ballY - pong.rightPaddleY) / (paddleHeight / 2);
          pong.ballX = rightPaddleX - ballRadius;
          pong.velocityX = -Math.min(0.82, Math.abs(pong.velocityX) * (1.02 + beat * 0.22));
          pong.velocityY = THREE.MathUtils.clamp(
            pong.velocityY + offset * 0.24 + (treble - 0.5) * 0.04,
            -0.62,
            0.62,
          );
          pong.impactPulse = 1;
        }

        const resetBall = (direction: number) => {
          pong.ballX = 0.5;
          pong.ballY = 0.38 + ((pong.leftScore + pong.rightScore) % 3) * 0.12;
          pong.velocityX = direction * (0.3 + smoothedEnergy * 0.16);
          pong.velocityY = ((pong.leftScore + pong.rightScore) % 2 ? -1 : 1)
            * (0.18 + mid * 0.12);
          pong.impactPulse = 1;
        };
        if (pong.ballX < -ballRadius) {
          pong.rightScore = (pong.rightScore + 1) % 100;
          resetBall(-1);
        } else if (pong.ballX > 1 + ballRadius) {
          pong.leftScore = (pong.leftScore + 1) % 100;
          resetBall(1);
        }

        pong.beatPulse = Math.max(0, pong.beatPulse - delta * 4.8);
        pong.impactPulse = Math.max(0, pong.impactPulse - delta * 3.7);

        crtContext.save();
        crtContext.fillStyle = `rgba(3, 9, 10, ${0.72 - smoothedEnergy * 0.12})`;
        crtContext.fillRect(0, 0, width, height);
        crtContext.strokeStyle = '#f4d789';
        crtContext.lineWidth = 3;
        crtContext.strokeRect(8, 8, width - 16, height - 16);

        crtContext.globalAlpha = 0.35 + treble * 0.35;
        crtContext.fillStyle = '#64c9bd';
        for (let line = 0; line < 9; line++) {
          const lineEnergy = sensitiveBand(line / 9, (line + 1) / 9, 2);
          const lineWidth = 2 + Math.floor(lineEnergy * 18);
          crtContext.fillRect(
            width / 2 - lineWidth / 2,
            18 + line * ((height - 36) / 8),
            lineWidth,
            3,
          );
        }
        crtContext.globalAlpha = 1;

        const paddleWidth = Math.max(6, Math.round(width * 0.022));
        const paddleHeightPixels = Math.round(height * paddleHeight);
        const leftY = Math.round(height * pong.leftPaddleY - paddleHeightPixels / 2);
        const rightY = Math.round(height * pong.rightPaddleY - paddleHeightPixels / 2);
        const leftX = Math.round(width * leftPaddleX - paddleWidth / 2);
        const rightX = Math.round(width * rightPaddleX - paddleWidth / 2);
        crtContext.fillStyle = '#e66a32';
        crtContext.fillRect(leftX, leftY, paddleWidth, paddleHeightPixels);
        crtContext.fillStyle = '#64c9bd';
        crtContext.fillRect(rightX, rightY, paddleWidth, paddleHeightPixels);

        const ballX = Math.round(width * pong.ballX);
        const ballY = Math.round(height * pong.ballY);
        crtContext.globalCompositeOperation = 'screen';
        const impactSize = Math.round(6 + pong.impactPulse * 5);
        crtContext.globalAlpha = 0.12 + pong.impactPulse * 0.28;
        crtContext.fillStyle = '#64c9bd';
        crtContext.fillRect(ballX - impactSize, ballY - impactSize, impactSize * 2, impactSize * 2);

        if (pong.beatPulse > 0.01) {
          const sparkLimit = 30;
          const sparkRadius = Math.min(sparkLimit, 8 + pong.beatPulse * 22);
          const sparkRotation = time * 1.8;
          crtContext.strokeStyle = '#52bfff';
          crtContext.lineWidth = 1.5 + pong.beatPulse * 2.5;
          crtContext.globalAlpha = 0.52 + pong.beatPulse * 0.38;
          crtContext.lineCap = 'square';
          for (let ray = 0; ray < 12; ray++) {
            const angle = sparkRotation + ray / 12 * Math.PI * 2;
            const variation = 0.78 + Math.sin(ray * 4.7 + time * 13) * 0.16;
            const outerRadius = Math.min(sparkLimit, sparkRadius * variation);
            const innerRadius = 6 + pong.beatPulse * 2;
            const middleRadius = innerRadius + (outerRadius - innerRadius) * 0.48;
            const bend = Math.sin(ray * 7.3 + time * 19) * (2 + pong.beatPulse * 3);
            crtContext.beginPath();
            crtContext.moveTo(
              ballX + Math.cos(angle) * innerRadius,
              ballY + Math.sin(angle) * innerRadius,
            );
            crtContext.lineTo(
              ballX + Math.cos(angle) * middleRadius - Math.sin(angle) * bend,
              ballY + Math.sin(angle) * middleRadius + Math.cos(angle) * bend,
            );
            crtContext.lineTo(
              ballX + Math.cos(angle) * outerRadius,
              ballY + Math.sin(angle) * outerRadius,
            );
            crtContext.stroke();
          }
        }

        crtContext.globalAlpha = 1;
        crtContext.fillStyle = '#fff4bc';
        crtContext.fillRect(ballX - 4, ballY - 4, 8, 8);
        crtContext.globalCompositeOperation = 'source-over';

        crtContext.fillStyle = '#f4d789';
        crtContext.font = '700 23px monospace';
        crtContext.textAlign = 'center';
        crtContext.textBaseline = 'top';
        crtContext.fillText(
          `${String(pong.leftScore).padStart(2, '0')}  ${String(pong.rightScore).padStart(2, '0')}`,
          width / 2,
          14,
        );
        crtContext.font = '700 8px monospace';
        crtContext.textAlign = 'left';
        crtContext.fillText('BEAT PONG', 14, height - 20);
        if (beatTriggered) {
          crtContext.textAlign = 'right';
          crtContext.fillStyle = '#e66a32';
          crtContext.fillText('BEAT!', width - 14, height - 20);
        }
        crtContext.globalAlpha = 1;
        crtContext.restore();
      } else if (visualizerMode === 'pipes') {
        crtContext.save();
        crtContext.fillStyle = 'rgba(3,7,13,.72)';
        crtContext.fillRect(0, 0, width, height);
        const pipeColors = ['#4de4ff', '#f4d789', '#e66a32', '#c88cff', '#73f59a'];
        const grid = 18;
        if (!pipes.heads.length) {
          pipes.heads.push(
            { x: grid * 3, y: grid * 4, direction: 0, color: 0, steps: 0 },
            { x: width - grid * 4, y: grid * 7, direction: 2, color: 2, steps: 0 },
            { x: grid * 8, y: height - grid * 3, direction: 3, color: 4, steps: 0 },
          );
        }
        const pipeDelta = pipes.lastTime ? Math.min(time - pipes.lastTime, 0.08) : 1 / 60;
        pipes.lastTime = time;
        pipes.stepAccumulator += pipeDelta * (7 + smoothedEnergy * 9);
        while (pipes.stepAccumulator >= 1) {
          pipes.stepAccumulator -= 1;
          for (const head of pipes.heads) {
            const oldX = head.x;
            const oldY = head.y;
            const turnSignal = Math.sin(head.steps * 5.73 + head.color * 2.1 + time);
            if (head.steps % 4 === 0 && (Math.abs(turnSignal) > 0.55 || beat > 0.055)) {
              head.direction = (head.direction + (turnSignal > 0 ? 1 : 3)) % 4;
            }
            const deltaX = head.direction === 0 ? grid : head.direction === 2 ? -grid : 0;
            const deltaY = head.direction === 1 ? grid : head.direction === 3 ? -grid : 0;
            head.x += deltaX;
            head.y += deltaY;
            if (head.x < grid || head.x > width - grid || head.y < grid || head.y > height - grid) {
              head.direction = (head.direction + 2) % 4;
              head.x = THREE.MathUtils.clamp(oldX, grid, width - grid);
              head.y = THREE.MathUtils.clamp(oldY, grid, height - grid);
              head.color = (head.color + 1) % pipeColors.length;
            } else {
              pipes.segments.push({
                x1: oldX,
                y1: oldY,
                x2: head.x,
                y2: head.y,
                direction: head.direction,
                color: head.color,
              });
              head.steps += 1;
            }
          }
          if (pipes.segments.length > 150) pipes.segments.splice(0, pipes.segments.length - 150);
        }
        for (let index = 0; index < pipes.segments.length; index++) {
          const segment = pipes.segments[index];
          const age = index / Math.max(1, pipes.segments.length - 1);
          const pipeWidth = 7 + sensitiveBand(segment.color / 5, (segment.color + 1) / 5, 2) * 5;
          crtContext.lineCap = 'square';
          crtContext.strokeStyle = '#081116';
          crtContext.lineWidth = pipeWidth + 5;
          crtContext.globalAlpha = 0.28 + age * 0.56;
          crtContext.beginPath();
          crtContext.moveTo(segment.x1, segment.y1);
          crtContext.lineTo(segment.x2, segment.y2);
          crtContext.stroke();
          crtContext.strokeStyle = pipeColors[segment.color];
          crtContext.lineWidth = pipeWidth;
          crtContext.globalAlpha = 0.34 + age * 0.66;
          crtContext.stroke();
          crtContext.strokeStyle = '#efffff';
          crtContext.lineWidth = Math.max(1, pipeWidth * 0.22);
          crtContext.globalAlpha = 0.16 + age * 0.44;
          crtContext.beginPath();
          crtContext.moveTo(segment.x1 + (segment.direction % 2 ? -2 : 0), segment.y1 + (segment.direction % 2 ? 0 : -2));
          crtContext.lineTo(segment.x2 + (segment.direction % 2 ? -2 : 0), segment.y2 + (segment.direction % 2 ? 0 : -2));
          crtContext.stroke();
          crtContext.fillStyle = pipeColors[segment.color];
          crtContext.globalAlpha = 0.42 + age * 0.58;
          crtContext.beginPath();
          crtContext.arc(segment.x2, segment.y2, pipeWidth * 0.72, 0, Math.PI * 2);
          crtContext.fill();
        }
        crtContext.globalAlpha = 1;
        crtContext.lineWidth = 1;
        crtContext.restore();
      } else if (visualizerMode === 'rain') {
        crtContext.save();
        crtContext.fillStyle = 'rgba(0,10,5,.72)';
        crtContext.fillRect(0, 0, width, height);
        crtContext.font = '700 13px monospace';
        crtContext.textAlign = 'center';
        crtContext.textBaseline = 'middle';
        const glyphs = '01ZX#$+*';
        const columns = 24;
        for (let column = 0; column < columns; column++) {
          const columnEnergy = sensitiveBand(column / columns, (column + 1) / columns, 2);
          const speed = 24 + columnEnergy * 94 + smoothedEnergy * 28;
          const head = (time * speed + column * 47) % (height + 150) - 36;
          const trailLength = 7 + Math.round(columnEnergy * 9);
          const x = 8 + column * ((width - 16) / (columns - 1));
          for (let trail = 0; trail < trailLength; trail++) {
            const y = head - trail * 14;
            if (y < -12 || y > height + 12) continue;
            const glyphIndex = Math.abs(Math.floor(column * 5 + trail * 3 + time * (3 + column % 4))) % glyphs.length;
            const fade = 1 - trail / trailLength;
            crtContext.fillStyle = trail === 0 ? '#eaffef' : trail < 3 ? '#77ff9b' : '#16a34a';
            crtContext.globalAlpha = trail === 0 ? 0.94 : 0.16 + fade * (0.45 + columnEnergy * 0.34);
            crtContext.fillText(glyphs[glyphIndex], x, y);
          }
        }
        crtContext.globalAlpha = 1;
        crtContext.restore();
      } else if (visualizerMode === 'tesla') {
        crtContext.save();
        crtContext.fillStyle = 'rgba(4,5,19,.62)';
        crtContext.fillRect(0, 0, width, height);
        const coilX = width / 2;
        const domeY = height * 0.42;
        const baseY = height * 0.82;
        crtContext.fillStyle = '#18213d';
        crtContext.fillRect(coilX - 42, baseY, 84, 18);
        crtContext.fillStyle = '#e66a32';
        crtContext.fillRect(coilX - 31, baseY + 4, 62, 8);
        crtContext.fillStyle = '#23345a';
        crtContext.fillRect(coilX - 15, domeY + 12, 30, baseY - domeY - 12);
        const waveformSampleAt = (progress: number) => {
          if (!waveformData.length) return 0;
          const wrapped = ((progress % 1) + 1) % 1;
          const index = Math.min(
            waveformData.length - 1,
            Math.floor(wrapped * waveformData.length),
          );
          return THREE.MathUtils.clamp(
            (waveformData[index] - 128) / 128 * waveformGain,
            -1,
            1,
          );
        };
        const waveformMotion = THREE.MathUtils.clamp(waveformPeak * waveformGain, 0, 1);
        for (let ring = 0; ring < 11; ring++) {
          const y = domeY + 18 + ring * ((baseY - domeY - 25) / 10);
          const ringEnergy = sensitiveBand(ring / 11, (ring + 1) / 11, 2);
          const ringWave = Math.abs(waveformSampleAt(time * 0.22 + ring / 11));
          const ringReaction = Math.max(ringEnergy, ringWave);
          crtContext.fillStyle = ring % 2 ? '#64c9bd' : '#f4d789';
          crtContext.globalAlpha = 0.48 + ringReaction * 0.5;
          crtContext.fillRect(
            coilX - 21 - ringReaction * 10,
            y,
            42 + ringReaction * 20,
            3 + ringWave * 2,
          );
        }
        crtContext.globalAlpha = 1;
        crtContext.fillStyle = '#d9fff9';
        crtContext.beginPath();
        crtContext.arc(coilX, domeY, 17 + waveformMotion * 11 + beat * 15, 0, Math.PI * 2);
        crtContext.fill();

        const boltCount = 6 + Math.round(Math.max(smoothedEnergy, waveformMotion) * 4);
        crtContext.lineCap = 'round';
        for (let bolt = 0; bolt < boltCount; bolt++) {
          const bandEnergy = sensitiveBand(bolt / boltCount, (bolt + 1) / boltCount, 2.35);
          const waveX = waveformSampleAt(time * 0.18 + bolt / boltCount);
          const waveY = waveformSampleAt(time * 0.18 + bolt / boltCount + 0.24);
          const boltReaction = Math.max(bandEnergy, Math.abs(waveX), Math.abs(waveY));
          const side = bolt % 2 ? 1 : -1;
          const reach = Math.min(
            width * 0.46,
            78 + bandEnergy * 54 + Math.abs(waveX) * 54 + waveformMotion * 18,
          );
          const endX = coilX + side * reach;
          const endY = THREE.MathUtils.clamp(
            domeY
              + waveY * height * 0.36
              + Math.sin(time * (4.5 + treble * 8) + bolt * 1.7) * (12 + treble * 18),
            18,
            height * 0.66,
          );
          crtContext.strokeStyle = bolt % 3 ? '#b9f5ff' : '#f1b5ff';
          crtContext.lineWidth = 1.8 + boltReaction * 3.2 + beat * 4;
          crtContext.globalAlpha = 0.55 + boltReaction * 0.43;
          crtContext.beginPath();
          crtContext.moveTo(coilX, domeY);
          const segments = 10;
          for (let segment = 1; segment <= segments; segment++) {
            const progress = segment / segments;
            const segmentWave = waveformSampleAt(
              time * 0.34 + bolt / boltCount + progress * 0.2,
            );
            const jitter = (
              segmentWave * (18 + boltReaction * 30)
              + Math.sin(time * 31 + bolt * 7.1 + segment * 12.7) * (5 + bandEnergy * 8)
            );
            crtContext.lineTo(
              THREE.MathUtils.lerp(coilX, endX, progress) + (segment === segments ? 0 : jitter),
              THREE.MathUtils.lerp(domeY, endY, progress)
                + (segment === segments ? 0 : segmentWave * 8),
            );
          }
          crtContext.stroke();
        }
        crtContext.globalAlpha = 1;
        crtContext.fillStyle = '#f4d789';
        crtContext.font = '700 9px monospace';
        crtContext.textAlign = 'center';
        crtContext.fillText('TESLA AUDIO COIL', coilX, height - 12);
        crtContext.restore();
      } else if (visualizerMode === 'radar') {
        crtContext.save();
        crtContext.fillStyle = 'rgba(1,18,11,.64)';
        crtContext.fillRect(0, 0, width, height);
        crtContext.translate(width / 2, height / 2);
        const radarRadius = Math.min(width, height) * 0.4;
        crtContext.strokeStyle = '#54f58c';
        crtContext.lineWidth = 2;
        for (let ring = 1; ring <= 4; ring++) {
          crtContext.globalAlpha = 0.2 + ring * 0.08;
          crtContext.beginPath();
          crtContext.arc(0, 0, radarRadius * ring / 4, 0, Math.PI * 2);
          crtContext.stroke();
        }
        crtContext.globalAlpha = 0.32;
        crtContext.beginPath();
        crtContext.moveTo(-radarRadius, 0);
        crtContext.lineTo(radarRadius, 0);
        crtContext.moveTo(0, -radarRadius);
        crtContext.lineTo(0, radarRadius);
        crtContext.stroke();
        const radarDelta = radar.lastTime ? Math.min(time - radar.lastTime, 0.05) : 1 / 60;
        radar.lastTime = time;
        const radarBeatTriggered = beat > 0.055 && !radar.beatLatched;
        if (radarBeatTriggered) {
          radar.beatLatched = true;
          let strongestBlip = 0;
          let strongestLevel = -1;
          for (let blip = 0; blip < radar.blipLevels.length; blip++) {
            const level = sensitiveBand(blip / 8, (blip + 1) / 8, 2);
            if (level > strongestLevel) {
              strongestLevel = level;
              strongestBlip = blip;
            }
          }
          radar.blipLevels[strongestBlip] = 1;
          if (beat > 0.11) {
            radar.blipLevels[(strongestBlip + 3) % radar.blipLevels.length] = 0.82;
          }
        } else if (beat < 0.025) {
          radar.beatLatched = false;
        }
        for (let blip = 0; blip < radar.blipLevels.length; blip++) {
          radar.blipLevels[blip] = Math.max(0, radar.blipLevels[blip] - radarDelta * 1.45);
        }

        const sweepAngle = time * 0.72;
        const sweep = crtContext.createRadialGradient(0, 0, 0, 0, 0, radarRadius);
        sweep.addColorStop(0, 'rgba(118,255,157,.72)');
        sweep.addColorStop(1, 'rgba(118,255,157,0)');
        crtContext.fillStyle = sweep;
        crtContext.globalAlpha = 0.46;
        crtContext.beginPath();
        crtContext.moveTo(0, 0);
        crtContext.arc(0, 0, radarRadius, sweepAngle - 0.34, sweepAngle);
        crtContext.closePath();
        crtContext.fill();
        crtContext.strokeStyle = '#d8ffe5';
        crtContext.globalAlpha = 0.9;
        crtContext.beginPath();
        crtContext.moveTo(0, 0);
        crtContext.lineTo(Math.cos(sweepAngle) * radarRadius, Math.sin(sweepAngle) * radarRadius);
        crtContext.stroke();
        for (let blip = 0; blip < 8; blip++) {
          const beatLevel = radar.blipLevels[blip];
          const angle = blip * 2.399;
          const radius = radarRadius * (0.2 + blip % 4 * 0.18);
          crtContext.fillStyle = beatLevel > 0.02 ? '#effff3' : '#54f58c';
          crtContext.globalAlpha = 0.16 + beatLevel * 0.84;
          const size = 2 + beatLevel * 7;
          crtContext.fillRect(Math.cos(angle) * radius - size / 2, Math.sin(angle) * radius - size / 2, size, size);
        }
        crtContext.globalAlpha = 1;
        crtContext.restore();
      } else if (visualizerMode === 'reaction') {
        const gridWidth = reaction.width;
        const gridHeight = reaction.height;
        if (!reaction.seeded) {
          reaction.u.fill(1);
          reaction.v.fill(0);
          for (let seed = 0; seed < 7; seed++) {
            const seedX = 8 + seed * 9;
            const seedY = 9 + (seed * 13 % 29);
            for (let y = -2; y <= 2; y++) {
              for (let x = -2; x <= 2; x++) {
                const index = (seedY + y) * gridWidth + seedX + x;
                reaction.v[index] = 0.82;
                reaction.u[index] = 0.18;
              }
            }
          }
          reaction.seeded = true;
        }
        const reactionBeat = beat > 0.055 && !reaction.beatLatched;
        if (reactionBeat) {
          reaction.beatLatched = true;
          const pulseX = 4 + Math.floor((Math.sin(time * 1.7) * 0.5 + 0.5) * (gridWidth - 9));
          const pulseY = 4 + Math.floor((Math.cos(time * 1.13) * 0.5 + 0.5) * (gridHeight - 9));
          for (let y = -2; y <= 2; y++) {
            for (let x = -2; x <= 2; x++) {
              reaction.v[(pulseY + y) * gridWidth + pulseX + x] = 1;
            }
          }
        } else if (beat < 0.025) {
          reaction.beatLatched = false;
        }
        const feed = 0.033 + bass * 0.008;
        const kill = 0.061 + treble * 0.006;
        for (let iteration = 0; iteration < 2; iteration++) {
          for (let y = 1; y < gridHeight - 1; y++) {
            for (let x = 1; x < gridWidth - 1; x++) {
              const index = y * gridWidth + x;
              const u = reaction.u[index];
              const v = reaction.v[index];
              const laplaceU = reaction.u[index - 1] + reaction.u[index + 1]
                + reaction.u[index - gridWidth] + reaction.u[index + gridWidth] - u * 4;
              const laplaceV = reaction.v[index - 1] + reaction.v[index + 1]
                + reaction.v[index - gridWidth] + reaction.v[index + gridWidth] - v * 4;
              const reactionRate = u * v * v;
              reaction.nextU[index] = THREE.MathUtils.clamp(
                u + (0.19 * laplaceU - reactionRate + feed * (1 - u)),
                0,
                1,
              );
              reaction.nextV[index] = THREE.MathUtils.clamp(
                v + (0.095 * laplaceV + reactionRate - (kill + feed) * v),
                0,
                1,
              );
            }
          }
          [reaction.u, reaction.nextU] = [reaction.nextU, reaction.u];
          [reaction.v, reaction.nextV] = [reaction.nextV, reaction.v];
        }
        crtContext.fillStyle = 'rgba(4,6,18,.72)';
        crtContext.fillRect(0, 0, width, height);
        const cellWidth = width / gridWidth;
        const cellHeight = height / gridHeight;
        for (let y = 1; y < gridHeight - 1; y++) {
          for (let x = 1; x < gridWidth - 1; x++) {
            const level = THREE.MathUtils.clamp(
              (reaction.v[y * gridWidth + x] - reaction.u[y * gridWidth + x] * 0.18) * 1.45,
              0,
              1,
            );
            if (level < 0.08) continue;
            crtContext.fillStyle = level > 0.68 ? '#f4d789' : level > 0.34 ? '#d06cff' : '#4de4ff';
            crtContext.globalAlpha = 0.2 + level * 0.78;
            crtContext.fillRect(
              x * cellWidth,
              y * cellHeight,
              Math.ceil(cellWidth) + 1,
              Math.ceil(cellHeight) + 1,
            );
          }
        }
        crtContext.globalAlpha = 1;
      } else if (visualizerMode === 'copper') {
        crtContext.save();
        crtContext.globalCompositeOperation = 'screen';
        for (let bar = 0; bar < 9; bar++) {
          const bandEnergy = sensitiveBand(bar / 9, (bar + 1) / 9, 2.2);
          const centerY = (
            height / 2
            + Math.sin(time * (0.7 + bar * 0.07) + bar * 0.82) * (74 + bandEnergy * 34)
          );
          const thickness = 5 + bandEnergy * 17 + beat * 8;
          const gradient = crtContext.createLinearGradient(0, centerY - thickness, 0, centerY + thickness);
          gradient.addColorStop(0, 'rgba(230,106,50,0)');
          gradient.addColorStop(0.34, `rgba(230,106,50,${0.2 + bandEnergy * 0.55})`);
          gradient.addColorStop(0.5, `rgba(244,215,137,${0.5 + bandEnergy * 0.5})`);
          gradient.addColorStop(0.66, `rgba(100,201,189,${0.2 + treble * 0.5})`);
          gradient.addColorStop(1, 'rgba(100,201,189,0)');
          crtContext.fillStyle = gradient;
          crtContext.fillRect(0, centerY - thickness, width, thickness * 2);
        }
        crtContext.restore();
      } else if (visualizerMode === 'boids') {
        crtContext.save();
        crtContext.fillStyle = 'rgba(3,9,17,.72)';
        crtContext.fillRect(0, 0, width, height);
        if (!boids.agents.length) {
          for (let index = 0; index < 38; index++) {
            const angle = index * 2.399;
            boids.agents.push({
              x: width * (0.16 + (index * 37 % 67) / 100),
              y: height * (0.16 + (index * 53 % 67) / 100),
              vx: Math.cos(angle) * 34,
              vy: Math.sin(angle) * 34,
            });
          }
        }
        const boidDelta = boids.lastTime ? Math.min(time - boids.lastTime, 0.04) : 1 / 60;
        boids.lastTime = time;
        for (let index = 0; index < boids.agents.length; index++) {
          const agent = boids.agents[index];
          let centerX = 0;
          let centerY = 0;
          let alignX = 0;
          let alignY = 0;
          let separateX = 0;
          let separateY = 0;
          let neighbors = 0;
          for (let otherIndex = 0; otherIndex < boids.agents.length; otherIndex++) {
            if (otherIndex === index) continue;
            const other = boids.agents[otherIndex];
            const dx = other.x - agent.x;
            const dy = other.y - agent.y;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared > 3600) continue;
            centerX += other.x;
            centerY += other.y;
            alignX += other.vx;
            alignY += other.vy;
            neighbors += 1;
            if (distanceSquared < 324) {
              separateX -= dx / Math.max(9, distanceSquared);
              separateY -= dy / Math.max(9, distanceSquared);
            }
          }
          if (neighbors) {
            centerX = centerX / neighbors - agent.x;
            centerY = centerY / neighbors - agent.y;
            alignX = alignX / neighbors - agent.vx;
            alignY = alignY / neighbors - agent.vy;
            agent.vx += centerX * 0.012 + alignX * 0.035 + separateX * 19;
            agent.vy += centerY * 0.012 + alignY * 0.035 + separateY * 19;
          }
          const centerPull = 0.018 + mid * 0.026;
          agent.vx += (width / 2 - agent.x) * centerPull * boidDelta;
          agent.vy += (height / 2 - agent.y) * centerPull * boidDelta;
          const speed = Math.hypot(agent.vx, agent.vy) || 1;
          const targetSpeed = 26 + sensitiveBand(index / boids.agents.length, (index + 1) / boids.agents.length, 2) * 72;
          agent.vx = agent.vx / speed * targetSpeed;
          agent.vy = agent.vy / speed * targetSpeed;
          agent.x = (agent.x + agent.vx * boidDelta + width) % width;
          agent.y = (agent.y + agent.vy * boidDelta + height) % height;
        }
        crtContext.globalCompositeOperation = 'screen';
        for (let index = 0; index < boids.agents.length; index++) {
          const agent = boids.agents[index];
          const speed = Math.hypot(agent.vx, agent.vy) || 1;
          const directionX = agent.vx / speed;
          const directionY = agent.vy / speed;
          const sideX = -directionY;
          const sideY = directionX;
          const reactionLevel = sensitiveBand(index / boids.agents.length, (index + 1) / boids.agents.length, 2);
          const size = 4 + reactionLevel * 5;
          crtContext.fillStyle = index % 5 === 0 ? '#f4d789' : index % 2 ? '#4de4ff' : '#73f59a';
          crtContext.globalAlpha = 0.38 + reactionLevel * 0.58;
          crtContext.beginPath();
          crtContext.moveTo(agent.x + directionX * size, agent.y + directionY * size);
          crtContext.lineTo(agent.x - directionX * size * 0.7 + sideX * size * 0.58, agent.y - directionY * size * 0.7 + sideY * size * 0.58);
          crtContext.lineTo(agent.x - directionX * size * 0.7 - sideX * size * 0.58, agent.y - directionY * size * 0.7 - sideY * size * 0.58);
          crtContext.closePath();
          crtContext.fill();
        }
        crtContext.globalAlpha = 1;
        crtContext.globalCompositeOperation = 'source-over';
        crtContext.restore();
      } else if (visualizerMode === 'metaballs') {
        const cellSize = 8;
        const blobs = [
          {
            x: width * (0.3 + Math.sin(time * 0.7) * 0.15),
            y: height * (0.46 + Math.cos(time * 0.9) * 0.2),
            radius: 34 + bass * 54,
          },
          {
            x: width * (0.68 + Math.cos(time * 0.58) * 0.18),
            y: height * (0.42 + Math.sin(time * 1.1) * 0.23),
            radius: 28 + mid * 50,
          },
          {
            x: width * (0.5 + Math.sin(time * 1.34) * 0.22),
            y: height * (0.68 + Math.cos(time * 0.76) * 0.13),
            radius: 22 + treble * 46,
          },
        ];
        for (let y = 0; y < height; y += cellSize) {
          for (let x = 0; x < width; x += cellSize) {
            let field = 0;
            for (const blob of blobs) {
              const dx = x - blob.x;
              const dy = y - blob.y;
              field += blob.radius * blob.radius / Math.max(80, dx * dx + dy * dy);
            }
            if (field < 0.72) continue;
            const level = THREE.MathUtils.clamp((field - 0.72) * 1.45, 0, 1);
            crtContext.fillStyle = level > 0.62 ? '#f4d789' : level > 0.28 ? '#e66a32' : '#64c9bd';
            crtContext.globalAlpha = 0.34 + level * 0.58;
            crtContext.fillRect(x, y, cellSize, cellSize);
          }
        }
        crtContext.globalAlpha = 1;
      } else if (visualizerMode === 'synthwave') {
        crtContext.save();
        crtContext.fillStyle = 'rgba(12,3,30,.7)';
        crtContext.fillRect(0, 0, width, height);
        const horizon = height * 0.57;
        const sunX = width / 2;
        const sunY = height * 0.34;
        const sunRadius = 46;
        crtContext.save();
        crtContext.beginPath();
        crtContext.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        crtContext.clip();
        const sunGradient = crtContext.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
        sunGradient.addColorStop(0, '#64e8ff');
        sunGradient.addColorStop(0.5, '#f083ff');
        sunGradient.addColorStop(1, '#ff6a46');
        crtContext.fillStyle = sunGradient;
        crtContext.fillRect(sunX - sunRadius, sunY - sunRadius, sunRadius * 2, sunRadius * 2);
        crtContext.fillStyle = 'rgba(25,6,55,.72)';
        for (let stripe = 0; stripe < 8; stripe++) {
          const y = sunY - 5 + stripe * 9;
          crtContext.fillRect(sunX - sunRadius, y, sunRadius * 2, 3 + stripe * 0.35);
        }
        crtContext.restore();

        const buildings = 18;
        for (let building = 0; building < buildings; building++) {
          const buildingEnergy = sensitiveBand(building / buildings, (building + 1) / buildings, 2);
          const buildingWidth = width / buildings + 1;
          const buildingHeight = 12 + buildingEnergy * 78;
          const x = building * width / buildings;
          crtContext.fillStyle = building % 3 ? '#24143f' : '#34194f';
          crtContext.fillRect(x, horizon - buildingHeight, buildingWidth, buildingHeight);
          crtContext.fillStyle = building % 2 ? '#ff72db' : '#63e7ff';
          crtContext.globalAlpha = 0.34 + buildingEnergy * 0.52;
          crtContext.fillRect(x + buildingWidth * 0.42, horizon - buildingHeight, 2, buildingHeight);
        }
        crtContext.globalAlpha = 1;
        crtContext.strokeStyle = '#4de8ff';
        crtContext.lineWidth = 1.5;
        for (let lane = -8; lane <= 8; lane++) {
          crtContext.beginPath();
          crtContext.moveTo(width / 2, horizon);
          crtContext.lineTo(width / 2 + lane * 42, height);
          crtContext.stroke();
        }
        const travelPhase = time * 0.7 % 1;
        for (let line = 0; line < 12; line++) {
          const depth = (line / 12 + travelPhase) % 1;
          const y = horizon + Math.pow(depth, 1.8) * (height - horizon);
          crtContext.globalAlpha = 0.18 + depth * 0.72;
          crtContext.lineWidth = 1 + depth * 2.2;
          crtContext.beginPath();
          crtContext.moveTo(0, y);
          crtContext.lineTo(width, y);
          crtContext.stroke();
        }
        crtContext.fillStyle = '#ff72db';
        for (let marker = 0; marker < 9; marker++) {
          const depth = (marker / 9 + travelPhase) % 1;
          const nearScale = Math.pow(depth, 1.75);
          const y = horizon + nearScale * (height - horizon);
          const offset = 10 + nearScale * width * 0.19;
          const markerWidth = 2 + nearScale * 8;
          const markerHeight = 1 + nearScale * 5;
          crtContext.globalAlpha = 0.22 + depth * 0.72;
          crtContext.fillRect(width / 2 - offset - markerWidth, y, markerWidth, markerHeight);
          crtContext.fillRect(width / 2 + offset, y, markerWidth, markerHeight);
        }
        crtContext.globalAlpha = 1;
        crtContext.lineWidth = 1;
        crtContext.restore();
      } else if (visualizerMode === 'stars') {
        crtContext.save();
        crtContext.fillStyle = 'rgba(2,4,18,.72)';
        crtContext.fillRect(0, 0, width, height);
        crtContext.translate(width / 2, height / 2);
        const starCount = 96;
        const maximumRadius = Math.hypot(width / 2, height / 2) * 1.08;
        for (let star = 0; star < starCount; star++) {
          const depth = (star * 0.137 + time * 0.22) % 1;
          const angle = star * 2.399 + Math.sin(star * 4.73) * 0.24;
          const spread = 0.66 + (star * 37 % 31) / 100;
          const radius = Math.pow(depth, 1.62) * maximumRadius * spread;
          const trailDepth = Math.max(0, depth - 0.025 - depth * 0.045);
          const trailRadius = Math.pow(trailDepth, 1.62) * maximumRadius * spread;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius * 0.72;
          const trailX = Math.cos(angle) * trailRadius;
          const trailY = Math.sin(angle) * trailRadius * 0.72;
          const size = 1 + depth * 4.2;
          crtContext.strokeStyle = star % 5 === 0 ? '#f4d789' : '#c9fbff';
          crtContext.lineWidth = 0.6 + depth * 2.2;
          crtContext.globalAlpha = 0.16 + depth * 0.66;
          crtContext.beginPath();
          crtContext.moveTo(trailX, trailY);
          crtContext.lineTo(x, y);
          crtContext.stroke();
          crtContext.fillStyle = star % 5 === 0 ? '#fff1b5' : '#eaffff';
          crtContext.globalAlpha = 0.38 + depth * 0.62;
          crtContext.fillRect(x - size / 2, y - size / 2, size, size);
        }
        crtContext.globalAlpha = 1;
        crtContext.lineWidth = 1;
        crtContext.restore();
      } else if (visualizerMode === 'fireworks') {
        crtContext.save();
        crtContext.fillStyle = 'rgba(3,5,16,.76)';
        crtContext.fillRect(0, 0, width, height);
        const colors = ['#f4d789', '#e66a32', '#64c9bd', '#d88cff', '#f06eaa'];
        const fireworkDelta = fireworks.lastTime
          ? Math.min(time - fireworks.lastTime, 0.05)
          : 1 / 60;
        fireworks.lastTime = time;
        const fireworkBeatTriggered = beat > 0.055 && !fireworks.beatLatched;
        if (fireworkBeatTriggered) {
          fireworks.beatLatched = true;
          fireworks.beatCount += 1;
          if (fireworks.beatCount % 2 === 0) {
            fireworks.rockets.push({
              x: width * (0.12 + Math.random() * 0.76),
              y: height + 8,
              targetY: height * (0.14 + Math.random() * 0.5),
              speed: 125 + Math.random() * 85,
              drift: -14 + Math.random() * 28,
              color: Math.floor(Math.random() * colors.length),
            });
          }
        } else if (beat < 0.025) {
          fireworks.beatLatched = false;
        }

        for (let rocket = fireworks.rockets.length - 1; rocket >= 0; rocket--) {
          const activeRocket = fireworks.rockets[rocket];
          activeRocket.y -= activeRocket.speed * fireworkDelta;
          activeRocket.x += activeRocket.drift * fireworkDelta;
          if (activeRocket.y <= activeRocket.targetY) {
            const particleCount = 18 + Math.floor(Math.random() * 15);
            fireworks.bursts.push({
              x: activeRocket.x,
              y: activeRocket.targetY,
              age: 0,
              duration: 1.25 + Math.random() * 0.85,
              particles: Array.from({ length: particleCount }, (_, particle) => ({
                angle: particle / particleCount * Math.PI * 2 + Math.random() * 0.22,
                speed: 42 + Math.random() * 92,
                size: 2 + Math.random() * 4,
                color: (activeRocket.color + Math.floor(Math.random() * 3)) % colors.length,
              })),
            });
            fireworks.rockets.splice(rocket, 1);
          }
        }

        for (const activeRocket of fireworks.rockets) {
          crtContext.fillStyle = colors[activeRocket.color];
          crtContext.globalAlpha = 0.38;
          crtContext.fillRect(activeRocket.x - 1, activeRocket.y + 5, 3, 22);
          crtContext.fillStyle = '#fff5ce';
          crtContext.globalAlpha = 0.95;
          crtContext.fillRect(activeRocket.x - 3, activeRocket.y - 3, 7, 7);
        }

        for (let burst = fireworks.bursts.length - 1; burst >= 0; burst--) {
          const activeBurst = fireworks.bursts[burst];
          activeBurst.age += fireworkDelta;
          const progress = activeBurst.age / activeBurst.duration;
          if (progress >= 1) {
            fireworks.bursts.splice(burst, 1);
            continue;
          }
          const fade = Math.pow(1 - progress, 0.72);
          for (const particle of activeBurst.particles) {
            const distance = particle.speed * activeBurst.age * (1 - progress * 0.2);
            const gravity = activeBurst.age * activeBurst.age * 34;
            const x = activeBurst.x + Math.cos(particle.angle) * distance;
            const y = activeBurst.y + Math.sin(particle.angle) * distance + gravity;
            const size = particle.size * (0.55 + fade * 0.75);
            crtContext.fillStyle = colors[particle.color];
            crtContext.globalAlpha = fade * 0.92;
            crtContext.fillRect(x - size / 2, y - size / 2, size, size);
            crtContext.globalAlpha = fade * 0.32;
            crtContext.fillRect(
              x - Math.cos(particle.angle) * 9 - size / 2,
              y - Math.sin(particle.angle) * 7 - size / 2,
              size,
              size,
            );
          }
        }
        crtContext.globalAlpha = 1;
        crtContext.restore();
      }
    }

    const vignette = crtContext.createRadialGradient(width / 2, height / 2, 45, width / 2, height / 2, 205);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.46)');
    crtContext.fillStyle = vignette;
    crtContext.fillRect(0, 0, width, height);
    crtContext.fillStyle = 'rgba(0,0,0,.14)';
    for (let y = 0; y < height; y += 5) crtContext.fillRect(0, y, width, 2);
    const scanCycle = time % 7.8;
    if (scanCycle < 1.25) {
      const scanProgress = scanCycle / 1.25;
      const scanY = -22 + scanProgress * (height + 44);
      const scanGlow = crtContext.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      scanGlow.addColorStop(0, 'rgba(180,235,225,0)');
      scanGlow.addColorStop(0.42, 'rgba(180,235,225,.08)');
      scanGlow.addColorStop(0.5, 'rgba(235,255,238,.3)');
      scanGlow.addColorStop(0.58, 'rgba(180,235,225,.08)');
      scanGlow.addColorStop(1, 'rgba(180,235,225,0)');
      crtContext.globalCompositeOperation = 'screen';
      crtContext.fillStyle = scanGlow;
      crtContext.fillRect(0, scanY - 20, width, 40);
      crtContext.globalCompositeOperation = 'source-over';
      crtContext.fillStyle = 'rgba(3,10,12,.28)';
      crtContext.fillRect(0, scanY + 10, width, 3);
    }
    for (let index = 0; index < 55; index++) {
      crtContext.fillStyle = `rgba(220,235,205,${Math.random() * 0.16})`;
      crtContext.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
    crtTexture.needsUpdate = true;
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pressed: THREE.Group | null = null;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let hover: THREE.Group | null = null;
  let latestClientX = 0;
  let latestClientY = 0;
  let scrollFrame = 0;
  let activePointerId: number | null = null;
  let tvVolumePointerId: number | null = null;
  let tvPlayPointerId: number | null = null;
  let tvVolumeDragStartX = 0;
  let tvVolumeDragStartY = 0;
  let tvVolumeDragStartValue = 1;
  let crtFocused = false;

  function hit(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(tapeRoots, true);
    let object: THREE.Object3D | null = intersections[0]?.object ?? null;
    while (object && !tapeRoots.includes(object as THREE.Group)) object = object.parent;
    return object as THREE.Group | null;
  }

  function hitSwitch(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersection = raycaster.intersectObjects(switchRoots, true)[0];
    let object: THREE.Object3D | null = intersection?.object ?? null;
    while (object && !switchRoots.includes(object as THREE.Group)) object = object.parent;
    const index = switchRoots.indexOf(object as THREE.Group);
    return index >= 0 ? wallSwitches[index] : null;
  }

  function hitTvAudioControl(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersection = raycaster.intersectObjects(tvAudioControlRoots, true)[0];
    let object: THREE.Object3D | null = intersection?.object ?? null;
    while (object && !tvAudioControlRoots.includes(object as THREE.Group)) object = object.parent;
    return object?.userData.tvAudioControl as 'play' | 'volume' | undefined;
  }

  function updateTvVolumeFromPointer(event: PointerEvent) {
    const dragDistance = (event.clientX - tvVolumeDragStartX)
      - (event.clientY - tvVolumeDragStartY);
    setTvVolume(tvVolumeDragStartValue + dragDistance * 0.008, true);
  }

  function releaseTvAudioControl(event?: PointerEvent) {
    if (
      event
      && event.pointerId !== tvVolumePointerId
      && event.pointerId !== tvPlayPointerId
    ) return;
    if (tvVolumePointerId !== null && canvas.hasPointerCapture(tvVolumePointerId)) {
      canvas.releasePointerCapture(tvVolumePointerId);
    }
    if (tvPlayPointerId !== null && canvas.hasPointerCapture(tvPlayPointerId)) {
      canvas.releasePointerCapture(tvPlayPointerId);
    }
    tvVolumePointerId = null;
    tvPlayPointerId = null;
    tvPlayCap.position.z = 0.13;
  }

  function hitTelevision(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return Boolean(raycaster.intersectObject(television, true)[0]);
  }

  function setCrtFocus(active: boolean) {
    if (crtFocused === active) return;
    crtFocused = active;
    hover = null;
    canvas.style.cursor = 'default';
    handCursor.hover(latestClientX, latestClientY, false);
    onCrtFocusChange(active);
  }

  function updateDropTarget() {
    const target = document.elementFromPoint(latestClientX, latestClientY);
    const overDropTarget = Boolean(target && dropTarget.contains(target));
    const overQueueTarget = Boolean(target && queueTarget.contains(target));
    dropTarget.classList.toggle('is-over', overDropTarget);
    queueTarget.classList.toggle('is-over', overQueueTarget);
    handCursor.move(latestClientX, latestClientY, overDropTarget || overQueueTarget);
    return overDropTarget ? 'player' : overQueueTarget ? 'queue' : null;
  }

  function autoScroll() {
    if (!pressed) {
      scrollFrame = 0;
      return;
    }
    const scrollEdge = 90;
    if (latestClientY < scrollEdge) {
      window.scrollBy(0, -Math.max(8, (scrollEdge - latestClientY) * 0.18));
    } else if (latestClientY > window.innerHeight - scrollEdge) {
      window.scrollBy(0, Math.max(8, (latestClientY - window.innerHeight + scrollEdge) * 0.18));
    }
    updateDropTarget();
    scrollFrame = requestAnimationFrame(autoScroll);
  }

  function cancelDrag(event?: PointerEvent) {
    if (!pressed) return;
    if (event && activePointerId !== null && event.pointerId !== activePointerId) return;
    pressed.position.copy(pressed.userData.home);
    pressed.rotation.copy(pressed.userData.rotationHome);
    pressed = null;
    activePointerId = null;
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    canvas.classList.remove('is-dragging');
    canvas.style.cursor = 'default';
    dropTarget.classList.remove('awaiting-drop', 'is-over');
    queueTarget.classList.remove('awaiting-drop', 'is-over');
    onCassetteFocusChange(false);
    handCursor.release(false);
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (pressed || tvVolumePointerId !== null || tvPlayPointerId !== null) return;
    const tvAudioControl = hitTvAudioControl(event);
    if (tvAudioControl === 'play') {
      tvPlayPointerId = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
      tvPlayCap.position.z = 0.07;
      if (tvTransportEnabled) onTogglePlayback();
      return;
    }
    if (tvAudioControl === 'volume') {
      tvVolumePointerId = event.pointerId;
      tvVolumeDragStartX = event.clientX;
      tvVolumeDragStartY = event.clientY;
      tvVolumeDragStartValue = tvVolume;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (crtFocused) return;
    const wallSwitch = hitSwitch(event);
    if (wallSwitch) {
      toggleWallSwitch(wallSwitch);
      return;
    }
    pressed = hit(event);
    if (!pressed && hitTelevision(event)) {
      setCrtFocus(true);
      return;
    }
    if (!pressed) return;
    onInspect(String(pressed.userData.title));
    onCassetteFocusChange(true);
    activePointerId = event.pointerId;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
    dropTarget.classList.add('awaiting-drop');
    queueTarget.classList.add('awaiting-drop');
    canvas.style.cursor = 'none';
    latestClientX = event.clientX;
    latestClientY = event.clientY;
    handCursor.grab(
      String(pressed.userData.title),
      String(pressed.userData.cover),
      event.clientX,
      event.clientY,
    );
    if (!scrollFrame) scrollFrame = requestAnimationFrame(autoScroll);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (tvVolumePointerId === event.pointerId) {
      updateTvVolumeFromPointer(event);
      return;
    }
    if (tvPlayPointerId === event.pointerId) return;
    if (pressed && event.pointerId !== activePointerId) return;
    latestClientX = event.clientX;
    latestClientY = event.clientY;
    const nextTvAudioControl = hitTvAudioControl(event);
    if (crtFocused) {
      canvas.style.cursor = nextTvAudioControl === 'volume'
        ? 'grab'
        : nextTvAudioControl === 'play'
          ? 'pointer'
          : 'default';
      handCursor.hover(event.clientX, event.clientY, false);
      return;
    }
    const nextSwitch = hitSwitch(event);
    const nextHover = hit(event);
    const nextTelevision = !nextTvAudioControl && !nextSwitch && !nextHover && hitTelevision(event);
    if (hover !== nextHover) {
      hover = nextHover;
    }
    canvas.style.cursor = nextTvAudioControl === 'volume'
      ? 'grab'
      : nextTvAudioControl || nextSwitch || nextTelevision
        ? 'pointer'
        : hover || pressed
          ? 'none'
          : 'default';
    handCursor.hover(event.clientX, event.clientY, Boolean((hover || pressed) && !nextSwitch));
    if (pressed) {
      moved ||= Math.hypot(event.clientX - startX, event.clientY - startY) > 7;
      const home = pressed.userData.home as THREE.Vector3;
      pressed.position.x = THREE.MathUtils.clamp(home.x + (event.clientX - startX) * 0.018, -0.1, 8.05);
      pressed.position.z = THREE.MathUtils.clamp(home.z + (event.clientY - startY) * 0.014, -1.55, 1.55);
      pressed.position.y = home.y + 0.36;
      pressed.rotation.z = (pressed.userData.rotationHome as THREE.Euler).z + (event.clientX - startX) * 0.0018;
      updateDropTarget();
    }
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.pointerId === tvVolumePointerId || event.pointerId === tvPlayPointerId) {
      releaseTvAudioControl(event);
      canvas.style.cursor = hitTvAudioControl(event) === 'volume' ? 'grab' : 'pointer';
      return;
    }
    if (!pressed || event.pointerId !== activePointerId) return;
    const chosen = pressed;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const destination = target && dropTarget.contains(target)
      ? 'player'
      : target && queueTarget.contains(target)
        ? 'queue'
        : null;
    pressed = null;
    activePointerId = null;
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    canvas.releasePointerCapture(event.pointerId);
    canvas.classList.remove('is-dragging');
    dropTarget.classList.remove('awaiting-drop', 'is-over');
    queueTarget.classList.remove('awaiting-drop', 'is-over');
    canvas.style.cursor = 'default';
    handCursor.release(Boolean(destination));
    if (destination) {
      chosen.position.copy(chosen.userData.home);
      chosen.rotation.copy(chosen.userData.rotationHome);
      const title = String(chosen.userData.title);
      window.setTimeout(() => {
        if (destination === 'player') onSelect(title, true);
        else onQueue(title);
      }, 260);
      window.setTimeout(() => onCassetteFocusChange(false), 320);
    } else if (!moved) {
      chosen.position.copy(chosen.userData.home);
      chosen.rotation.copy(chosen.userData.rotationHome);
      onSelect(String(chosen.userData.title), false);
      onCassetteFocusChange(false);
    } else {
      chosen.position.y = (chosen.userData.home as THREE.Vector3).y;
      chosen.userData.home = chosen.position.clone();
      chosen.userData.rotationHome = chosen.rotation.clone();
      onCassetteFocusChange(false);
    }
  });
  canvas.addEventListener('pointercancel', (event) => {
    releaseTvAudioControl(event);
    cancelDrag(event);
  });
  canvas.addEventListener('lostpointercapture', (event) => {
    releaseTvAudioControl(event);
    cancelDrag(event);
  });
  canvas.addEventListener('pointerleave', (event) => {
    if (hover && hover !== pressed) hover.position.y = hover.userData.home.y;
    hover = null;
    handCursor.hover(event.clientX, event.clientY, false);
  });

  let pointerX = 0;
  let pointerY = 0;
  const cameraTarget = new THREE.Vector3(0, -0.85, 0);
  const desiredCameraPosition = new THREE.Vector3();
  const desiredCameraTarget = new THREE.Vector3();
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - 0.5;
    pointerY = (event.clientY - rect.top) / rect.height - 0.5;
  });

  const disposeAnimation = animateScene(renderer, scene, camera, resize, (time, delta) => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const cameraScale = Math.max(1, 1.72 / aspect);
    if (crtFocused) {
      desiredCameraPosition.copy(crtFocusPosition);
      desiredCameraTarget.copy(crtFocusTarget);
    } else {
      desiredCameraPosition.set(pointerX * 0.4, 8 * cameraScale - pointerY * 0.16, 17 * cameraScale);
      desiredCameraTarget.set(0, -0.85, 0);
    }
    const cameraDamping = 1 - Math.exp(-delta * 6.5);
    camera.position.lerp(desiredCameraPosition, cameraDamping);
    cameraTarget.lerp(desiredCameraTarget, cameraDamping);
    camera.lookAt(cameraTarget);
    const veilDistance = Math.abs(darknessVeil.position.z);
    const veilHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * veilDistance;
    darknessVeil.scale.set(veilHeight * camera.aspect, veilHeight, 1);
    const darknessTarget = roomLightOn ? 0 : lampOn ? 0.48 : 0.7;
    darknessMaterial.opacity += (darknessTarget - darknessMaterial.opacity) * 0.14;
    nightAmbient.intensity += ((roomLightOn ? 0.88 : 0.13) - nightAmbient.intensity) * 0.12;
    moonlight.intensity += ((roomLightOn ? 0.95 : 0.08) - moonlight.intensity) * 0.12;
    roomLight.intensity += ((roomLightOn ? 13 : 0) - roomLight.intensity) * 0.12;
    lampLight.intensity += ((lampOn ? 34 : 0) - lampLight.intensity) * 0.16;
    lampGlow.intensity += ((lampOn ? 5.5 : 0) - lampGlow.intensity) * 0.16;
    lampShadeMaterial.emissiveIntensity += ((lampOn ? 0.7 : 0.03) - lampShadeMaterial.emissiveIntensity) * 0.18;
    bulbMaterial.emissiveIntensity += ((lampOn ? 2.6 : 0.04) - bulbMaterial.emissiveIntensity) * 0.18;
    const crtPulse = crtPlaying ? 0.96 + Math.sin(time * 47) * 0.018 + smoothedEnergy * 0.12 : 1;
    crtSpill.intensity = (crtCover ? (crtPlaying ? 145 + smoothedEnergy * 55 : 82) : 18) * crtPulse;
    crtGlow.intensity = (crtCover ? (crtPlaying ? 150 + smoothedBass * 45 : 82) : 18) * crtPulse;
    crtDeskGlowMaterial.opacity = Math.min(
      1,
      (crtCover ? (crtPlaying ? 0.96 + smoothedBass * 0.04 : 0.62) : 0.12) * crtPulse,
    );
    crtScreenGlowMaterial.opacity = Math.min(
      1,
      (crtCover ? (crtPlaying ? 0.72 + smoothedEnergy * 0.12 : 0.48) : 0.12) * crtPulse,
    );
    tapeRoots.forEach((tape) => {
      const glow = tape.userData.activeGlow as THREE.Mesh;
      const glowMaterial = tape.userData.activeGlowMaterial as THREE.MeshBasicMaterial;
      const shellMaterial = tape.userData.activeGlowShellMaterial as THREE.MeshBasicMaterial;
      glow.position.x = tape.position.x;
      glow.position.z = tape.position.z;
      const targetOpacity = tape === activeTape && activeTapePlaying ? 0.92 : 0;
      glowMaterial.opacity += (targetOpacity - glowMaterial.opacity) * 0.18;
      shellMaterial.opacity += ((targetOpacity > 0 ? 0.3 : 0) - shellMaterial.opacity) * 0.18;
    });
    tapeRoots.forEach((tape, index) => {
      if (!tape.userData.searchMatch || tape === pressed) return;
      const home = tape.userData.home as THREE.Vector3;
      const rotationHome = tape.userData.rotationHome as THREE.Euler;
      tape.position.y = home.y + 0.92 + Math.sin(time * 2.2 + index * 0.7) * 0.08;
      tape.rotation.x = rotationHome.x + Math.sin(time * 1.8 + index) * 0.07;
      tape.rotation.y = rotationHome.y;
      tape.rotation.z = rotationHome.z + time * 1.25;
      const spotlight = searchSpotlights.get(tape);
      if (spotlight) {
        spotlight.position.x = tape.position.x;
        spotlight.position.z = tape.position.z;
        spotlight.rotation.y = Math.sin(time * 0.7 + index) * 0.08;
      }
    });
    drawCrt(time);
  });
  return {
    async setTrack(song: VisualSong) {
      const cover = await loadCoverTexture(song.cover);
      crtCover = cover.image as CanvasImageSource;
      activeTape = tapeByTitle.get(song.title) ?? null;
      updateActiveTapeColor(crtCover);
      updateCrtLightColor(crtCover);
      drawCrt(performance.now() / 1000);
    },
    setPlaying(active: boolean) {
      crtPlaying = active;
      activeTapePlaying = active;
      refreshTvPlayControl();
    },
    setTransportEnabled(active: boolean) {
      tvTransportEnabled = active;
      refreshTvPlayControl();
    },
    setVolume(value: number) {
      setTvVolume(value);
    },
    setAnalyser(analyser: AnalyserNode) {
      audioAnalyser = analyser;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      waveformData = new Uint8Array(analyser.fftSize);
    },
    setVisualizer(mode: VisualizerMode) {
      if (mode === 'atari') {
        pong.leftScore = 0;
        pong.rightScore = 0;
        if (visualizerMode !== 'atari') pong.lastTime = 0;
      }
      if (mode === 'radar' && visualizerMode !== 'radar') {
        radar.lastTime = 0;
        radar.beatLatched = false;
        radar.blipLevels.fill(0);
      }
      if (mode === 'fireworks' && visualizerMode !== 'fireworks') {
        fireworks.lastTime = 0;
        fireworks.beatLatched = false;
        fireworks.beatCount = 0;
        fireworks.rockets.length = 0;
        fireworks.bursts.length = 0;
      }
      if (mode === 'pipes' && visualizerMode !== 'pipes') {
        pipes.lastTime = 0;
        pipes.stepAccumulator = 0;
        pipes.heads.length = 0;
        pipes.segments.length = 0;
      }
      if (mode === 'boids' && visualizerMode !== 'boids') {
        boids.lastTime = 0;
        boids.agents.length = 0;
      }
      if (mode === 'reaction' && visualizerMode !== 'reaction') {
        reaction.u.fill(1);
        reaction.v.fill(0);
        reaction.nextU.fill(0);
        reaction.nextV.fill(0);
        reaction.seeded = false;
        reaction.beatLatched = false;
      }
      visualizerMode = mode;
    },
    setSearchMatches(titles: string[]) {
      clearSearchSpotlights();
      const matches = new Set(titles);
      tapeRoots
        .filter((tape) => matches.has(String(tape.userData.title)))
        .forEach(addSearchSpotlight);
    },
    setCrtFocus,
    dispose() {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      clearSearchSpotlights();
      crtTexture.dispose();
      crtGlowTexture.dispose();
      activeTapeGlowTexture.dispose();
      tapeRoots.forEach((tape) => {
        const glow = tape.userData.activeGlow as THREE.Mesh | undefined;
        if (glow) {
          scene.remove(glow);
          disposeObject(glow);
        }
      });
      crtDeskGlowMaterial.dispose();
      crtScreenGlowMaterial.dispose();
      darknessMaterial.dispose();
      disposeAnimation();
    },
  };
}

export function createPlayerScene(
  canvas: HTMLCanvasElement,
  onVolumeChange: (value: number) => void = () => {},
  onTransport: (action: TransportAction) => void = () => {},
  onCassetteDoorLoadStart: () => void = () => {},
): PlayerSceneController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(4.8, 2.2, 19.5);
  camera.lookAt(0, 0.15, 0);
  const { renderer, resize } = setupRenderer(canvas);
  addLighting(scene);

  const rig = new THREE.Group();
  rig.rotation.set(-0.025, -0.08, -0.015);
  rig.position.set(-0.12, -0.25, 0);
  scene.add(rig);

  const body = box(7.15, 7.45, 1.28, COLORS.blue, [0, 0, 0]);
  rig.add(body);
  rig.add(box(6.86, 7.15, 1.34, COLORS.blueDark, [0.12, -0.08, -0.05]));
  rig.add(box(6.68, 6.9, 1.42, COLORS.blue, [-0.08, 0.08, 0.02]));
  rig.add(box(6.4, 0.12, 1.48, COLORS.orange, [0, 2.15, 0.08]));

  rig.add(box(0.26, 5.1, 1.48, COLORS.metal, [3.63, 0.05, 0]));

  const brand = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.72),
    textureMaterial(canvasTexture('SUBWAVE', 'TPS-14', '#416d88', '#edf0d7', 2), true),
  );
  brand.position.set(-1.65, 2.85, 0.76);
  rig.add(brand);

  const cassetteBay = box(4.58, 3.28, 0.18, 0x0b1519, [0, 0.05, 0.79]);
  rig.add(cassetteBay);
  for (const x of [-1.14, 1.14]) {
    const spindle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10),
      material(COLORS.metal, { roughness: 0.62 }),
    );
    spindle.geometry.rotateX(Math.PI / 2);
    spindle.position.set(x, -0.2, 0.96);
    rig.add(spindle);
  }
  rig.add(box(1.35, 0.28, 0.26, COLORS.metal, [0, -1.27, 0.98]));
  rig.add(box(3.95, 0.1, 0.2, COLORS.blueDark, [0, 1.48, 0.96]));

  const cassetteDoor = new THREE.Group();
  cassetteDoor.position.set(0, -1.63, 1.18);
  const doorCenterY = 1.68;
  cassetteDoor.add(box(4.9, 0.3, 0.28, COLORS.dark, [0, doorCenterY + 1.68, 0]));
  cassetteDoor.add(box(4.9, 0.3, 0.28, COLORS.dark, [0, doorCenterY - 1.68, 0]));
  cassetteDoor.add(box(0.3, 3.65, 0.28, COLORS.dark, [-2.3, doorCenterY, 0]));
  cassetteDoor.add(box(0.3, 3.65, 0.28, COLORS.dark, [2.3, doorCenterY, 0]));
  cassetteDoor.add(box(4.6, 0.18, 0.34, COLORS.orange, [0, 0.08, -0.02]));
  const windowGlass = box(4.32, 3.06, 0.1, COLORS.glass, [0, doorCenterY, 0.15]);
  (windowGlass.material as THREE.MeshStandardMaterial).transparent = true;
  (windowGlass.material as THREE.MeshStandardMaterial).opacity = 0.3;
  (windowGlass.material as THREE.MeshStandardMaterial).depthWrite = false;
  cassetteDoor.add(windowGlass);
  rig.add(cassetteDoor);

  const cassette = createCassette('no tape');
  cassette.group.scale.setScalar(1.04);
  const cassetteHome = new THREE.Vector3(0, -0.02, 0.92);
  const cassetteInsertStart = new THREE.Vector3(0, 2.85, 3.35);
  cassette.group.position.copy(cassetteHome);
  cassette.group.visible = false;
  rig.add(cassette.group);

  type TransportKey = {
    action: TransportAction;
    cap: THREE.Group;
    button: THREE.Mesh;
    face: THREE.Mesh;
  };

  const transportDeck = new THREE.Group();
  transportDeck.position.set(0, -2.18, 0.84);
  transportDeck.add(box(6.35, 1.18, 0.34, COLORS.dark, [0, 0, 0]));
  transportDeck.add(box(6.08, 0.08, 0.4, COLORS.orange, [0, 0.49, 0.08]));
  const transportKeys: TransportKey[] = [];
  const keyDefinitions: Array<{
    action: TransportAction;
    label: string;
    x: number;
  }> = [
    { action: 'rewind', label: 'rew', x: -2.4 },
    { action: 'play', label: 'play', x: -0.8 },
    { action: 'stop', label: 'stop', x: 0.8 },
    { action: 'forward', label: 'ff', x: 2.4 },
  ];

  const transportTexture = (
    definition: (typeof keyDefinitions)[number],
    enabled: boolean,
    active: boolean,
  ) => {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 256;
    textureCanvas.height = 160;
    const context = textureCanvas.getContext('2d');
    if (!context) throw new Error('Transport texture context unavailable.');
    context.imageSmoothingEnabled = false;
    const background = enabled
      ? definition.action === 'play' ? '#dd8242' : '#c7d0bb'
      : '#657d81';
    const foreground = enabled ? '#192124' : '#24383d';
    context.fillStyle = background;
    context.fillRect(0, 0, 256, 160);
    context.fillStyle = 'rgba(255, 255, 255, .24)';
    context.fillRect(8, 8, 240, 12);
    context.fillStyle = 'rgba(13, 24, 27, .18)';
    context.fillRect(8, 140, 240, 12);
    context.strokeStyle = foreground;
    context.lineWidth = 10;
    context.strokeRect(7, 7, 242, 146);
    context.fillStyle = foreground;

    const triangle = (centerX: number, direction: -1 | 1) => {
      context.beginPath();
      context.moveTo(centerX + direction * 25, 66);
      context.lineTo(centerX - direction * 22, 38);
      context.lineTo(centerX - direction * 22, 94);
      context.closePath();
      context.fill();
    };

    if (definition.action === 'rewind') {
      triangle(103, -1);
      triangle(153, -1);
    } else if (definition.action === 'forward') {
      triangle(103, 1);
      triangle(153, 1);
    } else if (definition.action === 'stop') {
      context.fillRect(98, 40, 60, 54);
    } else if (active) {
      context.fillRect(90, 38, 24, 58);
      context.fillRect(142, 38, 24, 58);
    } else {
      triangle(126, 1);
    }

    context.font = '700 52px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      definition.action === 'play' && active ? 'PAUSE' : definition.label.toUpperCase(),
      128,
      128,
    );
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.userData.owned = true;
    return texture;
  };

  for (const definition of keyDefinitions) {
    transportDeck.add(box(1.48, 1.0, 0.28, COLORS.blueDark, [definition.x, -0.02, 0.18]));
    const cap = new THREE.Group();
    cap.position.set(definition.x, -0.02, 0);
    cap.userData.transportAction = definition.action;
    const button = box(
      1.3,
      0.82,
      0.38,
      definition.action === 'play' ? COLORS.orange : COLORS.metal,
      [0, 0, 0.4],
    );
    button.userData.transportAction = definition.action;
    cap.add(button);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.68),
      textureMaterial(transportTexture(definition, false, false)),
    );
    face.position.set(0, 0, 0.6);
    face.userData.transportAction = definition.action;
    cap.add(face);
    transportDeck.add(cap);
    transportKeys.push({ action: definition.action, cap, button, face });
  }
  rig.add(transportDeck);

  const controls = new THREE.Group();
  controls.position.set(0, -3.12, 0.8);
  const volumeMin = -2.25;
  const volumeMax = 2.25;
  controls.add(box(4.7, 0.12, 0.12, 0x718883, [0, -0.16, 0]));
  controls.add(box(4.4, 0.045, 0.16, 0x172426, [0, -0.16, 0.08]));
  const volumeThumb = box(0.58, 0.28, 0.22, COLORS.orange, [0, -0.16, 0.18]);
  controls.add(volumeThumb);

  const progressMin = 0.45;
  const progressMax = 2.35;
  controls.add(box(2.15, 0.1, 0.12, 0x718883, [1.4, 0.28, 0]));
  controls.add(box(1.9, 0.04, 0.16, 0x172426, [1.4, 0.28, 0.08]));
  const progressFill = box(1, 0.07, 0.18, 0xd5b765, [progressMin, 0.28, 0.13]);
  progressFill.geometry.translate(0.5, 0, 0);
  progressFill.scale.x = 0.001;
  controls.add(progressFill);
  const progressThumb = box(0.24, 0.2, 0.2, 0xe7d69b, [progressMin, 0.28, 0.2]);
  controls.add(progressThumb);

  const volumeHit = box(
    volumeMax - volumeMin + 0.5,
    0.75,
    0.18,
    0xffffff,
    [(volumeMin + volumeMax) / 2, -0.16, 0.22],
  );
  const volumeHitMaterial = volumeHit.material as THREE.MeshStandardMaterial;
  volumeHitMaterial.transparent = true;
  volumeHitMaterial.opacity = 0;
  volumeHitMaterial.depthWrite = false;
  controls.add(volumeHit);
  rig.add(controls);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let draggingVolume = false;
  let transportEnabled = false;
  let pressedTransport: TransportKey | null = null;
  let hoveredTransport: TransportKey | null = null;
  let focusedTransport: TransportKey | null = null;
  let playing = false;
  let doorAnimation: { start: number; resolve: () => void } | null = null;

  const refreshTransportKeys = () => {
    for (const key of transportKeys) {
      const definition = keyDefinitions.find((candidate) => candidate.action === key.action)!;
      const keyPlaying = key.action === 'play' && playing;
      disposeMaterial(key.face.material);
      key.face.material = textureMaterial(transportTexture(definition, transportEnabled, keyPlaying));
      const buttonMaterial = key.button.material as THREE.MeshStandardMaterial;
      buttonMaterial.color.setHex(
        transportEnabled
          ? key.action === 'play' ? COLORS.orange : COLORS.metal
          : COLORS.blueDark,
      );
      buttonMaterial.emissive.setHex(
        transportEnabled && (key === hoveredTransport || key === focusedTransport || keyPlaying)
          ? 0x2b9f92
          : 0x000000,
      );
      buttonMaterial.emissiveIntensity = keyPlaying
        ? 0.42
        : key === focusedTransport ? 0.36 : key === hoveredTransport ? 0.28 : 0;
    }
  };

  const setRayFromPointer = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
  };

  const transportKeyAt = (event: PointerEvent) => {
    setRayFromPointer(event);
    const hit = raycaster.intersectObjects(transportKeys.map((key) => key.cap), true)[0];
    if (!hit) return null;
    const action = hit.object.userData.transportAction as TransportAction | undefined;
    return transportKeys.find((key) => key.action === action) ?? null;
  };

  const setVolume = (value: number, notify = false) => {
    const normalized = THREE.MathUtils.clamp(value, 0, 1);
    volumeThumb.position.x = THREE.MathUtils.lerp(volumeMin, volumeMax, normalized);
    if (notify) onVolumeChange(normalized);
  };

  const updatePointer = (event: PointerEvent) => {
    setRayFromPointer(event);
    return raycaster.intersectObject(volumeHit, false)[0];
  };

  const updateVolumeFromPointer = (event: PointerEvent) => {
    const hit = updatePointer(event);
    if (!hit) return false;
    const localPoint = controls.worldToLocal(hit.point.clone());
    setVolume((localPoint.x - volumeMin) / (volumeMax - volumeMin), true);
    return true;
  };

  const onPointerDown = (event: PointerEvent) => {
    const transportKey = transportKeyAt(event);
    if (transportEnabled && transportKey) {
      pressedTransport = transportKey;
      transportKey.cap.position.z = -0.12;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-pressing-transport');
      event.preventDefault();
      return;
    }
    if (!updateVolumeFromPointer(event)) return;
    draggingVolume = true;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-adjusting-volume');
    event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pressedTransport) {
      event.preventDefault();
      return;
    }
    if (draggingVolume) {
      updateVolumeFromPointer(event);
      event.preventDefault();
      return;
    }
    const nextTransport = transportEnabled ? transportKeyAt(event) : null;
    if (nextTransport !== hoveredTransport) {
      if (hoveredTransport) hoveredTransport.cap.position.z = 0;
      hoveredTransport = nextTransport;
      if (hoveredTransport) hoveredTransport.cap.position.z = 0.06;
      refreshTransportKeys();
    }
    canvas.classList.toggle('can-press-transport', Boolean(hoveredTransport));
    canvas.classList.toggle('can-adjust-volume', Boolean(updatePointer(event)));
  };
  const onPointerUp = (event: PointerEvent) => {
    if (pressedTransport) {
      const releasedKey = transportKeyAt(event);
      const action = pressedTransport.action;
      pressedTransport.cap.position.z = releasedKey === pressedTransport ? 0.06 : 0;
      pressedTransport = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.classList.remove('is-pressing-transport');
      if (transportEnabled && releasedKey?.action === action) onTransport(action);
      return;
    }
    if (!draggingVolume) return;
    draggingVolume = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.classList.remove('is-adjusting-volume');
  };
  const onPointerCancel = (event: PointerEvent) => {
    if (pressedTransport) {
      pressedTransport.cap.position.z = 0;
      pressedTransport = null;
      canvas.classList.remove('is-pressing-transport');
      refreshTransportKeys();
    }
    onPointerUp(event);
  };
  const onPointerLeave = () => {
    if (!draggingVolume && !pressedTransport) {
      if (hoveredTransport) hoveredTransport.cap.position.z = 0;
      hoveredTransport = null;
      refreshTransportKeys();
      canvas.classList.remove('can-adjust-volume', 'can-press-transport');
    }
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', onPointerLeave);

  const headphoneGroup = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, -1.0, -0.45),
    new THREE.Vector3(-4.1, 3.35, -0.5),
    new THREE.Vector3(0, 5.5, -0.65),
    new THREE.Vector3(4.1, 3.35, -0.5),
    new THREE.Vector3(4.2, -1.0, -0.45),
  ]);
  const band = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 14, 0.18, 6, false),
    material(COLORS.metal, { metalness: 0.2 }),
  );
  headphoneGroup.add(band);
  for (const x of [-4.18, 4.18]) {
    const ear = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1.35, 2, 6),
      material(COLORS.orange),
    );
    ear.position.set(x, -1.0, 0);
    ear.rotation.z = x < 0 ? 0.12 : -0.12;
    headphoneGroup.add(ear);
  }
  rig.add(headphoneGroup);

  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.2, -1.65, -0.15),
    new THREE.Vector3(4.7, -3.4, -0.3),
    new THREE.Vector3(4.35, -5.3, -0.6),
    new THREE.Vector3(3.5, -6.7, -0.8),
  ]);
  rig.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 8, 0.08, 5, false), material(COLORS.dark)));

  const disposeScene = animateScene(renderer, scene, camera, resize, (time, delta) => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const cameraScale = Math.max(1, 0.86 / aspect);
    camera.position.set(4.8 * cameraScale, 2.2 * cameraScale, 19.5 * cameraScale);
    camera.lookAt(0, 0.15, 0);
    rig.position.y = Math.sin(time * 0.7) * 0.04;
    if (doorAnimation) {
      const progress = THREE.MathUtils.clamp((time - doorAnimation.start) / 2, 0, 1);
      if (progress < 0.28) {
        const opening = THREE.MathUtils.smootherstep(progress / 0.28, 0, 1);
        cassetteDoor.rotation.x = THREE.MathUtils.lerp(0, 1.28, opening);
        cassette.group.visible = false;
      } else if (progress < 0.65) {
        cassetteDoor.rotation.x = 1.28;
        const inserting = THREE.MathUtils.smootherstep((progress - 0.28) / 0.37, 0, 1);
        cassette.group.visible = true;
        cassette.group.position.lerpVectors(cassetteInsertStart, cassetteHome, inserting);
        cassette.group.rotation.set(
          THREE.MathUtils.lerp(-0.32, 0, inserting),
          0,
          0,
        );
      } else {
        cassette.group.visible = true;
        cassette.group.position.copy(cassetteHome);
        cassette.group.rotation.set(0, 0, 0);
        const closing = THREE.MathUtils.smootherstep((progress - 0.65) / 0.35, 0, 1);
        cassetteDoor.rotation.x = THREE.MathUtils.lerp(1.28, 0, closing);
      }
      if (progress >= 1) {
        cassetteDoor.rotation.x = 0;
        cassette.group.position.copy(cassetteHome);
        cassette.group.rotation.set(0, 0, 0);
        const resolve = doorAnimation.resolve;
        doorAnimation = null;
        resolve();
      }
    }
    if (playing) {
      cassette.reels.forEach((reel) => { reel.rotation.z -= delta * 1.6; });
    }
  });

  return {
    async setCassette(song: VisualSong, animateDoor = false) {
      const cover = await loadCoverTexture(song.cover);
      disposeMaterial(cassette.front.material);
      disposeMaterial(cassette.back.material);
      disposeMaterial(cassette.label.material);
      cassette.front.material = textureMaterial(canvasTexture('', '', '#1b292a', '#1b292a'));
      cassette.back.material = textureMaterial(cover);
      cassette.label.material = textureMaterial(maskingTapeTexture(song.title), true);
      if (!animateDoor) {
        cassetteDoor.rotation.x = 0;
        cassette.group.position.copy(cassetteHome);
        cassette.group.rotation.set(0, 0, 0);
        cassette.group.visible = true;
        return;
      }
      cassette.group.visible = false;
      onCassetteDoorLoadStart();
      await new Promise<void>((resolve) => {
        doorAnimation = { start: performance.now() / 1000, resolve };
      });
    },
    setPlaying(value: boolean) {
      playing = value;
      refreshTransportKeys();
    },
    setTransportEnabled(value: boolean) {
      transportEnabled = value;
      if (!value) {
        if (hoveredTransport) hoveredTransport.cap.position.z = 0;
        hoveredTransport = null;
        canvas.classList.remove('can-press-transport');
      }
      refreshTransportKeys();
    },
    setTransportFocus(action: TransportAction | null) {
      focusedTransport = action
        ? transportKeys.find((key) => key.action === action) ?? null
        : null;
      refreshTransportKeys();
    },
    setVolume(value: number) {
      setVolume(value);
    },
    setProgress(value: number) {
      const normalized = THREE.MathUtils.clamp(value, 0, 1);
      const width = (progressMax - progressMin) * normalized;
      progressFill.scale.x = Math.max(width, 0.001);
      progressThumb.position.x = THREE.MathUtils.lerp(progressMin, progressMax, normalized);
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      disposeScene();
    },
  };
}

export function createShowcaseScene(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  const { renderer, resize } = setupRenderer(canvas, true);
  addLighting(scene);
  let cassette: CassetteParts | null = null;
  let animation: { start: number; resolve: () => void } | null = null;

  const dispose = animateScene(renderer, scene, camera, resize, (time) => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    camera.position.z = 10 * Math.max(1, 0.9 / aspect);
    if (!cassette || !animation) return;
    const elapsed = Math.min((performance.now() - animation.start) / 2000, 1);
    const eased = elapsed < 0.5
      ? 4 * elapsed * elapsed * elapsed
      : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;
    cassette.group.rotation.y = eased * Math.PI * 2;
    cassette.group.rotation.x = Math.sin(elapsed * Math.PI) * 0.08;
    const scale = 0.72 + Math.sin(elapsed * Math.PI) * 0.22;
    cassette.group.scale.setScalar(scale);
    cassette.group.position.y = Math.sin(time * 2.4) * 0.05;
    if (elapsed === 1) {
      const resolve = animation.resolve;
      animation = null;
      resolve();
    }
  });

  return {
    preload(songs: VisualSong[]) {
      songs.forEach((song) => { void loadCoverTexture(song.cover); });
    },
    async show(song: VisualSong) {
      if (cassette) {
        scene.remove(cassette.group);
        disposeObject(cassette.group);
      }
      const cover = await loadCoverTexture(song.cover);
      cassette = createCassette(song.title, cover);
      cassette.group.scale.setScalar(0.72);
      scene.add(cassette.group);
      await new Promise<void>((resolve) => {
        animation = { start: performance.now(), resolve };
      });
    },
    dispose,
  };
}
