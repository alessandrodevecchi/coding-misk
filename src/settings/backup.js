// Backup of everything the app keeps in this browser (#31): one JSON file to export, and an import that
// merges it into what is already here. Pure: checked in Node by tools/check-backup.mjs.
import { mergeTrash, mergeHidden } from '../library/trash.js';
import { upgradeLibrary } from '../library/code-upgrade.js';
import { CODE_VERSION } from '../song/writer.js';
import { DRAFTS_KEY, mergeDrafts } from '../library/pattern-drafts.js';
import { mergeUses } from '../library/patterns.js';
import { PHRASES_KEY, mergePhrases } from '../voices/phrases.js';
import { DECODES_KEY, mergeDecodes, plainRecord } from '../decode/store.js';
import { MIXTAPES_KEY, mergeMixtapes } from '../decode/mixtapes.js';
import { COMBOS_KEY, normalizeOverrides, COMBO_LANGS } from '../voices/combos.js';

export const BACKUP_FORMAT = 'coding-misk/backup';
export const PREFIX = 'coding-misk-';
// working state that does not belong in a backup
// (coding-misk-artist-voice: the old voice of the next song by an artist, no longer read since new-song-panel D9)
const SKIP = new Set(['coding-misk-draft', 'coding-misk-tab', 'coding-misk-panel', 'coding-misk-code-w', 'coding-misk-code-collapsed', 'coding-misk-artist-voice', 'coding-misk-cw-open', 'coding-misk-sw-open', 'coding-misk-voices-sub']);
// (coding-misk-voices-sub: the section of the Voci tab open last, my-phrases D9)

// entries: [[key, value]] of the browser storage (values parsed). Returns the backup object.
// decodes: the decoded tracks (track-to-code D3, IndexedDB), carried without their file handles (by default the 100
// used last, decode-library D14); mixtapes: the Decode mixtapes and their folders' names, without handles (D11)
export function makeBackup(entries, now = new Date(), decodes = null, mixtapes = null) {
  const data = {};
  for (const [k, v] of entries) if (k.startsWith(PREFIX) && !SKIP.has(k) && v !== null && v !== undefined) data[k] = v;
  if (mixtapes && Array.isArray(mixtapes.mixtapes) && mixtapes.mixtapes.length) data[MIXTAPES_KEY] = mixtapes;
  if (Array.isArray(decodes) && decodes.length) data[DECODES_KEY] = decodes.map(plainRecord).filter(Boolean);
  return { format: BACKUP_FORMAT, version: 1, created: now.toISOString(), data };
}
// the backup file in parts (D14, "Include all Decode analyses"): the backup without its analyses, then each batch of
// records as its own string, so neither every record nor one huge string is in memory at once. `base` has no
// DECODES_KEY; batches: arrays of records. → string parts for a Blob; their join parses to the whole backup
export function backupParts(base) {
  const s = JSON.stringify(base), head = s.slice(0, -2), n = Object.keys(base.data || {}).length;
  const parts = [head, `${n ? ',' : ''}${JSON.stringify(DECODES_KEY)}:[`];
  let first = true;
  return {
    add(records) { for (const r of records) { const p = plainRecord(r); if (!p) continue; parts.push(`${first ? '' : ','}${JSON.stringify(p)}`); first = false; } },
    // an empty list of analyses leaves no key, as makeBackup does
    end() { return first ? [s, '\n'] : [...parts, ']}}\n']; },
  };
}

const byId = (a, b) => { const out = (Array.isArray(a) ? a : []).slice(); for (const x of Array.isArray(b) ? b : []) { if (!x || !x.id) continue; const i = out.findIndex(y => y && y.id === x.id); if (i >= 0) out[i] = x; else out.push(x); } return out; };

// Merges a backup into the current values: songs, code songs, the trash, playlists, styles, artists, patterns and new parts are added or
// replaced by id (nothing here is deleted); settings take the backup's value. get(key) → current value.
// Returns { values: { key: value }, counts } or { error }.
export function mergeBackup(backup, get) {
  if (!backup || backup.format !== BACKUP_FORMAT || !backup.data || typeof backup.data !== 'object') return { error: 'format' };
  const values = {}, counts = { songs: 0, versions: 0, playlists: 0, styles: 0, artists: 0, patterns: 0, phrases: 0, settings: 0, decodes: 0, mixtapes: 0 };
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
      // the user's patterns (pattern-library) by id, like styles and artists; the use counts keep the larger count and
      // the newer last use of the two copies (saved-patterns-list D5)
      const cur = Array.isArray(get(k)) ? get(k) : [];
      values[k] = byId(cur, v).map(p => { const c = p && p.id && cur.find(x => x && x.id === p.id); return c && c !== p ? { ...p, ...mergeUses(c, p) } : p; });
      counts.patterns += (Array.isArray(v) ? v.length : 0);
    } else if (k === PHRASES_KEY) {
      // my phrases (my-phrases D1) by id; the use count keeps the larger value and last the newer one
      values[k] = mergePhrases(get(k), v);
      counts.phrases += (v && Array.isArray(v.items) ? v.items.length : 0);
    } else if (k === DRAFTS_KEY) {
      // new parts of the Patterns tab, not saved yet (pattern-followups D2): by id, newest kept up to the cap
      values[k] = mergeDrafts(get(k), v);
      counts.patterns += (Array.isArray(v) ? v.length : 0);
    } else if (k === 'coding-misk-played') {
      // last played (#67): every song keeps its latest time
      const cur = get(k) && typeof get(k) === 'object' ? get(k) : {}, out = { ...cur };
      for (const [id, at] of Object.entries(v && typeof v === 'object' ? v : {})) if (!(out[id] >= at)) out[id] = at;
      values[k] = out;
    } else if (k === 'coding-misk-song-trials') {
      // configuration trials per song (song-own-settings) by song id: the backup's trial wins, the others stay
      const cur = get(k) && typeof get(k) === 'object' && !Array.isArray(get(k)) ? get(k) : {};
      values[k] = { ...cur, ...(v && typeof v === 'object' && !Array.isArray(v) ? v : {}) };
      counts.settings++;
    } else if (k === 'coding-misk-song-presets') {
      // the owner's presets of the New song panel (new-song-panel D6) by name: the backup's wins, the others stay
      const cur = get(k) && typeof get(k) === 'object' && !Array.isArray(get(k)) ? get(k) : {};
      values[k] = { ...cur, ...(v && typeof v === 'object' && !Array.isArray(v) ? v : {}) };
      counts.settings++;
    } else if (k === COMBOS_KEY) {
      // the allowed voice styles the user changed (voice-combos-ui D6): per language and speaker the backup's list wins,
      // the other speakers stay; invalid parts of either side are dropped; a backup with nothing valid changes nothing
      const cur = normalizeOverrides(get(k)), add = normalizeOverrides(v), out = { format: cur.format };
      for (const l of COMBO_LANGS) if (cur[l] || add[l]) out[l] = { ...(cur[l] || {}), ...(add[l] || {}) };
      values[k] = out;
      counts.settings++;
    } else if (k === DECODES_KEY) {
      // decoded tracks (track-to-code D3) by fingerprint: the one used last wins; the import writes them to IndexedDB
      values[k] = mergeDecodes(get(k), v);
      counts.decodes = (counts.decodes || 0) + (Array.isArray(v) ? v.length : 0);
    } else if (k === MIXTAPES_KEY) {
      // the Decode mixtapes (decode-library D11) by id: the one changed last wins; the import writes them to IndexedDB
      values[k] = mergeMixtapes(get(k), v);
      counts.mixtapes += v && Array.isArray(v.mixtapes) ? v.mixtapes.length : 0;
    } else if (k === 'coding-misk-artist-voice') {
      continue;
    } else if (k === 'coding-misk-radio-history') {
      const cur = Array.isArray(get(k)) ? get(k) : [];
      values[k] = [...(Array.isArray(v) ? v : []), ...cur].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 50);
    } else { values[k] = v; counts.settings++; }
  }
  return { values, counts };
}
