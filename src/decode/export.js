// Export of a decoded track (track-to-code D16): what the exports of the app need to carry the original audio. Pure, so
// the checks run in Node (npm run check:decode). The original is never stored or sent anywhere: its samples go to the
// render page of an export the user started, and are mixed there before the master limiter.
import { gainsOf, ORIG } from './mix.js';

// the mix as the render page needs it (D16): the original's gain (the slider's cosine times the loudness trim), the code
// bus's gain (the loudest of the code tracks heard, as the tab sets it) and the orbits of the code tracks that are not
// heard (the tab sets their output to zero). orbits: { trackId: orbit } of the level B song.
export function exportMix(mix, trim, orbits = {}) {
  const g = gainsOf(mix), ids = mix.tracks.filter(x => x.kind === 'code').map(x => x.id);
  const code = ids.length ? Math.max(0, ...ids.map(id => g[id] || 0)) : 0, orig = (g[ORIG] || 0) * (trim || 1);
  return {
    orig, code,
    mutes: ids.filter(id => !(g[id] > 0) && orbits[id] !== undefined).map(id => orbits[id]),
    hasOriginal: orig > 0, hasCode: code > 0,
  };
}

// the mix state of level B's tracks from the state of level A's one code track: the code track's mute and solo are those of
// every part (an export always writes level B's song, the whole file)
export function mixForParts(mix, ids) {
  const code = mix.tracks.find(x => x.kind === 'code'), o = mix.tracks.find(x => x.kind === 'orig');
  if (!code || mix.tracks.filter(x => x.kind === 'code').length > 1) return mix;
  return { slider: mix.slider, tracks: [{ ...o }, ...ids.map(id => ({ ...code, id }))] };
}

// the original's samples for the window [from, to) seconds of the song (the song's second 0 is the first downbeat, file
// time `downbeat`): copies at the original's own rate, and `at`, the seconds into the window where sample 0 plays (more
// than 0 when the window starts before the file does). null when the window holds none of the file.
// channels: [Float32Array] of the decoded file.
export function origSpan(channels, rate, downbeat, from, to) {
  const length = channels[0].length, fileFrom = downbeat + from, fileTo = downbeat + to;
  const i0 = Math.max(0, Math.round(fileFrom * rate)), i1 = Math.min(length, Math.round(fileTo * rate));
  if (!(i1 > i0)) return null;
  return { rate, ch: channels.slice(0, 2).map(c => c.slice(i0, i1)), at: i0 / rate - fileFrom };
}

// the job fields of an export of the whole track: the file begins at the file's own start, `downbeat` seconds before the
// song's first bar (the original alone sounds there) and ends where the original does
export function wholeJob({ channels, rate, downbeat, duration, mix }) {
  return { start: -downbeat, cut: duration - downbeat, origAt: mix.hasOriginal ? (from, to) => origSpan(channels, rate, downbeat, from, to) : null, mix: { orig: mix.orig, code: mix.code, mutes: mix.mutes } };
}
// the job fields of a fragment: its span of the original, the same mix (start and end come with the fragment)
export function fragmentJob({ channels, rate, downbeat, mix }) {
  return { origAt: mix.hasOriginal ? (from, to) => origSpan(channels, rate, downbeat, from, to) : null, mix: { orig: mix.orig, code: mix.code, mutes: mix.mutes } };
}
