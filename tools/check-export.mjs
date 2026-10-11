// Checks for the fast export (#8): time from the tempo map, code segments of live build songs, the timeline,
// formats and the Export display. No browser.
//   npm run check:export      exit 1 when any check fails
import { tempoClock } from '../src/render/tempo.js';
import { segmentsOf, timelineOf } from '../src/export/fast.js';
import { FORMATS, formatOf, EXT, MP3_RATES } from '../src/export/encode.js';
import { outText } from '../src/video/layout.js';
import { createSession, fitLength } from '../src/endless/director.js';
import { withDefaults } from '../src/endless/recipe.js';
import { loadStyles } from './styles-dir.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const CHECKS = {
  'tempo map: seconds and cps per bar'() {
    const T = tempoClock([120, 120, 60]);
    assert(near(T.seconds(0), 0) && near(T.seconds(1), 2) && near(T.seconds(2), 4) && near(T.seconds(2.5), 6) && near(T.seconds(3), 8), 'seconds');
    assert(near(T.seconds(4), 12), 'past the end the last tempo goes on');
    assert(near(T.cps(0.5), 0.5) && near(T.cps(2.9), 0.25) && near(T.cps(9), 0.25), 'cps');
  },
  'segments: one per live build step'() {
    const sg = { meta: { bars: 32 }, build: { sections: [{ bars: 32 }], tracks: [], build: [{ at: 0, add: 'a' }, { at: 8, add: 'b' }, { at: 8, add: 'c' }, { at: 16, add: 'd' }] } };
    const seg = segmentsOf(sg, (s, bar) => `code@${bar}`);
    assert(JSON.stringify(seg.map(s => [s.from, s.to, s.code])) === JSON.stringify([[0, 8, 'code@0'], [8, 16, 'code@8'], [16, 32, 'code@16']]), JSON.stringify(seg));
    const plain = segmentsOf({ meta: { bars: 10 }, build: null }, () => 'x');
    assert(plain.length === 1 && plain[0].from === 0 && plain[0].to === 10, 'one segment without steps');
  },
  'timeline: sections, code, voice lines and onsets in seconds'() {
    const sg = { title: 'T', meta: { bars: 4, bpm: [120, 120, 120, 120], sections: [{ label: 'A', start: 0, len: 2 }, { label: 'B', start: 2, len: 2 }] }, build: { sections: [{ bars: 4 }], tracks: [], build: [{ at: 2, say: { en: 'hi', it: 'ciao' } }] } };
    const tl = timelineOf(sg, [{ from: 0, to: 4, code: 'c' }], { kick: [[0, 0.1, 1]] }, 11, 'it');
    assert(tl.format === 1 && tl.seconds === 11 && tl.sections[1].t === 4 && tl.code[0].t === 0, 'times');
    assert(tl.say.length === 1 && tl.say[0].t === 4 && tl.say[0].text === 'ciao', JSON.stringify(tl.say));
    assert(tl.instruments.kick[0][0] === 0, 'onsets kept');
  },
  'clips last exactly their length and start full (#5)'() {
    const recipes = loadStyles().map(withDefaults);
    for (const [style, fit] of [['synthwave', 14], ['berlin-techno', 29], ['ambient', 46], ['trance', 59], ['jazz', 19], ['drum-and-bass', 89]]) {
      const { song } = createSession(recipes, `clip-${style}`).next({ styles: [style], fit });
      const sec = song.sections.reduce((a, x) => a + x.bars * 240 * (parseInt(x.meter || '4/4', 10) / 4) / ((x.bpm + (x.bpmEnd ?? x.bpm)) / 2), 0);
      assert(Math.abs(sec - fit) < 0.01, `${style} ${fit}: ${sec}`);
      const late = (song.build || []).filter(st => st.add !== undefined && st.at > 0);
      assert(!late.length, `${style}: every track at the first bar`);
    }
    const f = fitLength(30, 4, 8, [120, 130]);
    assert(Math.abs(f.bars * 4 * 60 / f.bpm - 30) < 1e-6 && f.bpm >= 120 && f.bpm <= 130 && f.bars % 2 === 0, JSON.stringify(f));
  },
  'formats and the Export display'() {
    assert(FORMATS.join() === 'wav,flac,mp3,opus' && formatOf('xyz') === 'wav' && formatOf('opus') === 'opus' && EXT.opus === 'ogg', 'formats');
    assert(MP3_RATES.join() === '320,192', 'mp3 rates');
    assert(outText('audio', 'flac') === 'AUDIO · FLAC' && outText('audio', 'mp3', null, 192) === 'AUDIO · MP3 192' && outText('audio', 'wav') === 'AUDIO · WAV' && outText('video', 'wav', '720p30') === 'VIDEO · 720p30', 'display');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
