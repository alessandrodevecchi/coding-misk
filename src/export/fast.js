// Fast export (#8): a song rendered offline in a hidden page with its own Strudel (src/render/page.js), and the
// timeline JSON saved next to the audio (for the fast video of #53).
import { buildSteps, sayText } from '../song/build.js';
import { tempoClock } from '../render/tempo.js';

// the code segments of a playable song: the whole song, or one per live build step (from its bar to the next step)
export function segmentsOf(sg, codeFor) {
  const bars = sg.meta.bars;
  const ats = sg.build ? [...new Set([0, ...buildSteps(sg.build).map(s => s.at).filter(a => a > 0 && a < bars)])].sort((a, b) => a - b) : [0];
  return ats.map((from, i) => ({ from, to: i + 1 < ats.length ? ats[i + 1] : bars, code: codeFor(sg, from) }));
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
    const clear = () => { done = true; removeEventListener('message', on); clearTimeout(timer); frame.remove(); };
    finish = (err, val) => { if (done) return; clear(); err ? rej(err) : res(val); };
    // the page answers as soon as it is loaded
    const timer = setTimeout(() => finish(new Error('render page did not load')), 60000);
    function on(e) {
      if (e.source !== frame.contentWindow || !e.data || !e.data.codingMiskRender) return;
      const m = e.data;
      if (m.ready) { clearTimeout(timer); frame.contentWindow.postMessage({ render: job }, location.origin); }
      else if (m.progress !== undefined) onProgress(m.progress, m.phase);
      else if (m.error) finish(new Error(m.error));
      else if (m.done) finish(null, { channels: m.channels, sampleRate: m.sampleRate, onsets: m.onsets });
    }
    addEventListener('message', on);
  });
  onProgress(0, 'load');
  document.body.appendChild(frame);
  return { promise, cancel: () => finish({ cancelled: true }) };
}
