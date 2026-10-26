// Pattern preview (pattern-preview): a small second player for the pattern being made in Compose. It never takes over
// the main player: while the song plays it rides the song's scheduler (stacked on the song's pattern, design D1), while
// the song is stopped it plays on a bare Cyclist of its own. The pure part (previewExpression) runs in Node.

import { ORBIT_OF } from '../music.js';
import { extraOrbits } from '../song/compile.js';

// its own orbit, above the song's, so its delay and reverb never retune the song's (design D3): the compiler gives 1-8
// by type and extra tracks 9 and up, spoken tracks 13 and 14, voice tracks (the narrator) 15 and up
// (src/song/build.js). PREVIEW_ORBIT is the lowest it takes; a song that reaches it moves the preview above its highest.
export const PREVIEW_ORBIT = 20;
export function previewOrbit(tracks = []) {
  let top = 0, extra = 8, voices = 0;
  const used = new Set(), next = extraOrbits(tracks);
  // (as the compiler: extra buses skip the spoken and the narrators' orbits, radio-arrangement D6)
  const nextExtra = () => (extra = next(extra));
  for (const tr of tracks) {
    // (a voice track takes a bus number like an extra track, as in the compiler, and speaks on 15 and up)
    if (tr.type === 'voice') { top = Math.max(top, 15 + voices++, nextExtra()); continue; }
    if (tr.type === 'spoken') { top = Math.max(top, 14); continue; }
    top = Math.max(top, !used.has(tr.type) && ORBIT_OF[tr.type] ? ORBIT_OF[tr.type] : nextExtra());
    used.add(tr.type);
  }
  return Math.max(PREVIEW_ORBIT, top + 1);
}

// the compiled code of a pattern's loop song (src/library/patterns.js loopSong, compiled with compileSong) → one Strudel
// expression: the `$:` lines joined in a stack, without setcpm, the section lanes, .analyze (the visuals stay dark) and
// the track's orbit, which becomes the preview's. Continuation lines (starting with a dot) join their line.
export function previewExpression(code, { orbit = PREVIEW_ORBIT } = {}) {
  const blocks = [];
  let cur = null;
  for (const line of String(code || '').split('\n')) {
    const m = /^\s*\$:\s*(.*)$/.exec(line);
    if (m) { if (cur !== null) blocks.push(cur); cur = m[1].trim(); continue; }
    if (cur !== null && /^\s+\./.test(line)) { cur += line.trim(); continue; }
    if (cur !== null) { blocks.push(cur); cur = null; }
  }
  if (cur !== null) blocks.push(cur);
  const clean = b => b
    .replace(/\s*\/\/.*$/, '')
    .replace(/\.analyze\("[^"]*"\)/g, '')
    .replace(/\.(mask|velocity)\(section\d+\)/g, '')
    .replace(/section\d+\.mul\(([^()]*)\)/g, '$1')
    .replace(/\bsection\d+\b/g, 'pure(1)')
    .replace(/\.orbit\([^()]*\)/g, '') + `.orbit(${orbit})`;
  const parts = blocks.map(clean).filter(b => b !== `.orbit(${orbit})`);
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : `stack(${parts.join(', ')})`;
}

// Strudel's transpiler reads double-quoted strings as mini-notation; the preview is evaluated without it (the page's
// transpiler is inside the editor's bundle), so its strings are wrapped in mini() by hand, as the transpiler does
export const miniStrings = expr => expr.replace(/"(?:[^"\\]|\\.)*"/g, m => `mini(${m})`);

// the preview player in the page. app: { sched() → the main scheduler, busy() → an export or a recording runs,
// source(id, key) → { song, key, loop, bpm, shift, sig } or null (the track or its pattern is gone),
// compile(loop) → code, onChange() → the buttons are drawn again, duck() → the main player's level while it rides, optional }. Strudel's functions come from the page
// (globalThis: stack, pure, Cyclist, getTrigger, webaudioOutput, getAudioContext), the same copy the main player uses.
export function createPreview(app, g = globalThis) {
  let on = null; // { id, key, song, sig, bpm, shift }
  let cur = null, prev = null, at = 0; // what plays from bar `at` on, what played before it
  let riding = false, free = null, hooked = null, raw, mixed = null, mixedOf = null, seen = 0, lastCheck = 0;
  const evalExpr = expr => new Function(`return (${miniStrings(expr)});`)();
  // app.duck: a level (0 to 1) for the main player while the preview rides it (the radio, radio-arrangement D9: 12 dB
  // lower), as a velocity on every event of the song; none in Compose
  const duck = p => { const k = app.duck ? app.duck() : null; return k && k < 1 && p.withValue ? p.withValue(v => ({ ...v, velocity: (v.velocity ?? 1) * k })) : p; };
  // the main scheduler's pattern, with the preview stacked on it while it rides (the REPL keeps exposing the song's
  // pattern to the highlighting: exposeSchedulerPattern gets the pattern it set, not this getter's)
  const hook = s => {
    if (!s || hooked === s) return;
    raw = s.pattern;
    Object.defineProperty(s, 'pattern', { configurable: true, enumerable: true,
      get: () => { if (!(riding && cur && raw)) return raw; if (mixedOf !== raw) { mixed = g.stack(duck(raw), layers(true)); mixedOf = raw; } return mixed; },
      set: v => { raw = v; mixedOf = null; } });
    hooked = s;
  };
  // the preview's pattern: before `at` the previous version, from `at` the current one; riding, shifted to the
  // selected section's start so its chords meet the song's
  const layer = (x, ride) => (ride && x.shift ? x.pat.late(x.shift) : x.pat);
  const layers = ride => {
    const a = layer(cur, ride).filterWhen(t => t >= at);
    return prev ? g.stack(layer(prev, ride).filterWhen(t => t < at), a) : a;
  };
  const dirty = () => { mixedOf = null; if (free && !riding) free.setPattern(layers(false)); };
  const build = src => {
    const expr = previewExpression(app.compile(src.loop), { orbit: src.orbit || PREVIEW_ORBIT });
    if (!expr) return null;
    return { pat: evalExpr(expr), shift: src.shift || 0, expr };
  };
  const makeFree = () => {
    if (free) return free;
    const getTime = () => g.getAudioContext().currentTime;
    free = new g.Cyclist({ onTrigger: g.getTrigger({ defaultOutput: g.webaudioOutput, getTime }), getTime, interval: 0.05 });
    return free;
  };
  const nextBar = s => Math.ceil(s.lastEnd + 1e-9);
  const ride = () => { const s = app.sched(); hook(s); if (free && free.started) free.stop(); riding = true; prev = null; at = nextBar(s); seen = s.lastEnd; dirty(); };
  const alone = () => { riding = false; prev = null; at = 0; mixedOf = null; const f = makeFree(); f.setCps(on.bpm / 240); f.setPattern(layers(false)); if (!f.started) f.start(); };
  const mainPlays = () => { const s = app.sched(); return !!(s && s.started); };
  function stop() {
    if (!on) return;
    on = null; cur = prev = null; riding = false; mixedOf = null;
    if (free && free.started) free.stop();
    app.onChange && app.onChange();
  }
  function start(id, key) {
    if (app.busy()) return false;
    const src = app.source(id, key);
    if (!src) return false;
    let x;
    try { x = build(src); } catch (e) { console.warn('[preview]', e); return false; }
    if (!x) return false;
    if (on) stop();
    on = { id, key: src.key, song: src.song, sig: src.sig, bpm: src.bpm, shift: src.shift };
    cur = x; prev = null;
    if (mainPlays()) ride(); else alone();
    app.onChange && app.onChange();
    return true;
  }
  // an edit of the pattern, its sound or the section: the new version plays from the next bar
  function swap(src) {
    let x;
    try { x = build(src); } catch (e) { console.warn('[preview]', e); return; }
    if (!x) return stop();
    const s = riding ? app.sched() : free;
    prev = cur; cur = x; at = s ? nextBar(s) : 0;
    on = { ...on, key: src.key, sig: src.sig, bpm: src.bpm, shift: src.shift };
    if (!riding && free) free.setCps(src.bpm / 240);
    dirty();
  }
  // called from the frame loop and the background clock: hands over between riding and playing alone, stops on an
  // export or when the track or the song is gone, and picks up edits
  function tick(now = performance.now()) {
    if (!on) return;
    if (app.busy()) return stop();
    const plays = mainPlays();
    if (plays && !riding) ride();
    else if (!plays && riding) alone();
    else if (riding) {
      // a jump of the song (the timeline, a section played again) starts the preview again at the next bar
      const s = app.sched();
      if (s.lastEnd < seen - .5 || s.lastEnd > seen + 2) { prev = null; at = nextBar(s); dirty(); }
      seen = s.lastEnd;
    }
    if (prev && (riding ? app.sched().lastEnd : free ? free.lastEnd : 0) > at + 1) { prev = null; dirty(); }
    if (now - lastCheck < 150) return;
    lastCheck = now;
    const src = app.source(on.id, on.key);
    if (!src || src.song !== on.song) return stop();
    if (src.sig !== on.sig) swap(src);
  }
  return {
    start, stop, tick,
    toggle: (id, key) => (on && on.id === id ? (stop(), false) : start(id, key)),
    get state() { return on ? { id: on.id, key: on.key, riding, at, free: !!(free && free.started), expr: cur && cur.expr, shift: on.shift, bpm: on.bpm } : null; },
    // for the checks: the preview's own pattern and the scheduler's
    get pattern() { return cur ? layers(riding) : null; },
  };
}
