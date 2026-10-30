// Live build: a song that starts from silence and builds itself while it plays, in the style of live-coding videos.
// A song may carry "build": a list of timed steps. Each step changes the song at a bar and can carry a short comment:
//   { "at": 8, "add": "bass", "say": "more bass" }
// The state at a bar is the song with every step up to that bar applied, so seeking, pausing and the code
// shown in the editor always agree. Tracks named by an "add" step are silent before it; the others play from the start.
import { SETTING_FIELDS, VOICE_DEFAULT } from './format.js';
import { DEVICES, checkRack, rackCode } from './rack.js';
import { spokenBars, narratorStyle, poeticLine, movementLine, enteringTrack, placeSpoken, lineTexts, lineSounds, lineBank, withNarratorStyle, sampleSeconds, barSeconds, spokenContext } from './spoken.js';
import { kindOf, outranks, perBar, applyExclusive } from './speakers.js';

// hide and reveal (natural-growth): functions of a track left out of its code until a step brings them in
// clone, comment, notes (live-coder-growth): a track comes in as a copy of another one; functions commented out in the
// code and back in; a pattern's notes (or drum rows) rewritten
// variant (idea-model): a prepared variant of the track's ideas switched on (its line loses the "//") or off
// mute, unmute, solo, unsolo, mask (growth-shapes): a track's lines stay in the code muted with "_$:" or played alone
// with "S$:" (Strudel plays only the "S" lines while there are some); a mask idea per phrase ("<1 1 0 1>") on its lines
export const BUILD_ACTIONS = ['add', 'remove', 'set', 'pattern', 'rack', 'unrack', 'hide', 'reveal', 'clone', 'comment', 'notes', 'variant', 'mute', 'unmute', 'solo', 'unsolo', 'mask'];
const LINE_ACTIONS = ['mute', 'unmute', 'solo', 'unsolo'];
const clone = o => JSON.parse(JSON.stringify(o));
const CLONE_KEYS = ['wave', 'cutoff', 'reso', 'drive', 'gain', 'room', 'delay'];
const list = v => (Array.isArray(v) ? v : [v]);

// steps sorted by bar (the file order is kept for steps on the same bar)
export const buildSteps = song => (Array.isArray(song && song.build) ? song.build : [])
  .map((s, i) => ({ ...s, i })).filter(s => s && Number.isFinite(s.at)).sort((a, b) => a.at - b.at || a.i - b.i);
export const hasBuild = song => buildSteps(song).length > 0;

// the track a step works on (for comments in the code), or null
export function stepTrack(step) {
  for (const k of ['add', 'remove', ...LINE_ACTIONS]) if (step[k] !== undefined) return list(step[k])[0];
  for (const k of ['set', 'pattern', 'rack', 'unrack', 'hide', 'reveal', 'clone', 'comment', 'notes', 'variant', 'mask']) if (step[k] && step[k].track) return step[k].track;
  return null;
}

// apply one step to a song (in place)
export function applyStep(song, step) {
  const track = id => song.tracks.find(t => t.id === id);
  if (step.add !== undefined) list(step.add).forEach(id => { const t = track(id); if (t) delete t.mute; });
  if (step.remove !== undefined) list(step.remove).forEach(id => { const t = track(id); if (t) t.mute = true; });
  if (step.set) { const { track: id, ...vals } = step.set, t = track(id); if (t) t.settings = { ...t.settings, ...vals }; }
  if (step.pattern) {
    const p = step.pattern, t = track(p.track);
    // "level": every clip plays its own pattern's variant of that level (Crescendo, "A~2"), 0 = as written
    if (t && p.level !== undefined) t.clips = t.clips.map(c => { const base = String(c.pattern).replace(/~\w+$/, ''), v = `${base}~${p.level}`; return { ...c, pattern: p.level && t.patterns[v] ? v : base }; });
    else if (t && t.patterns[p.to]) t.clips = t.clips.map(c => ({ ...c, pattern: p.to }));
  }
  if (step.rack) {
    const { track: id, ...dev } = step.rack, t = track(id);
    if (t) { const r = (t.rack || []).filter(d => d.device !== dev.device); t.rack = [...r, dev]; }
  }
  if (step.unrack) { const t = track(step.unrack.track); if (t) t.rack = (t.rack || []).filter(d => d.device !== step.unrack.device); }
  if (step.hide) { const t = track(step.hide.track); if (t) t.hidden = [...new Set([...(t.hidden || []), ...list(step.hide.keys)])]; }
  if (step.reveal) { const t = track(step.reveal.track); if (t) { t.hidden = (t.hidden || []).filter(k => !list(step.reveal.keys).includes(k)); if (!t.hidden.length) delete t.hidden; } }
  // clone: the track plays, with the notes, the settings it shares and the functions shown of the "from" track
  if (step.clone) {
    const t = track(step.clone.track), f = track(step.clone.from);
    if (t && f) {
      delete t.mute;
      const fp = (f.patterns || {})[(f.clips[0] || {}).pattern] || {};
      if (fp.notes !== undefined) rewrite(t, { notes: fp.notes });
      // numbers and the wave only (presets mean different things per type), and only settings the track writes itself
      const shared = CLONE_KEYS.filter(k => (SETTING_FIELDS[t.type] || []).includes(k) && (SETTING_FIELDS[f.type] || []).includes(k) && k in (f.settings || {}) && k in (t.settings || {}) && !(t.pinned || []).includes(k));
      t.settings = { ...t.settings, ...Object.fromEntries(shared.map(k => [k, f.settings[k]])) };
      if (f.hidden && f.hidden.length) t.hidden = [...f.hidden]; else delete t.hidden;
    }
  }
  if (step.comment) { const t = track(step.comment.track); if (t) { const k = list(step.comment.keys); t.commented = step.comment.on === false ? (t.commented || []).filter(x => !k.includes(x)) : [...new Set([...(t.commented || []), ...k])]; if (!t.commented.length) delete t.commented; } }
  if (step.notes) { const { track: id, ...vals } = step.notes, t = track(id); if (t) rewrite(t, vals); }
  if (step.variant) { const t = track(step.variant.track); if (t) { if (Number.isInteger(step.variant.use)) t.variant = step.variant.use; else delete t.variant; } }
  // the line stays, muted (hush) or alone (S$:)
  if (step.mute !== undefined) list(step.mute).forEach(id => { const t = track(id); if (t) t.hush = true; });
  if (step.unmute !== undefined) list(step.unmute).forEach(id => { const t = track(id); if (t) delete t.hush; });
  if (step.solo !== undefined) list(step.solo).forEach(id => { const t = track(id); if (t) t.alone = true; });
  if (step.unsolo !== undefined) list(step.unsolo).forEach(id => { const t = track(id); if (t) delete t.alone; });
  if (step.mask) { const t = track(step.mask.track); if (t) { if (typeof step.mask.mask === 'string' && step.mask.mask) t.maskIdea = step.mask.mask; else delete t.maskIdea; } }
}
// a pattern rewritten: every clip plays a copy of its pattern ("A~x") with new notes, rows or steps
function rewrite(t, vals) {
  t.patterns = { ...(t.patterns || {}) };
  t.clips = t.clips.map(c => { const base = String(c.pattern).replace(/~\w+$/, ''), key = `${base}~x`; t.patterns[key] = { ...(t.patterns[c.pattern] || t.patterns[base] || {}), ...vals }; return { ...c, pattern: key }; });
}

// the song as it is at a bar: steps with "at" ≤ bar applied; "upTo" = number of steps applied
export function stateAt(song, bar) {
  const steps = buildSteps(song), out = clone({ ...song, build: undefined });
  const added = new Set(steps.flatMap(s => [...(s.add !== undefined ? list(s.add) : []), ...(s.clone ? [s.clone.track] : [])]));
  out.tracks.forEach(t => { if (added.has(t.id)) t.mute = true; });
  // settings fixed by the user ("pinned" on a track) win over the steps: they keep the track's own value
  const base = Object.fromEntries(out.tracks.map(t => [t.id, { ...(t.settings || {}) }]));
  let upTo = 0;
  for (const s of steps) { if (s.at > bar) break; applyStep(out, s); upTo++; }
  out.tracks.forEach(t => (t.pinned || []).forEach(k => { if (k in base[t.id]) t.settings[k] = base[t.id][k]; else if (t.settings) delete t.settings[k]; }));
  return { song: out, upTo };
}

// file name of a spoken comment: "Serve più ritmo!" → "serve_piu_ritmo"
export const saySlug = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
// "say" is a phrase, or one phrase per language: { "en": "more bass", "it": "più basso" }
export const sayText = (say, lang = 'en') => !say ? '' : typeof say === 'string' ? say : say[lang] || say.en || Object.values(say)[0] || '';
// settings of a track that steps change: { key: [bars from 0] }
export function stepKeys(song, trackId) {
  const out = {};
  for (const s of buildSteps(song)) if (s.set && s.set.track === trackId) for (const k of Object.keys(s.set)) if (k !== 'track') (out[k] = out[k] || []).push(s.at);
  return out;
}
// comment shown at a bar: the latest step with "say" that is not older than "hold" bars
export function sayAt(song, bar, lang, hold = 4) {
  const s = buildSteps(song).filter(x => x.say && x.at <= bar && bar < x.at + hold).pop();
  return s ? sayText(s.say, lang) : '';
}
// the step whose comment is said with the first `upTo` steps applied: the latest one with "say" on the bar of the latest
// step. Several steps may share a bar (the director puts its comment on the first move of a boundary, #81), so the
// latest step alone would leave the comment unsaid.
export function sayStep(steps, upTo) {
  const last = steps[upTo - 1];
  if (!last) return null;
  for (let i = upTo - 1; i >= 0 && steps[i].at === last.at; i--) if (steps[i].say) return steps[i];
  return null;
}
// the next step after a bar (strictly later), or null
export const nextStep = (song, bar) => buildSteps(song).find(s => s.at > bar) || null;

// compiled code of a state with the comment of its latest step written above the track it changes
// what a step does, in a few words, for the code comment of a listener's change: "add bass", "set pad cutoff 900"
const stepWords = s => {
  for (const k of ['add', 'remove']) if (s[k] !== undefined) return `${k} ${list(s[k]).join(' ')}`;
  if (s.set) { const { track, ...v } = s.set; return `set ${track} ${Object.entries(v).map(([k, x]) => `${k} ${x}`).join(' ')}`; }
  if (s.pattern) return `${s.pattern.track} pattern ${s.pattern.to ?? `level ${s.pattern.level}`}`;
  if (s.rack) return `${s.rack.track} + ${s.rack.device}`;
  if (s.unrack) return `${s.unrack.track} - ${s.unrack.device}`;
  if (s.reveal) return `${s.reveal.track} + ${list(s.reveal.keys).join(' ')}`;
  if (s.variant) return `${s.variant.track} variant ${s.variant.use ?? 'off'}`;
  for (const k of LINE_ACTIONS) if (s[k] !== undefined) return `${k} ${list(s[k]).join(' ')}`;
  if (s.mask) return `${s.mask.track} mask ${s.mask.mask ?? 'off'}`;
  return '';
};
export function annotate(code, song, upTo, lang) {
  const steps = buildSteps(song), step = steps[upTo - 1], said = sayStep(steps, upTo);
  if (!step || (!said && !steps.slice(0, upTo).some(x => x.at === step.at && x.by === 'listener'))) return code;
  // (the comment of the bar goes above the track of the step that says it)
  const tr = stepTrack(said || step), t = tr && song.tracks.find(x => x.id === tr);
  const lines = code.split('\n');
  const head = t ? lines.findIndex(l => l.startsWith('// ==========') && l.includes(` ${t.name || t.id} `)) : -1;
  const at = head >= 0 ? head + 1 : Math.max(0, lines.findIndex(l => l.startsWith('// ==========')));
  // the listener's changes from the radio console (#24) are marked "you:"
  // every listener's change on this bar, not only the last step applied
  const mine = steps.slice(0, upTo).filter(x => x.at === step.at && x.by === 'listener');
  const add = [...mine.map(x => `// you: ${stepWords(x)}`), said ? `// > ${sayText(said.say, lang)}` : null].filter(Boolean);
  lines.splice(at, 0, ...add);
  return lines.join('\n');
}

// the voice track a step speaks with: the one named by "voice", otherwise the first voice track (none: default settings)
// system voices that speak both English and Italian (macOS); '' is the default (Samantha, Alice)
export const SPEAKERS = ['eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley'];
// sample bank of a speaker: public/samples/say_<lang>[_<speaker>]/
export const sayBank = (lang, speaker) => (speaker ? `say_${lang}_${speaker}` : `say_${lang}`);
export const voiceOf = (song, step) => (song.tracks || []).find(t => t.type === 'voice' && (!step || !step.voice || t.id === step.voice)) || null;
const sampleIndex = (list, text) => list.findIndex(f => decodeURI(f).endsWith(`/${saySlug(text)}.wav`));
// every spoken comment of a song that has a sample: [{ s, n }], to load them before they play
export function voiceSamples(song, lang, files) {
  const out = new Map();
  const poetic = narratorStyle(song) === 'poetic';
  const steps = buildSteps(song);
  steps.forEach((st, i) => {
    // (a poetic narrator says images, and with Narrated growth the step lines or their movement images too)
    const texts = poetic ? [enteringTrack(song, st) ? sayText(poeticLine(song, st, i), lang) : '', narratedGrowth(song) && st.say ? stepSaid(song, steps, st, lang) : ''] : [st.say ? sayText(st.say, lang) : ''];
    for (const text of texts.filter(Boolean)) {
      const { bank, n } = lineSample(voiceOf(song, st), lang, files, text);
      if (n >= 0) out.set(`${bank}:${n}`, { s: bank, n });
    }
  });
  // the voice instrument's lines (voice-instrument)
  if ((song.tracks || []).some(t => t.type === 'spoken')) {
    for (const p of placeSpoken(song, lang)) for (const text of lineTexts(p.line, lang)) {
      for (const bank of [p.bank, sayBank(lang)]) { const n = sampleIndex((files || {})[bank] || [], text); if (n >= 0) { out.set(`${bank}:${n}`, { s: bank, n }); break; } }
    }
  }
  return [...out.values()];
}
// The sample of one narrator line (spoken-text-on-stage D10, per line): the speaker's own, else the default voice's
// sample of the same line (the speaker's sound settings still apply). → { bank, n, own } or { bank: the speaker's bank,
// n: -1 } without a sample. A fallback is noted once in the dev console (the visible side of #63).
const fellBack = new Set();
export function lineSample(track, lang, files, text) {
  const speaker = (track && track.settings && track.settings.speaker) || '', own = sayBank(lang, speaker);
  for (const bank of speaker ? [own, sayBank(lang)] : [own]) {
    const n = sampleIndex((files || {})[bank] || [], text);
    if (n < 0) continue;
    if (bank !== own && !fellBack.has(`${own}/${text}`)) { fellBack.add(`${own}/${text}`); try { console.info(`[voice] "${text}": no sample in ${own}, the default voice speaks it`); } catch (e) {} }
    return { bank, n, own: bank === own };
  }
  return { bank: own, n: -1, own: false };
}
// spoken comment of the latest step: a sample of public/samples/say_<lang>/ (tools/voice.mjs), played once on the
// step's bar with the settings and rack of its voice track (in "state": the song at that bar, so steps can change them).
// The volume is applied after the effects, so distortion does not make it louder.
// files: the custom samples manifest ({ say_en: ["say_en/more_bass.wav", …] }); no file, no voice
// voice-instrument: the poetic narrator speaks only where a track comes in, with a short image, in the bar before the
// entry when the code of the step before is still playing there (else on the entry's bar); the narrator yields to the
// voice instrument: a comment on a bar where a spoken line sounds is skipped (D5)
// (the narrator never announces the voice instrument: a step that brings in a spoken track is not narrated)
const entering = (song, step) => { const t = step && enteringTrack(song, step); return t && t.type !== 'spoken' ? t : null; };
const bringsSpoken = (song, step) => { const t = step && enteringTrack(song, step); return !!t && t.type === 'spoken'; };
// a growth that narrates its steps (Narrated growth, Crescendo and Live coder)
const narratedGrowth = song => !!(song && song.crescendo && song.crescendo.narrated);
// the words of a step with "say": its step line; with the poetic style and Narrated growth, a short image of movement
// when no step on its bar brings a track in (poetic-steps D1; an entry's bar keeps the step line, its image is said the
// bar before)
function stepSaid(song, steps, step, lang) {
  if (narratorStyle(song) === 'poetic' && narratedGrowth(song) && !steps.some(x => x.at === step.at && entering(song, x))) return sayText(movementLine(song, steps.indexOf(step)), lang);
  return sayText(step.say, lang);
}
function narration(song, upTo, lang) {
  const steps = buildSteps(song), step = steps[upTo - 1];
  if (narratorStyle(song) !== 'poetic') { const said = sayStep(steps, upTo), text = said && !bringsSpoken(song, said) && sayText(said.say, lang); return text ? [{ step: said, text, at: said.at }] : []; }
  // after-tests-oct28 D5: an image for every entry. This state's code plays from its bar `a` to the next step's bar
  // `b`; it says the image of each entry whose image bar falls there: the bar before the entry, or the entry's own bar
  // when the bar before is not the song's (its first bar: bar 0, or its start in the radio window, `song.start`). An
  // entry that shares its bar with other steps (a section step, the growth's steps) keeps its image; several entries on
  // one bar get one image, for the first of them
  const out = [], start = Number.isFinite(song.start) ? song.start : 0;
  const a = step ? step.at : start, later = steps.slice(upTo).find(x => x.at > a), b = later ? later.at : Infinity;
  const seen = new Set();
  steps.forEach((x, i) => {
    if (x.at < a || seen.has(x.at) || !entering(song, x)) return;
    const at = x.at - 1 >= start ? x.at - 1 : x.at;
    // (an entry on this state's own bar is said here only on the song's first bar; later ones were said the bar before)
    if (at < a || at >= b || (x.at === a && at !== a)) return;
    seen.add(x.at);
    out.push({ step: x, text: sayText(poeticLine(song, x, i), lang), at });
  });
  // Narrated growth with the poetic style (voice-full-controls D11): the step lines stay, the images come in addition;
  // on a shared bar the image is said and the step keeps its line on stage. A step whose bar has no entry says an image
  // of movement instead of its step line (poetic-steps)
  if (narratedGrowth(song)) {
    const said = sayStep(steps, upTo), text = said && !bringsSpoken(song, said) && stepSaid(song, steps, said, lang);
    // (the narrator says at most perBar lines on a bar: the registry's rule, D11)
    if (text && out.filter(x => x.at === said.at && x.text).length < perBar('narrator')) out.push({ step: said, text, at: said.at });
  }
  return out.filter(x => x.text);
}
// the narrator's lines in the code of a state (the first `upTo` steps applied): [{ at, voice: 'N', text, step, track,
// bank, n }], after the filters of the code: its voice track muted, a bar where the voice instrument sounds (the
// narrator yields), no sample. voiceCode writes these lines and spokenSchedule lists them, so they cannot disagree
// all: every line, also the ones without a sample (n: -1, the speaker's bank), for spokenNeeds (D9)
export function narratorLines(song, state, upTo, lang, files, all = false) {
  // (the registry's precedence, D11: the narrator yields on the bars where the voice track sounds)
  const spokenAt = outranks('voice', 'narrator') && (state.tracks || []).some(t => t.type === 'spoken') ? spokenBars(state, lang) : null;
  return narration(song, upTo, lang).flatMap(said => {
    const step = said.step, text = said.text, track = voiceOf(state, step);
    if (track && track.mute) return [];
    if (spokenAt && spokenAt.has(said.at)) return [];
    const { bank, n } = lineSample(track, lang, files, text);
    if (n < 0 && !all) return [];
    return [{ at: said.at, voice: 'N', text, step, track, bank, n }];
  });
}
export function voiceCode(song, state, upTo, total, lang, files) {
  return narratorLines(song, state, upTo, lang, files).map(({ at, text, track, bank, n }) => {
    const v = { ...VOICE_DEFAULT, ...((track && track.settings) || {}) }, rest = total - at - 1;
    const lane = `<${at > 0 ? `0!${at} ` : ''}1${rest > 0 ? ` 0!${rest}` : ''}>`;
    // speed changes length and pitch together; the phase vocoder (stretch) then moves the pitch alone to where it should be
    const f3 = x => Math.round(x * 1000) / 1000, shift = f3(v.pitch / v.tempo);
    const fx = (v.tempo !== 1 ? `.speed(${f3(v.tempo)})` : '') + (shift !== 1 ? `.stretch(${shift})` : '') + (v.cutoff < 18000 ? `.lpf(${v.cutoff})` : '') + (v.hpf > 0 ? `.hpf(${v.hpf})` : '')
      + (v.drive > 0 ? `.distort(${v.drive})` : '') + (v.delay > 0 ? `.delay(${v.delay}).delaysync(0.1875).delayfeedback(0.4)` : '') + (v.room > 0 ? `.room(${v.room})` : '')
      + rackCode(track && track.rack, 'voice');
    const orbit = 15 + Math.max(0, (state.tracks || []).filter(t => t.type === 'voice').indexOf(track));
    // a line played alone (S$:) silences the plain ones: the voice speaks alone with it
    const label = (state.tracks || []).some(t => t.alone && !t.mute) ? 'S$:' : '$:';
    return `\n// ========== ${track ? `${track.name || track.id} · voice` : 'voice'} ==========\n// "${text}", spoken on bar ${at + 1}\n${label} s("${bank}").n(${n}).mask("${lane}")${fx}.postgain(${v.gain}).orbit(${orbit}).analyze("fx")`;
  }).join('');
}
// What each voice says and where, over the whole song (after-tests-oct28 D2): [{ at, voice: 'N' | 'T', text, step?,
// track? }], sorted by bar, the narrator first. song: the live build as liveCode builds it (liveBuildOf: the narrator
// style of the controls and the code-of-the-moment steps); C: the controls (narrator off: no N). N: the narrator's lines
// of every state the code is written in (narratorLines). T: every start of every voice-track line with its texts joined
// by " · ", when the line has a sample (the samples of spokenContext, as the compiler) and its track sounds on that bar.
// opts.needSamples (spoken-text-on-stage D9): every line the code would say if every sample existed, without the
// sample filter (spokenNeeds). Each line also carries its bank; a voice-track line its way, clip (ci), offset (late, a
// fraction of a bar), length in beats and whether the listener typed it in the radio console (typed).
export function spokenSchedule(song, C = {}, lang = 'en', files = {}, opts = {}) {
  const all = !!(opts && opts.needSamples);
  const s = withNarratorStyle(song, C && C.narratorStyle), out = [], seen = new Set();
  const steps = buildSteps(s), states = new Map();
  const state = bar => { if (!states.has(bar)) states.set(bar, stateAt(s, bar)); return states.get(bar); };
  if (!C || C.narrator !== false) {
    for (const bar of [...new Set([0, ...steps.map(x => x.at)])].sort((a, b) => a - b)) {
      const st = state(bar);
      for (const x of narratorLines(s, st.song, st.upTo, lang, files, all)) {
        const k = `${x.at}|${x.text}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ at: x.at, voice: 'N', text: x.text, step: x.step, track: x.track ? x.track.id : null, bank: x.bank, ...(all ? { texts: [x.text] } : {}) });
      }
    }
  }
  if ((s.tracks || []).some(t => t.type === 'spoken')) {
    for (const p of placeSpoken(s, lang)) {
      if (!all && !lineSounds(p)) continue;
      for (const st of p.starts) {
        const tracks = state(st.bar).song.tracks, tr = tracks.find(x => x.id === p.track), solo = tracks.some(x => x.alone && !x.mute);
        if (!tr || tr.mute || tr.hush || (solo && !tr.alone)) continue;
        out.push({ at: st.bar, voice: 'T', text: p.texts.join(' · '), track: p.track, bank: (!all && lineBank(p.texts[0], p.bank)) || p.bank, way: p.way, ci: p.ci, late: st.late || 0, beats: p.beats, typed: !!(p.pat && p.pat.typed), ...(all ? { texts: p.texts } : {}) });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at || (a.voice === b.voice ? 0 : a.voice === 'N' ? -1 : 1));
}
// Every line a song would speak if every sample existed (D9): [{ at, voice, text, bank, lang, speaker, has }], one per
// sample (a voice-track line of several entries gives one per entry), first lines first. has: the speaker's own sample
// exists on this machine (a line the default voice speaks in its place still counts as missing for the speaker). The
// same function as spokenSchedule with its needSamples switch, so the two lists cannot drift.
export function spokenNeeds(song, C = {}, lang = 'en', files = {}) {
  const out = [], seen = new Set();
  for (const x of spokenSchedule(song, C, lang, files, { needSamples: true })) {
    for (const text of x.texts || [x.text]) {
      const k = `${x.bank}/${saySlug(text)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const has = sampleIndex((files || {})[x.bank] || [], text) >= 0;
      out.push({ at: x.at, voice: x.voice, text, bank: x.bank, lang, speaker: x.bank.slice(`say_${lang}`.length + 1), has });
    }
  }
  return out;
}

// The captions of a song (spoken-text-on-stage D1): what is heard, from spokenSchedule, with its speaker and how long it
// shows: [{ at, until, kind, code, text, step, typed, track, way, seconds }] in bars (at carries a voice-track line's
// offset), sorted by start. until: the sample's length (lengths: { "bank/slug.wav": seconds }, say_lengths.json) plus
// 1.5 s, at least 2 s, at most 4 bars, cut by the next caption of the same speaker; without a measured length, 2 bars.
// A chopped line shows once per clip, held for the clip; a refrain shows at each repeat. step: the step line of the
// caption's bar (the tag of D2), '' when there is none. The step lines follow as entries of kind "step" (4 bars each;
// heard: a narrator caption says the same words), for the tag and the old behaviour; none with the narrator off.
// opts.schedule: a spokenSchedule already made (the radio's Coming next keeps one).
// the speaker of a sample bank ('' the default voice): "say_it_reed" → "reed"
const speakerOfBank = bank => String(bank || '').replace(/^say_[a-z]+_?/, '');
export function captionSchedule(song, C = {}, lang = 'en', files = {}, lengths = spokenContext.lengths, opts = {}) {
  const s = withNarratorStyle(song, C && C.narratorStyle);
  const sched = (opts && opts.schedule) || spokenSchedule(song, C, lang, files);
  const steps = buildSteps(s).filter(x => x.say);
  const stepAt = bar => { const st = steps.filter(x => x.at <= bar && bar < x.at + 4).pop(); return st ? sayText(st.say, lang) : ''; };
  const out = [], chops = new Map();
  for (const x of sched) {
    const kind = kindOf(x.voice);
    if (!kind) continue;
    if (x.way === 'chop') {
      // (a chop: one caption per clip, from its first bar to the clip's last)
      const k = `${x.track}|${x.ci}`, c = chops.get(k);
      if (c) { c.until = Math.max(c.until, x.at + 1); continue; }
      const e = { at: x.at, until: x.at + 1, kind, code: x.voice, text: x.text, step: stepAt(x.at), typed: !!x.typed, track: x.track || null, way: 'chop', seconds: null, hold: true, speaker: speakerOfBank(x.bank) };
      chops.set(k, e); out.push(e);
      continue;
    }
    const at = x.at + (x.late || 0), bs = barSeconds(s, x.at), texts = x.text.split(' · ');
    // the sample's length: measured; a line of several entries one beat apart: its length in beats
    const len = texts.length > 1 && Number.isFinite(x.beats) ? x.beats * bs / 4 : sampleSeconds(texts[0], x.bank, lengths);
    const hold = len === null ? 2 : Math.min(4, Math.max(2, len + 1.5) / bs);
    out.push({ at, until: at + hold, kind, code: x.voice, text: x.text, step: stepAt(x.at), typed: !!x.typed, track: x.track || null, way: x.way || null, seconds: len, speaker: speakerOfBank(x.bank) });
  }
  out.sort((a, b) => a.at - b.at);
  // (cut by the next caption of the same speaker; a chop holds for its clip)
  out.forEach((x, i) => { const nx = out.slice(i + 1).find(y => y.kind === x.kind && y.at > x.at); if (nx && !x.hold && nx.at < x.until) x.until = nx.at; });
  const lines = applyExclusive(out);
  // the step lines (D2)
  if (!C || C.narrator !== false) for (const st of steps) {
    const text = sayText(st.say, lang);
    if (!text) continue;
    const heard = lines.some(x => x.kind === 'narrator' && x.text === text && x.at >= st.at - 1 && x.at < st.at + 4);
    lines.push({ at: st.at, until: st.at + 4, kind: 'step', code: null, text, step: text, heard, typed: false, track: null, way: null, seconds: null });
  }
  return lines.sort((a, b) => a.at - b.at || (a.kind === 'step' ? 1 : 0) - (b.kind === 'step' ? 1 : 0));
}
// Where the narrator speaks, for the Compose timeline (narrator-ghost-row D2): [{ at, text, track }] from spokenSchedule,
// so the marks are what is heard (the poetic images, no line where the voice instrument speaks, none from a muted
// narrator track, none without a sample). The narrator switched off is counted as on: its dimmed row still shows where
// it would speak. track: the narrator track's id, null when the song has none (the ghost row).
export function narratorMarks(song, C = {}, lang = 'en', files = {}) {
  return spokenSchedule(song, { ...(C || {}), narrator: true }, lang, files).filter(x => x.voice === 'N').map(({ at, text, track }) => ({ at, text, track }));
}

// checks for the "build" list; err/warn take (path, message)
export function checkBuild(song, total, err, warn) {
  if (song.voice !== undefined) warn('voice', 'voice settings now live on a track of type "voice"; this field is ignored');
  if (song.build === undefined) return;
  if (!Array.isArray(song.build)) { err('build', 'an array of steps, for example [{ "at": 4, "add": "bass", "say": "more bass" }]'); return; }
  const tracks = Array.isArray(song.tracks) ? song.tracks : [];
  const byId = id => tracks.find(t => t && t.id === id);
  const needTrack = (p, id) => { if (!byId(id)) err(p, `unknown track "${id}"; tracks: ${tracks.map(t => t && t.id).join(', ')}`); return byId(id); };
  song.build.forEach((s, i) => {
    const p = `build[${i}]`;
    if (!s || typeof s !== 'object') { err(p, 'a step is an object'); return; }
    if (!Number.isFinite(s.at) || s.at < 0 || (total && s.at >= total)) err(`${p}.at`, `a bar from 0 to ${Math.max(0, total - 1)}`);
    for (const k of Object.keys(s)) if (!['at', 'say', 'voice', 'by', ...BUILD_ACTIONS].includes(k)) warn(`${p}.${k}`, `unknown field; step fields: at, say, voice, by, ${BUILD_ACTIONS.join(', ')}`);
    if (s.by !== undefined && s.by !== 'listener') warn(`${p}.by`, 'only "listener" (a change made by the person listening to the radio)');
    if (s.voice !== undefined) { const t = byId(s.voice); if (!t || t.type !== 'voice') err(`${p}.voice`, `a track of type voice; voice tracks: ${tracks.filter(x => x && x.type === 'voice').map(x => x.id).join(', ') || 'none'}`); }
    const phrases = s.say === undefined ? [] : typeof s.say === 'string' ? [s.say] : s.say && typeof s.say === 'object' ? Object.values(s.say) : [null];
    if (phrases.some(x => typeof x !== 'string' || !x.trim())) err(`${p}.say`, 'a short phrase, or one per language: { "en": "more bass", "it": "più basso" }');
    else if (phrases.some(x => x.length > 40)) warn(`${p}.say`, 'comments read best when very short (a few words)');
    if (!BUILD_ACTIONS.some(k => s[k] !== undefined) && !s.say) warn(p, `a step does nothing without one of ${BUILD_ACTIONS.join(', ')} or "say"`);
    for (const k of ['add', 'remove', ...LINE_ACTIONS]) if (s[k] !== undefined) list(s[k]).forEach(id => needTrack(`${p}.${k}`, id));
    if (s.mask) { needTrack(`${p}.mask.track`, s.mask.track); if (s.mask.mask !== null && (typeof s.mask.mask !== 'string' || !/^<[01 ]+>$/.test(s.mask.mask))) err(`${p}.mask.mask`, 'a mask per phrase, ones and zeros, for example "<1 1 0 1>", or null to take it away'); }
    if (s.set) {
      const t = needTrack(`${p}.set.track`, s.set.track);
      if (t) for (const k of Object.keys(s.set)) if (k !== 'track' && !(SETTING_FIELDS[t.type] || []).includes(k)) err(`${p}.set.${k}`, `not a ${t.type} setting; settings: ${(SETTING_FIELDS[t.type] || []).join(', ')}`);
    }
    if (s.pattern) {
      const t = needTrack(`${p}.pattern.track`, s.pattern.track);
      if (s.pattern.level !== undefined) { if (!Number.isInteger(s.pattern.level) || s.pattern.level < 0) err(`${p}.pattern.level`, 'a whole number from 0 (0: the written patterns, 1 and up: their variants "A~1", "A~2"…)'); }
      else if (t && !(t.patterns || {})[s.pattern.to]) err(`${p}.pattern.to`, `not a pattern of ${t.id}; patterns: ${Object.keys(t.patterns || {}).join(', ')}`);
    }
    if (s.rack) { needTrack(`${p}.rack.track`, s.rack.track); const { track, ...dev } = s.rack; checkRack([dev], `${p}.rack`, (q, m) => err(q.replace(`${p}.rack[0]`, `${p}.rack`), m), (q, m) => warn(q.replace(`${p}.rack[0]`, `${p}.rack`), m)); }
    if (s.unrack) { needTrack(`${p}.unrack.track`, s.unrack.track); if (!DEVICES[s.unrack.device]) err(`${p}.unrack.device`, `one of ${Object.keys(DEVICES).join(', ')}`); }
    if (s.clone) { needTrack(`${p}.clone.track`, s.clone.track); needTrack(`${p}.clone.from`, s.clone.from); }
    if (s.comment) { needTrack(`${p}.comment.track`, s.comment.track); if (!list(s.comment.keys).every(x => ['cutoff', 'reso', 'drive', 'grit', 'room', 'delay', 'env'].includes(x))) err(`${p}.comment.keys`, 'some of cutoff, reso, drive, grit, room, delay, env'); }
    if (s.notes) { const t = needTrack(`${p}.notes.track`, s.notes.track); for (const k of Object.keys(s.notes)) if (!['track', 'notes', 'rows', 'steps', 'idea'].includes(k)) err(`${p}.notes.${k}`, 'notes, rows (drums), steps or idea'); if (t && s.notes.rows !== undefined && t.type !== 'drums') err(`${p}.notes.rows`, 'rows are for drums'); }
    if (s.variant) {
      const t = needTrack(`${p}.variant.track`, s.variant.track), u = s.variant.use;
      const most = t ? Math.max(0, ...Object.values(t.patterns || {}).map(x => (x && x.idea && Array.isArray(x.idea.variants) ? x.idea.variants.length : 0))) : 0;
      if (u !== null && (!Number.isInteger(u) || u < 0)) err(`${p}.variant.use`, 'the index of a prepared variant (from 0), or null to switch it off');
      else if (t && u !== null && u >= most) err(`${p}.variant.use`, most ? `the track's ideas prepare ${most} variant(s): 0 to ${most - 1}` : `track "${t.id}" has no idea with prepared variants`);
    }
    for (const k of ['hide', 'reveal']) if (s[k]) { needTrack(`${p}.${k}.track`, s[k].track); if (!list(s[k].keys).every(x => ['cutoff', 'reso', 'drive', 'grit', 'room', 'delay', 'env'].includes(x))) err(`${p}.${k}.keys`, 'some of cutoff, reso, drive, grit, room, delay, env'); }
  });
}

// where each track is silent because of the build, and where a step changes it (for the timeline)
// → { trackId: { off: [[from, to], …], marks: [{ at, action, say }] } }
export function buildMap(song, total) {
  const steps = buildSteps(song), added = new Set(steps.flatMap(s => [...(s.add !== undefined ? list(s.add) : []), ...(s.clone ? [s.clone.track] : [])]));
  const map = {};
  for (const t of song.tracks || []) {
    let on = !added.has(t.id), from = 0;
    const off = [], marks = [];
    for (const s of steps) {
      if (s.add !== undefined && list(s.add).includes(t.id) && !on) { if (s.at > from) off.push([from, s.at]); on = true; }
      if (s.remove !== undefined && list(s.remove).includes(t.id) && on) { from = s.at; on = false; }
      for (const k of ['set', 'pattern', 'rack', 'unrack', 'reveal', 'variant']) if (s[k] && s[k].track === t.id) marks.push({ at: s.at, action: k, say: s.say });
      if (t.type === 'voice' && s.say && voiceOf(song, s) === t) marks.push({ at: s.at, action: 'say', say: s.say });
    }
    if (!on && total > from) off.push([from, total]);
    map[t.id] = { off, marks };
  }
  return map;
}

// steps for a song that has none: each track comes in where its clips start and leaves where they stop,
// with a short comment. Only add and remove at clip edges, so the song sounds exactly as written.
export const PHRASES = {
  start: { en: "let's go", it: 'si parte' },
  drums: { en: 'more rhythm', it: 'serve più ritmo' }, bass: { en: 'need bass', it: 'serve il basso' },
  guitar: { en: 'guitars!', it: 'chitarre!' }, hook: { en: 'melody!', it: 'melodia!' }, arp: { en: 'now the arp', it: "ora l'arpeggio" },
  pad: { en: 'some warmth', it: "un po' di calore" }, riser: { en: 'here it comes', it: 'sta arrivando' },
  texture: { en: 'some dirt', it: "un po' di sporco" }, code: { en: 'something odd', it: 'qualcosa di strano' }, spoken: { en: 'a voice', it: 'una voce' },
  less: { en: 'strip it back', it: 'togliamo qualcosa' }, breakdown: { en: 'breakdown', it: 'pausa' }, end: { en: 'winding down', it: 'chiudiamo' },
};
const PRIORITY = ['drums', 'bass', 'guitar', 'hook', 'arp', 'pad', 'riser', 'texture', 'code', 'spoken'];
export function deriveBuild(song) {
  const secs = song.sections || [], total = secs.reduce((a, s) => a + (s.bars || 0), 0);
  const startOf = ref => { const i = typeof ref === 'number' ? ref : secs.findIndex(s => s.name === ref); return secs.slice(0, i).reduce((a, s) => a + s.bars, 0); };
  const barsOf = ref => { const i = typeof ref === 'number' ? ref : secs.findIndex(s => s.name === ref); return secs[i] ? secs[i].bars : 0; };
  const events = new Map(), ev = bar => { if (!events.has(bar)) events.set(bar, { add: [], remove: [], types: [] }); return events.get(bar); };
  for (const t of song.tracks || []) {
    if (t.mute) continue;
    const spans = (t.clips || []).map(c => {
      const a = c.start ?? startOf(c.section), b = a + (c.bars ?? (c.section !== undefined ? startOf(c.section) + barsOf(c.section) - a : 0));
      return [a, b];
    }).filter(([a, b]) => b > a)
      // a clip ending where a section with "fade" starts keeps sounding during the fade: leave it in until then
      .map(([a, b]) => { const i = secs.findIndex((_, k) => k > 0 && startOf(k) === b); return [a, i > 0 ? b + Math.min(secs[i].fade || 0, secs[i].bars) : b]; })
      .sort((x, y) => x[0] - y[0]);
    const merged = [];
    for (const [a, b] of spans) { const last = merged[merged.length - 1]; if (last && a <= last[1]) last[1] = Math.max(last[1], b); else merged.push([a, b]); }
    for (const [a, b] of merged) { const e = ev(a); e.add.push(t.id); e.types.push(t.type); if (b < total) ev(b).remove.push(t.id); }
  }
  return [...events.entries()].sort((x, y) => x[0] - y[0]).map(([at, e]) => {
    const step = { at };
    if (e.add.length) step.add = e.add;
    if (e.remove.length) step.remove = e.remove;
    const type = PRIORITY.find(p => e.types.includes(p));
    step.say = at === 0 ? PHRASES.start : e.add.length ? PHRASES[type] || PHRASES.code : secs.length > 1 && at >= startOf(secs.length - 1) ? PHRASES.end : e.remove.length > 1 ? PHRASES.breakdown : PHRASES.less;
    return step;
  });
}
