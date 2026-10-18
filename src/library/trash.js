// The song trash (#68): deleted songs of the user wait here 30 days before they go for good. Pure: no DOM, no
// storage, time from the caller; checked in Node by tools/check-trash.mjs. The trash lives in the library object
// (localStorage key coding-misk-library) as trash: [{ id, kind, song, deletedAt }]; kind is "track" (a composed
// song, in tracks) or "version" (a hand-coded version, in codeSongs). Every function returns a new library.
// A built-in song lives in the app's files (#68, D3b): deleting it hides it in this browser. The library gets
// hidden: [id], the trash { id, kind: "builtin", title, deletedAt } with no copy of the song; restore shows it again,
// delete for good and the purge drop the entry and keep it hidden, showHidden() brings every hidden song back.
export const TRASH_DAYS = 30;
const DAY = 864e5;
const ms = now => (now instanceof Date ? now.getTime() : Number(now));
const listOf = lib => (lib && Array.isArray(lib.trash) ? lib.trash : []);
const without = (list, id) => (Array.isArray(list) ? list : []).filter(x => x && x.id !== id);

// moves a song to the trash: from tracks, or from codeSongs with its edited code; an unknown id changes nothing
export function trashSong(lib, id, now) {
  const track = (lib.tracks || []).find(x => x && x.id === id), version = !track && (lib.codeSongs || []).find(x => x && x.id === id);
  if (!track && !version) return lib;
  const code = { ...(lib.code || {}) };
  const song = track ? JSON.parse(JSON.stringify(track)) : { ...JSON.parse(JSON.stringify(version)), ...(code[id] ? { code: code[id] } : {}) };
  if (version) delete code[id];
  const entry = { id, kind: track ? 'track' : 'version', song, deletedAt: new Date(ms(now)).toISOString() };
  return { ...lib, tracks: track ? without(lib.tracks, id) : lib.tracks, codeSongs: version ? without(lib.codeSongs, id) : lib.codeSongs, code, trash: [entry, ...without(listOf(lib), id)] };
}

const hiddenOf = lib => (lib && Array.isArray(lib.hidden) ? lib.hidden : []);
export const hiddenIds = lib => new Set(hiddenOf(lib));
export const entryTitle = e => (e.song && e.song.title) || e.title || e.id;

// hides a built-in song and puts it in the trash; an edit of it (in tracks or code) stays for a restore
export function hideSong(lib, id, title, now) {
  const entry = { id, kind: 'builtin', title: String(title || id), deletedAt: new Date(ms(now)).toISOString() };
  return { ...lib, hidden: [...hiddenOf(lib).filter(x => x !== id), id], trash: [entry, ...without(listOf(lib), id)] };
}

// every hidden built-in song back in the list; their trash entries go with it
export const showHidden = lib => ({ ...lib, hidden: [], trash: listOf(lib).filter(e => e.kind !== 'builtin') });

// back to the song list with the same id and content; a song alive again under that id wins, the entry just goes;
// a built-in song is shown again
export function restoreSong(lib, id) {
  const e = listOf(lib).find(x => x.id === id), out = { ...lib, trash: without(listOf(lib), id) };
  if (!e) return out;
  if (e.kind === 'builtin') return { ...out, hidden: hiddenOf(lib).filter(x => x !== id) };
  const key = e.kind === 'version' ? 'codeSongs' : 'tracks', cur = Array.isArray(lib[key]) ? lib[key] : [];
  if (!cur.some(x => x && x.id === id)) out[key] = [...cur, e.song];
  return out;
}

export const deleteForGood = (lib, id) => ({ ...lib, trash: without(listOf(lib), id) });
export const emptyTrash = lib => ({ ...lib, trash: [] });

// whole days before the purge, rounded up: a song deleted today has 30
export const daysLeft = (entry, now, days = TRASH_DAYS) => Math.max(0, Math.ceil((Date.parse(entry.deletedAt) + days * DAY - ms(now)) / DAY));

// drops the entries deleted `days` days ago or more (also the ones with a broken date)
export const purgeTrash = (lib, now, days = TRASH_DAYS) => ({ ...lib, trash: listOf(lib).filter(e => ms(now) - Date.parse(e.deletedAt) < days * DAY) });

// the trash for the view: the most recent first
export const trashList = lib => listOf(lib).slice().sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));

// two trashes merged by id (the second wins, as the backup does for songs); alive: ids still in the song list,
// which never stay in the trash, so an import never deletes a song. A hidden built-in song keeps its entry: an edit
// of it in tracks does not make it alive
export function mergeTrash(a, b, alive = new Set()) {
  const out = (Array.isArray(a) ? a : []).filter(e => e && e.id);
  for (const e of Array.isArray(b) ? b : []) { if (!e || !e.id) continue; const i = out.findIndex(x => x.id === e.id); if (i >= 0) out[i] = e; else out.push(e); }
  return out.filter(e => e.kind === 'builtin' || !alive.has(e.id));
}

// hidden built-in songs of two libraries: the union, a song hidden on either side stays hidden
export const mergeHidden = (a, b) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].filter(x => typeof x === 'string' && x))];
