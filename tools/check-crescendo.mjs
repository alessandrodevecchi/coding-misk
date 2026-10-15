// Checks for Crescendo (#64), the live build that grows a song in small steps. No browser.
// Every song in songs/ is built in crescendo and checked: same seed same build, every growth step on one track,
// one track per bar, every state compiles, the state after the growth compiles to the song as written (with its
// growth span), length within three times the written one, endings not all alike, no function the compiler does not
// already emit. Fixtures: a fingerprint of the steps per song; a change means CRESCENDO_VERSION must go up.
//   npm run check:crescendo            exit 1 when any check fails
//   npm run check:crescendo -- --write rewrite the fixtures (after raising CRESCENDO_VERSION)
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { songFiles } from './songs-dir.mjs';
import { compileSong } from '../src/song/compile.js';
import { fromScenes, normalizeSong } from '../src/song/format.js';
import { pickFragments } from '../src/video/fragments.js';
import { compileCompact, layersOf } from '../src/song/compile-compact.js';
import { buildSteps, stateAt, checkBuild, stepTrack, buildMap } from '../src/song/build.js';
import { crescendoSong, patternVariants, CRESCENDO_VERSION } from '../src/song/crescendo.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const FIXTURES = 'tools/fixtures/crescendo.json';
const songs = songFiles('songs').filter(f => !f.includes('/endless/')).map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
  .map(s => (s.scenes ? fromScenes(s) : s)).filter(s => Array.isArray(s.sections) && s.sections.length);
const built = new Map(songs.map(s => [s.id, crescendoSong(s)]));
const total = s => s.sections.reduce((a, x) => a + x.bars, 0);
const fns = code => new Set([...code.matchAll(/\.([a-zA-Z]+)\(/g)].map(m => m[1]));
const print = s => createHash('sha256').update(JSON.stringify({ b: s.build, p: s.tracks.map(t => t.patterns), x: s.sections })).digest('hex').slice(0, 16);

const CHECKS = {
  'drum rows thin out: the simplest keeps the kick on the first beat'() {
    const [v1, , v3] = patternVariants('drums', { rows: { bd: 'x...x...x...x...', hh: 'xxxxxxxxxxxxxxxx' } }, 3);
    assert(JSON.stringify(v3.rows) === JSON.stringify({ bd: 'x...............' }), `simplest: ${JSON.stringify(v3.rows)}`);
    const hits = r => Object.values(r).join('').split('x').length - 1;
    assert(hits(v1.rows) > hits(v3.rows) && hits(v1.rows) < 20, 'in between');
  },
  'written notes thin out, rests stay'() {
    const v = patternVariants('bass', { notes: '0 ~ 0 3 ~ 0 3 ~ 0 ~ 0 3 ~ 2 ~ 1' }, 2);
    assert(v[1].notes.split(' ').length === 16 && v[1].notes.split(' ').filter(x => x !== '~').length === 2, v[1].notes);
  },
  'same song and seed, same build'() {
    for (const s of songs) assert(JSON.stringify(crescendoSong(s)) === JSON.stringify(built.get(s.id)), s.id);
    const a = songs[0], b = crescendoSong(a, { seed: 'other' });
    assert(JSON.stringify(b.build) !== JSON.stringify(built.get(a.id).build), 'another seed changes the build');
  },
  'steps are valid live build steps'() {
    for (const c of built.values()) {
      const errs = []; checkBuild(c, total(c), (p, m) => errs.push(`${p}: ${m}`), () => {});
      assert(!errs.length, `${c.id}: ${errs[0]}`);
    }
  },
  'every growth step changes one track; a bar holds one track'() {
    for (const c of built.values()) {
      const byBar = new Map();
      for (const s of buildSteps(c)) {
        if (s.at === 0 || s.at >= c.crescendo.growth + c.crescendo.written) continue;
        assert(!Array.isArray(s.add) && !Array.isArray(s.remove), `${c.id} bar ${s.at}: one track`);
        const tr = stepTrack(s);
        assert(!byBar.has(s.at) || byBar.get(s.at) === tr, `${c.id} bar ${s.at}: two tracks on one bar`);
        byBar.set(s.at, tr);
      }
    }
  },
  'every state compiles and uses only functions the compiler emits'() {
    for (const c of built.values()) {
      const written = songs.find(s => s.id === c.id), known = fns(compileSong(written));
      ['degradeBy', 'echo', 'off', 'ply', 'rev', 'jux', 'delay', 'delaysync', 'delayfeedback', 'room', 'roomsize', 'distort', 'shape', 'crush', 'coarse', 'phaser', 'phaserdepth', 'tremolosync', 'tremolodepth', 'vowel', 'hpf', 'hpq', 'lpf', 'lpq', 'pan', 'slow', 'add'].forEach(f => known.add(f));
      for (const bar of [...new Set(buildSteps(c).map(s => s.at))]) {
        const code = compileSong(stateAt(c, bar).song);
        assert(code.includes('$:'), `${c.id} bar ${bar}: silent`);
        for (const f of fns(code)) assert(known.has(f), `${c.id} bar ${bar}: unknown function ${f}`);
      }
    }
  },
  'after the growth the code is the song as written'() {
    for (const c of built.values()) {
      const dest = { ...c, build: undefined };
      assert(compileSong(stateAt(c, c.crescendo.grown).song) === compileSong(dest), `${c.id} at bar ${c.crescendo.grown}`);
    }
  },
  'the growth starts from one sound'() {
    for (const c of built.values()) {
      const on = stateAt(c, 0).song.tracks.filter(t => !t.mute && t.type !== 'voice');
      assert(on.length === 1, `${c.id}: ${on.map(t => t.id).join(', ')}`);
    }
  },
  'length within three times the written song'() {
    for (const c of built.values()) assert(total(c) <= 3 * c.crescendo.written, `${c.id}: ${total(c)} of ${c.crescendo.written}`);
  },
  'endings vary across songs'() {
    const kinds = new Set([...built.values()].map(c => c.crescendo.ending));
    assert(kinds.size >= 2, [...kinds].join(', '));
  },
  'fully narrated: every growth step speaks, steps 1 to 2 bars apart'() {
    for (const s of songs.slice(0, 6)) {
      const c = crescendoSong(s, { narrated: true }), grow = buildSteps(c).filter(x => x.at > 0 && x.at <= c.crescendo.growth);
      assert(grow.every(x => x.say), `${s.id}: silent step`);
      const bars = [...new Set(grow.map(x => x.at))];
      for (let i = 1; i < bars.length; i++) assert(bars[i] - bars[i - 1] <= 4, `${s.id}: gap ${bars[i] - bars[i - 1]}`);
    }
  },
  'fragments start on a step, not in the sparse start'() {
    for (const c of built.values()) {
      const n = normalizeSong(c), map = buildMap(c, n.total), steps = [...new Set(buildSteps(c).map(x => x.at))];
      const shape = { bars: n.total, sections: n.sections.map(x => ({ label: x.name, start: x.start, len: x.bars })), tracks: n.tracks.map(t => ({ ...t, off: map[t.id].off })), steps };
      const picks = pickFragments(shape, n.sections.flatMap(x => Array(x.bars).fill(x.bpm)), { n: 2, length: 15, seed: c.id });
      const sparse = steps.find(b => b > 0) || 0;
      for (const p of picks) assert(steps.includes(p.bar) && p.bar >= sparse, `${c.id}: fragment at bar ${p.bar}`);
    }
  },
  'compact code plays what the standard code plays'() {
    // same layers (code without lane), same lane sums per bar; muted (_$:) only for tracks still to come
    const sums = layers => { const m = new Map(); for (const l of layers) { if (l.muted) continue; const v = m.get(l.key) || l.lane.map(() => 0); l.lane.forEach((x, k) => { v[k] += x; }); m.set(l.key, v); } return m; };
    for (const c of [...built.values()].slice(0, 12)) {
      const waiting = [...new Set(buildSteps(c).flatMap(s => (s.add !== undefined ? [].concat(s.add) : [])))];
      for (const bar of [...new Set(buildSteps(c).map(s => s.at))].filter((_, i) => i % 3 === 0)) {
        const st = stateAt(c, bar).song, a = sums(layersOf(compileSong(st))), b = sums(layersOf(compileCompact(st, { muted: waiting })));
        assert(a.size === b.size, `${c.id} bar ${bar}: ${a.size} layers, compact ${b.size}`);
        for (const [k, v] of a) assert(b.has(k) && b.get(k).every((x, i) => Math.abs(x - v[i]) < 1e-9), `${c.id} bar ${bar}: ${k.split('\n')[1].slice(0, 60)}`);
        const muted = layersOf(compileCompact(st, { muted: waiting })).filter(l => l.muted);
        assert(muted.every(l => waiting.some(id => st.tracks.find(t => t.id === id && t.mute))), `${c.id} bar ${bar}: muted layer of a playing track`);
      }
    }
  },
  'natural growth: ends on the written song, every state compiles, short entries, pauses after entries'() {
    for (const s of songs) {
      const c = crescendoSong(s, { rules: { natural: true } });
      assert(JSON.stringify(crescendoSong(s, { rules: { natural: true } }).build) === JSON.stringify(c.build), `${s.id}: same build twice`);
      assert(compileSong(stateAt(c, c.crescendo.grown).song) === compileSong({ ...c, build: undefined }), `${s.id}: end`);
      const steps = buildSteps(c), bars = [...new Set(steps.map(x => x.at))];
      for (const b of bars) compileSong(stateAt(c, b).song);
      assert(total(c) <= 3 * c.crescendo.written, `${s.id}: length ${total(c)}`);
      if (!c.crescendo.natural) continue;
      // a track enters without the functions it hides
      for (const e of steps.filter(x => x.add !== undefined && x.at > 0 && x.at < c.crescendo.growth)) {
        const st = stateAt(c, e.at).song, tr = st.tracks.find(t => t.id === e.add);
        if (tr && tr.hidden && tr.hidden.includes('cutoff')) assert(!/\.lpf\(/.test(compileSong({ ...st, tracks: [tr] }).split('// ==========')[1] || ''), `${s.id}: ${e.add} enters with a filter`);
      }
      // a reveal brings one function at a time
      assert(steps.filter(x => x.reveal).every(x => !Array.isArray(x.reveal.keys)), `${s.id}: one function per reveal`);
      // a listening pause after most entries in the growth
      const grow = bars.filter(b => b > 0 && b < c.crescendo.growth), entries = steps.filter(x => x.add !== undefined && x.at > 0 && x.at < c.crescendo.growth);
      const paused = entries.filter(e => { const next = grow.find(b => b > e.at); return next === undefined || next - e.at >= 4; });
      assert(paused.length >= entries.length * 0.7, `${s.id}: pauses after ${paused.length} of ${entries.length} entries`);
    }
  },
  'fixtures: a rules change raises CRESCENDO_VERSION'() {
    const now = { version: CRESCENDO_VERSION, songs: Object.fromEntries([...built].map(([id, c]) => [id, print(c)])) };
    if (process.argv.includes('--write')) { fs.mkdirSync('tools/fixtures', { recursive: true }); fs.writeFileSync(FIXTURES, JSON.stringify(now, null, 2) + '\n'); return; }
    const old = fs.existsSync(FIXTURES) ? JSON.parse(fs.readFileSync(FIXTURES, 'utf8')) : null;
    assert(old, `no fixtures: run with --write`);
    const changed = Object.keys(now.songs).filter(id => old.songs[id] && old.songs[id] !== now.songs[id]);
    assert(!changed.length || old.version < now.version, `steps changed for ${changed.join(', ')}: raise CRESCENDO_VERSION and run with --write`);
    assert(!changed.length && old.version === now.version, `version raised: run with --write to record the new fixtures`);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
