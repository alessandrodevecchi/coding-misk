// Incremental steering (incremental-steering, #82): the work of a steering kept per realm, so a new press on a song
// steers only the commands after the longest list it shares with an earlier steering, and the code of a song state
// already compiled is not compiled again. Three caches, each least recently used first:
// - `prefix` (D1): steerSong's result after each command, keyed by the base and the commands up to it;
// - `air` (D2): steerOnAir's loop state after each command or batch, keyed by the base and the commands up to it;
// - `compile` (D4): compileSong's code per song state, keyed by the state's content, bounded in bytes.
// A key never holds a hash of its content: a base is named by an id given to its exact content (`baseId`), and the
// compile key is the state itself, so a kept result is used only for exactly the same input. The steering's module
// context (the spoken context, the language, my phrases) is part of every key through `contextVersion`.
// On in workers and in Node (no `window`); the page's main thread keeps nothing (owner decision 1 of 5 November).
// Off while `globalThis.codingMiskAhead` is set (other typing limits, for the growth probe and browser checks), and
// with STEER_MEMO=0 in Node (comparisons). A kept value is never changed by its users; `freeze: true` (the check)
// freezes each one deeply so a caller that writes into it fails at once.
import { spokenVersion } from '../song/spoken.js';
import { narratorMine } from '../song/build.js';
import { getLang } from '../i18n.js';
import { memoContextN } from './memo-context.js';

const envOff = typeof process !== 'undefined' && process.env && process.env.STEER_MEMO === '0';
export const memoConfig = { on: typeof window === 'undefined' && !envOff, freeze: false };
export const memoOn = () => memoConfig.on && !globalThis.codingMiskAhead;

// the bounds (D6, owner decisions of 8 November): 128 prefix results, 64 loop states, 48 MB of compiled code per realm
export const BOUNDS = { prefix: 128, air: 64, compileBytes: 48e6, bases: 12 };

// ---------- context version ----------
// raised when what a steering reads from its module changes: the spoken context (spoken.js counts its changes by
// content, so a worker that gets the same context with every message keeps its results, and notices a direct
// assignment), the language, my phrases' pick. Read by every steering and compile: a few comparisons.
let version = 0, seen = null;
const snapshot = () => [spokenVersion(), getLang(), narratorMine.pick, memoContextN()];
export function contextVersion() {
  const now = snapshot();
  if (!seen || now.some((x, i) => x !== seen[i])) { seen = now; version++; }
  return version;
}

// ---------- a least-recently-used map, bounded in entries and in bytes ----------
class Lru {
  constructor(max, maxBytes = Infinity) { this.max = max; this.maxBytes = maxBytes; this.map = new Map(); this.bytes = 0; this.hits = 0; this.miss = 0; }
  get(k) {
    const e = this.map.get(k);
    if (!e) { this.miss++; return undefined; }
    this.hits++; this.map.delete(k); this.map.set(k, e);
    return e.v;
  }
  has(k) { return this.map.has(k); }
  set(k, v, bytes = 0, owner = null) {
    const old = this.map.get(k);
    if (old) { this.bytes -= old.b; this.map.delete(k); }
    this.map.set(k, { v, b: bytes, o: owner });
    this.bytes += bytes;
    while (this.map.size > this.max || this.bytes > this.maxBytes) {
      const [k0, e0] = this.map.entries().next().value;
      this.map.delete(k0); this.bytes -= e0.b;
    }
  }
  drop(test) { for (const [k, e] of this.map) if (test(k, e)) { this.map.delete(k); this.bytes -= e.b; } }
  clear() { this.map.clear(); this.bytes = 0; }
}
export const caches = {
  prefix: new Lru(BOUNDS.prefix),
  air: new Lru(BOUNDS.air),
  compile: new Lru(Infinity, BOUNDS.compileBytes),
};

// ---------- bases ----------
// a base (the song, plan and options a steering starts from, with the grown song, seed and index) gets an id per
// exact content: equal content, equal id; any difference, another id. The page tags each steering with its song of the
// session (`owner`), so a song that leaves the air drops its bases and everything kept for them (`forget`).
const bases = new Map(); // content → { id, owner }
let baseN = 0, owner = null;
export function baseId(content, tag = owner) {
  let b = bases.get(content);
  if (b) { bases.delete(content); bases.set(content, b); if (tag) b.owner = tag; return b.id; }
  b = { id: `b${++baseN}`, owner: tag };
  bases.set(content, b);
  while (bases.size > BOUNDS.bases) { const [c0, b0] = bases.entries().next().value; bases.delete(c0); dropBase(b0.id); }
  return b.id;
}
const dropBase = id => { const p = `${id}|`; caches.prefix.drop(k => k.startsWith(p)); caches.air.drop(k => k.startsWith(p)); };
// the song of the session a steering is for (set by the worker around a steering; the compile cache tags its entries
// with it too)
export const setOwner = tag => { owner = tag || null; };
export const currentOwner = () => owner;
// a song that left the air ('*': a new session, everything)
export function forget(tag) {
  if (tag === '*') { bases.clear(); caches.prefix.clear(); caches.air.clear(); caches.compile.clear(); return; }
  for (const [c, b] of bases) if (b.owner === tag) { bases.delete(c); dropBase(b.id); }
  caches.compile.drop((k, e) => e.o === tag);
}
export function clearMemo() { forget('*'); for (const c of Object.values(caches)) { c.hits = 0; c.miss = 0; } }

// ---------- what the last steering did (the radio's expected preparation, D9; the timing script) ----------
// computed: commands steered (not reused) by the last steerOnAir or steerSong call; units: loop units steered
export const work = { computed: 0, units: 0, reused: 0 };

// a kept value frozen deeply (the check only)
export function deepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); for (const k of Object.keys(v)) deepFreeze(v[k]); }
  return v;
}
export const keep = v => (memoConfig.freeze ? deepFreeze(v) : v);
export function memoStats() {
  const s = {};
  for (const [k, c] of Object.entries(caches)) s[k] = { entries: c.map.size, bytes: c.bytes, hits: c.hits, miss: c.miss };
  s.bases = bases.size;
  return s;
}

// the time of a part of the steering, summed in globalThis.codingMiskSteerProbe when a timing script sets it
// (tools/steer-bench.mjs: director, transit, typing, compile); nothing is measured otherwise
export function timed(k, f) {
  const P = globalThis.codingMiskSteerProbe;
  if (!P) return f();
  const t = performance.now();
  try { return f(); } finally { P[k] = (P[k] || 0) + performance.now() - t; P[`${k}N`] = (P[`${k}N`] || 0) + 1; }
}
