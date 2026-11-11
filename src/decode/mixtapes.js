// Mixtapes (decode-library D11), without the DOM: ordered references to the user's files, never audio. A row is
// { id, ref, name, video } with ref = { folderId, folderName, path } (a file of a folder) or { singleId, fileName, size }
// (a file added with "File…"). Create, add several rows in the list's order, move, remove, rename, repeat, delete; the
// row status (ok, waiting for the browser's permission, missing); rows linked again when a folder with the same name is
// added; the backup's export without handles and the merge by id on import (the one changed last wins). Mixtapes are
// not the app's playlists, which hold generated songs. Checked in Node (npm run check:decode-library).
export const MIXTAPES_KEY = 'coding-misk-decode-mixtapes';
const uid = (p, now) => `${p}${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const touched = (m, now) => ({ ...m, updated: now });

export function createMixtape(name, now = Date.now()) {
  return { id: uid('m', now), name: String(name || '').trim() || 'Mixtape', rows: [], repeat: false, created: now, updated: now };
}
// a mixtape row from a list row (a folder file) or a single file
export function rowOf(src, now = Date.now()) {
  if (src && src.singleId) return { id: uid('r', now), ref: { singleId: src.singleId, fileName: src.fileName || src.name || '', size: src.size || 0 }, name: src.name || src.fileName || '', video: !!src.video };
  return { id: uid('r', now), ref: { folderId: src.folderId, folderName: src.folderName || '', path: src.path }, name: src.name || src.fileName || '', video: !!src.video };
}
export const addRows = (m, srcs, now = Date.now()) => touched({ ...m, rows: [...m.rows, ...srcs.map(s => rowOf(s, now))] }, now);
export function moveRow(m, from, to, now = Date.now()) {
  if (from === to || from < 0 || from >= m.rows.length) return m;
  const rows = [...m.rows], [r] = rows.splice(from, 1);
  rows.splice(Math.max(0, Math.min(rows.length, to)), 0, r);
  return touched({ ...m, rows }, now);
}
export const removeRow = (m, id, now = Date.now()) => touched({ ...m, rows: m.rows.filter(r => r.id !== id) }, now);
export const renameMixtape = (m, name, now = Date.now()) => touched({ ...m, name: String(name || '').trim() || m.name }, now);
export const setRepeat = (m, on, now = Date.now()) => touched({ ...m, repeat: !!on }, now);
// a single file row picked again (from another browser): the row points to the new single
export const relinkSingle = (m, rowId, single, now = Date.now()) => touched({ ...m, rows: m.rows.map(r => (r.id === rowId ? { ...r, ref: { singleId: single.id, fileName: single.name, size: single.size || 0 } } : r)) }, now);

// a row's status: 'ok' | 'waiting' (folder or file not allowed yet in this session) | 'missing' (folder unknown, path not
// in its index, file gone) | 'nosound' (a file known to hold no sound). folders: Map id → { granted }; files: Set of
// `folderId/path`; singles: Map id → { granted }; gone: Set of row refs that failed to open (`folderId/path` or
// `s:singleId`); silent: Set of the same refs known to hold no sound
export function rowStatus(row, { folders = new Map(), files = new Set(), singles = new Map(), gone = new Set(), silent = new Set() } = {}) {
  const r = row && row.ref;
  if (!r) return 'missing';
  if (r.singleId) { const s = singles.get(r.singleId), k = `s:${r.singleId}`; return !s || gone.has(k) ? 'missing' : silent.has(k) ? 'nosound' : s.granted ? 'ok' : 'waiting'; }
  const f = folders.get(r.folderId), k = `${r.folderId}/${r.path}`;
  if (!f) return 'missing';
  if (!(files.has(k) && !gone.has(k))) return f.granted ? 'missing' : 'waiting';
  if (silent.has(k)) return 'nosound';
  return f.granted ? 'ok' : 'waiting';
}
// rows whose folder is unknown here and whose folder name matches a folder just added point to it. → changed mixtapes
export function relinkFolder(mixtapes, folder, knownIds, now = Date.now()) {
  const out = [];
  for (const m of mixtapes) {
    let hit = false;
    const rows = m.rows.map(r => (r.ref && r.ref.folderId && !knownIds.has(r.ref.folderId) && r.ref.folderName === folder.name ? ((hit = true), { ...r, ref: { ...r.ref, folderId: folder.id } }) : r));
    if (hit) out.push(touched({ ...m, rows }, now));
  }
  return out;
}
// the backup's value (D11): folder names and ids, mixtapes; no handle, no audio
export function exportMixtapes(folders, mixtapes) {
  const clean = r => ({ id: r.id, name: r.name, video: !!r.video, ref: r.ref && r.ref.singleId ? { singleId: r.ref.singleId, fileName: r.ref.fileName, size: r.ref.size || 0 } : { folderId: r.ref.folderId, folderName: r.ref.folderName, path: r.ref.path } });
  return { format: 1, folders: (folders || []).map(f => ({ id: f.id, name: f.name })), mixtapes: (mixtapes || []).filter(m => m && m.id).map(m => ({ id: m.id, name: m.name, repeat: !!m.repeat, created: m.created, updated: m.updated, rows: (m.rows || []).filter(r => r && r.ref).map(clean) })) };
}
// the import's merge by id: the mixtape changed last wins; the others stay. → { format, folders, mixtapes }
export function mergeMixtapes(cur, incoming) {
  const a = cur && Array.isArray(cur.mixtapes) ? cur.mixtapes : [], b = incoming && Array.isArray(incoming.mixtapes) ? incoming.mixtapes : [];
  const out = new Map(a.filter(m => m && m.id).map(m => [m.id, m]));
  for (const m of b) { if (!m || !m.id || !Array.isArray(m.rows)) continue; const o = out.get(m.id); if (!o || (m.updated || 0) > (o.updated || 0)) out.set(m.id, m); }
  const folders = new Map([...(cur && cur.folders) || [], ...(incoming && incoming.folders) || []].filter(f => f && f.id).map(f => [f.id, f]));
  return { format: 1, folders: [...folders.values()], mixtapes: [...out.values()] };
}
