// Live build: a song that starts from silence and builds itself while it plays, in the style of live-coding videos.
// A song may carry "build": a list of timed steps. Each step changes the song at a bar and can carry a short comment:
//   { "at": 8, "add": "bass", "say": "more bass" }
// The state at a bar is the song with every step up to that bar applied, so seeking, pausing and the code
// shown in the editor always agree. Tracks named by an "add" step are silent before it; the others play from the start.
import { SETTING_FIELDS, VOICE_DEFAULT } from './format.js';
import { DEVICES, checkRack, rackCode } from './rack.js';

export const BUILD_ACTIONS = ['add', 'remove', 'set', 'pattern', 'rack', 'unrack'];
const clone = o => JSON.parse(JSON.stringify(o));
const list = v => (Array.isArray(v) ? v : [v]);

// steps sorted by bar (the file order is kept for steps on the same bar)
export const buildSteps = song => (Array.isArray(song && song.build) ? song.build : [])
  .map((s, i) => ({ ...s, i })).filter(s => s && Number.isFinite(s.at)).sort((a, b) => a.at - b.at || a.i - b.i);
export const hasBuild = song => buildSteps(song).length > 0;

// the track a step works on (for comments in the code), or null
export function stepTrack(step) {
  for (const k of ['add', 'remove']) if (step[k] !== undefined) return list(step[k])[0];
  for (const k of ['set', 'pattern', 'rack', 'unrack']) if (step[k] && step[k].track) return step[k].track;
  return null;
}

// apply one step to a song (in place)
function apply(song, step) {
  const track = id => song.tracks.find(t => t.id === id);
  if (step.add !== undefined) list(step.add).forEach(id => { const t = track(id); if (t) delete t.mute; });
  if (step.remove !== undefined) list(step.remove).forEach(id => { const t = track(id); if (t) t.mute = true; });
  if (step.set) { const { track: id, ...vals } = step.set, t = track(id); if (t) t.settings = { ...t.settings, ...vals }; }
  if (step.pattern) { const t = track(step.pattern.track); if (t && t.patterns[step.pattern.to]) t.clips = t.clips.map(c => ({ ...c, pattern: step.pattern.to })); }
  if (step.rack) {
    const { track: id, ...dev } = step.rack, t = track(id);
    if (t) { const r = (t.rack || []).filter(d => d.device !== dev.device); t.rack = [...r, dev]; }
  }
  if (step.unrack) { const t = track(step.unrack.track); if (t) t.rack = (t.rack || []).filter(d => d.device !== step.unrack.device); }
}

// the song as it is at a bar: steps with "at" ≤ bar applied; "upTo" = number of steps applied
export function stateAt(song, bar) {
  const steps = buildSteps(song), out = clone({ ...song, build: undefined });
  const added = new Set(steps.flatMap(s => (s.add !== undefined ? list(s.add) : [])));
  out.tracks.forEach(t => { if (added.has(t.id)) t.mute = true; });
  let upTo = 0;
  for (const s of steps) { if (s.at > bar) break; apply(out, s); upTo++; }
  return { song: out, upTo };
}

// file name of a spoken comment: "Serve più ritmo!" → "serve_piu_ritmo"
export const saySlug = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
// "say" is a phrase, or one phrase per language: { "en": "more bass", "it": "più basso" }
export const sayText = (say, lang = 'en') => !say ? '' : typeof say === 'string' ? say : say[lang] || say.en || Object.values(say)[0] || '';
// comment shown at a bar: the latest step with "say" that is not older than "hold" bars
export function sayAt(song, bar, lang, hold = 4) {
  const s = buildSteps(song).filter(x => x.say && x.at <= bar && bar < x.at + hold).pop();
  return s ? sayText(s.say, lang) : '';
}
// the next step after a bar (strictly later), or null
export const nextStep = (song, bar) => buildSteps(song).find(s => s.at > bar) || null;

// compiled code of a state with the comment of its latest step written above the track it changes
export function annotate(code, song, upTo, lang) {
  const step = buildSteps(song)[upTo - 1];
  if (!step || !step.say) return code;
  const tr = stepTrack(step), t = tr && song.tracks.find(x => x.id === tr);
  const lines = code.split('\n');
  const head = t ? lines.findIndex(l => l.startsWith('// ==========') && l.includes(` ${t.name || t.id} `)) : -1;
  const at = head >= 0 ? head + 1 : Math.max(0, lines.findIndex(l => l.startsWith('// ==========')));
  lines.splice(at, 0, `// > ${sayText(step.say, lang)}`);
  return lines.join('\n');
}

// the voice track a step speaks with: the one named by "voice", otherwise the first voice track (none: default settings)
export const voiceOf = (song, step) => (song.tracks || []).find(t => t.type === 'voice' && (!step || !step.voice || t.id === step.voice)) || null;
const sampleIndex = (list, text) => list.findIndex(f => decodeURI(f).endsWith(`/${saySlug(text)}.wav`));
// every spoken comment of a song that has a sample: [{ s, n }], to load them before they play
export function voiceSamples(song, lang, files) {
  const bank = `say_${lang}`, list = (files || {})[bank] || [];
  return [...new Set(buildSteps(song).map(st => sampleIndex(list, sayText(st.say, lang))))].filter(n => n >= 0).map(n => ({ s: bank, n }));
}
// spoken comment of the latest step: a sample of public/samples/say_<lang>/ (tools/voice.mjs), played once on the
// step's bar with the settings and rack of its voice track (in "state": the song at that bar, so steps can change them).
// The volume is applied after the effects, so distortion does not make it louder.
// files: the custom samples manifest ({ say_en: ["say_en/more_bass.wav", …] }); no file, no voice
export function voiceCode(song, state, upTo, total, lang, files) {
  const step = buildSteps(song)[upTo - 1], text = step && sayText(step.say, lang);
  const bank = `say_${lang}`, list = (files || {})[bank];
  if (!text || !list) return '';
  const n = sampleIndex(list, text);
  if (n < 0) return '';
  const track = voiceOf(state, step);
  if (track && track.mute) return '';
  const v = { ...VOICE_DEFAULT, ...((track && track.settings) || {}) }, at = step.at, rest = total - at - 1;
  const lane = `<${at > 0 ? `0!${at} ` : ''}1${rest > 0 ? ` 0!${rest}` : ''}>`;
  const fx = (v.speed !== 1 ? `.speed(${v.speed})` : '') + (v.cutoff < 18000 ? `.lpf(${v.cutoff})` : '') + (v.hpf > 0 ? `.hpf(${v.hpf})` : '')
    + (v.drive > 0 ? `.distort(${v.drive})` : '') + (v.delay > 0 ? `.delay(${v.delay}).delaysync(0.1875).delayfeedback(0.4)` : '') + (v.room > 0 ? `.room(${v.room})` : '')
    + rackCode(track && track.rack, 'voice');
  const orbit = 15 + Math.max(0, (state.tracks || []).filter(t => t.type === 'voice').indexOf(track));
  return `\n// ========== ${track ? `${track.name || track.id} · voice` : 'voice'} ==========\n// "${text}", spoken on bar ${at + 1}\n$: s("${bank}").n(${n}).mask("${lane}")${fx}.postgain(${v.gain}).orbit(${orbit}).analyze("fx")`;
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
    for (const k of Object.keys(s)) if (!['at', 'say', 'voice', ...BUILD_ACTIONS].includes(k)) warn(`${p}.${k}`, `unknown field; step fields: at, say, voice, ${BUILD_ACTIONS.join(', ')}`);
    if (s.voice !== undefined) { const t = byId(s.voice); if (!t || t.type !== 'voice') err(`${p}.voice`, `a track of type voice; voice tracks: ${tracks.filter(x => x && x.type === 'voice').map(x => x.id).join(', ') || 'none'}`); }
    const phrases = s.say === undefined ? [] : typeof s.say === 'string' ? [s.say] : s.say && typeof s.say === 'object' ? Object.values(s.say) : [null];
    if (phrases.some(x => typeof x !== 'string' || !x.trim())) err(`${p}.say`, 'a short phrase, or one per language: { "en": "more bass", "it": "più basso" }');
    else if (phrases.some(x => x.length > 40)) warn(`${p}.say`, 'comments read best when very short (a few words)');
    if (!BUILD_ACTIONS.some(k => s[k] !== undefined) && !s.say) warn(p, `a step does nothing without one of ${BUILD_ACTIONS.join(', ')} or "say"`);
    for (const k of ['add', 'remove']) if (s[k] !== undefined) list(s[k]).forEach(id => needTrack(`${p}.${k}`, id));
    if (s.set) {
      const t = needTrack(`${p}.set.track`, s.set.track);
      if (t) for (const k of Object.keys(s.set)) if (k !== 'track' && !(SETTING_FIELDS[t.type] || []).includes(k)) err(`${p}.set.${k}`, `not a ${t.type} setting; settings: ${(SETTING_FIELDS[t.type] || []).join(', ')}`);
    }
    if (s.pattern) {
      const t = needTrack(`${p}.pattern.track`, s.pattern.track);
      if (t && !(t.patterns || {})[s.pattern.to]) err(`${p}.pattern.to`, `not a pattern of ${t.id}; patterns: ${Object.keys(t.patterns || {}).join(', ')}`);
    }
    if (s.rack) { needTrack(`${p}.rack.track`, s.rack.track); const { track, ...dev } = s.rack; checkRack([dev], `${p}.rack`, (q, m) => err(q.replace(`${p}.rack[0]`, `${p}.rack`), m), (q, m) => warn(q.replace(`${p}.rack[0]`, `${p}.rack`), m)); }
    if (s.unrack) { needTrack(`${p}.unrack.track`, s.unrack.track); if (!DEVICES[s.unrack.device]) err(`${p}.unrack.device`, `one of ${Object.keys(DEVICES).join(', ')}`); }
  });
}

// where each track is silent because of the build, and where a step changes it (for the timeline)
// → { trackId: { off: [[from, to], …], marks: [{ at, action, say }] } }
export function buildMap(song, total) {
  const steps = buildSteps(song), added = new Set(steps.flatMap(s => (s.add !== undefined ? list(s.add) : [])));
  const map = {};
  for (const t of song.tracks || []) {
    let on = !added.has(t.id), from = 0;
    const off = [], marks = [];
    for (const s of steps) {
      if (s.add !== undefined && list(s.add).includes(t.id) && !on) { if (s.at > from) off.push([from, s.at]); on = true; }
      if (s.remove !== undefined && list(s.remove).includes(t.id) && on) { from = s.at; on = false; }
      for (const k of ['set', 'pattern', 'rack', 'unrack']) if (s[k] && s[k].track === t.id) marks.push({ at: s.at, action: k, say: s.say });
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
  texture: { en: 'some dirt', it: "un po' di sporco" }, code: { en: 'something odd', it: 'qualcosa di strano' },
  less: { en: 'strip it back', it: 'togliamo qualcosa' }, breakdown: { en: 'breakdown', it: 'pausa' }, end: { en: 'winding down', it: 'chiudiamo' },
};
const PRIORITY = ['drums', 'bass', 'guitar', 'hook', 'arp', 'pad', 'riser', 'texture', 'code'];
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
