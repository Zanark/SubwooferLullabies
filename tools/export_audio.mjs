import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { launchBrowser } from './audio_browser.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RATE = 48000;
const ENGINE = 'https://strudel.cc/';
const SETTINGS = { sample_rate: RATE, channels: 2, bits_per_sample: 16, max_polyphony: 1024, multi_channel_orbits: false };
const sha = data => createHash('sha256').update(data).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const urlPath = path => path.replaceAll('\\', '/');
const html = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function inspectWav(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE'
      || bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error('Invalid or incomplete RIFF/WAVE file');
  let format, data;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) throw new Error('Truncated WAV chunk');
    const name = bytes.toString('ascii', offset, offset + 4);
    if (name === 'fmt ') {
      if (size < 16) throw new Error('Truncated WAV format');
      format = { encoding: bytes.readUInt16LE(start), channels: bytes.readUInt16LE(start + 2),
        sample_rate: bytes.readUInt32LE(start + 4), block_align: bytes.readUInt16LE(start + 12),
        bits_per_sample: bytes.readUInt16LE(start + 14) };
    } else if (name === 'data') {
      data = bytes.subarray(start, start + size);
    }
    offset = start + size + size % 2;
  }
  if (!format || !data || format.encoding !== 1 || format.channels !== 2
      || format.sample_rate !== RATE || format.bits_per_sample !== 16 || format.block_align !== 4
      || !data.length || data.length % 4) throw new Error('Expected nonempty stereo 48 kHz, 16-bit PCM');
  let peak = 0, energy = 0, clipped = 0;
  for (let offset = 0; offset < data.length; offset += 2) {
    const sample = data.readInt16LE(offset);
    peak = Math.max(peak, Math.abs(sample) / 32768);
    energy += (sample / 32768) ** 2;
    if (sample === -32768 || sample === 32767) clipped++;
  }
  return { ...format, frames: data.length / 4, duration_seconds: data.length / 4 / RATE,
    peak, rms: Math.sqrt(energy / (data.length / 2)), clipped_samples: clipped };
}

async function waitFor(check, label, seconds = 120) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const result = await check();
    if (result) return result;
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function diagnostics(events) {
  return events.filter(event =>
    event.method === 'Runtime.exceptionThrown'
    || (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error')
    || event.method === 'Network.loadingFailed'
    || (event.method === 'Network.responseReceived' && event.params.response.status >= 400
      && /\.(?:wav|mp3|ogg|js|json|wasm)(?:[?#]|$)/i.test(event.params.response.url)));
}

async function render(song, source, destination, executable, gainDb) {
  const session = await launchBrowser(executable);
  const { page } = session;
  const expectedSeconds = song.end_cycle * 240 / song.bpm;
  const expectedFrames = Math.floor(expectedSeconds * RATE);
  await mkdir(destination, { recursive: true });
  try {
    await page.call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: destination, eventsEnabled: true });
    await page.call('Page.navigate', { url: ENGINE });
    await waitFor(() => page.evaluate(`!!window.strudelMirror && document.querySelector('.cm-content')!==null`), 'Strudel editor');
    // Capture the actual song buffer before WAV encoding, not the engine's shorter impulse renders.
    await page.evaluate(`{
      const start=OfflineAudioContext.prototype.startRendering;
      window.__songRender=null;
      OfflineAudioContext.prototype.startRendering=function(...args){
        return start.apply(this,args).then(buffer=>{
          if(Math.abs(buffer.length-${expectedFrames})<=1 && buffer.sampleRate===${RATE}){
            let peak=0,energy=0,nonfinite=0,clipped=0;
            const factor=${10 ** (gainDb / 20)};
            let originalPeak=0;
            for(let c=0;c<buffer.numberOfChannels;c++){
              const data=buffer.getChannelData(c);
              for(let i=0;i<data.length;i++){
                originalPeak=Math.max(originalPeak,Math.abs(data[i]));
                data[i]*=factor;
                const x=data[i];if(!Number.isFinite(x))nonfinite++;
                peak=Math.max(peak,Math.abs(x));energy+=x*x;if(Math.abs(x)>=1)clipped++;
              }
            }
            window.__songRender={channels:buffer.numberOfChannels,frames:buffer.length,sample_rate:buffer.sampleRate,
              duration_seconds:buffer.duration,peak,rms:Math.sqrt(energy/(buffer.length*buffer.numberOfChannels)),
              original_peak:originalPeak,export_gain_db:${gainDb},nonfinite,clipped};
          }
          return buffer;
        });
      };
    }`);
    await page.evaluate(`strudelMirror.setCode(${JSON.stringify(source)})`);
    // A real pointer event is needed by Strudel's initAudioOnFirstClick gate; element.click() is insufficient.
    await page.click(`[...document.querySelectorAll('button')].find(b=>b.title==='play')`);
    await waitFor(async () => {
      const state = await page.evaluate(`({
        ready:!!strudelMirror.repl.state.pattern,error:strudelMirror.repl.state.evalError?.message
      })`);
      if (state.error) throw new Error(`Strudel evaluation: ${state.error}`);
      return state.ready;
    }, 'score evaluation and audio initialization');
    await page.evaluate('strudelMirror.stop()');
    const evaluation = await page.evaluate(`({
      cps:strudelMirror.repl.scheduler.cps,
      onsets:strudelMirror.repl.state.pattern.queryArc(0,${song.end_cycle}).filter(h=>h.hasOnset()).length,
      sounds:[...new Set(strudelMirror.repl.state.pattern.queryArc(0,${song.end_cycle})
        .filter(h=>h.hasOnset()).map(h=>h.value.s))].sort()
    })`);
    if (Math.abs(evaluation.cps - song.bpm / 240) > 1e-10 || !evaluation.onsets) {
      throw new Error('Evaluated tempo/pattern does not match the catalog');
    }
    await page.click(`[...document.querySelectorAll('button')].find(b=>b.textContent==='export')`);
    await waitFor(() => page.evaluate(`document.querySelectorAll('input').length===6`), 'export controls', 10);
    await page.evaluate(`{
      const inputs=[...document.querySelectorAll('input')];
      const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      [${JSON.stringify(song.title)},0,${song.end_cycle},${RATE},1024].forEach((value,i)=>{
        set.call(inputs[i],String(value));
        inputs[i].dispatchEvent(new Event('input',{bubbles:true}));
        inputs[i].dispatchEvent(new Event('change',{bubbles:true}));
      });
      if(inputs[5].checked)inputs[5].click();
    }`);
    await delay(200);
    const settings = await page.evaluate(`[...document.querySelectorAll('input')].map(i=>i.type==='checkbox'?i.checked:i.value)`);
    if (JSON.stringify(settings) !== JSON.stringify([song.title, '0', String(song.end_cycle), String(RATE), '1024', false])) {
      throw new Error(`Export controls did not retain requested settings: ${JSON.stringify(settings)}`);
    }
    await page.click(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Export to WAV')`);
    const filename = `${song.title}.wav`;
    await waitFor(async () => {
      const errors = diagnostics(page.events);
      if (errors.length) throw new Error(`Browser reported audio/resource errors: ${JSON.stringify(errors).slice(0,4000)}`);
      const files = await readdir(destination);
      return files.includes(filename) && !files.some(file => file.endsWith('.crdownload'));
    }, `${song.title} WAV download`, 600);
    const buffer = await page.evaluate('window.__songRender');
    const errors = diagnostics(page.events);
    if (errors.length) throw new Error(`Renderer errors: ${JSON.stringify(errors).slice(0,4000)}`);
    if (!buffer || buffer.channels !== 2 || buffer.nonfinite || buffer.clipped || buffer.rms < 1e-7) {
      throw new Error(`Invalid, silent or clipping audio buffer: ${JSON.stringify(buffer)}`);
    }
    const bytes = await readFile(join(destination, filename));
    const wav = inspectWav(bytes);
    if (Math.abs(wav.frames - expectedFrames) > 1 || wav.rms < 1e-7 || wav.clipped_samples) {
      throw new Error(`WAV duration/signal check failed: ${JSON.stringify(wav)}`);
    }
    const responses = page.events.filter(event => event.method === 'Network.responseReceived').map(event => event.params.response);
    const samples = [...new Set(responses.filter(response => /\.(wav|mp3|ogg)([?#]|$)/i.test(response.url))
      .map(response => response.url))].sort();
    const engineAssets = [...new Set(responses.filter(response => response.url.startsWith(`${ENGINE}_astro/`)
      && response.url.endsWith('.js')).map(response => response.url))].sort();
    return { bytes, wav, buffer, evaluation, sample_assets: samples, engine_assets: engineAssets };
  } finally {
    await session.close();
  }
}

function listeningPage(manifest, output) {
  const cards = manifest.tracks.map(track => {
    const cover = urlPath(relative(output, join(ROOT, 'STRUDEL', track.bundle_path, 'cover.png')));
    const note = urlPath(relative(output, join(ROOT, 'STRUDEL', track.bundle_path, 'RIGHTS.md')));
    return `<article><img src="${html(cover)}" alt="${html(track.title)} cover" width="300" height="300" loading="lazy">
<h2>${html(track.title)}</h2><p>${html(track.album || 'standalone')} / ${track.wav.duration_seconds.toFixed(2)} seconds${track.export_gain_db ? ` / ${track.export_gain_db} dB export gain` : ''}</p>
<audio controls preload="none" src="${html(track.file)}"></audio>
<nav><a href="${html(track.file)}" download>Download WAV</a> <a href="${html(note)}">Rights note</a></nav></article>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Subwoofer Lullabies - audio</title><style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#091d24;color:#dddcca}
body{max-width:1400px;margin:40px auto;padding:0 24px}h1{font-weight:400}p{line-height:1.6;color:#b8c9c5}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px}
article{background:#10272f;padding:18px;border:1px solid #24434b;border-radius:8px}
img{width:100%;height:auto}audio{width:100%}a{color:#a8d9cb}nav{display:flex;gap:20px;margin-top:16px}
</style></head><body><h1>Subwoofer Lullabies</h1>
<p>${manifest.tracks.length} of ${manifest.expected_tracks} local WAV exports. Stereo 48 kHz / 16-bit PCM.
Loop tracks contain one written form, not a mastered seamless loop. Any explicitly approved export gain reduction is shown on its track.
Existing sample permissions and attribution requirements still apply; these are not rights-cleared releases.</p>
<main>${cards}</main></body></html>\n`;
}

async function main() {
  const args = process.argv.slice(2);
  let output = join(ROOT, 'AUDIO');
  let executable = String.raw`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`;
  let titles;
  const gains = new Map();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) output = resolve(args[++i]);
    else if (args[i] === '--browser' && args[i + 1]) executable = resolve(args[++i]);
    else if (args[i] === '--titles' && args[i + 1]) titles = args[++i].split(',');
    else if (args[i] === '--gain-db' && args[i + 1]) {
      const [title, value, extra] = args[++i].split('=');
      const gain = Number(value);
      if (!title || value === undefined || value === '' || extra !== undefined
          || !Number.isFinite(gain) || gain > 0 || gain < -60) {
        throw new Error('--gain-db requires title=decibels, between -60 and 0 dB');
      }
      gains.set(title, gain);
    }
    else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  const catalog = await readJson(join(ROOT, 'STRUDEL', 'catalog.json'));
  const known = new Set(catalog.songs.map(song => song.title));
  if (titles && titles.some(title => !known.has(title))) throw new Error('Unknown song selection');
  if ([...gains.keys()].some(title => !known.has(title))) throw new Error('Unknown gain-adjustment song');
  if (titles && [...gains.keys()].some(title => !titles.includes(title))) throw new Error('Gain adjustment is outside the selected tracks');
  if (!existsSync(executable)) throw new Error(`Browser executable missing: ${executable}`);
  if (existsSync(output) && !existsSync(join(output, 'manifest.json')) && (await readdir(output)).length) {
    throw new Error('Refusing an existing nonempty output without an export manifest');
  }
  await mkdir(output, { recursive: true });
  const manifestPath = join(output, 'manifest.json');
  const manifest = existsSync(manifestPath) ? await readJson(manifestPath) : {
    version: 1, engine: ENGINE, settings: SETTINGS, created: new Date().toISOString(),
    expected_tracks: catalog.songs.length, complete: false, tracks: [],
  };
  if (manifest.version !== 1 || manifest.engine !== ENGINE
      || Object.entries(SETTINGS).some(([key, value]) => manifest.settings?.[key] !== value)) {
    throw new Error('Existing exports use a different engine or settings; choose a new output folder');
  }
  if (!Array.isArray(manifest.tracks) || new Set(manifest.tracks.map(track => track.title)).size !== manifest.tracks.length
      || manifest.tracks.some(track => !known.has(track.title))) throw new Error('Invalid existing export catalog');
  for (const prior of manifest.tracks) {
    const song = catalog.songs.find(item => item.title === prior.title);
    const filename = urlPath(join(song.album || '', `${song.title}.wav`));
    const source = await readFile(join(ROOT, 'STRUDEL', song.bundle_path, `${song.title}.strudel`));
    const gainDb = gains.get(song.title) ?? prior.export_gain_db ?? 0;
    if (prior.source_sha256 !== sha(source) || sha(source) !== song.source_sha256
        || prior.file !== filename || prior.end_cycle !== song.end_cycle || prior.bpm !== song.bpm
        || (prior.export_gain_db ?? 0) !== gainDb) {
      throw new Error(`${song.title}: existing export is stale; choose a new output folder`);
    }
    const bytes = await readFile(join(output, filename));
    const info = inspectWav(bytes);
    if (sha(bytes) !== prior.wav_sha256 || Math.abs(info.frames - song.end_cycle * 240 / song.bpm * RATE) > 1
        || info.clipped_samples || info.rms < 1e-7) throw new Error(`${song.title}: existing WAV failed validation`);
  }
  const save = async () => {
    manifest.tracks.sort((a, b) => catalog.songs.findIndex(s => s.title === a.title) - catalog.songs.findIndex(s => s.title === b.title));
    manifest.complete = manifest.tracks.length === catalog.songs.length;
    manifest.updated = new Date().toISOString();
    await writeFile(`${manifestPath}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`);
    await rename(`${manifestPath}.tmp`, manifestPath);
    await writeFile(join(output, 'index.html'), listeningPage(manifest, output));
  };
  await save();
  for (const song of catalog.songs) {
    if (titles && !titles.includes(song.title)) continue;
    const path = join(ROOT, 'STRUDEL', song.bundle_path, `${song.title}.strudel`);
    const source = await readFile(path);
    if (sha(source) !== song.source_sha256) throw new Error(`${song.title}: source differs from catalog`);
    const filename = urlPath(join(song.album || '', `${song.title}.wav`));
    const target = join(output, filename);
    const prior = manifest.tracks.find(track => track.title === song.title);
    const gainDb = gains.get(song.title) ?? prior?.export_gain_db ?? 0;
    if (prior) {
      console.log(`Reusing checked export: ${song.title}`);
      continue;
    }
    if (existsSync(target)) throw new Error(`Refusing to overwrite unrecorded audio: ${target}`);
    const staging = join(output, `.render-${song.title}`);
    if (existsSync(staging)) throw new Error(`Previous incomplete render exists: ${staging}`);
    console.log(`Rendering ${song.title}: ${song.end_cycle} cycles / ${(song.end_cycle * 240 / song.bpm).toFixed(3)} seconds`);
    const result = await render(song, source.toString('utf8'), staging, executable, gainDb);
    if (sha(await readFile(path)) !== sha(source)) throw new Error(`${song.title}: source changed during rendering`);
    await mkdir(dirname(target), { recursive: true });
    await rename(join(staging, `${song.title}.wav`), target);
    await rm(staging, { recursive: true });
    manifest.tracks.push({
      title: song.title, album: song.album, bundle_path: song.bundle_path, file: filename,
      source_sha256: sha(source), bpm: song.bpm, start_cycle: 0, end_cycle: song.end_cycle,
      kind: song.kind, sample_group: song.sample_group, wav_sha256: sha(result.bytes),
      export_gain_db: gainDb,
      rendered_at: new Date().toISOString(), wav: result.wav, pre_encoding: result.buffer,
      evaluation: result.evaluation, sample_assets: result.sample_assets, engine_assets: result.engine_assets,
    });
    await save();
    console.log(`Saved ${filename}: peak=${result.wav.peak.toFixed(4)}, ${result.bytes.length} bytes`);
  }
  console.log(`${manifest.tracks.length}/${catalog.songs.length} WAVs saved. Listening page: ${join(output, 'index.html')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
