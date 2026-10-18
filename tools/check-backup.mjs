// Checks for the backup of everything in the browser (#31). No browser.
//   node --no-warnings tools/check-backup.mjs
import { makeBackup, mergeBackup, BACKUP_FORMAT } from '../src/settings/backup.js';
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const CHECKS = {
  'backup keeps the app keys and leaves working state out'() {
    const b = makeBackup([['coding-misk-library', { tracks: [] }], ['coding-misk-draft', { x: 1 }], ['other', 1], ['coding-misk-ui', 'hw']]);
    assert(b.format === BACKUP_FORMAT && Object.keys(b.data).join() === 'coding-misk-library,coding-misk-ui', Object.keys(b.data).join());
  },
  'import merges by id and never deletes'() {
    const cur = { 'coding-misk-library': { tracks: [{ id: 'a', t: 1 }, { id: 'b' }], code: { x: '1' }, codeSongs: [] }, 'coding-misk-styles': [{ id: 's1' }],
      'coding-misk-playlists': { format: 1, lists: [{ id: 'favourites', songs: ['a'] }, { id: 'p1', name: 'Mine', songs: ['a'] }] } };
    const b = { format: BACKUP_FORMAT, data: { 'coding-misk-library': { tracks: [{ id: 'a', t: 2 }, { id: 'c' }], code: { y: '2' }, codeSongs: [{ id: 'v1' }] }, 'coding-misk-styles': [{ id: 's2' }],
      'coding-misk-playlists': { lists: [{ id: 'favourites', songs: ['c'] }, { id: 'p2', name: 'Theirs', songs: ['c'] }] }, 'coding-misk-ui': 'hw' } };
    const { values, counts } = mergeBackup(b, k => cur[k]);
    const lib = values['coding-misk-library'];
    assert(lib.tracks.map(x => `${x.id}${x.t || ''}`).join() === 'a2,b,c', 'tracks merged by id');
    assert(lib.code.x === '1' && lib.code.y === '2' && lib.codeSongs.length === 1, 'code and versions merged');
    assert(values['coding-misk-styles'].map(x => x.id).join() === 's1,s2', 'styles merged');
    const pl = values['coding-misk-playlists'].lists;
    assert(pl[0].id === 'favourites' && pl[0].songs.join() === 'a,c' && pl.map(l => l.id).join() === 'favourites,p1,p2', JSON.stringify(pl));
    assert(values['coding-misk-ui'] === 'hw' && counts.settings === 1, 'settings taken from the backup');
  },
  'last played: the latest time of each song wins (#67)'() {
    const { values } = mergeBackup({ format: 'coding-misk/backup', data: { 'coding-misk-played': { a: 5, b: 1 } } }, k => (k === 'coding-misk-played' ? { a: 3, b: 4, c: 2 } : null));
    const p = values['coding-misk-played'];
    assert(p.a === 5 && p.b === 4 && p.c === 2, JSON.stringify(p));
  },
  'the trash merges by id and never deletes a song (#68)'() {
    const cur = { 'coding-misk-library': { tracks: [{ id: 'a' }], code: {}, codeSongs: [], trash: [{ id: 'old', kind: 'track', song: { id: 'old' }, deletedAt: '2026-10-01T00:00:00.000Z' }] } };
    const b = { format: BACKUP_FORMAT, data: { 'coding-misk-library': { tracks: [], codeSongs: [{ id: 'v1' }], trash: [
      { id: 'a', kind: 'track', song: { id: 'a' }, deletedAt: '2026-10-02T00:00:00.000Z' }, { id: 'b', kind: 'track', song: { id: 'b' }, deletedAt: '2026-10-03T00:00:00.000Z' }] } } };
    const lib = mergeBackup(b, k => cur[k]).values['coding-misk-library'];
    assert(lib.trash.map(e => e.id).join() === 'old,b', `trash ${lib.trash.map(e => e.id)}`);
    assert(lib.tracks.map(x => x.id).join() === 'a' && lib.codeSongs.map(x => x.id).join() === 'v1', 'songs kept');
    // a song deleted here but alive in the backup comes back to the list and leaves the trash
    const back = mergeBackup({ format: BACKUP_FORMAT, data: { 'coding-misk-library': { tracks: [{ id: 'old' }] } } }, k => cur[k]).values['coding-misk-library'];
    assert(back.tracks.map(x => x.id).join() === 'a,old' && !back.trash.length, JSON.stringify(back.trash));
  },
  'an old backup without trash keeps the current trash'() {
    const cur = { 'coding-misk-library': { tracks: [], code: {}, trash: [{ id: 'x', kind: 'track', song: { id: 'x' }, deletedAt: '2026-10-01T00:00:00.000Z' }] } };
    const lib = mergeBackup({ format: BACKUP_FORMAT, data: { 'coding-misk-library': { tracks: [{ id: 'y' }], code: {} } } }, k => cur[k]).values['coding-misk-library'];
    assert(lib.trash.map(e => e.id).join() === 'x', JSON.stringify(lib.trash));
    const none = mergeBackup({ format: BACKUP_FORMAT, data: { 'coding-misk-library': { tracks: [{ id: 'y' }] } } }, () => null).values['coding-misk-library'];
    assert(Array.isArray(none.trash) && !none.trash.length, 'missing on both sides');
  },
  'hidden built-in songs merge as a union and keep their trash entry (#68, D3b)'() {
    const cur = { 'coding-misk-library': { tracks: [{ id: 'kellerlicht', title: 'edited' }], code: {}, hidden: ['a', 'kellerlicht'], trash: [{ id: 'kellerlicht', kind: 'builtin', title: 'K', deletedAt: '2026-10-10T00:00:00.000Z' }] } };
    const lib = mergeBackup({ format: BACKUP_FORMAT, data: { 'coding-misk-library': { tracks: [], hidden: ['b', 'a'] } } }, k => cur[k]).values['coding-misk-library'];
    assert(lib.hidden.join() === 'a,kellerlicht,b', `hidden ${lib.hidden}`);
    assert(lib.trash.map(e => e.id).join() === 'kellerlicht', 'an edit in tracks does not drop the built-in entry');
    const none = mergeBackup({ format: BACKUP_FORMAT, data: { 'coding-misk-library': { tracks: [] } } }, () => null).values['coding-misk-library'];
    assert(Array.isArray(none.hidden) && !none.hidden.length, 'missing on both sides');
  },
  'a file that is not a backup is refused'() { assert(mergeBackup({ format: 'x' }, () => null).error, 'accepted'); },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
