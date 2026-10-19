// Checks for the patterns store and catalogue (pattern-library, #72). No browser.
//   npm run check:patterns     run every check; exit 1 when any fails
// The built-in catalogue (every preset once), the styles that use each preset, the user's store (add, rename, remove,
// built-ins protected), Save as pattern, the loop song, Add to song, the preview, the radio's pool and the backup.
import fs from 'node:fs';
import { BASS, ARPS, HOOKS, PADS, GROOVES, GUITAR_PATTERNS } from '../src/music.js';
import { builtinPatterns, stylesUsing, kindOfPreset, patternStore, addPattern, renamePattern, removePattern, listPatterns, savedFromTrack, savedFromGenerated, loopSong, addToSong, previewOf, forRadio, KINDS, KIND_TYPE, MATERIAL_KIND, RIFF_STYLE, BEAT_GAIN, STORE_KEY } from '../src/library/patterns.js';
import { compose } from '../src/material/index.js';
import { compileSong } from '../src/song/compile.js';
import { validateSong } from '../src/song/validate.js';
import { userPool } from '../src/endless/material.js';
import { generateSession } from '../src/endless/director.js';
import { makeBackup, mergeBackup } from '../src/settings/backup.js';
import { loadStyles } from './styles-dir.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const memStore = (init = {}) => { const m = { ...init }; return { get: (k, d) => (k in m ? JSON.parse(JSON.stringify(m[k])) : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); }, m }; };
const all = builtinPatterns(), recipes = loadStyles();
const song = JSON.parse(fs.readFileSync(new URL('../songs/ali-di-cenere.json', import.meta.url), 'utf8'));

const CHECKS = {
  'every preset appears once, with a unique key'() {
    const want = Object.keys(HOOKS).length + Object.keys(BASS).length + Object.keys(ARPS).length + Object.keys(PADS).length + Object.keys(GROOVES).length + Object.keys(GUITAR_PATTERNS).length;
    assert(all.length === want, `${all.length} patterns for ${want} presets`);
    assert(new Set(all.map(p => p.key)).size === all.length, 'keys repeat');
    for (const [type, table] of [['hook', HOOKS], ['arp', ARPS], ['pad', PADS], ['guitar', GUITAR_PATTERNS], ['bass', BASS]]) for (const id of Object.keys(table)) assert(all.filter(p => p.type === type && p.id === id).length === 1, `${type} ${id}`);
    for (const id of Object.keys(GROOVES)) assert(all.filter(p => p.kind === 'grooves' && p.id === id).length === 1, `groove ${id}`);
    for (const k of KINDS) assert(all.some(p => p.kind === k), `no ${k}`);
  },
  'riffs are the bass riffs and the guitar patterns'() {
    const riffs = all.filter(p => p.kind === 'riffs');
    assert(riffs.filter(p => p.type === 'bass').every(p => BASS[p.id][5]) && riffs.filter(p => p.type === 'guitar').length === Object.keys(GUITAR_PATTERNS).length, 'riffs');
    assert(kindOfPreset('bass', 'spirale') === 'riffs' && kindOfPreset('bass', 'rolling') === 'basslines' && kindOfPreset('drums', 'trance') === 'grooves', 'kinds of presets');
  },
  'every recipe preset maps to its style'() {
    const using = stylesUsing(recipes), keys = new Set(all.map(p => p.key));
    let n = 0;
    for (const r of recipes) for (const [type, field] of [['drums', 'grooves'], ['bass', 'presets'], ['arp', 'presets'], ['hook', 'presets'], ['pad', 'presets'], ['guitar', 'patterns']]) {
      for (const name of (r[type] && r[type][field]) || []) {
        const key = `${kindOfPreset(type, name)}/${name}`;
        assert(keys.has(key), `${r.id}: ${type}.${field} "${name}" is not in the catalogue`);
        assert(using[key].includes(r.id), `${key} does not list ${r.id}`);
        n++;
      }
    }
    assert(n > 100, `${n} recipe presets`);
    const rolling = using['basslines/rolling'];
    assert(rolling.includes('trance') && rolling.includes('pure-trance') && !rolling.includes('jazz'), `rolling: ${rolling}`);
  },
  'the store adds, renames and removes; built-in patterns are not in it'() {
    const s = memStore(), st = patternStore(s);
    const a = st.add({ name: 'One', kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' } });
    const b = st.add({ name: 'Two', kind: 'melodies', type: 'hook', pattern: { idea: { degrees: '0 2 4' } } });
    assert(a.id !== b.id && /^p-/.test(a.id) && a.created, 'ids and date');
    st.rename(a.id, '  Renamed  ');
    assert(st.get(a.id).name === 'Renamed' && st.list('melodies').length === 1, 'rename and list by kind');
    st.rename(a.id, '   ');
    assert(st.get(a.id).name === 'Renamed', 'an empty name is refused');
    st.rename('basslines/rolling', 'X'); st.remove('basslines/rolling');
    assert(st.list().length === 2, 'built-in keys change nothing');
    st.remove(a.id);
    assert(st.list().map(p => p.id).join() === b.id && s.m[STORE_KEY].length === 1, 'remove');
    // pure helpers: two saves in the same millisecond, invalid entries left out
    const now = new Date(1739350000000), one = addPattern([], { kind: 'grooves', type: 'drums', pattern: { rows: { bd: 'x...' } } }, now), two = addPattern(one.list, { kind: 'grooves', type: 'drums', pattern: { rows: { bd: 'x...' } } }, now);
    assert(one.item.id !== two.item.id && listPatterns([...two.list, { id: 'bad' }, null]).length === 2, 'same millisecond');
    assert(renamePattern(two.list, one.item.id, 'Kick').find(p => p.id === one.item.id).name === 'Kick' && removePattern(two.list, one.item.id).length === 1, 'pure rename and remove');
  },
  'Save as pattern keeps kind, sound, the section it plays in and the song\'s styles'() {
    const tr = song.tracks.find(t => t.type === 'bass'), key = tr.clips[tr.clips.length - 1].pattern;
    const p = savedFromTrack(song, tr, key, { now: new Date('2026-10-20T10:00:00Z') });
    const clip = tr.clips.find(c => c.pattern === key), sec = song.sections.find(s => s.name === clip.section) || song.sections[clip.section];
    assert(p.type === 'bass' && p.kind === kindOfPreset('bass', p.pattern.preset || '') && same(p.pattern, tr.patterns[key]), JSON.stringify(p.pattern));
    assert(p.sound === tr.settings.wave && p.context.key === (sec.key || 'A') && p.context.bpm === sec.bpm && p.context.chords === sec.chords && p.source === 'compose' && p.created === '2026-10-20', JSON.stringify(p.context));
    assert(same(p.styles, (song.tags || {}).styles || []), `styles ${p.styles}`);
  },
  'a saved generated pattern keeps seed and why'() {
    const g = compose('arp', { seed: 'pattern:arpeggios:3', harmony: { key: 'A', chords: 'epica' }, energy: 0.4, type: 'arp' });
    const p = savedFromGenerated({ pattern: { idea: g.idea }, seed: 'pattern:arpeggios:3', why: g.why }, { name: 'Arp #3', kind: 'arpeggios', type: 'arp', sound: 'supersaw', context: { key: 'D', chords: 'epica', meter: '4/4', bpm: 128, mode: 'minor' } });
    const r = addPattern([], p).item;
    assert(r.source === 'generated' && r.seed === 'pattern:arpeggios:3' && same(r.why, g.why) && r.why.length && r.context.key === 'D', JSON.stringify(r));
  },
  'every built-in pattern loops in a valid song, with and without the beat'() {
    for (const it of all) for (const beat of [false, true]) {
      const s = loopSong(it, { beat });
      const v = validateSong(s);
      assert(!v.errors.length, `${it.key}: ${JSON.stringify(v.errors[0])}`);
      const code = compileSong(s);
      assert(code.includes('setcpm(') && (!beat || /beat · drums/.test(code)), `${it.key} beat ${beat}`);
      assert(s.sections[0].bars === 4 && s.sections[0].bpm >= 120 && s.sections[0].bpm <= 140, `${it.key} tempo ${s.sections[0].bpm}`);
    }
  },
  'loop values: sound, key, progression, tempo, mode; a quiet beat'() {
    const neon = all.find(p => p.key === 'melodies/neon');
    const s = loopSong(neon, { sound: 'gm_epiano1', key: 'D', chords: 'lofi', bpm: 132, mode: 'dorian', beat: true });
    assert(s.tracks[0].settings.wave === 'gm_epiano1' && s.tracks[0].settings.mode === 'dorian' && s.sections[0].key === 'D' && s.sections[0].chords === 'lofi' && s.sections[0].bpm === 132, JSON.stringify(s.sections[0]));
    assert(s.tracks[1].settings.gain === 0.11 && loopSong(all.find(p => p.key === 'basslines/rolling')).tracks[1].settings.gain === BEAT_GAIN, `the beat stays under the pattern: ${s.tracks[1].settings.gain}`);
    const d = all.find(p => p.key === 'grooves/prog78');
    assert(loopSong(d, { beat: false }).sections[0].meter === '7/8' && loopSong(all.find(p => p.key === 'riffs/thrash')).tracks[0].settings.type === 'distorted', 'meters and guitar sound');
    const defaults = Object.fromEntries(KINDS.map(k => [k, loopSong(all.find(p => p.kind === k))]));
    assert(defaults.arpeggios.tracks[0].settings.wave === 'supersaw' && defaults.arpeggios.sections[0].chords === 'epica' && defaults.basslines.tracks.length === 2 && defaults.grooves.tracks.length === 1, 'kind defaults');
  },
  'Add to song: the next letter, the other patterns unchanged; a new track when the song has none'() {
    const s = JSON.parse(JSON.stringify(song)), hook = s.tracks.findIndex(t => t.type === 'hook'), before = JSON.parse(JSON.stringify(s.tracks[hook].patterns));
    const neon = all.find(p => p.key === 'melodies/neon');
    const r = addToSong(s, neon);
    assert(r.track === hook && !r.created && !before[r.key] && same(s.tracks[hook].patterns[r.key], { preset: 'neon' }), JSON.stringify(r));
    for (const k of Object.keys(before)) assert(same(before[k], s.tracks[hook].patterns[k]), `pattern ${k} changed`);
    s.tracks = s.tracks.filter(t => t.type !== 'guitar');
    const g = addToSong(s, all.find(p => p.key === 'riffs/thrash'), { sound: 'metal', base: { gain: 0.5 }, name: 'Guitar', section: s.sections[0].name });
    const tr = s.tracks[g.track];
    assert(g.created && g.key === 'A' && tr.type === 'guitar' && tr.settings.type === 'metal' && tr.settings.gain === 0.5 && tr.clips[0].section === s.sections[0].name, JSON.stringify(tr));
    assert(!validateSong(s).errors.length, JSON.stringify(validateSong(s).errors[0]));
  },
  'previews: a step grid for grooves, notes for every other pattern'() {
    const bb = previewOf('drums', { idea: GROOVES.breakbeat.idea });
    assert(bb.grid && bb.rows.map(r => r[0]).join() === 'bd,sd,hh,oh' && bb.rows[0][1] === 'x.....x...x.....', JSON.stringify(bb.rows));
    for (const it of all) {
      const pv = previewOf(it.type, it.pattern, it.defaults);
      assert(pv.grid ? pv.rows.length > 0 : pv.notes.length > 0 && [1, 2, 4].includes(pv.bars), `${it.key} preview`);
    }
    const neon = previewOf('hook', { preset: 'neon' }, { chords: 'notturna' });
    assert(neon.bars === 4 && neon.hi > neon.lo, 'neon spans four bars and moves');
    assert(previewOf('bass', { preset: 'rolling' }, { chords: 'drone' }).bars === 1, 'one bar when every bar is the same');
  },
  'previews of generated parts, every kind'() {
    for (const kind of KINDS) for (let n = 1; n <= 15; n++) {
      const type = kind === 'riffs' ? 'bass' : KIND_TYPE[kind];
      const g = compose(MATERIAL_KIND[kind], { seed: `pattern:${kind}:${n}`, style: kind === 'riffs' ? RIFF_STYLE : {}, harmony: { key: 'A', chords: 'notturna', mode: 'minor' }, energy: (n % 5) / 4, type });
      const pv = previewOf(type, { idea: g.idea }, { chords: 'notturna' });
      assert(pv.grid ? pv.rows.length > 0 : pv.notes.length > 0, `${kind} #${n}: ${JSON.stringify(g.idea)}`);
      assert(!validateSong(loopSong({ kind, type, pattern: { idea: g.idea } }, {})).errors.length, `${kind} #${n} loop`);
    }
  },
  'the radio draws a saved pattern only where it fits'() {
    const list = [{ id: 'p-1', name: 'x', kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' }, styles: ['trance'], context: { key: 'A', mode: 'minor' } },
      { id: 'p-2', name: 'y', kind: 'melodies', type: 'hook', pattern: { idea: { degrees: '0 2 4' } }, styles: [], context: { key: 'A', mode: 'minor' } }];
    const pool = forRadio(list);
    assert(same(pool[1].styles, ['any']) && pool[1].idea.degrees === '0 2 4', 'no style: any');
    assert(userPool(pool, { type: 'bass', styles: ['trance'] }).length === 1 && !userPool(pool, { type: 'bass', styles: ['jazz'] }).length, 'a pattern of another style is never drawn');
    assert(userPool(pool, { type: 'hook', styles: ['jazz'] }).length === 1 && !userPool(pool, { type: 'arp', styles: ['trance'] }).length, 'any style, same type only');
    // a riff saved with a style tag plays in songs of that style, never in another
    const riff = { id: 'p-9', name: 'r', kind: 'riffs', type: 'guitar', pattern: { idea: { rhythm: 'x ~ x x ~ x ~ ~ x ~ x x ~ x ~ ~', add: '0 0 1 0 3 0 0 0 0 0 1 0 5 0 0 0', per: 'slot' } }, styles: ['melodic-metal'], context: { key: 'E', mode: 'minor' } };
    const has = o => generateSession(recipes, { minutes: 30, seed: 'saved', complexity: 0.6, userPatterns: forRadio([riff]), ...o }).songs.filter(sg => sg.tracks.some(t => Object.values(t.patterns).some(p => same(p, riff.pattern)))).length;
    assert(has({ styles: ['melodic-metal'] }) > 0 && has({ styles: ['ambient'] }) === 0, 'drawn in its style only');
  },
  'patterns survive a backup'() {
    const s = memStore(), st = patternStore(s);
    for (const k of ['basslines', 'melodies', 'grooves']) st.add({ name: k, kind: k, type: KIND_TYPE[k], sound: 'x', pattern: { preset: 'p' } });
    const b = makeBackup(Object.entries(s.m)), back = mergeBackup(JSON.parse(JSON.stringify(b)), () => null);
    const again = patternStore(memStore(back.values));
    assert(again.list().map(p => `${p.name}|${p.kind}|${p.sound}`).join() === 'basslines|basslines|x,melodies|melodies|x,grooves|grooves|x' && back.counts.patterns === 3, JSON.stringify(again.list()));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
