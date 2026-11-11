// The stage videos' storage (stage-video D10): IndexedDB `coding-misk-stage-videos`, apart from the Decode library so
// the two lists stay independent. Stores: `folders` ({ id, name, handle, added, count, capped, scanned }) and `files`
// ({ folderId, path, name, size, modified }, key [folderId, path]). Handles and names only, never a video's bytes.
// Every read and write fails quietly: no IndexedDB means no folders, never an error.
export const STAGE_VIDEO_DB = 'coding-misk-stage-videos';

const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
const STORES = { folders: 'id', files: ['folderId', 'path'] };

// → { ready, folders(), putFolder(f), removeFolder(id) (its files too), files(), setFiles(folderId, list), clear() }
export function createStageVideoStore({ name = STAGE_VIDEO_DB, idb = globalThis.indexedDB } = {}) {
  const open = (async () => {
    if (!idb) return null;
    const o = idb.open(name, 1);
    o.onupgradeneeded = () => { const db = o.result; for (const [s, keyPath] of Object.entries(STORES)) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath }); };
    return req(o);
  })().catch(() => null);
  const quiet = (f, fallback = null) => open.then(db => (db ? f(db) : fallback)).catch(() => fallback);
  const all = s => quiet(async db => (await req(db.transaction(s, 'readonly').objectStore(s).getAll())) || [], []);
  // only the names and sizes of a file: never more, whatever the scan gave
  const entry = (folderId, f) => ({ folderId, path: f.path, name: f.name, size: f.size || 0, modified: f.modified || 0 });
  const setFiles = (folderId, list) => quiet(async db => {
    const tx = db.transaction('files', 'readwrite'), fin = done(tx), st = tx.objectStore('files');
    const keys = await req(st.getAllKeys());
    for (const k of keys) { const fid = Array.isArray(k) ? k[0] : (() => { try { return JSON.parse(k)[0]; } catch (e) { return null; } })(); if (fid === folderId) st.delete(k); }
    for (const f of list) st.put(entry(folderId, f));
    await fin;
    return true;
  }, false);
  const putFolder = f => quiet(async db => {
    const tx = db.transaction('folders', 'readwrite'), fin = done(tx), st = tx.objectStore('folders');
    const v = { id: f.id, name: f.name, handle: f.handle, added: f.added, count: f.count || 0, capped: !!f.capped, scanned: f.scanned || null };
    try { st.put(v); } catch (e) { const { handle, ...rest } = v; st.put(rest); }
    await fin;
    return true;
  }, false);
  return {
    ready: open.then(db => !!db),
    folders: () => all('folders'),
    putFolder,
    removeFolder: id => quiet(async db => { await setFiles(id, []); const tx = db.transaction('folders', 'readwrite'), fin = done(tx); tx.objectStore('folders').delete(id); await fin; return true; }, false),
    files: () => all('files'),
    setFiles,
    clear: () => quiet(async db => { const tx = db.transaction(['folders', 'files'], 'readwrite'), fin = done(tx); tx.objectStore('folders').clear(); tx.objectStore('files').clear(); await fin; return true; }, false),
  };
}
