// The similarity check (decode-refine D1, task 6.3): each file of the bench is decoded in level B in Node (as Open in
// Compose writes it), the song is fast-exported by the app (Compose, Classic, WAV) and its sound compared with the
// original (tools/decode-similarity.mjs: rhythm per band, chroma and bass chroma, brightness ratio, band shares, arc),
// plus two floor pairs (an original against an unrelated file's code: what "no similarity" scores).
// The bench: the Decode test songs (tools/decode-songs.mjs) and the app's songs with their timelines (luci-rosse, the
// frozen radio song), exported first by tools/decode-export.cjs when missing. Scores go to
// tests/snapshots/decode-similarity.json with --write; a run without it fails when a score drops by more than 0.05.
// DECODE_OWNER_DIR=<folder>: also every audio file in it, printed only (no snapshot, no file outside the git-ignored
// .cache/decode/sim/).
// --no-essentia: level B with misk-analyzer alone (printed only).
// --ab <dir> (decode-refine 6.4, the owner's listening round): each file decoded with and without Essentia.js, both
// songs exported and written to <dir> as MP3 named A and B in random order, the key (which is which) and the two
// analyses side by side in <dir>/key.md; meant for a git-ignored folder under notes/. Also prints Essentia.js's
// download size. Compares nothing.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/decode-similarity.cjs [--write] [--only id,id] [--no-essentia]
//          [--ab <dir>]   (dev server on PORT; needs ffmpeg)
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const { exportTestSongs, exportSong, DIR: WAV } = require('./decode-export.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const AUDIO = /\.(wav|mp3|m4a|aac|flac|ogg|opus|webm|mp4|mov)$/i;
// the floor pairs: [original, code of another file]
const FLOOR = [['luci-rosse', 'radio-bench-c'], ['decode-test-acid', 'decode-test-arp']];

const slug = s => s.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'file';

(async () => {
  const S = await import('./decode-similarity.mjs');
  const { TEST_SONGS } = await import('./decode-songs.mjs');
  const { APP_SONGS } = require('./decode-export.cjs');
  const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true })).newPage();
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  fs.mkdirSync(S.SIM_DIR, { recursive: true });

  // the files: the bench (exported when missing), then the owner's
  await exportTestSongs(page, { log: console.log });
  const only = opt('--only') ? opt('--only').split(',') : null;
  const bench = [...TEST_SONGS.map(s => s.id), ...APP_SONGS.map(x => x.id)].filter(id => !only || only.includes(id)).map(id => ({ id, file: path.join(WAV, `${id}.wav`), owner: false }));
  const ownerDir = process.env.DECODE_OWNER_DIR;
  const owner = ownerDir ? fs.readdirSync(ownerDir).filter(f => AUDIO.test(f) && !f.startsWith('.')).sort().map(f => ({ id: `owner-${slug(f.replace(AUDIO, ''))}`, title: f.replace(AUDIO, ''), file: path.join(ownerDir, f), owner: true })) : [];
  const files = [...bench, ...owner];

  // level B of a file and its export, kept in .cache/decode/sim/ while the song does not change
  const pcmOf = new Map(), pcm = f => { if (!pcmOf.has(f)) pcmOf.set(f, S.readAudio(f)); return pcmOf.get(f); };
  async function decoded(x, essentia) {
    const dir = path.join(S.SIM_DIR, x.owner ? 'owner' : 'bench'), tag = `${x.id}.${essentia ? 'ess' : 'own'}`;
    fs.mkdirSync(dir, { recursive: true });
    const B = await S.levelB(pcm(x.file), { id: x.id, title: x.title || x.id, essentia }), wav = path.join(dir, `${tag}.wav`), js = path.join(dir, `${tag}.song.json`);
    const same = fs.existsSync(js) && fs.existsSync(wav) && fs.readFileSync(js, 'utf8') === JSON.stringify(B.song);
    if (!same) { const s = await exportSong(page, B.song, wav); fs.writeFileSync(js, JSON.stringify(B.song)); console.log(`exported the level B song of ${x.id} (${essentia ? 'with' : 'without'} Essentia.js, ${s} s)`); }
    return { ...B, wav };
  }

  if (args.includes('--ab')) {
    const out = path.resolve(opt('--ab') || 'notes/decode-ab');
    fs.mkdirSync(out, { recursive: true });
    const key = ['# Essentia.js A/B listening round (decode-refine 6.4)', '', `Made ${new Date().toISOString().slice(0, 16).replace('T', ' ')}. Each file decoded in level B with and without Essentia.js; both songs fast-exported by the app (code only, no original). Listen to A and B before reading the table.`, '', '| File | A | B | Same song | Tempo with / without | Key with / without | Chords equal | Tempo by | Essentia.js tempo (confidence) | Time with / without |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
    for (const x of files) {
      const ess = await decoded(x, true), own = await decoded(x, false), same = JSON.stringify({ ...ess.song, id: 0 }) === JSON.stringify({ ...own.song, id: 0 });
      const first = crypto.randomInt(2) === 0 ? 'ess' : 'own', name = slug(x.title || x.id);
      for (const [label, v] of [['A', first === 'ess' ? ess : own], ['B', first === 'ess' ? own : ess]]) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', v.wav, '-codec:a', 'libmp3lame', '-b:a', '256k', path.join(out, `${name}-${label}.mp3`)]);
      const n = Math.min(ess.info.chords.length, own.info.chords.length), eq = n ? ess.info.chords.slice(0, n).filter((c, i) => c === own.info.chords[i]).length / n : 1;
      const et = ess.info.essentiaTempo;
      key.push(`| ${x.title || x.id} | ${first === 'ess' ? 'with' : 'without'} | ${first === 'ess' ? 'without' : 'with'} | ${same ? 'yes' : 'no'} | ${ess.info.bpm} / ${own.info.bpm} | ${ess.info.key} / ${own.info.key} | ${Math.round(eq * 100)} % | ${ess.info.engines.tempo} | ${et ? `${et.bpm} (${et.confidence})` : '-'} | ${(ess.info.ms / 1000).toFixed(1)} s / ${(own.info.ms / 1000).toFixed(1)} s |`);
      console.log(`${x.id}: A/B written (${same ? 'the two songs are the same' : 'the songs differ'})`);
    }
    fs.writeFileSync(path.join(out, 'key.md'), key.join('\n') + '\n');
    console.log(`\nA/B files and key.md in ${out}`);
    // Essentia.js's download in the browser: the two chunks the level B worker imports (the build's, else the package's)
    const dist = path.join(__dirname, '..', 'dist', 'assets'), pkg = path.join(require.resolve('essentia.js/package.json'), '..', 'dist');
    const chunks = fs.existsSync(dist) ? fs.readdirSync(dist).filter(f => /^essentia/.test(f) && f.endsWith('.js')).map(f => path.join(dist, f)) : ['essentia-wasm.es.js', 'essentia.js-core.es.js'].map(f => path.join(pkg, f));
    let raw = 0, gz = 0; for (const f of chunks) { const b = fs.readFileSync(f); raw += b.length; gz += zlib.gzipSync(b, { level: 9 }).length; }
    console.log(`Essentia.js download: ${(raw / 1048576).toFixed(2)} MB, ${(gz / 1048576).toFixed(2)} MB gzipped (${chunks.map(f => path.basename(f)).join(', ')})`);
    await browser.close();
    return;
  }

  // the similarity
  const essentia = !args.includes('--no-essentia'), res = {}, feats = new Map(), lines = [];
  const featOf = f => { if (!feats.has(f)) feats.set(f, S.features(pcm(f))); return feats.get(f); };
  const codes = {};
  for (const x of files) {
    const B = await decoded(x, essentia);
    codes[x.id] = { B, code: S.readAudio(B.wav) };
    const c = S.compare(featOf(x.file), S.features(codes[x.id].code), B.grid);
    lines.push(`${x.owner ? 'owner ' : 'bench '}${S.line(x.id, c)}`);
    if (!x.owner) res[x.id] = S.score(c);
  }
  const floor = {};
  for (const [a, b] of FLOOR) {
    const xa = files.find(x => x.id === a);
    if (!xa || !codes[b]) continue;
    const c = S.compare(featOf(xa.file), S.features(codes[b].code), codes[a].B.grid);
    lines.push(`floor ${S.line(`${a} × ${b}`, c)}`);
    floor[`${a} × ${b}`] = S.score(c);
  }
  console.log(lines.join('\n'));
  await browser.close();
  if (!essentia) { console.log('\n(level B without Essentia.js: printed only)'); return; }
  const snap = S.readSnapshot();
  if (args.includes('--write')) {
    S.writeSnapshot({ format: 1, margin: S.MARGIN, files: { ...(only && snap ? snap.files : {}), ...res }, floor: { ...(only && snap ? snap.floor : {}), ...floor } });
    console.log(`\nwrote ${path.relative(process.cwd(), S.SNAPSHOT)}`);
    return;
  }
  if (!snap) { console.log('\nno snapshot yet: run with --write'); return; }
  const bad = S.drops(snap.files, res, snap.margin ?? S.MARGIN);
  const missing = Object.keys(snap.files).filter(id => !res[id] && (!only || only.includes(id)));
  for (const d of bad) console.log(`FAIL ${d.id}: ${d.key} ${d.was} → ${d.now}`);
  for (const id of missing) console.log(`FAIL ${id}: not measured`);
  console.log(bad.length || missing.length ? `\n${bad.length + missing.length} failed` : `\nall scores within ${snap.margin ?? S.MARGIN} of the snapshot`);
  if (bad.length || missing.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
