// Checks for the endless director and style recipes (docs/ENDLESS.md, docs/STYLES.md).
//   npm run check:endless      run every check; exit 1 when any fails
// Each check is a named function that throws on failure. New checks go in CHECKS.
import { stream, makeRng, STREAMS, hashString } from '../src/endless/random.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { validateRecipe, withDefaults, PART_NAMES, TOP_FIELDS, INSTRUMENTS, SHAPES, RECIPE_DEFAULTS } from '../src/endless/recipe.js';
import { mixParts, stylesOf } from '../src/endless/mix.js';
import { loadStyles } from './styles-dir.mjs';
import { generateSession, createSession } from '../src/endless/director.js';
import { windowSong } from '../src/endless/join.js';
import { compileSong } from '../src/song/compile.js';
import { validateSong } from '../src/song/validate.js';
import { stateAt, buildSteps } from '../src/song/build.js';
import { playing, energyOf } from '../src/endless/energy.js';
import { chordTonesOnly, degreesOnly } from '../src/endless/mutate.js';
import { partsKey } from '../src/endless/mix.js';
import { allPhrases } from '../src/endless/phrases.js';
import { GROOVES, BASS, ARPS, HOOKS } from '../src/music.js';

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
        for (const r of Object.values(p.rows || {})) assert(grooveRows.has(r), `${id} ${t.id}: drum row ${r} is not from a groove`);
      }
      for (const song of session({ styles: [id], minutes: 8, seed: 'wild', complexity: 1 }).songs) for (const t of song.tracks) for (const p of Object.values(t.patterns)) {
        if (p.notes === undefined) continue;
        if (t.type === 'hook') assert(degreesOnly(p.notes), `${id} hook notes not scale degrees: ${p.notes}`);
        else assert(chordTonesOnly(p.notes), `${id} ${t.type} notes not chord tones: ${p.notes}`);
      }
    }
    const mutated = STARTING.flatMap(id => session({ styles: [id], minutes: 8, seed: 'wild', complexity: 1 }).songs.flatMap(s => s.tracks.flatMap(t => Object.values(t.patterns)))).filter(p => p.notes).length;
    assert(mutated > 10, `only ${mutated} mutated patterns at complexity 1`);
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
      assert(joined.sections.reduce((a, x) => a + x.bars, 0) === s.songs.reduce((a, e) => a + e.bars, 0), 'joined song length differs');
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
  'docs: ENDLESS.md has a check for every rule'() {
    const doc = fs.readFileSync(new URL('../docs/ENDLESS.md', import.meta.url), 'utf8');
    const listed = [...doc.matchAll(/`((?:director|determinism|radio): [^`]+)`/g)].map(m => m[1]);
    for (const n of listed) assert(CHECKS[n], `docs/ENDLESS.md names a check that does not exist: ${n}`);
    for (const n of Object.keys(CHECKS).filter(k => /^(director|determinism|radio):/.test(k))) assert(listed.includes(n), `check not listed in docs/ENDLESS.md: ${n}`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
