// Time from a tempo map (#8): bpm per bar (a bar is a cycle, 4 beats), as the player changes tempo at bar boundaries.
// Pure: checked in Node (tools/check-export.mjs).
export function tempoClock(bpm) {
  const at = [0];
  for (let i = 0; i < bpm.length; i++) at.push(at[i] + 240 / bpm[i]);
  const last = bpm.length - 1;
  return {
    // seconds from the start at cycle c (past the end the last tempo goes on)
    seconds(c) {
      if (c <= 0) return c * 240 / bpm[0];
      const i = Math.floor(c);
      if (i > last) return at[last + 1] + (c - last - 1) * 240 / bpm[last];
      return at[i] + (c - i) * 240 / bpm[i];
    },
    cps: c => bpm[Math.max(0, Math.min(last, Math.floor(c)))] / 240,
  };
}
