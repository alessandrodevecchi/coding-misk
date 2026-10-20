// The work of tools/check-mixer.mjs (code-writing, song-functions): one task is one song with one profile, run in a
// worker process (tools/check-pool.mjs). No browser.
// At every step of the live build the code is evaluated by Strudel in Node with each Technical functions preset
// (short, mixer, compact: the code shown and its hidden tail, as the app evaluates it) and written in full; the haps
// of the step's bar must carry the same mix: gain, orbit, analyze, postgain and velocity, hap by hap.
// Strudel in Node: @kabelsalat/web (a browser-only import of @strudel/core's repl) is stubbed by a resolve hook, and
// @strudel/tonal does not load here (its @tonaljs files are missing), so its functions (`transpose`, `scale`,
// `voicing`, `voicings`, `rootNotes`) are registered as the identity, the same on both sides: notes stay as written,
// the mix is what is compared.
import fs from 'node:fs';
import { register as registerHook } from 'node:module';
import { songFiles } from './songs-dir.mjs';
import { appHash, cacheKey, cached, fileText } from './code-cache.mjs';
import { fromScenes } from '../src/song/format.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps, deriveBuild } from '../src/song/build.js';
import { installHelpers, useFns } from '../src/song/writer.js';

// the profiles (Classic as a live build, Crescendo, Live coder) and the presets compared with the code in full
export const PROFILES = ['classic', 'crescendo', 'switch'];
export const VIEWS = ['short', 'mixer', 'compact'];
export const FIELDS = ['gain', 'orbit', 'analyze', 'postgain', 'velocity'];
export const STYLE_FILES = fs.readdirSync('styles').filter(f => f.endsWith('.json')).sort().map(f => `styles/${f}`);
const styles = Object.fromEntries(STYLE_FILES.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))).map(r => [r.id, r]));
const loaded = songFiles('songs').filter(f => !f.includes('/endless/')).map(f => ({ file: f, song: JSON.parse(fs.readFileSync(f, 'utf8')) }))
  .map(x => ({ ...x, song: x.song.scenes ? fromScenes(x.song) : x.song })).filter(x => Array.isArray(x.song.sections) && x.song.sections.length);
export const songs = loaded.map(x => x.song);
export const fileOf = Object.fromEntries(loaded.map(x => [x.song.id, x.file]));
// spoken comments: a fixed list of voice samples, as tools/check-live-code.mjs
const files = { say_it: Array.from({ length: 200 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 200 }, (_, i) => `say_en/${i}.wav`) };

let strudel = null;
async function load() {
  if (strudel) return strudel;
  registerHook(`data:text/javascript,${encodeURIComponent("export async function resolve(s, c, next) { return s === '@kabelsalat/web' ? { url: 'data:text/javascript,export class SalatRepl {}', shortCircuit: true } : next(s, c); }")}`);
  // Strudel greets on the console when it loads, and logs each evaluation
  // (Strudel's logger writes `%c[eval] …`, `%c[warn]: …` and evaluation errors as Error objects; an evaluation error
  // comes back through onEvalError)
  for (const k of ['log', 'warn', 'error']) { const f = console[k].bind(console); console[k] = (...a) => { if ((typeof a[0] === 'string' && /^(%c|cannot use window|🌀)/.test(a[0])) || a[0] instanceof Error) return; f(...a); }; }
  const log = console.log;
  console.log = () => {};
  try {
    const core = await import('@strudel/core'), mini = await import('@strudel/mini'), { transpiler } = await import('@strudel/transpiler');
    await core.evalScope(core, mini);
    for (const name of ['transpose', 'scale', 'voicing', 'voicings', 'rootNotes']) if (!(name in core.Pattern.prototype)) core.register(name, (x, pat) => pat);
    installHelpers({ register: core.register });
    let error = null;
    const R = core.repl({ transpiler, defaultOutput: () => {}, getTime: () => 0, onEvalError: e => { error = e; } });
    strudel = { evaluate: async code => { error = null; const p = await R.evaluate(code, false); if (!p || error) throw new Error((error && error.message) || 'evaluation failed'); return p; } };
  } finally { console.log = log; }
  return strudel;
}

// the haps that start in a bar, with their mix: [{ at, s, note, ...FIELDS }]
async function hapsOf(L, code, bar) {
  globalThis.miskBuses = L.buses; useFns(L.fns);
  const p = await (await load()).evaluate(L.run ? L.run(code) : code);
  return p.queryArc(bar, bar + 1).filter(h => h.hasOnset()).map(h => {
    const v = h.value && typeof h.value === 'object' ? h.value : { value: h.value };
    return { at: h.whole.begin.valueOf(), s: v.s, note: v.note ?? v.n, ...Object.fromEntries(FIELDS.map(k => [k, v[k]])) };
  });
}
const close = (a, b) => a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9);
const show = x => (x === undefined ? '-' : typeof x === 'number' ? String(+x.toFixed(4)) : String(x));
// what differs between the haps in full (a) and with a preset (b): short lines, one per kind of difference
function diff(a, b) {
  if (a.length !== b.length) return [`${a.length} haps → ${b.length}`];
  const out = new Set();
  a.forEach((x, i) => {
    const y = b[i];
    if (!close(x.at, y.at) || x.s !== y.s || String(x.note) !== String(y.note)) { out.add(`hap ${i}: ${show(x.s)} ${show(x.note)} at ${show(x.at)} → ${show(y.s)} ${show(y.note)} at ${show(y.at)}`); return; }
    for (const k of FIELDS) if (!close(x[k], y[k])) out.add(`${x.analyze ?? x.s}.${k} ${show(x[k])}→${show(y[k])}`);
  });
  return [...out];
}

// the live build of a song with a profile, as the app makes it; a grown build (Crescendo, Live coder: seconds for a
// long song) is kept in the code cache under the code that grows it, so a change to the writer or the code views
// only evaluates again
const stylesText = STYLE_FILES.map(f => `${f}\0${fileText(f)}`).join('\0');
function buildOf(s, profile) {
  const C = resolveProfile(profile);
  if (C.build !== 'crescendo') return { ...s, build: s.build || deriveBuild(s) };
  const key = cacheKey('src/song/crescendo.js', appHash('src/live/profiles.js'), appHash('src/song/build.js'), 'mixer build', profile, stylesText, fileText(fileOf[s.id]));
  return cached('mixer-builds', key, () => crescendoSong(s, { narrated: C.narrated, rules: growthRules(C, { styles }) }));
}
// task: { song, profile } → { steps, views: { short: [{ bar, diffs }], … }, error }
export async function runTask({ song, profile }) {
  const s = songs.find(x => x.id === song), b = buildOf(s, profile);
  const mk = functions => liveCode(b, resolveProfile(profile, { functions }), { lang: () => 'it', files: () => files, cols: () => 60 });
  const full = mk('full'), bars = [0, ...new Set(buildSteps(full.build).map(x => x.at))].sort((x, y) => x - y);
  const ref = [];
  for (const bar of bars) { try { ref.push(await hapsOf(full, full.codeAt(bar), bar)); } catch (e) { ref.push(`the code in full: evaluation failed: ${e.message}`); } }
  const views = {};
  for (const view of VIEWS) {
    const L = mk(view), rows = [];
    for (let i = 0; i < bars.length; i++) {
      let d;
      try { const h = await hapsOf(L, L.codeAt(bars[i]), bars[i]); d = typeof ref[i] === 'string' ? [ref[i]] : diff(ref[i], h); } catch (e) { d = [`evaluation failed: ${e.message}`]; }
      if (d.length) rows.push({ bar: bars[i], diffs: d });
    }
    views[view] = rows;
  }
  return { steps: bars.length, haps: ref.reduce((a, x) => a + (typeof x === 'string' ? 0 : x.length), 0), views };
}
