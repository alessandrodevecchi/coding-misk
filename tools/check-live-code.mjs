// Checks for the code a live build shows (code-writing): Classic and Crescendo keep their code (a fingerprint of the
// code at every step of some songs, per profile), comment options and presets. No browser.
//   npm run check:live-code             exit 1 when any check fails
//   npm run check:live-code -- --write  rewrite the fixtures (only when a change to that code is intended)
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps, deriveBuild } from '../src/song/build.js';
import { applyComments, commentPreset, COMMENT_PRESETS } from '../src/song/comments.js';
import { writeCode } from '../src/song/writer.js';
import { arpForm } from '../src/song/idiom.js';
import { patternVariants } from '../src/song/crescendo.js';
import { chainLines, typingPlan, settleOthers } from '../src/song/typing.js';
import { AHEAD } from '../src/live/written-plan.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const FIXTURES = 'tools/fixtures/live-code.json';
const SONGS = ['crescendo-primo-passo', 'crescendo-notte-lunga', 'ferro', 'switch-prima-luce'];
const files = { say_it: Array.from({ length: 200 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 200 }, (_, i) => `say_en/${i}.wav`) };
const song = id => JSON.parse(fs.readFileSync(`songs/${id}.json`, 'utf8'));
// the code at every step of a song with a profile
function codes(id, profile, over = {}) {
  const s = song(id), C = resolveProfile(profile, over);
  const b = C.build === 'crescendo' ? crescendoSong(s, { narrated: C.narrated, rules: growthRules(C) }) : { ...s, build: s.build || deriveBuild(s) };
  const L = liveCode(b, C, { lang: () => 'it', files: () => files, cols: () => 60 });
  return [0, ...new Set(buildSteps(L.build).map(x => x.at))].map(bar => L.codeAt(bar));
}
const print = list => createHash('sha256').update(list.join('\n\u0000\n')).digest('hex').slice(0, 16);
const CHECKS = {
  'Classic and Crescendo keep their code'() {
    const now = Object.fromEntries(SONGS.flatMap(id => ['classic', 'crescendo'].map(p => [`${id} ${p}`, print(codes(id, p))])));
    if (process.argv.includes('--write')) { fs.writeFileSync(FIXTURES, JSON.stringify(now, null, 2) + '\n'); return; }
    const old = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
    const changed = Object.keys(now).filter(k => old[k] !== now[k]);
    assert(!changed.length, `code changed: ${changed.join(', ')}`);
  },
  'comment options: each one hides its comments; presets are sets of options'() {
    const code = ['// coding-misk · Prova', '// Intro · bars 1-8', 'setcpm(138/4)', 'const section1 = "<1!8>"  // Intro · 8 bars', '', '// ========== drums ==========', '// > just a kick', '// Intro · bars 1-8 · pattern A', '$: s("bd*4")'].join('\n');
    const o = x => applyComments(code, { title: true, ...COMMENT_PRESETS.all, ...x });
    assert(!o({ steps: false }).includes('// >') && o({ steps: false }).includes('pattern A'), 'steps');
    assert(!o({ notes: false }).includes('pattern A') && !o({ notes: false }).includes('8 bars') && o({ notes: false }).includes('// >'), 'notes');
    assert(!o({ tracks: false }).includes('=====') && o({ tracks: false }).includes('// >'), 'tracks');
    for (const k of ['all', 'essential', 'none']) assert(applyComments(code, { title: true, comments: k }) === applyComments(code, { title: true, ...COMMENT_PRESETS[k] }) && commentPreset(COMMENT_PRESETS[k]) === k, k);
    assert(commentPreset({ tracks: true, notes: false, steps: true }) === 'custom', 'custom');
    assert(resolveProfile('switch', { steps: true }).comments === 'custom' && resolveProfile('switch').comments === 'none', 'profile preset');
  },
  'Live coder: only the title as comments (radio-profiles 9.2); the track names come back with the option'() {
    const list = codes('switch-prima-luce', 'switch'), all = list.join('\n');
    assert(list.every(c => c.startsWith('// coding-misk')) && !/^\/\/ =+ .* =+$/m.test(all) && !/^\s*\/\/ >/m.test(all), 'comments besides the title');
    assert(/^\/\/ =+ .* =+$/m.test(codes('switch-prima-luce', 'switch', { tracks: true }).join('\n')), 'track names with tracks on');
  },
  'voice code hidden: not in the code shown, still in what plays'() {
    const code = '$: s("bd*4").gain(0.8).orbit(1).analyze("kick")\n\n// ========== voice ==========\n// "ciao", spoken on bar 1\n$: s("say_it").n(3).mask("<1>").postgain(0.6).orbit(15).analyze("fx")';
    const w = writeCode(code, { mode: 'full', voice: false });
    assert(!w.code.includes('say_it') && !w.code.includes('voice') && w.voice.includes('say_it'), w.code);
  },
  'Live coder: the mixer takes bus, visual and the written level out of the lines'() {
    const list = codes('switch-prima-luce', 'switch');
    assert(!/\.orbit\(|\.analyze\(|\.distortvol\(/.test(list.join('\n')), 'technical functions shown');
    assert(!/say_it|say_en|spoken on bar/.test(list.join('\n')), 'voice code shown');
    // with no comments at all the voice stays hidden too
    const none = codes('switch-prima-luce', 'switch', { tracks: false, notes: false, steps: false });
    assert(!/say_it|say_en/.test(none.join('\n')), 'voice code shown with no comments');
    // distortion with its volume: .crunch() (with the mixer preset; compact may fold it into a song function)
    const mixer = codes('switch-prima-luce', 'switch', { functions: 'mixer' });
    assert(/\.crunch\(/.test(mixer[mixer.length - 1]) && !/\.drive\(|\.o\(/.test([...list, ...mixer].join('\n')), 'crunch');
    assert(list.join('\n').length < mixer.join('\n').length, 'compact not shorter than mixer');
    // a level that is not the written one stays on its line
    const w = writeCode('$: s("bd*4").gain(0.7).orbit(1).analyze("kick")\n$: s("hh*8").gain(0.4).orbit(1).analyze("hats")', { mode: 'mixer', written: new Map([['"kick"', 0.85], ['"hats"', 0.4]]) });
    assert(w.code === '$: s("bd*4").gain(0.7)\n$: s("hh*8")', w.code);
  },
  'arpeggio: one order for every chord becomes .arp(), different orders stay as written'() {
    const a = arpForm('<[a3 c4 e4 a4 e4 c4 a3 e4] [f3 a3 c4 f4 c4 a3 f3 c4]>');
    assert(a && a.chords === '<[a3,c4,e4,a4] [f3,a3,c4,f4]>' && a.order === '0 1 2 3 2 1 0 2', JSON.stringify(a));
    assert(arpForm('<[a3 c4 e4 a4] [f3 c4 a3 f4]>') === null, 'different orders');
    assert(arpForm('<[a3 ~ a3 ~]>') === null, 'one note');
  },
  'arpeggio growth (natural): one note, then root and fifth, then the written order'() {
    const v = patternVariants('arp', { notes: '0 1 2 3 2 1 0 2' }, 3, { natural: true }).map(x => x.notes);
    assert(v[2] === '0 ~ ~ ~ ~ ~ ~ ~' && /^[02~ ]+$/.test(v[0]) && /2/.test(v[1]), v.join(' | '));
    assert(patternVariants('arp', { notes: '0 1 2 3 2 1 0 2' }, 3)[0].notes !== v[0], 'Crescendo keeps its own variants');
  },
};

// reused-lines: a Live coder growth as Compose grows it (the built-in styles), with the default controls, its code at the
// steps (80 columns)
const STYLES = Object.fromEntries(fs.readdirSync('styles').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`styles/${f}`, 'utf8'))).map(r => [r.id, r]));
function live(id, over = {}) {
  const C = resolveProfile('switch', over), b = crescendoSong(song(id), { narrated: C.narrated, rules: growthRules(C, { styles: STYLES }) });
  const L = liveCode(b, C, { lang: () => 'en', cols: () => 80 }), bars = [0, ...new Set(buildSteps(L.build).map(x => x.at))].sort((x, y) => x - y);
  return { L, bars, at: bar => chainLines(L.codeAt(bar)), before: bar => bars.filter(x => x < bar).pop() };
}
const muted = l => /^\s*_\$:/.test(l), unmute = l => l.replace(/^(\s*)_\$:/, '$1$:');
const CHECKS_REUSED = {
  'reused-lines D1, D4: kellerlicht keeps its acid line muted from bar 280 and edits it while muted, bar 320 only unmutes it'() {
    const K = live('kellerlicht'), acid = l => l.includes('[a4 a3] c4');
    const a280 = K.at(280).filter(acid), a312 = K.at(312).filter(acid), a320 = K.at(320).filter(acid);
    assert(a280.length === 1 && muted(a280[0]), `bar 280: ${a280.join(' | ').slice(0, 200)}`);
    assert(a312.length === 1 && muted(a312[0]) && a320.length === 1 && !muted(a320[0]) && unmute(a312[0]) === a320[0], `bar 312 should show the bar-320 form muted:\n${a312[0]}\n${a320[0]}`);
    assert(a280[0] !== a312[0], 'the line is not edited while muted');
  },
  'reused-lines D2: kellerlicht keeps the rolling bass muted beside the held bass and unmutes it at Druck (bar 360)'() {
    const K = live('kellerlicht'), roll = l => /note\("<a1!3 a#1>"\)/.test(l), hold = l => l.includes('"<57 58 57 55>"');
    const n = K.at(344), d = K.at(360);
    assert(n.some(l => roll(l) && muted(l)) && n.some(l => hold(l) && !muted(l)), `Nebel (bar 344): ${n.filter(l => roll(l) || hold(l)).join(' | ').slice(0, 300)}`);
    const r344 = n.find(roll), r360 = d.find(roll);
    assert(r360 && !muted(r360) && n.indexOf(r344) < n.indexOf(n.find(hold)), 'the rolling bass above the held bass, unmuted at Druck');
    const p = typingPlan(settleOthers(K.L.codeAt(K.before(360)), K.L.codeAt(360), 360), K.L.codeAt(360), { style: 'human', lean: true, seed: 'kellerlicht', notes: false });
    assert(!p.lines.some(x => roll(x.text) && x.how === 'typed'), 'the rolling bass is typed again at Druck');
  },
  'reused-lines D8: a line typed ahead shows muted from its step, its own step only unmutes it; the limits hold'() {
    // the default limits (AHEAD, Balanced: lines-ahead-balanced D1) type ahead on switch-prima-luce and crescendo-filo-di-luce
    assert(!globalThis.codingMiskAhead, 'the check runs with the default limits');
    for (const id of ['switch-prima-luce', 'crescendo-filo-di-luce']) {
      const S = live(id), a = S.L.ahead();
      assert(a.length >= 1, `no line typed ahead on ${id} with the default limits`);
      for (const x of a) {
        const to = S.at(x.to), from = S.at(x.from), prev = S.at(S.before(x.from));
        const line = from.filter(muted).find(l => to.includes(unmute(l)) && !prev.some(p => unmute(p) === unmute(l)));
        assert(line, `${id} bar ${x.from}: no muted line that plays at bar ${x.to}`);
        for (const b of S.bars.filter(b => b >= x.from && b < x.to)) assert(S.at(b).includes(line), `${id} bar ${b}: the line ahead is not shown muted`);
        const p = typingPlan(settleOthers(S.L.codeAt(S.before(x.to)), S.L.codeAt(x.to), x.to), S.L.codeAt(x.to), { style: 'human', lean: true, seed: id, notes: false });
        assert(!p.lines.some(y => unmute(y.text) === unmute(line)), `${id} bar ${x.to} types the line again`);
      }
    }
    // limits: at most AHEAD.atOnce at once, one per track and per step, not at bar 0, at most AHEAD.bars ahead, none added on a
    // step that shows AHEAD.muted or more muted lines
    for (const id of ['switch-prima-luce', 'crescendo-filo-di-luce', 'kellerlicht', 'luci-rosse']) {
      const T = live(id), A = T.L.ahead();
      for (const b of T.bars) {
        const on = A.filter(x => x.from <= b && b < x.to);
        assert(on.length <= AHEAD.atOnce && new Set(on.map(x => x.header)).size === on.length, `${id} bar ${b}: ${on.length} lines ahead`);
      }
      assert(new Set(A.map(x => x.from)).size === A.length, `${id}: two lines ahead added at one step`);
      for (const x of A) {
        assert(x.from > 0 && x.to > x.from && x.to - x.from <= AHEAD.bars, `${id}: a line ahead from ${x.from} to ${x.to}`);
        assert(T.at(x.from).filter(muted).length - A.filter(y => y.from <= x.from && x.from < y.to).length < AHEAD.muted, `${id} bar ${x.from}: a line ahead with ${AHEAD.muted} muted lines shown`);
      }
    }
  },
};
Object.assign(CHECKS, CHECKS_REUSED);
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
