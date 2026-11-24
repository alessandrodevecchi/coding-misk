// The command registry of the Radio console (ai-assistant D0): one entry per console command an AI engine or an agent
// may use. Everything an engine sees of the console is generated from it (src/ai/generate.js): the built-in model's
// prompt and answer schema, the tool definitions of the online engines, the MCP tools (#26) and docs/AGENT-API.md
// (npm run agent-api, checked by npm run check:agent-api). No DOM here: Node checks import it.
//
// An entry:
//   kind         the console command, a key of COMMANDS (src/endless/steering.js)
//   button       how the console labels it (English, for the docs; the page uses its own strings)
//   description  one English line of what it does
//   args         JSON Schema of its arguments: { properties, required }; `fill` names the arguments the request fills
//                in (track: the playing track ids)
//   words        words a precise request uses for it (the vague-request guard, D4 guard 3)
//   map(a, ctx)  the arguments to the object the console button sends: { cmd } or { error, vars }
//   apply(c,api) the button's own code path: api holds the functions the console buttons call (src/radio/radio.js)
// validate(entry, args, ctx) below adds the console's own reason (whyNot, or airWhy on a grown song) through ctx.why.
import { COMMANDS, INSTRUMENTS, LOCK_PARTS, VARY_TYPES, KEY_MOVES, RISER_BARS, TREATMENTS } from '../endless/steering.js';

export const REGISTRY_VERSION = 1;

const S = (o = {}) => ({ type: 'string', ...o });
const PART = S({ enum: INSTRUMENTS, description: 'an instrument of the console (hook is the melody, beat the drums other than the kick)' });
const LOCK_PART = S({ enum: LOCK_PARTS, description: 'an instrument of the console, or the riser' });
const TYPE = S({ enum: VARY_TYPES, description: 'a part: lead (the melody or the guitar), bass, arp, pad, guitar' });
const TRACK = S({ description: 'the id of a playing track' });

// the common reasons of the registry itself (the console's own reasons come from ctx.why)
export const ERRORS = ['bad-arg', 'no-track', 'no-pattern', 'which-pattern', 'already-locked', 'not-locked', 'too-long', 'no-voice-helper', 'unknown-kind'];

const ok = cmd => ({ cmd });
const err = (error, vars = {}) => ({ error, vars });
// a track id of the request: it must play now
const trackOf = (id, ctx) => (ctx.tracks || []).find(x => x.id === id) || null;

// an entry with no arguments: the button sends { kind }
const plain = (kind, button, description, words, o = {}) => ({ kind, button, description, args: { properties: {}, required: [] }, words, map: () => ok({ kind }), apply: (c, api) => api.command(c), ...o });

export const ENTRIES = [
  plain('energy-up', '▲ More energy', 'raise the energy of the rest of the song', ['energy', 'more energy', 'energy up', 'pump']),
  plain('energy-down', '▼ Less energy', 'lower the energy of the rest of the song', ['energy', 'less energy', 'energy down', 'calm', 'calmer', 'quieter overall']),
  plain('more-complex', 'More complex', 'more tracks at once', ['complex', 'more complex', 'busier', 'fuller', 'more tracks']),
  plain('less-complex', 'Less complex', 'fewer tracks at once (simpler)', ['simpler', 'simplify', 'less complex', 'fewer tracks', 'sparser', 'strip it down']),
  {
    kind: 'more', button: '+ (instrument)', description: 'one more track of an instrument', args: { properties: { part: PART }, required: ['part'] },
    words: ['add', 'another', 'extra', 'one more', 'second', 'bring in'],
    map: a => (INSTRUMENTS.includes(a.part) ? ok({ kind: 'more', part: a.part }) : err('bad-arg', { arg: 'part' })),
    apply: (c, api) => api.pend('more', c.part),
  },
  {
    kind: 'less', button: '− (instrument)', description: 'one fewer track of an instrument', args: { properties: { part: PART }, required: ['part'] },
    words: ['remove', 'take away', 'take out', 'fewer', 'one less', 'drop one'],
    map: a => (INSTRUMENTS.includes(a.part) ? ok({ kind: 'less', part: a.part }) : err('bad-arg', { arg: 'part' })),
    apply: (c, api) => api.pend('less', c.part),
  },
  {
    kind: 'lock-part', button: 'Lock (instrument)', description: 'the director stops changing an instrument', args: { properties: { part: LOCK_PART }, required: ['part'] },
    words: ['lock', 'leave alone', 'keep it as it is', 'freeze'],
    map: (a, ctx) => (!LOCK_PARTS.includes(a.part) ? err('bad-arg', { arg: 'part' }) : (ctx.lockedParts || []).includes(a.part) ? err('already-locked', { what: a.part }) : ok({ kind: 'lock-part', part: a.part })),
    apply: (c, api) => api.pendLock(`p.${c.part}`, 'lock-part', { part: c.part }),
    consoleWhy: false,
  },
  {
    kind: 'unlock-part', button: 'Unlock (instrument)', description: 'the director may change the instrument again', args: { properties: { part: LOCK_PART }, required: ['part'] },
    words: ['unlock', 'free', 'let it change'],
    map: (a, ctx) => (!LOCK_PARTS.includes(a.part) ? err('bad-arg', { arg: 'part' }) : !(ctx.lockedParts || []).includes(a.part) ? err('not-locked', { what: a.part }) : ok({ kind: 'unlock-part', part: a.part })),
    apply: (c, api) => api.pendLock(`p.${c.part}`, 'unlock-part', { part: c.part }),
    consoleWhy: false,
  },
  {
    kind: 'riser', button: 'Riser', description: 'a rising noise sweep into the next part change',
    args: { properties: { bars: S({ enum: RISER_BARS.map(String), description: 'its length in bars, or auto' }), dir: S({ enum: ['up', 'down'], description: 'up (rising) or down (falling)' }) }, required: [] },
    words: ['riser', 'sweep', 'build up', 'build-up', 'buildup'],
    map: a => {
      const bars = a.bars === undefined || a.bars === 'auto' ? 'auto' : Number(a.bars);
      if (bars !== 'auto' && !RISER_BARS.includes(bars)) return err('bad-arg', { arg: 'bars' });
      if (a.dir !== undefined && !['up', 'down'].includes(a.dir)) return err('bad-arg', { arg: 'dir' });
      return ok({ kind: 'riser', bars, dir: a.dir || 'up', sound: 'noise' });
    },
    apply: (c, api) => api.command(c),
  },
  {
    kind: 'pattern', button: 'Add a saved pattern', description: "one of the listener's saved patterns, by name: without track as a new track, with track in place of that playing track",
    args: { properties: { name: S({ maxLength: 60, description: "the saved pattern's name as the listener wrote it" }), track: TRACK }, required: ['name'] },
    fill: { track: 'tracks' },
    words: ['pattern', 'saved'],
    map: (a, ctx) => {
      const m = matchPattern(a.name, ctx.patterns || []);
      if (m.error) return m;
      const item = m.item;
      if (a.track === undefined) return ok({ kind: 'pattern', mode: 'new', item });
      if (!trackOf(a.track, ctx)) return err('no-track', { track: a.track });
      return ok({ kind: 'pattern', mode: 'replace', target: a.track, item });
    },
    apply: (c, api) => api.pattern(c),
  },
  {
    kind: 'voicing', button: 'Part harmony', description: 'how a part sits on the chords',
    args: { properties: { type: TYPE, treatment: S({ enum: [...TREATMENTS, 'auto'], description: 'thirds, octave, colour (chord colour), inversion, or auto' }) }, required: ['type', 'treatment'] },
    words: ['thirds', 'octave', 'inversion', 'colour', 'color', 'voicing', 'harmonise', 'harmonize'],
    map: a => (!VARY_TYPES.includes(a.type) ? err('bad-arg', { arg: 'type' }) : ![...TREATMENTS, 'auto'].includes(a.treatment) ? err('bad-arg', { arg: 'treatment' }) : ok({ kind: 'voicing', type: a.type, target: 'auto', treatment: a.treatment })),
    apply: (c, api) => api.command(c),
  },
  {
    kind: 'vary', button: 'Vary', description: 'new notes for a part', args: { properties: { type: TYPE }, required: ['type'] },
    words: ['vary', 'variation', 'new notes', 'different notes', 'change the notes'],
    map: a => (VARY_TYPES.includes(a.type) ? ok({ kind: 'vary', type: a.type, target: 'auto' }) : err('bad-arg', { arg: 'type' })),
    apply: (c, api) => api.command(c),
  },
  {
    kind: 'swap', button: 'Swap', description: 'another ready-made part for a part', args: { properties: { type: TYPE }, required: ['type'] },
    words: ['swap', 'something else', 'another part', 'replace the'],
    map: a => (VARY_TYPES.includes(a.type) ? ok({ kind: 'swap', type: a.type, target: 'auto' }) : err('bad-arg', { arg: 'type' })),
    apply: (c, api) => api.command(c),
  },
  plain('darker', 'Darker', 'close the filters', ['darker', 'dark', 'muffled', 'close the filter']),
  plain('brighter', 'Brighter', 'open the filters', ['brighter', 'bright', 'open the filter']),
  plain('dirtier', 'Dirtier', 'more drive and distortion', ['dirtier', 'dirty', 'distortion', 'distorted', 'gritty', 'grit', 'drive']),
  plain('cleaner', 'Cleaner', 'less drive and fewer effects', ['cleaner', 'clean', 'less distortion', 'drier', 'dry']),
  plain('more-space', 'More space', 'more delay and reverb', ['reverb', 'delay', 'space', 'echo', 'spacious']),
  {
    kind: 'instrument', button: 'Change instrument', description: 'another sound for the leading instrument, or for track', args: { properties: { track: TRACK }, required: [] },
    fill: { track: 'tracks' },
    words: ['instrument', 'another sound', 'different sound', 'change the sound'],
    map: (a, ctx) => (a.track === undefined ? ok({ kind: 'instrument' }) : trackOf(a.track, ctx) ? ok({ kind: 'instrument', track: a.track }) : err('no-track', { track: a.track })),
    apply: (c, api) => api.command(c),
  },
  plain('progression', 'Change chords', 'other chords (a new chord progression)', ['chords', 'chord', 'progression', 'harmony']),
  {
    kind: 'key', button: 'Change key', description: 'change key: up or down a fifth, to the relative key, or auto',
    args: { properties: { to: S({ enum: KEY_MOVES, description: 'up and down: a fifth; relative: the relative major or minor; auto' }) }, required: [] },
    words: ['key', 'transpose', 'fifth', 'relative'],
    map: a => (a.to === undefined || a.to === 'auto' ? ok({ kind: 'key' }) : KEY_MOVES.includes(a.to) ? ok({ kind: 'key', to: a.to }) : err('bad-arg', { arg: 'to' })),
    apply: (c, api) => api.command(c),
  },
  plain('talk-more', 'Narrator more', 'the narrator comments more', ['talk more', 'narrator', 'more comments', 'speak more']),
  plain('talk-less', 'Narrator less', 'the narrator comments less', ['talk less', 'narrator', 'fewer comments', 'speak less', 'quiet narrator']),
  {
    kind: 'say-live', button: 'Say now', description: 'the voice track speaks a line now, at most 12 words',
    args: { properties: { text: S({ maxLength: 120, description: 'the line to say, as the listener wrote it' }) }, required: ['text'] },
    words: ['say', 'spoken line', 'speak', 'announce'],
    map: (a, ctx) => {
      const text = String(a.text || '').trim().replace(/\s+/g, ' ');
      if (!text) return err('bad-arg', { arg: 'text' });
      if (text.length > 120 || text.split(' ').length > 12) return err('too-long', { n: text.split(' ').length });
      if (ctx.voiceHelper === false) return err('no-voice-helper');
      return ok({ kind: 'say-live', text, mode: 'now' });
    },
    apply: (c, api) => api.say(c.text),
  },
  plain('drop', 'Drop', 'jump to the drop', ['drop', 'the drop']),
  plain('stay', 'Stay', 'repeat the part playing once more', ['stay', 'repeat', 'once more', 'loop this', 'a bit longer']),
  plain('extend', 'Extend', 'make the song longer before its ending', ['extend', 'longer', 'lengthen']),
  plain('end', 'End', 'go to the outro and end the song', ['end', 'finish', 'outro', 'wrap up']),
  {
    kind: 'volume', button: 'Volume', description: 'set the volume of a track: value from 0 to 1.2 (0.5 is half)',
    args: { properties: { track: TRACK, value: { type: 'number', minimum: 0, maximum: 1.2, description: 'the new volume, 0 to 1.2' } }, required: ['track', 'value'] },
    fill: { track: 'tracks' },
    words: ['volume', 'louder', 'quieter', 'percent', 'turn up', 'turn down', 'half'],
    map: (a, ctx) => (!trackOf(a.track, ctx) ? err('no-track', { track: a.track }) : typeof a.value !== 'number' || !(a.value >= 0 && a.value <= 1.2) ? err('bad-arg', { arg: 'value' }) : ok({ kind: 'volume', track: a.track, value: Math.round(a.value * 100) / 100 })),
    apply: (c, api) => api.command(c),
  },
  {
    kind: 'mute', button: 'Mute', description: 'mute a playing track', args: { properties: { track: TRACK }, required: ['track'] },
    fill: { track: 'tracks' },
    words: ['mute', 'silence', 'cut the'],
    map: (a, ctx) => (trackOf(a.track, ctx) ? ok({ kind: 'mute', track: a.track }) : err('no-track', { track: a.track })),
    apply: (c, api) => api.command(c),
  },
  {
    kind: 'unmute', button: 'Back', description: 'a muted track plays again', args: { properties: { track: TRACK }, required: ['track'] },
    fill: { track: 'tracks' },
    words: ['unmute', 'bring back', 'back in'],
    map: (a, ctx) => (trackOf(a.track, ctx) ? ok({ kind: 'unmute', track: a.track }) : err('no-track', { track: a.track })),
    apply: (c, api) => api.command(c),
  },
  {
    kind: 'lock', button: 'Lock track', description: 'the director stops changing a track', args: { properties: { track: TRACK }, required: ['track'] },
    fill: { track: 'tracks' },
    words: ['lock', 'leave alone'],
    map: (a, ctx) => (!trackOf(a.track, ctx) ? err('no-track', { track: a.track }) : (ctx.lockedTracks || []).includes(a.track) ? err('already-locked', { what: a.track }) : ok({ kind: 'lock', track: a.track })),
    apply: (c, api) => api.pendLock(`t.${c.track}`, 'lock', { track: c.track }),
    consoleWhy: false,
  },
  {
    kind: 'unlock', button: 'Unlock track', description: 'the director may change a track again', args: { properties: { track: TRACK }, required: ['track'] },
    fill: { track: 'tracks' },
    words: ['unlock'],
    map: (a, ctx) => (!trackOf(a.track, ctx) ? err('no-track', { track: a.track }) : !(ctx.lockedTracks || []).includes(a.track) ? err('not-locked', { what: a.track }) : ok({ kind: 'unlock', track: a.track })),
    apply: (c, api) => api.pendLock(`t.${c.track}`, 'unlock', { track: c.track }),
    consoleWhy: false,
  },
];

// console commands the registry leaves out, with the reason (the docs list them)
export const LEFT_OUT = {
  add: 'legacy, kept for sessions recorded before the per-instrument console',
  remove: 'legacy, kept for sessions recorded before the per-instrument console',
  voice: 'a preset form, not a single request',
  'voice-sound': 'a preset form, not a single request',
  curve: 'drawn values on the curves',
  'curve-reset': 'drawn values on the curves',
};

export const BY_KIND = Object.fromEntries(ENTRIES.map(e => [e.kind, e]));

// what the console never does (D4 guard 2): answered "cannot" before any engine is asked
export const CANNOT = [
  { id: 'tempo', re: /\b(tempo|bpm|faster|slower|speed it up|slow it down)\b|\b\d{2,3} ?bpm\b/, note: 'The console cannot change the tempo.' },
  { id: 'meter', re: /\btime signature\b|\b\d\/\d\b|\bwaltz\b|\bodd meter\b/, note: 'The console cannot change the time signature.' },
  { id: 'backwards', re: /\bbackwards?\b|\bin reverse\b|\breversed?\b/, note: 'The console cannot play the song backwards.' },
];

// ---------- text helpers ----------

export const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const FILLER = new Set(['my', 'saved', 'pattern', 'patterns', 'the', 'a', 'an', 'called', 'named']);
const tokens = s => norm(s).split(' ').filter(w => w && !FILLER.has(w));
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const tokSim = (a, b) => { const s = 1 - lev(a, b) / Math.max(a.length, b.length); return a.length >= 3 && b.startsWith(a) ? Math.max(s, 0.9) : s; };
const best = (w, list) => list.reduce((m, x) => Math.max(m, tokSim(w, x)), 0);

// D4 guard 1: a saved pattern's name, as the model wrote it, against the fitting patterns
export const PATTERN_MATCH = { threshold: 0.75, tie: 0.05 };
export function nameScore(query, name) {
  const q = tokens(query), c = tokens(name);
  if (!q.length || !c.length) return 0;
  if (q.join(' ') === c.join(' ')) return 1;
  const qc = q.reduce((a, w) => a + best(w, c), 0) / q.length, cc = c.reduce((a, w) => a + best(w, q), 0) / c.length;
  return 0.8 * qc + 0.2 * cc;
}
// { item } or { error: 'no-pattern' | 'which-pattern', vars }
export function matchPattern(name, patterns) {
  const shown = String(name || '').trim();
  if (!shown) return err('no-pattern', { name: shown });
  const scored = patterns.map(p => ({ p, s: nameScore(shown, p.name || p.id) })).sort((a, b) => b.s - a.s);
  const [a, b] = scored;
  if (!a || a.s < PATTERN_MATCH.threshold) return err('no-pattern', { name: shown });
  if (a.s < 1 && b && b.s >= PATTERN_MATCH.threshold && a.s - b.s <= PATTERN_MATCH.tie) return err('which-pattern', { a: a.p.name || a.p.id, b: b.p.name || b.p.id });
  return { item: a.p };
}

// ---------- the guards before and after the engine ----------

// D4 guards 2 and 3 on the request text: { cannot: note } when the console never does it, else { vague }
export const INSTRUMENT_WORDS = ['kick', 'kicks', 'beat', 'drum', 'drums', 'hat', 'hats', 'hihat', 'hi hat', 'snare', 'clap', 'claps', 'bass', 'arp', 'arps', 'arpeggio', 'hook', 'melody', 'lead', 'guitar', 'pad', 'pads', 'texture', 'riser'];
const has = (text, w) => new RegExp(`(^| )${norm(w).replace(/ /g, ' ')}( |$)`).test(text);
export function precheck(request, ctx = {}) {
  const raw = String(request ?? '').toLowerCase(), text = norm(request);
  const say = sayText(request);
  if (say) return { vague: false, say };
  for (const c of CANNOT) if (c.re.test(raw)) return { cannot: c.note, id: c.id };
  const words = ENTRIES.flatMap(e => e.words).concat(INSTRUMENT_WORDS);
  if (words.some(w => has(text, w))) return { vague: false };
  if ((ctx.tracks || []).some(x => has(text, x.id) || (x.name && has(text, x.name)))) return { vague: false };
  const req = tokens(request);
  if ((ctx.patterns || []).some(p => { const c = tokens(p.name || p.id); return c.length && c.every(w => best(w, req) >= 0.8); })) return { vague: false };
  return { vague: true };
}

// ---------- the checks against the request (D4 checks 4 to 6, from probe v3) ----------

// D4 check 6: "say: …", "add a spoken line: …", "announce \"…\"" become the line itself, before the engine and before
// the "cannot" list (a line may say "faster"). The text as typed; the entry's map applies the 12 words and the helper
export const SAY_REQUEST = /\b(say|speak|spoken|announce|dici|frase|annuncia)\b/i;
export function sayText(request) {
  const raw = String(request ?? '');
  const m = SAY_REQUEST.exec(raw);
  if (!m) return null;
  const rest = raw.slice(m.index + m[0].length);
  const q = /["“«]([^"”»]+)["”»]/.exec(rest);
  const c = /:\s*(.+)$/.exec(rest);
  const text = (q && (!c || q.index < c.index) ? q[1] : c ? c[1] : '').trim().replace(/^["“«]+|["”»]+$/g, '').trim();
  return text || null;
}
// the answer the app gives without the engine, or null
export function directAnswer(request) {
  const text = sayText(request);
  return text ? { note: '', commands: [{ kind: 'say-live', text }] } : null;
}

// a word of the request against a word of a name: the per-word score of guard 1 (prefixes count)
const covered = (nameWords, reqWords, min = 0.8) => (nameWords.length ? nameWords.filter(w => best(w, reqWords) >= min).length / nameWords.length : 0);
const strictSim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length);
const STOP = new Set(['the', 'my', 'a', 'an', 'with', 'of', 'in', 'on', 'for', 'add', 'use', 'put', 'play', 'replace', 'saved', 'pattern', 'patterns', 'and', 'to', 'instead', 'place', 'please', 'called', 'named', 'by']);
// the saved pattern name the request itself writes: in quotes, after "pattern", or before it; null when it writes none
export function requestPatternName(request) {
  const raw = String(request ?? '');
  const q = /["“«]([^"”»]+)["”»]/.exec(raw);
  if (q && q[1].trim()) return q[1].trim();
  const words = raw.split(/\s+/).filter(Boolean);
  const isPat = w => /^patterns?$/i.test(w.replace(/[^\w]/g, ''));
  const at = words.findIndex(isPat);
  if (at < 0) return null;
  const clean = w => w.replace(/^[^\w]+|[^\w]+$/g, '');
  const after = [];
  for (let i = at + 1; i < words.length; i++) { const w = clean(words[i]); if (!w || STOP.has(w.toLowerCase())) { if (after.length || !['called', 'named'].includes(w.toLowerCase())) break; continue; } after.push(w); }
  if (after.length) return after.join(' ');
  const before = [];
  for (let i = at - 1; i >= 0; i--) { const w = clean(words[i]); if (!w || STOP.has(w.toLowerCase())) break; before.unshift(w); }
  return before.length ? before.join(' ') : null;
}
// a saved pattern whose words all appear in the request (strict per-word score, names of two words or more, one only)
function patternWrittenOut(request, patterns) {
  const req = tokens(request);
  const hits = patterns.filter(p => { const c = tokens(p.name || p.id); return c.length >= 2 && c.every(w => req.some(r => strictSim(w, r) >= 0.8)); });
  return hits.length === 1 ? hits[0] : null;
}
// the pattern the request names: { item } | { name } (named but not saved, or two alike) | null (names none)
export function requestPattern(request, patterns) {
  const shown = requestPatternName(request);
  if (shown) { const m = matchPattern(shown, patterns); return m.item ? { item: m.item, name: shown } : { name: shown }; }
  const p = patternWrittenOut(request, patterns);
  return p ? { item: p, name: p.name || p.id } : null;
}
// the model's pattern name is supported when most of its words are in the request (near spellings pass)
export const SUPPORT = 0.6;
export const nameInRequest = (name, request) => covered(tokens(name), tokens(request)) >= SUPPORT;

// D4 check 5: the commands whose `words` the request uses, counting only words that belong to one command; an answered
// command of the same family satisfies it (ALIKE)
const WORD_OWNERS = (() => { const m = new Map(); for (const e of ENTRIES) for (const w of new Set(e.words)) m.set(w, (m.get(w) || 0) + 1); return m; })();
export const ALIKE = {
  more: ['unmute', 'pattern'], less: ['mute'], mute: ['less', 'volume'], unmute: ['more', 'volume'], volume: ['mute', 'unmute'],
  lock: ['lock-part'], 'lock-part': ['lock'], unlock: ['unlock-part'], 'unlock-part': ['unlock'],
  swap: ['pattern', 'instrument', 'vary'], vary: ['swap'], instrument: ['swap'], extend: ['stay'], stay: ['extend'], drop: ['less', 'mute'],
};
export function kindsNamed(request) {
  const text = norm(request);
  return ENTRIES.filter(e => e.words.some(w => WORD_OWNERS.get(w) === 1 && has(text, w))).map(e => e.kind);
}
// D4 check 7 (probe v4): a "cannot" answer to a request that is not vague and names exactly one command by its unique
// words, a command with no required arguments, becomes that command; null when the "cannot" stays
export function cannotOverride(request, ctx = {}) {
  if (precheck(request, ctx).vague !== false) return null;
  const named = kindsNamed(request);
  if (named.length !== 1) return null;
  const e = BY_KIND[named[0]];
  return e && !e.args.required.length ? e.kind : null;
}
// the answer read against the request: { json, check: null | 'pattern' | 'words' | 'cannot', fixed: [what was changed] }.
// json is a copy with pattern names replaced or set to the request's name, or a "cannot" turned into the command the
// request names (check 7, the engine's note dropped); check asks for a proposal even in "Apply at once"
export function reviewAnswer(request, json, ctx = {}) {
  if (json && typeof json === 'object' && Array.isArray(json.commands) && !json.commands.length) {
    const kind = cannotOverride(request, ctx);
    if (kind) return { json: { ...json, note: '', commands: [{ kind }] }, check: 'cannot', fixed: [{ from: 'cannot', to: kind }] };
  }
  if (!json || typeof json !== 'object' || !Array.isArray(json.commands) || !json.commands.length) return { json, check: null, fixed: [] };
  const patterns = ctx.patterns || [], fixed = [];
  let check = null, named;
  const want = () => (named === undefined ? (named = requestPattern(request, patterns)) : named);
  // the model's track stays only when the request names it (its id, name or instrument), else the pattern is a new track
  const text = norm(request);
  const keepTrack = c => {
    if (c.track === undefined) return c;
    const x = (ctx.tracks || []).find(t => t.id === c.track);
    if ([c.track, x && x.name, x && x.instrument, x && x.type].some(w => w && has(text, w))) return c;
    const { track, ...rest } = c;
    return rest;
  };
  const commands = json.commands.map(c => {
    if (!c || c.kind !== 'pattern' || nameInRequest(c.name, request)) return c;
    const r = want();
    if (r && r.item) { fixed.push({ from: c.name, to: r.item.name || r.item.id }); return keepTrack({ ...c, name: r.item.name || r.item.id }); }
    if (r && r.name) { fixed.push({ from: c.name, to: r.name, unknown: true }); return keepTrack({ ...c, name: r.name }); }
    check = 'pattern';
    return c;
  });
  const out = { ...json, commands };
  if (!check) {
    const kinds = commands.map(c => c && c.kind);
    const hasPattern = kinds.includes('pattern');
    const named1 = kindsNamed(request);
    if (named1.length === 1 && !hasPattern) {
      const k = named1[0], ok = [k, ...(ALIKE[k] || [])];
      if (!kinds.some(x => ok.includes(x))) check = 'words';
    }
    if (!check && !hasPattern) { const p = patternWrittenOut(request, patterns); if (p) check = 'words'; }
  }
  return { json: out, check, fixed };
}

// one command of an answer: { kind, args } to { entry, args, cmd } or { entry, args, error, vars } or { ..., cmd, why }
export function validate(entry, args, ctx) {
  if (!entry) return { error: 'unknown-kind', vars: { kind: args && args.kind } };
  const m = entry.map(args || {}, ctx);
  if (m.error) return { entry, args, error: m.error, vars: m.vars || {} };
  const why = entry.consoleWhy === false || !ctx.why ? null : ctx.why(m.cmd);
  return why ? { entry, args, cmd: m.cmd, why } : { entry, args, cmd: m.cmd };
}

// an answer of the engine: { note, cannot, items }. A note with no commands is the "cannot" answer (guard 2)
export function readAnswer(json, ctx) {
  if (!json || typeof json !== 'object' || !Array.isArray(json.commands)) return { invalid: true, items: [] };
  const note = typeof json.note === 'string' ? json.note.trim().slice(0, 160) : '';
  const items = json.commands.slice(0, 4).map(c => {
    const { kind, ...args } = c && typeof c === 'object' ? c : {};
    const entry = BY_KIND[kind];
    const r = validate(entry, args, ctx);
    return { kind, ...r };
  });
  return { note, cannot: !items.length, items };
}

// the valid commands applied in order through each entry's apply (the buttons' paths): each item gets applied: true|false
export function applyItems(items, api) {
  for (const it of items) {
    if (!it.cmd || it.why || it.error) continue;
    try { it.applied = it.entry.apply(it.cmd, api) !== false; } catch (e) { it.applied = false; it.failed = String(e && e.message || e); }
  }
  return items;
}

// every console command is either in the registry or left out with a reason (check:agent-api)
export const registryProblems = () => {
  const out = [];
  for (const k of Object.keys(COMMANDS)) if (!BY_KIND[k] && !LEFT_OUT[k]) out.push(`console command "${k}" is neither in the registry nor in LEFT_OUT`);
  for (const e of ENTRIES) {
    if (!COMMANDS[e.kind]) out.push(`entry "${e.kind}" is not a console command`);
    for (const f of ['button', 'description']) if (!e[f] || !String(e[f]).trim()) out.push(`entry "${e.kind}" has no ${f}`);
    if (!e.args || typeof e.args.properties !== 'object' || !Array.isArray(e.args.required)) out.push(`entry "${e.kind}" has no argument schema`);
    else {
      for (const [p, s] of Object.entries(e.args.properties)) if (!s || !s.type) out.push(`entry "${e.kind}": argument "${p}" has no type`);
      for (const r of e.args.required) if (!e.args.properties[r]) out.push(`entry "${e.kind}": required argument "${r}" is not defined`);
    }
    if (!Array.isArray(e.words) || !e.words.length) out.push(`entry "${e.kind}" has no words`);
    for (const f of ['map', 'apply']) if (typeof e[f] !== 'function') out.push(`entry "${e.kind}" has no ${f}`);
    if (LEFT_OUT[e.kind]) out.push(`entry "${e.kind}" is also in LEFT_OUT`);
  }
  return out;
};
