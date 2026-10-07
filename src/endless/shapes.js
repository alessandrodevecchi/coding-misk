// Energy shapes of the endless director (docs/ENDLESS.md, "Energy").
// A shape gives a target energy (0 to 1) for each double phrase of a song, plus a role that names
// the section (intro, build, break, drop, verse, chorus, peak, outro). Big events (drop, break, chorus)
// fall on double-phrase boundaries because the shape works in double phrases.
import { SHAPES } from './recipe.js';
export { SHAPES };

const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

// [role, target] for double phrase d of D (D ≥ 2)
const CURVES = {
  'build-drop'(d, D) {
    // build to about 60 %, one double phrase of break, drop, then a short outro
    const brk = Math.max(1, Math.round(D * 0.55)), drop = brk + 1, out = Math.max(drop + 1, D - 1);
    if (d === 0) return ['intro', 0.2];
    if (d < brk) return ['build', 0.3 + 0.45 * (d / brk)];
    if (d === brk) return ['break', 0.25];
    if (d < out || D <= drop + 1) return ['drop', 0.95];
    return ['outro', 0.45];
  },
  'slow-burn'(d, D) {
    const p = d / Math.max(1, D - 1);
    if (d === D - 1 && D > 3) return ['outro', 0.6];
    return [d === 0 ? 'intro' : p < 0.7 ? 'build' : 'peak', 0.15 + 0.75 * p ** 1.3];
  },
  waves(d, D) {
    if (d === 0) return ['intro', 0.3];
    if (d === D - 1 && D > 3) return ['outro', 0.35];
    const up = d % 2 === 1;
    return [up ? 'wave' : 'trough', up ? 0.8 : 0.45];
  },
  'flat-groove'(d, D) {
    if (d === 0) return ['intro', 0.45];
    if (d === D - 1 && D > 3) return ['outro', 0.45];
    return ['groove', d % 2 ? 0.6 : 0.55];
  },
  'verse-chorus'(d, D) {
    if (d === 0) return ['intro', 0.3];
    if (d === D - 1 && D > 3) return ['outro', 0.4];
    // verse, verse, chorus, repeating
    return (d % 3 === 0) ? ['chorus', 0.85] : ['verse', 0.5];
  },
  'late-peak'(d, D) {
    const p = d / Math.max(1, D - 1), peak = Math.max(1, D - 2);
    if (d === 0) return ['intro', 0.25];
    if (d === peak) return ['peak', 1];
    if (d > peak) return ['outro', 0.55];
    return ['build', 0.3 + 0.55 * p ** 2];
  },
  descent(d, D) {
    const p = d / Math.max(1, D - 1);
    return [d === 0 ? 'peak' : d === D - 1 ? 'outro' : 'fall', 0.85 - 0.65 * p];
  },
};

// The energy amount (0 to 1) moves every target; 0.6 leaves the curve as it is.
// Flat groove keeps a narrow band.
export const shiftTarget = (t, energy, shape) => clamp(t + (energy - 0.6) * (shape === 'flat-groove' ? 0.4 : 0.6), 0.05, 1);

// Targets of a whole song: one entry per double phrase.
export function shapePlan(shape, doubles, energy) {
  return Array.from({ length: doubles }, (_, d) => {
    const [role, t] = CURVES[shape](d, doubles);
    return { role, target: shiftTarget(t, energy, shape) };
  });
}

// Roles that are big events: they happen on a double-phrase boundary with a bigger move.
export const LANDMARKS = ['break', 'drop', 'chorus', 'peak'];
