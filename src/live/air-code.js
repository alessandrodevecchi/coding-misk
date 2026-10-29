// The code of the radio's window song by song (radio-profiles D7, D8). The window plays the song on air and the next
// one on one timeline (windowSong). Each song is written with its own controls: the song on air with its profile's
// view (code of the moment, lanes in the hidden mixer, compact and song functions, comments, typing), the others in
// full technical form (Classic controls, no song functions, no lanes). The panel shows the song on air, and the next
// song when it is visible (option radio-incoming); a hidden song plays from code that is evaluated, never shown, on
// orbits of its own (HIDDEN_ORBIT up), its constants renamed so they never meet the song on air's.
// Pure: the app and the browser checks (tools/check-compact-code.cjs) build the same code.
import { liveCode } from './live-code.js';
import { resolveProfile } from './profiles.js';
import { pasteRule } from './typing-load.js';
import { buildSteps } from '../song/build.js';

// the orbits of a song that is not on air: its own orbits moved up, past the voice instrument (13, 14) and the
// narrator (15 and up)
export const HIDDEN_ORBIT = 20;
// the line that starts the next song in the panel when it is visible
export const NEXT_MARK = '// ==> ';

const LISTS = ['add', 'remove', 'mute', 'unmute', 'solo', 'unsolo'];
const OBJECTS = ['set', 'pattern', 'rack', 'unrack', 'hide', 'reveal', 'comment', 'notes', 'variant', 'mask'];
// the tracks a step names (the window prefixes them with the song: "s3-bass")
export function stepRefs(s) {
  const out = [];
  for (const k of LISTS) if (s[k] !== undefined) out.push(...[].concat(s[k]));
  for (const k of OBJECTS) if (s[k] && s[k].track) out.push(s[k].track);
  if (s.clone) out.push(s.clone.track, s.clone.from);
  if (s.voice) out.push(s.voice);
  return out.filter(x => typeof x === 'string');
}

// The part of a window that belongs to song k of `songs` ([{ prefix, start, song }] in stream order): the window's
// sections (so its lanes, bars and harmony stay the same), the song's tracks and steps. A step that names no track
// belongs to the song whose bars hold it. A grown song keeps its growth facts (`crescendo`), its bars moved to the window.
export function windowPart(W, songs, k, { grown = false } = {}) {
  const me = songs[k], pre = me.prefix;
  const owner = at => { let o = 0; songs.forEach((s, i) => { if (s.start <= at) o = i; }); return o; };
  const mine = s => { const r = stepRefs(s); return r.length ? r.some(id => id.startsWith(pre)) : owner(s.at) === k; };
  const src = me.song || {}, out = { ...W, id: src.id || W.id, title: src.title || W.title, tracks: W.tracks.filter(t => t.id.startsWith(pre)), build: (W.build || []).filter(mine) };
  for (const f of ['tags', 'profile', 'style']) if (src[f] !== undefined) out[f] = src[f];
  // the song's first bar in the window: the poetic narrator says the image of an entry there on that bar, as on bar 0
  // of a song alone (after-tests-oct28 D5)
  out.start = me.start || 0;
  // a song steered on air (radio-profiles D9): its reference for functions and levels, placed in the window like the song
  if (src.codeRef) {
    const ref = src.codeRef.tracks || [];
    out.codeRef = { ...out, build: undefined, tracks: out.tracks.map(t => { const r = ref.find(x => pre + x.id === t.id); return r ? { ...t, settings: r.settings, rack: r.rack, patterns: r.patterns, clips: (r.clips || []).map(c => ({ ...c, start: c.start + me.start })) } : t; }) };
    if (Number.isFinite(src.codeRef.until)) out.codeRef.until = src.codeRef.until + me.start;
  }
  if (grown && src.crescendo) {
    const c = { ...src.crescendo };
    if (Number.isFinite(c.grown)) c.grown += me.start;
    if (Array.isArray(c.waypoints)) c.waypoints = c.waypoints.map(b => b + me.start);
    out.crescendo = c;
  }
  return out;
}

// a word replaced outside the strings of a code (mini-notation stays as it is)
function renameWords(code, names, to) {
  if (!names.length) return code;
  const re = new RegExp(`\\b(${names.join('|')})\\b`, 'g');
  return code.split(/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`[^`]*`)/).map((p, i) => (i % 2 ? p : p.replace(re, m => to(m)))).join('');
}
// a song's code made to sit next to the song on air: no tempo and no sections table (the song on air sets them), its
// constants renamed with `tag`, its orbits moved up
export function apart(code, tag) {
  const kept = code.split('\n').filter(l => !/^setcpm\(/.test(l) && !/^const (SECTIONS|TEMPO) =/.test(l)).join('\n');
  const names = [...new Set([...kept.matchAll(/^const (\w+) =/gm)].map(m => m[1]))];
  return localSolo(renameWords(kept, names, n => `${tag}${n}`).replace(/\.orbit\((\d+)\)/g, (_, o) => `.orbit(${+o + HIDDEN_ORBIT})`));
}
// a line played alone (S$:, a growth's opening) silences every other line of the code evaluated: in a song that is
// not on air it is played alone within its own song only (its other lines muted, _$:), never against the song on air
export function localSolo(code) {
  if (!/^\s*S\$:/m.test(code)) return code;
  return code.replace(/^(\s*)(S?)\$:/gm, (_, sp, solo) => `${sp}${solo ? '' : '_'}$:`);
}
// a code with something that plays (a line besides the silence liveCode adds to an empty code)
const plays = c => /^\s*[_S]?\$:(?!\s*silence\s*$)/m.test(c);

// W: the window song; songs: [{ n, prefix, start, song (the song as the radio holds it, its own bars), ctl (its
// controls), show: 'air' | 'visible' | 'hidden', title }] in stream order, one with show 'air'.
// → like liveCode: { build, codeAt(bar, keep), run(shown, bar), standalone(shown, bar), buses, fns, paste, ctl, parts }
// run and standalone take the bar the code is for (the hidden songs change with their own steps); without it, the bar
// of the latest codeAt
// widgets(): the code widgets' settings, for the song on air only (code-widgets)
export function airCode(W, songs, { lang = () => 'en', files = () => ({}), cols = () => 0, widgets = null } = {}) {
  // (a song not on air keeps its own narrator switch, profile-options: with the narrator off it never speaks its steps;
  // and its narrator style, voice-controls)
  const classic = resolveProfile('classic');
  const ownVoice = C => (C ? { ...(C.narrator === false ? { narrator: false } : {}), ...(C.narratorStyle && C.narratorStyle !== 'auto' ? { narratorStyle: C.narratorStyle } : {}) } : {});
  const k0 = Math.max(0, songs.findIndex(s => s.show === 'air')), A = songs[k0];
  const LA = liveCode(windowPart(W, songs, k0, { grown: true }), A.ctl, { lang, files, cols, widgets });
  const others = songs.map((s, k) => ({ ...s, k })).filter(s => s.k !== k0).map(s => ({ ...s, tag: `n${s.n}_`, L: liveCode(windowPart(W, songs, s.k), Object.keys(ownVoice(s.ctl)).length ? resolveProfile('classic', ownVoice(s.ctl)) : classic, { lang, files }) }));
  const codeOf = (p, bar, keep) => apart(p.L.run ? p.L.run(p.L.codeAt(bar, keep)) : p.L.codeAt(bar, keep), p.tag);
  let lastBar = 0;
  const codeAt = (bar, keep) => {
    lastBar = bar;
    const mine = LA.codeAt(bar, keep);
    const vis = others.filter(p => p.show === 'visible').map(p => { const c = codeOf(p, bar, keep); return plays(c) ? `${NEXT_MARK}${p.title || p.n}\n${c}` : ''; }).filter(Boolean);
    return vis.length ? `${mine}\n\n${vis.join('\n\n')}` : mine;
  };
  // the code shown: the song on air, then the visible songs from the first mark
  const split = shown => { const i = shown.indexOf(`\n\n${NEXT_MARK}`); return i < 0 ? [shown, ''] : [shown.slice(0, i), shown.slice(i)]; };
  const hiddenAt = (bar, keep) => others.filter(p => p.show === 'hidden').map(p => codeOf(p, bar, keep)).filter(plays).join('\n\n');
  // evaluated: the code shown as it is (so the places of its notes are those of the panel), the song on air's hidden
  // tail (mixer, lanes, hidden voice), then the hidden songs
  const run = (shown, bar = lastBar) => {
    const [mine, vis] = split(shown), tailA = LA.run ? LA.run(mine).slice(mine.length) : '', hid = hiddenAt(bar);
    return mine + vis + tailA + (hid ? `\n\n${hid}` : '');
  };
  const standalone = (shown, bar = lastBar) => {
    const [mine, vis] = split(shown), s = LA.standalone ? LA.standalone(mine) : mine, at = s.indexOf(mine) + mine.length, hid = hiddenAt(bar);
    return s.slice(0, at) + vis + s.slice(at) + (hid ? `\n\n${hid}` : '');
  };
  // the steps: the song on air's (code of the moment included) and the other songs', on their bars
  const steps = [...buildSteps(LA.build), ...others.flatMap(p => buildSteps(p.L.build))].map((s, i) => ({ s, i })).sort((a, b) => a.s.at - b.s.at || a.i - b.i).map(({ s: { i, ...s } }) => s);
  const build = { ...LA.build, tracks: W.tracks, build: steps };
  // the paste rule of the song on air, in its own bars (never in its first two minutes, at most one line a minute)
  let paste = () => 0;
  if (LA.build.crescendo && A.song && A.song.crescendo) {
    const local = { ...A.song, build: buildSteps(LA.build).filter(s => s.at >= A.start).map(({ i, ...s }) => ({ ...s, at: s.at - A.start })) };
    const P = pasteRule({ build: local, codeAt: b => LA.codeAt(b + A.start) }, A.ctl, { seed: A.song.id || '' });
    paste = bar => P(bar - A.start);
  }
  return { build, codeAt, run, standalone, buses: LA.buses, fns: LA.fns, paste, ctl: A.ctl, now: LA.now, inPlace: LA.inPlace, onAir: A, hidden: () => others.filter(p => p.show === 'hidden').map(p => p.n) };
}
