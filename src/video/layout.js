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
// the direction of a video (#53): visual 'song' (each song's own), 'fixed:<look>', 'song-cycle' (a new one every song),
// 'section-cycle' (every section); soul 'auto' (the panel while the Soul display is on), 'off', 'panel', 'full'
export const VISUALS = ['song', 'fixed', 'song-cycle', 'section-cycle'];
export const SOULS = ['auto', 'off', 'panel', 'full'];
export const VIDEO_DEFAULTS = { layout: 'visual', quality: '1080p30', card: 'always', soulPanel: true, visual: 'song', soul: 'auto' };

// the look of the frame at a point of the song: dir { visual, soul }, looks: the list to pick from,
// at { n: song number, section: index, own: the song's own look }
export function lookFor(dir, looks, at) {
  if (dir.soul === 'full') return 'soul';
  const v = dir.visual || 'song';
  if (v.startsWith('fixed:')) return looks.includes(v.slice(6)) ? v.slice(6) : looks[0];
  if (v === 'song-cycle') return looks[((at.n || 1) - 1) % looks.length];
  if (v === 'section-cycle') return looks[(at.section || 0) % looks.length];
  return at.own && looks.includes(at.own) ? at.own : looks[0];
}

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

// fragments (#57): vertical layouts for a 1080×1920 picture. v-code: stage above, code below; v-soul: stage above, soul below;
// v-bands: stage in the middle, a band above (the logo) and below (tagline, full-video line); v-soul-bands: the soul in the middle
export const V_LAYOUTS = ['v-code', 'v-soul', 'v-bands', 'v-soul-bands'];
export const V_QUALITY = { w: 1080, h: 1920, fps: 30, bps: 8e6 };
export const V_DEFAULTS = { vLayout: 'v-bands', tagline: 'music written as code', fullLine: '', vTitle: false, label: true, glitch: true, vLength: 30 };
// the areas of a vertical w×h picture: stage, soul (with its header), code, top and bottom bands; hidden parts are absent
export function verticalAreas(layout, w, h) {
  const pad = Math.round(w / 40), head = Math.round(h / 48);
  if (layout === 'v-code' || layout === 'v-soul') {
    const top = Math.round(h / 2);
    const lower = { x: pad, y: top + pad, w: w - 2 * pad, h: h - top - 2 * pad };
    return layout === 'v-code' ? { stage: { x: 0, y: 0, w, h: top }, code: lower } : { stage: { x: 0, y: 0, w, h: top }, soul: { ...lower, head } };
  }
  const band = Math.round((h - w) / 2), mid = { x: 0, y: band, w, h: w };
  const bands = { top: { x: 0, y: 0, w, h: band }, bottom: { x: 0, y: band + w, w, h: h - band - w } };
  return layout === 'v-soul-bands' ? { soul: { ...mid, head: 0 }, ...bands } : { stage: mid, ...bands };
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

// one Export and one Record button for audio and video (#27): the kind is a switch shown on a small display
export const OUT_KEY = 'coding-misk-out-kind';
export const outKindOf = v => (v === 'video' ? 'video' : 'audio');
// the display's text: AUDIO · WAV, AUDIO · FLAC, AUDIO · MP3 320, AUDIO · OPUS, VIDEO · 1080p30
export const outText = (kind, format, quality, mp3 = 320) => (kind === 'video' ? `VIDEO · ${QUALITIES[quality] ? quality : '1080p30'}` : `AUDIO · ${format === 'mp3' ? `MP3 ${mp3}` : ['flac', 'opus'].includes(format) ? format.toUpperCase() : 'WAV'}`);
