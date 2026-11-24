// Checks for the movement devices of the rack (sound-modulation, #95; app/modulation-devices): Sweep, LFO, Pump and Gate,
// with the movement parameters (D11 to D13: phase, the LFO on volume and pitch, the Gate sampled with a model of
// superdough's LFO worklet).
// The writer's code for every target and argument, base values merged (one call per control), the kick lines with
// one and two pumps, the beat dip without a kick, Sweep once and loop (held pads and short notes), what a Sweep
// replaces, the validator's errors and warnings with their paths, #94's vary kept or left out, determinism, the
// example songs, and every line evaluated by Strudel in Node with the values the writer meant. No browser.
//   npm run check:modulation
import fs from 'node:fs';
import { compileSong } from '../src/song/compile.js';
import { validateSong } from '../src/song/validate.js';
import { DEVICES, deviceArgs, rackCode } from '../src/song/rack.js';
import { MOVE_DEVICES, sweepCode, lfoCode, duckCode, moveFor, movePreview, LPDEPTH_SCALE, gateRuns, gateCode, pumpDipCode, tremoloCode, phaseOffset, GATE_PRESETS, pathDevice, thinPath, pathAt, pathPoints, pathLine, pathMove, PATH_EDGE } from '../src/song/movement.js';
import { varySkips } from '../src/material/variation.js';
import { strudelInNode } from './mixer-checks.mjs';

let failed = 0, passed = 0;
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) {
  try { await fn(); passed++; console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
const S = await strudelInNode();
const count = (s, call) => s.split(`.${call}(`).length - 1;
// a song: sections [{ name, bars }], tracks
const song = (tracks, sections = [{ name: 'A', bars: 8, bpm: 120 }]) => ({ format: 'coding-misk/song', version: 2, id: 'mod', title: 'Modulation', sections, tracks });
const drums = (extra = {}) => ({ id: 'drums', type: 'drums', settings: { kit: 'RolandTR909' }, patterns: { P: { rows: { bd: 'x...x...x...x...', hh: '..x...x...x...x.' } } }, clips: [{ section: 'A', pattern: 'P' }], ...extra });
const pad = (rack, settings = {}, id = 'pad', preset = 'pad') => ({ id, type: 'pad', settings: { gain: 0.3, cutoff: 2000, move: 'fisso', ...settings }, patterns: { P: { preset } }, clips: [{ section: 'A', pattern: 'P' }], rack });
const arp = (rack, settings = {}) => ({ id: 'arp', type: 'arp', settings: { gain: 0.3, cutoff: 3000, move: 'fisso', delay: 0, ...settings }, patterns: { P: { preset: 'su' } }, clips: [{ section: 'A', pattern: 'P' }], rack });
// the layers (label line and its indented lines, joined) of a track's block
const block = (code, id) => { const L = code.split('\n'), i = L.findIndex(l => l.startsWith(`// ========== ${id}`)); const out = []; let cur = null; for (let j = i + 1; j < L.length && !L[j].startsWith('// =========='); j++) { if (/^[_S]?\$:/.test(L[j])) { cur = L[j]; out.push(cur); } else if (cur !== null && /^\s+\./.test(L[j])) out[out.length - 1] += L[j].trim(); else cur = null; } return out; };
const hapsOf = async (line, from, to) => (await S.evaluate(line.replace(/^[_S]?\$:\s*/, '').replace(/\.(mask|velocity)\((section|clip)\d+\)/g, ''))).queryArc(from, to).filter(h => h.hasOnset());
const val = (pat, err) => validateSong(pat, err);
const issues = s => { const r = validateSong(s); return { errors: r.errors || [], warnings: r.warnings || [] }; };

// ---------- the devices ----------
await check('four movement devices in the rack, kind move, with the defaults of D4, D5, D6, D11, D13', () => {
  for (const k of ['sweep', 'lfo', 'pump', 'gate']) assert(DEVICES[k] && DEVICES[k].kind === 'move', k);
  assert(JSON.stringify(deviceArgs({ device: 'sweep' })) === JSON.stringify({ target: 'filter', from: 400, to: 4000, bars: 8, curve: 'exp', repeat: 'once' }), JSON.stringify(deviceArgs({ device: 'sweep' })));
  assert(JSON.stringify(deviceArgs({ device: 'lfo' })) === JSON.stringify({ target: 'filter', rate: 0.5, depth: 0.4, shape: 'sine', phase: 0 }), 'lfo');
  assert(JSON.stringify(deviceArgs({ device: 'pump' })) === JSON.stringify({ depth: 0.6, recover: 0.15, rate: 0.25, phase: 0 }), 'pump');
  assert(JSON.stringify(deviceArgs({ device: 'gate' })) === JSON.stringify({ pattern: 'x.x.x.x.x.x.x.x.', depth: 0.8, smooth: 0.1, phase: 0 }), 'gate');
  assert(MOVE_DEVICES.sweep.label.it === 'Apertura' && MOVE_DEVICES.lfo.label.it === 'Oscillazione' && MOVE_DEVICES.pump.label.it === 'Pompa' && MOVE_DEVICES.gate.label.it === 'Gate ritmico', 'labels');
  assert(!MOVE_DEVICES.lfo.args[0][3].includes('gain') && !MOVE_DEVICES.sweep.args[0][3].includes('gain'), 'the track gain is never a target');
  assert(MOVE_DEVICES.lfo.args[0][3].includes('volume') && MOVE_DEVICES.lfo.args[0][3].includes('pitch'), 'volume and pitch targets');
});
await check('rackCode leaves movement devices to the compiler; the card previews evaluate in Strudel', async () => {
  assert(rackCode([{ device: 'sweep' }, { device: 'delay' }], 'pad') === DEVICES.delay.code(deviceArgs({ device: 'delay' })), rackCode([{ device: 'sweep' }], 'pad'));
  for (const d of [{ device: 'sweep' }, { device: 'sweep', target: 'room', from: 0, to: 0.6, curve: 'linear' }, { device: 'lfo' }, { device: 'lfo', target: 'pan' }, { device: 'lfo', target: 'volume' }, { device: 'lfo', target: 'pitch' }, { device: 'lfo', phase: 0.25 }, { device: 'gate' }, { device: 'gate', smooth: 0 }]) await hapsOf(`note("c e g").s("sawtooth")${movePreview(d, 'pad')}`, 0, 1);
});

// ---------- Sweep ----------
await check('Sweep on a held pad: one value per bar from 400 to 3000, 4000 held after 8 bars, the envelope climbs to the next bar', async () => {
  const c = compileSong(song([pad([{ device: 'sweep' }])], [{ name: 'A', bars: 12, bpm: 120 }]));
  const [l] = block(c, 'pad');
  assert(count(l, 'lpf') === 1 && l.includes('.lpf("<400 533 711 949 1265 1687 2249 3000 4000!4>")') && l.includes(".env({ c: 'lpf', a: 2, s: 1, da: \"<133 178 237 316 422 563 750 1000 0!4>\" })"), l);
  const h = await hapsOf(l, 0, 12);
  const at = b => h.find(x => x.whole.begin.valueOf() === b).value;
  assert(at(3).cutoff === 949 && at(3).env[0].depthabs === 316 && Math.abs(at(3).cutoff + at(3).env[0].depthabs - at(4).cutoff) <= 1, 'bar 4 glides to bar 5');
  assert(at(7).cutoff + at(7).env[0].depthabs === 4000 && at(10).cutoff === 4000 && at(10).env[0].depthabs === 0, 'reaches 4000 within the last bar and holds');
});
await check('Sweep loop on a held pad starts again every 4 bars, aligned to the clip start', () => {
  const t = pad([{ device: 'sweep', repeat: 'loop', bars: 4, from: 300, to: 5000 }]);
  t.clips = [{ start: 2, bars: 8, pattern: 'P' }];
  const [l] = block(compileSong(song([t], [{ name: 'A', bars: 10, bpm: 120 }])), 'pad');
  // list over the clip's 8 bars, rotated so its first value falls on bar 3 (index 2)
  assert(/\.lpf\("<[^"]+>"\)/.test(l), l);
  const vals = l.match(/\.lpf\("<([^"]+)>"\)/)[1];
  assert(vals.startsWith('1225 2475 300 606'), vals);
});
await check('Sweep on short notes: a ramp sampled at each onset whose last sixteenth reaches the top; once on a longer clip holds `to`', async () => {
  const a = { target: 'filter', from: 400, to: 4000, bars: 2, curve: 'exp', repeat: 'once' };
  const code = sweepCode(a, { clipStart: 0, clipBars: 4, barSec: 2, held: false, steps: 16 });
  assert(code.includes('.pick([saw.slow(2).rangex(400, ') && code.endsWith(', 4000]))'), code);
  const h = await hapsOf(`note("c*16").s("square")${code}`, 0, 4);
  const cut = h.map(x => Math.round(x.value.cutoff));
  assert(cut[0] === 400 && cut[31] === 4000 && cut[32] === 4000 && cut[63] === 4000 && cut[16] < cut[31], cut.slice(28, 34).join(' '));
  const lin = sweepCode({ ...a, curve: 'linear', repeat: 'loop' }, { clipStart: 3, clipBars: 8, barSec: 2, held: false, steps: 16 });
  assert(lin === '.lpf(saw.slow(2).range(400, 4116).late(1))', lin);
});
await check('Sweep on room and delay is linear; on hpf it writes .hpf', () => {
  const r = sweepCode({ target: 'room', from: 0, to: 0.6, bars: 4, curve: 'exp', repeat: 'loop' }, { clipStart: 0, clipBars: 8, barSec: 2, held: true });
  assert(r.startsWith('.room("<0 0.15 0.3 0.45 0 0.15 0.3 0.45>")'), r);
  const h = sweepCode({ target: 'hpf', from: 60, to: 1200, bars: 4, curve: 'exp', repeat: 'loop' }, { clipStart: 0, clipBars: 4, barSec: 2, held: false, steps: 16 });
  assert(h.startsWith('.hpf(saw.slow(4).rangex(60, '), h);
});
await check('Sweep with the track\'s cutoff ramp: a warning, and the line holds the Sweep\'s ramp only', () => {
  const s = song([pad([{ device: 'sweep' }], { cutoff: 800, cutoffEnd: 3000 })]);
  const w = issues(s).warnings.map(x => `${x.path} ${x.msg}`);
  assert(w.some(x => x.startsWith('tracks[0].rack[0]') && /replaces the track's cutoff ramp/.test(x)), w.join(' | '));
  const [l] = block(compileSong(s), 'pad');
  assert(count(l, 'lpf') === 1 && l.includes('.lpf("<400 '), l);
});
await check('Sweep on room replaces the track\'s own room (one .room) with a warning', () => {
  const s = song([pad([{ device: 'sweep', target: 'room', from: 0, to: 0.6, curve: 'linear' }], { room: 0.4 })]);
  const [l] = block(compileSong(s), 'pad');
  assert(count(l, 'room') === 1 && l.includes('.room("<0 '), l);
  assert(issues(s).warnings.some(x => /replaces the track's own room/.test(x.msg)), 'warning');
});

// ---------- LFO ----------
await check('LFO filter: lpsync, lpdepth (depth × 1.8) and lpshape after the track\'s own filter', async () => {
  const [l] = block(compileSong(song([pad([{ device: 'lfo', rate: 0.5, depth: 0.5, shape: 'tri' }])])), 'pad');
  assert(l.includes(`.lpsync(2).lpdepth(${0.5 * LPDEPTH_SCALE}).lpshape("tri")`) && count(l, 'lpf') === 1, l);
  const [h] = await hapsOf(l, 0, 1);
  assert(h.value.cutoff === 2000 && h.value.lpsync === 2 && h.value.lpshape === 'tri', JSON.stringify(h.value));
});
await check('LFO filter on an open track (no .lpf on the line) adds the track\'s cutoff as base', () => {
  const [l] = block(compileSong(song([pad([{ device: 'lfo' }], { cutoff: 18000 })])), 'pad');
  assert(l.includes('.lpf(18000).lpsync('), l);
});
await check('LFO on reverb send of a dry arp: exactly one .room(…) before .lfo({ c: \'room\', … da … })', async () => {
  const [l] = block(compileSong(song([arp([{ device: 'lfo', target: 'room', depth: 0.6 }])])), 'arp');
  assert(count(l, 'room') === 1 && l.includes(".room(0.001).lfo({ c: 'room', s: 2, da: 0.3, dc: 0, sh: 'sine' })"), l);
  const [h] = await hapsOf(l, 0, 1);
  assert(h.value.room === 0.001 && h.value.lfo[0].control === 'room' && h.value.lfo[0].depthabs === 0.3, JSON.stringify(h.value.lfo));
});
await check('LFO on room of a pad with its own room keeps one .room (the track\'s) and sways from it', () => {
  const [l] = block(compileSong(song([pad([{ device: 'lfo', target: 'room' }], { room: 0.5 })])), 'pad');
  assert(count(l, 'room') === 1 && l.includes('.room(.5)') && l.includes("lfo({ c: 'room'"), l);
});
await check('LFO pan: base 0.5, depth 1 swings the panner from one side to the other (da 2), twice a bar at 1/2', async () => {
  const code = lfoCode({ target: 'pan', rate: 0.5, depth: 1, shape: 'sine' });
  assert(code === ".lfo({ c: 'pan', s: 2, da: 2, sh: 'sine' })", code);
  const [l] = block(compileSong(song([pad([{ device: 'lfo', target: 'pan', rate: 0.5, depth: 1 }])])), 'pad');
  assert(l.includes('.pan(0.5).lfo({ c: \'pan\''), l);
  const [h] = await hapsOf(l, 0, 1);
  assert(h.value.pan === 0.5 && h.value.lfo[0].sync === 2, JSON.stringify(h.value));
});
await check('LFO delay on a hook keeps the hook\'s one .delay', () => {
  const t = { id: 'hook', type: 'hook', settings: { gain: 0.3, delay: 0.3 }, patterns: { P: { preset: 'richiamo' } }, clips: [{ section: 'A', pattern: 'P' }], rack: [{ device: 'lfo', target: 'delay' }] };
  const [l] = block(compileSong(song([t])), 'hook');
  assert(count(l, 'delay') === 1 && l.includes("lfo({ c: 'delay'"), l);
});

// ---------- Pump ----------
await check('Pump with a kick: the kick line carries duck, depth and recovery; the pad line is unchanged', () => {
  const plain = compileSong(song([drums(), pad([])])), c = compileSong(song([drums(), pad([{ device: 'pump' }])]));
  const kick = block(c, 'drums').find(l => l.includes('analyze("kick")')), hat = block(c, 'drums').find(l => l.includes('analyze("hats")'));
  assert(kick.includes('.duck(6).duckdepth(0.6).duckattack(0.15)'), kick);
  assert(!hat.includes('duck'), hat);
  assert(block(c, 'pad').join() === block(plain, 'pad').join(), 'pad line changed');
});
await check('Two pumped pads on orbits 6 and 9: one duck("6:9") with two depths and recoveries; the bass is not ducked', async () => {
  const bass = { id: 'bass', type: 'bass', settings: {}, patterns: { P: { preset: 'rolling' } }, clips: [{ section: 'A', pattern: 'P' }] };
  const c = compileSong(song([drums(), bass, pad([{ device: 'pump', depth: 0.6, recover: 0.15 }]), pad([{ device: 'pump', depth: 0.4, recover: 0.2 }], {}, 'pad2')]));
  const kick = block(c, 'drums').find(l => l.includes('analyze("kick")'));
  assert(kick.includes('.duck("6:9").duckdepth("0.6:0.4").duckattack("0.15:0.2")'), kick);
  assert(block(c, 'pad2')[0].includes('.orbit(9)') && !block(c, 'bass').join().includes('duck'), 'orbits');
  const [h] = await hapsOf(kick, 0, 1);
  assert(JSON.stringify(h.value.duckorbit) === '[6,9]' && JSON.stringify(h.value.duckdepth) === '[0.6,0.4]', JSON.stringify(h.value));
});
await check('Pump: muted drums write no duck and the pad dips on the beat instead; a muted pad gets no duck entry', () => {
  const c = compileSong(song([drums({ mute: true }), pad([{ device: 'pump' }])]));
  assert(!c.includes('.duck('), 'duck from muted drums');
  assert(block(c, 'pad')[0].includes(".lfo({ c: 'gain', s: 4, da: 0.18, dc: -1, sh: 'ramp' })"), block(c, 'pad')[0]);
  const m = compileSong(song([drums(), { ...pad([{ device: 'pump' }]), mute: true }]));
  assert(!m.includes('.duck('), 'duck for a muted pad');
});
await check('Pump without a kick in a section: the beat dip there only, never above the track\'s gain', async () => {
  const s = song([drums(), pad([{ device: 'pump', depth: 0.5, rate: 0.125 }])], [{ name: 'A', bars: 4, bpm: 120 }, { name: 'B', bars: 4, bpm: 120 }]);
  s.tracks[1].clips = [{ section: 'A', pattern: 'P' }, { section: 'B', pattern: 'P' }];
  const c = compileSong(s), L = block(c, 'pad');
  assert(!L[0].includes("c: 'gain'") && L[1].includes(".lfo({ c: 'gain', s: 8, da: 0.15, dc: -1, sh: 'ramp' })"), L.join('\n'));
  assert(block(c, 'drums').find(l => l.includes('kick')).includes('.duck(6)'), 'kick in A ducks');
  // the LFO runs from -da to 0 around the gain (dc -1): the level stays at or under the track's gain
  const [h] = await hapsOf(L[1], 4, 5);
  const l = h.value.lfo[0];
  assert(l.dcoffset === -1 && l.depthabs <= h.value.gain && l.shape === 'ramp', JSON.stringify(l));
});
await check('Pump on a guitar and a code track measures the dip from their own gain', () => {
  const g = moveFor('guitar', [{ device: 'pump' }], { st: { guitar: {} }, kick: false, clipStart: 0, clipBars: 8, barSec: 2 });
  assert(g.code.includes('da: 0.48'), g.code);
  const k = moveFor('code', [{ device: 'pump' }], { st: {}, kick: false, code: 'note("c").s("sine").gain(.5)' });
  assert(k.code.includes('da: 0.3'), k.code);
});
await check('a code track gets its movement after its own code and a base value when it lacks one', () => {
  const t = { id: 'code', type: 'code', patterns: { P: { code: 'note("c e g").s("triangle")' } }, clips: [{ section: 'A', pattern: 'P' }], rack: [{ device: 'lfo', target: 'pan' }] };
  const c = compileSong(song([t]));
  assert(c.includes(".pan(0.5).lfo({ c: 'pan'"), c.split('\n').filter(l => l.includes('lfo')).join('\n'));
});


// ---------- movement parameters (D11 to D13) ----------
// superdough's LFO worklet (worklets.mjs, LFOProcessor) at x cycles after a note struck on cycle c0: the phase starts at
// c0 × sync + phaseoffset, the value is (wave + dc) × depth clamped to [dc × depth, dc × depth + depth]
const fr = x => ((x % 1) + 1) % 1;
const WAVES = { tri: (p, k = 0.5) => (p >= k ? 1 / (1 - k) - p / (1 - k) : p / k), sine: p => Math.sin(2 * Math.PI * p) * 0.5 + 0.5, ramp: p => p, saw: p => 1 - p, square: (p, k = 0.5) => (p >= k ? 0 : 1) };
const lfoAt = (l, c0, x) => {
  const ph = fr(c0 * l.sync + (l.phaseoffset || 0) + x * l.sync), dc = l.dcoffset ?? -0.5, d = l.depthabs;
  const v = (WAVES[l.shape || 'tri'](ph, l.skew ?? 0.5) + dc) * d;
  return Math.min(Math.max(v, Math.min(dc * d, dc * d + d)), Math.max(dc * d, dc * d + d));
};
// the gain of a gated line at bar position x, from the haps' lfo entries (Strudel in Node)
const lfosOf = v => [...v.lfo.__ids].map(id => v.lfo[id]);
const gainAt = (v, c0, x) => v.gain + lfosOf(v).filter(l => l.control === 'gain').reduce((t, l) => t + lfoAt(l, c0, x), 0);
const gateHap = async (pattern, extra = {}, gain = 0.5) => (await hapsOf(`note("c3").s("sawtooth").gain(${gain})${gateCode({ pattern, depth: 1, smooth: 0, phase: 0, ...extra }, gain)}`, 0, 1))[0].value;

await check('phase 0 writes nothing; a phase writes phaseoffset as 1 - phase on the Pump dip, pan and sends', async () => {
  assert(phaseOffset(0) === 0 && phaseOffset(0.25) === 0.75 && phaseOffset(0.5) === 0.5, 'phaseOffset');
  assert(pumpDipCode({ rate: 0.25, depth: 0.6 }, 0.3) === ".lfo({ c: 'gain', s: 4, da: 0.18, dc: -1, sh: 'ramp' })", 'pump at phase 0 as before');
  assert(pumpDipCode({ rate: 0.25, depth: 0.6, phase: 0.5 }, 0.3) === ".lfo({ c: 'gain', s: 4, da: 0.18, dc: -1, sh: 'ramp', phaseoffset: 0.5 })", 'pump phased');
  assert(lfoCode({ target: 'pan', rate: 0.5, depth: 1, shape: 'sine', phase: 0.25 }) === ".lfo({ c: 'pan', s: 2, da: 2, sh: 'sine', phaseoffset: 0.75 })", 'pan phased');
  assert(lfoCode({ target: 'room', rate: 1, depth: 0.4, shape: 'tri', phase: 0.5 }).endsWith("sh: 'tri', phaseoffset: 0.5 })"), 'room phased');
  // the dip of a Pump at 1/4 bar, phase 0.25: its lowest point is a sixteenth after each beat, as Strudel evaluates it
  const s = song([pad([{ device: 'pump', phase: 0.25 }])]);
  const [l] = block(compileSong(s), 'pad');
  assert(l.includes('phaseoffset: 0.75'), l);
  const [h] = await hapsOf(l, 0, 1), lf = lfosOf(h.value).find(x => x.control === 'gain');
  assert(lf.phaseoffset === 0.75, JSON.stringify(lf));
  const xs = Array.from({ length: 64 }, (_, i) => i / 64), low = xs.reduce((m, x) => (lfoAt(lf, 0, x) < lfoAt(lf, 0, m) ? x : m), 0);
  assert(Math.abs(low - 1 / 16) < 1e-9, `lowest at ${low}`);
});
await check('a phased filter LFO uses the generic form around the track\'s cutoff, the same swing as lpdepth', async () => {
  const [l] = block(compileSong(song([pad([{ device: 'lfo', depth: 0.5, phase: 0.25 }])])), 'pad');
  assert(!l.includes('lpsync') && l.includes(`.lfo({ c: 'lpf', s: 2, da: ${Math.round(0.5 * LPDEPTH_SCALE * 2000)}, sh: 'sine', phaseoffset: 0.75 })`) && count(l, 'lpf') === 1, l);
  const [h] = await hapsOf(l, 0, 1);
  assert(h.value.cutoff === 2000 && h.value.lfo[0].control === 'cutoff', JSON.stringify(h.value.lfo));
  const [p0] = block(compileSong(song([pad([{ device: 'lfo', depth: 0.5 }])])), 'pad');
  assert(p0.includes('.lpsync(2)'), 'phase 0 keeps lpsync');
});
await check('LFO on volume writes the Tremolo device\'s tremolo with shape and phase; the device\'s own code is unchanged', async () => {
  assert(DEVICES.tremolo.code(deviceArgs({ device: 'tremolo' })) === '.tremolosync(8).tremolodepth(0.7)', 'tremolo device');
  assert(lfoCode({ target: 'volume', rate: 0.125, depth: 0.6, shape: 'sine' }) === '.tremolosync(8).tremolodepth(0.6).tremoloshape("sine")', 'volume');
  assert(tremoloCode(4, 0.5, 'tri', 0.25) === '.tremolosync(4).tremolodepth(0.5).tremoloshape("tri").tremolophase(0.75)', 'phased');
  const s = song([pad([{ device: 'tremolo' }, { device: 'lfo', target: 'volume', rate: 0.125, depth: 0.6 }])]);
  const [l] = block(compileSong(s), 'pad');
  assert(count(l, 'tremolosync') === 1 && l.includes('.tremolosync(8).tremolodepth(0.6).tremoloshape("sine")') && !l.includes('lpsync'), l);
  assert(issues(s).warnings.some(x => x.path === 'tracks[0].rack[1]' && /replaces the tremolo device/.test(x.msg)), JSON.stringify(issues(s).warnings));
  const [h] = await hapsOf(l, 0, 1);
  assert(h.value.tremolosync === 8 && h.value.tremoloshape === 'sine' && h.value.cutoff === 2000, JSON.stringify(h.value));
});
await check('LFO on pitch: vib in Hz from the section\'s tempo and vibmod in semitones; shape and phase warn', async () => {
  const t = { id: 'hook', type: 'hook', settings: { gain: 0.3 }, patterns: { P: { preset: 'richiamo' } }, clips: [{ section: 'A', pattern: 'P' }], rack: [{ device: 'lfo', target: 'pitch', rate: 0.25, depth: 0.4 }] };
  const [l] = block(compileSong(song([t])), 'hook');
  assert(l.includes('.vib(2).vibmod(0.2)') && !l.includes(".lfo("), l);
  const [l90] = block(compileSong(song([t], [{ name: 'A', bars: 8, bpm: 90 }])), 'hook');
  assert(l90.includes('.vib(1.5).vibmod(0.2)'), l90);
  const [h] = await hapsOf(l, 0, 1);
  assert(h.value.vib === 2 && h.value.vibmod === 0.2, JSON.stringify(h.value));
  const w = issues(song([{ ...t, rack: [{ device: 'lfo', target: 'pitch', shape: 'tri', phase: 0.5 }] }])).warnings.map(x => x.path);
  assert(w.includes('tracks[0].rack[0].shape') && w.includes('tracks[0].rack[0].phase'), w.join(' '));
});
await check('Gate runs: shortest period and closed runs, a run over the period\'s end kept whole', () => {
  assert(JSON.stringify(gateRuns('x.x.x.x.x.x.x.x.')) === JSON.stringify({ period: 2, runs: [[1, 1]] }), JSON.stringify(gateRuns('x.x.x.x.x.x.x.x.')));
  assert(JSON.stringify(gateRuns('..x...x...x...x.')) === JSON.stringify({ period: 4, runs: [[3, 3]] }), JSON.stringify(gateRuns('..x...x...x...x.')));
  assert(JSON.stringify(gateRuns('xx.xx.x.xx.xx.x.')) === JSON.stringify({ period: 8, runs: [[2, 1], [5, 1], [7, 1]] }), JSON.stringify(gateRuns('xx.xx.x.xx.xx.x.')));
  assert(gateRuns('x..x..x..x..x.x.').period === 16 && gateRuns('x..x..x..x..x.x.').runs.length === 6, 'dotted');
  for (const p of Object.keys(GATE_PRESETS)) assert(p.length === 16 && gateRuns(p).runs.length, p);
});
await check('Gate, hard edges: the gain is the track\'s on open steps and 1 - depth of it on closed ones, for every preset, phase and onset', async () => {
  for (const p of Object.keys(GATE_PRESETS)) for (const phase of [0, 0.5]) for (const c0 of [0, 3]) {
    const v = await gateHap(p, { phase, depth: 0.8 });
    for (let i = 0; i < 16; i++) for (const f of [0.1, 0.5, 0.9]) {
      // a point inside step i, shifted by the phase (a share of a step)
      const x = (i + phase + f) / 16, want = p[i] === 'x' ? 0.5 : 0.5 * 0.2;
      assert(Math.abs(gainAt(v, c0, x) - want) < 1e-6, `${p} phase ${phase} step ${i + 1}: ${gainAt(v, c0, x)} for ${want}`);
    }
  }
});
await check('Gate, smoothed edges: a trapezoid with ramps of `smooth` steps centred on the edges, never above the gain', async () => {
  for (const p of Object.keys(GATE_PRESETS)) for (const smooth of [0.1, 0.25, 0.5]) {
    const v = await gateHap(p, { smooth, depth: 1 }, 0.4);
    assert(lfosOf(v).length === 2 * gateRuns(p).runs.length, `${p}: ${lfosOf(v).length} LFOs`);
    let top = 0;
    for (let i = 0; i < 16; i++) {
      const prevOpen = p[(i + 15) % 16] === 'x', nextOpen = p[(i + 1) % 16] === 'x';
      // the middle of each step is past any ramp: full level or silence
      const mid = gainAt(v, 0, (i + 0.5) / 16), want = p[i] === 'x' ? 0.4 : 0;
      assert(Math.abs(mid - want) < 2e-3, `${p} smooth ${smooth} step ${i + 1} middle: ${mid}`);
      // on an edge between an open and a closed step, the ramp is half way
      if (p[i] === '.' && prevOpen) assert(Math.abs(gainAt(v, 0, i / 16) - 0.2) < 2e-3, `${p} edge into step ${i + 1}: ${gainAt(v, 0, i / 16)}`);
      if (p[i] === '.' && nextOpen) assert(Math.abs(gainAt(v, 0, (i + 1) / 16) - 0.2) < 2e-3, `${p} edge out of step ${i + 1}`);
      for (let j = 0; j < 32; j++) top = Math.max(top, gainAt(v, 0, (i + j / 32) / 16));
    }
    assert(top <= 0.4 + 2e-3, `${p}: above the gain (${top})`);
  }
});
await check('Gate on a held pad: its gain LFOs after the line\'s own gain, Ottavi as one LFO at 8 cycles a bar', async () => {
  const [l] = block(compileSong(song([pad([{ device: 'gate', smooth: 0, depth: 1 }])])), 'pad');
  assert(count(l, 'lfo') === 1 && l.includes(".lfo({ c: 'gain', s: 8, da: 0.3, dc: -1, sh: 'square', sk: 0.5, phaseoffset: 0 })"), l);
  const [h] = await hapsOf(l, 0, 1);
  assert(h.value.gain === 0.3 && h.value.lfo[0].sync === 8 && h.value.lfo[0].skew === 0.5, JSON.stringify(h.value));
});
await check('validator: Gate pattern, one Gate, Gate with Pump, a costly pattern', () => {
  const e = s => issues(s).errors.map(x => `${x.path}: ${x.msg}`);
  for (const bad of ['x.x.', 'xxxxxxxxxxxxxxxx', '................', 'x-x-x-x-x-x-x-x-']) assert(e(song([pad([{ device: 'gate', pattern: bad }])])).some(x => x.startsWith('tracks[0].rack[0].pattern')), bad);
  assert(e(song([pad([{ device: 'gate' }, { device: 'gate' }])])).some(x => x.startsWith('tracks[0].rack[1]: at most one gate')), 'two gates');
  assert(e(song([pad([{ device: 'pump' }, { device: 'gate' }])])).some(x => x.startsWith('tracks[0].rack[1]: a gate and a pump')), 'gate and pump');
  assert(e(song([pad([{ device: 'gate', pattern: 'x.x..x.xx.x...x.' }, { device: 'lfo', phase: 0.3 }])])).length === 0, 'gate and a phased lfo are fine');
  assert(issues(song([pad([{ device: 'gate', pattern: 'x.x.x.x.x.x.x..x' }])])).warnings.some(x => x.path === 'tracks[0].rack[0].pattern'), 'costly pattern warns');
  assert(e(song([pad([{ device: 'lfo', phase: 1 }])])).some(x => x.startsWith('tracks[0].rack[0].phase')), 'phase above 0.95');
});

// ---------- the validator ----------
await check('validator: three movement devices, two pumps, two LFOs on one target, movement on drums, Sweep out of range', () => {
  const e = s => issues(s).errors.map(x => `${x.path}: ${x.msg}`);
  const three = e(song([pad([{ device: 'sweep' }, { device: 'lfo' }, { device: 'pump' }])]));
  assert(three.some(x => x.startsWith('tracks[0].rack[2]: at most 2 movement devices')), three.join(' | '));
  const pumps = e(song([pad([{ device: 'pump' }, { device: 'pump' }])]));
  assert(pumps.some(x => x.startsWith('tracks[0].rack[1]: at most one pump')), pumps.join(' | '));
  const lfos = e(song([pad([{ device: 'lfo' }, { device: 'lfo' }])]));
  assert(lfos.some(x => x.startsWith('tracks[0].rack[1]: at most one lfo on filter')), lfos.join(' | '));
  assert(e(song([pad([{ device: 'lfo' }, { device: 'lfo', target: 'pan' }])])).length === 0, 'two LFOs on two targets are fine');
  const dr = e(song([drums({ rack: [{ device: 'lfo' }] })]));
  assert(dr.some(x => x.startsWith('tracks[0].rack[0]: lfo moves melodic tracks only')), dr.join(' | '));
  const rng = e(song([pad([{ device: 'sweep', target: 'room', from: 0, to: 4000 }])]));
  assert(rng.some(x => x.startsWith('tracks[0].rack[0].to: a number from 0 to 1')), rng.join(' | '));
  assert(e(song([pad([{ device: 'lfo', target: 'gain' }])])).some(x => x.startsWith('tracks[0].rack[0].target')), 'gain target');
  assert(issues(song([pad([{ device: 'sweep', target: 'room', from: 0, to: 0.5, curve: 'exp' }])])).warnings.some(x => x.path === 'tracks[0].rack[0].curve'), 'exp on room warns');
});

// ---------- #94's vary ----------
await check('vary on lpf with an LFO on the filter: the seeded value is the base and the LFO sways it, no warning', async () => {
  const s = song([pad([{ device: 'lfo' }], { vary: [{ on: 'lpf', amount: 0.3, seed: 7, cycles: 4 }] })]);
  const [l] = block(compileSong(s), 'pad');
  assert(/\.lpf\(rand\.range\([^)]*\)\.rib\(7, 4\)\)/.test(l) && l.includes('.lpsync(') && count(l, 'lpf') === 1, l);
  assert(!issues(s).warnings.some(x => x.path.includes('vary')), 'warning');
  await hapsOf(l, 0, 2);
});
await check('vary on lpf with a Sweep on the filter: left out with #94\'s warning, the line holds the Sweep\'s ramp', () => {
  const s = song([pad([{ device: 'sweep' }], { vary: [{ on: 'lpf', amount: 0.3, seed: 7, cycles: 4 }] })]);
  const [l] = block(compileSong(s), 'pad');
  assert(!l.includes('rib(') && l.includes('.lpf("<400'), l);
  assert(issues(s).warnings.some(x => x.path === 'tracks[0].settings.vary[0]' && /sweep device writes lpf/.test(x.msg)), JSON.stringify(issues(s).warnings));
  assert(varySkips('pad', {}, [{ device: 'sweep', target: 'room' }]).room && !varySkips('pad', {}, [{ device: 'lfo', target: 'room' }]).room, 'skips by writes');
});
await check('vary on room with an LFO on room: one .room (the varied one) and the LFO', () => {
  const [l] = block(compileSong(song([arp([{ device: 'lfo', target: 'room' }], { vary: [{ on: 'room', amount: 0.4, seed: 3, cycles: 2 }] })])), 'arp');
  assert(count(l, 'room') === 1 && l.includes('.room(rand.range') && l.includes("c: 'room'"), l);
});

// ---------- Path (D14) ----------
// the bus a path line drives, from its haps: superdough's linear ADSR (synth.mjs, getParamADSR) on every note, release
// 10 ms (the shortest), each note's gain times its envelope summed; bars of `sec` seconds
const busModel = (haps, sec) => {
  const notes = haps.map(h => { const v = h.value, b = h.whole.begin.valueOf() * sec, d = (h.whole.end.valueOf() - h.whole.begin.valueOf()) * sec; return { b, d, g: v.gain, a: Math.max(v.attack, 0.001), dc: Math.max(v.decay, 0.001), s: v.sustain, r: PATH_EDGE }; });
  const env = (n, t) => {
    const x = t - n.b, end = n.d;
    if (x < 0) return 0;
    const at = y => (y < n.a ? y / n.a : Math.max(n.s, 1 - (1 - n.s) * (y - n.a) / n.dc));
    if (x <= end) return at(x);
    const top = n.a > end ? end / n.a : n.a + n.dc > end ? at(end) : n.s;
    return x - end < n.r ? top * (1 - (x - end) / n.r) : 0;
  };
  return t => notes.reduce((acc, n) => acc + n.g * env(n, t), 0);
};
await check('Path device: defaults, labels, six targets, no knob; the card preview evaluates', async () => {
  assert(DEVICES.path && DEVICES.path.kind === 'move' && MOVE_DEVICES.path.label.it === 'Percorso', 'device');
  assert(JSON.stringify(deviceArgs({ device: 'path' })) === JSON.stringify({ target: 'filter', points: [], smooth: 'linear' }), JSON.stringify(deviceArgs({ device: 'path' })));
  assert(MOVE_DEVICES.path.args[0][3].join() === 'filter,hpf,volume,room,delay,pan', 'targets');
  for (const target of ['filter', 'hpf', 'volume', 'room', 'delay', 'pan']) await hapsOf(`note("c e g").s("sawtooth").postgain(.5)${movePreview({ device: 'path', target, points: [[0, target === 'filter' || target === 'hpf' ? 400 : 0], [4, target === 'filter' || target === 'hpf' ? 3000 : 1]] }, 'pad')}`, 0, 1);
});
await check('pathDevice: flat is null, a measured fade-out validates, values clamped, bars rounded, thinned, at most 256 points', () => {
  assert(pathDevice('volume', [[0, 1], [8, 1]]) === null && pathDevice('filter', [[0, 1000], [8, 1005]]) === null && pathDevice('pitch', [[0, 0], [1, 1]]) === null, 'flat or unknown');
  const fo = pathDevice('volume', [[120, 1], [124, 0.6], [128, 0]], { perBar: 1 });
  assert(fo && fo.device === 'path' && fo.target === 'volume' && fo.points.length === 3, JSON.stringify(fo));
  assert(issues(song([pad([fo])], [{ name: 'A', bars: 128, bpm: 120 }])).errors.length === 0, JSON.stringify(issues(song([pad([fo])], [{ name: 'A', bars: 128, bpm: 120 }]))));
  const c = pathDevice('filter', [[0, 10], [1.13, 40000], [1.2, 900]], { perBar: 4 });
  assert(JSON.stringify(c.points) === JSON.stringify([[0, 60], [1.25, 18000]]), `clamped, rounded, repeated bar kept once: ${JSON.stringify(c.points)}`);
  const line = pathDevice('volume', Array.from({ length: 33 }, (_, i) => [i / 4, i / 32]), { perBar: 4 });
  assert(line.points.length === 2, `a straight ramp thins to its ends: ${line.points.length}`);
  const wobble = pathDevice('filter', Array.from({ length: 2000 }, (_, i) => [i / 16, 1000 + 800 * Math.sin(i * 1.7)]), { perBar: 16 });
  assert(wobble.points.length <= 256 && issues(song([pad([wobble])], [{ name: 'A', bars: 128, bpm: 120 }])).errors.length === 0, `cap: ${wobble.points.length}`);
  assert(pathDevice('volume', [[0, 0], [4, 1]], { smooth: 'step' }).smooth === 'step', 'step');
  assert(thinPath([[0, 0], [1, 0.5], [2, 1], [3, 0]], 0.01).length === 3, 'thinPath keeps a corner');
});
await check('Path validator: 16 points a bar, 256 points, 8 a song, one per target, path with sweep, volume 0-1, increasing bars', () => {
  const e = s => issues(s).errors.map(x => `${x.path}: ${x.msg}`);
  const dense = e(song([pad([{ device: 'path', target: 'filter', points: Array.from({ length: 20 }, (_, i) => [i / 20, 400 + i * 10]) }])]));
  assert(dense.some(x => x.startsWith('tracks[0].rack[0].points: 20 points in bar 1')), dense.join(' | '));
  const many = e(song([pad([{ device: 'path', target: 'filter', points: Array.from({ length: 257 }, (_, i) => [i / 16, 400 + i]) }])], [{ name: 'A', bars: 32, bpm: 120 }]));
  assert(many.some(x => x.startsWith('tracks[0].rack[0].points: 257 points')), many.join(' | '));
  const ps = e(song([pad([{ device: 'path', target: 'filter', points: [[0, 400], [4, 3000]] }, { device: 'sweep' }])]));
  assert(ps.some(x => x.startsWith('tracks[0].rack[1]: a path and a sweep both write the filter')), ps.join(' | '));
  const sp = e(song([pad([{ device: 'sweep' }, { device: 'path', target: 'filter', points: [[0, 400], [4, 3000]] }])]));
  assert(sp.some(x => x.startsWith('tracks[0].rack[1]: a path and a sweep')), sp.join(' | '));
  assert(e(song([pad([{ device: 'path', target: 'room', points: [[0, 0], [4, 0.5]] }, { device: 'sweep' }])])).length === 0, 'path and sweep on two targets');
  assert(e(song([pad([{ device: 'path', target: 'filter', points: [[0, 400], [4, 3000]] }, { device: 'lfo' }])])).length === 0, 'path and LFO on one target are fine');
  const two = e(song([pad([{ device: 'path', target: 'pan', points: [[0, 0], [4, 1]] }, { device: 'path', target: 'pan', points: [[0, 1], [4, 0]] }])]));
  assert(two.some(x => x.startsWith('tracks[0].rack[1]: at most one path on pan')), two.join(' | '));
  const three = e(song([pad([{ device: 'path', target: 'pan', points: [[0, 0], [4, 1]] }, { device: 'lfo' }, { device: 'pump' }])]));
  assert(three.some(x => x.startsWith('tracks[0].rack[2]: at most 2 movement devices')), three.join(' | '));
  const vol = e(song([pad([{ device: 'path', target: 'volume', points: [[0, 0], [4, 1.5]] }])]));
  assert(vol.some(x => x.startsWith('tracks[0].rack[0].points[1]: a value from 0 to 1')), vol.join(' | '));
  const back = e(song([pad([{ device: 'path', target: 'volume', points: [[2, 0], [1, 1]] }])]));
  assert(back.some(x => x.startsWith('tracks[0].rack[0].points[1]: bars must increase')), back.join(' | '));
  assert(e(song([pad([{ device: 'path', target: 'volume', points: [] }])])).some(x => x.startsWith('tracks[0].rack[0].points')), 'empty');
  const nine = song(Array.from({ length: 5 }, (_, k) => pad([{ device: 'path', target: 'volume', points: [[0, 0], [4, 1]] }, { device: 'path', target: 'pan', points: [[0, 0], [4, 1]] }], {}, `pad${k}`)));
  const ne = e(nine);
  assert(ne.some(x => x.startsWith('tracks[4].rack[0]: at most 8 paths')) && !ne.some(x => x.startsWith('tracks[3]')), ne.join(' | '));
  assert(issues(song([pad([{ device: 'path', target: 'volume', points: [[0.1, 0], [4, 1]] }])])).warnings.some(x => x.path === 'tracks[0].rack[0].points'), 'off the grid warns');
});
await check('Path code: the path line opens its track block, buses in track order, muted and hushed with the track', async () => {
  const fp = { device: 'path', target: 'filter', points: [[0, 400], [2.5, 900], [4, 3000]] }, vp = { device: 'path', target: 'volume', points: [[0, 0], [8, 1]] };
  const c = compileSong(song([drums(), pad([fp, vp]), arp([{ device: 'path', target: 'pan', points: [[0, 0], [8, 1]] }])]));
  const L = c.split('\n'), h = L.findIndex(l => l.startsWith('// ========== pad'));
  assert(L[h + 1].includes('.s("one").bus(1).dry(0)') && L[h + 1].endsWith('// path: filter, 3 points') && L[h + 2].includes('.bus(2).dry(0)') && L[h + 2].endsWith('// path: volume, 2 points'), L.slice(h, h + 3).join('\n'));
  const [, , pl] = block(c, 'pad');
  assert(pl.includes(".lpf(400).bmod({ b: 1, c: 'lpf', da: 2600 })") && count(pl, 'lpf') === 1 && /\.mul\(postgain\(\.001\)\)\.bmod\(\{ b: 2, c: 'postgain', dep: 1000 \}\)\.orbit\(/.test(pl), pl);
  assert(block(c, 'arp')[0].includes('.bus(3)') && block(c, 'arp')[1].includes(".pan(0).bmod({ b: 3, c: 'pan', da: 2 })"), block(c, 'arp').join('\n'));
  // muted: no path line, the others keep their bus
  const m = compileSong(song([drums(), { ...pad([fp]), mute: true }, arp([{ device: 'path', target: 'pan', points: [[0, 0], [8, 1]] }])]));
  assert(!m.includes('.bus(1)') && block(m, 'arp')[0].includes('.bus(2)'), 'muted');
  // hushed (growth-shapes): the path line is hushed with its track
  const hu = compileSong(song([drums(), { ...pad([fp]), hush: true }]));
  assert(block(hu, 'pad').every(l => l.startsWith('_$:')), block(hu, 'pad').join('\n'));
  // a guitar's gated postgain is set before the volume path scales it
  const g = compileSong(song([{ id: 'gtr', type: 'guitar', settings: {}, patterns: { P: { preset: 'chug' } }, clips: [{ section: 'A', pattern: 'P' }], rack: [vp] }]));
  const [, gl] = block(g, 'gtr');
  assert(gl.indexOf('.postgain(section1') >= 0 && gl.indexOf('.postgain(section1') < gl.indexOf('.mul(postgain(') && gl.indexOf('.mul(postgain(') < gl.indexOf(".bmod({ b: 1, c: 'postgain'"), gl);
  const hp = await hapsOf(gl.replace(/postgain\(section1/, 'postgain(pure(1)'), 0, 1);
  assert(hp.length && Math.abs(hp[0].value.postgain - 0.0005) < 1e-9 && hp[0].value.bmod[0].depth === 1000, JSON.stringify(hp[0] && hp[0].value));
});
await check('Path line: the bus model of every note sums to the drawn path at 64 points a bar (linear, step, two tempos)', async () => {
  const cases = [
    [{ target: 'volume', points: [[0, 0], [2, 1], [2.5, 0.3], [4, 0.3], [6, 1], [6.25, 0.1]] }, 120],
    [{ target: 'filter', points: [[1, 400], [4.75, 3000], [6, 1000]] }, 90],
    [{ target: 'volume', points: [[0, 0.2], [1, 1], [2.5, 0.5], [4, 1]], smooth: 'step' }, 120],
  ];
  for (const [a, bpm] of cases) {
    const sec = 240 / bpm, line = pathLine({ device: 'path', ...a }, { bus: 1, total: 8, barSec: sec });
    const haps = (await S.evaluate(line.replace(/^\$:\s*/, '').replace(/\s+\/\/.*$/, ''))).queryArc(0, 8).filter(h => h.hasOnset());
    const bus = busModel(haps, sec), pts = pathPoints(a), vals = pts.map(p => p[1]), lo = Math.min(...vals), span = Math.max(...vals) - lo;
    let worst = 0, at = 0;
    for (let i = 0; i < 8 * 64; i++) {
      const x = i / 64 + 1 / 128, t = x * sec;
      // the step path's edges cross over 10 ms: skip the samples inside them
      if (a.smooth === 'step' && pts.some(p => p[0] * sec <= t && t < p[0] * sec + PATH_EDGE)) continue;
      const err = Math.abs(bus(t) - (pathAt(pts, x, a.smooth) - lo) / span);
      if (err > worst) { worst = err; at = x; }
    }
    assert(worst < 0.005, `${a.target} ${a.smooth || 'linear'} at ${bpm}: worst ${worst.toFixed(4)} at bar ${at.toFixed(3)}`);
  }
  // the same path in a song with two tempos: each bar's notes take that bar's seconds
  const s = song([pad([{ device: 'path', target: 'volume', points: [[0, 0], [8, 1]] }])], [{ name: 'A', bars: 4, bpm: 120 }, { name: 'B', bars: 4, bpm: 90 }]);
  s.tracks[0].clips = [{ start: 0, bars: 8, pattern: 'P' }];
  const pl = compileSong(s).split('\n').find(l => l.includes('.bus(1)'));
  assert(pl.includes(':2:0:1') && pl.includes(':2.6667:0:1'), pl);
});
await check('Path line in the readers: no mask idea, its own name, buses apart on air, out of the preview, base never hidden', async () => {
  const { nameLines, isPathLine, isPathHap } = await import('../src/song/line-names.js');
  const { apart } = await import('../src/live/air-code.js');
  const { previewExpression } = await import('../src/player/preview.js');
  const fp = { device: 'path', target: 'filter', points: [[0, 400], [4, 3000]] };
  const mi = compileSong(song([drums(), { ...pad([fp]), maskIdea: '<1 0>' }]));
  const [pl, ml] = block(mi, 'pad');
  assert(isPathLine(pl) && !pl.includes('.mask("<1 0>")') && ml.includes('.mask("<1 0>")'), `${pl}\n${ml}`);
  const named = nameLines(compileSong(song([pad([fp])])));
  assert(/^padPath: stack\(/m.test(named) && /^pad: note\(/m.test(named), named);
  const ap = apart(compileSong(song([pad([fp])])), 'z');
  assert(ap.includes('.bus(101)') && ap.includes('.bmod({ b: 101,') && !/\.bus\(1\)/.test(ap), 'apart');
  const pv = previewExpression(compileSong(song([pad([fp, { device: 'path', target: 'volume', points: [[0, 0], [4, 1]] }])])));
  assert(!pv.includes('"one"') && !pv.includes('bmod') && !pv.includes('mul(postgain') && pv.includes('.lpf(400)'), pv);
  assert(isPathHap({ s: 'one', bus: 1 }) && !isPathHap({ s: 'one' }) && !isPathHap({ s: 'bd', bus: 1 }), 'isPathHap');
  const hid = compileSong(song([{ ...pad([fp]), hidden: ['cutoff', 'room'] }]));
  const [, hl] = block(hid, 'pad');
  assert(hl.includes(".lpf(400).bmod({ b: 1, c: 'lpf'") && !hl.includes('.room('), hl);
});
await check('copied code with paths evaluates in plain Strudel (core, mini-notation and the transpiler, no app helper)', async () => {
  // (Strudel in Node with the app's helpers is loaded first, above: a plain repl on the same Strudel copy, no helpers
  // installed on it; the path lines and their bmod use only Strudel's own functions)
  const core = await import('@strudel/core'), { transpiler } = await import('@strudel/transpiler');
  let error = null;
  const R = core.repl({ transpiler, defaultOutput: () => {}, getTime: () => 0, onEvalError: e => { error = e; } });
  const code = compileSong(JSON.parse(fs.readFileSync('songs/examples/11-path.json', 'utf8')));
  const helpers = ['vox(', 'melody(', 'miskMix', 'K('].filter(h => code.includes(h));
  assert(!helpers.length, `app helpers in the code: ${helpers.join(' ')}`);
  const p = await R.evaluate(code, false);
  assert(p && !error, error && error.message);
  const h = p.queryArc(0, 16).filter(x => x.hasOnset()).map(x => x.value);
  const one = h.filter(v => v.s === 'one'), moved = h.filter(v => v.bmod);
  assert([1, 2, 3, 4].every(b => one.some(v => v.bus === b && v.dry === 0)) && moved.some(v => v.bmod[0].control === 'cutoff' && v.bmod[0].bus === 2) && moved.some(v => Object.values(v.bmod).some(m => m && m.control === 'postgain' && m.bus === 4)), `${one.length} bus notes, ${moved.length} moved notes`);
});
await check('pathMove: bases and depths per target', () => {
  const m = (target, points, smooth) => pathMove({ target, points, smooth }, 5);
  assert(m('hpf', [[0, 200], [4, 1200]]).code === ".hpf(200).bmod({ b: 5, c: 'hpf', da: 1000 })", m('hpf', [[0, 200], [4, 1200]]).code);
  assert(m('room', [[0, 0], [4, 0.6]]).code === ".room(0.001).bmod({ b: 5, c: 'room', da: 0.599 })", m('room', [[0, 0], [4, 0.6]]).code);
  assert(m('volume', [[0, 0.5], [4, 1]]).post === ".mul(postgain(.5)).bmod({ b: 5, c: 'postgain', dep: 1 })", m('volume', [[0, 0.5], [4, 1]]).post);
  assert(m('volume', [[0, 0.5]]).post === '.mul(postgain(.5))' && pathLine({ target: 'volume', points: [[0, 0.5]] }, { bus: 5, total: 8, barSec: 2 }) === null, 'a flat path: its base alone');
});

// ---------- determinism, examples ----------
await check('a song with a Sweep, an LFO and a Pump compiles byte for byte the same twice', () => {
  const s = song([drums(), pad([{ device: 'sweep' }, { device: 'pump' }]), arp([{ device: 'lfo', target: 'pan' }])]);
  assert(compileSong(s) === compileSong(JSON.parse(JSON.stringify(s))), 'differs');
});
await check('the example songs validate and every line evaluates in Strudel', async () => {
  for (const f of ['07-pump', '08-sweep', '09-sway', '10-gate', '11-path']) {
    const s = JSON.parse(fs.readFileSync(`songs/examples/${f}.json`, 'utf8'));
    assert(issues(s).errors.length === 0 && issues(s).warnings.length === 0, `${f}: ${JSON.stringify(issues(s))}`);
    const code = compileSong(s);
    for (const tr of s.tracks) for (const l of block(code, tr.id)) assert((await hapsOf(l, 0, 16)).length > 0, `${f} ${tr.id}: no haps`);
    const p = await S.evaluate(code);
    assert(p.queryArc(0, 4).length > 0, `${f}: whole song`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
