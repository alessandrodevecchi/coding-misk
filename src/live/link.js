// Live output (#52), the app tab's side: the broadcast window draws through it, and the control room (another tab)
// talks to it over a BroadcastChannel: presets with TAKE, the cued preset, the state, and small pictures for its monitors.
import { CHANNEL, PRESETS, presetOf } from './presets.js';

const PICS_MS = 333;
const WATCHED_MS = 5000;

// video: the recorder (its live picture); visuals: the stage (pumped while this tab is hidden);
// getState(): { title, artist, playing, radio } of what plays
export function createLiveLink({ video, visuals, getState }) {
  const bc = new BroadcastChannel(CHANNEL);
  let cue = PRESETS[1], watchedAt = 0, picsAt = 0, busy = false, beatAt = 0;
  const small = () => { const c = document.createElement('canvas'); c.width = 384; c.height = 216; return c; };
  const prog = small(), prev = small();

  const state = () => ({ type: 'state', live: video.live.on, beatAt, preset: video.live.preset, cue, frames: video.live.frames, ...getState() });
  const send = () => bc.postMessage(state());

  bc.onmessage = e => {
    const m = e.data || {};
    if (m.type === 'hello') { watchedAt = performance.now(); send(); }
    if (m.type === 'cue') { cue = presetOf(m.preset); send(); }
    if (m.type === 'take') { video.live.setPreset(m.preset ? presetOf(m.preset) : cue); send(); }
    if (m.type === 'beat' && m.from === 'broadcast') beatAt = m.at;
  };

  // the monitors' pictures: the picture on air and the cued preset, a few times a second while a control room watches
  function tick() {
    const now = performance.now();
    if (busy || now - watchedAt > WATCHED_MS || now - picsAt < PICS_MS) return;
    picsAt = now; busy = true;
    video.live.preview(prog, null); video.live.preview(prev, cue);
    const blob = c => new Promise(r => c.toBlob(r, 'image/jpeg', .72));
    Promise.all([blob(prog), blob(prev)]).then(([program, preview]) => { bc.postMessage({ type: 'pics', program, preview }); send(); }).finally(() => { busy = false; });
  }

  const api = {
    // called by the broadcast window, 30 times a second: the stage moves on even when this tab is hidden
    draw(canvas) { visuals.pump(); video.live.draw(canvas); tick(); },
    tick,
    openWindow() {
      return window.open('/broadcast.html', 'coding-misk-broadcast', 'popup,width=960,height=540');
    },
    // the control room is another tab in its own process, so it keeps working if this tab stops
    openRoom() { window.open('/live.html', '_blank', 'noopener'); },
    get on() { return video.live.on; },
  };
  globalThis.codingMiskLive = api;
  return api;
}
