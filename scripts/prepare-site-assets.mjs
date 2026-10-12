import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from './catalog.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = join(root, 'site', 'public');
const coverRoot = join(publicRoot, 'covers');
const catalog = await loadCatalog();
const backRoot = join(publicRoot, 'cassette-backs');

await rm(coverRoot, { recursive: true, force: true });
await rm(backRoot, { recursive: true, force: true });
await mkdir(coverRoot, { recursive: true });
await mkdir(backRoot, { recursive: true });

const cassetteBackKeys = new Set();
for (const song of catalog.songs) {
  const source = song.cover_file
    ? join(root, song.cover_file)
    : join(root, 'STRUDEL', ...song.bundle_path.split('/'), 'cover.png');
  const key = song.asset_key ?? song.title;
  await cp(source, join(coverRoot, `${key}.png`));
  if (song.circle_file) await cp(join(root, song.circle_file), join(coverRoot, `${key}-circle.png`));
  const cassetteBack = song.cassette_back_file
    ? join(root, song.cassette_back_file)
    : join(root, 'artwork', 'covers', key, 'cassette-back.png');
  try {
    await access(cassetteBack);
    await cp(cassetteBack, join(backRoot, `${key}.png`));
    cassetteBackKeys.add(key);
  } catch (error) {
    if (song.cassette_back_file) throw error;
  }
}

for (const album of catalog.albums) {
  await cp(
    album.cover_file ? join(root, album.cover_file) : join(root, 'STRUDEL', ...album.cover.split('/')),
    join(coverRoot, `${album.asset_key ?? album.title}.png`),
  );
  if (album.circle_file) await cp(join(root, album.circle_file), join(coverRoot, `${album.asset_key}-circle.png`));
}

await writeFile(
  join(publicRoot, 'catalog.json'),
  `${JSON.stringify({
    songs: catalog.songs.map((song) => ({
      title: song.title,
      role: song.role,
      emotion: song.emotion,
      caption: song.caption,
      genre: song.genre,
      bpm: song.bpm,
      duration_seconds: song.duration_seconds,
      kind: song.kind,
      album: song.album,
      track_number: song.track_number,
      bundle_path: song.bundle_path,
      cover: `covers/${song.asset_key ?? song.title}.png`,
      audio: `audio/${song.asset_key ?? song.title}.mp3`,
      ...(cassetteBackKeys.has(song.asset_key ?? song.title)
        ? { cassette_back: `cassette-backs/${song.asset_key ?? song.title}.png` }
        : {}),
      ...(song.circle_file ? { cover_circle: `covers/${song.asset_key}-circle.png` } : {}),
    })),
    albums: catalog.albums.map((album) => ({
      title: album.title,
      description: album.description,
      tracks: album.tracks,
      cover: `covers/${album.asset_key ?? album.title}.png`,
      ...(album.circle_file ? { cover_circle: `covers/${album.asset_key}-circle.png` } : {}),
    })),
  }, null, 2)}\n`,
);
