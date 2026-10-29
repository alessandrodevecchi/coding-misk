// Video from a song or a session (#27): the layouts, qualities and title card modes, and the areas of a frame.
// Pure: checked in Node (tools/check-video.mjs).

// visual: the stage fills the frame; code: the stage beside the code (and the soul panel when the soul is on);
// tab: the whole browser tab, captured as it is (the browser asks which tab to share)
// the views with a timeline of the live picture (#65) are video layouts too, drawn with the live picture's areas
export const TIMELINE_LAYOUTS = ['visual-tl', 'visual-code-tl', 'code-tl', 'soul-tl', 'visual-float', 'visual-column'];
// code-widgets (code-widgets D11): the code layout with the code widgets drawn below their lines
export const LAYOUTS = ['visual', 'code', 'code-widgets', 'tab', ...TIMELINE_LAYOUTS];
export const withWidgets = layout => typeof layout === 'string' && layout.endsWith('-widgets');
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
// characters a line of the code panel holds (as drawCode lays it out: font at a fiftieth of the frame height, JetBrains
// Mono about 0.6 em wide, padding on both sides), for the line breaks of the code in a video (typing-lines)
export function codeColsOf(area, frameH) {
  if (!area || !area.w) return null;
  const fs = Math.round(frameH / 50), padX = Math.round(fs * 1.1);
  return Math.max(20, Math.floor((area.w - padX * 2) / (fs * 0.6)) - 1);
}
export function layoutAreas(layout, w, h, soul = null) {
  if (layout !== 'code' && layout !== 'code-widgets') return { stage: { x: 0, y: 0, w, h } };
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

// fragments (#57): the picture's format, what it shows, the proportions of the visual or soul inside it, the bands
// (logo above, tagline below; a strip at the bottom in landscape), a picture turned by 90° for a phone held sideways,
// and how the code moves (follow the edits, scroll through all of it, or focus on the part playing)
export const F_FORMATS = { '9:16': { w: 1080, h: 1920 }, '4:5': { w: 1080, h: 1350 }, '1:1': { w: 1080, h: 1080 }, '16:9': { w: 1920, h: 1080 } };
export const F_SHOWS = ['visual', 'visual-code', 'visual-soul', 'soul', 'code'];
// whole: the stage's own proportions (o.stageRatio, the app's stage), so the whole visual shows
export const F_ASPECTS = ['whole', 'fill', '16:9', '4:3', '1:1', '4:5', '9:16'];
export const F_CODE = ['focus', 'scroll', 'follow'];
export const F_FILES = ['video', 'audio', 'texts', 'list'];
export const V_DEFAULTS = { format: '9:16', show: 'visual', aspect: '1:1', bands: true, rotate: false, codeMode: 'focus', look: 'song', soulView: 'song', tagline: 'music written as code', taglineMode: 'fixed', bleed: true, files: ['video', 'audio', 'texts', 'list'], fullLine: '', vTitle: false, label: true, glitch: true, vLength: 30 };
// the layouts of the first version, kept for saved settings and agents
const OLD = { 'v-code': { show: 'visual-code', aspect: 'fill', bands: false }, 'v-soul': { show: 'visual-soul', aspect: 'fill', bands: false }, 'v-bands': { show: 'visual', aspect: '1:1', bands: true }, 'v-soul-bands': { show: 'soul', aspect: 'fill', bands: true } };
export function fragmentOpts(o = {}) {
  const r = { ...V_DEFAULTS, ...(OLD[o.vLayout] || {}), ...(OLD[o.layout] || {}), ...o };
  if (!F_FORMATS[r.format]) r.format = V_DEFAULTS.format;
  if (!F_SHOWS.includes(r.show)) r.show = V_DEFAULTS.show;
  if (!F_ASPECTS.includes(r.aspect)) r.aspect = V_DEFAULTS.aspect;
  if (!F_CODE.includes(r.codeMode)) r.codeMode = V_DEFAULTS.codeMode;
  if (r.taglineMode !== 'random') r.taglineMode = 'fixed';
  // what a fragment saves: video, audio (the export format of the settings), texts, the list; none chosen: all
  r.files = Array.isArray(r.files) ? F_FILES.filter(k => r.files.includes(k)) : V_DEFAULTS.files.slice();
  if (!r.files.length) r.files = V_DEFAULTS.files.slice();
  // the two bands each on their own (#57): top (logo, label), bottom (tagline and lines); bands: both at once
  const both = o.bands !== undefined ? !!o.bands : V_DEFAULTS.bands;
  r.bandTop = o.bandTop !== undefined ? !!o.bandTop : both; r.bandBottom = o.bandBottom !== undefined ? !!o.bandBottom : both;
  r.bands = r.bandTop || r.bandBottom;
  return r;
}
// the file's size, and the size the picture is composed at (turned: the other way round)
export const fragmentSize = o => { const f = F_FORMATS[o.format] || F_FORMATS['9:16']; return { file: { ...f, fps: 30, bps: f.w * f.h > 2e6 ? 8e6 : 6e6 }, comp: o.rotate ? { w: f.h, h: f.w } : { w: f.w, h: f.h } }; };
const ratioOf = a => { const [x, y] = String(a).split(':').map(Number); return x / y; };
const SOUL = 1200 / 760;
// a box of ratio r fitted in a box of w×h at (x, y), centred
const fit = (x, y, w, h, r) => { const bw = Math.min(w, h * r), bh = bw / r; return { x: Math.round(x + (w - bw) / 2), y: Math.round(y + (h - bh) / 2), w: Math.round(bw), h: Math.round(bh) }; };
// the areas of a w×h picture: stage, soul (with head 0), code, and bands top and bottom (portrait) or a strip (landscape)
export function fragmentAreas(o, w, h) {
  const show = o.show || 'visual', main = show === 'soul' ? 'soul' : show === 'code' ? 'code' : 'stage';
  const second = show === 'visual-code' ? 'code' : show === 'visual-soul' ? 'soul' : null;
  // the soul as the main picture is cut to cover its box (centred on its view's focus); 'whole' keeps all of it.
  // bleed: the free space round a box with its own proportions is filled with a blurred copy of the picture
  const soulMode = main === 'soul' ? 'cover' : null;
  const r1 = main === 'code' ? null : o.aspect === 'whole' ? (main === 'soul' ? SOUL : o.stageRatio || 2.4) : o.aspect && o.aspect !== 'fill' ? ratioOf(o.aspect) : null;
  const bleed = o.bleed !== false && r1 && main !== 'code';
  const pad = Math.round(Math.min(w, h) / 40), out = {};
  const box = (kind, b) => { out[kind] = kind === 'soul' ? { ...b, head: 0, ...(kind === main && soulMode ? { mode: soulMode } : {}) } : kind === 'code' ? { x: b.x + pad, y: b.y, w: b.w - 2 * pad, h: b.h } : b; };
  if (h >= w) {
    const band = Math.round(h * 0.13), tb = o.bandTop !== false && o.bands ? band : 0, bb = o.bandBottom !== false && o.bands ? band : 0, top = tb, avail = h - tb - bb;
    let h1, h2 = 0;
    if (main === 'code') h1 = avail;
    else if (!r1) h1 = second ? Math.round(avail * 0.5) : avail;
    else h1 = Math.min(Math.round(w / r1), second ? Math.round(avail * 0.62) : avail);
    if (second === 'code') h2 = avail - h1 - pad;
    else if (second === 'soul') h2 = Math.min(avail - h1 - pad, Math.round(w / SOUL));
    const used = h1 + (second ? pad + h2 : 0), y0 = Math.round(top + (avail - used) / 2);
    box(main, r1 ? fit(0, y0, w, h1, r1) : { x: 0, y: y0, w, h: h1 });
    if (bleed) out[main].bleed = second ? { x: 0, y: y0, w, h: h1 } : { x: 0, y: top, w, h: avail };
    if (second) box(second, { x: 0, y: y0 + h1 + pad, w, h: h2 });
    if (tb) out.top = { x: 0, y: 0, w, h: y0 };
    if (bb) out.bottom = { x: 0, y: y0 + used, w, h: h - y0 - used };
    return out;
  }
  const strip = o.bands ? Math.round(h * 0.14) : 0, avail = h - strip, w1 = second ? Math.round(w * 2 / 3) : w;
  box(main, r1 ? fit(0, 0, w1, avail, r1) : { x: 0, y: 0, w: w1, h: avail });
  if (bleed) out[main].bleed = { x: 0, y: 0, w: w1, h: avail };
  if (second) { const b = { x: w1, y: pad, w: w - w1, h: avail - 2 * pad }; box(second, second === 'soul' ? fit(b.x + pad, b.y, b.w - 2 * pad, b.h, SOUL) : b); }
  if (o.bands) out.strip = { x: 0, y: avail, w, h: strip };
  return out;
}

// where to cut a soul view so its main element stays in a fragment (logical pixels of the 1200×760 screen):
// x, y for views with a centre (the radar, the sphere, the lattice, the aura); time(u) for views laid out along the
// song from left to right, so the stretch of the song the fragment plays (u: its middle, 0..1 of the song) stays in sight
export const SOUL_FOCUS = {
  a: { x: 460, y: 410 }, c: { x: 560, y: 410 }, d: { x: 600, y: 400 }, i: { x: 620, y: 420 },
  b: { y: 420, time: u => 640 + (u - .5) * 960 },
  e: { y: 300, time: u => 600 + (-720 + 1380 * u) * 900 / (1800 - 700 * u) },
  f: { y: 430, time: u => 600 + (u - .5) * 1100 },
  g: { y: 470, time: u => 40 + u * 1120 },
  h: { y: 420, time: u => 30 + u * 1125 },
  j: { y: 400, time: u => 40 + u * 1120 },
};
export function soulFocus(view, u = .5) {
  const f = SOUL_FOCUS[view]; if (!f) return { x: 600, y: 380 };
  return { x: f.time ? f.time(Math.max(0, Math.min(1, u))) : f.x, y: f.y };
}
// the offset of a cover-cut picture (size sw×sh scaled by k) in a box of bw×bh, keeping the point fx, fy in view
export const coverOffset = (bw, bh, sw, sh, k, fx, fy) => ({ x: Math.min(0, Math.max(bw - sw * k, bw / 2 - fx * k)), y: Math.min(0, Math.max(bh - sh * k, bh / 2 - fy * k)) });

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
