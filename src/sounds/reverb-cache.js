// Reverb impulse responses kept and reused (#82). superdough makes a new impulse response every time an orbit's reverb
// changes (room size, fade, lowpass, dim): a buffer of noise filled on the main thread inside the scheduler's tick (one
// Math.pow per sample, 288 000 samples for a 2 s room) and then filtered offline. A radio transition or a console change
// that puts reverbs on several tracks made several of them at once, and the page missed scheduler ticks ("skip query:
// too late").
// Here createReverb is superdough's, with the same fields and the same generator, and the responses are kept per
// AudioContext under their parameters (a small LRU). A response asked again is the one already made: the same kind of
// noise (superdough draws a new random one each time, so no two were ever equal), put on the reverb in a task of its
// own, a few to tens of ms sooner than a new one, which waits for its offline filter. A response read from a file (`ir`)
// is made as before. The fast export's render page does not install it.
//   installReverbCache({ proto, generate, max, maxSeconds })
//     proto: the prototype to patch (BaseAudioContext.prototype); generate: superdough's reverbGen.generateReverb
//     max: responses kept per context (8); maxSeconds: their total length in seconds of one channel (60)
export const REVERB_CACHE_MAX = 8, REVERB_CACHE_SECONDS = 60;

// a small LRU of responses by key, bounded by count and total length
export function createIrCache({ max = REVERB_CACHE_MAX, maxSeconds = REVERB_CACHE_SECONDS } = {}) {
  const m = new Map();
  const secs = b => (b && b.sampleRate ? b.length / b.sampleRate : 0);
  let total = 0;
  return {
    get(k) { const b = m.get(k); if (b === undefined) return null; m.delete(k); m.set(k, b); return b; },
    put(k, b) {
      if (m.has(k)) { total -= secs(m.get(k)); m.delete(k); }
      if (secs(b) > maxSeconds) return;
      m.set(k, b); total += secs(b);
      for (const [k0, b0] of m) { if (m.size <= max && total <= maxSeconds) break; m.delete(k0); total -= secs(b0); }
    },
    get size() { return m.size; },
    get seconds() { return total; },
    keys: () => [...m.keys()],
  };
}

export const irKey = (ctx, channels, d, fade, lp, dim) => `${ctx.sampleRate}|${channels}|${d}|${fade}|${lp}|${dim}`;

export function installReverbCache({ proto, generate, max = REVERB_CACHE_MAX, maxSeconds = REVERB_CACHE_SECONDS, later = f => setTimeout(f, 0) } = {}) {
  if (!proto || !generate || proto.__reverbCache) return null;
  const caches = new WeakMap(), stats = { hits: 0, made: 0 };
  const cacheOf = ctx => { let c = caches.get(ctx); if (!c) caches.set(ctx, (c = createIrCache({ max, maxSeconds }))); return c; };
  // superdough's createReverb (superdough/reverb.mjs), its generate with the cache
  function createReverb(duration, fade, lp, dim, ir, irspeed, irbegin) {
    const ctx = this, convolver = this.createConvolver();
    let asked = 0;
    convolver.generate = (d = 2, f = 0.1, l = 15000, m = 1000, irr, irs, irb) => {
      convolver.duration = d; convolver.fade = f; convolver.lp = l; convolver.dim = m; convolver.ir = irr; convolver.irspeed = irs; convolver.irbegin = irb;
      const n = ++asked;
      if (irr) { convolver.buffer = ctx.adjustLength(d, irr, irs, irb); return; }
      const cache = cacheOf(ctx), key = irKey(ctx, 2, d, f, l, m), hit = cache.get(key);
      // (a newer generate on the same reverb wins over an older one still waiting)
      if (hit) { stats.hits++; later(() => { if (asked === n) convolver.buffer = hit; }); return; }
      stats.made++;
      generate({ audioContext: ctx, numChannels: 2, decayTime: d, fadeInTime: f, lpFreqStart: l, lpFreqEnd: m }, buffer => { cache.put(key, buffer); if (asked === n) convolver.buffer = buffer; });
    };
    convolver.generate(duration, fade, lp, dim, ir, irspeed, irbegin);
    return convolver;
  }
  // (superdough sets its own createReverb when its module runs: before this, it is replaced; after, it is kept aside)
  let theirs = Object.getOwnPropertyDescriptor(proto, 'createReverb');
  Object.defineProperty(proto, 'createReverb', { configurable: true, get: () => createReverb, set: f => { theirs = f; } });
  Object.defineProperty(proto, '__reverbCache', { configurable: true, value: { stats, cacheOf, get theirs() { return theirs; } } });
  return { stats, cacheOf };
}
