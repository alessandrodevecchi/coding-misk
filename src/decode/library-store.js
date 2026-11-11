// The Decode library's storage (decode-library D1): IndexedDB `coding-misk-decode-library`, apart from the decode store.
// Stores: `folders` ({ id, name, handle, added, count, capped, scanned }), `files` (the folder index: { folderId, path,
// name, size, modified, video, title?, artist?, tagged? }, key [folderId, path]), `singles` (files added one by one to a
// mixtape: { id, name, size, handle }) and `mixtapes` ({ id, name, rows, repeat, created, updated }). Handles and names
// only: never a file's bytes or its audio. Every read and write fails quietly, like the decode store.
export const LIBRARY_DB = 'coding-misk-decode-library';

const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
const STORES = { folders: 'id', files: ['folderId', 'path'], singles: 'id', mixtapes: 'id' };

// → { ready, folders(), putFolder(f), removeFolder(id) (its index too), files(), setFiles(folderId, list), putFiles(list),
//   singles(), putSingle(s), removeSingle(id), mixtapes(), putMixtape(m), putMixtapes(list), removeMixtape(id) }
export function createLibraryStore({ name = LIBRARY_DB, idb = globalThis.indexedDB } = {}) {
  const open = (async () => {
    if (!idb) return null;
    const o = idb.open(name, 1);
    o.onupgradeneeded = () => { const db = o.result; for (const [s, keyPath] of Object.entries(STORES)) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath }); };
    return req(o);
  })().catch(() => null);
  const quiet = (f, fallback = null) => open.then(db => (db ? f(db) : fallback)).catch(() => fallback);
  const all = s => quiet(async db => (await req(db.transaction(s, 'readonly').objectStore(s).getAll())) || [], []);
  // a value whose handle cannot be stored (a browser that cannot clone it) is kept without it
  const putIn = (st, v) => { try { st.put(v); } catch (e) { const { handle, ...rest } = v; st.put(rest); } };
  const put = (s, list) => quiet(async db => { const tx = db.transaction(s, 'readwrite'), fin = done(tx), st = tx.objectStore(s); for (const v of list) putIn(st, v); await fin; return true; }, false);
  const del = (s, key) => quiet(async db => { const tx = db.transaction(s, 'readwrite'), fin = done(tx); tx.objectStore(s).delete(key); await fin; return true; }, false);
  // a folder's index replaced in one transaction: its old entries go, the new ones come
  const setFiles = (folderId, list) => quiet(async db => {
    const tx = db.transaction('files', 'readwrite'), fin = done(tx), st = tx.objectStore('files');
    const keys = await req(st.getAllKeys());
    for (const k of keys) { const fid = Array.isArray(k) ? k[0] : (() => { try { return JSON.parse(k)[0]; } catch (e) { return null; } })(); if (fid === folderId) st.delete(k); }
    for (const f of list) st.put({ ...f, folderId });
    await fin;
    return true;
  }, false);
  return {
    ready: open.then(db => !!db),
    folders: () => all('folders'),
    putFolder: f => put('folders', [f]),
    removeFolder: id => quiet(async db => { await setFiles(id, []); await del('folders', id); return true; }, false),
    files: () => all('files'),
    setFiles,
    putFiles: list => put('files', list),
    singles: () => all('singles'),
    putSingle: s => put('singles', [s]),
    removeSingle: id => del('singles', id),
    mixtapes: () => all('mixtapes'),
    putMixtape: m => put('mixtapes', [m]),
    putMixtapes: list => put('mixtapes', list),
    removeMixtape: id => del('mixtapes', id),
  };
}
