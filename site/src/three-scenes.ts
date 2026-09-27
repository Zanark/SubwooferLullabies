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

type CassetteParts = {
  group: THREE.Group;
  reels: THREE.Mesh[];
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

  const reels: THREE.Mesh[] = [];
  for (const x of [-0.92, 0.92]) {
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.15, 12),
      material(COLORS.reel, { roughness: 0.65 }),
    );
    outer.position.set(x, -0.22, 0.24);
    outer.rotation.x = Math.PI / 2;
    group.add(outer);

    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.17, 8),
      material(COLORS.dark),
    );
    inner.position.set(x, -0.22, 0.33);
    inner.rotation.x = Math.PI / 2;
    group.add(inner);
    reels.push(inner);
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

export function createBoxScene(
  canvas: HTMLCanvasElement,
  songs: VisualSong[],
  onSelect: (title: string) => void,
  dropTarget: HTMLElement,
): SceneController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(8.4, 6.2, 10.5);
  camera.lookAt(0, -0.45, 0);
  const { renderer, resize } = setupRenderer(canvas);
  addLighting(scene);

  const boxGroup = new THREE.Group();
  boxGroup.rotation.y = -0.12;
  boxGroup.position.y = -0.45;
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
    const column = index % 7;
    const row = Math.floor(index / 7);
    cassette.group.scale.setScalar(0.58);
    cassette.group.position.set(-2.8 + column * 0.92, -0.5 + row * 0.55, 0.6 - row * 1.05);
    cassette.group.rotation.set(-0.18 + row * 0.08, (column - 3) * 0.045, ((index % 3) - 1) * 0.08);
    cassette.group.userData.home = cassette.group.position.clone();
    cassette.group.userData.rotationHome = cassette.group.rotation.clone();
    boxGroup.add(cassette.group);
    tapeRoots.push(cassette.group);
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 18, 6, 4),
    material(0x0a2026, { roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.24;
  floor.receiveShadow = true;
  scene.add(floor);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pressed: THREE.Group | null = null;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let hover: THREE.Group | null = null;

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

  canvas.addEventListener('pointerdown', (event) => {
    pressed = hit(event);
    if (!pressed) return;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
    dropTarget.classList.add('awaiting-drop');
  });
  canvas.addEventListener('pointermove', (event) => {
    const nextHover = hit(event);
    if (hover !== nextHover) {
      if (hover && hover !== pressed) hover.position.y = hover.userData.home.y;
      hover = nextHover;
    }
    if (hover && hover !== pressed) hover.position.y = hover.userData.home.y + 0.22;
    if (pressed) {
      moved ||= Math.hypot(event.clientX - startX, event.clientY - startY) > 7;
      pressed.position.y = pressed.userData.home.y + 0.72;
      pressed.rotation.y += 0.04;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      dropTarget.classList.toggle('is-over', Boolean(target && dropTarget.contains(target)));
    }
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!pressed) return;
    const chosen = pressed;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const dropped = Boolean(target && dropTarget.contains(target));
    chosen.position.copy(chosen.userData.home);
    chosen.rotation.copy(chosen.userData.rotationHome);
    pressed = null;
    canvas.releasePointerCapture(event.pointerId);
    canvas.classList.remove('is-dragging');
    dropTarget.classList.remove('awaiting-drop', 'is-over');
    if (dropped || !moved) onSelect(String(chosen.userData.title));
  });
  canvas.addEventListener('pointerleave', () => {
    if (hover && hover !== pressed) hover.position.y = hover.userData.home.y;
    hover = null;
  });

  let pointerX = 0;
  let pointerY = 0;
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - 0.5;
    pointerY = (event.clientY - rect.top) / rect.height - 0.5;
  });

  const dispose = animateScene(renderer, scene, camera, resize, (time) => {
    boxGroup.rotation.y += (pointerX * 0.18 - 0.12 - boxGroup.rotation.y) * 0.06;
    boxGroup.rotation.x += (-pointerY * 0.08 - boxGroup.rotation.x) * 0.06;
    boxGroup.position.y = -0.45 + Math.sin(time * 0.8) * 0.025;
  });
  return { dispose };
}

export function createPlayerScene(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  camera.position.set(6.4, 2.5, 19);
  camera.lookAt(0, 0.35, 0);
  const { renderer, resize } = setupRenderer(canvas);
  addLighting(scene);

  const rig = new THREE.Group();
  rig.rotation.set(-0.025, -0.08, -0.015);
  rig.position.set(-0.15, -0.35, 0);
  scene.add(rig);

  const body = box(6.25, 8.1, 1.24, COLORS.blue, [0, 0, 0]);
  rig.add(body);
  rig.add(box(5.95, 7.8, 1.3, COLORS.blueDark, [0.12, -0.08, -0.05]));
  rig.add(box(5.78, 7.55, 1.38, COLORS.blue, [-0.08, 0.08, 0.02]));
  rig.add(box(5.55, 0.12, 1.45, COLORS.orange, [0, 2.42, 0.08]));

  for (let index = 0; index < 4; index++) {
    rig.add(box(index === 0 ? 1.12 : 0.72, 0.32, 0.9, index === 0 ? COLORS.orange : COLORS.metal, [-2.1 + index * 1.2, 4.18, 0]));
  }
  rig.add(box(0.24, 5.6, 1.45, COLORS.metal, [3.18, 0.18, 0]));

  const brand = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.72),
    textureMaterial(canvasTexture('SUBWAVE', 'TPS-14', '#416d88', '#edf0d7'), true),
  );
  brand.position.set(-1.35, 3.13, 0.73);
  rig.add(brand);

  const windowFrame = box(4.25, 3.45, 0.28, COLORS.dark, [0, 0.2, 0.72]);
  rig.add(windowFrame);
  const windowGlass = box(3.72, 2.9, 0.12, COLORS.glass, [0, 0.2, 0.9]);
  (windowGlass.material as THREE.MeshStandardMaterial).transparent = true;
  (windowGlass.material as THREE.MeshStandardMaterial).opacity = 0.72;
  rig.add(windowGlass);

  const cassette = createCassette('no tape');
  cassette.group.scale.setScalar(0.94);
  cassette.group.position.set(0, 0.1, 1.05);
  cassette.group.visible = false;
  rig.add(cassette.group);

  const controls = new THREE.Group();
  controls.position.set(0, -3.06, 0.78);
  controls.add(box(1.75, 0.1, 0.12, 0xb8c8c1, [-1.15, 0, 0]));
  controls.add(box(0.5, 0.18, 0.16, COLORS.orange, [0.42, 0, 0]));
  controls.add(box(1.55, 0.1, 0.12, 0xb8c8c1, [1.48, 0, 0]));
  rig.add(controls);

  const headphoneGroup = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.75, -1.15, -0.45),
    new THREE.Vector3(-3.7, 3.4, -0.5),
    new THREE.Vector3(0, 5.75, -0.65),
    new THREE.Vector3(3.7, 3.4, -0.5),
    new THREE.Vector3(3.75, -1.15, -0.45),
  ]);
  const band = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 14, 0.18, 6, false),
    material(COLORS.metal, { metalness: 0.2 }),
  );
  headphoneGroup.add(band);
  for (const x of [-3.72, 3.72]) {
    const ear = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1.35, 2, 6),
      material(COLORS.orange),
    );
    ear.position.set(x, -1.15, 0);
    ear.rotation.z = x < 0 ? 0.12 : -0.12;
    headphoneGroup.add(ear);
  }
  rig.add(headphoneGroup);

  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.78, -1.8, -0.15),
    new THREE.Vector3(4.25, -3.8, -0.3),
    new THREE.Vector3(4.1, -5.8, -0.6),
    new THREE.Vector3(3.3, -7.2, -0.8),
  ]);
  rig.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 8, 0.08, 5, false), material(COLORS.dark)));

  let playing = false;
  const dispose = animateScene(renderer, scene, camera, resize, (time, delta) => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const cameraScale = Math.max(1, 0.8 / aspect);
    camera.position.set(6.4 * cameraScale, 2.5 * cameraScale, 19 * cameraScale);
    camera.lookAt(0, 0.35, 0);
    rig.position.y = Math.sin(time * 0.7) * 0.04;
    if (playing) cassette.reels.forEach((reel) => { reel.rotation.y += delta * 9; });
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
