// The wide bench of level B (decode-refine group 10, phase 1: measurements only). Every bench song (tools/decode-songs.mjs:
// TEST_SONGS and the app songs, HOLDOUT_SONGS, GENRE_SONGS; or VARIATION_SONGS; or the files of DECODE_OWNER_DIR) is
// analysed in level B once (the model cached in .cache/decode/bench/models/), written as Open in Compose writes it,
// fast-exported by the app (cached by the song's hash in .cache/decode/bench/render/) and compared with its original
// (tools/decode-similarity.mjs). Per song: the drum machine picked and the truth, the bass's drive measure and the truth,
// whether the chords were cut under a Lead, the similarity scores, the brightness ratio and the largest share difference
// against their targets (spec: Similarity targets: shares within 0.10, brightness ratio 0.75 to 1.33).
// --sweep: also every group-10 constant at -20 %, -10 %, +10 % and +20 %, one at a time (KNOBS below); a song whose
// written song does not change is not exported again. Nothing in src/ is changed: the tool moves the exported rule
// objects in its own process (SOUND_RULE, PART_LEVELS) and edits the written code for the constants written inline.
// --oracle-drums: the true drum drive written on songs whose drums are driven (bench only, sizes a drum-drive measure).
// --models-only: only the analyses, into the cache (several runs with --only can fill it at once).
// --src <dir>: the decoder of another checkout (its src/decode/full.js and writer.js), for a baseline of another branch.
// The owner's files: their ids and numbers are printed only; write --json under the git-ignored notes/.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/decode-bench.cjs [--set tuning|validation|fresh|all|every|variation|owner]
//          [--only id,id] [--src dir] [--tag name] [--sweep] [--knobs a,b] [--json out.jsonl] [--models-only] [--oracle-drums] [--rerender tag] [--models tag]   (dev server on PORT; ffmpeg)
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { exportSong, appSong, APP_SONGS, DIR: WAV, HOLDOUT_DIR, SET_DIRS } = require('./decode-export.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const ROOT = path.join(__dirname, '..'), CACHE = path.join(ROOT, '.cache', 'decode', 'bench');
const AUDIO = /\.(wav|mp3|m4a|aac|flac|ogg|opus|webm|mp4|mov)$/i;
const slug = s => s.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'file';
const STEPS = [0.8, 0.9, 1.1, 1.2];

(async () => {
  const src = path.resolve(opt('--src') || ROOT), tag = opt('--tag') || (src === ROOT ? 'branch' : path.basename(src));
  const S = await import('./decode-similarity.mjs');
  const songs = await import('./decode-songs.mjs');
  const { analyseFull } = await import(path.join(src, 'src', 'decode', 'full.js'));
  const W = await import(path.join(src, 'src', 'decode', 'writer.js'));
  const KM = await import(path.join(src, 'src', 'decode', 'kit-measure.js')).catch(() => null);
  const PL = await import(path.join(src, 'src', 'decode', 'part-levels.js')).catch(() => null);
  const { nodeEssentia } = await import('./essentia-node.mjs');

  // the files and their truth
  const truth = s => songs.soundTruth(s);
  const all = [
    ...songs.TEST_SONGS.map(s => ({ id: s.id, file: path.join(WAV, `${s.id}.wav`), truth: truth(s) })),
    ...APP_SONGS.map(x => ({ id: x.id, file: path.join(WAV, `${x.id}.wav`), truth: truth(appSong(x)) })),
    ...songs.HOLDOUT_SONGS.map(s => ({ id: s.id, file: path.join(HOLDOUT_DIR, `${s.id}.wav`), truth: truth(s) })),
    ...songs.GENRE_SONGS.map(s => ({ id: s.id, file: path.join(SET_DIRS.genre, `${s.id}.wav`), truth: truth(s) })),
    ...songs.FRESH_SONGS.map(s => ({ id: s.id, file: path.join(SET_DIRS.fresh, `${s.id}.wav`), truth: truth(s) })),
  ].map(x => ({ ...x, set: songs.TUNING.includes(x.id) ? 'tuning' : songs.VALIDATION.includes(x.id) ? 'validation' : songs.FRESH.includes(x.id) ? 'fresh' : '?' }));
  const set = opt('--set') || 'all', only = opt('--only') ? opt('--only').split(',') : null;
  let files;
  if (set === 'variation') files = songs.VARIATION_SONGS.map(s => ({ id: s.id, file: path.join(SET_DIRS.variation, `${s.id}.wav`), truth: truth(s), set: 'variation' }));
  else if (set === 'owner') { const dir = process.env.DECODE_OWNER_DIR; files = fs.readdirSync(dir).filter(f => AUDIO.test(f) && !f.startsWith('.')).sort().map(f => ({ id: `owner-${slug(f.replace(AUDIO, ''))}`, file: path.join(dir, f), truth: null, set: 'owner' })); }
  else files = all.filter(x => (set === 'all' && x.set !== 'fresh') || set === 'every' || x.set === set);
  files = files.filter(x => (!only || only.includes(x.id)) && fs.existsSync(x.file));

  // the constants of group 10 the sweep moves: [get, set] on the rule objects, or an edit of the written song
  const SR = W.SOUND_RULE, DR = KM && KM.DRIVE_RULE, LV = PL && PL.PART_LEVELS, LV0 = LV && JSON.parse(JSON.stringify(LV));
  const field = (o, k) => ({ get: () => o[k], set: v => { o[k] = v; } });
  const table = prefix => ({ get: () => 1, set: k => { for (const key of Object.keys(LV)) if (key.startsWith(prefix)) LV[key] = LV0[key].map(x => x * k); } });
  // an inline number of the bass's code scaled after the writer: the last gain, or the moving filter's range
  const post = re => ({ get: () => 1, post: true, edit: (song, k) => { for (const t of song.tracks) if (t.id === 'bass') for (const p of Object.values(t.patterns)) if (p.code) p.code = re(p.code, k); } });
  const KNOBS = SR && SR.drive ? {
    // (the drive's constants that exist in this decoder: round 5's crush and distort, round 6's sineShare)
    ...Object.fromEntries([['crush', 'crush'], ['distortvol', 'vol'], ['distort', 'distort'], ['lpq', 'lpq'], ['sineShare', 'sineShare']].filter(([, f]) => f in SR.drive).map(([k, f]) => [k, field(SR.drive, f)])),
    // (round 6: the cut's Lead level, the level under which a part is not written, the missing-bass guard)
    ...('leadKeep' in SR ? { leadKeep: field(SR, 'leadKeep'), bassMissing: field(SR, 'bassMissing') } : {}),
    ...(W.DRUM_DRIVE ? { drumMargin: field(W.DRUM_DRIVE, 'margin') } : {}),
    ...('bassBar' in SR ? { bassBar: field(SR, 'bassBar') } : {}), ...('bassWave' in SR ? { bassWave: field(SR, 'bassWave') } : {}),
    cutHpf: field(SR.cut, 0), cutLpf: field(SR.cut, 1), leadOver: field(SR, 'leadOver'), move: field(SR, 'move'), sustain: field(SR, 'sustain'), room: field(SR, 'room'), shares: field(SR, 'shares'), near: field(SR, 'near'),
    // the drive rule's threshold: level B's `driven` read again from the cached measure (no new analysis)
    ...(DR && 'evenOdd' in DR ? { evenOdd: { get: () => DR.evenOdd, model: true, apply: (m, v) => { if (m.bassDrive) m.bassDrive.driven = m.bassDrive.evenOdd <= v; } } } : {}),
    tableDrums: table('drums:'), tableBass: table('bass:'), tableChords: table('chords:'),
    bassGain: post((c, k) => c.replace(/\.gain\(([\d.]+)\)(?!.*\.gain\()/, (_, x) => `.gain(${Math.round(+x * k * 1000) / 1000})`)),
    sineLo: post((c, k) => c.replace(/sine\.range\((\d+),\s*(\d+)\)/, (_, a, b) => `sine.range(${Math.round(+a * k)}, ${b})`)),
    sineHi: post((c, k) => c.replace(/sine\.range\((\d+),\s*(\d+)\)/, (_, a, b) => `sine.range(${a}, ${Math.round(+b * k)})`)),
  } : {};
  const knobs = opt('--knobs') ? opt('--knobs').split(',') : Object.keys(KNOBS);
  const variants = [{ name: 'base' }];
  if (args.includes('--sweep')) for (const k of knobs) for (const f of STEPS) variants.push({ name: `${k}×${f}`, knob: k, f });

  // the analysis of a file, cached while the file and the decoder do not change (the decoder: every file of src/decode/
  // but the writer and the tables it reads, which run on each variant)
  const ddir = path.join(src, 'src', 'decode'), h = crypto.createHash('sha1');
  for (const f of fs.readdirSync(ddir).filter(f => f.endsWith('.js') && !['writer.js', 'part-levels.js', 'bass-profiles.js'].includes(f)).sort()) h.update(fs.readFileSync(path.join(ddir, f)));
  const SRC_HASH = h.digest('hex').slice(0, 10);
  const mdir = path.join(CACHE, 'models', tag); fs.mkdirSync(mdir, { recursive: true });
  const pcmOf = new Map(), pcm = f => { if (!pcmOf.has(f)) pcmOf.set(f, S.readAudio(f)); return pcmOf.get(f); };
  async function model(x) {
    const st = fs.statSync(x.file), key = `${st.size}-${Math.round(st.mtimeMs)}-${SRC_HASH}`, f = path.join(mdir, `${x.id}.json`);
    // (--models <tag>: the analyses cached under that tag as they are, whatever the decoder now: a writer change measured
    // on the same models)
    if (opt('--models')) { const g = path.join(CACHE, 'models', opt('--models'), `${x.id}.json`); if (fs.existsSync(g)) return JSON.parse(fs.readFileSync(g, 'utf8')).m; }
    if (fs.existsSync(f)) { const c = JSON.parse(fs.readFileSync(f, 'utf8')); if (c.key === key) return c.m; }
    const m = await analyseFull(pcm(x.file), { engine: nodeEssentia });
    fs.writeFileSync(f, JSON.stringify({ key, m }));
    return JSON.parse(JSON.stringify(m));
  }

  // the browser, opened on the first export
  let browser = null, page = null;
  const rdir = path.join(CACHE, 'render'); fs.mkdirSync(rdir, { recursive: true });
  async function render(song) {
    // (--rerender <tag>: export again under that tag, to measure how much two exports of one song differ)
    const h = crypto.createHash('sha1').update(JSON.stringify(song)).digest('hex').slice(0, 16), wav = path.join(rdir, `${h}${opt('--rerender') ? `.${opt('--rerender')}` : ''}.wav`);
    if (!fs.existsSync(wav)) {
      if (!page) {
        const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
        browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
        page = await (await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true })).newPage();
        page.on('pageerror', e => console.error('pageerror', e.message));
        await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
      }
      // (a download the browser cancels under load is tried once more)
      const part = `${wav}.${process.pid}.part.wav`;
      try { await exportSong(page, song, part); } catch (e) { console.error(`export failed (${e.message.split('\n')[0]}), trying again`); await exportSong(page, song, part); }
      fs.renameSync(part, wav);
    }
    return { h, wav };
  }

  const out = opt('--json') ? fs.createWriteStream(path.resolve(opt('--json')), { flags: 'a' }) : null;
  const featO = new Map(), featC = new Map(), cmp = new Map();
  for (const x of files) {
    const m0 = await model(x);
    if (args.includes('--models-only')) { console.log(`${tag} analysed ${x.id}`); continue; }
    const grid = { bpm: m0.bpm, downbeat: m0.downbeat, barSeconds: m0.barSeconds };
    if (!featO.has(x.id)) featO.set(x.id, S.features(pcm(x.file)));
    for (const v of variants) {
      const K = v.knob && KNOBS[v.knob], m = JSON.parse(JSON.stringify(m0));
      let old;
      if (K && K.model) K.apply(m, K.get() * v.f);
      else if (K && !K.post) { old = K.get(); K.set(old * v.f); }
      let song;
      try { song = W.writeFull(m, { id: `sim-${x.id}`, title: x.id }); } finally { if (K && !K.post && !K.model) K.set(old); }
      delete song.config;
      if (K && K.post) K.edit(song, v.f);
      // (round 7, --oracle-drums: the song's true drum drive written on the drum track, to size what a drum-drive
      // measure could give; bench only, the decoder does not know it)
      if (args.includes('--oracle-drums') && x.truth && x.truth.drumsDrive > 0) { const dt = song.tracks.find(t => t.type === 'drums'); if (dt) dt.settings = { ...dt.settings, drive: x.truth.drumsDrive }; }
      const { h, wav } = await render(song);
      const ck = `${x.id}:${h}`;
      if (!cmp.has(ck)) {
        if (!featC.has(h)) featC.set(h, S.features(S.readAudio(wav)));
        cmp.set(ck, S.compare(featO.get(x.id), featC.get(h), { ...grid, bars: song.sections.reduce((a, s) => a + s.bars, 0) }));
      }
      const c = cmp.get(ck), sc = S.score(c), d = m.drumSound || null, bd = m.bassDrive || null;
      const shareDiff = Math.round(Math.max(...c.shares.orig.map((y, i) => Math.abs(y - c.shares.code[i]))) * 1000) / 1000;
      const bass = song.tracks.find(t => t.id === 'bass'), chords = song.tracks.find(t => t.id === 'chords');
      const row = {
        tag, variant: v.name, id: x.id, set: x.set, hash: h, bpm: Math.round(m.bpm * 100) / 100,
        kit: d ? d.kit : (song.tracks.find(t => t.type === 'drums') || { settings: {} }).settings.kit || null, kitTruth: x.truth ? x.truth.kit : null,
        evenOdd: bd ? bd.evenOdd : null, bassLevel: bd ? bd.level : null, driven: bd ? bd.driven : null, bassDriveTruth: x.truth ? x.truth.bassDrive : null, drumsDriveTruth: x.truth ? x.truth.drumsDrive : null,
        bassCode: bass ? Object.values(bass.patterns).find(p => p.code).code.replace(/^.*?\)(?=\.s\()/, '') : null,
        drumsGain: (song.tracks.find(t => t.type === 'drums') || { settings: {} }).settings.gain ?? null,
        cut: !!(chords && Object.values(chords.patterns).some(p => p.code && /\.hpf\(/.test(p.code))),
        ...sc, brightRatio: c.brightness, shareDiff, sharesOrig: c.shares.orig, sharesCode: c.shares.code, bars: c.bars,
      };
      // (round 6) the band error, the bass's presence, coverage and wave family, the parts written, the tempo
      const fam = w => (!w ? null : /sine|triangle/.test(w) ? 'sine' : /square/.test(w) ? 'square' : 'saw');
      const barsOf = t => { const out = new Set(); if (t) for (const c of t.clips) for (let i = 0; i < (c.bars || 1); i++) out.add(c.start + i); return out; };
      const bb = barsOf(bass), tb = x.truth ? x.truth.bassBars || [] : [];
      Object.assign(row, {
        bandError: c.bandError, bandDb: c.bandDb, highOff: c.highOff,
        // (round 7: also without the 11.2-16 kHz band, which no written sound reaches on some third-party files)
        bandErrorNoTop: (v => (v.length ? Math.round(Math.sqrt(v.reduce((a, x) => a + x * x, 0) / v.length) * 1000) / 1000 : null))(c.bandDb.slice(0, -1).filter(x => x !== null)),
        tracks: song.tracks.filter(t => !t.hush).map(t => t.id), bassBarsWritten: bb.size, bassBarsTruth: tb.length,
        bassCoverage: tb.length ? Math.round((tb.filter(b => bb.has(b)).length / tb.length) * 1000) / 1000 : null,
        bassFamily: bass ? fam((/\.s\("([a-z]+)"\)/.exec(Object.values(bass.patterns).find(p => p.code).code) || [])[1]) : null,
        bassFamilyTruth: x.truth ? fam(x.truth.bassWave) : null,
        driveWritten: !!(bass && Object.values(bass.patterns).some(p => p.code && /\.distort\(/.test(p.code))),
        leadTruth: x.truth ? (x.truth.leadBars || []).length > 0 : null,
        tempoOK: x.truth && x.truth.bpm ? Math.abs(m.bpm - x.truth.bpm) < 1 : null,
      });
      row.sharesOK = shareDiff <= 0.1;
      row.brightOK = c.brightness !== null && c.brightness >= 0.75 && c.brightness <= 1.33;
      row.kitOK = row.kitTruth ? row.kit === row.kitTruth : null;
      // (round 6: the drive is the one written; round 5's `driven` flag when the model has it)
      if (row.driven === null || row.driven === undefined) row.driven = bd ? row.driveWritten : null;
      row.driveOK = row.bassDriveTruth === null || row.driven === null ? null : row.driven === row.bassDriveTruth > 0;
      if (W.bassDriveOf) { const dd = W.bassDriveOf(bd); Object.assign(row, { h1: bd ? bd.h1 : null, slope: bd ? bd.slope : null, driveAmount: dd ? dd.drive : null, driveNear: dd ? dd.near : null }); }
      if (out) out.write(JSON.stringify(row) + '\n');
      console.log(`${tag} ${v.name.padEnd(16)} ${x.set.slice(0, 5)} ${x.id.padEnd(26)} kit ${String(row.kit).padEnd(12)}${row.kitOK === false ? '✗' : ' '} drive ${row.evenOdd} ${row.driven ? 'D' : '-'}${row.driveOK === false ? '✗' : ' '} cut ${row.cut ? 'y' : '-'} · rhythm ${sc.rhythmLow}/${sc.rhythmMid}/${sc.rhythmHigh} chroma ${sc.chroma}/${sc.bassChroma} band ${c.bandError} dB bright ${c.brightness}${row.brightOK ? '' : '✗'} shares ${shareDiff}${row.sharesOK ? '' : '✗'} arc ${sc.arc}`);
    }
  }
  if (out) out.end();
  if (browser) await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
