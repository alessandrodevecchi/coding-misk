// Checks for the typing of the code that types itself (live-typing): only the words that change are touched, a person's
// speed for small edits and faster for long ones, the last frame is the new code, a deadline is kept. No browser.
//   npm run check:typing      exit 1 when any check fails
import { typingPlan, TYPING_SPEEDS } from '../src/song/typing.js';

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
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
