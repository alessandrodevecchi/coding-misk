// Checks for the session video (#27): layout areas fill the frame without overlap, the soul panel keeps the soul
// screen's proportions, the recording format falls back to WebM, the title card modes. No browser.
//   npm run check:video      exit 1 when any check fails
import { LAYOUTS, QUALITIES, CARDS, CARD_SECONDS, layoutAreas, pickMime, extOf, cardAlpha, fileName, lookFor } from '../src/video/layout.js';
import { levelsFrom, codeFrom, sayFrom } from '../src/video/feed.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const inside = (a, w, h) => a.x >= 0 && a.y >= 0 && a.x + a.w <= w && a.y + a.h <= h && a.w > 0 && a.h > 0;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const CHECKS = {
  'every quality is 16:9'() {
    for (const [k, q] of Object.entries(QUALITIES)) assert(Math.abs(q.w / q.h - 16 / 9) < 1e-3 && q.fps >= 30, k);
  },
  'visual and tab: the stage fills the frame'() {
    for (const l of ['visual', 'tab']) { const A = layoutAreas(l, 1920, 1080); assert(A.stage.w === 1920 && A.stage.h === 1080 && !A.code && !A.soul, l); }
  },
  'code layout: areas inside the frame, no overlap'() {
    for (const q of Object.values(QUALITIES)) for (const soul of [null, 'open', 'folded']) {
      const A = layoutAreas('code', q.w, q.h, soul), parts = [A.stage, A.code, A.soul].filter(Boolean);
      parts.forEach(p => assert(inside(p, q.w, q.h), `${q.w} ${soul} inside`));
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert(!overlap(parts[i], parts[j]), `${q.w} ${soul} overlap`);
      assert(Math.abs(A.stage.w - q.w * 2 / 3) < 2, 'stage two thirds');
      assert(!!A.soul === !!soul, 'soul panel only with the soul on');
    }
  },
  'soul panel: open keeps 1200×760, folded is only its header'() {
    const o = layoutAreas('code', 1920, 1080, 'open').soul, f = layoutAreas('code', 1920, 1080, 'folded').soul;
    assert(Math.abs((o.h - o.head) / o.w - 760 / 1200) < 0.01, 'proportions');
    assert(f.h === f.head, 'folded header');
    assert(layoutAreas('code', 1920, 1080, 'folded').code.h > layoutAreas('code', 1920, 1080, 'open').code.h, 'folding gives the code more room');
  },
  'format: MP4 first, then WebM, extension from the type'() {
    assert(/mp4/.test(pickMime(() => true)), 'mp4 first');
    assert(pickMime(m => /webm/.test(m)) === 'video/webm;codecs=vp9,opus', 'webm fallback');
    assert(pickMime(() => false) === '', 'none');
    assert(extOf('video/mp4;codecs=avc1') === 'mp4' && extOf('video/webm;codecs=vp9') === 'webm', 'ext');
  },
  'title card: always, at the start, never'() {
    assert(CARDS.length === 3 && LAYOUTS.length === 10 && LAYOUTS.slice(0, 4).join() === 'visual,code,code-widgets,tab', 'lists');
    assert(cardAlpha('always', 100, 0) === 1 && cardAlpha('off', 1, 0) === 0, 'always and off');
    assert(cardAlpha('start', 3, 0) === 1 && cardAlpha('start', CARD_SECONDS + 1, 0) === 0 && cardAlpha('start', 0.1, 0) < 1, 'start fades in and out');
  },
  'direction: the look of each part (#53)'() {
    const L = ['palco', 'pixel', 'studio'];
    assert(lookFor({ visual: 'song' }, L, { n: 2, own: 'pixel' }) === 'pixel' && lookFor({ visual: 'song' }, L, { own: 'nope' }) === 'palco', 'own look');
    assert(lookFor({ visual: 'fixed:studio' }, L, { n: 3 }) === 'studio', 'fixed');
    assert(lookFor({ visual: 'song-cycle' }, L, { n: 1 }) === 'palco' && lookFor({ visual: 'song-cycle' }, L, { n: 5 }) === 'pixel', 'a new one every song');
    assert(lookFor({ visual: 'section-cycle' }, L, { section: 2 }) === 'studio', 'every section');
    assert(lookFor({ visual: 'fixed:pixel', soul: 'full' }, L, {}) === 'soul', 'soul full frame');
  },
  'feed: levels from onsets, code typed before a step, voice lines (#53)'() {
    const on = { kick: [[1, 0.1, 1]], pad: [[0, 2, 0.5]] }, at = levelsFrom(on);
    const a = at(0.5), b = at(1.006), c = at(1.5), d = at(3);
    assert(a.kick === 0 && b.kick > 0.15 && c.kick < 0.01, `kick decays ${b.kick} ${c.kick}`);
    assert(a.pad > 0.07 && d.pad < 0.01, `pad holds then releases ${a.pad} ${d.pad}`);
    on.snare = [[3.5, 0.1, 1]]; assert(at(3.51).snare > 0.1, 'onsets added later count');
    const code = codeFrom([{ from: 0, code: 'aaa' }, { from: 4, code: 'aaa bbb' }]);
    assert(code(1) === 'aaa' && code(4) === 'aaa bbb' && code(3.5).length > 3 && code(3.5).length < 7, `typing ${JSON.stringify(code(3.5))}`);
    const say = sayFrom([{ bar: 2, text: 'hi' }]);
    assert(say(1) === '' && say(3) === 'hi' && say(6.5) === '', 'voice line held 4 bars');
  },
  'file names'() {
    assert(fileName('Luci rosse: live!', 'mp4') === 'Luci rosse live.mp4' && fileName('', 'webm') === 'coding-misk.webm', fileName('Luci rosse: live!', 'mp4'));
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
