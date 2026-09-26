// Historical exporter, retained for provenance. Use tools/cover_pipeline.py for current artwork.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'studio-root': { type: 'string' },
    check: { type: 'boolean', default: false },
    install: { type: 'boolean', default: false },
  },
});
assert.ok(values['studio-root'], 'Supply --studio-root for the shared SpriteCanvas model and PNG renderer.');
assert.ok(!(values.check && values.install), '--check is read-only; do not combine it with --install.');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const directory = join(root, 'artwork', 'pixel-covers');
const { validateProject, composite } = await import(pathToFileURL(join(values['studio-root'], 'web', 'lib', 'model.js')));
const { encodePng } = await import(pathToFileURL(join(values['studio-root'], 'scripts', 'png.mjs')));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json')));
const catalogPath = join(root, 'STRUDEL', 'catalog.json');
const catalog = JSON.parse(readFileSync(catalogPath));
assert.equal(manifest.producer, 'subwooferlullabies-spritecanvas-pixel-covers-v1');
assert.equal(manifest.songs.length, 14);
assert.deepEqual(manifest.songs.map((s) => s.title), catalog.songs.map((s) => s.title));
const projects = [];
const files = [];
const records = [];
for (const [index, song] of manifest.songs.entries()) {
  const folder = join(directory, song.title);
  const source = readFileSync(join(folder, `${song.title}.spritecanvas.json`));
  const project = validateProject(JSON.parse(source));
  assert.equal(project.width, 128);
  assert.equal(project.height, 128);
  assert.equal(project.frames.length, 1, `${song.title}: standalone covers must remain static.`);
  if (projects.length) assert.deepEqual(project.layers, projects[0].layers,
    'The combined collection requires matching editable layer structures.');
  const pixels = composite(project);
  for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255, `${song.title}: unexpected transparent cover background.`);
  const rendered = Object.fromEntries(
    [['native.png', 1], ['preview.png', 4], ['cover.png', 16]]
      .map(([name, scale]) => [name, encodePng(project, 0, scale)]));
  for (const [name, bytes] of Object.entries(rendered)) files.push([join(folder, name), bytes]);
  const record = { ...song, palette: project.palette,
    project_sha256: hash(source), native_sha256: hash(rendered['native.png']),
    export_sha256: hash(rendered['cover.png']) };
  if (values.check) {
    assert.equal(record.project_sha256, song.project_sha256, `${song.title}: rerender the edited source.`);
    assert.equal(record.native_sha256, song.native_sha256);
    assert.equal(record.export_sha256, song.export_sha256);
  }
  records.push(record);
  projects.push(project);
  const published = catalog.songs[index];
  const score = join(root, 'STRUDEL', song.title, `${song.title}.strudel`);
  assert.equal(hash(readFileSync(score)), published.source_sha256, `${song.title}: score changed independently.`);
  if (values.install) {
    const destination = join(root, 'STRUDEL', song.title, 'cover.png');
    assert.equal(hash(readFileSync(destination)), published.cover_sha256,
      `${song.title}: production cover changed independently; reconcile it before replacing.`);
    files.push([destination, rendered['cover.png']]);
    published.cover_sha256 = record.export_sha256;
    published.cover_source = `..\\artwork\\pixel-covers\\${song.title}\\${song.title}.spritecanvas.json`;
  }
}
const collection = validateProject({
  ...projects[0], id: manifest.baseline_project_id,
  name: 'Subwoofer Lullabies - 14 static pixel covers',
  palette: [...new Set(projects.flatMap((p) => p.palette))],
  frames: projects.map((p) => p.frames[0]),
});
const collectionBytes = Buffer.from(JSON.stringify(collection) + '\n');
files.push([join(directory, 'collection.spritecanvas.json'), collectionBytes]);
const description = 'Original editable SpriteCanvas pixel art; 128x128 native, exact 16x export to 2048x2048 opaque RGBA PNG.';
if (values.check) {
  assert.equal(manifest.candidate_sha256, hash(collectionBytes), 'Collection manifest hash is stale.');
  assert.equal(manifest.candidate_bytes, collectionBytes.length);
  assert.equal(manifest.editable_cells, 128 * 128 * collection.layers.length * 14);
  assert.deepEqual(manifest.layers, collection.layers);
  assert.equal(catalog.cover_art, description);
}
manifest.description = description;
manifest.songs = records;
manifest.layers = collection.layers;
manifest.editable_cells = 128 * 128 * collection.layers.length * 14;
manifest.candidate_sha256 = hash(collectionBytes);
manifest.candidate_bytes = collectionBytes.length;
if (values.check) {
  for (const [path, bytes] of files) assert.deepEqual(readFileSync(path), bytes, `Out-of-date pixel export: ${path}`);
  for (const [i, song] of records.entries()) {
    assert.equal(catalog.songs[i].cover_sha256, song.export_sha256);
    assert.equal(hash(readFileSync(join(root, 'STRUDEL', song.title, 'cover.png'))), song.export_sha256);
  }
  console.log('14 editable projects match their native, enlarged, collection and installed cover exports.');
} else {
  for (const [path, bytes] of files) writeFileSync(path, bytes);
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (values.install) {
    catalog.cover_art = description;
    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  }
  console.log(`Exported 14 layered pixel covers${values.install ? ' and replaced the STRUDEL cover PNGs' : ''}.`);
}
