// The controls each rack device writes as a base value later on its line (sound-modulation D2). #94's variation
// (src/material/variation.js) leaves a target out when a device writes it; the rack (rack.js) and the validator read
// the same lists. Kept apart with no imports, so the variation, the rack and the music module never import in a ring.
const SWEEP_CONTROL = { filter: 'lpf', hpf: 'hpf', room: 'room', delay: 'delay' };
export const WRITES = {
  delay: ['delay'], reverb: ['room'], distort: ['distort'], crush: ['crush'], vowel: ['vowel'], hpf: ['hpf'], lpf: ['lpf'], pan: ['pan'],
  // a Sweep writes its target; an LFO and a Pump move around the base and never replace it
  sweep: d => [SWEEP_CONTROL[(d && d.target) || 'filter'] || 'lpf'],
};
export const deviceWrites = d => { const w = d && WRITES[d.device]; return !w ? [] : typeof w === 'function' ? w(d) : w; };
