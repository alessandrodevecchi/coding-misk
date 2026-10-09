// Playlists (#36): the store kept in the browser, the play queue (order, shuffle, repeat) and the export file.
// No DOM: checked in Node by tools/check-playlists.mjs.

export const PLAYLISTS_KEY = 'coding-misk-playlists';
export const OLD_FAV_KEY = 'coding-misk-favourites';
export const FAV_ID = 'favourites';
export const REPEATS = ['off', 'all', 'one'];
export const PLAYLIST_FORMAT = 'coding-misk/playlist';
// radio sessions as playlist items (#38): an id with this prefix in a list's songs, its data in data.sessions
export const SESSION_PREFIX = 'session:';
export const isSession = id => typeof id === 'string' && id.startsWith(SESSION_PREFIX);

const uniq = list => [...new Set(list.filter(x => typeof x === 'string' && x))];

// A free name: "Night run" → "Night run 2" when taken.
export function freeName(name, taken) {
  const base = String(name || '').trim() || 'Playlist';
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

// The playlists of this browser. store: { get(key, default), set(key, value) }.
// Favourites always exists, comes first and has no name of its own (the app translates it).
export function createPlaylistStore(store, now = () => Date.now()) {
  let data = store.get(PLAYLISTS_KEY, null);
  if (!data || !Array.isArray(data.lists)) data = { format: 1, lists: [] };
  if (!data.sessions || typeof data.sessions !== 'object') data.sessions = {};
  data.lists = data.lists.filter(l => l && typeof l.id === 'string').map(l => ({ id: l.id, name: l.id === FAV_ID ? null : String(l.name || 'Playlist'), songs: uniq(l.songs || []) }));
  if (!data.lists.some(l => l.id === FAV_ID)) data.lists.unshift({ id: FAV_ID, name: null, songs: [] });
  else data.lists = [data.lists.find(l => l.id === FAV_ID), ...data.lists.filter(l => l.id !== FAV_ID)];
  // favourites of the Songs tab (#34), kept under their own key before playlists existed
  const old = store.get(OLD_FAV_KEY, null);
  if (Array.isArray(old)) {
    const fav = data.lists[0];
    fav.songs = uniq([...fav.songs, ...old]);
    if (store.remove) store.remove(OLD_FAV_KEY); else store.set(OLD_FAV_KEY, null);
  }
  const save = () => store.set(PLAYLISTS_KEY, data);
  save();

  const get = id => data.lists.find(l => l.id === id) || null;
  const names = () => data.lists.filter(l => l.id !== FAV_ID).map(l => l.name);
  let n = 0;
  const sessionId = () => { let id; do id = `${SESSION_PREFIX}${now().toString(36)}${(n++).toString(36)}`; while (data.sessions[id]); return id; };
  // sessions no list holds any more are forgotten
  const gc = () => { const used = new Set(data.lists.flatMap(l => l.songs)); for (const id of Object.keys(data.sessions)) if (!used.has(id)) delete data.sessions[id]; };
  // sessions brought in from an export: kept under a new id when the id is taken by a different session
  const adopt = (songs, sessions = {}) => songs.map(id => {
    if (!isSession(id) || !sessions[id]) return id;
    if (!data.sessions[id] || JSON.stringify(data.sessions[id]) === JSON.stringify(sessions[id])) { data.sessions[id] = sessions[id]; return id; }
    const fresh = sessionId(); data.sessions[fresh] = sessions[id]; return fresh;
  });
  const api = {
    get all() { return data.lists; },
    get,
    get favourites() { return data.lists[0]; },
    isFav: songId => data.lists[0].songs.includes(songId),
    toggleFav(songId) {
      const fav = data.lists[0];
      fav.songs = fav.songs.includes(songId) ? fav.songs.filter(x => x !== songId) : [...fav.songs, songId];
      save();
      return fav.songs.includes(songId);
    },
    // a new playlist; returns it
    create(name, songs = [], sessions = {}) {
      const list = { id: `p-${now().toString(36)}${(n++).toString(36)}`, name: freeName(name, names()), songs: uniq(adopt(songs, sessions)) };
      data.lists.push(list); save();
      return list;
    },
    rename(id, name) {
      const l = get(id); if (!l || id === FAV_ID) return false;
      const clean = String(name || '').trim(); if (!clean) return false;
      l.name = clean === l.name ? clean : freeName(clean, names().filter(x => x !== l.name)); save();
      return true;
    },
    remove(id) {
      if (id === FAV_ID || !get(id)) return false;
      data.lists = data.lists.filter(l => l.id !== id); gc(); save();
      return true;
    },
    // a radio session (#38): { recipe, count, title, date, version, frozen? }; added at the end, returns its id
    addSession(id, session) {
      const l = get(id); if (!l || !session || !session.recipe) return null;
      const sid = sessionId();
      data.sessions[sid] = { ...session };
      l.songs.push(sid); save();
      return sid;
    },
    session: sid => data.sessions[sid] || null,
    // Freeze: the songs as played, so the session sounds the same whatever the director becomes
    freeze(sid, songs) { const s = data.sessions[sid]; if (!s || !Array.isArray(songs)) return false; s.frozen = songs; save(); return true; },
    // add a song at the end; false when it is already there
    add(id, songId) {
      const l = get(id); if (!l || l.songs.includes(songId)) return false;
      l.songs.push(songId); save();
      return true;
    },
    removeAt(id, index) {
      const l = get(id); if (!l || index < 0 || index >= l.songs.length) return false;
      l.songs.splice(index, 1); gc(); save();
      return true;
    },
    move(id, from, to) {
      const l = get(id); if (!l || from === to || from < 0 || from >= l.songs.length || to < 0 || to >= l.songs.length) return false;
      const [x] = l.songs.splice(from, 1); l.songs.splice(to, 0, x); save();
      return true;
    },
    // replace a song id everywhere (an imported song that got a new id)
    renameSong(from, to) { for (const l of data.lists) l.songs = uniq(l.songs.map(x => (x === from ? to : x))); save(); },
  };
  return api;
}

// A random order of ids with `first` (when given) at the start.
export function shuffled(ids, rand = Math.random, first = null) {
  const out = ids.filter(x => x !== first);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return first !== null && ids.includes(first) ? [first, ...out] : out;
}

// The play order of a playlist. ids: the playlist's songs; start: the song to begin with;
// exists(id): whether the song is still in the library (missing songs are skipped).
// next({ auto: true }) is the end of a song: repeat one replays it; a press on "next" always moves on.
export function createQueue({ ids, start = null, shuffle = false, repeat = 'off', rand = Math.random, exists = () => true, name = '', listId = null }) {
  const base = ids.slice();
  let shuf = !!shuffle, rep = REPEATS.includes(repeat) ? repeat : 'off';
  let order = shuf ? shuffled(base, rand, start ?? base[0]) : base.slice();
  let pos = Math.max(0, start !== null ? order.indexOf(start) : 0);
  // the first playable position from i going in direction dir, or -1
  const seek = (i, dir) => { for (; i >= 0 && i < order.length; i += dir) if (exists(order[i])) return i; return -1; };
  if (!exists(order[pos])) pos = Math.max(0, seek(pos, 1));
  const q = {
    name, listId,
    get current() { return order.length && exists(order[pos]) ? order[pos] : null; },
    get position() { const ok = order.filter(exists); return { n: ok.indexOf(order[pos]) + 1, total: ok.length }; },
    get shuffle() { return shuf; },
    get repeat() { return rep; },
    get order() { return order.slice(); },
    next({ auto = false } = {}) {
      if (!order.length) return null;
      if (auto && rep === 'one' && exists(order[pos])) return order[pos];
      let i = seek(pos + 1, 1);
      if (i < 0) {
        if (rep === 'off' || (auto === false && rep === 'one')) return null;
        if (shuf) order = shuffled(base, rand);
        i = seek(0, 1);
        if (i < 0) return null;
      }
      pos = i;
      return order[pos];
    },
    prev() {
      if (!order.length) return null;
      let i = seek(pos - 1, -1);
      if (i < 0) { if (rep !== 'all') return null; i = seek(order.length - 1, -1); if (i < 0) return null; }
      pos = i;
      return order[pos];
    },
    // shuffle on: a new order that keeps the current song first; off: the playlist order from the current song
    setShuffle(on) {
      const cur = order[pos];
      shuf = !!on;
      order = shuf ? shuffled(base, rand, cur) : base.slice();
      pos = Math.max(0, order.indexOf(cur));
    },
    setRepeat(mode) { if (REPEATS.includes(mode)) rep = mode; },
    // the song that would come next at the end of this one, without moving (null at a reshuffle or the end)
    peek() {
      if (!order.length || rep === 'one') return null;
      const i = seek(pos + 1, 1);
      if (i >= 0) return order[i];
      if (rep !== 'all' || shuf) return null;
      const j = seek(0, 1);
      return j >= 0 ? order[j] : null;
    },
    // jump to a song of the playlist (picked by the user)
    jump(id) { const i = order.indexOf(id); if (i < 0) return false; pos = i; return true; },
  };
  return q;
}

// Export: the playlist with copies of the user's own songs it lists. isUser(id) → the user's song or null.
// sessionOf(id) → the radio session item (#38), exported with the playlist (frozen songs included)
export function exportPlaylist(list, userSong, favName = 'Favourites', sessionOf = () => null) {
  const userSongs = list.songs.filter(id => !isSession(id)).map(userSong).filter(Boolean);
  const sessions = Object.fromEntries(list.songs.filter(isSession).map(id => [id, sessionOf(id)]).filter(([, s]) => s));
  return { format: PLAYLIST_FORMAT, version: 1, name: list.name || favName, songs: list.songs.slice(), userSongs, ...(Object.keys(sessions).length ? { sessions } : {}) };
}

// Import: which user songs to add (with new ids on a clash with different content) and the playlist songs.
// has(id) → the existing song with that id, or null.
export function importPlaylist(data, has, newId) {
  if (!data || data.format !== PLAYLIST_FORMAT || !Array.isArray(data.songs)) return { error: 'format' };
  const add = [], ids = {};
  for (const s of Array.isArray(data.userSongs) ? data.userSongs : []) {
    if (!s || typeof s.id !== 'string') continue;
    const cur = has(s.id);
    if (!cur) { add.push(s); continue; }
    if (JSON.stringify(cur) === JSON.stringify(s)) continue;
    const id = newId(s.id);
    ids[s.id] = id; add.push({ ...s, id });
  }
  const sessions = data.sessions && typeof data.sessions === 'object' ? Object.fromEntries(Object.entries(data.sessions).filter(([id, s]) => isSession(id) && s && s.recipe)) : {};
  return { name: String(data.name || 'Playlist'), songs: uniq(data.songs.map(x => ids[x] || x)), add, sessions };
}
