// The Video look in the fast video and the fragments (stage-video D12, D13): the frames of a part's file decoded offline
// with mediabunny, one part (one file) at a time. The frame times of a part are known before its first frame, so the
// sink gets them as one ordered stream (canvasesAtTimestamps: it decodes forward and seeks only at a loop's wrap). The
// pictures are decoded at the size the frame needs (the stage area in Normal and CRT, twice the render's work picture
// otherwise), a frame already decoded is drawn again when the export's rate is higher than the video's, and a short
// loop is kept as bitmaps within 256 MB so later loops decode nothing. Only the video track is read: never the sound.
import { frameIndex, loopFits } from '../visuals/stage-video-rules.js';

// fps: the export's frame rate; need: { w, h } the size the frame needs (decodeSize); size: 'fill' | 'fit' | 'stretch';
// log(line): the export log
export function createVideoFrames({ fps, need, size = 'fill', log = () => {} }) {
  let cur = null, mb = null;
  const stats = { parts: 0, decoded: 0, reused: 0, cached: 0, failed: [], sizes: [] };

  async function close() {
    if (!cur) return;
    const c = cur; cur = null;
    try { if (c.it && c.it.return) await c.it.return(); } catch (e) { /* already done */ }
    if (c.cache) for (const b of c.cache.values()) try { b.close(); } catch (e) {}
    try { if (c.input && c.input.dispose) c.input.dispose(); } catch (e) {}
  }

  // a part's file. src: { key, file, kind: 'track' | 'stage' }; timesOf(duration): the video time of each of the part's
  // frames, in order (they depend on the file's length). → true when it opened
  async function open(src, timesOf) {
    await close();
    stats.parts++;
    try {
      mb = mb || await import('mediabunny');
      const input = new mb.Input({ source: new mb.BlobSource(src.file), formats: mb.ALL_FORMATS });
      const track = await input.getPrimaryVideoTrack();
      if (!track || !(await track.canDecode())) throw new Error('no picture this browser can decode');
      const duration = await track.computeDuration();
      let vfps = 30;
      try { const s = await track.computePacketStats(120); vfps = s.averagePacketRate || s.medianFrameRate || 30; } catch (e) { /* 30 */ }
      // the decode size: the picture's proportions kept, scaled to cover (Fill), fit (Fit) or the frame's own (Stretch);
      // never above the file's size
      const sw = track.displayWidth, sh = track.displayHeight;
      let w, h;
      if (size === 'stretch') { w = Math.min(sw, need.w); h = Math.min(sh, need.h); }
      else { const k = Math.min(1, size === 'fit' ? Math.min(need.w / sw, need.h / sh) : Math.max(need.w / sw, need.h / sh)); w = sw * k; h = sh * k; }
      w = Math.max(2, Math.round(w / 2) * 2); h = Math.max(2, Math.round(h / 2) * 2);
      // the distinct frames in the order they are needed; a stage video that fits the cache stops once a frame comes
      // round again (one loop, from wherever the part starts in it)
      const cacheOn = src.kind === 'stage' && loopFits({ duration, videoFps: vfps, exportFps: fps, w, h });
      const order = [], seen = new Set();
      let last = -1;
      for (const vt of timesOf(duration)) {
        const i = frameIndex(vt, vfps);
        if (i === last) continue;
        if (cacheOn && seen.has(i)) break;
        seen.add(i); order.push((i + 0.5) / vfps); last = i;
      }
      const sink = new mb.CanvasSink(track, { width: w, height: h, fit: 'fill', poolSize: 2 });
      cur = { key: src.key, kind: src.kind, input, sink, it: sink.canvasesAtTimestamps(order), duration, vfps, w, h, lastIdx: -1, last: null, cache: cacheOn ? new Map() : null };
      stats.sizes.push(`${w}×${h}`);
      log(`[fast video] Video: ${src.kind === 'track' ? 'the Decode file' : 'stage video'} "${src.file.name}", ${duration.toFixed(1)} s at ${Math.round(vfps)} fps, decoded at ${w}×${h}, ${cacheOn ? 'loop cached' : 'not cached'}`);
      return true;
    } catch (e) {
      stats.failed.push(src.file && src.file.name);
      log(`[fast video] Video: "${src.file && src.file.name}" cannot be decoded (${e && e.message}); its frames use the fallback look`);
      await close();
      return false;
    }
  }

  // the picture at a video time of the part open (in the order of `timesOf`). → a canvas or bitmap, or null
  async function frame(vt) {
    if (!cur) return null;
    const i = frameIndex(vt, cur.vfps);
    if (i === cur.lastIdx && cur.last) { stats.reused++; return cur.last; }
    if (cur.cache && cur.cache.has(i)) { stats.cached++; cur.lastIdx = i; cur.last = cur.cache.get(i); return cur.last; }
    try {
      const r = await cur.it.next();
      if (r.done) return cur.last;
      stats.decoded++;
      if (r.value) {
        cur.lastIdx = i;
        cur.last = r.value.canvas;
        if (cur.cache) { const b = await createImageBitmap(r.value.canvas); cur.cache.set(i, b); cur.last = b; }
      }
    } catch (e) {
      log(`[fast video] Video: decoding stopped (${e && e.message}); the last picture stays`);
      cur.it = { next: async () => ({ done: true }) };
    }
    return cur.last;
  }

  return { open, frame, close, get key() { return cur ? cur.key : null; }, get duration() { return cur ? cur.duration : 0; }, stats };
}
