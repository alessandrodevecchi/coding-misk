// Fast export (#8): a song rendered offline in a hidden page with its own Strudel (src/render/page.js), and the
// timeline JSON saved next to the audio (for the fast video of #53).
import { buildSteps, sayText } from '../song/build.js';
import { tempoClock } from '../render/tempo.js';

// the code segments of a playable song: the whole song, or one per live build step (from its bar to the next step)
export function segmentsOf(sg, codeFor) {
  const bars = sg.meta.bars;
  const ats = sg.build ? [...new Set([0, ...buildSteps(sg.build).map(s => s.at).filter(a => a > 0 && a < bars)])].sort((a, b) => a - b) : [0];
  // run: the code evaluated, when it is more than the code shown (hidden mixer and voice, code-writing)
  // paste: how many lines the typing towards this step may paste whole (the live build's paste rule, for the video)
  return ats.map((from, i) => { const code = codeFor(sg, from); return { from, to: i + 1 < ats.length ? ats[i + 1] : bars, code, ...(sg.run ? { run: sg.run(code) } : {}), ...(sg.paste && from > 0 ? { paste: sg.paste(from) } : {}) }; });
}

// the timeline of an exported song: times in seconds from the start of the file
// onsets: { instrument: [[t, length, level], …] } from the render
export function timelineOf(sg, segments, onsets, seconds, lang) {
  const T = tempoClock(sg.meta.bpm), r = x => +x.toFixed(4);
  return {
    format: 1, app: 'coding-misk', title: sg.title, seconds: r(seconds), bars: sg.meta.bars, bpm: sg.meta.bpm.map(b => +(+b).toFixed(3)),
    sections: sg.meta.sections.map(s => ({ label: s.label, bar: s.start, bars: s.len, t: r(T.seconds(s.start)) })),
    code: segments.map(s => ({ bar: s.from, t: r(T.seconds(s.from)), code: s.code })),
    say: sg.build ? buildSteps(sg.build).filter(x => x.say).map(x => ({ bar: x.at, t: r(T.seconds(x.at)), text: sayText(x.say, lang) })) : [],
    instruments: onsets,
  };
}

// renders a song in a fresh hidden page. job: { segments, bpm, tail, sampleRate }; onProgress(0..1, phase).
// Returns { promise, cancel }: the promise gives { channels, sampleRate, onsets }; cancel rejects it with { cancelled }.
export function renderOffline(job, onProgress = () => {}) {
  const frame = document.createElement('iframe');
  frame.src = '/render.html'; frame.title = 'render'; frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-10px;top:-10px;visibility:hidden';
  let done = false, finish;
  const promise = new Promise((res, rej) => {
    const clear = () => { done = true; removeEventListener('message', on); clearTimeout(timer); clearTimeout(quiet); frame.remove(); };
    // a page that stops answering for STALL seconds while rendering counts as stuck (#61): the block is tried again
    let quiet = 0;
    const alive = () => { clearTimeout(quiet); quiet = setTimeout(() => finish(Object.assign(new Error('render stalled'), { stalled: true })), STALL * 1000); };
    finish = (err, val) => { if (done) return; clear(); err ? rej(err) : res(val); };
    // the page answers as soon as it is loaded
    const timer = setTimeout(() => finish(new Error('render page did not load')), 60000);
    function on(e) {
      if (e.source !== frame.contentWindow || !e.data || !e.data.codingMiskRender) return;
      const m = e.data;
      if (m.ready) { clearTimeout(timer); alive(); try { frame.contentWindow.postMessage({ render: job }, location.origin); } catch (err) { finish(err); } }
      else if (m.progress !== undefined) { alive(); onProgress(m.progress, m.phase); }
      else if (m.error) finish(new Error(m.error));
      else if (m.done) finish(null, { channels: m.channels, sampleRate: m.sampleRate, onsets: m.onsets, skipped: m.skipped || [], replaced: m.replaced || [] });
    }
    addEventListener('message', on);
  });
  onProgress(0, 'load');
  document.body.appendChild(frame);
  return { promise, cancel: () => finish({ cancelled: true }) };
}

// long exports render in blocks (memory stays flat): BLOCK seconds each, starting LEAD seconds early so notes and
// tails cross the cut, with an XF crossfade at the cut
export const BLOCK = 240, LEAD = 8, XF = 0.02, STALL = 120;
export function blocksOf(total, block = BLOCK) {
  const out = [];
  for (let a = 0; a < total - 1e-6; a += block) out.push([a, Math.min(total, a + block)]);
  return out;
}

// renders a song block by block into sink.add(channels, startSeconds, blockOnsets). job: { segments, bpm, tail, sampleRate, gain, block?,
// segmentsAt?(from, to): the segments of one block (only the tracks that play in it), start?: seconds of the song where the file
// begins (a fragment, #57: the first block still renders from start - LEAD; times in the output, onsets included, count from start),
// fadeIn?: seconds of fade at the start }.
// onProgress(0..1, phase). Returns { promise, cancel }: the promise gives { seconds, sampleRate, onsets }.
export function renderInBlocks(job, sink, onProgress = () => {}) {
  let cur = null, cancelled = false;
  const promise = (async () => {
    // job.cut: the file ends exactly there, the last job.fade seconds fading out (#5); else the song plus its tail
    const T = tempoClock(job.bpm), length = job.cut || T.seconds(job.bpm.length), start = job.start || 0, onsets = {}, fade = job.fade || 0, fadeIn = job.fadeIn || 0;
    const blocks = blocksOf(length - start, job.block || BLOCK).map(([a, b]) => [a + start, b + start]);
    let carry = null, frames = 0, sr = job.sampleRate || 48000;
    const skipped = new Set(), replaced = new Set();
    for (let i = 0; i < blocks.length; i++) {
      if (cancelled) throw { cancelled: true };
      const [a, b] = blocks[i], last = i === blocks.length - 1, from = Math.max(0, a - LEAD);
      // functions stay here: the job goes to the render page by postMessage, which cannot copy them
      const { segmentsAt, onSkipped, ...rest } = job, segments = segmentsAt ? segmentsAt(from, b) || job.segments : job.segments;
      let r = null;
      for (let attempt = 0; !r; attempt++) {
        console.info(`[blocks] ${i + 1}/${blocks.length} ${a.toFixed(0)}-${b.toFixed(0)} s${attempt ? ` (try ${attempt + 1})` : ''}`);
        cur = renderOffline({ ...rest, segments, from, to: b, tail: last ? (job.cut ? 0 : job.tail) : XF, keepFrom: a }, (p, phase) => onProgress((i + (phase === 'render' ? p : 0)) / blocks.length, i ? 'render' : phase));
        try { r = await cur.promise; }
        catch (e) { if (!(e && e.stalled) || attempt >= 2 || cancelled) throw e; console.warn(`[blocks] block ${i + 1} stalled, trying again`); }
      }
      sr = r.sampleRate;
      for (const x of r.skipped || []) skipped.add(x);
      for (const x of r.replaced || []) replaced.add(x);
      let ch = r.channels.map(c => c.subarray(Math.round((a - from) * sr)));
      if (carry) for (let c = 0; c < ch.length; c++) for (let k = 0, n = carry[c].length; k < n && k < ch[c].length; k++) { const w = k / n; ch[c][k] = ch[c][k] * w + carry[c][k] * (1 - w); }
      if (!last) { const keep = Math.round((b - a) * sr); carry = ch.map(c => c.slice(keep)); ch = ch.map(c => c.subarray(0, keep)); }
      else if (job.cut) ch = ch.map(c => c.subarray(0, Math.round((b - a) * sr)));
      if (job.cut && fade > 0) for (let i = 0, n = ch[0].length; i < n; i++) { const t = a + i / sr; if (t > job.cut - fade) { const g = Math.max(0, (job.cut - t) / fade); for (const c of ch) c[i] *= g; } }
      if (fadeIn > 0 && a - start < fadeIn) for (let i = 0, n = Math.min(ch[0].length, Math.round((fadeIn - (a - start)) * sr)); i < n; i++) { const g = (a - start + i / sr) / fadeIn; for (const c of ch) c[i] *= g; }
      // onsets in output time
      const own = start ? Object.fromEntries(Object.entries(r.onsets).map(([k, list]) => [k, list.map(([t, d, v]) => [+(t - start).toFixed(4), d, v])])) : r.onsets;
      await sink.add(ch, frames / sr, own);
      frames += ch[0].length;
      for (const [k, list] of Object.entries(own)) (onsets[k] = onsets[k] || []).push(...list);
    }
    // sounds that never loaded and were left out (#61): the app says which
    if (skipped.size) { console.warn(`[blocks] sounds skipped: ${[...skipped].join(', ')}`); if (job.onSkipped) job.onSkipped([...skipped]); }
    // broken sounds played from a stand-in (#54)
    if (replaced.size) console.info(`[blocks] sounds replaced: ${[...replaced].join(', ')}`);
    return { seconds: frames / sr, sampleRate: sr, onsets, skipped: [...skipped], replaced: [...replaced] };
  })();
  return { promise, cancel: () => { cancelled = true; if (cur) cur.cancel(); } };
}
