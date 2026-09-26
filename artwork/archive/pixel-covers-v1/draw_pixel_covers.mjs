// Historical recipe, retained for provenance. Use tools/cover_pipeline.py for current artwork.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    handoff: { type: 'string' },
    output: { type: 'string' },
    'studio-root': { type: 'string' },
    refresh: { type: 'boolean', default: false },
  },
});
for (const key of ['handoff', 'output', 'studio-root']) {
  assert.ok(values[key], `Required: --${key}`);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const output = resolve(values.output);
const model = await import(pathToFileURL(join(values['studio-root'], 'web', 'lib', 'model.js')));
const { encodePng } = await import(pathToFileURL(join(values['studio-root'], 'scripts', 'png.mjs')));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const handoffBytes = readFileSync(values.handoff);
const handoff = JSON.parse(handoffBytes);
const baseline = model.validateProject(handoff.project);
assert.equal(handoff.proposal, null, 'Do not overwrite another pending proposal.');
assert.ok(Number.isInteger(handoff.revision), 'A saved baseline revision is required.');
assert.ok(baseline.layers.every((l) => !l.locked), 'Locked artwork requires a separate preservation plan.');
assert.ok(baseline.frames.every((f) => Object.values(f.cels).every((cel) => cel.every((p) => p === null))),
  'This composition-replacement drawing task was prepared against a blank baseline.');
const songs = JSON.parse(readFileSync(join(root, 'tools', 'song_catalog.json'), 'utf8'));
const producer = 'subwooferlullabies-spritecanvas-pixel-covers-v1';
if (existsSync(output)) {
  assert.ok(values.refresh, 'Existing output: use --refresh only for this local draft.');
  const previous = JSON.parse(readFileSync(join(output, 'manifest.json')));
  assert.equal(previous.producer, producer);
  assert.equal(previous.baseline_sha256, hash(handoffBytes), 'Rebase changed baselines; do not swap revisions.');
}
mkdirSync(output, { recursive: true });

const SIZE = 128;
const layerNames = [
  ['atmosphere', '01 Atmosphere and distant light'],
  ['architecture', '02 Environment and architecture'],
  ['subject', '03 Main subject'],
  ['details', '04 Surface details and small objects'],
  ['lighting', '05 Light accents and particles'],
  ['foreground', '06 Water and foreground'],
  ['lettering', '07 Pixel lettering and frame'],
];
const font = {
  A: ['010','101','111','101','101'], B: ['110','101','110','101','110'],
  C: ['011','100','100','100','011'], D: ['110','101','101','101','110'],
  E: ['111','100','110','100','111'], F: ['111','100','110','100','100'],
  G: ['011','100','101','101','011'], H: ['101','101','111','101','101'],
  I: ['111','010','010','010','111'], J: ['001','001','001','101','010'],
  K: ['101','101','110','101','101'], L: ['100','100','100','100','111'],
  M: ['101','111','111','101','101'], N: ['101','111','111','111','101'],
  O: ['010','101','101','101','010'], P: ['110','101','110','100','100'],
  Q: ['010','101','101','111','011'], R: ['110','101','110','101','101'],
  S: ['011','100','010','001','110'], T: ['111','010','010','010','010'],
  U: ['101','101','101','101','111'], V: ['101','101','101','101','010'],
  W: ['101','101','111','111','101'], X: ['101','101','010','101','101'],
  Y: ['101','101','010','010','010'], Z: ['111','001','010','100','111'],
  '0': ['111','101','101','101','111'], '1': ['010','110','010','010','111'],
  '2': ['110','001','010','100','111'], '3': ['110','001','010','001','110'],
  '4': ['101','101','111','001','001'], '5': ['111','100','110','001','110'],
  '6': ['011','100','111','101','111'], '7': ['111','001','010','010','010'],
  '8': ['111','101','111','101','111'], '9': ['111','101','111','001','110'],
  '-': ['000','000','111','000','000'], '/': ['001','001','010','100','100'],
  ' ': ['000','000','000','000','000'],
};
const titleFont = Object.fromEntries(Object.entries({
  A: '01110/10001/10001/11111/10001/10001/10001',
  B: '11110/10001/10001/11110/10001/10001/11110',
  C: '01111/10000/10000/10000/10000/10000/01111',
  D: '11110/10001/10001/10001/10001/10001/11110',
  E: '11111/10000/10000/11110/10000/10000/11111',
  F: '11111/10000/10000/11110/10000/10000/10000',
  G: '01111/10000/10000/10111/10001/10001/01111',
  H: '10001/10001/10001/11111/10001/10001/10001',
  I: '11111/00100/00100/00100/00100/00100/11111',
  J: '00111/00010/00010/00010/10010/10010/01100',
  K: '10001/10010/10100/11000/10100/10010/10001',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/11001/10101/10011/10011/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  Q: '01110/10001/10001/10001/10101/10010/01101',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  U: '10001/10001/10001/10001/10001/10001/01110',
  V: '10001/10001/10001/10001/10001/01010/00100',
  W: '10001/10001/10001/10101/10101/11011/10001',
  X: '10001/10001/01010/00100/01010/10001/10001',
  Y: '10001/10001/01010/00100/00100/00100/00100',
  Z: '11111/00001/00010/00100/01000/10000/11111',
}).map(([key, rows]) => [key, rows.split('/')]));
const mix = (a, b, t) => {
  const channels = [1, 3, 5].map((i) => Math.round(
    parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t));
  return '#' + channels.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};
function palette(song) {
  const [dark, mid, accent, warm] = song.palette.map((c) => '#' + c);
  return [
    mix(dark, '#00020A', 0.4), dark, mid, mix(mid, accent, 0.20),
    mix(mid, accent, 0.36), mix(mid, warm, 0.42), mix(mid, accent, 0.57),
    accent, mix(accent, '#E5FFED', 0.38), mix(accent, '#EDFFEF', 0.75),
    mix(dark, warm, 0.46), warm, mix(warm, '#FFF3CC', 0.38),
    '#F0E9CD', '#FFFFE5', mix(dark, '#807E9F', 0.38),
  ].map(model.color);
}
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

class Drawing {
  constructor(song, index) {
    this.song = song;
    this.index = index;
    this.colors = palette(song);
    this.cels = Object.fromEntries(layerNames.map(([id]) => [id, Array(SIZE * SIZE).fill(null)]));
    this.layer = 'atmosphere';
    this.unclipped = false;
    this.seed = 7127 + index * 937;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const radial = Math.max(0, 1 - Math.hypot((x - 65) / 76, (y - 49) / 78));
      const amount = Math.min(2.95, radial * 3);
      const low = Math.floor(amount);
      const tint = low + ((amount - low) * 16 > bayer[(y % 4) * 4 + x % 4] ? 1 : 0);
      this.cels.atmosphere[y * SIZE + x] = this.colors[tint];
    }
  }
  use(name) { assert.ok(this.cels[name]); this.layer = name; return this; }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  pixel(x, y, tint) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
    if (!this.unclipped && (x < 5 || x > 122 || y < 18 || y > 101)) return;
    this.cels[this.layer][y * SIZE + x] = typeof tint === 'number' ? this.colors[tint] : tint;
  }
  line(x, y, x2, y2, tint, width = 1) {
    for (const [px, py] of model.linePoints(Math.round(x), Math.round(y), Math.round(x2), Math.round(y2))) {
      for (let dy = 0; dy < width; dy++) for (let dx = 0; dx < width; dx++) this.pixel(px + dx, py + dy, tint);
    }
  }
  rect(x, y, w, h, tint, filled = true) {
    assert.ok(w > 0 && h > 0);
    for (const [px, py] of model.shapePoints('rect', Math.round(x), Math.round(y),
      Math.round(x + w - 1), Math.round(y + h - 1), filled)) this.pixel(px, py, tint);
  }
  ellipse(x, y, rx, ry, tint, filled = true) {
    for (const [px, py] of model.shapePoints('ellipse', Math.round(x - rx), Math.round(y - ry),
      Math.round(x + rx), Math.round(y + ry), filled)) this.pixel(px, py, tint);
  }
  polygon(points, tint) {
    const minY = Math.ceil(Math.min(...points.map((p) => p[1])));
    const maxY = Math.floor(Math.max(...points.map((p) => p[1])));
    for (let y = minY; y <= maxY; y++) {
      const hits = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
        if ((ay <= y && by > y) || (by <= y && ay > y)) hits.push(ax + (y - ay) * (bx - ax) / (by - ay));
      }
      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2) {
        for (let x = Math.ceil(hits[i]); x <= Math.floor(hits[i + 1]); x++) this.pixel(x, y, tint);
      }
    }
  }
  path(points, tint, width = 1) {
    for (let i = 1; i < points.length; i++) this.line(...points[i - 1], ...points[i], tint, width);
  }
  specks(count, box, tint) {
    const [x, y, w, h] = box;
    for (let i = 0; i < count; i++) this.pixel(x + Math.floor(this.random() * w), y + Math.floor(this.random() * h), tint);
  }
  text(text, x, y, tint, scale = 1, glyphs = font) {
    for (const ch of text.toUpperCase()) {
      assert.ok(glyphs[ch], `Missing original pixel glyph: ${ch}`);
      glyphs[ch].forEach((row, py) => [...row].forEach((bit, px) => {
        if (bit === '1') this.rect(x + px * scale, y + py * scale, scale, scale, tint);
      }));
      x += (glyphs[ch][0].length + 1) * scale;
    }
  }
  star(x, y, tint = 12, size = 2) {
    this.line(x - size, y, x + size, y, tint);
    this.line(x, y - size, x, y + size, tint);
    this.pixel(x, y, 14);
  }
  drop(x, y, size = 3) {
    this.polygon([[x, y - size * 2], [x - size, y], [x - size + 1, y + 2], [x + 2, y + 2], [x + size, y]], 7);
    this.line(x - 1, y - size, x - 1, y, 9);
    this.pixel(x, y + 1, 8);
  }
  rod(x, y, dx, dy, tint = 7) {
    this.line(x - 1, y, x + dx - 1, y + dy, 4, 3);
    this.line(x, y, x + dx, y + dy, tint, 2);
    this.line(x, y, x + dx, y + dy, 9);
    this.pixel(x, y, 14);
  }
  ripples(x, y, radius = 20, count = 4, tint = 6) {
    for (let i = 0; i < count; i++) this.ellipse(x, y + i * 2, radius + i * 6, 2 + i * 2, i % 2 ? 4 : tint, false);
  }
  arch(cx, cy, radius, bottom, tint) {
    const points = [[cx - radius, bottom], [cx - radius, cy]];
    for (let i = 0; i <= 32; i++) {
      const a = Math.PI + Math.PI * i / 32;
      points.push([Math.round(cx + Math.cos(a) * radius), Math.round(cy + Math.sin(a) * radius)]);
    }
    points.push([cx + radius, bottom]);
    this.polygon(points, tint);
  }
  bricks(box, tint, lineTint) {
    const [x, y, w, h] = box;
    this.rect(x, y, w, h, tint);
    for (let row = 0; row < Math.ceil(h / 8); row++) {
      const yy = y + row * 8;
      this.line(x, yy, x + w - 1, yy, lineTint);
      for (let xx = x + (row % 2 ? 7 : 0); xx < x + w; xx += 15) {
        this.line(xx, yy, xx, Math.min(y + h - 1, yy + 7), lineTint);
      }
    }
  }
  finish() {
    this.use('lettering'); this.unclipped = true;
    this.rect(0, 0, 128, 17, 0);
    this.rect(0, 103, 128, 25, 0);
    this.rect(2, 2, 124, 124, 3, false);
    this.line(6, 15, 121, 15, 5);
    this.line(6, 104, 121, 104, 5);
    this.text('SUBWOOFER LULLABIES', 7, 7, 8);
    this.text(String(this.index + 1).padStart(2, '0'), 112, 7, 11);
    const label = this.song.title.toUpperCase();
    const left = Math.floor((128 - (label.length * 6 - 1)) / 2);
    assert.ok(left >= 6, 'Title exceeds the native pixel grid.');
    this.text(label, left, 110, 13, 1, titleFont);
    this.text(`${this.song.bpm} BPM`, 7, 120, 6);
    const tag = this.song.title.toLowerCase() === 'serenity' ? 'JAZZ' : this.song.title.toLowerCase() === 'euphoria' ? 'DANCE' : 'RETRO';
    this.text(tag, 122 - (tag.length * 4 - 1), 120, 6);
    return this;
  }
}

function draw(song, index) {
  const d = new Drawing(song, index);
  switch (song.scene) {
    case 'threshold': {
      d.use('architecture');
      d.bricks([5, 18, 118, 72], 2, 1);
      for (const [r, cy, tint] of [[51, 63, 5], [47, 63, 3], [43, 63, 0], [35, 62, 4], [31, 62, 2], [27, 62, 0], [18, 62, 3], [15, 62, 0]]) {
        d.arch(64, cy, r, 91, tint);
      }
      for (let a = Math.PI + 0.14; a < Math.PI * 2; a += 0.22) {
        d.line(64 + Math.cos(a) * 44, 63 + Math.sin(a) * 44, 64 + Math.cos(a) * 50, 63 + Math.sin(a) * 50, 1);
      }
      d.use('details').rect(8, 36, 8, 45, 0);
      d.line(10, 37, 10, 79, 5, 2);
      d.rect(8, 47, 7, 3, 10); d.rect(8, 70, 7, 3, 10);
      d.use('foreground').polygon([[5, 88], [56, 74], [73, 74], [122, 88], [122, 102], [5, 102]], 1);
      d.path([[8, 98], [53, 78], [75, 78], [119, 98]], 4);
      d.ripples(66, 88, 10, 3);
      d.use('lighting').rod(66, 68, -3, 12);
      d.drop(43, 49, 2); d.specks(20, [23, 25, 84, 50], 4);
      break;
    }
    case 'fracture': {
      d.use('architecture').polygon([[5, 18], [55, 18], [47, 35], [25, 47], [5, 58]], 5);
      d.polygon([[79, 18], [122, 18], [122, 62], [103, 48], [84, 42]], 3);
      d.path([[5, 49], [24, 40], [35, 42], [46, 31], [51, 18]], 12);
      d.path([[81, 18], [92, 30], [91, 37], [117, 52]], 10);
      d.polygon([[12, 56], [38, 43], [46, 53], [34, 66], [19, 68]], 3);
      d.polygon([[88, 49], [103, 61], [95, 78], [80, 70]], 5);
      d.polygon([[53, 34], [69, 29], [73, 40], [63, 47]], 5);
      d.line(55, 34, 66, 32, 11);
      d.polygon([[42, 78], [48, 71], [55, 82], [47, 86]], 10);
      d.use('details');
      for (let x = 8; x < 120; x += 11) {
        const y = 26 + Math.floor(d.random() * 36);
        d.line(x, y, x - 5, y + 12, 15);
      }
      d.path([[63, 48], [57, 55], [60, 62]], 4);
      d.use('lighting').rod(63, 63, 8, 11, 11);
      d.pixel(83, 42, 11); d.pixel(43, 57, 12);
      d.use('foreground').ellipse(66, 101, 55, 15, 0);
      d.ripples(66, 92, 8, 3, 5);
      break;
    }
    case 'ledge': {
      d.use('architecture').arch(73, 61, 46, 105, 3);
      d.arch(73, 61, 43, 105, 1);
      d.arch(73, 61, 34, 105, 2);
      d.arch(73, 61, 32, 105, 0);
      d.rect(8, 19, 6, 61, 2); d.line(10, 20, 10, 75, 4);
      d.polygon([[98, 54], [122, 49], [122, 58], [97, 62]], 3);
      d.line(99, 54, 120, 50, 5);
      d.polygon([[89, 37], [110, 34], [110, 38], [92, 42]], 2);
      d.use('subject').polygon([[5, 80], [34, 71], [45, 74], [49, 80], [44, 102], [5, 102]], 0);
      d.path([[5, 80], [34, 71], [45, 74]], 5);
      d.use('details').line(14, 82, 21, 80, 2);
      d.line(24, 91, 32, 89, 2);
      d.use('details').path([[25, 73], [25, 64], [32, 63], [35, 65]], 5);
      d.use('lighting').rod(33, 71, 7, 2);
      d.use('lighting').drop(80, 42, 2);
      d.use('foreground').ripples(84, 95, 12, 2, 4);
      break;
    }
    case 'discovery': {
      d.use('architecture');
      d.arch(64, 58, 44, 103, 3); d.arch(64, 58, 40, 103, 1);
      d.bricks([5, 88, 118, 14], 2, 0);
      d.use('subject').polygon([[35, 67], [63, 55], [94, 65], [66, 82]], 5);
      d.polygon([[35, 67], [65, 80], [65, 88], [36, 77]], 10);
      d.polygon([[65, 80], [94, 65], [94, 75], [65, 88]], 3);
      d.polygon([[40, 64], [63, 55], [87, 65], [64, 75]], 0);
      d.path([[36, 66], [63, 54], [94, 64]], 11);
      d.use('lighting').rod(54, 55, 14, -14);
      d.line(56, 56, 71, 41, 12);
      d.star(80, 43, 12, 3); d.star(43, 40, 7, 2);
      d.star(85, 78, 6, 1);
      d.use('details').rect(58, 80, 5, 3, 11);
      d.line(44, 72, 54, 76, 5);
      d.use('foreground').ripples(65, 96, 14, 1, 4);
      break;
    }
    case 'cassette': {
      d.use('architecture').bricks([5, 18, 118, 66], 2, 1);
      d.path([[12, 64], [12, 32], [40, 32]], 7, 2);
      d.path([[35, 27], [41, 32], [35, 37]], 8);
      d.rect(7, 84, 116, 4, 5);
      d.rect(7, 89, 116, 13, 1);
      d.use('subject').rect(30, 42, 73, 40, 0);
      d.rect(32, 40, 69, 40, 10);
      d.rect(34, 43, 65, 32, 11);
      d.rect(36, 47, 61, 6, 12);
      d.rect(36, 54, 61, 17, 1);
      for (const x of [48, 85]) {
        d.ellipse(x, 62, 8, 8, 5);
        d.ellipse(x, 62, 6, 6, 0);
        d.ellipse(x, 62, 3, 3, 11);
        d.pixel(x, 62, 0);
        d.line(x - 5, 62, x - 3, 62, 12);
        d.line(x + 3, 62, x + 5, 62, 12);
      }
      d.line(55, 59, 78, 59, 5); d.line(55, 65, 78, 65, 5);
      d.polygon([[48, 74], [86, 74], [91, 81], [43, 81]], 5);
      d.use('details').text('PLAY', 38, 47, 0);
      for (const x of [35, 96]) for (const y of [44, 75]) d.pixel(x, y, 13);
      d.use('lighting').drop(112, 37, 2);
      d.use('foreground').path([[15, 94], [25, 90], [35, 93], [28, 96], [15, 94]], 5);
      break;
    }
    case 'ladder': {
      d.use('architecture');
      d.polygon([[5, 18], [42, 18], [28, 102], [5, 102]], 2);
      d.polygon([[89, 18], [122, 18], [122, 102], [108, 102]], 2);
      for (let y = 25; y < 102; y += 10) {
        d.line(5, y, 33 - (y - 20) / 12, y + 3, 4);
        d.line(98 + (y - 20) / 12, y, 122, y - 3, 4);
      }
      d.polygon([[54, 18], [76, 18], [73, 28], [57, 28]], 12);
      d.rect(58, 18, 13, 6, 14);
      d.use('subject');
      d.line(58, 29, 43, 101, 10, 3);
      d.line(72, 29, 88, 101, 10, 3);
      d.line(58, 29, 43, 101, 11);
      d.line(72, 29, 88, 101, 12);
      for (let y = 32; y < 103; y += 7) {
        const half = 7 + (y - 29) * 0.21;
        if (y === 74) {
          d.line(65 - half, y, 62, y + 1, 5, 3);
          d.line(65 - half, y, 62, y + 1, 11);
          d.line(69, y, 73 + half - 7, y, 5, 3);
          d.line(69, y, 73 + half - 7, y, 11);
        } else {
          d.line(65 - half, y, 73 + half - 7, y, 5, 3);
          d.line(65 - half, y, 73 + half - 7, y, 11);
        }
      }
      d.use('details').line(77, 68, 81, 69, 10);
      d.use('lighting').rod(81, 70, -1, 8);
      d.use('lighting').specks(21, [46, 29, 39, 46], 6);
      d.use('foreground').polygon([[5, 95], [20, 91], [33, 101], [5, 103]], 0);
      break;
    }
    case 'locker': {
      d.use('architecture').bricks([5, 18, 118, 80], 2, 1);
      d.rect(19, 94, 94, 8, 0);
      d.use('subject').rect(47, 24, 50, 69, 5);
      d.rect(50, 27, 44, 63, 0);
      d.rect(52, 29, 40, 59, 1);
      d.rect(54, 30, 36, 56, 0);
      d.line(53, 51, 90, 51, 5);
      d.line(53, 76, 90, 76, 5);
      d.line(94, 26, 94, 90, 7);
      d.polygon([[47, 24], [24, 36], [24, 96], [47, 91]], 3);
      d.path([[47, 24], [24, 36], [24, 96], [47, 91]], 6);
      for (let y = 43; y < 59; y += 4) d.line(29, y, 40, y - 4, 1);
      d.rect(42, 64, 2, 7, 11);
      d.use('details').text('C-19', 57, 33, 5);
      d.path([[58, 71], [62, 64], [77, 65], [81, 72]], 10, 2);
      d.rect(63, 68, 15, 8, 5);
      d.rect(67, 68, 8, 8, 10);
      d.ellipse(71, 71, 3, 3, 11);
      d.pixel(70, 70, 12);
      d.specks(12, [49, 25, 46, 3], 10);
      d.use('lighting').pixel(72, 71, 13);
      d.use('foreground').ripples(67, 98, 13, 1, 3);
      break;
    }
    case 'beam': {
      d.use('architecture').arch(94, 60, 43, 103, 4);
      d.arch(94, 60, 39, 103, 1);
      d.arch(94, 60, 26, 103, 3);
      d.arch(94, 60, 22, 103, 0);
      d.use('subject').path([[29, 62], [18, 69], [29, 77]], 5, 3);
      d.rect(30, 58, 29, 24, 0);
      d.rect(31, 59, 25, 20, 10);
      d.rect(34, 60, 20, 3, 11);
      d.ellipse(57, 69, 8, 12, 5);
      d.ellipse(58, 69, 6, 9, 11);
      d.ellipse(59, 69, 4, 7, 12);
      d.use('lighting').polygon([[65, 67], [117, 33], [117, 94], [65, 73]], 10);
      d.polygon([[65, 68], [114, 45], [114, 84], [65, 72]], 5);
      d.polygon([[65, 69], [111, 54], [111, 77], [65, 71]], 11);
      d.line(65, 70, 90, 67, 12);
      d.pixel(60, 67, 14); d.pixel(60, 68, 14);
      d.specks(16, [74, 51, 36, 29], 12);
      d.use('foreground').polygon([[5, 97], [32, 87], [56, 91], [97, 94], [122, 88], [122, 103], [5, 103]], 1);
      d.ripples(59, 96, 18, 1, 5);
      break;
    }
    case 'current': {
      d.use('architecture').ellipse(66, 59, 44, 39, 5);
      d.ellipse(66, 59, 39, 34, 0);
      d.ellipse(66, 59, 33, 28, 4);
      d.ellipse(66, 59, 29, 24, 1);
      d.ellipse(66, 59, 21, 18, 3);
      d.ellipse(66, 59, 18, 15, 0);
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        d.ellipse(66 + Math.cos(a) * 41, 59 + Math.sin(a) * 36, 1, 1, 11);
      }
      d.rect(5, 26, 10, 65, 1); d.line(8, 27, 8, 81, 5, 2);
      d.use('subject').rod(83, 69, -8, 8);
      d.use('foreground');
      d.polygon([[5, 79], [35, 71], [65, 76], [94, 70], [122, 75], [122, 104], [5, 104]], 2);
      for (let j = 0; j < 8; j++) {
        const points = [];
        for (let x = 5; x <= 122; x += 3) points.push([x, 77 + j * 4 + Math.sin(x / 13 + j) * 3]);
        d.path(points, j % 3 === 0 ? 7 : 4);
      }
      for (const [x, y] of [[12, 82], [33, 91], [65, 87], [88, 96], [108, 78]]) {
        d.line(x, y, x + 9, y, 8);
        d.pixel(x + 11, y - 1, 6);
      }
      d.use('lighting').drop(29, 44, 2);
      break;
    }
    case 'roots': {
      d.use('architecture').arch(65, 45, 43, 105, 3);
      d.arch(65, 45, 38, 105, 1);
      d.ellipse(65, 23, 27, 13, 11); d.ellipse(65, 23, 20, 9, 13);
      d.use('lighting');
      for (const [a, b, end] of [[51, 54, 27], [61, 67, 71], [76, 80, 109]]) {
        d.polygon([[a, 26], [b, 26], [end + 11, 96], [end - 9, 96]], 4);
        d.line(a, 30, end, 94, 6);
      }
      d.use('details');
      for (const [x, depth] of [[12, 34], [23, 22], [35, 31], [93, 23], [107, 38], [120, 30]]) {
        d.path([[x, 18], [x - 3, 25], [x + 2, 34], [x - 4, 18 + depth]], 10, 2);
        d.path([[x, 31], [x + 7, 39], [x + 10, 43]], 5);
      }
      d.use('foreground').polygon([[5, 92], [29, 86], [44, 94], [77, 89], [122, 81], [122, 102], [5, 102]], 0);
      d.path([[44, 94], [77, 89], [120, 83]], 5);
      d.use('foreground').line(74, 89, 74, 70, 7);
      d.polygon([[74, 79], [63, 69], [62, 76], [74, 83]], 6);
      d.polygon([[74, 75], [87, 64], [85, 73], [74, 80]], 8);
      d.line(74, 76, 83, 69, 9);
      d.use('lighting').specks(14, [41, 42, 52, 37], 11);
      break;
    }
    case 'surface': {
      d.use('atmosphere').rect(5, 18, 118, 83, 8);
      d.rect(5, 57, 118, 44, 9);
      d.ellipse(82, 34, 15, 14, 12);
      d.ellipse(82, 34, 12, 11, 13);
      d.rect(15, 32, 29, 5, 13); d.rect(22, 28, 15, 5, 13);
      d.rect(87, 45, 31, 4, 13); d.rect(101, 42, 13, 4, 13);
      d.use('architecture');
      d.rect(5, 59, 14, 14, 6); d.rect(21, 64, 24, 9, 6);
      d.rect(98, 61, 24, 13, 6); d.rect(113, 55, 10, 19, 6);
      d.rect(5, 74, 118, 28, 11);
      d.line(5, 75, 122, 75, 13);
      d.line(5, 89, 122, 89, 10);
      d.line(22, 76, 8, 102, 10); d.line(102, 76, 122, 102, 10);
      d.use('subject').ellipse(65, 83, 25, 12, 5);
      d.ellipse(65, 82, 22, 10, 0);
      d.ellipse(65, 81, 19, 8, 1);
      d.line(46, 80, 55, 76, 6); d.line(59, 73, 72, 73, 13);
      d.use('details').ellipse(29, 83, 10, 6, 10);
      for (let y = 80; y < 87; y += 2) d.line(23, y, 34, y, 5);
      d.use('lighting').rod(66, 59, -4, 10);
      d.path([[80, 51], [73, 52], [69, 56]], 6);
      d.use('foreground').path([[109, 97], [108, 86], [112, 89], [116, 81]], 4);
      d.line(108, 92, 104, 88, 6);
      break;
    }
    case 'journey': {
      d.use('architecture').polygon([[5, 18], [29, 18], [38, 103], [5, 103]], 1);
      d.polygon([[98, 18], [122, 18], [122, 103], [99, 103]], 1);
      d.ellipse(67, 23, 18, 8, 11); d.ellipse(67, 22, 13, 5, 13);
      const route = [[34, 95], [83, 81], [44, 67], [85, 52], [49, 39], [67, 28]];
      d.use('subject').path(route, 10, 4);
      d.path(route, 11);
      for (const [x, y] of route) {
        d.rect(x - 5, y + 1, 12, 3, 5);
        d.pixel(x, y - 1, 12);
      }
      d.use('details').rect(19, 61, 10, 20, 3);
      d.rect(21, 63, 6, 16, 0);
      d.rect(22, 74, 4, 2, 11);
      d.rect(99, 78, 12, 7, 10);
      d.pixel(102, 81, 11); d.pixel(108, 81, 11);
      d.path([[91, 18], [87, 26], [95, 30], [91, 35]], 7);
      d.use('details').line(54, 64, 60, 62, 5);
      d.line(62, 42, 67, 44, 5);
      d.use('lighting').rod(79, 50, 5, 0);
      d.use('foreground').ripples(65, 101, 26, 2, 6);
      break;
    }
    case 'stillness': {
      d.use('atmosphere');
      d.polygon([[35, 18], [39, 18], [19, 96], [8, 96]], 3);
      d.polygon([[68, 18], [74, 18], [60, 101], [45, 101]], 4);
      d.polygon([[102, 18], [105, 18], [109, 93], [98, 94]], 3);
      d.use('architecture');
      for (const [x, y] of [[11, 94], [17, 97], [111, 97], [117, 93]]) {
        d.path([[x, y], [x - 3, y - 10], [x + 1, y - 18], [x - 2, y - 26]], 5);
        d.line(x, y - 11, x + 5, y - 15, 4);
      }
      d.use('subject');
      d.polygon([[36, 65], [55, 52], [72, 51], [87, 58], [89, 65], [79, 73], [39, 74]], 0);
      d.polygon([[39, 63], [56, 54], [72, 53], [84, 58], [84, 62], [76, 67], [40, 68]], 3);
      d.path([[40, 62], [56, 53], [72, 52], [85, 58]], 7);
      d.line(40, 69, 79, 69, 11);
      d.rect(37, 72, 45, 8, 1);
      d.rect(39, 73, 40, 5, 13);
      for (let x = 43; x < 79; x += 4) d.line(x, 73, x, 77, 5);
      for (const x of [42, 46, 54, 58, 62, 70, 74]) d.rect(x, 73, 2, 3, 0);
      d.rect(40, 80, 3, 11, 1); d.rect(76, 80, 3, 10, 1);
      d.line(40, 81, 40, 89, 6); d.line(76, 81, 76, 87, 5);
      d.use('details').rect(55, 88, 12, 2, 3);
      d.rect(56, 90, 2, 4, 1); d.rect(64, 90, 2, 4, 1);
      d.use('lighting').drop(64, 38, 3);
      d.ellipse(96, 49, 2, 2, 6, false); d.ellipse(91, 37, 1, 1, 7, false);
      d.ellipse(25, 53, 1, 1, 5, false);
      d.use('foreground').ripples(62, 96, 25, 2, 4);
      d.specks(15, [20, 94, 89, 6], 5);
      break;
    }
    case 'pulse': {
      d.use('architecture');
      for (let x = 7; x < 120; x += 10) {
        const h = 8 + Math.floor(d.random() * 25);
        d.rect(x, 81 - h, 8, h, 1);
        d.line(x, 82 - h, x + 6, 82 - h, 5);
        for (let y = 86 - h; y < 77; y += 5) d.rect(x + 2, y, 2, 1, 6);
      }
      d.use('subject').ellipse(64, 53, 34, 32, 10);
      d.ellipse(64, 53, 31, 29, 11);
      d.ellipse(64, 53, 28, 26, 0);
      for (const r of [24, 20, 16, 12]) d.ellipse(64, 53, r, r - 2, 5, false);
      d.ellipse(64, 53, 6, 6, 7); d.ellipse(64, 53, 2, 2, 0);
      d.use('lighting');
      const wave = [[16, 58], [36, 58], [44, 49], [49, 66], [57, 36], [67, 74], [77, 44], [85, 60], [94, 52], [103, 58], [115, 58]];
      d.path(wave, 6, 3); d.path(wave, 9);
      d.star(28, 29, 12, 2); d.star(102, 28, 7, 2);
      d.use('foreground').rect(5, 86, 118, 17, 0);
      for (const y of [86, 90, 96, 102]) d.line(5, y, 122, y, 6);
      for (let x = -40; x < 180; x += 22) d.line(64 + (x - 64) * 0.3, 86, x, 103, 5);
      break;
    }
    default: throw new Error(`No cover composition for ${song.scene}`);
  }
  return d.finish();
}

const drawings = songs.map(draw);
const candidateInput = structuredClone(baseline);
candidateInput.name = 'Subwoofer Lullabies - 14 static pixel covers';
candidateInput.width = SIZE; candidateInput.height = SIZE;
candidateInput.layers = layerNames.map(([id, name]) => ({
  id: `cover-${id}`, name, visible: true, locked: false, opacity: 1,
}));
candidateInput.palette = [...new Set(drawings.flatMap((d) => d.colors))];
candidateInput.frames = drawings.map((d) => ({
  id: `cover-${d.song.title.toLowerCase()}`,
  duration: 10000,
  cels: Object.fromEntries(layerNames.map(([id]) => [`cover-${id}`, d.cels[id]])),
}));
const candidate = model.validateProject(candidateInput);
assert.equal(candidate.id, baseline.id);
assert.equal(candidate.frames.length, 14);
assert.ok(SIZE * SIZE * candidate.layers.length * candidate.frames.length <= model.LIMITS.cells);
assert.ok(candidate.palette.length <= 256);
const candidateBytes = Buffer.from(JSON.stringify(candidate) + '\n');
assert.ok(candidateBytes.length + handoffBytes.length < 30 * 1024 * 1024, 'Leave API request headroom.');
writeFileSync(join(output, 'collection.spritecanvas.json'), candidateBytes);
const records = [];
const imageHashes = new Set();
for (const [i, song] of songs.entries()) {
  const folder = join(output, song.title);
  mkdirSync(folder, { recursive: true });
  const single = model.validateProject({
    ...candidate, name: `${song.title} - editable pixel cover`,
    palette: drawings[i].colors, frames: [candidate.frames[i]],
  });
  const bytes = Buffer.from(JSON.stringify(single) + '\n');
  const native = encodePng(single, 0, 1);
  const rendered = model.composite(single);
  for (let j = 3; j < rendered.length; j += 4) assert.equal(rendered[j], 255, `${song.title} must have an opaque background.`);
  const preview = encodePng(single, 0, 4);
  const cover = encodePng(single, 0, 16);
  const imageHash = hash(native);
  assert.ok(!imageHashes.has(imageHash), `Duplicated cover: ${song.title}`);
  imageHashes.add(imageHash);
  writeFileSync(join(folder, `${song.title}.spritecanvas.json`), bytes);
  writeFileSync(join(folder, 'native.png'), native);
  writeFileSync(join(folder, 'preview.png'), preview);
  writeFileSync(join(folder, 'cover.png'), cover);
  records.push({
    title: song.title, frame: i + 1, emotion: song.emotion, palette: single.palette,
    editable: `${song.title}\\${song.title}.spritecanvas.json`,
    project_sha256: hash(bytes), native_sha256: imageHash, export_sha256: hash(cover),
    protected_existing_cover_sha256: hash(readFileSync(join(root, 'STRUDEL', song.title, 'cover.png'))),
  });
}
const manifest = {
  producer, status: 'saved-local-artwork', native_size: [SIZE, SIZE], export_size: [2048, 2048],
  description: 'Original editable SpriteCanvas pixel art; 128x128 native, exact 16x export to 2048x2048 opaque RGBA PNG.',
  layers: candidate.layers, frames: 14, editable_cells: SIZE * SIZE * 7 * 14,
  collection_frames: 'Independent static covers, not an animation; 10000 ms per frame for browsing.',
  baseline_revision: handoff.revision, baseline_project_id: baseline.id, baseline_sha256: hash(handoffBytes),
  candidate_sha256: hash(candidateBytes), candidate_bytes: candidateBytes.length,
  studio_url: 'http://127.0.0.1:4180', songs: records,
};
writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const cards = songs.map((song, i) => `<article><img src="${song.title}/preview.png" width="512" height="512" alt="${song.title} pixel-art cover"><h2>${String(i + 1).padStart(2, '0')} / ${song.title}</h2><p>${song.emotion}</p><a href="${song.title}/${song.title}.spritecanvas.json">Editable source</a> <a href="${song.title}/native.png">128px native</a> <a href="${song.title}/cover.png">2048px PNG</a></article>`).join('\n');
writeFileSync(join(output, 'index.html'), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Subwoofer Lullabies - pixel cover collection</title>
<style>:root{color-scheme:dark;font-family:system-ui;background:#10131d;color:#f0e9cd}body{max-width:1500px;margin:auto;padding:24px}h1{font-weight:400}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:24px}article{background:#1a2530;padding:12px}img{width:100%;height:auto;image-rendering:pixelated}h2{font-size:18px}p{line-height:1.5;color:#b5cacb}a{color:#83e6cb;font-size:13px;margin-right:8px}header{max-width:850px;margin-bottom:32px}</style>
<header><h1>Fourteen small worlds.</h1><p>Original 128 x 128 pixel art. Seven editable layers per cover. The 2048px PNGs are exact 16x enlargements, not extra native detail. Each standalone project is editable in SpriteCanvas; the collection project holds the fourteen static covers as separate frames, not an animation.</p></header>
<main>${cards}</main></html>\n`);
assert.deepEqual(readFileSync(values.handoff), handoffBytes, 'Never alter the protected handoff.');
console.log(JSON.stringify({
  output, native: `${SIZE}x${SIZE}`, covers: records.length, layers: candidate.layers.length,
  editableCells: manifest.editable_cells, paletteSwatches: candidate.palette.length,
  candidateBytes: candidateBytes.length, baselineRevision: handoff.revision,
}, null, 2));
