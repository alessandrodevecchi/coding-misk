// Compilation (#49): the radio changes artist, genre, styles and knobs on its own, within a setup. The session is cut
// into segments (one song, or 2 to 4 songs); each segment draws a genre, then an artist from the setup's pool, a
// random artist (#50), or a set of styles with knob values in the setup's ranges. Everything comes from the session
// seed and the segment index, so the same seed and setup give the same compilation. Pure: checked in Node.
import { stream } from './random.js';
import { makeArtist, randomStyles, SENSIBLE, KNOBS } from './artist-maker.js';

export const EVERY = ['song', 'some'];
// neighbouring genres for the journey (a ring: the last is next to the first)
export const GENRE_RING = ['ambient', 'jazz', 'hip-hop', 'pop', 'house', 'trance', 'techno', 'drum-and-bass', 'industrial', 'metal', 'rock', 'country', 'synthwave', 'experimental'];
const ranges = () => Object.fromEntries(KNOBS.map(k => [k, SENSIBLE[k].slice()]));
// a setup: movement, genres / styles / artists allowed (null = all), random artists, a range per knob
export const SETUP_DEFAULT = { movement: 'journey', genres: null, styles: null, artists: null, randomArtists: true, ranges: ranges() };
export const PRESETS = {
  everything: { ...SETUP_DEFAULT, movement: 'free' },
  journey: { ...SETUP_DEFAULT },
  club: { ...SETUP_DEFAULT, genres: ['techno', 'trance', 'house', 'drum-and-bass', 'synthwave'], ranges: { ...ranges(), energy: [0.6, 0.95] } },
  chill: { ...SETUP_DEFAULT, genres: ['ambient', 'jazz', 'hip-hop', 'synthwave'], ranges: { ...ranges(), energy: [0.2, 0.6], chaos: [0.1, 0.45] } },
};
const round5 = x => Math.round(x * 20) / 20;
const genreOf = (recipes, id) => (recipes.find(r => r.id === id) || {}).genre;
// an artist's genre: the genre of its heaviest style
const artistGenre = (a, recipes) => { const top = Object.entries(a.styles || {}).sort((x, y) => y[1] - x[1])[0]; return top ? genreOf(recipes, top[0]) : null; };

function neighbours(g, allowed) {
  const i = GENRE_RING.indexOf(g); if (i < 0) return allowed;
  const near = [GENRE_RING[(i + 1) % GENRE_RING.length], GENRE_RING[(i - 1 + GENRE_RING.length) % GENRE_RING.length], g];
  const ok = near.filter(x => allowed.includes(x));
  // no neighbour allowed: the nearest allowed genre along the ring
  if (ok.length) return ok;
  for (let d = 2; d < GENRE_RING.length; d++) { const a = GENRE_RING[(i + d) % GENRE_RING.length], b = GENRE_RING[(i - d + GENRE_RING.length) % GENRE_RING.length]; const f = [a, b].filter(x => allowed.includes(x)); if (f.length) return f; }
  return allowed;
}

// one segment: its genre and what plays (an artist object, or styles and knobs)
function drawSegment(seed, index, setup, recipes, pool, prevGenre) {
  const r = stream(seed, `compilation/${index}`), S = { ...SETUP_DEFAULT, ...setup }, rg = { ...ranges(), ...(S.ranges || {}) };
  const styleOk = id => !S.styles || S.styles.includes(id);
  const usable = recipes.filter(x => styleOk(x.id) && (!S.genres || S.genres.includes(x.genre)));
  const genres = [...new Set(usable.map(x => x.genre).filter(Boolean))].sort();
  if (!genres.length) return null;
  const chaos = (rg.chaos[0] + rg.chaos[1]) / 2;
  let genre;
  if (S.movement === 'journey' && prevGenre && !r.chance(0.1 + 0.3 * chaos)) genre = r.pick(neighbours(prevGenre, genres));
  else { const other = genres.filter(g => g !== prevGenre); genre = r.pick(other.length ? other : genres); }
  const artists = pool.filter(a => (!S.artists || S.artists.includes(a.id)) && artistGenre(a, recipes) === genre);
  const kinds = ['styles', ...(artists.length ? ['artist'] : []), ...(S.randomArtists ? ['random'] : [])];
  const kind = r.pick(kinds);
  if (kind === 'artist') return { genre, kind, artist: r.pick(artists) };
  if (kind === 'random') return { genre, kind, artist: makeArtist(`${seed}/compilation/${index}`, usable, { allowedGenres: [genre] }) };
  const styles = randomStyles(`${seed}/compilation/${index}`, usable, { genre });
  const knobs = Object.fromEntries(KNOBS.map(k => [k, round5(r.range(rg[k][0], rg[k][1]))]));
  return { genre, kind, styles, knobs };
}

// the segments of a session up to song n (n included): [{ start, length, genre, kind, artist | styles+knobs }]
export function segmentsUpTo(seed, n, comp, recipes, pool = []) {
  const out = [];
  let start = 0, prev = null;
  for (let i = 0; start <= n && i < 10000; i++) {
    const r = stream(seed, `compilation-length/${i}`), length = comp.every === 'some' ? r.int(2, 4) : 1;
    const seg = drawSegment(seed, i, comp.setup || {}, recipes, pool, prev) || { genre: null, kind: 'none' };
    out.push({ ...seg, index: i, start, length });
    prev = seg.genre; start += length;
  }
  return out;
}
export const segmentAt = (seed, n, comp, recipes, pool) => segmentsUpTo(seed, n, comp, recipes, pool).find(s => n >= s.start && n < s.start + s.length);

// the director options of song n in a compilation (comp: { every, setup, pool }); how: transition, harmony, sounds
export function compilationOptions(seed, n, comp, recipes, how = {}) {
  const seg = segmentAt(seed, n, comp, recipes, comp.pool || []);
  if (!seg || seg.kind === 'none') return { styles: [recipes[0].id], ...how };
  if (seg.artist) return { artist: seg.artist, ...how };
  return { styles: seg.styles, ...seg.knobs, ...how };
}
