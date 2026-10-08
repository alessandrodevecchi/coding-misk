// Backup of everything the app keeps in this browser (#31): one JSON file to export, and an import that
// merges it into what is already here. Pure: checked in Node by tools/check-backup.mjs.
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

// Merges a backup into the current values: songs, code songs, playlists, styles and artists are added or
// replaced by id (nothing here is deleted); settings take the backup's value. get(key) → current value.
// Returns { values: { key: value }, counts } or { error }.
export function mergeBackup(backup, get) {
  if (!backup || backup.format !== BACKUP_FORMAT || !backup.data || typeof backup.data !== 'object') return { error: 'format' };
  const values = {}, counts = { songs: 0, versions: 0, playlists: 0, styles: 0, artists: 0, settings: 0 };
  for (const [k, v] of Object.entries(backup.data)) {
    if (!k.startsWith(PREFIX)) continue;
    if (k === 'coding-misk-library') {
      const cur = get(k) || { tracks: [], code: {} };
      values[k] = { ...cur, tracks: byId(cur.tracks, v.tracks), codeSongs: byId(cur.codeSongs, v.codeSongs), code: { ...(cur.code || {}), ...(v.code || {}) } };
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
    } else if (k === 'coding-misk-radio-history') {
      const cur = Array.isArray(get(k)) ? get(k) : [];
      values[k] = [...(Array.isArray(v) ? v : []), ...cur].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 50);
    } else { values[k] = v; counts.settings++; }
  }
  return { values, counts };
}
