// Moments of the explaining narrator (my-phrases D2): one shared list of 21 moments that the Compose pools (the 14
// kinds of PHRASES in src/song/build.js, the comments of Crescendo and Live coder growths in src/song/crescendo.js) and
// the radio's pool (the 18 move kinds of POOL in src/endless/phrases.js) map onto, so a phrase of mine tagged with a
// moment serves Compose and the radio alike. The list is shown in three groups (tracks that come in, changes of energy
// or colour, structure); a later split into several lists keeps the tag a moment and only regroups (D2, open point:
// awaiting the owner's confirmation). Pure: the app and the Node checks read the same map.
import { PHRASES } from '../song/build.js';
import { POOL } from '../endless/phrases.js';
import { CRESCENDO_POOL } from '../song/crescendo.js';
import { POETIC } from '../song/vocabulary.js';

// the three groups of moments, in the order the tab shows them
export const MOMENT_GROUPS = {
  tracks: ['drums', 'bass', 'lead', 'pad', 'guitar', 'arp', 'texture', 'riser', 'code', 'voice'],
  colour: ['less', 'variation', 'brighter', 'darker', 'dirtier', 'cleaner', 'space'],
  structure: ['start', 'end', 'breakdown', 'drop'],
};
export const MOMENTS = Object.values(MOMENT_GROUPS).flat();
export const groupOfMoment = m => Object.keys(MOMENT_GROUPS).find(g => MOMENT_GROUPS[g].includes(m)) || null;

// Compose's derived builds (PHRASES, one line per kind)
export const PHRASES_MOMENT = {
  start: 'start', drums: 'drums', bass: 'bass', guitar: 'guitar', hook: 'lead', arp: 'arp', pad: 'pad', riser: 'riser',
  texture: 'texture', code: 'code', spoken: 'voice', less: 'less', breakdown: 'breakdown', end: 'end',
};
// the radio director's moves (POOL)
export const POOL_MOMENT = {
  'song-start': 'start', 'song-end': 'end', 'add-drums': 'drums', 'add-bass': 'bass', 'add-lead': 'lead', 'add-pad': 'pad',
  'add-guitar': 'guitar', 'add-texture': 'texture', 'add-riser': 'riser', strip: 'less', variation: 'variation',
  brighter: 'brighter', darker: 'darker', dirtier: 'dirtier', cleaner: 'cleaner', 'more-space': 'space', break: 'breakdown', drop: 'drop',
};
// the growths' comments (CRESCENDO_POOL): by kind, and by track type or device inside the kind
const TYPE_MOMENT = { drums: 'drums', bass: 'bass', pad: 'pad', guitar: 'guitar', arp: 'arp', hook: 'lead', texture: 'texture', riser: 'riser', code: 'code', spoken: 'voice', any: 'variation' };
const DEVICE_MOMENT = { echo: 'space', delay: 'space', reverb: 'space', distort: 'dirtier', shape: 'dirtier', crush: 'dirtier', coarse: 'dirtier' };
const REVEAL_MOMENT = { cutoff: 'darker', drive: 'dirtier', grit: 'dirtier', room: 'space', delay: 'space' };
const KIND_MOMENT = {
  grow: 'variation', fill: 'variation', cutoff: 'brighter', drive: 'dirtier', grit: 'dirtier', room: 'space', delay: 'space', gain: 'brighter',
  break: 'breakdown', back: 'drop', harmony: 'variation', strip: 'less', last: 'end', clone: 'variation', comment: 'less',
  uncomment: 'variation', rewrite: 'variation', settle: 'variation',
};
export function crescendoMoment(kind, sub) {
  if (kind === 'enter') return TYPE_MOMENT[sub] || 'variation';
  if (kind === 'device') return DEVICE_MOMENT[sub] || 'variation';
  if (kind === 'reveal') return REVEAL_MOMENT[sub] || 'variation';
  return KIND_MOMENT[kind] || null;
}

// The moment of a pool line by its English text ({ en, it } or a string), or null when the line is in no pool (a
// song's own line, a style's line, a line the user wrote). The first pool that has the text wins: Compose's PHRASES,
// the radio's POOL, then the growths' comments.
let byText = null;
function textMap() {
  if (byText) return byText;
  byText = new Map();
  const put = (en, m) => { if (en && m && !byText.has(en)) byText.set(en, m); };
  for (const [k, x] of Object.entries(PHRASES)) put(x.en, PHRASES_MOMENT[k]);
  for (const [k, list] of Object.entries(POOL)) for (const [en] of list) put(en, POOL_MOMENT[k]);
  for (const [kind, g] of Object.entries(CRESCENDO_POOL)) for (const [sub, list] of Object.entries(g)) for (const [en] of list) put(en, crescendoMoment(kind, sub));
  return byText;
}
export const momentOfLine = say => { const en = typeof say === 'string' ? say : say && say.en; return (en && textMap().get(en)) || null; };

// every pool key and its moment, for check:phrases: [{ pool, key, moment }]
export function poolKeys() {
  const out = [];
  for (const k of Object.keys(PHRASES)) out.push({ pool: 'PHRASES', key: k, moment: PHRASES_MOMENT[k] || null });
  for (const k of Object.keys(POOL)) out.push({ pool: 'POOL', key: k, moment: POOL_MOMENT[k] || null });
  for (const [kind, g] of Object.entries(CRESCENDO_POOL)) for (const sub of Object.keys(g)) out.push({ pool: 'CRESCENDO', key: `${kind}.${sub}`, moment: crescendoMoment(kind, sub) });
  return out;
}

// the tags of each kind of phrase: a vocabulary group (voice), a moment (explain), an entering track type or "move"
// (poetic); null is "any"
export const POETIC_TAGS = Object.keys(POETIC).filter(k => k !== 'any');
