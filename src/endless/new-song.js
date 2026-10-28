// A new song from the New song panel of Compose (new-song-panel D7, D13): written by the same director call as a radio
// song, from the panel's values, with the profile and the length as the song's own configuration (song-own-settings);
// and Sorprendimi, every panel value drawn from one seed. Pure: checked in Node (tools/check-song-options.mjs).
import { createSession } from './director.js';
import { customControls, RADIO_PROFILES } from './profile.js';
import { PROFILES, cleanOverrides } from '../live/profiles.js';
import { stream } from './random.js';
import { makeArtist, randomStyles, randomGenre, randomKnob, randomMix } from './artist-maker.js';
import { styleKeys } from './recipe.js';
import { SESSION_SOURCES } from '../material/index.js';
import { OPENINGS, PACES, DEVELOPMENTS } from '../song/shapes.js';
import { VOICE_PRESET_IDS, applyPreset, cleanVoice } from './voice-options.js';
import { VOICE_STYLE_IDS } from '../song/format.js';
import { cleanSound } from './voice-sound.js';
import { hasLength, cleanLength } from './song-options.js';

// the controls the panel's Profile amounts to (the Profilo e crescita section and the generated song): Custom its own
// controls (with the profile's own growth duration unless it says otherwise); a profile its own; the artist's choice the
// Live coder's (D5); a Durata (D12) makes a growing build grow inside it
export function panelControls(state) {
  const base = state.profile === 'custom' ? customControls(state.custom) : PROFILES[state.profile] ? { ...PROFILES[state.profile], id: state.profile } : { ...PROFILES.switch, id: 'switch' };
  return hasLength(state.length) && base.build === 'crescendo' ? { ...base, duration: 'planned' } : base;
}
// the profile's own growth duration, kept when a control turns a profile into Custom (Live coder grows free in Compose)
export const baseDuration = base => ({ duration: (PROFILES[base] || PROFILES.switch).duration });

// The song's own configuration (D7): profile is the director's profile for the song (entry.profile, else classic);
// with Custom the panel's controls; the narrator off; the length target with a Durata (D12)
export function songConfig(state, { profile = 'classic', phrase = 8 } = {}) {
  let cfg;
  if (state.profile === 'custom') {
    const c = state.custom || {}, base = RADIO_PROFILES.includes(c.base) ? c.base : 'switch', C = customControls(c);
    cfg = { profile: base, live: C.build === 'crescendo', options: cleanOverrides(C, PROFILES[base]) };
  } else cfg = { profile, live: profile !== 'classic', options: {} };
  if (state.voices && state.voices.narrator === false) cfg.options = { ...cfg.options, narrator: false };
  // (Durata and the free growth exclude each other: the target wins, the free duration goes)
  if (hasLength(state.length)) {
    if (cfg.options.duration === 'free') { const { duration: _, ...rest } = cfg.options; cfg.options = rest; }
    cfg.durationTarget = { length: cleanLength(state.length), phrase };
  }
  if (!Object.keys(cfg.options).length) delete cfg.options;
  return cfg;
}

// Genera: one director call with the panel's options. options: the panel's store (song-options.js); seed: the Seme
// field ('' or null: a new one). → { song, entry, plan, seed, config, artist } (the song not yet given an id)
export function generateSong({ recipes, options, seed = null }) {
  const session = createSession(recipes, seed || undefined);
  const dopts = options.directorOptions({ use: 'new-song' });
  const { song, entry, plan } = session.next(dopts);
  const config = songConfig(options.state, { profile: entry.profile || 'classic', phrase: plan.phrase });
  const a = dopts.artist || null;
  const out = { ...song, kind: 'composed', config, ...(a ? { style: { en: `${a.name} · ${song.style.en}`, it: `${a.name} · ${song.style.it}` } } : {}) };
  return { song: out, entry, plan, seed: session.seed, config, artist: a };
}

// Sorprendimi (D13): every panel value drawn from one seed with the random tools. recipes: the usable styles;
// artists: the usable artists. → the patch for the panel's store (one set)
export function surpriseValues(seed, recipes, artists = []) {
  const r = stream(String(seed), 'surprise'), s = k => `${seed}:${k}`;
  const out = { preset: '', temp: null, artist: null };
  // the artist: Custom, a usable artist or a random one, one third each
  const who = r.int(0, 2);
  if (who === 1 && artists.length) out.artist = r.pick(artists).id;
  if (who === 2) { out.temp = makeArtist(s('artist'), recipes); out.artist = out.temp.id; }
  const a = out.temp || artists.find(x => x.id === out.artist);
  // the styles: one to three through a random genre half the time, else a mix; an artist's taste when one is drawn
  if (a) { const taste = styleKeys(a.styles); out.styles = Object.keys(taste).filter(x => taste[x] > 0 && recipes.some(y => y.id === x)); }
  if (!out.styles || !out.styles.length) out.styles = r.chance(0.5) ? randomStyles(s('styles'), recipes, { genre: randomGenre(s('genre'), recipes) }) : randomMix(s('mix'), recipes);
  if (!out.styles.length) out.styles = [recipes[0].id];
  for (const k of ['chaos', 'energy', 'complexity']) out[k] = randomKnob(s('knobs'), k, false);
  out.sounds = r.chance(0.5) ? s('sounds') : null;
  // the profile: Classic, Crescendo, Live coder or Custom with a random growth shape
  out.profile = r.pick(['classic', 'crescendo', 'switch', 'custom']);
  out.custom = out.profile === 'custom' ? { base: 'switch', controls: { duration: 'free', opening: r.pick(OPENINGS), pace: r.pick(PACES), development: r.pick(DEVELOPMENTS.filter(d => d !== 'metamorphosis')) } } : { base: 'switch', controls: {} };
  out.material = r.pick(SESSION_SOURCES);
  // the two voices: on or off, the voice track with a random preset, the narrator with a random voice style
  out.voices = { narrator: r.chance(0.7), track: r.chance(0.6) };
  out.voice = cleanVoice(applyPreset(r.pick(VOICE_PRESET_IDS), cleanVoice({}), { presence: true }));
  out.narratorSound = cleanSound({ style: r.pick(['auto', ...VOICE_STYLE_IDS]) });
  // the length (D12 applies: with a Durata the free growth gives way)
  out.length = r.pick(['style', 'short', 'medium', 'long']);
  if (hasLength(out.length) && out.custom.controls.duration === 'free') delete out.custom.controls.duration;
  return out;
}
