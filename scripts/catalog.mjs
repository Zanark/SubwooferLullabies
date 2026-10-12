import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

export function localPath(base, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path)) throw new Error(`Invalid relative asset path: ${path}`);
  const target = resolve(base, path);
  if (relative(base, target).startsWith('..')) throw new Error(`Asset escapes its root: ${path}`);
  return target;
}

export function combineCatalog(base, releases) {
  const songs = [...base.songs];
  const albums = [...base.albums];
  for (const release of releases) {
    if (release.version !== 1 || release.engine !== 'almost-us-finite-score'
        || release.songs.length !== 13 || release.album.title !== 'Almost Us'
        || release.album.tracks.length !== release.songs.length
        || release.songs.reduce((sum, song) => sum + song.duration_seconds, 0) !== 2344) {
      throw new Error('Invalid Almost Us imported release.');
    }
    for (const [index, song] of release.songs.entries()) {
      if (song.title !== release.album.tracks[index] || song.track_number !== index + 1
          || song.album !== release.album.title || song.kind !== 'one-shot'
          || !Number.isFinite(song.bpm) || song.bpm <= 0
          || !Number.isFinite(song.duration_seconds) || song.duration_seconds < 150 || song.duration_seconds > 210
          || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(song.asset_key)) {
        throw new Error(`Invalid imported track: ${song.title}`);
      }
    }
    songs.push(...release.songs);
    albums.push(release.album);
  }
  if (new Set(songs.map(song => song.title)).size !== songs.length
      || new Set(albums.map(album => album.title)).size !== albums.length) {
    throw new Error('Duplicate song or album titles.');
  }
  const keys = [...songs, ...albums].map(item => item.asset_key ?? item.title);
  if (new Set(keys).size !== keys.length) throw new Error('Song/album asset filename collision.');
  return { ...base, songs, albums };
}

export async function checkedBytes(path, expected, base = root) {
  if (!/^[0-9a-f]{64}$/.test(expected ?? '')) throw new Error(`Missing asset fingerprint: ${path}`);
  const bytes = await readFile(localPath(base, path));
  if (hash(bytes) !== expected) throw new Error(`Imported asset changed: ${path}`);
  return bytes;
}

export async function loadImportedReleases(base = root) {
  const paths = await readJson(join(base, 'tools', 'imported_albums.json'));
  const releases = [];
  for (const path of paths) {
    const release = await readJson(localPath(base, path));
    for (const item of [release.album, ...release.songs]) {
      for (const field of ['cover_file', 'circle_file', 'cassette_back_file', 'source_file', 'audio_file']) {
        if (item[field]) await checkedBytes(item[field], item[`${field}_sha256`], base);
      }
    }
    releases.push(release);
  }
  return releases;
}

export async function loadCatalog(base = root) {
  return combineCatalog(
    await readJson(join(base, 'STRUDEL', 'catalog.json')),
    await loadImportedReleases(base),
  );
}
