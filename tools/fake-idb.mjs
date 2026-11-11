// A small IndexedDB for the Node checks (decode-library): databases with versions and upgrades, object stores with a
// key path (a string or an array), transactions that complete when no request is left and roll back on abort, put,
// get, delete, clear, getAll, getAllKeys, count and openCursor. Values are cloned with structuredClone, so an object
// that cannot be stored (a fake file handle with functions) fails as in a browser. `quota` (bytes of JSON) makes a
// commit over it abort with QuotaExceededError. `reads` counts get and getAll per store, for the checks.
const later = f => setTimeout(f, 0);
const keyOf = (path, v) => (Array.isArray(path) ? JSON.stringify(path.map(p => v[p])) : v[path]);
const rawKey = k => (Array.isArray(k) ? JSON.stringify(k) : k);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function createFakeIDB({ quota = Infinity } = {}) {
  const dbs = new Map(), reads = {};
  const size = db => { let n = 0; for (const s of db.stores.values()) for (const v of s.data.values()) n += JSON.stringify(v).length; return n; };
  function makeTx(db, names, mode, upgradeReq = null) {
    names = [].concat(names);
    const snap = new Map(names.filter(n => db.stores.has(n)).map(n => [n, new Map(db.stores.get(n).data)]));
    let pending = 0, finished = false, check = null;
    const tx = { mode, oncomplete: null, onerror: null, onabort: null, error: null, db: null };
    const schedule = () => { if (check) return; check = later(() => { check = null; if (pending || finished) return; commit(); }); };
    function commit() {
      finished = true;
      if (mode !== 'readonly' && size(db) > quota) {
        for (const [n, m] of snap) db.stores.get(n).data = m;
        tx.error = Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
        if (tx.onabort) tx.onabort({ target: tx });
        return;
      }
      if (tx.oncomplete) tx.oncomplete({ target: tx });
      if (upgradeReq) upgradeReq();
    }
    const request = fn => {
      const r = { onsuccess: null, onerror: null, result: undefined, error: null };
      pending++;
      later(() => {
        try { r.result = fn(); if (r.onsuccess) r.onsuccess({ target: r }); }
        catch (e) { r.error = e; if (r.onerror) r.onerror({ target: r }); }
        pending--; schedule();
      });
      return r;
    };
    const storeApi = name => {
      const s = db.stores.get(name);
      if (!s) throw Object.assign(new Error(`no store ${name}`), { name: 'NotFoundError' });
      const sorted = () => [...s.data.entries()].sort((a, b) => cmp(a[0], b[0]));
      const write = () => { if (mode === 'readonly') throw Object.assign(new Error('readonly'), { name: 'ReadOnlyError' }); };
      return {
        name,
        createIndex: () => ({}),
        put(v) { write(); const c = structuredClone(v); return request(() => { const k = keyOf(s.keyPath, c); s.data.set(k, c); return k; }); },
        get(k) { return request(() => { reads[name] = (reads[name] || 0) + 1; const v = s.data.get(rawKey(k)); return v === undefined ? undefined : structuredClone(v); }); },
        delete(k) { write(); return request(() => { s.data.delete(rawKey(k)); }); },
        clear() { write(); return request(() => { s.data.clear(); }); },
        getAll() { return request(() => { reads[name] = (reads[name] || 0) + 1; return sorted().map(e => structuredClone(e[1])); }); },
        getAllKeys() { return request(() => sorted().map(e => e[0])); },
        count() { return request(() => s.data.size); },
        openCursor() {
          const list = sorted(); let i = 0;
          const r = { onsuccess: null, onerror: null, result: null };
          const step = () => { pending++; later(() => { const e = list[i++]; r.result = e ? { key: e[0], value: structuredClone(e[1]), continue: step } : null; if (r.onsuccess) r.onsuccess({ target: r }); pending--; schedule(); }); };
          step();
          return r;
        },
      };
    };
    tx.objectStore = name => storeApi(name);
    schedule();
    return tx;
  }
  const dbApi = db => ({
    name: db.name,
    get version() { return db.version; },
    objectStoreNames: { contains: n => db.stores.has(n), get length() { return db.stores.size; } },
    createObjectStore(name, { keyPath } = {}) { db.stores.set(name, { keyPath, data: new Map() }); return { createIndex: () => ({}) }; },
    transaction(names, mode = 'readonly') { for (const n of [].concat(names)) if (!db.stores.has(n)) throw Object.assign(new Error(`no store ${n}`), { name: 'NotFoundError' }); return makeTx(db, names, mode); },
    close() {},
  });
  return {
    reads,
    open(name, version = 1) {
      const r = { onsuccess: null, onerror: null, onupgradeneeded: null, result: null, transaction: null };
      later(() => {
        let db = dbs.get(name);
        if (!db) { db = { name, version: 0, stores: new Map() }; dbs.set(name, db); }
        if (version < db.version) { r.error = Object.assign(new Error('version'), { name: 'VersionError' }); if (r.onerror) r.onerror({ target: r }); return; }
        r.result = dbApi(db);
        if (version > db.version) {
          const old = db.version; db.version = version;
          r.transaction = makeTx(db, [...db.stores.keys()], 'versionchange', () => { r.transaction = null; if (r.onsuccess) r.onsuccess({ target: r }); });
          // stores created in the upgrade join its transaction
          const base = r.result.createObjectStore;
          r.result.createObjectStore = (n, o) => { base(n, o); return r.transaction.objectStore(n); };
          if (r.onupgradeneeded) r.onupgradeneeded({ target: r, oldVersion: old, newVersion: version });
          return;
        }
        if (r.onsuccess) r.onsuccess({ target: r });
      });
      return r;
    },
    deleteDatabase(name) { dbs.delete(name); const r = { onsuccess: null }; later(() => r.onsuccess && r.onsuccess({})); return r; },
    // for the checks: the raw records of a store
    raw: (name, store) => { const db = dbs.get(name); return db && db.stores.get(store) ? [...db.stores.get(store).data.values()] : []; },
    clearStore: (name, store) => { const db = dbs.get(name); if (db && db.stores.get(store)) db.stores.get(store).data.clear(); },
  };
}
