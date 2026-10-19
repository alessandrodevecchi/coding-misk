// The profile of every radio song (radio-profiles, design D1 and D2): Classic, Crescendo or Live coder (id switch).
// One precedence rule, written once, used by the director, the radio, playlists and exports. Pure and seeded: weighted
// draws use the stream `profile/<n>` of the session seed, separate from every other stream, so nothing else moves.
import { stream } from './random.js';
import { songProfile } from '../live/profiles.js';

// the profiles a radio song can play with (the ids of src/live/profiles.js PROFILES)
export const RADIO_PROFILES = ['classic', 'crescendo', 'switch'];
// the session's Profile control: as the artist (and style) say, or one profile for every generated song
export const PROFILE_CHOICES = ['artist', ...RADIO_PROFILES];
// a recipe saved before radio-profiles has no Profile option: it replays every song in blocks, as heard (D11)
export const OLD_RECIPE_PROFILE = 'classic';

// a weighted draw over the radio profiles, or null when no profile has a weight above 0
function draw(weights, rng) {
  if (!weights || typeof weights !== 'object') return null;
  const ids = RADIO_PROFILES.filter(k => Number(weights[k]) > 0);
  return ids.length ? rng.weighted(ids, ids.map(k => Number(weights[k]))) : null;
}

// D1. The profile of generated song n (the session's song index). ctx:
//   seed: the session seed; choice: the Profile option ('artist' or a profile id; missing = 'artist');
//   compilation: the compilation setup's `profiles` weights when a compilation plays (null: no opinion);
//   artist: the artist on air (chosen, drawn by the compilation, or random), its `profiles` weights;
//   style: the recipe of the style that gives the song's drums, its declared `profile`
// → { profile, from: 'session' | 'compilation' | 'artist' | 'style' | 'default' }
export function songProfileOnAir(n, { seed = '', choice = 'artist', compilation = null, artist = null, style = null } = {}) {
  if (RADIO_PROFILES.includes(choice)) return { profile: choice, from: 'session' };
  const rng = () => stream(String(seed), `profile/${n}`);
  const c = draw(compilation, rng());
  if (c) return { profile: c, from: 'compilation' };
  // (the compilation and the artist draw from the same stream: only one of them ever draws for a song)
  const a = draw(artist && artist.profiles, rng());
  if (a) return { profile: a, from: 'artist' };
  if (style && RADIO_PROFILES.includes(style.profile)) return { profile: style.profile, from: 'style' };
  return { profile: 'classic', from: 'default' };
}

// D2. The profile of a saved song in a stream (song 0 from Compose, a frozen session, the playlist Mix, a replay):
// the song's own profile (`profile`, else its old `buildStyle`), then the radio session's forced profile (the radio
// only: `forced` is the Profile option, a profile id forces it), then the player default (the profile the song would
// have when played alone: the Compose choice, or Classic with the Live build switch off).
// → { profile, from: 'song' | 'session' | 'player' }
export function savedSongProfile(song, { forced = null, player = 'classic' } = {}) {
  const own = songProfile(song);
  if (own) return { profile: own, from: 'song' };
  if (RADIO_PROFILES.includes(forced)) return { profile: forced, from: 'session' };
  return { profile: RADIO_PROFILES.includes(player) ? player : 'classic', from: 'player' };
}

// the Profile option of a recipe's options: a recipe saved before radio-profiles replays as Classic
export const recipeProfile = o => (o && o.profile !== undefined ? o.profile : OLD_RECIPE_PROFILE);
