// The Video look's pure rules (stage-video): the size modes, the video time live and in exports, the shuffle bag of
// one video per song, the exports' seeded pick, when the stage counts as hidden and when the video is needed, and the
// grace times. No DOM: checked in Node (npm run check:stage-video).

// the size mode, in the "Stage videos" card and the backup (D7): { size: 'fill' | 'fit' | 'stretch' }, fill not stored
export const SV_KEY = 'coding-misk-stage-video';
export const SIZE_MODES = ['fill', 'fit', 'stretch'];
export const sizeOf = v => { const s = v && typeof v === 'object' ? v.size : v; return SIZE_MODES.includes(s) ? s : 'fill'; };
// the grace before a paused video is released (D9): while the stage is hidden, and after picking another look
export const GRACE_HIDDEN = 60000;
export const GRACE_LOOK = 30000;
// the track video (D4, D9b): a drift over this many seconds is corrected, at most one seek every SEEK_GAP ms
export const DRIFT = 0.25;
export const SEEK_GAP = 250;
// the fast video's loop cache (D13)
export const CACHE_BYTES = 256 * 1024 * 1024;

// the source and destination rectangles of a picture of srcW × srcH drawn on dstW × dstH (D7).
// fill: covers, centred, the overflow cropped; fit: whole inside, centred (the caller fills the bands); stretch: whole,
// to the whole area. → { sx, sy, sw, sh, dx, dy, dw, dh }
export function videoRect(srcW, srcH, dstW, dstH, mode = 'fill') {
  const whole = { sx: 0, sy: 0, sw: srcW, sh: srcH };
  if (!(srcW > 0 && srcH > 0 && dstW > 0 && dstH > 0)) return { ...whole, dx: 0, dy: 0, dw: dstW || 0, dh: dstH || 0 };
  if (mode === 'stretch') return { ...whole, dx: 0, dy: 0, dw: dstW, dh: dstH };
  if (mode === 'fit') {
    const k = Math.min(dstW / srcW, dstH / srcH), dw = srcW * k, dh = srcH * k;
    return { ...whole, dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh };
  }
  // fill: the part of the source with the destination's proportions, centred
  const k = Math.max(dstW / srcW, dstH / srcH), sw = dstW / k, sh = dstH / k;
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh, dx: 0, dy: 0, dw: dstW, dh: dstH };
}

// the time of a track video (D4): the file time heard, inside the picture; past its end the last frame stays
export const trackTime = (fileSeconds, duration) => {
  const t = Math.max(0, +fileSeconds || 0);
  return duration > 0 ? Math.min(t, Math.max(0, duration - 0.001)) : t;
};
// the time of a stage video in an export (D4): the song's seconds modulo the video's length
export const loopTime = (songSeconds, duration) => {
  if (!(duration > 0)) return 0;
  const t = (+songSeconds || 0) % duration;
  return t < 0 ? t + duration : t;
};
// the frame index of a video time at a frame rate (D13: a frame already decoded is drawn again)
export const frameIndex = (seconds, fps) => Math.floor((+seconds || 0) * (fps > 0 ? fps : 30) + 1e-6);

// FNV-1a, 32 bits
export function hash32(s) {
  let h = 0x811c9dc5;
  for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// the shuffle bag (D5): every playable file once, in a random order, before any repeats; never the same file twice in a
// row with two or more. rand() → [0, 1). → { next(keys) → key | null, reset() }
export function createBag(rand = Math.random) {
  let order = [], sig = '', last = null;
  const shuffle = keys => { const a = keys.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return {
    next(keys) {
      const list = [...new Set(keys || [])];
      if (!list.length) return null;
      const s = list.slice().sort().join('\n');
      // the files changed: a new bag of the files not yet shown in this round stays fair enough; start a new round
      if (s !== sig) { sig = s; order = []; }
      if (!order.length) {
        order = shuffle(list);
        // the first of a new round is never the last of the round before
        if (list.length > 1 && order[0] === last) { const j = 1 + Math.floor(rand() * (order.length - 1)); [order[0], order[j]] = [order[j], order[0]]; }
      }
      last = order.shift();
      return last;
    },
    get last() { return last; },
    reset() { order = []; sig = ''; },
  };
}

// the files of the folders in a stable order: by folder (the order of the list), then path
export const sortedFiles = (files, folderOrder = []) => files.slice().sort((a, b) => {
  const fa = folderOrder.indexOf(a.folderId), fb = folderOrder.indexOf(b.folderId);
  if (fa !== fb) return fa - fb;
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
});
// the folders' signature: changes when a file is added or removed
export const folderSignature = files => hash32(files.map(f => `${f.folderId}/${f.path}`).join('\n')).toString(36);
// an export's pick (D5): the same file for the same song every time. files: sorted (sortedFiles)
export function seededPick(files, songId, part = 0, sig = folderSignature(files)) {
  if (!files || !files.length) return null;
  return files[hash32(`${songId}/${part}/${sig}`) % files.length];
}

// the stage counts as hidden (D9): the page hidden, the stage scrolled fully away, the full-screen code over it, or the
// Soul display overriding it
export const stageHiddenOf = ({ pageHidden = false, inView = true, codeFull = false, soul = false } = {}) => !!(pageHidden || !inView || codeFull || soul);
// the video is needed (D9): the look is Video and the stage is on screen, or a recording or the live output draws it.
// → { needed, grace } (grace: how long a video no longer needed is kept, by the reason)
export function needOf({ look, hidden, keep = false }) {
  if (look !== 'video') return { needed: false, grace: GRACE_LOOK };
  if (!hidden || keep) return { needed: true, grace: GRACE_HIDDEN };
  return { needed: false, grace: GRACE_HIDDEN };
}
// the look the app would show without Video (D2): the song's own look when its file names one, else Palco
export const fallbackLookOf = (own, picks = []) => (own && own !== 'video' && picks.includes(own) ? own : 'palco');

// the next track-video seek (D9b): drift over DRIFT, at most one in flight and one every SEEK_GAP ms. → seconds | null
export function seekTo({ want, at, seeking = false, lastSeek = -Infinity, now = 0, playing = true }) {
  if (seeking || now - lastSeek < SEEK_GAP) return null;
  const off = Math.abs((+at || 0) - (+want || 0));
  // paused: any visible difference is a seek the user made (or a hand-over), set the frame exactly
  return off > (playing ? DRIFT : 0.04) ? want : null;
}

// the fast video's decode size (D13): Normal and CRT at the stage area's size, the other renders at twice the pass's
// work picture, capped by the stage area. work: { w, h } of the pass, or null. → { w, h } (even numbers)
export function decodeSize(render, area, work = null) {
  const even = v => Math.max(2, Math.round(v / 2) * 2);
  if (render === 'normal' || render === 'crt' || !work) return { w: even(area.w), h: even(area.h) };
  return { w: even(Math.min(area.w, work.w * 2)), h: even(Math.min(area.h, work.h * 2)) };
}
// the loop cache fits (D13): frames = min(video fps, export fps) × duration, 4 bytes a pixel
export const loopBytes = ({ duration, videoFps, exportFps, w, h }) => Math.ceil(Math.min(videoFps || exportFps, exportFps) * duration) * w * h * 4;
export const loopFits = o => loopBytes(o) <= CACHE_BYTES;
