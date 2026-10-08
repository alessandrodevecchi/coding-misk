// Quirks of artists (docs/ARTISTS.md): small habits, each rolled once per song with its chance.
// The director asks `has(opts, name)` at the few points where a quirk changes something.
export const QUIRKS = {
  'two-drops': { en: 'two drops in build and drop songs', it: 'due drop nei brani costruzione e drop' },
  'long-breaks': { en: 'breaks two double phrases long', it: 'break lunghi due doppie frasi' },
  'no-guitars': { en: 'never a guitar', it: 'mai chitarre' },
  'texture-first': { en: 'texture among the first tracks', it: 'texture tra le prime tracce' },
  'hard-endings': { en: 'everything stops at the last change', it: 'all\'ultimo cambio si ferma tutto' },
  'talks-a-lot': { en: 'comments on most changes', it: 'commenta quasi ogni cambio' },
  'slow-builds': { en: 'one track at a time in the first half', it: 'una traccia alla volta nella prima metà' },
};
export const has = (opts, name) => !!(opts && opts.quirks && opts.quirks.includes(name));

// Energy plan changes: two drops, long breaks (plan: [{ role, target }] per double phrase)
export function applyPlanQuirks(plan, shape, opts) {
  const D = plan.length, out = plan.map(p => ({ ...p }));
  if (shape === 'build-drop' && has(opts, 'two-drops') && D >= 6) {
    const lo = out.find(p => p.role === 'break') || { target: 0.25 }, hi = out.find(p => p.role === 'drop') || { target: 0.95 };
    const b1 = Math.max(1, Math.round(D * 0.35)), b2 = Math.max(b1 + 2, Math.round(D * 0.65));
    for (let d = 1; d < D - 1; d++) {
      const role = d < b1 ? 'build' : d === b1 || d === b2 ? 'break' : 'drop';
      out[d] = role === 'build' ? { role, target: out[d].role === 'build' ? out[d].target : 0.55 } : { role, target: role === 'break' ? lo.target : hi.target };
    }
  }
  if (has(opts, 'long-breaks')) {
    for (let d = 2; d < D - 1; d++) if (out[d].role === 'break' && out[d - 1].role !== 'break' && out[d - 1].role !== 'intro') { out[d - 1] = { ...out[d] }; }
  }
  return out;
}
