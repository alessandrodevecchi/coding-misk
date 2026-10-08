// Checks for playlists (#36): store, migration of the old favourites, play queue, export and import. No browser.
//   npm run check:playlists      exit 1 when any check fails
import { createPlaylistStore, createQueue, shuffled, exportPlaylist, importPlaylist, freeName, FAV_ID, PLAYLISTS_KEY, OLD_FAV_KEY } from '../src/library/playlists.js';
import { stream } from '../src/endless/random.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const memory = (init = {}) => { const m = { ...init }; return { m, get: (k, d) => (m[k] === undefined || m[k] === null ? d : JSON.parse(JSON.stringify(m[k]))), set: (k, v) => { m[k] = v === null ? undefined : JSON.parse(JSON.stringify(v)); } }; };
const rand = () => { const s = stream('playlists-check'); return s.next; };
// plays a queue to its end (auto advance), at most n songs
const playOut = (q, n = 50) => { const out = [q.current]; for (let i = 0; i < n; i++) { const x = q.next({ auto: true }); if (x === null) break; out.push(x); } return out; };
const IDS = ['a', 'b', 'c', 'd', 'e'];

const CHECKS = {
  'favourites always first and fixed': () => {
    const st = createPlaylistStore(memory());
    assert(st.all.length === 1 && st.all[0].id === FAV_ID, 'favourites created');
    assert(!st.remove(FAV_ID) && !st.rename(FAV_ID, 'x'), 'favourites cannot be removed or renamed');
    st.create('Night run');
    assert(st.all[0].id === FAV_ID, 'favourites first');
  },
  'old favourites migrated once': () => {
    const mem = memory({ [OLD_FAV_KEY]: ['kellerlicht', 'drift'] });
    const st = createPlaylistStore(mem);
    assert(st.favourites.songs.join() === 'kellerlicht,drift', st.favourites.songs.join());
    assert(mem.m[OLD_FAV_KEY] === undefined, 'old key removed');
    assert(createPlaylistStore(mem).favourites.songs.length === 2, 'kept after reload');
  },
  'star toggles favourites': () => {
    const st = createPlaylistStore(memory());
    assert(st.toggleFav('x') === true && st.isFav('x') && st.toggleFav('x') === false && !st.isFav('x'), 'toggle');
  },
  'create, rename, add, move, remove, delete': () => {
    const mem = memory(), st = createPlaylistStore(mem);
    const p = st.create('Night run', ['a', 'b', 'a']);
    assert(p.songs.join() === 'a,b', 'no duplicates');
    assert(st.create('Night run').name === 'Night run 2', 'free name');
    assert(st.add(p.id, 'c') && !st.add(p.id, 'c'), 'add once');
    assert(st.move(p.id, 2, 1) && st.get(p.id).songs.join() === 'a,c,b', 'move up');
    assert(st.removeAt(p.id, 0) && st.get(p.id).songs.join() === 'c,b', 'remove');
    assert(st.rename(p.id, 'Late run') && st.get(p.id).name === 'Late run', 'rename');
    const again = createPlaylistStore(mem);
    assert(again.get(p.id).songs.join() === 'c,b' && again.get(p.id).name === 'Late run', 'kept after reload');
    assert(st.remove(p.id) && !st.get(p.id), 'delete');
  },
  'queue plays in order and stops at the end': () => {
    const q = createQueue({ ids: IDS, start: 'b' });
    assert(playOut(q).join('') === 'bcde', playOut(createQueue({ ids: IDS, start: 'b' })).join(''));
    assert(q.position.n === 5 && q.position.total === 5, JSON.stringify(q.position));
  },
  'missing songs are skipped': () => {
    const q = createQueue({ ids: IDS, exists: id => id !== 'c' });
    assert(playOut(q).join('') === 'abde', 'skip c');
    assert(createQueue({ ids: IDS, start: 'c', exists: id => id !== 'c' }).current === 'd', 'start on a missing song');
  },
  'shuffle plays every song once, the chosen one first': () => {
    for (let k = 0; k < 20; k++) {
      const q = createQueue({ ids: IDS, start: 'c', shuffle: true, rand: rand() });
      const out = playOut(q);
      assert(out[0] === 'c' && out.length === 5 && new Set(out).size === 5, out.join(''));
    }
    assert(shuffled(IDS, rand()).slice().sort().join('') === 'abcde', 'permutation');
  },
  'shuffle off continues in playlist order': () => {
    const q = createQueue({ ids: IDS, start: 'a', shuffle: true, rand: rand() });
    q.next(); const cur = q.current;
    q.setShuffle(false);
    assert(q.current === cur, 'current kept');
    const want = IDS.slice(IDS.indexOf(cur));
    assert(playOut(q).join('') === want.join(''), `order from ${cur}`);
  },
  'repeat all wraps, repeat one replays': () => {
    const q = createQueue({ ids: ['a', 'b'], repeat: 'all' });
    assert(playOut(q, 4).join('') === 'ababa', 'repeat all');
    const one = createQueue({ ids: ['a', 'b'], repeat: 'one' });
    assert(one.next({ auto: true }) === 'a' && one.next() === 'b', 'repeat one replays on auto, next moves on');
    const sh = createQueue({ ids: IDS, repeat: 'all', shuffle: true, rand: rand() });
    const out = playOut(sh, 9);
    assert(new Set(out.slice(0, 5)).size === 5 && new Set(out.slice(5, 10)).size === 5, out.join(''));
  },
  'previous': () => {
    const q = createQueue({ ids: IDS, start: 'c' });
    assert(q.prev() === 'b' && q.prev() === 'a' && q.prev() === null, 'prev stops at the start');
    const r = createQueue({ ids: IDS, start: 'a', repeat: 'all' });
    assert(r.prev() === 'e', 'prev wraps with repeat all');
  },
  'export and import with user songs': () => {
    const mine = { id: 'u-1', title: 'Mine', sections: [] };
    const file = exportPlaylist({ name: 'Night run', songs: ['kellerlicht', 'u-1'] }, id => (id === 'u-1' ? mine : null));
    assert(file.userSongs.length === 1 && file.songs.join() === 'kellerlicht,u-1', 'export');
    const fresh = importPlaylist(JSON.parse(JSON.stringify(file)), () => null, id => `${id}-2`);
    assert(fresh.add.length === 1 && fresh.songs.join() === 'kellerlicht,u-1', 'import in an empty browser');
    const same = importPlaylist(file, id => (id === 'u-1' ? mine : null), id => `${id}-2`);
    assert(same.add.length === 0, 'same song not added twice');
    const clash = importPlaylist(file, id => (id === 'u-1' ? { ...mine, title: 'Other' } : null), id => `${id}-2`);
    assert(clash.add[0].id === 'u-1-2' && clash.songs.join() === 'kellerlicht,u-1-2', 'clash gets a new id');
    assert(importPlaylist({ songs: [] }, () => null, x => x).error, 'wrong format rejected');
  },
  'free names': () => {
    assert(freeName('A', ['A', 'A 2']) === 'A 3' && freeName(' ', []) === 'Playlist', 'free name');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
