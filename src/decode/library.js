// The Decode library's list (decode-library D4, D5, D8, D15), without the DOM: one row per track from the folders'
// index, the decode store's light index and the folders' permission; names (stored title, tags read, file name); the
// marks ◆ Full and ◇ Live by where a stored track was opened from (no file is read); search ignoring case and accents;
// the folder chip; the order by name or by recent; the next and the previous row of the list or the mixtape a track
// was opened from. Checked in Node (npm run check:decode-library).
import { titleFromName } from './input.js';
import { markOf } from './store.js';

export const LIST_KEY = 'coding-misk-decode-list';
export const AUTOPLAY_KEY = 'coding-misk-decode-autoplay';
export const ORDERS = ['name', 'recent'];
// the kind filter (decode-library, owner 11 November): every track, audio files, video files (a video without sound is a
// video). Called `media` in the prefs and the context, since a context's `kind` is already 'list' or 'mixtape'
export const MEDIA = ['all', 'audio', 'video'];
// lower case without accents, for the search
export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
export const fileKey = (folderId, path) => `${folderId}/${path}`;
// the remembered chip and order (the search text is not remembered)
export function listPrefs(v) {
  const o = v && typeof v === 'object' ? v : {};
  return { chip: typeof o.chip === 'string' && o.chip ? o.chip : 'all', order: ORDERS.includes(o.order) ? o.order : 'name', media: MEDIA.includes(o.media) ? o.media : 'all' };
}

// the rows (D4, D5). folders: [{ id, name, granted, capped }], files: the folders' index, entries: the decode store's
// index. A stored track whose `where` points to a listed file with the same size and date is that file's row; the
// others are "Recent" rows. A folder not granted marks its rows as waiting.
export function buildRows({ folders = [], files = [], entries = [] } = {}) {
  const fold = new Map(folders.map(f => [f.id, f])), byWhere = new Map(), rows = [], used = new Set();
  for (const e of entries) if (e && e.where && e.where.folderId) { const k = fileKey(e.where.folderId, e.where.path); const o = byWhere.get(k); if (!o || (e.used || 0) > (o.used || 0)) byWhere.set(k, e); }
  for (const f of files) {
    const folder = fold.get(f.folderId);
    if (!folder) continue;
    const key = fileKey(f.folderId, f.path), e0 = byWhere.get(key), e = e0 && e0.where.size === f.size && e0.where.modified === f.modified ? e0 : null;
    if (e) used.add(e.fp);
    const named = titleFromName(f.name);
    const name = (e && e.title) || f.title || named.title, artist = (e && e.artist) || f.artist || (f.title ? '' : named.artist);
    rows.push({
      key, kind: 'file', folderId: f.folderId, folderName: folder.name, path: f.path, fileName: f.name, size: f.size, modified: f.modified,
      name, artist, mark: e ? markOf(e) : null, used: e ? e.used || 0 : 0, fp: e ? e.fp : null, video: !!f.video,
      waiting: !folder.granted, missing: !!f.missing, silent: f.audio === false, norm: norm(`${name} ${artist} ${f.name}`),
    });
  }
  for (const e of entries) {
    if (!e || used.has(e.fp)) continue;
    const name = e.title || titleFromName(e.name).title;
    rows.push({
      key: `fp:${e.fp}`, kind: 'recent', folderId: null, folderName: null, path: null, fileName: e.name, name, artist: e.artist || '',
      mark: markOf(e), used: e.used || 0, fp: e.fp, video: !!e.video, hasHandle: !!e.hasHandle, waiting: false, missing: false,
      norm: norm(`${name} ${e.artist || ''} ${e.name || ''}`),
    });
  }
  return rows;
}
// the rows of a chip and a search: 'all' holds every row, recent ones included
export const mediaOf = r => (r.video ? 'video' : 'audio');
export function filterRows(rows, { chip = 'all', search = '', media = 'all' } = {}) {
  const q = norm(search).trim();
  return rows.filter(r => (chip === 'all' || r.folderId === chip) && (media === 'all' || mediaOf(r) === media) && (!q || r.norm.includes(q)));
}
// the counts on the kind filter: the rows of a chip and a search, by kind (the rows in memory, no file read)
export function mediaCounts(rows, { chip = 'all', search = '' } = {}) {
  const out = { all: 0, audio: 0, video: 0 };
  for (const r of filterRows(rows, { chip, search })) { out.all++; out[mediaOf(r)]++; }
  return out;
}
// by name; by recent: the tracks opened last first, then the others by name
// used: the last uses frozen in a context ({ key: time }, decode-library D8), in place of the rows' own
export function sortRows(rows, order = 'name', used = null) {
  const byN = (a, b) => collator.compare(a.name, b.name) || collator.compare(a.folderName || '', b.folderName || '') || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const u = used ? r => used[r.key] || 0 : r => r.used || 0;
  return [...rows].sort(order === 'recent' ? (a, b) => (u(b) - u(a)) || byN(a, b) : byN);
}
export const listOf = (rows, { chip, search, order, used, media } = {}) => sortRows(filterRows(rows, { chip, search, media }), order, used);
// the last uses of the rows now, kept by a context with the order by recent (decode-library D8, owner 2026-11-11): the
// tracks that play meanwhile do not move to the top of its list
export function usedSnapshot(rows) {
  const out = {};
  for (const r of rows) if (r.used) out[r.key] = r.used;
  return out;
}
// a row Autoplay, Previous, Next and a mixtape's Play can open: not "not found", not waiting for access (a video without
// sound plays, in silence)
export const playable = r => !!r && !r.missing && !r.waiting;

// the context of the open track (D8): { kind: 'list', chip, search, order, key, pos } | { kind: 'mixtape', id, rowId,
// pos } | null (a picked or dropped file)
export function listContext(prefs, search, key, rows) {
  const ctx = { kind: 'list', chip: prefs.chip, media: prefs.media || 'all', search: search || '', order: prefs.order, key, ...(prefs.order === 'recent' ? { used: usedSnapshot(rows) } : {}) };
  ctx.pos = Math.max(0, listOf(rows, ctx).findIndex(r => r.key === key));
  return ctx;
}
// the row after (dir 1) or before (dir -1) the open one in its list, skipping rows that cannot open. A row gone from the
// list (renamed meanwhile) continues from the position it had. → { row, pos } | null
export function stepList(ctx, rows, dir = 1) {
  if (!ctx || ctx.kind !== 'list') return null;
  // rows: every row (filtered and sorted here), or { list } already filtered and sorted for this context
  const list = Array.isArray(rows) ? listOf(rows, ctx) : rows.list || [];
  let i = list.findIndex(r => r.key === ctx.key);
  if (i < 0) i = dir > 0 ? (ctx.pos || 0) - 1 : (ctx.pos || 0);
  for (let j = i + dir; j >= 0 && j < list.length; j += dir) if (playable(list[j])) return { row: list[j], pos: j };
  return null;
}
// the same in a mixtape: rows with their status; repeat wraps around (also backwards). → { row, pos } | null
export function stepMixtape(ctx, mixRows, repeat = false, dir = 1) {
  if (!ctx || ctx.kind !== 'mixtape' || !mixRows.length) return null;
  const n = mixRows.length;
  let i = mixRows.findIndex(r => r.id === ctx.rowId);
  if (i < 0) i = dir > 0 ? Math.min(n, ctx.pos || 0) - 1 : Math.min(n, ctx.pos || 0);
  for (let k = 1; k <= n; k++) {
    let j = i + dir * k;
    if (j < 0 || j >= n) { if (!repeat) return null; j = ((j % n) + n) % n; }
    if (j === i && k === n && !playable(mixRows[j])) return null;
    if (playable(mixRows[j])) return { row: mixRows[j], pos: j };
  }
  return null;
}
// the next row (Autoplay, Next) and the previous one (Previous): rows is the list's rows, or a mixtape { rows, repeat }
export const nextOf = (ctx, src) => (!ctx ? null : ctx.kind === 'mixtape' ? stepMixtape(ctx, src.rows || [], !!src.repeat, 1) : stepList(ctx, src, 1));
export const prevOf = (ctx, src) => (!ctx ? null : ctx.kind === 'mixtape' ? stepMixtape(ctx, src.rows || [], !!src.repeat, -1) : stepList(ctx, src, -1));

// the windowed rows of a long list (D6): the first and last index to draw for a scroll offset
export function windowOf(scrollTop, height, rowH, total, margin = 8) {
  const first = Math.max(0, Math.floor(scrollTop / rowH) - margin), last = Math.min(total, Math.ceil((scrollTop + height) / rowH) + margin);
  return { first, last };
}
