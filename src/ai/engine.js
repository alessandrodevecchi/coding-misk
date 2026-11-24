// The engine interface (ai-assistant D1). An engine:
//   { id, local, name,
//     status(): Promise<{ state: 'ready'|'download'|'downloading'|'no-key'|'unavailable'|'offline', detail? }>,
//     listModels(): Promise<Model[]>,                 // { id, name, family, json }
//     prompt({ model, initial, input, schema, signal, window }): Promise<{ json, raw, ms }> }
// The area code never sees engine details: it builds the prompt from the registry (src/ai/generate.js) and reads the
// answer with the registry's validation (src/ai/commands.js).
import { nanoEngine } from './engines/nano.js';

export const TIMEOUT_MS = 20000;
export const FIRST_TIMEOUT_MS = 30000;

// the engines of the app: the built-in model now; the online engines come in later stages (D6)
export const ENGINES = { nano: nanoEngine };
export const COMING_ENGINES = ['openrouter', 'anthropic'];

export const engineOf = id => ENGINES[id] || null;

// an AbortSignal that aborts after ms or when the outer signal aborts
export function deadline(ms, outer) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(new DOMException(`no answer after ${Math.round(ms / 1000)} s`, 'TimeoutError')), ms);
  if (outer) { if (outer.aborted) c.abort(outer.reason); else outer.addEventListener('abort', () => c.abort(outer.reason), { once: true }); }
  return { signal: c.signal, done: () => clearTimeout(id) };
}
