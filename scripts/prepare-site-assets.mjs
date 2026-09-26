import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = join(root, 'site', 'public');
const coverRoot = join(publicRoot, 'covers');
const catalog = JSON.parse(await readFile(join(root, 'STRUDEL', 'catalog.json'), 'utf8'));

await rm(coverRoot, { recursive: true, force: true });
await mkdir(coverRoot, { recursive: true });

for (const song of catalog.songs) {
  const source = join(root, 'STRUDEL', ...song.bundle_path.split('/'), 'cover.png');
  await cp(source, join(coverRoot, `${song.title}.png`));
}

for (const album of catalog.albums) {
  await cp(
    join(root, 'STRUDEL', ...album.cover.split('/')),
    join(coverRoot, `${album.title}.png`),
  );
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
      cover: `covers/${song.title}.png`,
      audio: `audio/${song.title}.mp3`,
    })),
    albums: catalog.albums.map((album) => ({
      title: album.title,
      description: album.description,
      tracks: album.tracks,
      cover: `covers/${album.title}.png`,
    })),
  }, null, 2)}\n`,
);
