// Timeline of the song on air for the live picture and session videos (#65): rows per track, clips, sections,
// playhead, the bars already played shaded, step marks with their comments; the whole song or a scrolling window.
// Pure canvas drawing from a song shape and a bar, no DOM: shared by the live picture, live video and fast video.
// shape: { bars, sections: [{ label, start, len }], tracks: [{ id, name, type, clips: [{ start, bars }], off: [[a, b]], marks: [{ at, say }] }] }

// track colours per type, mixed with the look's accents
const TYPE_TONE = { drums: 'a1', bass: 'a2', guitar: 'a3', arp: 'a2', hook: 'a1', pad: 'a3', texture: 'muted', riser: 'a3', code: 'muted', module: 'a2' };

// future: 'show' | 'hide' | 'auto'; auto hides what is coming for songs with a live build (blocks or crescendo)
export const FUTURE = ['auto', 'show', 'hide'];
export const futureShown = (future, liveBuild) => (future === 'show' ? true : future === 'hide' ? false : !liveBuild);

// the bars shown: the whole song, or a window of `window` bars with the playhead at a third
export function shownRange(bars, bar, window) {
  if (!window || window >= bars) return [0, bars];
  const a = Math.max(0, Math.min(bars - window, bar - window / 3));
  return [a, a + window];
}
// tracks that play at a bar (in a clip and not silenced by the live build)
export const playingAt = (tr, bar) => (tr.clips || []).some(c => bar >= c.start && bar < c.start + c.bars) && !(tr.off || []).some(([a, b]) => bar >= a && bar < b);

function round(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// P: palette { bg, panel, line, ink, muted, a1, a2, a3 }; opts: { window, future, say (lang → text of a mark) }
export function drawTimeline(ctx, area, shape, bar, P, { window = 0, future = true, sayOf = s => (typeof s === 'string' ? s : (s && (s.en || Object.values(s)[0])) || '') } = {}) {
  if (!shape || !shape.bars || area.a <= 0.01) return;
  const { x, y, w, h } = area, tracks = (shape.tracks || []).filter(t => t.type !== 'voice');
  const [b0, b1] = shownRange(shape.bars, bar, window), span = b1 - b0;
  const font = Math.max(9, Math.round(h / 16)), labelW = Math.max(60, Math.round(w * 0.12)), head = Math.round(font * 1.7);
  const gx = x + labelW, gw = w - labelW - 6, rows = Math.max(1, tracks.length), rowH = Math.max(4, (h - head - 6) / rows);
  const X = b => gx + ((b - b0) / span) * gw;
  ctx.save();
  ctx.globalAlpha = area.a;
  round(ctx, x, y, w, h, Math.round(h / 24)); ctx.fillStyle = P.panel; ctx.globalAlpha = area.a * 0.86; ctx.fill(); ctx.globalAlpha = area.a;
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.font = `600 ${font}px ui-monospace, Menlo, monospace`; ctx.textBaseline = 'middle';
  // sections
  for (const s of shape.sections || []) {
    if (s.start + s.len <= b0 || s.start >= b1) continue;
    const sx = Math.max(gx, X(s.start)), ex = Math.min(gx + gw, X(s.start + s.len));
    ctx.fillStyle = P.line; ctx.fillRect(sx, y + 4, 1, h - 8);
    ctx.fillStyle = P.muted; ctx.fillText(String(s.label || '').slice(0, Math.max(1, Math.floor((ex - sx - 6) / (font * 0.62)))), sx + 4, y + head / 2 + 2);
  }
  // rows
  tracks.forEach((tr, i) => {
    const ry = y + head + i * rowH, ch = Math.max(2, rowH * 0.62), cy = ry + (rowH - ch) / 2;
    ctx.fillStyle = P.ink; ctx.globalAlpha = area.a * 0.85;
    ctx.fillText(String(tr.name || tr.id).slice(0, Math.max(3, Math.floor((labelW - 12) / (font * 0.62)))), x + 8, ry + rowH / 2);
    ctx.globalAlpha = area.a;
    const tone = P[TYPE_TONE[tr.type] || 'a1'] || P.a1;
    for (const c of tr.clips || []) {
      const a = Math.max(b0, c.start), z = Math.min(b1, c.start + c.bars);
      if (z <= a) continue;
      round(ctx, X(a) + 1, cy, Math.max(2, X(z) - X(a) - 2), ch, ch / 4); ctx.fillStyle = tone; ctx.globalAlpha = area.a * 0.8; ctx.fill();
    }
    // silent because of the live build: dimmed
    for (const [a0, z0] of tr.off || []) {
      const a = Math.max(b0, a0), z = Math.min(b1, z0);
      if (z <= a) continue;
      ctx.fillStyle = P.panel; ctx.globalAlpha = area.a * 0.7; ctx.fillRect(X(a), cy - 1, X(z) - X(a), ch + 2);
    }
    ctx.globalAlpha = area.a;
    for (const m of tr.marks || []) {
      if (m.at < b0 || m.at >= b1) continue;
      ctx.fillStyle = P.ink; ctx.fillRect(X(m.at) - 1, cy - 2, 2, ch + 4);
    }
  });
  // played bars shaded, playhead
  const px = X(Math.max(b0, Math.min(b1, bar)));
  ctx.fillStyle = P.bg; ctx.globalAlpha = area.a * 0.35; ctx.fillRect(gx, y + head, px - gx, h - head); ctx.globalAlpha = area.a;
  // what is coming hidden (a live build keeps its surprise)
  if (!future) { ctx.fillStyle = P.panel; ctx.fillRect(px, y + head - 2, gx + gw - px + 6, h - head + 2); }
  ctx.fillStyle = P.a1; ctx.fillRect(px - 1, y + 2, 3, h - 4);
  // the comment of the latest step, next to the playhead
  const last = tracks.flatMap(t => (t.marks || []).filter(m => m.say && m.at <= bar && bar < m.at + 4)).sort((a, b) => b.at - a.at)[0];
  if (last) {
    const txt = `> ${sayOf(last.say)}`, tw = ctx.measureText(txt).width + 12, tx = Math.min(px + 6, x + w - tw - 4);
    round(ctx, tx, y + 3, tw, head - 4, 4); ctx.fillStyle = P.bg; ctx.fill(); ctx.fillStyle = P.a2 || P.ink; ctx.fillText(txt, tx + 6, y + head / 2 + 1);
  }
  ctx.restore();
}

// the track column: tracks playing now lit, the next track to come and the bars left before it
export function drawColumn(ctx, area, shape, bar, P, { future = true } = {}) {
  if (!shape || area.a <= 0.01) return;
  const { x, y, w, h } = area, tracks = (shape.tracks || []).filter(t => t.type !== 'voice');
  const font = Math.max(10, Math.round(Math.min(h / 22, w / 12))), rowH = Math.min(font * 2.4, (h - font * 3) / Math.max(1, tracks.length));
  ctx.save(); ctx.globalAlpha = area.a;
  round(ctx, x, y, w, h, Math.round(w / 24)); ctx.fillStyle = P.panel; ctx.globalAlpha = area.a * 0.86; ctx.fill(); ctx.globalAlpha = area.a;
  ctx.font = `600 ${font}px ui-monospace, Menlo, monospace`; ctx.textBaseline = 'middle';
  tracks.forEach((tr, i) => {
    const ry = y + font + i * rowH, lit = playingAt(tr, bar), tone = P[TYPE_TONE[tr.type] || 'a1'] || P.a1;
    round(ctx, x + font * 0.6, ry + rowH * 0.2, font * 0.9, rowH * 0.6, 3); ctx.fillStyle = lit ? tone : P.line; ctx.fill();
    ctx.fillStyle = lit ? P.ink : P.muted; ctx.fillText(String(tr.name || tr.id).slice(0, 14), x + font * 2, ry + rowH / 2);
  });
  // next track to come in
  if (future) {
    const next = tracks.map(tr => ({ tr, at: Math.min(...[...(tr.clips || []).map(c => c.start), ...(tr.off || []).map(o => o[1])].filter(b => b > bar && playingAt(tr, b)), Infinity) })).filter(n => n.at < Infinity).sort((a, b) => a.at - b.at)[0];
    if (next) { ctx.fillStyle = P.a2 || P.ink; ctx.fillText(`${next.tr.name || next.tr.id} · ${Math.ceil(next.at - bar)}`, x + font * 0.6, y + h - font * 1.2); }
  }
  ctx.restore();
}
