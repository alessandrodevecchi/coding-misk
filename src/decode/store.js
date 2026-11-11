// Decoded tracks kept in this browser (track-to-code D3, decode-library D12, D13): IndexedDB `coding-misk-decodes`, one
// record per file fingerprint. A record holds the analysis, the title and artist, the tab's settings, where the file was
// opened from (`where`: a folder and a path with the file's size and date) and, where the browser gives one, a handle to
// the file; never the file's bytes or its audio. Next to each record a light index entry (store `index`) holds what the
// lists need: name, title, mark (Full or Live, with the analysis version), where, last use. The lists, the marks, the
// order by recent, the cap and the backup's default read only the index; a record is read by its key when its track opens
// or is prepared, or for the backup. A record and its entry are written and deleted in one transaction. At most 2000
// records: Live-only tracks go first, least recently used first, then Full ones. Every read and write fails quietly
// (private window, blocked storage). The settings backup carries the records without their handles (mergeDecodes). The
// pure parts are checked in Node (npm run check:decode, npm run check:decode-library).
import { ANALYSIS_VERSION } from './model.js';

export const DECODE_DB = 'coding-misk-decodes';
export const DECODE_DB_VERSION = 2;
export const DECODE_CAP = 2000;
// the key of the records in the settings backup
export const DECODES_KEY = 'coding-misk-decodes';
// the records the settings backup carries by default (D14): the ones used last
export const BACKUP_RECENT = 100;

const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
const pause = () => new Promise(r => setTimeout(r, 0));

// a record without what must not leave the browser or the page: the handle, and anything that looks like audio
export function plainRecord(rec) {
  if (!rec || typeof rec !== 'object') return null;
  const { handle, pcm, buffer, ...rest } = rec;
  return rest;
}
// the stored models are current (spec: Stored analysis): an older ANALYSIS_VERSION is analysed again
export const freshModel = m => !!(m && m.version === ANALYSIS_VERSION);
// the light index entry of a record (D13): a few hundred bytes. mark: 'full' with a level B model, 'live' with a level A
// model only, null without one; version: the analysis version of that model (the list shows no mark for another one)
export function entryOf(rec) {
  if (!rec || typeof rec.fp !== 'string') return null;
  const B = rec.modelB && rec.modelB.level === 'B' ? rec.modelB : null, A = rec.modelA || null;
  const w = rec.where && typeof rec.where === 'object' && rec.where.folderId ? { folderId: rec.where.folderId, path: String(rec.where.path || ''), size: rec.where.size || 0, modified: rec.where.modified || 0 } : null;
  return {
    fp: rec.fp, title: rec.title || '', artist: rec.artist || '', name: rec.fileName || '', mark: B ? 'full' : A ? 'live' : null,
    version: B ? B.version : A ? A.version : null, where: w, used: rec.used || 0, hasHandle: !!rec.handle, durationMs: rec.durationMs || 0, video: !!rec.video,
  };
}
// the mark the list shows for an entry: only for the current analysis version (a stale one would be analysed again)
export const markOf = e => (e && e.mark && e.version === ANALYSIS_VERSION ? e.mark : null);
// the records to drop to keep `cap` (D12), from index entries (or records): tracks without a current full analysis
// first, least recently used first, then the full ones
export function overCap(list, cap = DECODE_CAP) {
  const full = e => (e.mark !== undefined ? markOf(e) === 'full' : !!(e.modelB && freshModel(e.modelB)));
  const by = [...list].filter(e => e && e.fp).sort((a, b) => (full(a) - full(b)) || ((a.used || 0) - (b.used || 0)));
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
// an incoming record replaces the stored one (D14, by the index): no entry, or an entry used less recently
export const importWins = (entry, rec) => !!(rec && typeof rec.fp === 'string' && (!entry || (rec.used || 0) > (entry.used || 0)));

// → { ready, get(fp), put(rec), touch(fp), remove(fp), entries() (the index, most recent first), recent(n) (the n records
//   used last), each(fn, batch) (every record in batches, for the backup), importMany(list), rebuilt (the background
//   rebuild of the index), onChange(fn), stats: { reads } (records read, for the checks) }
export function createDecodeStore({ name = DECODE_DB, cap = DECODE_CAP, idb = globalThis.indexedDB } = {}) {
  let tick = Date.now();
  const now = () => (tick = Math.max(tick + 1, Date.now()));
  const stats = { reads: 0, rebuilt: 0 }, listeners = new Set();
  const changed = () => { for (const f of listeners) { try { f(); } catch (e) {} } };
  const open = (async () => {
    if (!idb) return null;
    const o = idb.open(name, DECODE_DB_VERSION);
    o.onupgradeneeded = e => {
      const db = o.result, tx = o.transaction;
      if (!db.objectStoreNames.contains('decodes')) db.createObjectStore('decodes', { keyPath: 'fp' }).createIndex('used', 'used');
      if (!db.objectStoreNames.contains('index')) {
        const ix = db.createObjectStore('index', { keyPath: 'fp' });
        ix.createIndex('used', 'used');
        // the upgrade from version 1 fills the index from the records (at most 50 then), inside the upgrade
        if ((e.oldVersion || 0) >= 1) {
          const cur = tx.objectStore('decodes').openCursor();
          cur.onsuccess = () => { const c = cur.result; if (!c) return; const en = entryOf(c.value); if (en) ix.put(en); c.continue(); };
        }
      }
    };
    return req(o);
  })().catch(() => null);
  const quiet = (f, fallback = null) => open.then(db => (db ? f(db) : fallback)).catch(() => fallback);
  const putOne = (st, r) => { try { st.put(r); return r; } catch (e) { const p = plainRecord(r); st.put(p); return p; } };
  // the cap, inside a transaction over both stores: the index only
  const capIn = (tx, keep = null) => new Promise(res => {
    const r = tx.objectStore('index').getAll();
    r.onsuccess = () => { const drop = overCap(r.result || [], cap).filter(fp => fp !== keep); for (const fp of drop) { tx.objectStore('decodes').delete(fp); tx.objectStore('index').delete(fp); } res(drop.length); };
    r.onerror = () => res(0);
  });
  // records and their entries in one transaction, then the cap; a full disk drops records in the cap's order, ten at a
  // time, and tries again until the write succeeds or nothing else is left (D12)
  async function write(db, list) {
    for (let round = 0; round < 1000; round++) {
      try {
        const tx = db.transaction(['decodes', 'index'], 'readwrite'), fin = done(tx), ds = tx.objectStore('decodes'), ix = tx.objectStore('index');
        for (const r of list) { const stored = putOne(ds, r); const en = entryOf(stored); if (en) ix.put(en); }
        await capIn(tx, list.length === 1 ? list[0].fp : null);
        await fin;
        return true;
      } catch (e) {
        if (!e || e.name !== 'QuotaExceededError') throw e;
        const keep = new Set(list.map(r => r.fp)), all = await req(db.transaction('index', 'readonly').objectStore('index').getAll());
        const drop = overCap(all.filter(x => !keep.has(x.fp)), 0).slice(0, 10);
        if (!drop.length) return false;
        const tx = db.transaction(['decodes', 'index'], 'readwrite');
        for (const fp of drop) { tx.objectStore('decodes').delete(fp); tx.objectStore('index').delete(fp); }
        await done(tx);
      }
    }
    return false;
  }
  const getRec = (db, fp) => { stats.reads++; return req(db.transaction('decodes', 'readonly').objectStore('decodes').get(fp)); };
  const entriesOf = async db => (await req(db.transaction('index', 'readonly').objectStore('index').getAll())).sort((a, b) => (b.used || 0) - (a.used || 0));
  // the rebuild (D13): when the index and the records differ in number, the missing entries are made from the records in
  // batches of 50 with a pause between them, the extra ones go; the lists show what the index holds meanwhile
  // (each step compares both stores inside one transaction, so a record written meanwhile is never taken for extra)
  const rebuilt = open.then(async db => {
    if (!db) return 0;
    const t0 = db.transaction(['decodes', 'index'], 'readonly');
    const [a, b] = await Promise.all([req(t0.objectStore('decodes').count()), req(t0.objectStore('index').count())]);
    if (a === b) return 0;
    let fixed = 0;
    for (;;) {
      const tx = db.transaction(['decodes', 'index'], 'readwrite'), fin = done(tx), ds = tx.objectStore('decodes'), ix = tx.objectStore('index');
      const [keys, have] = await Promise.all([req(ds.getAllKeys()), req(ix.getAllKeys())]);
      const K = new Set(keys), H = new Set(have);
      for (const k of have) if (!K.has(k)) { ix.delete(k); fixed++; }
      const missing = keys.filter(k => !H.has(k)), batch = missing.slice(0, 50);
      for (const k of batch) { const g = ds.get(k); g.onsuccess = () => { const en = entryOf(g.result); if (en) ix.put(en); }; }
      await fin;
      fixed += batch.length; stats.rebuilt += batch.length;
      changed();
      if (missing.length <= 50) break;
      await pause();
    }
    return fixed;
  }).catch(() => 0);
  return {
    ready: open.then(db => !!db),
    rebuilt,
    stats,
    onChange: f => { listeners.add(f); return () => listeners.delete(f); },
    get: fp => quiet(async db => (await getRec(db, fp)) || null),
    put: rec => quiet(async db => { const ok = await write(db, [{ created: new Date().toISOString(), ...rec, used: now() }]); if (ok) changed(); return ok; }, false),
    touch: fp => quiet(async db => {
      const tx = db.transaction(['decodes', 'index'], 'readwrite'), fin = done(tx), ds = tx.objectStore('decodes'), ix = tx.objectStore('index');
      stats.reads++;
      const r = await req(ds.get(fp));
      if (r) { const n = { ...r, used: now() }; ds.put(n); ix.put(entryOf(n)); }
      await fin;
      if (r) changed();
      return !!r;
    }, false),
    remove: fp => quiet(async db => { const tx = db.transaction(['decodes', 'index'], 'readwrite'); tx.objectStore('decodes').delete(fp); tx.objectStore('index').delete(fp); await done(tx); changed(); return true; }, false),
    entries: () => quiet(entriesOf, []),
    entry: fp => quiet(async db => (await req(db.transaction('index', 'readonly').objectStore('index').get(fp))) || null),
    // the n records used last, without their handles (the backup's default)
    recent: (n = BACKUP_RECENT) => quiet(async db => { const out = []; for (const e of (await entriesOf(db)).slice(0, n)) { const r = await getRec(db, e.fp); if (r) out.push(plainRecord(r)); } return out; }, []),
    // every record without its handle, `batch` at a time with a pause between batches: fn(records) may be async
    each: (fn, batch = 50) => quiet(async db => {
      const list = await entriesOf(db);
      let n = 0;
      for (let i = 0; i < list.length; i += batch) {
        const tx = db.transaction('decodes', 'readonly'), ds = tx.objectStore('decodes');
        const recs = (await Promise.all(list.slice(i, i + batch).map(e => { stats.reads++; return req(ds.get(e.fp)); }))).filter(Boolean).map(plainRecord);
        n += recs.length;
        await fn(recs);
        await pause();
      }
      return n;
    }, 0),
    // the backup's records (D14): compared with the index; a record replaced is read first, to keep its handle; the cap after
    importMany: list => quiet(async db => {
      const index = new Map((await entriesOf(db)).map(e => [e.fp, e])), out = [];
      for (const r of Array.isArray(list) ? list : []) {
        if (!importWins(index.get(r && r.fp), r)) continue;
        const old = index.has(r.fp) ? await getRec(db, r.fp) : null;
        out.push({ ...plainRecord(r), ...(old && old.handle ? { handle: old.handle } : {}) });
      }
      for (let i = 0; i < out.length; i += 50) await write(db, out.slice(i, i + 50));
      if (out.length) changed();
      return out.length;
    }, 0),
  };
}
