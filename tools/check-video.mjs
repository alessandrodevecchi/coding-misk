// Checks for the session video (#27): layout areas fill the frame without overlap, the soul panel keeps the soul
// screen's proportions, the recording format falls back to WebM, the title card modes. No browser.
//   npm run check:video      exit 1 when any check fails
import { LAYOUTS, QUALITIES, CARDS, CARD_SECONDS, layoutAreas, pickMime, extOf, cardAlpha, fileName } from '../src/video/layout.js';

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
    assert(CARDS.length === 3 && LAYOUTS.length === 3, 'lists');
    assert(cardAlpha('always', 100, 0) === 1 && cardAlpha('off', 1, 0) === 0, 'always and off');
    assert(cardAlpha('start', 3, 0) === 1 && cardAlpha('start', CARD_SECONDS + 1, 0) === 0 && cardAlpha('start', 0.1, 0) < 1, 'start fades in and out');
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
