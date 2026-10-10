// Song soul (#46): the data the soul views draw, from a song alone (Compose, Songs, playlists, the radio's
// lead song) or from a radio song with its plan (the director's targets and curves). Pure: same song, same soul.
import { songCurves, densityMax } from '../endless/steering.js';
import { curveParts, energyOf } from '../endless/energy.js';
import { stateAt, buildSteps, sayText } from '../song/build.js';
import { absoluteClips } from '../endless/transitions.js';

const list = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

// FNV-1a of the seed: the song's signature, and the base of every seeded shape
export function seedHash(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// a seeded number 0..1 from the song's hash and any integers
export const hashOf = (hash, ...xs) => {
  let h = (hash ^ 0x9e3779b9) >>> 0;
  for (const x of xs) { h = Math.imul(h ^ (x | 0), 2654435761); h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; }
  return (h >>> 0) / 4294967296;
};
// an event of `dur` seconds somewhere in each slot of `period` seconds, with probability p: { k: 0..1, st, r, r2, slot } or null
export const eventAt = (hash, t, salt, period, dur, p) => {
  const slot = Math.floor(t / period), st = slot * period + hashOf(hash, salt, slot, 1) * (period - dur), k = (t - st) / dur;
  return hashOf(hash, salt, slot, 2) < p && k >= 0 && k <= 1 ? { k, st, r: hashOf(hash, salt, slot, 3), r2: hashOf(hash, salt, slot, 4), slot } : null;
};

const kindOf = s => (s.add !== undefined ? 'add' : s.remove !== undefined ? 'remove' : s.set ? 'set' : s.pattern ? 'pattern' : s.rack ? 'rack' : 'other');
const stepsOf = song => buildSteps(song).map(s => ({ at: s.at, add: s.add, remove: s.remove, kind: kindOf(s), say: s.say ? sayText(s.say, 'en') : undefined }));

// a song measured part by part (its sections): what plays at the middle of each, with the same measures as the radio
function measured(song) {
  const abs = absoluteClips(song), secs = abs.sections || [];
  const tracks = abs.tracks.filter(t => t.type !== 'voice');
  const max = Math.max(1, tracks.filter(t => t.type !== 'riser').length);
  const talk = (song.build || []).some(s => s.say) ? 0.6 : 0.2;
  // parts: the sections, or phrases of 8 bars (at most 16) for songs of few sections (a live build in one section)
  const total = secs.reduce((a, s) => a + s.bars, 0), chunk = Math.max(8, Math.ceil(total / 16 / 8) * 8);
  const segs = secs.length >= 4 || total < 16 ? secs : Array.from({ length: Math.ceil(total / chunk) }, (_, i) => {
    let a = 0; const sec = secs.find(s => (a += s.bars) > i * chunk) || secs[secs.length - 1];
    return { name: sec.name, bars: Math.min(chunk, total - i * chunk) };
  });
  let at = 0;
  const parts = segs.map(sec => {
    const mid = at + Math.floor(sec.bars / 2), st = stateAt(abs, mid).song;
    const on = st.tracks.map(t => {
      if (t.type === 'voice') return t;
      const c = (t.clips || []).find(c => mid >= c.start && mid < c.start + c.bars);
      return c && !t.mute ? { ...t, settings: { ...t.settings, ...(c.set || {}) } } : { ...t, mute: true };
    });
    const state = { tracks: on }, m = curveParts(state), says = (song.build || []).filter(s => s.say && s.at >= at && s.at < at + sec.bars).length;
    at += sec.bars;
    return { role: String(sec.name || 'part').toLowerCase(), energy: clamp(energyOf(state)), ...m, voice: says ? clamp(talk + 0.1 * says) : talk * 0.5 };
  });
  // steps for the views: the song's live build, or tracks coming in and out at the section starts
  let steps = stepsOf(song);
  if (!steps.length) {
    let prev = new Set();
    at = 0;
    secs.forEach(sec => {
      const now = new Set(tracks.filter(t => (t.clips || []).some(c => c.start < at + sec.bars && c.start + c.bars > at)).map(t => t.id));
      const add = [...now].filter(id => !prev.has(id)), remove = [...prev].filter(id => !now.has(id));
      if (add.length) steps.push({ at, add, kind: 'add' });
      if (remove.length) steps.push({ at, remove, kind: 'remove' });
      prev = now; at += sec.bars;
    });
  }
  return { parts, max, tracks, steps };
}

// The soul of a song. ctx (radio songs): { plan, entry, opts } from the director.
// Out: what the views read (the shape of the v3 mockups' song files), plus the hash and signature.
export function soulData(song, ctx = {}) {
  const { plan, entry = {}, opts = {} } = ctx, secs = song.sections || [], first = secs[0] || {};
  const bars = secs.reduce((a, s) => a + s.bars, 0);
  const seed = String(song.seed || (ctx.seed && `${ctx.seed}-${ctx.n ?? 0}`) || song.id || song.title || 'soul');
  const base = { seed, title: song.title || 'Untitled', key: entry.key || first.key || song.key || 'A', bpm: Math.round(entry.bpm || first.bpm || song.bpm || 120), meter: entry.meter || first.meter || '4/4', bars };
  let out;
  if (plan && plan.plan) {
    const C = songCurves(song, plan, opts), val = (c, k) => c.set[k] ?? c.measured[k];
    out = {
      ...base, shape: entry.shape || 'free', phrase: plan.phrase, bars: plan.bars, styles: entry.styles || [],
      opts: { chaos: opts.chaos ?? 0.5, energy: opts.energy ?? 0.5, complexity: opts.complexity ?? 0.5, talk: opts.talk ?? 0.5 },
      roles: plan.plan.map(d => d.role), energy: plan.plan.map(d => d.target), max: densityMax(plan),
      density: C.map(c => val(c, 'density')), brightness: C.map(c => val(c, 'brightness')), tension: C.map(c => val(c, 'tension')), voice: C.map(c => val(c, 'voice')),
      tracks: song.tracks.filter(t => t.type !== 'voice').map(t => ({ id: t.id, type: t.type, name: t.name || t.id })),
      steps: stepsOf(song), speaker: entry.voice || null,
    };
  } else {
    const m = measured(song), P = m.parts.length ? m.parts : [{ role: 'part', energy: 0.5, density: 1, brightness: 0.5, tension: 0.3, voice: 0.2 }];
    const avg = k => P.reduce((a, p) => a + p[k], 0) / P.length;
    const h = seedHash(seed);
    const tags = song.tags || {};
    out = {
      ...base, shape: entry.lead ? 'lead' : secs.length > 1 ? 'scenes' : 'loop', phrase: 8, styles: tags.styles || (song.style ? [song.style] : []),
      opts: { chaos: Math.round(hashOf(h, 5) * 100) / 100, energy: Math.round(avg('energy') * 100) / 100, complexity: Math.round(avg('density') / m.max * 100) / 100, talk: Math.round(avg('voice') * 100) / 100 },
      roles: P.map(p => p.role), energy: P.map(p => p.energy), max: m.max,
      density: P.map(p => p.density), brightness: P.map(p => p.brightness), tension: P.map(p => p.tension), voice: P.map(p => p.voice),
      tracks: m.tracks.map(t => ({ id: t.id, type: t.type, name: t.name || t.id })), steps: m.steps, speaker: null,
    };
  }
  const hash = seedHash(out.seed);
  return { ...out, hash, hex: hash.toString(16).toUpperCase().padStart(8, '0') };
}

// the curves the views read, all 0..1 (density over the song's most)
export const soulCurves = D => ({ energy: D.energy, density: D.density.map(x => x / Math.max(1, D.max)), brightness: D.brightness, tension: D.tension, voice: D.voice });

// is a track playing at a bar (from the steps)
export function trackOn(D, id, bar) {
  let on = !D.steps.some(s => list(s.add).includes(id));
  for (const s of D.steps) { if (s.at > bar) break; if (list(s.add).includes(id)) on = true; if (list(s.remove).includes(id)) on = false; }
  return on;
}

// the views, their default per song (from the seed) and the lines of the overlays (English, the screens' language)
export const VIEWS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
export const VIEW_NAMES = { a: 'Tracker', b: 'Terrain', c: 'Sphere', d: 'Lattice', e: 'Strands', f: 'Landscape', g: 'Particles', h: 'Halftone', i: 'Aura', j: 'Spectrum' };
export const CRT_VIEWS = ['a', 'b', 'c'];
export const defaultView = D => VIEWS[Math.floor(hashOf(D.hash, 1) * VIEWS.length)];
export const PHRASES = ['ANALYZING SONG SOUL', 'TUNING IN', 'DISSECTING THE GROOVE', 'SEEING ITS INSIDES', 'READING THE SEED', 'MAPPING THE ENERGY', 'DECODING THE PULSE', 'LISTENING TO THE BONES', 'CALIBRATING THE SPECTRUM', 'TRACING THE HOOK', 'COUNTING THE BARS', 'WAKING THE DIRECTOR',
  'DECIPHERING THE MONOLITH', 'SCULPTING THE TRACES', 'SOMETHING COMING FROM THE VOID', 'EVENT HORIZON INTERFERENCE', 'A SIGNAL FROM THE DARK', 'DETECTING... NOT ALONE', 'VOID... BREAK', 'VOID... NOT EMPTY', 'CHOPPING DOWN THE SOUL', 'LAYING IT BARE', 'REGRESSION... FIXED', 'LAGGING...', 'A GLITCH IN THE MATRIX', 'UPLOAD... SYNC', 'DOWNLOADING SOUL',
  'OPENING THE POD BAY DOORS', 'FOLLOW THE WHITE RABBIT', 'THE SHIP IS LISTENING', 'VOICES IN THE STATIC', 'IT KNOWS YOUR NAME', 'DON\'T LOOK BEHIND THE BASSLINE', 'HYPERSLEEP... ENDING', 'SPECIMEN CONTAINED', 'TRANSMISSION INTERCEPTED', 'THE DEEP IS HUMMING', 'COLD BOOT · SOUL CORE', 'GHOST IN THE SEQUENCER', 'ENTERING THE VOID', 'SHE IS IN THE WALLS', 'DATA MOSH... STABLE', 'WE ARE BEING WATCHED'];
export const RECAL = ['RECALIBRATING', 'SIGNAL DRIFT', 'INTERFERENCE DETECTED', 'REWRITING THE FUTURE', 'RE-READING THE SOUL', 'MUTATION IN PROGRESS', 'THE SOUL SHIFTED', 'PATCHING THE TIMELINE', 'SPLICING NEW DNA', 'ANOMALY ABSORBED'];
