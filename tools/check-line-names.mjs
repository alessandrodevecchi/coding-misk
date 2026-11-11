// Line names (line-names, #82): pattern lines written with `$:` or with the instrument's name (`kick:`) play the same.
// No browser.
//   npm run check:line-names [-- --quick]     exit 1 when any check fails
// 1. Strudel 1.2.6 in Node: how labels behave (named lines, duplicates, a capital S, `_name:` and `name_:`, solo).
// 2. nameLines: unique lower-case names, marks kept, `$:` back with toDollar, reserved words, the setting per song.
// 3. Built-in and generated songs in Classic (Live build on and off), Crescendo and Live coder, written with `$:` and
//    with names: at every step the code is the same but for its labels, and its haps over two bars (from the code
//    evaluated, hidden tail included) are the same; the plan of the written part, the muted and alone lines and the
//    typing load (rushed steps) are reported for both forms.
import fs from 'node:fs';
import { strudelInNode } from './mixer-checks.mjs';
import { loadStyles } from './styles-dir.mjs';
import { fromScenes } from '../src/song/format.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps, deriveBuild } from '../src/song/build.js';
import { useFns } from '../src/song/writer.js';
import { typingLoad } from '../src/live/typing-load.js';
import { typingFrames, typingPlan } from '../src/song/typing.js';
import { createSession } from '../src/endless/director.js';
import { nameLines, toDollar, labelOf, isMuted, isAlone, lineNamesOf, safeName, muteLine, withMark, LINE } from '../src/song/line-names.js';

const quick = process.argv.includes('--quick');
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const S = await strudelInNode();
const onsets = async (code, from = 0, to = 1) => (await S.evaluate(code)).queryArc(from, to).filter(h => h.hasOnset()).map(h => h.value.s).sort().join(' ');

// ---------- 1. Strudel 1.2.6 ----------
const STRUDEL = [
  ['$: lines', '$: s("bd*2")\n$: s("hh*4")', 'bd bd hh hh hh hh'],
  ['named lines play like $:', 'kick: s("bd*2")\nhats: s("hh*4")', 'bd bd hh hh hh hh'],
  ['two lines with one name: only the last plays', 'bass: s("bd*2")\nbass: s("hh*4")', 'hh hh hh hh'],
  ['two equal $: lines both play', '$: s("bd*2")\n$: s("bd*2")', 'bd bd bd bd'],
  ['a name with a capital S plays alone', 'Snare: s("sd*2")\nkick: s("bd*2")', 'sd sd'],
  ['a lower-case s is a plain name', 'snare: s("sd*2")\nkick: s("bd*2")', 'bd bd sd sd'],
  ['S alone (one character) is a plain name', 'S: s("sd*2")\nkick: s("bd*2")', 'bd bd sd sd'],
  ['Sname: alone, like S$:', 'Skick: s("bd*2")\nhats: s("hh*4")', 'bd bd'],
  ['S$: and Sname: both alone', 'S$: s("bd*2")\nSkick: s("cp")\nhats: s("hh*4")', 'bd bd cp'],
  ['_name: muted', '_kick: s("bd*2")\nhats: s("hh*4")', 'hh hh hh hh'],
  ['name_: muted too', 'kick_: s("bd*2")\nhats: s("hh*4")', 'hh hh hh hh'],
  ['$: and names mixed', '$: s("bd*2")\nhats: s("hh*4")', 'bd bd hh hh hh hh'],
  ['a function name as a label is fine', 'note: s("bd*2")\ns: s("hh*4")', 'bd bd hh hh hh hh'],
  ['numbered names are different names', 'kick: s("bd")\nkick2: s("bd*2")', 'bd bd bd'],
  ['a duplicate keeps the place of the first, the pattern of the last', 'kick: s("bd")\nhats: s("hh")\nkick: s("cp")', 'cp hh'],
  ['a continuation line belongs to its label', 'pad: note("c3")\n  .s("sawtooth")\n_lead: s("hh")', 'sawtooth'],
];
for (const [what, code, want] of STRUDEL) { let got; try { got = await onsets(code); } catch (e) { got = `error: ${e.message}`; } check(got === want, `strudel: ${what}: ${got} (want ${want})`); }
for (const [what, code] of [['a reserved word', 'new: s("bd")'], ['a leading digit', '2kick: s("bd")'], ['a hyphen', 'kick-2: s("bd")']]) {
  let ok = false; try { await S.evaluate(code); } catch (e) { ok = true; }
  check(ok, `strudel: ${what} as a label should not evaluate`);
}

// ---------- 2. nameLines ----------
{
  const code = ['// ========== drums ==========', '$: s("bd*4").analyze("kick")', '$: s("hh*8").analyze("hats")', '_$: s("bd*2").analyze("kick")', 'S$: s("cr").analyze("fx")', '', '// ========== Strings · pad ==========', '$: note("c3")', '  .s("sawtooth").analyze("pad")', '$: note("e3").s("tri")', '// ========== Concrete · texture ==========', '$: s("metal").analyze("fx")', '$: silence'].join('\n');
  const n = nameLines(code), labels = n.split('\n').map(labelOf).filter(Boolean);
  check(labels.map(l => `${l.mark}${l.name}`).join() === 'kick,hats,_kick2,Scrash,pad,strings,texture,$', `nameLines: ${labels.map(l => `${l.mark}${l.name}`).join()}`);
  check(toDollar(n) === code, 'toDollar(nameLines(code)) is the code');
  const names = labels.filter(l => l.name !== '$').map(l => l.name);
  check(new Set(names).size === names.length, 'names unique');
  check(names.every(x => /^[a-z][a-z0-9]*$/.test(x)), 'names lower case');
  check(nameLines(n) === n, 'nameLines twice is nameLines once');
  check(safeName('new') === '' && safeName('Kick-2') === 'kick2' && safeName('9pad') === 'pad', 'safeName');
  check(muteLine('kick: s("bd")') === '_kick: s("bd")' && muteLine('$: s("bd")') === '_$: s("bd")' && withMark('_kick: x', '') === 'kick: x' && withMark('kick: x', 'S') === 'Skick: x', 'muteLine and withMark');
  check(isMuted('_kick: x') && !isMuted('kick: x') && isAlone('Skick: x') && !isAlone('snare: x'), 'isMuted and isAlone');
  check(!LINE.test('  bd:3 hh') && !LINE.test('// kick: x') && !LINE.test('const kick = 1') && LINE.test('kick: s("bd")'), 'LINE');
  // an already named line counts: a new kick line gets kick2
  check(nameLines('kick: s("bd").analyze("kick")\n$: s("bd").analyze("kick")').includes('kick2:'), 'a written name counts');
  // Random: half of the ids, the same for one id; a song's own choice wins
  const ids = Array.from({ length: 200 }, (_, i) => `song-${i}`), named = ids.filter(id => lineNamesOf('random', { id }) === 'names').length;
  check(named > 70 && named < 130, `random per song: ${named} of 200 named`);
  check(ids.every(id => lineNamesOf('random', { id }) === lineNamesOf('random', { id })), 'random is stable per id');
  check(lineNamesOf('random', { id: 'x', lineNames: 'dollar' }) === 'dollar' && lineNamesOf('names', {}) === 'names' && lineNamesOf(undefined, { id: 'x' }) === 'dollar', 'lineNamesOf');
}

// ---------- 3. songs in both forms ----------
const styles = Object.fromEntries(loadStyles().map(r => [r.id, r]));
const songFile = id => { const s = JSON.parse(fs.readFileSync(`songs/${id}.json`, 'utf8')); return s.scenes ? fromScenes(s) : s; };
const BUILTIN = process.env.LN_SONGS ? process.env.LN_SONGS.split(',') : quick ? ['luci-rosse', 'kellerlicht'] : ['luci-rosse', 'kellerlicht', 'ferro', 'ali-di-cenere', 'prova-voce-notte'];
const generated = [];
for (const [seed, st] of (quick ? [['lines-a', ['berlin-techno']]] : [['lines-a', ['berlin-techno']], ['lines-b', ['lo-fi', 'jazz']]])) {
  const g = createSession(loadStyles(), seed).next({ styles: st, minutes: 3 });
  generated.push({ ...g.song, id: g.song.id || seed });
}
const SONGS = [...BUILTIN.map(songFile), ...generated];
const PROFILES = quick ? ['written', 'switch'] : ['written', 'classic', 'crescendo', 'switch'];
const files = { say_it: Array.from({ length: 200 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 200 }, (_, i) => `say_en/${i}.wav`) };
function buildOf(s, profile) {
  if (profile === 'written') return { ...s, build: [] };
  const C = resolveProfile(profile);
  if (C.build !== 'crescendo') return { ...s, build: s.build || deriveBuild(s) };
  return crescendoSong(s, { narrated: C.narrated, rules: growthRules(C, { styles }) });
}
const FIELDS = ['s', 'note', 'n', 'gain', 'orbit', 'analyze', 'velocity', 'postgain', 'lpf'];
async function haps(L, code, bar) {
  globalThis.miskBuses = L.buses; useFns(L.fns);
  const p = await S.evaluate(L.run ? L.run(code) : code);
  return p.queryArc(bar, bar + 2).filter(h => h.hasOnset()).map(h => { const v = h.value && typeof h.value === 'object' ? h.value : { value: h.value }; return [h.whole.begin.valueOf().toFixed(6), ...FIELDS.map(k => (typeof v[k] === 'number' ? +v[k].toFixed(6) : v[k]))].join('|'); }).sort();
}
const rows = [];
for (const s of SONGS) {
  for (const profile of PROFILES) {
    const t0 = Date.now(), b = buildOf(s, profile), pid = profile === 'written' ? 'classic' : profile;
    const mk = names => liveCode(b, resolveProfile(pid, { names }), { lang: () => 'it', files: () => files });
    const D = mk('dollar'), N = mk('names');
    const bars = [...new Set([0, ...buildSteps(D.build).map(x => x.at)])].sort((x, y) => x - y);
    const pick = quick ? bars.filter((_, i) => i % 3 === 0) : bars;
    let hapsN = 0, textDiff = 0, hapDiff = 0, dupNames = 0, muted = 0, alone = 0, typedOk = 0, typedBad = 0, prevN = null, prevD = null, named = 0, typeD = 0, typeN = 0;
    for (const bar of pick) {
      const cd = D.codeAt(bar), cn = N.codeAt(bar);
      if (toDollar(cn) !== cd) { textDiff++; if (textDiff === 1) fails.push(`${s.id} ${profile} bar ${bar}: the named code is not the $: code with other labels`); }
      const labels = cn.split('\n').map(labelOf).filter(Boolean), names = labels.filter(l => l.name !== '$').map(l => l.name);
      named += names.length;
      if (new Set(names).size !== names.length) dupNames++;
      muted += cn.split('\n').filter(isMuted).length; alone += cn.split('\n').filter(isAlone).length;
      try {
        const hd = await haps(D, cd, bar), hn = await haps(N, cn, bar);
        hapsN += hd.length;
        if (hd.join('\n') !== hn.join('\n')) { hapDiff++; if (hapDiff === 1) fails.push(`${s.id} ${profile} bar ${bar}: haps differ (${hd.length} → ${hn.length})`); }
      } catch (e) { hapDiff++; fails.push(`${s.id} ${profile} bar ${bar}: evaluation failed: ${e.message}`); }
      // the typing from the code before reaches the code of the step
      if (prevN !== null) {
        const f = typingFrames(prevN, cn), half = f(0.5);
        // the typing ends on the code, and half-way no label runs into the call after it (`kick:s(`); a line cut
        // half-way (`pad:)`) is the typing's own, as with `$:`
        (f(1) === cn && toDollar(typingFrames(prevD, cd)(1)) === cd) ? typedOk++ : typedBad++;
        const odd = half.split('\n').find(l => /^\s*[_S]?[a-z][a-z0-9]*:[A-Za-z_$]/.test(l));
        if (odd !== undefined) { typedBad++; if (typedBad === 1) fails.push(`${s.id} ${profile} bar ${bar}: half-typed label: ${odd.slice(0, 60)}`); }
        typeD += typingPlan(prevD, cd, { style: 'human', lean: true, seed: s.id }).natural; typeN += typingPlan(prevN, cn, { style: 'human', lean: true, seed: s.id }).natural;
      }
      prevN = cn; prevD = cd;
    }
    check(!dupNames, `${s.id} ${profile}: ${dupNames} codes with a duplicate name`);
    check(!typedBad, `${s.id} ${profile}: ${typedBad} typings end away from the named code`);
    check(named > 0 || pick.length === 0, `${s.id} ${profile}: no named line`);
    let planSame = null, rushedD = null, rushedN = null;
    if (b.crescendo && b.crescendo.coder) {
      const pd = D.plan(), pn = N.plan(), j = p => JSON.stringify({ edits: [...(p.edits || [])], ahead: (p.ahead || []).map(a => ({ ...a, text: toDollar(a.text || '') })) });
      planSame = j(pd) === j(pn);
      check(planSame, `${s.id} ${profile}: the plan of the written part differs between the forms`);
    }
    if (b.crescendo && !quick) {
      const r = L => typingLoad(L, { seed: b.id || '' }).filter(x => x.ratio > 1.1).length;
      rushedD = r(D); rushedN = r(N);
    }
    rows.push({ song: s.id, profile, steps: pick.length, haps: hapsN, textDiff, hapDiff, muted, alone, named, planSame, rushedD, rushedN, typeD, typeN, ms: Date.now() - t0 });
    console.log(`  ${s.id.padEnd(22)} ${profile.padEnd(9)} steps ${String(pick.length).padStart(3)} haps ${String(hapsN).padStart(6)} named ${String(named).padStart(5)} muted ${String(muted).padStart(4)} alone ${String(alone).padStart(3)} text≠ ${textDiff} haps≠ ${hapDiff}${planSame === null ? '' : ` plan ${planSame ? '=' : '≠'}`}${rushedD === null ? '' : ` rushed $: ${rushedD} names ${rushedN}`} typing ${typeD ? `+${(100 * (typeN / typeD - 1)).toFixed(1)}%` : '-'} ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}
if (process.argv.includes('--json')) fs.writeFileSync(process.argv[process.argv.indexOf('--json') + 1], JSON.stringify(rows, null, 1));
if (fails.length) { console.log(`FAIL  line-names: ${fails.length}`); for (const f of fails.slice(0, 40)) console.log(`  ${f}`); process.exit(1); }
console.log(`ok    line-names: Strudel labels, nameLines, ${SONGS.length} songs × ${PROFILES.length} profiles the same in both forms`);
