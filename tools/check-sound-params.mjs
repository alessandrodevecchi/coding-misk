// Checks for composed drum tones and per-hit variation (random-sound-params, #94; endless/drum-tones,
// endless/sound-variation, app/sound-dice): the writer's code for each tone value and each variation target, ranges
// relative to the track (never louder, never brighter), one call per control on a line, the targets left out, the vowel
// pick, the same haps twice in Strudel in Node and a loop every `cycles` bars; the tone and variation draws (safe
// ranges, determinism, independent groups, the energy direction, soft styles varying less, the defaults); the director
// at sound 1 against sound 0 over 20 seeds and every style (the same songs minus tone and vary), the seed fixtures at
// sound 1 (tests/snapshots/sound-fixtures.json, SOUND_VERSION); the dice (same number same sound, locks independent,
// never the level). No browser.
//   npm run check:sound-params [-- --write-fixtures]
import fs from 'node:fs';
import { compileSong } from '../src/song/compile.js';
import { validateSong } from '../src/song/validate.js';
import { generateSession, SOUND_VERSION, DIRECTOR_VERSION } from '../src/endless/director.js';
import { drawTone, TONE_RANGES, toneInRange, toneOfRow } from '../src/material/tone.js';
import { drawVary, varyArg, varyRange, VARY_TARGETS } from '../src/material/variation.js';
import { rollSound } from '../src/material/dice.js';
import { hashString } from '../src/endless/random.js';
import { strudelInNode, hapsAt } from './mixer-checks.mjs';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';

const FIXTURES = 'tests/snapshots/sound-fixtures.json';
const recipes = fs.readdirSync('styles').filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(`styles/${f}`, 'utf8')));
const byId = Object.fromEntries(recipes.map(r => [r.id, r]));
let failed = 0, passed = 0;
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) {
  try { await fn(); passed++; console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
// a small song with one track
const song = (type, settings, patterns, rack) => ({
  format: 'coding-misk/song', version: 2, id: 'sp', title: 'Sound params', sections: [{ name: 'A', bars: 8, bpm: 120 }],
  tracks: [{ id: 't', type, settings, patterns, clips: [{ section: 'A', pattern: 'P' }], ...(rack ? { rack } : {}) }],
});
const lines = code => code.split('\n');
const lineOf = (code, re) => lines(code).filter(l => re.test(l));
const count = (s, call) => s.split(`.${call}(`).length - 1;
// the line of a melodic track: its label line and the indented lines after it, joined
const trackCode = code => { const L = lines(code), i = L.findIndex(l => /^\$:/.test(l)); const out = [L[i]]; for (let j = i + 1; j < L.length && /^\s+\./.test(L[j]); j++) out.push(L[j]); return out.join(''); };
// a line alone, without its label, the section's gate and the analyser
const bare = l => l.replace(/^\$:\s*/, '').replace(/\.analyze\(.*$/, '').replace(/\.(mask|velocity)\(section\d+\)/g, '');
const S = await strudelInNode();
const haps = async (code, from, to) => (await S.evaluate(code)).queryArc(from, to).filter(h => h.hasOnset()).map(h => ({ at: +h.whole.begin.valueOf().toFixed(4), v: h.value }));

// ---------- the writer ----------
await check('a song without tone or vary compiles as before (the code snapshot is check:code; here: no new call)', () => {
  const c = compileSong(song('drums', { kit: 'RolandTR909' }, { P: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } } }));
  assert(!/\.speed\(|\.rib\(|sustain\(0\)/.test(c), 'new calls without the settings');
});
await check('kick tone: .decay(.3).sustain(0).speed(.944), the track drive kept once', () => {
  const c = compileSong(song('drums', { kit: 'RolandTR909', drive: 0.2, tone: { kick: { decay: 0.3, tune: -1 } } }, { P: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } } }));
  const [kick] = lineOf(c, /s\("bd/), [hat] = lineOf(c, /s\(".*hh/);
  assert(kick.includes('.bank("RolandTR909").decay(.3).sustain(0).speed(.944)') && count(kick, 'distort') === 1 && kick.includes('.distort(0.2)'), kick);
  assert(!/decay|speed/.test(hat), `the hat has no tone: ${hat}`);
});
await check('tone drive replaces the track drive on its rows, a lower cutoff wins, a higher one does not', () => {
  const c = compileSong(song('drums', { kit: 'RolandTR909', drive: 0.5, cutoff: 8000, tone: { kick: { drive: 0.1, cutoff: 4000 }, hats: { cutoff: 12000, decay: 0.05 } } }, { P: { rows: { bd: 'x...', hh: '..x.', oh: '...x' } } }));
  const [kick] = lineOf(c, /s\("bd/), [hh] = lineOf(c, /s\(".*hh/), [oh] = lineOf(c, /s\(".*oh/);
  assert(kick.includes('.distort(0.1)') && count(kick, 'distort') === 1 && kick.includes('.lpf(4000)') && count(kick, 'lpf') === 1, kick);
  assert(hh.includes('.lpf(8000)') && count(hh, 'lpf') === 1 && hh.includes('.distort(0.5)'), hh);
  assert(oh.includes('.decay(.1).sustain(0)'), `the open hat takes twice the hats decay: ${oh}`);
});
await check('filter variation: one .lpf(rand.range(2400, 4000).rib(41, 4)) on a hook with cutoff 4000', () => {
  const c = compileSong(song('hook', { cutoff: 4000, move: 'fisso', vary: [{ on: 'lpf', amount: 0.4, seed: 41, cycles: 4 }] }, { P: { preset: 'richiamo' } }));
  const t = trackCode(c);
  assert(t.includes('.lpf(rand.range(2400, 4000).rib(41, 4))') && count(t, 'lpf') === 1, t);
});
await check('never louder: a hat row with gain 0.45 varying gain by 0.2 plays between 0.36 and 0.45', async () => {
  // the track gain 0.9 times the hat's 0.5 is 0.45
  const c = compileSong(song('drums', { kit: 'RolandTR909', gain: 0.9, vary: [{ on: 'gain', amount: 0.2, seed: 5, cycles: 2, row: 'hh' }] }, { P: { rows: { bd: 'x...x...x...x...', hh: 'xxxxxxxxxxxxxxxx' } } }));
  const [hh] = lineOf(c, /s\(".*hh/), [bd] = lineOf(c, /s\("bd/);
  assert(hh.includes('.gain(rand.range(0.36, 0.45).rib(5, 2))') && count(hh, 'gain') === 1, hh);
  assert(!/rand/.test(bd), `the kick does not vary: ${bd}`);
  const line = bare(hh);
  const g = (await haps(line, 0, 4)).map(h => h.v.gain);
  assert(g.length === 64 && g.every(x => x >= 0.36 - 1e-9 && x <= 0.45 + 1e-9) && new Set(g.map(x => x.toFixed(4))).size > 8, `gains ${g.slice(0, 6)}`);
});
await check('every target writes inside its relative range, one call per control', () => {
  const base = { cutoff: 3000, move: 'fisso', delay: 0.4, gain: 0.3, grit: 0, drive: 0.2 };
  for (const on of Object.keys(VARY_TARGETS)) {
    const v = [{ on, amount: Math.min(0.3, VARY_TARGETS[on].cap), seed: 3, cycles: 4 }];
    const s = song('hook', { ...base, vary: v }, { P: { preset: 'richiamo' } });
    assert(!validateSong(s).errors.length, `${on}: ${JSON.stringify(validateSong(s).errors)}`);
    const t = trackCode(compileSong(s));
    const call = on === 'distort' ? 'distort' : on;
    assert(count(t, call) === 1, `${on}: ${count(t, call)} calls in ${t}`);
    assert(t.includes('.rib(3, 4)'), `${on}: no seeded value in ${t}`);
  }
  assert(JSON.stringify(varyRange({ on: 'lpf', amount: 0.5 }, 20000)) === JSON.stringify([9000, 18000]), 'lpf from an open filter tops at 18000');
  assert(varyRange({ on: 'gain', amount: 0.3 }, 0.5)[1] === 0.5 && varyRange({ on: 'lpf', amount: 0.6 }, 1000)[1] === 1000, 'never louder, never brighter');
});
await check('vowel with amount 0.25 chooses between "a" and "e" only', async () => {
  const arg = varyArg({ on: 'vowel', amount: 0.25, seed: 2, cycles: 4 });
  assert(arg === 'irand(2).rib(2, 4).pick(["a", "e"])', arg);
  const c = compileSong(song('arp', { vary: [{ on: 'vowel', amount: 0.25, seed: 2, cycles: 4 }] }, { P: { preset: 'su' } }));
  const t = bare(trackCode(c));
  const vs = new Set((await haps(t, 0, 8)).map(h => h.v.vowel));
  assert([...vs].every(x => x === 'a' || x === 'e') && vs.size === 2, [...vs].join());
});
await check('targets left out: an automated filter, a rack Delay, the idea random on the same control', () => {
  const pad = trackCode(compileSong(song('pad', { cutoff: 1200, cutoffEnd: 3000, vary: [{ on: 'lpf', amount: 0.3, seed: 1, cycles: 4 }] }, { P: { preset: 'pad' } })));
  assert(!pad.includes('rand.range'), pad);
  const arp = trackCode(compileSong(song('arp', { vary: [{ on: 'delay', amount: 0.3, seed: 1, cycles: 4 }] }, { P: { preset: 'su' } }, [{ device: 'delay', amount: 0.3, time: 0.25, feedback: 0.3 }])));
  assert(!arp.includes('rand.range') && count(arp, 'delay') === 2, `${arp}`);
});
await check('same haps twice over 16 bars, and bars 1 to 4 equal bars 5 to 8 for cycles 4', async () => {
  const c = compileSong(song('hook', { cutoff: 4000, move: 'fisso', vary: [{ on: 'lpf', amount: 0.4, seed: 41, cycles: 4 }, { on: 'pan', amount: 0.5, seed: 9, cycles: 4 }] }, { P: { preset: 'richiamo' } }));
  const t = bare(trackCode(c));
  const a = await haps(t, 0, 16), b = await haps(t, 0, 16);
  assert(JSON.stringify(a) === JSON.stringify(b), 'two queries differ');
  const v = (from, to) => a.filter(h => h.at >= from && h.at < to).map(h => [+(h.at - from).toFixed(4), h.v.cutoff, h.v.pan]);
  assert(JSON.stringify(v(0, 4)) === JSON.stringify(v(4, 8)) && new Set(v(0, 4).map(x => x[1])).size > 1, 'bars 1-4 differ from 5-8, or nothing varies');
});
await check('no Math.random in the new modules', () => {
  for (const f of ['src/material/tone.js', 'src/material/variation.js', 'src/material/dice.js']) assert(!/Math\.random/.test(fs.readFileSync(f, 'utf8')), f);
});

// ---------- the draws ----------
await check('tones: inside the safe table and the style range, repeatable, groups independent', () => {
  for (let i = 0; i < 200; i++) {
    const R = recipes[i % recipes.length], style = R.drums && R.drums.material && R.drums.material.tones, e = (i % 11) / 10;
    const a = drawTone({ seed: `t${i}`, style, energy: e }), b = drawTone({ seed: `t${i}`, style, energy: e });
    assert(toneInRange(a) && JSON.stringify(a) === JSON.stringify(b), `seed t${i}: ${JSON.stringify(a)}`);
    for (const [g, v] of Object.entries(a)) for (const [k, x] of Object.entries(v)) { const r = style && style[g] && style[g][k]; if (r) assert(x >= r[0] - 1e-9 && x <= r[1] + 1e-9, `${R.id} ${g}.${k} ${x} outside ${r}`); }
    const only = drawTone({ seed: `t${i}`, style, energy: e, groups: ['snare'] });
    assert(JSON.stringify(only.snare) === JSON.stringify(a.snare) && !only.kick, 'a group drawn alone differs');
  }
});
await check('tones follow the energy: at 0.9 at least the drive and cutoff of 0.2 in every group', () => {
  for (let i = 0; i < 100; i++) {
    const lo = drawTone({ seed: `e${i}`, energy: 0.2 }), hi = drawTone({ seed: `e${i}`, energy: 0.9 });
    for (const g of Object.keys(TONE_RANGES)) assert(hi[g].drive >= lo[g].drive && (lo[g].cutoff === undefined || hi[g].cutoff >= lo[g].cutoff), `e${i} ${g}`);
    assert(lo.kick.cutoff === undefined, 'the generator gave the kick a cutoff (it overshoots, task 2.4)');
  }
});
await check('variation: targets of the style only, amounts under the caps, soft styles vary less, defaults', () => {
  for (let i = 0; i < 100; i++) {
    const soft = drawVary({ seed: `v${i}`, style: { amount: 0.1, targets: ['lpf', 'pan'] }, type: 'hook', energy: 0.6, settings: { move: 'fisso' } });
    const hard = drawVary({ seed: `v${i}`, style: { amount: 0.4, targets: ['lpf', 'pan'] }, type: 'hook', energy: 0.6, settings: { move: 'fisso' } });
    assert(soft && hard && soft.length === hard.length && soft.every((x, j) => x.on === hard[j].on && x.amount <= hard[j].amount), `v${i}: ${JSON.stringify(soft)} ${JSON.stringify(hard)}`);
    assert([...soft, ...hard].every(x => x.amount <= VARY_TARGETS[x.on].cap && ['lpf', 'pan'].includes(x.on)), 'a target or an amount outside');
    const def = drawVary({ seed: `v${i}`, type: 'hook', energy: 0.5, settings: { move: 'fisso' } });
    assert(def.every(x => ['lpf', 'pan'].includes(x.on)), `default hook targets: ${JSON.stringify(def)}`);
    const dr = drawVary({ seed: `v${i}`, style: { amount: 0.3, targets: ['gain', 'pan', 'decay'] }, type: 'drums', energy: 0.8, settings: { tone: { hats: { decay: 0.1 } } }, rows: ['bd', 'hh'] });
    assert(!dr || dr.every(x => x.row === 'hh'), `drum rows: ${JSON.stringify(dr)}`);
    assert(drawVary({ seed: `v${i}`, type: 'drums', rows: ['bd'] }) === null, 'a kick-only track varies');
    const bass = drawVary({ seed: `v${i}`, style: { amount: 0.3, targets: ['distort', 'pan', 'lpf'] }, type: 'bass', settings: { move: 'fisso' } });
    assert(!bass || bass.every(x => x.on === 'lpf'), `bass: ${JSON.stringify(bass)}`);
  }
});

// ---------- the director at sound 1 ----------
const strip = s => JSON.stringify(s, (k, v) => (k === 'tone' || k === 'vary' ? undefined : v));
await check('sound 1 minus tone and vary equals sound 0: 20 seeds and every style', () => {
  let toned = 0, varied = 0;
  for (const R of recipes) for (let i = 0; i < 20; i += 10) {
    const opts = { styles: [R.id], seed: `sp-${R.id}-${i}`, minutes: 3 };
    const a = generateSession(recipes, opts).songs, b = generateSession(recipes, { ...opts, sound: 1 }).songs;
    assert(a.length === b.length && a.every((s, j) => strip(s) === strip(b[j])), `${R.id} ${i}: the songs differ beyond tone and vary`);
    assert(a.every(s => s.tracks.every(t => !t.settings || (!t.settings.tone && !t.settings.vary))), `${R.id}: sound 0 drew a tone or a variation`);
    for (const s of b) {
      const v = validateSong(s);
      assert(!v.errors.length, `${R.id}: ${JSON.stringify(v.errors.slice(0, 2))}`);
      for (const t of s.tracks) { if (t.settings && t.settings.tone) toned++; if (t.settings && t.settings.vary) varied++; }
      const drums = s.tracks.filter(t => t.type === 'drums').map(t => JSON.stringify(t.settings.tone));
      assert(new Set(drums).size <= 1, `${R.id}: the kick and the beat tracks hold different tones`);
    }
  }
  for (let i = 2; i < 20; i++) {
    const R = recipes[i % recipes.length], opts = { styles: [R.id, recipes[(i + 3) % recipes.length].id], seed: `sp-mix-${i}`, minutes: 3, chaos: 0.6 };
    const a = generateSession(recipes, opts).songs, b = generateSession(recipes, { ...opts, sound: 1 }).songs;
    assert(a.every((s, j) => strip(s) === strip(b[j])), `mix ${i}: the songs differ beyond tone and vary`);
  }
  assert(toned > 20 && varied > 40, `few draws: ${toned} tones, ${varied} variations`);
});
await check(`seed fixtures at sound ${SOUND_VERSION} (${FIXTURES}; raise SOUND_VERSION when they move on purpose)`, () => {
  const now = { sound: SOUND_VERSION, director: DIRECTOR_VERSION, songs: recipes.map(R => { const s = generateSession(recipes, { styles: [R.id], seed: `fx-${R.id}`, minutes: 3, sound: 1 }).songs[0]; return { style: R.id, id: s.id, hash: hashString(JSON.stringify(s.tracks.map(t => [t.id, t.settings && t.settings.tone, t.settings && t.settings.vary]))).toString(16) }; }) };
  if (process.argv.includes('--write-fixtures')) { fs.writeFileSync(FIXTURES, JSON.stringify(now, null, 1) + '\n'); console.log('      fixtures written'); return; }
  const saved = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
  assert(saved.sound === SOUND_VERSION, `fixtures of sound ${saved.sound}, SOUND_VERSION is ${SOUND_VERSION}`);
  now.songs.forEach((f, i) => assert(saved.songs[i] && saved.songs[i].hash === f.hash && saved.songs[i].id === f.id, `${f.style}: ${f.id} ${f.hash}, fixture ${saved.songs[i] && saved.songs[i].hash}; if intended, raise SOUND_VERSION and run npm run check:sound-params -- --write-fixtures`));
});
await check('a radio song at sound 1 plays in Strudel in Node (every style, 8 bars)', async () => {
  for (const R of recipes) {
    const s = generateSession(recipes, { styles: [R.id], seed: `play-${R.id}`, minutes: 3, sound: 1 }).songs[0];
    const p = await S.evaluate(compileSong(s));
    assert(p.queryArc(0, 8).length > 0, `${R.id}: silence`);
  }
});

await check('the hidden mixer and the short functions keep every varied value (Classic and Live coder, house and acid at sound 1)', async () => {
  const styles = byId;
  let n = 0, varied = 0;
  for (const id of ['house', 'acid']) for (const prof of ['classic', 'switch']) {
    const s = generateSession(recipes, { styles: [id], seed: `mx-${id}`, minutes: 3, sound: 1 }).songs[0], C = resolveProfile(prof);
    const b = C.build === 'crescendo' ? crescendoSong(s, { narrated: C.narrated, rules: growthRules(C, { styles }) }) : s;
    const mk = fn => liveCode(b, resolveProfile(prof, { functions: fn }), { cols: () => 60, lang: () => 'it' });
    const F = mk('full'), views = [mk('mixer'), mk('short')];
    const bars = [...new Set([0, 16, ...(F.build ? F.build.build.map(x => x.at) : [])])].filter(x => x < 160).sort((x, y) => x - y).slice(0, 10);
    for (const bar of bars) {
      const code = F.codeAt(bar), a = await hapsAt(F, code, bar);
      if (/\.rib\(/.test(code)) varied++;
      for (const V of views) { n++; assert(JSON.stringify(a) === JSON.stringify(await hapsAt(V, V.codeAt(bar), bar)), `${id} ${prof} bar ${bar}: the haps differ`); }
    }
  }
  assert(n >= 40 && varied >= 10, `${n} comparisons, ${varied} codes with variation`);
});
// ---------- the dice ----------
await check('dice: same number same sound, locks keep their group and leave the others as they are, never the level', () => {
  const R = byId['darksynth'], tr = { id: 'b', type: 'bass', settings: { wave: 'sawtooth', gain: 0.7, cutoff: 700, reso: 8, drive: 0, move: 'fisso' }, rack: [{ device: 'delay', amount: 0.3, time: 0.25, feedback: 0.3 }] };
  const a = rollSound({ track: tr, recipe: R, seedBase: 's:b:sound', n: 2 }), b = rollSound({ track: tr, recipe: R, seedBase: 's:b:sound', n: 2 });
  assert(JSON.stringify(a) === JSON.stringify(b), 'two rolls of number 2 differ');
  const l = rollSound({ track: tr, recipe: R, seedBase: 's:b:sound', n: 2, locks: ['filter'] });
  assert(l.settings.cutoff === 700 && l.settings.reso === 8 && l.settings.wave === a.settings.wave && JSON.stringify(l.rack) === JSON.stringify(a.rack), 'the Filter lock moved another group');
  assert(a.settings.gain === 0.7 && a.rack.some(d => d.device === 'delay'), 'the level or the user\'s Delay changed');
  const d = rollSound({ track: { id: 'd', type: 'drums', settings: { kit: 'RolandTR909', gain: 0.9 }, patterns: { A: { rows: { bd: 'x...', hh: '..x.' } } } }, recipe: R, seedBase: 's:d:sound', n: 1, locks: ['kit', 'kick'] });
  assert(d.settings.kit === 'RolandTR909' && !d.settings.tone.kick && d.settings.tone.snare && d.settings.tone.hats && toneInRange(d.settings.tone), JSON.stringify(d.settings));
  // a later roll that draws a plain wave removes the FM device the dice added (an arp of a style without sound kinds keeps none)
  const w = rollSound({ track: { id: 'a', type: 'arp', settings: { wave: 'supersaw' }, rack: [] }, recipe: byId['trance'], seedBase: 's:a:sound', n: 1, owned: null });
  assert(w.settings.wave !== 'supersaw' && (byId['trance'].arp.waves || []).includes(w.settings.wave) && !w.rack.length, `trance arp: ${w.settings.wave}`);
  const fm = { device: 'fm', index: 1, harmonicity: 2, wave: 'sine', decay: 0.2, sustain: 0.5 };
  const back = rollSound({ track: { id: 'a', type: 'arp', settings: { wave: 'sine' }, rack: [fm] }, recipe: byId['trance'], seedBase: 's:a:sound', n: 1, owned: fm });
  assert(!back.rack.length && back.owned === null, 'the dice kept its FM device on a plain wave');
});

console.log(failed ? `\n${failed} check(s) failed, ${passed} passed` : `\nall ${passed} sound parameter checks passed`);
process.exit(failed ? 1 : 0);
