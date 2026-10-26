// The code a live build shows at a bar (code-now, compact, track or sections view), from the song, its build and the
// controls in force (performance-profiles). Pure: the app and the Node checks build the same code.
import { compileSong } from '../song/compile.js';
import { buildSteps, stateAt, annotate, voiceCode } from '../song/build.js';
import { withNarratorStyle } from '../song/spoken.js';
import { compileCompact, compileNow, liftLanes, clipBounds } from '../song/compile-compact.js';
import { applyComments } from '../song/comments.js';
import { idiomatic } from '../song/idiom.js';
import { breakLines, lineLike, chainLines } from '../song/typing.js';
import { pasteRule } from './typing-load.js';
import { planWritten } from './written-plan.js';
import { resolveProfile } from './profiles.js';
import { rampLists } from '../song/ramps.js';
import { writeCode, levelsOf, busesOf, tail, preludeText, splitVoice, functionOptions, functionContext, FUNCTION_OPTIONS, lineKey, addEntry } from '../song/writer.js';

// build: the live build (a song with steps); C: the controls; lang(): the language of the comments; files(): the
// custom samples manifest, for the spoken comments; cols(): the width of the code panel in characters, for the line
// breaks (typing-lines)
// → { build (with the code-of-the-moment steps), now, codeAt(bar, keep), run(shown): the code to evaluate (the code
// shown and its hidden tail: mixer and hidden voice, code-writing), standalone(shown): the same with the helpers written
// out, buses (for `.chan()`), fns (the functions the code calls: name → { params, chain }, song-functions) }
// ramps: false keeps long linear lists as written (tools/check-ramps.mjs compares both)
// canon (reused-lines): this is the reference instance the choices of the code edited in place are made on
export function liveCode(build, C, { lang = () => 'en', files = () => ({}), cols = () => 0, ramps = true, canon = false } = {}) {
  const input = build;
  let self = null;
  // shape-search D8: in a Live coder growth, a long list that moves linearly per bar (a written sweep) is typed as a
  // stepped ramp of signals, before the functions fold it; Classic and Crescendo code stay as written
  const ramp = ramps && build.crescendo && build.crescendo.coder ? rampLists : c => c;
  // the narrator style of the controls (voice-controls): explaining or poetic over the song's own; automatic keeps it
  build = withNarratorStyle(build, C.narratorStyle);
  const liveCode = C.view, liveGen = C.gen;
  // technical functions (code-writing, song-functions, code-lanes): `any`, the options the writer folds (all but fnLanes)
  const o = functionOptions(C), any = FUNCTION_OPTIONS.some(k => k !== 'fnLanes' && o[k]);
  // the Sections option (code-lanes): in every profile and view the code of the moment, edited in place, its section
  // and clip lanes (gated lines too) in the hidden mixer: one line per part, a step at each section and clip change
  const lanes = !!o.fnLanes;
  // the code of the moment (code-now): each section boundary is a step, and the bars before it prepare the next
  // section's lines (muted); the steps go first on their bar, so a comment on the same bar stays the latest
  const now = (build.crescendo && liveCode === 'now') || lanes;
  // Live coder (a growth like a live coder), or Sections: no prepared lines and no section lanes in the code; at a
  // section change each line is edited in place, its lanes play from the hidden mixer (live-coder in-place edits)
  const inPlace = !!(now && ((build.crescendo && build.crescendo.coder) || lanes));
  const bounds = lanes ? clipBounds(build) : null;
  if (now) {
    const extra = [];
    let at = 0;
    build.sections.forEach((x, k) => { if (k > 0) { if (!inPlace) extra.push({ at: Math.max(at - x.bars + 1, at - (build.sections[k - 1].bars >= 4 ? 2 : 1)) }); extra.push({ at }); } at += x.bars; });
    if (bounds) for (const b of bounds) extra.push({ at: b });
    build = { ...build, build: [...extra.filter(x => x.at > 0), ...(build.build || [])] };
  }
  const boundary = bar => { let a = 0; for (const x of build.sections) { a += x.bars; if (a > bar) return a; } return Infinity; };
  const prepFrom = b => { const k = build.sections.findIndex((_, j) => build.sections.slice(0, j + 1).reduce((y, z) => y + z.bars, 0) === b); return k >= 0 ? b - (build.sections[k].bars >= 4 ? 2 : 1) : Infinity; };
  // keep(track): optional, only the tracks it keeps are compiled (the fast export renders a block with the tracks that play in it)
  // (whole: the song with every track, so the voice instrument's quiet sections stay the same, voice-instrument)
  const only = (song, keep) => (keep ? { ...song, tracks: song.tracks.filter(keep), whole: song } : song);
  const compact = build.crescendo && liveCode !== 'sections', waiting = compact ? [...new Set(buildSteps(build).flatMap(x => (x.add !== undefined ? [].concat(x.add) : [])))] : [];
  const compile = compact ? s => compileCompact(s, { muted: waiting, lines: liveCode === 'track' ? 'track' : 'joined' }) : compileSong;
  // tracks that played before a bar and are silent at it (a break): shown muted in the code of the moment
  const played = bar => [...new Set(buildSteps(build).filter(x => x.at <= bar && x.add !== undefined).flatMap(x => [].concat(x.add)))];
  const gen = build.crescendo && liveGen === 'idiomatic' ? idiomatic : c => c;
  // tracks that came in by a bar: they keep their header in the code of the moment
  const entered = bar => [...new Set([...played(bar), ...build.tracks.filter(x => !waiting.includes(x.id) && (x.clips || []).some(c => (c.start ?? 0) <= bar)).map(x => x.id)])];
  // code edited in place (written-like-coder): from the written part on (the whole song without a growth), a line silent
  // now that sounded before and sounds again later stays muted in its place; the growth's code is left as it was
  const returning = !inPlace ? Infinity : build.crescendo ? build.crescendo.growth ?? Infinity : 0;
  // reused-lines D1, D2: one line of the compiled code (its lanes left out) as the code shows it, for the choices of the
  // code edited in place (mute or delete, which lines are the same line); a voice line keeps its form (its function
  // name depends on the order the writer meets the voices)
  const shownMemo = new Map();
  const shownLine = text => {
    if (/say_/.test(text)) return ramp(text);
    let v = shownMemo.get(text);
    if (v === undefined) { try { v = writeCode(ramp(gen(text)), { mode: o, written, buses, fns: fctx }).code; } catch (e) { v = ramp(text); } if (shownMemo.size > 5000) shownMemo.clear(); shownMemo.set(text, v); }
    return v;
  };
  // a radio song steered on air (radio-profiles D9): before the section that holds its first command's boundary, the
  // code of the moment is written from the song before its commands (`codeRef`, `until`), so the lines kept muted for
  // later (written-like-coder, reused-lines) stay as they were shown
  const refUntil = build.codeRef && Number.isFinite(build.codeRef.until) ? (() => { let a = 0; for (const s of build.sections) { if (a + s.bars > build.codeRef.until - 1) return a; a += s.bars; } return a; })() : -Infinity;
  const refBuild = refUntil > 0 ? { ...build, tracks: build.codeRef.tracks, sections: build.codeRef.sections || build.sections } : null;
  // reused-lines: the choices of the code edited in place (mute or delete, which lines are one line, the written part's
  // plan) are made once, on the code as the Live coder profile shows it by default (`reference`; with the Sections option
  // as in these controls, since it adds the steps at clip changes), so every comment and function preset shows the same
  // lines and only writes them differently
  let ref0 = null;
  const refC = resolveProfile('switch', { fnLanes: lanes, duration: C.duration === 'free' ? 'free' : 'fitted' });
  if (!canon && JSON.stringify(refC) === JSON.stringify(C)) canon = true;
  const reference = () => (canon ? self : (ref0 = ref0 || referenceCode(input, refC, { lang, files, ramps, canon: true })));
  const refLine = text => (canon ? shownLine(text) : reference().shownLine(text));
  const compileAt = (song, bar, hide, plan = null, info = null) => gen(now ? compileNow(song, bar, { prepare: !inPlace && bar >= prepFrom(boundary(bar)), shownMuted: played(bar), keepHeaders: entered(bar), inPlace, hidden: hide, gated: lanes, bounds, returning, shownText: refLine, plan, info }) : compile(song));
  // technical functions (code-writing, song-functions): the written levels, the buses and the song's functions come
  // from the song as written
  // (a radio song steered on air, radio-profiles D9, keeps the song before its commands as its reference: `codeRef`,
  // so the code already shown keeps its functions)
  const ref = any ? compileSong({ ...(build.codeRef || build), build: undefined, codeRef: undefined }) : '';
  // the mixer: the entries of each code shown, line by line in order (by its text without the tempo, as the lanes), and
  // a table by line text for code edited by hand (a text two different lines share is ambiguous, writer addEntry)
  const written = levelsOf(ref), buses = busesOf(ref), table = new Map(), entrySets = new Map(), hidden = new Map(), fns = {};
  // in place: the lanes of each code shown (by its text without the tempo, which the player rewrites), and of each
  // line, for code edited by hand
  const laneSets = new Map(), laneLines = new Map(), plainKey = c => c.replace(/setcpm\([^)]*\)/, 'setcpm()');
  const fctx = any ? functionContext(ref, { id: build.id, title: build.title, tags: build.tags, profile: build.profile }, o) : null;
  // the code at a bar; plan, info (reused-lines D4, D8): the plan of the written part and the lines it fills in;
  // wrap: false leaves the long lines unbroken (the plan does not depend on the width of the panel)
  const codeWith = (bar, keep, { plan = null, info = null, wrap = true } = {}) => {
    const st = stateAt(refBuild && bar < refUntil ? refBuild : build, bar), total = build.sections.reduce((a, x) => a + x.bars, 0), hide = inPlace ? [] : null;
    const c = annotate(ramp(compileAt(only(st.song, keep), bar, hide, plan, info)), build, st.upTo, lang()) + (C.narrator === false ? '' : voiceCode(build, st.song, st.upTo, total, lang(), files()));
    // (the narrator off, profile-options: no spoken step lines at all, neither shown nor hidden; the phrases written as
    // comments follow the comment options, the voice instrument's lines are part of the song's code)
    // the voice is taken out before the comments go: it is found by its header
    const v = C.voice === false ? splitVoice(c) : { shown: c, voice: '' };
    const lifted = inPlace ? liftLanes(applyComments(v.shown, C), { gated: lanes }) : { code: applyComments(v.shown, C), lanes: null };
    const w = writeCode(lifted.code, { mode: o, written, buses, fns: fctx });
    w.voice = [hide && hide.length ? hide.join('\n') : '', v.voice].filter(Boolean).join('\n\n');
    w.table.forEach((e, k) => addEntry(table, k, e));
    Object.assign(fns, w.fns);
    let out = C.wrap && wrap ? breakLines(w.code, cols()) : w.code;
    if (!out.includes('$:')) out = `${out}\n$: silence`;
    if (any && w.entries.length === chainLines(out).filter(l => /^\s*[_S]?\$:/.test(l)).length) entrySets.set(plainKey(out), w.entries);
    if (w.voice) hidden.set(plainKey(out), w.voice);
    if (lifted.lanes) {
      laneSets.set(plainKey(out), lifted.lanes);
      let k = 0;
      for (const l of chainLines(out)) if (/^\s*[_S]?\$:/.test(l)) { const ln = lifted.lanes[k++]; if (ln) laneLines.set(lineKey(l), ln); }
    }
    return out;
  };
  // reused-lines D4, D8: in a Live coder growth, the written part's plan (planWritten), made once per language
  const planOn = inPlace && !!(build.crescendo && build.crescendo.coder) && Number.isFinite(returning);
  let planMemo = null;
  const planOf = () => {
    if (!canon) return reference().plan();
    const k = lang();
    if (!planMemo || planMemo.k !== k) planMemo = { k, plan: planWritten(codeWith, build, returning, shownLine) };
    return planMemo.plan;
  };
  const codeAt = (bar, keep) => codeWith(bar, keep, { plan: planOn && bar >= returning ? planOf() : null });
  // the lanes of a code: those of the code shown at a step, else line by line (code edited by hand)
  const lanesOf = shown => {
    if (!inPlace) return null;
    const known = laneSets.get(plainKey(shown));
    if (known) return known;
    return chainLines(shown).filter(l => /^\s*[_S]?\$:/.test(l)).map(l => laneLines.get(lineKey(l)) || null);
  };
  // nothing hidden: the code shown is the code evaluated
  const run = !any && C.voice !== false && !inPlace ? null : shown => shown + tail(shown, { table, entries: entrySets.get(plainKey(shown)) || null, voice: hidden.get(plainKey(shown)) || '', like: lineLike, lanes: lanesOf(shown) });
  // the code that plays anywhere (copied, opened in Strudel): the helpers written out, the code shown, its tail
  const standalone = run && (shown => { const pre = any || inPlace ? preludeText(buses, fns) : ''; return pre + shown + tail(shown, { table: any ? table : new Map(), entries: any ? entrySets.get(plainKey(shown)) || null : null, voice: hidden.get(plainKey(shown)) || '', like: lineLike, offset: pre.length, lanes: lanesOf(shown) }); });
  const out = { build, now, inPlace, codeAt, run, standalone, buses, fns, shownLine, plan: () => (planOn ? planOf() : { edits: new Map(), ahead: [] }) };
  self = out;
  // the lines typed ahead, muted (reused-lines D8): [{ header, text, from, to }]
  out.ahead = () => (planOn ? planOf().ahead : []);
  // the returning lines edited while muted (reused-lines D4): [[id, bar]]
  out.edits = () => (planOn ? [...planOf().edits] : []);
  // paste(bar): how many new lines the human typing towards a step may paste whole when it does not fit (pasteRule)
  // earlier(bar) (reused-lines D3): the pattern lines the code showed at the steps before a bar, for the typing to copy
  // a line from (oldest first, a line seen again moves to the end)
  const earlierMemo = new Map(), stepBars = () => [...new Set([0, ...buildSteps(out.build).map(x => x.at)])].sort((a, b) => a - b);
  out.earlier = bar => {
    const key = `${cols()}\u0000${lang()}`, lines = new Map();
    for (const b of stepBars()) {
      if (b >= bar) break;
      const k = `${b}\u0000${key}`;
      if (!earlierMemo.has(k)) { if (earlierMemo.size > 2000) earlierMemo.clear(); earlierMemo.set(k, chainLines(codeAt(b)).filter(l => /^\s*[_S]?\$:/.test(l))); }
      for (const l of earlierMemo.get(k)) { lines.delete(l); lines.set(l, true); }
    }
    return [...lines.keys()];
  };
  out.paste = pasteRule(out, C, { seed: build.id || '' });
  return out;
}
// (inside liveCode the name `liveCode` is the view of the controls)
function referenceCode(...args) { return liveCode(...args); }
