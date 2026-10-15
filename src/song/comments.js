// Comments in the code of a live build (performance-profiles): the title line on or off, and a level.
// all: as compiled; essential: the title and the track headers; none: code only, a blank line between blocks.
// Pure text in, text out.
export const COMMENT_LEVELS = ['all', 'essential', 'none'];
const HEADER = /^\/\/ =+ .* =+$/;
export function applyComments(code, { title = true, comments = 'all' } = {}) {
  if (title && comments === 'all') return code;
  const out = [];
  code.split('\n').forEach((l, i) => {
    const s = l.trim();
    if (i === 0 && s.startsWith('// coding-misk')) { if (title) out.push(l); return; }
    if (s.startsWith('//')) {
      if (comments === 'all') out.push(l);
      else if (HEADER.test(s)) out.push(comments === 'essential' ? l : '');
      return;
    }
    // a comment after the code on the same line ("const section1 = …  // Intro · 8 bars")
    out.push(comments === 'all' ? l : l.replace(/\s{2,}\/\/ .*$/, ''));
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
}
