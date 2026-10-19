// Checks for Crescendo (#64), the live build that grows a song in small steps. No browser.
// Every song in songs/ is built in crescendo and checked: same seed same build, every growth step on one track,
// one track per bar, every state compiles, the state after the growth compiles to the song as written (with its
// growth span), length within three times the written one, endings not all alike, no function the compiler does not
// already emit. Fixtures: a fingerprint of the steps per song; a change means CRESCENDO_VERSION must go up.
// Growth shapes (growth-shapes): who chooses the shape, every opening's first waypoint, pace, developments, moves,
// second thoughts, ideas that grow, typing without bursts, and the Live coder fixtures (SHAPES_VERSION).
//   npm run check:crescendo            exit 1 when any check fails
//   npm run check:crescendo -- --write rewrite the fixtures (after raising CRESCENDO_VERSION)
//   npm run check:crescendo -- --write-fixtures   rewrite the Live coder fixtures (after raising SHAPES_VERSION)
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
import { crescendoSong, patternVariants, waypointSong, CRESCENDO_VERSION } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { resolveShape, shapeFacts, canPlay, SHAPES_VERSION, OPENINGS } from '../src/song/shapes.js';
import { compileNow } from '../src/song/compile-compact.js';
import { audible, firstMinute, fullKick, typingLoad, barSeconds } from './growth-measure.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const FIXTURES = 'tools/fixtures/crescendo.json';
const CODER_FIXTURES = 'tools/fixtures/live-coder.json';
const styles = Object.fromEntries(fs.readdirSync('styles').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`styles/${f}`, 'utf8'))).map(r => [r.id, r]));
const songs = songFiles('songs').filter(f => !f.includes('/endless/')).map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
  .map(s => (s.scenes ? fromScenes(s) : s)).filter(s => Array.isArray(s.sections) && s.sections.length);
const built = new Map(songs.map(s => [s.id, crescendoSong(s)]));
const total = s => s.sections.reduce((a, x) => a + x.bars, 0);
const fns = code => new Set([...code.matchAll(/\.([a-zA-Z]+)\(/g)].map(m => m[1]));
// a Live coder build with some parts of the shape set (the others automatic)
const coderCache = new Map();
const coder = (s, over = {}) => { const k = `${s.id} ${JSON.stringify(over)}`; if (!coderCache.has(k)) coderCache.set(k, crescendoSong(s, { rules: growthRules(resolveProfile('switch', over), { styles }) })); return coderCache.get(k); };
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
      ['degradeBy', 'echo', 'off', 'ply', 'rev', 'jux', 'delay', 'delaysync', 'delayfeedback', 'room', 'roomsize', 'distort', 'shape', 'crush', 'coarse', 'phaser', 'phaserdepth', 'tremolosync', 'tremolodepth', 'vowel', 'hpf', 'hpq', 'lpf', 'lpq', 'pan', 'slow', 'add', 'late'].forEach(f => known.add(f));
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
  'like a live coder: same build twice, ends on the written song, every state compiles, within three times'() {
    const rules = { natural: true, coder: true, free: true };
    for (const s of songs) {
      const c = crescendoSong(s, { rules });
      assert(JSON.stringify(crescendoSong(s, { rules }).build) === JSON.stringify(c.build), `${s.id}: same build twice`);
      assert(compileSong(stateAt(c, c.crescendo.grown).song) === compileSong({ ...c, build: undefined }), `${s.id}: end`);
      for (const b of [...new Set(buildSteps(c).map(x => x.at))]) compileSong(stateAt(c, b).song);
      assert(total(c) <= 3 * c.crescendo.written, `${s.id}: length ${total(c)}`);
      const errs = []; checkBuild(c, total(c), (p, m) => errs.push(`${p}: ${m}`), () => {});
      assert(!errs.length, `${s.id}: ${errs[0]}`);
    }
  },
  'like a live coder: 4 to 6 waypoints, the first with one or two tracks, detours only after the first passage'() {
    let none = 0, all = 0, clones = 0, kinds = new Set();
    for (const s of songs) {
      const c = crescendoSong(s, { rules: { natural: true, coder: true, free: true } });
      if (!c.crescendo.coder) continue;
      all++;
      const wp = c.crescendo.waypoints;
      assert(wp.length >= 4 && wp.length <= 6, `${s.id}: ${wp.length} waypoints`);
      const on = stateAt(c, wp[0]).song.tracks.filter(t => !t.mute && t.type !== 'voice');
      assert(on.length >= 1 && on.length <= 2, `${s.id}: ${on.length} tracks at the first waypoint`);
      const steps = buildSteps(c).filter(x => x.at > 0 && x.at <= c.crescendo.grown);
      // no detour before the second waypoint
      assert(!steps.some(x => x.at <= wp[1] && (x.comment || x.notes || (x.remove !== undefined && x.at < c.crescendo.growth))), `${s.id}: detour in the first passage`);
      if (!c.crescendo.detours) none++;
      steps.forEach(x => { if (x.clone) clones++; ['comment', 'notes', 'remove'].forEach(k => { if (x[k] !== undefined) kinds.add(k); }); });
    }
    assert(all >= 10 && none < all * 0.4, `straight songs ${none} of ${all}`);
    assert(clones > 0 && kinds.size === 3, `clones ${clones}, detour kinds ${[...kinds]}`);
  },
  'like a live coder: small moves (a step changes a few characters, entries and clones apart)'() {
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
  },
  'like a live coder: the normal version starts with the waypoints, one section each'() {
    const s = songs.find(x => x.id === 'switch-tappe'), c = crescendoSong(s, { rules: { natural: true, coder: true, free: true } }), w = waypointSong(s);
    assert(w.sections.length === s.sections.length + c.crescendo.waypoints.length - 1, `${w.sections.length} sections`);
    const code = compileSong(w), errs = [];
    checkBuild(w, total(w), (p, m) => errs.push(m), () => {});
    assert(code.includes('$:') && !errs.length && w.tracks.find(t => t.type === 'drums').clips[0].start === 0, 'the first waypoint plays the anchor');
  },
  'like a live coder: the chooser can be replaced'() {
    const s = songs.find(x => x.id === 'switch-prima-luce'), first = (lanes) => lanes.findIndex(l => l.units.length);
    const a = crescendoSong(s, { rules: { natural: true, coder: true, free: true } }), b = crescendoSong(s, { rules: { natural: true, coder: true, free: true, chooser: first } });
    assert(JSON.stringify(a.build) !== JSON.stringify(b.build), 'same order');
    assert(compileSong(stateAt(b, b.crescendo.grown).song) === compileSong({ ...b, build: undefined }), 'end');
  },
  // ---------- growth shapes (growth-shapes) ----------
  'shapes: same song same shape, the song wins, style weights followed over 200 seeds, impossible openings left out'() {
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
  },
  'shapes: Classic and Crescendo take no shape; the Live coder build records it'() {
    for (const s of songs.slice(0, 10)) assert(!crescendoSong(s).crescendo.shape && !crescendoSong(s, { rules: growthRules(resolveProfile('crescendo')) }).crescendo.shape, s.id);
    assert(shaped(coder(byId('switch-prima-luce'))) && coder(byId('switch-prima-luce')).crescendo.shape.version === SHAPES_VERSION, 'Live coder');
  },
  'shapes: every build of every opening and development ends on its destination and every state compiles (medium pace)'() {
    let n = 0;
    for (const s of songs.filter(x => total(x) >= 24)) for (const opening of OPENINGS) for (const development of ['by-type', 'as-written', 'masks', 'parameters', 'second-section', 'metamorphosis']) {
      if (!canPlay('opening', opening, shapeFacts(s, styles))) continue;
      const c = coder(s, { opening, development, pace: 'medium' });
      if (!shaped(c)) continue;
      n++;
      const errs = []; checkBuild(c, total(c), (p, m) => errs.push(`${p}: ${m}`), () => {});
      assert(!errs.length, `${s.id} ${opening}/${development}: ${errs[0]}`);
      for (const b of [...new Set(buildSteps(c).map(x => x.at))]) compileSong(stateAt(c, b).song);
      assert(ends(c), `${s.id} ${opening}/${development}: does not end on its destination`);
      assert(total(c) <= 3 * c.crescendo.written, `${s.id} ${opening}/${development}: length ${total(c)} of ${c.crescendo.written}`);
    }
    assert(n > 500, `${n} builds`);
  },
  'openings: the first waypoint of each opening, on every song that can play it'() {
    for (const s of songs.filter(x => total(x) >= 24)) {
      const f = shapeFacts(s, styles);
      for (const opening of OPENINGS.filter(o => canPlay('opening', o, f))) {
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
        if (opening === 'typed') assert(c.crescendo.shape.leadIn >= 1 && at === c.crescendo.shape.leadIn && !audible(compileSong(stateAt(c, 0).song)).trim(), `${who}: first sound at ${at}, lead-in ${c.crescendo.shape.leadIn}`);
        if (opening === 'muted-base') { const st = stateAt(c, 0).song.tracks.filter(t => !t.mute && t.type !== 'voice'); assert(st.length >= 3 && st.filter(t => t.hush).length === st.length - 1, `${who}: ${st.length} written, ${st.filter(t => t.hush).length} muted`); }
        if (opening === 'mid-set') { const st = stateAt(c, 0).song.tracks.filter(t => !t.mute && t.type !== 'voice'); assert(st.length >= 3 && st.filter(t => t.alone).length === 2 && on.length === 2, `${who}: ${st.filter(t => t.alone).length} in solo`); }
      }
    }
  },
  'openings: fragments of a typed opening start after its silent lead-in'() {
    for (const s of songs.filter(x => total(x) >= 24).slice(0, 20)) {
      const c = coder(s, { opening: 'typed', pace: 'medium' });
      if (!shaped(c)) continue;
      const n = normalizeSong(c), map = buildMap(c, n.total), steps = [...new Set(buildSteps(c).map(x => x.at))];
      const shape = { bars: n.total, sections: n.sections.map(x => ({ label: x.name, start: x.start, len: x.bars })), tracks: n.tracks.map(t => ({ ...t, off: map[t.id].off })), steps };
      for (const p of pickFragments(shape, n.sections.flatMap(x => Array(x.bars).fill(x.bpm)), { n: 2, length: 15, seed: c.id })) assert(p.bar >= c.crescendo.shape.leadIn, `${s.id}: fragment at bar ${p.bar}, lead-in ${c.crescendo.shape.leadIn}`);
    }
  },
  'openings: muted base and mid-set: each step takes away one "_" or one "S", and every view shows the marks'() {
    for (const s of songs.filter(x => total(x) >= 24).slice(0, 20)) for (const opening of ['muted-base', 'mid-set']) {
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
  },
  'pace: audible changes in the first minute (medium 4 to 6, fast 7 to 8; slow as today) and the kick whole within 60 s'() {
    const out = { slow: [], medium: [], fast: [] }, kick = { medium: [], fast: [] }, off = [];
    for (const s of songs.filter(x => total(x) >= 24)) for (const pace of ['slow', 'medium', 'fast']) {
      const c = coder(s, { pace });
      // (a metamorphosis reveals the whole written song in one to three steps: its first minute is that reveal)
      if (!shaped(c) || c.crescendo.shape.development === 'metamorphosis') continue;
      const n = firstMinute(c).length;
      out[pace].push(n);
      if ((pace === 'medium' && (n < 4 || n > 6)) || (pace === 'fast' && (n < 7 || n > 8))) off.push(`${s.id} ${pace} ${n}`);
      const k = pace !== 'slow' && fullKick(c);
      if (k && k.first !== null) { kick[pace].push(k.fromFirst); if (k.fromFirst > 61) off.push(`${s.id} ${pace} kick ${k.fromFirst.toFixed(0)} s`); }
    }
    const share = (a, lo, hi) => a.filter(x => x >= lo && x <= hi).length / a.length;
    console.log(`      first minute: slow ${median(out.slow)} (${Math.min(...out.slow)}-${Math.max(...out.slow)}), medium ${median(out.medium)} (${Math.min(...out.medium)}-${Math.max(...out.medium)}), fast ${median(out.fast)} (${Math.min(...out.fast)}-${Math.max(...out.fast)}); kick whole after median ${median(kick.medium).toFixed(0)} s medium, ${median(kick.fast).toFixed(0)} s fast, at most ${Math.max(...kick.medium, ...kick.fast).toFixed(0)} s`);
    if (off.length) console.log(`      outside the range (a new line takes longer to type than a fast step allows): ${off.join(', ')}`);
    // never above the range; below it only where the next line takes longer to type than the pace allows (typing
    // never rushes): medium within one change, fast within two, and most builds inside the range (open question in
    // the change's tasks)
    console.log(`      inside the range: medium ${Math.round(share(out.medium, 4, 6) * 100)}%, fast ${Math.round(share(out.fast, 7, 8) * 100)}%`);
    assert(Math.max(...out.medium) <= 6 && Math.min(...out.medium) >= 3 && share(out.medium, 4, 6) >= 0.85, 'medium');
    // (the automatic shape avoids rushed typing first, even when a calmer development has fewer early changes)
    assert(Math.max(...out.fast) <= 8 && Math.min(...out.fast) >= 4 && share(out.fast, 7, 8) >= 0.5 && median(out.fast) >= 7, 'fast');
    assert(Math.max(...kick.medium, ...kick.fast) <= 61, 'kick');
  },
  'development: as written, the arpeggio test song opens with its arpeggio'() {
    const c = coder(byId('prova-apre-arpeggio'), { development: 'as-written', opening: 'typed' }), on = heardTracks(c, firstSound(c));
    assert(on.length === 1 && on[0].type === 'arp', on.map(t => t.id).join());
  },
  'development: masks come and go, and the song ends as written'() {
    let masked = 0;
    for (const s of songs.filter(x => total(x) >= 24).slice(0, 16)) {
      const c = coder(s, { development: 'masks', pace: 'medium' });
      if (!shaped(c)) continue;
      masked += buildSteps(c).filter(x => x.mask && x.mask.mask).length;
      assert(ends(c) && !stateAt(c, c.crescendo.grown).song.tracks.some(t => t.maskIdea), `${s.id}: a mask left`);
    }
    assert(masked > 10, `${masked} masks`);
  },
  'development: parameters: after the first two waypoints no step adds or removes a track'() {
    for (const s of songs.filter(x => total(x) >= 24)) {
      const c = coder(s, { development: 'parameters', opening: 'slow', pace: 'medium' });
      if (!shaped(c) || !c.crescendo.coder) continue;
      const w2 = c.crescendo.waypoints[1];
      const bad = buildSteps(c).filter(x => x.at > w2 && x.at < c.crescendo.growth && ['add', 'remove', 'clone', 'unmute', 'unsolo', 'mute', 'solo'].some(k => x[k] !== undefined));
      assert(!bad.length, `${s.id}: ${JSON.stringify(bad[0])}`);
    }
  },
  'development: second section: new lines alone with "S$:", then everything plays'() {
    let seen = 0;
    for (const s of songs.filter(x => total(x) >= 24)) {
      const c = coder(s, { development: 'second-section', opening: 'slow', pace: 'medium' });
      if (!shaped(c)) continue;
      const solos = buildSteps(c).filter(x => x.solo !== undefined && x.at > 0), un = buildSteps(c).find(x => x.unsolo !== undefined);
      if (!solos.length) continue;
      seen++;
      const b = solos[0].at, on = heardTracks(c, b);
      assert(on.every(t => t.alone) && /^S\$:/m.test(compileSong(stateAt(c, b).song)), `${s.id}: not alone at ${b}`);
      assert(un && un.at > b && heardTracks(c, un.at).length > on.length, `${s.id}: the marks never go`);
    }
    assert(seen >= 10, `${seen} songs`);
  },
  'development: metamorphosis: tempo and key on a phrase boundary, a style of the same family, every state compiles, ends on the last skin'() {
    let seen = 0;
    for (const s of songs.filter(x => total(x) >= 24)) {
      if (!canPlay('development', 'metamorphosis', shapeFacts(s, styles))) continue;
      const c = coder(s, { development: 'metamorphosis', pace: 'medium' }), sk = c.crescendo.shape.skin;
      assert(sk && sk.at % 8 === 0, `${s.id}: skin at ${sk && sk.at}`);
      seen++;
      const fam = styles[s.tags.styles[0]].family;
      assert(styles[sk.style].family === fam && sk.style !== s.tags.styles[0], `${s.id}: ${sk.style}`);
      const after = c.sections.slice(c.crescendo.sections);
      assert(c.sections[1].bpm === sk.bpm && c.sections[1].key === sk.key && after.every(x => x.key !== undefined), `${s.id}: sections`);
      assert(Math.abs(sk.bpm - s.sections[0].bpm) <= 12 || sk.bpm * 2 === s.sections[0].bpm || sk.bpm === Math.round(s.sections[0].bpm / 2) || sk.bpm === s.sections[0].bpm * 2, `${s.id}: tempo ${sk.bpm}`);
      for (const b of [...new Set(buildSteps(c).map(x => x.at))]) compileSong(stateAt(c, b).song);
      assert(ends(c), `${s.id}: ends elsewhere`);
      // one line rewritten per step
      assert(buildSteps(c).filter(x => x.pattern && x.pattern.to === 'skin').every(x => !Array.isArray(x.pattern.track)), `${s.id}: lines`);
    }
    assert(seen >= 8, `${seen} songs`);
  },
  'moves: a beat step moved, a prepared variant, seg(16) on a held chord and a slow slide appear, each a small edit'() {
    const kinds = new Set(), sizes = [];
    const pool = [...songs.filter(x => total(x) >= 24 && /switch|prova|example-|crescendo-/.test(x.id)), byId('example-ideas'), byId('example-material')].filter(Boolean);
    for (const s of pool) for (const pace of ['slow', 'medium']) for (const seed of [undefined, 'a', 'b', 'c']) {
      const c = seed ? crescendoSong(s, { seed, rules: growthRules(resolveProfile('switch', { pace, development: 'by-type' }), { styles }) }) : coder(s, { pace, development: 'by-type' });
      if (!shaped(c)) continue;
      for (const x of buildSteps(c)) {
        if (x.notes && (x.notes.rows || (x.notes.idea && x.notes.idea.beat))) kinds.add('beat');
        if (x.variant && Number.isInteger(x.variant.use)) kinds.add('variant');
        if (x.rack && x.rack.device === 'seg') kinds.add('seg');
      }
      if (buildSteps(c).filter(x => x.set && x.set.cutoff !== undefined && x.at > 0).length >= 5) kinds.add('slide');
      if (sizes.length < 400) {
        const L = liveCode(c, resolveProfile('switch'));
        for (const x of buildSteps(L.build).filter(y => y.at > 0 && y.at <= c.crescendo.grown && !y.add && !y.clone && !y.solo && !y.unmute && Object.keys(y).some(k => !['at', 'say', 'i'].includes(k)))) {
          const a = L.codeAt(x.at - 1).split('\n'), b = L.codeAt(x.at).split('\n'); sizes.push(b.filter(l => !a.includes(l)).join('').length);
        }
      }
    }
    assert(['beat', 'variant', 'seg', 'slide'].every(k => kinds.has(k)), `moves seen: ${[...kinds]}`);
    assert(median(sizes) <= 80, `median edit ${median(sizes)} characters`);
  },
  'second thoughts: a passing melody plays the song\'s own part in its scale, then leaves; refined parts end as written'() {
    let passing = 0;
    for (const s of songs.filter(x => total(x) >= 24)) {
      const c = coder(s, { pace: 'medium', development: 'by-type', opening: 'slow' });
      if (!shaped(c)) continue;
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
    }
    assert(passing >= 3, `${passing} passing melodies`);
  },
  'ideas grow: on songs written as ideas, each growth step adds one number of a beat'() {
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
  },
  'bursts: the human typing never has to rush a step of a Live coder growth (Prima luce before and after)'() {
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
    for (const r of rep) console.log(`      ${r.id} ${r.which}: ${r.steps} steps, shortest gap ${r.short.toFixed(1)} s, ${r.rushed} steps typed faster than a person (x1.1 or more), worst x${r.worst.toFixed(2)}, 2:45-3:20 worst x${r.burst.toFixed(2)}`);
    const pl = rep.filter(r => r.id === 'switch-prima-luce'), before = pl[0], after = pl[1];
    assert(after.burst <= 1.1 && before.burst > 2, `Prima luce around 2:54: x${before.burst.toFixed(2)} → x${after.burst.toFixed(2)}`);
    const tot = w => rep.filter(r => r.which === w).reduce((a, r) => a + r.rushed, 0);
    assert(tot('after') * 3 <= tot('before'), `rushed steps ${tot('before')} → ${tot('after')}`);
  },
  'fixtures: a change to the shape rules raises SHAPES_VERSION (Live coder builds)'() {
    const now = { version: SHAPES_VERSION, songs: Object.fromEntries(songs.map(s => [s.id, print(coder(s))])) };
    if (process.argv.includes('--write-fixtures')) { fs.writeFileSync(CODER_FIXTURES, JSON.stringify(now, null, 2) + '\n'); return; }
    const old = fs.existsSync(CODER_FIXTURES) ? JSON.parse(fs.readFileSync(CODER_FIXTURES, 'utf8')) : null;
    assert(old, 'no Live coder fixtures: run with --write-fixtures');
    const changed = Object.keys(now.songs).filter(id => old.songs[id] && old.songs[id] !== now.songs[id]);
    assert(!changed.length || old.version < now.version, `Live coder steps changed for ${changed.slice(0, 6).join(', ')}: raise SHAPES_VERSION and run with --write-fixtures`);
    assert(!changed.length && old.version === now.version, 'shape version raised: run with --write-fixtures to record the new fixtures');
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
