// Checks for song functions (song-functions). No browser.
//   npm run check:functions     exit 1 when any check fails
// For every built-in song and every live build step in the Live coder profile (compact), each line with its functions
// written out again is exactly the line of the same code without song and library functions; the compact code is
// shorter (the reduction is printed). Also: names, parameters, growth, the library, the presets and the update of
// hand-coded code saved before song-functions.
// The checks that build songs run in worker processes (tools/check-pool.mjs), the first one song by song, and their
// results are kept in the shared code cache (tools/code-cache.mjs) under a hash of the song files and of the app code
// this check runs; --no-cache runs everything again and must print the same result (faster-checks).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheKey, cacheGet, cachePut, cacheLine, cachePrune } from './code-cache.mjs';
import { runPool } from './check-pool.mjs';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules, cleanOverrides, PROFILES } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps, saySlug, sayText } from '../src/song/build.js';
import { chainLines } from '../src/song/typing.js';
import { writeCode, expandLine, songFunctions, functionContext, functionPreset, functionOptions, FUNCTION_PRESETS, upgradeCode, preludeText, partsOf, matchParts, expandParts } from '../src/song/writer.js';
import { LIBRARY, nameOrder } from '../src/song/functions.js';
import { upgradeLibrary } from '../src/library/code-upgrade.js';
import { mergeBackup, BACKUP_FORMAT } from '../src/settings/backup.js';
import { songFiles } from './songs-dir.mjs';
import { compileSong } from '../src/song/compile.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = { say_it: Array.from({ length: 200 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 200 }, (_, i) => `say_en/${i}.wav`) };
const songs = songFiles(path.join(ROOT, 'songs')).filter(f => !f.includes(`${path.sep}endless${path.sep}`)).map(f => ({ file: path.relative(ROOT, f), song: JSON.parse(fs.readFileSync(f, 'utf8')) }));
// a line without line breaks before its calls (the line breaks of a folded run go with it)
const flat = l => l.replace(/\s*\n\s*(?=\.)/g, '');
// the live builds of a song in the Live coder profile: compact and the same without song and library functions
function builds(song, over = {}) {
  const C = resolveProfile('switch', over), W = resolveProfile('switch', { ...over, fnSong: false, fnLib: false, fnVoice: false }), F = resolveProfile('switch', { ...over, functions: 'full' });
  const b = crescendoSong(song, { narrated: C.narrated, rules: growthRules(C) });
  // a sample for every phrase of the build, in every bank (the spoken comments need one to be written)
  const said = buildSteps(b).filter(x => x.say).map(x => `x/${saySlug(sayText(x.say, 'en'))}.wav`), any = new Proxy({}, { get: () => said });
  const mk = X => liveCode(b, X, { lang: () => 'en', files: () => (over.voice ? any : files), cols: () => 0 });
  const c = mk(C), w = mk(W), f = mk(F);
  return { c, w, f, bars: [0, ...new Set(buildSteps(c.build).map(x => x.at))] };
}
// the song functions a build calls over all its steps: [[name, { params, chain }]]
const songFns = B => { B.bars.forEach(b => B.c.codeAt(b)); return Object.entries(B.c.fns).filter(([, f]) => !f.lib).sort(([a], [b]) => a.localeCompare(b)); };
const newStats = () => ({ steps: 0, lines: 0, folded: 0, compact: 0, written: 0, full: 0, lastCompact: 0, lastWritten: 0, lastFull: 0, fns: 0, lib: new Set(), names: new Map() });
let stats = newStats();
// every step: expansion gives the written-out line, line for line → problems
function expandSteps(file, B, { voice = false } = {}) {
  const bad = [];
  B.bars.forEach((bar, i) => {
    const cc = B.c.codeAt(bar), ww = B.w.codeAt(bar), ff = B.f.codeAt(bar), cl = chainLines(cc), wl = chainLines(ww);
    if (cl.length !== wl.length) { bad.push(`${file} bar ${bar}: ${cl.length} lines, written out ${wl.length}`); return; }
    cl.forEach((l, k) => { if (flat(expandLine(l, B.c.fns)) !== flat(wl[k])) bad.push(`${file} bar ${bar}:\n  ${flat(l)}\n  → ${flat(expandLine(l, B.c.fns))}\n  ≠ ${flat(wl[k])}`); });
    if (voice) return;
    stats.steps++; stats.lines += cl.length; stats.folded += cl.filter((l, k) => l !== wl[k]).length;
    stats.compact += cc.length; stats.written += ww.length; stats.full += ff.length;
    if (i === B.bars.length - 1) { stats.lastCompact += cc.length; stats.lastWritten += ww.length; stats.lastFull += ff.length; }
  });
  return bad;
}

// the first check on one song (a worker task): { bad, stats } with the song's share of the numbers
function songSteps({ file, song }) {
  stats = newStats();
  const B = builds(song), bad = expandSteps(file, B);
  for (const [k, f] of Object.entries(B.c.fns)) { if (f.lib) stats.lib.add(k); else { stats.fns++; stats.names.set(k, (stats.names.get(k) || 0) + 1); } }
  return { bad, stats: { ...stats, lib: [...stats.lib], names: [...stats.names] } };
}
// the songs' shares, added in song order
function addSteps(rows) {
  stats = newStats();
  const bad = [];
  for (const r of rows) {
    // a song whose build throws stops the check with its message, as one loop over the songs would
    if (r.error) throw new Error(r.error);
    bad.push(...r.bad);
    for (const [k, v] of Object.entries(r.stats)) if (typeof v === 'number') stats[k] += v;
    r.stats.lib.forEach(k => stats.lib.add(k));
    for (const [k, n] of r.stats.names) stats.names.set(k, (stats.names.get(k) || 0) + n);
  }
  return bad;
}
let songRows = null;
const CHECKS = {
  'every built-in song, every Live coder step: the functions written out give the line without them'() {
    const bad = addSteps(songRows || songs.map(songSteps));
    assert(!bad.length, `${bad.length} lines differ:\n${bad.slice(0, 6).join('\n')}`);
    assert(stats.compact < stats.written && stats.lastCompact < stats.lastWritten, `compact ${stats.compact} chars, written out ${stats.written}`);
  },
  'voice lines: the voice effects become a song function and expand back'() {
    const bad = [];
    let calls = 0;
    for (const id of ['switch-prima-luce', 'crescendo-primo-passo', 'switch-acid-prova']) {
      const B = builds(JSON.parse(fs.readFileSync(`songs/${id}.json`, 'utf8')), { voice: true, narrated: true });
      bad.push(...expandSteps(id, B, { voice: true }));
      const all = B.bars.map(b => B.c.codeAt(b)).join('\n');
      calls += (all.match(/s\("say_[^\n]*\.(mouth|whisper|tell|narrate|murmur)\d*\(\)/g) || []).length;
      assert(!/\.voice\(/.test(all), `${id}: .voice( written`);
    }
    assert(!bad.length, bad.slice(0, 4).join('\n'));
    assert(calls > 0, 'no voice line called its function');
  },
  async 'voice effects fold on every generated voice line (voice-track-tuning D12), shown or hidden with V:N code and V:T code off, and sound the same'() {
    const { sessionItems, GROWTH_ON_AIR } = await import('../src/endless/items.js');
    const { loadStyles } = await import('./styles-dir.mjs');
    const { validateRecipe, recipeOrder } = await import('../src/endless/recipe.js');
    const { hapsAt } = await import('./mixer-checks.mjs');
    const { setSpokenContext } = await import('../src/song/spoken.js');
    const R = loadStyles().filter(r => !validateRecipe(r).errors.length).sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
    setSpokenContext({ styles: Object.fromEntries(R.map(r => [r.id, r])) });
    const ids = ['dark-cyberpunk', 'synthwave', 'berlin-techno', 'ambient', 'lo-fi'], voice = { presence: 'always', phrases: '4-5', kind: 'mixed', where: ['quiet', 'medium', 'busy'] };
    const unfolded = l => /say_/.test(l) && /\.mask\("[^"]*"\)\s*\.(speed|stretch|lpf|hpf|distort|delay|room|postgain)\(/.test(l.replace(/\s*\n\s*/g, ''));
    let songs = 0, lines = 0, hiddenLines = 0;
    for (let i = 0; i < 20; i++) {
      const profile = i < 8 ? 'classic' : i < 14 ? 'crescendo' : 'switch';
      const rec = { seed: `fold-${i}`, options: { styles: [ids[i % ids.length]], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, transition: 'artist', harmony: 'artist', profile, voice }, changes: [], growth: GROWTH_ON_AIR };
      const song = sessionItems(R, rec, 1, null, { grow: true })[0].song, bars = song.sections.reduce((a, s) => a + s.bars, 0);
      const pid = song.onAir ? song.onAir.profile : 'classic';
      const show = liveCode(song, resolveProfile(pid, { fnVoice: true, voice: true, spoken: true }), { files: () => files, lang: () => 'en' });
      const hide = liveCode(song, resolveProfile(pid, { fnVoice: true, voice: false, spoken: false }), { files: () => files, lang: () => 'en' });
      const at = [...new Set([0, ...buildSteps(show.build).map(s => s.at)])].filter(b => b < bars);
      for (const b of at) {
        const a = show.codeAt(b), h = hide.codeAt(b), tail = hide.run(h).slice(h.length);
        const bad = [...chainLines(show.run ? show.run(a) : a), ...chainLines(tail)].filter(unfolded);
        assert(!bad.length, `${song.id} ${pid} bar ${b}: a voice line with its effects written out: ${bad[0]}`);
        assert(!chainLines(h).some(l => /say_/.test(l)), `${song.id} ${pid} bar ${b}: a voice line shown with both toggles off`);
        lines += chainLines(a).filter(l => /say_/.test(l)).length; hiddenLines += chainLines(tail).filter(l => /say_/.test(l)).length;
      }
      // the same voice haps on the bars where the voice track starts
      const sp = song.tracks.find(t => t.type === 'spoken');
      for (const b of [...new Set(((sp && sp.clips) || []).map(c => c.start))].slice(0, 3)) {
        const v = x => x.filter(y => /^say_/.test(y.s)).map(y => `${y.at.toFixed(4)} ${y.s} ${y.note} ${y.postgain} ${y.room}`).join('|');
        assert(v(await hapsAt(show, show.codeAt(b), b)) === v(await hapsAt(hide, hide.codeAt(b), b)), `${song.id} ${pid} bar ${b}: the voice sounds differently with its code hidden`);
      }
      songs++;
    }
    assert(lines > 20 && hiddenLines > 20, `${lines} voice lines shown, ${hiddenLines} hidden`);
    console.log(`      ${songs} radio songs: ${lines} voice lines shown and ${hiddenLines} hidden, all folded`);
  },
  'song functions: names from the lists, unique, the same every time; at most three parameters'() {
    for (const { song } of songs.slice(0, 12)) {
      const fa = songFns(builds(song)), fb = songFns(builds(song));
      assert(JSON.stringify(fa) === JSON.stringify(fb), `${song.id}: names change between two runs`);
      for (const [name, f] of fa) {
        assert(/^[a-z]{4,12}\d*$/.test(name), `${song.id}: name ${name}`);
        assert(f.params.length <= 3, `${song.id}: ${name} has ${f.params.length} parameters`);
      }
      assert(new Set(fa.map(([k]) => k)).size === fa.length, `${song.id}: names repeat`);
    }
    // an acid song takes its names from the acid list
    const acid = songs.find(x => x.song.id === 'switch-acid-prova');
    const names = songFns(builds(acid.song)).map(([k]) => k), list = ['squelch', 'burble', 'rubber', 'sizzle', 'gurgle', 'chirp', 'fizzle', 'ooze'];
    assert(names.length && names.every(n => list.includes(n)) && nameOrder(acid.song, 'bass').slice(0, 8).every(n => list.includes(n)), `acid names: ${names.join(', ')}`);
  },
  'repeated envelope and echo: one function, each line with its values; four values or one line: no song function'() {
    const ref = ['// ========== bass ==========', '$: n("0 2").s("sawtooth").lpf(800).decay(.12).sustain(0).delay(.2).mask("<1>")', '// ========== arp ==========', '$: n("0 4").s("triangle").lpf(800).decay(.2).sustain(.1).delay(.4).mask("<1>")'].join('\n');
    const o = functionOptions('compact'), ctx = functionContext(ref, { id: 'x', tags: { styles: ['acid'] } }, { ...o, fnLib: false });
    const w = writeCode(ref, { mode: { ...o, fnLib: false }, fns: ctx }), f = Object.entries(w.fns);
    assert(f.length === 1 && f[0][1].params.length === 3 && /\.s\("sawtooth"\)\.\w+\(\.12, 0, \.2\)\.mask/.test(w.code) && /\.s\("triangle"\)\.\w+\(\.2, \.1, \.4\)\.mask/.test(w.code), w.code);
    // four values differ: that run is never one function (a shorter run inside it may be)
    const four = ref.replace('.lpf(800).decay(.2)', '.lpf(900).decay(.2)');
    const w4 = writeCode(four, { mode: { ...o, fnLib: false }, fns: functionContext(four, { id: 'x' }, { ...o, fnLib: false }) });
    assert(!Object.values(w4.fns).some(x => x.params.length > 3 || /lpf.*decay.*sustain.*delay/.test(x.chain)), w4.code);
    // one line, or one line repeated in the sections of its track: only the library, no song function
    const one = ['// ========== bass ==========', '$: n("0").s("saw").lpf(sine.range(360, 1440).slow(8)).lpq(8).decay(.12).sustain(0).mask(section1)', '$: n("0").s("saw").lpf(sine.range(360, 1440).slow(8)).lpq(8).decay(.12).sustain(0).mask(section2)'].join('\n');
    const w1 = writeCode(one, { mode: 'compact', fns: functionContext(one, { id: 'x' }, functionOptions('compact')) });
    assert(Object.values(w1.fns).every(x => x.lib) && w1.code.includes('.wob(360, 1440).lpq(8).plk(.12, 0).mask(section2)'), w1.code);
  },
  'what stays written out: sound, notes, rhythm, mask, bus and level'() {
    for (const { file, song } of songs.slice(0, 10)) {
      const B = builds(song), code = B.c.codeAt(B.bars[B.bars.length - 1]);
      songFns(B);
      for (const f of Object.values(B.c.fns)) assert(!/\.(s|n|note|sound|bank|scale|chord|voicing|anchor|mode|struct|beat|mask|velocity|orbit|analyze|gain|postgain)\(/.test(f.chain) || /postgain\([^)]*\)$/.test(f.chain), `${file}: ${f.chain}`);
      assert(!/\.s\(/.test(Object.values(B.c.fns).map(f => f.chain).join('')), `${file}: a sound in a function`);
      assert(/\.s\(|\bs\(/.test(code), `${file}: no sound left in view`);
    }
  },
  'library first: delay and room use the library; every library function expands back'() {
    const w = writeCode('$: n("0").s("square").lpf(2400).delay(.3).room(.4).mask("<1>")', { mode: 'compact', fns: functionContext('', { id: 'x' }, functionOptions('compact')) });
    assert(/\.wet\(\.3, \.4\)/.test(w.code) && w.fns.wet && w.fns.wet.lib, w.code);
    for (const f of LIBRARY) {
      const parts = partsOf(f.chain, f.params), vals = f.params.map((_, i) => `${i + 2}${i}0`), text = expandParts(parts, vals);
      assert(parts.filter(x => typeof x === 'number').length === f.params.length, `${f.name}: parameters ${f.params}`);
      assert(JSON.stringify(matchParts(parts, text)) === JSON.stringify(vals), `${f.name}: ${text}`);
      assert(expandLine(`$: s("x").${f.name}(${vals.join(', ')})`, { [f.name]: f }) === `$: s("x")${text}`, f.name);
    }
  },
  'growth: a changed parameter shows as a new value, a changed constant leaves the line written out'() {
    const ref = '$: n("0").s("saw").lpf(800).decay(.1).sustain(0).room(.3).mask("<1>")\n$: n("2").s("saw").lpf(1200).decay(.1).sustain(0).room(.3).mask("<1>")';
    const o = { ...functionOptions('compact'), fnLib: false }, ctx = functionContext(ref, { id: 'g' }, o), w = writeCode(ref, { mode: o, fns: ctx });
    const [name] = Object.keys(w.fns);
    assert(name && w.fns[name].params.length === 1 && w.code.includes(`.${name}(800)`), w.code);
    const step = writeCode('$: n("0").s("saw").lpf(1600).decay(.1).sustain(0).room(.3).mask("<1>")', { mode: o, fns: ctx });
    assert(step.code.includes(`.${name}(1600)`), step.code);
    const changed = writeCode('$: n("0").s("saw").lpf(800).decay(.4).sustain(0).room(.3).mask("<1>")', { mode: o, fns: ctx });
    assert(changed.code.includes('.lpf(800).decay(.4).sustain(0).room(.3)'), changed.code);
    const added = writeCode('$: n("0").s("saw").lpf(800).decay(.1).hpf(200).sustain(0).room(.3).mask("<1>")', { mode: o, fns: ctx });
    assert(added.code.includes('.decay(.1).hpf(200).sustain(0)'), added.code);
  },
  'hidden code: definitions in the prelude, registered without sampling the values'() {
    const pre = preludeText({ bass: 2 }, { wob: { params: ['a', 'b'], chain: '.lpf(sine.range(a, b).slow(8))', lib: true }, squelch: { params: ['a'], chain: '.lpq(a).vowel("o")' } });
    assert(pre.includes("register('wob', (a, b, p) => p.lpf(sine.range(a, b).slow(8)), false)") && pre.includes("register('squelch', (a, p) => p.lpq(a).vowel('o'), false)"), pre);
    assert(pre.indexOf("'wob'") < pre.indexOf("'squelch'") && !/register\('(o|drive|voice)'/.test(pre), 'library first, no old helpers');
  },
  'technical functions preset: options, presets, old saved values, Live coder compact, Classic and Crescendo full'() {
    for (const k of Object.keys(FUNCTION_PRESETS)) assert(functionPreset(FUNCTION_PRESETS[k]) === k, k);
    assert(functionPreset({ ...FUNCTION_PRESETS.compact, fnSong: false }) === 'custom', 'custom');
    assert(resolveProfile('switch').functions === 'compact' && resolveProfile('classic').functions === 'full' && resolveProfile('crescendo').functions === 'full', 'profile presets');
    for (const k of ['full', 'short', 'mixer']) assert(resolveProfile('classic', { functions: k }).functions === k && resolveProfile('switch', { functions: k }).functions === k, `old value ${k}`);
    assert(resolveProfile('switch', { fnSong: false }).custom && resolveProfile('switch', { fnSong: false }).functions === 'custom', 'an option makes it custom');
    assert(!('functions' in cleanOverrides({ functions: 'short' }, PROFILES.classic)), 'the preset name is not kept as a control');
  },
  'saved hand-coded code: new names once, the rest unchanged'() {
    const old = ['// coding-misk: short functions and mixer', "const miskBuses = {'bass': 2}", "const miskVoices = {'flo': p => p.lpf(2000).room(0.3).vowel('a')}",
      "register('voice', (name, pat) => (miskVoices[name] ? miskVoices[name](pat) : pat))", "register('o', (name, pat) => (miskBuses[name] === undefined ? pat : pat.orbit(miskBuses[name])).analyze(name))",
      "register('drive', (x, pat) => pat.distort(x).distortvol(0.5))", 'const miskMix = (pat, ranges) => pat', '',
      '$: s("bd*4").gain(0.8).o("bass").drive(.6)', '$: s("say_it_flo").n(3).mask("<1>").voice("flo").postgain(1)', '$: s("hh*8").voice("nobody")'].join('\n');
    const up = upgradeCode(old);
    assert(up.includes('$: s("bd*4").gain(0.8).chan("bass").crunch(.6)') && up.includes('.mask("<1>").lpf(2000).room(0.3).vowel("a").postgain(1)') && up.includes('$: s("hh*8")\n') === false && up.endsWith('$: s("hh*8")'), up);
    assert(!/miskVoices|register\('(o|drive|voice)'|\.o\(|\.drive\(|\.voice\(/.test(up) && up.includes("register('chan'") && up.includes("register('crunch'") && up.includes('const miskMix'), up);
    assert(upgradeCode('$: s("bd").lpf(800)') === '$: s("bd").lpf(800)', 'code without old names changes');
    // once: a version marked as updated keeps Strudel's own .drive() written later
    const lib = { tracks: [], code: { orig: '$: s("x").drive(.4)', v1: '$: s("y").o("a")' }, codeSongs: [{ id: 'v1', code: '$: s("y").o("a")' }], trash: [{ id: 'v2', kind: 'version', song: { id: 'v2', code: '$: s("z").drive(1)' } }] };
    const a = upgradeLibrary(lib);
    assert(a.code.orig === '$: s("x").crunch(.4)' && a.code.v1 === '$: s("y").chan("a")' && a.codeSongs[0].code === '$: s("y").chan("a")' && a.codeSongs[0].codeVersion === 2 && a.trash[0].song.code === '$: s("z").crunch(1)' && a.codeVersion === 2, JSON.stringify(a));
    const later = { ...a, code: { ...a.code, mine: '$: s("w").lpf(400).drive(2)' } };
    assert(upgradeLibrary(later) === later, 'the update ran twice');
    // a backup from before: its code is updated on import, the current code stays
    const r = mergeBackup({ format: BACKUP_FORMAT, data: { 'coding-misk-library': lib } }, () => later);
    const L = r.values['coding-misk-library'];
    assert(L.code.mine === '$: s("w").lpf(400).drive(2)' && L.code.orig === '$: s("x").crunch(.4)' && L.codeVersion === 2, JSON.stringify(L.code));
  },
  'the song functions of a song are found once, from the song written in full'() {
    const s = songs.find(x => x.song.id === 'switch-prima-luce').song, B = builds(s);
    const t = songFunctions(compileSong({ ...B.c.build, build: undefined }), s, functionOptions('compact'));
    assert(Array.isArray(t) && t.every((f, i) => i === 0 || t[i - 1].size >= f.size), 'longest first');
  },
};

// the checks that build songs: worker tasks, cached
const FIRST = Object.keys(CHECKS)[0];
const HEAVY = [FIRST, 'voice lines: the voice effects become a song function and expand back', 'song functions: names from the lists, unique, the same every time; at most three parameters', 'what stays written out: sound, notes, rhythm, mask, bus and level', 'the song functions of a song are found once, from the song written in full'];
// a task: { kind: 'song', file } → songSteps; { kind: 'unit', name } → { error } (null when it passes)
export function runTask(task) {
  if (task.kind === 'song') { try { return songSteps(songs.find(x => x.file === task.file)); } catch (e) { return { error: e.message }; } }
  try { CHECKS[task.name](); return { error: null }; } catch (e) { return { error: e.message }; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const t0 = Date.now();
const ENTRY = 'tools/check-functions.mjs', texts = songs.map(x => `${x.file}\0${JSON.stringify(x.song)}`).join('\0');
const tasks = [...songs.map(x => ({ id: x.file, kind: 'song', file: x.file })), ...HEAVY.slice(1).map(name => ({ id: `unit: ${name}`, kind: 'unit', name }))];
const keyOf = t => (t.kind === 'song' ? cacheKey(ENTRY, 'song', t.file, JSON.stringify(songs.find(x => x.file === t.file).song)) : cacheKey(ENTRY, 'unit', t.name, texts));
const results = tasks.map(t => cacheGet('functions', keyOf(t))), todo = tasks.map((t, i) => i).filter(i => results[i] === undefined);
if (todo.length) {
  const out = await runPool(fileURLToPath(import.meta.url), todo.map(i => tasks[i]), { name: 'check-functions' });
  out.forEach((r, k) => { results[todo[k]] = r; cachePut('functions', keyOf(tasks[todo[k]]), r); });
}
songRows = results.filter((r, i) => tasks[i].kind === 'song');
const unitError = name => results[tasks.findIndex(t => t.name === name)].error;
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { if (name !== FIRST && HEAVY.includes(name)) { const e = unitError(name); if (e !== null) throw new Error(e); } else await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
const pc = (a, b) => `${(100 * (1 - a / b)).toFixed(1)}%`;
if (stats.steps) {
  console.log(`\n${songs.length} songs, ${stats.steps} Live coder steps, ${stats.lines} lines (${stats.folded} with a function)`);
  console.log(`compact code: ${pc(stats.compact, stats.written)} shorter than the same without functions (mixer), ${pc(stats.compact, stats.full)} shorter than full, over every step`);
  console.log(`last step of each song: ${pc(stats.lastCompact, stats.lastWritten)} shorter than mixer, ${pc(stats.lastCompact, stats.lastFull)} shorter than full`);
  console.log(`library functions used: ${[...stats.lib].sort().join(', ')}; song functions: ${stats.fns} (${[...stats.names.keys()].slice(0, 12).join(', ')}…)`);
}
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s; ${cacheLine()}`);
cachePrune();
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
}
