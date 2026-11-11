// The user's folders in the Decode tab (decode-library D2, D3): the folder picker (File System Access API, read mode),
// the browser's permission (asked only inside a click) and the scan of a folder: depth first, entries sorted by name,
// names starting with a dot skipped, the audio and video files Decode accepts kept by extension, at most 2000 files per
// folder, a pause every 100 entries so the page stays responsive. The scan reads each file's size and date, never its
// bytes. Pure enough for Node: the scan takes any object shaped like a directory handle (npm run check:decode-library).

export const AUDIO_EXT = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.opus', '.oga', '.weba'];
export const VIDEO_EXT = ['.mp4', '.m4v', '.mov', '.webm', '.mkv'];
export const FOLDER_CAP = 2000;
const extOf = name => { const i = String(name).lastIndexOf('.'); return i > 0 ? String(name).slice(i).toLowerCase() : ''; };
export const accepted = name => AUDIO_EXT.includes(extOf(name)) || VIDEO_EXT.includes(extOf(name));
export const isVideo = name => VIDEO_EXT.includes(extOf(name));
// the browser can open folders (Chrome, Edge); elsewhere the panel offers single files only
export const foldersSupported = () => typeof globalThis.showDirectoryPicker === 'function';
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const yieldNow = () => new Promise(r => setTimeout(r, 0));

// the permission of a handle: 'granted' | 'prompt' | 'denied'; ask: request it (only inside a click)
export async function permission(handle, ask = false) {
  if (!handle || typeof handle.queryPermission !== 'function') return handle ? 'granted' : 'denied';
  try {
    let p = await handle.queryPermission({ mode: 'read' });
    if (p !== 'granted' && ask && typeof handle.requestPermission === 'function') p = await handle.requestPermission({ mode: 'read' });
    return p;
  } catch (e) { return 'denied'; }
}

// a new folder from the picker. → { folder } | { dup: folder } | { cancelled } | { error }
// pickerId: the picker's own start folder (Decode by default; the stage videos have theirs, stage-video D10)
export async function pickFolder(known = [], { now = Date.now(), id = null, pickerId = 'coding-misk-decode' } = {}) {
  let handle;
  try { handle = await globalThis.showDirectoryPicker({ mode: 'read', id: pickerId }); }
  catch (e) { return e && e.name === 'AbortError' ? { cancelled: true } : { error: e && e.name }; }
  for (const f of known) {
    try { if (f.handle && (await f.handle.isSameEntry(handle))) return { dup: f }; } catch (e) {}
  }
  return { folder: { id: id || `f${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: handle.name, handle, added: now, count: 0, capped: false, scanned: null } };
}

// the entries of one directory, sorted by name: [{ name, kind, handle }]
async function entriesOf(dir) {
  const out = [];
  const it = typeof dir.values === 'function' ? dir.values() : dir.entries();
  for await (const x of it) { const h = Array.isArray(x) ? x[1] : x; out.push({ name: h.name, kind: h.kind, handle: h }); }
  return out.sort((a, b) => byName.compare(a.name, b.name) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
// the scan (D3). → { files: [{ path, name, size, modified, video }], capped, scanned }
// onBatch(files so far) every `every` entries; stop() → true ends the scan early (a removed folder); accept(name): the
// files kept (Decode's audio and video by default; the stage videos keep videos only, stage-video D10)
export async function scanFolder(dir, { cap = FOLDER_CAP, every = 100, onBatch = null, stop = null, now = Date.now(), accept = accepted } = {}) {
  const files = [];
  let seen = 0, capped = false;
  async function walk(d, prefix) {
    for (const e of await entriesOf(d)) {
      if (capped || (stop && stop())) return;
      if (++seen % every === 0) { if (onBatch) onBatch(files.slice()); await yieldNow(); }
      if (!e.name || e.name.startsWith('.')) continue;
      if (e.kind === 'directory') { await walk(e.handle, `${prefix}${e.name}/`); continue; }
      if (e.kind !== 'file' || !accept(e.name)) continue;
      if (files.length >= cap) { capped = true; return; }
      let size = 0, modified = 0;
      try { const f = await e.handle.getFile(); size = f.size; modified = f.lastModified; } catch (err) { continue; }
      files.push({ path: `${prefix}${e.name}`, name: e.name, size, modified, video: isVideo(e.name) });
    }
  }
  await walk(dir, '');
  if (onBatch) onBatch(files.slice());
  return { files, capped, scanned: now };
}
// the handle of a file inside a folder, by its path. Throws NotFoundError when a part is gone
export async function fileAt(dir, path) {
  const parts = String(path).split('/').filter(Boolean);
  let d = dir;
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
  return d.getFileHandle(parts[parts.length - 1]);
}
