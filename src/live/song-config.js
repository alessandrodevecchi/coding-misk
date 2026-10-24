// A song's own configuration (song-own-settings): the profile, the Live build switch and the profile options are part
// of the song (`config`) and are how it opens, plays and exports. A song without one plays as its declared `profile`
// or `buildStyle` says (on), else as Classic with the Live build off: as written. A change in Compose is a trial for
// that song only, kept apart (in this browser) until it is saved or taken back with ↺. Pure: checked in Node.
import { PROFILES, CONTROLS, cleanOverrides, resolveProfile, songProfile } from './profiles.js';

// the browser key of the trials: { songId: config }
export const TRIALS_KEY = 'coding-misk-song-trials';

// the configuration a song was saved with: { profile, live, options } (options: only those that differ from the profile)
export function baseConfig(song) {
  const declared = songProfile(song), c = song && song.config && typeof song.config === 'object' && !Array.isArray(song.config) ? song.config : null;
  const profile = c && PROFILES[c.profile] ? c.profile : declared || 'classic';
  const live = c && typeof c.live === 'boolean' ? c.live : !!declared;
  return { profile, live, options: cleanOverrides(c && c.options, PROFILES[profile]) };
}
// a configuration made whole and clean (a trial read back from the browser, or one set in Compose); null when unusable
export function normalConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !PROFILES[raw.profile]) return null;
  return { profile: raw.profile, live: !!raw.live, options: cleanOverrides(raw.options, PROFILES[raw.profile]) };
}
// the configuration in force: the trial when there is one, else the song's own
export const configOf = (song, trial = null) => normalConfig(trial) || baseConfig(song);
// the controls in force of a configuration (resolveProfile's result)
export const controlsOf = cfg => resolveProfile(cfg.profile, cfg.options);
// two configurations play the same
export function sameConfig(a, b) {
  if (!a || !b || a.profile !== b.profile || !!a.live !== !!b.live) return false;
  const x = cleanOverrides(a.options, PROFILES[a.profile]), y = cleanOverrides(b.options, PROFILES[b.profile]);
  const kx = Object.keys(x), ky = Object.keys(y);
  return kx.length === ky.length && kx.every(k => x[k] === y[k]);
}
// the form saved in a song or a trial: options left out when there are none
export function compactConfig(cfg) {
  const c = normalConfig(cfg); if (!c) return null;
  return Object.keys(c.options).length ? c : { profile: c.profile, live: c.live };
}
// the song as its configuration plays it: the trial written as its config (for the card lengths, keyed by the song)
export function withConfig(song, cfg) {
  const c = compactConfig(cfg);
  return c ? { ...song, config: c } : song;
}
// the trials kept in the browser, cleaned: { id: config }; a trial equal to its song's own is dropped
export function cleanTrials(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, c] of Object.entries(raw)) { const n = compactConfig(c); if (id && n) out[id] = n; }
  return out;
}
// a trial set on a song: the new trials (the trial goes when it equals the song's own configuration)
export function setTrial(trials, song, cfg) {
  const out = { ...trials }, n = normalConfig(cfg);
  if (!n || sameConfig(n, baseConfig(song))) delete out[song.id]; else out[song.id] = compactConfig(n);
  return out;
}

// the validator's check of `config` (src/song/validate.js)
export function checkConfig(cfg, err, warn) {
  if (cfg === undefined) return;
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) { err('config', 'an object, for example { "profile": "switch", "live": true, "options": { "narrated": true } }'); return; }
  for (const k of Object.keys(cfg)) if (!['profile', 'live', 'options'].includes(k)) warn(`config.${k}`, 'unknown field; config fields: profile, live, options');
  if (cfg.profile !== undefined && !PROFILES[cfg.profile]) err('config.profile', `one of ${Object.keys(PROFILES).join(', ')}, or left out`);
  if (cfg.live !== undefined && typeof cfg.live !== 'boolean') err('config.live', 'true (the Live build on) or false');
  if (cfg.options === undefined) return;
  if (!cfg.options || typeof cfg.options !== 'object' || Array.isArray(cfg.options)) { err('config.options', 'an object of profile options, for example { "narrated": true }'); return; }
  for (const [k, v] of Object.entries(cfg.options)) {
    if (!CONTROLS[k]) warn(`config.options.${k}`, `unknown option; options: ${Object.keys(CONTROLS).join(', ')}`);
    else if (!CONTROLS[k].includes(v)) err(`config.options.${k}`, `one of ${CONTROLS[k].map(x => JSON.stringify(x)).join(', ')}`);
  }
}
