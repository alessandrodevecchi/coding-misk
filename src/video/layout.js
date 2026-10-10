// Video from a song or a session (#27): the layouts, qualities and title card modes, and the areas of a frame.
// Pure: checked in Node (tools/check-video.mjs).

// visual: the stage fills the frame; code: the stage beside the code (and the soul panel when the soul is on);
// tab: the whole browser tab, captured as it is (the browser asks which tab to share)
export const LAYOUTS = ['visual', 'code', 'tab'];
export const QUALITIES = {
  '1080p30': { w: 1920, h: 1080, fps: 30, bps: 8e6 },
  '1080p60': { w: 1920, h: 1080, fps: 60, bps: 12e6 },
  '720p30': { w: 1280, h: 720, fps: 30, bps: 5e6 },
};
// the title card: always on, for a few seconds when a song starts, or never
export const CARDS = ['always', 'start', 'off'];
export const CARD_SECONDS = 8;
export const VIDEO_DEFAULTS = { layout: 'visual', quality: '1080p30', card: 'always', soulPanel: true };

// the areas of a w×h frame: stage, and for the code layout the code and the soul panel (open or folded)
// soul: null (no soul panel), 'open' or 'folded'
export function layoutAreas(layout, w, h, soul = null) {
  if (layout !== 'code') return { stage: { x: 0, y: 0, w, h } };
  const side = Math.round(w / 3), sx = w - side, pad = Math.round(h / 54);
  const out = { stage: { x: 0, y: 0, w: sx, h } };
  let y = pad;
  if (soul) {
    const head = Math.round(h / 27);
    // the soul screen keeps its 1200×760 proportions
    const body = soul === 'open' ? Math.round((side - 2 * pad) * 760 / 1200) : 0;
    out.soul = { x: sx + pad, y, w: side - 2 * pad, h: head + body, head };
    y += head + body + pad;
  }
  out.code = { x: sx + pad, y, w: side - 2 * pad, h: h - y - pad };
  return out;
}

// the first recording format the browser supports: MP4 (H.264 + AAC), else WebM
export const MIMES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
export const pickMime = supported => MIMES.find(m => supported(m)) || '';
export const extOf = mime => (/mp4/.test(mime) ? 'mp4' : 'webm');

// is the title card shown at t seconds, the song having started at t0?
export function cardAlpha(mode, t, t0) {
  if (mode === 'off') return 0;
  if (mode === 'always') return 1;
  const k = t - t0;
  if (k < 0 || k > CARD_SECONDS) return 0;
  return Math.min(1, k / 0.5, (CARD_SECONDS - k) / 0.8);
}

// a file name from a title
export const fileName = (title, ext) => `${String(title || 'coding-misk').replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim() || 'coding-misk'}.${ext}`;
