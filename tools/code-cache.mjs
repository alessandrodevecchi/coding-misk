// Shared cache of generated code for the slow checks (faster-checks). No browser.
// An item (a song's code and live builds, a radio session, a check's work on one song) is stored under a key: a hash
// of its inputs (the song file or recipes, the profile and options) and of the app code that writes it. The app code
// is the tool file that asks, followed through its relative imports (tools/ and src/), as docs/strudel/inputs.json
// does, plus the versions of the installed Strudel packages. Any change to one of those files gives every item of that
// tool a new key, so a stale item is never read. Files are hashed as they are, comments included: a comment edit only
// costs a rebuild.
// The cache lives in .cache/checks/ (git-ignored), one gzip JSON file per item. Entries unused for 14 days are deleted
// at the end of a run. --no-cache (or CHECK_CACHE=off) neither reads nor writes it: the result must be the same.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CACHE_DIR = process.env.CHECK_CACHE_DIR || path.join(ROOT, '.cache', 'checks');
// raise when the stored format changes
const FORMAT = 1;
const KEEP_DAYS = 14;
export const cacheOff = () => process.argv.includes('--no-cache') || process.env.CHECK_CACHE === 'off';

const IMPORT_RE = /(?:^|[\s;])(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"]/gm;
// the JavaScript a tool runs: the file and its relative imports, followed (paths from the repository root, sorted)
export function codeFiles(entry) {
  const seen = new Set(), todo = [path.resolve(ROOT, entry)];
  while (todo.length) {
    const f = todo.pop();
    if (seen.has(f) || !fs.existsSync(f)) continue;
    seen.add(f);
    for (const m of fs.readFileSync(f, 'utf8').matchAll(IMPORT_RE)) {
      const spec = m[1] || m[2] || m[3];
      if (spec && spec.startsWith('.') && !spec.includes('node_modules')) todo.push(path.resolve(path.dirname(f), spec));
    }
  }
  return [...seen].map(f => path.relative(ROOT, f)).sort();
}
// the installed packages a tool can reach by name: @strudel/* and superdough, name and version
function packageVersions() {
  const dir = path.join(ROOT, 'node_modules', '@strudel');
  const files = (fs.existsSync(dir) ? fs.readdirSync(dir).sort().map(p => path.join(dir, p, 'package.json')) : []).concat(path.join(ROOT, 'node_modules', 'superdough', 'package.json'));
  return files.filter(f => fs.existsSync(f)).map(f => { const p = JSON.parse(fs.readFileSync(f, 'utf8')); return `${p.name}@${p.version}`; });
}
const appHashes = new Map();
// a hash of the app code a tool runs (see codeFiles) and of the package versions
export function appHash(entry) {
  if (!appHashes.has(entry)) {
    const h = createHash('sha256');
    for (const f of codeFiles(entry)) h.update(`${f}\0${fs.readFileSync(path.join(ROOT, f), 'utf8')}\0`);
    h.update(packageVersions().join('\n'));
    appHashes.set(entry, h.digest('hex'));
  }
  return appHashes.get(entry);
}
// the key of an item: the tool's app hash and every input of the item (strings or JSON values)
export function cacheKey(entry, ...parts) {
  const h = createHash('sha256').update(`${FORMAT}\0${appHash(entry)}\0`);
  for (const p of parts) h.update(`${typeof p === 'string' ? p : JSON.stringify(p)}\0`);
  return h.digest('hex');
}
export const fileText = f => fs.readFileSync(path.resolve(ROOT, f), 'utf8');

const stats = { hits: 0, misses: 0 };
const file = (ns, key) => path.join(CACHE_DIR, ns, `${key.slice(0, 2)}`, `${key}.json.gz`);
// the stored value, or undefined
export function cacheGet(ns, key) {
  if (cacheOff()) return undefined;
  const f = file(ns, key);
  try {
    const v = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));
    const now = new Date();
    try { fs.utimesSync(f, now, now); } catch (e) { /* read-only is fine */ }
    stats.hits++;
    return v;
  } catch (e) { return undefined; }
}
export function cachePut(ns, key, value) {
  stats.misses++;
  if (cacheOff()) return;
  const f = file(ns, key), tmp = `${f}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(tmp, zlib.gzipSync(JSON.stringify(value), { level: 6 }));
  fs.renameSync(tmp, f);
}
// the stored value, or compute(), stored
export function cached(ns, key, compute) {
  const v = cacheGet(ns, key);
  if (v !== undefined) return v;
  const out = compute();
  cachePut(ns, key, out);
  return out;
}
export const cacheStats = () => ({ ...stats });
// hits and misses counted in worker processes
export function addStats(s) { if (s) { stats.hits += s.hits || 0; stats.misses += s.misses || 0; } }
export const cacheLine = () => (cacheOff() ? 'cache off (--no-cache)' : `cache: ${stats.hits} items read, ${stats.misses} generated`);
// deletes entries not read or written for KEEP_DAYS days
export function cachePrune() {
  if (cacheOff() || !fs.existsSync(CACHE_DIR)) return;
  const old = Date.now() - KEEP_DAYS * 86400e3;
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (fs.statSync(p).mtimeMs < old) fs.rmSync(p, { force: true }); } };
  try { walk(CACHE_DIR); } catch (e) { /* another run pruning at the same time */ }
}
