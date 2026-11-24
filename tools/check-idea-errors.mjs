// Small bad songs for the idea validator (idea-model, #70): each one must fail with an error at the expected JSON path
// and a message that names the problem. Run by npm run check:songs after the songs. No browser.
import { validateSong } from '../src/song/validate.js';

const song = (patterns, type = 'bass', extra = {}) => ({
  format: 'coding-misk/song', version: 2, id: 'bad', title: 'Bad', sections: [{ name: 'A', bars: 4, meter: extra.meter || '4/4' }],
  tracks: [{ id: 't', type, patterns, clips: [{ section: 'A', pattern: 'P' }], ...(extra.settings ? { settings: extra.settings } : {}), ...(extra.rack ? { rack: extra.rack } : {}) }], ...(extra.song || {}),
});
const CASES = [
  ['unknown idea kind', song({ P: { idea: { groove: 'x' } } }), 'tracks[0].patterns.P.idea.groove', /unknown idea kind/],
  ['degree not whole', song({ P: { idea: { degrees: '0 2.5 4' } } }, 'hook'), 'tracks[0].patterns.P.idea.degrees', /whole numbers/],
  ['index not whole', song({ P: { idea: { index: '0 1.5' } } }, 'arp'), 'tracks[0].patterns.P.idea.index', /whole numbers/],
  ['step outside the grid', song({ P: { idea: { beat: { bd: '0,4,17', grid: 16 } } } }, 'drums'), 'tracks[0].patterns.P.idea.beat.bd', /16-step grid/],
  ['grid does not fit the meter', song({ P: { idea: { beat: { bd: '0,4', grid: 16 } } } }, 'drums', { meter: '7/8' }), 'tracks[0].patterns.P.idea.beat.grid', /does not fit a bar of 14/],
  ['chord name', song({ P: { idea: { chords: '<Am7 Fmaj7>' } } }, 'arp'), 'tracks[0].patterns.P.idea.chords', /Fmaj7/],
  ['scale', song({ P: { idea: { degrees: '0 2', scale: 'klingon' } } }, 'hook'), 'tracks[0].patterns.P.idea.scale', /a scale or mode/],
  ['random without a seed', song({ P: { idea: { index: '0', random: { fn: 'irand', max: 4, seg: 8, cycles: 2 } } } }, 'arp'), 'tracks[0].patterns.P.idea.random.seed', /seed is required/],
  ['random without a loop length', song({ P: { idea: { random: { fn: 'irand', max: 4, seed: 1 } } } }, 'arp'), 'tracks[0].patterns.P.idea.random.cycles', /loop length/],
  ['random free melody', song({ P: { idea: { degrees: '0', random: { fn: 'irand', max: 8, seed: 1, cycles: 2 } } } }, 'hook'), 'tracks[0].patterns.P.idea.random', /free melody notes/],
  ['unknown shared name', song({ P: { idea: { from: 'nope', sub: 14 } } }), 'tracks[0].patterns.P.idea.from', /unknown shared progression/],
  ['shared name of the compiler', song({ P: { idea: { from: 'section1' } } }, 'bass', { song: { shared: { section1: '<0 2>' } } }), 'shared.section1', /not a JavaScript word or a name of the compiler/],
  ['variant on notes with add', song({ P: { idea: { rhythm: 'x*4', variants: [{ add: '0 7' }] } } }), 'tracks[0].patterns.P.idea.variants[0]', /on notes use transpose/],
  ['variant step out of range', song({ P: { idea: { degrees: '0 2', variants: [{ add: '0 7' }] } } }, 'hook', { song: { build: [{ at: 1, variant: { track: 't', use: 2 } }] } }), 'build[0].variant.use', /0 to 0/],
  // composed drum tones and variation (random-sound-params, #94)
  ['tone out of range', song({ P: { rows: { bd: 'x...' } } }, 'drums', { settings: { tone: { kick: { drive: 2 } } } }), 'tracks[0].settings.tone.kick.drive', /0 to 0.6/],
  ['tone unknown group', song({ P: { rows: { bd: 'x...' } } }, 'drums', { settings: { tone: { toms: { decay: 0.2 } } } }), 'tracks[0].settings.tone.toms', /kick, snare, hats/],
  ['tone unknown value', song({ P: { rows: { bd: 'x...' } } }, 'drums', { settings: { tone: { kick: { pitch: 1 } } } }), 'tracks[0].settings.tone.kick.pitch', /decay, tune, drive, cutoff/],
  ['vary above the cap', song({ P: { preset: 'su' } }, 'arp', { settings: { vary: [{ on: 'gain', amount: 0.5, seed: 1, cycles: 4 }] } }), 'tracks[0].settings.vary[0].amount', /0 to 0.3/],
  ['vary unknown target', song({ P: { preset: 'su' } }, 'arp', { settings: { vary: [{ on: 'fmi', amount: 0.2, seed: 1, cycles: 4 }] } }), 'tracks[0].settings.vary[0].on', /one of lpf/],
  ['vary without a seed', song({ P: { preset: 'su' } }, 'arp', { settings: { vary: [{ on: 'lpf', amount: 0.2, cycles: 4 }] } }), 'tracks[0].settings.vary[0].seed', /whole number/],
  ['vary without cycles', song({ P: { preset: 'su' } }, 'arp', { settings: { vary: [{ on: 'lpf', amount: 0.2, seed: 1 }] } }), 'tracks[0].settings.vary[0].cycles', /loop length/],
  ['vary twice', song({ P: { preset: 'su' } }, 'arp', { settings: { vary: [{ on: 'lpf', amount: 0.2, seed: 1, cycles: 4 }, { on: 'lpf', amount: 0.1, seed: 2, cycles: 2 }] } }), 'tracks[0].settings.vary[1]', /two entries/],
  ['vary too many', song({ P: { preset: 'su' } }, 'arp', { settings: { vary: ['lpf', 'pan', 'room', 'hpf'].map(on => ({ on, amount: 0.1, seed: 1, cycles: 4 })) } }), 'tracks[0].settings.vary', /at most 3/],
  ['vary row on a melodic track', song({ P: { preset: 'su' } }, 'arp', { settings: { vary: [{ on: 'pan', amount: 0.2, seed: 1, cycles: 4, row: 'hh' }] } }), 'tracks[0].settings.vary[0].row', /drum tracks only/],
  ['vary distort on bass', song({ P: { preset: 'rolling' } }, 'bass', { settings: { vary: [{ on: 'distort', amount: 0.2, seed: 1, cycles: 4 }] } }), 'tracks[0].settings.vary[0].on', /never varies its distortion/],
  ['vary gain on the kick', song({ P: { rows: { bd: 'x...' } } }, 'drums', { settings: { vary: [{ on: 'gain', amount: 0.2, seed: 1, cycles: 4, row: 'bd' }] } }), 'tracks[0].settings.vary[0].on', /kick never varies its gain/],
  ['set step on vary', song({ P: { preset: 'su' } }, 'arp', { song: { build: [{ at: 1, set: { track: 't', vary: [] } }] } }), 'build[0].set.vary', /cannot set vary/],
];
// warnings: a variation the writer leaves out
const WARN_CASES = [
  ['vary on an automated target', song({ P: { preset: 'pad' } }, 'pad', { settings: { cutoffEnd: 3000, vary: [{ on: 'lpf', amount: 0.2, seed: 1, cycles: 4 }] } }), 'tracks[0].settings.vary[0]', /left out/],
  ['vary under a rack device', song({ P: { preset: 'su' } }, 'arp', { settings: { vary: [{ on: 'delay', amount: 0.2, seed: 1, cycles: 4 }] }, rack: [{ device: 'delay', amount: 0.3, time: 0.25, feedback: 0.3 }] }), 'tracks[0].settings.vary[0]', /left out/],
  ['vary against an idea random', song({ P: { idea: { index: '0 1 2 3', random: { fn: 'rand', range: [400, 900], seed: 1, cycles: 2, on: 'lpf' } } } }, 'arp', { settings: { move: 'fisso', vary: [{ on: 'lpf', amount: 0.2, seed: 1, cycles: 4 }] } }), 'tracks[0].settings.vary[0]', /random values write lpf/],
];
let failed = 0;
for (const [name, s, path, msg] of WARN_CASES) {
  const { warnings } = validateSong(s), hit = warnings.find(e => e.path === path && msg.test(e.msg));
  if (!hit) { failed++; console.log(`FAIL  ${name}: expected a warning at ${path}; got ${warnings.map(e => `${e.path}: ${e.msg}`).join(' | ') || 'none'}`); }
  else console.log(`ok    ${name}: ${path}`);
}
for (const [name, s, path, msg] of CASES) {
  const { errors } = validateSong(s), hit = errors.find(e => e.path === path && msg.test(e.msg));
  if (!hit) { failed++; console.log(`FAIL  ${name}: expected an error at ${path}; got ${errors.map(e => `${e.path}: ${e.msg}`).join(' | ') || 'none'}`); }
  else console.log(`ok    ${name}: ${path}`);
}
// a good idea song passes
const good = song({ P: { idea: { from: 'bl', sub: 14, rhythm: '[x x ~ x]*4', variants: [{ add: '0 0 4 0 5' }] } } }, 'bass', { song: { shared: { bl: '<0 3 5 -2>' }, build: [{ at: 1, variant: { track: 't', use: 0 } }] } });
const g = validateSong(good).errors;
if (g.length) { failed++; console.log(`FAIL  a good idea song: ${g.map(e => `${e.path}: ${e.msg}`).join(' | ')}`); } else console.log('ok    a good idea song passes');
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${CASES.length + WARN_CASES.length + 1} idea checks passed`);
process.exit(failed ? 1 : 0);
