// The broadcast window (#52): its loop asks the app tab that opened it to draw the live picture into this canvas,
// 30 times a second, and sends a beat every second while the picture moves. The app's tab can be hidden behind another:
// this window keeps its loop going and pumps the app's stage. If the app reloads, the picture comes back by itself.
import { CHANNEL, BEAT_MS } from './presets.js';

const canvas = document.getElementById('picture'), wait = document.getElementById('wait');
const bc = new BroadcastChannel(CHANNEL);
const FPS = 30;
let last = 0, frames = 0, ok = false;

const appOf = () => { try { return window.opener && !window.opener.closed ? window.opener.codingMiskLive : null; } catch (e) { return null; } };
function say(text) { wait.textContent = text; wait.hidden = !text; }

function loop(now) {
  requestAnimationFrame(loop);
  if (now - last < 1000 / FPS - 2) return;
  last = now;
  const app = appOf();
  if (!app) {
    ok = false;
    say(window.opener ? 'Waiting for the app…' : 'Open this window from coding-misk: Settings, Live output.');
    return;
  }
  try { app.draw(canvas); frames++; ok = true; say(''); }
  catch (e) { ok = false; say('Waiting for the app…'); }
}
requestAnimationFrame(loop);

// the beat: the control room relays it to OBS, whose watchdog shows Standby when it stops. Only when new frames were
// drawn since the last beat: a window the browser stopped drawing (covered, minimised) must not count as alive
let beatFrames = 0;
setInterval(() => {
  if (ok && frames > beatFrames) bc.postMessage({ type: 'beat', from: 'broadcast', frames, at: Date.now() });
  beatFrames = frames;
}, BEAT_MS);
addEventListener('pagehide', () => bc.postMessage({ type: 'closed', from: 'broadcast' }));

// a double click fills the screen (and back), for a capture without the window's frame
addEventListener('dblclick', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); });
