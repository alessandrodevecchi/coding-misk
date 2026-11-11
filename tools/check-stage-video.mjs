// Checks for the Video look's pure rules (stage-video): the size modes, the video time live and in exports, the shuffle
// bag, the exports' seeded pick, the hidden and needed rules, the fallback look, the track video's seeks, the fast
// video's decode size and loop cache, the look list and the song validator. No browser.
//   npm run check:stage-video      exit 1 when any check fails
import { videoRect, trackTime, loopTime, frameIndex, createBag, seededPick, sortedFiles, folderSignature, stageHiddenOf, needOf, fallbackLookOf, seekTo, decodeSize, loopBytes, loopFits, sizeOf, SIZE_MODES, GRACE_HIDDEN, GRACE_LOOK, CACHE_BYTES } from '../src/visuals/stage-video-rules.js';
import { LOOKS, PICK_LOOKS, RENDER_GAIN } from '../src/music.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
// a seeded random for the bag
const seeded = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);

const CHECKS = {
  'Video is a look in the menu, with its render gain below the default (D1)'() {
    assert(LOOKS.some(([k, l]) => k === 'video' && l === 'Video') && PICK_LOOKS.some(([k]) => k === 'video'), 'video in LOOKS and PICK_LOOKS');
    assert(RENDER_GAIN.video > 0 && RENDER_GAIN.video < RENDER_GAIN.default, `gain ${RENDER_GAIN.video}`);
  },
  'Fill: a 4:3 picture on a 2.4:1 stage fills the width, top and bottom cropped (D7)'() {
    const R = videoRect(640, 480, 2400, 1000, 'fill');
    assert(R.dx === 0 && R.dy === 0 && R.dw === 2400 && R.dh === 1000, JSON.stringify(R));
    assert(near(R.sw, 640) && near(R.sx, 0) && R.sh < 480 && near(R.sy, (480 - R.sh) / 2) && near(R.sw / R.sh, 2.4), JSON.stringify(R));
    const T = videoRect(1920, 1080, 1080, 1920, 'fill');
    assert(near(T.sh, 1080) && T.sw < 1920 && near(T.sx, (1920 - T.sw) / 2) && near(T.sw / T.sh, 1080 / 1920), `tall ${JSON.stringify(T)}`);
  },
  'Fit: the whole picture inside, centred, bands on the sides or above and below (D7)'() {
    const R = videoRect(1080, 1920, 1920, 1080, 'fit');
    assert(R.sx === 0 && R.sy === 0 && R.sw === 1080 && R.sh === 1920, 'whole source');
    assert(near(R.dh, 1080) && near(R.dw, 1080 * 1080 / 1920) && near(R.dx, (1920 - R.dw) / 2) && R.dy === 0, JSON.stringify(R));
    const W = videoRect(1920, 1080, 1000, 1000, 'fit');
    assert(near(W.dw, 1000) && near(W.dh, 562.5) && near(W.dy, 218.75), JSON.stringify(W));
  },
  'Stretch: the whole picture on the whole stage, no crop, no bands (D7)'() {
    const R = videoRect(640, 480, 2400, 1000, 'stretch');
    assert(R.sx === 0 && R.sy === 0 && R.sw === 640 && R.sh === 480 && R.dx === 0 && R.dy === 0 && R.dw === 2400 && R.dh === 1000, JSON.stringify(R));
  },
  'size mode: fill by default, the three modes kept, anything else fill'() {
    assert(SIZE_MODES.join() === 'fill,fit,stretch', SIZE_MODES.join());
    assert(sizeOf(null) === 'fill' && sizeOf({ size: 'fit' }) === 'fit' && sizeOf({ size: 'stretch' }) === 'stretch' && sizeOf({ size: 'zoom' }) === 'fill' && sizeOf('fit') === 'fit', 'sizeOf');
    assert(videoRect(0, 0, 100, 50, 'fill').dw === 100, 'no picture size yet');
  },
  'track video time: the file time heard, the last frame past the end (D4)'() {
    assert(trackTime(12.5, 60) === 12.5 && trackTime(-1, 60) === 0, 'inside');
    assert(trackTime(75, 60) < 60 && trackTime(75, 60) > 59.99, `past the end ${trackTime(75, 60)}`);
    assert(trackTime(3, 0) === 3, 'no duration yet');
  },
  'stage video time in exports: song seconds modulo the length (D4)'() {
    assert(near(loopTime(25, 10), 5) && near(loopTime(10, 10), 0) && near(loopTime(9.5, 10), 9.5) && loopTime(5, 0) === 0, 'loop');
    assert(near(loopTime(-1, 10), 9), 'negative');
    assert(frameIndex(1, 30) === 30 && frameIndex(1 / 60, 30) === 0 && frameIndex(2 / 60, 30) === 1, 'frame index');
  },
  'shuffle bag: every file once before a repeat, never the same twice in a row (D5)'() {
    for (let seed = 1; seed < 60; seed++) {
      const bag = createBag(seeded(seed)), keys = ['a', 'b', 'c'], got = [];
      for (let i = 0; i < 30; i++) got.push(bag.next(keys));
      for (let r = 0; r < 10; r++) assert(new Set(got.slice(r * 3, r * 3 + 3)).size === 3, `round ${r} of seed ${seed}: ${got.join('')}`);
      for (let i = 1; i < got.length; i++) assert(got[i] !== got[i - 1], `seed ${seed}: ${got.join('')}`);
    }
    const two = createBag(seeded(3)), g2 = Array.from({ length: 20 }, () => two.next(['x', 'y']));
    for (let i = 1; i < g2.length; i++) assert(g2[i] !== g2[i - 1], g2.join(''));
    const one = createBag(seeded(3));
    assert(one.next(['x']) === 'x' && one.next(['x']) === 'x' && one.next([]) === null, 'one file repeats, none gives null');
  },
  'shuffle bag: files changing start a new round with the new files only'() {
    const bag = createBag(seeded(9));
    bag.next(['a', 'b', 'c']);
    const after = Array.from({ length: 4 }, () => bag.next(['a', 'd']));
    assert(after.every(k => k === 'a' || k === 'd') && new Set(after.slice(0, 2)).size === 2, after.join(''));
  },
  'exports: the same file for the same song every time, spread over the files (D5)'() {
    const files = sortedFiles([{ folderId: 'f2', path: 'z.mp4' }, { folderId: 'f1', path: 'b.mp4' }, { folderId: 'f1', path: 'a.mp4' }], ['f1', 'f2']);
    assert(files.map(f => f.path).join() === 'a.mp4,b.mp4,z.mp4', files.map(f => f.path).join());
    const sig = folderSignature(files);
    assert(seededPick(files, 'luci-rosse', 0, sig) === seededPick(files.slice(), 'luci-rosse', 0, sig), 'same pick');
    const used = new Set(Array.from({ length: 40 }, (_, i) => seededPick(files, `song-${i}`, 0, sig).path));
    assert(used.size === 3, `spread ${[...used]}`);
    assert(folderSignature(files) !== folderSignature(files.slice(1)), 'signature changes with the files');
    assert(seededPick([], 'x') === null, 'no files');
  },
  'hidden: the page hidden, scrolled fully away, the full-screen code, the Soul display (D9)'() {
    assert(!stageHiddenOf({}) && stageHiddenOf({ pageHidden: true }) && stageHiddenOf({ inView: false }) && stageHiddenOf({ codeFull: true }) && stageHiddenOf({ soul: true }), 'cases');
  },
  'needed: the look Video and the stage on screen, or kept by a recording or the live output (D9)'() {
    assert(needOf({ look: 'video', hidden: false }).needed && !needOf({ look: 'pixel', hidden: false }).needed, 'look');
    assert(!needOf({ look: 'video', hidden: true }).needed && needOf({ look: 'video', hidden: true, keep: true }).needed, 'hidden and kept');
    assert(needOf({ look: 'pixel', hidden: false }).grace === GRACE_LOOK && needOf({ look: 'video', hidden: true }).grace === GRACE_HIDDEN, 'graces');
    assert(GRACE_HIDDEN === 60000 && GRACE_LOOK === 30000, 'grace values');
  },
  'fallback: the song\'s own look, else Palco; never Video or a look not offered (D2)'() {
    const picks = PICK_LOOKS.map(l => l[0]);
    assert(fallbackLookOf('pixel', picks) === 'pixel' && fallbackLookOf(null, picks) === 'palco' && fallbackLookOf('video', picks) === 'palco' && fallbackLookOf('studio', picks) === 'palco', 'fallback');
  },
  'track video seeks: drift over 0.25 s, one in flight, one every 250 ms (D9b)'() {
    assert(seekTo({ want: 10, at: 10.2, now: 1000 }) === null, 'small drift');
    assert(seekTo({ want: 10, at: 10.3, now: 1000 }) === 10, 'drift');
    assert(seekTo({ want: 10, at: 11, now: 1000, seeking: true }) === null, 'one in flight');
    assert(seekTo({ want: 10, at: 11, now: 1000, lastSeek: 900 }) === null && seekTo({ want: 10, at: 11, now: 1000, lastSeek: 700 }) === 10, 'gap');
    assert(seekTo({ want: 90, at: 89.9, now: 1000, playing: false }) === 90, 'paused: the exact frame');
  },
  'fast video decode size: the stage area in Normal and CRT, twice the work picture otherwise (D13)'() {
    const area = { w: 1920, h: 1080 };
    assert(JSON.stringify(decodeSize('normal', area, { w: 320, h: 180 })) === '{"w":1920,"h":1080}', 'normal');
    assert(JSON.stringify(decodeSize('crt', area, { w: 320, h: 180 })) === '{"w":1920,"h":1080}', 'crt');
    assert(JSON.stringify(decodeSize('led', area, { w: 320, h: 180 })) === '{"w":640,"h":360}', 'led');
    assert(JSON.stringify(decodeSize('bit', { w: 640, h: 360 }, { w: 960, h: 540 })) === '{"w":640,"h":360}', 'capped by the area');
  },
  'loop cache: within 256 MB, the design\'s examples (D13)'() {
    assert(CACHE_BYTES === 268435456, 'budget');
    assert(!loopFits({ duration: 10, videoFps: 30, exportFps: 30, w: 640, h: 360 }), `10 s at 30 fps: ${loopBytes({ duration: 10, videoFps: 30, exportFps: 30, w: 640, h: 360 })}`);
    assert(loopFits({ duration: 10, videoFps: 15, exportFps: 30, w: 640, h: 360 }) && loopFits({ duration: 8, videoFps: 30, exportFps: 30, w: 640, h: 360 }), '15 fps or 8 s fit');
  },
};

// the validator warns for a song that names Video as its look (D1)
CHECKS['a song file naming Video as its look gets a warning (D1)'] = async () => {
  const { validateSong } = await import('../src/song/validate.js');
  const base = JSON.parse(JSON.stringify((await import('../songs/examples/' + (await import('node:fs')).readdirSync(new URL('../songs/examples/', import.meta.url)).find(f => f.endsWith('.json')), { with: { type: 'json' } })).default));
  const r = validateSong({ ...base, look: 'video' }), r0 = validateSong({ ...base, look: 'pixel' });
  assert(r.warnings.some(w => /Video/.test(w.message || w.msg || String(w))), JSON.stringify(r.warnings));
  assert(!r0.warnings.some(w => /Video/.test(w.message || w.msg || String(w))), 'no warning for pixel');
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
