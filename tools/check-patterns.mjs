// Checks for the patterns store and catalogue (pattern-library, #72). No browser.
//   npm run check:patterns     run every check; exit 1 when any fails
// The built-in catalogue (every preset once), the styles that use each preset, the user's store (add, rename, remove,
// built-ins protected), Save as pattern, the loop song, Add to song, the preview, the radio's pool and the backup; the
// follow-ups (pattern-followups): editable styles, Save as pattern's fallback styles, new parts kept, capped and
// discarded, their backup, and guitar riffs from New; the radio console's saved patterns among many (saved-patterns-list):
// use counts, their backup, search, filters, sorts and groups.
import fs from 'node:fs';
import { BASS, ARPS, HOOKS, PADS, GROOVES, GUITAR_PATTERNS } from '../src/music.js';
import { builtinPatterns, stylesUsing, kindOfPreset, patternStore, addPattern, renamePattern, removePattern, listPatterns, savedFromTrack, savedFromGenerated, loopSong, addToSong, previewOf, forRadio, KINDS, KIND_TYPE, MATERIAL_KIND, RIFF_STYLE, BEAT_GAIN, STORE_KEY, cleanStyles, everyStyle, fallbackStyles, composeNewPart } from '../src/library/patterns.js';
import { draftStore, capDrafts, mergeDrafts, DRAFTS_KEY, DRAFT_CAP } from '../src/library/pattern-drafts.js';
import { compose } from '../src/material/index.js';
import { compileSong } from '../src/song/compile.js';
import { validateSong } from '../src/song/validate.js';
import { userPool } from '../src/endless/material.js';
import { fitsAir, unfitReason } from '../src/endless/steering.js';
import { createSession } from '../src/endless/director.js';
import { generateSession } from '../src/endless/director.js';
import { makeBackup, mergeBackup } from '../src/settings/backup.js';
import { loadStyles } from './styles-dir.mjs';
import { savedView, cleanView, fitsSong, daysAgo, SAVED_TOOLBAR, SAVED_GROUP, VIEW_DEFAULT } from '../src/radio/saved-view.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const memStore = (init = {}) => { const m = { ...init }; return { get: (k, d) => (k in m ? JSON.parse(JSON.stringify(m[k])) : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); }, m }; };
const all = builtinPatterns(), recipes = loadStyles();
const song = JSON.parse(fs.readFileSync(new URL('../songs/ali-di-cenere.json', import.meta.url), 'utf8'));
const artistsDir = new URL('../artists/', import.meta.url);
const artists = fs.readdirSync(artistsDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(new URL(f, artistsDir), 'utf8')));

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
  'styles of a saved pattern: add and remove, "any" only alone, the radio follows (pattern-followups D1)'() {
    assert(same(cleanStyles(['any', 'trance', 'trance', ' jazz ']), ['trance', 'jazz']) && same(cleanStyles([]), []) && same(cleanStyles(['any']), ['any']), 'clean styles');
    assert(everyStyle([]) && everyStyle(['any']) && !everyStyle(['trance']), 'every style');
    const s = memStore(), st = patternStore(s);
    const riff = st.add({ name: 'Riff', kind: 'riffs', type: 'guitar', pattern: { idea: { rhythm: 'x ~ x x ~ x ~ ~ x ~ x x ~ x ~ ~', add: '0 0 1 0 3 0 0 0 0 0 1 0 5 0 0 0', per: 'slot' } }, styles: [], context: { key: 'E', mode: 'minor' } });
    assert(same(forRadio(st.list())[0].styles, ['any']), 'no style: every style');
    st.setStyles(riff.id, ['any', 'drum-and-bass']);
    assert(same(st.get(riff.id).styles, ['drum-and-bass']), `added: ${st.get(riff.id).styles}`);
    const pool = forRadio(st.list());
    assert(userPool(pool, { type: 'guitar', styles: ['drum-and-bass'] }).length === 1 && !userPool(pool, { type: 'guitar', styles: ['ambient'] }).length, 'in the drum and bass pool only');
    st.setStyles(riff.id, ['drum-and-bass', 'melodic-metal']);
    st.setStyles(riff.id, ['melodic-metal']);
    assert(same(st.get(riff.id).styles, ['melodic-metal']) && userPool(forRadio(st.list()), { type: 'guitar', styles: ['melodic-metal'] }).length === 1, 'removed one');
    st.setStyles(riff.id, []);
    assert(same(forRadio(st.list())[0].styles, ['any']) && st.get(riff.id).name === 'Riff', 'all removed: every style again, the rest unchanged');
    st.setStyles('riffs/thrash', ['jazz']);
    assert(st.list().length === 1, 'built-in keys change nothing');
  },
  'Save as pattern links the song\'s styles, else its artist\'s or the styles its style line names (pattern-followups D1)'() {
    const tr = song.tracks.find(t => t.type === 'bass'), key = tr.clips[0].pattern;
    const bare = { ...song, tags: {} }, ctx = { recipes, artists };
    const owl = artists.find(a => a.id === 'night-owl'), top = Object.entries(owl.styles).sort((a, b) => b[1] - a[1])[0][0];
    assert(same(savedFromTrack(song, tr, key, { fallback: ['jazz'] }).styles, cleanStyles(song.tags.styles)), 'tags win over the fallback');
    assert(same(fallbackStyles({ ...bare, style: { en: `${owl.name} · Endless · Berlin techno`, it: `${owl.name} · Endless · Techno berlinese` } }, ctx), [top]), 'new song from an artist: the artist\'s favourite style');
    assert(same(fallbackStyles({ ...bare, artist: 'night-owl' }, ctx), [top]), 'an artist id');
    const two = fallbackStyles({ ...bare, style: { en: 'Endless · Berlin techno + Jazz · A · 124 BPM · arc', it: 'Endless · Techno berlinese + Jazz · A · 124 BPM · arc' } }, ctx);
    assert(same(two, ['berlin-techno', 'jazz']), `the style line: ${two}`);
    assert(!fallbackStyles({ ...bare, style: { en: 'Hand written', it: 'Scritto a mano' } }, ctx).length, 'nothing known: no style (every style)');
    const p = savedFromTrack(bare, tr, key, { fallback: two });
    assert(same(p.styles, ['berlin-techno', 'jazz']) && same(savedFromTrack(bare, tr, key).styles, []), `fallback linked: ${p.styles}`);
  },
  'new parts are kept across reloads, capped at 30 and discarded (pattern-followups D2)'() {
    const s = memStore(), st = draftStore(s), t0 = Date.parse('2026-10-25T10:00:00Z');
    const part = n => ({ kind: 'basslines', type: 'bass', name: `Basslines #${n}`, pattern: { idea: { rhythm: 'x ~ x ~' } }, sound: 'sawtooth', context: { key: 'A', chords: 'notturna', meter: '4/4', bpm: 128, mode: 'minor' }, seed: `pattern:basslines:${n}`, why: ['x'], styles: [] });
    const a = st.add(part(1), new Date(t0)), b = st.add(part(2), new Date(t0 + 1000));
    assert(a.item.id !== b.item.id && !a.dropped && !b.dropped, 'two drafts');
    const again = draftStore(memStore(s.m));
    assert(again.list().map(d => d.name).join() === 'Basslines #2,Basslines #1' && s.m[DRAFTS_KEY].length === 2, 'kept after a reload, newest first');
    let dropped = 0;
    for (let n = 3; n <= 31; n++) dropped += st.add(part(n), new Date(t0 + n * 1000)).dropped;
    assert(st.list().length === DRAFT_CAP && DRAFT_CAP === 30 && dropped === 1 && !st.list().some(d => d.name === 'Basslines #1') && st.list()[0].name === 'Basslines #31', `capped: ${st.list().length}, dropped ${dropped}`);
    const same2 = st.add(part(32), new Date(t0 + 31 * 1000)), same3 = st.add(part(33), new Date(t0 + 31 * 1000));
    assert(same2.item.id !== same3.item.id, 'same millisecond');
    st.update(same3.item.id, { styles: ['trance'] });
    assert(same(st.get(same3.item.id).styles, ['trance']), 'styles of a new part');
    st.remove(same3.item.id);
    assert(!st.get(same3.item.id) && st.list().length === 29, 'Discard');
    st.clear();
    assert(!st.list().length && same(s.m[DRAFTS_KEY], []), 'Discard all');
    assert(capDrafts([{ id: 'x' }, null, { id: 'd-1', kind: 'melodies', pattern: {} }]).list.length === 1, 'invalid drafts left out');
  },
  'new parts survive a backup, merged by id and capped (pattern-followups D2)'() {
    const s = memStore(), st = draftStore(s), t0 = Date.parse('2026-10-25T10:00:00Z');
    for (let n = 1; n <= 3; n++) st.add({ kind: 'riffs', type: 'guitar', name: `Guitar riff #${n}`, pattern: { idea: { rhythm: 'x x' } }, sound: 'distorted', styles: n === 1 ? ['trance'] : [] }, new Date(t0 + n * 1000));
    const b = makeBackup(Object.entries(s.m));
    assert(Array.isArray(b.data[DRAFTS_KEY]) && b.data[DRAFTS_KEY].length === 3, 'in the backup');
    const back = mergeBackup(JSON.parse(JSON.stringify(b)), () => null);
    const restored = draftStore(memStore(back.values));
    assert(restored.list().map(d => `${d.name}|${d.sound}|${d.styles.join('+')}`).join() === 'Guitar riff #3|distorted|,Guitar riff #2|distorted|,Guitar riff #1|distorted|trance' && back.counts.patterns === 3, JSON.stringify(restored.list().map(d => d.name)));
    // merged with the drafts here: by id, the backup's copy wins, at most 30, newest kept
    const here = Array.from({ length: 29 }, (_, i) => ({ id: `d-h${i}`, kind: 'melodies', pattern: { idea: {} }, name: `here ${i}`, at: new Date(t0 - (i + 1) * 60000).toISOString() }));
    const firstId = b.data[DRAFTS_KEY][2].id;
    here.push({ ...b.data[DRAFTS_KEY][2], name: 'old copy' });
    const merged = mergeBackup(b, k => (k === DRAFTS_KEY ? here : null)).values[DRAFTS_KEY];
    assert(merged.length === 30 && merged.filter(d => d.id === firstId).length === 1 && merged.find(d => d.id === firstId).name === 'Guitar riff #1' && !merged.some(d => d.name === 'here 28'), `merged ${merged.length}`);
    assert(mergeDrafts(null, null).length === 0, 'nothing on either side');
  },
  'New on riffs: a guitar riff from the guitar generator every time, or a bass riff (pattern-followups D3)'() {
    const H = { key: 'A', chords: 'drone', mode: 'minor' };
    for (let n = 1; n <= 20; n++) {
      const e = (n % 5) / 4, g = composeNewPart({ kind: 'riffs', n, harmony: H, energy: e });
      assert(g.type === 'guitar' && g.sound === 'distorted' && g.seed === `pattern:riffs:guitar:${n}` && g.why.includes('power chord riff') && g.pattern.idea.per === 'slot', `guitar riff #${n} at ${e}: ${g.why}`);
      const loop = loopSong({ kind: 'riffs', type: g.type, pattern: g.pattern, sound: g.sound }, {});
      assert(!validateSong(loop).errors.length && loop.tracks[0].settings.type === 'distorted' && /guitar/.test(compileSong(loop)), `guitar riff #${n} loop`);
      assert(same(composeNewPart({ kind: 'riffs', n, harmony: H, energy: e }), g), `guitar riff #${n} repeatable`);
      // a bass riff: the bassline with the riff rules, as New wrote riffs before
      const b = composeNewPart({ kind: 'riffs', n, riffAs: 'bass', harmony: H, energy: e });
      const old = compose('bass', { seed: `pattern:riffs:${n}`, style: RIFF_STYLE, harmony: { key: 'A', chords: 'drone', mode: 'minor' }, meter: '4/4', energy: e, type: 'bass' });
      assert(b.type === 'bass' && b.seed === `pattern:riffs:${n}` && same(b.pattern.idea, old.idea), `bass riff #${n} as before`);
    }
    const arp = composeNewPart({ kind: 'arpeggios', n: 3, harmony: { key: 'A', chords: 'epica' }, energy: 0.4 });
    assert(arp.type === 'arp' && arp.pattern.speed === '16' && arp.seed === 'pattern:arpeggios:3', 'other kinds as before');
  },
  'the radio console reads saved patterns with name, sound and meter, and fits them by type and meter (radio-arrangement D9)'() {
    const st = patternStore(memStore());
    const tr = song.tracks.find(t => t.type === 'bass');
    const bass = st.add(savedFromTrack(song, tr, Object.keys(tr.patterns)[0], { name: 'Basso mio' }));
    const odd = st.add({ ...savedFromTrack(song, tr, Object.keys(tr.patterns)[0], { name: 'Dispari' }), context: { key: 'A', meter: '7/8', bpm: 120, mode: 'minor' } });
    const list = forRadio(st.list()), b = list.find(x => x.id === bass.id);
    assert(b.name === 'Basso mio' && b.kind && b.sound === tr.settings.wave && b.settings && b.context.meter, `forRadio fields ${JSON.stringify(Object.keys(b))}`);
    // a song in 4/4 of a style with a bass; no style tag needed (the listener picks it by hand)
    const g = createSession(recipes, 'fits-air').next({ styles: ['berlin-techno'] });
    const tagged = { ...b, styles: ['jazz'] };
    assert(g.plan.meter === '4/4' && fitsAir(tagged, g.plan, g.song), 'a 4/4 bassline fits a 4/4 berlin-techno song whatever its style tags');
    assert(!fitsAir(list.find(x => x.id === odd.id), g.plan, g.song) && unfitReason(list.find(x => x.id === odd.id), g.plan) === 'meter', 'a 7/8 pattern does not fit a 4/4 song');
    const guitar = { ...b, type: 'guitar' };
    assert(!fitsAir(guitar, g.plan, g.song) && unfitReason(guitar, g.plan) === 'type', 'a guitar pattern does not fit a style without guitars');
  },
  'use counts: Add as a new track, Replace and Add to song count, the director reads none (saved-patterns-list D5)'() {
    const s = memStore(), st = patternStore(s);
    const a = st.add({ name: 'Basso rotto 5', kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' } }), b = st.add({ name: 'Basso teso 23', kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' } });
    assert(!('uses' in st.get(a.id)) && forRadio(st.list(), { meta: true })[0].uses === 0 && forRadio(st.list(), { meta: true })[0].lastUsed === null, 'an older pattern reads as never used');
    for (let i = 0; i < 4; i++) st.markUsed(a.id, new Date(Date.UTC(2026, 9, 20 + i)));
    st.markUsed(b.id, new Date(Date.UTC(2026, 9, 28)));
    assert(st.get(a.id).uses === 4 && st.get(a.id).lastUsed.startsWith('2026-10-23') && st.get(b.id).uses === 1, JSON.stringify(st.list()));
    const plain = forRadio(st.list());
    assert(plain.every(x => !('uses' in x) && !('lastUsed' in x) && !('created' in x)), 'the director pool carries no counters, so recipes stay as before');
    const used = savedView(forRadio(st.list(), { meta: true }).concat(Array.from({ length: 8 }, (_, i) => ({ id: `f${i}`, name: `F${i}`, type: 'hook', kind: 'melodies', pattern: { preset: 'x' }, styles: ['any'], context: {} }))), { sort: 'used' }, {});
    assert(used.items[0].name === 'Basso rotto 5' && used.items[1].name === 'Basso teso 23', used.items.map(x => x.name).join());
  },
  'use counts survive a backup: the larger count and the newer use win (saved-patterns-list D5)'() {
    const mine = [{ id: 'p-1', name: 'A', kind: 'basslines', type: 'bass', pattern: { preset: 'p' }, uses: 2, lastUsed: '2026-10-20T10:00:00.000Z' }, { id: 'p-2', name: 'B', kind: 'basslines', type: 'bass', pattern: { preset: 'p' }, uses: 5, lastUsed: '2026-10-01T10:00:00.000Z' }];
    const theirs = [{ id: 'p-1', name: 'A2', kind: 'basslines', type: 'bass', pattern: { preset: 'p' }, uses: 3, lastUsed: '2026-10-10T10:00:00.000Z' }, { id: 'p-2', name: 'B', kind: 'basslines', type: 'bass', pattern: { preset: 'p' } }];
    const got = mergeBackup(makeBackup([['coding-misk-patterns', theirs]]), k => (k === 'coding-misk-patterns' ? mine : null)).values['coding-misk-patterns'];
    const a = got.find(x => x.id === 'p-1'), b = got.find(x => x.id === 'p-2');
    assert(a.name === 'A2' && a.uses === 3 && a.lastUsed.startsWith('2026-10-20') && b.uses === 5 && b.lastUsed.startsWith('2026-10-01'), JSON.stringify(got));
  },
  'saved patterns among many: threshold, groups, search, fit, style and the five sorts (saved-patterns-list D2, D3)'() {
    const P = (id, name, type, extra = {}) => ({ id, name, type, kind: type === 'hook' ? 'melodies' : type === 'bass' ? 'basslines' : type === 'drums' ? 'grooves' : 'arpeggios', pattern: type === 'drums' ? { rows: { bd: 'x...', hh: '..x.' } } : { preset: 'x' }, styles: ['any'], context: { bpm: 124 }, ...extra });
    const few = Array.from({ length: SAVED_TOOLBAR }, (_, i) => P(`p${i}`, `Z${i}`, 'bass', { styles: ['jazz'] }));
    const v8 = savedView(few, { q: 'nothing', fit: true, sort: 'name' }, { styles: ['berlin-techno'], bpm: 124 });
    assert(!v8.toolbar && !v8.grouped && v8.shown === 8 && v8.items.map(x => x.id).join() === few.map(x => x.id).join(), '8 fitting patterns: as before, no toolbar, every pattern in the saved order');
    const list = [
      P('a', 'Melodia notturno 1', 'hook', { created: '2026-10-01' }), P('b', 'Basso rotto 5', 'bass', { created: '2026-10-02', styles: ['acid-house'], context: { bpm: 90 } }),
      P('c', 'Melodia scura 2', 'hook', { created: '2026-10-03', uses: 2, lastUsed: '2026-10-27T09:00:00.000Z' }), P('d', 'Basso acido 17', 'bass', { created: '2026-10-04', styles: ['berlin-techno'], context: { bpm: 70 } }),
      P('e', 'Groove pieno 8', 'drums', { created: '2026-10-05' }), P('f', 'Melodia teso 3', 'hook', { created: '2026-10-06' }), P('g', 'Melodia lenta 4', 'hook', { created: '2026-10-07' }),
      P('h', 'Melodia 10', 'hook', { created: '2026-10-08' }), P('i', 'Arpa', 'arp', { created: '2026-10-09', context: { bpm: 130 } }), P('j', 'Città', 'bass', { created: '2026-10-10', styles: ['berlin-techno'] }),
    ];
    const song = { styles: ['berlin-techno'], bpm: 124 }, names = { inst: p => ({ hook: 'melodia', bass: 'basso', beat: 'ritmica', arp: 'arpeggio' }[p] || p), style: id => id };
    const g = savedView(list, VIEW_DEFAULT, song, names);
    assert(g.toolbar && g.grouped && g.groups.map(x => `${x.inst}:${x.n}`).join() === 'beat:1,bass:3,arp:1,hook:5', g.groups.map(x => `${x.inst}:${x.n}`).join());
    const mel = g.groups.find(x => x.inst === 'hook');
    assert(mel.items.length === SAVED_GROUP && mel.items.map(x => x.id).join() === 'a,c,f,g', 'groups list the first 4 in the saved order, as the Patterns tab');
    const shown = savedView(list, { inst: 'hook' }, song, names);
    assert(!shown.grouped && shown.shown === 5 && shown.filtered, '"Show all" picks the instrument chip: one list of 5');
    assert(savedView(list, { q: 'citta' }, song, names).items.map(x => x.id).join() === 'j', 'the search folds accents');
    assert(savedView(list, { q: 'MELODIA scur' }, song, names).items.map(x => x.id).join() === 'c', 'every word must match, case ignored');
    assert(savedView(list, { q: 'basso acid' }, song, names).items.map(x => x.id).join() === 'b,d', 'the search reads instrument names and style ids');
    const fit = savedView(list, { fit: true }, song, names).items.map(x => x.id);
    assert(!fit.includes('b') && !fit.includes('d') && fit.includes('j') && fit.includes('a'), `fit: the song's style or none, tempo within 1.5 times (${fit})`);
    assert(fitsSong(P('t', 't', 'bass', { context: {} }), song) && !fitsSong(P('t', 't', 'bass', { context: { bpm: 200 } }), song), 'no tempo saved fits; 200 against 124 does not');
    assert(savedView(list, { style: 'berlin-techno' }, song, names).items.map(x => x.id).join() === 'd,j', 'the style menu keeps the patterns tagged with it');
    assert(savedView(list, { sort: 'recent' }, song, names).items.map(x => x.id).slice(0, 3).join() === 'c,j,i', 'Recent: the later of the last use and the save date');
    const byName = savedView(list, { sort: 'name' }, song, names).items.map(x => x.id).join();
    assert(byName === 'i,d,b,j,e,h,g,a,c,f', `Name: folded, accents ignored (${byName})`);
    const nums = savedView([...Array.from({ length: 8 }, (_, i) => P(`n${i}`, `Pad ${i + 3}`, 'arp')), P('n10', 'Pad 10', 'arp')], { sort: 'name' }, song, names).items.map(x => x.name);
    assert(nums.indexOf('Pad 10') > nums.indexOf('Pad 9'), 'Name: numbers in order');
    assert(savedView(list, { sort: 'tempo' }, song, names).items.slice(-2).map(x => x.id).join() === 'b,d', 'Closest tempo: the farthest last');
    assert(!savedView(list, { sort: 'used' }, song, names).grouped, 'another sort: one list');
    assert(savedView(list, { closed: ['hook'] }, song, names).groups.find(x => x.inst === 'hook').open === false, 'a collapsed group stays collapsed');
    const none = savedView(list, { q: 'zzz' }, song, names);
    assert(none.shown === 0 && none.filtered && none.total === 10, 'no match');
    assert(same(cleanView({ sort: 'bogus', inst: 7, closed: ['hook', 'hook', 3] }), { inst: 'all', fit: false, style: 'all', sort: 'saved', closed: ['hook'] }), 'a stored view read back safely');
    assert(daysAgo('2026-10-24T23:00:00.000Z', new Date(2026, 9, 29, 12)) >= 4 && daysAgo(null) === null, 'days ago');
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
