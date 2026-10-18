// Crescendo (#64): a build style of the live build where a song grows from one sound to the song as written in
// small steps, one or a few lines at a time, like a live coder. Pure: runs in the app and in Node (check:crescendo).
// crescendoSong(song) returns an ordinary song: the written song with a growth span in front (the reference section
// repeated, first over one held chord), generated pattern variants ("A~1", "A~2"…) and a "build" list made only of
// the live build actions. Everything downstream (player, seek, typing, voice, export, hand takeover) works unchanged.
import { normalizeSong, SETTING_FIELDS } from './format.js';
import { stream } from '../endless/random.js';
import { PROGS, DEFAULT, presetIdea, meterSteps } from '../music.js';
import { ideaLadder, expandIdea, ideaRows } from './ideas.js';
import { coderPath } from './coder.js';
import { stateAt } from './build.js';

// raised when an intended change to the rules changes the steps of a checked song (tools/check-crescendo.mjs)
// 2 (idea-model): the Live coder's natural growth grows ideas (presets included) through simpler forms of themselves
export const CRESCENDO_VERSION = 2;
// the random stream keeps the name of version 1: a version raised for the Live coder rules does not move the steps of
// Classic and Crescendo
const STREAM = 'crescendo-1';
export const BUILD_STYLES = ['blocks', 'crescendo'];
export const ENDINGS = ['strip', 'blocks', 'short'];

const clone = o => JSON.parse(JSON.stringify(o));
const ORDER = ['drums', 'bass', 'pad', 'guitar', 'arp', 'hook', 'texture', 'riser', 'code'];
// tracks without rows or notes to thin grow with the "degrade" device instead
const DEGRADE_TYPES = ['bass', 'guitar', 'arp', 'hook', 'pad', 'texture'];
const COLOUR_KEYS = ['cutoff', 'drive', 'grit', 'room', 'delay', 'gain'];
// natural growth: which functions a track writes, by setting (they are hidden until a step reveals them)
const HIDE_TYPES = ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture'];
const HIDES = {
  cutoff: (s, type) => type !== 'texture' && Number.isFinite(s.cutoff) && s.cutoff < 18000,
  reso: s => Number(s.reso) > 0, drive: s => Number(s.drive) > 0, grit: s => Number(s.grit) > 0,
  room: s => Number(s.room) > 0, delay: s => Number(s.delay) > 0, env: (s, type) => ['bass', 'arp', 'hook', 'pad', 'guitar'].includes(type),
};
const r3 = x => Math.round(x * 1000) / 1000;

// ---------- growing patterns ----------
// strength of a 16th position: 4 first beat, 3 other beats, 2 off-beat 8ths, 1 off 16ths
const strength = i => (i % 16 === 0 ? 4 : i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1);
const ROW_CLASS = { bd: 2, cp: 1, sd: 1, hh: 0, oh: 0, rd: 0 };
// among hits of the same strength, the order of removal is spread over the bar (bit-reversed position), so a thinned
// row keeps an even pulse instead of losing its first half
const spread = i => { const q = i % 16; return ((q & 1) << 3 | (q & 2) << 1 | (q & 4) >> 1 | (q & 8) >> 3) * 64 + Math.floor(i / 16); };
// thinned versions of a list of hits: level k of n removes the weakest k/n of the hits that are not the core
function thinHits(hits, core, n) {
  const rest = hits.filter(h => !core.includes(h)).sort((a, b) => a.w - b.w || a.order - b.order);
  return Array.from({ length: n }, (_, k) => new Set([...core, ...rest.slice(Math.round(rest.length * (k + 1) / n))]));
}
function thinRows(rows, n) {
  const hits = [];
  Object.entries(rows || {}).forEach(([row, steps], r) => [...steps].forEach((c, i) => { if (c === 'x') hits.push({ row, i, w: strength(i) * 3 + (ROW_CLASS[row] ?? 1), order: spread(i) * 8 + r }); }));
  if (!hits.length) return Array(n).fill(rows);
  // the simplest variant keeps the kick on the first beat (or the strongest hit when there is no kick)
  let core = hits.filter(h => h.row === 'bd' && h.i % 16 === 0);
  if (!core.length) { const top = Math.max(...hits.map(h => h.w)); core = [hits.find(h => h.w === top)]; }
  return thinHits(hits, core, n).map(keep => Object.fromEntries(Object.entries(rows).map(([row, steps]) =>
    [row, [...steps].map((c, i) => (c === 'x' && [...keep].some(h => h.row === row && h.i === i) ? 'x' : '.')).join('')])
    .filter(([, steps]) => steps.includes('x'))));
}
// written notes ("0 ~ 3 2", "<[0 ~ 1] [3 ~]>") and step masks ("x..x"): the weaker tokens become rests
const TOKEN = /[^\s[\]<>]+/g;
function thinNotes(text, n) {
  const toks = [...String(text).matchAll(TOKEN)].map((m, p) => ({ p, rest: /^[~.\-_]$/.test(m[0]) }));
  const hits = toks.filter(t => !t.rest).map(t => ({ ...t, w: t.p % 8 === 0 ? 4 : t.p % 4 === 0 ? 3 : t.p % 2 === 0 ? 2 : 1, order: spread(t.p) }));
  if (!hits.length) return Array(n).fill(text);
  let core = hits.filter(h => h.w === 4); if (!core.length) core = [hits[0]];
  return thinHits(hits, core, n).map(keep => { let p = -1; return String(text).replace(TOKEN, tok => (++p, /^[~.\-_]$/.test(tok) || [...keep].some(h => h.p === p) ? tok : '~')); });
}
const thinSteps = (steps, n) => {
  const hits = [...steps].map((c, i) => ({ i, c })).filter(h => h.c === 'x').map(h => ({ ...h, w: strength(h.i), order: spread(h.i) }));
  if (!hits.length) return Array(n).fill(steps);
  const core = [hits.find(h => h.w === Math.max(...hits.map(x => x.w)))];
  return thinHits(hits, core, n).map(keep => [...steps].map((c, i) => (c === 'x' && [...keep].some(h => h.i === i) ? 'x' : '.')).join(''));
};
// how much a pattern can be thinned: hits or notes it plays (0: nothing to thin)
function density(type, pat, ctx = {}) {
  if (type === 'drums' && pat.idea && !pat.rows) return Object.values(ideaRows(pat.idea, ctx.N || 16)).join('').split('x').length - 1;
  if (type === 'drums') return Object.values(pat.rows || {}).join('').split('x').length - 1;
  if (pat.notes) return [...String(pat.notes).matchAll(TOKEN)].filter(m => !/^[~.\-_]$/.test(m[0])).length;
  if (pat.steps) return String(pat.steps).split('x').length - 1;
  if (pat.idea) return expandIdea(pat.idea, { type, N: ctx.N || 16, ch: pat, shared: ctx.shared || {} }).steps.split('x').length - 1;
  return 0;
}
// n variants of a pattern, level 1 (closest to the written one) to level n (the simplest)
// rules.natural (arp-patterns): an arpeggio's order grows from one note, then two notes of the chord (the root and the
// fifth), thinned and then whole, then the written order with the whole chord
function arpVariants(notes, n) {
  const two = String(notes).replace(TOKEN, tok => (/^\d$/.test(tok) ? (+tok < 2 ? '0' : '2') : tok));
  const out = [two, ...thinNotes(two, Math.max(0, n - 1))].slice(0, n);
  if (n > 1) out[n - 1] = out[n - 1].replace(TOKEN, tok => (/^\d$/.test(tok) ? '0' : tok));
  return out;
}
// ideas (idea-model): with rules.natural (Live coder) an idea grows through simpler forms of itself (ideaLadder): a
// preset counts as its idea. Otherwise an idea is thinned from the steps it plays, as the same written steps would be.
// ctx: { N (16ths per bar of the reference section), shared (the song's progressions) }
const LADDER_TYPES = ['bass', 'guitar', 'arp', 'hook', 'pad', 'drums'];
const ideaOf = (type, pat) => pat.idea || (['bass', 'guitar', 'arp', 'hook', 'pad'].includes(type) && !pat.notes && !pat.steps ? presetIdea(type, { preset: pat.preset, pattern: pat.preset }) : null);
export function ideaForms(type, pat, n, ctx = {}) {
  if (!LADDER_TYPES.includes(type) || pat.notes || pat.steps || (type === 'drums' && !pat.idea)) return [];
  const idea = ideaOf(type, pat);
  return idea ? ideaLadder(idea, { type, N: ctx.N || 16, ch: pat, shared: ctx.shared || {} }, n) : [];
}
export function patternVariants(type, pat, n, rules = {}, ctx = {}) {
  if (rules.natural) {
    const forms = ideaForms(type, pat, n, ctx);
    if (forms.length) {
      // a preset keeps its name (its sound and its label); fewer forms than levels: the simplest repeats
      const preset = pat.idea ? {} : { preset: pat.preset ?? (type === 'guitar' ? DEFAULT.guitar.pattern : DEFAULT[type].preset) };
      return Array.from({ length: n }, (_, k) => ({ ...pat, ...preset, idea: forms[Math.min(k, forms.length - 1)] }));
    }
  }
  if (type === 'arp' && rules.natural && pat.notes && /\d/.test(pat.notes)) return arpVariants(pat.notes, n).map(notes => ({ ...pat, notes }));
  if (type === 'drums' && pat.idea && !pat.rows) { const { idea, ...rest } = pat; return thinRows(ideaRows(idea, ctx.N || 16), n).map(rows => ({ ...rest, rows })); }
  if (type === 'drums') return thinRows(pat.rows, n).map(rows => ({ ...pat, rows }));
  if (pat.notes) return thinNotes(pat.notes, n).map(notes => ({ ...pat, notes }));
  if (pat.steps) return thinSteps(pat.steps, n).map(steps => ({ ...pat, steps }));
  if (pat.idea) return thinSteps(expandIdea(pat.idea, { type, N: ctx.N || 16, ch: pat, shared: ctx.shared || {} }).steps, n).map(steps => ({ ...pat, steps }));
  return Array(n).fill(pat);
}

// ---------- settings ----------
// neutral value of a setting, where its knob starts: a closed filter (halfway to 200 Hz on a log scale), no drive,
// no room, no delay, 80% of the gain. null: the setting is not grown
function neutral(key, v) {
  if (typeof v !== 'number') return null;
  if (key === 'cutoff') return v > 300 ? Math.round(Math.exp((Math.log(v) + Math.log(200)) / 2) / 10) * 10 : null;
  if (key === 'gain') return v > 0 ? r3(v * 0.8) : null;
  return v > 0 ? 0 : null;
}
// values of a knob turned from the neutral value to the written one in m moves (the last is the written value)
function moves(key, from, to, m) {
  return Array.from({ length: m }, (_, j) => {
    const k = (j + 1) / m;
    if (j === m - 1) return to;
    return key === 'cutoff' ? Math.round(Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * k) / 10) * 10 : r3(from + (to - from) * k);
  });
}

// ---------- the path ----------
// One track's plan at a level of detail (3 full, 0 bare): the minimal state it enters with (setup) and its growth
// units, each one small change. Units of a queue keep their order.
// rules.natural (natural-growth): the track's functions are hidden at the start and arrive one per step, some knob
// moves are tried by ear (a value past the next one, then corrected)
function trackPlan(t, d, rng, clipKeys, rules = {}, ctx = {}) {
  const plan = { id: t.id, type: t.type, setup: [], fullness: [], colour: [], patterns: {} };
  if (t.type === 'code' || t.type === 'riser' || t.type === 'voice' || t.type === 'module') return plan;
  // pattern variants
  const dens = Math.max(0, ...Object.values(t.patterns || {}).map(p => density(t.type, p, ctx)));
  let n = dens >= 24 ? 4 : dens >= 10 ? 3 : dens >= 2 ? 2 : 0;
  // Live coder: an idea has as many levels as simpler forms (ideaForms), whatever its density
  const ladder = rules.natural ? Math.max(0, ...Object.values(t.patterns || {}).map(p => ideaForms(t.type, p, 4, ctx).length)) : 0;
  if (ladder) n = ladder;
  n = d >= 2 ? n : d === 1 ? Math.min(n, 2) : Math.min(n, 1);
  const rack = t.rack || [];
  if (n) {
    for (const [name, pat] of Object.entries(t.patterns || {})) patternVariants(t.type, pat, n, rules, ctx).forEach((v, k) => { plan.patterns[`${name}~${k + 1}`] = v; });
    plan.setup.push({ pattern: { track: t.id, level: n } });
    for (let k = n - 1; k >= 0; k--) plan.fullness.push({ kind: 'grow', step: { pattern: { track: t.id, level: k } } });
  } else if (DEGRADE_TYPES.includes(t.type) && !rack.some(x => x.device === 'degrade')) {
    const amounts = d >= 2 ? [0.6, 0.35, 0.15] : [0.5];
    plan.setup.push({ rack: { track: t.id, device: 'degrade', amount: amounts[0] } });
    amounts.slice(1).forEach(a => plan.fullness.push({ kind: 'fill', step: { rack: { track: t.id, device: 'degrade', amount: a } } }));
    plan.fullness.push({ kind: 'fill', step: { unrack: { track: t.id, device: 'degrade' } } });
  }
  // settings that move toward their written value (not those a clip sets itself, nor the pinned ones)
  const pinned = t.pinned || [], neutralSet = {}, knobs = [];
  for (const key of COLOUR_KEYS) {
    if (!(SETTING_FIELDS[t.type] || []).includes(key) || clipKeys.has(key) || pinned.includes(key)) continue;
    if (d < 3 && key === 'gain') continue;
    if (d === 1 && key !== 'cutoff') continue;
    if (d === 0 && !(rules.natural && key === 'cutoff')) continue;
    const v = (t.settings || {})[key], nv = neutral(key, v);
    if (nv === null) continue;
    neutralSet[key] = nv;
    const m = d < 3 ? 1 : key === 'cutoff' ? rng.int(1, 3) : key === 'gain' ? 1 : rng.int(1, 2);
    const vals = moves(key, nv, v, m);
    // a try: past the written value, then back to it
    if (rules.natural && key !== 'gain' && !(key === 'cutoff' && v >= 12000) && rng.chance(rules.trials ?? 0.3)) vals.splice(vals.length - 1, 0, key === 'cutoff' ? Math.round(v * 1.4 / 10) * 10 : r3(v * 1.3));
    const lane = vals.map(x => ({ kind: key, step: { set: { track: t.id, [key]: x } } }));
    // natural growth: a knob that moves arrives first (its function was hidden)
    if (rules.natural && HIDES[key] && HIDE_TYPES.includes(t.type)) lane.unshift({ kind: 'reveal', device: key, step: { reveal: { track: t.id, keys: key } } });
    knobs.push(lane);
  }
  // natural growth: the functions the track writes are hidden at bar 0; those without a knob arrive on their own
  if (rules.natural && HIDE_TYPES.includes(t.type)) {
    const set = { ...(t.settings || {}) }, moving = knobs.map(l => l[0] && l[0].step.reveal && l[0].step.reveal.keys).filter(Boolean);
    // with less detail fewer functions arrive on their own (a long list of reveals would leave no room for pauses)
    const may = d >= 2 ? Object.keys(HIDES) : d === 1 ? ['cutoff', 'drive', 'room', 'delay'] : ['cutoff'];
    const hidden = Object.keys(HIDES).filter(k => (HIDES[k](set, t.type) || moving.includes(k)) && (may.includes(k) || moving.includes(k)));
    if (hidden.length) {
      plan.setup.push({ hide: { track: t.id, keys: hidden } });
      for (const k of hidden) if (!knobs.some(l => l[0] && l[0].step.reveal && l[0].step.reveal.keys === k)) knobs.push([{ kind: 'reveal', device: k, step: { reveal: { track: t.id, keys: k } } }]);
    }
  }
  if (Object.keys(neutralSet).length) plan.setup.push({ set: { track: t.id, ...neutralSet } });
  // rack devices come in one at a time, in their written order (only a tail of the chain, so the order stays)
  const grow = d >= 2 ? rack.length : d === 1 ? Math.min(1, rack.length) : 0;
  const devs = rack.slice(rack.length - grow);
  devs.forEach(dev => plan.setup.unshift({ unrack: { track: t.id, device: dev.device } }));
  const devUnits = devs.map(dev => ({ kind: 'device', device: dev.device, step: { rack: { track: t.id, ...clone(dev) } } }));
  // colour queue: knobs and devices interleaved, each keeping its own order
  const lanes = [...knobs, ...(devUnits.length ? [devUnits] : [])];
  while (lanes.some(l => l.length)) { const live = lanes.filter(l => l.length); plan.colour.push(rng.pick(live).shift()); }
  return plan;
}

// The growth from silence to the destination for a set of tracks: the anchor enters first, the others enter one by
// one while the ones in play fill up their patterns, then the colour comes in. Same as tearing the destination down
// (colour first, then pattern fullness, then the later tracks, the anchor last) and playing it backwards.
// → [{ kind, track, step }], the entries are { kind: 'enter', step: { add } }
export function crescendoPath(plans, rng) {
  const queue = plans.map(p => ({ ...p, fullness: p.fullness.slice(), colour: p.colour.slice() }));
  const total = queue.reduce((a, p) => a + 1 + p.fullness.length + p.colour.length, 0);
  const out = [], inPlay = [];
  let sinceEnter = 0;
  const enter = () => { const p = queue[inPlay.length]; inPlay.push(p); sinceEnter = 0; out.push({ kind: 'enter', track: p.id, type: p.type, step: { add: p.id } }); };
  enter();
  while (out.length < total) {
    const progress = out.length / total, cands = [], weights = [];
    if (inPlay.length < queue.length && (sinceEnter >= 1 || inPlay[inPlay.length - 1].fullness.length === 0)) { cands.push('enter'); weights.push(1.3); }
    for (const p of inPlay) {
      if (p.fullness.length) { cands.push([p, 'fullness']); weights.push(1.6 * (1 - progress) + 0.3); }
      if (p.colour.length) { cands.push([p, 'colour']); weights.push((0.25 + 1.4 * progress) * (p.fullness.length ? 0.35 : 1)); }
    }
    if (!cands.length) { enter(); continue; }
    const c = rng.weighted(cands, weights);
    if (c === 'enter') { enter(); continue; }
    const u = c[0][c[1]].shift();
    out.push({ ...u, track: c[0].id, type: c[0].type });
    sinceEnter++;
  }
  return out;
}

// ---------- narration ----------
// short comments per kind of step, our own wording: [en, it]
const P = {
  enter: {
    drums: [['start with the kick', 'partiamo dalla cassa'], ['drums in', 'entra la batteria']],
    bass: [['need bass', 'serve il basso'], ['here comes the bass', 'arriva il basso'], ['bass in', 'dentro il basso']],
    pad: [['some warmth', "un po' di calore"], ['pad underneath', 'un pad sotto']],
    guitar: [['guitars!', 'chitarre!'], ['add the guitar', 'aggiungo la chitarra']],
    arp: [['now the arp', "ora l'arpeggio"], ['arp in', "dentro l'arpeggio"]],
    hook: [['melody!', 'melodia!'], ['a little tune', 'una melodia']],
    texture: [['some dirt', "un po' di sporco"], ['texture in', 'entra la texture']],
    riser: [['here it comes', 'sta arrivando']], code: [['something odd', 'qualcosa di strano']],
    any: [['new sound', 'suono nuovo']],
  },
  grow: {
    drums: [['more hats', 'più charleston'], ['fill the drums', 'riempio la batteria'], ['busier beat', 'ritmo più fitto']],
    bass: [['more notes', 'più note'], ['bass line grows', 'il basso cresce']],
    any: [['more notes', 'più note'], ['let it grow', 'facciamolo crescere'], ['a bit busier', 'un po\' più pieno']],
  },
  fill: { any: [['fill the gaps', 'riempio i buchi'], ['fewer gaps', 'meno buchi'], ['play it all', 'suona tutto']] },
  cutoff: { any: [['open the filter', 'apro il filtro'], ['brighter', 'più chiaro'], ['open it up', 'apriamo']] },
  drive: { any: [['more drive', 'più spinta'], ['dirty it up', 'sporchiamolo']] },
  grit: { any: [['more grit', 'più grana']] },
  room: { any: [['more room', 'più spazio'], ['some reverb', "un po' di riverbero"]] },
  delay: { any: [['add some delay', "un po' di delay"], ['echo it', 'facciamo eco']] },
  gain: { any: [['louder', 'più forte'], ['turn it up', 'alziamo']] },
  device: {
    echo: [['add an echo', "aggiungo un'eco"]], delay: [['add some delay', "un po' di delay"]], reverb: [['some reverb', "un po' di riverbero"]],
    distort: [['distort it', 'distorciamo']], shape: [['saturate it', 'saturiamo']], crush: [['crush it', 'sbricioliamolo']], coarse: [['lo-fi it', 'più lo-fi']],
    phaser: [['add a phaser', 'aggiungo un phaser']], tremolo: [['make it pulse', 'facciamolo pulsare']], pan: [['move it around', 'muoviamolo']],
    off: [['double it', 'raddoppiamo']], ply: [['repeat the notes', 'ripeto le note']], jux: [['wider', 'più largo']],
    any: [['add some colour', "un po' di colore"], ['one more effect', 'un effetto in più']],
  },
  // natural growth: a function arrives in the code
  reveal: {
    cutoff: [['add a filter', 'mettiamo un filtro'], ['filter it', 'filtriamolo']], reso: [['more resonance', 'più risonanza'], ['make it squelch', 'facciamolo fischiare']],
    drive: [['some drive', "un po' di spinta"], ['distort it', 'distorciamo']], grit: [['some grit', "un po' di grana"]],
    room: [['some room', "un po' di spazio"], ['add reverb', 'aggiungo riverbero']], delay: [['add a delay', 'aggiungo un delay'], ['echo it', 'facciamo eco']],
    env: [['shape the notes', 'diamo forma alle note'], ['shorter notes', 'note più corte']], any: [['one more function', 'una funzione in più']],
  },
  break: { any: [['drop the drums', 'togliamo la batteria'], ['break', 'pausa']] },
  back: { any: [['bring the kick back in', 'torna la cassa'], ['and back', 'e si riparte']] },
  harmony: { any: [['now the chords', 'ora gli accordi'], ['chords move', 'gli accordi si muovono']] },
  strip: { any: [['strip it back', 'togliamo qualcosa'], ['less', 'meno'], ['winding down', 'chiudiamo']] },
  last: { any: [["that's it", 'fine'], ['and out', 'e via']] },
  // like a live coder (live-coder-growth): a block copied, a function commented out and back, notes rewritten
  clone: { any: [['copy that line', 'copio quella riga'], ['same line, new sound', 'stessa riga, suono nuovo']] },
  comment: { any: [['take it out', 'lo tolgo'], ['without it', 'senza']] },
  uncomment: { any: [['and back in', 'e lo rimetto'], ['bring it back', 'rimettiamolo']] },
  rewrite: { any: [['new notes', 'note nuove'], ['rewrite the line', 'riscrivo la linea']] },
  settle: { any: [['there it is', 'eccolo']] },
};
export const CRESCENDO_PHRASES = Object.values(P).flatMap(g => Object.values(g).flat()).map(([en, it]) => ({ en, it }));
function phrase(kind, type, device, recent, rng) {
  const g = P[kind] || P.device, list = (kind === 'device' || kind === 'reveal' ? g[device] : g[type]) || g.any || P.enter.any;
  const fresh = list.filter(([en]) => !recent.includes(en)), [en, it] = rng.pick(fresh.length ? fresh : list);
  recent.push(en); if (recent.length > 8) recent.shift();
  return { en, it };
}

// ---------- the song ----------
const gapOf = (rng, narrated) => (narrated ? rng.weighted([1, 2], [2, 1]) : rng.weighted([1, 2, 3, 4], [1, 3, 2, 2]));
const KEY_STEPS = ['enter', 'break', 'back', 'harmony', 'strip-first', 'last'];

// song + options → the song with a growth span, generated patterns and "build". The seed defaults to the song id.
// Songs with nothing to grow come back without steps.
// rules: {} (Crescendo) or { natural: true, trials } (natural-growth: hidden functions, sparse steps, listening pauses)
export function crescendoSong(song, { seed, narrated = false, rules = {} } = {}) {
  const rng = stream(String(seed ?? song.id ?? 'song'), STREAM);
  const n = normalizeSong(song), W = n.total, secs = n.sections;
  // a song shorter than 24 bars has no room for slow growth: it grows with the Crescendo rules
  if (rules.natural && W < 24) rules = {};
  const over = (c, s) => c.start < s.start + s.bars && c.start + c.bars > s.start;
  const plays = n.tracks.filter(t => !t.mute && t.type !== 'voice' && t.clips.length);
  if (!plays.length || !W) return { ...clone(song), build: [] };
  // reference section: the first one where the most tracks play; its tracks are the destination of the growth
  const counts = secs.map(s => plays.filter(t => t.clips.some(c => over(c, s))).length);
  const R = secs[counts.indexOf(Math.max(...counts))];
  // ideas grow and thin on the bars of the reference section, with the song's shared progressions
  const ictx = { N: meterSteps(R.meter), shared: song.shared || {} };
  const dest = plays.filter(t => t.clips.some(c => over(c, R))), late = plays.filter(t => !dest.includes(t));
  const rank = t => { const i = ORDER.indexOf(t.type); return i < 0 ? ORDER.length : i; };
  dest.sort((a, b) => rank(a) - rank(b) || plays.indexOf(a) - plays.indexOf(b));
  // a little variety in who comes in after the anchor
  for (let i = 1; i < dest.length - 1; i++) if (rng.chance(0.3)) [dest[i], dest[i + 1]] = [dest[i + 1], dest[i]];
  const clipR = t => t.clips.find(c => over(c, R));
  const clipKeys = t => new Set(t.clips.flatMap(c => Object.keys(c.set || {})));
  // growth budget: up to twice the written length for short songs, one and a half otherwise (room for the ending)
  // (natural growth is slower: at most the written length, so a song does not double)
  // (like a live coder, free duration: as long as the moves need, within twice the written length)
  const cap = rules.coder && rules.free ? 2 * W - 4 : rules.natural ? (W < 48 ? Math.round(1.5 * W) : W) : W <= 20 ? 2 * W : Math.round(1.5 * W);
  // detail: the most that fits within three times the written length, with room between the steps
  let d = 3, plans, path, coder = null;
  for (; d >= 0; d--) {
    const prng = rng.fork(`plan-${d}`);
    plans = dest.map(t => trackPlan(t, d, prng, clipKeys(t), rules, ictx));
    // like a live coder (live-coder-growth): waypoints and small moves between them
    if (rules.coder) { coder = coderPath(dest, plans, prng.fork('coder'), { detours: rules.detours, chooser: rules.chooser }); path = coder.path; }
    else path = crescendoPath(plans, prng.fork('path'));
    if (path.length * (rules.natural ? 3 : 1.5) + 4 <= cap || d === 0) break;
  }

  // harmony: the first tracks play over one held chord, one step brings in the progression
  // (only when the progression starts on its tonic: the "drone" progression is that chord)
  const hold = R.chords !== 'drone' && PROGS[R.chords] && PROGS[R.chords][1][0] === 'Am' && path.length >= 6;
  const harmonyAt = hold ? Math.max(2, Math.round(path.length * rng.range(0.35, 0.55))) : -1;
  if (hold) path[harmonyAt] = { ...path[harmonyAt], harmony: true };
  // breaks: the drums (or the anchor) stop for a few bars and come back, once or twice
  const brk = dest.find(t => t.type === 'drums');
  const breaks = [];
  if (brk && dest.length >= 2 && path.length >= 12 && !rules.coder) {
    const k = path.length >= 24 && rng.chance(0.5) ? 2 : 1;
    for (let b = 0; b < k; b++) breaks.push(Math.round(path.length * (k === 1 ? rng.range(0.55, 0.8) : b ? rng.range(0.75, 0.88) : rng.range(0.45, 0.6))));
  }
  const seq = [];
  path.forEach((u, i) => {
    seq.push(u);
    if (breaks.includes(i) && i > path.findIndex(x => x.kind === 'enter' && x.track === brk.id) + 1) {
      seq.push({ kind: 'break', track: brk.id, type: brk.type, step: { remove: brk.id }, gap: rng.int(2, 4) });
      seq.push({ kind: 'back', track: brk.id, type: brk.type, step: { add: brk.id } });
    }
  });
  // bars: one step every 1 to 4 bars (1 to 2 fully narrated), squeezed when the song would get too long
  // natural growth: 4 to 8 bars apart in the first part, 2 to 6 later, and a listening pause of 4 to 8 bars after a
  // track comes in, the progression arrives or the drums come back
  // (like a live coder: a pause at each waypoint too)
  const natGap = i => (i < seq.length * 0.4 ? rng.int(4, 8) : rng.int(2, 6)) + (['enter', 'back'].includes(seq[i - 1].kind) || seq[i - 1].harmony || seq[i - 1].waypoint ? rng.int(4, 8) : 0);
  const gaps = seq.map((u, i) => (i === 0 ? 0 : seq[i - 1].gap || (rules.natural && !narrated ? natGap(i) : gapOf(rng, narrated))));
  const room = Math.max(seq.length, cap - 4);
  // squeezed from the largest gaps; natural growth keeps its listening pauses (at least 4 bars) as long as it can
  const pause = seq.map((u, i) => rules.natural && i > 0 && (['enter', 'back'].includes(seq[i - 1].kind) || seq[i - 1].harmony || seq[i - 1].waypoint));
  for (let sum = gaps.reduce((a, b) => a + b, 0); sum > room;) {
    let i = -1;
    for (let k = 1; k < gaps.length; k++) if (gaps[k] > (pause[k] ? 4 : 1) && (i < 0 || gaps[k] - (pause[k] ? 4 : 0) > gaps[i] - (pause[i] ? 4 : 0))) i = k;
    if (i < 0) { i = gaps.indexOf(Math.max(...gaps)); if (gaps[i] <= 1) break; }
    gaps[i]--; sum--;
  }
  let bar = 0;
  const growth = seq.map((u, i) => ({ ...u, at: (bar += gaps[i]) }));
  const lastAt = growth[growth.length - 1].at, tail = gapOf(rng, narrated);
  let G = lastAt + tail;
  if (Math.ceil(G / 4) * 4 <= cap) G = Math.ceil(G / 4) * 4;
  const harmonyBar = hold ? growth.find(u => u.harmony).at : 0;
  // tracks that enter later in the song: minimal where their first clip starts, then they grow over the next steps,
  // with less detail (or none) when the song ends too soon. A bar holds the steps of one track only.
  const owner = new Map(growth.map(u => [u.at, u.track])), latePlans = [], lateSteps = [];
  for (const t of late) {
    for (let ld = Math.min(d, 1); ld >= -1; ld--) {
      const p = ld < 0 ? { id: t.id, type: t.type, setup: [], fullness: [], colour: [], patterns: {} } : trackPlan(t, ld, rng.fork(`late-${t.id}-${ld}`), clipKeys(t), rules, ictx);
      const taken = new Map(), free = at => { while (owner.has(at) || taken.has(at)) at++; taken.set(at, t.id); return at; };
      let at = free(t.clips[0].start + G);
      const mine = [{ at, kind: 'enter', type: t.type, step: { add: t.id } }];
      for (const u of [...p.fullness, ...p.colour]) { at = free(at + rng.int(1, 3)); mine.push({ ...u, at, type: t.type }); }
      if (at < G + W - 1 || ld < 0) { latePlans.push(p); lateSteps.push(...mine); taken.forEach((v, k) => owner.set(k, v)); break; }
    }
  }

  // ---------- the new song ----------
  const out = clone(song);
  delete out.build;
  const base = { bpm: R.bpm, key: R.key, chords: R.chords, meter: R.meter };
  if (R.swing) base.swing = R.swing;
  const grow = hold
    ? [{ name: 'Crescendo', bars: harmonyBar, ...base, chords: 'drone' }, { name: 'Crescendo 2', bars: G - harmonyBar, ...base }]
    : [{ name: 'Crescendo', bars: G, ...base }];
  out.sections = [...grow, ...clone(song.sections)];
  // clips by bar: the written ones shifted after the growth span, the growth clip of every destination track
  out.tracks = out.tracks.map(tr => {
    const nt = n.tracks.find(x => x.id === tr.id);
    const clips = nt.clips.map(c => { const o = { start: c.start + G, bars: c.bars, pattern: c.pattern }; if (c.set) o.set = clone(c.set); return o; });
    const t = { ...tr, clips };
    if (dest.includes(nt)) { const c = clipR(nt), g = { start: 0, bars: G, pattern: c.pattern }; if (c.set) g.set = clone(c.set); t.clips = [g, ...clips]; }
    const plan = plans.find(p => p.id === tr.id) || latePlans.find(p => p.id === tr.id);
    if (plan) t.patterns = { ...(tr.patterns || {}), ...plan.patterns };
    return t;
  });

  // ---------- steps ----------
  const build = [];
  // bar 0: every growing track gets its minimal state while silent, then the anchor comes in
  for (const p of [...plans, ...latePlans]) for (const s of p.setup) build.push({ at: 0, ...s });
  const recent = [], say = (u, first) => {
    const keyStep = KEY_STEPS.includes(u.kind) || u.harmony || first;
    if (!narrated && !keyStep && !rng.chance(0.3)) return undefined;
    return u.harmony ? phrase('harmony', u.type, null, recent, rng) : phrase(u.clone ? 'clone' : u.kind, u.type, u.device, recent, rng);
  };
  growth.forEach((u, i) => { const s = { at: u.at, ...u.step }, t = say(u, i === 0); if (t) s.say = t; build.push(s); });
  lateSteps.forEach(u => { const st = { at: u.at, ...u.step }, x = u.kind === 'enter' ? phrase('enter', u.type, null, recent, rng) : say(u, false); if (x) st.say = x; build.push(st); });
  const lastGrowth = Math.max(lastAt, ...lateSteps.map(u => u.at));
  // ---------- ending ----------
  const end = G + W, LS = out.sections[out.sections.length - 1], lsStart = end - LS.bars;
  const active = out.tracks.filter(t => !t.mute && t.type !== 'voice' && t.clips.some(c => c.start < end && c.start + c.bars > lsStart));
  const quiet = active.length <= 2 || /outro|coda|fine|end/i.test(LS.name || '');
  let ending = rng.weighted(ENDINGS, [2, 1.5, quiet ? 2 : 0.8]);
  const anchor = active.slice().sort((a, b) => rank(a) - rank(b))[0];
  const others = active.filter(t => t !== anchor).sort((a, b) => rank(b) - rank(a));
  const steps = [];
  if (ending === 'strip' && active.length) {
    others.forEach(t => steps.push({ remove: t.id }));
  } else if (ending === 'blocks' && active.length >= 2) {
    const half = Math.ceil(others.length / 2);
    [others.slice(0, half), others.slice(half)].filter(g => g.length).forEach(g => steps.push({ remove: g.length === 1 ? g[0].id : g.map(x => x.id) }));
  }
  // the anchor plays alone for the last bars, then the song ends
  const gapsE = steps.map(() => (ending === 'strip' ? rng.int(1, 2) : rng.int(2, 4)));
  const E = gapsE.reduce((a, b) => a + b, 0) + rng.int(1, 2);
  if (!steps.length || G + W + E > 3 * W || lastGrowth >= end) ending = 'short';
  if (ending !== 'short') {
    out.sections.push({ name: ending === 'strip' ? 'Strip' : 'Stop', bars: E, bpm: LS.bpm ?? R.bpm, key: LS.key ?? R.key, chords: LS.chords ?? R.chords, meter: LS.meter ?? R.meter });
    for (const t of active) {
      const last = t.clips.filter(c => c.start < end).pop(), c = { start: end, bars: E, pattern: String(last.pattern).replace(/~\d+$/, '') };
      if (last.set) c.set = clone(last.set);
      t.clips.push(c);
    }
    let at = end - 1;
    steps.forEach((s, i) => {
      at += gapsE[i];
      const kind = i === steps.length - 1 ? 'last' : i === 0 ? 'strip-first' : 'strip';
      const x = narrated || kind !== 'strip' || rng.chance(0.4) ? phrase(kind === 'last' ? 'last' : 'strip', null, null, recent, rng) : null;
      build.push({ at, ...s, ...(x ? { say: x } : {}) });
    });
  }
  out.build = build.map((s, i) => ({ s, i })).sort((a, b) => a.s.at - b.s.at || a.i - b.i).map(x => x.s);
  out.buildStyle = 'crescendo';
  // facts for checks and the UI: where the growth ends and which ending was drawn
  out.crescendo = { version: CRESCENDO_VERSION, growth: G, sections: grow.length, grown: Math.max(lastGrowth, lastAt), ending, detail: d, written: W, narrated, natural: !!rules.natural, ...(coder ? { coder: true, waypoints: growth.filter(u => u.waypoint).map(u => u.at), detours: growth.filter(u => u.detour).length } : {}) };
  return out;
}

// The normal version of a song grown like a live coder (live-coder-growth): the waypoints of its natural growth come
// first, one section of `bars` each (the patterns and settings of that moment; functions not shown yet play at their
// neutral value), then the song as written. song.normal === 'waypoints' asks for it.
const NEUTRAL = { cutoff: 20000, reso: 0, drive: 0, grit: 0, room: 0, delay: 0 };
export function waypointSong(song, { seed, bars = 8 } = {}) {
  const c = crescendoSong(song, { seed, rules: { natural: true, coder: true, free: true } });
  if (!c.crescendo || !c.crescendo.coder) return song;
  const n = normalizeSong(song), base = n.sections[0], wps = c.crescendo.waypoints.slice(0, -1);
  const out = clone(song);
  delete out.normal;
  const secs = wps.map((_, i) => ({ name: `${i + 1}`, bars, bpm: base.bpm, key: base.key, chords: i < wps.length / 2 && base.chords !== 'drone' ? 'drone' : base.chords, meter: base.meter }));
  out.sections = [...secs, ...clone(song.sections)];
  const shift = wps.length * bars;
  out.tracks = out.tracks.map(tr => {
    const nt = n.tracks.find(x => x.id === tr.id), ct = c.tracks.find(x => x.id === tr.id);
    const clips = nt.clips.map(cl => { const o = { start: cl.start + shift, bars: cl.bars, pattern: cl.pattern }; if (cl.set) o.set = clone(cl.set); return o; });
    const own = [];
    wps.forEach((at, i) => {
      const st = stateAt(c, at).song.tracks.find(x => x.id === tr.id);
      if (!st || st.mute || st.type === 'voice' || !st.clips.length) return;
      const set = { ...(st.settings || {}) };
      for (const k of [...(st.hidden || []), ...(st.commented || [])]) if (k in NEUTRAL) set[k] = NEUTRAL[k];
      const fields = SETTING_FIELDS[st.type] || [];
      own.push({ start: i * bars, bars, pattern: st.clips[0].pattern, set: Object.fromEntries(Object.entries(set).filter(([k]) => fields.includes(k))) });
    });
    return { ...tr, clips: [...own, ...clips], patterns: { ...(tr.patterns || {}), ...((ct && ct.patterns) || {}) } };
  });
  return out;
}
