// The "Another file" panel of the Decode tab (decode-library D2, D6, D7, D11): "Choose a file…", the user's folders
// (chips with their permission), the Autoplay switch, and one compact list of the recent tracks and the folders' files
// with search, order and marks; a Mixtapes view with its own rows. The same element shows over the tab's panel while a
// track is open, and inline under the drop area of the empty tab. The list draws only the rows in view (fixed row
// height), so 4000 rows cost a few dozen nodes. It reads the folders' index and the decode store's light index, never a
// stored analysis. The tab opens tracks; the panel finds their files.
import { foldersSupported, pickFolder, permission, scanFolder, fileAt } from './folders.js';
import { createLibraryStore } from './library-store.js';
import { buildRows, filterRows, sortRows, listPrefs, windowOf, fileKey, usedSnapshot, mediaCounts, MEDIA, LIST_KEY, AUTOPLAY_KEY } from './library.js';
import { createMixtape, addRows, moveRow, removeRow, renameMixtape, setRepeat, relinkSingle, rowStatus, relinkFolder, exportMixtapes, mergeMixtapes } from './mixtapes.js';
import { AUDIO_EXT, VIDEO_EXT } from './folders.js';
import { AUDIO_FILE, VIDEO_FILE, NO_SOUND } from '../icons.js';

const ls = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const svg = body => `<svg class="dc-ico" viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
export const LIB_ICON = {
  folder: svg('<path d="M1.8 4.2a1 1 0 0 1 1-1h3.4l1.4 1.6h5.6a1 1 0 0 1 1 1v6.9a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'),
  lock: svg('<path d="M5 7V5.2a3 3 0 0 1 6 0V7" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="3.5" y="7" width="9" height="6.5" rx="1.3" fill="currentColor"/>'),
  x: svg('<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  file: svg('<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 1.8h5.5L12.5 5v9.2H4z"/><path d="M9.5 1.8V5h3"/></g>'),
  up: svg('<path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  down: svg('<path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  grip: svg('<g fill="currentColor"><circle cx="6" cy="4" r="1.1"/><circle cx="10" cy="4" r="1.1"/><circle cx="6" cy="8" r="1.1"/><circle cx="10" cy="8" r="1.1"/><circle cx="6" cy="12" r="1.1"/><circle cx="10" cy="12" r="1.1"/></g>'),
  back: svg('<path d="M10 3.5L5.5 8l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  repeat: svg('<path d="M3 7V6a2 2 0 0 1 2-2h8M11 2l2 2-2 2M13 9v1a2 2 0 0 1-2 2H3M5 14l-2-2 2-2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  tape: svg('<rect x="1.5" y="3.5" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="5.5" cy="7.5" r="1.4" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="10.5" cy="7.5" r="1.4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 12.5l1-2h5l1 2" fill="none" stroke="currentColor" stroke-width="1.2"/>'),
  plus: svg('<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
};
// the list's names: tags read in idle time for the rows of the active filter (D4); the measure of task 2.4 decided
// (decisions.md): kept, with a budget per idle slice
export const TAGS_IN_LIST = true;
const MARK = { full: '◆', live: '◇' };

// app: { t, esc, toast, confirmInline }; store: the decode store; hooks: { openRow(row, ctx) → Promise, openRecent(fp, ctx),
// pick(), removeRecent(fp), playing() → { key, mixId, mixRowId } | null, changed() (the list or a mixtape changed: the
// tab checks its next track), opened() }
export function createLibraryPanel({ app, store, hooks }) {
  const { t, esc } = app;
  const lstore = createLibraryStore();
  const supported = foldersSupported();
  const el = document.createElement('div');
  el.className = 'dcl';
  el.id = 'dcl';
  let folders = [], files = [], entries = [], singles = [], mixtapes = [], storage = true;
  let prefs = listPrefs(ls.get(LIST_KEY, null)), search = '', view = 'tracks', openMix = null, selecting = false;
  const selected = new Set(), gone = new Set();
  let rows = [], shown = [], rowsDirty = true, overlay = false, isOpen = false, note = null, menuOpen = false;
  const scanning = new Map();
  let autoplay = !!ls.get(AUTOPLAY_KEY, false);

  // ---------- data ----------
  const loaded = (async () => {
    const [ok, fs, fl, sg, mx, en] = await Promise.all([lstore.ready, lstore.folders(), lstore.files(), lstore.singles(), lstore.mixtapes(), store.entries()]);
    storage = ok && (await store.ready);
    folders = fs.map(f => ({ ...f, granted: false })); files = fl; singles = sg.map(s => ({ ...s, granted: false })); mixtapes = mx; entries = en;
    // permission without a prompt (D2): a folder not granted shows its last rows, waiting
    await Promise.all([...folders, ...singles].map(async f => { f.granted = (await permission(f.handle, false)) === 'granted'; }));
    rowsDirty = true;
    render();
  })();
  let entT = 0;
  // the decode store changed (a save, a remove, the index rebuilt): the light index again, at most once a second
  // (a playing track is saved every 1.5 s and changes only its last use: the rows are not built again for that, and the
  // order by recent is sorted again only when it is the order shown)
  const sig = list => list.map(e => `${e.fp}|${e.mark}|${e.version}|${e.title}|${e.artist}|${e.where ? `${e.where.folderId}/${e.where.path}/${e.where.size}/${e.where.modified}` : ''}`).join('\n');
  store.onChange(() => {
    if (entT) return;
    entT = setTimeout(async () => {
      entT = 0;
      const next = await store.entries();
      if (sig(next) === sig(entries)) {
        const used = new Map(next.map(e => [e.fp, e.used || 0]));
        entries = next;
        for (const r of rows) if (r.fp && used.has(r.fp)) r.used = used.get(r.fp);
        if (sorted.order === 'recent') sorted.rows = null;
      } else { entries = next; rowsDirty = true; }
      if (isOpen || !overlay) renderList();
    }, 1000);
  });
  const getRows = () => { if (rowsDirty) { rows = buildRows({ folders, files: files.map(f => (gone.has(fileKey(f.folderId, f.path)) ? { ...f, missing: true } : f)), entries }); rowsDirty = false; } return rows; };
  // the rows sorted once per order and the filtered list once per chip and search: scrolling and stepping read them
  const sorted = { rows: null, order: null, list: [] }, filtered = { base: null, chip: null, search: null, media: null, list: [] };
  const frozen = { rows: null, used: null, chip: null, search: null, media: null, list: [] };
  function listFor({ chip = 'all', search: q = '', order = 'name', used = null, media = 'all' } = {}) {
    const r = getRows();
    // a context's frozen order by recent: sorted by its own last uses, once per context and rows
    if (order === 'recent' && used) {
      if (frozen.rows !== r || frozen.used !== used || frozen.chip !== chip || frozen.search !== q || frozen.media !== media) Object.assign(frozen, { rows: r, used, chip, search: q, media, list: sortRows(filterRows(r, { chip, search: q, media }), 'recent', used) });
      return frozen.list;
    }
    if (sorted.rows !== r || sorted.order !== order) { sorted.rows = r; sorted.order = order; sorted.list = sortRows(r, order); }
    if (filtered.base !== sorted.list || filtered.chip !== chip || filtered.search !== q || filtered.media !== media) { filtered.base = sorted.list; filtered.chip = chip; filtered.search = q; filtered.media = media; filtered.list = filterRows(sorted.list, { chip, search: q, media }); }
    return filtered.list;
  }
  const fileByKey = () => new Map(files.map(f => [fileKey(f.folderId, f.path), f]));
  const folderOf = id => folders.find(f => f.id === id);
  const mixOf = id => mixtapes.find(m => m.id === id);
  // a mixtape's rows with their status, for Play, Autoplay and Previous and Next
  function mixRows(id) {
    const m = mixOf(id);
    if (!m) return { rows: [], repeat: false };
    const fset = new Set(files.map(f => fileKey(f.folderId, f.path)));
    const silent = new Set([...silentKeys, ...files.filter(f => f.audio === false).map(f => fileKey(f.folderId, f.path))]);
    const ctx = { folders: new Map(folders.map(f => [f.id, f])), files: fset, singles: new Map(singles.map(s => [s.id, s])), gone, silent };
    return { rows: m.rows.map(r => { const st = rowStatus(r, ctx); return { ...r, kind: 'mix', mixId: id, status: st, missing: st === 'missing', waiting: st === 'waiting', silent: st === 'nosound', key: r.ref.singleId ? `s:${r.ref.singleId}` : fileKey(r.ref.folderId, r.ref.path) }; }), repeat: !!m.repeat };
  }
  // a file found to hold no sound when it failed to open (decode-library: rows that cannot play): a folder file is
  // stored with `audio: false` in its index entry, a single file is remembered for the visit
  const silentKeys = new Set();
  async function markSilent(row) {
    const k = row.kind === 'mix' ? row.key : row.kind === 'file' ? row.key : null;
    if (!k) return;
    silentKeys.add(k);
    const x = files.find(f => fileKey(f.folderId, f.path) === k);
    if (x && x.audio !== false) { x.audio = false; await lstore.putFiles([x]); }
    rowsDirty = true;
    render();
  }

  // ---------- files ----------
  // the file of a row: { file, handle, where } | null when not allowed now (ask: inside a click, the browser is asked);
  // a file gone or changed throws NotFoundError, marks the row and reads its folder again (D7)
  async function fileOf(row, ask = false) {
    const ref = row.kind === 'mix' ? row.ref : row.kind === 'file' ? { folderId: row.folderId, path: row.path } : null;
    if (ref && ref.singleId) {
      const s = singles.find(x => x.id === ref.singleId);
      if (!s || !s.handle) throw Object.assign(new Error('gone'), { name: 'NotFoundError' });
      if ((await permission(s.handle, ask)) !== 'granted') return null;
      s.granted = true;
      try { return { file: await s.handle.getFile(), handle: s.handle, where: null }; } catch (e) { gone.add(`s:${s.id}`); throw Object.assign(new Error('gone'), { name: 'NotFoundError' }); }
    }
    if (ref) {
      const f = folderOf(ref.folderId);
      if (!f) throw Object.assign(new Error('gone'), { name: 'NotFoundError' });
      if (!f.granted) {
        const p = await permission(f.handle, ask);
        if (p !== 'granted') { if (ask) note = { kind: 'error', text: t('dclDenied', { name: f.name }) }; render(); return null; }
        f.granted = true; rowsDirty = true; scan(f);
      }
      const k = fileKey(ref.folderId, ref.path), idx = files.find(x => x.folderId === ref.folderId && x.path === ref.path);
      try {
        const h = await fileAt(f.handle, ref.path), file = await h.getFile();
        if (idx && row.kind === 'file' && (idx.size !== file.size)) throw Object.assign(new Error('changed'), { name: 'NotFoundError' });
        gone.delete(k);
        return { file, handle: h, where: { folderId: f.id, path: ref.path, size: file.size, modified: file.lastModified } };
      } catch (e) {
        gone.add(k); rowsDirty = true; render(); scan(f);
        throw Object.assign(new Error('gone'), { name: 'NotFoundError' });
      }
    }
    return null;
  }
  // a folder read again (D3): the rows fill as files are found; the index replaced at the end
  async function scan(f) {
    if (scanning.has(f.id)) return scanning.get(f.id);
    const job = (async () => {
      let last = 0;
      const r = await scanFolder(f.handle, {
        stop: () => !folderOf(f.id),
        onBatch: list => { const n = performance.now(); if (n - last < 300) return; last = n; files = [...files.filter(x => x.folderId !== f.id), ...list.map(x => ({ ...x, folderId: f.id, ...(tagOf(f.id, x) || {}) }))]; rowsDirty = true; renderList(); },
      }).catch(() => null);
      if (!r || !folderOf(f.id)) return;
      const merged = r.files.map(x => ({ ...x, folderId: f.id, ...(tagOf(f.id, x) || {}) }));
      files = [...files.filter(x => x.folderId !== f.id), ...merged];
      for (const x of merged) gone.delete(fileKey(f.id, x.path));
      Object.assign(f, { count: r.files.length, capped: r.capped, scanned: r.scanned });
      rowsDirty = true;
      await lstore.setFiles(f.id, merged);
      const { granted, ...keep } = f; await lstore.putFolder(keep);
      if (note && note.folder === f.id) note = null;
      render();
      hooks.changed();
      readTagsSoon();
    })().finally(() => scanning.delete(f.id));
    scanning.set(f.id, job);
    return job;
  }
  // the tags read before, kept while the file has the same size and date
  let tagMap = null;
  function tagOf(folderId, x) {
    if (!tagMap || tagMap.n !== files.length) { tagMap = fileByKey(); tagMap.n = files.length; }
    const o = tagMap.get(fileKey(folderId, x.path));
    return o && o.tagged && o.size === x.size && o.modified === x.modified ? { title: o.title, artist: o.artist, tagged: true, ...(o.audio !== undefined ? { audio: o.audio } : {}) } : null;
  }

  // ---------- tags (D4, task 2.4) ----------
  let tagT = 0, tagging = false;
  const tagStats = { files: 0, times: [], longest: 0 };
  // (codingMiskNoTags: a check holds the idle read back, to find a video without sound when it fails to open)
  function readTagsSoon() { if (!TAGS_IN_LIST || tagT || tagging || globalThis.codingMiskNoTags) return; tagT = setTimeout(() => { tagT = 0; readTags(); }, 400); }
  const idle = () => new Promise(r => (globalThis.requestIdleCallback ? requestIdleCallback(d => r(d), { timeout: 1000 }) : setTimeout(() => r({ timeRemaining: () => 8 }), 30)));
  async function readTags() {
    if (tagging) return;
    tagging = true;
    try {
      // 25 rows at a time from the list shown now, so a new chip or search is followed at the next batch
      for (let round = 0; round < 400; round++) {
        const fk = fileByKey();
        // (a video read before this check has its tags but not its sound: it is read once more)
        const want = listFor({ ...prefs, search }).filter(r => { const x = fk.get(r.key) || {}; return r.kind === 'file' && !r.waiting && !r.fp && (!x.tagged || (x.video && x.audio === undefined)); }).slice(0, 25);
        if (!want.length) break;
        const done = [];
        for (const r of want) {
          const d = await idle();
          if (d.timeRemaining && d.timeRemaining() < 4) await idle();
          const f = folderOf(r.folderId), x = fk.get(r.key);
          if (!f || !f.granted || !x) continue;
          const t0 = performance.now();
          let tags = {}, audio;
          try {
            const file = await (await fileAt(f.handle, r.path)).getFile();
            const mb = await import('mediabunny');
            const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
            tags = (await input.getMetadataTags()) || {};
            // the same read of the header tells whether the file has a sound at all (a screen recording may not)
            audio = !!(await input.getPrimaryAudioTrack().catch(() => true));
          } catch (e) { tags = {}; }
          if (audio !== undefined) x.audio = audio;
          const dt = performance.now() - t0;
          tagStats.files++; tagStats.times.push(dt); tagStats.longest = Math.max(tagStats.longest, dt);
          // a file without readable tags is not tried again
          x.tagged = true;
          if (typeof tags.title === 'string' && tags.title.trim()) { x.title = tags.title.trim(); x.artist = typeof tags.artist === 'string' ? tags.artist.trim() : ''; }
          done.push(x);
        }
        if (done.length) { await lstore.putFiles(done); rowsDirty = true; renderList(); }
      }
    } finally { tagging = false; }
  }


  // ---------- folders ----------
  async function addFolder() {
    const r = await pickFolder(folders);
    if (r.cancelled) return;
    if (r.error) { note = { kind: 'error', text: t('dclAddFailed') }; render(); return; }
    if (r.dup) { note = { kind: 'note', text: t('dclDuplicate', { name: r.dup.name }) }; render(); return; }
    const f = { ...r.folder, granted: true };
    const known = new Set(folders.map(x => x.id));
    folders.push(f);
    const { granted, ...keep } = f; await lstore.putFolder(keep);
    // mixtape rows of a folder with this name, from a backup or a removed folder, point to it again (D11)
    const relinked = relinkFolder(mixtapes, f, known);
    if (relinked.length) { for (const m of relinked) mixtapes = mixtapes.map(x => (x.id === m.id ? m : x)); await lstore.putMixtapes(relinked); }
    note = { kind: 'note', text: t('dclAdded', { name: f.name }), folder: f.id };
    rowsDirty = true; render();
    await scan(f);
  }
  async function allow(f) {
    const p = await permission(f.handle, true);
    if (p !== 'granted') { note = { kind: 'error', text: t('dclDenied', { name: f.name }) }; render(); return false; }
    f.granted = true; note = null; rowsDirty = true; render(); hooks.changed();
    scan(f);
    return true;
  }
  async function removeFolder(id) {
    folders = folders.filter(f => f.id !== id); files = files.filter(f => f.folderId !== id);
    if (prefs.chip === id) setPrefs({ chip: 'all' });
    await lstore.removeFolder(id);
    rowsDirty = true; render(); hooks.changed();
  }
  const setPrefs = p => { prefs = listPrefs({ ...prefs, ...p }); ls.set(LIST_KEY, prefs); };

  // ---------- mixtapes ----------
  async function saveMix(m) { mixtapes = mixtapes.some(x => x.id === m.id) ? mixtapes.map(x => (x.id === m.id ? m : x)) : [...mixtapes, m]; await lstore.putMixtape(m); hooks.changed(); }
  // a list row into a mixtape: a folder file by its path; a recent track by its stored handle, as a single file
  async function srcOf(r) {
    if (r.kind === 'file') return r;
    const rec = r.fp ? await store.get(r.fp) : null;
    const single = { id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: r.fileName || r.name, size: rec ? rec.size || 0 : 0, handle: rec && rec.handle ? rec.handle : null, granted: false };
    if (single.handle) { singles.push(single); const { granted, ...keep } = single; await lstore.putSingle(keep); }
    return { singleId: single.handle ? single.id : `missing-${single.id}`, fileName: single.name, name: r.name, size: single.size, video: r.video };
  }
  async function addSelected(mixId) {
    const list = listFor({ ...prefs, search }).filter(r => selected.has(r.key));
    if (!list.length) return;
    let m = mixId ? mixOf(mixId) : createMixtape(t('dclNewMixName', { n: mixtapes.length + 1 }));
    const srcs = []; for (const r of list) srcs.push(await srcOf(r));
    m = addRows(m, srcs);
    await saveMix(m);
    selected.clear(); selecting = false; menuOpen = false;
    app.toast(t('dclAddedTo', { n: srcs.length, name: m.name }));
    if (!mixId) { view = 'mixtapes'; openMix = m.id; render(); const inp = el.querySelector('#dcl-mix-name'); if (inp) { inp.focus(); inp.select(); } return; }
    render();
  }
  // single files with the browser's picker ("File…"); rowId: a row of another browser picked again
  async function pickSingles(rowId = null) {
    if (typeof globalThis.showOpenFilePicker !== 'function') return;
    let hs;
    try { hs = await globalThis.showOpenFilePicker({ multiple: !rowId, types: [{ description: 'Audio or video', accept: { 'audio/*': AUDIO_EXT, 'video/*': VIDEO_EXT } }] }); } catch (e) { return; }
    let m = mixOf(openMix);
    if (!m) return;
    const srcs = [];
    for (const h of hs) {
      let size = 0; try { size = (await h.getFile()).size; } catch (e) {}
      const s = { id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: h.name, size, handle: h, granted: true };
      singles.push(s); const { granted, ...keep } = s; await lstore.putSingle(keep);
      if (rowId) { m = relinkSingle(m, rowId, s); gone.delete(`s:${s.id}`); break; }
      srcs.push({ singleId: s.id, fileName: h.name, name: h.name.replace(/\.[a-z0-9]{1,5}$/i, ''), size, video: VIDEO_EXT.some(x => h.name.toLowerCase().endsWith(x)) });
    }
    if (srcs.length) m = addRows(m, srcs);
    await saveMix(m); render();
  }
  // the kind of a row's file (decode-library: a kind icon on every row): a music note, a video, a video without sound
  const kindHtml = (video, silent) => `<span class="dcl-vid${silent ? ' vonly' : ''}" title="${esc(t(silent ? 'dclNoSoundTip' : video ? 'dclVideo' : 'dclAudio'))}" aria-label="${esc(t(silent ? 'dclNoSoundTip' : video ? 'dclVideo' : 'dclAudio'))}">${video ? VIDEO_FILE : AUDIO_FILE}${silent ? NO_SOUND : ''}</span>`;

  // ---------- rendering ----------
  const rowH = () => (globalThis.matchMedia && matchMedia('(max-width: 600px)').matches ? 40 : 32);
  const playingNow = () => (hooks.playing ? hooks.playing() : null) || {};
  function chipsHtml() {
    if (!supported || !folders.length) return '';
    const n = getRows().length;
    const chip = f => {
      const on = prefs.chip === f.id, cnt = f.capped ? t('dclCapped', { n: f.count }) : String(files.filter(x => x.folderId === f.id).length);
      return `<span class="dcl-chip${on ? ' on' : ''}${f.granted ? '' : ' wait'}"><button class="chip" data-dcl-chip="${esc(f.id)}" aria-pressed="${on}" title="${esc(f.capped ? t('dclCappedTip', { n: f.count }) : f.name)}">${f.granted ? LIB_ICON.folder : LIB_ICON.lock} ${esc(f.name)} <small>${esc(cnt)}</small></button>${f.granted ? '' : `<button class="btn mini-btn" data-dcl-allow="${esc(f.id)}">${esc(t('dclAllow'))}</button>`}<button class="btn icon mini-btn" data-dcl-rmf="${esc(f.id)}" title="${esc(t('dclRemoveFolder', { name: f.name }))}" aria-label="${esc(t('dclRemoveFolder', { name: f.name }))}">${LIB_ICON.x}</button></span>`;
    };
    return `<div class="dcl-chips" id="dcl-chips" role="group" aria-label="${esc(t('dclFolders'))}"><span class="dcl-chip${prefs.chip === 'all' ? ' on' : ''}"><button class="chip" data-dcl-chip="all" aria-pressed="${prefs.chip === 'all'}">${esc(t('dclAll'))} <small>${n}</small></button></span>${folders.map(chip).join('')}</div>`;
  }
  function rowHtml(r, i, top) {
    const p = playingNow(), on = p.key && p.key === r.key && !p.mixId;
    const cls = `dcl-row${on ? ' on' : ''}${r.waiting ? ' wait' : ''}${r.missing ? ' miss' : ''}${r.silent ? ' vonly' : ''}${selected.has(r.key) ? ' sel' : ''}`;
    const mark = r.mark ? `<span class="dcl-mark ${r.mark}" title="${esc(t(r.mark === 'full' ? 'dclMarkFull' : 'dclMarkLive'))}" aria-label="${esc(t(r.mark === 'full' ? 'dclMarkFull' : 'dclMarkLive'))}">${MARK[r.mark]}</span>` : '<span class="dcl-mark"></span>';
    const state = r.missing ? `<span class="dcl-state miss">${esc(t('dclNotFound'))}</span>` : r.waiting ? `<span class="dcl-state wait" title="${esc(t('dclWaitingTip'))}">${LIB_ICON.lock}</span>` : '';
    return `<div class="${cls}" role="option" aria-selected="${!!on}" data-dcl-row="${esc(r.key)}" data-i="${i}" style="top:${top}px" title="${esc(r.fileName || r.name)}"><span class="dcl-selc">${selecting ? `<input type="checkbox" class="dcl-sel" tabindex="-1" aria-label="${esc(r.name)}"${selected.has(r.key) ? ' checked' : ''}>` : ''}</span>${kindHtml(r.video, r.silent)}<span class="dcl-name">${esc(r.name)}${r.artist ? ` <small>${esc(r.artist)}</small>` : ''}</span><span class="dcl-folder">${esc(r.folderName || t('dclRecent'))}</span>${state}${mark}${r.fp ? `<button class="btn icon mini-btn dcl-rm" data-dcl-remove="${esc(r.fp)}" title="${esc(t('dcRemove'))}" aria-label="${esc(`${t('dcRemove')} · ${r.name}`)}">${LIB_ICON.x}</button>` : '<span class="dcl-rm"></span>'}</div>`;
  }
  let lastWin = '';
  // the rows in view only (D6)
  function renderList(force = false) {
    const box = el.querySelector('#dcl-list');
    if (!box || view !== 'tracks') return;
    shown = listFor({ ...prefs, search });
    const mb = el.querySelector('#dcl-media'); if (mb) { const h = mediaChips(); if (mb.dataset.h !== h) { mb.innerHTML = h; mb.dataset.h = h; } }
    const h = rowH(), sp = box.querySelector('.dcl-spacer');
    const { first, last } = windowOf(box.scrollTop, box.clientHeight || 400, h, shown.length);
    const key = `${first}|${last}|${shown.length}|${shown.slice(first, last).map(r => `${r.key}${r.mark}${r.waiting}${r.missing}${r.silent}${r.name}`).join(',')}|${selecting}|${selected.size}|${JSON.stringify(playingNow())}|${h}`;
    sp.style.height = `${shown.length * h}px`;
    box.dataset.q = search;
    if (!force && key === lastWin) return;
    lastWin = key;
    sp.innerHTML = shown.slice(first, last).map((r, k) => rowHtml(r, first + k, (first + k) * h)).join('');
    const em = el.querySelector('#dcl-empty');
    if (em) { em.hidden = shown.length > 0; em.textContent = search ? t('dclNoMatch') : t(supported ? 'dclEmpty' : 'dcNoRecent'); }
    const sel = el.querySelector('#dcl-selbar-n'); if (sel) sel.textContent = t('dclSelected', { n: selected.size });
  }
  // the kind filter's chips with their counts within the chip and the search (decode-library: Kind filter)
  const counted = { rows: null, chip: null, search: null, n: null };
  function mediaChips() {
    const r = getRows();
    if (counted.rows !== r || counted.chip !== prefs.chip || counted.search !== search) Object.assign(counted, { rows: r, chip: prefs.chip, search, n: mediaCounts(r, { chip: prefs.chip, search }) });
    return MEDIA.map(m => `<button class="chip" role="radio" data-dcl-media="${m}" aria-pressed="${prefs.media === m}" aria-checked="${prefs.media === m}">${esc(t(m === 'all' ? 'dclAll' : m === 'audio' ? 'dclAudioKind' : 'dclVideoKind'))} <small>${counted.n[m]}</small></button>`).join('');
  }
  function tracksHtml() {
    const media = `<span class="chips dc-seg dcl-media" id="dcl-media" role="radiogroup" aria-label="${esc(t('dclKind'))}">${mediaChips()}</span>`;
    const order = `<span class="chips dc-seg" role="radiogroup" aria-label="${esc(t('dclOrder'))}">${['name', 'recent'].map(o => `<button class="chip" role="radio" data-dcl-order="${o}" aria-pressed="${prefs.order === o}" aria-checked="${prefs.order === o}">${esc(t(o === 'name' ? 'dclByName' : 'dclByRecent'))}</button>`).join('')}</span>`;
    const selBar = selecting ? `<div class="dcl-selbar"><span id="dcl-selbar-n">${esc(t('dclSelected', { n: selected.size }))}</span><span class="dcl-menu-wrap"><button class="btn" id="dcl-addto" aria-expanded="${menuOpen}"${selected.size ? '' : ' disabled'}>${LIB_ICON.tape} ${esc(t('dclAddTo'))} ▾</button>${menuOpen ? `<div class="dcl-menu" role="menu">${mixtapes.map(m => `<button class="dcl-mi" role="menuitem" data-dcl-addto="${esc(m.id)}">${esc(m.name)}</button>`).join('')}<button class="dcl-mi" role="menuitem" data-dcl-addto="">${LIB_ICON.plus} ${esc(t('dclNewMix'))}</button></div>` : ''}</span><button class="btn" id="dcl-selcancel">${esc(t('trashCancel'))}</button></div>` : '';
    return `<div class="dcl-tools"><input type="search" id="dcl-search" placeholder="${esc(t('dclSearch'))}" aria-label="${esc(t('dclSearch'))}" value="${esc(search)}" autocomplete="off" data-no-knob>${order}${media}${supported ? `<button class="chip" id="dcl-select" aria-pressed="${selecting}">${esc(t('dclSelect'))}</button>` : ''}</div>
      ${selBar}${chipsHtml()}
      <div class="dcl-list" id="dcl-list" role="listbox" aria-label="${esc(t('dclTracks'))}" tabindex="0"><div class="dcl-spacer"></div></div><p class="note dcl-empty" id="dcl-empty" hidden></p>`;
  }
  function mixtapesHtml() {
    const m = openMix && mixOf(openMix);
    if (!m) {
      const list = mixtapes.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)).map(x => `<li class="dcl-mix" data-dcl-open="${esc(x.id)}"><span class="dcl-vid">${LIB_ICON.tape}</span><button class="dcl-mix-name" data-dcl-open="${esc(x.id)}">${esc(x.name)}</button><small class="muted">${esc(t('dclRows', { n: x.rows.length }))}</small><button class="btn" data-dcl-play="${esc(x.id)}">${esc(t('dcPlay'))}</button></li>`).join('');
      return `<div class="dcl-tools"><button class="btn" id="dcl-newmix">${LIB_ICON.plus} ${esc(t('dclNewMix'))}</button></div>${list ? `<ul class="dcl-mixes">${list}</ul>` : `<p class="note">${esc(t('dclNoMixtapes'))}</p>`}`;
    }
    const src = mixRows(m.id), p = playingNow();
    const rowsH = src.rows.map((r, i) => {
      const on = p.mixId === m.id && p.mixRowId === r.id;
      const state = r.status === 'nosound' ? '' : r.status === 'missing' ? `<span class="dcl-state miss">${esc(t('dclNotFound'))}</span>${r.ref.singleId ? `<button class="btn mini-btn" data-dcl-repick="${esc(r.id)}">${esc(t('dclFile'))}</button>` : ''}` : r.status === 'waiting' ? `<span class="dcl-state wait" title="${esc(t('dclWaitingTip'))}">${LIB_ICON.lock}</span>` : '';
      return `<li class="dcl-mrow${on ? ' on' : ''}${r.status === 'missing' ? ' miss' : ''}${r.status === 'waiting' ? ' wait' : ''}${r.silent ? ' vonly' : ''}" draggable="true" data-i="${i}" data-dcl-mrow="${esc(r.id)}" title="${esc(t('plDrag'))}"><span class="dcl-grip">${LIB_ICON.grip}</span><span class="dcl-n">${i + 1}</span>${kindHtml(r.video, r.silent)}<span class="dcl-name">${esc(r.name)}</span><span class="dcl-folder">${esc(r.ref.folderName || r.ref.fileName || '')}</span>${state}<span class="dcl-macts"><button class="btn icon mini-btn" data-dcl-up="${i}" aria-label="${esc(t('dclUp'))}" title="${esc(t('dclUp'))}"${i ? '' : ' disabled'}>${LIB_ICON.up}</button><button class="btn icon mini-btn" data-dcl-down="${i}" aria-label="${esc(t('dclDown'))}" title="${esc(t('dclDown'))}"${i < src.rows.length - 1 ? '' : ' disabled'}>${LIB_ICON.down}</button><button class="btn icon mini-btn" data-dcl-rmrow="${esc(r.id)}" aria-label="${esc(t('dclRemoveRow'))}" title="${esc(t('dclRemoveRow'))}">${LIB_ICON.x}</button></span></li>`;
    }).join('');
    return `<div class="dcl-mixhead"><button class="btn icon" id="dcl-back" aria-label="${esc(t('dclBack'))}" title="${esc(t('dclBack'))}">${LIB_ICON.back}</button><input type="text" id="dcl-mix-name" maxlength="80" value="${esc(m.name)}" aria-label="${esc(t('dclMixName'))}" data-no-knob>
        <button class="btn primary" data-dcl-play="${esc(m.id)}">${esc(t('dcPlay'))}</button><button class="vswitch" id="dcl-repeat" aria-pressed="${!!m.repeat}" title="${esc(t('dclRepeatTip'))}"><span class="vs-lamp" aria-hidden="true"></span><span class="vs-txt">${esc(t('dclRepeat'))}</span></button>
        <button class="btn" id="dcl-files">${LIB_ICON.file} ${esc(t('dclFile'))}</button><button class="btn danger" id="dcl-delmix">${esc(t('dclDeleteMix'))}</button></div>
      ${rowsH ? `<ol class="dcl-mrows" id="dcl-mrows">${rowsH}</ol>` : `<p class="note">${esc(t('dclMixEmpty'))}</p>`}`;
  }
  function render() {
    const keepScroll = el.querySelector('#dcl-list') ? el.querySelector('#dcl-list').scrollTop : 0;
    const focus = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id : null;
    const head = overlay ? `<div class="dcl-top"><h3 class="dcl-h">${esc(t('dcAnother'))}</h3><button class="btn icon" id="dcl-close" aria-label="${esc(t('dclClose'))}" title="${esc(t('dclClose'))}">${LIB_ICON.x}</button></div>` : '';
    const acts = `<div class="dcl-acts"><button class="btn${overlay ? ' primary' : ''}" id="dcl-choose">${LIB_ICON.file} ${esc(t('dclChoose'))}</button>${supported ? `<button class="btn" id="dcl-add">${LIB_ICON.folder} ${esc(t('dclAddFolder'))}</button><button class="vswitch" id="dcl-autoplay" aria-pressed="${autoplay}" title="${esc(t('dclAutoplayTip'))}"><span class="vs-lamp" aria-hidden="true"></span><span class="vs-txt">${esc(t('dclAutoplay'))}</span></button>` : ''}</div>`;
    const notes = `${!storage ? `<p class="note dcl-note" id="dcl-nostorage">${esc(t('dclNoStorage'))}</p>` : ''}${!supported ? `<p class="note dcl-note" id="dcl-nofolders">${esc(t('dclNoFolders'))}</p>` : ''}${note ? `<p class="dc-status ${note.kind}" role="${note.kind === 'error' ? 'alert' : 'status'}" id="dcl-msg">${esc(note.text)}</p>` : ''}`;
    const views = supported ? `<span class="chips dc-seg dcl-views" role="tablist">${['tracks', 'mixtapes'].map(v => `<button class="chip" role="tab" data-dcl-view="${v}" aria-pressed="${view === v}" aria-selected="${view === v}">${esc(t(v === 'tracks' ? 'dclTracks' : 'dclMixtapes'))}</button>`).join('')}</span>` : `<div class="lbl">${esc(t('dcRecent'))}</div>`;
    el.classList.toggle('over', overlay);
    el.innerHTML = `${head}${acts}${notes}${views}${view === 'tracks' || !supported ? tracksHtml() : mixtapesHtml()}`;
    lastWin = '';
    const box = el.querySelector('#dcl-list');
    if (box) { box.scrollTop = keepScroll; renderList(true); }
    if (focus) { const f = el.querySelector(`#${focus}`); if (f) { f.focus(); if (f.id === 'dcl-search') f.setSelectionRange(f.value.length, f.value.length); } }
  }

  // ---------- events ----------
  let searchT = 0, drag = null;
  el.addEventListener('scroll', e => { if (e.target.id === 'dcl-list') { if (!el._raf) el._raf = requestAnimationFrame(() => { el._raf = 0; renderList(); }); } }, true);
  el.addEventListener('input', e => {
    if (e.target.id === 'dcl-search') { const v = e.target.value; clearTimeout(searchT); searchT = setTimeout(() => { search = v; const b = el.querySelector('#dcl-list'); if (b) b.scrollTop = 0; renderList(); readTagsSoon(); }, 60); }
  });
  el.addEventListener('change', async e => {
    if (e.target.id === 'dcl-mix-name') { const m = mixOf(openMix); if (m) await saveMix(renameMixtape(m, e.target.value)); }
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'dcl-mix-name') { e.target.blur(); }
    if (e.key === 'Enter' && e.target.closest('[data-dcl-row]') === null && e.target.id === 'dcl-list') { const r = shown[0]; if (r) openFromList(r); }
  });
  el.addEventListener('click', async e => {
    // a click on a row's checkbox counts for its row (the box alone would tick without selecting)
    const b = e.target.closest('button, [data-dcl-row]');
    if (!b) return;
    if (b.id === 'dcl-close') { close(); return; }
    if (b.id === 'dcl-choose') { hooks.pick(); return; }
    if (b.id === 'dcl-add') { addFolder(); return; }
    if (b.id === 'dcl-autoplay') { autoplay = !autoplay; ls.set(AUTOPLAY_KEY, autoplay); b.setAttribute('aria-pressed', autoplay); hooks.changed(); return; }
    if (b.dataset.dclView) { view = b.dataset.dclView; selecting = false; menuOpen = false; render(); return; }
    if (b.dataset.dclMedia) { setPrefs({ media: b.dataset.dclMedia }); const bx = el.querySelector('#dcl-list'); if (bx) bx.scrollTop = 0; render(); hooks.changed('list'); readTagsSoon(); return; }
    if (b.dataset.dclOrder) { setPrefs({ order: b.dataset.dclOrder }); render(); hooks.changed('list'); readTagsSoon(); return; }
    if (b.dataset.dclChip) { setPrefs({ chip: b.dataset.dclChip }); const bx = el.querySelector('#dcl-list'); if (bx) bx.scrollTop = 0; render(); hooks.changed('list'); readTagsSoon(); return; }
    if (b.dataset.dclAllow) { const f = folderOf(b.dataset.dclAllow); if (f) allow(f); return; }
    if (b.dataset.dclRmf) {
      const f = folderOf(b.dataset.dclRmf); if (!f) return;
      app.confirmInline({ anchor: el.querySelector('#dcl-chips'), trigger: b, key: `rmf-${f.id}`, msg: t('dclRemoveFolderAsk', { name: f.name }), ok: t('dclRemoveFolderOk'), t, esc, onConfirm: () => removeFolder(f.id) });
      return;
    }
    if (b.dataset.dclRemove) { e.stopPropagation(); hooks.removeRecent(b.dataset.dclRemove); return; }
    if (b.id === 'dcl-select') { selecting = !selecting; selected.clear(); menuOpen = false; render(); return; }
    if (b.id === 'dcl-selcancel') { selecting = false; selected.clear(); menuOpen = false; render(); return; }
    if (b.id === 'dcl-addto') { menuOpen = !menuOpen; render(); return; }
    if (b.dataset.dclAddto !== undefined) { addSelected(b.dataset.dclAddto || null); return; }
    if (b.dataset.dclRow !== undefined) {
      const r = shown.find(x => x.key === b.dataset.dclRow);
      if (!r) return;
      if (selecting) { if (selected.has(r.key)) selected.delete(r.key); else selected.add(r.key); renderList(true); const ab = el.querySelector('#dcl-addto'); if (ab) ab.disabled = !selected.size; return; }
      openFromList(r);
      return;
    }
    // mixtapes
    if (b.id === 'dcl-newmix') { const m = createMixtape(t('dclNewMixName', { n: mixtapes.length + 1 })); await saveMix(m); openMix = m.id; render(); const inp = el.querySelector('#dcl-mix-name'); if (inp) { inp.focus(); inp.select(); } return; }
    if (b.dataset.dclOpen) { openMix = b.dataset.dclOpen; render(); return; }
    if (b.id === 'dcl-back') { openMix = null; render(); return; }
    if (b.dataset.dclPlay) { hooks.playMix(b.dataset.dclPlay); return; }
    const m = mixOf(openMix);
    if (!m) return;
    if (b.id === 'dcl-repeat') { await saveMix(setRepeat(m, !m.repeat)); render(); return; }
    if (b.id === 'dcl-files') { pickSingles(); return; }
    if (b.dataset.dclRepick) { pickSingles(b.dataset.dclRepick); return; }
    if (b.id === 'dcl-delmix') { app.confirmInline({ anchor: el.querySelector('.dcl-mixhead'), trigger: b, key: 'delmix', msg: t('dclDeleteMixAsk', { name: m.name }), ok: t('dclDeleteMix'), t, esc, onConfirm: async () => { mixtapes = mixtapes.filter(x => x.id !== m.id); await lstore.removeMixtape(m.id); openMix = null; render(); hooks.changed(); } }); return; }
    if (b.dataset.dclUp !== undefined) { const i = +b.dataset.dclUp; await saveMix(moveRow(m, i, i - 1)); render(); return; }
    if (b.dataset.dclDown !== undefined) { const i = +b.dataset.dclDown; await saveMix(moveRow(m, i, i + 1)); render(); return; }
    if (b.dataset.dclRmrow) { await saveMix(removeRow(m, b.dataset.dclRmrow)); render(); return; }
  });
  // a click on a mixtape row opens it and continues from it
  el.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    const li = e.target.closest('[data-dcl-mrow]');
    if (!li || !openMix) return;
    const src = mixRows(openMix), i = +li.dataset.i, r = src.rows[i];
    if (r) hooks.openRow(r, { kind: 'mixtape', id: openMix, rowId: r.id, pos: i }, true);
  });
  el.addEventListener('dragstart', e => { const li = e.target.closest('.dcl-mrow'); if (!li) return; drag = +li.dataset.i; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(drag)); } catch (err) {} });
  el.addEventListener('dragover', e => { const li = e.target.closest('.dcl-mrow'); if (li && drag !== null) { e.preventDefault(); e.stopPropagation(); el.querySelectorAll('.dcl-mrow.over').forEach(x => x.classList.remove('over')); li.classList.add('over'); } });
  el.addEventListener('drop', async e => { const li = e.target.closest('.dcl-mrow'); if (!li || drag === null) return; e.preventDefault(); e.stopPropagation(); const m = mixOf(openMix), from = drag; drag = null; if (m) { await saveMix(moveRow(m, from, +li.dataset.i)); render(); } });
  el.addEventListener('dragend', () => { drag = null; el.querySelectorAll('.dcl-mrow').forEach(x => x.classList.remove('dragging', 'over')); });

  // a row of the list: the context is the list as it is now (D8)
  function openFromList(r) {
    const ctx = { kind: 'list', chip: prefs.chip, media: prefs.media, search, order: prefs.order, key: r.key, pos: Math.max(0, shown.findIndex(x => x.key === r.key)), ...(prefs.order === 'recent' ? { used: usedSnapshot(getRows()) } : {}) };
    if (r.kind === 'recent') { hooks.openRecent(r.fp, ctx); return; }
    hooks.openRow(r, ctx, true);
  }
  function open() {
    overlay = true; isOpen = true; note = null;
    render();
    // the user looks at the list again: a context with the order by recent takes it as it is now
    if (hooks.opened) hooks.opened();
    // the list refreshes when the panel opens: folders allowed this session are read again (at most every 30 s)
    for (const f of folders) if (f.granted && !scanning.has(f.id) && Date.now() - (f.scanned || 0) > 30000) scan(f);
    readTagsSoon();
    const s = el.querySelector('#dcl-search'); if (s) s.focus();
  }
  function close() { overlay = true; isOpen = false; el.remove(); hooks.closed && hooks.closed(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen && overlay && el.isConnected && !e.defaultPrevented) { if (menuOpen) { menuOpen = false; render(); return; } close(); } });

  return {
    el, loaded, render, renderList, open, close, fileOf, mixRows,
    // a folder read again by its id (the checks; the panel does it when it opens)
    rescan: id => { const f = folderOf(id); return f && f.granted ? scan(f) : null; },
    get isOpen() { return isOpen; },
    get supported() { return supported; },
    get autoplay() { return supported && autoplay; },
    set autoplay(v) { autoplay = !!v; ls.set(AUTOPLAY_KEY, autoplay); },
    // inline under the empty tab's drop area, or over the tab's panel
    mount(slot, asOverlay) { overlay = !!asOverlay; if (!asOverlay) isOpen = false; if (el.parentNode !== slot) slot.appendChild(el); render(); },
    rows: getRows,
    markSilent,
    usedSnapshot: () => usedSnapshot(getRows()),
    // the list of a context (chip, search, order), sorted and filtered once (Autoplay, Previous and Next)
    listFor,
    prefs: () => ({ ...prefs, search }),
    markGone(key) { gone.add(key); rowsDirty = true; render(); },
    note(n) { note = n; render(); },
    entriesChanged: async () => { entries = await store.entries(); rowsDirty = true; render(); },
    // the backup (D11): mixtapes and folder names out, a merge in
    exportMixtapes: async () => { await loaded; return exportMixtapes(folders, mixtapes); },
    importMixtapes: async v => {
      await loaded;
      const merged = mergeMixtapes(exportMixtapes(folders, mixtapes), v);
      const changed = merged.mixtapes.filter(m => { const o = mixOf(m.id); return !o || (m.updated || 0) > (o.updated || 0); });
      if (changed.length) await lstore.putMixtapes(changed);
      mixtapes = [...mixtapes.filter(m => !changed.some(c => c.id === m.id)), ...changed];
      return changed.length;
    },
    // for the checks
    state: () => ({ folders: folders.map(f => ({ id: f.id, name: f.name, granted: f.granted, count: f.count, capped: f.capped })), files: files.length, rows: getRows().length, shown: shown.length, prefs, search, view, openMix, mixtapes: mixtapes.map(m => ({ id: m.id, name: m.name, repeat: m.repeat, rows: m.rows.map(r => r.name) })), autoplay, storage, supported, tags: { files: tagStats.files, median: tagStats.times.length ? tagStats.times.slice().sort((a, b) => a - b)[Math.floor(tagStats.times.length / 2)] : 0, longest: tagStats.longest }, scanning: scanning.size, gone: [...gone] }),
  };
}
