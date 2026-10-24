// Checks for performance profiles and code comments (performance-profiles). No browser.
//   npm run check:profiles      exit 1 when any check fails
import fs from 'node:fs';
import { PROFILES, resolveProfile, cleanOverrides, migrateOld, songProfile, migrateGrowth, growthRules } from '../src/live/profiles.js';
import { applyComments } from '../src/song/comments.js';
import { baseConfig, configOf, controlsOf, setTrial, cleanTrials, withConfig, sameConfig } from '../src/live/song-config.js';
import { growingProfile, durationKey } from '../src/live/card-duration.js';
import { validateSong } from '../src/song/validate.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { compileNow } from '../src/song/compile-compact.js';
import { stateAt } from '../src/song/build.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const song = id => JSON.parse(fs.readFileSync(`songs/${id}.json`, 'utf8'));
const CHECKS = {
  'three profiles; Classic and Crescendo keep the settings used before profiles'() {
    assert(Object.keys(PROFILES).join() === 'classic,crescendo,switch', 'ids');
    const c = resolveProfile('crescendo'), k = resolveProfile('classic');
    assert(c.build === 'crescendo' && c.growth === 'crescendo' && c.view === 'now' && c.gen === 'standard' && c.comments === 'all' && !c.custom, 'crescendo');
    assert(k.build === 'blocks' && k.comments === 'all' && k.title, 'classic');
    const s = resolveProfile('switch');
    assert(s.growth === 'natural' && s.gen === 'idiomatic' && s.comments === 'none' && s.title && !s.tracks && s.highlights, 'switch');
  },
  'a changed control makes the profile custom; unknown values are dropped'() {
    const r = resolveProfile('switch', { typing: 'fast', view: 'nope', gen: 'idiomatic' });
    assert(r.custom && r.typing === 'fast' && r.view === 'now', 'custom');
    assert(!resolveProfile('switch', { gen: 'idiomatic' }).custom, 'same value is not a change');
    assert(Object.keys(cleanOverrides({ x: 1, comments: 'none' }, PROFILES.classic)).join() === 'tracks,notes,steps', 'clean: a preset stands for its options');
  },
  'old settings become the first profile and overrides'() {
    const old = { 'coding-misk-live-style': 'crescendo', 'coding-misk-live-code': 'compact', 'coding-misk-live-gen': 'standard' };
    const m = migrateOld(k => old[k]);
    assert(m.id === 'crescendo' && m.overrides.view === 'compact' && !('gen' in m.overrides), JSON.stringify(m));
    assert(migrateOld(() => undefined).id === 'classic', 'default');
  },
  'growth: small steps, gradual, natural; a natural saved before is gradual'() {
    assert(migrateGrowth({ growth: 'natural', typing: 'fast' }, undefined).growth === 'gradual' && migrateGrowth({ growth: 'natural' }, 2).growth === 'natural', 'migration');
    assert(JSON.stringify(growthRules(resolveProfile('crescendo', { growth: 'gradual' }))) === '{"natural":true}', 'gradual is the natural growth of before');
    const s = growthRules(resolveProfile('switch'));
    assert(s.coder && s.free && !growthRules(resolveProfile('switch', { duration: 'fitted' })).free, 'Switch: like a live coder, free duration');
    assert(resolveProfile('crescendo').duration === 'fitted' && resolveProfile('crescendo').growth === 'crescendo', 'Crescendo unchanged');
  },
  'growth shape controls (growth-shapes): automatic by default, a value makes the profile custom, the shape only for the natural growth'() {
    for (const id of ['classic', 'crescendo', 'switch']) { const r = resolveProfile(id); assert(r.opening === 'auto' && r.pace === 'auto' && r.development === 'auto' && !r.custom, id); }
    // profiles saved before growth-shapes (no shape keys) stay as they were
    const old = { typing: 'fast', growth: 'natural' }, r = resolveProfile('switch', migrateGrowth(old, 2));
    assert(r.opening === 'auto' && r.typing === 'fast' && r.custom, 'old overrides');
    assert(resolveProfile('switch', { opening: 'melodic' }).custom && resolveProfile('switch', { opening: 'nope' }).opening === 'auto', 'a value makes it custom, an unknown value is dropped');
    assert(JSON.stringify(cleanOverrides({ opening: 'auto', pace: 'fast' }, PROFILES.switch)) === '{"pace":"fast"}', 'auto is no change');
    const g = growthRules(resolveProfile('switch', { pace: 'fast' }));
    assert(g.shape && g.shape.pace === 'fast' && g.shape.opening === 'auto', 'natural growth carries the shape');
    assert(!growthRules(resolveProfile('crescendo', { pace: 'fast' })).shape && !growthRules(resolveProfile('switch', { growth: 'gradual', pace: 'fast' })).shape, 'other growths take no shape');
  },
  'songs name their profile; an old build style counts'() {
    assert(songProfile(song('switch-acid-prova')) === 'switch' && songProfile(song('crescendo-primo-passo')) === 'crescendo', 'songs');
    assert(songProfile({ buildStyle: 'blocks' }) === 'classic' && songProfile({}) === null, 'old field');
  },
  'comments: all as compiled, essential keeps title and headers, none keeps blank lines'() {
    const code = ['// coding-misk · Prova', '// Intro · bars 1-8', 'setcpm(138/4)', 'const section1 = "<1!8>"  // Intro · 8 bars', '', '// ========== drums ==========', '// > just a kick', '// Intro · bars 1-8 · pattern A', '$: s("bd*4")', '', '// ========== bass ==========', '$: note("a1")'].join('\n');
    assert(applyComments(code, { title: true, comments: 'all' }) === code, 'all');
    const e = applyComments(code, { title: true, comments: 'essential' });
    assert(e.includes('// coding-misk') && e.includes('// ========== drums') && !e.includes('// >') && !e.includes('pattern A') && !e.includes('8 bars'), e);
    const n = applyComments(code, { title: false, comments: 'none' });
    assert(!n.includes('//') && /\$: s\("bd\*4"\)\n\n\$: note/.test(n), n);
    assert(!applyComments(code, { title: false, comments: 'all' }).startsWith('// coding-misk'), 'title off');
  },
  'a song without a configuration is Classic with the Live build off; a declared profile keeps its meaning (song-own-settings)'() {
    const k = song('kellerlicht');
    assert(!k.config && !songProfile(k), 'kellerlicht declares nothing');
    const b = baseConfig(k);
    assert(b.profile === 'classic' && b.live === false && !Object.keys(b.options).length, JSON.stringify(b));
    assert(!growingProfile(k), 'kellerlicht does not grow on its card');
    const d = baseConfig({ profile: 'switch' }), bs = baseConfig({ buildStyle: 'crescendo' });
    assert(d.profile === 'switch' && d.live && bs.profile === 'crescendo' && bs.live, 'declared profile and buildStyle: on');
    const own = baseConfig({ profile: 'switch', config: { profile: 'crescendo', live: false, options: { narrated: true, nope: 1 } } });
    assert(own.profile === 'crescendo' && !own.live && own.options.narrated === true && !('nope' in own.options), JSON.stringify(own));
    assert(!validateSong({ ...k, config: { profile: 'switch', live: true, options: { narrated: true } } }).errors.length, 'config valid');
    const bad = validateSong({ ...k, config: { profile: 'x', live: 'yes', options: { narrated: 'y' } } }).errors.map(e => e.path).join();
    assert(bad === 'config.profile,config.live,config.options.narrated', bad);
  },
  'a trial stays on its song, goes when equal to the song\'s own, and changes the card length key (song-own-settings)'() {
    const k = song('kellerlicht'), other = song('crescendo-notte-lunga');
    let trials = setTrial({}, k, { profile: 'switch', live: true, options: {} });
    assert(Object.keys(trials).join() === 'kellerlicht', JSON.stringify(trials));
    assert(configOf(other, trials[other.id]).profile === baseConfig(other).profile, 'other song untouched');
    assert(controlsOf(configOf(k, trials.kellerlicht)).growth === 'natural', 'trial in force');
    trials = setTrial(trials, k, { profile: 'classic', live: false, options: {} });
    assert(!trials.kellerlicht, 'trial equal to the song is dropped');
    assert(Object.keys(cleanTrials({ a: { profile: 'nope' }, b: { profile: 'crescendo', live: 1 } })).join() === 'b', 'clean');
    const tried = withConfig(k, { profile: 'switch', live: true });
    assert(growingProfile(tried) === 'switch' && durationKey(tried) && durationKey(tried) !== durationKey(withConfig(k, { profile: 'switch', live: true, options: { narrated: true } })), 'key follows the trial');
    assert(sameConfig(baseConfig(k), { profile: 'classic', live: false }), 'same');
  },
  'a track that came in keeps its header in the code of the moment'() {
    const c = crescendoSong(song('crescendo-notte-lunga')), bar = c.crescendo.growth + 70;
    const st = stateAt(c, bar).song, ids = c.tracks.map(t => t.id);
    const withH = compileNow(st, bar, { keepHeaders: ids }), without = compileNow(st, bar, {});
    assert((withH.match(/^\/\/ =+ /gm) || []).length > (without.match(/^\/\/ =+ /gm) || []).length, 'headers kept');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
