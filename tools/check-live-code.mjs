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
import { barSeconds } from '../src/live/typing-load.js';
import { widgetSettings, placeWidgets, stripWidgets, instrumentOf } from '../src/live/widgets.js';
import { lineKey } from '../src/song/writer.js';
import { compileSong } from '../src/song/compile.js';

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
    // the default limits (AHEAD, Balanced: lines-ahead-balanced D1) type ahead in the written part of switch-prima-luce
    // and crescendo-filo-di-luce, and at a growth step of crescendo-notte-lunga (D2)
    assert(!globalThis.codingMiskAhead, 'the check runs with the default limits');
    let inGrowth = 0;
    for (const id of ['switch-prima-luce', 'crescendo-filo-di-luce', 'crescendo-notte-lunga']) {
      const S = live(id), a = S.L.ahead(), G = S.L.build.crescendo.growth;
      assert(a.length >= 1, `no line typed ahead on ${id} with the default limits`);
      for (const x of a) {
        if (x.from < G) inGrowth++;
        const to = S.at(x.to), from = S.at(x.from), prev = S.at(S.before(x.from));
        const line = from.filter(muted).find(l => to.includes(unmute(l)) && !prev.some(p => unmute(p) === unmute(l)));
        assert(line, `${id} bar ${x.from}: no muted line that plays at bar ${x.to}`);
        for (const b of S.bars.filter(b => b >= x.from && b < x.to)) assert(S.at(b).includes(line), `${id} bar ${b}: the line ahead is not shown muted`);
        const p = typingPlan(settleOthers(S.L.codeAt(S.before(x.to)), S.L.codeAt(x.to), x.to), S.L.codeAt(x.to), { style: 'human', lean: true, seed: id, notes: false });
        assert(!p.lines.some(y => unmute(y.text) === unmute(line)), `${id} bar ${x.to} types the line again`);
      }
    }
    assert(inGrowth >= 1, 'no line typed ahead at a growth step (lines-ahead-balanced D2)');
    // limits, at every step of every built-in song: at most AHEAD.atOnce at once, one per track and per step, not at bar
    // 0, at most AHEAD.bars ahead, none added on a step that shows AHEAD.muted or more muted lines, none on a rushed step
    // (the step's typing with the line ahead fits its time)
    const ids = JSON.parse(fs.readFileSync('songs/index.json', 'utf8')).map(x => (typeof x === 'string' ? x : x.id));
    for (const id of ids) {
      const T = live(id), A = T.L.ahead(), sb = barSeconds(T.L.build);
      for (const b of T.bars) {
        const on = A.filter(x => x.from <= b && b < x.to);
        assert(on.length <= AHEAD.atOnce && new Set(on.map(x => x.header)).size === on.length, `${id} bar ${b}: ${on.length} lines ahead`);
      }
      assert(new Set(A.map(x => x.from)).size === A.length, `${id}: two lines ahead added at one step`);
      for (const x of A) {
        assert(x.from > 0 && x.to > x.from && x.to - x.from <= AHEAD.bars, `${id}: a line ahead from ${x.from} to ${x.to}`);
        assert(T.at(x.from).filter(muted).length - A.filter(y => y.from <= x.from && x.from < y.to).length < AHEAD.muted, `${id} bar ${x.from}: a line ahead with ${AHEAD.muted} muted lines shown`);
        const prev = T.before(x.from), code = T.L.codeAt(x.from), was = settleOthers(T.L.codeAt(prev), code, x.from);
        const avail = Math.max(0.2, (x.from - prev - 0.5) * sb - 0.2), usable = Math.max(0.2, avail - Math.min(avail * 0.5, 2));
        const need = typingPlan(was, code, { style: 'human', lean: true, seed: id, notes: false }).natural;
        assert(need / usable <= 1.1, `${id} bar ${x.from}: a line ahead on a rushed step (${need.toFixed(1)} s in ${usable.toFixed(1)} s)`);
      }
    }
  },
};
// code widgets (code-widgets): which lines get a widget, how many, which widget; the code without widgets unchanged
const WCALL = /\._(scope|pianoroll|punchcard|spectrum|spiral|pitchwheel)\(\)/g;
const calls = code => [...code.matchAll(WCALL)].map(m => m[1]);
function widgetCodes(id, profile, over = {}, opts = {}) {
  const s = song(id), C = resolveProfile(profile), S = { on: true, ...over };
  const b = C.build === 'crescendo' ? crescendoSong(s, { narrated: C.narrated, rules: growthRules(C, { styles: STYLES }) }) : { ...s, build: s.build || deriveBuild(s) };
  const W = liveCode(b, C, { lang: () => 'en', cols: () => 80, widgets: () => S }), P = liveCode(b, C, { lang: () => 'en', cols: () => 80 });
  const bars = opts.bars || [0, ...new Set(buildSteps(W.build).map(x => x.at))].sort((x, y) => x - y);
  return { W, P, bars, at: bar => W.codeAt(bar), plain: bar => P.codeAt(bar), build: W.build };
}
const sectionStarts = b => { const out = []; let a = 0; for (const x of b.sections) { out.push(a); a += x.bars; } return out; };
const CHECKS_WIDGETS = {
  'code widgets: off by default, the code without widgets is the code of before, line keys ignore the calls'() {
    assert(widgetSettings(null).on === false && widgetSettings(null).max === 3 && widgetSettings(null).share === 25 && widgetSettings(null).window === 16, 'defaults');
    const T = widgetCodes('luci-rosse', 'classic');
    for (const b of T.bars) assert(stripWidgets(T.at(b)) === T.plain(b), `luci-rosse bar ${b}: stripping the widgets does not give the code without them`);
    assert(liveCode({ ...song('luci-rosse'), build: deriveBuild(song('luci-rosse')) }, resolveProfile('classic'), { widgets: () => ({ on: false }) }).codeAt(0) === T.plain(0), 'off');
    assert(lineKey('$: s("bd*4")._scope()') === lineKey('$: s("bd*4")') && lineKey('$: s("bd*4")\n  ._pianoroll({ labels: 1 })') === lineKey('$: s("bd*4")'), 'lineKey');
  },
  'code widgets: same song same widgets; the count varies by section and never passes the maximum'() {
    for (const [id, profile] of [['luci-rosse', 'classic'], ['kellerlicht', 'switch'], ['crescendo-notte-lunga', 'crescendo']]) {
      for (const max of [2, 3]) {
        const T = widgetCodes(id, profile, { max }), T2 = widgetCodes(id, profile, { max }), counts = new Set();
        for (const b of sectionStarts(T.build)) {
          const c = T.at(b), n = calls(c).length;
          assert(c === T2.at(b), `${id} bar ${b}: not repeatable`);
          assert(n <= max, `${id} ${profile} bar ${b}: ${n} widgets over ${max}`);
          counts.add(n);
        }
        assert(counts.size > 1, `${id} ${profile} max ${max}: the same count in every section (${[...counts]})`);
      }
    }
  },
  'code widgets: default mapping and slot order; fx and voice off; spiral and pitchwheel off'() {
    const one = (line, S = {}) => calls(placeWidgets(line, { S: widgetSettings({ on: true, share: 0, ...S }) }));
    assert(one('$: note("a1").s("sawtooth").analyze("bass")')[0] === 'scope', 'bass scope');
    assert(one('$: note("a4").s("square").analyze("hook")')[0] === 'pianoroll', 'lead pianoroll');
    assert(one('$: s("hh*8").analyze("hats")')[0] === 'pianoroll' && one('$: s("bd*4").analyze("kick")')[0] === 'scope', 'hats and drums');
    assert(!one('$: s("cr").analyze("fx")').length && !one('$: s("say_it").n(3).analyze("fx")').length, 'fx and voice off');
    assert(one('$: note("a4").s("square").analyze("hook")', { widgets: { pianoroll: false } })[0] === 'scope', 'lead with pianoroll off takes scope');
    assert(one('$: note("a4").s("square").analyze("hook")', { roll: 'punchcard' })[0] === 'punchcard', 'punchcard');
    const S = widgetSettings({ on: true, share: 0 }), all = ['drums', 'hats', 'bass', 'lead', 'arp', 'pad'].flatMap(k => [S.instruments[k].primary, ...S.instruments[k].secondary]);
    assert(!all.includes('spiral') && !all.includes('pitchwheel') && !S.params.labels && !S.params.smear, 'spiral, pitchwheel, labels, smear off');
    assert(one('$: note("c4 e4").analyze("arp")', { widgets: { spiral: true }, instruments: { arp: { on: true, primary: 'spiral', secondary: ['scope'] } } })[0] === 'spiral', 'spiral as the arp\'s primary');
    const code = ['$: note("a4").analyze("hook")', '$: s("bd*4").analyze("kick")', '$: note("a1").analyze("bass")', '$: s("hh*8").analyze("hats")', '$: note("c4").analyze("pad")'].join('\n');
    const lines = (S2, n = 5) => placeWidgets(code, { S: widgetSettings({ on: true, max: n, share: 0, ...S2 }), sections: 1, seed: 'x' }).split('\n').filter(l => WCALL.test(l) && !(WCALL.lastIndex = 0)).map(l => l.match(/analyze\("(\w+)"\)/)[1]);
    // the first section's count is drawn by the seed: compare orders with a song of one section and the maximum 1
    assert(lines({}, 1).join() === 'bass', `max 1 goes to bass: ${lines({}, 1)}`);
    assert(lines({ order: ['drums', 'bass'] }, 1).join() === 'kick', `drums first in the order: ${lines({ order: ['drums', 'bass'] }, 1)}`);
    assert(!lines({ instruments: { bass: { on: false } } }, 1).includes('bass'), 'bass off gives its slot away');
    assert(!lines({ instruments: { hats: { on: false } } }, 5).includes('hats'), 'hats off');
  },
  'code widgets: about one widget in four is secondary over the built-in songs; none with share 0'() {
    const ids = JSON.parse(fs.readFileSync('songs/index.json', 'utf8')).map(x => (typeof x === 'string' ? x : x.id)).slice(0, 14);
    let prim = 0, sec = 0, sec0 = 0;
    for (const id of ids) {
      const s = song(id); if (s.kind && s.kind !== 'composed' && !s.tracks) continue;
      const code = compileSong(s), S = widgetSettings({ on: true, max: 8 }), S0 = widgetSettings({ on: true, max: 8, share: 0 });
      const meta = { sections: s.sections.length };
      for (let k = 0, a = 0; k < s.sections.length; a += s.sections[k].bars, k++) {
        const one = (SS) => chainLinesW(placeWidgets(code, { S: SS, bar: a, section: k, sections: meta.sections, seed: id })).filter(l => WCALL.test(l) && !(WCALL.lastIndex = 0));
        for (const l of one(S)) { const inst = instrumentOf(l), w = l.match(/\._(\w+)\(\)/)[1]; if (w === S.instruments[inst].primary) prim++; else sec++; }
        for (const l of one(S0)) { const inst = instrumentOf(l), w = l.match(/\._(\w+)\(\)/)[1]; if (w !== S0.instruments[inst].primary) sec0++; }
      }
    }
    const share = sec / (prim + sec);
    assert(prim + sec > 40 && share > 0.12 && share < 0.4, `secondary share ${(share * 100).toFixed(0)}% of ${prim + sec}`);
    assert(sec0 === 0, `share 0 gave ${sec0} secondary widgets`);
  },
  'code widgets: Classic puts a widget only on the line of its track that plays now'() {
    const T = widgetCodes('luci-rosse', 'classic', { max: 8 });
    for (const [b, k] of sectionStarts(T.build).map((b, k) => [b, k + 1])) {
      for (const l of chainLinesW(T.at(b)).filter(l => WCALL.test(l) && !(WCALL.lastIndex = 0))) {
        const m = l.match(/\.mask\((section\d+)\)/);
        assert(!m || m[1] === `section${k}`, `bar ${b}: a widget on a line of ${m && m[1]}`);
      }
    }
  },
  'code widgets: a muted line keeps its widget only when it returns within the window, and takes a slot'() {
    // kellerlicht in Live coder: the acid line is muted from bar 280 and returns at 320 (reused-lines D1)
    const acid = l => l.includes('[a4 a3] c4');
    const at = (win, bar) => { const T = widgetCodes('kellerlicht', 'switch', { max: 8, window: win, order: ['lead', 'arp', 'bass', 'drums', 'hats', 'pad', 'fx', 'voice'] }, { bars: [bar] }); return chainLinesW(T.at(bar)).filter(acid); };
    const has = (win, bar) => at(win, bar).some(l => WCALL.test(l) && !(WCALL.lastIndex = 0));
    assert(at(16, 312).every(l => /^\s*_\$:/.test(l)) && at(16, 312).length, 'bar 312: the acid line is muted');
    assert(has(16, 312) && !has(8, 296) && has('always', 296), `windows: 16 at 312 ${has(16, 312)}, 8 at 296 ${has(8, 296)}, always at 296 ${has('always', 296)}`);
    assert(has(32, 296) && !has(16, 296), 'window 32 keeps it 24 bars before, 16 does not');
    const muted = '_$: note("a1").analyze("bass")\n$: note("a4").analyze("hook")\n$: s("bd*4").analyze("kick")';
    const n = placeWidgets(muted, { S: widgetSettings({ on: true, max: 2, share: 0 }), sections: 1, seed: 'a', returns: () => true });
    assert(calls(n).length <= 2 && /^_\$:.*_scope\(\)/m.test(n) && calls(n).length === Math.min(2, calls(n).length), `muted bass takes a slot: ${n}`);
  },
};
const chainLinesW = c => chainLines(c);
Object.assign(CHECKS, CHECKS_REUSED, CHECKS_WIDGETS);
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
