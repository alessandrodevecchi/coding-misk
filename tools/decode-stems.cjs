// Stems in the Decode bench (decode round 8, step 1; bench only, nothing in src/ changes). Three steps, each cached:
//   --parts     each bench song's tracks exported alone by the app's fast export (the track's `solo`), the per-part
//               truth, into .cache/decode/parts/<song id>/<track id>.flac (dev server on PORT; ffmpeg)
//   --separate  each bench file (and with --set owner the files of DECODE_OWNER_DIR) split into drums, bass, other and
//               vocals by a source separation model (MIT code, its weights' licence unclear: bench use on this machine
//               only, never shipped), into .cache/decode/stems/<file hash>/, with the time each file took
//   --score     the stems against the parts: SDR, the share of each true part in each stem per band (leakage), drum
//               onset F1 per band, bass pitch agreement and coverage (tools/decode-stems.py); --json writes the rows
// The separation runs in a Python 3.12 venv made with uv under .cache/decode/stems-venv (git-ignored):
//   uv venv --python 3.12 .cache/decode/stems-venv && VIRTUAL_ENV=.cache/decode/stems-venv uv pip install \
//     torch==2.5.1 torchaudio==2.5.1 demucs soundfile librosa
// --engine mlx: the same model's port to Apple Silicon (MIT, converted weights; bench only), in a venv under
// .cache/decode/mlx-venv (uv venv --python 3.12, then the port's package installed from its source repository; its
// command line mlx-demucs in the venv's bin), its stems in .cache/decode/stems-mlx/: about a tenth
// of the track's length against 0.3 of it on the CPU, the same quality on average (per song up to about 5 dB of SDR apart); the
// default stays the reference build
// Owner files: ids are anonymous (owner-1…, in file name order); their stems stay in the git-ignored cache; write --json
// under the git-ignored notes/.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/decode-stems.cjs [--parts] [--separate] [--score]
//          [--set bench|owner] [--only id,id] [--engine torch|mlx] [--json out.jsonl]
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');
const { exportSong, DIR: WAV, HOLDOUT_DIR, SET_DIRS } = require('./decode-export.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const ROOT = path.join(__dirname, '..'), CACHE = path.join(ROOT, '.cache', 'decode');
const ENGINE = opt('--engine') || 'torch', MLX = path.join(CACHE, 'mlx-venv', 'bin', 'mlx-demucs');
const PARTS = path.join(CACHE, 'parts'), STEMS = path.join(CACHE, ENGINE === 'mlx' ? 'stems-mlx' : 'stems'), PY = path.join(CACHE, 'stems-venv', 'bin', 'python');
const AUDIO = /\.(wav|mp3|m4a|aac|flac|ogg|opus|webm|mp4|mov)$/i;
// a file's stems are kept by the hash of its first and last MB and its size (a whole-file hash of long videos is slow)
const hashOf = f => { const fd = fs.openSync(f, 'r'), n = fs.fstatSync(fd).size, b = Buffer.alloc(Math.min(n, 1 << 20)), h = crypto.createHash('sha1');
  fs.readSync(fd, b, 0, b.length, 0); h.update(b); fs.readSync(fd, b, 0, b.length, Math.max(0, n - b.length)); h.update(b); h.update(String(n)); fs.closeSync(fd); return h.digest('hex').slice(0, 16); };

(async () => {
  const songs = await import('./decode-songs.mjs');
  const only = opt('--only') ? opt('--only').split(',') : null, set = opt('--set') || 'bench';
  let files;
  if (set === 'owner') {
    const dir = process.env.DECODE_OWNER_DIR;
    if (!dir) throw new Error('--set owner needs DECODE_OWNER_DIR');
    files = fs.readdirSync(dir).filter(f => AUDIO.test(f) && !f.startsWith('.')).sort().map((f, i) => ({ id: `owner-${i + 1}`, file: path.join(dir, f), song: null }));
  } else {
    files = [...songs.TEST_SONGS.map(s => [s, WAV]), ...songs.HOLDOUT_SONGS.map(s => [s, HOLDOUT_DIR]), ...songs.GENRE_SONGS.map(s => [s, SET_DIRS.genre]), ...songs.FRESH_SONGS.map(s => [s, SET_DIRS.fresh])]
      .map(([s, d]) => ({ id: s.id, file: path.join(d, `${s.id}.wav`), song: s }));
  }
  files = files.filter(x => (!only || only.includes(x.id)) && fs.existsSync(x.file));

  // 1. the parts: each track alone, through the app
  if (args.includes('--parts')) {
    const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
    const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true })).newPage();
    page.on('pageerror', e => console.error('pageerror', e.message));
    await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
    for (const x of files.filter(x => x.song)) for (const t of x.song.tracks) {
      const out = path.join(PARTS, x.id, `${t.id}.flac`);
      if (fs.existsSync(out)) continue;
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const song = { ...x.song, id: `${x.song.id}-part-${t.id}`, tracks: x.song.tracks.map(u => ({ ...u, solo: u.id === t.id ? true : undefined })) };
      const wav = out.replace(/\.flac$/, '.wav'), s = await exportSong(page, song, wav);
      execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'flac', out]); fs.unlinkSync(wav);
      console.log(`part ${x.id}/${t.id} (${s} s)`);
    }
    await browser.close();
  }

  // 2. the stems
  if (args.includes('--separate')) {
    if (!fs.existsSync(PY)) throw new Error(`no venv at ${PY} (see the header)`);
    if (ENGINE === 'mlx' && !fs.existsSync(MLX)) throw new Error(`no MLX port at ${MLX} (see the header)`);
    for (const x of files) {
      const dir = path.join(STEMS, hashOf(x.file));
      if (fs.existsSync(path.join(dir, 'time.json'))) continue;
      const r = JSON.parse(execFileSync(PY, [path.join(__dirname, 'decode-stems.py'), 'separate', x.file, dir, ...(ENGINE === 'mlx' ? ['mlx', MLX] : [])], { encoding: 'utf8', maxBuffer: 1 << 26 }).trim().split('\n').pop());
      console.log(`stems ${x.id}: ${r.seconds} s for ${r.duration} s of audio`);
    }
  }

  // 3. the scores
  if (args.includes('--score')) {
    const jobs = files.map(x => ({ id: x.id, mix: x.file, stems: path.join(STEMS, hashOf(x.file)), parts: x.song ? Object.fromEntries(x.song.tracks.map(t => [t.id, path.join(PARTS, x.id, `${t.id}.flac`)]).filter(([, f]) => fs.existsSync(f))) : null, types: x.song ? Object.fromEntries(x.song.tracks.map(t => [t.id, t.type])) : null }))
      .filter(j => fs.existsSync(path.join(j.stems, 'time.json')));
    const list = path.join(CACHE, 'stems-jobs.json'); fs.writeFileSync(list, JSON.stringify(jobs));
    const out = execFileSync(PY, [path.join(__dirname, 'decode-stems.py'), 'score', list], { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'inherit'] });
    const rows = out.trim().split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
    for (const r of rows) console.log(JSON.stringify(r));
    if (opt('--json')) fs.writeFileSync(opt('--json'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  }
})().catch(e => { console.error(e); process.exit(1); });
