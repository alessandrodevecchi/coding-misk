// Comments in the code of a live build (performance-profiles, code-writing): the title line, and separate options for
// the track names (headers), the section and pattern notes, and the step phrases ("// > …", the spoken phrase).
// Presets: all (every option on), essential (the track names), none (code only, a blank line between blocks).
// Pure text in, text out.
export const COMMENT_LEVELS = ['all', 'essential', 'none'];
export const COMMENT_OPTIONS = ['tracks', 'notes', 'steps'];
export const COMMENT_PRESETS = {
  all: { tracks: true, notes: true, steps: true },
  essential: { tracks: true, notes: false, steps: false },
  none: { tracks: false, notes: false, steps: false },
};
// the preset the options make, or 'custom'
export const commentPreset = o => COMMENT_LEVELS.find(k => COMMENT_OPTIONS.every(x => COMMENT_PRESETS[k][x] === !!o[x])) || 'custom';
const HEADER = /^\/\/ =+ .* =+$/;
// o: { title, tracks, notes, steps }, or the older { title, comments: preset }
export function applyComments(code, o = {}) {
  const { title = true } = o, opt = o.comments && COMMENT_PRESETS[o.comments] ? COMMENT_PRESETS[o.comments] : { ...COMMENT_PRESETS.all, ...Object.fromEntries(COMMENT_OPTIONS.filter(k => k in o).map(k => [k, !!o[k]])) };
  if (title && opt.tracks && opt.notes && opt.steps) return code;
  const out = [];
  code.split('\n').forEach((l, i) => {
    const s = l.trim();
    if (i === 0 && s.startsWith('// coding-misk')) { if (title) out.push(l); return; }
    if (s.startsWith('//')) {
      if (HEADER.test(s)) out.push(opt.tracks ? l : '');
      else if (/^\/\/ (>|")/.test(s) ? opt.steps : opt.notes) out.push(l);
      return;
    }
    // a comment after the code on the same line ("const section1 = …  // Intro · 8 bars")
    out.push(opt.notes ? l : l.replace(/\s{2,}\/\/ .*$/, ''));
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
}
