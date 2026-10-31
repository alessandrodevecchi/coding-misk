// Decoded tracks kept in this browser (track-to-code D3): IndexedDB `coding-misk-decodes`, one record per file
// fingerprint. A record holds the analysis, the title and artist, the tab's settings and, where the browser gives one,
// a handle to the file; never the file's bytes or its audio. At most 50 records, the least recently used dropped first.
// Every read and write fails quietly (private window, blocked storage). The settings backup carries the records
// without their handles (mergeDecodes). The pure parts are checked in Node (npm run check:decode).
import { ANALYSIS_VERSION } from './model.js';

export const DECODE_DB = 'coding-misk-decodes';
export const DECODE_CAP = 50;
// the key of the records in the settings backup
export const DECODES_KEY = 'coding-misk-decodes';

const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });

// a record without what must not leave the browser or the page: the handle, and anything that looks like audio
export function plainRecord(rec) {
  if (!rec || typeof rec !== 'object') return null;
  const { handle, pcm, buffer, ...rest } = rec;
  return rest;
}
// the records to drop to keep `cap`: the least recently used first
export function overCap(list, cap = DECODE_CAP) {
  const by = [...list].sort((a, b) => (a.used || 0) - (b.used || 0));
  return by.slice(0, Math.max(0, by.length - cap)).map(r => r.fp);
}
// the backup's records merged into the current ones by fingerprint: the one used last wins; a stored handle stays
export function mergeDecodes(cur, incoming) {
  const out = new Map((Array.isArray(cur) ? cur : []).filter(r => r && r.fp).map(r => [r.fp, r]));
  for (const r of Array.isArray(incoming) ? incoming : []) {
    if (!r || typeof r.fp !== 'string') continue;
    const old = out.get(r.fp);
    if (!old || (r.used || 0) > (old.used || 0)) out.set(r.fp, { ...plainRecord(r), ...(old && old.handle ? { handle: old.handle } : {}) });
  }
  return [...out.values()];
}
// the stored models are current (spec: Stored analysis): an older ANALYSIS_VERSION is analysed again
export const freshModel = m => !!(m && m.version === ANALYSIS_VERSION);

// → { ready, get(fp), put(rec), list() (most recent first, without handles), remove(fp), all() (for the backup),
//   importMany(list) }
export function createDecodeStore({ name = DECODE_DB, cap = DECODE_CAP, idb = globalThis.indexedDB } = {}) {
  let tick = Date.now();
  const now = () => (tick = Math.max(tick + 1, Date.now()));
  const open = (async () => {
    if (!idb) return null;
    const o = idb.open(name, 1);
    o.onupgradeneeded = () => { const db = o.result; if (!db.objectStoreNames.contains('decodes')) db.createObjectStore('decodes', { keyPath: 'fp' }).createIndex('used', 'used'); };
    return req(o);
  })().catch(() => null);
  const quiet = (f, fallback = null) => open.then(db => (db ? f(db) : fallback)).catch(() => fallback);
  const allOf = db => req(db.transaction('decodes', 'readonly').objectStore('decodes').getAll());
  const putAll = async (db, list) => {
    const tx = db.transaction('decodes', 'readwrite'), st = tx.objectStore('decodes');
    for (const r of list) {
      // a handle that cannot be stored (some browsers) goes; the record stays
      try { st.put(r); } catch (e) { st.put(plainRecord(r)); }
    }
    await done(tx);
    const drop = overCap(await allOf(db), cap);
    if (drop.length) { const t2 = db.transaction('decodes', 'readwrite'); for (const fp of drop) t2.objectStore('decodes').delete(fp); await done(t2); }
  };
  return {
    ready: open.then(db => !!db),
    get: fp => quiet(async db => (await req(db.transaction('decodes', 'readonly').objectStore('decodes').get(fp))) || null),
    put: rec => quiet(async db => { await putAll(db, [{ created: new Date().toISOString(), ...rec, used: now() }]); return true; }, false),
    touch: fp => quiet(async db => { const st = db.transaction('decodes', 'readwrite').objectStore('decodes'), r = await req(st.get(fp)); if (r) await req(st.put({ ...r, used: now() })); return !!r; }, false),
    list: () => quiet(async db => (await allOf(db)).sort((a, b) => (b.used || 0) - (a.used || 0)).map(r => ({ ...plainRecord(r), hasHandle: !!r.handle })), []),
    remove: fp => quiet(async db => { const tx = db.transaction('decodes', 'readwrite'); tx.objectStore('decodes').delete(fp); await done(tx); return true; }, false),
    all: () => quiet(async db => (await allOf(db)).map(plainRecord), []),
    importMany: list => quiet(async db => { const merged = mergeDecodes(await allOf(db), list); await putAll(db, merged); return merged.length; }, 0),
  };
}
