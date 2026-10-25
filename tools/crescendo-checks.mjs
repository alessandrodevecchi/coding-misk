// The checks of tools/check-crescendo.mjs (Crescendo, #64; growth shapes; faster-checks), split so that worker
// processes can run them song by song. No browser.
// CHECKS, in the order they print, is a list of:
//   { name, unit() }: one task that runs as it is (fixed songs or none);
//   { name, songs(s), each(s), after(rows, opt) }: each(s) runs in the task of song s (for every song songs(s) accepts),
//     returns data or throws; the first song that throws (in song order) fails the check, with its message. Otherwise
//     after(rows) checks what holds over the songs ([{ s, data }], in song order). opt.corpus is true only when every
//     song it covers ran (full level, or a protected check without --songs): counts and medians over the whole corpus
//     are checked only then.
//   protect: true marks the fixtures and the checks of the Classic and Crescendo builds (cheap), run on every song at
//     every level. The Live coder fixtures (costly, and they move on purpose with SHAPES_VERSION) run on the quick
//     songs at the quick level and on every song with --full. parts: a list; the check then runs as one task per song and part, each(s, part), rows in song then
//     part order.
// A check prints extra lines with log() (they come back with its result).
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { songFiles } from './songs-dir.mjs';
import { compileSong } from '../src/song/compile.js';
import { fromScenes, normalizeSong } from '../src/song/format.js';
import { ideaRows } from '../src/song/ideas.js';
import { validateSong } from '../src/song/validate.js';
import { validateRecipe } from '../src/endless/recipe.js';
import { meterSteps } from '../src/music.js';
import { pickFragments } from '../src/video/fragments.js';
import { compileCompact, layersOf } from '../src/song/compile-compact.js';
import { buildSteps, stateAt, checkBuild, stepTrack, buildMap } from '../src/song/build.js';
import { crescendoSong, patternVariants, waypointSong, CRESCENDO_VERSION, songSeconds } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { resolveShape, shapeFacts, canPlay, SHAPES_VERSION, OPENINGS } from '../src/song/shapes.js';
import { audible, firstMinute, fullKick, typingLoad } from './growth-measure.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
export const FIXTURES = 'tools/fixtures/crescendo.json';
export const CODER_FIXTURES = 'tools/fixtures/live-coder.json';
export const STYLE_FILES = fs.readdirSync('styles').filter(f => f.endsWith('.json')).sort().map(f => `styles/${f}`);
const styles = Object.fromEntries(STYLE_FILES.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))).map(r => [r.id, r]));
export const SONG_FILES = songFiles('songs').filter(f => !f.includes('/endless/'));
const loaded = SONG_FILES.map(f => ({ file: f, song: JSON.parse(fs.readFileSync(f, 'utf8')) })).map(x => ({ ...x, song: x.song.scenes ? fromScenes(x.song) : x.song })).filter(x => Array.isArray(x.song.sections) && x.song.sections.length);
export const songs = loaded.map(x => x.song);
export const fileOf = Object.fromEntries(loaded.map(x => [x.song.id, x.file]));
const total = s => s.sections.reduce((a, x) => a + x.bars, 0);
const index = new Map(songs.map((s, i) => [s.id, i]));
const long = songs.filter(x => total(x) >= 24), longIndex = new Map(long.map((s, i) => [s.id, i]));
const isLong = s => longIndex.has(s.id);
const fns = code => new Set([...code.matchAll(/\.([a-zA-Z]+)\(/g)].map(m => m[1]));
// the Crescendo build of a song (the default rules), once per task
let builtCache = new Map();
const builtOf = s => { if (!builtCache.has(s.id)) builtCache.set(s.id, crescendoSong(s)); return builtCache.get(s.id); };
// a Live coder build with some parts of the shape set (the others automatic)
let coderCache = new Map();
const coder = (s, over = {}) => { const k = `${s.id} ${JSON.stringify(over)}`; if (!coderCache.has(k)) coderCache.set(k, crescendoSong(s, { rules: growthRules(resolveProfile('switch', over), { styles }) })); return coderCache.get(k); };
export const clearCaches = () => { builtCache = new Map(); coderCache = new Map(); };
const shaped = c => !!(c.crescendo && c.crescendo.shape);
const byId = id => songs.find(s => s.id === id);
const heardTracks = (c, bar) => { const st = stateAt(c, bar).song, solo = st.tracks.some(t => t.alone && !t.mute); return st.tracks.filter(t => !t.mute && !t.hush && t.type !== 'voice' && (!solo || t.alone)); };
const firstSound = c => [0, ...new Set(buildSteps(c).map(x => x.at))].sort((a, b) => a - b).find(b => audible(compileSong(stateAt(c, b).song)).trim());
const rowsOf = (t, N = 16) => { const p = t.patterns[(t.clips[0] || {}).pattern] || {}; return p.rows || (p.idea ? ideaRows(p.idea, N) : {}); };
const baseRows = (t, N = 16) => { const p = t.patterns[String((t.clips[0] || {}).pattern).replace(/~\w+$/, '')] || {}; return p.rows || (p.idea ? ideaRows(p.idea, N) : {}); };
// the last skin of a metamorphosis: every clip of a rewritten track plays its new part
const lastSkin = c => ({ ...c, build: undefined, tracks: c.tracks.map(t => (t.patterns && t.patterns.skin ? { ...t, clips: t.clips.map(x => ({ ...x, pattern: 'skin' })) } : t)) });
const ends = c => compileSong(stateAt(c, c.crescendo.grown).song) === compileSong(c.crescendo.shape && c.crescendo.shape.skin ? lastSkin(c) : { ...c, build: undefined });
const median = a => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const print = s => createHash('sha256').update(JSON.stringify({ b: s.build, p: s.tracks.map(t => t.patterns), x: s.sections })).digest('hex').slice(0, 16);
const all = () => true;
// the songs of the moves check, in its order (a song can be there twice: the pool is walked as it is)
const MOVES_POOL = [...songs.filter(x => total(x) >= 24 && /switch|prova|example-|crescendo-/.test(x.id)), byId('example-ideas'), byId('example-material')].filter(Boolean);
// the fixtures check: compares, or writes with the flag (every song must have run)
function fixtures(file, version, rows, flag, what) {
  const now = { version, songs: Object.fromEntries(rows.map(r => [r.s.id, r.data])) };
  if (process.argv.includes(flag)) {
    assert(rows.length === songs.length, `${flag} needs every song (no --songs)`);
    fs.mkdirSync('tools/fixtures', { recursive: true }); fs.writeFileSync(file, JSON.stringify(now, null, 2) + '\n'); return;
  }
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  return { now, old, changed: old ? Object.keys(now.songs).filter(id => old.songs[id] && old.songs[id] !== now.songs[id]) : null, what };
}

export const CHECKS = [
  { name: 'drum rows thin out: the simplest keeps the kick on the first beat', unit() {
    const [v1, , v3] = patternVariants('drums', { rows: { bd: 'x...x...x...x...', hh: 'xxxxxxxxxxxxxxxx' } }, 3);
    assert(JSON.stringify(v3.rows) === JSON.stringify({ bd: 'x...............' }), `simplest: ${JSON.stringify(v3.rows)}`);
    const hits = r => Object.values(r).join('').split('x').length - 1;
    assert(hits(v1.rows) > hits(v3.rows) && hits(v1.rows) < 20, 'in between');
  } },
  { name: 'written notes thin out, rests stay', unit() {
    const v = patternVariants('bass', { notes: '0 ~ 0 3 ~ 0 3 ~ 0 ~ 0 3 ~ 2 ~ 1' }, 2);
    assert(v[1].notes.split(' ').length === 16 && v[1].notes.split(' ').filter(x => x !== '~').length === 2, v[1].notes);
  } },
  { name: 'same song and seed, same build', protect: true, songs: all,
    each(s) {
      assert(JSON.stringify(crescendoSong(s)) === JSON.stringify(builtOf(s)), s.id);
      if (index.get(s.id) === 0) return { other: JSON.stringify(crescendoSong(s, { seed: 'other' }).build) !== JSON.stringify(builtOf(s).build) };
      return null;
    },
    after(rows) { const first = rows.find(r => index.get(r.s.id) === 0); if (first) assert(first.data.other, 'another seed changes the build'); } },
  { name: 'steps are valid live build steps', protect: true, songs: all, each(s) {
    const c = builtOf(s), errs = []; checkBuild(c, total(c), (p, m) => errs.push(`${p}: ${m}`), () => {});
    assert(!errs.length, `${c.id}: ${errs[0]}`);
  } },
  { name: 'every growth step changes one track; a bar holds one track', protect: true, songs: all, each(s) {
    const c = builtOf(s), byBar = new Map();
    for (const x of buildSteps(c)) {
      if (x.at === 0 || x.at >= c.crescendo.growth + c.crescendo.written) continue;
      assert(!Array.isArray(x.add) && !Array.isArray(x.remove), `${c.id} bar ${x.at}: one track`);
      const tr = stepTrack(x);
      assert(!byBar.has(x.at) || byBar.get(x.at) === tr, `${c.id} bar ${x.at}: two tracks on one bar`);
      byBar.set(x.at, tr);
    }
  } },
  { name: 'every state compiles and uses only functions the compiler emits', protect: true, songs: all, each(s) {
    const c = builtOf(s), known = fns(compileSong(s));
    ['degradeBy', 'echo', 'off', 'ply', 'rev', 'jux', 'delay', 'delaysync', 'delayfeedback', 'room', 'roomsize', 'distort', 'shape', 'crush', 'coarse', 'phaser', 'phaserdepth', 'tremolosync', 'tremolodepth', 'vowel', 'hpf', 'hpq', 'lpf', 'lpq', 'pan', 'slow', 'add', 'late'].forEach(f => known.add(f));
    for (const bar of [...new Set(buildSteps(c).map(x => x.at))]) {
      const code = compileSong(stateAt(c, bar).song);
      assert(code.includes('$:'), `${c.id} bar ${bar}: silent`);
      for (const f of fns(code)) assert(known.has(f), `${c.id} bar ${bar}: unknown function ${f}`);
    }
  } },
  { name: 'after the growth the code is the song as written', protect: true, songs: all, each(s) {
    const c = builtOf(s), dest = { ...c, build: undefined };
    assert(compileSong(stateAt(c, c.crescendo.grown).song) === compileSong(dest), `${c.id} at bar ${c.crescendo.grown}`);
  } },
  { name: 'the growth starts from one sound', protect: true, songs: all, each(s) {
    const c = builtOf(s), on = stateAt(c, 0).song.tracks.filter(t => !t.mute && t.type !== 'voice');
    assert(on.length === 1, `${c.id}: ${on.map(t => t.id).join(', ')}`);
  } },
  { name: 'length within three times the written song', protect: true, songs: all, each(s) {
    const c = builtOf(s); assert(total(c) <= 3 * c.crescendo.written, `${c.id}: ${total(c)} of ${c.crescendo.written}`);
  } },
  { name: 'endings vary across songs', protect: true, songs: all, each: s => builtOf(s).crescendo.ending,
    after(rows, { corpus, log }) {
      const kinds = new Set(rows.map(r => r.data));
      if (corpus) assert(kinds.size >= 2, [...kinds].join(', ')); else log(`      endings of the songs run: ${[...kinds].join(', ')} (two kinds or more checked at the full level)`);
    } },
  { name: 'fully narrated: every growth step speaks, steps 1 to 2 bars apart', protect: true, songs: s => index.get(s.id) < 6, each(s) {
    const c = crescendoSong(s, { narrated: true }), grow = buildSteps(c).filter(x => x.at > 0 && x.at <= c.crescendo.growth);
    assert(grow.every(x => x.say), `${s.id}: silent step`);
    const bars = [...new Set(grow.map(x => x.at))];
    for (let i = 1; i < bars.length; i++) assert(bars[i] - bars[i - 1] <= 4, `${s.id}: gap ${bars[i] - bars[i - 1]}`);
  } },
  { name: 'fragments start on a step, not in the sparse start', protect: true, songs: all, each(s) {
    const c = builtOf(s), n = normalizeSong(c), map = buildMap(c, n.total), steps = [...new Set(buildSteps(c).map(x => x.at))];
    const shape = { bars: n.total, sections: n.sections.map(x => ({ label: x.name, start: x.start, len: x.bars })), tracks: n.tracks.map(t => ({ ...t, off: map[t.id].off })), steps };
    const picks = pickFragments(shape, n.sections.flatMap(x => Array(x.bars).fill(x.bpm)), { n: 2, length: 15, seed: c.id });
    const sparse = steps.find(b => b > 0) || 0;
    for (const p of picks) assert(steps.includes(p.bar) && p.bar >= sparse, `${c.id}: fragment at bar ${p.bar}`);
  } },
  { name: 'compact code plays what the standard code plays', protect: true, songs: s => index.get(s.id) < 12, each(s) {
    // same layers (code without lane), same lane sums per bar; muted (_$:) only for tracks still to come
    const sums = layers => { const m = new Map(); for (const l of layers) { if (l.muted) continue; const v = m.get(l.key) || l.lane.map(() => 0); l.lane.forEach((x, k) => { v[k] += x; }); m.set(l.key, v); } return m; };
    const c = builtOf(s), waiting = [...new Set(buildSteps(c).flatMap(x => (x.add !== undefined ? [].concat(x.add) : [])))];
    for (const bar of [...new Set(buildSteps(c).map(x => x.at))].filter((_, i) => i % 3 === 0)) {
      const st = stateAt(c, bar).song, a = sums(layersOf(compileSong(st))), b = sums(layersOf(compileCompact(st, { muted: waiting })));
      assert(a.size === b.size, `${c.id} bar ${bar}: ${a.size} layers, compact ${b.size}`);
      for (const [k, v] of a) assert(b.has(k) && b.get(k).every((x, i) => Math.abs(x - v[i]) < 1e-9), `${c.id} bar ${bar}: ${k.split('\n')[1].slice(0, 60)}`);
      const muted = layersOf(compileCompact(st, { muted: waiting })).filter(l => l.muted);
      assert(muted.every(l => waiting.some(id => st.tracks.find(t => t.id === id && t.mute))), `${c.id} bar ${bar}: muted layer of a playing track`);
    }
  } },
  { name: 'natural growth: ends on the written song, every state compiles, short entries, pauses after entries', songs: all, each(s) {
    const c = crescendoSong(s, { rules: { natural: true } });
    assert(JSON.stringify(crescendoSong(s, { rules: { natural: true } }).build) === JSON.stringify(c.build), `${s.id}: same build twice`);
    assert(compileSong(stateAt(c, c.crescendo.grown).song) === compileSong({ ...c, build: undefined }), `${s.id}: end`);
    const steps = buildSteps(c), bars = [...new Set(steps.map(x => x.at))];
    for (const b of bars) compileSong(stateAt(c, b).song);
    assert(total(c) <= 3 * c.crescendo.written, `${s.id}: length ${total(c)}`);
    if (!c.crescendo.natural) return;
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
  } },
  { name: 'like a live coder: same build twice, ends on the written song, every state compiles, within three times', songs: all, each(s) {
    const rules = { natural: true, coder: true, free: true };
    const c = crescendoSong(s, { rules });
    assert(JSON.stringify(crescendoSong(s, { rules }).build) === JSON.stringify(c.build), `${s.id}: same build twice`);
    assert(compileSong(stateAt(c, c.crescendo.grown).song) === compileSong({ ...c, build: undefined }), `${s.id}: end`);
    for (const b of [...new Set(buildSteps(c).map(x => x.at))]) compileSong(stateAt(c, b).song);
    assert(total(c) <= 3 * c.crescendo.written, `${s.id}: length ${total(c)}`);
    const errs = []; checkBuild(c, total(c), (p, m) => errs.push(`${p}: ${m}`), () => {});
    assert(!errs.length, `${s.id}: ${errs[0]}`);
  } },
  { name: 'like a live coder: 4 to 6 waypoints, the first with one or two tracks, detours only after the first passage', songs: all,
    each(s) {
      const c = crescendoSong(s, { rules: { natural: true, coder: true, free: true } });
      if (!c.crescendo.coder) return { coder: false };
      const wp = c.crescendo.waypoints;
      assert(wp.length >= 4 && wp.length <= 6, `${s.id}: ${wp.length} waypoints`);
      const on = stateAt(c, wp[0]).song.tracks.filter(t => !t.mute && t.type !== 'voice');
      assert(on.length >= 1 && on.length <= 2, `${s.id}: ${on.length} tracks at the first waypoint`);
      const steps = buildSteps(c).filter(x => x.at > 0 && x.at <= c.crescendo.grown);
      // no detour before the second waypoint
      assert(!steps.some(x => x.at <= wp[1] && (x.comment || x.notes || (x.remove !== undefined && x.at < c.crescendo.growth))), `${s.id}: detour in the first passage`);
      let clones = 0; const kinds = new Set();
      steps.forEach(x => { if (x.clone) clones++; ['comment', 'notes', 'remove'].forEach(k => { if (x[k] !== undefined) kinds.add(k); }); });
      return { coder: true, none: !c.crescendo.detours, clones, kinds: [...kinds] };
    },
    after(rows, { corpus, log }) {
      const c = rows.filter(r => r.data.coder).map(r => r.data), all = c.length, none = c.filter(x => x.none).length, clones = c.reduce((a, x) => a + x.clones, 0), kinds = new Set(c.flatMap(x => x.kinds));
      if (!corpus) return log(`      ${all} Live coder songs run, ${none} straight, ${clones} clones, detour kinds ${[...kinds].join(', ')} (counts checked at the full level)`);
      assert(all >= 10 && none < all * 0.4, `straight songs ${none} of ${all}`);
      assert(clones > 0 && kinds.size === 3, `clones ${clones}, detour kinds ${[...kinds]}`);
    } },
  { name: 'like a live coder: small moves (a step changes a few characters, entries and clones apart)', unit() {
    // measured on the code shown (the code of the moment, Switch profile): characters of the lines that change
    const big = [], sizes = [], seen = new Set();
    for (const id of ['switch-prima-luce', 'switch-trance-prova', 'crescendo-notte-lunga']) {
      const C = resolveProfile('switch'), L = liveCode(crescendoSong(songs.find(x => x.id === id), { rules: growthRules(C) }), C);
      for (const x of buildSteps(L.build).filter(y => y.at > 0 && y.at <= L.build.crescendo.grown && !y.add && !y.clone && Object.keys(y).some(k => !['at', 'say', 'i'].includes(k)))) {
        // (several steps on one bar are typed together: the bar counts once)
        if (seen.has(`${id} ${x.at}`)) continue;
        seen.add(`${id} ${x.at}`);
        const a = L.codeAt(x.at - 1).split('\n'), b = L.codeAt(x.at).split('\n'), changed = b.filter(l => !a.includes(l)).join('').length;
        sizes.push(changed);
        if (changed > 160) big.push(`${id} ${x.at}: ${changed}`);
      }
    }
    sizes.sort((p, q) => p - q);
    assert(sizes[Math.floor(sizes.length / 2)] <= 80 && big.length <= sizes.length * 0.1, `median ${sizes[Math.floor(sizes.length / 2)]}, big steps ${big.join(', ')}`);
  } },
  { name: 'like a live coder: the normal version starts with the waypoints, one section each', unit() {
    const s = songs.find(x => x.id === 'switch-tappe'), c = crescendoSong(s, { rules: { natural: true, coder: true, free: true } }), w = waypointSong(s);
    assert(w.sections.length === s.sections.length + c.crescendo.waypoints.length - 1, `${w.sections.length} sections`);
    const code = compileSong(w), errs = [];
    checkBuild(w, total(w), (p, m) => errs.push(m), () => {});
    assert(code.includes('$:') && !errs.length && w.tracks.find(t => t.type === 'drums').clips[0].start === 0, 'the first waypoint plays the anchor');
  } },
  { name: 'like a live coder: the chooser can be replaced', unit() {
    const s = songs.find(x => x.id === 'switch-prima-luce'), first = (lanes) => lanes.findIndex(l => l.units.length);
    const a = crescendoSong(s, { rules: { natural: true, coder: true, free: true } }), b = crescendoSong(s, { rules: { natural: true, coder: true, free: true, chooser: first } });
    assert(JSON.stringify(a.build) !== JSON.stringify(b.build), 'same order');
    assert(compileSong(stateAt(b, b.crescendo.grown).song) === compileSong({ ...b, build: undefined }), 'end');
  } },
  // ---------- growth shapes (growth-shapes) ----------
  { name: 'shapes: same song same shape, the song wins, style weights followed over 200 seeds, impossible openings left out', unit() {
    const s = byId('switch-prima-luce');
    assert(JSON.stringify(resolveShape(s, { styles })) === JSON.stringify(resolveShape(s, { styles })), 'same shape twice');
    const own = resolveShape({ ...s, growthShape: { opening: 'full-kick', pace: 'fast' } }, { styles });
    assert(own.opening === 'full-kick' && own.pace === 'fast' && own.from.opening === 'song', JSON.stringify(own));
    assert(resolveShape({ ...s, growthShape: { opening: 'full-kick' } }, { styles, user: { opening: 'pad' } }).opening === 'pad', 'the Compose control wins over the song');
    // a style whose only opening weight is the pad: every seed opens with the pad
    const only = { ...styles['gated-trance'], growthShapes: { openings: { pad: 1 }, paces: { fast: 3, slow: 1 } } }, st = { ...styles, 'gated-trance': only };
    let fast = 0;
    for (let k = 0; k < 200; k++) { const r = resolveShape(s, { styles: st, seed: `seed-${k}` }); assert(r.opening === 'pad' && r.from.opening === 'style', r.opening); if (r.pace === 'fast') fast++; }
    assert(fast > 120 && fast < 180, `fast drawn ${fast} times of 200 for weights 3 to 1`);
    // nothing named: the seed draws; the voice is never drawn without a voice instrument, nor a kick opening without drums
    const synth = byId('prova-solo-synth');
    for (let k = 0; k < 200; k++) { const r = resolveShape(synth, { seed: `x-${k}` }); assert(!['voice', 'slow', 'full-kick', 'broken', 'filtered'].includes(r.opening), `${r.opening} for a song without drums`); }
    assert(resolveShape(synth, { user: { opening: 'full-kick' } }).opening !== 'full-kick', 'an impossible user choice falls back');
    // a wrong id in a song or a recipe is an error with its path
    const se = validateSong({ ...s, growthShape: { opening: 'kick-drum' } }).errors, re = validateRecipe({ ...styles.acid, growthShapes: { paces: { fastest: 1 } } }).errors;
    assert(se.some(e => e.path === 'growthShape.opening') && re.some(e => e.path === 'growthShapes.paces.fastest'), `${JSON.stringify(se)} ${JSON.stringify(re)}`);
    assert(!validateSong(s).errors.length && Object.values(styles).every(r => !validateRecipe(r).errors.length), 'built-in songs and recipes valid');
  } },
  { name: 'shapes: Classic and Crescendo take no shape; the Live coder build records it', unit() {
    for (const s of songs.slice(0, 10)) assert(!crescendoSong(s).crescendo.shape && !crescendoSong(s, { rules: growthRules(resolveProfile('crescendo')) }).crescendo.shape, s.id);
    assert(shaped(coder(byId('switch-prima-luce'))) && coder(byId('switch-prima-luce')).crescendo.shape.version === SHAPES_VERSION, 'Live coder');
  } },
  { name: 'shape search: the drawn shape first, at most 8 shapes (16 when none of the first 8 meets the target), the same shape twice, the growth alone judged', unit(log) {
    // shape-search D1-D3: a search with the fitted duration rushes most shapes, so it reaches the caps; the free duration
    // usually stops early
    const cases = [['luci-rosse', { duration: 'fitted' }], ['settimo-cielo', { duration: 'fitted' }], ['luci-rosse', {}], ['settimo-cielo', {}], ['kellerlicht', {}], ['switch-prima-luce', {}]];
    for (const [id, over] of cases) {
      const s = byId(id), rules = growthRules(resolveProfile('switch', over), { styles });
      for (const cap of [undefined, 4]) {
        const stats = {}, c = crescendoSong(s, { rules, stats, ...(cap ? { shapeCap: cap } : {}) }), k = cap || 8;
        const measured = stats.tried.filter(t => !t.skipped), first = stats.tried[0], drawn = resolveShape(s, { user: rules.shape, styles });
        assert(stats.cap === k, `${id}: cap ${stats.cap}`);
        assert(first.development === drawn.development && first.pace === drawn.pace && first.maxDetail === null, `${id}: first tried ${first.development} ${first.pace} ${first.maxDetail}, drawn ${drawn.development} ${drawn.pace}`);
        assert(measured.length <= 2 * k, `${id} cap ${k}: ${measured.length} shapes measured`);
        if (measured.length > k) assert(measured.slice(0, k).every(t => t.rushed > 0), `${id} cap ${k}: went past ${k} although one of the first met the target`);
        // the target and the fallback read the growth only: the kept shape's rushed count is its growth's
        const kept = stats.tried[stats.kept];
        assert(kept.rushed === kept.rushedGrowth && c.crescendo.shape.rushed === kept.rushedGrowth, `${id}: kept rushed ${kept.rushed}, growth ${kept.rushedGrowth}`);
        if (measured.some(t => t.rushed === 0)) assert(kept.rushed === 0 && (stats.long || stats.kept === stats.tried.length - 1), `${id}: a shape met the target and the search went on`);
        if (!cap) log(`      ${id}${over.duration ? ' (fitted)' : ''}: ${measured.length} shapes measured, kept ${kept.development} ${kept.pace}${kept.maxDetail !== null ? ` detail ${kept.maxDetail}` : ''}, ${kept.rushedGrowth} rushed growth steps, ${kept.rushedWritten} in the written part`);
      }
      const again = crescendoSong(s, { rules: growthRules(resolveProfile('switch', over), { styles }) }), once = crescendoSong(s, { rules });
      assert(JSON.stringify(again.crescendo.shape) === JSON.stringify(once.crescendo.shape) && JSON.stringify(again.build) === JSON.stringify(once.build), `${id}: another shape the second time`);
    }
  } },
  { name: 'shape search settings: Try all measures every shape and keeps the first good one or the shortest, the fixed order, the long-song threshold', unit(log) {
    // shape-search D6, D7
    for (const id of ['luci-rosse', 'kellerlicht']) {
      const s = byId(id), rules = growthRules(resolveProfile('switch', {}), { styles });
      const all = {}, best = {}, fixed = {}, fixed2 = {}, first = {}, long = {};
      crescendoSong(s, { rules, stats: first });
      crescendoSong(s, { rules, stats: all, shapeAll: true });
      const cb = crescendoSong(s, { rules, stats: best, shapeAll: true, shapeKeep: 'best' });
      // Try all with the first good one keeps what the search keeps when the first shapes meet the target
      if (first.tried[first.kept].rushed === 0) assert(JSON.stringify(all.tried[all.kept]) && all.tried[all.kept].development === first.tried[first.kept].development && all.tried[all.kept].pace === first.tried[first.kept].pace, `${id}: Try all first good one kept another shape`);
      const measured = best.tried.filter(t => !t.skipped), ok = measured.filter(t => t.rushed === 0);
      assert(measured.length > 16, `${id}: Try all best one measured only ${measured.length} shapes`);
      if (ok.length) assert(best.tried[best.kept].rushed === 0 && best.tried[best.kept].seconds === Math.min(...ok.map(t => t.seconds)), `${id}: best one is not the shortest that meets the target`);
      assert(Math.abs(best.tried[best.kept].seconds - songSeconds(cb)) < 1e-6, `${id}: the seconds counted are not the song's`);
      crescendoSong(s, { rules, stats: fixed, shapeRandom: false }); crescendoSong(s, { rules, stats: fixed2, shapeRandom: false });
      assert(!fixed.random && JSON.stringify(fixed.tried.map(t => [t.development, t.pace, t.maxDetail])) === JSON.stringify(fixed2.tried.map(t => [t.development, t.pace, t.maxDetail])), `${id}: the fixed order changed between two growths`);
      // a threshold under the kept length: every shape measured, the shortest that meets the target kept
      crescendoSong(s, { rules, stats: long, longSong: 300 });
      const lk = long.tried[long.kept], lok = long.tried.filter(t => !t.skipped && t.rushed === 0);
      if (first.tried[first.kept].seconds > 300) assert(long.long && (!lok.length || lk.seconds === Math.min(...lok.map(t => t.seconds))), `${id}: the long-song rule did not keep the shortest`);
      log(`      ${id}: default ${Math.round(first.tried[first.kept].seconds)} s, Try all best ${Math.round(best.tried[best.kept].seconds)} s of ${measured.length} shapes, long from 5 min ${Math.round(lk.seconds)} s`);
    }
  } },
  { name: 'shapes: every build of every opening and development ends on its destination and every state compiles (medium pace)', songs: isLong, parts: OPENINGS,
    each(s, opening) {
      let n = 0;
      for (const development of ['by-type', 'as-written', 'masks', 'parameters', 'second-section', 'metamorphosis']) {
        if (!canPlay('opening', opening, shapeFacts(s, styles))) continue;
        const c = coder(s, { opening, development, pace: 'medium' });
        if (!shaped(c)) continue;
        n++;
        const errs = []; checkBuild(c, total(c), (p, m) => errs.push(`${p}: ${m}`), () => {});
        assert(!errs.length, `${s.id} ${opening}/${development}: ${errs[0]}`);
        for (const b of [...new Set(buildSteps(c).map(x => x.at))]) compileSong(stateAt(c, b).song);
        assert(ends(c), `${s.id} ${opening}/${development}: does not end on its destination`);
        // (the free duration adds the bars the typing needs past the budget: shape.waited, owner 2026-10-19)
        assert(total(c) - (c.crescendo.shape.waited || 0) <= 3 * c.crescendo.written, `${s.id} ${opening}/${development}: length ${total(c)} of ${c.crescendo.written}`);
      }
      return n;
    },
    after(rows, { corpus, log }) { const n = rows.reduce((a, r) => a + r.data, 0); if (corpus) assert(n > 500, `${n} builds`); else log(`      ${n} builds (more than 500 checked at the full level)`); } },
  { name: 'openings: the first waypoint of each opening, on every song that can play it', songs: isLong, parts: OPENINGS, each(s, part) {
    const f = shapeFacts(s, styles);
    for (const opening of [part].filter(o => canPlay('opening', o, f))) {
      const c = coder(s, { opening, pace: 'medium', development: 'by-type' });
      if (!shaped(c)) continue;
      const N = meterSteps(c.sections[0].meter || '4/4');
      const at = firstSound(c), on = heardTracks(c, at), who = `${s.id} ${opening}`;
      const kickOf = t => String(rowsOf(t, N).bd || '');
      if (['slow', 'full-kick', 'filtered', 'broken'].includes(opening)) assert(on.length === 1 && on[0].type === 'drums', `${who}: ${on.map(t => t.id)}`);
      if (opening === 'slow' && /x/.test(kickOf(on[0]))) assert([...kickOf(on[0])].every((x, i) => x !== 'x' || i % 16 === 0) && Object.keys(rowsOf(on[0], N)).length === 1, `${who}: ${JSON.stringify(rowsOf(on[0], N))}`);
      if (opening === 'full-kick' || opening === 'filtered') assert(kickOf(on[0]) === String(baseRows(on[0], N).bd || '') && Object.keys(rowsOf(on[0], N)).every(r => r === 'bd'), `${who}: ${JSON.stringify(rowsOf(on[0], N))}`);
      if (opening === 'filtered') assert(on[0].settings.cutoff === 300 && !(on[0].hidden || []).includes('cutoff'), `${who}: cutoff ${on[0].settings.cutoff}`);
      if (opening === 'broken') assert(/x/.test(kickOf(on[0])) && [...kickOf(on[0])].some((x, i) => x === 'x' && i % 4 !== 0), `${who}: ${kickOf(on[0])}`);
      if (opening === 'melodic') assert(['arp', 'hook', 'guitar'].includes(on[0].type) && on.length === 1, `${who}: ${on.map(t => t.type)}`);
      if (opening === 'pad') assert(['pad', 'texture'].includes(on[0].type) && on.length === 1, `${who}: ${on.map(t => t.type)}`);
      // voice-instrument: the voice opening's first sound is the spoken line, alone
      if (opening === 'voice') assert(on.length === 1 && on[0].type === 'spoken' && at === 0, `${who}: ${on.map(t => t.type)} at ${at}`);
      if (opening === 'typed') assert(c.crescendo.shape.leadIn >= 1 && at === c.crescendo.shape.leadIn && !audible(compileSong(stateAt(c, 0).song)).trim(), `${who}: first sound at ${at}, lead-in ${c.crescendo.shape.leadIn}`);
      if (opening === 'muted-base') { const st = stateAt(c, 0).song.tracks.filter(t => !t.mute && t.type !== 'voice'); assert(st.length >= 3 && st.filter(t => t.hush).length === st.length - 1, `${who}: ${st.length} written, ${st.filter(t => t.hush).length} muted`); }
      if (opening === 'mid-set') { const st = stateAt(c, 0).song.tracks.filter(t => !t.mute && t.type !== 'voice'); assert(st.length >= 3 && st.filter(t => t.alone).length === 2 && on.length === 2, `${who}: ${st.filter(t => t.alone).length} in solo`); }
    }
  } },
  { name: 'openings: fragments of a typed opening start after its silent lead-in', songs: s => isLong(s) && longIndex.get(s.id) < 20, each(s) {
    const c = coder(s, { opening: 'typed', pace: 'medium' });
    if (!shaped(c)) return;
    const n = normalizeSong(c), map = buildMap(c, n.total), steps = [...new Set(buildSteps(c).map(x => x.at))];
    const shape = { bars: n.total, sections: n.sections.map(x => ({ label: x.name, start: x.start, len: x.bars })), tracks: n.tracks.map(t => ({ ...t, off: map[t.id].off })), steps };
    for (const p of pickFragments(shape, n.sections.flatMap(x => Array(x.bars).fill(x.bpm)), { n: 2, length: 15, seed: c.id })) assert(p.bar >= c.crescendo.shape.leadIn, `${s.id}: fragment at bar ${p.bar}, lead-in ${c.crescendo.shape.leadIn}`);
  } },
  { name: 'openings: muted base and mid-set: each step takes away one "_" or one "S", and every view shows the marks', songs: s => isLong(s) && longIndex.get(s.id) < 20, each(s) {
    for (const opening of ['muted-base', 'mid-set']) {
      if (!canPlay('opening', opening, shapeFacts(s, styles))) continue;
      const c = coder(s, { opening, pace: 'medium', development: 'by-type' }), who = `${s.id} ${opening}`;
      if (!shaped(c)) continue;
      const marks = b => stateAt(c, b).song.tracks.filter(t => (opening === 'muted-base' ? t.hush : t.alone) && !t.mute).length;
      let prev = marks(0);
      for (const b of [...new Set(buildSteps(c).map(x => x.at))].filter(b => b > 0)) { const m = marks(b); assert(m === prev || m === prev - 1, `${who} bar ${b}: ${prev} → ${m}`); prev = m; }
      assert(prev === 0, `${who}: ${prev} marks left`);
      const re = opening === 'muted-base' ? /^_\$:/m : /^S\$:/m, C = resolveProfile('switch');
      for (const view of ['now', 'compact', 'track', 'sections']) { const L = liveCode(c, { ...C, view }, { cols: () => 80 }); assert(re.test(L.codeAt(0)), `${who}: no mark in the ${view} view`); }
    }
  } },
  { name: 'pace: audible changes in the first minute (medium 4 to 6, fast 7 to 8; slow as today) and the kick whole within 60 s', songs: isLong,
    each(s) {
      const out = { slow: [], medium: [], fast: [] }, kick = { medium: [], fast: [] }, off = [];
      for (const pace of ['slow', 'medium', 'fast']) {
        const c = coder(s, { pace });
        // (a metamorphosis reveals the whole written song in one to three steps: its first minute is that reveal)
        if (!shaped(c) || c.crescendo.shape.development === 'metamorphosis') continue;
        const n = firstMinute(c).length;
        out[pace].push(n);
        if ((pace === 'medium' && (n < 4 || n > 6)) || (pace === 'fast' && (n < 7 || n > 8))) off.push(`${s.id} ${pace} ${n}`);
        const k = pace !== 'slow' && fullKick(c);
        if (k && k.first !== null) { kick[pace].push(k.fromFirst); if (k.fromFirst > 61) off.push(`${s.id} ${pace} kick ${k.fromFirst.toFixed(0)} s`); }
      }
      return { out, kick, off };
    },
    after(rows, { corpus, log }) {
      const out = { slow: [], medium: [], fast: [] }, kick = { medium: [], fast: [] }, off = [];
      for (const { data } of rows) { for (const p in out) out[p].push(...data.out[p]); for (const p in kick) kick[p].push(...data.kick[p]); off.push(...data.off); }
      const share = (a, lo, hi) => a.filter(x => x >= lo && x <= hi).length / a.length;
      log(`      first minute: slow ${median(out.slow)} (${Math.min(...out.slow)}-${Math.max(...out.slow)}), medium ${median(out.medium)} (${Math.min(...out.medium)}-${Math.max(...out.medium)}), fast ${median(out.fast)} (${Math.min(...out.fast)}-${Math.max(...out.fast)}); kick whole after median ${median(kick.medium).toFixed(0)} s medium, ${median(kick.fast).toFixed(0)} s fast, at most ${Math.max(...kick.medium, ...kick.fast).toFixed(0)} s`);
      if (off.length) log(`      outside the range (a new line takes longer to type than a fast step allows): ${off.join(', ')}`);
      // never above the range; below it only where the next line takes longer to type than the pace allows (typing
      // never rushes): medium within one change, fast within two, and most builds inside the range (open question in
      // the change's tasks)
      log(`      inside the range: medium ${Math.round(share(out.medium, 4, 6) * 100)}%, fast ${Math.round(share(out.fast, 7, 8) * 100)}%`);
      // (free duration, owner 2026-10-19: a step waits for its typing and is never pasted, so a first minute with a long
      // new line holds fewer changes; never more than the pace, and the median keeps it)
      // (the median and the share are over the corpus: checked at the full level only; the limits hold for every song)
      assert(Math.max(...out.medium) <= 6 && (!corpus || (median(out.medium) >= 4 && share(out.medium, 4, 6) >= 0.7)), 'medium');
      // (the automatic shape avoids rushed typing first, even when a calmer development has fewer early changes)
      assert(Math.max(...out.fast) <= 8 && (!corpus || median(out.fast) >= 6), 'fast');
      assert(Math.max(...kick.medium, ...kick.fast) <= 61, 'kick');
    } },
  { name: 'development: as written, the arpeggio test song opens with its arpeggio', unit() {
    const c = coder(byId('prova-apre-arpeggio'), { development: 'as-written', opening: 'typed' }), on = heardTracks(c, firstSound(c));
    assert(on.length === 1 && on[0].type === 'arp', on.map(t => t.id).join());
  } },
  { name: 'development: masks come and go, and the song ends as written', songs: s => isLong(s) && longIndex.get(s.id) < 16,
    each(s) {
      const c = coder(s, { development: 'masks', pace: 'medium' });
      if (!shaped(c)) return 0;
      assert(ends(c) && !stateAt(c, c.crescendo.grown).song.tracks.some(t => t.maskIdea), `${s.id}: a mask left`);
      return buildSteps(c).filter(x => x.mask && x.mask.mask).length;
    },
    after(rows, { corpus, log }) { const masked = rows.reduce((a, r) => a + r.data, 0); if (corpus) assert(masked > 10, `${masked} masks`); else log(`      ${masked} masks (more than 10 checked at the full level)`); } },
  { name: 'development: parameters: after the first two waypoints no step adds or removes a track', songs: isLong, each(s) {
    const c = coder(s, { development: 'parameters', opening: 'slow', pace: 'medium' });
    if (!shaped(c) || !c.crescendo.coder) return;
    const w2 = c.crescendo.waypoints[1];
    const bad = buildSteps(c).filter(x => x.at > w2 && x.at < c.crescendo.growth && ['add', 'remove', 'clone', 'unmute', 'unsolo', 'mute', 'solo'].some(k => x[k] !== undefined));
    assert(!bad.length, `${s.id}: ${JSON.stringify(bad[0])}`);
  } },
  { name: 'development: second section: new lines alone with "S$:", then everything plays', songs: isLong,
    each(s) {
      const c = coder(s, { development: 'second-section', opening: 'slow', pace: 'medium' });
      if (!shaped(c)) return 0;
      const solos = buildSteps(c).filter(x => x.solo !== undefined && x.at > 0), un = buildSteps(c).find(x => x.unsolo !== undefined);
      if (!solos.length) return 0;
      const b = solos[0].at, on = heardTracks(c, b);
      assert(on.every(t => t.alone) && /^S\$:/m.test(compileSong(stateAt(c, b).song)), `${s.id}: not alone at ${b}`);
      assert(un && un.at > b && heardTracks(c, un.at).length > on.length, `${s.id}: the marks never go`);
      return 1;
    },
    after(rows, { corpus, log }) { const seen = rows.reduce((a, r) => a + r.data, 0); if (corpus) assert(seen >= 10, `${seen} songs`); else log(`      ${seen} songs (10 or more checked at the full level)`); } },
  { name: 'development: metamorphosis: tempo and key on a phrase boundary, a style of the same family, every state compiles, ends on the last skin', songs: isLong,
    each(s) {
      if (!canPlay('development', 'metamorphosis', shapeFacts(s, styles))) return 0;
      const c = coder(s, { development: 'metamorphosis', pace: 'medium' }), sk = c.crescendo.shape.skin;
      assert(sk && sk.at % 8 === 0, `${s.id}: skin at ${sk && sk.at}`);
      const fam = styles[s.tags.styles[0]].family;
      assert(styles[sk.style].family === fam && sk.style !== s.tags.styles[0], `${s.id}: ${sk.style}`);
      const after = c.sections.slice(c.crescendo.sections);
      assert(c.sections[1].bpm === sk.bpm && c.sections[1].key === sk.key && after.every(x => x.key !== undefined), `${s.id}: sections`);
      assert(Math.abs(sk.bpm - s.sections[0].bpm) <= 12 || sk.bpm * 2 === s.sections[0].bpm || sk.bpm === Math.round(s.sections[0].bpm / 2) || sk.bpm === s.sections[0].bpm * 2, `${s.id}: tempo ${sk.bpm}`);
      for (const b of [...new Set(buildSteps(c).map(x => x.at))]) compileSong(stateAt(c, b).song);
      assert(ends(c), `${s.id}: ends elsewhere`);
      // one line rewritten per step
      assert(buildSteps(c).filter(x => x.pattern && x.pattern.to === 'skin').every(x => !Array.isArray(x.pattern.track)), `${s.id}: lines`);
      return 1;
    },
    after(rows, { corpus, log }) { const seen = rows.reduce((a, r) => a + r.data, 0); if (corpus) assert(seen >= 8, `${seen} songs`); else log(`      ${seen} songs (8 or more checked at the full level)`); } },
  { name: 'moves: a beat step moved, a prepared variant, seg(16) on a held chord and a slow slide appear, each a small edit', songs: s => MOVES_POOL.includes(s),
    // each (pace, seed) of a song: the moves seen and the edit sizes; after() walks the pool in its order and keeps the
    // sizes of whole builds until 400, as one loop over the pool would
    each(s) {
      const out = [];
      for (const pace of ['slow', 'medium']) for (const seed of [undefined, 'a', 'b', 'c']) {
        const c = seed ? crescendoSong(s, { seed, rules: growthRules(resolveProfile('switch', { pace, development: 'by-type' }), { styles }) }) : coder(s, { pace, development: 'by-type' });
        if (!shaped(c)) { out.push(null); continue; }
        const kinds = new Set(), sizes = [];
        for (const x of buildSteps(c)) {
          if (x.notes && (x.notes.rows || (x.notes.idea && x.notes.idea.beat))) kinds.add('beat');
          if (x.variant && Number.isInteger(x.variant.use)) kinds.add('variant');
          if (x.rack && x.rack.device === 'seg') kinds.add('seg');
        }
        if (buildSteps(c).filter(x => x.set && x.set.cutoff !== undefined && x.at > 0).length >= 5) kinds.add('slide');
        const L = liveCode(c, resolveProfile('switch'));
        for (const x of buildSteps(L.build).filter(y => y.at > 0 && y.at <= c.crescendo.grown && !y.add && !y.clone && !y.solo && !y.unmute && Object.keys(y).some(k => !['at', 'say', 'i'].includes(k)))) {
          const a = L.codeAt(x.at - 1).split('\n'), b = L.codeAt(x.at).split('\n'); sizes.push(b.filter(l => !a.includes(l)).join('').length);
        }
        out.push({ kinds: [...kinds], sizes });
      }
      return out;
    },
    after(rows, { corpus, log }) {
      const by = new Map(rows.map(r => [r.s.id, r.data])), kinds = new Set(), sizes = [];
      for (const s of MOVES_POOL) for (const x of by.get(s.id) || []) {
        if (!x) continue;
        x.kinds.forEach(k => kinds.add(k));
        if (sizes.length < 400) sizes.push(...x.sizes);
      }
      if (!corpus) return log(`      moves seen: ${[...kinds].join(', ')}; median edit ${median(sizes)} characters (checked at the full level)`);
      assert(['beat', 'variant', 'seg', 'slide'].every(k => kinds.has(k)), `moves seen: ${[...kinds]}`);
      assert(median(sizes) <= 80, `median edit ${median(sizes)} characters`);
    } },
  { name: 'second thoughts: a passing melody plays the song\'s own part in its scale, then leaves; refined parts end as written', songs: isLong,
    each(s) {
      let passing = 0;
      const c = coder(s, { pace: 'medium', development: 'by-type', opening: 'slow' });
      if (!shaped(c)) return 0;
      const steps = buildSteps(c);
      for (const t of c.tracks) {
        const adds = steps.filter(x => x.add === t.id && x.at < c.crescendo.growth), gone = steps.find(x => x.remove === t.id && adds[0] && x.at > adds[0].at);
        if (adds.length < 2 || !gone || gone.at > adds[1].at) continue;
        passing++;
        const st = stateAt(c, adds[0].at).song.tracks.find(x => x.id === t.id), name = st.clips[0].pattern, base = name.replace(/~\w+$/, ''), pat = st.patterns[name];
        assert(s.tracks.find(x => x.id === t.id).patterns[base], `${s.id} ${t.id}: ${name} is not its own part`);
        // written notes are scale degrees: whole numbers only (the scale of the section places them)
        if (pat.notes) assert(String(pat.notes).split(/[\s[\]<>~*!@,.]+/).filter(Boolean).every(x => /^-?\d+$/.test(x) || /^[a-g][#b]?\d$/i.test(x)), `${s.id} ${t.id}: ${pat.notes}`);
      }
      assert(ends(c), `${s.id}: a refined part does not end as written`);
      return passing;
    },
    after(rows, { corpus, log }) { const passing = rows.reduce((a, r) => a + r.data, 0); if (corpus) assert(passing >= 3, `${passing} passing melodies`); else log(`      ${passing} passing melodies (3 or more checked at the full level)`); } },
  { name: 'ideas grow: on songs written as ideas, each growth step adds one number of a beat', unit() {
    const conv = s => ({ ...s, id: `${s.id}-ideas`, tracks: s.tracks.map(t => (t.type !== 'drums' ? t : { ...t, patterns: Object.fromEntries(Object.entries(t.patterns).map(([k, p]) => [k, p.rows ? { idea: { beat: { grid: 16, ...Object.fromEntries(Object.entries(p.rows).filter(([, v]) => /x/.test(v)).map(([r, v]) => [r, [...v].map((x, i) => (x === 'x' ? i : -1)).filter(i => i >= 0).join(',')])) } } } : p])) })) });
    const nums = p => (p && p.idea && p.idea.beat ? Object.entries(p.idea.beat).filter(([r]) => r !== 'grid').flatMap(([r, v]) => String(v).split(',').map(k => `${r}${k.trim()}`)) : null);
    let checked = 0;
    for (const s of [byId('example-ideas'), byId('example-material'), conv(byId('switch-prima-luce'))].filter(Boolean)) {
      const c = coder(s, { pace: 'slow', opening: 'slow', development: 'by-type' });
      for (const t of c.tracks.filter(x => x.type === 'drums')) {
        // the pattern the growth plays, and the level of each step on it (a step after another on the same bar too)
        const base = String((t.clips[0] || {}).pattern).replace(/~\w+$/, ''), at = lv => t.patterns[lv ? `${base}~${lv}` : base];
        const steps = buildSteps(c).filter(x => x.pattern && x.pattern.track === t.id && x.pattern.level !== undefined && x.at < c.crescendo.growth);
        for (let k = 1; k < steps.length; k++) {
          const na = nums(at(steps[k - 1].pattern.level)), nb = nums(at(steps[k].pattern.level));
          if (!na || !nb || steps[k].pattern.level >= steps[k - 1].pattern.level) continue;
          checked++;
          assert(nb.length - na.length === 1 && na.every(x => nb.includes(x)), `${s.id} ${t.id} level ${steps[k - 1].pattern.level} → ${steps[k].pattern.level}: ${na.length} → ${nb.length}`);
        }
      }
    }
    assert(checked >= 6, `${checked} beat steps`);
  } },
  { name: 'bursts: the human typing never has to rush a step of a Live coder growth (Prima luce before and after)', unit(log) {
    const C = resolveProfile('switch'), rep = [];
    for (const id of ['switch-prima-luce', 'switch-tappe', 'switch-trance-prova', 'switch-acid-prova', 'switch-house-prova']) {
      const s = byId(id);
      for (const which of ['before', 'after']) {
        const b = which === 'before' ? crescendoSong(s, { rules: { natural: true, coder: true, free: true } }) : coder(s), L = liveCode(b, C, { cols: () => 80 });
        const load = typingLoad(L, { seed: id, to: b.crescendo.grown }), worst = Math.max(...load.map(x => x.ratio)), rushed = load.filter(x => x.ratio > 1.1).length;
        const near = load.filter(x => x.seconds >= 165 && x.seconds <= 200), burst = near.length ? Math.max(...near.map(x => x.ratio)) : 0;
        rep.push({ id, which, steps: load.length, rushed, worst, burst, short: Math.min(...load.map(x => x.gap)) });
      }
    }
    for (const r of rep) log(`      ${r.id} ${r.which}: ${r.steps} steps, shortest gap ${r.short.toFixed(1)} s, ${r.rushed} steps typed faster than a person (x1.1 or more), worst x${r.worst.toFixed(2)}, 2:45-3:20 worst x${r.burst.toFixed(2)}`);
    const pl = rep.filter(r => r.id === 'switch-prima-luce'), before = pl[0], after = pl[1];
    assert(after.burst <= 1.1 && before.burst > 2, `Prima luce around 2:54: x${before.burst.toFixed(2)} → x${after.burst.toFixed(2)}`);
    const tot = w => rep.filter(r => r.which === w).reduce((a, r) => a + r.rushed, 0);
    assert(tot('after') * 3 <= tot('before'), `rushed steps ${tot('before')} → ${tot('after')}`);
  } },
  { name: 'fixtures: a change to the shape rules raises SHAPES_VERSION (Live coder builds)', songs: all, each: s => print(coder(s)),
    after(rows) {
      const r = fixtures(CODER_FIXTURES, SHAPES_VERSION, rows, '--write-fixtures');
      if (!r) return;
      assert(r.old, 'no Live coder fixtures: run with --write-fixtures');
      assert(!r.changed.length || r.old.version < r.now.version, `Live coder steps changed for ${r.changed.slice(0, 6).join(', ')}: raise SHAPES_VERSION and run with --write-fixtures`);
      assert(!r.changed.length && r.old.version === r.now.version, 'shape version raised: run with --write-fixtures to record the new fixtures');
    } },
  { name: 'fixtures: a rules change raises CRESCENDO_VERSION', protect: true, songs: all, each: s => print(builtOf(s)),
    after(rows) {
      const r = fixtures(FIXTURES, CRESCENDO_VERSION, rows, '--write');
      if (!r) return;
      assert(r.old, `no fixtures: run with --write`);
      assert(!r.changed.length || r.old.version < r.now.version, `steps changed for ${r.changed.join(', ')}: raise CRESCENDO_VERSION and run with --write`);
      assert(!r.changed.length && r.old.version === r.now.version, `version raised: run with --write to record the new fixtures`);
    } },
];

// a task: { kind: 'song', song, check, part } → { data } | { error };
// { kind: 'unit', name } → { error?, logs }
export function runTask(task) {
  clearCaches();
  if (task.kind === 'unit') {
    const c = CHECKS.find(x => x.name === task.name), logs = [];
    try { c.unit(s => logs.push(s)); return { logs }; } catch (e) { return { error: e.message, logs }; }
  }
  const s = byId(task.song), c = CHECKS.find(x => x.name === task.check);
  try { return { data: c.each(s, task.part) ?? null }; } catch (e) { return { error: e.message }; }
}
