// Stage captions (spoken-text-on-stage): what is heard over the visual, with its speaker. One frame function reads the
// caption schedule of a song (captionSchedule in src/song/build.js) at a bar with the "Testi sul palco" settings and
// gives the rows to draw; the page lane (HTML) and every canvas (videos, the timeline layout, fragments, the live
// output) draw that same frame, so they cannot disagree. Pure apart from drawCaptions (a canvas context).
import { SPEAKER_KINDS, MARKS, captionRows } from '../song/speakers.js';

export const CAPTIONS_KEY = 'coding-misk-captions';
// D7: one switch, on by default, and the choices under it, kept while it is off
//   narrator, voice, typed (lines typed in the radio console), steps (step lines), claude (the "Claude" look's replies)
//   stepForm: 'tag' (small, below the spoken line) or 'instead' (the step line as the caption, the old behaviour)
//   marks: { kind: one of MARKS } (D12; a kind without one takes its registry default)
//   where: 'look' (as the look says), 'bottom', 'top'; videos: the same texts in every video and the live output
export const CAPTION_DEFAULTS = { on: true, narrator: true, voice: true, typed: true, steps: true, claude: true, stepForm: 'tag', marks: {}, where: 'look', videos: true };
export const WHERES = ['look', 'bottom', 'top'];
export const STEP_FORMS = ['tag', 'instead'];
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
// the settings from what was stored (anything unknown falls back to the default)
export function captionSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, D = CAPTION_DEFAULTS, marks = {};
  for (const k of Object.keys(SPEAKER_KINDS)) marks[k] = r.marks && MARKS.includes(r.marks[k]) ? r.marks[k] : SPEAKER_KINDS[k].mark;
  return {
    on: bool(r.on, D.on), narrator: bool(r.narrator, D.narrator), voice: bool(r.voice, D.voice), typed: bool(r.typed, D.typed), steps: bool(r.steps, D.steps), claude: bool(r.claude, D.claude),
    stepForm: STEP_FORMS.includes(r.stepForm) ? r.stepForm : D.stepForm, marks, where: WHERES.includes(r.where) ? r.where : D.where, videos: bool(r.videos, D.videos),
  };
}
// the mark of a kind: { icon, style, label } switches (D12)
export function markOf(S, kind) {
  const k = SPEAKER_KINDS[kind], m = (S && S.marks && S.marks[kind]) || (k ? k.mark : 'none');
  return { mark: m, icon: !!k && (m === 'icon' || m === 'icon+style'), style: !!k && (m === 'style' || m === 'icon+style'), label: !!k && m === 'label', colour: !!k && m !== 'none' };
}
// the kinds' colours on the dark stage (the stage stays dark in every app theme)
export const KIND_COLOURS = { cyan: '#4fe3ff', magenta: '#ff5fd2', amber: '#ffb347' };
export const kindColour = kind => KIND_COLOURS[(SPEAKER_KINDS[kind] || {}).colour] || null;
// drawn line icons, 24×24, stroked (the same paths in the page and on canvases)
export const ICONS = {
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7',
  wave: 'M3 12h1.5M7 8.5v7M10.5 5v14M14 8v8M17.5 10v4M21 12h-1.5',
  note: 'M9 18V5.5l11-2.5v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
};
// the text of a caption in its kind's style: the voice track in quotes, the narrator in italics (a flag), a future
// singing voice between notes
export function styledText(kind, text, style) {
  const s = style && SPEAKER_KINDS[kind] ? SPEAKER_KINDS[kind].style : null;
  return { text: s === 'quoted' ? `“${text}”` : s === 'sung' ? `♪ ${text} ♪` : text, italic: s === 'italic' };
}

const EMPTY = Object.freeze({ rows: [], tag: '', history: [] });
// Is a line of the schedule shown with these settings? hand: the user types by hand (only the voice track shows, tp7)
export function shownLine(x, S, hand = false) {
  if (x.kind === 'step') return false;
  if (x.kind === 'narrator') return !!S.narrator && !hand;
  if (x.kind === 'voice') return x.typed ? !!S.typed : !!S.voice;
  return S[x.kind] !== false && !hand;
}
// The captions at a bar: { rows: [{ kind, text, at, until, since, fade, speaker, typed, seconds }], tag, history }.
// lines: captionSchedule (bars from the start of the song the lines belong to; `offset` shifts them, the radio's song on
// air); bar: the bar now. opts: hand (typing by hand), video (a video or the live output: off with "In videos too"
// off), barSec (a bar in seconds, for the 0.2 s fade), history (the shown lines up to now, for the "Claude" look).
export function captionFrame(lines, bar, S, opts = {}) {
  if (!S || !S.on || !Array.isArray(lines) || !lines.length || (opts.video && !S.videos)) return EMPTY;
  const off = opts.offset || 0, b = bar - off, hand = !!opts.hand, barSec = opts.barSec || 2;
  const row = x => ({ kind: x.kind, text: x.text, at: x.at + off, until: x.until + off, since: b - x.at, fade: Math.max(0, Math.min(1, ((b - x.at) * barSec) / 0.2)), speaker: x.speaker || '', typed: !!x.typed, seconds: x.seconds || null, step: x.step || '' });
  const live = x => x.at <= b && b < x.until;
  const instead = S.steps && S.stepForm === 'instead';
  const active = lines.filter(x => live(x) && shownLine(x, S, hand) && !(instead && x.kind === 'narrator'));
  const rows = captionRows(active).map(row);
  const st = S.steps && !hand ? lines.filter(x => x.kind === 'step' && live(x)).pop() : null;
  let tag = '';
  if (st && instead) rows.push({ ...row(st), kind: 'step' });
  else if (st && !st.heard && !rows.some(r => r.text === st.text)) tag = st.text;
  const history = opts.history ? lines.filter(x => x.at <= b && shownLine(x, S, hand)).map(row) : [];
  return { rows, tag, history };
}

// ---------- the page lane ----------
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const iconSvg = (kind, cls = 'cap-ico') => { const k = SPEAKER_KINDS[kind]; return k && ICONS[k.icon] ? `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[k.icon]}"/></svg>` : ''; };
// the lane's HTML: one row per speaker (the highest rank on top), the step tag below. label(kind): the kind's word in
// the app language; name(row): the voice's name for the tooltip
export function captionHtml(frame, S, { label = k => k, name = () => '' } = {}) {
  const rows = frame.rows.slice().reverse().map(r => {
    const m = markOf(S, r.kind), st = styledText(r.kind, r.text, m.style), nm = name(r);
    return `<div class="cap-row" data-kind="${r.kind}" data-mark="${r.kind === 'step' ? 'none' : m.mark}"${nm ? ` title="${escHtml(nm)}"` : ''}>${m.icon ? iconSvg(r.kind) : ''}${m.label ? `<span class="cap-lbl">${escHtml(label(r.kind))}</span>` : ''}<span class="cap-txt${st.italic ? ' it' : ''}">${escHtml(st.text)}</span></div>`;
  }).join('');
  return rows + (frame.tag ? `<div class="cap-tag">${escHtml(frame.tag)}</div>` : '');
}

// ---------- canvases (videos, the timeline layout, fragments, the live output) ----------
// The frame drawn in an area { x, y, w, h } of a canvas (D6). o: scale (1 at 1080p), tall (9:16: the lower third, two
// lines at most, the speaker above the text), where ('look' | 'bottom' | 'top'), hw (the amber display with a light
// per speaker), label(kind), font (a monospace family). → the rows drawn (for the checks)
export function drawCaptions(g, area, frame, S, o = {}) {
  if (!frame || (!frame.rows.length && !frame.tag)) return [];
  const sc = o.scale || 1, font = o.font || '"JetBrains Mono", ui-monospace, monospace', label = o.label || (k => k);
  const fs = Math.round((o.tall ? 40 : 34) * sc), small = Math.round(fs * 0.62), pad = Math.round(14 * sc), gap = Math.round(6 * sc), ico = Math.round(fs * 0.9);
  const maxW = area.w - pad * 4;
  g.save();
  // the rows, each with its lines (two at most in 9:16)
  const blocks = frame.rows.slice().reverse().map(r => {
    const m = markOf(S, r.kind), st = styledText(r.kind, r.text, m.style), col = o.hw ? '#ffb347' : (m.colour && kindColour(r.kind)) || '#f3ecff';
    g.font = `${st.italic ? 'italic ' : ''}700 ${fs}px ${font}`;
    const head = (m.icon ? ico + gap : 0) + (m.label ? measure(g, `${label(r.kind)} `, `600 ${small}px ${font}`) + gap : 0);
    const lines = o.tall ? wrap(g, st.text, maxW, 2) : [fit(g, st.text, maxW - head)];
    return { r, m, st, col, lines, head, w: o.tall ? Math.max(head, ...lines.map(l => g.measureText(l).width)) : head + g.measureText(lines[0]).width, h: (o.tall && head ? small + gap : 0) + lines.length * fs * 1.2 };
  });
  g.font = `600 ${small}px ${font}`;
  const tag = frame.tag ? fit(g, frame.tag, maxW) : '';
  const tagW = tag ? g.measureText(tag).width : 0;
  const w = Math.min(area.w - pad * 2, Math.max(tagW, ...blocks.map(b => b.w), 10) + pad * 2), h = blocks.reduce((a, b) => a + b.h + gap, 0) - (blocks.length ? gap : 0) + (tag ? small * 1.3 + (blocks.length ? gap : 0) : 0) + pad * 1.4;
  const where = o.where === 'top' ? 'top' : 'bottom', x = area.x + (area.w - w) / 2;
  const y = o.tall ? area.y + area.h * 0.67 - h / 2 : where === 'top' ? area.y + area.h * 0.1 : area.y + area.h * 0.86 - h;
  const fade = Math.max(...frame.rows.map(r => r.fade), frame.tag ? 1 : 0);
  g.globalAlpha = fade;
  g.fillStyle = o.hw ? 'rgba(26,14,0,.86)' : 'rgba(0,0,0,.58)';
  round(g, x, y, w, h, 6 * sc); g.fill();
  if (o.hw) { g.strokeStyle = 'rgba(255,179,71,.45)'; g.lineWidth = Math.max(1, sc); round(g, x, y, w, h, 6 * sc); g.stroke(); }
  let cy = y + pad * 0.7;
  g.textBaseline = 'top';
  for (const b of blocks) {
    let cx = x + (w - b.w) / 2;
    g.fillStyle = b.col;
    // the hardware display: one light per speaker, lit while it speaks
    if (o.hw && b.r.kind !== 'step') { g.beginPath(); g.arc(x + pad * 0.6, cy + fs * 0.55, 4 * sc, 0, Math.PI * 2); g.shadowColor = '#ffb347'; g.shadowBlur = 8 * sc; g.fill(); g.shadowBlur = 0; }
    if (b.m.icon) drawIcon(g, b.r.kind, cx, cy + (o.tall ? 0 : (fs * 1.2 - ico) / 2), o.tall ? small * 1.1 : ico, b.col, sc);
    if (b.m.label) { g.font = `600 ${small}px ${font}`; g.fillText(label(b.r.kind), cx + (b.m.icon ? (o.tall ? small * 1.1 : ico) + gap : 0), cy + (o.tall ? 0 : (fs - small) / 2)); }
    if (o.tall && b.head) cy += small + gap;
    else cx += b.head;
    g.font = `${b.st.italic ? 'italic ' : ''}700 ${fs}px ${font}`;
    for (const l of b.lines) { g.fillText(l, o.tall ? x + (w - g.measureText(l).width) / 2 : cx, cy + fs * 0.1); cy += fs * 1.2; }
    cy += gap;
  }
  if (tag) { g.font = `600 ${small}px ${font}`; g.fillStyle = o.hw ? 'rgba(255,179,71,.7)' : 'rgba(243,236,255,.62)'; g.fillText(tag, x + (w - tagW) / 2, cy); }
  g.restore();
  return blocks.map(b => ({ kind: b.r.kind, lines: b.lines, x, y, w, h }));
}
function drawIcon(g, kind, x, y, size, col, sc) {
  const k = SPEAKER_KINDS[kind];
  if (!k || !ICONS[k.icon] || typeof Path2D === 'undefined') return;
  g.save(); g.translate(x, y); g.scale(size / 24, size / 24);
  g.strokeStyle = col; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.stroke(new Path2D(ICONS[k.icon]));
  g.restore();
  void sc;
}
const measure = (g, s, f) => { const was = g.font; g.font = f; const w = g.measureText(s).width; g.font = was; return w; };
// a line cut at a word with an ellipsis when it does not fit
function fit(g, s, w) {
  if (g.measureText(s).width <= w) return s;
  const words = s.split(' ');
  while (words.length > 1 && g.measureText(`${words.join(' ')}…`).width > w) words.pop();
  return `${words.join(' ')}…`;
}
// words in at most n lines, never cut mid-word
function wrap(g, s, w, n) {
  const out = [];
  let cur = '';
  for (const word of s.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (g.measureText(next).width <= w || !cur) cur = next;
    else { out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  if (out.length > n) { const rest = out.slice(n - 1).join(' '); out.length = n - 1; out.push(fit(g, rest, w)); }
  return out;
}
function round(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
