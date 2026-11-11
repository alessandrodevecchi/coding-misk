// The "Stage videos" folders (stage-video D10, spec stage/video-folders): the user's folders of videos for the Video
// look, with the same picker, permission and scan as the Decode folders (src/decode/folders.js), kept in their own store
// (stage-video-store.js). A folder is scanned when it is added, when the settings card opens and once per session when
// the Video look first needs it; the scan reads names, sizes and dates, never a video's bytes, and runs in idle time.
// The permission is asked only inside a click (a folder's "Allow access", or the stage's "Allow stage videos" chip).
import { pickFolder, permission, scanFolder, fileAt, foldersSupported, isVideo } from '../decode/folders.js';
import { createStageVideoStore } from './stage-video-store.js';
import { sortedFiles } from './stage-video-rules.js';

export const STAGE_PICKER_ID = 'coding-misk-stage-videos';
const idle = f => new Promise(r => { const go = () => Promise.resolve().then(f).then(r, () => r(null)); if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 2000 }); else setTimeout(go, 0); });

// onChange(): the list or a folder's state changed (the card redraws, the layer takes the new files)
export function createStageFolders({ store = createStageVideoStore(), onChange = () => {} } = {}) {
  let folders = [];           // { id, name, handle, added, count, capped, scanned, state: 'granted' | 'prompt' | 'denied', note, scanning }
  let files = [];             // { folderId, path, name, size, modified }
  const scannedNow = new Set(); // folders scanned in this session
  let loaded = null;
  let memo = null;
  const changed = () => { memo = null; try { onChange(); } catch (e) { /* the card may be gone */ } };

  function load() {
    if (loaded) return loaded;
    loaded = (async () => {
      const [fs, xs] = await Promise.all([store.folders(), store.files()]);
      folders = fs.sort((a, b) => (a.added || 0) - (b.added || 0)).map(f => ({ ...f, state: 'prompt', note: null, scanning: false }));
      files = xs;
      // the permission as the browser keeps it, never asked here (no click)
      for (const f of folders) f.state = f.handle ? await permission(f.handle, false) : 'denied';
      changed();
    })().catch(() => {});
    return loaded;
  }

  async function scan(f) {
    if (!f || f.scanning || f.state !== 'granted') return;
    f.scanning = true; changed();
    try {
      const r = await scanFolder(f.handle, { accept: isVideo, stop: () => !folders.includes(f) });
      if (!folders.includes(f)) return;
      const list = r.files.map(x => ({ folderId: f.id, path: x.path, name: x.name, size: x.size, modified: x.modified }));
      files = files.filter(x => x.folderId !== f.id).concat(list);
      Object.assign(f, { count: list.length, capped: r.capped, scanned: r.scanned });
      scannedNow.add(f.id);
      await store.setFiles(f.id, list);
      await store.putFolder(f);
    } catch (e) { f.state = 'prompt'; f.note = 'lost'; }
    finally { f.scanning = false; changed(); }
  }
  const scanIdle = f => idle(() => scan(f));

  return {
    load,
    get supported() { return foldersSupported(); },
    // the card's rows
    list: () => folders.map(f => ({ id: f.id, name: f.name, count: f.count || 0, capped: !!f.capped, state: f.state, note: f.note, scanning: f.scanning })),
    // the playable stage videos: the files of the folders with access, in a stable order (exports pick from it)
    playable() {
      if (memo) return memo;
      const ok = new Map(folders.filter(f => f.state === 'granted').map(f => [f.id, f]));
      return (memo = sortedFiles(files.filter(x => ok.has(x.folderId)), folders.map(f => f.id)).map(x => ({
        key: `${x.folderId}/${x.path}`, name: x.name, folderId: x.folderId, path: x.path,
        open: async () => (await fileAt(ok.get(x.folderId).handle, x.path)).getFile(),
      })));
    },
    // folders wait for access and none gives a video yet: the stage's chip shows
    waiting: () => folders.some(f => f.state !== 'granted') && !folders.some(f => f.state === 'granted' && (f.count || 0) > 0),
    any: () => folders.length > 0,
    // a new folder from the picker (inside a click). → 'added' | 'dup' | 'cancelled' | 'error'
    async add() {
      await load();
      const r = await pickFolder(folders, { pickerId: STAGE_PICKER_ID });
      if (r.cancelled) return { kind: 'cancelled' };
      if (r.error) return { kind: 'error', error: r.error };
      if (r.dup) return { kind: 'dup', name: r.dup.name };
      const f = { ...r.folder, state: 'granted', note: null, scanning: false };
      folders.push(f);
      await store.putFolder(f);
      changed();
      await scan(f);
      return { kind: 'added', name: f.name, count: f.count };
    },
    // the browser's permission for one folder, or for every waiting one (only inside a click). → granted names
    async allow(id = null) {
      await load();
      const want = folders.filter(f => f.state !== 'granted' && (!id || f.id === id));
      const ok = [];
      for (const f of want) {
        f.state = await permission(f.handle, true);
        f.note = f.state === 'granted' ? null : 'denied';
        if (f.state === 'granted') ok.push(f.name);
      }
      changed();
      for (const f of want) if (f.state === 'granted' && !scannedNow.has(f.id)) scanIdle(f);
      return ok;
    },
    async remove(id) {
      await load();
      const f = folders.find(x => x.id === id);
      if (!f) return false;
      folders = folders.filter(x => x !== f);
      files = files.filter(x => x.folderId !== id);
      await store.removeFolder(id);
      changed();
      return true;
    },
    // the card opened: every folder with access scanned again, in idle time
    rescan() { load().then(() => { for (const f of folders) if (f.state === 'granted') scanIdle(f); }); },
    // the Video look needs the folders: loaded, and those with access scanned once per session
    need() { load().then(() => { for (const f of folders) if (f.state === 'granted' && !scannedNow.has(f.id)) scanIdle(f); }); },
    // a reset: every folder and file gone
    async clear() { folders = []; files = []; scannedNow.clear(); await store.clear(); changed(); },
  };
}
