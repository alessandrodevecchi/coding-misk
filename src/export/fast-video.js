// Fast video (#53): the audio renders offline block by block (fast.js) and, as each block arrives, every frame of
// that stretch is drawn from the timeline (levels from the onsets, the waveform from the audio) and encoded with
// the audio into one file (Mediabunny: H.264 + AAC in MP4, or VP9 + Opus in WebM).
import { tempoClock } from '../render/tempo.js';
import { levelsFrom, codeFrom } from '../video/feed.js';
import { renderInBlocks } from './fast.js';
import { interleave16 } from './encode.js';

// MP4 when the browser can encode H.264 and AAC, else WebM with VP9 and Opus; null when neither
async function pickFormat(mb, q) {
  const size = { width: q.w, height: q.h }, audio = { numberOfChannels: 2, sampleRate: 48000 };
  if (await mb.canEncodeVideo('avc', size) && await mb.canEncodeAudio('aac', audio)) return { format: new mb.Mp4OutputFormat(), v: 'avc', a: 'aac', ext: 'mp4', type: 'video/mp4' };
  if (await mb.canEncodeVideo('vp9', size) && await mb.canEncodeAudio('opus', audio)) return { format: new mb.WebMOutputFormat(), v: 'vp9', a: 'opus', ext: 'webm', type: 'video/webm' };
  return null;
}

// job: the audio render job (segments, bpm, tail, sampleRate, gain); canvas: the frame canvas; q: { w, h, fps, bps };
// drawFrame(t, cyc, feed, codeAt, index): draws the frame for time t into the canvas; onProgress(0..1, phase).
// writable: a file to write into while rendering (#61), else the file is kept in memory.
// Returns { promise, cancel }: the promise gives { blob (null when written to disk), ext, seconds, onsets }.
export function renderVideo({ job, canvas, q, drawFrame, onProgress = () => {}, writable = null }) {
  let audio = null, cancelled = false;
  const promise = (async () => {
    const mb = await import('mediabunny');
    const f = await pickFormat(mb, q);
    if (!f) throw new Error('no video encoder in this browser');
    const out = new mb.Output({ format: f.format, target: writable ? new mb.StreamTarget(writable, { chunked: true }) : new mb.BufferTarget() });
    const vs = new mb.CanvasSource(canvas, { codec: f.v, quality: new mb.Quality({ bitrate: q.bps }) });
    const as = new mb.AudioSampleSource({ codec: f.a, quality: new mb.Quality({ bitrate: 192000 }) });
    out.addVideoTrack(vs, { frameRate: q.fps });
    out.addAudioTrack(as);
    await out.start();
    // a fragment (#57) starts at job.start: frame times count from 0, the song's cycle from start
    const T = tempoClock(job.bpm), offset = job.start || 0, total = (job.cut || T.seconds(job.bpm.length) + (job.tail || 0)) - offset, frames = Math.ceil(total * q.fps);
    const onsets = {}, levelsAt = levelsFrom(onsets), codeAt = codeFrom(job.segments, { seconds: c => T.seconds(c), speed: job.typingSpeed || 1 });
    let hist = new Float32Array(0), histAt = 0, drawn = 0, ap = 0;
    const report = phase => onProgress(Math.min(1, ap * 0.3 + drawn / frames * 0.7), phase);
    const sink = {
      async add(ch, start, blockOnsets) {
        for (const [k, list] of Object.entries(blockOnsets || {})) (onsets[k] = onsets[k] || []).push(...list);
        const sr = job.sampleRate || 48000, n = ch[0].length;
        // the AAC encoder puts 2112 samples of silence first: the audio starts that much earlier, the file's edit list
        // trims it, and sound and picture line up
        const lead = f.a === 'aac' ? 2112 / sr : 0;
        // the audio, a second at a time
        for (let i = 0; i < n; i += sr) {
          const part = ch.map(c => c.subarray(i, Math.min(n, i + sr)));
          const sample = new mb.AudioSample({ data: interleave16(part), format: 's16', numberOfChannels: ch.length, sampleRate: sr, timestamp: start + i / sr - lead });
          await as.add(sample); sample.close();
        }
        // a mono history for the waveform: the last 4096 samples of the block before, then this block
        const keep = hist.subarray(Math.max(0, hist.length - 4096)), mono = new Float32Array(keep.length + n);
        mono.set(keep);
        for (let i = 0; i < n; i++) mono[keep.length + i] = (ch[0][i] + (ch[1] || ch[0])[i]) / 2;
        histAt = Math.round(start * sr) - keep.length; hist = mono;
        // the frames of this stretch
        const end = start + n / sr;
        for (let fi = Math.ceil(start * q.fps - 1e-6); fi < end * q.fps - 1e-6 && fi < frames; fi++) {
          if (cancelled) throw { cancelled: true };
          const t = fi / q.fps, at = Math.round(t * sr) - histAt;
          const wave = new Float32Array(256), hook = new Float32Array(128);
          for (let i = 0; i < 256; i++) wave[i] = hist[at - 2048 + i * 8] || 0;
          for (let i = 0; i < 128; i++) hook[i] = hist[at - 2048 + i * 16] || 0;
          drawFrame(t, T.cycleAt(offset + t), { raw: levelsAt(t), wave, hook }, codeAt, fi);
          await vs.add(t, 1 / q.fps);
          drawn++;
          if (fi % 15 === 0) report('frames');
        }
      },
    };
    audio = renderInBlocks(job, sink, (p, phase) => { ap = p; report(phase === 'render' && drawn ? 'frames' : phase); });
    const r = await audio.promise;
    onProgress(1, 'encode');
    await out.finalize();
    // the stream target closes the file itself when the output is finalized
    if (writable) return { blob: null, ext: f.ext, seconds: r.seconds, onsets: r.onsets };
    return { blob: new Blob([out.target.buffer], { type: f.type }), ext: f.ext, seconds: r.seconds, onsets: r.onsets };
  })();
  // a failed or cancelled render leaves no half file behind
  if (writable) promise.catch(() => { try { const x = writable.abort(); if (x && x.catch) x.catch(() => {}); } catch (e) { /* locked by the output: it is dropped with it */ } });
  return { promise, cancel: () => { cancelled = true; if (audio) audio.cancel(); } };
}
