// Mixing several styles into one session with a chaos amount (docs/STYLES.md, "Mixing").
// Each song takes each of its parts (tempo, drums, bass, harmony, lead, pads, voice) from one style.
import { PART_NAMES, PARTS } from './recipe.js';

// The style of each part for song number `index` of the session.
//   recipes: the selected recipes (in the order chosen); chaos: 0 to 1; rng: a random stream.
// chaos 0: every part from one style, rotating through the selection song by song.
// chaos 1: every part drawn on its own, uniformly among the selected styles.
// In between: the rotating style dominates, and each part comes from another style with
// probability chaos * (n - 1) / n, which reaches the uniform draw at chaos 1.
// A part taken from a style that lacks it (for example pads from a style without pads) stays empty.
export function mixParts(recipes, chaos, index, rng) {
  const n = recipes.length, dominant = recipes[index % n];
  const parts = { dominant: dominant.id };
  const other = chaos * (n - 1) / n;
  for (const part of PART_NAMES) {
    let style = dominant;
    if (n > 1 && chaos > 0 && rng.chance(other)) style = rng.pick(recipes.filter(r => r !== dominant));
    parts[part] = style.id;
  }
  return parts;
}

// The recipe fields a song uses: each field from the style that gives its part.
export function partRecipe(parts, byId) {
  const out = {};
  for (const part of PART_NAMES) for (const k of PARTS[part]) {
    const v = byId[parts[part]][k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// Short label for reports and variety checks: "tempo=jazz drums=country …".
export const partsKey = parts => PART_NAMES.map(p => `${p}=${parts[p]}`).join(' ');
// The distinct styles a song uses.
export const stylesOf = parts => [...new Set(PART_NAMES.map(p => parts[p]))];
