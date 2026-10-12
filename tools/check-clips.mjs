// Checks for fragments (#57): vertical layouts, the fragment picker (lively parts, no overlap, bar lines, repeatable),
// times, label and glitch messages, and the texts for sharing. No browser.
//   npm run check:clips      exit 1 when any check fails
import { readFileSync } from 'node:fs';
import { V_LAYOUTS, V_QUALITY, verticalAreas } from '../src/video/layout.js';
import { pickFragments, fragmentBetween, parseTime, clockOf, barScores, sectionWeight, fragmentCode, fragmentLabel, glitchMessages, glitchAt, shapeOf } from '../src/video/fragments.js';
import { textsFor } from '../src/video/texts.js';
import { absoluteClips } from '../src/endless/transitions.js';
import { tempoClock } from '../src/render/tempo.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const inside = (a, w, h) => a.x >= 0 && a.y >= 0 && a.x + a.w <= w && a.y + a.h <= h && a.w > 0 && a.h > 0;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const song = JSON.parse(readFileSync(new URL('../songs/kellerlicht.json', import.meta.url)));
const shape = shapeOf(song, absoluteClips), bpm = song.sections.flatMap(s => Array(s.bars).fill(s.bpm || 120));
// a long synthetic session: 40 sections of 16 bars, quiet intros and outros, busy drops
const longShape = { bars: 640, sections: [], tracks: [] };
for (let i = 0; i < 40; i++) {
  const kind = ['Intro', 'Build', 'Drop', 'Outro'][i % 4];
  longShape.sections.push({ label: `${Math.floor(i / 4) + 1} ${kind}`, start: i * 16, len: 16 });
  const busy = { Intro: 1, Build: 3, Drop: 5, Outro: 1 }[kind];
  for (let t = 0; t < busy; t++) longShape.tracks.push({ type: 'drums', clips: [{ start: i * 16, bars: 16 }] });
}
const longBpm = Array(640).fill(124);

const CHECKS = {
  'vertical layouts: parts inside 1080×1920, no overlap'() {
    for (const l of V_LAYOUTS) {
      const A = verticalAreas(l, V_QUALITY.w, V_QUALITY.h), parts = Object.entries(A);
      parts.forEach(([n, a]) => assert(inside(a, 1080, 1920), `${l} ${n} inside`));
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert(!overlap(parts[i][1], parts[j][1]), `${l} ${parts[i][0]}/${parts[j][0]}`);
    }
    assert(verticalAreas('v-bands', 1080, 1920).stage.w === 1080 && verticalAreas('v-bands', 1080, 1920).stage.h === 1080, 'square stage');
    assert(verticalAreas('v-code', 1080, 1920).code && !verticalAreas('v-code', 1080, 1920).soul, 'code below');
    assert(verticalAreas('v-soul-bands', 1080, 1920).soul && !verticalAreas('v-soul-bands', 1080, 1920).stage, 'soul in the middle');
  },
  'section weights: drops above verses above intros'() {
    assert(sectionWeight('3 Drop') > sectionWeight('Verse') && sectionWeight('Verse') > sectionWeight('1 Intro') && sectionWeight('Outro') < .5, 'weights');
  },
  'bar scores: busy bars score more, session edges score zero'() {
    const s = barScores(longShape);
    assert(s[40] > s[20] && s[40] > s[56], 'drop above build and outro');
    assert(s[0] === 0 && s[639] === 0, 'edges');
  },
  'random fragments: count, length, no overlap, on bar lines'() {
    const T = tempoClock(longBpm), f = pickFragments(longShape, longBpm, { n: 5, length: 30, seed: 'a' });
    assert(f.length === 5, `count ${f.length}`);
    f.forEach(x => { assert(Math.abs(x.end - x.start - 30) < 1e-6, 'length'); assert(Math.abs(T.seconds(x.bar) - x.start) < 1e-6, 'bar line'); });
    for (let i = 1; i < f.length; i++) assert(f[i].start >= f[i - 1].end - 1e-6, 'no overlap');
  },
  'random fragments: prefer lively parts'() {
    let drop = 0, all = 0;
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) for (const x of pickFragments(longShape, longBpm, { n: 4, length: 15, seed })) {
      all++; if (/Drop|Build/.test(longShape.sections[Math.floor(x.bar / 16)].label)) drop++;
    }
    assert(drop / all >= 0.8, `${drop}/${all} in drops or builds`);
  },
  'random fragments: same seed same fragments, other seed others'() {
    const a = JSON.stringify(pickFragments(shape, bpm, { n: 3, length: 15, seed: 'x' })), b = JSON.stringify(pickFragments(shape, bpm, { n: 3, length: 15, seed: 'x' })), c = JSON.stringify(pickFragments(shape, bpm, { n: 3, length: 15, seed: 'y' }));
    assert(a === b && a !== c, 'repeatable');
  },
  'random fragments: as many as fit'() {
    const f = pickFragments(shape, bpm, { n: 50, length: 60, seed: 'z' }), total = tempoClock(bpm).seconds(shape.bars);
    assert(f.length > 0 && f.length <= Math.floor(total / 60), `${f.length} of 60 s in ${total.toFixed(0)} s`);
  },
  'between two times: exact, errors'() {
    const total = tempoClock(bpm).seconds(shape.bars);
    const ok = fragmentBetween(shape, bpm, 40, 70);
    assert(ok.start === 40 && ok.end === 70, 'exact');
    assert(fragmentBetween(shape, bpm, 70, 40).error === 'order' && fragmentBetween(shape, bpm, 10, total + 5).error === 'range' && fragmentBetween(shape, bpm, 10, 10.5).error === 'short', 'errors');
  },
  'times: parse and print'() {
    assert(parseTime('12:40') === 760 && parseTime('1:02:03') === 3723 && parseTime('90') === 90 && Number.isNaN(parseTime('ab')), 'parse');
    assert(clockOf(760) === '12:40' && clockOf(3723) === '1:02:03', 'print');
  },
  'label: code from source and start, number padded'() {
    const c = fragmentCode('kellerlicht', 40);
    assert(/^[0-9A-Z]{5}$/.test(c) && !/[OIBSZ]/.test(c), c);
    assert(c === fragmentCode('kellerlicht', 40) && c !== fragmentCode('kellerlicht', 41), 'stable and different');
    assert(fragmentLabel(c, 14) === `FRAGMENT S0UL·${c} #014`, fragmentLabel(c, 14));
  },
  'glitch: messages by code, frames at the edges only'() {
    const a = glitchMessages('ABCDE'), b = glitchMessages('ABCDE');
    assert(a.open && a.close && a.open === b.open && a.close === b.close, 'messages');
    assert(glitchAt(0.1, 30).phase === 'open' && glitchAt(15, 30) === null && glitchAt(29.9, 30).phase === 'close', 'edges');
  },
  'texts: session with chapters, no artists, same seed same texts'() {
    const info = { kind: 'video', title: 'Radio', songs: [{ title: 'Kellerlicht', start: 0, artist: 'Night Owl' }, { title: 'Neon Rain', start: 245 }, { title: 'Last Call', start: 3725 }], genres: ['techno', 'synthwave', 'techno'], seconds: 3900, seed: 'aurora' };
    const t = textsFor(info), d = t.description;
    assert(/0:00:00 Kellerlicht/.test(d) && /0:04:05 Neon Rain/.test(d) && /1:02:05 Last Call/.test(d), 'chapters');
    assert(!/Night Owl/.test(d + t.title), 'no artists');
    assert(/Techno · Synthwave/.test(d) && /Seed aurora/.test(d) && /65 min/.test(t.title), 'facts');
    assert(JSON.stringify(textsFor(info)) === JSON.stringify(t), 'repeatable');
    const again = textsFor({ ...info, draw: 1 });
    assert(again.description !== d && /0:04:05 Neon Rain/.test(again.description), 'draw again keeps the list');
  },
  'texts: short session uses mm:ss, fragment carries its label'() {
    const s = textsFor({ kind: 'video', title: 'Mix', songs: [{ title: 'A', start: 0 }, { title: 'B', start: 200 }], seconds: 400, seed: 's' });
    assert(/^00:00 A$/m.test(s.description) && /^03:20 B$/m.test(s.description), 'mm:ss');
    const f = textsFor({ kind: 'fragment', title: 'Kellerlicht', fragment: { label: 'FRAGMENT S0UL·ABCDE #014', start: 40, end: 70 }, fullLine: 'Full session on the channel', seed: 'f' });
    assert(/#014/.test(f.title) && /FRAGMENT S0UL·ABCDE #014/.test(f.description) && /Full session on the channel/.test(f.description), 'fragment');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
