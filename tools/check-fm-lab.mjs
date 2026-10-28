// Checks for the FM lab of the Sounds tab (fm-groove-lab, task 1.3). No browser.
//   npm run check:fm-lab     exit 1 when any check fails
// 1. One card per FM kind of the material generator, names in both languages; a new FM kind without a card fails here.
// 2. Each card's patch passes fmInRange and lies inside its kind's rule in sound() (the ranges sound() draws for that
//    kind over many seeds, energies and track types), with a carrier sound() may pick.
// 3. The drawing: FM 0 is the plain carrier; a sine modulator matches the closed form of its phase; the patches with a
//    second operator match a fine numeric integration; the drawings stop at the card's maximum; 0.5 lights FM 1.
// 4. Every mode's line evaluates with Strudel in Node the way the page evaluates it and as transpiled code, with notes.
// 5. The FM rise: 64 sixteenths over 4 bars, the index from 0 to the card's maximum (within one step), always rising.
// 6. The preview expression of a card keeps its analyser and its orbit; the other previews keep none (the default).
// 7. "Use in track": the device of each card is a valid rack device.
import { FM_CARDS, FM_KINDS, LAB_MODES, LAB_ORBIT, LAB_ANALYZER, SHAPES, cardMax, cardLine, cardCode, cardDevice, drawAmounts, litAmount, fmWave, fmRise, cardHaystack } from '../src/sounds/fm-lab.js';
import { SOUND_KINDS, sound, fmInRange } from '../src/material/sound.js';
import { stream } from '../src/endless/random.js';
import { checkRack } from '../src/song/rack.js';
import { previewExpression, miniStrings } from '../src/player/preview.js';
import { strudelInNode } from './mixer-checks.mjs';

let failed = 0;
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) {
  try { const extra = await fn(); console.log(`ok    ${name}${extra ? ` (${extra})` : ''}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}

await check('one card per FM kind of the generator, names in Italian and English', () => {
  const kinds = FM_CARDS.map(c => c.kind);
  for (const k of SOUND_KINDS) {
    const r = stream(`fm-kind:${k}`, 'sound'), s = sound(r, { style: { sounds: [k] }, type: 'hook' });
    const hasFm = s.rack.length > 0;
    assert(hasFm === FM_KINDS.includes(k), `${k}: FM ${hasFm} but FM_KINDS says ${FM_KINDS.includes(k)}`);
    if (hasFm) assert(kinds.includes(k), `the FM kind "${k}" has no card in FM_CARDS (src/sounds/fm-lab.js)`);
  }
  assert(kinds.length === new Set(kinds).size && kinds.every(k => FM_KINDS.includes(k)), `cards ${kinds}`);
  for (const c of FM_CARDS) assert(c.name.it && c.name.en && cardHaystack(c).includes('fm'), `${c.kind}: names`);
  return `${kinds.length} cards`;
});

await check('each patch is in the range table and inside its kind\'s rule in sound()', () => {
  for (const c of FM_CARDS) {
    const d = cardDevice(c);
    assert(fmInRange(d), `${c.kind}: out of the range table ${JSON.stringify(d)}`);
    // what sound() draws for the kind on the card's track type, over seeds and energies
    const num = {}, set = {}, waves = new Set();
    for (let i = 0; i < 400; i++) {
      const r = stream(`fm-rule:${c.kind}:${i}`, 'sound'), s = sound(r, { style: { sounds: [c.kind] }, type: c.type, energy: (i % 11) / 10 });
      waves.add(s.settings.wave);
      for (const [k, v] of Object.entries(s.rack[0] || {})) {
        if (k === 'device') continue;
        if (typeof v === 'number') { const [lo, hi] = num[k] || [Infinity, -Infinity]; num[k] = [Math.min(lo, v), Math.max(hi, v)]; }
        (set[k] = set[k] || new Set()).add(v);
      }
    }
    assert(waves.has(c.carrier), `${c.kind}: carrier ${c.carrier}, sound() picks ${[...waves]}`);
    for (const [k, v] of Object.entries(c.fm)) {
      assert(set[k], `${c.kind}: ${k} is not in the kind's rule`);
      if (typeof v === 'number' && set[k].size > 6) assert(v >= num[k][0] - 1e-9 && v <= num[k][1] + 1e-9, `${c.kind}: ${k} ${v} outside ${num[k]}`);
      else assert(set[k].has(v) || (typeof v === 'number' && v >= num[k][0] && v <= num[k][1]), `${c.kind}: ${k} ${v} not in ${[...set[k]]}`);
    }
    for (const k of Object.keys(set)) assert(k in c.fm, `${c.kind}: the rule sets ${k}, the card does not`);
  }
});

await check('the drawing: FM 0 is the plain carrier, a sine modulator matches the closed form, two operators a fine integration', () => {
  let worst = 0;
  for (const c of FM_CARDS) {
    const w = fmWave(c, 0, { points: 240 }), shape = SHAPES[c.carrier];
    w.forEach((v, i) => assert(Math.abs(v - shape(i * 2 / 239)) < 1e-6, `${c.kind}: FM 0 point ${i} ${v}`));
    // (the phase is what the integration finds: compared through a sine carrier, so the jumps of a saw or a square
    // do not turn a tiny time difference into a large gap)
    const sc = { ...c, carrier: 'sine' }, sine = SHAPES.sine;
    for (const index of [0.5, 1, 2, 3]) {
      if (index > cardMax(c)) continue;
      const got = fmWave(sc, index, { points: 240 });
      let ref;
      if (!c.fm.index2 && c.fm.wave === 'sine') {
        // φ(u) = u − (I / 2π)(cos(2πhu) − 1): the carrier's phase in cycles of the note
        const h = c.fm.harmonicity;
        ref = got.map((_, i) => { const u = i * 2 / 239; return sine(u - (index / (2 * Math.PI)) * (Math.cos(2 * Math.PI * h * u) - 1)); });
      } else ref = fmWave(sc, index, { points: 240, sub: 400 });
      got.forEach((v, i) => { worst = Math.max(worst, Math.abs(v - ref[i])); });
    }
  }
  assert(worst < 0.02, `largest gap ${worst}`);
  return `largest gap ${worst.toExponential(1)}`;
});

await check('drawings at 0, 1, 2, 3 up to the card\'s maximum, the one nearest the amount lit', () => {
  for (const c of FM_CARDS) {
    const m = cardMax(c);
    assert(drawAmounts(c).every(a => a <= m) && drawAmounts(c)[0] === 0, `${c.kind}: ${drawAmounts(c)}`);
    assert(litAmount(c, 0.5) === 1 && litAmount(c, 0.4) === 0 && litAmount(c, 2.2) === 2, `${c.kind}: lit`);
    assert(c.fm.index <= m, `${c.kind}: index above the maximum`);
  }
});

const S = await strudelInNode();
await check('every mode\'s line evaluates as the page does and as transpiled code', async () => {
  let n = 0;
  for (const c of FM_CARDS) for (const mode of LAB_MODES) for (const a of [0, c.fm.index, cardMax(c)]) {
    const line = cardLine(c, mode, a);
    assert(!/\.orbit\(|\.analyze\(|\$:/.test(line), `${c.kind}/${mode}: ${line.slice(0, 80)}`);
    const page = new Function(`return (${miniStrings(line)});`)(), hp = page.queryArc(0, 4).filter(h => h.hasOnset());
    const ht = (await S.evaluate(line)).queryArc(0, 4).filter(h => h.hasOnset());
    assert(hp.length > 0 && hp.length === ht.length, `${c.kind}/${mode}: ${hp.length} haps, transpiled ${ht.length}`);
    assert(hp.every(h => h.value.fmh === c.fm.harmonicity), `${c.kind}/${mode}: fmh`);
    if (mode !== 'rise') assert(hp.every(h => Math.abs(h.value.fmi - a) < 1e-9), `${c.kind}/${mode}: fmi ${hp[0].value.fmi} not ${a}`);
    if (mode === 'held') assert(hp.length === 4 && hp.every(h => h.whole.end.valueOf() - h.whole.begin.valueOf() === 1), `${c.kind}: held notes`);
    n++;
  }
  return `${n} lines`;
});

await check('FM rise: 64 sixteenths over 4 bars, the index from 0 to the card\'s maximum, always rising', () => {
  for (const c of FM_CARDS) {
    const p = new Function(`return (${miniStrings(cardLine(c, 'rise'))});`)();
    for (const from of [0, 4]) {
      const hs = p.queryArc(from, from + 4).filter(h => h.hasOnset()).map(h => h.value.fmi);
      assert(hs.length === 64, `${c.kind}: ${hs.length} notes`);
      assert(Math.abs(hs[0]) < 1e-9 && Math.abs(hs[63] - cardMax(c)) <= 0.05, `${c.kind}: ${hs[0]} → ${hs[63]}`);
      assert(hs.every((v, i) => !i || v > hs[i - 1]), `${c.kind}: not rising`);
    }
  }
  assert(fmRise('note("a").fm(2).fmh(1)', 3) === `note("a").fm(saw.slow(4).range(0, ${Math.round(3 * 64 / 63 * 1000) / 1000})).fmh(1)`, 'fmRise text');
});

await check('the lab\'s expression keeps its analyser and orbit; the other previews keep none', () => {
  for (const c of FM_CARDS) for (const mode of LAB_MODES) {
    const e = previewExpression(cardCode(c, mode), { orbit: LAB_ORBIT, analyze: LAB_ANALYZER });
    assert(e && e.endsWith(`.orbit(${LAB_ORBIT}).analyze("${LAB_ANALYZER}")`) && !/setcpm|\$:/.test(e), `${c.kind}/${mode}: ${e && e.slice(-60)}`);
    assert(!/\.analyze\(/.test(previewExpression(cardCode(c, mode))), `${c.kind}/${mode}: analyser by default`);
  }
});

await check('"Use in track": each card\'s device is a valid rack device', () => {
  for (const c of FM_CARDS) for (const a of [0, c.fm.index, cardMax(c)]) {
    const errs = [];
    checkRack([cardDevice(c, a)], 'rack', (p, m) => errs.push(`${p}: ${m}`), () => {});
    assert(!errs.length, `${c.kind}: ${errs.join('; ')}`);
  }
});

console.log(failed ? `\n${failed} FM lab check(s) failed` : '\nall FM lab checks passed');
process.exit(failed ? 1 : 0);
