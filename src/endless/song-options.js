// The options of how a song is made (new-song-panel D1): one shape and one code, two sets of values. The radio keeps
// its values under `coding-misk-radio` (read and migrated here exactly as createRadio did), the New song panel of
// Compose under `coding-misk-new-song`; a change in one never changes the other. The director options of a song are
// built by one function from either store (directorOptions), so the radio's stay what they were before this change.
// Pure apart from the store passed in: checked in Node (tools/check-song-options.mjs).
import { OPTION_DEFAULTS } from './director.js';
import { TRANSITION_KINDS, HARMONY_MODES } from './artist.js';
import { RADIO_CHOICES, CUSTOM_DEFAULT, profileOptions } from './profile.js';
import { styleId } from './recipe.js';
import { PRESETS } from './compilation.js';
import { SESSION_SOURCES } from '../material/index.js';
import { cleanVoice, voiceOption } from './voice-options.js';
import { cleanSound, isAutoSound } from './voice-sound.js';

export const RADIO_KEY = 'coding-misk-radio';
export const NEW_SONG_KEY = 'coding-misk-new-song';
// the values of how a song is made: what the panel copies from the radio ("Prendi dalla radio", the first open) and
// what a preset may hold (with `length`). Everything else in the radio's store is about the session on air
// (transition, harmony, incoming, compilation, scope, the dice range, the material default)
// (tempStyle and trialBefore: an invented style being tried and the choice before it, invented-styles D9)
export const SONG_KEYS = ['styles', 'chaos', 'energy', 'complexity', 'talk', 'artist', 'temp', 'sounds', 'profile', 'custom', 'material', 'voice', 'voices', 'narratorSound', 'length', 'tempStyle', 'trialBefore'];
// the song length of the director (D8): as the style, or a range, or exact minutes (1 to 12, step 0.5)
export const LENGTHS = ['style', 'short', 'medium', 'long'];
export const LENGTH_MINUTES = [1, 12];
export function cleanLength(v) {
  if (LENGTHS.includes(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) && v !== null && v !== '' && typeof v !== 'boolean' ? Math.min(LENGTH_MINUTES[1], Math.max(LENGTH_MINUTES[0], Math.round(n * 2) / 2)) : 'style';
}
export const hasLength = v => cleanLength(v) !== 'style';

const clone = o => JSON.parse(JSON.stringify(o));

// a stored options object made whole (moved from createRadio, unchanged): ids are the usable style ids. → { opts,
// migrated } where migrated says the stored form changed and should be written back
export function readOptions(saved, ids) {
  saved = saved || {};
  // an invented style in trial (invented-styles D9): kept until Tieni or ×, so its id stays a usable style
  const tempStyle = saved.tempStyle && typeof saved.tempStyle === 'object' && saved.tempStyle.id && saved.tempStyle.invented && !ids.includes(saved.tempStyle.id) ? saved.tempStyle : null;
  const usable = tempStyle ? [...ids, tempStyle.id] : ids;
  const opts = {
    styles: (saved.styles || []).map(styleId).filter(id => usable.includes(id)),
    tempStyle,
    trialBefore: tempStyle && saved.trialBefore && typeof saved.trialBefore === 'object' ? saved.trialBefore : null,
    chaos: saved.chaos ?? OPTION_DEFAULTS.chaos, energy: saved.energy ?? OPTION_DEFAULTS.energy, complexity: saved.complexity ?? OPTION_DEFAULTS.complexity,
    talk: saved.talk ?? OPTION_DEFAULTS.talk,
    // the artist picked (its id), or null when the controls are set by hand ("custom")
    artist: saved.artist ?? null,
    // transitions (#23): the artist's choice or always one kind; harmony: the artist's, compatible or free
    transition: ['artist', ...TRANSITION_KINDS].includes(saved.transition) ? saved.transition : 'artist',
    harmony: ['artist', ...HARMONY_MODES].includes(saved.harmony) ? saved.harmony : 'artist',
    // profile (radio-profiles D3): as the artist and the style say, or one profile for every generated song; recorded
    // in the recipe, so a replay gives the same profiles (Settings keeps the default for new pages)
    profile: RADIO_CHOICES.includes(saved.profile) ? saved.profile : OPTION_DEFAULTS.profile,
    // the Custom profile (radio-profiles 4.6): the Compose controls the console sets, { base, controls }
    custom: saved.custom && typeof saved.custom === 'object' && saved.custom.controls ? saved.custom : clone(CUSTOM_DEFAULT),
    // the next song in the code panel (radio-profiles D7): as its profile says (Classic shown, grown songs hidden), or
    // always hidden, or always shown. It changes what is shown, never the sound
    incoming: ['profile', 'hidden', 'visible'].includes(saved.incoming) ? saved.incoming : 'profile',
    // material (material-generator): patterns as written, varied, composed, or mix (each style's choice). The console
    // picks it for the songs to come (radio-variation); Settings keeps the default a new page starts from
    materialDefault: SESSION_SOURCES.includes(saved.materialDefault) ? saved.materialDefault : SESSION_SOURCES.includes(saved.material) ? saved.material : 'mix',
    // steering (#24): commands for this song only, or for the whole session (they also move the sliders)
    scope: saved.scope === 'session' ? 'session' : 'song',
    // random tools (#50): a random artist not kept yet, dice in the full range or in a sensible one, the sounds seed
    temp: saved.temp && saved.temp.id ? saved.temp : null,
    diceRange: saved.diceRange !== false,
    sounds: typeof saved.sounds === 'string' ? saved.sounds : null,
    // compilation (#49): off, every song, every 2 to 4 songs; its setup and the preset it came from
    compilation: ['song', 'some'].includes(saved.compilation) ? saved.compilation : 'off',
    compSetup: saved.compSetup && typeof saved.compSetup === 'object' ? saved.compSetup : clone(PRESETS.journey),
    compPreset: saved.compPreset || 'journey',
    // knobs held by hand while the compilation plays (#59): knob → value
    compLocks: saved.compLocks && typeof saved.compLocks === 'object' ? saved.compLocks : {},
    // the voice instrument (voice-controls): phrases per song, kinds, ways and how often, for the songs to come; in the
    // recipe only when it is not As the style, so a replay sounds the same
    // (voice-full-controls D14: Sempre stays Sempre; a saved Mai reads as the Voce: traccia switch off, How often as the
    // style says)
    voice: cleanVoice(saved.voice && saved.voice.presence === 'never' ? { ...saved.voice, presence: 'style' } : saved.voice),
    // the narrator's sound for the next songs (D4): as the style (each song draws it), a voice style or own values
    narratorSound: cleanSound(saved.narratorSound),
    // the two voices on or off for the next songs (D15), with every profile; a Custom profile saved with the narrator off
    // reads as the narrator switch off
    voices: {
      narrator: !(saved.voices && saved.voices.narrator === false) && !(saved.custom && saved.custom.controls && saved.custom.controls.narrator === false),
      track: !(saved.voices && saved.voices.track === false) && !(saved.voice && saved.voice.presence === 'never'),
    },
  };
  let migrated = false;
  // (the narrator switch left the Custom profile: its old value moved to the switch above)
  if (opts.custom && opts.custom.controls && opts.custom.controls.narrator !== undefined) { const { narrator: _, ...rest } = opts.custom.controls; opts.custom = { ...opts.custom, controls: rest }; migrated = true; }
  // (a saved Never is stored as the switch off with As the style)
  else if (saved.voice && saved.voice.presence === 'never') migrated = true;
  return { opts, migrated };
}

// the song values of a store's state (SONG_KEYS), as a deep copy
export const songValues = state => clone(Object.fromEntries(SONG_KEYS.filter(k => state[k] !== undefined).map(k => [k, state[k]])));

// createSongOptions({ store, key, recipes, artists, userPatterns, from })
//   store: the app's store (get, set); key: RADIO_KEY or NEW_SONG_KEY
//   recipes: the usable style recipes; artists(): the usable artists; userPatterns(): the saved patterns the director reads
//   from: for the panel, the radio's options: when the panel's key does not exist yet, it starts from a copy of the
//   radio's song values (not its session fields)
// → { key, state, set(patch), save(keys), on(fn), directorOptions(ctx), takeFrom(other), artistOf(id) }
export function createSongOptions({ store, key = RADIO_KEY, recipes = [], artists = () => [], userPatterns = () => [], from = null }) {
  const ids = recipes.map(r => r.id), panel = key !== RADIO_KEY;
  let saved = store.get(key, null);
  const first = panel && !saved && from;
  if (first) saved = songValues(from.state);
  const { opts, migrated } = readOptions(saved, ids);
  // the material: the radio starts each page from its default (Settings); the panel keeps the one picked
  if (panel && saved && SESSION_SOURCES.includes(saved.material)) opts.material = saved.material;
  else opts.material = opts.materialDefault;
  // the song length (D8; the radio's Durata since phase 8), the preset picked last (the panel, D6)
  opts.length = cleanLength(saved && saved.length);
  if (panel) opts.preset = saved && typeof saved.preset === 'string' ? saved.preset : '';
  if (!opts.styles.length) opts.styles = [ids.includes('synthwave') ? 'synthwave' : ids[0]];
  const listeners = [];
  // what is kept: the radio its whole state, as before; the panel its song values, the length, the preset, the dice range
  const stored = () => (panel ? { ...songValues(opts), length: opts.length, preset: opts.preset, diceRange: opts.diceRange, materialDefault: opts.materialDefault } : opts);
  const save = (keys = null) => { store.set(key, stored()); for (const fn of listeners) fn(keys); };
  if (migrated || first) store.set(key, stored());
  const artistOf = id => (id ? artists().find(a => a.id === id) || (opts.temp && opts.temp.id === id ? opts.temp : null) : null);
  const api = {
    key, state: opts,
    // merged into the state, saved, and every listener told which keys changed
    set(patch) { Object.assign(opts, clone(patch)); save(Object.keys(patch)); },
    save,
    on(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    artistOf,
    // The director options of the next song (the radio's current() moved here): with an artist, its whole taste goes to
    // the director (and into the session recipe); the controls only show its centre. Both stores add
    // `length` when it is not As the style (D8; the radio's Durata since phase 8), with `lengthHeard` (D12: the length
    // heard, the written song one phrase shorter); use: 'radio' or 'new-song', kept for the callers
    directorOptions({ use = 'radio' } = {}) {
      const a = artistOf(opts.artist), up = userPatterns();
      const how = { transition: opts.transition, harmony: opts.harmony, ...profileOptions(opts.profile, opts.custom), ...(opts.sounds ? { sounds: opts.sounds } : {}), ...(opts.material !== 'mix' ? { material: opts.material } : {}), ...(up.length ? { userPatterns: up } : {}), ...(voiceOption(opts.voice) ? { voice: voiceOption(opts.voice) } : {}), ...(isAutoSound(opts.narratorSound) ? {} : { narratorSound: cleanSound(opts.narratorSound) }), ...(opts.voices.narrator && opts.voices.track ? {} : { voices: { ...(opts.voices.narrator ? {} : { narrator: false }), ...(opts.voices.track ? {} : { track: false }) } }) };
      // (the radio sends it only when its Durata is set, so its recipes and the endless fixtures stay as before without it)
      const len = hasLength(opts.length) ? { length: cleanLength(opts.length), lengthHeard: true } : {};
      // a compilation carries its setup and the artists it may use, so a replay draws the same songs
      if (opts.compilation !== 'off') return { compilation: { every: opts.compilation, setup: clone(opts.compSetup), pool: clone(artists()), ...(Object.keys(opts.compLocks).length ? { locks: { ...opts.compLocks } } : {}) }, ...how, ...len };
      return a ? { artist: clone(a), ...how, ...len } : { styles: opts.styles.slice(), chaos: opts.chaos, energy: opts.energy, complexity: opts.complexity, talk: opts.talk, ...how, ...len };
    },
    // "Prendi dalla radio" (D1): the other store's song values, in one change
    takeFrom(other) { api.set({ ...songValues(other.state), ...(panel ? { preset: '' } : {}) }); },
  };
  return api;
}
