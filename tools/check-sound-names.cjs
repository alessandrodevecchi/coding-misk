// Checks every sound the app's songs can call by name (#54): the built-in songs, and songs generated for every style
// recipe and every artist, are compiled to Strudel code; every sound, drum machine hit (bank + hit) and synth named in
// that code must exist in the app's loaded sound map. Reports each missing name with where it comes from.
// Usage: PLAYWRIGHT_CORE=... node --no-warnings tools/check-sound-names.cjs [--songs N] [--list]   (dev server on :5173); exit 1 when a name is missing
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const N = Number((process.argv.slice(2).join(' ').match(/--songs (\d+)/) || [])[1]) || 3;

// the sound names a piece of compiled code plays: per pattern ($: block), the words of s("…") / .s("…") / sound("…"),
// each prefixed by the block's bank when it has one (Strudel plays bank_sound)
function namesIn(code) {
  const out = new Set();
  for (const block of code.split(/\n(?=\s*_?\$:)/)) {
    const bank = (block.match(/\.bank\("([^"]+)"\)/) || [])[1];
    for (const m of block.matchAll(/(?:\bs|\bsound)\("([^"]*)"\)/g)) {
      for (const w of m[1].match(/[A-Za-z][A-Za-z0-9_]*/g) || []) out.add((bank ? `${bank}_${w}` : w).toLowerCase());
    }
  }
  return out;
}

(async () => {
  const { compileSong } = await import('../src/song/compile.js');
  const { createSession } = await import('../src/endless/director.js');
  const { loadStyles } = await import('./styles-dir.mjs');
  const { loadArtists } = await import('./artists-dir.mjs');
  const { songFiles } = await import('./songs-dir.mjs');
  const recipes = loadStyles(), artists = loadArtists();
  const where = new Map(); // name → first places it appears
  const add = (code, from) => { for (const n of namesIn(code)) { if (!where.has(n)) where.set(n, []); if (where.get(n).length < 3) where.get(n).push(from); } };
  let songs = 0;
  for (const f of songFiles(path.join(__dirname, '..', 'songs')).filter(f => !f.includes(`${path.sep}endless${path.sep}`))) { const s = JSON.parse(fs.readFileSync(f, 'utf8')); add(compileSong(s), `song ${s.id}`); songs++; }
  const how = { transition: 'artist', harmony: 'artist' };
  for (const r of recipes) for (const chaos of [0.2, 0.9]) { const ses = createSession(recipes, `names-${r.id}-${chaos}`); for (let i = 0; i < N; i++) { const g = ses.next({ styles: [r.id], chaos, energy: 0.7, complexity: 0.7, talk: 0.5, ...how }); add(compileSong(g.song), `style ${r.id}`); songs++; } }
  for (const a of artists) { const ses = createSession(recipes, `names-${a.id}`); for (let i = 0; i < N; i++) { const g = ses.next({ artist: a, ...how }); add(compileSong(g.song), `artist ${a.id}`); songs++; } }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`);
  let keys = [];
  for (let i = 0; i < 40 && keys.length < 1500; i++) { await sleep(1000); keys = await page.evaluate(() => Object.keys((globalThis.soundMap && globalThis.soundMap.get()) || {})); }
  await browser.close();
  const have = new Set(keys.map(k => k.toLowerCase()));
  const missing = [...where.keys()].filter(n => !have.has(n)).sort();
  if (process.argv.includes('--list')) console.log([...where.keys()].sort().join(' '));
  for (const n of missing) console.log(`MISSING ${n}  (${where.get(n).join(', ')})`);
  console.log(`${songs} songs compiled (${recipes.length} styles, ${artists.length} artists); ${where.size} names played, ${keys.length} sounds loaded; ${missing.length} missing`);
  process.exit(missing.length ? 1 : 0);
})();
