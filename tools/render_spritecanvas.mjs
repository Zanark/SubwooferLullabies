import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  options: { 'studio-root': { type: 'string' }, check: { type: 'boolean' } },
  allowPositionals: true,
});
assert.ok(values['studio-root'] && positionals.length, 'Supply --studio-root and project paths.');
const { validateProject, composite } = await import(pathToFileURL(join(values['studio-root'], 'web', 'lib', 'model.js')));
const { encodePng } = await import(pathToFileURL(join(values['studio-root'], 'scripts', 'png.mjs')));
for (const path of positionals) {
  const project = validateProject(JSON.parse(readFileSync(path)));
  const provenance = JSON.parse(readFileSync(join(dirname(path), 'provenance.json')));
  assert.equal(project.id, provenance.baseline_project_id, `${path}: original project ID must be preserved`);
  assert.equal(project.width, 256);
  assert.equal(project.height, 256);
  assert.equal(project.frames.length, 1);
  assert.equal(project.width * project.height * project.layers.length, provenance.editable_cells);
  const rgba = composite(project);
  for (let i = 3; i < rgba.length; i += 4) assert.equal(rgba[i], 255, `${path}: transparent background`);
  const bytes = encodePng(project, 0, 1);
  const output = join(dirname(path), 'scene.png');
  if (values.check) {
    assert.deepEqual(readFileSync(output), bytes, `${path}: stale native render`);
  } else {
    writeFileSync(path, JSON.stringify(project) + '\n');
    writeFileSync(output, bytes);
  }
}
console.log(`${positionals.length} layered SpriteCanvas scenes ${values.check ? 'matched' : 'rendered'}.`);
