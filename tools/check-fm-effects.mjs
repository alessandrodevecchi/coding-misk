// Checks for the FM-like rack effects (fm-like-effects, #90, design D7). No browser.
//   npm run check:fm-effects     exit 1 when any check fails
// 1. Fold and Ring are sound devices with their ranges, names and choice labels in Italian and English, and their
//    argument labels in src/i18n.js.
// 2. Their code evaluated by Strudel in Node, on a sample, a synth and a voice line: Fold carries distort,
//    distorttype and distortvol; Ring carries the Kabelsalat source of the ring (workletSrc).
// 3. Fold's level (D2): superdough's own fold curves times the device's level stay at or below the higher of the input
//    and the usual peak of the track type, for every type, amount and curve; a line below the fold keeps its level
//    within 2% (the level has 3 decimals); a folded line at full scale comes out near its type's usual peak.
// 4. Ring never raises the level (D3): 1 - amount + amount·sin stays within -1…1 for every amount.
// 5. Fold with Distortion on one track: a warning, no error; Fold alone: none.
// 6. The code scanner of check:strudel skips the Kabelsalat expression inside K(…).
// 7. Radio voices (D6): some voices get Fold, with an amount from 0.3 to 1.2 and a known curve; none gets Ring.
import fs from 'node:fs';
import { DEVICES, rackCode, deviceArgs, newDevice, checkRack, foldGain, foldLevel, choiceLabel, FOLD_PEAK } from '../src/song/rack.js';
import { TYPES } from '../src/song/format.js';
import { distortionAlgorithms } from 'superdough/helpers.mjs';
import { scanCalls } from './strudel-code.mjs';
import { createSession } from '../src/endless/director.js';
import { loadStyles } from './styles-dir.mjs';
import { strudelInNode } from './mixer-checks.mjs';

let failed = 0;
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) {
  try { const extra = await fn(); console.log(`ok    ${name}${extra ? ` (${extra})` : ''}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
const i18n = fs.readFileSync('src/i18n.js', 'utf8');

await check('Fold and Ring: sound devices, ranges, names and labels in both languages', () => {
  const F = DEVICES.fold, R = DEVICES.ring;
  assert(F && F.kind === 'sound' && R && R.kind === 'sound', 'fold or ring missing, or not a sound device');
  for (const d of [F, R]) assert(d.label.it && d.label.en && d.label.it !== '' && d.args.length === 2, `${d.label.en}: names or two settings`);
  const [amount, curve] = F.args;
  assert(amount[0] === 'amount' && amount[2] === 1.5 && amount[3] === 0.1 && amount[4] === 3, `fold amount ${amount}`);
  assert(curve[0] === 'curve' && curve[2] === 'sharp' && curve[3].join() === 'sharp,soft', `fold curve ${curve}`);
  for (const v of curve[3]) for (const l of ['it', 'en']) assert(choiceLabel(curve, v, l) && choiceLabel(curve, v, l) !== v, `no ${l} label for ${v}`);
  assert(choiceLabel(curve, 'soft', 'it') === 'Morbida', choiceLabel(curve, 'soft', 'it'));
  const [freq, amt] = R.args;
  assert(freq[0] === 'freq' && freq[2] === 220 && freq[3] === 30 && freq[4] === 2000, `ring freq ${freq}`);
  assert(amt[0] === 'amount' && amt[2] === 0.8 && amt[3] === 0 && amt[4] === 1, `ring amount ${amt}`);
  assert(/\(trial\)/.test(R.label.en) && /\(prova\)/.test(R.label.it), 'the Ring label says it is a trial');
  for (const k of ['arg_curve', 'arg_freq', 'arg_amount']) assert((i18n.match(new RegExp(`\\b${k}:`, 'g')) || []).length === 2, `${k} not in both languages`);
  return `${rackCode([newDevice('fold')], 'drums')} · ${rackCode([newDevice('ring')], 'drums')}`;
});

await check('the code of each device evaluates with Strudel in Node, on a sample, a synth and a voice', async () => {
  const S = await strudelInNode();
  const lines = { drums: 's("bd*4").bank("RolandTR909")', bass: 'note("a1 c2").s("sawtooth")', voice: 's("say_it:3")' };
  const out = [];
  for (const [type, line] of Object.entries(lines)) {
    for (const dev of [newDevice('fold'), { device: 'fold', amount: 2.5, curve: 'soft' }, newDevice('ring'), { device: 'ring', freq: 1500, amount: 1 }]) {
      const p = await S.evaluate(`$: ${line}${rackCode([dev], type)}.gain(0.5)`);
      const v = p.queryArc(0, 1).filter(h => h.hasOnset())[0].value, a = deviceArgs(dev);
      if (dev.device === 'fold') {
        assert(v.distort === a.amount && v.distorttype === (a.curve === 'soft' ? 'sinefold' : 'fold') && v.distortvol === foldLevel(a.amount, a.curve, type), `${type} fold: ${JSON.stringify(v)}`);
      } else {
        assert(typeof v.workletSrc === 'string' && v.workletSrc.startsWith('audioin().mul(sine(') && v.workletSrc.includes(String(a.freq)), `${type} ring: ${JSON.stringify(v)}`);
        assert(v.gain === 0.5, `${type} ring: the gain stays (${v.gain})`);
      }
    }
    out.push(type);
  }
  return out.join(', ');
});

await check('Fold never raises a line above its own peak or its type\'s usual peak; a quiet line keeps its level (D2)', () => {
  let quiet = Infinity, folded = Infinity;
  for (const type of TYPES) for (const curve of ['sharp', 'soft']) {
    const algo = distortionAlgorithms[curve === 'soft' ? 'sinefold' : 'fold'], P = FOLD_PEAK[type] ?? 0.2;
    for (let a = 0.1; a <= 3.0001; a += 0.05) {
      const k = Math.expm1(a), g = foldGain(a, curve), lv = foldLevel(a, curve, type);
      assert(lv > 0.001 && lv <= 1, `level ${lv} out of the worklet's range`);
      for (let x = -1.2; x <= 1.2; x += 0.0007) {
        const y = Math.abs(lv * algo(x, k));
        assert(y <= Math.max(Math.abs(x), P) + 1e-9, `${type} ${curve} ${a.toFixed(2)}: ${y} above ${Math.abs(x)} and ${P}`);
      }
      // a line that does not reach the fold (its peak below 1/g) keeps its level when 1/g is the level
      if (1 / g >= P) { const x = 0.1 / g; quiet = Math.min(quiet, Math.abs(lv * algo(x, k)) / x); }
      // a line at full scale comes out near its type's usual peak, not far below it
      else { let m = 0; for (let x = 0; x <= 1; x += 0.0003) m = Math.max(m, Math.abs(lv * algo(x, k))); folded = Math.min(folded, m / P); }
    }
  }
  assert(quiet > 0.98, `a line below the fold loses ${(100 - quiet * 100).toFixed(1)}%`);
  assert(folded > 0.9, `a folded line at full scale comes out at ${(folded * 100).toFixed(0)}% of its type's usual peak`);
  return `below the fold kept at ${(quiet * 100).toFixed(1)}% at least, a folded full scale line at ${(folded * 100).toFixed(0)}% of its type's peak at least`;
});

await check('Ring never raises the level (D3)', () => {
  for (let a = 0; a <= 1.0001; a += 0.05) for (let ph = 0; ph < 2 * Math.PI; ph += 0.01) assert(Math.abs(1 - a + a * Math.sin(ph)) <= 1 + 1e-9, `amount ${a}`);
  const code = rackCode([{ device: 'ring', freq: 440, amount: 0.3 }], 'hook');
  assert(code === '.K(audioin().mul(sine(440).mul(0.3).add(0.7)).out())', code);
});

await check('Fold with Distortion warns, Fold alone does not, nothing is an error (D2)', () => {
  const run = rack => { const errs = [], warns = []; checkRack(rack, 'tracks[0].rack', (p, m) => errs.push(`${p} ${m}`), (p, m) => warns.push(`${p} ${m}`)); return { errs, warns }; };
  const both = run([{ device: 'distort', amount: 2 }, { device: 'fold', amount: 1 }]);
  assert(!both.errs.length && both.warns.length === 1 && /only the later one \(fold\)/.test(both.warns[0]), JSON.stringify(both));
  const off = run([{ device: 'distort', amount: 2 }, { device: 'fold', on: false }]);
  assert(!off.errs.length && !off.warns.length, JSON.stringify(off));
  const alone = run([newDevice('fold'), newDevice('ring')]);
  assert(!alone.errs.length && !alone.warns.length, JSON.stringify(alone));
  const bad = run([{ device: 'fold', curve: 'round' }, { device: 'ring', freq: 5 }]);
  assert(bad.errs.length === 2, JSON.stringify(bad));
});

await check('the scanner of check:strudel skips the Kabelsalat expression in K(…)', () => {
  const c = [...scanCalls(`$: s("bd")${rackCode([newDevice('ring')], 'drums')}.gain(.5)`)].sort().join();
  assert(c === 'K,gain,s', c);
});

await check('radio voices: some get Fold in its ranges, none gets Ring (D6)', () => {
  const styles = loadStyles(), seen = { fold: 0, voices: 0 }, amounts = [];
  for (const seed of ['fx-a', 'fx-b', 'fx-c', 'fx-d']) {
    const ses = createSession(styles, seed);
    for (let i = 0; i < 12; i++) {
      const { song } = ses.next({ styles: ['berlin-techno', 'synthwave'], chaos: 0.8 });
      for (const t of song.tracks.filter(x => x.type === 'voice')) {
        seen.voices++;
        for (const d of t.rack || []) {
          assert(d.device !== 'ring', `${seed} song ${i}: a voice with Ring`);
          if (d.device !== 'fold') continue;
          seen.fold++; amounts.push(d.amount);
          assert(d.amount >= 0.3 && d.amount <= 1.2 && ['sharp', 'soft'].includes(d.curve), JSON.stringify(d));
        }
      }
    }
  }
  assert(seen.fold > 0 && seen.fold < seen.voices, `${seen.fold} folds over ${seen.voices} voices`);
  assert(new Set(amounts).size > 1, 'every voice gets the same Fold');
  return `${seen.fold} of ${seen.voices} voices`;
});

console.log(failed ? `${failed} check(s) failed` : 'all FM-like effect checks passed');
process.exit(failed ? 1 : 0);
