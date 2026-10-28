// The radio's "Next changes" list (after-tests-oct28 D1, D2): a label for every build action, and the words each voice
// says there, from the same schedule the code is written from (spokenSchedule). Pure: the radio and the Node checks
// build the same rows.
import { t } from '../i18n.js';
import { buildSteps } from '../song/build.js';

const list = v => (Array.isArray(v) ? v : [v]);
// a track by its name when the song gives it one
const nameOf = (song, id) => { const tr = ((song && song.tracks) || []).find(x => x.id === id); return (tr && tr.name) || id; };
const keysOf = k => list(k).join(', ');

// the label of a step, one part per action joined with " · "; '' for a step with no action (a section step)
export function stepLabel(s, song) {
  const n = id => nameOf(song, id), parts = [];
  for (const k of ['add', 'remove']) if (s[k] !== undefined) parts.push(`${k === 'add' ? '+' : '−'} ${list(s[k]).map(n).join(', ')}`);
  if (s.set) { const { track, ...v } = s.set; parts.push(`${n(track)}: ${Object.entries(v).map(([k, x]) => `${k} ${x}`).join(', ')}`); }
  if (s.pattern) {
    const p = s.pattern;
    if (p.level !== undefined) parts.push(p.level ? t('stepLevel', { track: n(p.track), n: p.level }) : t('stepAsWritten', { track: n(p.track) }));
    else parts.push(`${n(p.track)} → ${p.to}`);
  }
  if (s.rack) parts.push(`${n(s.rack.track)} + ${s.rack.device}`);
  if (s.unrack) parts.push(`${n(s.unrack.track)} − ${s.unrack.device}`);
  if (s.hide) parts.push(t('stepHide', { track: n(s.hide.track), keys: keysOf(s.hide.keys) }));
  if (s.reveal) parts.push(t('stepReveal', { track: n(s.reveal.track), keys: keysOf(s.reveal.keys) }));
  if (s.clone) parts.push(t('stepClone', { track: n(s.clone.track), from: n(s.clone.from) }));
  if (s.comment) parts.push(t('stepComment', { track: n(s.comment.track), keys: keysOf(s.comment.keys) }));
  if (s.notes) parts.push(t('stepNotes', { track: n(s.notes.track) }));
  // (a variant is an index from 0: shown counted from 1)
  if (s.variant) parts.push(s.variant.use === null || s.variant.use === undefined ? t('stepVariantOff', { track: n(s.variant.track) }) : t('stepVariant', { track: n(s.variant.track), n: s.variant.use + 1 }));
  for (const [k, key] of [['mute', 'stepMute'], ['unmute', 'stepUnmute'], ['solo', 'stepSolo'], ['unsolo', 'stepUnsolo']]) if (s[k] !== undefined) parts.push(...list(s[k]).map(id => t(key, { track: n(id) })));
  if (s.mask) parts.push(s.mask.mask === null || s.mask.mask === undefined ? t('stepNoMask', { track: n(s.mask.track) }) : t('stepMask', { track: n(s.mask.track), mask: s.mask.mask }));
  return parts.join(' · ');
}

// the rows after bar `rel` (strictly later), one per bar: [{ at, labels: [..], voices: [{ voice, text }] }], at most
// `max`. A bar with neither a labelled step nor a spoken line has no row (code-of-the-moment section steps). The
// steps' own "say" is not quoted: the words come from the schedule only, so a poetic image, a narrator that yields to
// the voice track or is off, and a line without a sample read as they sound.
export function nextRows(song, schedule, rel, max = 3) {
  const rows = new Map(), row = at => { if (!rows.has(at)) rows.set(at, { at, labels: [], voices: [] }); return rows.get(at); };
  for (const s of buildSteps(song)) if (s.at > rel) { const l = stepLabel(s, song); if (l && !row(s.at).labels.includes(l)) row(s.at).labels.push(l); }
  for (const x of schedule || []) if (x.at > rel && !row(x.at).voices.some(v => v.voice === x.voice && v.text === x.text)) row(x.at).voices.push({ voice: x.voice, text: x.text });
  return [...rows.values()].filter(r => r.labels.length || r.voices.length).sort((a, b) => a.at - b.at).slice(0, max);
}
