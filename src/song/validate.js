// Validates a v2 song. Errors make the song unusable; warnings point at likely mistakes.
// Each message has a JSON path, so a human or an agent can find the spot quickly.
import { KEYS, PROGS, METERS, meterSteps, BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS, GUITAR_TYPES, TEX_RHYTHMS, KITS, MODES, ROWS, LOOKS, WAVES } from '../music.js';
import { FORMAT, VERSION, TYPES, PATTERN_FIELDS, SETTING_FIELDS, VISUALS } from './format.js';
import { checkRack } from './rack.js';
import { checkBuild } from './build.js';
import { MACHINES } from '../sounds/machines.js';
// built-in synths of superdough (oscillators, noise, ZzFX)
const SYNTHS = ['sawtooth', 'saw', 'square', 'sqr', 'triangle', 'tri', 'sine', 'sin', 'supersaw', 'pulse', 'sbd', 'bytebeat', 'white', 'pink', 'brown', 'crackle', 'zzfx', 'z_sine', 'z_sawtooth', 'z_triangle', 'z_square', 'z_tan', 'z_noise'];

const PRESETS = { bass: BASS, arp: ARPS, hook: HOOKS, pad: PADS, guitar: GUITAR_PATTERNS };
const SECTION_FIELDS = ['name', 'bars', 'bpm', 'bpmEnd', 'key', 'chords', 'meter', 'swing', 'fade', 'crash', 'breath', 'fill'];
const ROW_IDS = ROWS.map(([id]) => id);
const isInt = v => Number.isInteger(v);
// top-level tokens of a mini-notation string: "a [b c] d" → ["a", "[b c]", "d"]
const topLevel = str => { const out = []; let depth = 0, cur = ''; for (const ch of str.trim()) { if ('[<'.includes(ch)) depth++; if (']>'.includes(ch)) depth--; if (ch === ' ' && !depth) { if (cur) out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; };
const isNum = v => typeof v === 'number' && Number.isFinite(v);

export function validateSong(song) {
  const errors = [], warnings = [];
  const err = (path, msg) => errors.push({ path, msg });
  const warn = (path, msg) => warnings.push({ path, msg });
  if (!song || typeof song !== 'object' || Array.isArray(song)) { err('', 'a song is a JSON object'); return { errors, warnings }; }
  if (song.format !== FORMAT) err('format', `must be "${FORMAT}"`);
  if (song.version !== VERSION) err('version', `must be ${VERSION}`);
  if (typeof song.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(song.id)) err('id', 'lowercase letters, digits and hyphens, for example "night-drive"');
  if (typeof song.title !== 'string' || !song.title.trim()) err('title', 'a non-empty string');
  if (song.look !== undefined && !LOOKS.some(([k]) => k === song.look)) warn('look', `unknown visual "${song.look}"; known: ${LOOKS.map(([k]) => k).join(', ')}`);

  // sections
  const secs = Array.isArray(song.sections) ? song.sections : [];
  if (!secs.length) err('sections', 'at least one section');
  const starts = []; let total = 0;
  secs.forEach((s, i) => {
    const p = `sections[${i}]`;
    starts.push(total);
    if (!s || typeof s !== 'object') { err(p, 'a section is an object'); return; }
    for (const k of Object.keys(s)) if (!SECTION_FIELDS.includes(k)) warn(`${p}.${k}`, `unknown field; section fields: ${SECTION_FIELDS.join(', ')}`);
    if (typeof s.name !== 'string' || !s.name.trim()) err(`${p}.name`, 'a non-empty string');
    if (!isInt(s.bars) || s.bars < 1 || s.bars > 256) err(`${p}.bars`, 'an integer from 1 to 256');
    else total += s.bars;
    if (s.bpm !== undefined && (!isNum(s.bpm) || s.bpm < 40 || s.bpm > 240)) err(`${p}.bpm`, 'a number from 40 to 240');
    if (s.bpmEnd !== undefined && s.bpmEnd !== null && (!isNum(s.bpmEnd) || s.bpmEnd < 40 || s.bpmEnd > 240)) err(`${p}.bpmEnd`, 'a number from 40 to 240, or null');
    if (s.key !== undefined && !KEYS.some(k => k[0] === s.key)) err(`${p}.key`, `one of ${KEYS.map(k => k[0]).join(' ')}`);
    if (s.chords !== undefined && !PROGS[s.chords]) err(`${p}.chords`, `a progression name: ${Object.keys(PROGS).join(', ')}`);
    if (s.meter !== undefined && !METERS.some(m => m[0] === s.meter)) err(`${p}.meter`, `one of ${METERS.map(m => m[0]).join(' ')}`);
    if (s.swing !== undefined && (!isNum(s.swing) || s.swing < 0 || s.swing > 1)) err(`${p}.swing`, 'a number from 0 to 1');
    if (s.fade !== undefined && (!isInt(s.fade) || s.fade < 0 || (isInt(s.bars) && s.fade > s.bars))) err(`${p}.fade`, 'an integer from 0 to the section bars');
    if (i === 0 && s.fade) warn(`${p}.fade`, 'the first section cannot fade in; ignored');
    for (const k of ['crash', 'breath', 'fill']) if (s[k] !== undefined && typeof s[k] !== 'boolean') err(`${p}.${k}`, 'true or false');
  });
  const names = secs.map(s => s && s.name);
  names.forEach((n, i) => { if (names.indexOf(n) !== i) warn(`sections[${i}].name`, `duplicate name "${n}": clips must refer to these sections by index`); });
  const sectionOf = ref => typeof ref === 'number' ? (isInt(ref) && ref >= 0 && ref < secs.length ? ref : -1) : names.indexOf(ref);

  // tracks
  const tracks = Array.isArray(song.tracks) ? song.tracks : [];
  if (!Array.isArray(song.tracks)) err('tracks', 'an array of tracks');
  const ids = new Set(), playing = Array(total).fill(0);
  tracks.forEach((tr, ti) => {
    const p = `tracks[${ti}]`;
    if (!tr || typeof tr !== 'object') { err(p, 'a track is an object'); return; }
    if (typeof tr.id !== 'string' || !tr.id) err(`${p}.id`, 'a non-empty string');
    else if (ids.has(tr.id)) err(`${p}.id`, `duplicate track id "${tr.id}"`);
    ids.add(tr.id);
    if (!TYPES.includes(tr.type)) { err(`${p}.type`, `one of ${TYPES.join(', ')}`); return; }
    checkSettings(tr.type, tr.settings || {}, `${p}.settings`, err, warn);
    if (tr.rack !== undefined) checkRack(tr.rack, `${p}.rack`, err, warn);
    for (const k of ['mute', 'solo']) if (tr[k] !== undefined && typeof tr[k] !== 'boolean') err(`${p}.${k}`, 'true or false');
    const pats = tr.patterns || {};
    if (typeof pats !== 'object' || Array.isArray(pats)) err(`${p}.patterns`, 'an object of named patterns, for example {"A": {...}}');
    for (const [k, pat] of Object.entries(pats)) checkPattern(tr.type, pat, `${p}.patterns.${k}`, err, warn);
    const spans = [];
    (Array.isArray(tr.clips) ? tr.clips : []).forEach((c, ci) => {
      const cp = `${p}.clips[${ci}]`;
      if (!c || typeof c !== 'object') { err(cp, 'a clip is an object'); return; }
      let start = c.start, bars = c.bars;
      if (c.section !== undefined) {
        const si = sectionOf(c.section);
        if (si < 0) { err(`${cp}.section`, `unknown section ${JSON.stringify(c.section)}; sections: ${names.join(', ')}`); return; }
        start = start ?? starts[si]; bars = bars ?? (starts[si] + secs[si].bars - start);
      }
      if (!isNum(start) || start < 0) { err(`${cp}.start`, 'a bar number from 0, or a "section"'); return; }
      if (!isNum(bars) || bars <= 0) { err(`${cp}.bars`, 'a positive number of bars'); return; }
      if (!isInt(start) || !isInt(bars)) err(cp, 'start and bars must be whole bars for now');
      if (start + bars > total) err(cp, `ends at bar ${start + bars}, after the song end (${total} bars)`);
      if (!pats[c.pattern]) err(`${cp}.pattern`, `unknown pattern ${JSON.stringify(c.pattern)}; patterns: ${Object.keys(pats).join(', ') || 'none'}`);
      if (c.set !== undefined) checkSettings(tr.type, c.set, `${cp}.set`, err, warn);
      const clash = spans.find(([a, b]) => start < b && a < start + bars);
      if (clash) err(cp, `overlaps another clip on track "${tr.id}" (bars ${clash[0] + 1}-${clash[1]}); use another track to layer them`);
      spans.push([start, start + bars]);
      for (let b = Math.max(0, start); b < Math.min(total, start + bars); b++) playing[b]++;
      // steps written for a meter: check against the sections the clip plays in
      const pat = pats[c.pattern] || {};
      secs.forEach((s, si) => {
        if (start >= starts[si] + s.bars || start + bars <= starts[si]) return;
        const n = meterSteps(s.meter || '4/4');
        const lens = [pat.steps, ...Object.values(pat.rows || {})].filter(x => typeof x === 'string' && x.length);
        if (lens.some(x => x.length !== n)) warn(cp, `steps are not ${n} long for section "${s.name}" (${s.meter || '4/4'}); they are cut or padded with rests`);
      });
    });
    if ((!Array.isArray(tr.clips) || !tr.clips.length) && tr.type !== 'voice') warn(`${p}.clips`, 'no clips: the track never plays');
  });
  const peak = Math.max(0, ...playing);
  if (peak > 15) warn('tracks', `${peak} tracks play at the same time; above about 15 the browser may drop notes`);
  else if (peak > 6) warn('tracks', `${peak} tracks play at the same time; the owner prefers 4 to 5 layers per section`);
  checkBuild(song, total, err, warn);
  return { errors, warnings };
}

function checkSettings(type, set, p, err, warn) {
  if (typeof set !== 'object' || Array.isArray(set)) { err(p, 'an object'); return; }
  const known = SETTING_FIELDS[type];
  for (const [k, v] of Object.entries(set)) {
    if (!known.includes(k)) { warn(`${p}.${k}`, `unknown setting for ${type}; settings: ${known.join(', ')}`); continue; }
    if (/^(gain|cutoff|drive|grit|room|delay|reso|fm|swing|hpf)$/.test(k) && !isNum(v)) err(`${p}.${k}`, 'a number');
    if (k === 'speed' && type === 'voice' && (!isNum(v) || v === 0 || Math.abs(v) > 4)) err(`${p}.speed`, 'a number from -4 to 4, not 0 (below 1 lowers the voice, below 0 plays it backwards)');
    if (/End$/.test(k) && v !== null && !isNum(v)) err(`${p}.${k}`, 'a number, or null for no automation');
    if (k === 'kit' && !MACHINES.includes(v)) warn(`${p}.kit`, `not a drum machine of tidal-drum-machines (see the Sounds tab, for example RolandTR909, LinnDrum, AkaiMPC60)`);
    if (k === 'wave' && typeof v === 'string' && !v.split(',').every(w => WAVES.some(([id]) => id === w) || /^gm_/.test(w) || SYNTHS.includes(w))) warn(`${p}.wave`, 'unknown sound; see the Sounds tab (General MIDI instruments start with gm_)');
    if (k === 'type' && type === 'guitar' && !GUITAR_TYPES[v]) err(`${p}.type`, `one of ${Object.keys(GUITAR_TYPES).join(', ')}`);
    if (k === 'mode' && !MODES.some(([m]) => m === v)) err(`${p}.mode`, `one of ${MODES.map(([m]) => m).join(', ')}`);
    if (k === 'visual' && !VISUALS.includes(v)) warn(`${p}.visual`, `the visuals know: ${VISUALS.join(', ')}`);
  }
}

function checkPattern(type, pat, p, err, warn) {
  if (!pat || typeof pat !== 'object' || Array.isArray(pat)) { err(p, 'a pattern is an object'); return; }
  for (const k of Object.keys(pat)) if (!PATTERN_FIELDS[type].includes(k)) warn(`${p}.${k}`, `unknown pattern field for ${type}; fields: ${PATTERN_FIELDS[type].join(', ') || 'none'}`);
  const steps = (v, path) => { if (typeof v !== 'string' || !/^[x.]+$/.test(v)) err(path, 'steps are a string of "x" (plays) and "." (rest), one per 16th, for example "x...x...x...x..."'); };
  if (type === 'drums') {
    if (!pat.rows || typeof pat.rows !== 'object') { err(`${p}.rows`, `an object of drum rows: ${ROW_IDS.join(', ')}`); return; }
    for (const [id, v] of Object.entries(pat.rows)) { if (!ROW_IDS.includes(id)) err(`${p}.rows.${id}`, `unknown row; rows: ${ROW_IDS.join(', ')}`); steps(v, `${p}.rows.${id}`); }
  }
  if (pat.steps !== undefined) steps(pat.steps, `${p}.steps`);
  if (pat.preset !== undefined && PRESETS[type] && !PRESETS[type][pat.preset]) err(`${p}.preset`, `unknown preset; presets: ${Object.keys(PRESETS[type]).join(', ')}`);
  if (pat.speed !== undefined && !['8', '16'].includes(pat.speed)) err(`${p}.speed`, '"8" or "16"');
  if (pat.rhythm !== undefined && !TEX_RHYTHMS[pat.rhythm]) err(`${p}.rhythm`, `one of ${Object.keys(TEX_RHYTHMS).join(', ')}`);
  if (pat.notes !== undefined) {
    const ok = typeof pat.notes === 'string' && (type === 'hook' ? /^[-\d~\s[\]<>]+$/ : /^[\d~\s[\]<>]+$/).test(pat.notes);
    if (!ok) err(`${p}.notes`, type === 'hook' ? 'scale degrees and rests, for example "0 ~ 2 4" (0 is the key note, negative numbers go below)' : 'chord tones 0 to 3 and rests, for example "0 ~ 2 3" (0 root, 1 third, 2 fifth, 3 top note)');
    else if (type !== 'hook' && /[4-9]/.test(pat.notes)) err(`${p}.notes`, 'chord tones go from 0 to 3');
    else {
      // notes per bar: hook 8 (8ths), arp 16 or 8 by speed, bass 16 (4/4); "<a b>" alternates bars, "[a b]" splits a note
      const per = type === 'hook' ? 8 : type === 'arp' && pat.speed === '8' ? 8 : 16;
      const bars = /^\s*<.*>\s*$/.test(pat.notes) ? topLevel(pat.notes.trim().slice(1, -1)).map(x => x.replace(/^\[(.*)\]$/, '$1')) : [pat.notes];
      if (bars.some(b => topLevel(b).length > per)) warn(`${p}.notes`, `${per} notes per bar in 4/4 for ${type}; extra notes are dropped (use [a b] to split one note in two, <[bar 1] [bar 2]> to alternate bars)`);
    }
  }
  if (type === 'code') {
    if (typeof pat.code !== 'string' || !pat.code.trim()) err(`${p}.code`, 'Strudel code for one pattern, for example note("a2 c3").s("sawtooth")');
    else if (/^\s*\$:|setcpm|setcps/m.test(pat.code)) err(`${p}.code`, 'one pattern only: no "$:", setcpm or setcps (tempo comes from the sections)');
  }
}
