// Checks for the typing of the code that types itself (live-typing): only the words that change are touched, a person's
// speed for small edits and faster for long ones, the last frame is the new code, a deadline is kept; lines
// (typing-lines): only alike lines are edited in place, copy and change, line breaks, insertions in a chain. No browser.
//   npm run check:typing      exit 1 when any check fails
import fs from 'node:fs';
import { typingPlan, TYPING_SPEEDS, settleOthers, breakLines, lineLike } from '../src/song/typing.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps } from '../src/song/build.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
// every frame keeps the untouched parts of the line
const frames = (p, n = 60) => Array.from({ length: n + 1 }, (_, i) => p.frame((p.total * i) / n));
const CHECKS = {
  'one note changes: the rest of the line never moves'() {
    const a = '$: s("[bd ~ ~ ~] [bd ~ ~ ~] [bd ~ ~ ~] [bd ~ ~ ~]").bank("RolandTR909").gain(0.8).lpf(2000)';
    const b = a.replace('[bd ~ ~ ~] [bd ~ ~ ~] [bd', '[bd ~ ~ ~] [bd ~ hh ~] [bd');
    const p = typingPlan(a, b);
    for (const f of frames(p)) assert(f.startsWith('$: s("[bd ~ ~ ~] [bd ~ ') && f.endsWith('~] [bd ~ ~ ~]").bank("RolandTR909").gain(0.8).lpf(2000)'), `moved: ${f}`);
    assert(p.frame(p.total) === b && p.frame(0) === a, 'ends');
  },
  'small edit at a person\'s speed, long edit faster'() {
    const small = typingPlan('.gain(0.5)', '.gain(0.65)');
    assert(small.total > 0.3 && small.total < 1.2, `small ${small.total}`);
    const long = 'x'.repeat(600), big = typingPlan('a', `a\n${long}`);
    const cps = 600 / big.total;
    assert(cps > 25 && cps < 35, `long ${cps} chars/s`);
  },
  'three places: edited one after another'() {
    const a = '.gain(0.5).lpf(800).room(0.2)', b = '.gain(0.6).lpf(900).room(0.3)', p = typingPlan(a, b);
    const seen = frames(p, 200).filter((f, i, all) => f !== all[i - 1]);
    const first = seen.findIndex(f => f.includes('gain(0.6)')), second = seen.findIndex(f => f.includes('lpf(900)'));
    assert(first > 0 && second > first, 'order');
  },
  'deadline: a long edit fits the time it has'() {
    const p = typingPlan('a', `a\n${'y'.repeat(400)}`, { max: 2 });
    assert(Math.abs(p.total - 2) < 1e-9 && p.frame(2) === `a\n${'y'.repeat(400)}`, `total ${p.total}`);
  },
  'speeds: slow is slower than normal, fast faster'() {
    const t = k => typingPlan('.gain(0.5)', '.gain(0.75)', { speed: TYPING_SPEEDS[k] }).total;
    assert(t('slow') > t('normal') && t('normal') > t('fast'), 'order');
  },
  'removed and new lines'() {
    const a = 'one\ntwo\nthree', b = 'one\nthree\nfour', p = typingPlan(a, b);
    assert(p.frame(p.total) === b && !p.frame(0.01).includes('two'), 'lines');
  },
  'Prima luce: a new drum line is never typed over the voice comment'() {
    const files = { say_it: Array.from({ length: 80 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 80 }, (_, i) => `say_en/${i}.wav`) };
    const song = JSON.parse(fs.readFileSync('songs/switch-prima-luce.json', 'utf8')), C = resolveProfile('switch');
    const L = liveCode(crescendoSong(song, { rules: { natural: true } }), C, { lang: () => 'it', files: () => files, cols: () => 72 });
    const bars = [0, ...new Set(buildSteps(L.build).map(x => x.at))].sort((a, b) => a - b).slice(0, 12);
    let pasted = 0;
    for (let i = 1; i < bars.length; i++) {
      const to = L.codeAt(bars[i]), p = typingPlan(settleOthers(L.codeAt(bars[i - 1]), to, bars[i]), to);
      for (const f of frames(p, 120)) for (const l of f.split('\n')) assert(!(/say_it|voice|spoken/.test(l) && /RolandTR909|supersaw/.test(l)), `bar ${bars[i]}: mixed line ${l}`);
      // the first frame with one more drum line has it whole: pasted, not typed
      const before = (L.codeAt(bars[i - 1]).match(/RolandTR909/g) || []).length, more = frames(p, 400).find(f => (f.match(/RolandTR909/g) || []).length > before);
      if (more && more.split('\n').filter(l => l.includes('RolandTR909')).every(l => /\)$/.test(l) || /\)\n/.test(l))) pasted++;
    }
    assert(pasted > 0, 'a drum line pasted');
  },
  'copy and change: a new line like the one above is pasted whole, then edited'() {
    const kick = '$: s("bd*4").bank("RolandTR909").gain(0.85).orbit(1)', clap = '$: s("[~ cp]*2").bank("RolandTR909").gain(0.68).orbit(1)';
    const p = typingPlan(kick, `${kick}\n${clap}`), all = frames(p, 400).map(f => f.split('\n')[1]).filter(Boolean);
    assert(all[0] === kick, `first: ${all[0]}`);
    assert(all.every(l => l.endsWith('.orbit(1)')), 'the copy keeps the rest of the line');
    assert(all[all.length - 1] === clap, 'ends on the new line');
  },
  'unlike lines: the old one goes, the new one is typed from the start'() {
    const a = '$: note("<a2 c3>").s("sawtooth").lpf(800)\n// "un suono", spoken on bar 1', b = '$: note("<a2 c3>").s("sawtooth").lpf(800)\n$: s("hh*8").gain(0.4)';
    assert(lineLike('// "un suono", spoken on bar 1', '$: s("hh*8").gain(0.4)') === 0, 'a comment and code are unlike');
    const seen = frames(typingPlan(a, b), 200).map(f => f.split('\n')[1]).filter(Boolean);
    assert(seen.every(l => '$: s("hh*8").gain(0.4)'.startsWith(l)), `typed from the start: ${seen.find(l => !'$: s("hh*8").gain(0.4)'.startsWith(l))}`);
  },
  'line breaks before a function, continuation indented, strings never cut'() {
    const line = '$: s("[~ hh]*4").bank("RolandTR909").gain(0.43).distort(0.4).distortvol(.5).orbit(1).analyze("hats")';
    const out = breakLines(line, 60).split('\n');
    assert(out.length === 2 && out.every(l => l.length <= 60) && out[1].startsWith('  .') && out.join('').replace(/\s+\./g, '.') === line.replace(/\s+\./g, '.'), out.join(' | '));
    assert(breakLines('// a very long comment '.repeat(5), 40) === '// a very long comment '.repeat(5), 'comments stay');
    assert(breakLines('$: note("<[a3 c4 e4 g4 a4 c5 e5 g5 a5 c6 e6 g6 a6]>").s("saw")', 30).split('\n')[0] === '$: note("<[a3 c4 e4 g4 a4 c5 e5 g5 a5 c6 e6 g6 a6]>")', 'a string longer than the panel stays whole');
  },
  'a break is typed as Enter with its indent'() {
    const a = '$: s("bd").gain(0.8).orbit(1)', b = '$: s("bd").gain(0.8).lpf(800)\n  .orbit(1)';
    for (const f of frames(typingPlan(a, b), 300)) assert(!/\n(?! {2}\.)/.test(f.replace(/\n {2}\./g, '')), `half a break: ${JSON.stringify(f)}`);
  },
  'an insertion at the start of a chain is typed there'() {
    const a = '$: s("supersaw").gain(0.3)', b = '$: n("0").scale("g:minor").s("supersaw").gain(0.3)', p = typingPlan(a, b);
    for (const f of frames(p, 200)) assert(f.startsWith('$: ') && f.endsWith('s("supersaw").gain(0.3)'), `rest moved: ${f}`);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
