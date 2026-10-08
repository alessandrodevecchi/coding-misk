// Search, filters and sorting of the Songs tab (#34). Pure: no DOM, no storage, testable in Node
// (tools/check-song-filter.mjs). The app builds one entry per song card and a view state.
import { GENRES } from '../song/format.js';

export const KINDS = ['standard', 'live', 'generated', 'mine', 'code'];
export const SORTS = ['default', 'title', 'bpm', 'length'];
export const VIEW_DEFAULT = { q: '', genres: [], styles: [], kinds: [], favOnly: false, sort: 'default' };

// lowercase, without accents: "Frigio" and "frìgio" match "frigio"
export const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// the kind label of a song: code tracks, director songs, live builds, the rest
export function kindOf({ code = false, origin, build = false }) {
  if (code) return 'code';
  if (origin === 'endless') return 'generated';
  return build ? 'live' : 'standard';
}

// genres of a song: those of its styles (genreOf: style id → genre) plus its own, without duplicates, in list order
export function genresOf(tags, genreOf) {
  const out = new Set(((tags && tags.genres) || []).filter(g => GENRES.includes(g)));
  for (const id of (tags && tags.styles) || []) { const g = genreOf(id); if (g) out.add(g); }
  return GENRES.filter(g => out.has(g));
}

// One searchable entry. song: { id, title, style, tags, origin, code, build, mine, bpm, seconds }.
// names: { style(id) → [names in every language], genre(id) → [names in every language], genreOf(id) → genre }
export function songEntry(song, index, names, favourites = []) {
  const tags = song.tags || {};
  const genres = genresOf(tags, names.genreOf);
  const styles = [...new Set(tags.styles || [])];
  const free = [...new Set(tags.free || [])];
  const style = song.style && typeof song.style === 'object' ? Object.values(song.style) : [song.style];
  const text = fold([song.title, ...style, ...styles.flatMap(id => [id, ...names.style(id)]), ...genres.flatMap(g => names.genre(g)), ...free].filter(Boolean).join(' \u0001 '));
  return {
    id: song.id, index, title: song.title || '', text, genres, styles, free,
    kind: kindOf(song), mine: !!song.mine, fav: favourites.includes(song.id),
    bpm: Number(song.bpm) || 0, seconds: Number(song.seconds) || 0,
  };
}

const matchKinds = (e, kinds) => kinds.some(k => (k === 'mine' ? e.mine : e.kind === k));

// entries that match the view, in the view's order. Chips of one group combine with OR, groups and search with AND.
export function filterSongs(entries, view = VIEW_DEFAULT) {
  const v = { ...VIEW_DEFAULT, ...view };
  const words = fold(v.q).split(/\s+/).filter(Boolean);
  const out = entries.filter(e =>
    words.every(w => e.text.includes(w)) &&
    (!v.genres.length || v.genres.some(g => e.genres.includes(g))) &&
    (!v.styles.length || v.styles.some(s => e.styles.includes(s))) &&
    (!v.kinds.length || matchKinds(e, v.kinds)) &&
    (!v.favOnly || e.fav));
  const by = {
    default: (a, b) => a.index - b.index,
    title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || a.index - b.index,
    bpm: (a, b) => a.bpm - b.bpm || a.index - b.index,
    length: (a, b) => a.seconds - b.seconds || a.index - b.index,
  }[SORTS.includes(v.sort) ? v.sort : 'default'];
  return out.sort(by);
}

// a stored view, cleaned: unknown values dropped, so an old or broken state never hides songs for good
export function cleanView(raw, { styles = [] } = {}) {
  const v = { ...VIEW_DEFAULT, ...(raw && typeof raw === 'object' ? raw : {}) };
  const list = (x, ok) => (Array.isArray(x) ? [...new Set(x.filter(ok))] : []);
  return {
    q: typeof v.q === 'string' ? v.q.slice(0, 120) : '',
    genres: list(v.genres, g => GENRES.includes(g)),
    styles: list(v.styles, s => typeof s === 'string' && (!styles.length || styles.includes(s))),
    kinds: list(v.kinds, k => KINDS.includes(k)),
    favOnly: !!v.favOnly,
    sort: SORTS.includes(v.sort) ? v.sort : 'default',
  };
}

// free tags typed by the user: "Reel, night drive" → ["reel", "night drive"]
export const parseFree = text => [...new Set(String(text || '').split(',').map(s => fold(s).trim().replace(/\s+/g, ' ').replace(/[^a-z0-9 -]/g, '').replace(/^[ -]+/, '').slice(0, 24).trim()).filter(Boolean))];
