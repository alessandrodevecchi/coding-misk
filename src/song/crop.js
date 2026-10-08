// Crops the code of a compiled song to bars [from, to): the section list, the tempo map and every
// section lane ("<0!300 1!16 0!256>") keep only those bars. Used to save the code written by hand in the
// radio (#33): the radio's window has silent bars before the song on air and the next song after it.
const LANE = /"<((?:\s*[01](?:!\d+)?)+)\s*>"/g;
const quoteFix = s => s.replace(/'/g, '"');

function cropLane(body, from, to) {
  const bars = [];
  for (const tok of body.trim().split(/\s+/)) { const [v, n] = tok.split('!'); for (let i = 0; i < (n ? +n : 1); i++) bars.push(v); }
  const cut = bars.slice(from, to), out = [];
  for (let i = 0; i < cut.length;) { let j = i; while (j < cut.length && cut[j] === cut[i]) j++; out.push(j - i > 1 ? `${cut[i]}!${j - i}` : cut[i]); i = j; }
  return `"<${out.join(' ')}>"`;
}

export function cropCode(code, from, to) {
  if (!(to > from)) return code;
  let out = code.replace(LANE, (m, body) => cropLane(body, from, to));
  // sections and tempo: only the sections inside the bars kept, cut at the edges
  const sec = out.match(/const SECTIONS = (\[.*\])/);
  if (sec) {
    let list; try { list = JSON.parse(quoteFix(sec[1])); } catch (e) { return out; }
    const kept = []; let at = 0;
    for (const [name, len] of list) { const a = Math.max(at, from), b = Math.min(at + len, to); if (b > a) kept.push([name, b - a]); at += len; }
    out = out.replace(sec[0], `const SECTIONS = [${kept.map(([n, l]) => `['${n.replace(/'/g, "\\'")}', ${l}]`).join(', ')}]`);
    const tm = out.match(/const TEMPO = (\{.*\})/);
    if (tm) {
      try {
        const tempo = JSON.parse(quoteFix(tm[1])), names = new Set(kept.map(([n]) => n));
        const keep = Object.entries(tempo).filter(([k]) => names.has(k)).map(([k, v]) => `'${k.replace(/'/g, "\\'")}': ${Array.isArray(v) ? `[${v.join(', ')}]` : v}`);
        out = out.replace(tm[0], `const TEMPO = {${keep.join(', ')}}`);
      } catch (e) { /* a tempo map edited by hand stays as it is */ }
    }
  }
  return out;
}
