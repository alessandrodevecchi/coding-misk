// The Video look's live layer (stage-video D3-D6, D9, D9b): one muted <video> element for the whole app, never in the
// page, never connected to Web Audio. It holds a file only while the video is needed: the look is Video and the stage
// is on screen, or a recording or the live output draws it. Hidden, it pauses at once and keeps its file for a grace
// (60 s hidden, 30 s after another look), then the release (no source, the object URL revoked) runs in idle time.
//
// Sources, in order (D3): the track video (the file Decode plays, when it has a video track: it follows the file time
// heard, drift over 0.25 s corrected, at most one seek every 250 ms), else a stage video from the folders: one per song
// from a shuffle bag, from its beginning, looping on its own, paused with the music, never seeked (D4, D5).
//
// frame() → the element when it has a picture of the wanted source, else null (the stage draws the fallback look).
import { createBag, stageHiddenOf, needOf, seekTo, trackTime, GRACE_HIDDEN, GRACE_LOOK } from './stage-video-rules.js';

// opts:
//   look() → the look chosen ('video' or another; the soul override is soul())
//   soul() → the Soul display overrides the stage
//   playing() → the music plays (the stage video plays and pauses with it)
//   track() → { key, file, time() (seconds heard), playing } | null: the Decode file with a video track, while it counts
//     as the player
//   files() → [{ key, name, open: async () => File }]: the playable stage videos (the folders' files with access)
//   songKey() → the song on the stage (a change picks the next video); nextKey() → the next song when known, or null
//   keep() → a recording or the live output window draws the stage (the video stays needed while the page is hidden)
//   stageEl, codeFull() → the stage's wrapper (scrolled away) and the full-screen code over it
//   note(kind, vars) → a short message (a skipped file)
export function createStageVideo({ look, soul = () => false, playing, track = () => null, files = () => [], songKey = () => '', nextKey = () => null, keep = () => false, stageEl = null, codeFull = () => false, note = () => {}, rand = Math.random } = {}) {
  let el = null;          // the one element, created on first need
  let cur = null;         // the file in the element: { key, kind: 'track' | 'stage', url, ready, file, song }
  let opening = null;     // the file being opened: { key, token }
  let token = 0;
  let pick = null;        // the stage video of the song: { song, key }
  let ahead = null;       // the next song's pick and its file read ahead (D9b): { song, key, file }
  const failed = new Set(); // files that did not play, skipped for the session
  // the last picture of the file before, held while the next song's file loads (no other look flashes in between)
  let snap = null;
  function snapshot(v) {
    const k = Math.min(1, 1280 / v.videoWidth), c = snap && snap.canvas ? snap.canvas : document.createElement('canvas');
    c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
    try { c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); } catch (e) { return null; }
    return { canvas: c };
  }
  const bag = createBag(rand);
  let inView = true, idleSince = 0, grace = GRACE_HIDDEN, releaseTimer = null, lastSeek = -Infinity;
  // the graces in ms (D9); the browser check may shorten them for its quick cases
  const graces = { hidden: GRACE_HIDDEN, look: GRACE_LOOK };
  const stats = { opens: 0, releases: 0, urls: 0, seeks: 0, created: 0, events: [] };
  const log = (what, extra = {}) => { stats.events.push({ what, at: performance.now(), ...extra }); if (stats.events.length > 200) stats.events.shift(); };

  if (stageEl && typeof IntersectionObserver === 'function') {
    new IntersectionObserver(es => { for (const e of es) inView = e.isIntersecting; tick(); }, { threshold: 0 }).observe(stageEl);
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => tick());
  // the frame loop stops in a hidden page: the needed rule is also checked every second
  setInterval(() => { if (typeof document !== 'undefined' && document.hidden) tick(); }, 1000);

  function element() {
    if (el) return el;
    el = document.createElement('video');
    el.muted = true; el.defaultMuted = true; el.volume = 0; el.playsInline = true; el.preload = 'metadata';
    el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
    el.disablePictureInPicture = true; el.disableRemotePlayback = true;
    el.addEventListener('loadeddata', () => { if (cur && !cur.ready) { cur.ready = true; snap = null; log('ready', { key: cur.key, ms: Math.round(performance.now() - cur.t0) }); tick(); } });
    el.addEventListener('error', () => {
      if (!cur || !el.getAttribute('src')) return;
      const bad = cur;
      failed.add(bad.file); log('error', { key: bad.key });
      note('skip', { name: bad.name || bad.key });
      dropFile();
      if (bad.kind === 'stage' && pick && pick.key === bad.file) pick = null;
      tick();
    });
    stats.created++;
    return el;
  }
  const hidden = () => stageHiddenOf({ pageHidden: typeof document !== 'undefined' && document.hidden, inView, codeFull: codeFull(), soul: soul() });

  // the stage video of the song (D5): the pick of its song, or the next from the bag (the file read ahead first)
  function stagePick(list) {
    const song = songKey();
    const keys = list.map(f => f.key).filter(k => !failed.has(k));
    if (!keys.length) return null;
    if (pick && pick.song === song && keys.includes(pick.key)) return pick;
    if (ahead && ahead.song === song && keys.includes(ahead.key)) { pick = { song, key: ahead.key, file: ahead.file }; ahead = null; }
    else pick = { song, key: bag.next(keys) };
    log('pick', { song, key: pick.key });
    return pick;
  }
  // the next song's file, read a bar or so ahead when the next song is known (D9b): the open at the song change then
  // only sets the source
  async function readAhead(list) {
    const nk = nextKey();
    if (!nk || (ahead && ahead.song === nk) || (pick && pick.song === nk)) return;
    const keys = list.map(f => f.key).filter(k => !failed.has(k));
    if (!keys.length) return;
    const key = bag.next(keys), f = list.find(x => x.key === key);
    ahead = { song: nk, key, file: null };
    try { ahead.file = await f.open(); log('ahead', { song: nk, key }); } catch (e) { /* opened again at the change */ }
  }

  // what the stage should show now: { key, kind, name, open, track } | null
  function wanted() {
    const tr = track();
    if (tr && tr.file) return { key: `t:${tr.key}`, kind: 'track', name: tr.file.name, open: async () => tr.file, track: tr };
    const list = files() || [];
    const p = stagePick(list);
    if (!p) return null;
    const f = list.find(x => x.key === p.key);
    if (!f) return null;
    const ready = p.file;
    return { key: `s:${p.song}:${p.key}`, file: p.key, kind: 'stage', name: f.name, open: ready ? async () => ready : f.open };
  }

  function dropFile() {
    if (!cur) return;
    const url = cur.url;
    cur = null;
    if (el) { try { el.pause(); } catch (e) {} el.removeAttribute('src'); el.preload = 'metadata'; try { el.load(); } catch (e) {} }
    if (url) { URL.revokeObjectURL(url); stats.urls--; }
  }
  // the release after the grace (D9, D9b): in idle time, never in a frame
  function scheduleRelease() {
    if (releaseTimer || !cur) return;
    const wait = Math.max(0, idleSince + grace - performance.now());
    releaseTimer = setTimeout(() => {
      releaseTimer = null;
      const go = () => { snap = null; if (!need().needed && cur) { log('release', { key: cur.key, after: Math.round(performance.now() - idleSince) }); dropFile(); stats.releases++; } };
      if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 2000 }); else setTimeout(go, 0);
    }, wait);
  }
  const cancelRelease = () => { if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; } };
  const need = () => needOf({ look: look(), hidden: hidden(), keep: !!keep() });

  async function open(w) {
    const my = ++token;
    opening = { key: w.key, token: my };
    log('open', { key: w.key });
    let file;
    try { file = await w.open(); } catch (e) { file = null; }
    if (my !== token) return;
    opening = null;
    if (!file) { failed.add(w.kind === 'stage' ? w.file : w.key); note('skip', { name: w.name }); if (w.kind === 'stage') pick = null; tick(); return; }
    const v = element();
    if (cur && cur.ready && v.videoWidth && cur.kind === w.kind) snap = snapshot(v);
    // one file at a time: the old one goes before the next opens
    dropFile();
    const url = URL.createObjectURL(file); stats.urls++;
    cur = { key: w.key, kind: w.kind, url, ready: false, name: w.name, file: w.kind === 'stage' ? w.file : w.key, t0: performance.now() };
    stats.opens++;
    v.loop = w.kind === 'stage';
    v.preload = 'auto';
    v.src = url;
    // a track video starts at the file time heard; a stage video from its beginning, with no seek
    if (w.kind === 'track') { try { v.currentTime = trackTime(w.track.time(), 0); lastSeek = performance.now(); } catch (e) {} }
  }

  let lastNeeded = false;
  // the rules, run each stage frame and on every event that may change them
  function tick() {
    const { needed, grace: g } = need();
    if (!needed) {
      if (lastNeeded) { idleSince = performance.now(); grace = graces[g === GRACE_LOOK ? 'look' : 'hidden']; log('pause', { grace }); }
      lastNeeded = false;
      if (el && !el.paused) el.pause();
      if (opening) { token++; opening = null; }
      scheduleRelease();
      return;
    }
    if (!lastNeeded) log('need');
    lastNeeded = true;
    cancelRelease();
    const w = wanted();
    if (!w) { if (cur && el && !el.paused) el.pause(); return; }
    if (!cur || cur.key !== w.key) {
      if (!opening || opening.key !== w.key) open(w);
      return;
    }
    if (!cur.ready) return;
    const v = el;
    if (w.kind === 'track') {
      const tr = w.track, at = tr.time(), dur = v.duration || 0, want = trackTime(at, dur), past = dur > 0 && at >= dur;
      const s = seekTo({ want, at: v.currentTime, seeking: v.seeking, lastSeek, now: performance.now(), playing: tr.playing && !past });
      if (s !== null) { try { v.currentTime = s; lastSeek = performance.now(); stats.seeks++; log('seek', { to: s }); } catch (e) {} }
      if (tr.playing && !past) { if (v.paused) v.play().catch(() => {}); } else if (!v.paused) v.pause();
    } else {
      if (playing()) { if (v.paused) v.play().catch(() => {}); readAhead(files() || []); } else if (!v.paused) v.pause();
    }
  }

  return {
    tick,
    // the picture to draw, or null (the fallback look draws)
    frame() {
      if (!cur || !cur.ready || !el || el.readyState < 2 || !el.videoWidth) return snap ? snap.canvas : null;
      return el;
    },
    // nothing to show at all (no track video, no playable stage video): the fallback look, not a loading one
    get empty() { return !track() && !(files() || []).some(f => !failed.has(f.key)); },
    get loading() { return !!opening || !!(cur && !cur.ready); },
    // the folders changed: the rules run again (the bag starts a new round when the list is another, D5)
    filesChanged() { ahead = null; tick(); },
    // for the checks
    get element() { return el; },
    state() {
      return {
        cur: cur ? { key: cur.key, kind: cur.kind, ready: cur.ready, name: cur.name } : null, opening: opening ? opening.key : null,
        pick: pick ? { song: pick.song, key: pick.key } : null, ahead: ahead ? { song: ahead.song, key: ahead.key, read: !!ahead.file } : null,
        failed: [...failed], hidden: hidden(), inView, needed: need().needed, grace, idleSince, paused: el ? el.paused : null,
        time: el ? el.currentTime : null, src: !!(el && el.getAttribute('src')), muted: el ? el.muted && el.volume === 0 : null,
        stats: { ...stats, events: stats.events.slice(-40) },
      };
    },
    // (for the checks) other graces in ms, or the defaults with no argument
    setGraces(o = {}) { graces.hidden = o.hidden ?? GRACE_HIDDEN; graces.look = o.look ?? GRACE_LOOK; },
  };
}
