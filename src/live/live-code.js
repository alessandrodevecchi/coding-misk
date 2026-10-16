// The code a live build shows at a bar (code-now, compact, track or sections view), from the song, its build and the
// controls in force (performance-profiles). Pure: the app and the Node checks build the same code.
import { compileSong } from '../song/compile.js';
import { buildSteps, stateAt, annotate, voiceCode } from '../song/build.js';
import { compileCompact, compileNow } from '../song/compile-compact.js';
import { applyComments } from '../song/comments.js';
import { idiomatic } from '../song/idiom.js';
import { breakLines, lineLike } from '../song/typing.js';
import { writeCode, levelsOf, busesOf, tail, preludeText, splitVoice } from '../song/writer.js';

// build: the live build (a song with steps); C: the controls; lang(): the language of the comments; files(): the
// custom samples manifest, for the spoken comments; cols(): the width of the code panel in characters, for the line
// breaks (typing-lines)
// → { build (with the code-of-the-moment steps), now, codeAt(bar, keep), run(shown): the code to evaluate (the code
// shown and its hidden tail: mixer and hidden voice, code-writing), standalone(shown): the same with the helpers written
// out, buses (for the short `.o()`) }
export function liveCode(build, C, { lang = () => 'en', files = () => ({}), cols = () => 0 } = {}) {
  const liveCode = C.view, liveGen = C.gen;
  // the code of the moment (code-now): each section boundary is a step, and the bars before it prepare the next
  // section's lines (muted); the steps go first on their bar, so a comment on the same bar stays the latest
  const now = build.crescendo && liveCode === 'now';
  if (now) {
    const extra = [];
    let at = 0;
    build.sections.forEach((x, k) => { if (k > 0) extra.push({ at: Math.max(at - x.bars + 1, at - (build.sections[k - 1].bars >= 4 ? 2 : 1)) }, { at }); at += x.bars; });
    build = { ...build, build: [...extra.filter(x => x.at > 0), ...build.build] };
  }
  const boundary = bar => { let a = 0; for (const x of build.sections) { a += x.bars; if (a > bar) return a; } return Infinity; };
  const prepFrom = b => { const k = build.sections.findIndex((_, j) => build.sections.slice(0, j + 1).reduce((y, z) => y + z.bars, 0) === b); return k >= 0 ? b - (build.sections[k].bars >= 4 ? 2 : 1) : Infinity; };
  // keep(track): optional, only the tracks it keeps are compiled (the fast export renders a block with the tracks that play in it)
  const only = (song, keep) => (keep ? { ...song, tracks: song.tracks.filter(keep) } : song);
  const compact = build.crescendo && liveCode !== 'sections', waiting = compact ? [...new Set(buildSteps(build).flatMap(x => (x.add !== undefined ? [].concat(x.add) : [])))] : [];
  const compile = compact ? s => compileCompact(s, { muted: waiting, lines: liveCode === 'track' ? 'track' : 'joined' }) : compileSong;
  // tracks that played before a bar and are silent at it (a break): shown muted in the code of the moment
  const played = bar => [...new Set(buildSteps(build).filter(x => x.at <= bar && x.add !== undefined).flatMap(x => [].concat(x.add)))];
  const gen = build.crescendo && liveGen === 'idiomatic' ? idiomatic : c => c;
  // tracks that came in by a bar: they keep their header in the code of the moment
  const entered = bar => [...new Set([...played(bar), ...build.tracks.filter(x => !waiting.includes(x.id) && (x.clips || []).some(c => (c.start ?? 0) <= bar)).map(x => x.id)])];
  const compileAt = (song, bar) => gen(now ? compileNow(song, bar, { prepare: bar >= prepFrom(boundary(bar)), shownMuted: played(bar), keepHeaders: entered(bar) }) : compile(song));
  // technical functions (code-writing): the written levels and the buses come from the song as written
  const mode = C.functions || 'full', ref = mode === 'full' ? '' : compileSong({ ...build, build: undefined });
  const written = levelsOf(ref), buses = busesOf(ref), table = new Map(), hidden = new Map();
  const codeAt = (bar, keep) => {
    const st = stateAt(build, bar), total = build.sections.reduce((a, x) => a + x.bars, 0);
    const c = annotate(compileAt(only(st.song, keep), bar), build, st.upTo, lang()) + voiceCode(build, st.song, st.upTo, total, lang(), files());
    // the voice is taken out before the comments go: it is found by its header
    const v = C.voice === false ? splitVoice(c) : { shown: c, voice: '' }, w = writeCode(applyComments(v.shown, C), { mode, written, buses });
    w.voice = v.voice;
    w.table.forEach((e, k) => table.set(k, e));
    let out = C.wrap ? breakLines(w.code, cols()) : w.code;
    if (!out.includes('$:')) out = `${out}\n$: silence`;
    if (w.voice) hidden.set(out, w.voice);
    return out;
  };
  // nothing hidden: the code shown is the code evaluated
  const run = mode === 'full' && C.voice !== false ? null : shown => shown + tail(shown, { table, voice: hidden.get(shown) || '', like: lineLike });
  // the code that plays anywhere (copied, opened in Strudel): the helpers written out, the code shown, its tail
  const standalone = run && (shown => { const pre = mode === 'full' ? '' : preludeText(buses); return pre + shown + tail(shown, { table: mode === 'full' ? new Map() : table, voice: hidden.get(shown) || '', like: lineLike, offset: pre.length }); });
  return { build, now, codeAt, run, standalone, buses };
}
