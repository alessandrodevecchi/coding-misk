// Code widgets (code-widgets, #79): Strudel's inline widgets (`._scope()`, `._pianoroll()`, …) written by the app at the
// end of some lines of the code shown, as a live coder would write them. An app setting, not a profile control: the
// growth, its shapes and every fixture are made without widgets, and the calls are added to the code of the moment
// when it is shown (live-code.js `codeAt`, main.js `codeFor`). Pure apart from `installWidgets` and `linkAnalysers`,
// which touch Strudel's Pattern and analysers in a page (and stub the methods in Node and on the render page).
import { hashString } from '../endless/random.js';

export const CW_KEY = 'coding-misk-code-widgets';
// the six inline widgets of @strudel/codemirror, in the order the Settings card shows them
export const STRUDEL_WIDGETS = ['scope', 'pianoroll', 'punchcard', 'spectrum', 'spiral', 'pitchwheel'];
// and the app's own (code-over-visual D8, D11): the hit grid and the tone cloud
export const APP_KINDS = ['hitgrid', 'tonecloud'];
export const WIDGETS = [...STRUDEL_WIDGETS, ...APP_KINDS];
// the instruments a widget is chosen for (D3), and the default slot order
export const CW_INSTRUMENTS = ['bass', 'lead', 'drums', 'arp', 'hats', 'pad', 'fx', 'voice'];
// the window of a muted line (bars), D8, D9
export const CW_WINDOWS = [8, 16, 32, 'always'];
export const CW_PARAMS = ['labels', 'smear', 'fold', 'steady', 'fade'];
// default mapping (owner, 2026-10-28): primary, then secondary widgets; fx off. code-over-visual cv8: the hit grid is
// the drums' primary, the tone cloud the pad's primary and a secondary of bass, lead (guitar), arp and voice. Owner,
// 2026-10-31 (cd5): the voice's primary is the scope (the tone cloud shows the harmony of the whole song, so there is
// only one on screen: the pad's, else the first of bass, lead, arp playing, the voice's only when no other line can hold it)
const MAP = {
  drums: ['hitgrid', 'scope', 'pianoroll', 'spectrum'], hats: ['pianoroll', 'scope', 'spectrum'], bass: ['scope', 'pianoroll', 'spectrum', 'tonecloud'],
  lead: ['pianoroll', 'scope', 'spectrum', 'tonecloud'], arp: ['pianoroll', 'scope', 'spectrum', 'tonecloud'], pad: ['tonecloud', 'scope', 'pianoroll'],
  fx: ['scope', 'spectrum'], voice: ['scope', 'tonecloud', 'spectrum'],
};
export const CW_DEFAULTS = Object.freeze({
  on: false, max: 3, roll: 'pianoroll', order: CW_INSTRUMENTS.slice(), share: 25, window: 16, dim: true,
  // "Widget notes" (D15): Always full since settings-polish (owner, 2026-10-31); a stored 'volume' of before moves once (CW_VERSION)
  notes: 'full',
  widgets: { scope: true, pianoroll: true, punchcard: true, spectrum: true, spiral: false, pitchwheel: false, hitgrid: true, tonecloud: true },
  instruments: Object.fromEntries(CW_INSTRUMENTS.map(k => [k, { on: k !== 'fx', primary: MAP[k][0], secondary: MAP[k].slice(1) }])),
  params: { labels: false, smear: false, fold: true, steady: true, fade: true },
  // px: the height of the row widgets (Strudel 60), the round ones (Strudel 200 and 275), spiral, spectrum
  sizes: { row: 36, round: 120, spiral: 200, spectrum: 120 },
});
export const CW_SIZE_LIMITS = { row: [20, 120], round: [60, 300], spiral: [80, 400], spectrum: [40, 300] };

const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
// #79: the instruments of settings saved before the app widgets existed (no `appKinds` mark) get the app widgets'
// defaults once, every other choice kept: drums take the hit grid as primary (their old primary first among the
// secondary), the pad the tone cloud; bass, lead and arp the tone cloud among their secondary; the voice the scope as
// primary and the tone cloud as its last secondary (one cloud at a time: the voice holds it only when no other line can).
// fx stays as it was (its lines are risers and noise, no harmony). Saved again with the mark, they are not touched again
export const APP_KINDS_VERSION = 1;
// settings-polish D2: the version of the stored code widget settings. Without it (written before) a stored
// "Follow the volume" was only the old default, so it moves to "Always full" once; saved again with v 2, the user's choice stays
export const CW_VERSION = 2;
const PRIMARY_APP = { drums: 'hitgrid', pad: 'tonecloud', voice: 'scope' };
export function migrateInstruments(instruments) {
  if (!instruments || typeof instruments !== 'object') return instruments;
  const out = { ...instruments };
  for (const k of CW_INSTRUMENTS) {
    const x = out[k];
    if (!x || typeof x !== 'object' || k === 'fx') continue;
    let primary = WIDGETS.includes(x.primary) ? x.primary : CW_DEFAULTS.instruments[k].primary;
    let secondary = Array.isArray(x.secondary) ? x.secondary.filter(w => WIDGETS.includes(w)) : CW_DEFAULTS.instruments[k].secondary.slice();
    const want = PRIMARY_APP[k];
    if (want && primary !== want) { secondary = [primary, ...secondary]; primary = want; }
    if (k === 'voice') secondary = [...secondary.filter(w => w !== 'tonecloud'), 'tonecloud'];
    else if (k !== 'drums' && k !== 'pad' && !secondary.includes('tonecloud')) secondary = [...secondary, 'tonecloud'];
    out[k] = { ...x, primary, secondary: [...new Set(secondary.filter(w => w !== primary))] };
  }
  return out;
}
// the stored settings (any shape, old or partial) completed with the defaults; saved before the app widgets, migrated
export function widgetSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, D = CW_DEFAULTS, stored = r.appKinds === APP_KINDS_VERSION ? r.instruments : migrateInstruments(r.instruments);
  const order = Array.isArray(r.order) ? r.order.filter(k => CW_INSTRUMENTS.includes(k)) : [];
  const instruments = {};
  for (const k of CW_INSTRUMENTS) {
    const x = (stored && stored[k]) || {}, d = D.instruments[k];
    const primary = WIDGETS.includes(x.primary) ? x.primary : d.primary;
    const secondary = Array.isArray(x.secondary) ? x.secondary.filter(w => WIDGETS.includes(w) && w !== primary) : d.secondary.filter(w => w !== primary);
    instruments[k] = { on: typeof x.on === 'boolean' ? x.on : d.on, primary, secondary };
  }
  return {
    appKinds: APP_KINDS_VERSION,
    v: CW_VERSION,
    on: r.on === true,
    max: clampInt(r.max, 1, 8, D.max),
    roll: r.roll === 'punchcard' ? 'punchcard' : 'pianoroll',
    order: [...new Set([...order, ...CW_INSTRUMENTS])],
    share: clampInt(r.share, 0, 100, D.share),
    window: CW_WINDOWS.includes(r.window) ? r.window : CW_WINDOWS.includes(+r.window) ? +r.window : D.window,
    dim: r.dim !== false,
    notes: r.notes === 'full' ? 'full' : r.notes === 'volume' && r.v >= CW_VERSION ? 'volume' : D.notes,
    widgets: Object.fromEntries(WIDGETS.map(w => [w, typeof (r.widgets || {})[w] === 'boolean' ? r.widgets[w] : D.widgets[w]])),
    instruments,
    params: Object.fromEntries(CW_PARAMS.map(p => [p, typeof (r.params || {})[p] === 'boolean' ? r.params[p] : D.params[p]])),
    sizes: Object.fromEntries(Object.entries(D.sizes).map(([k, v]) => [k, clampInt((r.sizes || {})[k], ...CW_SIZE_LIMITS[k], v)])),
  };
}

// a widget call at the end of a line, a continuation line of its own included (one level of nested brackets for options)
const CALL = /(?:[ \t]*\n[ \t]*)?\._(?:scope|pianoroll|punchcard|spectrum|spiral|pitchwheel|hitgrid|tonecloud)\((?:[^()]|\([^()]*\))*\)/g;
const HAS_CALL = /\._(?:scope|pianoroll|punchcard|spectrum|spiral|pitchwheel|hitgrid|tonecloud)\(/;
// D7: a line with and without a widget is the same line
export const stripWidgets = text => (typeof text === 'string' && HAS_CALL.test(text) ? text.replace(CALL, '') : text);
export const hasWidget = text => HAS_CALL.test(text);

// D3: the instrument of a line, from its visual (`.analyze("…")` or `.chan("…")`), the same names the stage uses;
// a spoken line is the voice; an unknown visual is a lead
export const BY_VISUAL = { kick: 'drums', snare: 'drums', beat: 'drums', perc: 'drums', drums: 'drums', hats: 'hats', bass: 'bass', arp: 'arp', pad: 'pad', texture: 'pad', fx: 'fx', riser: 'fx', hook: 'lead', guitar: 'lead', lead: 'lead' };
export function instrumentOf(line) {
  if (/\bsay_/.test(line)) return 'voice';
  const m = line.match(/\.(?:analyze|chan)\(\s*["']([\w-]+)["']\s*\)/);
  return m ? BY_VISUAL[m[1]] || 'lead' : null;
}

// the section lanes of a code (`const section3 = "<0!16 1!2 0!40>"`): name → value at a bar
export function lanesOf(code) {
  const out = new Map();
  for (const m of code.matchAll(/^const (\w+) = "<([\d.! ]+)>"/gm)) {
    const v = [];
    for (const t of m[2].trim().split(/ +/)) { const [a, n] = t.split('!'); for (let k = 0; k < (n ? +n : 1); k++) v.push(Number(a)); }
    if (v.length) out.set(m[1], v);
  }
  return out;
}
const PATTERN = /^\s*[_S]?\$:/;
const MUTED = /^\s*_\$:/;
// a line that plays at a bar: not muted, and its section lane (`.mask(sectionN)`) on at that bar
export function playsAt(line, lanes, bar) {
  if (MUTED.test(line)) return false;
  for (const m of line.matchAll(/\.mask\((\w+)\)/g)) { const v = lanes.get(m[1]); if (v && !(v[((Math.floor(bar) % v.length) + v.length) % v.length] > 0)) return false; }
  return true;
}
const rand = (...k) => hashString(k.join('\u0000')) / 4294967296;
// the visual name of a line (`.analyze("…")` or `.chan("…")`), '' without one
const visualOf = line => (line.match(/\.(?:analyze|chan)\(\s*["']([\w-]+)/) || [])[1] || '';
// churn fix (#79): the track of each pattern line of a code, the key its widget is chosen with: the track's header
// (`// ===== name =====`, one track of the song, its lines of every section) and the line's visual (a drum track's kick,
// snare and hats lines are apart), so an edit of the line never changes its widget; null for a line with neither
// (placeWidgets then uses its instrument)
export function tracksOf(code) {
  const out = [];
  let header = null;
  for (const l of chainLines(String(code || ''))) {
    const h = l.match(/^\/\/ =+ (.+?) =+$/);
    if (h) { header = h[1]; continue; }
    if (!PATTERN.test(l)) continue;
    const v = visualOf(l);
    out.push(header || v ? `${header || ''}|${v}` : null);
  }
  return out;
}

// D3: the widget of an instrument's line: the primary, or with the share a secondary that is on, by the seed; the
// first secondary on when the primary is off; pianoroll as punchcard when chosen
// avoid: widgets this line may not take (a second tone cloud): it falls back to its next widget
export function widgetFor(inst, S, key = '', seed = '', avoid = []) {
  const I = S.instruments[inst];
  if (!I || !I.on) return null;
  const on = w => { const x = w === 'pianoroll' && S.roll === 'punchcard' ? 'punchcard' : w; return S.widgets[x] && !avoid.includes(x) ? x : null; };
  const secs = I.secondary.map(on).filter(Boolean), prim = on(I.primary);
  if (!prim) return secs[0] || null;
  if (secs.length && rand(seed, 'cw-secondary', key) * 100 < S.share) return secs[Math.floor(rand(seed, 'cw-which', key) * secs.length)];
  return prim;
}
// D3: the number of widgets of each section, from 1 to the maximum, by the seed: weighted toward more, never the same
// count in more than two sections in a row when the maximum is above 1
export function targets(n, S, seed = '') {
  const out = [];
  for (let k = 0; k < n; k++) {
    const w = Array.from({ length: S.max }, (_, i) => i + 1), sum = w.reduce((a, b) => a + b, 0);
    let x = rand(seed, 'cw-count', k) * sum, pick = 1;
    for (const c of w) { if (x < c) { pick = c; break; } x -= c; }
    if (S.max > 1 && k >= 2 && out[k - 1] === pick && out[k - 2] === pick) pick = (pick % S.max) + 1;
    out.push(pick);
  }
  return out;
}

// The code with its widgets at a bar. code: the code of the moment without widgets; S: widgetSettings; section: the
// index of the section playing; sections: how many sections the song has (for the counts); seed: the song's seed;
// insts: the instrument of each pattern line (optional, else read from the line); tracks: the track of each pattern
// line (optional, tracksOf; else the header and the visual in the code, else the instrument); returns(line): whether a
// muted line returns within the window of muted lines (optional: muted lines get no widget without it).
// Churn fix (#79): a track's widget comes from the track and the seed, never from the line's text, so edits keep it.
// prev: the holders after the bar before in the same section ([{ track, w }], widgetMemory): a track that holds a
// widget keeps it, of the same kind, while one of its lines lives (plays, or is muted and returns within the window);
// only free slots are given again. null at a section's start: every slot is given anew. out: { holders } after this
// bar. allow: a Set of `track|kind` that may be written (a person typing, D8), the others wait (they still hold).
// Lines already carrying a widget (code typed by hand) keep it and take a slot.
export function placeWidgets(code, { S, bar = 0, section = 0, sections = 1, seed = '', insts = null, tracks = null, returns = null, prev = null, allow = null, out = null } = {}) {
  if (out) { out.holders = []; out.shown = []; out.alive = []; }
  if (!S || !S.on || typeof code !== 'string') return code;
  const lines = chainLines(code), lanes = lanesOf(code), info = [], nth = {};
  let k = -1, taken = 0, header = null;
  lines.forEach((l, i) => {
    const h = l.match(/^\/\/ =+ (.+?) =+$/);
    if (h) { header = h[1]; return; }
    if (!PATTERN.test(l)) return;
    k++;
    if (hasWidget(l)) { taken++; return; }
    const inst = (insts && insts[k]) || instrumentOf(l);
    if (!inst) return;
    // (a line with neither: its instrument and its place among such lines of that instrument)
    const v = visualOf(l), track = (tracks && tracks[k]) || (header || v ? `${header || ''}|${v}` : `${inst}:${(nth[inst] = (nth[inst] || 0) + 1)}`);
    // (the group: the song's track, its header, for D9 below)
    info.push({ i, l, inst, track, group: track.includes('|') && track.split('|')[0] ? track.split('|')[0] : track, playing: playsAt(l, lanes, bar), masked: /\.mask\((\w+)\)/.test(l) && [...l.matchAll(/\.mask\((\w+)\)/g)].some(m => lanes.has(m[1])) });
  });
  // D9 (Classic, the lines of each section kept in the code): a track silent now keeps its widget on the line it played
  // last, when one of its lines plays again within the window of muted lines
  const win = S.window === 'always' ? Infinity : S.window, span = Math.max(0, ...[...lanes.values()].map(v => v.length));
  const silentKeeps = new Set();
  if (span) {
    const byTrack = new Map();
    for (const x of info) if (x.masked && !MUTED.test(x.l)) (byTrack.get(x.group) || byTrack.set(x.group, []).get(x.group)).push(x);
    for (const list of byTrack.values()) {
      if (list.some(x => x.playing)) continue;
      const until = Math.min(span - 1, bar + win);
      if (!list.some(x => { for (let b = Math.floor(bar) + 1; b <= until; b++) if (playsAt(x.l, lanes, b)) return true; return false; })) continue;
      let last = null, lastBar = -1;
      for (const x of list) for (let b = Math.floor(bar) - 1; b >= 0 && b > lastBar; b--) if (playsAt(x.l, lanes, b)) { if (b > lastBar) { lastBar = b; last = x; } break; }
      if (last) silentKeeps.add(last.i);
    }
  }
  // the lines that may hold a widget now, one per track: a line playing first, then the line that keeps a silent
  // track's widget (D9), then a muted line that returns within the window; the first in the code among equals
  const alive = new Map();
  for (const x of info) {
    const o = alive.get(x.track);
    if (o && o.lvl === 0) continue;
    const lvl = x.playing ? 0 : silentKeeps.has(x.i) ? 1 : MUTED.test(x.l) && returns && returns(x.l) ? 2 : -1;
    if (lvl >= 0 && (!o || lvl < o.lvl)) alive.set(x.track, { ...x, lvl });
  }
  const want = Math.max(0, targets(Math.max(1, sections), S, seed)[Math.max(0, Math.min(section, sections - 1))] - taken);
  // #79: the holders of the bar before that still live keep their widget, of the same kind (the count of a section
  // never changes within it)
  const held = [];
  for (const h of prev || []) { const x = alive.get(h.track); if (x && h.w && held.length < want && !held.some(y => y.x === x)) held.push({ x, w: h.w }); }
  const used = new Set(held.map(h => h.x.track)), free = [...alive.values()].filter(x => !used.has(x.track));
  const cands = free.map(x => ({ x, rank: S.order.indexOf(x.inst), w: widgetFor(x.inst, S, x.track, seed), playing: x.playing })).filter(c => c.w);
  // the free slots: the slot order, then the place in the code; lines that play before muted ones of the same instrument
  // (one line per instrument first, for variety: kick and snare lines are both drums; then the rest in the same order)
  const sorted = cands.sort((a, b) => a.rank - b.rank || (b.playing - a.playing) || a.x.i - b.x.i), seen = new Set(held.map(h => S.order.indexOf(h.x.inst)));
  const first = sorted.filter(c => !seen.has(c.rank) && seen.add(c.rank)), chosen = [...first, ...sorted.filter(c => !first.includes(c))].slice(0, Math.max(0, want - held.length));
  // code-over-visual D11: the hit grid covers every drum sound, so it sits once, on the first drum line playing (the
  // kick's, as a rule): a line that stays while drum lines come and go, so a person typing never moves it
  // owner, 2026-10-31 (cd5): one tone cloud at a time, where the harmony of the song sits best (cloudHolder)
  // (a cloud or a grid already held stays where it is: a new one is not drawn beside it)
  oneCloud(chosen, free, S, seed, lines.some(l => PATTERN.test(l) && /\._tonecloud\(/.test(l)) || held.some(h => h.w === 'tonecloud'));
  const grids = chosen.filter(c => c.w === 'hitgrid');
  if (grids.length) {
    for (const g of grids) g.skip = true;
    if (!held.some(h => h.w === 'hitgrid')) {
      const drums = free.filter(x => (x.inst === 'drums' || x.inst === 'hats') && x.playing && !chosen.some(c => c.x.track === x.track && c.w !== 'hitgrid'));
      chosen.push({ x: drums.length ? drums[0] : grids[0].x, w: 'hitgrid' });
    }
  }
  const holders = [...held, ...chosen.filter(c => !c.skip)];
  const shows = h => !allow || allow.has(`${h.x.track}|${h.w}`);
  if (out) { out.holders = holders.map(h => ({ track: h.x.track, w: h.w })); out.shown = holders.filter(shows).map(h => ({ track: h.x.track, w: h.w })); out.alive = [...alive.keys()]; }
  if (!holders.length) return code;
  for (const h of holders) if (shows(h)) lines[h.x.i] = withCall(lines[h.x.i], h.w);
  return lines.join('\n');
}
// The tone cloud shows the harmony of the whole song, so at most one is drawn (cd5). Its place: the pad's line; without a
// pad, the first melodic line playing (bass, lead, arp, in that order); on the voice's line only when no other line can
// hold it. A line that would have had a second cloud takes its next widget instead (or none when it has no other).
export const CLOUD_ORDER = ['pad', 'bass', 'lead', 'arp', 'voice'];
// the line that holds the cloud among the lines playing: { i } or null (a hand-typed cloud already on screen: none)
export function cloudHolder(info, S, hasCloud = false) {
  if (hasCloud || !S.widgets.tonecloud) return null;
  const can = x => { const I = S.instruments[x.inst]; return !!I && I.on && (I.primary === 'tonecloud' || I.secondary.includes('tonecloud')) && x.playing && !hasWidget(x.l); };
  for (const inst of CLOUD_ORDER) { const x = info.find(y => y.inst === inst && can(y)); if (x) return x; }
  return null;
}
// free: the lines of the tracks without a widget; has: a cloud already on screen (typed by hand, or held)
function oneCloud(chosen, free, S, seed, has) {
  const asked = chosen.filter(c => c.w === 'tonecloud');
  // the cloud goes to the holder: its own slot when it has one (whatever widget its seed chose: cd5, the cloud always
  // sits on the holder; the voice, the last resort, only when a line asked for a cloud), else the slot of the first
  // line that asked for a cloud
  let at = has ? null : cloudHolder(free, S);
  if (at && at.inst === 'voice' && !asked.length) at = null;
  let kept = null;
  if (at) { kept = chosen.find(c => c.x.track === at.track) || asked[0] || null; if (kept) { kept.x = at; kept.w = 'tonecloud'; } }
  for (const c of asked) {
    if (c === kept) continue;
    const w = widgetFor(c.x.inst, S, c.x.track, seed, ['tonecloud']);
    if (w) c.w = w; else c.drop = true;
  }
  for (let k = chosen.length - 1; k >= 0; k--) if (chosen[k].drop) chosen.splice(k, 1);
}
// #79: placement with memory. The holders of each whole bar of a section are found once, from the section's first bar
// on, so the widgets at a bar are the same whichever bar was asked before (the editor, Code over, the fast video and
// real time agree; a seek replays the section). place(code, opts, { key, start, prep }): opts as placeWidgets (bar,
// section, …); key: what the code depends on besides the bar (settings, language, song); start: the section's first
// bar; prep(b): { code, opts } at a whole bar b of that section (the code without widgets), or null
export function widgetMemory(limit = 8000) {
  const memo = new Map();
  const holdersAt = (b, start, key, prep) => {
    let x = b;
    while (x >= start && !memo.has(`${key}:${x}`)) x--;
    let prev = x >= start ? memo.get(`${key}:${x}`) : null;
    for (x++; x <= b; x++) {
      const p = prep(x), o = {};
      if (p) { placeWidgets(p.code, { ...p.opts, prev, allow: null, out: o }); prev = o.holders; }
      if (memo.size >= limit) memo.clear();
      memo.set(`${key}:${x}`, prev);
    }
    return prev;
  };
  return {
    place(code, opts, { key = '', start = 0, prep = null } = {}) {
      const before = Math.ceil(Number(opts.bar) || 0) - 1;
      const prev = prep && before >= start ? holdersAt(before, Math.floor(start), hashString(String(key)), prep) : null;
      return placeWidgets(code, { ...opts, prev });
    },
    clear: () => memo.clear(),
  };
}
// the call at the end of a line, before a comment at its end
function withCall(line, w) {
  const m = line.match(/^([\s\S]*?\S)(\s+\/\/ [^\n"']*)$/);
  return m ? `${m[1]}._${w}()${m[2]}` : `${line.replace(/\s+$/, '')}._${w}()`;
}
// (the same chains as src/song/typing.js chainLines, kept here so this module has no import cycle with the writer)
function chainLines(text) {
  const out = [];
  for (const l of text.split('\n')) { if (out.length && /^\s+(\.|\/\/ \.)/.test(l) && !/^\s*\/\//.test(out[out.length - 1].split('\n')[0])) out[out.length - 1] += `\n${l}`; else out.push(l); }
  return out;
}

// D4, D5: the hidden parameter groups the wrapper merges (globalThis.miskWidgets): sizes, the theme's colours, each
// widget's group; theme: { fg, accent, accent2, muted, bg }; width: the code panel's width in px
export function widgetOptions(S, theme = {}, width = 500) {
  const w = Math.max(160, Math.min(500, Math.round(width) || 500)), P = S.params, Z = S.sizes;
  const fg = theme.fg || '#ffffff', a1 = theme.accent || fg, a2 = theme.accent2 || a1, mu = theme.muted || '#888888';
  const roll = { width: w, height: Z.row, fold: P.fold ? 1 : 0, labels: P.labels ? 1 : 0, smear: P.smear ? 1 : 0, active: a1, inactive: mu, playheadColor: fg, background: 'transparent' };
  return {
    notes: S.notes,
    scope: { width: w, height: Z.row, color: a1, ...(P.smear ? { smear: 0.5 } : {}) },
    pianoroll: roll,
    punchcard: { ...roll },
    spectrum: { size: Z.spectrum, color: a2 },
    spiral: { size: Z.spiral, steady: P.steady ? 1 : 0, fade: P.fade ? 1 : 0, activeColor: a1, inactiveColor: mu, padding: 0.05 },
    pitchwheel: { size: Z.round, color: a2 },
  };
}

// D4, D12: the six `_` methods wrapped once per copy of Strudel. Each call merges the hidden groups and the line's own
// options and passes every key on; the canvas of each widget is kept by id (globalThis.miskWidgetCanvases, for the
// videos, D11). `_scope` and `_spectrum` keep the line's `analyze` (the widget's analyser is linked to the line's
// instrument, linkAnalysers) and are drawn here: in the theme's colour also between two hits (Strudel's scope takes the
// colour from the haps, white without one), and a new spectrum starts blank (Strudel keeps the last frame per id).
// "Always full" (D15) draws the notes of every note widget at full opacity, on a copy of the haps: the pianoroll from a
// copy of the pattern, the painters (punchcard, spiral, pitchwheel) from a copy of the haps they are given.
// Missing methods (Node, the render page) are stubs that return the pattern unchanged.
const DRAWN = { scope: ['scope', 'tscope'], spectrum: ['spectrum'], pianoroll: ['pianoroll'], punchcard: ['punchcard', 'pianoroll'], spiral: ['spiral'], pitchwheel: ['pitchwheel'] };
const fullHap = h => (h && h.value && typeof h.value === 'object' && typeof h.withValue === 'function' ? h.withValue(v => ({ ...v, gain: 1, velocity: 1 })) : h);
export function installWidgets(Pattern, getOpts = () => globalThis.miskWidgets) {
  if (!Pattern || !Pattern.prototype) return;
  const P = Pattern.prototype;
  for (const name of STRUDEL_WIDGETS) {
    const key = `_${name}`, orig = P[key];
    if (orig && orig.miskWidget) continue;
    let f;
    if (typeof orig !== 'function') f = function () { return this; };
    else {
      f = function (id, options) {
        if (typeof id !== 'string') return orig.call(this, id, options);
        const W = getOpts() || {}, o = { ...(W[name] || {}), ...(options && typeof options === 'object' ? options : {}) };
        const full = W.notes === 'full' && name !== 'scope' && name !== 'spectrum';
        // the drawing methods Strudel's widget calls, wrapped for this call only: the canvas is kept, scope and
        // spectrum are not started (drawn below), the painters get full notes
        let ctx = null;
        const keep = {}, own = name === 'scope' || name === 'spectrum';
        for (const m of DRAWN[name]) {
          keep[m] = P[m];
          if (typeof keep[m] !== 'function') continue;
          P[m] = function (cfg) {
            if (cfg && cfg.ctx) ctx = cfg.ctx;
            if (own) return this;
            return keep[m].call(this, cfg);
          };
        }
        const paint = P.onPaint;
        if (full && typeof paint === 'function' && name !== 'pianoroll') P.onPaint = function (painter) { return paint.call(this, (c, time, haps, ...rest) => painter(c, time, (haps || []).map(fullHap), ...rest)); };
        let out;
        try {
          const src = name === 'pianoroll' && full ? this.withValue(v => (v && typeof v === 'object' ? { ...v, gain: 1, velocity: 1 } : v)) : this;
          out = orig.call(src, id, o);
        } finally {
          for (const m of Object.keys(keep)) P[m] = keep[m];
          P.onPaint = paint;
        }
        if (ctx && ctx.canvas) {
          try { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); } catch (e) {}
          (globalThis.miskWidgetCanvases ||= new Map()).set(id, ctx.canvas);
        }
        if (own) {
          if (ctx && typeof this.draw === 'function') this.draw(name === 'scope' ? scopePainter(ctx, id, o) : spectrumPainter(ctx, id, o), { id });
          return this.tag(id);
        }
        return name === 'pianoroll' && full ? this.tag(id) : out;
      };
    }
    f.miskWidget = true;
    P[key] = f;
  }
}
// #79: the editor's block widgets of @strudel/codemirror (BlockWidget) say every widget equals every other (`eq()` is
// always true) and hand CodeMirror the canvas itself. When a widget's id changes where CodeMirror does not rebuild the
// line (the line typed before the evaluation, an index shifted by another line: ids are `_widget_<kind>_<n>`), the old
// canvas stays below the line: frozen (no pattern draws its id any more) or showing another line's drawing (its id now
// drawn elsewhere), until a pause rebuilds the editor. Wrapped once per page: each widget is a slot of its own that holds
// the canvas of its id now; two widgets are equal only with the same id and the same canvas, and a slot reused by
// CodeMirror takes the canvas of its new widget, so a canvas that moves to another line leaves its old slot empty.
export function installWidgetDom(BlockWidget) {
  const P = BlockWidget && BlockWidget.prototype;
  if (!P || P.miskSlot || typeof P.toDOM !== 'function') return false;
  const canvasOf = P.toDOM, idOf = w => { const c = w.widgetConfig || {}; return `${c.id || ''}_widget_${c.type}_${c.index}`; };
  const held = w => (w.miskDom ? w.miskDom.firstChild : canvasOf.call(w));
  const fill = (w, dom) => {
    const el = canvasOf.call(w);
    if (el && el.parentNode !== dom) { dom.textContent = ''; dom.appendChild(el); } else if (!el) dom.textContent = '';
    w.miskDom = dom;
    return dom;
  };
  P.eq = function (other) { return !!other && idOf(this) === idOf(other) && held(this) === held(other); };
  P.toDOM = function () { const dom = document.createElement('div'); dom.className = 'cw-slot'; return fill(this, dom); };
  P.updateDOM = function (dom) { if (!dom || !dom.classList || !dom.classList.contains('cw-slot')) return false; fill(this, dom); return true; };
  P.miskSlot = true;
  return true;
}
// a scope as Strudel draws it (drawTimeScope), always in the widget's colour
function scopePainter(ctx, id, { color = '#ffffff', thickness = 3, scale = 1, pos = 0.5, trigger = 0, align = true, smear = 0 } = {}) {
  return () => {
    const c = ctx.canvas, A = globalThis.analysers, an = A && A[id];
    if (smear) { ctx.fillStyle = `rgba(0,0,0,${1 - smear})`; ctx.fillRect(0, 0, c.width, c.height); } else ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineWidth = thickness; ctx.strokeStyle = color;
    ctx.beginPath();
    let d = null;
    try { d = an && globalThis.getAnalyzerData ? globalThis.getAnalyzerData('time', id) : null; } catch (e) { d = null; }
    if (!d || !d.length) { ctx.moveTo(0, pos * c.height); ctx.lineTo(c.width, pos * c.height); ctx.stroke(); return; }
    let t0 = align ? Array.from(d).findIndex((v, i, a) => i && a[i - 1] > -trigger && v <= -trigger) : 0;
    // (Strudel draws from the trigger on at a fixed step, so a late trigger left a short line, a dot in the video: the
    // trigger is looked for in the first half, and the rest fills the width)
    t0 = Math.max(0, Math.min(t0, Math.floor(d.length / 2)));
    const step = c.width / (d.length - t0);
    for (let i = t0, x = 0; i < d.length; i++, x += step) { const y = (pos - scale * d[i]) * c.height; if (i === t0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
  };
}
// a spectrum as Strudel draws it (drawSpectrum), its last frame kept by this widget only, in the widget's colour
function spectrumPainter(ctx, id, { color = '#ffffff', speed = 1, min = -80, max = 0 } = {}) {
  let last = null;
  return () => {
    const c = ctx.canvas, A = globalThis.analysers, an = A && A[id];
    let d = null;
    try { d = an && globalThis.getAnalyzerData ? globalThis.getAnalyzerData('frequency', id) : null; } catch (e) { d = null; }
    if (!d || !d.length) return;
    if (last && (last.width !== c.width || last.height !== c.height)) last = null;
    ctx.clearRect(0, 0, c.width, c.height);
    if (last) ctx.putImageData(last, -speed, 0);
    ctx.fillStyle = color;
    const q = c.width - speed, n = d.length;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (d[i] - min) / (max - min)));
      ctx.fillRect(q, c.height - (Math.log(i + 1) / Math.log(n)) * c.height, speed, 2);
    }
    ctx.globalAlpha = 1;
    last = ctx.getImageData(0, 0, c.width, c.height);
  };
}

// D4: the analyser of a scope or spectrum widget reads the analyser of its line's instrument. The widget's id is defined
// on the analysers as a hidden getter (not listed: the stage and the checks never see it); the instrument of each id
// comes from the haps that carry its tag, read again every half second. → stop()
// active(): false skips the work (no scope or spectrum in the code, nothing playing)
export function linkAnalysers({ pattern, now, active = () => true, interval = 500 }) {
  const inst = new Map(), linked = new Set();
  const refresh = () => {
    try {
      if (!active()) return;
      const A = globalThis.analysers, D = globalThis.analysersData, P = pattern();
      if (!A || !P) return;
      const t = now(), seen = new Map();
      for (const h of P.queryArc(Math.max(0, t), t + 0.5)) {
        const tags = (h.context && h.context.tags) || [], a = h.value && h.value.analyze;
        if (a === undefined) continue;
        for (const g of tags) if (typeof g === 'string' && g.includes('_widget_') && !seen.has(g)) seen.set(g, a);
      }
      for (const [g, a] of seen) {
        inst.set(g, a);
        if (linked.has(g)) continue;
        linked.add(g);
        try {
          Object.defineProperty(A, g, { get: () => globalThis.analysers[inst.get(g)], configurable: true, enumerable: false });
          if (D) Object.defineProperty(D, g, { get: () => (globalThis.analysersData || {})[inst.get(g)], configurable: true, enumerable: false });
        } catch (e) {}
      }
    } catch (e) {}
  };
  const iv = setInterval(refresh, interval);
  refresh();
  // (refresh(): read again now, after an evaluation, so a widget whose id is new draws its line at once, #79)
  return { stop: () => clearInterval(iv), instrument: id => inst.get(id), refresh };
}
