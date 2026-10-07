// Checks for the endless director and style recipes (docs/ENDLESS.md, docs/STYLES.md).
//   npm run check:endless      run every check; exit 1 when any fails
// Each check is a named function that throws on failure. New checks go in CHECKS.
import { stream, makeRng, STREAMS, hashString } from '../src/endless/random.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const take = (s, n) => Array.from({ length: n }, () => s.next());

const CHECKS = {
  'random: same seed and stream repeat'() {
    const a = take(stream('test', 'plan'), 50), b = take(stream('test', 'plan'), 50);
    assert(a.every((x, i) => x === b[i]), 'sequences differ');
    assert(a.every(x => x >= 0 && x < 1), 'value out of [0, 1)');
  },
  'random: different streams and seeds differ'() {
    const seqs = STREAMS.map(n => take(makeRng('test')[n], 20).join());
    assert(new Set(seqs).size === STREAMS.length, 'two streams gave the same sequence');
    assert(take(stream('test', 'plan'), 20).join() !== take(stream('test2', 'plan'), 20).join(), 'two seeds gave the same sequence');
  },
  'random: streams are independent'() {
    // Drawing from one stream must not move another.
    const r1 = makeRng('x'), r2 = makeRng('x');
    take(r1.titles, 100);
    assert(take(r1.plan, 10).join() === take(r2.plan, 10).join(), 'titles draws changed plan');
  },
  'random: helpers stay in range'() {
    const s = stream('helpers');
    for (let i = 0; i < 2000; i++) {
      const n = s.int(3, 7); assert(Number.isInteger(n) && n >= 3 && n <= 7, `int out of range: ${n}`);
      const f = s.range(-1, 1); assert(f >= -1 && f < 1, `range out of range: ${f}`);
    }
    const sh = s.shuffle([1, 2, 3, 4, 5]);
    assert(sh.slice().sort().join() === '1,2,3,4,5', 'shuffle lost items');
    assert(s.weighted(['a', 'b'], [0, 1]) === 'b', 'weighted picked a zero weight');
    assert(hashString('abc') === hashString('abc') && hashString('abc') !== hashString('abd'), 'hash not stable');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
