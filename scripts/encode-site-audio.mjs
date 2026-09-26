import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lameContext = {};
vm.createContext(lameContext);
vm.runInContext(
  await readFile(join(root, 'node_modules', 'lamejs', 'lame.all.js'), 'utf8'),
  lameContext,
);
const { lamejs } = lameContext;
if (!lamejs?.Mp3Encoder) throw new Error('Bundled lamejs encoder failed to initialize.');
const manifest = JSON.parse(await readFile(join(root, 'AUDIO', 'manifest.json'), 'utf8'));
const destination = join(root, 'site', 'public', 'audio');
const sampleBlock = 1152;

if (!manifest.complete || manifest.tracks.length !== manifest.expected_tracks) {
  throw new Error('AUDIO manifest is incomplete; refusing to publish partial previews.');
}

function pcmChannels(wav) {
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Expected a RIFF/WAVE source.');
  }

  let format;
  let data;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const size = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    const chunk = wav.toString('ascii', offset, offset + 4);
    if (chunk === 'fmt ') {
      format = {
        encoding: wav.readUInt16LE(start),
        channels: wav.readUInt16LE(start + 2),
        sampleRate: wav.readUInt32LE(start + 4),
        bits: wav.readUInt16LE(start + 14),
      };
    } else if (chunk === 'data') {
      data = wav.subarray(start, start + size);
    }
    offset = start + size + size % 2;
  }

  if (!format || !data || format.encoding !== 1 || format.channels !== 2 || format.bits !== 16) {
    throw new Error('Expected stereo 16-bit PCM WAV.');
  }

  const frames = data.length / 4;
  const left = new Int16Array(frames);
  const right = new Int16Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    left[frame] = data.readInt16LE(frame * 4);
    right[frame] = data.readInt16LE(frame * 4 + 2);
  }
  return { ...format, left, right };
}

await mkdir(destination, { recursive: true });
for (const track of manifest.tracks) {
  const wav = await readFile(join(root, 'AUDIO', ...track.file.split('/')));
  const { sampleRate, left, right } = pcmChannels(wav);
  const encoder = new lamejs.Mp3Encoder(2, sampleRate, 160);
  const chunks = [];
  for (let offset = 0; offset < left.length; offset += sampleBlock) {
    const encoded = encoder.encodeBuffer(
      left.subarray(offset, offset + sampleBlock),
      right.subarray(offset, offset + sampleBlock),
    );
    if (encoded.length) chunks.push(Buffer.from(encoded));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  const output = Buffer.concat(chunks);
  if (!output.length) throw new Error(`${track.title}: encoder produced no audio.`);
  await writeFile(join(destination, `${track.title}.mp3`), output);
  console.log(`${track.title}: ${(output.length / 1024 / 1024).toFixed(2)} MiB`);
}
