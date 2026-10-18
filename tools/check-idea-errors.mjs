// Small bad songs for the idea validator (idea-model, #70): each one must fail with an error at the expected JSON path
// and a message that names the problem. Run by npm run check:songs after the songs. No browser.
import { validateSong } from '../src/song/validate.js';

const song = (patterns, type = 'bass', extra = {}) => ({
  format: 'coding-misk/song', version: 2, id: 'bad', title: 'Bad', sections: [{ name: 'A', bars: 4, meter: extra.meter || '4/4' }],
  tracks: [{ id: 't', type, patterns, clips: [{ section: 'A', pattern: 'P' }] }], ...(extra.song || {}),
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
];
let failed = 0;
for (const [name, s, path, msg] of CASES) {
  const { errors } = validateSong(s), hit = errors.find(e => e.path === path && msg.test(e.msg));
  if (!hit) { failed++; console.log(`FAIL  ${name}: expected an error at ${path}; got ${errors.map(e => `${e.path}: ${e.msg}`).join(' | ') || 'none'}`); }
  else console.log(`ok    ${name}: ${path}`);
}
// a good idea song passes
const good = song({ P: { idea: { from: 'bl', sub: 14, rhythm: '[x x ~ x]*4', variants: [{ add: '0 0 4 0 5' }] } } }, 'bass', { song: { shared: { bl: '<0 3 5 -2>' }, build: [{ at: 1, variant: { track: 't', use: 0 } }] } });
const g = validateSong(good).errors;
if (g.length) { failed++; console.log(`FAIL  a good idea song: ${g.map(e => `${e.path}: ${e.msg}`).join(' | ')}`); } else console.log('ok    a good idea song passes');
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${CASES.length + 1} idea checks passed`);
process.exit(failed ? 1 : 0);
