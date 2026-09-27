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

export type VisualizerMode = 'scope' | 'bars' | 'radar' | 'orbit' | 'tunnel' | 'rain';

export type BoxSceneController = SceneController & {
  setTrack(song: VisualSong): Promise<void>;
  setPlaying(active: boolean): void;
  setAnalyser(analyser: AnalyserNode): void;
  setVisualizer(mode: VisualizerMode): void;
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
  context.font = '700 58px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const fitted = primary.length > 16 ? primary.slice(0, 16) : primary;
  context.fillText(fitted, canvas.width / 2, 112);
  context.font = '700 22px monospace';
  context.fillText(secondary.toUpperCase(), canvas.width / 2, 184);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
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
  onSelect: (title: string) => void,
  dropTarget: HTMLElement,
  handCursor: HandCursorController,
): BoxSceneController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  camera.position.set(0, 8, 17);
  camera.lookAt(0, -0.85, 0);
  const { renderer, resize } = setupRenderer(canvas);
  addLighting(scene);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 11), material(0x4b2924, { roughness: 1 }));
  wall.position.set(0, 1.6, -4.8);
  wall.receiveShadow = true;
  scene.add(wall);

  const posterLayouts: Array<[string, string, string, string, number, number, number, number, number]> = [
    ['INDIE NIGHT', 'BANGALORE / 2010', '#d8a34b', '#3b1b20', -7.1, 2.5, 3.9, 2.2, -0.065],
    ['LAN PARTY', 'FRIDAY / 10 PM', '#426d66', '#f1d7a8', 0.1, 3.0, 3.2, 1.9, 0.045],
    ['MIXTAPE BLOG', 'NEW POST DAILY', '#31556c', '#ead59d', 6.7, 2.4, 3.9, 2.25, -0.035],
  ];
  posterLayouts.forEach(([title, subtitle, background, foreground, x, y, width, height, rotation]) => {
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      textureMaterial(canvasTexture(title, subtitle, background, foreground)),
    );
    poster.position.set(x, y, -4.65);
    poster.rotation.z = rotation;
    scene.add(poster);
  });

  const tapeGroup = new THREE.Group();
  scene.add(tapeGroup);

  const tapeRoots: THREE.Group[] = [];
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
    tapeRoots.push(cassette.group);
  });

  scene.add(box(19.5, 0.65, 7.5, 0x70442e, [0, -2.28, 0]));
  scene.add(box(19.5, 0.12, 7.5, 0xa56a3d, [0, -1.91, 0]));

  const television = new THREE.Group();
  television.position.set(-5.5, -0.02, -0.05);
  television.rotation.y = 0.18;
  television.add(box(5.8, 4.45, 3.1, 0x34302d, [0, 0, 0]));
  television.add(box(4.55, 3.35, 0.18, 0x11191b, [-0.38, 0.24, 1.61]));
  television.add(box(0.58, 3.15, 0.18, 0x252625, [2.24, 0.25, 1.63]));
  for (let row = -5; row <= 5; row++) {
    television.add(box(0.32, 0.045, 0.03, 0x777164, [2.24, 0.25 + row * 0.23, 1.74]));
  }
  television.add(box(0.48, 0.48, 0.22, 0xd1963e, [2.24, -1.48, 1.72]));
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
  const crtScreen = new THREE.Mesh(
    crtGlassGeometry(4.12, 2.94),
    textureMaterial(crtTexture),
  );
  crtScreen.position.set(-0.38, 0.25, 1.72);
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
  television.add(glassHighlight);
  scene.add(television);

  const books = new THREE.Group();
  books.position.set(-3.55, -1.84, 1.45);
  books.rotation.y = -0.18;
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
  phone.position.set(-2.1, -1.82, 1.2);
  phone.rotation.set(-0.08, 0.25, 0.16);
  phone.add(box(0.7, 0.14, 1.35, 0x24282b, [0, 0, 0]));
  phone.add(box(0.48, 0.04, 0.62, 0x6b938e, [0, 0.1, -0.18]));
  phone.add(box(0.42, 0.04, 0.28, 0xb8a67c, [0, 0.1, 0.38]));
  scene.add(phone);

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

  function averageBand(start: number, end: number) {
    if (!frequencyData.length) return 0;
    const first = Math.max(0, Math.floor(start * frequencyData.length));
    const last = Math.min(frequencyData.length, Math.max(first + 1, Math.ceil(end * frequencyData.length)));
    let total = 0;
    for (let index = first; index < last; index++) total += frequencyData[index];
    return total / (last - first) / 255;
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
    const bass = averageBand(0, 0.12);
    const mid = averageBand(0.12, 0.48);
    const treble = averageBand(0.48, 1);
    const energy = bass * 0.45 + mid * 0.38 + treble * 0.17;
    smoothedEnergy += (energy - smoothedEnergy) * (energy > smoothedEnergy ? 0.48 : 0.12);
    smoothedBass += (bass - smoothedBass) * (bass > smoothedBass ? 0.62 : 0.1);
    const beat = Math.max(0, bass - smoothedEnergy * 0.82);
    crtContext.fillStyle = '#071214';
    crtContext.fillRect(0, 0, width, height);
    if (crtCover) {
      const sourceWidth = Number((crtCover as { width?: number }).width) || width;
      const sourceHeight = Number((crtCover as { height?: number }).height) || height;
      const sourceRatio = sourceWidth / sourceHeight;
      const targetRatio = width / height;
      const drawWidth = sourceRatio > targetRatio ? width : height * sourceRatio;
      const drawHeight = sourceRatio > targetRatio ? width / sourceRatio : height;
      crtContext.globalAlpha = crtPlaying ? 0.72 : 0.9;
      crtContext.drawImage(crtCover, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      crtContext.globalAlpha = 1;
    } else {
      crtContext.fillStyle = '#6c9288';
      crtContext.font = '700 18px monospace';
      crtContext.textAlign = 'center';
      crtContext.fillText('NO SIGNAL / PICK A TAPE', width / 2, height / 2);
    }

    if (crtPlaying) {
      crtContext.strokeStyle = '#f4d789';
      crtContext.fillStyle = '#e66a32';
      crtContext.lineWidth = 5;
      if (visualizerMode === 'scope') {
        crtContext.beginPath();
        for (let x = 0; x <= width; x += 5) {
          const sampleIndex = Math.min(
            waveformData.length - 1,
            Math.floor(x / width * waveformData.length),
          );
          const sample = waveformData.length ? (waveformData[sampleIndex] - 128) / 128 : 0;
          const y = height / 2 + sample * (64 + smoothedEnergy * 78);
          if (x === 0) crtContext.moveTo(x, y);
          else crtContext.lineTo(x, y);
        }
        crtContext.stroke();
      } else if (visualizerMode === 'bars') {
        for (let index = 0; index < 16; index++) {
          const start = index / 16;
          const bandEnergy = averageBand(start * start, ((index + 1) / 16) ** 2);
          const barHeight = Math.max(3, bandEnergy * 178);
          crtContext.fillRect(10 + index * 19, height - 28 - barHeight, 11, barHeight);
        }
      } else if (visualizerMode === 'radar') {
        crtContext.save();
        crtContext.translate(width / 2, height / 2);
        for (let ring = 0; ring < 4; ring++) {
          const ringEnergy = averageBand(ring * 0.18, 0.28 + ring * 0.18);
          const radius = 20 + ring * 21 + ringEnergy * 24 + beat * 20;
          crtContext.beginPath();
          for (let point = 0; point <= 32; point++) {
            const angle = point / 32 * Math.PI * 2;
            const bin = frequencyData.length
              ? frequencyData[Math.min(frequencyData.length - 1, point * 3)] / 255
              : 0;
            const pulse = Math.sin(angle * 5 + time * (1.5 + mid * 5)) * (3 + bin * 16);
            const x = Math.cos(angle) * (radius + pulse);
            const y = Math.sin(angle) * (radius + pulse);
            if (point === 0) crtContext.moveTo(x, y);
            else crtContext.lineTo(x, y);
          }
          crtContext.closePath();
          crtContext.stroke();
        }
        crtContext.restore();
      } else if (visualizerMode === 'orbit') {
        crtContext.save();
        crtContext.translate(width / 2, height / 2);
        crtContext.beginPath();
        for (let point = 0; point <= 160; point++) {
          const phase = point / 160 * Math.PI * 2;
          const sampleIndex = waveformData.length
            ? Math.min(waveformData.length - 1, Math.floor(point / 160 * waveformData.length))
            : 0;
          const sample = waveformData.length ? (waveformData[sampleIndex] - 128) / 128 : 0;
          const x = Math.sin(phase * 3 + time * (0.8 + treble * 3.5)) * (82 + smoothedEnergy * 58);
          const y = Math.sin(phase * 4 - time * (0.9 + mid * 3.8)) * (48 + bass * 54)
            + sample * 28;
          if (point === 0) crtContext.moveTo(x, y);
          else crtContext.lineTo(x, y);
        }
        crtContext.stroke();
        crtContext.restore();
      } else if (visualizerMode === 'tunnel') {
        crtContext.save();
        crtContext.translate(width / 2, height / 2);
        for (let frame = 0; frame < 9; frame++) {
          const phase = (frame / 9 + time * (0.18 + smoothedEnergy * 1.35)) % 1;
          const frameWidth = 22 + phase * (230 + bass * 52);
          const frameHeight = 14 + phase * (150 + mid * 54);
          crtContext.globalAlpha = 1 - phase * 0.72;
          crtContext.strokeRect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
        }
        crtContext.globalAlpha = 1;
        crtContext.restore();
      } else {
        for (let column = 0; column < 18; column++) {
          const x = 7 + column * 18;
          const columnEnergy = averageBand(column / 18, (column + 1) / 18);
          const speed = 18 + columnEnergy * 145;
          const offset = (time * speed + column * 31) % (height + 80);
          const drops = 2 + Math.round(columnEnergy * 5);
          for (let drop = 0; drop < drops; drop++) {
            const y = offset - drop * 18 - 40;
            if (y < 0 || y > height) continue;
            crtContext.globalAlpha = Math.max(0.2, 0.45 + columnEnergy - drop * 0.13);
            crtContext.fillRect(x, y, 8, 7 + columnEnergy * 13);
          }
        }
        crtContext.globalAlpha = 1;
      }
    }

    const vignette = crtContext.createRadialGradient(width / 2, height / 2, 45, width / 2, height / 2, 205);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.46)');
    crtContext.fillStyle = vignette;
    crtContext.fillRect(0, 0, width, height);
    crtContext.fillStyle = 'rgba(0,0,0,.14)';
    for (let y = 0; y < height; y += 5) crtContext.fillRect(0, y, width, 2);
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

  function updateDropTarget() {
    const target = document.elementFromPoint(latestClientX, latestClientY);
    const overDropTarget = Boolean(target && dropTarget.contains(target));
    dropTarget.classList.toggle('is-over', overDropTarget);
    handCursor.move(latestClientX, latestClientY, overDropTarget);
    return overDropTarget;
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
    handCursor.release(false);
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (pressed) return;
    pressed = hit(event);
    if (!pressed) return;
    activePointerId = event.pointerId;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
    dropTarget.classList.add('awaiting-drop');
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
    if (pressed && event.pointerId !== activePointerId) return;
    latestClientX = event.clientX;
    latestClientY = event.clientY;
    const nextHover = hit(event);
    if (hover !== nextHover) {
      hover = nextHover;
    }
    canvas.style.cursor = hover || pressed ? 'none' : 'default';
    handCursor.hover(event.clientX, event.clientY, Boolean(hover || pressed));
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
    if (!pressed || event.pointerId !== activePointerId) return;
    const chosen = pressed;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const dropped = Boolean(target && dropTarget.contains(target));
    pressed = null;
    activePointerId = null;
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    canvas.releasePointerCapture(event.pointerId);
    canvas.classList.remove('is-dragging');
    dropTarget.classList.remove('awaiting-drop', 'is-over');
    canvas.style.cursor = 'default';
    handCursor.release(dropped);
    if (dropped) {
      chosen.position.copy(chosen.userData.home);
      chosen.rotation.copy(chosen.userData.rotationHome);
      window.setTimeout(() => onSelect(String(chosen.userData.title)), 260);
    } else if (!moved) {
      chosen.position.copy(chosen.userData.home);
      chosen.rotation.copy(chosen.userData.rotationHome);
      onSelect(String(chosen.userData.title));
    } else {
      chosen.position.y = (chosen.userData.home as THREE.Vector3).y;
      chosen.userData.home = chosen.position.clone();
      chosen.userData.rotationHome = chosen.rotation.clone();
    }
  });
  canvas.addEventListener('pointercancel', cancelDrag);
  canvas.addEventListener('lostpointercapture', cancelDrag);
  canvas.addEventListener('pointerleave', (event) => {
    if (hover && hover !== pressed) hover.position.y = hover.userData.home.y;
    hover = null;
    handCursor.hover(event.clientX, event.clientY, false);
  });

  let pointerX = 0;
  let pointerY = 0;
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - 0.5;
    pointerY = (event.clientY - rect.top) / rect.height - 0.5;
  });

  const disposeAnimation = animateScene(renderer, scene, camera, resize, (time) => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const cameraScale = Math.max(1, 1.72 / aspect);
    camera.position.set(pointerX * 0.4, 8 * cameraScale - pointerY * 0.16, 17 * cameraScale);
    camera.lookAt(0, -0.85, 0);
    drawCrt(time);
  });
  return {
    async setTrack(song: VisualSong) {
      const cover = await loadCoverTexture(song.cover);
      crtCover = cover.image as CanvasImageSource;
      drawCrt(performance.now() / 1000);
    },
    setPlaying(active: boolean) {
      crtPlaying = active;
    },
    setAnalyser(analyser: AnalyserNode) {
      audioAnalyser = analyser;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      waveformData = new Uint8Array(analyser.fftSize);
    },
    setVisualizer(mode: VisualizerMode) {
      visualizerMode = mode;
    },
    dispose() {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      crtTexture.dispose();
      disposeAnimation();
    },
  };
}

export function createPlayerScene(canvas: HTMLCanvasElement) {
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

  for (let index = 0; index < 4; index++) {
    rig.add(box(1.15, 0.36, 0.95, index === 1 ? COLORS.orange : COLORS.metal, [-2.35 + index * 1.55, 3.9, 0]));
  }
  rig.add(box(0.26, 5.1, 1.48, COLORS.metal, [3.63, 0.05, 0]));

  const brand = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.72),
    textureMaterial(canvasTexture('SUBWAVE', 'TPS-14', '#416d88', '#edf0d7'), true),
  );
  brand.position.set(-1.65, 2.85, 0.76);
  rig.add(brand);

  const windowFrame = box(4.9, 3.65, 0.28, COLORS.dark, [0, 0.05, 0.75]);
  rig.add(windowFrame);
  const windowGlass = box(4.35, 3.08, 0.12, COLORS.glass, [0, 0.05, 0.92]);
  (windowGlass.material as THREE.MeshStandardMaterial).transparent = true;
  (windowGlass.material as THREE.MeshStandardMaterial).opacity = 0.72;
  rig.add(windowGlass);

  const cassette = createCassette('no tape');
  cassette.group.scale.setScalar(1.04);
  cassette.group.position.set(0, -0.02, 1.08);
  cassette.group.visible = false;
  rig.add(cassette.group);

  const controls = new THREE.Group();
  controls.position.set(0, -2.92, 0.8);
  controls.add(box(2.15, 0.1, 0.12, 0xb8c8c1, [-1.35, 0, 0]));
  controls.add(box(0.62, 0.18, 0.16, COLORS.orange, [0.35, 0, 0]));
  controls.add(box(1.85, 0.1, 0.12, 0xb8c8c1, [1.6, 0, 0]));
  rig.add(controls);

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

  let playing = false;
  const dispose = animateScene(renderer, scene, camera, resize, (time, delta) => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const cameraScale = Math.max(1, 0.86 / aspect);
    camera.position.set(4.8 * cameraScale, 2.2 * cameraScale, 19.5 * cameraScale);
    camera.lookAt(0, 0.15, 0);
    rig.position.y = Math.sin(time * 0.7) * 0.04;
    if (playing) {
      cassette.reels.forEach((reel) => { reel.rotation.z -= delta * 3.2; });
    }
  });

  return {
    async setCassette(song: VisualSong) {
      const cover = await loadCoverTexture(song.cover);
      disposeMaterial(cassette.front.material);
      disposeMaterial(cassette.back.material);
      disposeMaterial(cassette.label.material);
      cassette.front.material = textureMaterial(canvasTexture('', '', '#1b292a', '#1b292a'));
      cassette.back.material = textureMaterial(cover);
      cassette.label.material = textureMaterial(maskingTapeTexture(song.title), true);
      cassette.group.visible = true;
    },
    setPlaying(value: boolean) {
      playing = value;
    },
    dispose,
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
