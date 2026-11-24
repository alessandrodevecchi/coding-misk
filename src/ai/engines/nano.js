// The built-in engine (ai-assistant D1, D3): the browser's own language model through the Prompt API (LanguageModel).
// One base session per system prompt, created on the first request or on the download click; each request runs in a
// clone() that is destroyed after, so turns never pile up. Both the current and the old quota names are read. Measured
// on the owner's Mac: a window of 9216 tokens, about 800 for the console prompt, about 2 s per request.
const LM = () => globalThis.LanguageModel || null;
const LANG = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
const STATE = { available: 'ready', downloadable: 'download', downloading: 'downloading', unavailable: 'unavailable' };

let base = null, baseKey = '', baseWindow = null, firstDone = false, progress = null;
const listeners = new Set();
const tell = () => listeners.forEach(f => { try { f(progress); } catch (e) { /* ignore */ } });

export const windowOf = s => (s ? s.contextWindow ?? s.inputQuota ?? null : null);
export const usageOf = s => (s ? s.contextUsage ?? s.inputUsage ?? null : null);

async function makeBase(initial) {
  const key = JSON.stringify(initial);
  if (base && baseKey === key) return base;
  try { if (base) base.destroy(); } catch (e) { /* ignore */ }
  base = null;
  const monitor = m => m.addEventListener('downloadprogress', e => { progress = Math.round(100 * (e.loaded ?? 0)); tell(); });
  const s = await LM().create({ ...LANG, initialPrompts: initial, monitor });
  progress = null; tell();
  base = s; baseKey = key; baseWindow = windowOf(s);
  return s;
}

export const nanoEngine = {
  id: 'nano', local: true, name: 'Built-in model',
  supported: () => !!LM(),
  async status() {
    const L = LM();
    if (!L || typeof L.availability !== 'function') return { state: 'unavailable', detail: 'no-api' };
    if (!globalThis.isSecureContext) return { state: 'unavailable', detail: 'insecure' };
    try {
      const a = await L.availability(LANG);
      if (progress !== null && a !== 'available') return { state: 'downloading', detail: progress };
      return { state: STATE[a] || 'unavailable', detail: a === 'unavailable' ? 'device' : undefined };
    } catch (e) { return { state: 'unavailable', detail: e && e.name === 'NotSupportedError' ? 'language' : 'error' }; }
  },
  async listModels() { return [{ id: 'built-in', name: 'Built-in model', family: 'built-in', json: true }]; },
  // the download starts from a click (the API needs a user activation while the model is not on disk)
  async download(initial) { await makeBase(initial); },
  onProgress(f) { listeners.add(f); return () => listeners.delete(f); },
  get window() { return baseWindow; },
  get progress() { return progress; },
  async prompt({ initial, input, schema, signal }) {
    const t0 = performance.now();
    const b = await makeBase(initial);
    const s = typeof b.clone === 'function' ? await b.clone({ signal }) : b;
    try {
      const raw = await s.prompt(input, { responseConstraint: schema, signal });
      firstDone = true;
      let json = null;
      try { json = JSON.parse(raw); } catch (e) { /* the caller says it was not understood */ }
      return { json, raw, ms: Math.round(performance.now() - t0), usage: usageOf(s), window: windowOf(s) };
    } finally { if (s !== b) try { s.destroy(); } catch (e) { /* ignore */ } }
  },
  get first() { return !firstDone; },
  // the base session goes when the Radio tab closes
  release() { try { if (base) base.destroy(); } catch (e) { /* ignore */ } base = null; baseKey = ''; },
};
