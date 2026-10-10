// Random tools (#50): a random artist, random styles and genres, random knob values, all from a seed (the same seed
// gives the same result). Only existing styles and genres are picked; inventing styles is a later upgrade (#51).
// Pure: checked in Node (tools/check-random.mjs).
import { stream } from './random.js';
import { PALETTES, MOVE_KINDS, VOICE_CHARACTER_NAMES, TRANSITION_KINDS } from './artist.js';
import { QUIRKS } from './quirks.js';
import { SHAPES } from './recipe.js';

export const KNOBS = ['chaos', 'energy', 'complexity', 'talk'];
// knob values that rarely give odd songs ("in range"); the full range is 0 to 1
export const SENSIBLE = { chaos: [0.15, 0.7], energy: [0.3, 0.9], complexity: [0.3, 0.8], talk: [0.2, 0.8] };
const round = x => Math.round(x * 100) / 100;
const round5 = x => Math.round(x * 20) / 20;

// a knob value: anywhere (full) or inside its sensible range
export function randomKnob(seed, knob, inRange = true) {
  const r = stream(seed, `knob/${knob}`), [lo, hi] = inRange ? SENSIBLE[knob] : [0, 1];
  return round5(r.range(lo, hi));
}
export const randomKnobs = (seed, inRange = true) => Object.fromEntries(KNOBS.map(k => [k, randomKnob(seed, k, inRange)]));

// the genres that have styles, and the styles of a genre
export const genresOf = recipes => [...new Set(recipes.map(r => r.genre).filter(Boolean))].sort();
const stylesOfGenre = (recipes, g) => recipes.filter(r => r.genre === g).map(r => r.id).sort();
export function randomGenre(seed, recipes, allowed = null) {
  const list = genresOf(recipes).filter(g => !allowed || allowed.includes(g));
  return list.length ? stream(seed, 'genre').pick(list) : null;
}
// 1 to 3 styles of one genre (now and then one from a second genre)
export function randomStyles(seed, recipes, { genre = null, allowedGenres = null, allowedStyles = null } = {}) {
  const r = stream(seed, 'styles'), ok = id => !allowedStyles || allowedStyles.includes(id);
  const g = genre || randomGenre(seed, recipes.filter(x => ok(x.id)), allowedGenres);
  if (!g) return [];
  const own = r.shuffle(stylesOfGenre(recipes, g).filter(ok)), n = Math.min(own.length, r.int(1, 3));
  const out = own.slice(0, n);
  if (r.chance(0.25)) {
    const others = recipes.filter(x => x.genre !== g && ok(x.id) && (!allowedGenres || allowedGenres.includes(x.genre))).map(x => x.id).sort();
    if (others.length) out.push(r.pick(others));
  }
  return out;
}

// ---------- names and bios ----------
const ADJ = ['Velvet', 'Neon', 'Static', 'Hollow', 'Midnight', 'Chrome', 'Paper', 'Silent', 'Rust', 'Golden', 'Lunar', 'Broken', 'Glass', 'Electric', 'Distant', 'Feral', 'Pale', 'Wired', 'Low', 'Saint'];
const NOUN = ['Monk', 'Signal', 'Harbor', 'Engine', 'Orchid', 'Circuit', 'Tide', 'Ghost', 'Choir', 'Arcade', 'Lantern', 'Vessel', 'Atlas', 'Wolves', 'Static', 'Comet', 'Machine', 'Garden', 'Satellite', 'Riot'];
const SYL = ['ka', 'lo', 'mi', 'ra', 've', 'zu', 'no', 'si', 'ta', 'el', 'or', 'an', 'yu', 'ke', 'da', 'lu', 'vo', 'ri', 'sa', 'en'];
const cap = s => s[0].toUpperCase() + s.slice(1);
function makeName(r) {
  const kind = r.int(0, 2);
  if (kind === 0) return `${r.pick(ADJ)} ${r.pick(NOUN)}`;
  const word = n => cap(Array.from({ length: n }, () => r.pick(SYL)).join(''));
  if (kind === 1) return `${word(r.int(2, 3))} ${word(2)}`;
  return `${r.pick(['DJ', 'MC', 'The', 'Mx', 'Dr.'])} ${word(r.int(2, 3))}`;
}
const TRAITS = {
  energyHi: { en: 'builds everything up to big drops', it: 'porta tutto verso drop enormi' },
  energyLo: { en: 'keeps it low and close', it: 'resta basso e raccolto' },
  chaosHi: { en: 'never plays the same song twice', it: 'non suona mai due volte lo stesso brano' },
  chaosLo: { en: 'sticks to what works', it: 'resta su quello che funziona' },
  talkHi: { en: 'talks over everything', it: 'parla sopra a tutto' },
  complexHi: { en: 'stacks layer on layer', it: 'accumula strato su strato' },
  complexLo: { en: 'needs only a few sounds', it: 'gli bastano pochi suoni' },
};
const PLACES = [
  { en: 'Found on a tape in a flooded basement', it: 'Trovato su una cassetta in una cantina allagata' },
  { en: 'Plays only after midnight', it: 'Suona solo dopo mezzanotte' },
  { en: 'Grew up next to an arcade', it: 'Cresciuto accanto a una sala giochi' },
  { en: 'Broadcasts from an empty radio tower', it: 'Trasmette da una torre radio vuota' },
  { en: 'Learned music from old synth manuals', it: 'Ha imparato la musica dai vecchi manuali dei synth' },
  { en: 'Nobody has seen their face', it: 'Nessuno ha mai visto la sua faccia' },
];
const INSPIRED = ['late-night radio', 'arcade cabinets', 'rainy cities', 'old synth manuals', 'warehouse parties', 'film soundtracks', 'tape loops'];

// ---------- the artist ----------
// seed: any text; recipes: the styles it may like (built-in and the listener's); opts: { genres, styles } limits
export function makeArtist(seed, recipes, { allowedGenres = null, allowedStyles = null } = {}) {
  const r = stream(seed, 'artist-maker'), name = makeName(r);
  const styles = randomStyles(`${seed}/styles`, recipes, { allowedGenres, allowedStyles });
  const centre = k => r.range(SENSIBLE[k][0], SENSIBLE[k][1]), width = () => r.range(0.15, 0.35);
  const rangeOf = k => { const c = centre(k), w = width(); return [round(Math.max(0, c - w / 2)), round(Math.min(1, c + w / 2))]; };
  const knobs = Object.fromEntries(KNOBS.map(k => [k, rangeOf(k)]));
  const pace = (() => { const c = r.range(0.2, 0.8), w = width(); return [round(Math.max(0, c - w / 2)), round(Math.min(1, c + w / 2))]; })();
  const some = (list, lo, hi, wlo = 1, whi = 3) => Object.fromEntries(r.shuffle(list).slice(0, r.int(lo, hi)).map(k => [k, r.int(wlo, whi)]));
  const mid = k => (knobs[k][0] + knobs[k][1]) / 2;
  const traits = [];
  if (mid('energy') > 0.7) traits.push(TRAITS.energyHi); else if (mid('energy') < 0.45) traits.push(TRAITS.energyLo);
  if (mid('chaos') > 0.55) traits.push(TRAITS.chaosHi); else if (mid('chaos') < 0.3) traits.push(TRAITS.chaosLo);
  if (mid('talk') > 0.65) traits.push(TRAITS.talkHi);
  if (mid('complexity') > 0.65) traits.push(TRAITS.complexHi); else if (mid('complexity') < 0.4) traits.push(TRAITS.complexLo);
  const place = r.pick(PLACES), trait = traits.length ? r.pick(traits) : TRAITS.chaosLo;
  const bio = { en: `${place.en}: ${trait.en}.`, it: `${place.it}: ${trait.it}.` };
  const quirkKeys = Object.keys(QUIRKS);
  const quirks = Object.fromEntries(r.shuffle(quirkKeys).slice(0, r.int(0, 2)).map(k => [k, round(r.range(0.3, 0.9))]));
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artist'}-${String(seed).toLowerCase().replace(/[^a-z0-9]/g, '').slice(-4) || 'x'}`;
  return {
    format: 1, id, name, bio, inspiredBy: r.pick(INSPIRED),
    portrait: { seed: `${seed}-face`, palette: r.pick(PALETTES) },
    styles: Object.fromEntries(styles.map((s, i) => [s, i === 0 ? 3 : r.int(1, 2)])),
    explore: round(r.range(0.05, 0.25)), ...knobs, pace,
    shapes: some(SHAPES, 1, 3), moves: some(MOVE_KINDS, 2, 3),
    voice: { characters: some(VOICE_CHARACTER_NAMES, 1, 2), chance: round(r.range(0.2, 0.7)) },
    quirks,
    transitions: { kinds: some(TRANSITION_KINDS, 2, 4), bars: r.pick([[4, 8], [8, 16], [16, 32]]), harmony: r.chance(0.85) ? 'compatible' : 'free' },
  };
}
