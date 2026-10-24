// The length a song card shows (song lists never grow songs in the page: a growth takes up to a few seconds per song).
// A card shows the song as its own configuration plays it (song-own-settings, src/live/song-config.js): as written
// unless the configuration grows it (the Live build on with Crescendo or Live coder). The page passes a song with a trial
// as the song with the trial written as its config (withConfig), so the length and the key follow the trial. The grown length of a built-in song is computed offline
// (tools/song-durations.mjs → src/library/song-durations.json); the user's songs grow in the grow worker, for the cards
// on screen, and the page keeps the result by key. Pure: the page, the worker and the Node tool compute the same.
import { crescendoSong, CRESCENDO_VERSION } from '../song/crescendo.js';
import { SHAPES_VERSION } from '../song/shapes.js';
import { stateAt } from '../song/build.js';
import { compileSong } from '../song/compile.js';
import { parseSong } from '../songs.js';
import { growthRules } from './profiles.js';
import { baseConfig, controlsOf } from './song-config.js';
import { liveCode } from './live-code.js';

// the profile of a song whose configuration grows it (the Live build on, built in Crescendo), else null (as written)
export function growingProfile(song) {
  if (!song) return null;
  const cfg = baseConfig(song);
  return cfg.live && controlsOf(cfg).build === 'crescendo' ? cfg.profile : null;
}
// two FNV-1a hashes of a text, as 16 hex digits
export function hashText(s) {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x5bd1e995) ^ (b >>> 15); }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
// what a growth depends on besides the song: the versions of the growth, the profile and the voice instrument's
// context (the samples known to the page, their measured lengths, the language of the lines)
// → null for a song that does not grow
export function durationKey(song, { files = null, lengths = {}, lang = 'en' } = {}) {
  const p = growingProfile(song);
  if (!p) return null;
  const { kind, ...rest } = song;
  return hashText(JSON.stringify([CRESCENDO_VERSION, SHAPES_VERSION, p, files, lengths, lang, rest]));
}
// the grown length of a song with its own profile, as the page's playable() measures it: { seconds, bars }, or null when
// it does not grow. styles: { id: recipe }, for the growth shapes
export function grownDuration(song, styles = {}) {
  const p = growingProfile(song);
  if (!p) return null;
  const C = controlsOf(baseConfig(song));
  const c = crescendoSong(song, { narrated: C.narrated, rules: growthRules(C, { styles }) });
  if (!c.build.length) return null;
  const live = liveCode(c, C, {});
  const meta = parseSong(live.now ? compileSong(stateAt(live.build, 0).song) : live.codeAt(0));
  return { seconds: meta.seconds, bars: meta.bars };
}
