// Measures of a live build for the growth shapes (growth-shapes): audible changes in the first minute, when the kick
// plays its written row, and how fast the human typing has to go for each step (bursts of edits). Used by
// tools/check-crescendo.mjs; no browser.
import { compileSong } from '../src/song/compile.js';
import { buildSteps, stateAt } from '../src/song/build.js';
import { normalizeSong } from '../src/song/format.js';
import { ideaRows } from '../src/song/ideas.js';
import { meterSteps } from '../src/music.js';

// seconds of one bar of the growth (the first section)
export { barSeconds } from '../src/live/typing-load.js';
import { barSeconds } from '../src/live/typing-load.js';

// what is heard in a state: its pattern lines ("$:" and their continuation lines), only the "S$:" ones while there are
// some, never the muted "_$:" ones; comments and section lanes left out
export function audible(code) {
  const layers = [];
  let cur = null;
  for (const l of code.split('\n')) {
    if (/^[_S]?\$:/.test(l)) { cur = { solo: l.startsWith('S'), muted: l.startsWith('_'), text: l.replace(/^[_S]?\$:\s*/, '') }; layers.push(cur); continue; }
    if (cur && /^\s+\S/.test(l) && !/^\s*\/\//.test(l)) { cur.text += l.trim(); continue; }
    cur = null;
  }
  const solo = layers.some(x => x.solo && !x.muted);
  return layers.filter(x => !x.muted && (!solo || x.solo)).map(x => x.text.replace(/\s*\/\/.*$/, '')).join('\n');
}

// bars of the steps in the first `seconds` that change what is heard (the first sound counts)
export function firstMinute(c, seconds = 60) {
  const sb = barSeconds(c), bars = [...new Set(buildSteps(c).map(x => x.at))].filter(b => b * sb < seconds);
  let prev = '';
  const out = [];
  for (const b of bars) { const a = audible(compileSong(stateAt(c, b).song)); if (a !== prev && a.trim()) out.push(b); prev = a; }
  return out;
}

// the kick row a drum pattern plays (rows, or a beat idea), as x and dots
const kickRow = (pat, N) => { if (!pat) return ''; const rows = pat.rows || (pat.idea ? ideaRows(pat.idea, N) : {}); return String((rows || {}).bd || '').replace(/[^x]/g, '.'); };
// the first bar where the drums play their written kick row (audibly), and the bar where the drums first play;
// null when no drum track of the growth has a kick
export function fullKick(c) {
  const n = normalizeSong(c), N = meterSteps(n.sections[0].meter || '4/4');
  const drums = c.tracks.filter(t => t.type === 'drums' && !t.mute);
  // the kick row of the pattern a state's clip grows toward (its name without the level, "A~2" → "A")
  const goal = (t, name) => kickRow((t.patterns || {})[String(name).replace(/~\w+$/, '')], N);
  const written = drums.map(t => ({ t, row: goal(t, (t.clips[0] || {}).pattern) })).filter(x => /x/.test(x.row));
  if (!written.length) return null;
  const bars = [0, ...new Set(buildSteps(c).map(x => x.at))].sort((a, b) => a - b);
  let first = null;
  for (const b of bars) {
    const st = stateAt(c, b).song, solo = st.tracks.some(t => t.alone && !t.mute);
    for (const { t, row } of written) {
      const s = st.tracks.find(x => x.id === t.id), heard = s && !s.mute && !s.hush && (!solo || s.alone);
      if (!heard) continue;
      if (first === null) first = b;
      const clip = s.clips.find(x => x.start <= b && x.start + x.bars > b) || s.clips[0];
      if (/x/.test(goal(s, clip.pattern)) && kickRow((s.patterns || {})[clip.pattern], N) === goal(s, clip.pattern)) return { bar: b, first, seconds: b * barSeconds(c), fromFirst: (b - first) * barSeconds(c) };
    }
  }
  return { bar: null, first, seconds: Infinity, fromFirst: Infinity };
}

// the typing load of each step: src/live/typing-load.js (the growth uses it to pick a shape without rushed steps)
export { typingLoad } from '../src/live/typing-load.js';
