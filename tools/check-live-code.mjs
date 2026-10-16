// Checks for the code a live build shows (code-writing): Classic and Crescendo keep their code (a fingerprint of the
// code at every step of some songs, per profile), comment options and presets. No browser.
//   npm run check:live-code             exit 1 when any check fails
//   npm run check:live-code -- --write  rewrite the fixtures (only when a change to that code is intended)
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps, deriveBuild } from '../src/song/build.js';
import { applyComments, commentPreset, COMMENT_PRESETS } from '../src/song/comments.js';
import { writeCode } from '../src/song/writer.js';
import { arpForm } from '../src/song/idiom.js';
import { patternVariants } from '../src/song/crescendo.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const FIXTURES = 'tools/fixtures/live-code.json';
const SONGS = ['crescendo-primo-passo', 'crescendo-notte-lunga', 'ferro', 'switch-prima-luce'];
const files = { say_it: Array.from({ length: 200 }, (_, i) => `say_it/${i}.wav`), say_en: Array.from({ length: 200 }, (_, i) => `say_en/${i}.wav`) };
const song = id => JSON.parse(fs.readFileSync(`songs/${id}.json`, 'utf8'));
// the code at every step of a song with a profile
function codes(id, profile) {
  const s = song(id), C = resolveProfile(profile);
  const b = C.build === 'crescendo' ? crescendoSong(s, { narrated: C.narrated, rules: C.growth === 'natural' ? { natural: true } : {} }) : { ...s, build: s.build || deriveBuild(s) };
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
    assert(resolveProfile('switch', { steps: true }).comments === 'custom' && resolveProfile('switch').comments === 'essential', 'profile preset');
  },
  'voice code hidden: not in the code shown, still in what plays'() {
    const code = '$: s("bd*4").gain(0.8).orbit(1).analyze("kick")\n\n// ========== voice ==========\n// "ciao", spoken on bar 1\n$: s("say_it").n(3).mask("<1>").postgain(0.6).orbit(15).analyze("fx")';
    const w = writeCode(code, { mode: 'full', voice: false });
    assert(!w.code.includes('say_it') && !w.code.includes('voice') && w.voice.includes('say_it'), w.code);
  },
  'Switch: the mixer takes bus, visual and the written level out of the lines'() {
    const list = codes('switch-prima-luce', 'switch'), last = list[list.length - 1];
    assert(!/\.orbit\(|\.analyze\(|\.distortvol\(/.test(list.join('\n')), 'technical functions shown');
    assert(!/say_it|say_en|spoken on bar/.test(list.join('\n')), 'voice code shown');
    assert(/\.drive\(/.test(last), 'drive');
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
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
