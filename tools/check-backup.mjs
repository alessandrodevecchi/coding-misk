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
  'a file that is not a backup is refused'() { assert(mergeBackup({ format: 'x' }, () => null).error, 'accepted'); },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
