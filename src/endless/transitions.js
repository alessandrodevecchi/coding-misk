// Transitions between songs (#23, docs/ENDLESS.md "Transitions"): the director plans one per pair of songs,
// the join writes it on the shared timeline as sections, extra tracks and build steps, so it compiles,
// opens in Compose and replays the same from a seed.
//   mix        the next song's intro plays under the last bars, the current song fades and filters out
//   morph      the current song's tracks leave one at a time while the next song builds in
//   echo       the current song ends into delay and reverb while the next one starts
//   break      the last phrase drops to pad and texture with a riser, the next song starts with a crash
//   interlude  a near-silence of a few phrases, sparse sounds and a spoken comment, between the two songs
//   cut        a plain end and start
import { TRANSITION_KINDS } from './artist.js';
import { pickWeighted } from './artist.js';
import { stateAt } from '../song/build.js';

export { TRANSITION_KINDS };
export const MAX_RAMP = 12;
export const OVERLAP_KINDS = ['mix', 'morph', 'echo'];
export const TRANSITION_DEFAULTS = { mix: 3, cut: 2, morph: 1, break: 1, echo: 1, interlude: 0.5 };
const ECHO_BARS = 2;

// spoken comments of an interlude, in English and Italian
export const INTERLUDE_SAY = [
  ['breathe', 'respira'], ['hold on', 'aspetta'], ['somewhere else now', 'ora da un\'altra parte'],
  ['listen to the room', 'ascolta la stanza'], ['night is long', 'la notte è lunga'], ['still here', 'ancora qui'],
];

const barsOf = song => song.sections.reduce((a, s) => a + s.bars, 0);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// How many bars the next song starts before the current one ends, and how many bars are added after it.
export const overlapOf = t => (t && !t.cut && OVERLAP_KINDS.includes(t.kind) ? t.bars : 0);
export const extraOf = t => (t && !t.cut && t.kind === 'interlude' ? t.bars : 0);

// Plans the transition from song a to song b (session entries: bpm, meter, bars, phrase).
// opts: transition ('artist' or a kind), transitionWeights, transitionBars, chaos. rng: the "transition" stream.
export function planTransition(a, b, opts, rng) {
  const gap = Math.abs(a.bpm - b.bpm), sameMeter = a.meter === b.meter, phrase = a.phrase || 8;
  const canOverlap = k => !['mix', 'morph'].includes(k) || (gap <= MAX_RAMP && sameMeter);
  const forced = opts.transition && opts.transition !== 'artist' && TRANSITION_KINDS.includes(opts.transition) ? opts.transition : null;
  let kind;
  if (forced) kind = canOverlap(forced) ? forced : 'cut';
  else {
    const base = { ...TRANSITION_DEFAULTS, ...(opts.transitionWeights && Object.values(opts.transitionWeights).some(w => w > 0) ? Object.fromEntries(TRANSITION_KINDS.map(k => [k, 0])) : {}), ...(opts.transitionWeights || {}) };
    // chaos lifts the kinds the artist likes less
    const mean = TRANSITION_KINDS.reduce((s, k) => s + (base[k] || 0), 0) / TRANSITION_KINDS.length;
    const weights = Object.fromEntries(TRANSITION_KINDS.map(k => [k, canOverlap(k) ? (base[k] || 0) + (opts.chaos || 0) * mean : 0]));
    kind = pickWeighted(rng, weights) || 'cut';
  }
  const range = opts.transitionBars || [8, 16];
  const phrases = n => clamp(Math.round(n / phrase), 1, 8) * phrase;
  const drawn = phrases(rng.range(range[0], range[1] + 0.999));
  const limit = Math.max(phrase, Math.floor(Math.min(a.bars, b.bars) / 2 / phrase) * phrase);
  const bars = {
    mix: clamp(drawn, phrase, Math.min(2 * phrase, limit)),
    morph: clamp(drawn, 2 * phrase, Math.min(4 * phrase, limit)),
    echo: ECHO_BARS,
    break: phrase,
    interlude: clamp(drawn, phrase, 4 * phrase),
    cut: 0,
  }[kind];
  const t = { kind, bars };
  if (['mix', 'morph'].includes(kind) && gap > 0) t.ramp = [a.bpm, b.bpm];
  if (kind === 'interlude') t.say = rng.pick(INTERLUDE_SAY);
  return t;
}

// Bars where each item starts on the shared timeline, from the first item's start.
// items: [{ start?, bars, transition }] (transition: from this item to the next; cut: true when skipped).
export function layout(items, first = items.length ? items[0].start || 0 : 0) {
  const out = [];
  let at = first;
  items.forEach((x, i) => {
    out.push(at);
    at += x.bars + extraOf(x.transition) - (i + 1 < items.length ? overlapOf(x.transition) : 0);
  });
  return out;
}

// --- writing a transition on the timeline ---

const MELODIC_ORDER = ['texture', 'hook', 'arp', 'guitar', 'pad', 'bass', 'drums'];
const FILTERED = ['bass', 'guitar', 'arp', 'hook', 'pad', 'drums'];

// tracks of a song that play at a bar (not muted after the steps up to it), without the voice and code tracks
function playingAt(song, bar) {
  const { song: st } = stateAt(song, bar);
  return st.tracks.filter(t => !t.mute && !['voice', 'code'].includes(t.type));
}

// The material a transition adds to song a (steps and tracks in a's own bars, ids not prefixed),
// the sections of the overlap or interlude, and changes to b's first section.
// a, b: the two songs; t: the transition. Returns { steps, tracks, tail, crash }.
//   tail: sections that replace a's last `overlap` bars (overlap kinds) or follow a (interlude)
export function transitionParts(a, b, t) {
  const A = barsOf(a), out = { steps: [], tracks: [], tail: [], crash: false };
  if (!t || t.cut || t.kind === 'cut' || !t.bars) return out;
  const last = a.sections[a.sections.length - 1], bFirst = b.sections[0];
  const from = A - (OVERLAP_KINDS.includes(t.kind) ? t.bars : t.kind === 'break' ? t.bars : 0);
  const on = playingAt(a, Math.max(0, from));
  const setting = (tr, k) => (tr.settings || {})[k];

  if (t.kind === 'mix') {
    // two halves: a's key, then b's; the tempo ramps across both
    const half = t.bars / 2, mid = t.ramp ? Math.round((t.ramp[0] + t.ramp[1]) / 2) : null;
    out.tail.push({ ...last, name: 'Mix', bars: half, ...(t.ramp ? { bpm: t.ramp[0], bpmEnd: mid } : {}) });
    out.tail.push({ ...last, name: 'Mix 2', bars: half, key: bFirst.key, chords: bFirst.chords, ...(t.ramp ? { bpm: mid, bpmEnd: t.ramp[1] } : { bpm: bFirst.bpm }) });
    // a fades: gain and cutoff go down every two bars; its drums leave at three quarters
    const n = Math.max(1, Math.floor(t.bars / 2));
    for (let k = 1; k <= n; k++) {
      const at = from + 2 * k - 2, f = 1 - k / (n + 1);
      for (const tr of on) {
        const set = { track: tr.id };
        if (setting(tr, 'gain') !== undefined) set.gain = Math.round(setting(tr, 'gain') * f * 100) / 100;
        if (FILTERED.includes(tr.type) && setting(tr, 'cutoff')) set.cutoff = Math.max(200, Math.round(setting(tr, 'cutoff') * f * f));
        if (Object.keys(set).length > 1) out.steps.push({ at, set });
      }
    }
    const drums = on.filter(tr => tr.type === 'drums').map(tr => tr.id);
    if (drums.length) out.steps.push({ at: from + Math.round(t.bars * 3 / 4), remove: drums });
  } else if (t.kind === 'morph') {
    out.tail.push({ ...last, name: 'Morph', bars: t.bars / 2, ...(t.ramp ? { bpm: t.ramp[0], bpmEnd: Math.round((t.ramp[0] + t.ramp[1]) / 2) } : {}) });
    out.tail.push({ ...last, name: 'Morph 2', bars: t.bars / 2, key: bFirst.key, chords: bFirst.chords, ...(t.ramp ? { bpm: Math.round((t.ramp[0] + t.ramp[1]) / 2), bpmEnd: t.ramp[1] } : { bpm: bFirst.bpm }) });
    // a's tracks leave one at a time, drums last, spread over the morph
    const order = on.slice().sort((x, y) => MELODIC_ORDER.indexOf(x.type) - MELODIC_ORDER.indexOf(y.type));
    order.forEach((tr, k) => out.steps.push({ at: from + Math.max(1, Math.round((k + 1) * t.bars / (order.length + 1))), remove: tr.id }));
  } else if (t.kind === 'echo') {
    out.tail.push({ ...last, name: 'Echo', bars: t.bars, bpm: bFirst.bpm, key: bFirst.key, chords: bFirst.chords });
    for (const tr of on) {
      out.steps.push({ at: from, rack: { track: tr.id, device: 'delay', amount: 0.6, time: 0.375, feedback: 0.6 } });
      out.steps.push({ at: from, rack: { track: tr.id, device: 'reverb', amount: 0.7, size: 0.9 } });
    }
    if (on.length) out.steps.push({ at: A - 1, remove: on.map(tr => tr.id) });
  } else if (t.kind === 'break') {
    // the last phrase keeps pad and texture, a riser climbs, the pad opens up; b starts with a crash
    const keep = on.filter(tr => ['pad', 'texture'].includes(tr.type)), drop = on.filter(tr => !keep.includes(tr));
    if (drop.length) out.steps.push({ at: from, remove: drop.map(tr => tr.id) });
    out.tracks.push({ id: 'tx-riser', name: 'Riser', type: 'riser', settings: { gain: 0.3, bars: String(t.bars), dir: 'up' }, patterns: { A: {} }, clips: [{ start: from, bars: t.bars, pattern: 'A' }] });
    out.steps.push({ at: from, add: 'tx-riser' });
    for (const tr of keep.filter(x => x.type === 'pad' && setting(x, 'cutoff'))) {
      const c = setting(tr, 'cutoff');
      for (let k = 0; k < t.bars; k += 2) out.steps.push({ at: from + k, set: { track: tr.id, cutoff: Math.round(c * (0.4 + 1.2 * k / t.bars)) } });
    }
    out.crash = true;
  } else if (t.kind === 'interlude') {
    // a near-silence after a: at most two quiet tracks of a, a sparse click, a spoken comment
    out.tail.push({ ...last, name: 'Interlude', bars: t.bars, bpm: bFirst.bpm });
    const quiet = on.filter(tr => ['texture', 'pad'].includes(tr.type)).slice(0, 2);
    for (const tr of quiet) {
      const clip = (tr.clips || []).find(c => c.start === undefined || (c.start <= A && c.start + c.bars >= A - 1)) || tr.clips[0] || {};
      out.tracks.push({ ...tr, id: `il-${tr.id}`, name: `Interlude ${tr.name || tr.id}`, settings: { ...tr.settings, gain: Math.round((setting(tr, 'gain') || 0.4) * 0.5 * 100) / 100 }, rack: [{ device: 'reverb', amount: 0.6, size: 0.9 }], clips: [{ start: A, bars: t.bars, pattern: clip.pattern || Object.keys(tr.patterns)[0] }] });
    }
    const kit = (on.find(tr => tr.type === 'drums') || {}).settings;
    out.tracks.push({ id: 'il-tick', name: 'Interlude click', type: 'drums', settings: { kit: (kit && kit.kit) || 'RolandTR909', gain: 0.18, cutoff: 6000 }, rack: [{ device: 'delay', amount: 0.5, time: 0.375, feedback: 0.55 }], patterns: { A: { rows: { rd: '..........x.....' } } }, clips: [{ start: A, bars: t.bars, pattern: 'A' }] });
    if (t.say) out.steps.push({ at: A + 2, say: { en: t.say[0], it: t.say[1] } });
  }
  return out;
}

// --- playlists: saved songs ---

// A song with every clip placed by bars ("section" clips become start and bars), so it can be joined.
export function absoluteClips(song) {
  const names = song.sections.map(s => s.name), starts = [];
  let at = 0;
  for (const s of song.sections) { starts.push(at); at += s.bars; }
  const where = ref => (typeof ref === 'number' ? ref : names.indexOf(ref));
  return {
    ...song,
    tracks: song.tracks.map(tr => ({
      ...tr,
      clips: (tr.clips || []).flatMap(c => {
        if (c.start !== undefined) return [c];
        const i = where(c.section);
        if (i < 0) return [];
        const { section, ...rest } = c;
        return [{ ...rest, start: starts[i], bars: c.bars ?? song.sections[i].bars }];
      }),
    })),
  };
}

// The mix between two saved songs in a playlist: 8 bars (less for short songs), a tempo ramp within
// the limit, a cut beyond it or across a change of meter.
export function playlistTransition(a, b, bars = 8) {
  const la = a.sections[a.sections.length - 1], fb = b.sections[0];
  const from = la.bpmEnd ?? la.bpm ?? 120, to = fb.bpm ?? 120;
  const len = Math.min(bars, Math.floor(Math.min(barsOf(a), barsOf(b)) / 2 / 2) * 2);
  if (Math.abs(from - to) > MAX_RAMP || (la.meter || '4/4') !== (fb.meter || '4/4') || len < 2) return { kind: 'cut', bars: 0 };
  return { kind: 'mix', bars: len, ...(from !== to ? { ramp: [from, to] } : {}) };
}
