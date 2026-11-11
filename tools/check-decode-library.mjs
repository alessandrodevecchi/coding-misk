// Node checks for the Decode library (decode-library, no browser): the folder scan on fake directory objects (order,
// subfolders, dot names, extensions, video, the cap of 2000 with its flag), the list's rows (one per track, names,
// marks fresh and stale, recent rows), search with accents, chips, order by name and by recent, the next and previous
// rows of a list and a mixtape (filters, skipped rows, the ends, repeat, a renamed row), mixtape operations, row status
// and rows linked again by folder name, the mixtapes in the backup (no handles, merge by id), the backup file built in
// parts, the decode store on a fake IndexedDB (the cap of 2000 on index entries with Live-only tracks first, the upgrade
// from version 1 with 40 records, the index rebuilt after it is cleared, a full disk, the 100 records used last, every
// record in batches, the import through the index keeping a newer record and its handle), the preparation's timing and
// memory budget and the end-of-track rule. Usage: npm run check:decode-library
import { scanFolder, accepted, isVideo, FOLDER_CAP, fileAt, permission } from '../src/decode/folders.js';
import { buildRows, filterRows, sortRows, listOf, nextOf, prevOf, norm, listPrefs, windowOf, listContext, usedSnapshot } from '../src/decode/library.js';
import { createMixtape, addRows, moveRow, removeRow, renameMixtape, setRepeat, rowStatus, relinkFolder, exportMixtapes, mergeMixtapes, MIXTAPES_KEY } from '../src/decode/mixtapes.js';
import { createDecodeStore, overCap, entryOf, markOf, DECODE_CAP, importWins } from '../src/decode/store.js';
import { prepareAt, fitsBudget, decodedBytes, endStep, BUDGET_BYTES } from '../src/decode/autoplay.js';
import { makeBackup, mergeBackup, backupParts, BACKUP_FORMAT } from '../src/settings/backup.js';
import { ANALYSIS_VERSION } from '../src/decode/model.js';
import { createFakeIDB } from './fake-idb.mjs';

let passed = 0, failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (ok) passed++; else failed++; };

// ---------- fake directories ----------
const file = (name, size = 1000, modified = 1) => ({ kind: 'file', name, getFile: async () => ({ size, lastModified: modified, name }) });
const dir = (name, kids) => {
  const by = new Map(kids.map(k => [k.name, k]));
  return {
    kind: 'directory', name,
    async *values() { for (const k of kids) yield k; },
    getDirectoryHandle: async n => { const d = by.get(n); if (!d || d.kind !== 'directory') throw Object.assign(new Error('nf'), { name: 'NotFoundError' }); return d; },
    getFileHandle: async n => { const f = by.get(n); if (!f || f.kind !== 'file') throw Object.assign(new Error('nf'), { name: 'NotFoundError' }); return f; },
  };
};

// ---------- 1.2 the scan ----------
{
  const live = dir('Live sets', [file('notes.txt'), dir('set 1', [dir('old', [file('c.flac')]), file('b.wav')]), file('a.mp3'), dir('.cache', [file('d.mp3')]), file('.hidden.wav'), file('clip.mp4'), file('Z.WAV'), file('track 10.mp3'), file('track 2.mp3')]);
  let batches = 0;
  const r = await scanFolder(live, { every: 3, onBatch: () => { batches++; } });
  const paths = r.files.map(f => f.path);
  check(paths.join() === 'a.mp3,clip.mp4,set 1/b.wav,set 1/old/c.flac,track 2.mp3,track 10.mp3,Z.WAV', 'scan: depth first, entries sorted by name (numbers in order), dot names and other extensions skipped', paths.join());
  check(r.files.find(f => f.name === 'clip.mp4').video && !r.files.find(f => f.name === 'a.mp3').video && !r.capped, 'scan: video flag, no cap');
  check(batches >= 2, 'scan: the list fills in batches', `${batches}`);
  check(accepted('x.OPUS') && accepted('y.mkv') && !accepted('z.txt') && isVideo('v.MOV'), 'extensions: audio and video Decode accepts');
  const big = dir('Big', Array.from({ length: 2500 }, (_, i) => file(`f${String(i).padStart(4, '0')}.wav`)));
  const b = await scanFolder(big);
  check(b.files.length === FOLDER_CAP && b.capped && b.files[FOLDER_CAP - 1].name === 'f1999.wav', 'scan: 2500 files give 2000 in name order and the folder is flagged', `${b.files.length} ${b.capped}`);
  const exact = await scanFolder(dir('Exact', Array.from({ length: 2000 }, (_, i) => file(`e${i}.wav`))));
  check(exact.files.length === 2000 && !exact.capped, 'scan: exactly 2000 files is not capped');
  const h = await fileAt(live, 'set 1/old/c.flac');
  let gone = null; try { await fileAt(live, 'set 1/nope.wav'); } catch (e) { gone = e.name; }
  check(h.name === 'c.flac' && gone === 'NotFoundError', 'a file by its path; a missing one throws NotFoundError');
  check((await permission({ queryPermission: async () => 'prompt', requestPermission: async () => 'granted' }, false)) === 'prompt' && (await permission({ queryPermission: async () => 'prompt', requestPermission: async () => 'granted' }, true)) === 'granted', 'permission: queried without asking, requested only when asked');
}

// ---------- 2.1 rows, names, marks, search, chips, order ----------
const V = ANALYSIS_VERSION;
const folders = [{ id: 'L', name: 'Live sets', granted: true }, { id: 'D', name: 'Demos', granted: false }];
const files = [
  { folderId: 'L', path: 'a.wav', name: 'a.wav', size: 10, modified: 1 },
  { folderId: 'L', path: 'set 1/b.wav', name: 'b.wav', size: 20, modified: 2 },
  { folderId: 'L', path: 'Some Band - Night Run.mp3', name: 'Some Band - Night Run.mp3', size: 30, modified: 3 },
  { folderId: 'L', path: 'clip.mp4', name: 'clip.mp4', size: 40, modified: 4, video: true },
  { folderId: 'D', path: 'Midnight.wav', name: 'Midnight.wav', size: 50, modified: 5 },
  { folderId: 'D', path: 'tagged.mp3', name: 'tagged.mp3', size: 60, modified: 6, title: 'Café Noir', artist: 'Tag', tagged: true },
  { folderId: 'D', path: 'zz.wav', name: 'zz.wav', size: 70, modified: 7 },
];
const entries = [
  entryOf({ fp: 'fa', title: 'Alpha', fileName: 'a.wav', used: 300, modelA: { version: V }, modelB: { level: 'B', version: V }, where: { folderId: 'L', path: 'a.wav', size: 10, modified: 1 } }),
  entryOf({ fp: 'fb', title: 'b', fileName: 'b.wav', used: 200, modelA: { version: V }, where: { folderId: 'L', path: 'set 1/b.wav', size: 20, modified: 2 } }),
  entryOf({ fp: 'fz', title: 'zz', fileName: 'zz.wav', used: 50, modelA: { version: V - 1 }, where: { folderId: 'D', path: 'zz.wav', size: 70, modified: 7 } }),
  entryOf({ fp: 'fx', title: 'Old Changed', fileName: 'Midnight.wav', used: 40, modelA: { version: V }, where: { folderId: 'D', path: 'Midnight.wav', size: 49, modified: 5 } }),
  entryOf({ fp: 'fr', title: 'Recent One', fileName: 'recent.wav', used: 100, modelA: { version: V }, handle: {} }),
];
const rows = buildRows({ folders, files, entries });
{
  const by = Object.fromEntries(rows.map(r => [r.name, r]));
  check(rows.length === 9, 'rows: one per folder file plus the recent tracks not in a folder', `${rows.length}: ${rows.map(r => r.name).join()}`);
  check(by.Alpha.mark === 'full' && by.b.mark === 'live' && by.zz.mark === null && by['Night Run'].mark === null, 'marks: ◆ Full and ◇ Live from the index; a stale analysis and a never opened file have none');
  check(by['Night Run'] && by['Night Run'].artist === 'Some Band' && by['Café Noir'] && by.Alpha, 'names: stored title, then tags, then the file name');
  check(by.Midnight && !by.Midnight.fp && by['Old Changed'] && by['Old Changed'].kind === 'recent', 'a file changed since it was decoded (size) gets no mark; its old analysis stays a recent row');
  check(by['Recent One'].folderName === null && by['Recent One'].kind === 'recent' && by['Recent One'].hasHandle, 'a recent track outside the folders shows "Recent"');
  check(by.Midnight.waiting && !by.Alpha.waiting && by.clip.video, 'a folder not allowed marks its rows waiting; the video flag');
  check(filterRows(rows, { search: 'cafe' }).map(r => r.name).join() === 'Café Noir' && filterRows(rows, { search: 'NIGH' }).map(r => r.name).sort().join() === 'Midnight,Night Run,Old Changed', 'search: case and accents ignored, file name and artist searched');
  check(filterRows(rows, { chip: 'D' }).every(r => r.folderId === 'D') && filterRows(rows, { chip: 'all' }).length === rows.length, 'chips: one folder, or All with the recent tracks');
  check(sortRows(rows, 'name').map(r => r.name).slice(0, 3).join() === 'Alpha,b,Café Noir', 'order by name', sortRows(rows, 'name').map(r => r.name).join());
  const rec = sortRows(rows, 'recent').map(r => r.name);
  check(rec.slice(0, 5).join() === 'Alpha,b,Recent One,zz,Old Changed' && rec.slice(5).join() === 'Café Noir,clip,Midnight,Night Run', 'order by recent: opened last first, then the others by name', rec.join());
  check(norm('Ñíght') === 'night' && listPrefs({ chip: '', order: 'x' }).chip === 'all' && listPrefs(null).order === 'name', 'normalised search text; the remembered chip and order with defaults');
  const w = windowOf(3200, 400, 32, 4000);
  check(w.first === 92 && w.last === 121 && w.last - w.first < 40, 'the window of a long list: a few dozen rows', JSON.stringify(w));
}

// ---------- 3.2, 3.5 the next and previous rows ----------
{
  const L = [{ id: 'L', name: 'Live', granted: true }, { id: 'D', name: 'Demos', granted: true }];
  const F = ['a', 'b', 'c', 'd'].map((n, i) => ({ folderId: 'D', path: `${n}.wav`, name: `${n}.wav`, size: i, modified: i })).concat([{ folderId: 'L', path: 'b0.wav', name: 'b0.wav', size: 9, modified: 9 }]);
  const R = buildRows({ folders: L, files: F, entries: [] });
  const ctx = listContext({ chip: 'D', order: 'name' }, '', 'D/b.wav', R);
  check(nextOf(ctx, R).row.name === 'c' && prevOf(ctx, R).row.name === 'a', 'the next track of the chip by name, not another folder\'s');
  const miss = R.map(r => (r.name === 'c' ? { ...r, missing: true } : r));
  check(nextOf(ctx, miss).row.name === 'd', 'a row "not found" is skipped');
  const wait = R.map(r => (r.name === 'c' ? { ...r, waiting: true } : r));
  check(nextOf(ctx, wait).row.name === 'd', 'a row waiting for access is skipped');
  check(nextOf({ ...ctx, key: 'D/d.wav' }, R) === null && prevOf({ ...ctx, key: 'D/a.wav' }, R) === null, 'the ends of the list: nothing after the last, nothing before the first');
  const renamed = R.filter(r => r.name !== 'b');
  check(nextOf(ctx, renamed).row.name === 'c' && prevOf(ctx, renamed).row.name === 'a', 'a row gone from the list continues from the position it had');
  const added = buildRows({ folders: L, files: [...F, { folderId: 'D', path: 'bb.wav', name: 'bb.wav', size: 5, modified: 5 }], entries: [] });
  check(nextOf(ctx, added).row.name === 'bb', 'a file added meanwhile counts (the list is read when the next track is prepared)');
  check(nextOf(null, R) === null && prevOf(null, R) === null, 'a picked or dropped file: no next or previous track');
  // the order by recent frozen in the context (owner 2026-11-11): the open track that becomes the last used does not
  // move to the top of the context's list
  const RU = R.map((r, i) => ({ ...r, used: 100 - i * 10 }));
  const recent = listOf(RU, { chip: 'all', order: 'recent' }).map(r => r.name);
  const rc = listContext({ chip: 'all', order: 'recent' }, '', RU.find(r => r.name === recent[2]).key, RU);
  const played = RU.map(r => (r.name === recent[2] ? { ...r, used: 999 } : r));
  check(rc.used && nextOf(rc, played).row.name === recent[3] && prevOf(rc, played).row.name === recent[1], 'order by recent: the next and previous tracks of the order as it was when the track opened', `${recent.join()} → ${nextOf(rc, played).row.name}`);
  const { used, ...loose } = rc;
  check(nextOf(loose, played).row.name === recent[0], 'without the frozen order the open track would jump to the top and the next one would be the first', nextOf(loose, played).row.name);
  check(!listContext({ chip: 'all', order: 'name' }, '', RU[0].key, RU).used && usedSnapshot(RU)[RU[0].key] === 100, 'the order by name keeps no last uses; the snapshot holds every used row');
  const mrows = ['r1', 'r2', 'r3', 'r4'].map(id => ({ id, name: id }));
  const mctx = { kind: 'mixtape', id: 'm', rowId: 'r4', pos: 3 };
  check(nextOf(mctx, { rows: mrows, repeat: false }) === null && nextOf(mctx, { rows: mrows, repeat: true }).row.id === 'r1', 'a mixtape: the end stops, repeat starts again from the first row');
  check(prevOf({ ...mctx, rowId: 'r1', pos: 0 }, { rows: mrows, repeat: true }).row.id === 'r4' && prevOf({ ...mctx, rowId: 'r1', pos: 0 }, { rows: mrows, repeat: false }) === null, 'Previous in a mixtape: wraps backwards with repeat, else disabled at the first row');
  const mm = mrows.map(r => (r.id === 'r1' ? { ...r, missing: true } : r));
  check(nextOf(mctx, { rows: mm, repeat: true }).row.id === 'r2', 'a missing row of a mixtape is skipped, also across the wrap');
  check(nextOf({ ...mctx, rowId: 'r2' }, { rows: mrows.map(r => ({ ...r, missing: true })), repeat: true }) === null, 'a mixtape whose rows are all missing has no next track');
}

// ---------- 4.1 mixtapes ----------
{
  let m = createMixtape('Tape', 1);
  const src = [{ folderId: 'L', folderName: 'Live sets', path: 'a.wav', name: 'a' }, { folderId: 'D', folderName: 'Demos', path: 'b.wav', name: 'b' }, { singleId: 's1', fileName: 'one.wav', name: 'one', size: 9 }, { folderId: 'L', folderName: 'Live sets', path: 'a.wav', name: 'a' }];
  m = addRows(m, src, 2);
  check(m.rows.map(r => r.name).join() === 'a,b,one,a' && m.updated === 2 && !m.repeat, 'add several in the list\'s order; the same file may appear twice; repeat off by default');
  const moved = moveRow(m, 2, 0, 3);
  check(moved.rows.map(r => r.name).join() === 'one,a,b,a', 'move: the third row above the first');
  check(removeRow(moved, moved.rows[0].id, 4).rows.length === 3 && renameMixtape(m, '  New  ', 5).name === 'New' && renameMixtape(m, '', 5).name === 'Tape' && setRepeat(m, true, 6).repeat, 'remove a row, rename (an empty name keeps the old one), repeat');
  const cx = { folders: new Map([['L', { granted: true }], ['D', { granted: false }]]), files: new Set(['L/a.wav']), singles: new Map([['s1', { granted: true }]]), gone: new Set() };
  check(m.rows.map(r => rowStatus(r, cx)).join() === 'ok,waiting,ok,ok', 'row status: ok, waiting for the folder\'s permission');
  check(rowStatus(m.rows[0], { ...cx, files: new Set() }) === 'missing' && rowStatus(m.rows[2], { ...cx, singles: new Map() }) === 'missing' && rowStatus(m.rows[0], { ...cx, folders: new Map() }) === 'missing', 'row status: a path gone, a single from another browser, an unknown folder are "not found"');
  check(rowStatus(m.rows[0], { ...cx, gone: new Set(['L/a.wav']) }) === 'missing', 'row status: a file that failed to open is "not found" until the folder is read again');
  const back = exportMixtapes([{ id: 'L', name: 'Live sets', handle: { secret: 1 } }], [m]);
  check(!JSON.stringify(back).includes('secret') && back.format === 1 && back.folders[0].name === 'Live sets' && back.mixtapes[0].rows[2].ref.fileName === 'one.wav', 'the backup: folder names and paths, single file names, no handle');
  const relinked = relinkFolder(back.mixtapes, { id: 'NEW', name: 'Live sets' }, new Set(['D']), 9);
  check(relinked.length === 1 && relinked[0].rows.filter(r => r.ref.folderId === 'NEW').length === 2 && relinked[0].rows[1].ref.folderId === 'D', 'a folder added with the same name links the rows of an unknown folder again');
  const older = { ...back.mixtapes[0], name: 'Older', updated: 1 }, newer = { ...back.mixtapes[0], name: 'Newer', updated: 99 };
  const mg = mergeMixtapes({ format: 1, folders: [], mixtapes: [newer] }, { format: 1, folders: [{ id: 'X', name: 'X' }], mixtapes: [older, { id: 'other', name: 'O', rows: [], updated: 3 }] });
  check(mg.mixtapes.find(x => x.id === newer.id).name === 'Newer' && mg.mixtapes.length === 2 && mg.folders.length === 1, 'the import merges by id: the one changed last wins, the others are added');
  const bk = makeBackup([['coding-misk-ui', 'hw']], new Date(0), null, back);
  const merged = mergeBackup(bk, k => (k === MIXTAPES_KEY ? { format: 1, folders: [], mixtapes: [] } : null));
  check(bk.data[MIXTAPES_KEY] && merged.values[MIXTAPES_KEY].mixtapes.length === 1 && merged.counts.mixtapes === 1, 'mixtapes travel in the settings backup and are counted on import');
  check(!(MIXTAPES_KEY in makeBackup([['coding-misk-ui', 'hw']], new Date(0), null, { format: 1, folders: [], mixtapes: [] }).data), 'no mixtape: no key');
}

// ---------- 4.5 the backup file in parts ----------
{
  const recs = Array.from({ length: 7 }, (_, i) => ({ fp: `p${i}`, title: `T${i}`, used: i, handle: { x: 1 } }));
  const out = backupParts(makeBackup([['coding-misk-ui', 'hw']], new Date(0)));
  out.add(recs.slice(0, 3)); out.add(recs.slice(3));
  const j = JSON.parse(out.end().join(''));
  check(j.format === BACKUP_FORMAT && j.data['coding-misk-ui'] === 'hw' && j.data['coding-misk-decodes'].length === 7 && !JSON.stringify(j).includes('handle'), 'the backup built in parts parses: every record, no handle');
  const empty = backupParts(makeBackup([], new Date(0)));
  empty.add([{ fp: 'only', used: 1 }]);
  const none = backupParts(makeBackup([], new Date(0)));
  check(JSON.parse(empty.end().join('')).data['coding-misk-decodes'].length === 1 && !('coding-misk-decodes' in JSON.parse(none.end().join('')).data), 'parts with no other key, and with no record');
}

// ---------- 1.3, 1.5, 4.5 the decode store on a fake IndexedDB ----------
{
  const idb = createFakeIDB();
  // a version 1 database with 40 records
  await new Promise(res => { const o = idb.open('coding-misk-decodes', 1); o.onupgradeneeded = () => o.result.createObjectStore('decodes', { keyPath: 'fp' }); o.onsuccess = () => { const tx = o.result.transaction('decodes', 'readwrite'); for (let i = 0; i < 40; i++) tx.objectStore('decodes').put({ fp: `k${i}`, title: `T${i}`, fileName: `t${i}.wav`, used: i, modelA: { version: V, bars: [1, 2, 3] }, ...(i % 4 === 0 ? { modelB: { level: 'B', version: V } } : {}) }); tx.oncomplete = res; }; });
  const s = createDecodeStore({ idb });
  const es = await s.entries();
  check(es.length === 40 && es.filter(e => markOf(e) === 'full').length === 10 && es[0].fp === 'k39' && s.stats.reads === 0, 'the upgrade from version 1 fills the index from the 40 records; entries read no record', `${es.length}, reads ${s.stats.reads}`);
  check(idb.raw('coding-misk-decodes', 'decodes').every(r => !('mark' in r)) && JSON.stringify(es).length < 40 * 400, 'the records are unchanged; an index entry is a few hundred bytes', `${Math.round(JSON.stringify(es).length / 40)} bytes`);
  await s.put({ fp: 'new', title: 'New', fileName: 'n.wav', modelA: { version: V }, where: { folderId: 'L', path: 'n.wav', size: 3, modified: 4 } });
  const e = await s.entry('new');
  check(e && e.where.path === 'n.wav' && markOf(e) === 'live' && (await s.entries())[0].fp === 'new', 'put writes the record and its entry together, with where the file came from');
  await s.remove('k39');
  check(!(await s.entry('k39')) && !(await s.get('k39')), 'remove deletes the record and its entry');
  const r3 = await s.recent(3);
  check(r3.map(r => r.fp).join() === 'new,k38,k37' && r3.every(r => !('handle' in r)), 'recent(n): the records used last, without handles');
  let batches = 0, n = 0;
  const total = await s.each(list => { batches++; n += list.length; }, 7);
  check(total === 40 && n === 40 && batches === 6, 'each: every record in batches', `${total} in ${batches}`);
  // the index cleared: rebuilt in batches
  idb.clearStore('coding-misk-decodes', 'index');
  const s2 = createDecodeStore({ idb });
  const fixed = await s2.rebuilt;
  check(fixed === 40 && (await s2.entries()).length === 40, 'the index cleared: rebuilt from the records in the background', `${fixed}`);
  // the import through the index: an older record does not replace, a newer one does and keeps the handle
  const handled = createFakeIDB();
  const s3 = createDecodeStore({ idb: handled });
  await s3.put({ fp: 'h', title: 'Here', used: 10, handle: { kind: 'file', name: 'h.wav' } });
  const usedNow = (await s3.entry('h')).used;
  const a = await s3.importMany([{ fp: 'h', title: 'Older', used: usedNow - 5 }, { fp: 'n2', title: 'Fresh', used: 5 }]);
  check(a === 1 && (await s3.get('h')).title === 'Here' && (await s3.get('n2')).title === 'Fresh', 'import: an older record stays out, a new track comes in');
  await s3.importMany([{ fp: 'h', title: 'Newer', used: usedNow + 100 }]);
  const h = await s3.get('h');
  check(h.title === 'Newer' && h.handle && h.handle.name === 'h.wav', 'import: a newer record replaces the stored one and keeps its file handle');
  check(importWins(null, { fp: 'x' }) && !importWins({ used: 5 }, { fp: 'x', used: 5 }), 'the import rule: no entry or an older entry');
  // the cap on index entries: Live-only first
  const small = createDecodeStore({ idb: createFakeIDB(), cap: 5 });
  for (let i = 0; i < 5; i++) await small.put({ fp: `c${i}`, title: `C${i}`, modelA: { version: V }, ...(i < 2 ? { modelB: { level: 'B', version: V } } : {}) });
  await small.put({ fp: 'c5', title: 'C5', modelA: { version: V } });
  const left = (await small.entries()).map(x => x.fp).sort();
  check(left.join() === 'c0,c1,c3,c4,c5', 'over the cap: the least recently used Live-only track goes, the full ones stay', left.join());
  check(overCap(Array.from({ length: 2001 }, (_, i) => ({ fp: `f${i}`, used: i, mark: 'full', version: V }))).join() === 'f0' && DECODE_CAP === 2000, 'only full analyses: the least recently used goes; the cap is 2000');
  // a full disk: drop in the cap's order, ten at a time, until the write succeeds
  const tight = createFakeIDB({ quota: 6000 });
  const q = createDecodeStore({ idb: tight });
  for (let i = 0; i < 30; i++) await q.put({ fp: `q${i}`, title: `Q${i}`, modelA: { version: V }, pad: 'x'.repeat(40) });
  const kept = await q.entries();
  const ok = await q.put({ fp: 'big', title: 'Big', modelA: { version: V }, pad: 'y'.repeat(4000) });
  const after = await q.entries();
  check(ok && after.some(x => x.fp === 'big') && after.length < kept.length + 1 && after.every(x => x.fp === 'big' || kept.some(k => k.fp === x.fp)), 'a full disk: the oldest tracks go, ten at a time, and the write succeeds quietly', `${kept.length} → ${after.length}`);
  const noDb = createDecodeStore({ idb: undefined });
  check((await noDb.ready) === false && (await noDb.entries()).length === 0 && (await noDb.put({ fp: 'x' })) === false, 'no IndexedDB: every call fails quietly');
}

// ---------- 3.3, 3.4 the preparation's timing and budget ----------
{
  check(prepareAt(180) === 150 && prepareAt(20) === 0, 'prepared 30 s before the end, at once for a shorter track');
  check(fitsBudget(300, 48000) && !fitsBudget(540, 48000) && decodedBytes(300, 48000) <= BUDGET_BYTES && BUDGET_BYTES === 120 * 1024 * 1024, 'the 120 MB budget: 5 minutes fit, 9 minutes are decoded at the hand-over', `${Math.round(decodedBytes(300, 48000) / 1048576)} MB for 5 min`);
  check(endStep({ ready: true }) === 'start' && endStep({ decoded: true, waited: 1 }) === 'wait' && endStep({ decoded: true, waited: 3.1 }) === 'audio' && endStep({ decoded: false, waited: 9 }) === 'wait' && endStep({ failed: true }) === 'skip', 'the end of a track: ready starts; else wait, and after 3 s the sound once decoded; a failure is skipped');
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
