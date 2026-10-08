// Seeded random numbers for the endless director (docs/ENDLESS.md).
// One seed (any string) gives independent named streams, so changing how one
// concern draws (titles, comments) never changes what another draws (the music).
// Plain JS, no Node or browser APIs: runs in both. Never use Math.random in the director.

// FNV-1a 32-bit hash of a string.
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: small, fast, good enough for music choices.
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random stream with helpers. `next()` gives a float in [0, 1).
export function stream(seed, name = '') {
  const next = mulberry32(hashString(`${seed}\u0000${name}`));
  const r = {
    next,
    // Float in [lo, hi).
    range: (lo, hi) => lo + (hi - lo) * next(),
    // Integer in [lo, hi] (both included).
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    // True with probability p.
    chance: p => next() < p,
    // One item of a non-empty array.
    pick: arr => arr[Math.floor(next() * arr.length)],
    // One item by weight: items [{ value, weight }] or [value, …] with weights [w, …].
    weighted(items, weights) {
      const w = weights || items.map(i => i.weight);
      const total = w.reduce((a, b) => a + b, 0);
      let x = next() * total;
      for (let i = 0; i < items.length; i++) {
        x -= w[i];
        if (x < 0) return weights ? items[i] : items[i].value;
      }
      return weights ? items[items.length - 1] : items[items.length - 1].value;
    },
    // A shuffled copy (Fisher-Yates).
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    // A child stream, for example one per song: fork('song-3').
    fork: sub => stream(seed, `${name}/${sub}`),
  };
  return r;
}

// All named streams of one seed: rng.plan, rng.moves, rng.mutation, rng.titles, rng.comments, rng.voice.
export const STREAMS = ['plan', 'moves', 'mutation', 'titles', 'comments', 'voice'];
export function makeRng(seed) {
  const out = { seed: String(seed) };
  for (const name of STREAMS) out[name] = stream(out.seed, name);
  return out;
}

// A new seed when the user gives none: short, readable, recorded in the session.
// The only place that may use non-seeded randomness.
export function freshSeed() {
  return Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, '0');
}
