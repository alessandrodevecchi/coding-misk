// Typing load of a live build (growth-shapes, bursts of edits): how fast the human typing has to go for each step,
// as the app types it (makeTyping in src/main.js). Pure: the growth uses it to pick a shape without rushed steps, and
// tools/check-crescendo.mjs reports it.
import { buildSteps } from '../song/build.js';
import { meterSteps } from '../music.js';
import { typingPlan, settleOthers } from '../song/typing.js';

// seconds of one bar of the growth (the first section)
export const barSeconds = song => { const s = song.sections[0]; return (meterSteps(s.meter || '4/4') / 4) * 60 / (s.bpm || 138); };

// the typing of each step as the app plans it (makeTyping in src/main.js): from half a bar after the step before to a
// fifth of a second before the step, a listening pause of up to 2 s first; need: the leanest human typing (no pauses,
// no mistakes). → [{ at, seconds, usable, need, ratio }] (ratio > 1: the typing has to speed up)
export function typingLoad(L, { seed = '', from = 1, to = Infinity } = {}) {
  const sb = barSeconds(L.build), bars = [...new Set(buildSteps(L.build).map(x => x.at))].filter(b => b >= from && b <= to);
  const out = [];
  let prev = 0;
  for (const at of bars) {
    const code = L.codeAt(at), was = settleOthers(L.codeAt(prev), code, at);
    const avail = Math.max(0.2, (at - prev - 0.5) * sb - 0.2), usable = Math.max(0.2, avail - Math.min(avail * 0.5, 2));
    // (with the time left as the limit: a new line that would not fit is pasted, as the app types it)
    const need = was === code ? 0 : typingPlan(was, code, { style: 'human', lean: true, seed, max: usable }).natural;
    out.push({ at, seconds: at * sb, gap: (at - prev) * sb, usable, need, ratio: need / usable });
    prev = at;
  }
  return out;
}

// steps of the growth typed faster than a person can (ratio above 1.1); L: liveCode of the build
export const rushedSteps = (L, seed = '') => typingLoad(L, { seed, to: L.build.crescendo ? L.build.crescendo.grown : Infinity }).filter(x => x.ratio > 1.1).length;
// how much the growth is rushed in all: the sum of the ratios above 1.1 (a big burst weighs more than a small hurry)
export const rushLoad = (L, seed = '') => typingLoad(L, { seed, to: L.build.crescendo ? L.build.crescendo.grown : Infinity }).filter(x => x.ratio > 1.1).reduce((a, x) => a + x.ratio - 1, 0);
