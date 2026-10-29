// Checks for the backup of everything in the browser (#31). No browser.
//   node --no-warnings tools/check-backup.mjs
import { makeBackup, mergeBackup, BACKUP_FORMAT } from '../src/settings/backup.js';
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const CHECKS = {
  'code widgets settings travel in the backup, the open sections of their card do not (code-widgets 2.2)'() {
    const w = { on: true, max: 2, window: 32, order: ['drums', 'bass'] };
    const b = makeBackup([['coding-misk-code-widgets', w], ['coding-misk-cw-open', ['general']]]);
    assert(JSON.stringify(b.data['coding-misk-code-widgets']) === JSON.stringify(w) && !('coding-misk-cw-open' in b.data), Object.keys(b.data).join());
    const { values } = mergeBackup(b, () => null);
    assert(JSON.stringify(values['coding-misk-code-widgets']) === JSON.stringify(w), 'imported');
  },
  'stage widgets settings travel in the backup, the open sections of their card do not (widgets-on-stage 6.1)'() {
    const w = { layer: 'strip', strip: 2, mapping: 'own' };
    const b = makeBackup([['coding-misk-stage-widgets', w], ['coding-misk-sw-open', ['general']]]);
    assert(JSON.stringify(b.data['coding-misk-stage-widgets']) === JSON.stringify(w) && !('coding-misk-sw-open' in b.data), Object.keys(b.data).join());
    const { values } = mergeBackup(b, () => ({ layer: 'off', strip: 4 }));
    assert(values['coding-misk-stage-widgets'].strip === 2, 'imported: the strip limit is 2 (spec scenario)');
  },
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
  'configuration trials merge by song id, the backup\'s trial wins (song-own-settings)'() {
    const b = makeBackup([['coding-misk-song-trials', { kellerlicht: { profile: 'switch', live: true } }]]);
    assert(b.data['coding-misk-song-trials'].kellerlicht.profile === 'switch', 'trials in the backup');
    const { values } = mergeBackup(b, k => (k === 'coding-misk-song-trials' ? { kellerlicht: { profile: 'classic', live: true }, other: { profile: 'crescendo', live: true } } : null));
    const tr = values['coding-misk-song-trials'];
    assert(tr.kellerlicht.profile === 'switch' && tr.other.profile === 'crescendo', JSON.stringify(tr));
  },
  'New song presets merge by name, the old artist voice stays out (new-song-panel D6, D9)'() {
    const b = makeBackup([['coding-misk-song-presets', { Notte: { length: 'medium', profile: 'switch' } }], ['coding-misk-artist-voice', { preset: 'present' }], ['coding-misk-new-song', { length: 'short' }]]);
    assert(b.data['coding-misk-song-presets'].Notte.length === 'medium' && !('coding-misk-artist-voice' in b.data) && b.data['coding-misk-new-song'], 'presets in the backup, the old artist voice out');
    const { values } = mergeBackup({ ...b, data: { ...b.data, 'coding-misk-artist-voice': { preset: 'present' } } }, k => (k === 'coding-misk-song-presets' ? { Notte: { length: 'long' }, Alba: { chaos: 0.2 } } : null));
    const pr = values['coding-misk-song-presets'];
    assert(pr.Notte.length === 'medium' && pr.Alba.chaos === 0.2 && !('coding-misk-artist-voice' in values), JSON.stringify(values));
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
  'saved patterns survive export and import, merged by id (pattern-library)'() {
    const three = [{ id: 'p-1', name: 'Bass · A', kind: 'basslines', type: 'bass', sound: 'sawtooth', pattern: { preset: 'rolling' } },
      { id: 'p-2', name: 'Hook · B', kind: 'melodies', type: 'hook', sound: 'square', pattern: { idea: { degrees: '0 2 4' } } },
      { id: 'p-3', name: 'Beat · C', kind: 'grooves', type: 'drums', sound: 'RolandTR808', pattern: { idea: { beat: { grid: 16, bd: '0,8' } } } }];
    const b = makeBackup([['coding-misk-patterns', three]]);
    const clean = mergeBackup(JSON.parse(JSON.stringify(b)), () => null);
    const got = clean.values['coding-misk-patterns'];
    assert(got.map(p => `${p.name}|${p.kind}|${p.sound}`).join() === three.map(p => `${p.name}|${p.kind}|${p.sound}`).join() && clean.counts.patterns === 3, JSON.stringify(got));
    const merged = mergeBackup(b, k => (k === 'coding-misk-patterns' ? [{ id: 'p-2', name: 'old' }, { id: 'p-9', name: 'here' }] : null)).values['coding-misk-patterns'];
    assert(merged.map(p => p.id).join() === 'p-2,p-9,p-1,p-3' && merged[0].name === 'Hook · B', merged.map(p => `${p.id}:${p.name}`).join());
  },
  'use counts of saved patterns merge: the larger count and the newer last use (saved-patterns-list D5)'() {
    const P = (id, extra = {}) => ({ id, name: id, kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' }, ...extra });
    const b = makeBackup([['coding-misk-patterns', [P('p-1', { uses: 1, lastUsed: '2026-10-28T10:00:00.000Z' }), P('p-2', { uses: 6 }), P('p-3')]]]);
    const cur = [P('p-1', { uses: 4, lastUsed: '2026-10-20T10:00:00.000Z' }), P('p-2', { uses: 2, lastUsed: '2026-10-01T10:00:00.000Z' }), P('p-4', { uses: 1 })];
    const got = mergeBackup(b, k => (k === 'coding-misk-patterns' ? cur : null)).values['coding-misk-patterns'];
    const by = Object.fromEntries(got.map(p => [p.id, `${p.uses || 0}|${(p.lastUsed || '').slice(0, 10)}`]));
    assert(by['p-1'] === '4|2026-10-28' && by['p-2'] === '6|2026-10-01' && by['p-3'] === '0|' && by['p-4'] === '1|', JSON.stringify(by));
  },
  'new parts of the Patterns tab merge by id, newest kept, at most 30 (pattern-followups)'() {
    const d = (id, at, name = id) => ({ id, kind: 'riffs', type: 'guitar', name, pattern: { idea: { rhythm: 'x x' } }, at });
    const b = makeBackup([['coding-misk-pattern-drafts', [d('d-2', '2026-10-25T10:02:00Z', 'new copy'), d('d-3', '2026-10-25T10:03:00Z')]]]);
    assert(b.data['coding-misk-pattern-drafts'].length === 2, 'in the backup');
    const cur = [d('d-1', '2026-10-25T10:01:00Z'), d('d-2', '2026-10-25T10:02:00Z', 'old copy')];
    const got = mergeBackup(b, k => (k === 'coding-misk-pattern-drafts' ? cur : null)).values['coding-misk-pattern-drafts'];
    assert(got.map(x => `${x.id}:${x.name}`).join() === 'd-3:d-3,d-2:new copy,d-1:d-1', got.map(x => `${x.id}:${x.name}`).join());
    const many = Array.from({ length: 40 }, (_, i) => d(`d-m${i}`, new Date(Date.UTC(2026, 9, 25, 10, i)).toISOString()));
    const capped = mergeBackup(makeBackup([['coding-misk-pattern-drafts', many]]), () => null).values['coding-misk-pattern-drafts'];
    assert(capped.length === 30 && capped[0].id === 'd-m39' && !capped.some(x => x.id === 'd-m9'), `capped ${capped.length}`);
  },
  'a file that is not a backup is refused'() { assert(mergeBackup({ format: 'x' }, () => null).error, 'accepted'); },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
