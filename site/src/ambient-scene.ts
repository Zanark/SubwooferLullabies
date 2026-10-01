import * as THREE from 'three';

const ACTIVATION = String.fromCharCode(105, 110, 101, 122, 105, 118, 97, 110);
const MESSAGE = 'I never put you on a pedestal, but how I wish you could see yourself through my eyes';
const DURATION_MS = 8_000;
const ROTATION_MS = 5_000;

type AmbientSequence = {
  finished: Promise<void>;
  stop(): void;
};

function petalGeometry(width: number, height: number, bulge: number, curl: number) {
  const columns = 5;
  const rows = 7;
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const progress = row / rows;
    const taper = Math.pow(Math.sin(progress * Math.PI / 2), 0.72);
    const halfWidth = width * taper * (1 - progress * 0.12);
    for (let column = 0; column <= columns; column++) {
      const across = column / columns * 2 - 1;
      const x = across * halfWidth;
      const cupping = halfWidth > 0
        ? (1 - Math.pow(x / halfWidth, 2)) * bulge
        : 0;
      const z = cupping + progress * progress * curl;
      const roundedEdge = Math.pow(Math.abs(across), 1.7) * height * 0.12 * Math.pow(progress, 4);
      const centerNotch = Math.exp(-across * across * 18) * height * 0.035 * Math.pow(progress, 5);
      vertices.push(x, progress * height - roundedEdge - centerNotch, z);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const topLeft = row * (columns + 1) + column;
      const bottomLeft = (row + 1) * (columns + 1) + column;
      indices.push(
        topLeft,
        bottomLeft,
        topLeft + 1,
        topLeft + 1,
        bottomLeft,
        bottomLeft + 1,
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function lowPolyMaterial(color: number, emissive: number, intensity: number) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.58,
    metalness: 0.04,
    flatShading: true,
    side: THREE.DoubleSide,
  });
}

function radialSpriteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,182,190,.72)');
  gradient.addColorStop(0.24, 'rgba(219,42,80,.34)');
  gradient.addColorStop(0.62, 'rgba(103,10,42,.12)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function createLeaf(
  material: THREE.MeshStandardMaterial,
  veinMaterial: THREE.MeshStandardMaterial,
  side: number,
  y: number,
  scale: number,
) {
  const group = new THREE.Group();
  group.position.set(side * 0.03, y, 0);
  group.rotation.z = side * -1.12;
  group.rotation.y = side * 0.38;
  group.scale.setScalar(scale);

  const leaf = new THREE.Mesh(petalGeometry(0.52, 1.45, 0.12, 0.08), material);
  leaf.rotation.x = -0.08;
  const vein = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.026, 1.18, 5),
    veinMaterial,
  );
  vein.position.set(0, 0.58, 0.15);
  vein.rotation.z = 0.02;
  group.add(leaf, vein);
  return group;
}

function createAmbientSequence(): AmbientSequence {
  const layer = document.createElement('div');
  layer.className = 'ambient-layer';
  layer.dataset.stage = 'turning';
  layer.setAttribute('role', 'status');
  layer.setAttribute('aria-live', 'polite');
  layer.setAttribute('aria-label', MESSAGE);

  const canvas = document.createElement('canvas');
  canvas.className = 'ambient-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const caption = document.createElement('p');
  caption.className = 'ambient-caption';
  caption.textContent = MESSAGE;
  layer.append(canvas, caption);
  document.body.append(layer);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07030a, 0.055);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  camera.position.set(0, 0.35, 13);
  camera.lookAt(0, 0.1, 0);

  scene.add(new THREE.HemisphereLight(0xffd4d7, 0x082217, 1.45));
  const roseLight = new THREE.PointLight(0xff294f, 20, 8, 1.7);
  roseLight.position.set(0.7, 1.6, 2.4);
  const rimLight = new THREE.PointLight(0xffd1a3, 14, 8, 1.8);
  rimLight.position.set(-2.2, 0.8, 1.5);
  const leafLight = new THREE.PointLight(0x4cff9b, 8, 7, 2);
  leafLight.position.set(1.8, -1.4, 1.1);
  scene.add(roseLight, rimLight, leafLight);

  const rose = new THREE.Group();
  rose.position.y = 0.15;
  scene.add(rose);

  const stemMaterial = lowPolyMaterial(0x174b31, 0x052719, 0.24);
  const leafMaterial = lowPolyMaterial(0x237044, 0x07351e, 0.3);
  const veinMaterial = lowPolyMaterial(0x9acb72, 0x1a4a27, 0.22);
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, -2.85, 0),
    new THREE.Vector3(-0.12, -1.85, 0.04),
    new THREE.Vector3(0.08, -0.72, -0.03),
    new THREE.Vector3(0, 0.45, 0),
  ]);
  rose.add(new THREE.Mesh(
    new THREE.TubeGeometry(stemCurve, 18, 0.095, 6, false),
    stemMaterial,
  ));
  rose.add(
    createLeaf(leafMaterial, veinMaterial, -1, -1.55, 1.08),
    createLeaf(leafMaterial, veinMaterial, 1, -0.88, 0.92),
  );

  for (const thorn of [
    { y: -2.25, side: -1 },
    { y: -1.27, side: 1 },
    { y: -0.46, side: -1 },
  ]) {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.38, 5),
      stemMaterial,
    );
    mesh.position.set(thorn.side * 0.11, thorn.y, 0);
    mesh.rotation.z = thorn.side * -1.16;
    rose.add(mesh);
  }

  const sepalMaterial = lowPolyMaterial(0x2c7b43, 0x0a321b, 0.28);
  for (let index = 0; index < 6; index++) {
    const angle = index / 6 * Math.PI * 2;
    const sepal = new THREE.Mesh(petalGeometry(0.25, 0.82, 0.05, 0.26), sepalMaterial);
    sepal.position.set(Math.sin(angle) * 0.22, 0.36, Math.cos(angle) * 0.22);
    sepal.rotation.y = angle;
    sepal.rotation.x = 0.42;
    rose.add(sepal);
  }

  const petalMaterials = [
    lowPolyMaterial(0x6f071f, 0x35000f, 0.35),
    lowPolyMaterial(0xa90f35, 0x51051e, 0.42),
    lowPolyMaterial(0xdd294f, 0x7a0b2f, 0.52),
    lowPolyMaterial(0xff667d, 0x9d163f, 0.62),
    lowPolyMaterial(0xff9ba8, 0xb4294b, 0.5),
  ];
  const bloom = new THREE.Group();
  bloom.position.y = 0.38;
  rose.add(bloom);

  const layers = [
    { count: 9, radius: 0.62, y: 0.02, width: 0.72, height: 1.18, bulge: 0.24, curl: 0.54, tilt: 0.44, material: 0, offset: 0.1 },
    { count: 9, radius: 0.46, y: 0.12, width: 0.62, height: 1.18, bulge: 0.25, curl: 0.38, tilt: 0.3, material: 1, offset: 0.42 },
    { count: 8, radius: 0.31, y: 0.22, width: 0.52, height: 1.12, bulge: 0.28, curl: 0.23, tilt: 0.17, material: 2, offset: 0.08 },
    { count: 7, radius: 0.17, y: 0.31, width: 0.42, height: 1.02, bulge: 0.3, curl: 0.12, tilt: 0.07, material: 3, offset: 0.5 },
  ];
  for (const layerDefinition of layers) {
    const geometry = petalGeometry(
      layerDefinition.width,
      layerDefinition.height,
      layerDefinition.bulge,
      layerDefinition.curl,
    );
    for (let index = 0; index < layerDefinition.count; index++) {
      const angle = (
        index / layerDefinition.count * Math.PI * 2
        + layerDefinition.offset
      );
      const petal = new THREE.Mesh(geometry, petalMaterials[layerDefinition.material]);
      petal.position.set(
        Math.sin(angle) * layerDefinition.radius,
        layerDefinition.y,
        Math.cos(angle) * layerDefinition.radius,
      );
      petal.rotation.y = angle;
      petal.rotation.x = layerDefinition.tilt;
      petal.rotation.z = Math.sin(index * 2.17) * 0.08;
      bloom.add(petal);
    }
  }

  const centerGeometry = petalGeometry(0.28, 0.78, 0.31, 0.05);
  for (let index = 0; index < 11; index++) {
    const angle = index * 2.2;
    const radius = 0.035 + index * 0.012;
    const petal = new THREE.Mesh(
      centerGeometry,
      petalMaterials[index % 3 === 0 ? 4 : 3],
    );
    petal.position.set(
      Math.sin(angle) * radius,
      0.52 + index * 0.014,
      Math.cos(angle) * radius,
    );
    petal.rotation.y = angle;
    petal.scale.setScalar(0.72 + index * 0.015);
    bloom.add(petal);
  }

  const glowTexture = radialSpriteTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xff4265,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.position.set(0, 1.16, -1.25);
  glow.scale.set(5.6, 5.6, 1);
  scene.add(glow);

  const motePositions = new Float32Array(42 * 3);
  for (let index = 0; index < 42; index++) {
    const angle = index * 2.399;
    const radius = 1.15 + (index * 37 % 29) / 18;
    motePositions[index * 3] = Math.cos(angle) * radius;
    motePositions[index * 3 + 1] = -1.8 + (index * 47 % 73) / 16;
    motePositions[index * 3 + 2] = -0.8 + (index * 19 % 31) / 18;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMaterial = new THREE.PointsMaterial({
    color: 0xffb6be,
    size: 0.055,
    transparent: true,
    opacity: 0.62,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  scene.add(motes);

  let animationFrame = 0;
  let stopped = false;
  let resolveFinished!: () => void;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });
  const startedAt = performance.now();

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.position.z = camera.aspect < 0.72 ? 14.2 : 13;
    camera.updateProjectionMatrix();
    rose.scale.setScalar(camera.aspect < 0.72 ? 0.92 : 1);
  };

  const dispose = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', resize);
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
    glowTexture.dispose();
    renderer.dispose();
    layer.remove();
    resolveFinished();
  };

  const render = (now: number) => {
    if (stopped) return;
    const elapsed = now - startedAt;
    const seconds = elapsed / 1_000;
    const rotationProgress = Math.min(elapsed, ROTATION_MS) / ROTATION_MS;
    layer.dataset.stage = elapsed < ROTATION_MS ? 'turning' : 'holding';
    rose.rotation.y = rotationProgress * Math.PI * 2;
    rose.position.y = 0.15 + Math.sin(seconds * 1.6) * 0.045;
    bloom.scale.setScalar(1 + Math.sin(seconds * 2.1) * 0.012);
    glowMaterial.opacity = 0.68 + Math.sin(seconds * 1.8) * 0.1;
    motes.rotation.y = seconds * 0.13;
    motes.rotation.z = Math.sin(seconds * 0.24) * 0.08;
    moteMaterial.opacity = 0.48 + Math.sin(seconds * 1.4) * 0.14;
    renderer.render(scene, camera);
    if (elapsed >= DURATION_MS - 800) layer.classList.add('is-leaving');
    if (elapsed >= DURATION_MS) {
      dispose();
      return;
    }
    animationFrame = requestAnimationFrame(render);
  };

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(() => layer.classList.add('is-visible'));
  animationFrame = requestAnimationFrame(render);
  return { finished, stop: dispose };
}

export function installAmbientSequence(excludedInput: HTMLInputElement) {
  let typed = '';
  let active: AmbientSequence | null = null;
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.isComposing
      || event.ctrlKey
      || event.metaKey
      || event.altKey
    ) return;
    if (event.target === excludedInput) {
      typed = '';
      return;
    }
    if (active || event.key.length !== 1) return;
    const key = event.key.toLowerCase();
    if (!/^[a-z]$/.test(key)) {
      typed = '';
      return;
    }
    typed = `${typed}${key}`.slice(-ACTIVATION.length);
    if (typed !== ACTIVATION) return;
    typed = '';
    active = createAmbientSequence();
    void active.finished.finally(() => {
      active = null;
    });
  };
  window.addEventListener('keydown', onKeyDown);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    active?.stop();
  };
}
