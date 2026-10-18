// Checks for the song trash (#68): move to the trash, restore, delete for good, empty, purge after 30 days,
// days left, merge of two trashes, hidden built-in songs (D3b). No browser, fixed dates.
//   npm run check:trash      exit 1 when any check fails
import { trashSong, restoreSong, deleteForGood, emptyTrash, purgeTrash, daysLeft, trashList, mergeTrash, hideSong, showHidden, hiddenIds, entryTitle, mergeHidden, TRASH_DAYS } from '../src/library/trash.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const NOW = new Date('2026-10-18T10:00:00Z');
const DAY = 864e5;
const at = days => new Date(NOW.getTime() + days * DAY);
const lib = () => ({
  tracks: [{ id: 'u-1', title: 'Mine', tags: { free: ['test'] }, sections: [{ name: 'A', bars: 8 }] }, { id: 'kellerlicht', title: 'Edited built-in' }],
  code: { 'v-1': 'note("c")', other: 'x' },
  codeSongs: [{ id: 'v-1', title: 'Ghost · v2', code: 'note("a")', from: 'ghost-protocol', version: 2 }],
});
const snap = x => JSON.stringify(x);

const CHECKS = {
  'a composed song goes to the trash as a track'() {
    const before = lib(), after = trashSong(before, 'u-1', NOW);
    assert(!after.tracks.some(x => x.id === 'u-1') && after.tracks.length === 1, 'still in tracks');
    const e = after.trash[0];
    assert(after.trash.length === 1 && e.id === 'u-1' && e.kind === 'track' && e.deletedAt === NOW.toISOString(), snap(e));
    assert(snap(e.song) === snap(before.tracks[0]), 'stored as it was');
    assert(snap(before) === snap(lib()), 'the library passed in is not changed');
  },
  'a hand-coded version goes to the trash with its edited code'() {
    const after = trashSong(lib(), 'v-1', NOW), e = after.trash[0];
    assert(!after.codeSongs.length && e.kind === 'version' && e.song.code === 'note("c")', snap(e));
    assert(!('v-1' in after.code) && after.code.other === 'x', 'the edit leaves the code map, the others stay');
  },
  'an unknown id changes nothing'() {
    const before = lib(), after = trashSong(before, 'nope', NOW);
    assert(snap(after) === snap(before), 'changed');
  },
  'restore brings the song back as it was, for both kinds'() {
    let l = trashSong(trashSong(lib(), 'u-1', NOW), 'v-1', at(1));
    l = restoreSong(restoreSong(l, 'u-1'), 'v-1');
    assert(!l.trash.length, 'trash not empty');
    const t = l.tracks.find(x => x.id === 'u-1'), v = l.codeSongs.find(x => x.id === 'v-1');
    assert(t && snap(t) === snap(lib().tracks[0]), 'track not restored as it was');
    assert(v && v.code === 'note("c")' && v.title === 'Ghost · v2' && v.from === 'ghost-protocol', snap(v));
  },
  'restore of a song alive again only drops the trash entry'() {
    let l = trashSong(lib(), 'u-1', NOW);
    l = { ...l, tracks: [...l.tracks, { id: 'u-1', title: 'Newer' }] };
    l = restoreSong(l, 'u-1');
    assert(l.tracks.filter(x => x.id === 'u-1').length === 1 && l.tracks.find(x => x.id === 'u-1').title === 'Newer' && !l.trash.length, snap(l));
  },
  'delete for good and empty the trash'() {
    let l = trashSong(trashSong(lib(), 'u-1', NOW), 'v-1', NOW);
    l = deleteForGood(l, 'u-1');
    assert(l.trash.map(e => e.id).join() === 'v-1' && !l.tracks.some(x => x.id === 'u-1'), snap(l.trash));
    l = emptyTrash(l);
    assert(Array.isArray(l.trash) && !l.trash.length && !l.codeSongs.length, 'not empty');
  },
  'deleting again replaces the old entry'() {
    let l = trashSong(lib(), 'u-1', NOW);
    l = { ...l, tracks: [...l.tracks, { id: 'u-1', title: 'Again' }] };
    l = trashSong(l, 'u-1', at(2));
    assert(l.trash.length === 1 && l.trash[0].song.title === 'Again' && l.trash[0].deletedAt === at(2).toISOString(), snap(l.trash));
  },
  'days left: 30 on the day, rounded up, never below 0'() {
    const e = { deletedAt: NOW.toISOString() };
    assert(daysLeft(e, NOW) === TRASH_DAYS && TRASH_DAYS === 30, `${daysLeft(e, NOW)}`);
    assert(daysLeft(e, new Date(NOW.getTime() + 3600e3)) === 30, 'an hour later still 30');
    assert(daysLeft(e, at(1)) === 29 && daysLeft(e, at(29.5)) === 1 && daysLeft(e, at(40)) === 0, 'rounding');
  },
  'purge removes entries 30 days old or more, keeps the others'() {
    let l = trashSong(trashSong(lib(), 'u-1', at(-31)), 'v-1', at(-29));
    l = purgeTrash(l, NOW);
    assert(l.trash.map(e => e.id).join() === 'v-1', snap(l.trash));
    l = purgeTrash(l, at(1));
    assert(!l.trash.length, 'exactly 30 days: purged');
  },
  'a library without trash reads as an empty trash'() {
    const l = { tracks: [], code: {} };
    assert(trashList(l).length === 0 && purgeTrash(l, NOW).trash.length === 0 && restoreSong(l, 'x').tracks.length === 0, 'missing trash');
  },
  'the list shows the most recent first'() {
    const l = trashSong(trashSong(lib(), 'u-1', at(-3)), 'v-1', at(-1));
    assert(trashList(l).map(e => e.id).join() === 'v-1,u-1', trashList(l).map(e => e.id).join());
  },
  'merge: by id, songs alive on either side leave the trash'() {
    const a = [{ id: 'x', deletedAt: '2026-10-01T00:00:00Z' }, { id: 'alive', deletedAt: '2026-10-01T00:00:00Z' }];
    const b = [{ id: 'x', deletedAt: '2026-10-05T00:00:00Z' }, { id: 'y', deletedAt: '2026-10-02T00:00:00Z' }];
    const out = mergeTrash(a, b, new Set(['alive']));
    assert(out.map(e => `${e.id}@${e.deletedAt.slice(8, 10)}`).join() === 'x@05,y@02', out.map(e => e.id).join());
    assert(mergeTrash(undefined, null, new Set()).length === 0, 'missing trash');
  },
  'a built-in song is hidden and goes to the trash with no copy (D3b)'() {
    const before = lib(), after = hideSong(before, 'kellerlicht', 'Kellerlicht', NOW), e = after.trash[0];
    assert(snap(after.hidden) === '["kellerlicht"]' && hiddenIds(after).has('kellerlicht'), snap(after.hidden));
    assert(e.id === 'kellerlicht' && e.kind === 'builtin' && !('song' in e) && entryTitle(e) === 'Kellerlicht' && e.deletedAt === NOW.toISOString(), snap(e));
    assert(snap(after.tracks) === snap(before.tracks), 'its edit stays in tracks for a restore');
    assert(snap(before) === snap(lib()), 'the library passed in is not changed');
    assert(hideSong(after, 'kellerlicht', 'K', at(1)).hidden.length === 1 && hideSong(after, 'kellerlicht', 'K', at(1)).trash.length === 1, 'hidden twice: one id, one entry');
  },
  'restore shows a built-in song again'() {
    let l = hideSong(hideSong(lib(), 'prova-solo-synth', 'Solo synth', NOW), 'kellerlicht', 'K', NOW);
    l = restoreSong(l, 'prova-solo-synth');
    assert(snap(l.hidden) === '["kellerlicht"]' && l.trash.map(e => e.id).join() === 'kellerlicht', snap(l));
    assert(snap(l.tracks) === snap(lib().tracks), 'no song added to tracks');
  },
  'delete for good, empty and purge keep a built-in song hidden'() {
    let l = hideSong(hideSong(lib(), 'a', 'A', at(-31)), 'b', 'B', NOW);
    l = purgeTrash(l, NOW);
    assert(l.trash.map(e => e.id).join() === 'b' && snap(l.hidden) === '["a","b"]', 'purge');
    assert(snap(deleteForGood(l, 'b').hidden) === '["a","b"]' && snap(emptyTrash(l).hidden) === '["a","b"]', 'for good');
  },
  'show hidden: every built-in song back, the user songs stay in the trash'() {
    let l = trashSong(hideSong(hideSong(lib(), 'a', 'A', NOW), 'b', 'B', NOW), 'u-1', NOW);
    l = deleteForGood(l, 'a');
    l = showHidden(l);
    assert(Array.isArray(l.hidden) && !l.hidden.length && l.trash.map(e => e.id).join() === 'u-1', snap(l));
  },
  'merge: a hidden built-in song keeps its entry even with an edit alive; hidden as a union'() {
    const out = mergeTrash([{ id: 'kellerlicht', kind: 'builtin', title: 'K', deletedAt: NOW.toISOString() }], [], new Set(['kellerlicht']));
    assert(out.length === 1, 'builtin entry dropped');
    assert(mergeHidden(['a', 'b'], ['b', 'c']).join() === 'a,b,c' && mergeHidden(undefined, null).length === 0 && mergeHidden(['a', 3, ''], ['a']).join() === 'a', 'union');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
