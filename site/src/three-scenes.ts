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
  grab(title: string, x: number, y: number): void;
  move(x: number, y: number, overPlayer: boolean): void;
  release(dropped: boolean): void;
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

function createCassette(title: string, genre = '', cover?: THREE.Texture): CassetteParts {
  const group = new THREE.Group();
  const body = box(3.4, 2.18, 0.34, COLORS.tape, [0, 0, 0]);
  group.add(body);

  const edge = box(3.12, 1.9, 0.38, COLORS.tapeEdge, [0, 0, 0]);
  group.add(edge);

  const frontTexture = cover ?? canvasTexture('subwave', 'cassette archive', '#15272c', '#edf0d7');
  const front = new THREE.Mesh(new THREE.PlaneGeometry(3.02, 1.78), textureMaterial(frontTexture));
  front.position.set(0, 0, 0.201);
  group.add(front);

  const labelTexture = canvasTexture(title, genre);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.72, 0.38), textureMaterial(labelTexture));
  label.position.set(0, 0.68, 0.211);
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

  function setCassette(title: string) {
    if (heldCassette) {
      hand.remove(heldCassette.group);
      disposeObject(heldCassette.group);
    }
    heldCassette = createCassette(title);
    heldCassette.group.scale.setScalar(0.46);
    heldCassette.group.position.set(0.05, 0.52, 0.72);
    heldCassette.group.rotation.set(-0.08, 0.04, -0.05);
    hand.add(heldCassette.group);
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
    grab(title, x, y) {
      window.clearTimeout(hideTimer);
      position(x, y);
      setCassette(title);
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
): SceneController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  camera.position.set(8.8, 6.6, 13.8);
  camera.lookAt(0, -0.7, 0);
  const { renderer, resize } = setupRenderer(canvas);
  addLighting(scene);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 15), material(0x4b2924, { roughness: 1 }));
  wall.position.set(0, 2.5, -5.2);
  wall.receiveShadow = true;
  scene.add(wall);

  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 2.4),
    textureMaterial(canvasTexture('SATURDAY MIX', 'BOMBAY / 1996', '#d8a34b', '#3b1b20')),
  );
  poster.position.set(-7.2, 2.35, -5.05);
  poster.rotation.z = -0.045;
  scene.add(poster);

  const chart = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 2.1),
    textureMaterial(canvasTexture('TOP 10', 'RADIO REQUESTS', '#426d66', '#f1d7a8')),
  );
  chart.position.set(6.8, 2.55, -5.02);
  chart.rotation.z = 0.055;
  scene.add(chart);

  const boxGroup = new THREE.Group();
  boxGroup.rotation.y = -0.12;
  boxGroup.position.set(0.75, -0.42, 0.15);
  scene.add(boxGroup);

  boxGroup.add(box(8, 0.3, 5, COLORS.cardboardDark, [0, -2.05, 0]));
  boxGroup.add(box(8, 2.6, 0.28, COLORS.cardboard, [0, -0.85, 2.36]));
  boxGroup.add(box(0.3, 2.65, 5, COLORS.cardboard, [-3.87, -0.85, 0]));
  boxGroup.add(box(0.3, 2.65, 5, COLORS.cardboard, [3.87, -0.85, 0]));
  boxGroup.add(box(8, 2.15, 0.28, COLORS.cardboardLight, [0, -0.97, -2.36]));
  boxGroup.add(box(7.6, 0.18, 3.1, COLORS.cardboardLight, [0, 0.4, -3.75], [-0.92, 0, 0]));
  boxGroup.add(box(3.6, 0.18, 4.4, COLORS.cardboardLight, [-5.25, 0.05, 0], [0, 0, 0.72]));
  boxGroup.add(box(3.6, 0.18, 4.4, COLORS.cardboardLight, [5.25, 0.05, 0], [0, 0, -0.72]));

  const tapeRoots: THREE.Group[] = [];
  songs.forEach((song, index) => {
    const cassette = createCassette(song.title, song.genre);
    if (index < 8) {
      const column = index % 4;
      const row = Math.floor(index / 4);
      cassette.group.scale.setScalar(0.56);
      cassette.group.position.set(-2.45 + column * 1.65, -0.48 + row * 0.62, 0.62 - row * 1.22);
      cassette.group.rotation.set(-0.15 + row * 0.07, (column - 1.5) * 0.07, ((index % 3) - 1) * 0.07);
      boxGroup.add(cassette.group);
    } else {
      const floorLayouts: Array<[[number, number, number], [number, number, number], number]> = [
        [[-6.6, -2.02, 1.5], [-1.4, 0.2, -0.34], 0.72],
        [[-4.9, -2.08, -1.9], [-1.5, -0.2, 0.42], 0.68],
        [[-2.7, -2.04, 3.15], [-1.34, 0.08, 0.18], 0.7],
        [[5.25, -2.05, 2.2], [-1.46, -0.08, -0.42], 0.72],
        [[6.8, -2.03, -0.8], [-1.35, 0.2, 0.3], 0.65],
        [[3.6, -2.07, -3.25], [-1.48, -0.1, -0.16], 0.7],
      ];
      const [position, rotation, scale] = floorLayouts[index - 8];
      cassette.group.scale.setScalar(scale);
      cassette.group.position.set(...position);
      cassette.group.rotation.set(...rotation);
      scene.add(cassette.group);
    }
    cassette.group.userData.home = cassette.group.position.clone();
    cassette.group.userData.rotationHome = cassette.group.rotation.clone();
    tapeRoots.push(cassette.group);
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 18, 6, 4),
    material(0x4a2c24, { roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.24;
  floor.receiveShadow = true;
  scene.add(floor);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 7),
    material(0x9a4d31, { roughness: 1 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.rotation.z = -0.03;
  rug.position.set(0.4, -2.2, 0.7);
  scene.add(rug);
  for (let stripe = -3; stripe <= 3; stripe++) {
    const line = box(13.5, 0.03, 0.13, stripe % 2 ? 0xd59a47 : 0x4b6f68, [0.4, -2.18, stripe * 0.78]);
    scene.add(line);
  }

  const television = new THREE.Group();
  television.position.set(-7.3, -0.85, -2.7);
  television.rotation.y = 0.12;
  television.add(box(3.2, 2.5, 1.8, 0x34302d, [0, 0, 0]));
  television.add(box(2.35, 1.55, 0.08, 0x19272b, [-0.18, 0.2, 0.94]));
  television.add(box(0.35, 0.35, 0.16, 0xd1963e, [1.18, -0.52, 0.98]));
  scene.add(television);

  const notebooks = new THREE.Group();
  notebooks.position.set(6.7, -1.82, -2.25);
  notebooks.rotation.y = -0.28;
  [0x315b74, 0xb76b3c, 0xd4bd72].forEach((color, index) => {
    notebooks.add(box(2.7, 0.18, 1.7, color, [0, index * 0.21, 0]));
  });
  scene.add(notebooks);

  const bat = new THREE.Group();
  bat.position.set(7.6, -0.5, 1.3);
  bat.rotation.set(0.06, 0, -0.52);
  bat.add(box(0.62, 3.6, 0.22, 0xb9874f, [0, 0, 0]));
  bat.add(box(0.25, 1.55, 0.2, 0x55312a, [0, 2.45, 0]));
  scene.add(bat);

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
    canvas.style.cursor = 'grab';
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
    handCursor.grab(String(pressed.userData.title), event.clientX, event.clientY);
    if (!scrollFrame) scrollFrame = requestAnimationFrame(autoScroll);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (pressed && event.pointerId !== activePointerId) return;
    latestClientX = event.clientX;
    latestClientY = event.clientY;
    const nextHover = hit(event);
    if (hover !== nextHover) {
      if (hover && hover !== pressed) hover.position.y = hover.userData.home.y;
      hover = nextHover;
    }
    if (hover && hover !== pressed) hover.position.y = hover.userData.home.y + 0.22;
    canvas.style.cursor = hover || pressed ? 'none' : 'grab';
    handCursor.hover(event.clientX, event.clientY, Boolean(hover));
    if (pressed) {
      moved ||= Math.hypot(event.clientX - startX, event.clientY - startY) > 7;
      pressed.position.y = pressed.userData.home.y + 0.72;
      pressed.rotation.y += 0.04;
      updateDropTarget();
    }
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!pressed || event.pointerId !== activePointerId) return;
    const chosen = pressed;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const dropped = Boolean(target && dropTarget.contains(target));
    chosen.position.copy(chosen.userData.home);
    chosen.rotation.copy(chosen.userData.rotationHome);
    pressed = null;
    activePointerId = null;
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    canvas.releasePointerCapture(event.pointerId);
    canvas.classList.remove('is-dragging');
    dropTarget.classList.remove('awaiting-drop', 'is-over');
    canvas.style.cursor = 'grab';
    handCursor.release(dropped);
    if (dropped) {
      window.setTimeout(() => onSelect(String(chosen.userData.title)), 260);
    } else if (!moved) {
      onSelect(String(chosen.userData.title));
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
    const cameraScale = Math.max(1, 1.45 / aspect);
    camera.position.set(8.8 * cameraScale, 6.6 * cameraScale, 13.8 * cameraScale);
    camera.lookAt(0, -0.7, 0);
    boxGroup.rotation.y += (pointerX * 0.18 - 0.12 - boxGroup.rotation.y) * 0.06;
    boxGroup.rotation.x += (-pointerY * 0.08 - boxGroup.rotation.x) * 0.06;
    boxGroup.position.y = -0.45 + Math.sin(time * 0.8) * 0.025;
  });
  return {
    dispose() {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
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
      cassette.reels.forEach((reel) => { reel.rotation.z -= delta * 9; });
    }
  });

  return {
    async setCassette(song: VisualSong) {
      const cover = await loadCoverTexture(song.cover);
      disposeMaterial(cassette.front.material);
      disposeMaterial(cassette.back.material);
      disposeMaterial(cassette.label.material);
      cassette.front.material = textureMaterial(cover);
      cassette.back.material = textureMaterial(cover);
      cassette.label.material = textureMaterial(canvasTexture(song.title, `${song.bpm} bpm`));
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
      cassette = createCassette(song.title, `${song.genre} / ${song.bpm} bpm`, cover);
      cassette.group.scale.setScalar(0.72);
      scene.add(cassette.group);
      await new Promise<void>((resolve) => {
        animation = { start: performance.now(), resolve };
      });
    },
    dispose,
  };
}
