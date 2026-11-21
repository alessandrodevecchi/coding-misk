// The learned beat tracker's files in this browser (decode-beat-tracker): an option of Settings, off by default. Turned
// on, its card offers the download; each file is fetched from its pinned URL with the browser's integrity check and its
// SHA-256 checked again here, then kept in the Cache Storage of the app's origin. The level B worker reads them back
// and checks them before each load. Two keys in localStorage: the user's choice (on or off) and a flag that says the
// files are there, so the tab knows without opening the cache. Works in the page and in a worker. Nothing here fetches
// or opens anything until the card or the worker asks.
import { BEAT_THIS_FILES, BEAT_THIS_BYTES } from './beat-this.js';

export const BEAT_THIS_CACHE = 'coding-misk-models-v1';
// the files are downloaded (device state: left out of backups, see settings/backup.js)
export const BEAT_THIS_KEY = 'coding-misk-beat-this';
// the user's choice: 'on' or 'off' (absent: the default below)
export const BEAT_THIS_OPT = 'coding-misk-beat-this-opt';
// the default of the choice: off, unless the build sets VITE_DECODE_BEAT_TRACKER to 'on' (decode round 12: the owner's
// git-excluded vite.local.config.mjs can, with define; the published build never does). In Node there is no
// import.meta.env: off
export const BEAT_THIS_DEFAULT_ON = (() => { try { return import.meta.env.VITE_DECODE_BEAT_TRACKER === 'on'; } catch (e) { return false; } })();
// local only (decode round 14, d12h): the dev server's path to the model files kept once on this machine
// (tools/local-models.mjs, added only by the owner's git-excluded vite.local.config.mjs); '' everywhere else, the
// published build included
export const BEAT_THIS_LOCAL = (() => { try { return import.meta.env.VITE_DECODE_BEAT_LOCAL || ''; } catch (e) { return ''; } })();
const hexToB64 = hex => btoa(String.fromCharCode(...hex.match(/../g).map(h => parseInt(h, 16))));
const sha256 = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
const ls = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };
const read = k => { try { const s = ls(); return s ? JSON.parse(s.getItem(k) || 'null') : null; } catch (e) { return null; } };
const write = (k, v) => { try { const s = ls(); if (!s) return; if (v === null || v === undefined) s.removeItem(k); else s.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage */ } };

// → whether the user has turned the option on (Settings)
export function beatThisChosen() {
  const v = read(BEAT_THIS_OPT);
  return v === 'on' ? true : v === 'off' ? false : BEAT_THIS_DEFAULT_ON;
}
export function setBeatThisChosen(on) { write(BEAT_THIS_OPT, on ? 'on' : 'off'); }
// → whether the files were downloaded (the flag; the worker still checks the files themselves)
export function beatThisInstalled() { const v = read(BEAT_THIS_KEY); return !!(v && v.installed); }
// → whether Full uses the tracker: the option on and the files downloaded
export function beatThisOn() { return beatThisChosen() && beatThisInstalled(); }

// local only: copies the files from the local path into this origin's cache, each checked against its pin, when the
// option is on and a file is missing (once per page; tried again after a failure). → whether the files are there afterwards. Quiet on a failure: the
// card then offers the normal download
let seeding = null;
export function seedBeatThisLocal({ base = BEAT_THIS_LOCAL, fetchFn = globalThis.fetch } = {}) {
  if (!base || !globalThis.caches || !beatThisChosen()) return Promise.resolve(false);
  if (!seeding) seeding = (async () => {
    try {
      const c = await caches.open(BEAT_THIS_CACHE);
      for (const f of Object.values(BEAT_THIS_FILES)) {
        if (await c.match(f.url)) continue;
        const res = await fetchFn(`${base}${f.name}`, { cache: 'no-store' });
        if (!res.ok) return false;
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.length !== f.bytes || (await sha256(bytes)) !== f.sha256) return false;
        await c.put(f.url, new Response(bytes, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(bytes.length), 'x-sha256': f.sha256 } }));
      }
      write(BEAT_THIS_KEY, { installed: true, at: Date.now(), local: true });
      return true;
    } catch (e) { return false; }
  })().then(ok => { if (!ok) seeding = null; return ok; });
  return seeding;
}

// → { installed, bytes, supported } from the cache itself (the Settings card, only while the option is on)
export async function beatThisStatus() {
  if (!globalThis.caches) return { installed: false, bytes: 0, supported: false };
  if (BEAT_THIS_LOCAL) await seedBeatThisLocal();
  try {
    const c = await caches.open(BEAT_THIS_CACHE);
    let bytes = 0, all = true;
    for (const f of Object.values(BEAT_THIS_FILES)) { const r = await c.match(f.url); if (!r) { all = false; continue; } bytes += +(r.headers.get('content-length') || 0); }
    if (!all && beatThisInstalled()) write(BEAT_THIS_KEY, null);
    if (all && !beatThisInstalled()) write(BEAT_THIS_KEY, { installed: true, at: Date.now() });
    return { installed: all, bytes, supported: true };
  } catch (e) { return { installed: false, bytes: 0, supported: false }; }
}

// downloads every file (onProgress(bytes so far, total)); signal: an AbortSignal for Cancel. Throws on a network error, a
// cancel or a file that does not match its pin; nothing is kept then
export async function downloadBeatThis({ onProgress = () => {}, signal = null, fetchFn = globalThis.fetch } = {}) {
  const c = await caches.open(BEAT_THIS_CACHE);
  let done = 0;
  try {
    for (const f of Object.values(BEAT_THIS_FILES)) {
      const res = await fetchFn(f.url, { signal, mode: 'cors', credentials: 'omit', cache: 'no-store', integrity: `sha256-${hexToB64(f.sha256)}` });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${f.name}`);
      const reader = res.body.getReader(), parts = [];
      let got = 0;
      for (;;) { const { done: end, value } = await reader.read(); if (end) break; parts.push(value); got += value.length; onProgress(done + got, BEAT_THIS_BYTES); }
      const bytes = new Uint8Array(got); let at = 0; for (const p of parts) { bytes.set(p, at); at += p.length; }
      if (got !== f.bytes || (await sha256(bytes)) !== f.sha256) throw new Error(`${f.name} does not match its pin`);
      await c.put(f.url, new Response(bytes, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(got), 'x-sha256': f.sha256 } }));
      done += got;
    }
    write(BEAT_THIS_KEY, { installed: true, at: Date.now() });
  } catch (e) { await removeBeatThis(); throw e; }
}

export async function removeBeatThis() {
  write(BEAT_THIS_KEY, null);
  try { if (globalThis.caches) await caches.delete(BEAT_THIS_CACHE); } catch (e) { /* nothing stored */ }
}

// → { mel, model } as bytes, each checked against its pin (the level B worker, before each load). Throws when a file is
// missing or changed
export async function loadBeatThis() {
  const c = await caches.open(BEAT_THIS_CACHE), out = {};
  for (const [k, f] of Object.entries(BEAT_THIS_FILES)) {
    const r = await c.match(f.url);
    if (!r) throw new Error(`${f.name} is not downloaded`);
    const bytes = new Uint8Array(await r.arrayBuffer());
    if ((await sha256(bytes)) !== f.sha256) throw new Error(`${f.name} does not match its pin`);
    out[k] = bytes;
  }
  return out;
}
