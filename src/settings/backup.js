// Backup of everything the app keeps in this browser (#31): one JSON file to export, and an import that
// merges it into what is already here. Pure: checked in Node by tools/check-backup.mjs.
import { mergeTrash, mergeHidden } from '../library/trash.js';
import { upgradeLibrary } from '../library/code-upgrade.js';
import { CODE_VERSION } from '../song/writer.js';

export const BACKUP_FORMAT = 'coding-misk/backup';
export const PREFIX = 'coding-misk-';
// working state that does not belong in a backup
const SKIP = new Set(['coding-misk-draft', 'coding-misk-tab', 'coding-misk-panel', 'coding-misk-code-w', 'coding-misk-code-collapsed']);

// entries: [[key, value]] of the browser storage (values parsed). Returns the backup object.
export function makeBackup(entries, now = new Date()) {
  const data = {};
  for (const [k, v] of entries) if (k.startsWith(PREFIX) && !SKIP.has(k) && v !== null && v !== undefined) data[k] = v;
  return { format: BACKUP_FORMAT, version: 1, created: now.toISOString(), data };
}

const byId = (a, b) => { const out = (Array.isArray(a) ? a : []).slice(); for (const x of Array.isArray(b) ? b : []) { if (!x || !x.id) continue; const i = out.findIndex(y => y && y.id === x.id); if (i >= 0) out[i] = x; else out.push(x); } return out; };

// Merges a backup into the current values: songs, code songs, the trash, playlists, styles, artists and patterns are added or
// replaced by id (nothing here is deleted); settings take the backup's value. get(key) → current value.
// Returns { values: { key: value }, counts } or { error }.
export function mergeBackup(backup, get) {
  if (!backup || backup.format !== BACKUP_FORMAT || !backup.data || typeof backup.data !== 'object') return { error: 'format' };
  const values = {}, counts = { songs: 0, versions: 0, playlists: 0, styles: 0, artists: 0, patterns: 0, settings: 0 };
  for (let [k, v] of Object.entries(backup.data)) {
    if (!k.startsWith(PREFIX)) continue;
    if (k === 'coding-misk-library') {
      // hand-coded code from an older backup gets the new helper names first (song-functions)
      v = upgradeLibrary(v);
      const cur = get(k) || { tracks: [], code: {} };
      const tracks = byId(cur.tracks, v.tracks), codeSongs = byId(cur.codeSongs, v.codeSongs);
      // the trash (#68) by id too; a song in the list on either side leaves it, so an import never deletes
      const trash = mergeTrash(cur.trash, v.trash, new Set([...tracks, ...codeSongs].filter(x => x && x.id).map(x => x.id)));
      // hidden built-in songs (#68, D3b) as a union: a song hidden on either side stays hidden
      values[k] = { ...cur, tracks, codeSongs, code: { ...(cur.code || {}), ...(v.code || {}) }, trash, hidden: mergeHidden(cur.hidden, v.hidden), codeVersion: CODE_VERSION };
      counts.songs += (v.tracks || []).length; counts.versions += (v.codeSongs || []).length;
    } else if (k === 'coding-misk-playlists') {
      const cur = get(k) || { format: 1, lists: [] };
      const lists = byId(cur.lists, (v.lists || []).filter(l => l.id !== 'favourites'));
      const favCur = (cur.lists || []).find(l => l.id === 'favourites'), favNew = (v.lists || []).find(l => l.id === 'favourites');
      const fav = { id: 'favourites', name: null, songs: [...new Set([...((favCur && favCur.songs) || []), ...((favNew && favNew.songs) || [])])] };
      values[k] = { ...cur, lists: [fav, ...lists.filter(l => l.id !== 'favourites')] };
      counts.playlists += (v.lists || []).length;
    } else if (k === 'coding-misk-styles' || k === 'coding-misk-artists') {
      values[k] = byId(get(k), v);
      counts[k === 'coding-misk-styles' ? 'styles' : 'artists'] += (Array.isArray(v) ? v.length : 0);
    } else if (k === 'coding-misk-patterns') {
      // the user's patterns (pattern-library) by id, like styles and artists
      values[k] = byId(get(k), v);
      counts.patterns += (Array.isArray(v) ? v.length : 0);
    } else if (k === 'coding-misk-played') {
      // last played (#67): every song keeps its latest time
      const cur = get(k) && typeof get(k) === 'object' ? get(k) : {}, out = { ...cur };
      for (const [id, at] of Object.entries(v && typeof v === 'object' ? v : {})) if (!(out[id] >= at)) out[id] = at;
      values[k] = out;
    } else if (k === 'coding-misk-radio-history') {
      const cur = Array.isArray(get(k)) ? get(k) : [];
      values[k] = [...(Array.isArray(v) ? v : []), ...cur].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 50);
    } else { values[k] = v; counts.settings++; }
  }
  return { values, counts };
}
