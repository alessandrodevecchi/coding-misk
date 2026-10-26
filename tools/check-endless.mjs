// Checks for the endless director and style recipes (docs/ENDLESS.md, docs/STYLES.md).
//   npm run check:endless      run every check; exit 1 when any fails
// Each check is a named function that throws on failure. New checks go in CHECKS.
import { stream, makeRng, STREAMS, hashString } from '../src/endless/random.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { validateRecipe, withDefaults, PART_NAMES, TOP_FIELDS, INSTRUMENTS, SHAPES, RECIPE_DEFAULTS, STYLE_ALIASES, recipeOrder, stylePush } from '../src/endless/recipe.js';
import { mixParts, stylesOf } from '../src/endless/mix.js';
import { loadStyles } from './styles-dir.mjs';
import { songEntry, cleanView } from '../src/library/song-filter.js';
import { generateSession, createSession, leadEntry, stylesNear } from '../src/endless/director.js';
import { validateArtist, ARTIST_FIELDS, PALETTES, MOVE_KINDS, VOICE_CHARACTER_NAMES } from '../src/endless/artist.js';
import { QUIRKS } from '../src/endless/quirks.js';
import { portraitPixels } from '../src/endless/portrait.js';
import { loadArtists } from './artists-dir.mjs';
import { windowSong } from '../src/endless/join.js';
import { planTransition, layout, overlapOf, extraOf, TRANSITION_KINDS, MAX_RAMP } from '../src/endless/transitions.js';
import { KEYS } from '../src/music.js';
import { steerSong, applyBar, COMMANDS, canApply, whyNot, songCurves, extendIndex, extendSeconds, VARY_TYPES, varyTracks, densityMax, INSTRUMENTS as ARR_PARTS, RECOMMENDED, TRACK_CAP, instrumentOf, lockedIds, moreWarning, riserTarget, partHas, fitsAir } from '../src/endless/steering.js';
import { expandIdea } from '../src/song/ideas.js';
import { compileSong } from '../src/song/compile.js';
import { validateSong } from '../src/song/validate.js';
import { stateAt, buildSteps } from '../src/song/build.js';
import { playing, energyOf, curveParts } from '../src/endless/energy.js';
import { chordTonesOnly, degreesOnly } from '../src/endless/mutate.js';
import { partsKey } from '../src/endless/mix.js';
import { allPhrases } from '../src/endless/phrases.js';
import { GROOVES, BASS, ARPS, HOOKS } from '../src/music.js';

import { PROGS } from '../src/music.js';
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const take = (s, n) => Array.from({ length: n }, () => s.next());

const STYLES = loadStyles().map(withDefaults);
const byId = Object.fromEntries(STYLES.map(r => [r.id, r]));
const STARTING = ['berlin-techno', 'trance', 'synthwave', 'lo-fi', 'drum-and-bass', 'ambient', 'phonk', 'industrial', 'jazz', 'country', 'classic-rock', 'melodic-metal'];
// a session of song parts from the selected styles
const mixSession = (ids, chaos, songs, seed = 'mix') => {
  const rng = stream(seed, 'plan');
  return Array.from({ length: songs }, (_, i) => mixParts(ids.map(id => byId[id]), chaos, i, rng));
};

// sessions are cached: several checks look at the same one
const cache = new Map();
const session = (opts) => { const k = JSON.stringify(opts); if (!cache.has(k)) cache.set(k, generateSession(loadStyles(), opts)); return cache.get(k); };
const every = fn => { for (const id of STARTING) fn(session({ styles: [id], minutes: 10, seed: `check-${id}` }), id); };
const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const listOf = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
// track ids a step moves
const stepTracks = s => [...listOf(s.add), ...listOf(s.remove), ...['set', 'pattern', 'rack', 'unrack'].filter(k => s[k]).map(k => s[k].track)];

// seed fixtures: an intended change to the director updates them (npm run check:endless -- --write-fixtures)
const FIXTURES_FILE = new URL('../tests/snapshots/endless.json', import.meta.url);
const FIXTURES = [
  { seed: 'aurora', styles: ['berlin-techno'] },
  { seed: 'aurora', styles: ['synthwave', 'jazz', 'country'], chaos: 1 },
  { seed: 'kellerlicht', styles: ['trance', 'phonk'], energy: 0.9, complexity: 0.9, minutes: 20 },
  { seed: 'quiet', styles: ['ambient', 'lo-fi'], energy: 0.2, complexity: 0.1, minutes: 12 },
];
const sessionHash = r => hashString(JSON.stringify(r)).toString(16).padStart(8, '0');
// songs of director version 2 at complexity 0 (material-generator): complexity 0 must keep giving them
const PLAIN_V2 = [
  { seed: 'plain-a', styles: ['berlin-techno'], complexity: 0, songs: '2785ea56' },
  { seed: 'plain-b', styles: ['synthwave', 'jazz', 'country'], chaos: 1, complexity: 0, songs: '33215bd9' },
  { seed: 'plain-c', styles: ['trance', 'phonk', 'melodic-metal', 'drum-and-bass'], chaos: 0.6, complexity: 0, energy: 0.9, minutes: 20, songs: '13b9b2d5' },
  { seed: 'plain-d', styles: ['ambient', 'lo-fi', 'industrial', 'classic-rock', 'acid', 'house'], chaos: 0.8, complexity: 0, energy: 0.3, minutes: 20, songs: 'dc778f05' },
];
// steered songs at complexity 0 and with the source "patterns" (radio-variation): Add and More complex keep today's presets.
// Hashes recorded before radio-variation; talk 0 (a listener's Add used to fail when the voice commented it).
const PLAIN_STEER = [
  { seed: 'plain-steer-a', styles: ['berlin-techno'], complexity: 0, talk: 0, songs: 'c4fe1f68' },
  { seed: 'plain-steer-b', styles: ['ambient', 'jazz'], chaos: 1, complexity: 0, talk: 0, songs: '358eb686' },
  { seed: 'plain-steer-c', styles: ['synthwave', 'drum-and-bass'], chaos: 0.5, complexity: 0.8, material: 'patterns', talk: 0, songs: 'a78978f7' },
  { seed: 'plain-steer-d', styles: ['trance', 'lo-fi', 'phonk'], chaos: 0.8, complexity: 0.5, material: 'patterns', talk: 0, songs: 'fb29ad65' },
];
// the steered songs of a PLAIN_STEER case: three songs, each with an Add of every type and a run of More complex
function plainSteer({ seed, songs: _, ...o }) {
  const ses = createSession(loadStyles(), seed), out = [];
  for (let i = 0; i < 3; i++) {
    const g = ses.next(o), go = commands => steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands, seed, n: i }).song;
    const all = ['drums', 'bass', 'lead', 'pad', 'texture'].map(type => go([{ kind: 'add', type, at: applyBar('add', 20, g.plan) }]));
    all.push(go([{ kind: 'more-complex', at: applyBar('more-complex', 10, g.plan) }, { kind: 'more-complex', at: applyBar('more-complex', 10, g.plan) }, { kind: 'remove', type: 'drums', at: applyBar('remove', 30, g.plan) }, { kind: 'add', type: 'pad', at: applyBar('add', 40, g.plan) }]));
    out.push(all);
  }
  return out;
}
// Varies of every part over sessions of several styles (radio-variation): { g, type, at, ids, r } for each vary that
// applies, until `count`; n moves the command's seed, so one song gives several varies. kind: vary or swap; extra:
// more session options (material source, user patterns)
function varies(count, kind = 'vary', extra = {}) {
  const out = [];
  for (const [k, id] of ['synthwave', 'trance', 'berlin-techno', 'jazz', 'phonk', 'lo-fi', 'melodic-metal', 'drum-and-bass'].entries()) {
    const ses = createSession(STYLES, `vary-${id}`);
    for (let s = 0; s < 6 && out.length < count; s++) {
      const g = ses.next({ styles: [id], complexity: [0.2, 0.5, 0.9][s % 3], ...extra });
      for (const type of VARY_TYPES) for (const now of [20, 44]) {
        const at = applyBar(kind, now, g.plan);
        if (whyNot({ kind, type }, g.song, g.plan, now, 0, g.opts)) continue;
        const ids = varyTracks(playing(stateAt(g.song, at).song), type).map(t => t.id);
        for (let n = 0; n < 3 && out.length < count; n++) out.push({ g, type, at, ids, r: steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind, type, at }], seed: `${kind}-${k}`, n: 10 * s + n }) });
      }
    }
  }
  return out;
}
// a composed part stays in key: hook degrees are whole numbers, bass moves only to chord tones, arp indices are chord notes
const whole = text => String(text).replace(/[!%*@]\d+/g, '').replace(/[\s~[\]<>{}]/g, ' ').trim().split(/\s+/).filter(Boolean).every(x => /^-?\d+$/.test(x));
function inKey(type, idea) {
  if (type === 'hook') return idea.degrees !== undefined && whole(idea.degrees) && (idea.add === undefined || whole(idea.add)) && !idea.random;
  if (type === 'bass') return idea.from !== undefined || idea.add === undefined || (whole(idea.add) && String(idea.add).replace(/[!%*@]\d+/g, '').match(/-?\d+/g).every(x => ['0', '7', '12', '-5'].includes(x)));
  if (type === 'arp') return idea.random ? idea.random.max <= 4 && Number.isInteger(idea.random.seed) : String(idea.index).replace(/[!%*@]\d+/g, '').match(/-?\d+/g).every(x => /^[0-3]$/.test(x));
  return true;
}

// ---------- radio-arrangement: songs to steer with + and − per instrument ----------
const ALL_STYLES = STYLES.map(r => r.id);
// n songs over every style (a style per song in turn), default options, each with its plan
function arrSongs(n, tag = 'arr', extra = {}) {
  const out = [];
  for (let i = 0; out.length < n; i++) {
    const id = ALL_STYLES[i % ALL_STYLES.length], ses = createSession(STYLES, `${tag}-${i}`);
    out.push({ ...ses.next({ styles: [id], ...extra }), seed: `${tag}-${i}`, style: id });
  }
  return out;
}
// the closing run of outros of a plan: its first double phrase
const outroFrom = plan => { let d = plan.plan.length; while (d > 0 && plan.plan[d - 1].role === 'outro') d--; return d; };
const onAt = (sg, bar) => playing(stateAt(sg, bar).song);
const steerArr = (g, commands, n = 0) => steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands, seed: g.seed, n });
// "+" on instruments in turn on one boundary until the song plays 12 tracks
// (one command at a time on the song so far, then the whole list once: the song a replay gives)
function stack12(g, at) {
  const cmds = [], parts = ARR_PARTS.filter(p => partHas(g.plan.R, p));
  let r = { song: g.song, plan: g.plan, opts: g.opts };
  for (let j = 0; j < 40 && onAt(r.song, at).filter(t => t.type !== 'riser').length < TRACK_CAP; j++) {
    const part = parts[j % parts.length];
    if (whyNot({ kind: 'more', part }, r.song, r.plan, at - 1)) break;
    cmds.push({ kind: 'more', part, at });
    r = steerSong({ song: r.song, plan: r.plan, opts: r.opts, commands: [{ kind: 'more', part, at }], seed: g.seed, n: 100 + j });
  }
  return { r: steerArr(g, cmds), cmds };
}

const CHECKS = {
  'random: same seed and stream repeat'() {
    const a = take(stream('test', 'plan'), 50), b = take(stream('test', 'plan'), 50);
    assert(a.every((x, i) => x === b[i]), 'sequences differ');
    assert(a.every(x => x >= 0 && x < 1), 'value out of [0, 1)');
  },
  'random: different streams and seeds differ'() {
    const seqs = STREAMS.map(n => take(makeRng('test')[n], 20).join());
    assert(new Set(seqs).size === STREAMS.length, 'two streams gave the same sequence');
    assert(take(stream('test', 'plan'), 20).join() !== take(stream('test2', 'plan'), 20).join(), 'two seeds gave the same sequence');
  },
  'random: streams are independent'() {
    // Drawing from one stream must not move another.
    const r1 = makeRng('x'), r2 = makeRng('x');
    take(r1.titles, 100);
    assert(take(r1.plan, 10).join() === take(r2.plan, 10).join(), 'titles draws changed plan');
  },
  'random: helpers stay in range'() {
    const s = stream('helpers');
    for (let i = 0; i < 2000; i++) {
      const n = s.int(3, 7); assert(Number.isInteger(n) && n >= 3 && n <= 7, `int out of range: ${n}`);
      const f = s.range(-1, 1); assert(f >= -1 && f < 1, `range out of range: ${f}`);
    }
    const sh = s.shuffle([1, 2, 3, 4, 5]);
    assert(sh.slice().sort().join() === '1,2,3,4,5', 'shuffle lost items');
    assert(s.weighted(['a', 'b'], [0, 1]) === 'b', 'weighted picked a zero weight');
    assert(hashString('abc') === hashString('abc') && hashString('abc') !== hashString('abd'), 'hash not stable');
  },
  'recipes: the twelve starting styles are valid'() {
    for (const id of STARTING) assert(byId[id], `missing recipe ${id}`);
    for (const r of loadStyles()) {
      const { errors } = validateRecipe(r);
      assert(!errors.length, `${r.id}: ${errors.map(e => `${e.path}: ${e.msg}`).join('; ')}`);
    }
  },
  'recipes: unknown preset is an error at its path naming the presets'() {
    const r = structuredClone(loadStyles().find(x => x.id === 'berlin-techno'));
    r.bass.presets = ['rolling', 'wobbly'];
    const e = validateRecipe(r).errors.find(x => x.path === 'bass.presets[1]');
    assert(e, 'no error at bass.presets[1]');
    assert(/rolling/.test(e.msg) && /rumble/.test(e.msg), `message does not list the bass presets: ${e.msg}`);
  },
  'recipes: reversed range and bad length are errors'() {
    const r = structuredClone(loadStyles().find(x => x.id === 'trance'));
    r.tempo = [140, 120]; r.minutes = [1, 7];
    const errs = validateRecipe(r).errors.map(e => e.path);
    assert(errs.includes('tempo'), 'no error at tempo');
    assert(errs.includes('minutes'), 'no error at minutes');
  },
  'recipes: headroom from 1.0 to 1.5, else an error at its path'() {
    const r = structuredClone(loadStyles().find(x => x.id === 'phonk'));
    for (const h of [1, 1.3, 1.5]) assert(!validateRecipe({ ...r, headroom: h }).errors.length, `headroom ${h} is invalid`);
    for (const h of [0.9, 1.6, '1.2']) assert(validateRecipe({ ...r, headroom: h }).errors.some(e => e.path === 'headroom'), `headroom ${h} gives no error at headroom`);
  },
  'recipes: the push into the master limiter is the highest headroom of the song\'s styles, 1 for none'() {
    const rs = [{ id: 'phonk', headroom: 1.3 }, { id: 'acid', headroom: 1.1 }, { id: 'jazz' }];
    assert(stylePush(undefined, rs) === 1 && stylePush([], rs) === 1 && stylePush(['jazz'], rs) === 1, 'a song without a headroom pushes');
    assert(stylePush(['jazz', 'phonk', 'acid'], rs) === 1.3, 'not the highest headroom');
    assert(stylePush(['switch-acid'], rs) === 1.1, 'an old style id is not renamed');
    assert(stylePush(['phonk'], [{ id: 'phonk', headroom: 3 }]) === 1.5, 'the push is not kept within 1.5');
    assert(stylePush(['phonk'], loadStyles()) >= 1, 'the built-in styles give no push');
  },
  'recipes: missing optional part stays valid'() {
    const r = structuredClone(loadStyles().find(x => x.id === 'classic-rock'));
    delete r.guitar;
    assert(!validateRecipe(r).errors.length, 'recipe without guitar is invalid');
  },
  'docs: STYLES.md names every recipe field'() {
    const doc = fs.readFileSync(new URL('../docs/STYLES.md', import.meta.url), 'utf8');
    const names = [...TOP_FIELDS, ...Object.values(INSTRUMENTS).flatMap(Object.keys), 'settings', 'weight', ...SHAPES, ...PART_NAMES,
      ...Object.keys(RECIPE_DEFAULTS.energy), ...Object.keys(RECIPE_DEFAULTS.voice)];
    const missing = [...new Set(names)].filter(n => !doc.includes(`\`${n}\``));
    assert(!missing.length, `not in docs/STYLES.md: ${missing.join(', ')}`);
  },
  'mix: one style gives every part'() {
    for (const chaos of [0, 0.5, 1]) for (const p of mixSession(['jazz'], chaos, 20))
      assert(PART_NAMES.every(k => p[k] === 'jazz'), `part not from jazz at chaos ${chaos}`);
  },
  'mix: chaos 0 rotates whole styles'() {
    const s = mixSession(['synthwave', 'country'], 0, 20);
    s.forEach((p, i) => {
      assert(stylesOf(p).length === 1, `song ${i} mixes styles at chaos 0`);
      if (i) assert(p.dominant !== s[i - 1].dominant, `songs ${i - 1} and ${i} share a style`);
    });
  },
  'mix: chaos 1 mixes parts'() {
    const s = mixSession(['synthwave', 'jazz', 'country'], 1, 40);
    const mixed = s.filter(p => stylesOf(p).length >= 2).length;
    assert(mixed >= 20, `only ${mixed} of 40 songs mix styles`);
    for (const id of ['synthwave', 'jazz', 'country']) assert(s.some(p => p.tempo === id), `${id} never gives the tempo`);
  },
  'director: songs of every style are valid'() {
    every(({ songs }, id) => songs.forEach(song => {
      const { errors } = validateSong(song);
      assert(!errors.length, `${id} ${song.id}: ${errors.slice(0, 3).map(e => `${e.path}: ${e.msg}`).join('; ')}`);
    }));
  },
  'director: song plan (length, sections, title, voice)'() {
    every(({ session, songs }, id) => {
      session.songs.forEach((e, i) => {
        assert(e.seconds >= 120 && e.seconds <= 360, `${id} song ${i} lasts ${e.seconds} s`);
        const words = e.styles.flatMap(s => Object.values(byId[s].words).flat());
        assert(e.title && e.title.split(' ').every(w => words.includes(w)), `${id} song ${i} title "${e.title}" not from the word lists`);
        songs[i].sections.forEach(sec => assert(sec.bars % (2 * e.phrase) === 0, `${id} section ${sec.name} has ${sec.bars} bars, not a multiple of ${2 * e.phrase}`));
        assert(songs[i].tracks.some(t => t.type === 'voice'), `${id} song ${i} has no voice track`);
      });
    });
    const lens = session({ styles: ['trance'], minutes: 30, seed: 'lengths' }).session.songs.map(e => e.seconds);
    assert(new Set(lens).size > 1, 'every song has the same length');
  },
  'director: build and drop follows its shape'() {
    let checked = 0;
    for (const id of STARTING) for (const [i, e] of session({ styles: [id], minutes: 10, seed: `check-${id}` }).session.songs.entries()) {
      if (e.shape !== 'build-drop') continue;
      const ph = e.phrases, en = role => avg(ph.filter(p => p.role === role).map(p => p.energy));
      const build = ph.filter(p => p.role === 'build').map(p => p.energy);
      assert(build[build.length - 1] > build[0], `${id} song ${i}: energy does not rise in the build`);
      assert(en('drop') > en('build') && en('drop') > en('break'), `${id} song ${i}: drop ${en('drop')} is not the highest (build ${en('build')}, break ${en('break')})`);
      checked++;
    }
    assert(checked >= 3, `only ${checked} build and drop songs checked`);
  },
  'director: energy amount raises the measured energy'() {
    for (const id of ['berlin-techno', 'synthwave', 'jazz']) {
      const m = energy => avg(session({ styles: [id], minutes: 10, seed: 'amount', energy }).session.songs.flatMap(e => e.phrases.map(p => p.energy)));
      assert(m(0.9) > m(0.2), `${id}: energy 0.9 gives ${m(0.9).toFixed(2)}, energy 0.2 gives ${m(0.2).toFixed(2)}`);
    }
  },
  'director: complexity 0 keeps presets, complexity 1 stays in key'() {
    const grooveRows = new Set(Object.values(GROOVES).flatMap(g => Object.values(g[1])));
    for (const id of STARTING) {
      for (const song of session({ styles: [id], minutes: 8, seed: 'plain', complexity: 0 }).songs) for (const t of song.tracks) for (const p of Object.values(t.patterns)) {
        assert(p.notes === undefined, `${id} ${t.id}: complexity 0 wrote notes`);
        assert(p.idea === undefined, `${id} ${t.id}: complexity 0 composed a part`);
        for (const r of Object.values(p.rows || {})) assert(grooveRows.has(r), `${id} ${t.id}: drum row ${r} is not from a groove`);
      }
      for (const song of session({ styles: [id], minutes: 8, seed: 'wild', complexity: 1 }).songs) for (const t of song.tracks) for (const p of Object.values(t.patterns)) {
        if (p.idea) assert(inKey(t.type, p.idea), `${id} ${t.type} composed part out of key: ${JSON.stringify(p.idea)}`);
        if (p.notes === undefined) continue;
        if (t.type === 'hook') assert(degreesOnly(p.notes), `${id} hook notes not scale degrees: ${p.notes}`);
        else assert(chordTonesOnly(p.notes), `${id} ${t.type} notes not chord tones: ${p.notes}`);
      }
    }
    const mutated = STARTING.flatMap(id => session({ styles: [id], minutes: 8, seed: 'wild', complexity: 1 }).songs.flatMap(s => s.tracks.flatMap(t => Object.values(t.patterns)))).filter(p => p.notes).length;
    assert(mutated > 10, `only ${mutated} mutated patterns at complexity 1`);
  },
  'director: complexity 0 gives the songs of director version 2'() {
    for (const c of PLAIN_V2) { const { songs, ...opts } = c; assert(sessionHash(generateSession(loadStyles(), opts).songs) === songs, `${c.seed} (${c.styles}): complexity 0 songs changed`); }
  },
  'director: a recipe asking for composed leads gets them in most songs'() {
    const recipes = loadStyles().map(r => (r.id === 'trance' ? { ...r, hook: { ...r.hook, weight: 1, material: { source: 'generated' } } } : r));
    const ses = createSession(recipes, 'composed-leads'), leads = [];
    for (let i = 0; i < 10; i++) { const { song } = ses.next({ styles: ['trance'], complexity: 0.5 }); const h = song.tracks.find(t => t.type === 'hook'); leads.push(h ? h.patterns.A : null); }
    const composed = leads.filter(p => p && p.idea && !p.preset);
    assert(composed.length >= 6, `${composed.length} of 10 songs have a composed lead`);
    assert(new Set(composed.map(p => JSON.stringify(p))).size === composed.length, 'two songs have the same composed lead');
    // a mix: about the share of the songs get a composed bassline
    const mixed = loadStyles().map(r => (r.id === 'synthwave' ? { ...r, bass: { ...r.bass, material: { source: 'mix', share: 0.5 } } } : r));
    const s2 = createSession(mixed, 'mixed-bass'), got = Array.from({ length: 40 }, () => s2.next({ styles: ['synthwave'], complexity: 0.5 }).entry).filter(e => e.material && e.material.bass === 'generated').length;
    assert(got >= 12 && got <= 28, `${got} of 40 songs have a composed bassline with share 0.5`);
  },
  'director: material source patterns, varied, composed'() {
    const run = material => session({ styles: ['synthwave', 'drum-and-bass'], chaos: 0.5, minutes: 20, seed: 'source', complexity: 0.8, material });
    for (const sg of run('patterns').songs) for (const t of sg.tracks) for (const p of Object.values(t.patterns)) assert(p.notes === undefined && p.idea === undefined, `patterns: ${t.id} ${JSON.stringify(p)}`);
    const varied = run('varied').session.songs.flatMap(e => Object.values(e.material || {}));
    assert(varied.length && varied.every(m => m === 'varied'), `varied: ${varied.join(', ')}`);
    const composed = run('composed');
    composed.session.songs.forEach((e, i) => { const melodic = composed.songs[i].tracks.filter(t => ['drums', 'bass', 'arp', 'hook', 'pad', 'guitar'].includes(t.type)); assert(melodic.every(t => (e.material || {})[t.id] === 'generated'), `composed: song ${i} ${JSON.stringify(e.material)}`); });
    assert(JSON.stringify(run('mix').songs) === JSON.stringify(session({ styles: ['synthwave', 'drum-and-bass'], chaos: 0.5, minutes: 20, seed: 'source', complexity: 0.8 }).songs), 'mix is not the default');
  },
  'director: moves on the grid, one per track, never back to back'() {
    every(({ session, songs }, id) => songs.forEach((song, i) => {
      const e = session.songs[i], ph = e.phrase, by = new Map();
      for (const s of buildSteps(song)) {
        assert(s.at % ph === 0, `${id} song ${i}: step at bar ${s.at} is off the ${ph}-bar grid`);
        const big = /^(break|drop)/.test(e.phrases.find(p => p.bar === s.at).moves.join(' '));
        if (big && (s.remove || s.add) && listOf(s.add || s.remove).length > 1) assert(s.at % (2 * ph) === 0, `${id} song ${i}: break or drop at bar ${s.at} not on a ${2 * ph}-bar boundary`);
        for (const t of stepTracks(s)) { const k = s.at / ph; assert(by.get(t) !== k, `${id} song ${i}: two moves on ${t} at bar ${s.at}`); assert(by.get(t) !== k - 1, `${id} song ${i}: ${t} moves on two consecutive boundaries (bar ${s.at})`); by.set(t, k); }
      }
    }));
  },
  'director: track limits'() {
    every(({ session, songs }, id) => songs.forEach((song, i) => {
      for (let bar = 0; bar < session.songs[i].bars; bar++) {
        const n = playing(stateAt(song, bar).song).length;
        assert(n <= 8, `${id} song ${i}: ${n} tracks at bar ${bar}`);
        assert(n <= session.songs[i].hardMax, `${id} song ${i}: ${n} tracks at bar ${bar}, above the style max ${session.songs[i].hardMax}`);
      }
    }));
  },
  'director: variety between songs'() {
    for (const [styles, chaos] of [[['berlin-techno'], 0.3], [['synthwave', 'jazz', 'country'], 0.6], [['trance', 'phonk', 'lo-fi', 'industrial'], 1]]) {
      const s = session({ styles, chaos, minutes: 60, seed: 'variety' }).session.songs;
      s.forEach((e, i) => {
        if (!i) return;
        assert(e.key !== s[i - 1].key, `${styles}: songs ${i - 1} and ${i} share key ${e.key}`);
        assert(e.shape !== s[i - 1].shape, `${styles}: songs ${i - 1} and ${i} share shape ${e.shape}`);
        if (styles.length > 1) assert(!s.slice(Math.max(0, i - 3), i).some(p => partsKey(p.parts) === partsKey(e.parts)), `${styles}: song ${i} repeats the parts of a recent song`);
      });
    }
  },
  'director: comments about half of the boundaries, 8 bars apart'() {
    let moves = 0, said = 0;
    every(({ session }, id) => session.songs.forEach((e, i) => {
      let last = -Infinity;
      for (const p of e.phrases) {
        if (p.moves.length) moves++;
        if (!p.say) continue;
        said++;
        assert(p.bar - last >= 8, `${id} song ${i}: comments at bars ${last} and ${p.bar}`);
        last = p.bar;
      }
    }));
    const rate = said / moves;
    assert(rate > 0.35 && rate < 0.75, `comments on ${Math.round(rate * 100)} % of the boundaries with moves`);
  },
  'director: phrase pool is short and complete'() {
    for (const p of allPhrases()) for (const lang of ['en', 'it']) assert(p[lang] && p[lang].length <= 24, `phrase too long: ${p[lang]}`);
  },
  'director: voice amount sets how often comments are spoken'() {
    const said = talk => STARTING.reduce((a, id) => a + session({ styles: [id], minutes: 10, seed: `check-${id}`, ...(talk === undefined ? {} : { talk }) }).session.songs.reduce((b, e) => b + e.phrases.filter(p => p.say).length, 0), 0);
    assert(said(0) === 0, `talk 0 still speaks ${said(0)} comments`);
    assert(said(1) > said(0.5), `talk 1 (${said(1)}) does not speak more than 0.5 (${said(0.5)})`);
    assert(said(0.5) === said(undefined), 'talk 0.5 differs from the default');
    for (const id of STARTING) for (const e of session({ styles: [id], minutes: 10, seed: `check-${id}`, talk: 1 }).session.songs) {
      let last = -Infinity; for (const p of e.phrases) if (p.say) { assert(p.bar - last >= 8, `talk 1: comments at bars ${last} and ${p.bar}`); last = p.bar; }
    }
  },
  'director: Live coder styles keep one key, short progressions and open in crescendo'() {
    for (const [st, old] of [['gated-trance', 'switch-trance'], ['pure-trance', 'switch-trance-pure'], ['acid', 'switch-acid'], ['house', 'switch-house']]) {
      const out = session({ styles: [st], minutes: 20, seed: `switch-${old}` });
      for (const sg of out.songs) {
        assert(new Set(sg.sections.map(x => x.key)).size === 1, `${st}: one key`);
        assert(sg.sections.every(x => new Set(PROGS[x.chords][1]).size <= 4), `${st}: short progressions`);
        assert(sg.tracks.filter(t => t.type !== 'voice').length <= 8, `${st}: few tracks`);
        assert(sg.buildStyle === 'crescendo', `${st}: build style`);
      }
    }
  },
  'director: pure trance has no arpeggio and at most two chords'() {
    const out = session({ styles: ['pure-trance'], minutes: 30, seed: 'switch-pure' });
    assert(out.songs.length >= 3, 'songs');
    for (const sg of out.songs) {
      assert(!sg.tracks.some(t => t.type === 'arp'), `${sg.title}: arpeggio`);
      assert(sg.sections.every(x => new Set(PROGS[x.chords][1]).size <= 2), `${sg.title}: chords`);
    }
  },
  'renamed styles: old ids give the same songs as the new ones (sessions, artists, saved settings)'() {
    for (const [old, now] of Object.entries(STYLE_ALIASES)) {
      const a = session({ styles: [old], minutes: 12, seed: `alias-${old}` }), b = session({ styles: [now], minutes: 12, seed: `alias-${old}` });
      assert(JSON.stringify(a.songs.map(x => x.tracks)) === JSON.stringify(b.songs.map(x => x.tracks)), `${old}: same songs as ${now}`);
    }
    // the recipe list keeps the order it had before the rename, so draws over it give the same songs
    const ids = loadStyles().map(r => r.id), olds = ids.map(recipeOrder);
    assert(olds.every((x, i) => !i || olds[i - 1].localeCompare(x) <= 0), `recipe order: ${ids.join(', ')}`);
    // an artist that names an old id: valid, and plays the new style
    const taste = { format: 1, id: 't', name: 'T', bio: { en: 'x', it: 'x' }, portrait: { seed: 't', palette: 'neon' }, styles: { 'switch-acid': 2, synthwave: 1 } };
    assert(!validateArtist(taste, ids).errors.length, `artist with an old id: ${validateArtist(taste, ids).errors.map(e => e.msg).join('; ')}`);
    const st = session({ artist: taste, minutes: 12, seed: 'alias-artist' }).songs.flatMap(x => (x.tags && x.tags.styles) || []);
    assert(st.length && st.every(x => ids.includes(x)) && !st.some(x => x in STYLE_ALIASES), `artist styles: ${st.join(', ')}`);
    // the song list: a saved song and a saved filter with an old id show the new style
    const names = { style: id => [id], genre: g => [g], genreOf: id => (loadStyles().find(r => r.id === id) || {}).genre };
    const e = songEntry({ id: 'x', title: 'X', tags: { styles: ['switch-acid'] } }, 0, names);
    assert(e.styles.includes('acid') && e.genres.includes('techno'), `song entry: ${e.styles} ${e.genres}`);
    assert(cleanView({ styles: ['switch-house'] }, { styles: ids }).styles.join() === 'house', 'saved filter');
  },
  'director: each song has its own voice'() {
    const songs = session({ styles: ['berlin-techno'], minutes: 60, seed: 'voices' });
    const voices = songs.songs.map(s => JSON.stringify(s.tracks.find(t => t.type === 'voice').settings));
    assert(new Set(voices).size === voices.length, 'two songs of the same style have the same voice');
    const entries = songs.session.songs;
    assert(entries.some(e => e.voice.character), 'no song got a voice character');
    assert(new Set(entries.map(e => e.voice.speaker)).size > 1, 'every song has the same speaker');
    for (const id of STARTING) for (const sg of session({ styles: [id], minutes: 10, seed: `check-${id}` }).songs) {
      const v = sg.tracks.find(t => t.type === 'voice').settings;
      assert(v.pitch >= 0.25 && v.pitch <= 4 && v.tempo >= 0.25 && v.tempo <= 4, `${id}: voice pitch or tempo out of range`);
    }
  },
  'artists: validator reports errors at their paths'() {
    const ok = { format: 1, id: 'tester', name: 'Tester', bio: { en: 'a test artist', it: 'un artista di prova' }, portrait: { seed: 't', palette: 'neon' }, styles: { 'berlin-techno': 2, jazz: 1 } };
    const ids = STYLES.map(r => r.id);
    assert(!validateArtist(ok, ids).errors.length, `valid artist rejected: ${JSON.stringify(validateArtist(ok, ids).errors)}`);
    const errs = validateArtist({ ...ok, styles: { polka: 1 }, energy: [0.9, 0.2], quirks: { 'moonwalk': 1 } }, ids).errors.map(e => e.path);
    for (const p of ['styles.polka', 'energy', 'quirks.moonwalk']) assert(errs.includes(p), `no error at ${p}: ${errs.join(', ')}`);
  },
  'artists: songs draw their values from the taste'() {
    const artist = { format: 1, id: 'tester', name: 'Tester', bio: { en: 'x', it: 'x' }, portrait: { seed: 't', palette: 'neon' }, styles: { 'berlin-techno': 3, industrial: 1 }, explore: 0.25,
      chaos: [0, 0.6], energy: [0.3, 0.9], complexity: [0.2, 0.8], talk: [0.1, 0.9], shapes: { 'slow-burn': 3, 'build-drop': 1 } };
    const g = generateSession(loadStyles(), { artist, seed: 'taste', minutes: 80 });
    const a = g.session.songs.map(e => e.artist);
    assert(a.every(Boolean), 'songs do not record the artist');
    assert(new Set(a.map(x => `${x.chaos}|${x.energy}|${x.complexity}|${x.talk}`)).size === a.length, 'two songs have the same values');
    const fav = g.session.songs.filter(e => ['berlin-techno', 'industrial'].includes(e.parts.dominant)).length;
    assert(fav > g.session.songs.length * 0.6, `only ${fav} of ${g.session.songs.length} songs use the favourite styles`);
    assert(g.session.songs.some(e => !['berlin-techno', 'industrial'].includes(e.parts.dominant)), 'no song outside the favourites with explore 0.25');
    g.songs.forEach(sg => { const v = validateSong(sg); assert(!v.errors.length, `${sg.id}: ${v.errors[0] && v.errors[0].msg}`); });
  },
  'artists: quirks do what they say'() {
    const base = { format: 1, id: 'q', name: 'Q', bio: { en: 'x', it: 'x' }, portrait: { seed: 'q', palette: 'neon' } };
    const run = (quirk, styles, extra = {}) => generateSession(loadStyles(), { artist: { ...base, styles, quirks: { [quirk]: 1 }, ...extra }, seed: `q-${quirk}`, minutes: 25 });
    const ng = run('no-guitars', { 'classic-rock': 1, 'melodic-metal': 1 });
    assert(ng.songs.every(sg => !sg.tracks.some(t => t.type === 'guitar')), 'no-guitars: a song has a guitar');
    const td = run('two-drops', { trance: 1 }, { shapes: { 'build-drop': 1 } });
    assert(td.session.songs.some(e => e.phrases.filter((p, i, a) => p.role === 'drop' && (i === 0 || a[i - 1].role !== 'drop')).length >= 2), 'two-drops: no song with two drops');
    const he = run('hard-endings', { synthwave: 1 });
    for (const sg of he.songs) { const total = sg.sections.reduce((x, y) => x + y.bars, 0), st = stateAt(sg, total - 1).song; assert(playing(st).length === 0, `hard-endings: ${playing(st).length} tracks still play at the end of ${sg.id}`); }
    const tf = run('texture-first', { 'berlin-techno': 1 });
    for (const sg of tf.songs) if (sg.tracks.some(t => t.type === 'texture')) assert(listOf(buildSteps(sg)[0].add).some(id => id === 'texture'), `texture-first: ${sg.id} does not start with the texture`);
    const sb = run('slow-builds', { trance: 1 });
    for (const e of sb.session.songs) e.phrases.slice(1, Math.floor(e.phrases.length / 2)).forEach(p => assert(p.moves.length <= 1, `slow-builds: ${p.moves.length} moves at bar ${p.bar}`));
    const lb = run('long-breaks', { trance: 1 }, { shapes: { 'build-drop': 1 } });
    assert(lb.session.songs.some(e => e.phrases.filter(p => p.role === 'break').length >= 4), 'long-breaks: no break of two double phrases');
  },
  'artists: a recorded session replays the same after the artist changes'() {
    const artist = { format: 1, id: 'r', name: 'R', bio: { en: 'x', it: 'x' }, portrait: { seed: 'r', palette: 'neon' }, styles: { lofi: 1, 'lo-fi': 1, jazz: 1 } };
    delete artist.styles.lofi;
    const first = generateSession(loadStyles(), { artist, seed: 'replay', minutes: 10 });
    const recorded = JSON.parse(JSON.stringify(first.session.options.artist));
    artist.styles = { phonk: 1 };
    const again = generateSession(loadStyles(), { artist: recorded, seed: 'replay', minutes: 10 });
    assert(JSON.stringify(again.songs) === JSON.stringify(first.songs), 'replay from the recorded artist differs');
  },
  'artists: the built-in artists are valid, make valid songs and differ'() {
    const ids = STYLES.map(r => r.id), arts = loadArtists();
    assert(arts.length >= 6, `${arts.length} built-in artists`);
    const prof = {};
    for (const a of arts) {
      const { errors } = validateArtist(a, ids);
      assert(!errors.length, `${a.id}: ${errors.map(e => `${e.path}: ${e.msg}`).join('; ')}`);
      const g = generateSession(loadStyles(), { artist: a, seed: `builtin-${a.id}`, minutes: 25 });
      g.songs.forEach(sg => { const v = validateSong(sg); assert(!v.errors.length, `${a.id} ${sg.id}: ${v.errors[0] && v.errors[0].msg}`); });
      prof[a.id] = { styles: [...new Set(g.session.songs.map(e => e.parts.dominant))].sort().join(), energy: avg(g.session.songs.flatMap(e => e.phrases.map(p => p.energy))) };
    }
    const keys = Object.values(prof).map(p => p.styles);
    assert(new Set(keys).size === keys.length, `two artists use the same styles: ${JSON.stringify(prof)}`);
    assert(prof.hype.energy > prof.dreamer.energy + 0.1, `HYPERDROP (${prof.hype.energy.toFixed(2)}) not clearly above Lumen Drift (${prof.dreamer.energy.toFixed(2)})`);
  },
  'artists: portraits are the same for a seed and differ between seeds'() {
    const a = JSON.stringify(portraitPixels('owl-7', 'violet')), b = JSON.stringify(portraitPixels('owl-7', 'violet'));
    assert(a === b, 'the same seed draws two different faces');
    const faces = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(x => JSON.stringify(portraitPixels(x, 'neon'))));
    assert(faces.size === 8, `${faces.size} different faces out of 8 seeds`);
    const g = portraitPixels('sym', 'amber');
    assert(g.length === 16 && g.every(row => row.length === 16 && row.every((c, x) => c === row[15 - x])), 'the face is not 16x16 and symmetric');
  },
  'docs: ARTISTS.md names every artist field'() {
    const doc = fs.readFileSync(new URL('../docs/ARTISTS.md', import.meta.url), 'utf8');
    const missing = [...new Set([...ARTIST_FIELDS, ...PALETTES, ...MOVE_KINDS, ...VOICE_CHARACTER_NAMES, ...Object.keys(QUIRKS)])].filter(n => !doc.includes(`\`${n}\``));
    assert(!missing.length, `not in docs/ARTISTS.md: ${missing.join(', ')}`);
  },
  'determinism: same seed, same session'() {
    const opts = { styles: ['melodic-metal', 'drum-and-bass'], chaos: 0.5, seed: 'aurora' };
    const a = JSON.stringify(generateSession(loadStyles(), opts)), b = JSON.stringify(generateSession(loadStyles(), opts));
    assert(a === b, 'two runs with seed aurora differ');
  },
  'determinism: a session without seed records the seed'() {
    const r = generateSession(loadStyles(), { styles: ['jazz'], minutes: 6 });
    assert(r.session.seed, 'no seed recorded');
    const again = generateSession(loadStyles(), { styles: ['jazz'], minutes: 6, seed: r.session.seed });
    assert(JSON.stringify(again) === JSON.stringify(r), 'the recorded seed does not reproduce the session');
  },
  'determinism: seed fixtures'() {
    const now = FIXTURES.map(f => ({ ...f, hash: sessionHash(generateSession(loadStyles(), f)) }));
    if (process.argv.includes('--write-fixtures')) { fs.writeFileSync(FIXTURES_FILE, JSON.stringify(now, null, 2) + '\n'); console.log('      fixtures written'); return; }
    const saved = JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf8'));
    now.forEach((f, i) => assert(saved[i] && saved[i].hash === f.hash, `seed ${f.seed} (${f.styles}) gives ${f.hash}, fixture ${saved[i] && saved[i].hash}; if the change is intended, run npm run check:endless -- --write-fixtures`));
  },
  'radio: song by song equals a whole session'() {
    const whole = generateSession(loadStyles(), { styles: ['synthwave', 'jazz'], chaos: 0.6, minutes: 12, seed: 'radio' });
    const ses = createSession(loadStyles(), 'radio');
    const one = whole.songs.map(() => ses.next({ styles: ['synthwave', 'jazz'], chaos: 0.6 }).song);
    assert(JSON.stringify(one) === JSON.stringify(whole.songs), 'songs made one at a time differ from the whole session');
  },
  'radio: an option change applies from the next song and replays the same'() {
    const run = () => { const ses = createSession(loadStyles(), 'change'); const o = { styles: ['trance'] }; return [ses.next(o), ses.next(o), ses.next({ ...o, energy: 0.9 }), ses.next({ ...o, energy: 0.9 })].map(r => r.song); };
    const plain = (() => { const ses = createSession(loadStyles(), 'change'); return [0, 1, 2, 3].map(() => ses.next({ styles: ['trance'] }).song); })();
    const a = run(), b = run();
    assert(JSON.stringify(a) === JSON.stringify(b), 'the same recorded changes give different songs');
    assert(JSON.stringify(a.slice(0, 2)) === JSON.stringify(plain.slice(0, 2)), 'songs before the change are different');
    assert(JSON.stringify(a[2]) !== JSON.stringify(plain[2]), 'the change did not apply to song 3');
  },
  'radio: window song keeps each song as it is, at any offset'() {
    const ses = createSession(loadStyles(), 'window'), o = { styles: ['berlin-techno', 'jazz'], chaos: 0.5 };
    const a = ses.next(o).song, b = ses.next(o).song;
    const barsOf = s => s.sections.reduce((x, y) => x + y.bars, 0);
    for (const start of [0, 37, 5216]) {
      const win = windowSong([{ song: a, n: 4, start }, { song: b, n: 5, start: start + barsOf(a) }]);
      const v = validateSong(win);
      assert(!v.errors.length, `window at ${start}: ${v.errors.slice(0, 2).map(e => `${e.path}: ${e.msg}`).join('; ')}`);
      compileSong(win);
      for (const [song, n, s0] of [[a, 4, start], [b, 5, start + barsOf(a)]]) for (const at of [...new Set(buildSteps(song).map(x => x.at))]) {
        const own = stateAt(song, at).song.tracks, inWin = stateAt(win, s0 + at).song.tracks.filter(t => t.id.startsWith(`s${n}-`));
        const sig = ts => JSON.stringify(ts.map(t => [t.id.replace(/^s\d+-/, ''), !!t.mute, t.settings, t.rack || [], (t.clips[0] || {}).pattern]));
        assert(sig(own) === sig(inWin), `window at ${start}: song ${n} differs at its bar ${at}`);
      }
    }
  },
  'command line: session written, report and join'() {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'endless-'));
    try {
      const txt = execFileSync('node', ['--no-warnings', 'tools/endless.mjs', '--styles', 'berlin-techno', '--minutes', '12', '--seed', 'test', '--out', out, '--join'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
      const s = JSON.parse(fs.readFileSync(path.join(out, 'session.json'), 'utf8'));
      assert(/^seed: test$/m.test(txt), 'the seed is not printed');
      assert(s.seconds >= 12 * 60, `session lasts ${s.seconds} s, less than 12 minutes`);
      for (const f of s.files) assert(fs.existsSync(path.join(out, f)), `missing ${f}`);
      const songLines = txt.split('\n').filter(l => /^#\d+ "/.test(l)), phraseLines = txt.split('\n').filter(l => /^  bar +\d+ .*target .*energy/.test(l));
      assert(songLines.length === s.songs.length, `${songLines.length} summary lines for ${s.songs.length} songs`);
      assert(phraseLines.length === s.songs.reduce((a, e) => a + e.phrases.length, 0), 'one line per phrase expected');
      const joined = JSON.parse(fs.readFileSync(path.join(out, s.files.find(f => f.endsWith('-joined.json'))), 'utf8'));
      const v = validateSong(joined);
      assert(!v.errors.length, `joined song: ${v.errors.slice(0, 2).map(e => `${e.path}: ${e.msg}`).join('; ')}`);
      const want = s.songs.reduce((a, e, i) => a + e.bars + extraOf(e.transition) - (i < s.songs.length - 1 ? overlapOf(e.transition) : 0), 0);
      assert(joined.sections.reduce((a, x) => a + x.bars, 0) === want, `joined song length differs: ${joined.sections.reduce((a, x) => a + x.bars, 0)} for ${want}`);
      assert(new Set(joined.tracks.map(t => t.id)).size === joined.tracks.length, 'joined track ids not unique');
    } finally { fs.rmSync(out, { recursive: true, force: true }); }
  },
  'command line: unknown style writes nothing'() {
    const out = path.join(os.tmpdir(), `endless-none-${process.pid}`);
    const r = spawnSync('node', ['--no-warnings', 'tools/endless.mjs', '--styles', 'berlin,nonexistent', '--out', out], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
    assert(r.status !== 0, 'the command did not fail');
    assert(/available styles: .*berlin-techno/.test(r.stderr), `no list of styles: ${r.stderr}`);
    assert(!fs.existsSync(out), 'something was written');
  },
  'transitions: every kind joins two songs into a valid song'() {
    const ses = createSession(STYLES, 'tx-kinds');
    const a = ses.next({ styles: ['synthwave'], harmony: 'compatible' }), b = ses.next({ styles: ['synthwave'], harmony: 'compatible' });
    assert(Math.abs(a.entry.bpm - b.entry.bpm) <= MAX_RAMP, `compatible tempos ${a.entry.bpm} and ${b.entry.bpm}`);
    for (const kind of TRANSITION_KINDS) {
      const t = planTransition(a.entry, b.entry, { transition: kind }, stream('tx', kind));
      assert(t.kind === kind, `${kind} planned as ${t.kind}`);
      const items = [{ song: a.song, n: 1, bars: a.entry.bars, transition: t }, { song: b.song, n: 2, bars: b.entry.bars }];
      const starts = layout(items, 0), win = windowSong(items.map((x, i) => ({ ...x, start: starts[i] })));
      const v = validateSong(win);
      assert(!v.errors.length, `${kind}: ${v.errors.slice(0, 2).map(e => `${e.path}: ${e.msg}`).join('; ')}`);
      const total = win.sections.reduce((s, x) => s + x.bars, 0);
      assert(total === a.entry.bars + b.entry.bars + extraOf(t) - overlapOf(t), `${kind}: length ${total}`);
      for (const bar of [starts[1] - 1, starts[1], a.entry.bars - 1, a.entry.bars + extraOf(t), total - 1]) compileSong(stateAt(win, Math.max(0, bar)).song);
    }
  },
  'transitions: mix and morph bring the next song in before the end and leave only it'() {
    const ses = createSession(STYLES, 'tx-overlap');
    const a = ses.next({ styles: ['berlin-techno'], harmony: 'compatible' }), b = ses.next({ styles: ['berlin-techno'], harmony: 'compatible' });
    for (const kind of ['mix', 'morph']) {
      const t = planTransition(a.entry, b.entry, { transition: kind, transitionBars: [16, 16] }, stream('tx', kind));
      const items = [{ song: a.song, n: 1, bars: a.entry.bars, transition: t }, { song: b.song, n: 2, bars: b.entry.bars }];
      const starts = layout(items, 0), win = windowSong(items.map((x, i) => ({ ...x, start: starts[i] })));
      assert(starts[1] === a.entry.bars - t.bars, `${kind}: next song starts at ${starts[1]}`);
      const during = stateAt(win, a.entry.bars - 1).song.tracks.filter(x => !x.mute && x.type !== 'voice');
      assert(during.some(x => x.id.startsWith('s2-')), `${kind}: no track of the next song during the transition`);
      const after = stateAt(win, a.entry.bars).song.tracks.filter(x => !x.mute && x.id.startsWith('s1-') && x.clips.some(c => c.start <= a.entry.bars && c.start + c.bars > a.entry.bars));
      assert(!after.length, `${kind}: tracks of the first song still play after it: ${after.map(x => x.id).join(', ')}`);
      if (kind === 'morph') {
        const left = stateAt(win, a.entry.bars - 1).song.tracks.filter(x => !x.mute && x.id.startsWith('s1-') && !['voice', 'code', 'riser'].includes(x.type) && x.clips.some(c => c.start < a.entry.bars));
        assert(!left.length, `morph: still playing in the last bar: ${left.map(x => x.id).join(', ')}`);
      }
      if (t.ramp) {
        const sec = win.sections.filter(x => /Mix|Morph/.test(x.name));
        assert(sec[0].bpm === a.entry.bpm && sec[sec.length - 1].bpmEnd === b.entry.bpm, `${kind}: tempo ramp ${JSON.stringify(sec.map(x => [x.bpm, x.bpmEnd]))}`);
      }
    }
  },
  'transitions: a big tempo jump never mixes or morphs'() {
    const a = { bpm: 90, meter: '4/4', bars: 128, phrase: 8 }, b = { bpm: 140, meter: '4/4', bars: 128, phrase: 8 };
    for (let k = 0; k < 40; k++) assert(!['mix', 'morph'].includes(planTransition(a, b, { transitionWeights: { mix: 5, morph: 5, cut: 1 } }, stream('jump', String(k))).kind), 'mix over a 50 BPM jump');
    assert(planTransition(a, b, { transition: 'mix' }, stream('jump')).kind === 'cut', 'forced mix over a jump is a cut');
  },
  'transitions: artist preferences are followed'() {
    const artist = { ...loadArtists()[0], transitions: { kinds: { break: 10, cut: 1 }, bars: [8, 8] } };
    const { session } = generateSession(STYLES, { artist, styles: Object.keys(artist.styles), minutes: 60, seed: 'tx-pref' });
    const kinds = session.songs.slice(0, -1).map(e => e.transition.kind), count = k => kinds.filter(x => x === k).length;
    assert(count('break') > kinds.length / 2, `breaks ${count('break')} of ${kinds.length}: ${kinds.join(' ')}`);
  },
  'transitions: compatible harmony keeps keys a fifth apart'() {
    const semis = k => KEYS.find(x => x[0] === k)[1], fifth = (x, y) => [5, 7].includes(((semis(x) - semis(y)) % 12 + 12) % 12);
    const { session } = generateSession(STYLES, { styles: ['synthwave'], minutes: 40, seed: 'tx-keys', harmony: 'compatible' });
    const keys = byId.synthwave.keys;
    session.songs.slice(1).forEach((e, i) => {
      const prev = session.songs[i].key;
      if (keys.some(k => fifth(k, prev))) assert(fifth(e.key, prev), `${prev} then ${e.key}`);
    });
  },
  'steering: no command gives the same song, and the same commands the same song'() {
    const ses = createSession(STYLES, 'steer-same'), g = ses.next({ styles: ['berlin-techno'] });
    const a = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [], seed: 'steer-same', n: 0 });
    assert(JSON.stringify(a.song) === JSON.stringify(g.song), 'no command changed the song');
    const cmds = [{ kind: 'energy-up', at: applyBar('energy-up', 20, g.plan) }, { kind: 'darker', at: applyBar('darker', 40, g.plan) }];
    const x = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: cmds, seed: 'steer-same', n: 0 });
    const y = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: cmds, seed: 'steer-same', n: 0 });
    assert(JSON.stringify(x.song) === JSON.stringify(y.song), 'same commands gave different songs');
  },
  'steering: every command keeps the past and makes a valid song'() {
    const ses = createSession(STYLES, 'steer-all'), g = ses.next({ styles: ['synthwave'] });
    const now = 20, playingIds = playing(stateAt(g.song, 24).song).map(t => t.id);
    const cmds = Object.keys(COMMANDS).map(kind => ({ kind, type: kind === 'add' ? 'pad' : kind === 'remove' ? 'drums' : undefined, track: ['volume', 'mute', 'unmute', 'lock', 'unlock'].includes(kind) ? playingIds[0] : undefined, d: kind === 'curve' ? 3 : undefined, value: kind === 'curve' ? 0.2 : kind === 'volume' ? 0.3 : undefined }));
    for (const c of cmds) {
      const cmd = { ...c, at: applyBar(c.kind, now, g.plan) };
      const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [cmd], seed: 'steer-all', n: 0 });
      const v = validateSong(r.song);
      assert(!v.errors.length, `${c.kind}: ${v.errors.slice(0, 2).map(e => `${e.path}: ${e.msg}`).join('; ')}`);
      const before = s => JSON.stringify((s.build || []).filter(x => x.at < Math.min(cmd.at, 16)));
      assert(before(r.song) === before(g.song), `${c.kind}: steps before bar ${cmd.at} changed`);
      compileSong(stateAt(r.song, cmd.at + 1).song);
    }
  },
  'steering: energy up raises the rest of the song'() {
    const ses = createSession(STYLES, 'steer-energy'), g = ses.next({ styles: ['berlin-techno'], energy: 0.3 });
    const at = applyBar('energy-up', 16, g.plan), cmds = [1, 2, 3].map(() => ({ kind: 'energy-up', at }));
    const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: cmds, seed: 'steer-energy', n: 0 });
    const ctx = { usual: g.plan.usualHigh, weights: g.plan.R.energy, hardMax: g.plan.hardMax };
    const avg = sg => { const bars = []; for (let b = at + 8; b < Math.min(at + 48, g.plan.bars - 8); b += 8) bars.push(energyOf(stateAt(sg, b).song, ctx)); return bars.reduce((x, y) => x + y, 0) / bars.length; };
    assert(avg(r.song) > avg(g.song) + 0.05, `energy ${avg(g.song).toFixed(2)} then ${avg(r.song).toFixed(2)}`);
  },
  'steering: drop, stay and end change the length'() {
    const ses = createSession(STYLES, 'steer-len'), g = ses.next({ styles: ['trance'], energy: 0.6 });
    const len = sg => sg.sections.reduce((a, x) => a + x.bars, 0), dbl = 2 * g.plan.phrase, bars = len(g.song);
    const go = kind => steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind, at: applyBar(kind, 1, g.plan) }], seed: 'steer-len', n: 0 });
    assert(len(go('stay').song) === bars + dbl, 'stay adds a double phrase');
    assert(len(go('end').song) === 2 * dbl, `end: ${len(go('end').song)} bars`);
    const drop = go('drop');
    if (g.plan.plan.slice(2).some(d => d.role === 'drop') && g.plan.plan[1].role !== 'drop') assert(len(drop.song) < bars && drop.plan.plan[1].role === 'drop', 'drop comes next');
  },
  'steering: locked tracks and removed types'() {
    const ses = createSession(STYLES, 'steer-lock'), g = ses.next({ styles: ['berlin-techno'] });
    const at = applyBar('remove', 30, g.plan), on = playing(stateAt(g.song, at).song).filter(t => t.type !== 'voice');
    const target = on.find(t => t.type !== 'drums') || on[0];
    const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'lock', track: target.id, at: applyBar('lock', 30, g.plan) }], seed: 'steer-lock', n: 0 });
    const touched = r.song.build.filter(x => x.at >= at && !x.by).some(x => JSON.stringify(x).includes(`"${target.id}"`));
    assert(!touched, `locked ${target.id} was moved`);
    if (on.some(t => t.type === 'bass')) {
      const rm = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'remove', type: 'bass', at }], seed: 'steer-lock', n: 0 });
      assert(!playing(stateAt(rm.song, at).song).some(t => t.type === 'bass'), 'bass still plays');
      assert(rm.song.build.some(x => x.at === at && x.by === 'listener'), 'listener step not marked');
    }
    assert(canApply({ kind: 'remove', type: 'bass' }, g.song, g.plan, 30) === on.some(t => t.type === 'bass') || on.length <= 1, 'canApply remove bass');
    // a type the song has no track for is disabled with its reason
    // a type the song has no track for: added from the style when it has one (#41), else disabled
    const kinds = { lead: ['arp', 'hook', 'guitar'], pad: ['pad'], texture: ['texture'], bass: ['bass'] };
    for (const [ty, parts] of Object.entries(kinds)) {
      if (g.plan.tracks.some(t => parts.includes(t.type))) continue;
      const styleHas = parts.some(k => g.plan.R[k]), why = whyNot({ kind: 'add', type: ty }, g.song, g.plan, 30);
      assert(why === (styleHas ? null : 'no-type'), `add ${ty}: ${why}`);
      if (!styleHas) continue;
      const at = applyBar('add', 30, g.plan), r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'add', type: ty, at }], seed: 'steer-lock', n: 0 });
      const now = playing(stateAt(r.song, at).song).filter(t => parts.includes(t.type));
      assert(now.length === 1 && !g.song.tracks.some(t => t.id === now[0].id && parts.includes(t.type)), `new ${ty} track playing: ${now.map(t => t.id)}`);
      assert(!validateSong(r.song).errors.length, `song with a new ${ty} is valid`);
    }
    assert(whyNot({ kind: 'energy-up' }, g.song, g.plan, g.plan.bars - 1) === 'late', 'late at the end');
  },
  'steering: curves set density, brightness and the voice of a part'() {
    const ses = createSession(STYLES, 'steer-curves'), g = ses.next({ styles: ['berlin-techno'], energy: 0.7 });
    const ph = g.plan.phrase, dbl = 2 * ph, at = applyBar('curve', 1, g.plan), parts = [2, 3, 4].filter(d => d < g.plan.plan.length);
    const go = (curve, value) => steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: parts.map(d => ({ kind: 'curve', curve, d, value, at })), seed: 'steer-curves', n: 0 });
    const mean = (sg, plan, c) => avg(parts.map(d => songCurves(sg, plan, g.opts)[d].measured[c]));
    const sparse = go('density', 2);
    assert(mean(sparse.song, sparse.plan, 'density') < mean(g.song, g.plan, 'density') - 0.5, `density ${mean(g.song, g.plan, 'density')} then ${mean(sparse.song, sparse.plan, 'density')}`);
    assert(songCurves(sparse.song, sparse.plan)[parts[0]].set.density === 2 && songCurves(sparse.song, sparse.plan)[0].set.density === null, 'set and auto parts');
    const dark = go('brightness', 0.05);
    assert(mean(dark.song, dark.plan, 'brightness') < mean(g.song, g.plan, 'brightness') - 0.05, `brightness ${mean(g.song, g.plan, 'brightness').toFixed(2)} then ${mean(dark.song, dark.plan, 'brightness').toFixed(2)}`);
    const quiet = go('voice', 0), lo = parts[0] * dbl, hi = (parts[parts.length - 1] + 1) * dbl;
    assert(!quiet.song.build.some(s => s.say && s.at >= lo && s.at < hi), 'the voice spoke in a silent part');
    // a reset makes the parts automatic again: the same song as without the edits
    const back = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [...parts.map(d => ({ kind: 'curve', curve: 'density', d, value: 2, at })), { kind: 'curve-reset', curve: 'density', at }], seed: 'steer-curves', n: 0 });
    assert(back.plan.plan.every(d => !d.curves || d.curves.density === undefined), 'reset left a density target');
    const again = go('density', 2);
    assert(JSON.stringify(again.song) === JSON.stringify(sparse.song), 'same curve edits gave different songs');
  },
  'steering: high tension charges the part before a drop'() {
    const ses = createSession(STYLES, 'steer-charge');
    let g = null;
    for (let i = 0; i < 12 && !g; i++) { const x = ses.next({ styles: ['berlin-techno'], energy: 0.7 }); const j = x.plan.plan.findIndex((d, k) => k >= 2 && d.role === 'drop' && x.plan.plan[k - 1].role !== 'drop'); if (j > 0 && x.plan.tracks.some(t => t.type === 'riser')) g = { ...x, j }; }
    assert(g, 'no song with a drop and a riser');
    const ph = g.plan.phrase, dbl = 2 * ph, d = g.j - 1, at = applyBar('curve', 1, g.plan);
    const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'curve', curve: 'tension', d, value: 0.9, at }], seed: 'steer-charge', n: 0 });
    const riser = r.song.tracks.find(t => t.type === 'riser');
    assert(riser && playing(stateAt(r.song, d * dbl).song).some(t => t.id === riser.id), 'riser from the first phrase of the charge');
    const drumsAt = (sg, bar) => playing(stateAt(sg, bar).song).filter(t => t.type === 'drums').length;
    assert(drumsAt(r.song, d * dbl + ph) < drumsAt(r.song, d * dbl) || drumsAt(r.song, d * dbl) === 0, 'fewer drums on the last phrase of the charge');
    assert(drumsAt(r.song, g.j * dbl) >= drumsAt(r.song, d * dbl), 'the drop brings the drums back');
    const tension = sg => curveParts(stateAt(sg, d * dbl + ph).song, { lift: true }).tension;
    assert(tension(r.song) > tension(g.song), `tension ${tension(g.song).toFixed(2)} then ${tension(r.song).toFixed(2)}`);
    assert(r.song.sections.some(s => s.chords === g.plan.liftChords), 'strong progression');
    assert(!validateSong(r.song).errors.length, 'charged song is valid');
  },
  'steering: extend adds a part before the ending and keeps it'() {
    const ses = createSession(STYLES, 'steer-extend'), g = ses.next({ styles: ['trance'], energy: 0.6 });
    const len = sg => sg.sections.reduce((a, x) => a + x.bars, 0), dbl = 2 * g.plan.phrase, bars = len(g.song);
    const at = applyBar('extend', 10, g.plan), d0 = at / dbl;
    const go = n => steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: Array.from({ length: n }, () => ({ kind: 'extend', at })), seed: 'steer-extend', n: 0 });
    const one = go(1), three = go(3);
    assert(len(one.song) === bars + dbl && len(three.song) === bars + 3 * dbl && three.plan.extended === 3, `lengths ${bars} ${len(one.song)} ${len(three.song)}`);
    const ins = extendIndex(g.plan, d0), roles = g.plan.plan.map(d => d.role);
    assert(JSON.stringify(one.plan.plan.map(d => d.role)) === JSON.stringify([...roles.slice(0, ins), roles[ins - 1], ...roles.slice(ins)]), `roles ${one.plan.plan.map(d => d.role)}`);
    // the ending is kept: the outro is still last, and the added part sits right before it
    if (roles[roles.length - 1] === 'outro') assert(one.plan.plan[one.plan.plan.length - 1].role === 'outro' && one.plan.plan[ins].role !== 'outro', 'outro kept at the end');
    // the steps before the boundary stay, and the added part has moves of its own
    const before = s => JSON.stringify((s.build || []).filter(x => x.at < at));
    assert(before(one.song) === before(g.song), 'steps before the extension changed');
    const a0 = ins * dbl, own = one.song.build.filter(x => x.at >= a0 && x.at < a0 + dbl).map(x => JSON.stringify({ ...x, at: x.at - a0 }));
    const prev = one.song.build.filter(x => x.at >= a0 - dbl && x.at < a0).map(x => JSON.stringify({ ...x, at: x.at - a0 + dbl }));
    assert(own.length && own.join() !== prev.join(), 'the added part repeats the part before it');
    assert(!validateSong(three.song).errors.length, 'extended song is valid');
    assert(JSON.stringify(go(3).song) === JSON.stringify(three.song), 'same extensions gave different songs');
    // extend after end goes before the outro
    const ended = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'end', at }, { kind: 'extend', at }], seed: 'steer-extend', n: 0 });
    assert(ended.plan.plan[ended.plan.plan.length - 1].role === 'outro' && ended.plan.plan.length === d0 + 2, `end then extend: ${ended.plan.plan.map(d => d.role)}`);
    const s = extendSeconds(g.plan);
    assert(s > 10 && s < 80, `seconds per press ${s}`);
    assert(whyNot({ kind: 'extend' }, g.song, g.plan, 10, g.plan.bars - at) === 'transition' && whyNot({ kind: 'extend' }, g.song, g.plan, 10, 0) === null, 'too late once the transition plays');
  },
  'steering: vary gives a part new notes in key and keeps the rest'() {
    const all = varies(200), ideas = {}, types = {};
    assert(all.length === 200, `only ${all.length} varies`);
    for (const { g, type, at, ids, r } of all) {
      types[type] = (types[type] || 0) + 1;
      assert(!validateSong(r.song).errors.length, `vary ${type}: invalid song`);
      // the varied tracks play a new idea from the boundary, in key; the code differs from before
      for (const id of ids) {
        const t = r.song.tracks.find(x => x.id === id), name = Object.keys(t.patterns).filter(x => /^V\d+$/.test(x)).pop();
        assert(name && t.patterns[name].idea, `vary ${type}: ${id} has no new pattern`);
        assert(inKey(t.type, t.patterns[name].idea), `vary ${type}: ${id} out of key ${JSON.stringify(t.patterns[name].idea)}`);
        const step = r.song.build.find(s => s.at === at && s.pattern && s.pattern.track === id);
        assert(step && step.pattern.to === name && step.by === 'listener', `vary ${type}: no listener step for ${id}`);
        assert(!r.song.build.some(s => s.at > at && s.pattern && s.pattern.track === id), `vary ${type}: ${id} goes back to old notes`);
        (ideas[type] = ideas[type] || new Set()).add(JSON.stringify(t.patterns[name].idea));
      }
      assert(compileSong(stateAt(r.song, at + 1).song) !== compileSong(stateAt(g.song, at + 1).song), `vary ${type}: same code at bar ${at + 1}`);
      // the rest of the song is unchanged: sections, the other tracks and their steps
      assert(JSON.stringify(r.song.sections) === JSON.stringify(g.song.sections), `vary ${type}: sections changed`);
      const others = sg => JSON.stringify([sg.tracks.filter(t => !ids.includes(t.id)), sg.build.filter(s => !stepTracks(s).some(id => ids.includes(id))).map(({ say, voice, ...s }) => s)]);
      assert(others(r.song) === others(g.song), `vary ${type}: other tracks or steps changed`);
    }
    // different parts among the varies of each part (a pad varies only its rhythm, register and voicing)
    // (the guitar, a part of its own since radio-arrangement, plays in few styles: counted, not required)
    const share = { lead: 0.6, arp: 0.6, bass: 0.4, pad: 0.2, guitar: 0 };
    assert(VARY_TYPES.filter(t => t !== 'guitar').every(t => types[t] > 5 && ideas[t].size >= share[t] * types[t]), `different parts: ${VARY_TYPES.map(t => `${t} ${ideas[t] && ideas[t].size} of ${types[t]}`).join(', ')}`);
    console.log(`      200 varies, all in key; different parts: ${VARY_TYPES.map(t => `${t} ${ideas[t] ? ideas[t].size : 0} of ${types[t] || 0}`).join(', ')}`);
  },
  'steering: vary is disabled when the part does not play, and reaches locked tracks'() {
    let checked = 0, locked = 0;
    for (const { g, type, at, ids } of varies(60)) {
      const now = at - 1;
      for (const other of VARY_TYPES) {
        const on = varyTracks(playing(stateAt(g.song, at).song), other);
        if (!on.length) { assert(whyNot({ kind: 'vary', type: other }, g.song, g.plan, now) === 'not-playing', `vary ${other}: ${whyNot({ kind: 'vary', type: other }, g.song, g.plan, now)}`); checked++; }
      }
      // a lock keeps the director out, never the listener (radio-arrangement D12): a locked part can be varied
      const plan = { ...g.plan, locked: ids };
      assert(whyNot({ kind: 'vary', type }, g.song, plan, now) === null, `vary ${type} locked: ${whyNot({ kind: 'vary', type }, g.song, plan, now)}`);
      assert(whyNot({ kind: 'vary', type }, g.song, g.plan, now) === null, `vary ${type} allowed`);
      const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'lock', track: ids[0], at: applyBar('lock', now - 1, g.plan) }, { kind: 'vary', type, at }], seed: 'vary-lock', n: 0 });
      if (ids.length === 1 && playing(stateAt(r.song, at).song).some(t => t.id === ids[0])) { assert(r.song.build.some(s => s.at === at && s.pattern && s.pattern.track === ids[0] && s.by === 'listener'), `locked ${ids[0]} not varied`); locked++; }
      assert(whyNot({ kind: 'vary', type }, g.song, g.plan, g.plan.bars - 1) === 'late', 'late at the end');
    }
    assert(checked > 10 && locked > 5, `not-playing ${checked}, locked ${locked}`);
  },
  'steering: vary replays the same, and a cancelled vary leaves the notes'() {
    const { g, type, at } = varies(1)[0], go = (commands, n = 0) => steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands, seed: 'vary-replay', n });
    const cmds = [{ kind: 'vary', type, at }, { kind: 'energy-up', at: applyBar('energy-up', at + 1, g.plan) }, { kind: 'vary', type, at: at + 2 * g.plan.phrase }];
    const a = go(cmds), b = go(JSON.parse(JSON.stringify(cmds)));
    assert(JSON.stringify(a.song) === JSON.stringify(b.song), 'the same varies gave different notes');
    // a recorded session replays the same: each song by its index n
    assert(JSON.stringify(go(cmds, 3).song) === JSON.stringify(go(cmds, 3).song) && JSON.stringify(go(cmds, 3).song) !== JSON.stringify(a.song), 'seeds by song index');
    // the second vary adds V2; the energy change after the first keeps the varied part
    const t = a.song.tracks.find(x => x.patterns.V2);
    assert(t && t.patterns.V1, 'two varies give V1 and V2');
    const on = (sg, bar) => (stateAt(sg, bar).song.tracks.find(x => x.id === t.id).clips[0] || {}).pattern;
    assert(on(a.song, at + 1) === 'V1' && on(a.song, at + 2 * g.plan.phrase + 1) === 'V2', `patterns ${on(a.song, at + 1)} ${on(a.song, at + 2 * g.plan.phrase + 1)}`);
    // cancelled: the song without the vary is the song as it was
    assert(JSON.stringify(go([cmds[1]]).song) === JSON.stringify(go([cmds[1]]).song) && !go([cmds[1]]).song.tracks.some(x => x.patterns.V1), 'a cancelled vary left a pattern');
    assert(JSON.stringify(go([]).song) === JSON.stringify(g.song), 'no command changed the song');
  },
  'steering: vary composes whatever the source, and a pad keeps its chords'() {
    for (const material of ['patterns', 'varied']) {
      const all = varies(40, 'vary', { material });
      assert(all.length === 40, `${material}: only ${all.length} varies`);
      for (const { type, ids, r } of all) for (const id of ids) {
        const t = r.song.tracks.find(x => x.id === id), p = t.patterns[Object.keys(t.patterns).filter(x => /^V\d+$/.test(x)).pop()];
        assert(p && p.idea && !p.preset && p.idea.from === undefined, `${material}: vary ${type} of ${id} did not compose ${JSON.stringify(p)}`);
      }
    }
    // a pad vary keeps the song's chords: no progression of its own, only rhythm, register and voicing
    const pads = varies(200).filter(x => x.type === 'pad');
    assert(pads.length > 5, `only ${pads.length} pad varies`);
    for (const { ids, r } of pads) for (const id of ids) { const t = r.song.tracks.find(x => x.id === id); assert(t.patterns.V1.idea.chords === undefined, `pad ${id} changed the chords ${JSON.stringify(t.patterns.V1.idea)}`); }
  },
  'steering: swap gives a part another ready part, never composed'() {
    const all = varies(120, 'swap'), types = {};
    assert(all.length === 120, `only ${all.length} swaps`);
    for (const { g, type, at, ids, r } of all) {
      types[type] = (types[type] || 0) + 1;
      assert(!validateSong(r.song).errors.length, `swap ${type}: invalid song`);
      for (const id of ids) {
        const t = r.song.tracks.find(x => x.id === id), was = g.song.tracks.find(x => x.id === id), name = Object.keys(t.patterns).filter(x => /^S\d+$/.test(x)).pop();
        const p = name && t.patterns[name], list = t.type === 'guitar' ? g.plan.R.guitar.patterns : g.plan.R[t.type].presets;
        assert(p && !p.idea && list.includes(p.preset), `swap ${type}: ${id} got ${JSON.stringify(p)}`);
        assert(!Object.values(was.patterns).some(x => x.preset === p.preset && !x.idea), `swap ${type}: ${id} got a part it already had (${p.preset})`);
        const step = r.song.build.find(s => s.at === at && s.pattern && s.pattern.track === id);
        assert(step && step.pattern.to === name && step.by === 'listener', `swap ${type}: no listener step for ${id}`);
      }
      const others = sg => JSON.stringify([sg.tracks.filter(t => !ids.includes(t.id)), sg.build.filter(s => !stepTracks(s).some(id => ids.includes(id))).map(({ say, voice, ...s }) => s)]);
      assert(others(r.song) === others(g.song) && JSON.stringify(r.song.sections) === JSON.stringify(g.song.sections), `swap ${type}: the rest of the song changed`);
    }
    assert(VARY_TYPES.filter(t => types[t] > 0).length >= 3, `parts swapped: ${JSON.stringify(types)}`);
    // the same commands give the same part; the song index moves the seed
    const { g, type, at } = all[0], go = n => steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'swap', type, at }, { kind: 'swap', type, at: at + 2 * g.plan.phrase }], seed: 'swap-replay', n });
    assert(JSON.stringify(go(0).song) === JSON.stringify(go(0).song), 'the same swaps gave different parts');
    assert(go(0).song.tracks.some(t => t.patterns.S2), 'two swaps give S1 and S2');
    assert(new Set([0, 1, 2, 3, 4, 5].map(n => JSON.stringify(go(n).song.tracks.map(t => t.patterns.S1 || null)))).size > 1, 'the song index never moves the swap');
    // whyNot: as vary, and no-ready when nothing else fits
    for (const { g, type, at } of all.slice(0, 30)) {
      const now = at - 1;
      for (const other of VARY_TYPES) if (whyNot({ kind: 'vary', type: other }, g.song, g.plan, now) === 'not-playing') assert(whyNot({ kind: 'swap', type: other }, g.song, g.plan, now, 0, g.opts) === 'not-playing', `swap ${other} not-playing`);
      const bare = { ...g.plan, R: Object.fromEntries(Object.entries(g.plan.R).map(([k, v]) => [k, v && typeof v === 'object' && !Array.isArray(v) ? { ...v, presets: [], patterns: [] } : v])) };
      assert(whyNot({ kind: 'swap', type }, g.song, bare, now, 0, {}) === 'no-ready', `swap ${type}: no-ready (${whyNot({ kind: 'swap', type }, g.song, bare, now, 0, {})})`);
    }
    // the user's saved patterns that fit join the pool; one of another style never does
    const line = { id: 'p-line', name: 'Line', type: 'bass', kind: 'bass', styles: ['any'], pattern: { idea: { rhythm: '[~ x]*4' } }, context: { key: 'A' } };
    const riff = { id: 'p-riff', name: 'Riff', type: 'bass', kind: 'bass', styles: ['melodic-metal'], pattern: { idea: { rhythm: 'x*8' } }, context: { key: 'E' } };
    const mine = varies(200, 'swap', { userPatterns: [line, riff] }).filter(x => x.type === 'bass' && x.g.plan.parts.bass !== 'melodic-metal');
    const got = p => mine.filter(({ ids, r }) => ids.some(id => JSON.stringify(r.song.tracks.find(x => x.id === id).patterns.S1) === JSON.stringify(p.pattern))).length;
    assert(mine.length > 5 && got(line) > 0 && got(riff) === 0, `saved patterns: ${got(line)} of ${mine.length} bass swaps took the line, ${got(riff)} the riff`);
  },
  'steering: Add and More complex compose new tracks'() {
    let added = 0, more = 0;
    for (const id of ['synthwave', 'berlin-techno', 'trance', 'jazz', 'lo-fi']) {
      const ses = createSession(STYLES, `compose-${id}`);
      for (let i = 0; i < 6; i++) {
        const g = ses.next({ styles: [id] });
        const melodic = t => ['bass', 'arp', 'hook', 'pad', 'guitar'].includes(t.type);
        // Add of a type the song has no track for: composed ideas, not presets (patterns: presets as before)
        for (const type of ['bass', 'lead', 'pad']) {
          if (whyNot({ kind: 'add', type }, g.song, g.plan, 20)) continue;
          const at = applyBar('add', 20, g.plan), before = new Set(g.song.tracks.map(t => t.id));
          const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'add', type, at }], seed: `compose-${id}`, n: i });
          const parts = { bass: ['bass'], lead: ['arp', 'hook', 'guitar'], pad: ['pad'] }[type];
          const fresh = r.song.tracks.filter(t => !before.has(t.id) && parts.includes(t.type));
          for (const t of fresh) { assert(Object.values(t.patterns).every(p => p.idea && !p.preset) && inKey(t.type, t.patterns.A.idea), `add ${type}: ${t.id} ${JSON.stringify(t.patterns)}`); added++; }
          // with the source "patterns" a track keeps what the plan gave it, a new one its style's presets
          const p = steerSong({ song: g.song, plan: g.plan, opts: { ...g.opts, material: 'patterns' }, commands: [{ kind: 'add', type, at }], seed: `compose-${id}`, n: i });
          for (const t of p.song.tracks.filter(x => !before.has(x.id) && melodic(x))) { const was = g.plan.tracks.find(x => x.id === t.id); assert(was ? JSON.stringify(t.patterns) === JSON.stringify(was.patterns) : Object.values(t.patterns).every(x => !x.idea), `patterns source composed ${t.id}`); }
        }
        // More complex: tracks that come in after it and had not played get composed ideas
        const at = applyBar('more-complex', 10, g.plan);
        const heard = new Set(g.song.build.filter(s => s.at < at).flatMap(s => listOf(s.add)));
        const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [0, 1].map(() => ({ kind: 'more-complex', at })), seed: `compose-${id}`, n: i });
        for (const t of r.song.tracks.filter(x => melodic(x) && !heard.has(x.id))) {
          const was = g.plan.tracks.find(x => x.id === t.id);
          if (Object.values(was.patterns).some(p => p.idea)) continue;
          assert(Object.values(t.patterns).every(p => p.idea && !p.preset), `more complex: ${t.id} ${JSON.stringify(t.patterns)}`);
          more++;
        }
      }
    }
    assert(added >= 5 && more >= 5, `composed tracks: add ${added}, more complex ${more}`);
    for (const c of PLAIN_STEER) assert(sessionHash(plainSteer(c)) === c.songs, `${c.seed}: steered songs at complexity 0 or with patterns changed (${sessionHash(plainSteer(c))})`);
  },
  'steering: curves and complexity shape composed material'() {
    const find = (seed, style, type) => { const ses = createSession(STYLES, seed); for (let i = 0; i < 30; i++) { const x = ses.next({ styles: [style] }); if (!whyNot({ kind: 'vary', type }, x.song, x.plan, 40)) return x; } return null; };
    const N = 40, ns = [...Array(N).keys()];
    // the new idea of a vary at bar 40 after the commands given (null when they took the part out)
    const partOf = (g, type, seed) => (cmds, n) => { const at = applyBar('vary', 40, g.plan); const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [...cmds(at), { kind: 'vary', type, at }], seed, n }); const t = r.song.tracks.find(x => x.patterns.V1); return t ? t.patterns.V1.idea : null; };
    const nums = text => String(text).replace(/[!%*@]\d+/g, '').match(/-?\d+/g).map(Number);
    const perBar = idea => (expandIdea(idea, { type: 'hook', N: 16 }).steps.match(/x/g) || []).length;
    // density: the lead of songs of several styles, varied after the next part's density was set to 0.2 or 0.8 of the
    // most tracks (pairs where the lead still plays at 0.2)
    const pairs = [];
    for (const style of ['synthwave', 'trance', 'melodic-metal', 'phonk']) {
      const ses = createSession(STYLES, `dens-${style}`);
      for (let i = 0; i < 8; i++) {
        const x = ses.next({ styles: [style] });
        if (whyNot({ kind: 'vary', type: 'lead' }, x.song, x.plan, 40)) continue;
        const lead = partOf(x, 'lead', `dens-${style}`), d = Math.floor(applyBar('vary', 40, x.plan) / (2 * x.plan.phrase)), max = densityMax(x.plan);
        for (let n = 0; n < 3; n++) { const [a, b] = [0.2, 0.8].map(v => lead(at => [{ kind: 'curve', curve: 'density', d, value: Math.round(v * max), at }], n)); if (a && b) pairs.push([perBar(a), perBar(b)]); }
      }
    }
    const lo = avg(pairs.map(p => p[0])), hi = avg(pairs.map(p => p[1]));
    assert(pairs.length >= 20 && lo < hi, `notes per bar over ${pairs.length} leads: density 0.2 ${lo}, 0.8 ${hi}`);
    const g = find('shape-lead', 'synthwave', 'lead');
    assert(g, 'no song with a lead');
    const lead = partOf(g, 'lead', 'shape-lead'), d = Math.floor(applyBar('vary', 40, g.plan) / (2 * g.plan.phrase));
    const some = list => list.filter(Boolean);
    const reg = v => avg(some(ns.map(n => lead(at => [{ kind: 'curve', d, value: v, at }], n))).map(i => avg(nums(i.degrees))));
    const low = reg(0.2), high = reg(0.9);
    assert(high > low + 1, `mean degree: energy 0.2 ${low.toFixed(2)}, 0.9 ${high.toFixed(2)}`);
    const cx = (part, kind, read) => avg(some(ns.map(n => part(at => [0, 1, 2].map(() => ({ kind, at })), n))).map(i => new Set(read(i)).size));
    const hookLess = cx(lead, 'less-complex', i => nums(i.degrees)), hookMore = cx(lead, 'more-complex', i => nums(i.degrees));
    assert(hookMore > hookLess, `different degrees: less complex ${hookLess}, more complex ${hookMore}`);
    const b = find('shape-bass', 'berlin-techno', 'bass');
    assert(b, 'no song with a bass');
    const bass = partOf(b, 'bass', 'shape-bass'), notes = i => nums(i.add ?? '0');
    const bassLess = cx(bass, 'less-complex', notes), bassMore = cx(bass, 'more-complex', notes);
    assert(bassMore > bassLess, `different bass notes: less complex ${bassLess}, more complex ${bassMore}`);
    console.log(`      lead notes per bar ${lo.toFixed(2)} / ${hi.toFixed(2)} (density 0.2 / 0.8); mean degree ${low.toFixed(2)} / ${high.toFixed(2)} (energy 0.2 / 0.9); different degrees ${hookLess.toFixed(2)} / ${hookMore.toFixed(2)}, bass notes ${bassLess.toFixed(2)} / ${bassMore.toFixed(2)} (less / more complex)`);
  },
  'arrangement: old add and remove replay as before radio-arrangement'() {
    // a recorded session with add lead, remove drums, add pad and a lock gives the songs heard before (hash recorded
    // with the code before radio-arrangement)
    const out = [];
    for (const [seed, styles] of [['old-a', ['berlin-techno']], ['old-b', ['synthwave', 'jazz']], ['old-c', ['trance', 'phonk']]]) {
      const ses = createSession(STYLES, seed);
      for (let i = 0; i < 2; i++) {
        const g = ses.next({ styles });
        const cmds = [{ kind: 'add', type: 'lead', at: applyBar('add', 20, g.plan) }, { kind: 'remove', type: 'drums', at: applyBar('remove', 36, g.plan) }, { kind: 'add', type: 'pad', at: applyBar('add', 52, g.plan) }, { kind: 'lock', track: 'bass', at: applyBar('lock', 52, g.plan) }];
        out.push(steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: cmds, seed, n: i }).song);
      }
    }
    const h = hashString(JSON.stringify(out)).toString(16).padStart(8, '0');
    assert(h === '9475a713', `old commands give other songs: ${h}`);
  },
  'arrangement: + and − per instrument, several tracks of one instrument'() {
    let checked = 0;
    for (const g of arrSongs(30, 'arr-pm')) {
      const at = applyBar('more', 3 * g.plan.phrase, g.plan);
      if (at >= outroFrom(g.plan) * 2 * g.plan.phrase) continue;
      // a song whose pad is silent: three + then one − leave two pads, the first named Pad
      const pad = onAt(g.song, at).filter(t => instrumentOf(t) === 'pad');
      if (!partHas(g.plan.R, 'pad')) { assert(whyNot({ kind: 'more', part: 'pad' }, g.song, g.plan, at - 1) === (g.plan.tracks.some(t => t.type === 'pad') ? null : 'no-type'), `${g.style}: + pad without pads`); continue; }
      const cmds = [1, 2, 3].map(() => ({ kind: 'more', part: 'pad', at }));
      const three = steerArr(g, cmds), pads = onAt(three.song, at).filter(t => instrumentOf(t) === 'pad');
      assert(pads.length === pad.length + 3, `${g.style}: ${pad.length} pads, then ${pads.map(t => t.id)} after three +`);
      const r = steerArr(g, [...cmds, { kind: 'less', part: 'pad', at }]), left = onAt(r.song, at).filter(t => instrumentOf(t) === 'pad').map(t => t.id);
      assert(left.length === pad.length + 2 && !left.includes(three.plan.added[2].id), `${g.style}: − took ${JSON.stringify(left)} (last added ${three.plan.added[2].id})`);
      if (!pad.length) assert(JSON.stringify(left) === JSON.stringify(['pad', 'pad-2']), `${g.style}: left ${left}`);
      const p2 = r.song.tracks.find(t => t.id === left[1]);
      assert(/^Pad \d$/.test(p2.name), `${g.style}: name ${p2.name}`);
      assert(!validateSong(r.song).errors.length, `${g.style}: ${validateSong(r.song).errors.slice(0, 2).map(e => `${e.path}: ${e.msg}`)}`);
      compileSong(stateAt(r.song, at + 1).song);
      // a lock never disables + or − (D12); − on a part that does not play
      const locked = { ...r.plan, lockedParts: ['pad'] };
      assert(whyNot({ kind: 'more', part: 'pad' }, r.song, locked, at + 1) === null && whyNot({ kind: 'less', part: 'pad' }, r.song, locked, at + 1) === null, `${g.style}: a lock disabled + or −`);
      const silent = ARR_PARTS.find(p => !onAt(g.song, at).some(t => instrumentOf(t) === p));
      if (silent) assert(whyNot({ kind: 'less', part: silent }, g.song, g.plan, at - 1) === 'not-playing', `${g.style}: − ${silent}`);
      // the same commands give the same song
      assert(JSON.stringify(steerArr(g, [...cmds, { kind: 'less', part: 'pad', at }]).song) === JSON.stringify(r.song), `${g.style}: replay`);
      checked++;
    }
    assert(checked >= 15, `only ${checked} songs`);
  },
  'arrangement: a second track sounds different, an octave away, in key'() {
    let n = 0, apart = 0, octave = 0, composed = 0;
    for (const g of arrSongs(80, 'arr-var')) {
      for (const part of ['arp', 'hook', 'bass', 'pad', 'guitar']) {
        const at = applyBar('more', 2 * g.plan.phrase, g.plan), first = onAt(g.song, at).filter(t => instrumentOf(t) === part);
        if (first.length !== 1 || whyNot({ kind: 'more', part }, g.song, g.plan, at - 1)) continue;
        const r = steerArr(g, [{ kind: 'more', part, at }]), id = r.plan.added[0].id, a = r.song.tracks.find(t => t.id === first[0].id) || g.song.tracks.find(t => t.id === first[0].id), b = r.song.tracks.find(t => t.id === id);
        assert(b && id !== a.id && onAt(r.song, at).some(t => t.id === id), `${g.style} ${part}: no second track`);
        const sound = t => JSON.stringify([t.settings.wave, t.settings.type, t.rack || []]), pats = t => JSON.stringify(Object.values(t.patterns));
        if (sound(a) !== sound(b) || pats(a) !== pats(b)) apart++;
        assert(b.settings.gain < a.settings.gain || part === 'bass' && b.settings.gain <= a.settings.gain * 0.6 + 0.01, `${g.style} ${part}: gain ${a.settings.gain} then ${b.settings.gain}`);
        // the register: an octave up (hook octave, guitar semitones, composed ideas +12 or +7 degrees), every note in key
        if (part === 'hook') { assert(Number(b.settings.octave) === Math.min(6, (Number(a.settings.octave) || 4) + 1), `${g.style} hook octave ${a.settings.octave} ${b.settings.octave}`); octave++; }
        else if (part === 'guitar') { assert(Math.abs(Number(b.settings.octave) - (Number(a.settings.octave) || 0)) === 12, `guitar octave ${a.settings.octave} ${b.settings.octave}`); octave++; }
        else if (Object.values(b.patterns).some(p => p.idea)) {
          composed++;
          for (const p of Object.values(b.patterns)) {
            const i = p.idea;
            assert(i && (typeof i.add === 'number' && i.add >= 7 || typeof i.sub === 'number' && i.sub < (part === 'bass' && i.from !== undefined ? 21 : 0)), `${g.style} ${part}: not shifted ${JSON.stringify(i)}`);
            assert(inKey(b.type, { ...i, add: typeof i.add === 'number' ? undefined : i.add }), `${g.style} ${part}: out of key ${JSON.stringify(i)}`);
          }
          octave++;
        }
        assert(!validateSong(r.song).errors.length, `${g.style} ${part}: invalid`);
        compileSong(stateAt(r.song, at + 1).song);
        n++;
      }
    }
    assert(n >= 50 && apart === n && octave >= n * 0.8, `${n} second tracks, ${apart} differ, ${octave} an octave away (${composed} composed)`);
    console.log(`      ${n} second tracks, all different in sound or pattern, ${octave} an octave away, ${composed} composed`);
  },
  'arrangement: limits, recommended counts as warnings, two kicks on different grooves'() {
    let kicks = 0, other = 0, capped = 0, k = 0;
    for (const g of arrSongs(50, 'arr-lim')) {
      k++;
      const at = applyBar('more', 2 * g.plan.phrase, g.plan);
      if (partHas(g.plan.R, 'kick') && onAt(g.song, at).some(t => t.id === 'kick')) {
        const w = moreWarning('kick', g.song, g.plan, at - 1);
        assert(w && w.count === 2 && w.rec === 1 && whyNot({ kind: 'more', part: 'kick' }, g.song, g.plan, at - 1) === null, `${g.style}: + kick ${JSON.stringify(w)}`);
        const r = steerArr(g, [{ kind: 'more', part: 'kick', at }]), k2 = r.song.tracks.find(t => t.id === r.plan.added[0].id), k1 = r.song.tracks.find(t => t.id === 'kick');
        // (the kick's pattern playing on the boundary against the second kick's first one)
        const cur = stateAt(r.song, at).song.tracks.find(t => t.id === 'kick'), bdOf = p => (p.rows ? p.rows.bd : p.idea && p.idea.beat ? `${p.idea.beat.grid}:${p.idea.beat.bd}` : null);
        const rows = t => JSON.stringify(t === k2 ? bdOf(t.patterns.A) : bdOf(t.patterns[(cur.clips[0] || {}).pattern || 'A'] || t.patterns.A));
        const bds = new Set(g.plan.R.drums.grooves.map(x => (GROOVES[x] || [])[1]).filter(Boolean).map(x => x.bd).filter(x => x && x.includes('x')));
        kicks++;
        if (bds.size > 1) { assert(rows(k1) !== rows(k2), `${g.style}: two kicks on the same steps`); other++; }
        assert(k2.settings.gain <= Math.round(k1.settings.gain * 75 + 1) / 100, `${g.style}: kick 2 gain ${k2.settings.gain}`);
      }
      // the cap: 12 tracks, then every + is disabled; the song's maximum follows the listener (on 15 songs)
      if (k > 15) continue;
      const { r } = stack12(g, at), n = onAt(r.song, at).filter(t => t.type !== 'riser').length;
      if (n === TRACK_CAP) {
        capped++;
        assert(ARR_PARTS.every(p => whyNot({ kind: 'more', part: p }, r.song, r.plan, at - 1) === (r.song.tracks.some(t => instrumentOf(t) === p) || partHas(g.plan.R, p) ? 'cap' : 'no-type')), `${g.style}: + at 12 tracks`);
        assert(r.plan.hardMax >= TRACK_CAP && densityMax(r.plan) >= Math.min(TRACK_CAP, r.plan.tracks.filter(t => t.type !== 'riser').length), `${g.style}: hardMax ${r.plan.hardMax}`);
        assert(!validateSong(r.song).errors.length, `${g.style}: 12 tracks invalid`);
      }
    }
    assert(kicks >= 20 && other >= 10 && capped >= 12, `kicks ${kicks}, on another groove ${other}, capped ${capped}`);
    console.log(`      ${kicks} second kicks (${other} on another groove), ${capped} songs stacked to ${TRACK_CAP} tracks`);
  },
  "arrangement: the owner's test, a track added with + stays until the outro"() {
    let n = 0, sat = 0;
    for (const g of arrSongs(50, 'arr-stay')) {
      const ph = g.plan.phrase, dbl = 2 * ph, end = outroFrom(g.plan) * dbl, rng = stream(g.seed, 'arr-stay');
      for (const part of ARR_PARTS) {
        if (!partHas(g.plan.R, part) && !g.plan.tracks.some(t => instrumentOf(t) === part)) continue;
        const now = rng.int(1, Math.max(1, end / ph - 3)) * ph - 1, at = applyBar('more', now, g.plan);
        if (at >= end - ph || whyNot({ kind: 'more', part }, g.song, g.plan, now)) continue;
        const r = steerArr(g, [{ kind: 'more', part, at }]), id = r.plan.added[0].id;
        const roleAt = b => r.plan.plan[Math.floor(b / dbl)].role;
        assert(onAt(r.song, at).some(t => t.id === id), `${g.style} ${part}: not playing on the next phrase (${at})`);
        if (at + 2 * ph < end && roleAt(at + 2 * ph) !== 'break') assert(onAt(r.song, at + 2 * ph).some(t => t.id === id), `${g.style} ${part}: gone two phrases later`);
        for (let b = at; b < Math.min(end, r.plan.bars - ph); b += ph) {
          const on = onAt(r.song, b).some(t => t.id === id);
          if (roleAt(b) === 'break') { if (!on) sat++; continue; }
          assert(on, `${g.style} ${part} ${id}: silent on bar ${b} (${roleAt(b)}), added on ${at}`);
        }
        n++;
      }
    }
    assert(n >= 250, `only ${n} additions`);
    console.log(`      ${n} additions over 50 songs and every style, each playing up to the outro (${sat} phrases sat out in breaks)`);
  },
  'arrangement: a lock per instrument'() {
    let n = 0;
    for (const g of arrSongs(40, 'arr-lock')) {
      const at = applyBar('lock-part', 2 * g.plan.phrase, g.plan);
      // (the bass playing before the boundary: a lock keeps a silent bass out, D12)
      if (!onAt(g.song, at - 1).some(t => t.type === 'bass')) continue;
      const r = steerArr(g, [{ kind: 'lock-part', part: 'bass', at }]), bass = onAt(g.song, at - 1).filter(t => t.type === 'bass').map(t => t.id);
      assert(bass.every(id => lockedIds(r.plan).includes(id)), `${g.style}: bass not locked`);
      // the director leaves the bass alone and it plays through breaks to the end
      const touched = r.song.build.filter(s => s.at >= at && !s.by && stepTracks(s).some(id => bass.includes(id)));
      assert(!touched.length, `${g.style}: the director moved a locked bass: ${JSON.stringify(touched[0])}`);
      for (let b = at; b < r.plan.bars; b += g.plan.phrase) assert(bass.every(id => onAt(r.song, b).some(t => t.id === id)), `${g.style}: locked bass silent on bar ${b}`);
      // + on a locked bass: a second bass, locked as well
      const at2 = at + g.plan.phrase, r2 = steerArr(g, [{ kind: 'lock-part', part: 'bass', at }, { kind: 'more', part: 'bass', at: at2 }]), b2 = r2.plan.added[0].id;
      assert(lockedIds(r2.plan).includes(b2) && onAt(r2.song, r2.plan.bars - 1).some(t => t.id === b2), `${g.style}: second bass ${b2} not locked or gone`);
      // the mixer unlocks one track: that one only, the instrument keeps the other locked one by one
      const r3 = steerArr(g, [{ kind: 'lock-part', part: 'bass', at }, { kind: 'more', part: 'bass', at: at2 }, { kind: 'unlock', track: b2, at: at2 }]);
      assert(!lockedIds(r3.plan).includes(b2) && bass.every(id => lockedIds(r3.plan).includes(id)) && !(r3.plan.lockedParts || []).includes('bass'), `${g.style}: mixer unlock ${JSON.stringify([r3.plan.locked, r3.plan.lockedParts])}`);
      const r4 = steerArr(g, [{ kind: 'lock-part', part: 'bass', at }, { kind: 'unlock-part', part: 'bass', at: at2 }]);
      assert(!lockedIds(r4.plan).length, `${g.style}: unlock-part left ${lockedIds(r4.plan)}`);
      n++;
    }
    assert(n >= 15, `only ${n} songs with a bass`);
  },
  'arrangement: a riser on the next part change'() {
    let n = 0, own = 0;
    for (const g of arrSongs(40, 'arr-riser')) {
      const ph = g.plan.phrase, now = 2 * ph + 1, at = applyBar('riser', now, g.plan);
      for (const [bars, dir] of [['auto', 'up'], [4, 'up'], [2, 'down']]) {
        const cmd = { kind: 'riser', bars, dir, sound: 'noise' }, tg = riserTarget(g.plan, at, cmd);
        if (!tg) { assert(whyNot(cmd, g.song, g.plan, now) === 'late', `${g.style}: no target, not late`); continue; }
        const r = steerArr(g, [{ ...cmd, at }]), id = r.plan.risers[0].track;
        const role = d => g.plan.plan[d].role, d = tg.change / (2 * ph);
        assert(d > 0 && (role(d) !== role(d - 1) || !g.plan.plan.some((x, i) => i > 0 && i * 2 * ph - at >= 2 && x.role !== g.plan.plan[i - 1].role)), `${g.style}: change on ${tg.change} is not a part change`);
        assert(dir === 'up' ? tg.end === tg.change && tg.start === tg.change - tg.bars : tg.start === tg.change, `${g.style}: ${JSON.stringify(tg)}`);
        assert(onAt(r.song, tg.start).some(t => t.id === id) && onAt(r.song, tg.end - 1).some(t => t.id === id) && (tg.end >= r.plan.bars || !onAt(r.song, tg.end).some(t => t.id === id)), `${g.style}: riser not on ${tg.start} to ${tg.end}`);
        const st = stateAt(r.song, tg.start).song.tracks.find(t => t.id === id);
        assert(String(st.settings.bars) === String(tg.bars) && st.settings.dir === dir, `${g.style}: riser settings ${JSON.stringify(st.settings)}`);
        // one riser per change: the director adds none in the phrase before it
        const adds = r.song.build.filter(s => listOf(s.add).includes(id) && s.at >= tg.start - ph && s.at < tg.end);
        assert(adds.length === 1 && adds[0].by === 'listener', `${g.style}: risers on that change ${JSON.stringify(adds)}`);
        if (!g.plan.tracks.some(t => t.type === 'riser')) { own++; assert(r.song.build.filter(s => stepTracks(s).includes(id)).every(s => s.by === 'listener'), `${g.style}: the director used the listener's riser`); }
        assert(!validateSong(r.song).errors.length, `${g.style}: invalid with a riser`);
        compileSong(stateAt(r.song, tg.start).song);
        assert(JSON.stringify(steerArr(g, [{ ...cmd, at }]).song) === JSON.stringify(r.song), `${g.style}: riser replay`);
        n++;
      }
      // the riser lock keeps the director's risers out of the song
      const riser = g.plan.tracks.find(t => t.type === 'riser');
      if (riser) { const r = steerArr(g, [{ kind: 'lock-part', part: 'riser', at }]); assert(!r.song.build.some(s => s.at >= at && !s.by && listOf(s.add).includes(riser.id)), `${g.style}: the director placed a riser with the lock closed`); }
    }
    assert(n >= 60 && own >= 10, `${n} risers, ${own} in styles without one`);
    console.log(`      ${n} risers placed (${own} in styles without a riser)`);
  },
  'arrangement: headroom as tracks add up, a volume set by hand kept'() {
    let n = 0;
    for (const g of arrSongs(12, 'arr-head')) {
      const at = applyBar('more', 2 * g.plan.phrase, g.plan), { r, cmds } = stack12(g, at), on = onAt(r.song, at).filter(t => t.type !== 'riser');
      if (on.length <= g.plan.usualHigh) continue;
      const f = Math.sqrt(r.plan.usualHigh / on.length), st = stateAt(r.song, at).song;
      for (const t of on) { const own = r.song.tracks.find(x => x.id === t.id).settings.gain; assert(Math.abs(st.tracks.find(x => x.id === t.id).settings.gain - Math.round(own * f * 100) / 100) <= 0.011, `${g.style}: ${t.id} gain ${st.tracks.find(x => x.id === t.id).settings.gain}, own ${own}, factor ${f.toFixed(2)}`); }
      // a volume set in the mixer stays as set
      const pin = on[0].id, v = steerArr(g, [...cmds, { kind: 'volume', track: pin, value: 0.42, at: at + 1 }]);
      for (let b = at + g.plan.phrase; b < v.plan.bars; b += g.plan.phrase) { const x = stateAt(v.song, b).song.tracks.find(t => t.id === pin); assert(x.settings.gain === 0.42, `${g.style}: pinned gain ${x.settings.gain} on ${b}`); }
      // fewer tracks, the gains come back
      const last = r.song.build.filter(s => s.set && s.set.gain !== undefined && s.at > at);
      assert(!validateSong(r.song).errors.length && last.every(s => s.set.gain <= r.song.tracks.find(t => t.id === s.set.track).settings.gain + 0.001), `${g.style}: a gain above its own`);
      n++;
    }
    assert(n >= 9, `only ${n} songs`);
  },
  'arrangement: extra buses skip the spoken and narrator orbits, every track its own'() {
    let n = 0;
    for (const g of arrSongs(20, 'arr-bus', { voice: { presence: 'always' } })) {
      const at = applyBar('more', 2 * g.plan.phrase, g.plan), { r } = stack12(g, at);
      const song = { ...stateAt(r.song, at).song };
      const code = compileSong(song), spoken = r.song.tracks.some(t => t.type === 'spoken');
      const orbits = [];
      for (const t of song.tracks.filter(x => !x.mute && x.type !== 'voice' && x.type !== 'spoken')) {
        const i = code.indexOf(`// ========== ${[...new Set([t.name || t.id, t.type])].join(' · ')} ==========`);
        if (i < 0) continue;
        const m = code.slice(i).match(/\.orbit\((\d+)\)/);
        orbits.push(Number(m[1]));
      }
      assert(new Set(orbits).size === orbits.length, `${g.style}: shared buses ${orbits}`);
      assert(!orbits.some(o => o === 15 || (spoken && (o === 13 || o === 14))), `${g.style}: a track on a voice bus ${orbits}`);
      if (spoken) n++;
    }
    assert(n >= 3, `only ${n} songs with a spoken track`);
  },
  'arrangement: the target of Vary and Swap, Auto takes turns'() {
    let n = 0, named = 0;
    for (const g of arrSongs(40, 'arr-target')) {
      const ph = g.plan.phrase, at = applyBar('more', 2 * ph, g.plan);
      if (whyNot({ kind: 'more', part: 'arp' }, g.song, g.plan, at - 1)) continue;
      // (the arps locked, so the director keeps both on the boundaries of the check; + twice: two arps at least)
      const base = [{ kind: 'lock-part', part: 'arp', at }, { kind: 'more', part: 'arp', at }, { kind: 'more', part: 'arp', at }], two = steerArr(g, base), arps = onAt(two.song, at + ph).filter(t => t.type === 'arp').map(t => t.id);
      if (arps.length < 2 || at + 3 * ph >= outroFrom(g.plan) * 2 * ph) continue;
      const v1 = { kind: 'vary', type: 'arp', target: 'auto', at: at + ph }, v2 = { kind: 'vary', type: 'arp', target: 'auto', at: at + 2 * ph };
      const r = steerArr(g, [...base, v1, v2]);
      const hit = c => r.song.build.filter(s => s.at === c.at && s.by === 'listener' && s.pattern && /^V\d+$/.test(s.pattern.to)).map(s => s.pattern.track);
      const a = hit(v1), b = hit(v2);
      // (the second press takes the other arp when both play on its boundary)
      const both = arps.every(id => onAt(r.song, v2.at).some(t => t.id === id));
      assert(a.length === 1 && b.length === 1 && arps.includes(a[0]) && (a[0] !== b[0] || !both), `${g.style}: Auto varied ${a} then ${b} of ${arps}`);
      if (!both) continue;
      assert(JSON.stringify(steerArr(g, [...base, v1, v2]).song) === JSON.stringify(r.song), `${g.style}: replay of Auto varies`);
      // a named target: that track only; a target that does not play: not-playing
      const one = steerArr(g, [...base, { kind: 'swap', type: 'arp', target: arps[1], at: at + ph }]);
      const sw = one.song.build.filter(s => s.at === at + ph && s.by === 'listener' && s.pattern && /^S\d+$/.test(s.pattern.to)).map(s => s.pattern.track);
      if (!whyNot({ kind: 'swap', type: 'arp', target: arps[1] }, two.song, two.plan, at + ph - 1, 0, g.opts)) { assert(sw.length === 1 && sw[0] === arps[1], `${g.style}: Swap of ${arps[1]} rewrote ${sw}`); named++; }
      assert(whyNot({ kind: 'vary', type: 'arp', target: 'nope' }, two.song, two.plan, at + ph - 1) === 'not-playing', `${g.style}: a target that does not play`);
      // a command without a target rewrites every track of the part, as before
      const all = steerArr(g, [...base, { kind: 'vary', type: 'arp', at: at + ph }]);
      assert(all.song.build.filter(s => s.at === at + ph && s.by === 'listener' && s.pattern && /^V\d+$/.test(s.pattern.to)).length === arps.length, `${g.style}: a vary without target`);
      n++;
    }
    assert(n >= 8 && named >= 3, `${n} songs with two arps, ${named} named swaps`);
    console.log(`      ${n} songs with two arps: Auto takes them in turn, ${named} swaps of a named track`);
  },
  'arrangement: a saved pattern on air, new or in place of a track, in the song key, replayed as heard'() {
    // a bassline saved in A minor (the song format writes parts in A; the compiler moves them to the section's key)
    const item = { id: 'mine-1', name: 'Basso mio', kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' }, sound: 'sawtooth', settings: { wave: 'sawtooth', gain: 0.7 }, styles: ['jazz'], context: { key: 'A', chords: 'notturna', meter: '4/4', bpm: 128, mode: 'minor' } };
    let n = 0, rep = 0, inD = 0;
    for (const g of arrSongs(40, 'arr-saved')) {
      const at = applyBar('pattern', 2 * g.plan.phrase, g.plan);
      if (!fitsAir(item, g.plan, g.song)) { assert(whyNot({ kind: 'pattern', mode: 'new', item }, g.song, g.plan, at - 1) === 'no-fit', `${g.style}: no-fit`); continue; }
      const cmd = { kind: 'pattern', mode: 'new', item: JSON.parse(JSON.stringify(item)), at };
      const r = steerArr(g, [cmd]), id = r.plan.added[0].id, t = r.song.tracks.find(x => x.id === id);
      assert(t && t.type === 'bass' && JSON.stringify(t.patterns.A) === JSON.stringify(item.pattern) && t.settings.wave === 'sawtooth', `${g.style}: new bass ${JSON.stringify(t && t.patterns)}`);
      assert(onAt(r.song, at).some(x => x.id === id) && onAt(r.song, at + 2 * g.plan.phrase).some(x => x.id === id), `${g.style}: the saved bassline does not stay`);
      // in the song's key: the compiled bass line of the new track transposes by the section's key
      const sec = stateAt(r.song, at + 1).song, code = compileSong(sec), key = (r.song.sections.reduce((a, s) => (a.at <= at ? { at: a.at + s.bars, s } : a), { at: 0, s: null }).s || {}).key;
      const shift = (KEYS.find(k => k[0] === key) || [key, 0])[1];
      const block = code.slice(code.indexOf(`// ========== ${t.name}`));
      assert(shift === 0 || block.includes(`.transpose(${shift - 24})`) || block.includes(`transpose(${shift}`), `${g.style}: bass in ${key} not transposed (${shift}): ${block.slice(0, 200)}`);
      if (key === 'D') inD++;
      // the library changes later: the command holds its own copy, the replay sounds the same
      const again = steerArr(g, [JSON.parse(JSON.stringify(cmd))]);
      item.pattern.preset = 'gallop'; assert(JSON.stringify(steerArr(g, [JSON.parse(JSON.stringify(cmd))]).song) === JSON.stringify(again.song), `${g.style}: replay depends on the library`); item.pattern.preset = 'rolling';
      assert(!validateSong(r.song).errors.length, `${g.style}: invalid`);
      // in place of the playing bass: a P1 pattern on it, the track keeps its sound
      const bass = onAt(g.song, at).find(x => x.type === 'bass');
      if (bass) {
        const rr = steerArr(g, [{ kind: 'pattern', mode: 'replace', target: bass.id, item: JSON.parse(JSON.stringify(item)), at }]);
        const b2 = rr.song.tracks.find(x => x.id === bass.id), step = rr.song.build.find(s => s.at === at && s.by === 'listener' && s.pattern && s.pattern.track === bass.id);
        assert(step && step.pattern.to === 'P1' && JSON.stringify(b2.patterns.P1) === JSON.stringify(item.pattern) && b2.settings.wave === g.song.tracks.find(x => x.id === bass.id).settings.wave, `${g.style}: replace ${JSON.stringify(step)}`);
        assert(JSON.stringify(rr.song.sections) === JSON.stringify(g.song.sections), `${g.style}: replace changed the sections`);
        rep++;
      }
      n++;
    }
    // a 7/8 pattern never fits a 4/4 song
    const odd = { ...item, context: { ...item.context, meter: '7/8' } }, g0 = arrSongs(1, 'arr-saved')[0];
    if (g0.plan.meter !== '7/8') assert(!fitsAir(odd, g0.plan, g0.song), '7/8 in 4/4');
    assert(n >= 15 && rep >= 8, `${n} songs took the bassline, ${rep} replaced`);
    console.log(`      ${n} songs took a saved bassline as a new track (${inD} in D), ${rep} in place of their bass; replays hold their own copy`);
  },
  'steering: one vary takes less than 20 ms'() {
    const all = varies(40), times = all.map(({ g, type, at }) => { const t0 = performance.now(); steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'vary', type, at }], seed: 'vary-time', n: 1 }); return performance.now() - t0; }).sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)], max = times[times.length - 1];
    assert(max < 20, `slowest vary ${max.toFixed(1)} ms`);
    console.log(`      vary: median ${median.toFixed(2)} ms, slowest ${max.toFixed(2)} ms over ${times.length}`);
  },
  'radio: a session continues after a song from Compose'() {
    const song = JSON.parse(fs.readFileSync(new URL('../songs/ferro.json', import.meta.url), 'utf8'));
    const lead = leadEntry(song), ses = createSession(STYLES, 'lead-check', { lead });
    const styles = stylesNear(song, STYLES);
    assert(styles.length && styles.every(id => byId[id]), `styles near ${song.id}: ${styles}`);
    const g = ses.next({ styles, harmony: 'compatible' });
    const semis = k => (KEYS.find(x => x[0] === k) || [k, 0])[1], d = ((semis(g.entry.key) - semis(lead.key)) % 12 + 12) % 12;
    assert(Math.abs(g.entry.bpm - lead.bpm) <= MAX_RAMP || !g.plan.R.tempo.some(b => Math.abs(b - lead.bpm) <= MAX_RAMP), `tempo ${lead.bpm} then ${g.entry.bpm}`);
    assert([0, 5, 7].includes(d) || !g.plan.R.keys.some(k => [5, 7].includes(((semis(k) - semis(lead.key)) % 12 + 12) % 12)), `key ${lead.key} then ${g.entry.key}`);
    assert(lead.transition && TRANSITION_KINDS.includes(lead.transition.kind), 'transition from the lead planned');
    const again = createSession(STYLES, 'lead-check', { lead: leadEntry(song) }).next({ styles, harmony: 'compatible' });
    assert(JSON.stringify(again.song) === JSON.stringify(g.song), 'same lead and seed gave different songs');
    // styles: tags first, then genres, then tempo
    assert(stylesNear({ ...song, tags: { styles: ['phonk'] } }, STYLES).join() === 'phonk', 'tagged style');
    const jazz = stylesNear({ ...song, tags: { genres: ['jazz'] } }, STYLES);
    assert(jazz.length && jazz.every(id => byId[id].genre === 'jazz'), `genre jazz: ${jazz}`);
    const free = stylesNear({ ...song, tags: {} }, STYLES);
    assert(free.length >= 1 && free.length <= 3, `by tempo: ${free}`);
  },
  'docs: ENDLESS.md has a check for every rule'() {
    const doc = fs.readFileSync(new URL('../docs/ENDLESS.md', import.meta.url), 'utf8');
    const listed = [...doc.matchAll(/`((?:director|determinism|radio|artists|transitions|steering): [^`]+)`/g)].map(m => m[1]);
    for (const n of listed) assert(CHECKS[n], `docs/ENDLESS.md names a check that does not exist: ${n}`);
    for (const n of Object.keys(CHECKS).filter(k => /^(director|determinism|radio|artists|transitions|steering):/.test(k))) assert(listed.includes(n), `check not listed in docs/ENDLESS.md: ${n}`);
  },
};

// --only <text>: run only the checks whose name holds the text
const onlyArg = process.argv.indexOf('--only'), only = onlyArg >= 0 ? process.argv[onlyArg + 1] : null;
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS).filter(([n]) => !only || n.includes(only))) {
  const t0 = performance.now();
  try { fn(); console.log(`ok    ${name}${process.env.CHECK_TIME ? ` (${((performance.now() - t0) / 1000).toFixed(1)} s)` : ''}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); if (process.env.CHECK_STACK) console.log(e.stack); }
}
console.log(`${Object.keys(CHECKS).filter(n => !only || n.includes(only)).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
