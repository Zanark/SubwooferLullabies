import test from 'node:test';
import assert from 'node:assert/strict';
import { combineCatalog, localPath } from './catalog.mjs';

function fixture() {
  const songs = Array.from({ length: 13 }, (_, index) => ({
    title: index === 10 ? 'Almost Us' : `Song ${index + 1}`,
    asset_key: `almost-us-${index + 1}`, album: 'Almost Us',
    track_number: index + 1, duration_seconds: index === 12 ? 184 : 180,
    kind: 'one-shot', bpm: 112,
  }));
  return {
    version: 1, engine: 'almost-us-finite-score', songs,
    album: { title: 'Almost Us', asset_key: 'almost-us-album', tracks: songs.map(song => song.title) },
  };
}
const base = { songs: [{ title: 'serenity' }], albums: [] };

test('import preserves title case, order and independent album/track assets', () => {
  const result = combineCatalog(base, [fixture()]);
  assert.equal(result.songs.length, 14);
  assert.equal(result.songs[11].title, 'Almost Us');
  assert.equal(result.albums[0].title, 'Almost Us');
  assert.equal(base.songs.length, 1);
});
test('rejects missing tracks, wrong order and duration drift', () => {
  for (const mutate of [
    r => r.songs.pop(),
    r => { r.album.tracks.reverse(); },
    r => { r.songs[0].duration_seconds = 10; },
    r => { r.songs[0].duration_seconds = NaN; },
  ]) {
    const release = fixture();
    mutate(release);
    assert.throws(() => combineCatalog(base, [release]));
  }
});
test('rejects album/song filename collision and duplicate titles', () => {
  const collision = fixture();
  collision.album.asset_key = collision.songs[10].asset_key;
  assert.throws(() => combineCatalog(base, [collision]), /collision/);
  const duplicate = fixture();
  duplicate.songs[0].title = duplicate.album.tracks[0] = 'serenity';
  assert.throws(() => combineCatalog(base, [duplicate]), /Duplicate/);
});
test('rejects paths outside the repository', () => {
  assert.throws(() => localPath('C:\\music', '..\\outside.wav'), /escapes/);
  assert.throws(() => localPath('C:\\music', 'C:\\outside.wav'), /relative/);
  assert.equal(localPath('C:\\music', 'AUDIO\\Almost Us\\song.wav'), 'C:\\music\\AUDIO\\Almost Us\\song.wav');
});
