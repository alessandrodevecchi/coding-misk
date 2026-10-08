// Song format v2: sections, a free list of tracks, patterns per track, clips in bars.
// Reference: docs/SONG-FORMAT.md. Used by the app, the compiler and tools/song.mjs.
import { DEFAULT, ROWS, cloneState, normalizeState } from '../music.js';

export const FORMAT = 'coding-misk/song';
export const VERSION = 2;

// Song library tags (#34): a fixed, broad list of genres. Every style recipe declares one of them;
// a song's genres are those of its styles plus the ones it names itself. Names are in src/i18n.js.
export const GENRES = ['techno', 'trance', 'house', 'synthwave', 'drum-and-bass', 'industrial', 'rock', 'metal', 'hip-hop', 'pop', 'jazz', 'country', 'ambient', 'experimental'];
export const TAG_KINDS = ['genres', 'styles', 'free'];
// where a song comes from: "endless" for songs made by the director (kept when saved from the radio)
export const ORIGINS = ['endless'];

// Fields that belong to the pattern (what and when a track plays); everything else in the
// channel state is a track setting (how it sounds). Guitar keeps its preset in `pattern`.
export const PATTERN_FIELDS = {
  drums: ['rows'],
  bass: ['preset', 'steps', 'notes'],
  guitar: ['preset', 'steps'],
  arp: ['preset', 'speed', 'steps', 'notes'],
  hook: ['preset', 'steps', 'notes'],
  pad: ['preset', 'steps'],
  texture: ['rhythm'],
  riser: [],
  code: ['code'],
  voice: [],
};
export const TYPES = Object.keys(PATTERN_FIELDS);
// a voice track speaks the comments of a live build: these are its settings
// pitch and tempo are independent: tempo 0.5 lasts twice as long at the same pitch, pitch 2 is an octave up at the same length
// speaker: '' is the default system voice, or one of SPEAKERS (song/build.js): samples in say_<lang>_<speaker>/
export const VOICE_DEFAULT = { gain: 0.6, pitch: 1, tempo: 1, cutoff: 18000, hpf: 0, drive: 0, room: 0.2, delay: 0, speaker: '' };
const STATE_KEY = { guitar: { preset: 'pattern' } };
const stateKey = (type, k) => (STATE_KEY[type] && STATE_KEY[type][k]) || k;
const skip = new Set(['on', 'rows']);
// settings of a type: the channel fields that are not pattern fields
export const SETTING_FIELDS = Object.fromEntries(TYPES.map(type => {
  if (type === 'code') return [type, ['visual']];
  if (type === 'voice') return [type, Object.keys(VOICE_DEFAULT)];
  const pat = new Set(PATTERN_FIELDS[type].map(k => stateKey(type, k)));
  return [type, Object.keys(DEFAULT[type]).filter(k => !skip.has(k) && !pat.has(k))];
}));
export const SECTION_DEFAULTS = { bpm: DEFAULT.bpm, bpmEnd: null, key: DEFAULT.key, chords: DEFAULT.prog, meter: DEFAULT.meter, swing: 0, fade: 0, crash: false, breath: false, fill: false };
// visuals know these instrument names (Stage, levels, logo)
export const VISUALS = ['kick', 'snare', 'hats', 'bass', 'guitar', 'arp', 'hook', 'pad', 'fx', 'riser'];

// channel state of a v1 scene → pattern object (empty fields left out)
function patternOf(type, ch) {
  if (type === 'drums') {
    const rows = {};
    for (const [id] of ROWS) if (!ch.rows[id].mute && ch.rows[id].steps.includes('x')) rows[id] = ch.rows[id].steps;
    return { rows };
  }
  const p = {};
  for (const k of PATTERN_FIELDS[type]) { const v = ch[stateKey(type, k)]; if (v !== '' && v !== undefined) p[k] = v; }
  return p;
}
const settingsOf = (type, ch) => Object.fromEntries(SETTING_FIELDS[type].map(k => [k, ch[k] ?? null]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// v1 track (scenes with a full state each, as saved by older versions of the app) → v2 song.
// Lossless: it compiles to the same layers as the scene compiler did.
export function fromScenes(track) {
  const scenes = track.scenes.map(s => ({ ...s, state: normalizeState(s.state) }));
  const sections = scenes.map(s => {
    const st = s.state, sec = { name: s.name, bars: s.bars, bpm: st.bpm };
    if (st.bpmEnd !== null && st.bpmEnd !== undefined) sec.bpmEnd = st.bpmEnd;
    Object.assign(sec, { key: st.key, chords: st.prog, meter: st.meter });
    if (st.swing) sec.swing = st.swing;
    if (s.fade) sec.fade = s.fade;
    for (const k of ['crash', 'breath', 'fill']) if (s[k]) sec[k] = true;
    return sec;
  });
  // clips refer to sections by name, or by index when two sections share a name
  const names = sections.map(s => s.name), byIndex = new Set(names).size !== names.length;
  const tracks = [];
  for (const type of ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture', 'riser']) {
    const patterns = {}, clips = [];
    let settings = null;
    scenes.forEach((s, i) => {
      const ch = s.state[type];
      if (!ch.on) return;
      const pat = patternOf(type, ch);
      let key = Object.keys(patterns).find(k => same(patterns[k], pat));
      if (!key) { key = String.fromCharCode(65 + Object.keys(patterns).length); patterns[key] = pat; }
      const set = settingsOf(type, ch);
      if (!settings) settings = set;
      const diff = Object.fromEntries(Object.entries(set).filter(([k, v]) => !same(v, settings[k])));
      const clip = { section: byIndex ? i : s.name, pattern: key };
      if (Object.keys(diff).length) clip.set = diff;
      clips.push(clip);
    });
    if (clips.length) tracks.push({ id: type, type, settings, patterns, clips });
  }
  const song = { format: FORMAT, version: VERSION, id: track.id, title: track.title };
  if (track.look) song.look = track.look;
  if (track.style) song.style = track.style;
  return { ...song, sections, tracks };
}

// resolves defaults, section positions and clip positions; throws on unknown references
export function normalizeSong(song) {
  const sections = [];
  let pos = 0;
  for (const s of song.sections || []) { const sec = { ...SECTION_DEFAULTS, ...s, start: pos }; sections.push(sec); pos += sec.bars; }
  const total = pos;
  const findSection = ref => typeof ref === 'number' ? sections[ref] : sections.find(s => s.name === ref);
  const tracks = (song.tracks || []).map((tr, ti) => {
    const clips = (tr.clips || []).map((c, ci) => {
      let start = c.start, bars = c.bars;
      if (c.section !== undefined) {
        const sec = findSection(c.section);
        if (!sec) throw new Error(`tracks[${ti}].clips[${ci}]: unknown section ${JSON.stringify(c.section)}`);
        start = start ?? sec.start; bars = bars ?? (sec.start + sec.bars - start);
      }
      return { ...c, start, bars };
    }).sort((a, b) => a.start - b.start);
    return { name: tr.id, settings: {}, patterns: {}, ...tr, clips };
  });
  return { ...song, sections, tracks, total };
}

// state for one clip inside one section: section harmony + track settings + clip overrides + pattern
export function clipState(sec, tr, clip) {
  const st = cloneState(DEFAULT);
  Object.assign(st, { bpm: sec.bpm, bpmEnd: sec.bpmEnd, key: sec.key, prog: sec.chords, meter: sec.meter, swing: sec.swing });
  const type = tr.type, pat = (tr.patterns || {})[clip.pattern] || {};
  if (type === 'code' || type === 'voice') return st;
  const ch = { ...DEFAULT[type], ...tr.settings, ...(clip.set || {}), on: true };
  if (type === 'drums') ch.rows = Object.fromEntries(ROWS.map(([id]) => [id, { steps: (pat.rows || {})[id] || '', mute: !(pat.rows || {})[id] }]));
  else for (const k of PATTERN_FIELDS[type]) if (pat[k] !== undefined) ch[stateKey(type, k)] = pat[k];
  st[type] = ch;
  return st;
}
