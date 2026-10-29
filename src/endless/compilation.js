// Compilation (#49): the radio changes artist, genre, styles and knobs on its own, within a setup. The session is cut
// into segments (one song, or 2 to 4 songs); each segment draws a genre, then an artist from the setup's pool, a
// random artist (#50), or a set of styles with knob values in the setup's ranges. Everything comes from the session
// seed and the segment index, so the same seed and setup give the same compilation. Pure: checked in Node.
import { stream } from './random.js';
import { makeArtist, randomStyles, SENSIBLE, KNOBS } from './artist-maker.js';
import { inventStyle } from './style-maker.js';

export const EVERY = ['song', 'some'];
// neighbouring genres for the journey (a ring: the last is next to the first)
export const GENRE_RING = ['ambient', 'jazz', 'hip-hop', 'pop', 'house', 'trance', 'techno', 'drum-and-bass', 'industrial', 'metal', 'rock', 'country', 'synthwave', 'experimental'];
const ranges = () => Object.fromEntries(KNOBS.map(k => [k, SENSIBLE[k].slice()]));
// a setup: movement, genres / styles / artists allowed (null = all), random artists, a range per knob; profiles
// (radio-profiles D4): null (as the artists and styles say) or weights over the profiles of generated songs;
// invented (invented-styles D11, phase 2): true lets a segment play a style invented for it (missing: off, so the
// setups saved before draw the same segments)
export const SETUP_DEFAULT = { movement: 'journey', genres: null, styles: null, artists: null, randomArtists: true, ranges: ranges(), profiles: null };
const full = () => Object.fromEntries(KNOBS.map(k => [k, [0, 1]]));
// everything: any genre, jumps, the knobs over their whole scale; journey: neighbouring genres, sensible knobs;
// max: jumps and the knobs high
export const PRESETS = {
  everything: { ...SETUP_DEFAULT, movement: 'free', ranges: full() },
  journey: { ...SETUP_DEFAULT },
  max: { ...SETUP_DEFAULT, movement: 'free', ranges: { chaos: [0.6, 1], energy: [0.7, 1], complexity: [0.6, 1], talk: [0.3, 0.9] } },
  club: { ...SETUP_DEFAULT, genres: ['techno', 'trance', 'house', 'drum-and-bass', 'synthwave'], ranges: { ...ranges(), energy: [0.6, 0.95] } },
  chill: { ...SETUP_DEFAULT, genres: ['ambient', 'jazz', 'hip-hop', 'synthwave'], ranges: { ...ranges(), energy: [0.2, 0.6], chaos: [0.1, 0.45] } },
  // every generated song grows like a live coder, in any genre, along the journey (radio-profiles, owner decision 8)
  'live-coder': { ...SETUP_DEFAULT, profiles: { switch: 1 } },
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

// an invented style of a segment (D11): from the session seed and the segment index, in the segment's genre, over the
// styles the compilation draws from (invented ones left out, so inventions never breed); kept in a small cache, since
// the segments are drawn again for every song
const inventCache = new Map();
export function segmentStyle(seed, index, genre, recipes) {
  const pool = recipes.filter(x => !x.invented), key = `${seed}|${index}|${genre}|${pool.map(x => x.id).join(',')}`;
  if (!inventCache.has(key)) {
    if (inventCache.size > 200) inventCache.clear();
    let r = null;
    try { r = inventStyle(`${seed}/compilation/${index}`, pool, { genre, avoid: recipes.flatMap(x => (x.name ? [x.name.en, x.name.it] : [])), kept: recipes.filter(x => x.invented) }).recipe; } catch (e) { r = null; }
    inventCache.set(key, r);
  }
  const r = inventCache.get(key);
  return r ? JSON.parse(JSON.stringify(r)) : null;
}

// one segment: its genre and what plays (an artist object, a style invented for it, or styles and knobs)
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
  const kinds = ['styles', ...(artists.length ? ['artist'] : []), ...(S.randomArtists ? ['random'] : []), ...(S.invented === true ? ['invented'] : [])];
  const kind = r.pick(kinds);
  if (kind === 'artist') return { genre, kind, artist: r.pick(artists) };
  if (kind === 'random') return { genre, kind, artist: makeArtist(`${seed}/compilation/${index}`, usable, { allowedGenres: [genre] }) };
  const knobsOf = () => Object.fromEntries(KNOBS.map(k => [k, round5(r.range(rg[k][0], rg[k][1]))]));
  if (kind === 'invented') { const style = segmentStyle(seed, index, genre, usable); if (style) return { genre, kind, style, styles: [style.id], knobs: knobsOf() }; }
  const styles = randomStyles(`${seed}/compilation/${index}`, usable, { genre });
  const knobs = knobsOf();
  return { genre, kind: kind === 'invented' ? 'styles' : kind, styles, knobs };
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

// an artist inside a setup (#59): each value range intersected with the setup's (an empty intersection becomes the
// nearest bound), a knob held by hand fixed at its value
export function boundArtist(artist, ranges = {}, locks = {}) {
  const out = { ...artist };
  for (const k of KNOBS) {
    if (typeof locks[k] === 'number') { out[k] = [locks[k], locks[k]]; continue; }
    const a = Array.isArray(artist[k]) ? artist[k] : null, r = ranges[k];
    if (!a || !r) continue;
    const lo = Math.max(a[0], r[0]), hi = Math.min(a[1], r[1]);
    out[k] = lo <= hi ? [lo, hi] : a[1] < r[0] ? [r[0], r[0]] : [r[1], r[1]];
  }
  return out;
}

// the director options of song n in a compilation (comp: { every, setup, pool, locks }); how: transition, harmony, sounds.
// locks: knobs held by hand (#59), used whatever the compilation draws
// (a setup with profiles passes them as compProfiles: the director draws the song's profile from them, D1 rule 2)
export function compilationOptions(seed, n, comp, recipes, how = {}) {
  const seg = segmentAt(seed, n, comp, recipes, comp.pool || []), locks = comp.locks || {};
  const pf = (comp.setup || {}).profiles;
  if (pf && typeof pf === 'object') how = { ...how, compProfiles: { ...pf } };
  const held = Object.fromEntries(KNOBS.filter(k => typeof locks[k] === 'number').map(k => [k, locks[k]]));
  if (!seg || seg.kind === 'none') return { styles: [recipes[0].id], ...held, ...how };
  if (seg.artist) return { artist: boundArtist(seg.artist, { ...ranges(), ...((comp.setup || {}).ranges || {}) }, locks), ...how };
  // (a style invented for the segment travels with the options: the director adds it as an extra style)
  return { styles: seg.styles, ...seg.knobs, ...held, ...how, ...(seg.style ? { inventedStyle: seg.style } : {}) };
}
