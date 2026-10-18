// Unit cases for the idea writer (idea-model, #70): writeIdea, expandIdea, ideaLadder and the shortest exact forms,
// for every kind of idea, in 4/4 and 7/8. No browser (the events themselves: tools/check-ideas.cjs).
//   npm run check:ideas
import { writeIdea, expandIdea, ideaLadder, seqForm, drumRow, beatForm, altForm, flatTokens } from '../src/song/ideas.js';
import fs from 'node:fs';
import { BASS, presetIdea } from '../src/music.js';
import { stateAt } from '../src/song/build.js';
import { compileSong } from '../src/song/compile.js';

const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); };
const ctx = (type, extra = {}) => ({ type, N: 16, chords: ['Am', 'F', 'C', 'G'], tr: 0, key: 'A', start: 0, sw: '', ch: {}, shared: {}, ...extra });
const code = (idea, c) => writeIdea(idea, c).lines.join('\n');
const CASES = {
  'a repeated cell, not written four times'() {
    eq(code({ rhythm: '[~ x x x]*4' }, ctx('bass')), 'note("<a1 f1 c2 g1>").struct("[~ x x x]*4")', 'cell');
    eq(code(BASS.rolling.idea, ctx('bass')), 'note("<a1 f1 c2 g1>").struct("[~ x x x]*4")', 'rolling preset');
    eq(expandIdea({ rhythm: '[~ x x x]*4' }, ctx('bass')).steps, '.xxx.xxx.xxx.xxx', 'steps');
  },
  'a cell per beat in 7/8 keeps the half beat'() {
    eq(code(BASS.rolling.idea, ctx('bass', { N: 14 })), 'note("<a1 f1 c2 g1>").struct("[~ x x x]@4 [~ x x x]@4 [~ x x x]@4 [~ x]@2")', '7/8');
    eq(expandIdea(BASS.rolling.idea, ctx('bass', { N: 14 })).steps, '.xxx.xxx.xxx.x', '7/8 steps');
  },
  'a riff: rhythm and semitones per 16th'() {
    eq(code(presetIdea('bass', { preset: 'ottaveArcade' }), ctx('bass')), 'note("<a1 f1 c2 g1>").struct("x*16").transpose("[0 12]!6 [-2 10]!2")', 'arcade octaves');
  },
  'sequencer steps: beat, or the shorter cell'() {
    eq(drumRow('bd', 'x...x...x...x...'), 's("bd*4")', 'four on the floor');
    eq(drumRow('bd', 'x......x..x.....'), 's("bd ~!6 bd ~ ~ bd ~!5")', 'the cell wins when shorter');
    eq(drumRow('bd', '.x..x.x...x..x.x'), 's("bd").beat("1,4,6,10,13,15",16)', 'beat when shorter');
    eq(drumRow('bd', 'x...x...x...x...', { coarse: false }), 's("[bd ~ ~ ~]*4")', 'same step length');
    eq(writeIdea({ beat: { bd: '0,4,8,12', hh: '2,6,10,14', grid: 16 } }, ctx('drums')).rows, { bd: 'x...x...x...x...', hh: '..x...x...x...x.' }, 'drum rows');
    eq(writeIdea({ beat: { bd: '0,8', grid: 14 } }, ctx('drums', { N: 14 })).rows, { bd: 'x.......x.....' }, '7/8 rows');
    eq(code({ beat: { steps: '0,4,11', grid: 16 } }, ctx('bass')), 'note("<a1 f1 c2 g1>").beat("0,4,11",16)', 'melodic beat');
  },
  'degrees with a scale, moved with the section key'() {
    eq(code({ degrees: '<0 2 4 ~>' }, ctx('hook', { key: 'E', ch: { octave: '4', mode: 'phrygian' } })), 'n("<0 2 4 ~>").scale("E4:phrygian")', 'hook');
    eq(code({ degrees: '0 2', scale: 'dorian' }, ctx('bass')), 'n("0 2").scale("A4:dorian")', 'bass degrees');
    eq(expandIdea({ degrees: '0 ~ 2 4' }, ctx('hook')).steps, 'x.......x...x...', 'degree onsets');
  },
  'chord names with a voicing, indices inside the voiced chord'() {
    eq(code({ chords: '<Am7 F^7>', voicing: { anchor: 'c5', mode: 'below' }, index: '0 1 2 3' }, ctx('arp')), 'n("0 1 2 3").chord("<Am7 F^7>").anchor("c5").mode("below").voicing()', 'arp');
    eq(code({ voicing: {}, hold: true }, ctx('pad', { tr: -5 })), 'chord("<Am F C G>").voicing().transpose(-5)', 'pad on the progression');
    eq(code({ index: '[0 1 2 3]*4' }, ctx('arp')), 'note("<[a3,c4,e4,a4] [f3,a3,c4,f4] [g3,c4,e4,g4] [g3,b3,d4,g4]>").arp("[0 1 2 3]*4")', 'stacks');
  },
  'a seeded random source'() {
    eq(code({ chords: '<Am7 F^7>', random: { fn: 'irand', max: 8, seg: 16, seed: 3, cycles: 2 } }, ctx('arp')), 'n(irand(8).seg(16).rib(3, 2)).chord("<Am7 F^7>").voicing()', 'indices');
    eq(code({ rhythm: 'x*8', random: { fn: 'irand', max: 16, seg: 8, seed: 1, cycles: 4 } }, ctx('texture', { ch: { sample: 'glitch' } })), 's("glitch*8").n(irand(16).seg(8).rib(1, 4))', 'slices');
    eq(writeIdea({ rhythm: 'x*4', random: { fn: 'perlin', range: [400, 2000], seg: 8, seed: 2, cycles: 2, on: 'lpf' } }, ctx('bass')).tail, '.lpf(perlin.range(400, 2000).seg(8).rib(2, 2))', 'values');
  },
  'a shared progression read by name'() {
    const c = ctx('bass', { shared: { bline: '<0 3 5 -2>' } });
    eq(code({ from: 'bline', sub: 14 }, c), 'n(bline.sub(14)).scale("A4:minor")', 'bass two octaves down');
    eq(code({ from: 'bline', sub: 7 }, { ...c, type: 'hook', start: 2 }), 'n(bline.late(2).sub(7)).scale("A4:minor")', 'rotated for a clip inside it');
    eq(code({ from: 'ch' }, ctx('pad', { shared: { ch: '<Am7 F^7>' } })), 'chord(ch).voicing()', 'chord names');
  },
  'prepared variants: commented until switched on'() {
    const idea = { from: 'bline', sub: 14, variants: [{ add: '0 0 4 0 5' }] }, c = ctx('bass', { shared: { bline: '<0 3>' } });
    eq(writeIdea(idea, c).lines, ['bline.sub(14) // .add("0 0 4 0 5")', '  .n().scale("A4:minor")'], 'off');
    eq(writeIdea(idea, { ...c, variant: 0 }).lines, ['bline.sub(14).add("0 0 4 0 5")', '  .n().scale("A4:minor")'], 'on');
    eq(writeIdea({ rhythm: 'x*4', variants: [{ transpose: '<0 12>' }] }, ctx('bass')).lines, ['note("<a1 f1 c2 g1>").struct("x*4") // .transpose("<0 12>")'], 'notes');
  },
  'shortest exact forms'() {
    eq(seqForm('0 0 0 0 0 0 1 0 0 0 0 0 3 0 1 0'.split(' ')), '0!6 1 0!5 3 0 1 0', 'runs');
    eq(seqForm(['<a b>', 'c', '<a b>', 'c']), '[<a b> c]!2', 'no *n around an alternation (! keeps the cycle)');
    eq(altForm(['a1', 'a1', 'a1', 'g1']), '<a1!3 g1>', 'repeated bars'); eq(altForm(['a1', 'a1', 'g1', 'g1']), '<a1 a1 g1 g1>', 'a run that saves little stays written');
    eq(altForm(['a1', 'f1', 'a1', 'f1']), '<a1 f1>', 'period');
    eq(beatForm('[x x]', 'x', 16), '[x x]*4', 'eighths');
    eq(flatTokens('[~ x]*2', 4), ['~', 'x', '~', 'x'], 'flat');
  },
  'ladders: from the simplest form to the written one'() {
    eq(ideaLadder(BASS.rolling.idea, ctx('bass'), 3).map(f => f.rhythm), ['[~ x]', 'x'], 'bass cell');
    eq(ideaLadder({ index: '0 1 2 3 0 1 2 3', per: 'slot' }, ctx('arp'), 3).map(f => f.index ?? 'hold'), ['0 2', 'hold'], 'arp');
    eq(ideaLadder({ degrees: '<[0 ~ 0 2] [4 ~ 2 ~]>', per: 'slot' }, ctx('hook'), 3).map(f => f.degrees), ['0 ~ 0 2', '0'], 'hook');
    eq(ideaLadder({ beat: { bd: '0,4,8,12', hh: '2,6', grid: 16 } }, ctx('drums'), 3).map(f => f.beat), [{ grid: 16, bd: '0,4,8,12' }, { grid: 16, bd: '0' }], 'drums');
    eq(ideaLadder({ from: 'b', sub: 14 }, ctx('bass'), 3), [{ from: 'b' }], 'shared');
    eq(JSON.stringify(ideaLadder(BASS.rolling.idea, ctx('bass'), 3)) === JSON.stringify(ideaLadder(BASS.rolling.idea, ctx('bass'), 3)), true, 'same twice');
  },
  'a variant step: seeking past it switches the variant on, a later step switches it off'() {
    const song = JSON.parse(fs.readFileSync('songs/examples/04-ideas.json', 'utf8'));
    song.build = [...song.build, { at: 30, variant: { track: 'bass', use: null } }];
    const before = compileSong(stateAt(song, 15).song), after = stateAt(song, 20), off = compileSong(stateAt(song, 31).song);
    eq(after.song.tracks.find(t => t.id === 'bass').variant, 0, 'variant on at bar 20');
    eq([before.includes('// .add("0 0 4 0 5")'), !before.includes('.sub(14).add(')], [true, true], 'commented before the step');
    const code = compileSong(after.song);
    eq([code.includes('bline.sub(14).add("0 0 4 0 5")'), code.includes('// .add("0 0 4 0 5")')], [true, false], 'without // after the step');
    eq(off.includes('// .add("0 0 4 0 5")'), true, 'off again');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CASES)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CASES).length} checks passed`);
process.exit(failed ? 1 : 0);
