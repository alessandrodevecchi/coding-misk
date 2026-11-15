// The writer of a decoded track (track-to-code D9, D10, D14): the song model becomes a v2 song, and the app's compiler,
// code of the moment and typing do the rest. One writer for both levels. Pure: checked in Node (npm run check:decode).
//
// Parts: a `drums` track from the 16-step grids, and `code` tracks with plain Strudel for the bass and the chords (the
// format's named progressions and eight keys cannot hold any chord). A part plays only where the model hears it.
// Level A follows the model bar by bar with the hysteresis of D9: a new drum grid is written once it held for a bar
// (two bars for a difference of one or two steps), so a one-bar fill never changes the code; a part that stops is
// muted at once.
// The edit rule of both levels (decode-refine D7): a line changes when its part enters or stops, at a section change,
// or when its new pattern differs enough and has waited; numbers in EDIT_RULE. The top line's group (D6): `vox(…)` or
// `melody(…)` lines that evaluate to silence, `$:` where the model hears a top line.
import { STEPS, DRUM_ROWS, noteName, NOTE_NAMES, parseChord } from './model.js';
import { KITS } from '../music.js';
import { PART_LEVELS } from './part-levels.js';
import { BASS_PROFILES } from './bass-profiles.js';

export const SOUND_PRESETS = ['ours', 'simple'];
// sounds by measure (decode-refine D3): the bass band's brightness range over a bar that makes a moving filter (Hz;
// measured: luci-rosse and the acid song about 470, the radio seed's resonant supersaw 370, plain basses 120 to 260)
// sustain: the chords' mean energy left in the last eighth of their bar (amplitude ratio, 0.6 is about -4 dB) from which
// they get a room of `room` (round 8: a room from roomRange[0] to roomRange[1] along the sustain); levels: the gain steps the balance tries for each part (multipliers, 1.5 dB apart) and the
// highest gain it writes
// cut: the chords' high-pass and low-pass (Hz) when a Lead plays over at least leadOver of their bars, the song has
// drums and the balance kept the Lead within leadKeep dB of its written level (round 6, review P5: the cut fired on a
// pad-only song whose Lead the balance had turned down by 16 dB)
// bassBar: level B writes a bar with a single bass note when its bass level is at least this share of the song's loudest
// bar (round 6, C6; the same share as full.js HARMONY_RULE.quietBass, which is relative to the section)
// bassMissing: when the model has bass notes on more than this share of the bars and no bass track is written, the
// balance may not raise the drums (their kick would fill the bass's band). (Round 6 also tried leaving out a part the
// balance turns down by 12 dB or more: it removed real parts, the trap song's chords and three basses, band error
// 2.2 to 4.1 dB on the trap song; dropped.)
// drive: a driven bass (round 6, C2; the model's `bassDrive` profile, kit-measure.js): the app's own drive,
// `.distort(d).distortvol(vol)` after the filter (src/music.js writes the bass track's drive so), d the drive of the
// nearest bass the app can write (src/decode/bass-profiles.js, measured through the app inside a mix) by the fundamental's
// share h1 and the even/odd ratio, each over its spread in the table; a share of sineShare or more is a sine or a
// triangle, never a drive (round 7: 0.91, mid-gap between the highest driven reading and the lowest sine, 0.935);
// spread, eoFloor, min: the distance's fixed scale (share, even/odd dB), the floor of the even/odd read, the lowest drive
// written (round 7, review 2); squareEo, squareLow: a square bass by the median even/odd ratio or by its lowest tenth
// (round 8, fourth pass: a square under a pad for part of the song, when the profile reads a fundamental, h1 squareH1
// or more: a triangle bass read with no fundamental share went square and lost 1.1 dB); bassWave: the cutoff the measured bass's wave is written through (round 6, C1: the app bass's
// default, where the candidates were measured); a moving filter's resonance `lpq`; `table`, the drive the level table measured a driven bass
// at. (Round 5 wrote a fixed `.distort(4.5).distortvol(0.5).crush(4.85)` when the even/odd ratio was under -3 dB: the
// crusher matched a median-centroid score with broadband noise, +12 to +14 dB above 5.6 kHz, and the ratio read square,
// triangle and sine basses as driven; review of 13 November.)
export const SOUND_RULE = { move: 350, sustain: 0.6, room: 0.4, roomRange: [0.3, 0.9], holdShare: 0.8, fallback: 0.03, levels: Array.from({ length: 17 }, (_, i) => 2 ** ((i - 10) / 4)), maxGain: 1, shares: 0.1, near: 0.05, cut: [1200, 4000], leadOver: 0.5, leadKeep: 6, bassMissing: 1 / 3, bassBar: 0.2, drive: { vol: 0.5, lpq: 4, table: 4.5, sineShare: 0.91, spread: [0.227, 6.44], eoFloor: -8, min: 3, squareEo: -15, squareLow: -20, squareH1: 0.5 }, bassWave: 700 };
// the edit rule (decode-refine D7), tuned on the owner's test files: lineBars, bars at least between two edits of one
// line; anyBars, between two edits of any line; drumSteps, the steps a drum grid must change by (or a row that enters
// or leaves); bassShare, the share of note steps a bass loop must change by (or another root on its first bar);
// bassSteps, and at least that many steps in a bar; chordShare, the share of a chord loop's bars that must get a
// chord not close to the old one (the same root or the relative); runBars,
// level B: the bars a part must be heard, or not heard, to enter or stop inside a section. Every number can be changed
// here (tools/decode-edits.mjs measures the result)
export const EDIT_RULE = { lineBars: 4, anyBars: 2, drumSteps: 3, bassShare: 0.25, chordShare: 0.375, bassSteps: 3, runBars: 2 };
// the format's eight section keys (used only by the app's own instruments): the nearest to the model's key
const FORMAT_KEYS = ['E', 'F', 'F#', 'G', 'A', 'B', 'C', 'D'];
const PC = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
export function formatKey(key) {
  if (!key) return 'A';
  // the format's progressions are written in A minor: a major key takes its relative minor
  const pc = key.mode === 'major' ? (key.root + 9) % 12 : key.root;
  let best = 'A', d = 99;
  for (const k of FORMAT_KEYS) { const x = Math.min((PC[k] - pc + 12) % 12, (pc - PC[k] + 12) % 12); if (x < d) { d = x; best = k; } }
  return best;
}
export const keyName = key => (key ? `${NOTE_NAMES[key.root]} ${key.mode}` : '');

const EMPTY = '.'.repeat(STEPS);
const hits = s => [...(s || '')].filter(c => c === 'x').length;
const diffSteps = (a, b) => DRUM_ROWS.reduce((n, r) => n + [...EMPTY].filter((_, j) => (a[r] || EMPTY)[j] !== (b[r] || EMPTY)[j]).length, 0);
const gridKey = g => DRUM_ROWS.map(r => g[r] || EMPTY).join('|');

// what each part plays at each bar, as level A writes it: { drums: [grid|null], bass: [steps|null], chords: [name|null] }
// A part is heard in a bar (D9 clips from levels): drums with two hits or more and a kick, hat or two claps; bass with
// two notes or more; chords with a confident chord over a fair chord level.
export const drumsHeard = b => { const d = b.drums || {}; const n = DRUM_ROWS.reduce((a, r) => a + hits(d[r]), 0); return n >= 2 && (hits(d.bd) > 0 || hits(d.hh) > 0 || hits(d.oh) > 0 || hits(d.cp) >= 2); };
export const bassHeard = b => (b.bass || []).filter(x => x !== null && x !== undefined).length >= 2;
// level B (round 6, C6, group 8 work): one note is a bass line (a two-feel or a held sub has one note a bar) when the
// bar's bass level reaches SOUND_RULE.bassBar of the song's loudest bar (a stray note a bar in a section without a bass,
// the pad's root read by the pitch tracker, stays out; full.js bassRange's gate is relative to each section). top: the
// song's loudest bar bass level
export const bassHeardB = (b, top = 0) => { const n = (b.bass || []).filter(x => x !== null && x !== undefined).length; return n >= 2 || (n === 1 && top > 0 && !!b.level && (b.level.bass || 0) >= SOUND_RULE.bassBar * top); };
export const chordsHeard = b => !!b.chord && (b.chordConf || 0) >= 0.5 && (!b.level || b.level.chords >= 0.15);

export function partsByBar(model) {
  const bars = model.bars || [], out = { drums: [], bass: [], chords: [] };
  // drums: hysteresis on the grid (D9)
  let cur = null;
  bars.forEach((b, i) => {
    if (!drumsHeard(b)) { out.drums.push(null); return; }
    const g = Object.fromEntries(DRUM_ROWS.map(r => [r, (b.drums && b.drums[r]) || EMPTY]));
    if (!cur) { cur = g; out.drums.push(cur); return; }
    if (gridKey(g) !== gridKey(cur)) {
      const d = diffSteps(g, cur), need = d <= 2 ? 3 : 2;
      // the same new grid in the last `need` bars (this one included)
      let same = true;
      for (let k = 1; k < need; k++) { const p = bars[i - k]; if (!p || !drumsHeard(p) || gridKey(Object.fromEntries(DRUM_ROWS.map(r => [r, (p.drums && p.drums[r]) || EMPTY]))) !== gridKey(g)) { same = false; break; } }
      if (same) cur = g;
    }
    out.drums.push(cur);
  });
  // bass: the notes of each bar where it is heard
  out.bass = bars.map(b => (bassHeard(b) ? b.bass.map(x => (x === null || x === undefined ? null : x)) : null));
  out.chords = bars.map(b => (chordsHeard(b) ? b.chord : null));
  return out;
}

// the loop a part repeats, aligned to the bar number (Strudel's `<…>` takes element `cycle mod L` at a cycle): the
// smallest L of 1, 2, 4 or 8 whose last 2L bars repeat, else L of 1 (this bar). → values of length L, index k = the
// value at the latest bar b' ≤ bar with b' mod L = k
// grow: before a loop has repeated, the last 2, 4 or 8 bars heard (chords); else this bar alone (bass)
// maxL: the longest loop allowed (level A: a loop never grows again inside a section, decode-refine D7)
export function loopAt(list, bar, { grow = false, same = (a, b) => JSON.stringify(a) === JSON.stringify(b), maxL = 8 } = {}) {
  const loop = L => Array.from({ length: L }, (_, k) => list[bar - ((((bar - k) % L) + L) % L)]);
  const filled = L => { for (let i = bar - L + 1; i <= bar; i++) if (i < 0 || list[i] === null || list[i] === undefined) return false; return true; };
  for (const L of [1, 2, 4, 8].filter(x => x <= maxL)) {
    if (bar + 1 < 2 * L || !filled(2 * L)) continue;
    let ok = true;
    for (let i = bar - 2 * L + 1; i <= bar - L && ok; i++) if (!same(list[i], list[i + L])) ok = false;
    if (ok) return loop(L);
  }
  if (grow) for (const L of [8, 4, 2].filter(x => x <= maxL)) if (bar + 1 >= L && filled(L)) return loop(L);
  return [list[bar]];
}

// two bars of bass notes are the same line when at least 13 of their 16 steps agree (the analysis misses a note now
// and then); chords repeat exactly
const sameBass = (a, b) => !!(a && b) && a.filter((x, j) => x === b[j]).length >= 13;
const loopOpts = id => (id === 'chords' ? { grow: true } : { same: sameBass });
// level B: two bars of bass are the same line when three quarters of the steps where either plays a note agree
const sameBassB = (a, b) => { if (!a || !b) return false; let n = 0, ok = 0; for (let j = 0; j < a.length; j++) { if (a[j] === null && b[j] === null) continue; n++; if (a[j] === b[j]) ok++; } return n === 0 || ok / n >= 0.75; };

// a bar of bass notes in mini-notation: the coarsest grid (16, 8 or 4 steps) that holds every note, runs with "!"
export const HOLD = '_';
export function stepsMini(notes, name = noteName) {
  let n = STEPS;
  for (const g of [4, 8]) if (notes.every((x, j) => j % (STEPS / g) === 0 || x === null)) { n = g; break; }
  // (a hold, decode round 8, stays `_` and is never folded into `!`: each `_` makes the event before one step longer)
  const toks = Array.from({ length: n }, (_, k) => { const x = notes[k * (STEPS / n)]; return x === null || x === undefined ? '~' : x === HOLD ? HOLD : name(x); });
  const out = [];
  for (const tk of toks) { const last = out[out.length - 1]; if (last && last.t === tk && tk !== HOLD) last.n++; else out.push({ t: tk, n: 1 }); }
  return out.map(x => (x.n > 1 ? `${x.t}!${x.n}` : x.t)).join(' ');
}
const seqOf = list => (list.length === 1 ? list[0] : `<${list.join(' ')}>`);
const bassCode = (loop, snd) => `note("${seqOf(loop.map(b => (loop.length > 1 ? `[${stepsMini(b)}]` : stepsMini(b))))}")${snd}`;
const chordCode = (loop, snd) => `chord("${seqOf(loop)}").voicing()${snd}`;
// the Lead (decode-refine D2): degrees of the key's scale from an octave around its notes, `n("<…>").scale("A4:minor")`
// (a note outside the scale goes to the scale note below it)
export const LEAD_RULE = { voiced: 0.3 };
const SCALE_STEPS = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
export function leadCode(loop, key, snd = '') {
  const k = key || { root: 9, mode: 'minor' }, sc = SCALE_STEPS[k.mode === 'major' ? 'major' : 'minor'];
  const all = loop.flat().filter(x => x !== null && x !== undefined).sort((a, b) => a - b), med = all.length ? all[Math.floor(all.length / 2)] : 69;
  // the scale's root in the octave at or below the median note
  let base = med - ((((med - k.root) % 12) + 12) % 12);
  const degree = x => { const o = Math.floor((x - base) / 12), r = x - base - 12 * o; let d = 0; for (let i = 0; i < 7; i++) if (sc[i] <= r) d = i; return d + 7 * o; };
  const name = `${NOTE_NAMES[k.root]}${Math.floor(base / 12) - 1}:${k.mode === 'major' ? 'major' : 'minor'}`;
  return `n("${seqOf(loop.map(b => (loop.length > 1 ? `[${stepsMini(b, degree)}]` : stepsMini(b, degree))))}").scale("${name}")${snd}`;
}

// sounds by measure (D10): "Our sounds" picks from the generator's tables by the model's brightness and low-end
// weight; "Simple kit" is one fixed set. bars: the bars heard so far (level A) or the section's (level B)
// whole: the bars of the whole track (level B), where the bass's moving filter is decided once (decode-refine D3)
// drive: the bass's drive amount to write (level B, bassDriveOf(model.bassDrive)), 0 for none; wave: the measured bass's
// wave (round 6, C1), written through the app bass's default filter (cutoff 700, resonance 8, where the candidates were
// measured)
export function soundsOf(bars, preset = 'ours', whole = bars, drive = 0, wave = null) {
  if (preset === 'simple' || !bars.length) return { kit: 'RolandTR909', bass: '.s("sawtooth").lpf(700).gain(.75)', chords: '.s("supersaw").lpf(2000).gain(.3)', lead: '.s("square").lpf(2400).gain(.25)', why: 'simple' };
  const avg = k => bars.reduce((a, b) => a + (b[k] || 0), 0) / bars.length;
  const bright = avg('bright'), low = avg('low');
  // heavy low end: the 808; bright and light: the 909; between them the other machines of the generator's list
  const kit = low > 0.55 ? 'RolandTR808' : bright > 0.45 ? 'RolandTR909' : bright > 0.3 ? KITS[2] : KITS[4];
  const bassWave = low > 0.5 ? 'sine' : bright > 0.4 ? 'sawtooth' : 'square';
  const bassCut = Math.round((300 + 900 * Math.min(1, bright * 1.6)) / 50) * 50;
  // (decode-refine D3: a bass whose band brightness moves over a bar by SOUND_RULE.move or more, the median of the bars, an
  // acid line, is a sawtooth with a resonant filter moving over that range)
  const midOf = v => { const x = v.filter(y => y > 0).sort((a, b) => a - b); return x.length ? x[Math.floor(x.length / 2)] : 0; };
  const lo = midOf(bars.map(b => b.bassLo)), hi = midOf(bars.map(b => b.bassHi)), moving = midOf(whole.filter(b => b.bassHi > 0).map(b => b.bassHi - b.bassLo)) >= SOUND_RULE.move;
  const r50 = x => Math.round(x / 50) * 50;
  // (round 6, C2: a driven bass gets the app's drive after its filter, SOUND_RULE.drive)
  const D = SOUND_RULE.drive, clip = drive > 0 ? `.distort(${drive}).distortvol(${D.vol})` : '';
  // (a measured square or sine is that wave, not a moving sawtooth: the moving rule reads a kick against a bass or an
  // octave jump as a filter, review P7)
  const measured = wave && SOUND_RULE.bassWave, mv = moving && !(measured && wave !== 'sawtooth');
  const bassSound = mv ? `.s("sawtooth").lpf(sine.range(${r50(Math.max(200, lo))}, ${r50(Math.min(3000, hi))}).slow(4)).lpq(${drive ? D.lpq : 8})${clip}.gain(.6)` : measured ? `.s("${wave}").lpf(${SOUND_RULE.bassWave}).lpq(8)${clip}.gain(.75)` : `.s("${bassWave}").lpf(${bassCut})${clip}.gain(.75)`;
  const chordWave = bright > 0.45 ? 'supersaw' : bright > 0.25 ? 'sawtooth' : 'triangle';
  const chordCut = Math.round((800 + 3200 * Math.min(1, bright * 1.5)) / 100) * 100;
  // (decode-refine D3: chords that are still sounding at the end of their bar, a held or reverberant pad, get a room;
  // the Lead's wave and filter follow the brightness as the chords' do, one step brighter)
  const held = bars.filter(b => b.sustain !== undefined), sustain = held.length ? held.reduce((a, b) => a + b.sustain, 0) / held.length : 0;
  // (decode round 8: the room follows the sustain, from `roomRange[0]` for chords that stop to `roomRange[1]` for chords
  // that ring to the end of the bar; it was 0.4 from a sustain of 0.6 and none under it, and a held pad with a long
  // reverb measured 0.4 came out dry)
  const room = held.length ? `.room(${Math.round(Math.min(SOUND_RULE.roomRange[1], SOUND_RULE.roomRange[0] + (SOUND_RULE.roomRange[1] - SOUND_RULE.roomRange[0]) * sustain) * 10) / 10})` : '';
  const leadWave = bright > 0.45 ? 'sawtooth' : bright > 0.25 ? 'square' : 'triangle', leadCut = Math.round((1200 + 3600 * Math.min(1, bright * 1.5)) / 100) * 100;
  return { kit, bass: bassSound, chords: `.s("${chordWave}").lpf(${chordCut})${room}.gain(.3)`, lead: `.s("${leadWave}").lpf(${leadCut}).gain(.25)`, why: `bright ${bright.toFixed(2)} low ${low.toFixed(2)} sustain ${sustain.toFixed(2)}` };
}

// the drive to write for a measured bass profile (round 6, C2): the drive of the nearest candidate of BASS_PROFILES (the
// sawtooth and square basses at the app's drive amounts and the supersaw) by the fundamental's share and the even/odd
// ratio, each divided by its spread over the candidates; a share of SOUND_RULE.drive.sineShare or more is a sine or a
// triangle (no drive). → { drive, near } or null without a profile
// (round 6: the drive-1 candidates are left out: their fundamental share, 0.44 for the sawtooth, sits inside the spread
// of the clean sawtooth basses of the tuning songs, 0.38 to 0.58, and four of five drive-1 readings there were clean)
// (round 7, review 2: the driven squares are left out too: a driven square won only once, on a clean square; the
// drive-2 sawtooth fired only on clean basses, so it stays as a row that writes no drive (min below). The distance scale is two fixed numbers,
// the spreads of round 6's table, SOUND_RULE.drive.spread: computed from the list, removing a row moved every decision.
// The measured even/odd is clamped at SOUND_RULE.drive.eoFloor: a clean square alone reads near -38 dB, far below any
// row; a nearest row under SOUND_RULE.drive.min writes no drive)
// (round 6, C1: also the candidate's wave; a profile whose harmonics rise with their number is not a bass note at its
// decoded pitch, a wrong octave or another part, and gives nothing)
// (decode round 8: the table is measured without the pad, on a cutoff grid. A clean square there reads -31 to -40 dB
// even/odd, as the bench's square song does, and the sine and triangle a share of 0.97 to 1.0; but a clean sawtooth reads
// a share of 0.47 to 0.62, where the bench's sawtooth songs read 0.27 to 0.63 under their pads, so the clean rows of
// the table are no guide to a mix's sawtooth cutoff or its supersaw. The writer takes from it what holds in a mix: a
// square by its even/odd ratio, SOUND_RULE.drive.squareEo or under, and the drive of a sawtooth from the rows at the
// bass's written cutoff, SOUND_RULE.bassWave; the supersaw and the other cutoffs stay in the table, unused)
const PROFILE_KEYS = Object.keys(BASS_PROFILES).filter(k => BASS_PROFILES[k].wave === 'sawtooth' && BASS_PROFILES[k].cut === SOUND_RULE.bassWave && BASS_PROFILES[k].drive !== 1);
export function bassDriveOf(p) {
  if (!p || p.h1 === null || p.h1 === undefined) return null;
  if (!(p.slope < 0)) return null;
  if (p.h1 >= SOUND_RULE.drive.sineShare) return { drive: 0, near: 'sine', wave: 'sine' };
  const D = SOUND_RULE.drive;
  if (p.evenOdd <= D.squareEo || (p.eoLow <= D.squareLow && p.h1 >= D.squareH1)) return { drive: 0, near: 'square', wave: 'square' };
  const eo = Math.max(D.eoFloor, p.evenOdd);
  let best = null, bd = Infinity;
  for (const k of PROFILE_KEYS) { const c = BASS_PROFILES[k], d = ((p.h1 - c.h1) / D.spread[0]) ** 2 + ((eo - c.evenOdd) / D.spread[1]) ** 2; if (d < bd) { bd = d; best = k; } }
  const drive = BASS_PROFILES[best].drive;
  return { drive: drive >= D.min ? drive : 0, near: best, wave: 'sawtooth' };
}

// the drums' drive by measure (task 10.6): drives, the drum track's drives the level table measures; margin, how much
// nearer (in natural log of the share) the best driven kit must bring the high band's (2-16 kHz) prediction than the
// clean kit. (Round 8: the drive was read with the gains of the balance, a ratio of 2 and drive 2 only; the balance's
// gains move in 1.5 dB steps, and a small change elsewhere (the held step's weight 0.8 to 0.75) raised one file's drums
// by 3 dB, which filled its high band without a drive: the decision flipped. Now the gains are fitted on the four lower
// bands only, the drive read on the high band with those gains, and only then the whole balance runs with the drive's
// rows: no decision on the bench, the owner's files or the real set moves with the held step's weight from 0.5 to 1 or
// with the analysis of this round. Fourth pass: margin 0.3 to 0.5, which no driven bench song is near (0.73 and up) and
// three real tracks were (0.35 to 0.43, each with a worse band error driven); full, see the whole fit below)
export const DRUM_DRIVE = { drives: [1, 2, 3], margin: 0.5, full: 0.95 };
// the drum track's default gain (src/music.js DEFAULT.drums.gain), the level the part table measured the drums at
const DRUMS_GAIN = 0.9;
// the part levels (decode-refine D3): level B's drums, bass, chords and Lead gains scaled so the code's band shares come
// nearest the original's (`shares`, full.js: the five level bands of kit-measure.js LEVEL_BANDS, or the three share
// bands), the largest difference the smallest, in the five bands and in the three the similarity check reads. The
// code's energy per band is predicted from each sound alone (src/decode/part-levels.js, measured through the app): the
// drums per machine and row times the hits the patterns play, the bass and the Lead times the steps their loops sound,
// each with its gain and the share of the song's bars it plays; the drums' level is their track's gain. When even the
// best gains leave one of the three bands further than SOUND_RULE.shares (the spec's target) from the original, the
// prediction does not explain the original (a part the code does not write, a sound the table does not hold) and the
// gains stay as written. Among the gains that bring every band within SOUND_RULE.near (half the target), the smallest
// change wins: a part the written levels already balance keeps its level (the arp song's arpeggio, written as its
// bass, lost 9 dB and its mid-band rhythm for a share 0.016 nearer). Changes the tracks' code in place → { before,
// after, gains } (the predicted largest share difference in the three bands, the multipliers) or null
const levelKey = (id, code) => {
  const wave = (/\.s\("([a-z]+)"\)/.exec(code) || [])[1], cut = +((/\.lpf\((\d+)\)/.exec(code) || [])[1] || 0);
  const near = (list, v = cut) => list.reduce((a, b) => (Math.abs(Math.log(b / (v || b))) < Math.abs(Math.log(a / (v || a))) ? b : a));
  if (id === 'bass') { const top = /sine\.range\(/.test(code) && +((/range\(\d+,\s*(\d+)\)/.exec(code) || [])[1] || 1000), d = /\.distort\(/.test(code) ? ':drive' : ''; return top ? `bass:acid:${near([500, 1000, 2000], top)}${d}` : `bass:${wave}:${near([300, 600, 900, 1200])}${d}`; }
  if (id === 'chords') return `chords:${wave}:${near([800, 1600, 2400, 4000])}`;
  if (id === 'lead') return `lead:${wave}`;
  return null;
};
// the share of a loop's steps that sound a note, from its first mini-notation string (1 for chords, held all bar); a
// held step (`_`, round 8) counts as SOUND_RULE.holdShare of a step: a held note fades under its attack's level (0.8,
// measured through the app on a sine, a sawtooth and a square: 0.74 to 0.77 for notes held four steps, 0.85 to 0.86 for
// a note held a whole bar; at 1 the balance raised the drums on held-note songs)
export function stepShare(code) {
  const m = /\b(?:note|n)\("([^"]*)"\)/.exec(code);
  if (!m) return 1;
  let all = 0, on = 0;
  for (const tok of m[1].replace(/[<>[\]]/g, ' ').split(/\s+/).filter(Boolean)) { const r = /^(.*?)(?:!(\d+))?$/.exec(tok), n = r[2] ? +r[2] : 1; all += n; if (r[1] === HOLD) on += n * SOUND_RULE.holdShare; else if (r[1] !== '~') on += n; }
  return all ? on / all : 1;
}
// a three-band view of five level bands (the mid bands summed)
const fold = v => (v.length === 5 ? [v[0], v[1] + v[2] + v[3], v[4]] : v);
export function balanceLevels(tracks, shares, bars, { bassMissing = false } = {}) {
  if (!shares || !bars) return null;
  const nb = shares.length, parts = [];
  // a table entry in the bands of `shares`
  const inBands = v => (v && (nb === 3 ? fold(v) : v));
  const clipBars = (t, pid) => t.clips.filter(c => pid === undefined || c.pattern === pid).reduce((a, c) => a + (c.bars || 1), 0);
  for (const t of tracks) {
    if (t.hush) continue;
    const on = clipBars(t) / bars, T = Array(nb).fill(0);
    if (t.type === 'drums') {
      // (the drums: per row and hit in a bar, measured at the drum track's default gain, DRUMS_GAIN; their level is the
      // track's `gain` setting)
      const kit = PART_LEVELS[`drums:${t.settings.kit}:bd`] ? t.settings.kit : 'RolandTR909', g = t.settings.gain ?? DRUMS_GAIN;
      for (const [pid, p] of Object.entries(t.patterns)) {
        const w = clipBars(t, pid) / bars;
        for (const [row, steps] of Object.entries(p.rows || {})) { const v = inBands(PART_LEVELS[`drums:${kit}:${row}`]), hitsN = (String(steps).match(/x/g) || []).length; if (v) v.forEach((x, j) => { T[j] += (x * hitsN * w) / DRUMS_GAIN ** 2; }); }
      }
      // (task 10.6: the same drums driven by the track's drive, per drive of DRUM_DRIVE.drives, when the table holds them)
      const Td = {};
      for (const d of DRUM_DRIVE.drives) {
        const X = Array(nb).fill(0); let ok = true;
        for (const [pid, p] of Object.entries(t.patterns)) {
          const w = clipBars(t, pid) / bars;
          for (const [row, steps] of Object.entries(p.rows || {})) { const v = inBands(PART_LEVELS[`drums:${kit}:${row}:d${d}`]), hitsN = (String(steps).match(/x/g) || []).length; if (!v) { ok = false; continue; } v.forEach((x, j) => { X[j] += (x * hitsN * w) / DRUMS_GAIN ** 2; }); }
        }
        if (ok) Td[d] = X;
      }
      parts.push({ t, T, g, on: 1, drums: true, Td });
      continue;
    }
    const pats = Object.entries(t.patterns).filter(([, p]) => p.code);
    if (!pats.length) continue;
    const key = levelKey(t.id, pats[0][1].code), base = inBands(PART_LEVELS[key]);
    // (a driven bass: its level is the clip's volume, `distortvol`; the gain before the clip barely moves it, and the
    // table measured it at the gain the writer writes)
    const vol = /\.distortvol\(([\d.]+)\)/.exec(pats[0][1].code), g = vol ? +vol[1] : +((/\.gain\(([\d.]+)\)(?!.*\.gain\()/.exec(pats[0][1].code) || [])[1] || 0);
    if (!base || !(g > 0)) continue;
    for (const [pid, p] of pats) { const w = clipBars(t, pid) / bars, d = stepShare(p.code); base.forEach((x, j) => { T[j] += x * d * w; }); }
    parts.push({ t, T, g, on, vol: !!vol });
  }
  const free = parts;
  if (!free.length) return null;
  const sh3 = fold(shares);
  // the largest share difference, in the bands of `shares` and in the three bands → [both, three]
  const worst = ks => {
    const e = Array(nb).fill(0); parts.forEach((p, i) => { for (let j = 0; j < nb; j++) e[j] += p.T[j] * (p.g * ks[i]) ** 2; });
    const s = e.reduce((a, b) => a + b, 0); if (!s) return [1, 1];
    const d = e.map((v, j) => Math.abs(v / s - shares[j])), e3 = fold(e), d3 = e3.map((v, j) => Math.abs(v / s - sh3[j]));
    return [Math.max(...d, ...d3), Math.max(...d3)];
  };
  const steps = SOUND_RULE.levels.map(k => k), allowed = p => steps.filter(k => p.g * k <= SOUND_RULE.maxGain + 1e-9 && !(bassMissing && p.drums && k > 1));
  let best = free.map(() => 1), [bv, b3] = worst(best);
  const before = b3;
  const walk = (i, ks) => {
    if (i === free.length) {
      const [v, v3] = worst(ks), dist = ks.reduce((a, k) => a + Math.abs(Math.log2(k)), 0), bd = best.reduce((a, k) => a + Math.abs(Math.log2(k)), 0), ok = v <= SOUND_RULE.near + 1e-9, bok = bv <= SOUND_RULE.near + 1e-9;
      // within SOUND_RULE.near: the smallest change wins; else the nearest shares
      const better = ok && bok ? dist < bd - 1e-9 || (Math.abs(dist - bd) <= 1e-9 && v < bv - 1e-6) : ok !== bok ? ok : v < bv - 1e-6 || (Math.abs(v - bv) <= 1e-6 && dist < bd);
      if (better) { bv = v; b3 = v3; best = ks.slice(); }
      return;
    }
    for (const k of allowed(free[i])) { ks[i] = k; walk(i + 1, ks); }
  };
  walk(0, free.map(() => 1));
  // (task 10.6, round 8: the drums' drive. The gains fitted on the four lower bands only (the kick, the bass, the
  // chords), the original's high band against the prediction with those gains, clean and with each drive's rows; the
  // nearest drive, if nearer than the clean kit by DRUM_DRIVE.margin, then the whole balance with its rows)
  let drive = 0;
  const dr = nb === 5 ? parts.find(p => p.drums && Object.keys(p.Td || {}).length) : null;
  if (dr) {
    const H = nb - 1, T0 = dr.T, mix = ks => { const e = Array(nb).fill(0); parts.forEach((p, i) => { for (let j = 0; j < nb; j++) e[j] += p.T[j] * (p.g * ks[i]) ** 2; }); return e; };
    const ts = shares.slice(0, H).reduce((x, y) => x + y, 0) || 1;
    const lowFit = ks => { const e = mix(ks), t = e.slice(0, H).reduce((x, y) => x + y, 0) || 1; return Math.max(...e.slice(0, H).map((v, j) => Math.abs(v / t - shares[j] / ts))); };
    const hiErr = ks => { const e = mix(ks), t = e.reduce((x, y) => x + y, 0) || 1; return Math.abs(Math.log(shares[H] / (e[H] / t || 1e-9))); };
    let lb = free.map(() => 1), lv = lowFit(lb);
    const lw = (i, ks) => { if (i === free.length) { const v = lowFit(ks); if (v < lv - 1e-6) { lv = v; lb = ks.slice(); } return; } for (const k of allowed(free[i])) { ks[i] = k; lw(i + 1, ks); } };
    lw(0, free.map(() => 1));
    const e0 = hiErr(lb); let be = e0;
    const errs = {};
    for (const [d, X] of Object.entries(dr.Td)) { dr.T = X; const e = hiErr(lb); errs[d] = e; if (e < be - 1e-9) { be = e; drive = +d; } }
    // (bench only: notes/r8-work's scripts read the decision's numbers through DRUM_DRIVE.trace; the app never sets it)
    if (DRUM_DRIVE.trace) DRUM_DRIVE.trace({ e0, errs, lv, lb, shares, mix, parts, dr, free, allowed, T0 });
    dr.T = T0;
    // (round 8, fourth pass: the drive must also explain the whole spectrum. The gains fitted on all five bands, the
    // largest band error in log share, with the clean rows and with the drive's rows: the drive is kept only when its
    // fit is at most DRUM_DRIVE.full of the clean one. A high band the code underfills for another reason, hats under
    // the clap or the kick that the grid misses, or a bright bass, is filled by a drive only at the cost of the mid
    // bands, so the whole fit does not improve: 5 of 7 clean kits the high band alone drove)
    const fullFit = () => { let v0 = Infinity; const w = (i, ks) => { if (i === free.length) { const e = mix(ks), t = e.reduce((x, y) => x + y, 0) || 1, v = Math.max(...e.map((x, j) => Math.abs(Math.log((x / t || 1e-9) / (shares[j] || 1e-9))))); if (v < v0) v0 = v; return; } for (const k of allowed(free[i])) { ks[i] = k; w(i + 1, ks); } }; w(0, free.map(() => 1)); return v0; };
    if (drive && be <= e0 - DRUM_DRIVE.margin && DRUM_DRIVE.full) { const f0 = fullFit(); dr.T = dr.Td[drive]; const fd = fullFit(); dr.T = T0; if (fd > DRUM_DRIVE.full * f0) drive = 0; }
    if (drive && be <= e0 - DRUM_DRIVE.margin) { dr.T = dr.Td[drive]; best = free.map(() => 1); [bv, b3] = worst(best); walk(0, free.map(() => 1)); } else drive = 0;
  }
  // (round 8: when no gains bring every band within SOUND_RULE.shares, the nearest gains are still taken when they bring
  // the largest share difference down by SOUND_RULE.fallback or more; before, the levels stayed as written)
  if (b3 > SOUND_RULE.shares && !(SOUND_RULE.fallback > 0 && b3 <= before - SOUND_RULE.fallback)) return { before: Math.round(before * 1000) / 1000, after: Math.round(b3 * 1000) / 1000, gains: null };
  if (drive) dr.t.settings.drive = drive;
  free.forEach((p, i) => { const k = best[i]; if (k === 1) return; if (p.drums) { p.t.settings.gain = Math.round(p.g * k * 100) / 100; return; } for (const pat of Object.values(p.t.patterns)) if (pat.code) pat.code = p.vol ? pat.code.replace(/\.distortvol\(([\d.]+)\)/, (_, x) => `.distortvol(${Math.round(+x * k * 100) / 100})`) : pat.code.replace(/\.gain\(([\d.]+)\)(?!.*\.gain\()/, (_, x) => `.gain(${Math.round(+x * k * 100) / 100})`); });
  return { before: Math.round(before * 1000) / 1000, after: Math.round(b3 * 1000) / 1000, gains: Object.fromEntries(free.map((p, i) => [p.t.id, Math.round(best[i] * 100) / 100])) };
}

// the chords under a Lead (decode-refine D3, fourth round): a Lead heard over at least SOUND_RULE.leadOver of the
// chords' bars plays in the pad's band, and the pad's held body covers the Lead's and the drums' onsets in the mid band;
// the chords then lose their body under SOUND_RULE.cut[0] and keep their top up to cut[1]. Applied after the balance,
// which sets the pad's level from its whole sound (the table's prediction of the cut pad moved the bass and the Lead
// for nothing). A Lead muted by default (a sung melody) does not count. Changes the chords' code in place → whether it cut
export function cutUnderLead(tracks, gains = null) {
  const lead = tracks.find(t => t.id === 'lead' && !t.hush), ch = tracks.find(t => t.id === 'chords');
  if (!lead || !ch || !tracks.some(t => t.type === 'drums')) return false;
  if (gains && gains.lead !== undefined && 20 * Math.log10(gains.lead) < -SOUND_RULE.leadKeep) return false;
  const bars = t => t.clips.flatMap(c => range(c.start, c.start + (c.bars || 1))), on = new Set(bars(lead)), chBars = bars(ch);
  if (!chBars.length || chBars.filter(b => on.has(b)).length < SOUND_RULE.leadOver * chBars.length) return false;
  for (const p of Object.values(ch.patterns)) if (p.code) p.code = p.code.replace(/\.lpf\(\d+\)/, `.hpf(${SOUND_RULE.cut[0]}).lpf(${SOUND_RULE.cut[1]})`);
  return true;
}

// the song of a decoded track. opts: { id, title, artist, attribution, sounds, upTo (bars written, default all) }
// The whole song: one section in level A; drums patterns per stable grid, bass and chord loops per run of bars.
export function writeSong(model, opts = {}) {
  const P = partsByBar(model), n = Math.min(opts.upTo ?? model.bars.length, model.bars.length), snd = soundsOf(model.bars.slice(0, n), opts.sounds);
  const tracks = [];
  // drums: one pattern per grid, one clip per run of bars with the same grid
  {
    const patterns = {}, clips = [], ids = new Map();
    for (let b = 0; b < n; b++) {
      const g = P.drums[b];
      if (!g) continue;
      const k = gridKey(g);
      if (!ids.has(k)) { const id = String.fromCharCode(65 + ids.size % 26) + (ids.size >= 26 ? Math.floor(ids.size / 26) : ''); ids.set(k, id); patterns[id] = { rows: Object.fromEntries(DRUM_ROWS.filter(r => hits(g[r])).map(r => [r, g[r]])) }; }
      const id = ids.get(k), last = clips[clips.length - 1];
      if (last && last.pattern === id && last.start + last.bars === b) last.bars++; else clips.push({ start: b, bars: 1, pattern: id });
    }
    if (clips.length) tracks.push({ id: 'drums', name: 'Drums', type: 'drums', settings: { kit: snd.kit }, patterns, clips });
  }
  // bass and chords: code tracks, a loop per bar; runs of bars with the same loop share a clip
  const codeTrack = (id, name, visual, list, code) => {
    const patterns = {}, clips = [], ids = new Map();
    for (let b = 0; b < n; b++) {
      if (list[b] === null) continue;
      const c = code(loopAt(list, b, loopOpts(id)));
      if (!ids.has(c)) { const pid = String.fromCharCode(65 + ids.size % 26) + (ids.size >= 26 ? Math.floor(ids.size / 26) : ''); ids.set(c, pid); patterns[pid] = { code: c }; }
      const pid = ids.get(c), last = clips[clips.length - 1];
      if (last && last.pattern === pid && last.start + last.bars === b) last.bars++; else clips.push({ start: b, bars: 1, pattern: pid });
    }
    if (clips.length) tracks.push({ id, name, type: 'code', settings: { visual }, patterns, clips });
  };
  codeTrack('bass', 'Bass', 'bass', P.bass, loop => bassCode(loop, snd.bass));
  codeTrack('chords', 'Chords', 'pad', P.chords, loop => chordCode(loop, snd.chords));
  return songShell(model, opts, Math.max(1, n), tracks);
}

function songShell(model, opts, bars, tracks) {
  const title = String(opts.title || 'Decoded track').slice(0, 120);
  return {
    format: 'coding-misk/song', version: 2, id: opts.id || 'decoded', title,
    cover: { title, ...(opts.artist ? { artist: String(opts.artist).slice(0, 120) } : {}), attribution: opts.attribution !== false },
    config: { profile: 'switch', live: true, options: { narrator: false } },
    sections: [{ name: 'Track', bars, bpm: Math.round((model.bpm || 120) * 100) / 100, key: formatKey(model.key) }],
    tracks,
  };
}

// ---------- the edit rule (decode-refine D7) ----------
// a loop's values spread over 8 bars (every loop length divides 8), to compare loops of different lengths
const over8 = loop => Array.from({ length: 8 }, (_, k) => loop[k % loop.length]);
const rootOf = notes => { const cnt = new Array(12).fill(0); for (const x of notes || []) if (x !== null && x !== undefined) cnt[((x % 12) + 12) % 12]++; const mx = Math.max(...cnt); return mx ? cnt.indexOf(mx) : -1; };
const rowsOn = g => DRUM_ROWS.map(r => hits(g[r]) > 0).join();
// whether a new value of a part differs enough from the one its line shows to edit the line: drums by steps or a row
// that enters or leaves, bass by the share of note steps (and a few steps at least) or another root on the loop's first
// bar, chords by a share of the loop's bars with a chord that is not close (its other quality or its relative)
export function differsEnough(id, cur, cand, rule = EDIT_RULE) {
  if (id === 'drums') return diffSteps(cur, cand) >= rule.drumSteps || rowsOn(cur) !== rowsOn(cand);
  const A = over8(cur), B = over8(cand);
  if (id === 'bass') {
    if (rootOf(cur[0]) !== rootOf(cand[0])) return true;
    let n = 0, d = 0;
    for (let k = 0; k < 8; k++) for (let j = 0; j < STEPS; j++) { const a = A[k][j] ?? null, b = B[k][j] ?? null; if (a === null && b === null) continue; n++; if (a !== b) d++; }
    // (over the 8 bars: a one-bar loop counts each of its steps 8 times)
    return n > 0 && d / n >= rule.bassShare && d >= rule.bassSteps * 8;
  }
  // (the analysis swaps a chord with its other quality, A for Am, and with its relative, Em for G: they count as close)
  const pa = A.map(parseChord), pb = B.map(parseChord);
  const rel = (x, y) => x.quality === 'min' && y.quality === 'maj' && (x.root + 3) % 12 === y.root;
  const close = (x, y) => !!(x && y) && (x.root === y.root || rel(x, y) || rel(y, x));
  return pa.filter((x, k) => !close(x, pb[k])).length >= rule.chordShare * 8;
}
const sameRoot = (a, b) => { const x = parseChord(a), y = parseChord(b); return !!(x && y) && x.root === y.root; };
const PARTS_A = ['drums', 'bass', 'chords'];
const planMemo = new WeakMap();
// level A's plan (D9 with decode-refine D7): for every bar the value each part's line shows and whether the part is
// heard, from bar 0 on, so the code of a bar depends only on the bars up to it. A part that enters or stops edits its
// line at once; a part that enters is level A's section change: the sounds are measured again on the bars heard so far
// (every line shows them) and loops may grow again. Otherwise a line changes when its new value differs enough
// (differsEnough), held for two bars (the bar before gave a value close to it), or when any new value held `lineBars`
// bars, and in both cases `lineBars` passed since its last edit and `anyBars` since any edit. A loop of 2 bars or more never grows again until the next section change.
// → [{ heard: { drums, bass, chords }, value: { drums, bass, chords }, sounds, section }]
export function planA(model, preset = 'ours', rule = EDIT_RULE) {
  let memo = planMemo.get(model);
  if (!memo) planMemo.set(model, (memo = new Map()));
  const key = `${preset}|${JSON.stringify(rule)}`;
  if (memo.has(key)) return memo.get(key);
  const P = partsByBar(model), bars = model.bars || [], out = [];
  const cur = { drums: null, bass: null, chords: null }, last = { drums: -99, bass: -99, chords: -99 }, maxL = { bass: 8, chords: 8 }, prev = {}, streak = {};
  let lastAny = -99, snd = null, section = 0;
  const candidate = (id, b) => (id === 'drums' ? P.drums[b] : id === 'bass' ? loopAt(P.bass, b, { same: sameBass, maxL: maxL.bass }) : loopAt(P.chords, b, { grow: true, same: sameRoot, maxL: maxL.chords }));
  // heard in a bar: a part enters when it is heard in this bar and in the next, and stops when it is heard in neither
  // (with the look ahead the next bar is known; the last bar the model knows decides alone)
  const on = (id, b) => b >= 0 && b < bars.length && P[id][b] !== null && P[id][b] !== undefined;
  const next = (id, b) => (b + 1 >= bars.length ? on(id, b) : on(id, b + 1));
  for (let b = 0; b < bars.length; b++) {
    const was = b ? out[b - 1].heard : { drums: false, bass: false, chords: false };
    const heard = Object.fromEntries(PARTS_A.map(id => [id, was[id] ? on(id, b) || next(id, b) : on(id, b) && next(id, b)]));
    const change = PARTS_A.some(id => heard[id] && !was[id]);
    if (change) { if (b) section++; maxL.bass = 8; maxL.chords = 8; }
    if (!snd || change) snd = soundsOf(bars.slice(0, b + 1), preset);
    for (const id of PARTS_A) {
      if (heard[id] !== was[id]) { last[id] = b; lastAny = b; }
      if (!heard[id] || !on(id, b)) continue;
      const cand = candidate(id, b), held = prev[id] && !differsEnough(id, prev[id], cand, rule);
      streak[id] = prev[id] && JSON.stringify(prev[id]) === JSON.stringify(cand) ? (streak[id] || 1) + 1 : 1;
      prev[id] = cand;
      if (JSON.stringify(cand) === JSON.stringify(cur[id])) continue;
      if (cur[id] === null || !was[id]) { cur[id] = cand; continue; }
      // (a smaller difference is written once the same new value held `lineBars` bars: the first bar of a part, heard
      // alone, may miss a kick, and the line would keep the miss)
      if ((held && differsEnough(id, cur[id], cand, rule) || streak[id] >= rule.lineBars) && b - last[id] >= rule.lineBars && b - lastAny >= rule.anyBars) { cur[id] = cand; last[id] = b; lastAny = b; }
    }
    for (const id of ['bass', 'chords']) if (cur[id] && cur[id].length > 1) maxL[id] = Math.min(maxL[id], cur[id].length);
    out.push({ heard, value: { ...cur }, sounds: snd, section });
  }
  memo.set(key, out);
  return out;
}

// level A (D9, D13): the song of the moment at a bar, what the code shows and plays from that bar on. One section as
// long as the longest loop; each part with the line its plan shows at the bar (planA); a part heard before and silent
// now stays, muted (`_$:`); a part never heard is not written.
export function momentSong(model, bar, opts = {}) {
  const last = Math.min(bar, (model.bars || []).length - 1), tracks = [];
  if (last < 0) return songShell(model, opts, 1, tracks);
  const p = planA(model, opts.sounds)[last], snd = p.sounds;
  let L = 1;
  if (p.value.drums) {
    const g = p.value.drums;
    tracks.push({ id: 'drums', name: 'Drums', type: 'drums', settings: { kit: snd.kit }, patterns: { A: { rows: Object.fromEntries(DRUM_ROWS.filter(r => hits(g[r])).map(r => [r, g[r]])) } }, clips: [{ section: 0, pattern: 'A' }], ...(p.heard.drums ? {} : { hush: true }) });
  }
  const code = (id, name, visual, make) => {
    const loop = p.value[id];
    if (!loop) return;
    L = Math.max(L, loop.length);
    tracks.push({ id, name, type: 'code', settings: { visual }, patterns: { A: { code: make(loop) } }, clips: [{ section: 0, pattern: 'A' }], ...(p.heard[id] ? {} : { hush: true }) });
  };
  code('bass', 'Bass', 'bass', loop => bassCode(loop, snd.bass));
  code('chords', 'Chords', 'pad', loop => chordCode(loop, snd.chords));
  return songShell(model, opts, L, tracks);
}

// ---------- the top line's group (decode-refine D6) ----------
// a bar's top line (misk-analyzer's `top`): `up` is the share of the bar's tonal energy between 400 and 2000 Hz. The
// rule: a section (level B) or the last 4 bars (level A, off again below `off`) with a mean share of at least `up` has
// a top line. The detector does not tell a voice from a synth: a track whose median share is at least `vocal` (a voice
// over the whole track) gets `vox` lines, any other `melody` lines (measured on the owner's test files; part 2 of the
// change brings a real top line)
export const TOP_RULE = { up: 0.22, off: 0.18, vocal: 0.35 };
// the app helpers of the group: they evaluate to silence (src/song/writer.js)
export const TOP_HELPERS = ['vox', 'melody'];
const LABELS = {
  vox: ['reading from track', 'modulizing from track', 'vocalizing', 'passing through song', 'tracing the voice', 'lifting the vocal', 'following the singer', 'catching the words', 'holding the verse', 'echoing the chorus', 'listening for lyrics', 'shadowing the singer', 'breathing with the line', 'sketching the voice', 'keeping the refrain', 'humming along', 'mapping the vowels', 'riding the vocal', 'carrying the words', 'voice from track'],
  melody: ['tracing the hook', 'reading the lead', 'following the top line', 'sketching the riff', 'humming the theme', 'catching the arp', 'riding the motif', 'mapping the notes', 'lifting the hook', 'holding the line', 'echoing the lead', 'top line from track', 'shadowing the synth', 'carrying the tune', 'passing the motif', 'outlining the melody', 'keeping the phrase', 'drawing the contour', 'reading the riff', 'listening for the hook'],
};
// the method after a line: catalog functions that do nothing to silence
const METHODS = ['.gain(0.8)', '.room(0.3)', '.slow(2)', '.late(0.125)', '.pan(0.4)', '.gain(0.6)', '.room(0.5)'];
const hashOf = str => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const upOf = b => (b && b.top ? b.top.up || 0 : 0);
const median = list => { const x = list.slice().sort((a, b) => a - b); return x.length ? x[Math.floor(x.length / 2)] : 0; };
const topMemo = new WeakMap();
// a bar's top line voicing (decode-refine D2): the share of its steps with a top line note, where part 1's measure hears a
// top line at all (`up` at least TOP_RULE.off): the predominant melody also follows a pad or a bass when nothing is on top
export const voicedOf = b => (b && b.lead && upOf(b) >= TOP_RULE.off ? b.leadVoiced || 0 : 0);
// per bar { on, seg, kind } (seg: the section, or level A's run of the same state), or null before the first top line;
// level 'A' or 'B'
export function topPlan(model, level = 'A', rule = TOP_RULE) {
  let memo = topMemo.get(model);
  if (!memo) topMemo.set(model, (memo = new Map()));
  const key = `${level}|${JSON.stringify(rule)}`;
  if (memo.has(key)) return memo.get(key);
  const bars = model.bars || [], out = [];
  if (level === 'B') {
    const end = Math.min(bars.length, model.ending ?? bars.length), secs = model.sections && model.sections.length ? model.sections : [{ start: 0, bars: end }];
    const music = bars.slice(0, end).filter(b => drumsHeard(b) || bassHeard(b) || chordsHeard(b) || upOf(b) > 0);
    const kind = median(music.map(upOf)) >= rule.vocal ? 'vox' : 'melody';
    // (decode-refine D2: where the bars carry the top line's voicing, a section has a top line when it is voiced on at least
    // LEAD_RULE.voiced of its steps, as the Lead; else part 1's measure `up`)
    const voicing = bars.some(b => b && b.lead);
    const onBy = secs.map(s => { const list = bars.slice(s.start, Math.min(end, s.start + s.bars)); return list.length > 0 && (voicing ? list.reduce((a, b) => a + voicedOf(b), 0) / list.length >= LEAD_RULE.voiced : list.reduce((a, b) => a + upOf(b), 0) / list.length >= rule.up); });
    const any = onBy.some(Boolean);
    for (let b = 0; b < bars.length; b++) { const k = secs.findIndex(s => b >= s.start && b < s.start + s.bars); out.push(any && k >= 0 ? { on: onBy[k], seg: k, kind } : null); }
  } else {
    let on = false, seg = -1, kind = null;
    for (let b = 0; b < bars.length; b++) {
      const w = bars.slice(Math.max(0, b - 3), b + 1), mean = w.reduce((a, x) => a + upOf(x), 0) / w.length;
      const now = on ? mean >= rule.off : mean >= rule.up && w.length >= 2;
      const turn = now !== on || (now && seg < 0);
      if (turn) { seg++; on = now; }
      // the kind from the bars heard so far, set again only when the state turns (the lines change at most then)
      if (on && (turn || !kind)) kind = median(bars.slice(0, b + 1).filter(x => upOf(x) > 0).map(upOf)) >= rule.vocal ? 'vox' : 'melody';
      out.push(kind ? { on, seg, kind } : null);
    }
  }
  memo.set(key, out);
  return out;
}
// the group of top lines at a bar: a header and one to three lines, `$:` where a top line is heard, `_$:` elsewhere;
// labels and methods drawn from the seed (the file's fingerprint) and the kind, so a track always shows the same lines;
// a section only turns them on or off (a label that changed with the section was typed as a new line by the player's
// typing, the old one deleted bars before the new one came). '' without a top line. opts: { seed, level }
export function voxGroup(model, bar, { seed = '', level = 'A' } = {}) {
  const plan = topPlan(model, level), p = plan[Math.max(0, Math.min(bar, plan.length - 1))];
  if (!p) return '';
  const n = 1 + (hashOf(`${seed}|lines`) % 3), list = LABELS[p.kind], lines = [];
  for (let k = 0; k < n; k++) {
    const h = hashOf(`${seed}|${p.kind}|${k}`), m = METHODS[(h >>> 8) % METHODS.length];
    let i = h % list.length; while (lines.some(l => l.includes(`"${list[i]}"`))) i = (i + 1) % list.length;
    const label = list[i];
    lines.push(`${p.on ? '$' : '_$'}: ${p.kind}("${label}")${m}`);
  }
  return [`// ========== ${p.kind} ==========`, ...lines].join('\n');
}
// the group after the parts (shown, never sent to the player: run and the mixer see the code without it)
export const withVox = (code, group = '') => (group ? `${code.replace(/\s+$/, '')}\n\n${group}` : code);
export const withoutVox = code => code.replace(/\n*\/\/ =+ (vox|melody) =+\n[\s\S]*$/, '').replace(/\n*\/\/ vox: …\s*$/, '');
// the group of a code shown, or ''
export const voxOf = code => { const m = /\/\/ =+ (vox|melody) =+\n[\s\S]*$/.exec(code || ''); return m ? m[0] : ''; };
// the helpers for code copied out of the app (Copy): the group's functions as silence
export const VOX_PRELUDE = 'const vox = () => silence, melody = () => silence\n';


// a chord name of the model in the app's spelling (for the tempo and key readout): "Am" stays "Am"
export const chordLabel = name => { const c = parseChord(name); return c ? `${NOTE_NAMES[c.root]}${c.quality === 'min' ? 'm' : ''}` : ''; };

// ---------- level B (D9, D10): sections, a loop per part and section, variations ----------
const range = (a, z) => Array.from({ length: Math.max(0, z - a) }, (_, i) => a + i);
const SECTION_NAMES = { intro: 'Intro', verse: 'Verse', build: 'Build', drop: 'Drop', break: 'Break', outro: 'Outro' };
// a part heard per bar inside a section (decode-refine D7: a part enters or stops when it holds for `runBars`): first
// every gap shorter than `min` bars between bars heard is filled (a missed note: an alternating x.x.x reads as heard
// throughout), then every island of bars heard shorter than `min` is left out (a fill, a stray hit). A gap at the
// section's start or end is a part that enters late or stops early, and stays. (The writer used to fill one-bar gaps and
// drop one-bar islands at once, from the bars as heard: x.x.x turned into .x.x.)
export function steady(list, min = EDIT_RULE.runBars) {
  const out = list.map(Boolean), runsOf = () => { const runs = []; out.forEach((v, i) => { const r = runs[runs.length - 1]; if (r && r.v === v) r.n++; else runs.push({ v, at: i, n: 1 }); }); return runs; };
  for (const r of runsOf()) if (!r.v && r.n < min && r.at > 0 && r.at + r.n < out.length) for (let i = r.at; i < r.at + r.n; i++) out[i] = true;
  for (const r of runsOf()) if (r.v && r.n < min && out.length >= min) for (let i = r.at; i < r.at + r.n; i++) out[i] = false;
  return out;
}

// level B's drum grids (decode-refine D4): a step of the main grid is on in at least `main` of a section's bars with
// drums; a variant is a whole grid heard in at least `variant` of them (and twice)
export const GRID_RULE = { main: 0.6, variant: 0.1 };
const gridOf = b => Object.fromEntries(DRUM_ROWS.map(r => [r, (b.drums && b.drums[r]) || EMPTY]));
// the loop of a part over the bars of a section (values by absolute bar, null where not heard): the smallest period of
// 1, 2, 4 or 8 bars whose positions (bar mod L, as Strudel's `<…>` reads them) hold one value on 80 % of the bars;
// each position's value is its most common one (bass: the bar most like the others). → [values] of length L
export function sectionLoop(byBar, bars, { same = (a, b) => JSON.stringify(a) === JSON.stringify(b), lengths = [1, 2, 4, 8] } = {}) {
  const heard = bars.filter(b => byBar[b] !== null && byBar[b] !== undefined);
  if (!heard.length) return null;
  const pickOf = list => { let best = list[0], top = -1; for (const x of list) { const n = list.filter(y => same(x, y)).length; if (n > top) { top = n; best = x; } } return best; };
  let fallback = null;
  for (const L of lengths) {
    const loop = range(0, L).map(k => { const list = heard.filter(b => ((b % L) + L) % L === k).map(b => byBar[b]); return list.length ? pickOf(list) : null; });
    if (loop.some(x => x === null)) continue;
    const ok = heard.filter(b => same(byBar[b], loop[((b % L) + L) % L])).length / heard.length;
    if (ok >= 0.8 && (L === 1 || heard.length >= 2 * L || L === lengths[lengths.length - 1])) return loop;
    if (!fallback || ok > fallback.ok) fallback = { loop, ok };
  }
  return fallback ? fallback.loop : [byBar[heard[0]]];
}
// per section, the drum patterns: the main grid (the most common; a grid within two steps of it counts as it) and the
// variants, grids that come back at least twice; a one-off fill plays the main grid. → [{ main, variants, perBar }]
function drumPlan(model) {
  const bars = model.bars, end = model.ending ?? bars.length;
  const grid = k => Object.fromEntries(DRUM_ROWS.map((r, j) => [r, k.split('|')[j]]));
  return (model.sections || []).map(sec => {
    const idx = range(sec.start, Math.min(sec.start + sec.bars, end)), on = steady(idx.map(i => drumsHeard(bars[i])));
    const keys = idx.map((i, j) => (on[j] && drumsHeard(bars[i]) ? gridKey(gridOf(bars[i])) : on[j] ? 'gap' : null));
    const count = new Map(); for (const k of keys) if (k && k !== 'gap') count.set(k, (count.get(k) || 0) + 1);
    const heard = keys.filter(k => k && k !== 'gap');
    if (!heard.length) return { main: null, variants: [], perBar: idx.map(() => null), grid };
    // the main grid (decode-refine D4): per step, on when it is on in at least GRID_RULE.main of the bars with drums, so
    // noise on a few steps does not split the section into many grids
    const majority = list => gridKey(Object.fromEntries(DRUM_ROWS.map((r, j) => [r, Array.from({ length: STEPS }, (_, s) => (list.filter(k => k.split('|')[j][s] === 'x').length >= GRID_RULE.main * list.length ? 'x' : '.')).join('')])));
    let main = majority(heard);
    // (a two-bar groove: the per-step majority keeps only the hits both bars share, a grid never heard. Then each bar
    // position, even and odd, has its own majority: when both were heard and differ, the odd one is a variant on the
    // odd bars; else the main grid is the most common grid heard)
    if (!count.has(main)) {
      const half = p => keys.map((k, j) => (j % 2 === p && k && k !== 'gap' ? k : null)).filter(Boolean), m0 = majority(half(0)), m1 = half(1).length ? majority(half(1)) : null;
      if (m1 && m0 !== m1 && count.has(m0) && count.has(m1)) return { main: m0, variants: [m1], pair: true, perBar: keys.map((k, j) => (k === null ? null : j % 2 ? m1 : m0)), grid };
      main = [...count].sort((a, b) => b[1] - a[1])[0][0];
    }
    // (a grid within three steps of the main one, or one that only misses some of its hits, is the main one heard less
    // well: a kick under a loud bass, a hat under a crash)
    const near = k => { const g = grid(k), M0 = grid(main); return diffSteps(g, M0) <= 3 || DRUM_ROWS.every(r => [...g[r]].every((c, j) => c !== 'x' || M0[r][j] === 'x')); };
    // a variant comes back: at least twice and in GRID_RULE.variant of the section's bars with drums
    const variants = [...count].filter(([k, n]) => k !== main && n >= Math.max(2, Math.ceil(GRID_RULE.variant * heard.length)) && !near(k)).map(([k]) => k);
    const perBar = keys.map(k => (k === null ? null : variants.includes(k) ? k : main));
    return { main, variants, perBar, grid };
  });
}
// the variations of a level B model (analysis spec: Level B adds structure): per section and part, the bars that play
// a variant of the section's main pattern
export function variationsOf(model) {
  const out = [];
  drumPlan(model).forEach((p, k) => {
    if (!p.variants.length || p.pair) return;
    const sec = model.sections[k];
    out.push({ section: k, part: 'drums', bars: p.perBar.map((x, j) => (x && x !== p.main ? sec.start + j : null)).filter(x => x !== null) });
  });
  return out;
}

// the chords of a key: its diatonic triads (and the major dominant of a minor key); a section whose chords fall mostly
// outside the key is noise of the drums in the chord band (a drums-only outro reads as Bb, Gm, F#…), not a part
const KEY_CHORDS = { minor: [[0, 'min'], [3, 'maj'], [5, 'min'], [7, 'min'], [7, 'maj'], [8, 'maj'], [10, 'maj']], major: [[0, 'maj'], [2, 'min'], [4, 'min'], [5, 'maj'], [7, 'maj'], [9, 'min']] };
// (round 8, third pass: a section whose chords fail the key test on their qualities but whose roots lie in the key's
// scale or a semitone over its tonic (the flat second of a phrygian riff, F over E) on at least POWER_RULE.roots of its
// bars, on the tonic or that flat second on at least POWER_RULE.tonic of them and on the tonic itself on at least
// POWER_RULE.home (a drums-only outro's noise reads roots all over the key; a passage in another key has no tonic), and with a second root on at least POWER_RULE.second of them (a riff moves; an acid bass
// alone reads as its tonic's major chord, the same fifth harmonic, on every bar), is kept as power chords, a root and a
// fifth: a distorted power chord reads major, its fifth harmonic a major third)
export const POWER_RULE = { roots: 0.8, tonic: 0.5, home: 0.15, second: 0.15, bright: 0.07, anchor: 'f3' };
const SCALE_PCS = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
export const inKey = key => list => {
  if (!key || !list.length) return true;
  const mode = key.mode === 'major' ? 'major' : 'minor', set = new Set(KEY_CHORDS[mode].map(([d, q]) => `${(key.root + d) % 12}${q}`));
  const ok = list.filter(c => { const p = parseChord(c); return p && set.has(`${p.root}${p.quality}`); }).length;
  if (ok / list.length >= 0.6) return true;
  const roots = new Set([...SCALE_PCS[mode], 1].map(d => (key.root + d) % 12));
  const share = set => list.filter(c => { const p = parseChord(c); return p && set.has(p.root); }).length / list.length;
  const counts = Array(12).fill(0); for (const c of list) { const p = parseChord(c); if (p) counts[p.root]++; }
  const second = counts.slice().sort((a, b) => b - a)[1] / list.length;
  return POWER_RULE.roots > 0 && share(roots) >= POWER_RULE.roots && share(new Set([key.root, (key.root + 1) % 12])) >= POWER_RULE.tonic && share(new Set([key.root])) >= POWER_RULE.home && second >= POWER_RULE.second ? 'power' : false;
};
// the song of a level B model (D9): the model's sections with their kinds as names, a drums track with each section's
// main grid and its variants as clips, bass and chords code tracks with one loop per section; a part plays where it is
// heard (runs shorter than EDIT_RULE.runBars merged, decode-refine D7); sounds by measure per section (D10); the song ends at the
// model's ending
export function writeFull(model, opts = {}) {
  const bars = model.bars, end = Math.max(1, Math.min(model.ending ?? bars.length, bars.length));
  const secs = (model.sections && model.sections.length ? model.sections : [{ start: 0, bars: end, kind: 'verse' }]).filter(s => s.start < end).map(s => ({ ...s, bars: Math.min(s.bars, end - s.start) }));
  const M = { ...model, sections: secs, ending: end };
  const named = new Map(), names = secs.map(s => { const base = SECTION_NAMES[s.kind] || 'Part', n = (named.get(base) || 0) + 1; named.set(base, n); return n > 1 ? `${base} ${n}` : base; });
  const all = soundsOf(bars.slice(0, end), opts.sounds), tracks = [];
  const topBass = Math.max(0, ...bars.slice(0, end).map(b => (b.level ? b.level.bass || 0 : 0))), heardBass = b => bassHeardB(b, topBass);
  const pid = n => String.fromCharCode(65 + (n % 26)) + (n >= 26 ? Math.floor(n / 26) : '');
  const runs = (list, k) => { const out = []; list.forEach((x, j) => { if (x === null) return; const last = out[out.length - 1]; if (last && last.pattern === x && last.start + last.bars === k + j) last.bars++; else out.push({ start: k + j, bars: 1, pattern: x }); }); return out; };
  // drums
  {
    const plan = drumPlan(M), patterns = {}, ids = new Map(), clips = [];
    const idOf = (key, grid) => { if (!ids.has(key)) { const id = pid(ids.size); ids.set(key, id); const g = grid(key); patterns[id] = { rows: Object.fromEntries(DRUM_ROWS.filter(r => hits(g[r])).map(r => [r, g[r]])) }; } return ids.get(key); };
    // the edit rule (decode-refine D7): a variant starts only when lineBars passed since the drums' last edit and
    // anyBars since any part entered or stopped; the way back to the main grid is always written
    const rule = opts.rule || EDIT_RULE, events = new Set();
    for (const heardOf of [heardBass, chordsHeard]) secs.forEach(sec => { const on = steady(range(sec.start, sec.start + sec.bars).map(i => heardOf(bars[i])), rule.runBars); on.forEach((x, j) => { if (j && x !== on[j - 1]) events.add(sec.start + j); }); });
    plan.forEach((p, k) => {
      if (!p.main) return;
      const s0 = secs[k].start, out = [];
      let lastLine = s0, lastAny = s0;
      p.perBar.forEach((x, j) => {
        const b = s0 + j, prev = j ? out[j - 1] : null;
        if (events.has(b)) lastAny = b;
        let y = x;
        // (a two-bar groove's second bar is the groove itself, not a variant: it never waits)
        if (!p.pair && x !== null && prev !== null && x !== p.main && x !== prev && !(b - lastLine >= rule.lineBars && b - lastAny >= rule.anyBars)) y = p.main;
        if (j && y !== prev) { lastLine = b; lastAny = b; }
        out.push(y);
      });
      clips.push(...runs(out.map(x => (x ? idOf(x, p.grid) : null)), s0));
    });
    // (decode-refine D3: level B's drum machine by measure, the nearest to the track's hats)
    const kit = opts.sounds !== 'simple' && model.drumSound && model.drumSound.kit ? model.drumSound.kit : all.kit;
    if (clips.length) tracks.push({ id: 'drums', name: 'Drums', type: 'drums', settings: { kit }, patterns, clips });
  }
  // bass and chords
  // keep(values): whether a section's values are a part at all (chords: most of them in the song's key)
  const part = (id, name, visual, heardOf, valueOf, code, same, keep = () => true) => {
    const patterns = {}, ids = new Map(), clips = [];
    secs.forEach(sec => {
      const idx = range(sec.start, sec.start + sec.bars), on = steady(idx.map(i => heardOf(bars[i])), (opts.rule || EDIT_RULE).runBars);
      const heard = idx.filter((i, j) => on[j] && heardOf(bars[i])), kept = keep(heard.map(i => valueOf(bars[i])));
      if (!kept) return;
      // (round 8, fourth pass: power chords only where the section has some top, a mean brightness of POWER_RULE.bright
      // or more: a driven bass alone reads its roots as chords too, and its section is dark, 0.03 to 0.05 on the bench's
      // two driven-bass songs with no pad, 0.09 to 0.25 where a pad plays)
      if (kept === 'power' && heard.reduce((a, i) => a + (bars[i].bright || 0), 0) / Math.max(1, heard.length) < POWER_RULE.bright) return;
      // (round 8: a section kept as power chords writes each chord's root with a fifth and no third)
      const val = kept === 'power' ? b => { const c = parseChord(valueOf(b)); return c ? `${NOTE_NAMES[c.root]}5` : null; } : valueOf;
      const byBar = {}; idx.forEach((i, j) => { byBar[i] = on[j] && heardOf(bars[i]) ? val(bars[i]) : null; });
      const loop = sectionLoop(byBar, idx, same ? { same } : {});
      if (!loop) return;
      const bp = bassDriveOf(model.bassDrive) || { drive: 0, wave: null }, snd = soundsOf(idx.map(i => bars[i]), opts.sounds, bars.slice(0, end), bp.drive, bp.wave), c0 = code(loop, id === 'bass' ? snd.bass : snd.chords);
      // (round 8, fourth pass: a power chord's voicing holds four notes over an octave and a fifth; under the default
      // anchor, whose top note sits under it, its root falls lower than the triads' roots: it is voiced up from
      // POWER_RULE.anchor, in the triads' register. The bench's numbers do not move with it)
      const c = kept === 'power' ? c0.replace('.voicing()', `.mode("above").anchor("${POWER_RULE.anchor}").voicing()`) : c0;
      if (!ids.has(c)) { const p = pid(ids.size); ids.set(c, p); patterns[p] = { code: c }; }
      clips.push(...runs(on.map(x => (x ? ids.get(c) : null)), sec.start));
    });
    if (clips.length) tracks.push({ id, name, type: 'code', settings: { visual }, patterns, clips });
  };
  // (decode round 8: a step the note before still sounds on is a hold, `_` in the code, so a held note is written long)
  part('bass', 'Bass', 'bass', heardBass, b => b.bass.map((x, j, a) => (x === null || x === undefined ? null : x)).map((x, j, a) => (x === null && b.bassHold && b.bassHold[j] ? HOLD : x)).map((x, j, a) => (x === HOLD && !a.slice(0, j).some(y => y !== null && y !== HOLD) ? null : x)), bassCode, sameBassB);
  part('chords', 'Chords', 'pad', chordsHeard, b => b.chord, chordCode, undefined, inKey(model.key));
  // the Lead (decode-refine D2): the top line as one loop per section where it is voiced on at least LEAD_RULE.voiced
  // of the section's steps; a sung melody (the top line lines' kind `vox`) muted by default (`hush`)
  {
    const patterns = {}, ids = new Map(), clips = [], kind = (topPlan(model, 'B').find(Boolean) || {}).kind;
    secs.forEach(sec => {
      const idx = range(sec.start, sec.start + sec.bars), voiced = idx.reduce((a, i) => a + voicedOf(bars[i]), 0) / Math.max(1, idx.length);
      if (!(voiced >= LEAD_RULE.voiced)) return;
      const byBar = {}; idx.forEach(i => { const l = bars[i] && bars[i].lead; byBar[i] = l && voicedOf(bars[i]) > 0 && l.some(x => x !== null) ? l : null; });
      const loop = sectionLoop(byBar, idx, { same: sameBassB, lengths: [1, 2, 4] });
      if (!loop) return;
      const c = leadCode(loop, model.key, soundsOf(idx.map(i => bars[i]), opts.sounds).lead);
      if (!ids.has(c)) { const p = pid(ids.size); ids.set(c, p); patterns[p] = { code: c }; }
      clips.push({ start: sec.start, bars: sec.bars, pattern: ids.get(c) });
    });
    if (clips.length) tracks.push({ id: 'lead', name: 'Lead', type: 'code', settings: { visual: 'hook' }, patterns, clips, ...(kind === 'vox' ? { hush: true } : {}) });
  }
  if (opts.sounds !== 'simple') {
    // (round 6: bass notes on more than SOUND_RULE.bassMissing of the bars and no bass track: the drums keep their level)
    const noted = bars.slice(0, end).filter(b => (b.bass || []).some(x => x !== null && x !== undefined)).length;
    const bal = balanceLevels(tracks, model.shares, end, { bassMissing: !tracks.some(t => t.id === 'bass') && noted > SOUND_RULE.bassMissing * end });
    const gains = bal && bal.gains;
    cutUnderLead(tracks, gains);
  }
  const song = songShell(model, opts, end, tracks);
  const key = formatKey(model.key), bpm = song.sections[0].bpm;
  song.sections = secs.map((s, i) => ({ name: names[i], bars: s.bars, bpm, key }));
  return song;
}
