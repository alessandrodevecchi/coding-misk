// The app areas that use AI engines (ai-assistant D2), each with its engine, model and mode, stored per area in
// coding-misk-ai (in the backup: it holds no secret). The Radio console now; Compose later (D11).
import { ENGINES, COMING_ENGINES } from './engine.js';

export const AI_KEY = 'coding-misk-ai';
export const AREAS = {
  radio: { engines: ['nano'], coming: COMING_ENGINES, defaults: { engine: 'nano', model: 'built-in', apply: 'now' } },
  // (D11: real Compose needs the online engines; the built-in engine at most a light option later)
  compose: { engines: [], coming: COMING_ENGINES, soon: true, defaults: { engine: null, model: null, apply: 'ask' } },
};
export const APPLY_MODES = ['now', 'ask'];

export function areaSettings(store, area) {
  const A = AREAS[area], all = (store && store.get(AI_KEY, {})) || {};
  const s = { ...A.defaults, ...(all[area] || {}) };
  if (!A.engines.includes(s.engine)) s.engine = A.defaults.engine;
  if (!APPLY_MODES.includes(s.apply)) s.apply = A.defaults.apply;
  return s;
}
export function setArea(store, area, patch) {
  const all = { ...((store.get(AI_KEY, {})) || {}) };
  all[area] = { ...areaSettings(store, area), ...patch };
  store.set(AI_KEY, all);
  return all[area];
}
export const engineFor = (store, area) => ENGINES[areaSettings(store, area).engine] || null;
