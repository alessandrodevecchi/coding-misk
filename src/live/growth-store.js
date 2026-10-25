// Growths made in Compose, kept in this browser across reloads (growth-in-background D6): IndexedDB
// `coding-misk-growths`, one record per growth by key (the Compose growth key, the voice instrument's context and the
// growth hash of the code). At most `cap` growths, the least recently used dropped first. A growth hash other than the
// one stored empties the store, so a change to the growth code never serves an old growth. Every read and write fails
// quietly (private window, blocked storage): the song grows again. Not in the backup.
export const GROWTH_DB = 'coding-misk-growths';
export const GROWTH_CAP = 60;

const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });

// → { get(key) → value or null, put(key, value), keys() → [key] by use (oldest first), clear(), ready }
export function createGrowthStore({ hash = '', cap = GROWTH_CAP, name = GROWTH_DB, idb = globalThis.indexedDB } = {}) {
  let tick = Date.now();
  const now = () => (tick = Math.max(tick + 1, Date.now()));
  const open = (async () => {
    if (!idb) return null;
    const o = idb.open(name, 1);
    o.onupgradeneeded = () => {
      const db = o.result;
      if (!db.objectStoreNames.contains('growths')) db.createObjectStore('growths', { keyPath: 'key' }).createIndex('used', 'used');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
    };
    const db = await req(o);
    // the growth code changed: every growth stored goes
    const tx = db.transaction(['growths', 'meta'], 'readwrite'), meta = await req(tx.objectStore('meta').get('hash'));
    if (!meta || meta.hash !== hash) { tx.objectStore('growths').clear(); tx.objectStore('meta').put({ id: 'hash', hash }); }
    await done(tx);
    return db;
  })().catch(() => null);
  const quiet = (f, fallback = null) => open.then(db => (db ? f(db) : fallback)).catch(() => fallback);
  return {
    ready: open.then(db => !!db),
    get: key => quiet(async db => {
      const tx = db.transaction('growths', 'readwrite'), st = tx.objectStore('growths'), rec = await req(st.get(key));
      if (rec) st.put({ ...rec, used: now() });
      await done(tx);
      return rec ? rec.value : null;
    }),
    put: (key, value) => quiet(async db => {
      const tx = db.transaction('growths', 'readwrite'), st = tx.objectStore('growths');
      st.put({ key, value, used: now() });
      const n = await req(st.count());
      // over the cap: the least recently used go first
      if (n > cap) {
        let extra = n - cap;
        await new Promise((res, rej) => {
          const c = st.index('used').openCursor();
          c.onsuccess = () => { const cur = c.result; if (!cur || extra <= 0) return res(); cur.delete(); extra--; cur.continue(); };
          c.onerror = () => rej(c.error);
        });
      }
      await done(tx);
      return true;
    }, false),
    keys: () => quiet(async db => {
      const tx = db.transaction('growths', 'readonly'), out = [];
      await new Promise((res, rej) => { const c = tx.objectStore('growths').index('used').openCursor(); c.onsuccess = () => { const cur = c.result; if (!cur) return res(); out.push(cur.value.key); cur.continue(); }; c.onerror = () => rej(c.error); });
      return out;
    }, []),
    clear: () => quiet(async db => { const tx = db.transaction('growths', 'readwrite'); tx.objectStore('growths').clear(); await done(tx); return true; }, false),
  };
}
