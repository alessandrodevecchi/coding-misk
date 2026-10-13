// Checks for fragments (#57): vertical layouts, the fragment picker (lively parts, no overlap, bar lines, repeatable),
// times, label and glitch messages, and the texts for sharing. No browser.
//   npm run check:clips      exit 1 when any check fails
import { readFileSync } from 'node:fs';
import { F_FORMATS, F_SHOWS, F_ASPECTS, fragmentAreas, fragmentOpts, fragmentSize, soulFocus, coverOffset } from '../src/video/layout.js';
import { pickFragments, fragmentBetween, parseTime, clockOf, barScores, sectionWeight, fragmentCode, fragmentLabel, glitchMessages, glitchAt, shapeOf, TAGLINES, taglineFor, nextTagline, taglineAt, TYPE_START, TYPE_RATE } from '../src/video/fragments.js';
import { textsFor, textFile } from '../src/video/texts.js';
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
  'every format, show, proportion and band choice: parts inside, no overlap'() {
    for (const [fk, f] of Object.entries(F_FORMATS)) for (const show of F_SHOWS) for (const aspect of F_ASPECTS) for (const bands of [true, false]) for (const rotate of [false, true]) {
      const o = fragmentOpts({ format: fk, show, aspect, bands, rotate }), { comp } = fragmentSize(o), A = fragmentAreas(o, comp.w, comp.h), parts = Object.entries(A);
      const tag = `${fk} ${show} ${aspect} ${bands} ${rotate}`;
      parts.forEach(([n, a]) => assert(inside(a, comp.w, comp.h), `${tag} ${n} inside`));
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert(!overlap(parts[i][1], parts[j][1]), `${tag} ${parts[i][0]}/${parts[j][0]}`);
      assert(!!A.stage === show.startsWith('visual') && !!A.code === show.includes('code') && !!A.soul === show.includes('soul'), `${tag} shows ${Object.keys(A)}`);
    }
  },
  'proportions: a 16:9 visual in a 9:16 frame leaves the rest to the bands'() {
    const o = fragmentOpts({ format: '9:16', show: 'visual', aspect: '16:9', bands: true }), A = fragmentAreas(o, 1080, 1920);
    assert(A.stage.w === 1080 && A.stage.h === 608 && A.top.h + A.bottom.h === 1920 - 608, JSON.stringify(A));
  },
  'turned by 90°: a 9:16 file composed as 16:9'() {
    const z = fragmentSize(fragmentOpts({ format: '9:16', rotate: true }));
    assert(z.file.w === 1080 && z.file.h === 1920 && z.comp.w === 1920 && z.comp.h === 1080, JSON.stringify(z));
    const A = fragmentAreas(fragmentOpts({ show: 'visual-code', aspect: 'fill', bands: true }), 1920, 1080);
    assert(A.strip && A.stage.w === 1280 && A.code.x >= 1280, 'landscape: stage and code side by side, a strip below');
  },
  'old layout names still work'() {
    const o = fragmentOpts({ vLayout: 'v-soul-bands' });
    assert(o.show === 'soul' && o.bands === true, JSON.stringify(o));
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
  'the soul fills a vertical frame on its focus; a blurred surround works with any proportions, visual or soul'() {
    const fill = fragmentAreas(fragmentOpts({ show: 'soul', aspect: 'fill', bands: false }), 1080, 1920).soul;
    assert(fill.mode === 'cover' && fill.w === 1080 && fill.h === 1920 && !fill.bleed, `fill ${JSON.stringify(fill)}`);
    const whole = fragmentAreas(fragmentOpts({ show: 'soul', aspect: 'whole', bands: true }), 1080, 1920).soul;
    assert(Math.abs(whole.w / whole.h - 1200 / 760) < .01 && whole.bleed && whole.bleed.h > whole.h, `whole ${JSON.stringify(whole)}`);
    const st43 = fragmentAreas(fragmentOpts({ show: 'visual', aspect: '4:3', bands: true }), 1080, 1920).stage;
    assert(st43.bleed && st43.bleed.h > st43.h, 'a 4:3 visual gets the blurred surround');
    assert(!fragmentAreas(fragmentOpts({ show: 'visual', aspect: '4:3', bleed: false }), 1080, 1920).stage.bleed, 'and not when switched off');
    const side = fragmentAreas(fragmentOpts({ show: 'visual-soul', aspect: 'fill' }), 1080, 1920).soul;
    assert(!side.mode, 'the soul beside the visual keeps its panel');
    // the radar of the tracker stays in a narrow cut; a view along the song keeps the fragment's stretch
    const k = 1920 / 760, off = coverOffset(1080, 1920, 1200, 760, k, soulFocus('a').x, soulFocus('a').y);
    const radar = 460 * k + off.x; assert(radar > 300 && radar < 780, `radar centre on screen at ${radar.toFixed(0)}`);
    const late = soulFocus('j', .9).x * k + coverOffset(1080, 1920, 1200, 760, k, soulFocus('j', .9).x, 400).x;
    assert(late > 300 && late < 780, `the late stretch of the spectrum in view at ${late.toFixed(0)}`);
    assert(soulFocus('j', .1).x < soulFocus('j', .9).x, 'the timeline goes left to right');
  },
  'the two bands each on their own'() {
    const only = (top, bottom) => fragmentAreas(fragmentOpts({ show: 'visual', aspect: '1:1', bandTop: top, bandBottom: bottom }), 1080, 1920);
    const t1 = only(true, false), b1 = only(false, true), both = only(true, true), none = only(false, false);
    assert(t1.top && !t1.bottom && b1.bottom && !b1.top && both.top && both.bottom && !none.top && !none.bottom, 'top only, bottom only, both, none');
    assert(t1.top.h >= both.top.h && b1.bottom.h >= both.bottom.h && t1.stage.y > both.stage.y - 1, 'a band stays at least its size when the other is off (the picture is centred in the rest)');
    assert(fragmentOpts({ bands: false }).bandTop === false && fragmentOpts({ bands: false }).bandBottom === false && fragmentOpts({}).bandTop === true, 'bands switches both');
    assert(fragmentOpts({ bands: true, bandTop: false }).bands === true && fragmentOpts({ bandTop: false, bandBottom: false }).bands === false, 'bands is on while one band is');
  },
  'tagline: pool, random by fragment, typed with a block and short glitches'() {
    assert(TAGLINES.length >= 30 && !TAGLINES.some(x => /four-on-the-floor/.test(x)), 'pool');
    const a = taglineFor('ABCDE'), b = taglineFor('ABCDE');
    assert(a === b && TAGLINES.includes(a), 'same fragment, same phrase');
    assert(new Set(['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'G7', 'H8'].map(taglineFor)).size >= 4, 'different fragments, different phrases');
    { let x = 'music by coding'; for (let i = 0; i < 20; i++) { const y = nextTagline(x); assert(y !== x && TAGLINES.includes(y), 'die: another phrase'); x = y; } }
    assert(fragmentOpts({}).taglineMode === 'fixed' && fragmentOpts({ taglineMode: 'random' }).taglineMode === 'random' && fragmentOpts({ taglineMode: 'x' }).taglineMode === 'fixed', 'mode');
    const text = 'music by coding';
    assert(taglineAt(text, 0.2).text === '', 'empty at the start');
    const mid = taglineAt(text, TYPE_START + 5 / TYPE_RATE + 0.01);
    assert(mid.text === 'music' && mid.cursor, 'typing with the block');
    const end = TYPE_START + text.length / TYPE_RATE;
    assert(taglineAt(text, end + 0.05).text === text, 'typed in');
    assert(!taglineAt(text, end + 2.6).cursor, 'block gone after typing');
    let glitches = 0, plain = 0;
    for (let t = end + 1.2; t < 30; t += 1 / 30) { const x = taglineAt(text, t, 'ABCDE'); if (x.glitch) glitches++; else if (x.text === text) plain++; }
    assert(glitches > 0 && glitches < 30 && plain > 600, `short glitches (${glitches} frames)`);
    assert(JSON.stringify(taglineAt(text, 12.34, 'Q')) === JSON.stringify(taglineAt(text, 12.34, 'Q')), 'same frame, same time');
  },
  'texts: tagline, inspiration and upload fields'() {
    const f = textsFor({ kind: 'fragment', title: 'Luci Rosse', genres: ['techno', 'drum-and-bass'], tagline: 'in kick we trust', inspiration: { en: 'the Red Circle club fight', it: 'x' }, fragment: { label: 'FRAGMENT S0UL·ABCDE #001' }, seed: 'a' });
    assert(/in kick we trust/.test(f.description) && /the Red Circle club fight\./.test(f.description), 'tagline and inspiration');
    assert(f.tags[0] === 'techno' && f.tags.includes('drum and bass') && f.tags.includes('live coding'), 'tags');
    assert(f.hashtags.length === 5 && f.hashtags[1] === '#DrumAndBass', 'hashtags');
    assert(f.category === 'Music' && /Category: Music/.test(textFile(f)) && /Hashtags: #Techno/.test(textFile(f)), 'category and file');
    const plain = textsFor({ kind: 'fragment', title: 'X', fragment: { label: 'L' }, seed: 'a' });
    assert(!/Inspired|Born from|A nod|in mind|Somewhere in its code/.test(plain.description), 'no inspiration, no sentence');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
