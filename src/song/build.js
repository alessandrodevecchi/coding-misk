// Live build: a song that starts from silence and builds itself while it plays, in the style of live-coding videos.
// A song may carry "build": a list of timed steps. Each step changes the song at a bar and can carry a short comment:
//   { "at": 8, "add": "bass", "say": "more bass" }
// The state at a bar is the song with every step up to that bar applied, so seeking, pausing and the code
// shown in the editor always agree. Tracks named by an "add" step are silent before it; the others play from the start.
import { SETTING_FIELDS } from './format.js';
import { DEVICES, checkRack } from './rack.js';

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

// checks for the "build" list; err/warn take (path, message)
export function checkBuild(song, total, err, warn) {
  if (song.build === undefined) return;
  if (!Array.isArray(song.build)) { err('build', 'an array of steps, for example [{ "at": 4, "add": "bass", "say": "more bass" }]'); return; }
  const tracks = Array.isArray(song.tracks) ? song.tracks : [];
  const byId = id => tracks.find(t => t && t.id === id);
  const needTrack = (p, id) => { if (!byId(id)) err(p, `unknown track "${id}"; tracks: ${tracks.map(t => t && t.id).join(', ')}`); return byId(id); };
  song.build.forEach((s, i) => {
    const p = `build[${i}]`;
    if (!s || typeof s !== 'object') { err(p, 'a step is an object'); return; }
    if (!Number.isFinite(s.at) || s.at < 0 || (total && s.at >= total)) err(`${p}.at`, `a bar from 0 to ${Math.max(0, total - 1)}`);
    for (const k of Object.keys(s)) if (!['at', 'say', ...BUILD_ACTIONS].includes(k)) warn(`${p}.${k}`, `unknown field; step fields: at, say, ${BUILD_ACTIONS.join(', ')}`);
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
